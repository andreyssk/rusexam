-- +goose Up
-- The task's ID in another system; optional and admin-only, unique when set.
ALTER TABLE tasks ADD COLUMN external_id TEXT UNIQUE;

-- +goose Down
ALTER TABLE tasks DROP COLUMN external_id;
