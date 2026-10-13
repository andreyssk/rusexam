package httpapi

import (
	"context"
	"net/http"
	"strconv"

	"rutest/internal/auth"

	"github.com/jackc/pgx/v5"
)

type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

const lessonsQuery = `
SELECT e.id, e.course_id, e.category_id, e.status, e.preserve_order, e.title_ru, e.title_en, e.description_ru, e.description_en,
       (SELECT count(*) FROM lesson_tasks et WHERE et.lesson_id = e.id)::int,
       COALESCE(g.attempts, 0)::int, g.avg_score::float8,
       COALESCE(u.attempts, 0)::int, u.best::float8, u.last::float8
FROM lessons e
LEFT JOIN (
    SELECT lesson_id, count(*) AS attempts, avg(score_percent) AS avg_score
    FROM attempts WHERE status = 'completed' GROUP BY lesson_id
) g ON g.lesson_id = e.id
LEFT JOIN (
    SELECT lesson_id, count(*) AS attempts, max(score_percent) AS best,
           (array_agg(score_percent ORDER BY finished_at DESC))[1] AS last
    FROM attempts WHERE status = 'completed' AND user_id = $1 GROUP BY lesson_id
) u ON u.lesson_id = e.id
WHERE ($2::bigint IS NULL OR e.id = $2)
  AND ($3::bigint IS NULL OR e.course_id = $3)
  AND (NOT $4 OR e.status = 'approved')
ORDER BY e.id`

// queryLessons returns lessons with global stats; personal stats are filled when userID > 0.
// lessonID and courseID optionally narrow the result; onlyApproved hides lessons that are still pending.
func queryLessons(ctx context.Context, q querier, userID int64, lessonID, courseID *int64, onlyApproved bool) ([]Lesson, error) {
	rows, err := q.Query(ctx, lessonsQuery, userID, lessonID, courseID, onlyApproved)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	lessons := []Lesson{}
	for rows.Next() {
		var (
			e  Lesson
			my MyLessonStats
		)
		if err := rows.Scan(&e.ID, &e.CourseID, &e.CategoryID, &e.Status, &e.PreserveOrder, &e.TitleRu, &e.TitleEn, &e.DescriptionRu, &e.DescriptionEn,
			&e.TasksCount, &e.Stats.AttemptsCount, &e.Stats.AvgScore,
			&my.AttemptsCount, &my.BestScore, &my.LastScore); err != nil {
			return nil, err
		}
		if userID > 0 {
			e.MyStats = &my
		}
		lessons = append(lessons, e)
	}
	return lessons, rows.Err()
}

func (s *Server) listLessons(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	var courseID *int64
	if v := r.URL.Query().Get("courseId"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			writeError(w, http.StatusBadRequest, "invalid courseId")
			return
		}
		courseID = &id
	}
	lessons, err := queryLessons(r.Context(), s.pool, c.UserID, nil, courseID, c.Role != auth.RoleAdmin)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, lessons)
}

func (s *Server) getLesson(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "lessonID")
	if !ok {
		return
	}
	c, _ := claims(r)
	lessons, err := queryLessons(r.Context(), s.pool, c.UserID, &id, nil, c.Role != auth.RoleAdmin)
	if err != nil {
		fail(w, err)
		return
	}
	if len(lessons) == 0 {
		writeError(w, http.StatusNotFound, "lesson not found")
		return
	}
	writeJSON(w, http.StatusOK, lessons[0])
}

const taskColumns = `t.id, t.prompt, t.passage, t.options, t.correct_index, t.explanation, t.audio_asset_id, t.audio_autoplay`

func scanTask(row pgx.Row, extra ...any) (Task, error) {
	var t Task
	var ci int
	err := row.Scan(append([]any{&t.ID, &t.Prompt, &t.Passage,
		&t.Options, &ci, &t.Explanation, &t.AudioAssetID, &t.AudioAutoplay}, extra...)...)
	t.CorrectIndex = &ci
	return t, err
}

// loadTasks returns the lesson's tasks in order, including answers; callers hide what they must.
func loadTasks(ctx context.Context, q querier, lessonID int64) ([]Task, error) {
	rows, err := q.Query(ctx, `SELECT `+taskColumns+`
		FROM lesson_tasks et JOIN tasks t ON t.id = et.task_id
		WHERE et.lesson_id = $1 ORDER BY et.position, t.id`, lessonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tasks := []Task{}
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

// adminTaskColumns adds what only admins get to see: the course, the lessons using the task, and the external ID.
var adminTaskColumns = taskColumns + `, t.course_id, ` + usedInColumn + `, t.external_id`

const usedInColumn = `COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'titleRu', e.title_ru, 'titleEn', e.title_en) ORDER BY e.id)
	FROM lesson_tasks x JOIN lessons e ON e.id = x.lesson_id WHERE x.task_id = t.id), '[]'::jsonb)`

func scanAdminTasks(rows pgx.Rows) ([]AdminTask, error) {
	defer rows.Close()
	out := []AdminTask{}
	for rows.Next() {
		var (
			used     []LessonRef
			courseID int64
		)
		var ext *string
		t, err := scanTask(rows, &courseID, &used, &ext)
		if err != nil {
			return nil, err
		}
		if used == nil {
			used = []LessonRef{}
		}
		out = append(out, AdminTask{Task: t, CourseID: courseID, UsedIn: used, ExternalID: ext})
	}
	return out, rows.Err()
}

// adminBankTasks lists the task bank, optionally filtered by course, a text search and "not in any lesson".
func adminBankTasks(ctx context.Context, q querier, courseID *int64, search string, unassigned bool) ([]AdminTask, error) {
	rows, err := q.Query(ctx, `SELECT `+adminTaskColumns+`
		FROM tasks t
		WHERE ($2::bigint IS NULL OR t.course_id = $2)
		  AND ($1 = '' OR t.prompt ILIKE '%' || $1 || '%' OR t.external_id ILIKE '%' || $1 || '%')
		  AND (NOT $3 OR NOT EXISTS (SELECT 1 FROM lesson_tasks et WHERE et.task_id = t.id))
		ORDER BY t.id DESC`, search, courseID, unassigned)
	if err != nil {
		return nil, err
	}
	return scanAdminTasks(rows)
}

func adminLessonTasks(ctx context.Context, q querier, lessonID int64) ([]AdminTask, error) {
	rows, err := q.Query(ctx, `SELECT `+adminTaskColumns+`
		FROM lesson_tasks et JOIN tasks t ON t.id = et.task_id
		WHERE et.lesson_id = $1 ORDER BY et.position, t.id`, lessonID)
	if err != nil {
		return nil, err
	}
	return scanAdminTasks(rows)
}
