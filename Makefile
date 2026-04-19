# =====================================================================
#  Deliphone — developer commands
#  Usage: make <target>    (see `make help`)
# =====================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE ?= docker compose
BACKEND_SVC ?= backend

# -------- meta --------
.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# -------- install --------
.PHONY: install install-backend install-frontend
install: install-backend install-frontend ## Install all dependencies (uv + pnpm)

install-backend: ## Install Python deps via uv
	cd backend && uv sync

install-frontend: ## Install JS deps via pnpm (workspace)
	pnpm install

# -------- dev --------
.PHONY: dev dev-infra dev-frontend down clean
dev: dev-infra dev-frontend ## Start full local stack (docker + frontends)

dev-infra: ## Start docker services (postgres, redis, minio, backend)
	$(COMPOSE) up -d postgres redis minio minio-init $(BACKEND_SVC)
	@echo "→ API: http://localhost:8000/docs"
	@echo "→ MinIO console: http://localhost:9001 (minioadmin / minioadmin)"

dev-frontend: ## Run all three frontends in parallel
	pnpm -r --parallel dev

down: ## Stop docker services
	$(COMPOSE) down

clean: ## Stop and remove volumes (destroys local data)
	$(COMPOSE) down -v

# -------- migrations --------
.PHONY: migrate migration
migrate: ## Apply Alembic migrations
	$(COMPOSE) exec $(BACKEND_SVC) alembic upgrade head

migration: ## Create new migration: make migration name="add_users"
	@if [ -z "$(name)" ]; then echo "usage: make migration name=<message>"; exit 1; fi
	$(COMPOSE) exec $(BACKEND_SVC) alembic revision --autogenerate -m "$(name)"

# -------- test / lint --------
.PHONY: test test-backend test-frontend lint lint-backend lint-frontend format
test: test-backend test-frontend ## Run all tests

test-backend: ## Run pytest in backend container
	$(COMPOSE) exec $(BACKEND_SVC) pytest

test-frontend: ## Run frontend tests where defined
	pnpm -r test --if-present

lint: lint-backend lint-frontend ## Lint everything

lint-backend: ## Ruff + mypy
	cd backend && uv run ruff check . && uv run mypy app

lint-frontend: ## ESLint across workspaces
	pnpm -r lint --if-present

format: ## Ruff + prettier where present
	cd backend && uv run ruff format .
	pnpm -r format --if-present

# -------- shortcuts --------
.PHONY: logs shell
logs: ## Tail backend logs
	$(COMPOSE) logs -f $(BACKEND_SVC)

shell: ## Open shell in backend container
	$(COMPOSE) exec $(BACKEND_SVC) bash
