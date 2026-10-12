# Russian exam prep

Practice tests for the Russian language, history and law exam (RVP, residence permit, citizenship), for English speakers.

- **Backend:** Go, chi, pgx (raw SQL), goose migrations (embedded, run on startup), PostgreSQL
- **Frontend:** React, Vite, bun, TanStack Query, React Router, Tailwind v4, Feature-Sliced Design
- **Contract:** [api/openapi.yaml](api/openapi.yaml). Frontend types are generated from it (`make gen-api`).

## Run

```sh
cp .env.example .env     # set JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
make dev-api             # terminal 1: Postgres (docker, port 5434) + API on :8081
make dev-web             # terminal 2: http://localhost:5174
```

The admin account comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD` and is re-synced on every API start.
`SEED_SAMPLE_DATA=true` loads two sample exams, but only while the exams table is empty.

## Auth

- Login returns a short-lived access token (JWT, `ACCESS_TOKEN_TTL`, default 15m). The frontend keeps it in memory only.
- A rotating refresh token (30 days) lives in an HttpOnly, SameSite=Lax cookie scoped to `/api/auth`, stored hashed in Postgres.
- On page load the session is restored by a silent refresh; the client also refreshes a minute before expiry,
  and replays a request once if it gets a 401. Set `COOKIE_SECURE=true` when serving over HTTPS.

## Behaviour

- **Training mode:** each answer is final and shows the correct answer plus an optional explanation.
- **Exam mode:** no feedback until the end; answers can be changed and earlier questions revisited.
- Unanswered questions count as wrong. The score is a percentage, computed once on finish.
- The timer has no limit; it counts while the tab is visible, survives reloads, and the time is saved on finish.
- Exam cards show the average result across all completed attempts, plus your best and last score when logged in.
- UI language EN/RU; task text is Russian with optional English translations.
- Duolingo-style look with Auto / Light / Dark themes, chosen in the header.
- Sections: vocabulary, grammar, reading, history, law. Speaking and listening are not implemented.

## Layout

```
api/openapi.yaml
backend/cmd/api, internal/{config,db,auth,httpapi}
frontend/src/{app,pages,widgets,features,entities,shared}
```

## Content note

The sample tasks in `backend/internal/db/seed/samples.json` are original practice material in the style of the
exam, not official Rosobrnadzor variants. Add real tasks through the admin panel (`/admin`).
