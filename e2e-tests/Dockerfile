# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# e2e-tests/Dockerfile — сквозные сценарии (Playwright) против admin-panel.
# Отдельный npm-проект, гоняется под compose profile "e2e" (не в make start).
#
# Базовый образ уже содержит Node.js, все браузеры Playwright (chromium,
# webkit, firefox) и их системные зависимости — устанавливать браузеры
# повторно (`playwright install`) не нужно и не следует: это будет
# бессмысленно дублировать то, что уже есть в образе, и раздувать сборку.
#
# ВАЖНО: тег образа (v1.55.0-jammy) должен ТОЧНО совпадать с версией пакета
# @playwright/test, зафиксированной в e2e-tests/package.json (появится в
# задаче T10). При несовпадении версий Playwright ругается предупреждением
# о рассинхроне версии CLI/браузеров и тестового раннера, возможны падения.
# Тег проверен на существование в реестре mcr.microsoft.com на момент
# написания (11.08.2026) — при обновлении @playwright/test синхронно
# обновить и этот тег.
# ---------------------------------------------------------------------------

FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

# Отдельный слой зависимостей: инвалидируется только при изменении
# package.json/package-lock.json, не при правке спеков/page-objects.
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NODE_ENV=test
ENV CI=true

# One-shot прогон, exit code пробрасывается в `make test-e2e`.
# HTML-репорт пишется в e2e-tests/playwright-report/, которая монтируется
# наружу volume'ом в docker-compose.yml.
CMD ["npx", "playwright", "test"]
