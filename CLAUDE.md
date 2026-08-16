# CLAUDE.md

Linkboard — сервис коротких ссылок со статистикой и admin-panel.
Источник истины по API, схеме БД и структуре: `docs/plans/linkboard.md`.
Текущий спринт: `sprints/`.
Инварианты подпроектов — во вложенных `CLAUDE.md`: `backend/`, `frontend/`, `api-tests/`, `e2e-tests/`.

## Команды
- `make start` / `make stop` / `make restart` / `make logs s=backend`
- `make migrate`, `make migration name=<name>` — TypeORM миграции
- `make test-unit` | `make test-api` | `make test-e2e` | `make test`
- api/e2e-тесты не запускать локальным npm — только через make: им нужен поднятый стек

## Стек
- backend: Nest.js + TypeORM + PostgreSQL 16, :8080
- frontend: Vite + React + react-router v7 + TanStack Query + recharts, :3000
- тесты: vitest (unit), vitest + supertest (api-tests), Playwright (e2e-tests)

## Инварианты — нарушать нельзя
- Все `/api/*` отвечают конвертом `{ data, error }`, ровно одно поле non-null.
  Конверт делают TransformInterceptor и HttpExceptionFilter — в контроллерах руками не собирать.
- Ошибки — только через `ApiException` с машинным `error.code` в SCREAMING_SNAKE.
  Голые исключения Nest фильтр маппит по статусу (404 → `NOT_FOUND`), доменного кода из них не получить.
- `GET /:code` не перехватывает `/api/*`: API-контроллеры объявляют полный путь
  (`@Controller('api/...')`), редирект — `@Controller()` + `@Get(':code')`. Глобального префикса нет.
- Редирект — 302 + `Cache-Control: no-store`. Не 301.
- Ошибка записи клика логируется, но не ломает редирект.
- `api-tests/` и `e2e-tests/` — отдельные npm-проекты. Не импортировать ничего
  из `backend/src` и `frontend/src`; только HTTP через API_URL / BASE_URL.
- Схема БД меняется только миграцией. `synchronize: true` не включать.
- Стейт-менеджера нет: серверные данные — TanStack Query,
  фильтры и пагинация — URL search params.

## Конвенции
- JSON — camelCase, БД — snake_case, даты в API — ISO 8601 UTC.
- Unit-спеки: frontend — рядом с кодом, backend — в `tests/` своего модуля (см. `backend/CLAUDE.md`).
- Новые архитектурные решения — в `docs/plans/`, не в этот файл.
- Идентификаторы и код — английский, комментарии и общение — русский.

## Workflow
- Перед фичей прочитать её раздел в `docs/plans/linkboard.md`.
- Изменил контракт API → в том же коммите обнови план и api-tests.
- Не добавлять сервисы в docker-compose и файлы в корень репозитория без явной просьбы.
