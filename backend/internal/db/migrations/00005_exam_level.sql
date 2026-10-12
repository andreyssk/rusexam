-- +goose Up
ALTER TABLE exams ADD COLUMN level TEXT NOT NULL DEFAULT 'rvp' CHECK (level IN ('rvp', 'vnzh', 'citizenship'));

-- +goose Down
ALTER TABLE exams DROP COLUMN level;
