-- +goose Up
CREATE TABLE courses (
    id         BIGSERIAL PRIMARY KEY,
    title_ru   TEXT        NOT NULL DEFAULT '',
    title_en   TEXT        NOT NULL DEFAULT '',
    -- an emoji, e.g. a flag
    flag       TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO courses (title_ru, title_en, flag) VALUES ('Русский язык', 'Russian', '🇷🇺');

-- Every exam and every task belongs to exactly one course; a course cannot be deleted while it has content.
ALTER TABLE exams ADD COLUMN course_id BIGINT REFERENCES courses (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD COLUMN course_id BIGINT REFERENCES courses (id) ON DELETE RESTRICT;
UPDATE exams SET course_id = (SELECT min(id) FROM courses);
UPDATE tasks SET course_id = (SELECT min(id) FROM courses);
ALTER TABLE exams ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN course_id SET NOT NULL;
CREATE INDEX exams_course_idx ON exams (course_id);
CREATE INDEX tasks_course_idx ON tasks (course_id);

-- Courses replace the exam level.
ALTER TABLE exams DROP COLUMN level;

-- +goose Down
ALTER TABLE exams ADD COLUMN level TEXT NOT NULL DEFAULT 'rvp' CHECK (level IN ('rvp', 'vnzh', 'citizenship'));
ALTER TABLE tasks DROP COLUMN course_id;
ALTER TABLE exams DROP COLUMN course_id;
DROP TABLE courses;
