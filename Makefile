# Loads .env for host-run targets.
ENV = set -a; . ../.env; set +a;

.PHONY: db dev-api dev-web gen-api up down

db:           ## start Postgres
	docker compose up -d --wait db

dev-api: db   ## run the Go API on the host (migrates, creates admin, seeds samples)
	cd backend && $(ENV) go run ./cmd/api

dev-web:      ## run the Vite dev server (proxies /api to :8081)
	cd frontend && bun run dev

gen-api:      ## regenerate TS types from api/openapi.yaml
	cd frontend && bun run gen:api

up:           ## Postgres + API in Docker
	docker compose --profile full up -d --build

down:
	docker compose --profile full down
