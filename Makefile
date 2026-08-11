SHELL := /bin/bash
COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help start stop restart logs ps migrate migration psql \
        test-unit test-api test-e2e test e2e-report db-reset clean

help: ## Показать список доступных команд
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

start: ## Поднять postgres + backend + frontend (docker compose up -d --build)
	$(COMPOSE) up -d --build

stop: ## Остановить и удалить контейнеры (docker compose down)
	$(COMPOSE) down

restart: stop start ## Перезапустить стек (stop + start)

logs: ## Логи всех сервисов, потоком. Использование: make logs [s=backend]
	$(COMPOSE) logs -f $(s)

ps: ## Статус контейнеров
	$(COMPOSE) ps

migrate: ## Прогнать миграции TypeORM в контейнере backend
	$(COMPOSE) exec backend npm run migration:run

migration: ## Сгенерировать новую миграцию. Использование: make migration name=AddLinksTable
	$(COMPOSE) exec backend npm run migration:generate -- src/database/migrations/$(name)

psql: ## Открыть psql внутри контейнера postgres
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-linkboard} -d $${POSTGRES_DB:-linkboard}

# ВАЖНО: до Фазы 1 (появления backend/frontend package.json и npm-скриптов "test")
# эта цель не будет находить, что запускать — приложений ещё нет (см. docs/plans/linkboard.md,
# "Порядок реализации"). Цель уже написана так, чтобы синтаксически быть готовой; заработает
# по факту появления npm-скриптов test в backend/package.json и frontend/package.json.
test-unit: ## Unit-тесты backend и frontend (без поднятия инфраструктуры)
	$(COMPOSE) run --rm --no-deps backend npm test
	$(COMPOSE) run --rm --no-deps frontend npm test

test-api: ## Контрактные тесты backend (profile test: поднимет postgres + backend)
	$(COMPOSE) --profile test run --rm api-tests

test-e2e: ## Сквозные Playwright-тесты (profile e2e: поднимет весь стек)
	$(COMPOSE) --profile e2e run --rm e2e-tests

test: test-unit test-api test-e2e ## Прогнать все уровни тестов последовательно (unit -> api -> e2e)

e2e-report: ## Открыть последний HTML-отчёт Playwright
	npx playwright show-report e2e-tests/playwright-report

db-reset: ## Пересоздать тестовую БД linkboard_test
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-linkboard} -d $${POSTGRES_DB:-linkboard} \
		-c "DROP DATABASE IF EXISTS linkboard_test WITH (FORCE);" \
		-c "CREATE DATABASE linkboard_test OWNER $${POSTGRES_USER:-linkboard};"

clean: ## Снести контейнеры, сети и volume (включая данные postgres)
	$(COMPOSE) down -v --remove-orphans
