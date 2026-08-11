# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# api-tests/Dockerfile — контрактные тесты backend (vitest + supertest).
# Отдельный npm-проект, НЕ импортирует исходники backend; ходит по HTTP
# на API_URL (см. docker-compose.yml, profile "test").
# One-shot контейнер: команда прогоняет тесты один раз и завершается —
# без этого `docker compose --profile test run --rm api-tests`
# (и `make test-api`) зависнет в watch-режиме.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION}

WORKDIR /app

# Отдельный слой зависимостей: инвалидируется только при изменении
# package.json/package-lock.json, не при правке спеков.
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NODE_ENV=test

# `vitest run` — одноразовый прогон (CI-режим), НЕ watch-режим `vitest`/`vitest dev`.
# Exit code vitest пробрасывается наружу и попадает в `make test-api`.
CMD ["npx", "vitest", "run"]
