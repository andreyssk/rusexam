package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

const errOtherCourse = "exam and tasks must belong to the same course"

func validateExam(in *ExamInput) string {
	in.TitleRu, in.TitleEn = strings.TrimSpace(in.TitleRu), strings.TrimSpace(in.TitleEn)
	if in.TitleRu == "" && in.TitleEn == "" {
		return "a title is required (Russian or English)"
	}
	return ""
}

func validateTask(in *TaskInput) string {
	in.Prompt, in.Passage, in.Explanation = strings.TrimSpace(in.Prompt), strings.TrimSpace(in.Passage), strings.TrimSpace(in.Explanation)
	if in.Prompt == "" {
		return "a prompt is required"
	}
	if len(in.Options) < 2 || len(in.Options) > 8 {
		return "between 2 and 8 options are required"
	}
	for i := range in.Options {
		in.Options[i] = strings.TrimSpace(in.Options[i])
		if in.Options[i] == "" {
			return fmt.Sprintf("option %d is empty", i+1)
		}
	}
	if in.CorrectIndex < 0 || in.CorrectIndex >= len(in.Options) {
		return "correctIndex is out of range"
	}
	return ""
}

func (s *Server) adminCreateExam(w http.ResponseWriter, r *http.Request) {
	var in ExamInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateExam(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if !s.requireCourse(w, r, in.CourseID) || !s.requireCategoryIn(w, r, in.CategoryID, in.CourseID) {
		return
	}
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO exams (course_id, category_id, title_ru, title_en, description_ru, description_en) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		in.CourseID, in.CategoryID, in.TitleRu, in.TitleEn, in.DescriptionRu, in.DescriptionEn).Scan(&id); err != nil {
		fail(w, err)
		return
	}
	exams, err := queryExams(r.Context(), s.pool, 0, &id, nil, false)
	if err != nil || len(exams) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, exams[0])
}

func (s *Server) adminUpdateExam(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	var in ExamInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateExam(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	var courseID int64
	if err := s.pool.QueryRow(r.Context(), `SELECT course_id FROM exams WHERE id = $1`, id).Scan(&courseID); errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	} else if err != nil {
		fail(w, err)
		return
	}
	if !s.requireCategoryIn(w, r, in.CategoryID, courseID) {
		return
	}
	tag, err := s.pool.Exec(r.Context(),
		`UPDATE exams SET category_id = $6, title_ru = $2, title_en = $3, description_ru = $4, description_en = $5, updated_at = now()
		 WHERE id = $1`, id, in.TitleRu, in.TitleEn, in.DescriptionRu, in.DescriptionEn, in.CategoryID)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	}
	exams, err := queryExams(r.Context(), s.pool, 0, &id, nil, false)
	if err != nil || len(exams) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, exams[0])
}

// adminSetExamStatus approves an exam (making it available to learners) or sends it back to pending.
func (s *Server) adminSetExamStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	var in struct {
		Status string `json:"status"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.Status != "pending" && in.Status != "approved" {
		writeError(w, http.StatusBadRequest, "status must be 'pending' or 'approved'")
		return
	}
	tag, err := s.pool.Exec(r.Context(), `UPDATE exams SET status = $2, updated_at = now() WHERE id = $1`, id, in.Status)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	}
	exams, err := queryExams(r.Context(), s.pool, 0, &id, nil, false)
	if err != nil || len(exams) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, exams[0])
}

func (s *Server) adminDeleteExam(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	tag, err := s.pool.Exec(r.Context(), `DELETE FROM exams WHERE id = $1`, id)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- task bank ----

func (s *Server) adminListBankTasks(w http.ResponseWriter, r *http.Request) {
	var courseID *int64
	if v := r.URL.Query().Get("courseId"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			writeError(w, http.StatusBadRequest, "invalid courseId")
			return
		}
		courseID = &id
	}
	tasks, err := adminBankTasks(r.Context(), s.pool, courseID, strings.TrimSpace(r.URL.Query().Get("q")), r.URL.Query().Get("unassigned") == "true")
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (s *Server) adminCreateTask(w http.ResponseWriter, r *http.Request) {
	var in TaskInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateTask(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if !s.requireCourse(w, r, in.CourseID) {
		return
	}
	var id int64
	err := s.pool.QueryRow(r.Context(), `
		INSERT INTO tasks (course_id, prompt, passage, options, correct_index, explanation)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		in.CourseID, in.Prompt, in.Passage, in.Options, in.CorrectIndex, in.Explanation).Scan(&id)
	if err != nil {
		fail(w, err)
		return
	}
	s.writeAdminTask(w, r, id, http.StatusCreated)
}

func (s *Server) adminUpdateTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "taskID")
	if !ok {
		return
	}
	var in TaskInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateTask(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	tag, err := s.pool.Exec(r.Context(), `
		UPDATE tasks SET prompt = $2, passage = $3, options = $4, correct_index = $5, explanation = $6
		WHERE id = $1`,
		id, in.Prompt, in.Passage, in.Options, in.CorrectIndex, in.Explanation)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	s.writeAdminTask(w, r, id, http.StatusOK)
}

// adminDeleteTask removes the task from the bank and therefore from every exam that uses it.
func (s *Server) adminDeleteTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "taskID")
	if !ok {
		return
	}
	tag, err := s.pool.Exec(r.Context(), `DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) writeAdminTask(w http.ResponseWriter, r *http.Request, id int64, status int) {
	rows, err := s.pool.Query(r.Context(), `SELECT `+taskColumns+`, t.course_id, `+usedInColumn+` FROM tasks t WHERE t.id = $1`, id)
	if err != nil {
		fail(w, err)
		return
	}
	tasks, err := scanAdminTasks(rows)
	if err != nil || len(tasks) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, status, tasks[0])
}

// ---- exam <-> task links ----

func (s *Server) adminListExamTasks(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	tasks, err := adminExamTasks(r.Context(), s.pool, id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

// adminSetExamTasks replaces the exam's task list. The order of taskIds is the order in the exam, so one call
// covers linking, unlinking and reordering.
func (s *Server) adminSetExamTasks(w http.ResponseWriter, r *http.Request) {
	examID, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	var in struct {
		TaskIDs []int64 `json:"taskIds"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	seen := make(map[int64]bool, len(in.TaskIDs))
	for _, id := range in.TaskIDs {
		if seen[id] {
			writeError(w, http.StatusBadRequest, "duplicate task in list")
			return
		}
		seen[id] = true
	}

	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		fail(w, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var examCourse int64
	if err := tx.QueryRow(ctx, `SELECT course_id FROM exams WHERE id = $1`, examID).Scan(&examCourse); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "exam not found")
			return
		}
		fail(w, err)
		return
	}
	if len(in.TaskIDs) > 0 {
		var found, inCourse int
		if err := tx.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE course_id = $2) FROM tasks WHERE id = ANY($1)`,
			in.TaskIDs, examCourse).Scan(&found, &inCourse); err != nil {
			fail(w, err)
			return
		}
		if found != len(in.TaskIDs) {
			writeError(w, http.StatusBadRequest, "some tasks do not exist")
			return
		}
		if inCourse != found {
			writeError(w, http.StatusBadRequest, errOtherCourse)
			return
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM exam_tasks WHERE exam_id = $1 AND NOT (task_id = ANY($2))`, examID, in.TaskIDs); err != nil {
		fail(w, err)
		return
	}
	for i, tid := range in.TaskIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO exam_tasks (exam_id, task_id, position) VALUES ($1, $2, $3)
			ON CONFLICT (exam_id, task_id) DO UPDATE SET position = EXCLUDED.position`, examID, tid, i+1); err != nil {
			fail(w, err)
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, err)
		return
	}
	tasks, err := adminExamTasks(ctx, s.pool, examID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

// adminBulkTasks applies delete / unlink / link to a set of bank tasks in one transaction.
func (s *Server) adminBulkTasks(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Action  string  `json:"action"`
		TaskIDs []int64 `json:"taskIds"`
		ExamID  int64   `json:"examId"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if len(in.TaskIDs) == 0 {
		writeError(w, http.StatusBadRequest, "no tasks selected")
		return
	}
	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		fail(w, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var affected int64
	switch in.Action {
	case "delete":
		tag, err := tx.Exec(ctx, `DELETE FROM tasks WHERE id = ANY($1)`, in.TaskIDs)
		if err != nil {
			fail(w, err)
			return
		}
		affected = tag.RowsAffected()
	case "unlink":
		tag, err := tx.Exec(ctx, `DELETE FROM exam_tasks WHERE task_id = ANY($1)`, in.TaskIDs)
		if err != nil {
			fail(w, err)
			return
		}
		affected = tag.RowsAffected()
	case "link":
		var examCourse int64
		if err := tx.QueryRow(ctx, `SELECT course_id FROM exams WHERE id = $1`, in.ExamID).Scan(&examCourse); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "exam not found")
				return
			}
			fail(w, err)
			return
		}
		var other int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM tasks WHERE id = ANY($1) AND course_id <> $2`, in.TaskIDs, examCourse).Scan(&other); err != nil {
			fail(w, err)
			return
		}
		if other > 0 {
			writeError(w, http.StatusBadRequest, errOtherCourse)
			return
		}
		// Append after the current last position, keeping the order of the request.
		tag, err := tx.Exec(ctx, `
			INSERT INTO exam_tasks (exam_id, task_id, position)
			SELECT $1, t.id, COALESCE((SELECT max(position) FROM exam_tasks WHERE exam_id = $1), 0) + u.ord
			FROM unnest($2::bigint[]) WITH ORDINALITY AS u(id, ord)
			JOIN tasks t ON t.id = u.id
			WHERE NOT EXISTS (SELECT 1 FROM exam_tasks et WHERE et.exam_id = $1 AND et.task_id = t.id)
			ON CONFLICT (exam_id, task_id) DO NOTHING`, in.ExamID, in.TaskIDs)
		if err != nil {
			fail(w, err)
			return
		}
		affected = tag.RowsAffected()
	default:
		writeError(w, http.StatusBadRequest, "unknown action")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int64{"affected": affected})
}

const maxImportTasks = 500

// adminImportTasks creates many tasks in one transaction, optionally appending them to an exam.
func (s *Server) adminImportTasks(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CourseID int64       `json:"courseId"`
		Tasks    []TaskInput `json:"tasks"`
		ExamID   int64       `json:"examId"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if !s.requireCourse(w, r, in.CourseID) {
		return
	}
	if len(in.Tasks) == 0 {
		writeError(w, http.StatusBadRequest, "no tasks to import")
		return
	}
	if len(in.Tasks) > maxImportTasks {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("too many tasks: at most %d per import", maxImportTasks))
		return
	}
	var problems []string
	for i := range in.Tasks {
		if msg := validateTask(&in.Tasks[i]); msg != "" {
			if len(problems) == 5 {
				problems = append(problems, "…")
				break
			}
			problems = append(problems, fmt.Sprintf("task %d: %s", i+1, msg))
		}
	}
	if len(problems) > 0 {
		writeError(w, http.StatusBadRequest, strings.Join(problems, "; "))
		return
	}

	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		fail(w, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	next := 0
	if in.ExamID != 0 {
		var examCourse int64
		if err := tx.QueryRow(ctx, `SELECT course_id FROM exams WHERE id = $1`, in.ExamID).Scan(&examCourse); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "exam not found")
				return
			}
			fail(w, err)
			return
		}
		if examCourse != in.CourseID {
			writeError(w, http.StatusBadRequest, errOtherCourse)
			return
		}
		if err := tx.QueryRow(ctx, `SELECT COALESCE(max(position), 0) FROM exam_tasks WHERE exam_id = $1`, in.ExamID).Scan(&next); err != nil {
			fail(w, err)
			return
		}
	}
	for _, t := range in.Tasks {
		var id int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO tasks (course_id, prompt, passage, options, correct_index, explanation)
			VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
			in.CourseID, t.Prompt, t.Passage, t.Options, t.CorrectIndex, t.Explanation).Scan(&id); err != nil {
			fail(w, err)
			return
		}
		if in.ExamID != 0 {
			next++
			if _, err := tx.Exec(ctx, `INSERT INTO exam_tasks (exam_id, task_id, position) VALUES ($1, $2, $3)`, in.ExamID, id, next); err != nil {
				fail(w, err)
				return
			}
		}
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int{"created": len(in.Tasks)})
}
