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
SELECT e.id, e.title_ru, e.title_en, e.description_ru, e.description_en,
       (SELECT count(*) FROM tasks t WHERE t.exam_id = e.id)::int,
       (SELECT COALESCE(jsonb_object_agg(section, c), '{}'::jsonb)
          FROM (SELECT section, count(*)::int AS c FROM tasks WHERE exam_id = e.id GROUP BY section) x),
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
		if err := rows.Scan(&e.ID, &e.TitleRu, &e.TitleEn, &e.DescriptionRu, &e.DescriptionEn,
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

const taskColumns = `id, exam_id, position, section, prompt_ru, prompt_en, passage_ru, passage_en,
	options, correct_index, explanation_ru, explanation_en`

// loadTasks returns full tasks (including answers) for an exam; callers hide what they must.
func loadTasks(ctx context.Context, q querier, examID int64) ([]Task, error) {
	rows, err := q.Query(ctx, `SELECT `+taskColumns+` FROM tasks WHERE exam_id = $1 ORDER BY position, id`, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tasks := []Task{}
	for rows.Next() {
		var t Task
		var ci int
		if err := rows.Scan(&t.ID, &t.ExamID, &t.Position, &t.Section, &t.PromptRu, &t.PromptEn,
			&t.PassageRu, &t.PassageEn, &t.Options, &ci, &t.ExplanationRu, &t.ExplanationEn); err != nil {
			return nil, err
		}
		t.CorrectIndex = &ci
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}
