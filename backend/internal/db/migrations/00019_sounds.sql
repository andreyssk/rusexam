-- +goose Up
-- Session sounds uploaded by an admin, one mp3 per slot (see the slots in sounds_handlers.go).
CREATE TABLE sounds (
    slot       TEXT PRIMARY KEY,
    mime       TEXT        NOT NULL,
    data       BYTEA       NOT NULL,
    size       INT         NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The learner's switch for those sounds.
ALTER TABLE users ADD COLUMN sounds_enabled BOOLEAN NOT NULL DEFAULT true;

-- +goose Down
ALTER TABLE users DROP COLUMN sounds_enabled;
DROP TABLE sounds;
