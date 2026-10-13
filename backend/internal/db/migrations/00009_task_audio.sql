-- +goose Up
-- An optional mp3 for a task, kept apart from tasks so listing tasks never drags the audio bytes along.
CREATE TABLE task_audio (
    task_id    BIGINT PRIMARY KEY REFERENCES tasks (id) ON DELETE CASCADE,
    data       BYTEA       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE task_audio;
