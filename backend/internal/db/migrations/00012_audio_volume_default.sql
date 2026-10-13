-- +goose Up
-- Start at half volume so nobody is startled. Accounts still at the old default (full volume) are moved too:
-- the setting is new, so those are almost certainly untouched.
ALTER TABLE users ALTER COLUMN audio_volume SET DEFAULT 0.5;
UPDATE users SET audio_volume = 0.5 WHERE audio_volume = 1;

-- +goose Down
ALTER TABLE users ALTER COLUMN audio_volume SET DEFAULT 1;
