package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"rutest/internal/auth"
)

type Server struct {
	pool         *pgxpool.Pool
	tokens       *auth.Tokens
	cookieSecure bool
}

func New(pool *pgxpool.Pool, tokens *auth.Tokens, cookieSecure bool) http.Handler {
	s := &Server{pool: pool, tokens: tokens, cookieSecure: cookieSecure}

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)

	// chi's defaults are plain text; keep every API error in the same JSON shape.
	r.NotFound(func(w http.ResponseWriter, _ *http.Request) { writeError(w, http.StatusNotFound, "not found") })
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })

		r.Post("/auth/register", s.register)
		r.Post("/auth/login", s.login)
		r.Post("/auth/refresh", s.refresh)
		r.Post("/auth/logout", s.logout)

		r.Get("/courses", s.listCourses)
		r.Get("/categories", s.listCategories)
		r.With(s.optionalAuth).Get("/lessons", s.listLessons)
		r.With(s.optionalAuth).Get("/lessons/{lessonID}", s.getLesson)

		r.Get("/settings", s.getSettings)

		r.Group(func(r chi.Router) {
			r.Use(s.requireAuth)
			r.Get("/me", s.me)
			r.Get("/me/preferences", s.getPreferences)
			r.Put("/me/preferences", s.updatePreferences)
			r.Get("/assets/{assetID}/file", s.getAssetFile)

			// Taking lessons is for learners only; admins manage content and users.
			r.Group(func(r chi.Router) {
				r.Use(s.requireLearner)
				r.Get("/me/attempts", s.myAttempts)
				r.Get("/me/streak", s.myStreak)
				r.Get("/me/mistakes", s.myMistakes)
				r.Post("/lessons/{lessonID}/attempts", s.startAttempt)
				r.Get("/attempts/{attemptID}", s.getAttempt)
				r.Put("/attempts/{attemptID}/answers/{taskID}", s.saveAnswer)
				r.Post("/attempts/{attemptID}/finish", s.finishAttempt)
				r.Get("/attempts/{attemptID}/result", s.getResult)
			})
		})

		r.Route("/admin", func(r chi.Router) {
			r.Use(s.requireAuth, s.requireAdmin)
			r.Post("/courses", s.adminCreateCourse)
			r.Put("/courses/{courseID}", s.adminUpdateCourse)
			r.Delete("/courses/{courseID}", s.adminDeleteCourse)

			r.Post("/categories", s.adminCreateCategory)
			r.Put("/categories/{categoryID}", s.adminUpdateCategory)
			r.Delete("/categories/{categoryID}", s.adminDeleteCategory)

			r.Get("/assets", s.adminListAssets)
			r.Post("/assets", s.adminCreateAsset)
			r.Put("/assets/{assetID}", s.adminUpdateAsset)
			r.Delete("/assets/{assetID}", s.adminDeleteAsset)

			r.Post("/lessons", s.adminCreateLesson)
			r.Put("/lessons/{lessonID}", s.adminUpdateLesson)
			r.Put("/lessons/{lessonID}/status", s.adminSetLessonStatus)
			r.Delete("/lessons/{lessonID}", s.adminDeleteLesson)
			r.Get("/lessons/{lessonID}/tasks", s.adminListLessonTasks)
			r.Put("/lessons/{lessonID}/tasks", s.adminSetLessonTasks)

			r.Get("/tasks", s.adminListBankTasks)
			r.Post("/tasks", s.adminCreateTask)
			r.Post("/tasks/bulk", s.adminBulkTasks)
			r.Post("/tasks/import", s.adminImportTasks)
			r.Put("/tasks/{taskID}", s.adminUpdateTask)
			r.Delete("/tasks/{taskID}", s.adminDeleteTask)

			r.Get("/users", s.adminListUsers)
			r.Get("/users/{userID}", s.adminGetUser)
			r.Get("/users/{userID}/attempts", s.adminUserAttempts)
			r.Get("/attempts/{attemptID}/result", s.adminAttemptResult)
			r.Put("/users/{userID}/blocked", s.adminSetBlocked)
			r.Post("/users/{userID}/reset-password", s.adminResetPassword)
			r.Put("/settings", s.adminUpdateSettings)
		})
	})
	return r
}

// ---- auth middleware ----

type ctxKey struct{}

func (s *Server) claimsFrom(r *http.Request) (auth.Claims, bool) {
	h := r.Header.Get("Authorization")
	raw, ok := strings.CutPrefix(h, "Bearer ")
	if !ok {
		return auth.Claims{}, false
	}
	c, err := s.tokens.Parse(raw)
	return c, err == nil
}

func (s *Server) optionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, ok := s.claimsFrom(r); ok {
			r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, c))
		}
		next.ServeHTTP(w, r)
	})
}

// requireAuth validates the access token and re-checks the account in the database, so blocking a user or
// changing a role takes effect immediately instead of when the access token expires.
func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, ok := s.claimsFrom(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		var blocked bool
		err := s.pool.QueryRow(r.Context(), `SELECT role, blocked_at IS NOT NULL FROM users WHERE id = $1`, c.UserID).Scan(&c.Role, &blocked)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && blocked) {
			writeError(w, http.StatusUnauthorized, "account unavailable")
			return
		}
		if err != nil {
			fail(w, err)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, c)))
	})
}

func (s *Server) requireLearner(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, _ := r.Context().Value(ctxKey{}).(auth.Claims); c.Role == auth.RoleAdmin {
			writeError(w, http.StatusForbidden, "admins cannot take lessons")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, _ := r.Context().Value(ctxKey{}).(auth.Claims); c.Role != auth.RoleAdmin {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func claims(r *http.Request) (auth.Claims, bool) {
	c, ok := r.Context().Value(ctxKey{}).(auth.Claims)
	return c, ok
}

// ---- helpers ----

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func readJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		msg := "invalid JSON body"
		var typeErr *json.UnmarshalTypeError
		if errors.As(err, &typeErr) && typeErr.Field != "" {
			msg += ": wrong type for field " + typeErr.Field
		}
		writeError(w, http.StatusBadRequest, msg)
		return false
	}
	return true
}

func pathID(w http.ResponseWriter, r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, name), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "invalid "+name)
		return 0, false
	}
	return id, true
}

// fail maps a store error to a response; unknown errors are logged-by-middleware as 500s.
func fail(w http.ResponseWriter, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeError(w, http.StatusInternalServerError, "internal error")
}
