package httpapi

import (
	"context"
	"math"
	"math/rand/v2"
	"net/http"
	"sort"

	"github.com/jackc/pgx/v5"
)

// practiceSize is how many tasks a "work on mistakes" lesson has, and how many tasks with mistakes it takes to start one.
const practiceSize = 10

// mistakesCTE defines, for the user in $1, one row per task with at least one mistake left (`m`).
// A mistake is a wrong answer in a session whose result the user has already seen (training answers, or a finished
// session). The counter is the wrong answers minus the credits earned by working on mistakes; at zero the task is gone.
const mistakesCTE = `
WITH s AS (
	SELECT aa.task_id,
	       count(*) FILTER (WHERE aa.selected_index <> t.correct_index) AS wrong,
	       count(*) AS answered,
	       max(aa.answered_at) FILTER (WHERE aa.selected_index <> t.correct_index) AS last_at,
	       (array_agg(aa.selected_index ORDER BY aa.answered_at DESC) FILTER (WHERE aa.selected_index <> t.correct_index))[1] AS last_selected
	FROM attempt_answers aa
	JOIN attempts a ON a.id = aa.attempt_id
	JOIN tasks t ON t.id = aa.task_id
	WHERE a.user_id = $1 AND (a.status = 'completed' OR a.mode = 'training')
	GROUP BY aa.task_id, t.correct_index
), m AS (
	SELECT s.task_id, (s.wrong - COALESCE(mc.credits, 0))::int AS mistakes, s.answered::int AS answered, s.last_at, s.last_selected
	FROM s LEFT JOIN mistake_credits mc ON mc.user_id = $1 AND mc.task_id = s.task_id
	WHERE s.wrong - COALESCE(mc.credits, 0) > 0
)`

type weightedTask struct {
	id     int64
	weight int
}

// pickWeighted chooses n distinct tasks at random; a task with more mistakes is proportionally more likely to be chosen
// (Efraimidis-Spirakis: each task gets the key u^(1/weight) for a uniform u, and the n largest keys win).
func pickWeighted(tasks []weightedTask, n int, rnd func() float64) []int64 {
	type keyed struct {
		id  int64
		key float64
	}
	ks := make([]keyed, len(tasks))
	for i, t := range tasks {
		ks[i] = keyed{t.id, math.Pow(rnd(), 1/float64(max(t.weight, 1)))}
	}
	sort.Slice(ks, func(i, j int) bool { return ks[i].key > ks[j].key })
	if n > len(ks) {
		n = len(ks)
	}
	out := make([]int64, n)
	for i := range out {
		out[i] = ks[i].id
	}
	return out
}

// startMistakesPractice starts a "work on mistakes" lesson: practiceSize tasks picked at random from the user's
// mistakes, those with more mistakes more likely. It fails with 409 while the user has fewer tasks with mistakes.
func (s *Server) startMistakesPractice(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	ctx := r.Context()

	rows, err := s.pool.Query(ctx, mistakesCTE+` SELECT task_id, mistakes FROM m`, c.UserID)
	if err != nil {
		fail(w, err)
		return
	}
	var pool []weightedTask
	for rows.Next() {
		var t weightedTask
		if err := rows.Scan(&t.id, &t.weight); err != nil {
			rows.Close()
			fail(w, err)
			return
		}
		pool = append(pool, t)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	if len(pool) < practiceSize {
		writeError(w, http.StatusConflict, "you need at least 10 tasks with mistakes to work on them")
		return
	}
	picked := pickWeighted(pool, practiceSize, rand.Float64)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		fail(w, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var id int64
	if err := tx.QueryRow(ctx, `INSERT INTO attempts (user_id, kind, mode) VALUES ($1, 'mistakes', 'training') RETURNING id`, c.UserID).Scan(&id); err != nil {
		fail(w, err)
		return
	}
	for i, taskID := range picked {
		if _, err := tx.Exec(ctx, `INSERT INTO attempt_tasks (attempt_id, task_id, position) VALUES ($1, $2, $3)`, id, taskID, i+1); err != nil {
			fail(w, err)
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, err)
		return
	}
	a, err := scanAttempt(s.pool.QueryRow(ctx, attemptSelect+` WHERE a.id = $1`, id))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

// creditMistakes takes one mistake off every task the user did right in this finished "work on mistakes" attempt.
// Credits never exceed the task's wrong answers, so a spare credit cannot cancel a mistake made later.
func creditMistakes(ctx context.Context, tx pgx.Tx, a Attempt) error {
	rows, err := tx.Query(ctx, `
		SELECT aa.task_id,
		       (SELECT count(*) FROM attempt_answers x
		        JOIN attempts xa ON xa.id = x.attempt_id
		        WHERE xa.user_id = $1 AND (xa.status = 'completed' OR xa.mode = 'training')
		          AND x.task_id = aa.task_id AND x.selected_index <> t.correct_index)::int
		FROM attempt_answers aa
		JOIN tasks t ON t.id = aa.task_id
		WHERE aa.attempt_id = $2 AND aa.selected_index = t.correct_index`, a.UserID, a.ID)
	if err != nil {
		return err
	}
	type credit struct {
		taskID int64
		wrong  int
	}
	var credits []credit
	for rows.Next() {
		var c credit
		if err := rows.Scan(&c.taskID, &c.wrong); err != nil {
			rows.Close()
			return err
		}
		credits = append(credits, c)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for _, c := range credits {
		if c.wrong == 0 {
			continue // nothing to take off
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO mistake_credits (user_id, task_id, credits) VALUES ($1, $2, 1)
			ON CONFLICT (user_id, task_id) DO UPDATE SET credits = LEAST(mistake_credits.credits + 1, $3)`,
			a.UserID, c.taskID, c.wrong); err != nil {
			return err
		}
	}
	return nil
}
