-- +goose Up
-- Exam categories replaced the per-task section.
ALTER TABLE tasks DROP COLUMN section;

-- +goose Down
ALTER TABLE tasks ADD COLUMN section TEXT NOT NULL DEFAULT 'vocabulary' CHECK (section IN ('vocabulary', 'grammar', 'reading', 'history', 'law'));
