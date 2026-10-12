-- +goose Up
ALTER TABLE users ADD COLUMN blocked_at TIMESTAMPTZ;

CREATE TABLE app_settings (
    key   TEXT  PRIMARY KEY,
    value JSONB NOT NULL
);
INSERT INTO app_settings (key, value) VALUES ('allow_signups', 'true');

-- Tasks stop belonging to a single exam: exams and tasks are linked many-to-many.
CREATE TABLE exam_tasks (
    exam_id  BIGINT NOT NULL REFERENCES exams (id) ON DELETE CASCADE,
    task_id  BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    position INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (exam_id, task_id)
);
CREATE INDEX exam_tasks_task_idx ON exam_tasks (task_id);

INSERT INTO exam_tasks (exam_id, task_id, position) SELECT exam_id, id, position FROM tasks;

DROP INDEX tasks_exam_idx;
ALTER TABLE tasks DROP COLUMN exam_id, DROP COLUMN position;

-- +goose Down
ALTER TABLE tasks ADD COLUMN exam_id BIGINT REFERENCES exams (id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN position INT NOT NULL DEFAULT 0;
-- Lossy: a task that is in several exams keeps only its first exam; unlinked tasks are dropped.
UPDATE tasks t SET exam_id = x.exam_id, position = x.position
FROM (SELECT DISTINCT ON (task_id) task_id, exam_id, position FROM exam_tasks ORDER BY task_id, exam_id) x
WHERE x.task_id = t.id;
DELETE FROM tasks WHERE exam_id IS NULL;
ALTER TABLE tasks ALTER COLUMN exam_id SET NOT NULL;
CREATE INDEX tasks_exam_idx ON tasks (exam_id, position, id);
DROP TABLE exam_tasks;
DROP TABLE app_settings;
ALTER TABLE users DROP COLUMN blocked_at;
