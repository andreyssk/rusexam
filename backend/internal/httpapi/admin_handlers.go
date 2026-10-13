package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
)

const errOtherCourse = "lesson and tasks must belong to the same course"

const errDuplicateTaskID = "a task with this external ID already exists"

func validateLesson(in *LessonInput) string {
	in.TitleRu, in.TitleEn = strings.TrimSpace(in.TitleRu), strings.TrimSpace(in.TitleEn)
	if in.TitleRu == "" && in.TitleEn == "" {
		return "a title is required (Russian or English)"
	}
	return ""
}

func validateTask(in *TaskInput) string {
	if in.ExternalID != nil {
		v := strings.TrimSpace(*in.ExternalID)
		if v == "" {
			in.ExternalID = nil
		} else if utf8.RuneCountInString(v) > 100 {
			return "the external ID is too long (max 100 characters)"
		} else {
			in.ExternalID = &v
		}
	}
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

// autoplayOrDefault: a task's audio autoplays unless the admin switched that off.
func autoplayOrDefault(v *bool) bool { return v == nil || *v }

func (s *Server) adminCreateLesson(w http.ResponseWriter, r *http.Request) {
	var in LessonInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateLesson(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if !s.requireCourse(w, r, in.CourseID) || !s.requireCategoryIn(w, r, in.CategoryID, in.CourseID) {
		return
	}
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO lessons (course_id, category_id, preserve_order, title_ru, title_en, description_ru, description_en) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		in.CourseID, in.CategoryID, in.PreserveOrder, in.TitleRu, in.TitleEn, in.DescriptionRu, in.DescriptionEn).Scan(&id); err != nil {
		fail(w, err)
		return
	}
	lessons, err := queryLessons(r.Context(), s.pool, 0, &id, nil, false)
	if err != nil || len(lessons) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, lessons[0])
}

func (s *Server) adminUpdateLesson(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "lessonID")
	if !ok {
		return
	}
	var in LessonInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateLesson(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	var courseID int64
	if err := s.pool.QueryRow(r.Context(), `SELECT course_id FROM lessons WHERE id = $1`, id).Scan(&courseID); errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "lesson not found")
		return
	} else if err != nil {
		fail(w, err)
		return
	}
	if !s.requireCategoryIn(w, r, in.CategoryID, courseID) {
		return
	}
	tag, err := s.pool.Exec(r.Context(),
		`UPDATE lessons SET category_id = $6, preserve_order = $7, title_ru = $2, title_en = $3, description_ru = $4, description_en = $5, updated_at = now()
		 WHERE id = $1`, id, in.TitleRu, in.TitleEn, in.DescriptionRu, in.DescriptionEn, in.CategoryID, in.PreserveOrder)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "lesson not found")
		return
	}
	lessons, err := queryLessons(r.Context(), s.pool, 0, &id, nil, false)
	if err != nil || len(lessons) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, lessons[0])
}

// adminSetLessonStatus approves a lesson (making it available to learners) or sends it back to pending.
func (s *Server) adminSetLessonStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "lessonID")
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
	tag, err := s.pool.Exec(r.Context(), `UPDATE lessons SET status = $2, updated_at = now() WHERE id = $1`, id, in.Status)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "lesson not found")
		return
	}
	lessons, err := queryLessons(r.Context(), s.pool, 0, &id, nil, false)
	if err != nil || len(lessons) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, lessons[0])
}

func (s *Server) adminDeleteLesson(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "lessonID")
	if !ok {
		return
	}
	tag, err := s.pool.Exec(r.Context(), `DELETE FROM lessons WHERE id = $1`, id)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "lesson not found")
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
	if !s.requireCourse(w, r, in.CourseID) || !s.requireAudioAsset(w, r, in.AudioAssetID) {
		return
	}
	var id int64
	err := s.pool.QueryRow(r.Context(), `
		INSERT INTO tasks (course_id, prompt, passage, options, correct_index, explanation, audio_asset_id, audio_autoplay, external_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		in.CourseID, in.Prompt, in.Passage, in.Options, in.CorrectIndex, in.Explanation, in.AudioAssetID, autoplayOrDefault(in.AudioAutoplay), in.ExternalID).Scan(&id)
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, errDuplicateTaskID)
		return
	}
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
	if !s.requireAudioAsset(w, r, in.AudioAssetID) {
		return
	}
	tag, err := s.pool.Exec(r.Context(), `
		UPDATE tasks SET prompt = $2, passage = $3, options = $4, correct_index = $5, explanation = $6,
		       audio_asset_id = $7, audio_autoplay = $8, external_id = $9
		WHERE id = $1`,
		id, in.Prompt, in.Passage, in.Options, in.CorrectIndex, in.Explanation, in.AudioAssetID, autoplayOrDefault(in.AudioAutoplay), in.ExternalID)
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, errDuplicateTaskID)
		return
	}
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

// adminDeleteTask removes the task from the bank and therefore from every lesson that uses it.
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
	rows, err := s.pool.Query(r.Context(), `SELECT `+adminTaskColumns+` FROM tasks t WHERE t.id = $1`, id)
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

// ---- lesson <-> task links ----

func (s *Server) adminListLessonTasks(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "lessonID")
	if !ok {
		return
	}
	tasks, err := adminLessonTasks(r.Context(), s.pool, id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

// adminSetLessonTasks replaces the lesson's task list. The order of taskIds is the order in the lesson, so one call
// covers linking, unlinking and reordering.
func (s *Server) adminSetLessonTasks(w http.ResponseWriter, r *http.Request) {
	lessonID, ok := pathID(w, r, "lessonID")
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

	var lessonCourse int64
	if err := tx.QueryRow(ctx, `SELECT course_id FROM lessons WHERE id = $1`, lessonID).Scan(&lessonCourse); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "lesson not found")
			return
		}
		fail(w, err)
		return
	}
	if len(in.TaskIDs) > 0 {
		var found, inCourse int
		if err := tx.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE course_id = $2) FROM tasks WHERE id = ANY($1)`,
			in.TaskIDs, lessonCourse).Scan(&found, &inCourse); err != nil {
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
	if _, err := tx.Exec(ctx, `DELETE FROM lesson_tasks WHERE lesson_id = $1 AND NOT (task_id = ANY($2))`, lessonID, in.TaskIDs); err != nil {
		fail(w, err)
		return
	}
	for i, tid := range in.TaskIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO lesson_tasks (lesson_id, task_id, position) VALUES ($1, $2, $3)
			ON CONFLICT (lesson_id, task_id) DO UPDATE SET position = EXCLUDED.position`, lessonID, tid, i+1); err != nil {
			fail(w, err)
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, err)
		return
	}
	tasks, err := adminLessonTasks(ctx, s.pool, lessonID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

// adminBulkTasks applies delete / unlink / link to a set of bank tasks in one transaction.
func (s *Server) adminBulkTasks(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Action   string  `json:"action"`
		TaskIDs  []int64 `json:"taskIds"`
		LessonID int64   `json:"lessonId"`
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
		tag, err := tx.Exec(ctx, `DELETE FROM lesson_tasks WHERE task_id = ANY($1)`, in.TaskIDs)
		if err != nil {
			fail(w, err)
			return
		}
		affected = tag.RowsAffected()
	case "link":
		var lessonCourse int64
		if err := tx.QueryRow(ctx, `SELECT course_id FROM lessons WHERE id = $1`, in.LessonID).Scan(&lessonCourse); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "lesson not found")
				return
			}
			fail(w, err)
			return
		}
		var other int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM tasks WHERE id = ANY($1) AND course_id <> $2`, in.TaskIDs, lessonCourse).Scan(&other); err != nil {
			fail(w, err)
			return
		}
		if other > 0 {
			writeError(w, http.StatusBadRequest, errOtherCourse)
			return
		}
		// Append after the current last position, keeping the order of the request.
		tag, err := tx.Exec(ctx, `
			INSERT INTO lesson_tasks (lesson_id, task_id, position)
			SELECT $1, t.id, COALESCE((SELECT max(position) FROM lesson_tasks WHERE lesson_id = $1), 0) + u.ord
			FROM unnest($2::bigint[]) WITH ORDINALITY AS u(id, ord)
			JOIN tasks t ON t.id = u.id
			WHERE NOT EXISTS (SELECT 1 FROM lesson_tasks et WHERE et.lesson_id = $1 AND et.task_id = t.id)
			ON CONFLICT (lesson_id, task_id) DO NOTHING`, in.LessonID, in.TaskIDs)
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

// adminImportTasks creates many tasks in one transaction, optionally appending them to a lesson.
func (s *Server) adminImportTasks(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CourseID int64       `json:"courseId"`
		Tasks    []TaskInput `json:"tasks"`
		LessonID int64       `json:"lessonId"`
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
	if in.LessonID != 0 {
		var lessonCourse int64
		if err := tx.QueryRow(ctx, `SELECT course_id FROM lessons WHERE id = $1`, in.LessonID).Scan(&lessonCourse); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "lesson not found")
				return
			}
			fail(w, err)
			return
		}
		if lessonCourse != in.CourseID {
			writeError(w, http.StatusBadRequest, errOtherCourse)
			return
		}
		if err := tx.QueryRow(ctx, `SELECT COALESCE(max(position), 0) FROM lesson_tasks WHERE lesson_id = $1`, in.LessonID).Scan(&next); err != nil {
			fail(w, err)
			return
		}
	}
	for _, t := range in.Tasks {
		var id int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO tasks (course_id, prompt, passage, options, correct_index, explanation, external_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
			in.CourseID, t.Prompt, t.Passage, t.Options, t.CorrectIndex, t.Explanation, t.ExternalID).Scan(&id); err != nil {
			if isUniqueViolation(err) {
				writeError(w, http.StatusConflict, errDuplicateTaskID)
				return
			}
			fail(w, err)
			return
		}
		if in.LessonID != 0 {
			next++
			if _, err := tx.Exec(ctx, `INSERT INTO lesson_tasks (lesson_id, task_id, position) VALUES ($1, $2, $3)`, in.LessonID, id, next); err != nil {
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
