package httpapi

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"

	"rutest/internal/auth"
)

const (
	refreshCookie = "rt"
	refreshTTL    = 30 * 24 * time.Hour
	// A just-rotated token is still accepted briefly so that two tabs refreshing at the same time
	// do not log each other out.
	rotationGrace = 10 * time.Second
)

func (s *Server) setRefreshCookie(w http.ResponseWriter, raw string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookie,
		Value:    raw,
		Path:     "/api/auth",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   s.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) clearRefreshCookie(w http.ResponseWriter) { s.setRefreshCookie(w, "", -1) }

// issueRefreshToken stores a new refresh token and returns the raw value to put in the cookie.
func issueRefreshToken(ctx context.Context, tx pgx.Tx, userID int64) (string, error) {
	raw, hash, err := auth.NewRefreshToken()
	if err != nil {
		return "", err
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + $3::interval)`,
		userID, hash, refreshTTL.String())
	return raw, err
}

// startSession is used after login/registration: it sets the refresh cookie and returns an access token.
func (s *Server) startSession(w http.ResponseWriter, r *http.Request, status int, u User) {
	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		fail(w, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Housekeeping: drop tokens that expired a while ago.
	if _, err := tx.Exec(ctx, `DELETE FROM refresh_tokens WHERE expires_at < now() - interval '1 day'`); err != nil {
		fail(w, err)
		return
	}
	raw, err := issueRefreshToken(ctx, tx, u.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, err)
		return
	}
	s.respondWithSession(w, status, u, raw)
}

func (s *Server) respondWithSession(w http.ResponseWriter, status int, u User, refreshRaw string) {
	access, err := s.tokens.Issue(u.ID, u.Role)
	if err != nil {
		fail(w, err)
		return
	}
	s.setRefreshCookie(w, refreshRaw, int(refreshTTL.Seconds()))
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, status, AuthResponse{Token: access, User: u})
}

// refresh rotates the refresh token and returns a new access token.
func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cookie, err := r.Cookie(refreshCookie)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "no session")
		return
	}
	hash := auth.HashRefreshToken(cookie.Value)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		fail(w, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var (
		tokenID   int64
		expiresAt time.Time
		revokedAt *time.Time
		blocked   bool
		u         User
	)
	err = tx.QueryRow(ctx, `
		SELECT rt.id, rt.expires_at, rt.revoked_at, u.blocked_at IS NOT NULL, u.id, u.username, u.role
		FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
		WHERE rt.token_hash = $1
		FOR UPDATE OF rt`, hash).Scan(&tokenID, &expiresAt, &revokedAt, &blocked, &u.ID, &u.Username, &u.Role)
	now := time.Now()
	invalid := errors.Is(err, pgx.ErrNoRows) ||
		(err == nil && (blocked || now.After(expiresAt) || (revokedAt != nil && now.Sub(*revokedAt) > rotationGrace)))
	if invalid {
		s.clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "session expired")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}

	if revokedAt == nil {
		if _, err := tx.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, tokenID); err != nil {
			fail(w, err)
			return
		}
	}
	raw, err := issueRefreshToken(ctx, tx, u.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		fail(w, err)
		return
	}
	s.respondWithSession(w, http.StatusOK, u, raw)
}

// logout revokes the current refresh token. It does not require a valid access token.
func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(refreshCookie); err == nil && cookie.Value != "" {
		_, _ = s.pool.Exec(r.Context(),
			`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
			auth.HashRefreshToken(cookie.Value))
	}
	s.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}
