-- +goose Up
-- Files (audio, images) kept in the database and shared by any number of tasks.
CREATE TABLE assets (
    id          BIGSERIAL PRIMARY KEY,
    type        TEXT        NOT NULL CHECK (type IN ('audio', 'image')),
    name        TEXT        NOT NULL DEFAULT '',
    -- the asset's ID in another system; optional, but unique when set
    external_id TEXT UNIQUE,
    mime        TEXT        NOT NULL,
    data        BYTEA       NOT NULL,
    size        INT         NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    legacy_task_id BIGINT
);

-- A task's audio is now a reference to an asset (which cannot be deleted while a task uses it).
ALTER TABLE tasks ADD COLUMN audio_asset_id BIGINT REFERENCES assets (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD COLUMN audio_autoplay BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX tasks_audio_asset_idx ON tasks (audio_asset_id);

-- Audio that was attached straight to tasks becomes one asset per task.
INSERT INTO assets (type, name, mime, data, size, legacy_task_id)
SELECT 'audio', 'Task ' || task_id || ' audio', 'audio/mpeg', data, octet_length(data), task_id FROM task_audio;
UPDATE tasks t SET audio_asset_id = a.id FROM assets a WHERE a.legacy_task_id = t.id;
ALTER TABLE assets DROP COLUMN legacy_task_id;
DROP TABLE task_audio;

-- +goose Down
CREATE TABLE task_audio (
    task_id    BIGINT PRIMARY KEY REFERENCES tasks (id) ON DELETE CASCADE,
    data       BYTEA       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO task_audio (task_id, data) SELECT t.id, a.data FROM tasks t JOIN assets a ON a.id = t.audio_asset_id WHERE a.type = 'audio';
ALTER TABLE tasks DROP COLUMN audio_autoplay;
ALTER TABLE tasks DROP COLUMN audio_asset_id;
DROP TABLE assets;
