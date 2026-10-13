package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgconn"
)

const coursesQuery = `
SELECT c.id, c.title_ru, c.title_en, c.flag,
       (SELECT count(*) FROM lessons e WHERE e.course_id = c.id)::int,
       (SELECT count(*) FROM tasks t WHERE t.course_id = c.id)::int
FROM courses c
WHERE ($1::bigint IS NULL OR c.id = $1)
ORDER BY c.id`

func (s *Server) queryCourses(r *http.Request, id *int64) ([]Course, error) {
	rows, err := s.pool.Query(r.Context(), coursesQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Course{}
	for rows.Next() {
		var c Course
		if err := rows.Scan(&c.ID, &c.TitleRu, &c.TitleEn, &c.Flag, &c.LessonsCount, &c.TasksCount); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func validateCourse(in *CourseInput) string {
	in.TitleRu, in.TitleEn, in.Flag = strings.TrimSpace(in.TitleRu), strings.TrimSpace(in.TitleEn), strings.TrimSpace(in.Flag)
	if in.TitleRu == "" && in.TitleEn == "" {
		return "a title is required (Russian or English)"
	}
	if in.Flag == "" {
		return "a flag is required"
	}
	if utf8.RuneCountInString(in.Flag) > 16 {
		return "the flag must be a single emoji"
	}
	return ""
}

// requireCourse answers 400/404 itself and returns false when courseID is missing or unknown.
func (s *Server) requireCourse(w http.ResponseWriter, r *http.Request, courseID int64) bool {
	if courseID <= 0 {
		writeError(w, http.StatusBadRequest, "courseId is required")
		return false
	}
	var exists bool
	if err := s.pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM courses WHERE id = $1)`, courseID).Scan(&exists); err != nil {
		fail(w, err)
		return false
	}
	if !exists {
		writeError(w, http.StatusNotFound, "course not found")
		return false
	}
	return true
}

func (s *Server) listCourses(w http.ResponseWriter, r *http.Request) {
	courses, err := s.queryCourses(r, nil)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, courses)
}

func (s *Server) writeCourse(w http.ResponseWriter, r *http.Request, id int64, status int) {
	courses, err := s.queryCourses(r, &id)
	if err != nil || len(courses) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, status, courses[0])
}

func (s *Server) adminCreateCourse(w http.ResponseWriter, r *http.Request) {
	var in CourseInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateCourse(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO courses (title_ru, title_en, flag) VALUES ($1, $2, $3) RETURNING id`,
		in.TitleRu, in.TitleEn, in.Flag).Scan(&id); err != nil {
		fail(w, err)
		return
	}
	s.writeCourse(w, r, id, http.StatusCreated)
}

func (s *Server) adminUpdateCourse(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "courseID")
	if !ok {
		return
	}
	var in CourseInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateCourse(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	tag, err := s.pool.Exec(r.Context(),
		`UPDATE courses SET title_ru = $2, title_en = $3, flag = $4 WHERE id = $1`, id, in.TitleRu, in.TitleEn, in.Flag)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "course not found")
		return
	}
	s.writeCourse(w, r, id, http.StatusOK)
}

// adminDeleteCourse refuses to delete a course that still has lessons or tasks, so content is never lost by accident.
func (s *Server) adminDeleteCourse(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "courseID")
	if !ok {
		return
	}
	tag, err := s.pool.Exec(r.Context(), `DELETE FROM courses WHERE id = $1`, id)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		writeError(w, http.StatusConflict, "the course still has lessons or tasks; delete or empty it first")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "course not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
