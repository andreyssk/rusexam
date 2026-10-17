package httpapi

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

const maxSoundBytes = 1 << 20

// soundSlots are the moments of a session that can have a sound.
var soundSlots = map[string]bool{
	"success":        true, // a correct answer
	"error":          true, // a wrong answer
	"row_5":          true, // the 5th correct answer in a row
	"row_10":         true,
	"row_15":         true,
	"finish":         true, // the session is over
	"finish_perfect": true, // the session is over and every answer was correct
}

// Sound is an uploaded session sound; the bytes are served by GET /sounds/{slot}/file.
type Sound struct {
	Slot      string    `json:"slot"`
	Size      int       `json:"size"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (s *Server) listSounds(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(), `SELECT slot, size, updated_at FROM sounds ORDER BY slot`)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()
	out := []Sound{}
	for rows.Next() {
		var x Sound
		if err := rows.Scan(&x.Slot, &x.Size, &x.UpdatedAt); err != nil {
			fail(w, err)
			return
		}
		out = append(out, x)
	}
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getSoundFile(w http.ResponseWriter, r *http.Request) {
	var (
		data    []byte
		mime    string
		updated time.Time
	)
	err := s.pool.QueryRow(r.Context(), `SELECT data, mime, updated_at FROM sounds WHERE slot = $1`, chi.URLParam(r, "slot")).Scan(&data, &mime, &updated)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "sound not found")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Cache-Control", "private, no-cache")
	http.ServeContent(w, r, "", updated, bytes.NewReader(data))
}

// adminPutSound sets (or replaces) the mp3 of a slot.
func (s *Server) adminPutSound(w http.ResponseWriter, r *http.Request) {
	slot := chi.URLParam(r, "slot")
	if !soundSlots[slot] {
		writeError(w, http.StatusNotFound, "unknown sound slot")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxSoundBytes+(1<<20))
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "the file is too large (max 1 MB)")
		} else {
			writeError(w, http.StatusBadRequest, "expected a multipart form")
		}
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "a file is required")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxSoundBytes+1))
	if err != nil {
		fail(w, err)
		return
	}
	if len(data) > maxSoundBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "the file is too large (max 1 MB)")
		return
	}
	mime := sniffAsset("audio", data)
	if mime == "" {
		writeError(w, http.StatusBadRequest, "the file must be an mp3")
		return
	}
	var x Sound
	err = s.pool.QueryRow(r.Context(),
		`INSERT INTO sounds (slot, mime, data, size) VALUES ($1, $2, $3, $4)
		 ON CONFLICT (slot) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, size = EXCLUDED.size, updated_at = now()
		 RETURNING slot, size, updated_at`, slot, mime, data, len(data)).Scan(&x.Slot, &x.Size, &x.UpdatedAt)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, x)
}

func (s *Server) adminDeleteSound(w http.ResponseWriter, r *http.Request) {
	tag, err := s.pool.Exec(r.Context(), `DELETE FROM sounds WHERE slot = $1`, chi.URLParam(r, "slot"))
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "sound not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
