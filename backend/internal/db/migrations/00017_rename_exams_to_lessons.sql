-- +goose Up
-- What used to be called an exam is a lesson; "exam" is kept free for a separate feature later.
ALTER TABLE exams RENAME TO lessons;
ALTER TABLE exam_tasks RENAME TO lesson_tasks;
ALTER TABLE exam_categories RENAME TO lesson_categories;
ALTER TABLE lesson_tasks RENAME COLUMN exam_id TO lesson_id;
ALTER TABLE attempts RENAME COLUMN exam_id TO lesson_id;

ALTER SEQUENCE exams_id_seq RENAME TO lessons_id_seq;
ALTER SEQUENCE exam_categories_id_seq RENAME TO lesson_categories_id_seq;

-- Constraint names (primary keys take their indexes along).
ALTER TABLE lessons RENAME CONSTRAINT exams_pkey TO lessons_pkey;
ALTER TABLE lessons RENAME CONSTRAINT exams_category_id_fkey TO lessons_category_id_fkey;
ALTER TABLE lessons RENAME CONSTRAINT exams_course_id_fkey TO lessons_course_id_fkey;
ALTER TABLE lessons RENAME CONSTRAINT exams_status_check TO lessons_status_check;
ALTER TABLE lesson_tasks RENAME CONSTRAINT exam_tasks_pkey TO lesson_tasks_pkey;
ALTER TABLE lesson_tasks RENAME CONSTRAINT exam_tasks_exam_id_fkey TO lesson_tasks_lesson_id_fkey;
ALTER TABLE lesson_tasks RENAME CONSTRAINT exam_tasks_task_id_fkey TO lesson_tasks_task_id_fkey;
ALTER TABLE lesson_categories RENAME CONSTRAINT exam_categories_pkey TO lesson_categories_pkey;
ALTER TABLE lesson_categories RENAME CONSTRAINT exam_categories_course_id_fkey TO lesson_categories_course_id_fkey;
ALTER TABLE attempts RENAME CONSTRAINT attempts_exam_id_fkey TO attempts_lesson_id_fkey;

ALTER INDEX attempts_exam_completed_idx RENAME TO attempts_lesson_completed_idx;
ALTER INDEX exam_categories_course_idx RENAME TO lesson_categories_course_idx;
ALTER INDEX exam_tasks_task_idx RENAME TO lesson_tasks_task_idx;
ALTER INDEX exams_category_idx RENAME TO lessons_category_idx;
ALTER INDEX exams_course_idx RENAME TO lessons_course_idx;

-- +goose Down
ALTER INDEX lessons_course_idx RENAME TO exams_course_idx;
ALTER INDEX lessons_category_idx RENAME TO exams_category_idx;
ALTER INDEX lesson_tasks_task_idx RENAME TO exam_tasks_task_idx;
ALTER INDEX lesson_categories_course_idx RENAME TO exam_categories_course_idx;
ALTER INDEX attempts_lesson_completed_idx RENAME TO attempts_exam_completed_idx;

ALTER TABLE attempts RENAME CONSTRAINT attempts_lesson_id_fkey TO attempts_exam_id_fkey;
ALTER TABLE lesson_categories RENAME CONSTRAINT lesson_categories_course_id_fkey TO exam_categories_course_id_fkey;
ALTER TABLE lesson_categories RENAME CONSTRAINT lesson_categories_pkey TO exam_categories_pkey;
ALTER TABLE lesson_tasks RENAME CONSTRAINT lesson_tasks_task_id_fkey TO exam_tasks_task_id_fkey;
ALTER TABLE lesson_tasks RENAME CONSTRAINT lesson_tasks_lesson_id_fkey TO exam_tasks_exam_id_fkey;
ALTER TABLE lesson_tasks RENAME CONSTRAINT lesson_tasks_pkey TO exam_tasks_pkey;
ALTER TABLE lessons RENAME CONSTRAINT lessons_status_check TO exams_status_check;
ALTER TABLE lessons RENAME CONSTRAINT lessons_course_id_fkey TO exams_course_id_fkey;
ALTER TABLE lessons RENAME CONSTRAINT lessons_category_id_fkey TO exams_category_id_fkey;
ALTER TABLE lessons RENAME CONSTRAINT lessons_pkey TO exams_pkey;

ALTER SEQUENCE lesson_categories_id_seq RENAME TO exam_categories_id_seq;
ALTER SEQUENCE lessons_id_seq RENAME TO exams_id_seq;

ALTER TABLE attempts RENAME COLUMN lesson_id TO exam_id;
ALTER TABLE lesson_tasks RENAME COLUMN lesson_id TO exam_id;
ALTER TABLE lesson_categories RENAME TO exam_categories;
ALTER TABLE lesson_tasks RENAME TO exam_tasks;
ALTER TABLE lessons RENAME TO exams;
