package db

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"rutest/internal/auth"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

//go:embed seed/samples.json
var samplesJSON []byte

func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

func Migrate(pool *pgxpool.Pool) error {
	goose.SetBaseFS(migrationsFS)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	sqlDB := stdlib.OpenDBFromPool(pool)
	defer func(db *sql.DB) { _ = db.Close() }(sqlDB)
	return goose.Up(sqlDB, "migrations")
}

// EnsureAdmin creates the admin account or resets its password and role to match the environment.
func EnsureAdmin(ctx context.Context, pool *pgxpool.Pool, username, password string) error {
	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')
		ON CONFLICT (lower(username)) DO UPDATE
		SET password_hash = EXCLUDED.password_hash, role = 'admin', blocked_at = NULL`,
		username, hash)
	return err
}

type seedExam struct {
	TitleRu       string     `json:"titleRu"`
	TitleEn       string     `json:"titleEn"`
	DescriptionRu string     `json:"descriptionRu"`
	DescriptionEn string     `json:"descriptionEn"`
	Tasks         []seedTask `json:"tasks"`
}

type seedTask struct {
	Section      string   `json:"section"`
	Prompt       string   `json:"prompt"`
	Passage      string   `json:"passage"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
	Explanation  string   `json:"explanation"`
}

// SeedSamples inserts the bundled sample exams, but only into an empty exams table.
func SeedSamples(ctx context.Context, pool *pgxpool.Pool) error {
	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM exams`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	var exams []seedExam
	if err := json.Unmarshal(samplesJSON, &exams); err != nil {
		return fmt.Errorf("parse samples.json: %w", err)
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	// The samples go into the first course (the migration creates one).
	var courseID int64
	if err := tx.QueryRow(ctx, `SELECT id FROM courses ORDER BY id LIMIT 1`).Scan(&courseID); err != nil {
		return err
	}
	for _, e := range exams {
		var examID int64
		err := tx.QueryRow(ctx, `
			INSERT INTO exams (course_id, title_ru, title_en, description_ru, description_en)
			VALUES ($1, $2, $3, $4, $5) RETURNING id`,
			courseID, e.TitleRu, e.TitleEn, e.DescriptionRu, e.DescriptionEn).Scan(&examID)
		if err != nil {
			return err
		}
		for i, t := range e.Tasks {
			opts, err := json.Marshal(t.Options)
			if err != nil {
				return err
			}
			var taskID int64
			err = tx.QueryRow(ctx, `
				INSERT INTO tasks (course_id, section, prompt, passage, options, correct_index, explanation)
				VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
				courseID, t.Section, t.Prompt, t.Passage, opts, t.CorrectIndex, t.Explanation).Scan(&taskID)
			if err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `INSERT INTO exam_tasks (exam_id, task_id, position) VALUES ($1, $2, $3)`,
				examID, taskID, i+1); err != nil {
				return err
			}
		}
	}
	return tx.Commit(ctx)
}
