-- +goose Up
-- The exam categories this user has collapsed on the home page (0 stands for the "no category" group).
ALTER TABLE users ADD COLUMN collapsed_categories BIGINT[] NOT NULL DEFAULT '{}';

-- +goose Down
ALTER TABLE users DROP COLUMN collapsed_categories;
