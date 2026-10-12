package httpapi

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"rutest/internal/auth"
)

var usernameRe = regexp.MustCompile(`^[A-Za-z0-9_.-]{3,32}$`)

type credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !readJSON(w, r, &in) {
		return
	}
	allow, err := s.allowSignups(r)
	if err != nil {
		fail(w, err)
		return
	}
	if !allow {
		writeError(w, http.StatusForbidden, "sign-ups are currently closed")
		return
	}
	in.Username = strings.TrimSpace(in.Username)
	if !usernameRe.MatchString(in.Username) {
		writeError(w, http.StatusBadRequest, "username must be 3-32 characters: letters, digits, _ . -")
		return
	}
	if len(in.Password) < 6 || len(in.Password) > 72 {
		writeError(w, http.StatusBadRequest, "password must be 6-72 characters")
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		fail(w, err)
		return
	}
	u := User{Username: in.Username, Role: auth.RoleUser}
	err = s.pool.QueryRow(r.Context(),
		`INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id`,
		in.Username, hash).Scan(&u.ID)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		writeError(w, http.StatusConflict, "username is already taken")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	s.startSession(w, r, http.StatusCreated, u)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !readJSON(w, r, &in) {
		return
	}
	var (
		u       User
		hash    string
		blocked bool
	)
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, username, role, password_hash, blocked_at IS NOT NULL FROM users WHERE lower(username) = lower($1)`,
		strings.TrimSpace(in.Username)).Scan(&u.ID, &u.Username, &u.Role, &hash, &blocked)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !auth.CheckPassword(hash, in.Password)) {
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if err != nil {
		fail(w, err)
		return
	}
	if blocked {
		writeError(w, http.StatusForbidden, "this account is blocked")
		return
	}
	s.startSession(w, r, http.StatusOK, u)
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	c, _ := claims(r)
	var u User
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, username, role FROM users WHERE id = $1`, c.UserID).Scan(&u.ID, &u.Username, &u.Role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "user no longer exists")
			return
		}
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, u)
}
