package httpapi

import (
	"context"
	"net/http"

	"github.com/jackc/pgx/v5"
)

type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

const examsQuery = `
SELECT e.id, e.level, e.title_ru, e.title_en, e.description_ru, e.description_en,
       (SELECT count(*) FROM exam_tasks et WHERE et.exam_id = e.id)::int,
       (SELECT COALESCE(jsonb_object_agg(section, c), '{}'::jsonb)
          FROM (SELECT t.section, count(*)::int AS c FROM exam_tasks et JOIN tasks t ON t.id = et.task_id
                 WHERE et.exam_id = e.id GROUP BY t.section) x),
       COALESCE(g.attempts, 0)::int, g.avg_score::float8,
       COALESCE(u.attempts, 0)::int, u.best::float8, u.last::float8
FROM exams e
LEFT JOIN (
    SELECT exam_id, count(*) AS attempts, avg(score_percent) AS avg_score
    FROM attempts WHERE status = 'completed' GROUP BY exam_id
) g ON g.exam_id = e.id
LEFT JOIN (
    SELECT exam_id, count(*) AS attempts, max(score_percent) AS best,
           (array_agg(score_percent ORDER BY finished_at DESC))[1] AS last
    FROM attempts WHERE status = 'completed' AND user_id = $1 GROUP BY exam_id
) u ON u.exam_id = e.id
WHERE ($2::bigint IS NULL OR e.id = $2)
ORDER BY e.id`

// queryExams returns exams with global stats; personal stats are filled when userID > 0.
func queryExams(ctx context.Context, q querier, userID int64, examID *int64) ([]Exam, error) {
	rows, err := q.Query(ctx, examsQuery, userID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	exams := []Exam{}
	for rows.Next() {
		var (
			e  Exam
			my MyExamStats
		)
		if err := rows.Scan(&e.ID, &e.Level, &e.TitleRu, &e.TitleEn, &e.DescriptionRu, &e.DescriptionEn,
			&e.TasksCount, &e.Sections, &e.Stats.AttemptsCount, &e.Stats.AvgScore,
			&my.AttemptsCount, &my.BestScore, &my.LastScore); err != nil {
			return nil, err
		}
		if userID > 0 {
			e.MyStats = &my
		}
		exams = append(exams, e)
	}
	return exams, rows.Err()
}

func (s *Server) listExams(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	exams, err := queryExams(r.Context(), s.pool, c.UserID, nil)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, exams)
}

func (s *Server) getExam(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	c, _ := claims(r)
	exams, err := queryExams(r.Context(), s.pool, c.UserID, &id)
	if err != nil {
		fail(w, err)
		return
	}
	if len(exams) == 0 {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	}
	writeJSON(w, http.StatusOK, exams[0])
}

const taskColumns = `t.id, t.section, t.prompt, t.passage, t.options, t.correct_index, t.explanation`

func scanTask(row pgx.Row, extra ...any) (Task, error) {
	var t Task
	var ci int
	err := row.Scan(append([]any{&t.ID, &t.Section, &t.Prompt, &t.Passage,
		&t.Options, &ci, &t.Explanation}, extra...)...)
	t.CorrectIndex = &ci
	return t, err
}

// loadTasks returns the exam's tasks in order, including answers; callers hide what they must.
func loadTasks(ctx context.Context, q querier, examID int64) ([]Task, error) {
	rows, err := q.Query(ctx, `SELECT `+taskColumns+`
		FROM exam_tasks et JOIN tasks t ON t.id = et.task_id
		WHERE et.exam_id = $1 ORDER BY et.position, t.id`, examID)
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

const usedInColumn = `COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'titleRu', e.title_ru, 'titleEn', e.title_en) ORDER BY e.id)
	FROM exam_tasks x JOIN exams e ON e.id = x.exam_id WHERE x.task_id = t.id), '[]'::jsonb)`

func scanAdminTasks(rows pgx.Rows) ([]AdminTask, error) {
	defer rows.Close()
	out := []AdminTask{}
	for rows.Next() {
		var used []ExamRef
		t, err := scanTask(rows, &used)
		if err != nil {
			return nil, err
		}
		if used == nil {
			used = []ExamRef{}
		}
		out = append(out, AdminTask{Task: t, UsedIn: used})
	}
	return out, rows.Err()
}

// adminBankTasks lists the whole task bank, optionally filtered by section and a text search.
func adminBankTasks(ctx context.Context, q querier, section, search string) ([]AdminTask, error) {
	rows, err := q.Query(ctx, `SELECT `+taskColumns+`, `+usedInColumn+`
		FROM tasks t
		WHERE ($1 = '' OR t.section = $1)
		  AND ($2 = '' OR t.prompt ILIKE '%' || $2 || '%')
		ORDER BY t.id DESC`, section, search)
	if err != nil {
		return nil, err
	}
	return scanAdminTasks(rows)
}

func adminExamTasks(ctx context.Context, q querier, examID int64) ([]AdminTask, error) {
	rows, err := q.Query(ctx, `SELECT `+taskColumns+`, `+usedInColumn+`
		FROM exam_tasks et JOIN tasks t ON t.id = et.task_id
		WHERE et.exam_id = $1 ORDER BY et.position, t.id`, examID)
	if err != nil {
		return nil, err
	}
	return scanAdminTasks(rows)
}
