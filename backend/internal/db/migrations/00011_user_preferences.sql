-- +goose Up
-- Per-user settings that follow the account across devices (audio volume and speed so far).
ALTER TABLE users ADD COLUMN audio_volume REAL NOT NULL DEFAULT 1 CHECK (audio_volume BETWEEN 0 AND 1);
ALTER TABLE users ADD COLUMN audio_speed  REAL NOT NULL DEFAULT 1 CHECK (audio_speed BETWEEN 0.25 AND 4);

-- +goose Down
ALTER TABLE users DROP COLUMN audio_speed;
ALTER TABLE users DROP COLUMN audio_volume;
