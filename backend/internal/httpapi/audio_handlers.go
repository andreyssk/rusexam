package httpapi

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

const maxAudioBytes = 5 << 20

// getTaskAudio serves a task's mp3 (with range support, so browsers can seek and resume).
func (s *Server) getTaskAudio(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "taskID")
	if !ok {
		return
	}
	var data []byte
	var created time.Time
	err := s.pool.QueryRow(r.Context(), `SELECT data, created_at FROM task_audio WHERE task_id = $1`, id).Scan(&data, &created)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "this task has no audio")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "private, no-cache")
	http.ServeContent(w, r, "", created, bytes.NewReader(data))
}

// adminSetTaskAudio stores the request body (an mp3) as the task's audio, replacing any previous one.
func (s *Server) adminSetTaskAudio(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "taskID")
	if !ok {
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxAudioBytes))
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "the audio file is too large (max 5 MB)")
		return
	}
	if len(data) == 0 || http.DetectContentType(data) != "audio/mpeg" {
		writeError(w, http.StatusBadRequest, "the audio must be an mp3 file")
		return
	}
	var exists bool
	if err := s.pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM tasks WHERE id = $1)`, id).Scan(&exists); err != nil {
		fail(w, err)
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	if _, err := s.pool.Exec(r.Context(), `
		INSERT INTO task_audio (task_id, data) VALUES ($1, $2)
		ON CONFLICT (task_id) DO UPDATE SET data = EXCLUDED.data, created_at = now()`, id, data); err != nil {
		fail(w, err)
		return
	}
	s.writeAdminTask(w, r, id, http.StatusOK)
}

func (s *Server) adminDeleteTaskAudio(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "taskID")
	if !ok {
		return
	}
	if _, err := s.pool.Exec(r.Context(), `DELETE FROM task_audio WHERE task_id = $1`, id); err != nil {
		fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
