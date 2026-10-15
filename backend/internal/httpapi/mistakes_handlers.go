package httpapi

import (
	"net/http"
	"time"
)

// Mistake is a task the learner has answered wrongly, with how often. Answer fields are included: the learner
// has already been shown them (training feedback, or the results of a finished lesson).
type Mistake struct {
	Task Task `json:"task"`
	// Mistakes is the number of sessions in which the task was answered wrongly; Answered, the sessions in which it was answered at all.
	Mistakes int `json:"mistakes"`
	Answered int `json:"answered"`
	// LastMistakeAt and LastSelectedIndex describe the most recent wrong answer.
	LastMistakeAt     time.Time `json:"lastMistakeAt"`
	LastSelectedIndex int       `json:"lastSelectedIndex"`
}

type MistakesPage struct {
	Items []Mistake `json:"items"`
	// Total is the number of tasks with at least one mistake, across the whole history.
	Total int `json:"total"`
}

// myMistakes lists the learner's tasks with mistakes, most mistakes first. It reads the whole answer history (never
// the capped attempt list), and only counts answers the learner has already seen the result of: training answers
// (instant feedback) and answers of finished lessons.
func (s *Server) myMistakes(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := pageParams(w, r, 20)
	if !ok {
		return
	}
	c, _ := claims(r)

	rows, err := s.pool.Query(r.Context(), `
		SELECT `+taskColumns+`, m.mistakes, m.answered, m.last_at, m.last_selected, count(*) OVER ()
		FROM (
			SELECT aa.task_id,
			       count(*) FILTER (WHERE aa.selected_index <> t.correct_index)::int AS mistakes,
			       count(*)::int AS answered,
			       max(aa.answered_at) FILTER (WHERE aa.selected_index <> t.correct_index) AS last_at,
			       (array_agg(aa.selected_index ORDER BY aa.answered_at DESC) FILTER (WHERE aa.selected_index <> t.correct_index))[1] AS last_selected
			FROM attempt_answers aa
			JOIN attempts a ON a.id = aa.attempt_id
			JOIN tasks t ON t.id = aa.task_id
			WHERE a.user_id = $1 AND (a.status = 'completed' OR a.mode = 'training')
			GROUP BY aa.task_id, t.correct_index
			HAVING count(*) FILTER (WHERE aa.selected_index <> t.correct_index) > 0
		) m
		JOIN tasks t ON t.id = m.task_id
		ORDER BY m.mistakes DESC, m.last_at DESC, t.id
		LIMIT $2 OFFSET $3`, c.UserID, limit, offset)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()

	page := MistakesPage{Items: []Mistake{}}
	for rows.Next() {
		var m Mistake
		var total int
		t, err := scanTask(rows, &m.Mistakes, &m.Answered, &m.LastMistakeAt, &m.LastSelectedIndex, &total)
		if err != nil {
			fail(w, err)
			return
		}
		m.Task = t
		page.Total = total
		page.Items = append(page.Items, m)
	}
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	// An offset past the end returns no rows, so the total has to come from its own query.
	if len(page.Items) == 0 && offset > 0 {
		if err := s.pool.QueryRow(r.Context(), `
			SELECT count(*) FROM (
				SELECT 1 FROM attempt_answers aa
				JOIN attempts a ON a.id = aa.attempt_id
				JOIN tasks t ON t.id = aa.task_id
				WHERE a.user_id = $1 AND (a.status = 'completed' OR a.mode = 'training')
				GROUP BY aa.task_id, t.correct_index
				HAVING count(*) FILTER (WHERE aa.selected_index <> t.correct_index) > 0
			) x`, c.UserID).Scan(&page.Total); err != nil {
			fail(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, page)
}
