-- +goose Up
CREATE TABLE exam_categories (
    id         BIGSERIAL PRIMARY KEY,
    course_id  BIGINT      NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    title_ru   TEXT        NOT NULL DEFAULT '',
    title_en   TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exam_categories_course_idx ON exam_categories (course_id);

-- An exam is in at most one category (none = uncategorized); a category cannot be deleted while it has exams.
ALTER TABLE exams ADD COLUMN category_id BIGINT REFERENCES exam_categories (id) ON DELETE RESTRICT;
CREATE INDEX exams_category_idx ON exams (category_id);

-- +goose Down
ALTER TABLE exams DROP COLUMN category_id;
DROP TABLE exam_categories;
