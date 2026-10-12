-- +goose Up
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));

CREATE TABLE exams (
    id             BIGSERIAL PRIMARY KEY,
    title_ru       TEXT        NOT NULL DEFAULT '',
    title_en       TEXT        NOT NULL DEFAULT '',
    description_ru TEXT        NOT NULL DEFAULT '',
    description_en TEXT        NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
    id             BIGSERIAL PRIMARY KEY,
    exam_id        BIGINT NOT NULL REFERENCES exams (id) ON DELETE CASCADE,
    position       INT    NOT NULL DEFAULT 0,
    section        TEXT   NOT NULL CHECK (section IN ('vocabulary', 'grammar', 'reading', 'history', 'law')),
    prompt_ru      TEXT   NOT NULL DEFAULT '',
    prompt_en      TEXT   NOT NULL DEFAULT '',
    passage_ru     TEXT   NOT NULL DEFAULT '',
    passage_en     TEXT   NOT NULL DEFAULT '',
    -- [{"ru": "...", "en": "..."}, ...]
    options        JSONB  NOT NULL,
    correct_index  INT    NOT NULL CHECK (correct_index >= 0),
    explanation_ru TEXT   NOT NULL DEFAULT '',
    explanation_en TEXT   NOT NULL DEFAULT ''
);
CREATE INDEX tasks_exam_idx ON tasks (exam_id, position, id);

CREATE TABLE attempts (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    exam_id          BIGINT      NOT NULL REFERENCES exams (id) ON DELETE CASCADE,
    mode             TEXT        NOT NULL CHECK (mode IN ('training', 'exam')),
    status           TEXT        NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at      TIMESTAMPTZ,
    duration_seconds INT,
    correct_count    INT,
    total_count      INT,
    score_percent    NUMERIC(5, 2)
);
CREATE INDEX attempts_user_idx ON attempts (user_id, started_at DESC);
CREATE INDEX attempts_exam_completed_idx ON attempts (exam_id) WHERE status = 'completed';

CREATE TABLE attempt_answers (
    attempt_id     BIGINT      NOT NULL REFERENCES attempts (id) ON DELETE CASCADE,
    task_id        BIGINT      NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    selected_index INT         NOT NULL CHECK (selected_index >= 0),
    answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (attempt_id, task_id)
);

-- +goose Down
DROP TABLE attempt_answers;
DROP TABLE attempts;
DROP TABLE tasks;
DROP TABLE exams;
DROP TABLE users;
