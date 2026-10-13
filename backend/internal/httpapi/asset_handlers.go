package httpapi

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const maxAssetBytes = 5 << 20

// Asset is a stored file (audio or an image) that tasks can use. The bytes are served by GET /assets/{id}/file.
type Asset struct {
	ID         int64     `json:"id"`
	Type       string    `json:"type"`
	Name       string    `json:"name"`
	ExternalID *string   `json:"externalId"`
	Mime       string    `json:"mime"`
	Size       int       `json:"size"`
	UsedCount  int       `json:"usedCount"`
	CreatedAt  time.Time `json:"createdAt"`
}

const assetsQuery = `
SELECT a.id, a.type, a.name, a.external_id, a.mime, a.size,
       (SELECT count(*) FROM tasks t WHERE t.audio_asset_id = a.id)::int, a.created_at
FROM assets a
WHERE ($1::bigint IS NULL OR a.id = $1)
  AND ($2 = '' OR a.type = $2)
ORDER BY a.id DESC`

func (s *Server) queryAssets(r *http.Request, id *int64, typ string) ([]Asset, error) {
	rows, err := s.pool.Query(r.Context(), assetsQuery, id, typ)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Asset{}
	for rows.Next() {
		var a Asset
		if err := rows.Scan(&a.ID, &a.Type, &a.Name, &a.ExternalID, &a.Mime, &a.Size, &a.UsedCount, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Server) writeAsset(w http.ResponseWriter, r *http.Request, id int64, status int) {
	assets, err := s.queryAssets(r, &id, "")
	if err != nil || len(assets) == 0 {
		fail(w, err)
		return
	}
	writeJSON(w, status, assets[0])
}

// assetForm is what the create/update forms (multipart) carry; File is empty when an update keeps the current file.
type assetForm struct {
	Type       string
	Name       string
	ExternalID *string
	File       []byte
	Mime       string
}

// sniffAsset reports the MIME type of the bytes when it is acceptable for the asset type, else "".
func sniffAsset(typ string, data []byte) string {
	mime := http.DetectContentType(data)
	switch typ {
	case "audio":
		if mime == "audio/mpeg" {
			return mime
		}
	case "image":
		switch mime {
		case "image/png", "image/jpeg", "image/gif", "image/webp":
			return mime
		}
	}
	return ""
}

// readAssetForm parses and validates the multipart body; it answers 400/413 itself and returns false on failure.
// requireFile is true when creating; an update may omit the file to change only the metadata.
func readAssetForm(w http.ResponseWriter, r *http.Request, requireFile bool) (assetForm, bool) {
	var f assetForm
	r.Body = http.MaxBytesReader(w, r.Body, maxAssetBytes+(1<<20))
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "the file is too large (max 5 MB)")
		} else {
			writeError(w, http.StatusBadRequest, "expected a multipart form")
		}
		return f, false
	}
	f.Type = r.FormValue("type")
	f.Name = strings.TrimSpace(r.FormValue("name"))
	if v := strings.TrimSpace(r.FormValue("externalId")); v != "" {
		f.ExternalID = &v
	}
	if f.Name == "" {
		writeError(w, http.StatusBadRequest, "a name is required")
		return f, false
	}
	if utf8.RuneCountInString(f.Name) > 200 || (f.ExternalID != nil && utf8.RuneCountInString(*f.ExternalID) > 100) {
		writeError(w, http.StatusBadRequest, "the name or the asset ID is too long")
		return f, false
	}
	file, _, err := r.FormFile("file")
	if errors.Is(err, http.ErrMissingFile) && !requireFile {
		return f, true
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "a file is required")
		return f, false
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxAssetBytes+1))
	if err != nil {
		fail(w, err)
		return f, false
	}
	if len(data) > maxAssetBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "the file is too large (max 5 MB)")
		return f, false
	}
	f.File = data
	return f, true
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (s *Server) adminListAssets(w http.ResponseWriter, r *http.Request) {
	typ := r.URL.Query().Get("type")
	if typ != "" && typ != "audio" && typ != "image" {
		writeError(w, http.StatusBadRequest, "type must be 'audio' or 'image'")
		return
	}
	assets, err := s.queryAssets(r, nil, typ)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assets)
}

func (s *Server) adminCreateAsset(w http.ResponseWriter, r *http.Request) {
	f, ok := readAssetForm(w, r, true)
	if !ok {
		return
	}
	if f.Type != "audio" && f.Type != "image" {
		writeError(w, http.StatusBadRequest, "type must be 'audio' or 'image'")
		return
	}
	mime := sniffAsset(f.Type, f.File)
	if mime == "" {
		writeError(w, http.StatusBadRequest, "the file does not match the type: audio must be an mp3, an image png, jpeg, gif or webp")
		return
	}
	var id int64
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO assets (type, name, external_id, mime, data, size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		f.Type, f.Name, f.ExternalID, mime, f.File, len(f.File)).Scan(&id)
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "an asset with this ID already exists")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	s.writeAsset(w, r, id, http.StatusCreated)
}

// adminUpdateAsset changes the name and external ID, and optionally replaces the file (of the same type).
func (s *Server) adminUpdateAsset(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "assetID")
	if !ok {
		return
	}
	f, ok := readAssetForm(w, r, false)
	if !ok {
		return
	}
	var typ string
	if err := s.pool.QueryRow(r.Context(), `SELECT type FROM assets WHERE id = $1`, id).Scan(&typ); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "asset not found")
			return
		}
		fail(w, err)
		return
	}
	var err error
	if len(f.File) > 0 {
		mime := sniffAsset(typ, f.File)
		if mime == "" {
			writeError(w, http.StatusBadRequest, "the file does not match the asset's type ("+typ+")")
			return
		}
		_, err = s.pool.Exec(r.Context(),
			`UPDATE assets SET name = $2, external_id = $3, mime = $4, data = $5, size = $6 WHERE id = $1`,
			id, f.Name, f.ExternalID, mime, f.File, len(f.File))
	} else {
		_, err = s.pool.Exec(r.Context(), `UPDATE assets SET name = $2, external_id = $3 WHERE id = $1`, id, f.Name, f.ExternalID)
	}
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "an asset with this ID already exists")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	s.writeAsset(w, r, id, http.StatusOK)
}

// adminDeleteAsset refuses to delete an asset that tasks still use.
func (s *Server) adminDeleteAsset(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "assetID")
	if !ok {
		return
	}
	tag, err := s.pool.Exec(r.Context(), `DELETE FROM assets WHERE id = $1`, id)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		writeError(w, http.StatusConflict, "the asset is still used by tasks; detach it from them first")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "asset not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// getAssetFile serves the asset's bytes (with range support, so audio can seek and resume).
func (s *Server) getAssetFile(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "assetID")
	if !ok {
		return
	}
	var (
		data    []byte
		mime    string
		created time.Time
	)
	if err := s.pool.QueryRow(r.Context(), `SELECT data, mime, created_at FROM assets WHERE id = $1`, id).Scan(&data, &mime, &created); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "asset not found")
			return
		}
		fail(w, err)
		return
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Cache-Control", "private, no-cache")
	http.ServeContent(w, r, "", created, bytes.NewReader(data))
}

// requireAudioAsset answers 400 itself and returns false when id is set but is not an existing audio asset.
func (s *Server) requireAudioAsset(w http.ResponseWriter, r *http.Request, id *int64) bool {
	if id == nil {
		return true
	}
	var typ string
	err := s.pool.QueryRow(r.Context(), `SELECT type FROM assets WHERE id = $1`, *id).Scan(&typ)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusBadRequest, "audio asset not found")
		return false
	}
	if err != nil {
		fail(w, err)
		return false
	}
	if typ != "audio" {
		writeError(w, http.StatusBadRequest, "the task's audio must be an audio asset")
		return false
	}
	return true
}
