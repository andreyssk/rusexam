package httpapi

import (
	"fmt"
	"net/http"
	"strings"
)

func validateExam(in *ExamInput) string {
	in.TitleRu, in.TitleEn = strings.TrimSpace(in.TitleRu), strings.TrimSpace(in.TitleEn)
	if in.TitleRu == "" && in.TitleEn == "" {
		return "a title is required (Russian or English)"
	}
	return ""
}

func validateTask(in *TaskInput) string {
	if !sections[in.Section] {
		return "unknown section"
	}
	in.PromptRu, in.PromptEn = strings.TrimSpace(in.PromptRu), strings.TrimSpace(in.PromptEn)
	if in.PromptRu == "" && in.PromptEn == "" {
		return "a prompt is required"
	}
	if len(in.Options) < 2 || len(in.Options) > 8 {
		return "between 2 and 8 options are required"
	}
	for i := range in.Options {
		in.Options[i].RU = strings.TrimSpace(in.Options[i].RU)
		in.Options[i].EN = strings.TrimSpace(in.Options[i].EN)
		if in.Options[i].RU == "" {
			return fmt.Sprintf("option %d needs Russian text", i+1)
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
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO exams (title_ru, title_en, description_ru, description_en) VALUES ($1, $2, $3, $4) RETURNING id`,
		in.TitleRu, in.TitleEn, in.DescriptionRu, in.DescriptionEn).Scan(&id); err != nil {
		fail(w, err)
		return
	}
	exams, err := queryExams(r.Context(), s.pool, 0, &id)
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
	tag, err := s.pool.Exec(r.Context(),
		`UPDATE exams SET title_ru = $2, title_en = $3, description_ru = $4, description_en = $5, updated_at = now()
		 WHERE id = $1`, id, in.TitleRu, in.TitleEn, in.DescriptionRu, in.DescriptionEn)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	}
	exams, err := queryExams(r.Context(), s.pool, 0, &id)
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

func (s *Server) adminListTasks(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "examID")
	if !ok {
		return
	}
	tasks, err := loadTasks(r.Context(), s.pool, id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (s *Server) adminCreateTask(w http.ResponseWriter, r *http.Request) {
	examID, ok := pathID(w, r, "examID")
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
	var exists bool
	if err := s.pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM exams WHERE id = $1)`, examID).Scan(&exists); err != nil {
		fail(w, err)
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	}
	var id int64
	err := s.pool.QueryRow(r.Context(), `
		INSERT INTO tasks (exam_id, position, section, prompt_ru, prompt_en, passage_ru, passage_en,
		                   options, correct_index, explanation_ru, explanation_en)
		VALUES ($1, COALESCE($2, (SELECT COALESCE(max(position), 0) + 1 FROM tasks WHERE exam_id = $1)),
		        $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id`,
		examID, in.Position, in.Section, in.PromptRu, in.PromptEn, in.PassageRu, in.PassageEn,
		in.Options, in.CorrectIndex, in.ExplanationRu, in.ExplanationEn).Scan(&id)
	if err != nil {
		fail(w, err)
		return
	}
	s.writeTask(w, r, id, http.StatusCreated)
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
		UPDATE tasks SET position = COALESCE($2, position), section = $3, prompt_ru = $4, prompt_en = $5,
		       passage_ru = $6, passage_en = $7, options = $8, correct_index = $9,
		       explanation_ru = $10, explanation_en = $11
		WHERE id = $1`,
		id, in.Position, in.Section, in.PromptRu, in.PromptEn, in.PassageRu, in.PassageEn,
		in.Options, in.CorrectIndex, in.ExplanationRu, in.ExplanationEn)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	s.writeTask(w, r, id, http.StatusOK)
}

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

func (s *Server) writeTask(w http.ResponseWriter, r *http.Request, id int64, status int) {
	var t Task
	var ci int
	err := s.pool.QueryRow(r.Context(), `SELECT `+taskColumns+` FROM tasks WHERE id = $1`, id).Scan(
		&t.ID, &t.ExamID, &t.Position, &t.Section, &t.PromptRu, &t.PromptEn, &t.PassageRu, &t.PassageEn,
		&t.Options, &ci, &t.ExplanationRu, &t.ExplanationEn)
	if err != nil {
		fail(w, err)
		return
	}
	t.CorrectIndex = &ci
	writeJSON(w, status, t)
}
