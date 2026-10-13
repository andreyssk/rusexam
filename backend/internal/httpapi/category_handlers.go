package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const categoriesQuery = `
SELECT c.id, c.course_id, c.title_ru, c.title_en,
       (SELECT count(*) FROM lessons e WHERE e.category_id = c.id)::int
FROM lesson_categories c
WHERE ($1::bigint IS NULL OR c.id = $1)
  AND ($2::bigint IS NULL OR c.course_id = $2)
ORDER BY c.id`

func (s *Server) queryCategories(r *http.Request, id, courseID *int64) ([]Category, error) {
	rows, err := s.pool.Query(r.Context(), categoriesQuery, id, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.CourseID, &c.TitleRu, &c.TitleEn, &c.LessonsCount); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func validateCategory(in *CategoryInput) string {
	in.TitleRu, in.TitleEn = strings.TrimSpace(in.TitleRu), strings.TrimSpace(in.TitleEn)
	if in.TitleRu == "" && in.TitleEn == "" {
		return "a title is required (Russian or English)"
	}
	return ""
}

// requireCategoryIn answers 400 itself and returns false when a non-nil categoryID is unknown or belongs to another course.
func (s *Server) requireCategoryIn(w http.ResponseWriter, r *http.Request, categoryID *int64, courseID int64) bool {
	if categoryID == nil {
		return true
	}
	var catCourse int64
	err := s.pool.QueryRow(r.Context(), `SELECT course_id FROM lesson_categories WHERE id = $1`, *categoryID).Scan(&catCourse)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusBadRequest, "category not found")
		return false
	}
	if err != nil {
		fail(w, err)
		return false
	}
	if catCourse != courseID {
		writeError(w, http.StatusBadRequest, "the category belongs to another course")
		return false
	}
	return true
}

func (s *Server) listCategories(w http.ResponseWriter, r *http.Request) {
	var courseID *int64
	if v := r.URL.Query().Get("courseId"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			writeError(w, http.StatusBadRequest, "invalid courseId")
			return
		}
		courseID = &id
	}
	categories, err := s.queryCategories(r, nil, courseID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

func (s *Server) writeCategory(w http.ResponseWriter, r *http.Request, id int64, status int) {
	categories, err := s.queryCategories(r, &id, nil)
	if err != nil || len(categories) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, status, categories[0])
}

func (s *Server) adminCreateCategory(w http.ResponseWriter, r *http.Request) {
	var in CategoryInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateCategory(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if !s.requireCourse(w, r, in.CourseID) {
		return
	}
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO lesson_categories (course_id, title_ru, title_en) VALUES ($1, $2, $3) RETURNING id`,
		in.CourseID, in.TitleRu, in.TitleEn).Scan(&id); err != nil {
		fail(w, err)
		return
	}
	s.writeCategory(w, r, id, http.StatusCreated)
}

func (s *Server) adminUpdateCategory(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "categoryID")
	if !ok {
		return
	}
	var in CategoryInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := validateCategory(&in); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	tag, err := s.pool.Exec(r.Context(),
		`UPDATE lesson_categories SET title_ru = $2, title_en = $3 WHERE id = $1`, id, in.TitleRu, in.TitleEn)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}
	s.writeCategory(w, r, id, http.StatusOK)
}

// adminDeleteCategory refuses to delete a category that still has lessons, so lessons are never silently reshuffled.
func (s *Server) adminDeleteCategory(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "categoryID")
	if !ok {
		return
	}
	tag, err := s.pool.Exec(r.Context(), `DELETE FROM lesson_categories WHERE id = $1`, id)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		writeError(w, http.StatusConflict, "the category still has lessons; move or delete them first")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
