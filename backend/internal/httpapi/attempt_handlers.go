package httpapi

import (
	"context"
	"net/http"

	"github.com/jackc/pgx/v5"
)

const maxDurationSeconds = 7 * 24 * 3600

const attemptSelect = `
SELECT a.id, a.exam_id, e.title_ru, e.title_en, a.mode, a.status, a.started_at, a.finished_at,
       a.duration_seconds, a.correct_count, a.total_count, a.score_percent::float8
FROM attempts a JOIN exams e ON e.id = a.exam_id`

func scanAttempt(row pgx.Row) (Attempt, error) {
	var a Attempt
	err := row.Scan(&a.ID, &a.ExamID, &a.ExamTitleRu, &a.ExamTitleEn, &a.Mode, &a.Status, &a.StartedAt,
		&a.FinishedAt, &a.DurationSeconds, &a.CorrectCount, &a.TotalCount, &a.ScorePercent)
	return a, err
}

// ownedAttempt loads an attempt and writes a 404 if it is missing or belongs to someone else.
func (s *Server) ownedAttempt(w http.ResponseWriter, r *http.Request) (Attempt, bool) {
	id, ok := pathID(w, r, "attemptID")
	if !ok {
		return Attempt{}, false
	}
	c, _ := claims(r)
	a, err := scanAttempt(s.pool.QueryRow(r.Context(), attemptSelect+` WHERE a.id = $1 AND a.user_id = $2`, id, c.UserID))
	if err != nil {
		fail(w, err)
		return Attempt{}, false
	}
	return a, true
}

func (s *Server) myAttempts(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	rows, err := s.pool.Query(r.Context(), attemptSelect+` WHERE a.user_id = $1 ORDER BY a.started_at DESC LIMIT 100`, c.UserID)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()
	out := []Attempt{}
	for rows.Next() {
		a, err := scanAttempt(rows)
		if err != nil {
			fail(w, err)
			return
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) startAttempt(w http.ResponseWriter, r *http.Request) {
	examID, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	var in struct {
		Mode string `json:"mode"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.Mode != "training" && in.Mode != "exam" {
		writeError(w, http.StatusBadRequest, "mode must be 'training' or 'exam'")
		return
	}
	var tasksCount int
	if err := s.pool.QueryRow(r.Context(),
		`SELECT (SELECT count(*) FROM exam_tasks WHERE exam_id = e.id)::int FROM exams e WHERE e.id = $1 AND e.status = 'approved'`,
		examID).Scan(&tasksCount); err != nil {
		fail(w, err) // an unknown or still pending exam is a 404
		return
	}
	if tasksCount == 0 {
		writeError(w, http.StatusConflict, "this exam has no tasks yet")
		return
	}
	c, _ := claims(r)
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO attempts (user_id, exam_id, mode) VALUES ($1, $2, $3) RETURNING id`,
		c.UserID, examID, in.Mode).Scan(&id); err != nil {
		fail(w, err)
		return
	}
	a, err := scanAttempt(s.pool.QueryRow(r.Context(), attemptSelect+` WHERE a.id = $1`, id))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

type savedAnswer struct {
	taskID   int64
	selected int
}

func loadAnswers(ctx context.Context, q querier, attemptID int64) ([]savedAnswer, error) {
	rows, err := q.Query(ctx,
		`SELECT task_id, selected_index FROM attempt_answers WHERE attempt_id = $1 ORDER BY answered_at`, attemptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []savedAnswer
	for rows.Next() {
		var a savedAnswer
		if err := rows.Scan(&a.taskID, &a.selected); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func feedback(t Task, selected int) AnswerState {
	ok := t.CorrectIndex != nil && *t.CorrectIndex == selected
	return AnswerState{TaskID: t.ID, SelectedIndex: selected, IsCorrect: &ok, CorrectIndex: t.CorrectIndex,
		Explanation: t.Explanation}
}

func (s *Server) getAttempt(w http.ResponseWriter, r *http.Request) {
	a, ok := s.ownedAttempt(w, r)
	if !ok {
		return
	}
	full, err := loadTasks(r.Context(), s.pool, a.ExamID)
	if err != nil {
		fail(w, err)
		return
	}
	saved, err := loadAnswers(r.Context(), s.pool, a.ID)
	if err != nil {
		fail(w, err)
		return
	}
	byID := make(map[int64]Task, len(full))
	for _, t := range full {
		byID[t.ID] = t
	}
	revealAll := a.Status == "completed"
	tasks := make([]Task, 0, len(full))
	for _, t := range full {
		if revealAll {
			tasks = append(tasks, t)
		} else {
			tasks = append(tasks, t.hidden())
		}
	}
	answers := make([]AnswerState, 0, len(saved))
	for _, sa := range saved {
		t, exists := byID[sa.taskID]
		switch {
		case !exists:
			continue
		case revealAll || a.Mode == "training":
			answers = append(answers, feedback(t, sa.selected))
		default:
			answers = append(answers, AnswerState{TaskID: sa.taskID, SelectedIndex: sa.selected})
		}
	}
	writeJSON(w, http.StatusOK, AttemptState{Attempt: a, Tasks: tasks, Answers: answers})
}

func (s *Server) saveAnswer(w http.ResponseWriter, r *http.Request) {
	a, ok := s.ownedAttempt(w, r)
	if !ok {
		return
	}
	taskID, ok := pathID(w, r, "taskID")
	if !ok {
		return
	}
	var in struct {
		SelectedIndex int `json:"selectedIndex"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if a.Status != "in_progress" {
		writeError(w, http.StatusConflict, "attempt is already finished")
		return
	}

	var t Task
	var ci int
	err := s.pool.QueryRow(r.Context(),
		`SELECT t.id, t.options, t.correct_index, t.explanation
		 FROM tasks t JOIN exam_tasks et ON et.task_id = t.id
		 WHERE t.id = $1 AND et.exam_id = $2`,
		taskID, a.ExamID).Scan(&t.ID, &t.Options, &ci, &t.Explanation)
	if err != nil {
		fail(w, err)
		return
	}
	t.CorrectIndex = &ci
	if in.SelectedIndex < 0 || in.SelectedIndex >= len(t.Options) {
		writeError(w, http.StatusBadRequest, "selectedIndex out of range")
		return
	}

	if a.Mode == "training" {
		// Answers are final in training mode: the feedback has been shown.
		tag, err := s.pool.Exec(r.Context(),
			`INSERT INTO attempt_answers (attempt_id, task_id, selected_index) VALUES ($1, $2, $3)
			 ON CONFLICT (attempt_id, task_id) DO NOTHING`, a.ID, taskID, in.SelectedIndex)
		if err != nil {
			fail(w, err)
			return
		}
		if tag.RowsAffected() == 0 {
			writeError(w, http.StatusConflict, "this question was already answered")
			return
		}
		writeJSON(w, http.StatusOK, feedback(t, in.SelectedIndex))
		return
	}

	if _, err := s.pool.Exec(r.Context(),
		`INSERT INTO attempt_answers (attempt_id, task_id, selected_index) VALUES ($1, $2, $3)
		 ON CONFLICT (attempt_id, task_id) DO UPDATE SET selected_index = EXCLUDED.selected_index, answered_at = now()`,
		a.ID, taskID, in.SelectedIndex); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, AnswerState{TaskID: taskID, SelectedIndex: in.SelectedIndex})
}

func (s *Server) finishAttempt(w http.ResponseWriter, r *http.Request) {
	a, ok := s.ownedAttempt(w, r)
	if !ok {
		return
	}
	var in struct {
		DurationSeconds int `json:"durationSeconds"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.DurationSeconds < 0 {
		in.DurationSeconds = 0
	}
	if in.DurationSeconds > maxDurationSeconds {
		in.DurationSeconds = maxDurationSeconds
	}
	// Unanswered tasks count as incorrect; the score is computed once, here.
	tag, err := s.pool.Exec(r.Context(), `
		WITH c AS (
			SELECT count(t.id)::int AS total,
			       count(*) FILTER (WHERE aa.selected_index = t.correct_index)::int AS correct
			FROM exam_tasks et
			JOIN tasks t ON t.id = et.task_id
			LEFT JOIN attempt_answers aa ON aa.task_id = t.id AND aa.attempt_id = $1
			WHERE et.exam_id = $2
		)
		UPDATE attempts SET status = 'completed', finished_at = now(), duration_seconds = $3,
		       correct_count = c.correct, total_count = c.total,
		       score_percent = CASE WHEN c.total = 0 THEN 0 ELSE round(c.correct * 100.0 / c.total, 2) END
		FROM c WHERE attempts.id = $1 AND attempts.status = 'in_progress'`,
		a.ID, a.ExamID, in.DurationSeconds)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusConflict, "attempt is already finished")
		return
	}
	s.writeResult(w, r, a.ID)
}

func (s *Server) getResult(w http.ResponseWriter, r *http.Request) {
	a, ok := s.ownedAttempt(w, r)
	if !ok {
		return
	}
	if a.Status != "completed" {
		writeError(w, http.StatusConflict, "attempt is not finished yet")
		return
	}
	s.writeResult(w, r, a.ID)
}

func (s *Server) writeResult(w http.ResponseWriter, r *http.Request, attemptID int64) {
	a, err := scanAttempt(s.pool.QueryRow(r.Context(), attemptSelect+` WHERE a.id = $1`, attemptID))
	if err != nil {
		fail(w, err)
		return
	}
	tasks, err := loadTasks(r.Context(), s.pool, a.ExamID)
	if err != nil {
		fail(w, err)
		return
	}
	saved, err := loadAnswers(r.Context(), s.pool, a.ID)
	if err != nil {
		fail(w, err)
		return
	}
	selected := make(map[int64]int, len(saved))
	for _, sa := range saved {
		selected[sa.taskID] = sa.selected
	}

	res := Result{Attempt: a, Items: make([]ResultItem, 0, len(tasks))}
	for _, t := range tasks {
		item := ResultItem{Task: t}
		if sel, ok := selected[t.ID]; ok {
			item.SelectedIndex = &sel
			item.IsCorrect = t.CorrectIndex != nil && *t.CorrectIndex == sel
		}
		res.Items = append(res.Items, item)
	}
	writeJSON(w, http.StatusOK, res)
}
