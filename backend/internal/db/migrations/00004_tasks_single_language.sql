-- +goose Up
-- Task content is Russian only (it is the language being tested); the UI language stays switchable.
UPDATE tasks SET prompt_ru = prompt_en WHERE prompt_ru = '';
UPDATE tasks SET passage_ru = passage_en WHERE passage_ru = '';
UPDATE tasks SET explanation_ru = explanation_en WHERE explanation_ru = '';
ALTER TABLE tasks DROP COLUMN prompt_en, DROP COLUMN passage_en, DROP COLUMN explanation_en;
ALTER TABLE tasks RENAME COLUMN prompt_ru TO prompt;
ALTER TABLE tasks RENAME COLUMN passage_ru TO passage;
ALTER TABLE tasks RENAME COLUMN explanation_ru TO explanation;
-- options: [{"ru": "...", "en": "..."}] -> ["...", ...]
UPDATE tasks SET options = (
    SELECT COALESCE(jsonb_agg(o -> 'ru' ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(options) WITH ORDINALITY AS x(o, ord)
);

-- +goose Down
ALTER TABLE tasks RENAME COLUMN prompt TO prompt_ru;
ALTER TABLE tasks RENAME COLUMN passage TO passage_ru;
ALTER TABLE tasks RENAME COLUMN explanation TO explanation_ru;
ALTER TABLE tasks ADD COLUMN prompt_en TEXT NOT NULL DEFAULT '',
                  ADD COLUMN passage_en TEXT NOT NULL DEFAULT '',
                  ADD COLUMN explanation_en TEXT NOT NULL DEFAULT '';
UPDATE tasks SET options = (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('ru', o) ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(options) WITH ORDINALITY AS x(o, ord)
);
