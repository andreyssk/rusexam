-- +goose Up
-- Existing exams are already live, so they start approved; new ones start pending until an admin approves them.
ALTER TABLE exams ADD COLUMN status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved'));
ALTER TABLE exams ALTER COLUMN status SET DEFAULT 'pending';

-- +goose Down
ALTER TABLE exams DROP COLUMN status;
