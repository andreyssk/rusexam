-- +goose Up
-- When set, sessions keep the exam's task order instead of shuffling it (answers are still shuffled).
ALTER TABLE exams ADD COLUMN preserve_order BOOLEAN NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE exams DROP COLUMN preserve_order;
