package httpapi

import (
	"crypto/rand"
	"errors"
	"math/big"
	"net/http"

	"github.com/jackc/pgx/v5"

	"rutest/internal/auth"
)

const tempPasswordAlphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no look-alike characters

func newTempPassword() (string, error) {
	out := make([]byte, 12)
	for i := range out {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(tempPasswordAlphabet))))
		if err != nil {
			return "", err
		}
		out[i] = tempPasswordAlphabet[n.Int64()]
	}
	return string(out), nil
}

func (s *Server) allowSignups(r *http.Request) (bool, error) {
	var v bool
	err := s.pool.QueryRow(r.Context(), `SELECT (value)::boolean FROM app_settings WHERE key = 'allow_signups'`).Scan(&v)
	return v, err
}

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	allow, err := s.allowSignups(r)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, Settings{AllowSignups: allow})
}

func (s *Server) adminUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var in Settings
	if !readJSON(w, r, &in) {
		return
	}
	if _, err := s.pool.Exec(r.Context(), `
		INSERT INTO app_settings (key, value) VALUES ('allow_signups', to_jsonb($1::boolean))
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, in.AllowSignups); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, in)
}

func (s *Server) adminListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(), `
		SELECT u.id, u.username, u.role, u.blocked_at IS NOT NULL, u.created_at,
		       (SELECT count(*) FROM attempts a WHERE a.user_id = u.id AND a.status = 'completed')::int
		FROM users u
		ORDER BY (u.role = 'admin') DESC, u.created_at DESC`)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()
	users := []AdminUser{}
	for rows.Next() {
		var u AdminUser
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.Blocked, &u.CreatedAt, &u.CompletedAttempts); err != nil {
			fail(w, err)
			return
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

// forceLogout ends every session of the user immediately (no rotation grace period).
const forceLogoutSQL = `UPDATE refresh_tokens SET revoked_at = now() - interval '1 hour' WHERE user_id = $1 AND revoked_at IS NULL`

func (s *Server) adminSetBlocked(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "userID")
	if !ok {
		return
	}
	var in struct {
		Blocked bool `json:"blocked"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	// Admin accounts are managed through the environment and cannot be blocked.
	tag, err := s.pool.Exec(r.Context(),
		`UPDATE users SET blocked_at = CASE WHEN $2 THEN COALESCE(blocked_at, now()) ELSE NULL END
		 WHERE id = $1 AND role = 'user'`, id, in.Blocked)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if in.Blocked {
		if _, err := s.pool.Exec(r.Context(), forceLogoutSQL, id); err != nil {
			fail(w, err)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// adminResetPassword sets a random temporary password, signs the user out everywhere and returns the
// password once so the admin can pass it on.
func (s *Server) adminResetPassword(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "userID")
	if !ok {
		return
	}
	temp, err := newTempPassword()
	if err != nil {
		fail(w, err)
		return
	}
	hash, err := auth.HashPassword(temp)
	if err != nil {
		fail(w, err)
		return
	}
	tag, err := s.pool.Exec(r.Context(), `UPDATE users SET password_hash = $2 WHERE id = $1 AND role = 'user'`, id, hash)
	if err != nil {
		fail(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if _, err := s.pool.Exec(r.Context(), forceLogoutSQL, id); err != nil {
		fail(w, err)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]string{"temporaryPassword": temp})
}

// adminUserHistory lists one user's attempts (the same list the user sees under History).
func (s *Server) adminUserHistory(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "userID")
	if !ok {
		return
	}
	var u AdminUser
	err := s.pool.QueryRow(r.Context(), `
		SELECT u.id, u.username, u.role, u.blocked_at IS NOT NULL, u.created_at,
		       (SELECT count(*) FROM attempts a WHERE a.user_id = u.id AND a.status = 'completed')::int
		FROM users u WHERE u.id = $1`, id).Scan(&u.ID, &u.Username, &u.Role, &u.Blocked, &u.CreatedAt, &u.CompletedAttempts)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		fail(w, err)
		return
	}
	attempts, err := s.queryAttempts(r, id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, UserHistory{User: u, Attempts: attempts})
}

// adminAttemptResult shows any user's finished attempt, with the answers they gave.
func (s *Server) adminAttemptResult(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "attemptID")
	if !ok {
		return
	}
	a, err := scanAttempt(s.pool.QueryRow(r.Context(), attemptSelect+` WHERE a.id = $1`, id))
	if err != nil {
		fail(w, err)
		return
	}
	if a.Status != "completed" {
		writeError(w, http.StatusConflict, "attempt is not finished yet")
		return
	}
	s.writeResult(w, r, a.ID)
}
