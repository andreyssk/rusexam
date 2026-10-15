-- +goose Up
-- "Work on mistakes": an attempt whose tasks are picked from the user's mistakes instead of coming from a lesson.
ALTER TABLE attempts ADD COLUMN kind TEXT NOT NULL DEFAULT 'lesson' CHECK (kind IN ('lesson', 'mistakes'));
ALTER TABLE attempts ALTER COLUMN lesson_id DROP NOT NULL;
ALTER TABLE attempts ADD CONSTRAINT attempts_kind_lesson_check CHECK ((kind = 'lesson') = (lesson_id IS NOT NULL));

-- The tasks of a mistakes attempt, in the order they were picked.
CREATE TABLE attempt_tasks (
    attempt_id BIGINT NOT NULL REFERENCES attempts (id) ON DELETE CASCADE,
    task_id    BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    position   INT    NOT NULL,
    PRIMARY KEY (attempt_id, task_id)
);

-- Each task done right in a finished "work on mistakes" lesson takes one mistake off its counter.
-- The counter is (wrong answers) minus (credits); credits never exceed the wrong answers, so they cannot be banked for later.
CREATE TABLE mistake_credits (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    task_id BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    credits INT    NOT NULL CHECK (credits >= 0),
    PRIMARY KEY (user_id, task_id)
);

-- +goose Down
DROP TABLE mistake_credits;
DROP TABLE attempt_tasks;
DELETE FROM attempts WHERE kind = 'mistakes';
ALTER TABLE attempts DROP CONSTRAINT attempts_kind_lesson_check;
ALTER TABLE attempts ALTER COLUMN lesson_id SET NOT NULL;
ALTER TABLE attempts DROP COLUMN kind;
