# Linkboard — сервис коротких ссылок со статистикой

Архитектурный план. Статус: утверждается. Дата: 2026-08-11.

## 1. Обзор архитектуры

Linkboard состоит из трёх компонентов, поднимаемых через docker-compose:

- **backend** — Nest.js (порт **8080**): REST API для управления ссылками и аналитикой + публичный редирект-эндпоинт `GET /:code`. При редиректе асинхронно фиксирует событие клика в PostgreSQL.
- **frontend** — Vite + React (порт **3000**): admin-panel для создания ссылок и просмотра аналитики. Ходит в backend по REST (`/api/*`).
- **postgres** — PostgreSQL 16: хранит ссылки и сырые события кликов (event-таблица), по которой строится аналитика агрегирующими запросами.

Плюс два отдельных тестовых проекта, которые не являются частью рантайма и поднимаются в compose под своими profiles: **api-tests** (vitest + supertest, чёрный ящик по HTTP только для backend) и **e2e-tests** (Playwright, сквозные сценарии через реальную admin-panel). Подробности — в разделе 5.

Все API-ответы (кроме самого редиректа, который отвечает HTTP 302) — в формате `{ data, error }`.

```mermaid
flowchart LR
    subgraph Public
        V[Посетитель]
    end
    subgraph Admin
        A[Админ] --> FE[frontend<br/>Vite + React :3000]
    end

    FE -- "REST /api/* { data, error }" --> BE[backend<br/>Nest.js :8080]
    V -- "GET /:code" --> BE
    BE -- "302 Location: original_url" --> V
    BE -- "SQL" --> DB[(PostgreSQL :5432)]

    subgraph BE_internals [backend модули]
        direction TB
        LinksModule
        RedirectModule
        StatsModule
    end
```

Поток редиректа:

```mermaid
sequenceDiagram
    participant V as Посетитель
    participant BE as backend :8080
    participant DB as PostgreSQL
    V->>BE: GET /r7Ab3xZ
    BE->>DB: SELECT * FROM links WHERE code = 'r7Ab3xZ'
    alt ссылка найдена
        BE-->>V: 302 Location: https://original.url
        BE->>DB: INSERT INTO click_events (link_id, referer, user_agent, ip_hash, ...)
    else не найдена
        BE-->>V: 404 { data: null, error: { code: "LINK_NOT_FOUND", ... } }
    end
```

Ключевые решения:

- **Редирект — 302** (не 301), чтобы браузеры не кешировали ответ и каждый переход доходил до сервера и учитывался в статистике. `Cache-Control: no-store`.
- **Запись клика — после отправки редиректа** (fire-and-forget внутри запроса): посетитель не ждёт INSERT; ошибка записи клика логируется, но не ломает редирект.
- **Сырые события кликов** хранятся в отдельной таблице `click_events`; денормализованный счётчик `links.clicks_count` обновляется инкрементом для быстрого списка ссылок. Аналитика (по дням, топ, срезы по referer/UA) считается запросами по `click_events` с индексами — на масштабе pet/small-service этого достаточно; при росте добавится матвью/rollup-таблица (вне скоупа v1).
- Аутентификация admin-panel в v1 отсутствует (single-user, локальный запуск); слой guards закладывается в структуру, чтобы добавить её позже без перестройки.

## 2. Схема БД

### 2.1. DDL

```sql
CREATE TABLE links (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          VARCHAR(16)  NOT NULL,               -- короткий код
    original_url  TEXT         NOT NULL,               -- целевой URL (валидируется: http/https, до 2048 симв.)
    title         VARCHAR(255),                        -- опциональное человекочитаемое имя
    clicks_count  BIGINT       NOT NULL DEFAULT 0,     -- денормализованный счётчик
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,  -- мягкое отключение ссылки
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_links_code UNIQUE (code)
);

CREATE TABLE click_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    link_id     BIGINT      NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    referer     TEXT,                                  -- заголовок Referer (может отсутствовать)
    user_agent  TEXT,                                  -- заголовок User-Agent
    ip_hash     CHAR(64),                              -- sha256(ip + суточная соль): уникальные посетители без хранения PII
    country     CHAR(2)                                -- ISO-код страны (v1: NULL, задел под GeoIP)
);

-- Индексы
CREATE INDEX idx_click_events_link_time ON click_events (link_id, occurred_at);
CREATE INDEX idx_click_events_time      ON click_events (occurred_at);         -- глобальные графики дашборда
CREATE INDEX idx_links_created_at       ON links (created_at DESC);            -- сортировка списка
-- uq_links_code уже даёт индекс для lookup'а редиректа
```

### 2.2. Сводно

| Таблица | Поле | Тип | Назначение |
|---|---|---|---|
| links | id | BIGINT PK | идентификатор |
| links | code | VARCHAR(16), UNIQUE | короткий код (7 симв. авто / 3–16 кастомный alias) |
| links | original_url | TEXT | длинный URL |
| links | title | VARCHAR(255) NULL | название для админки |
| links | clicks_count | BIGINT | быстрый счётчик для списков |
| links | is_active | BOOLEAN | выключенная ссылка отдаёт 410 |
| links | created_at / updated_at | TIMESTAMPTZ | служебные |
| click_events | id | BIGINT PK | идентификатор события |
| click_events | link_id | BIGINT FK → links | по какой ссылке клик |
| click_events | occurred_at | TIMESTAMPTZ | момент клика (все агрегаты по нему) |
| click_events | referer | TEXT NULL | откуда пришли |
| click_events | user_agent | TEXT NULL | браузер/бот |
| click_events | ip_hash | CHAR(64) NULL | псевдонимизированный IP для подсчёта уникальных |
| click_events | country | CHAR(2) NULL | задел под геоаналитику |

Связь: `links 1 — N click_events` (CASCADE на удаление ссылки).

Миграции — через TypeORM migrations (`backend/src/database/migrations/`), запускаются автоматически при старте контейнера и командой `make migrate`.

### 2.3. Генерация короткого кода

- **Алфавит**: base62 — `[0-9a-zA-Z]`, 62 символа. Без спецсимволов — код безопасен в URL без экранирования.
- **Длина**: 7 символов → 62^7 ≈ 3.5 × 10^12 комбинаций. Вероятность коллизии по парадоксу дней рождения при 1 млн ссылок ≈ 1.4 × 10^-1 %, т.е. пренебрежимо мала, но не нулевая — обрабатываем.
- **Алгоритм**: криптослучайная генерация (`crypto.randomInt(62)` × 7) — не последовательная, чтобы коды нельзя было перебирать/угадывать соседние.
- **Коллизии**: не проверяем SELECT'ом заранее — просто INSERT; при нарушении `uq_links_code` (ошибка 23505) генерируем новый код и повторяем, максимум **5 попыток**, затем 500 `CODE_GENERATION_FAILED` (на практике недостижимо).
- **Кастомный alias**: опциональное поле `customCode` при создании — 3–16 символов base62, тот же unique-констрейнт; занятый alias → 409 `CODE_TAKEN`.
- **Зарезервированные коды**: `api`, `health` (и будущие пути) — запрещены как alias; авто-генерация с ними не конфликтует, т.к. редирект-роут матчится после `/api/*`.

## 3. Эндпоинты API

Общие правила:

- Все ответы `application/json` в конверте `{ "data": ..., "error": null }` либо `{ "data": null, "error": { "code": "...", "message": "..." } }` (реализуется глобальным `TransformInterceptor` + `HttpExceptionFilter`).
- Исключение — успешный редирект `GET /:code`: это HTTP 302 без тела. Ошибки редиректа (404/410) — JSON в том же конверте.
- Валидация DTO — `class-validator`; ошибки валидации → 400, `error.code = "VALIDATION_ERROR"`, `error.details: string[]`.
- Пагинация списков: `?page=1&limit=20` (limit ≤ 100), в `data` — `{ items, page, limit, total }`.
- Даты в ответах — ISO 8601 UTC.

### 3.1. Сводная таблица

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/links` | Создать короткую ссылку |
| GET | `/api/links` | Список ссылок со статистикой (пагинация, поиск, сортировка) |
| GET | `/api/links/:id` | Одна ссылка |
| PATCH | `/api/links/:id` | Изменить title / is_active / original_url |
| DELETE | `/api/links/:id` | Удалить ссылку (с её кликами) |
| GET | `/api/links/:id/stats/daily` | Клики ссылки по дням |
| GET | `/api/links/:id/stats/referers` | Топ referer'ов ссылки |
| GET | `/api/links/:id/stats/user-agents` | Срез по браузерам/устройствам |
| GET | `/api/stats/summary` | Сводка для дашборда |
| GET | `/api/stats/daily` | Клики по дням по всем ссылкам |
| GET | `/api/stats/top` | Топ ссылок по кликам за период |
| GET | `/api/health` | Health-check (для docker-compose и мониторинга) |
| GET | `/:code` | **Публичный редирект** + учёт клика |

### 3.2. Детально

#### POST /api/links — создать ссылку

Запрос:

```json
{
  "originalUrl": "https://example.com/very/long/path?utm_source=newsletter",
  "title": "Августовская рассылка",
  "customCode": "aug-news"
}
```

(`customCode` — опционально; опустить для авто-генерации.)

Ответ `201 Created`:

```json
{
  "data": {
    "id": 42,
    "code": "r7Ab3xZ",
    "shortUrl": "http://localhost:8080/r7Ab3xZ",
    "originalUrl": "https://example.com/very/long/path?utm_source=newsletter",
    "title": "Августовская рассылка",
    "clicksCount": 0,
    "isActive": true,
    "createdAt": "2026-08-11T10:00:00.000Z"
  },
  "error": null
}
```

Ошибки:

| Код | error.code | Когда |
|---|---|---|
| 400 | VALIDATION_ERROR | не URL, не http/https, URL > 2048 симв., alias вне [3–16] base62 |
| 409 | CODE_TAKEN | customCode уже занят или зарезервирован |
| 500 | CODE_GENERATION_FAILED | 5 коллизий подряд (теоретический случай) |

```json
{ "data": null, "error": { "code": "CODE_TAKEN", "message": "Short code 'aug-news' is already in use" } }
```

#### GET /api/links — список ссылок

Query: `page` (default 1), `limit` (default 20, max 100), `search` (по title/code/originalUrl, ILIKE), `sort` (`created_at` | `clicks_count`, default `created_at`), `order` (`asc`|`desc`, default `desc`).

Ответ `200`:

```json
{
  "data": {
    "items": [
      {
        "id": 42,
        "code": "r7Ab3xZ",
        "shortUrl": "http://localhost:8080/r7Ab3xZ",
        "originalUrl": "https://example.com/very/long/path",
        "title": "Августовская рассылка",
        "clicksCount": 1523,
        "isActive": true,
        "createdAt": "2026-08-11T10:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 137
  },
  "error": null
}
```

#### GET /api/links/:id — одна ссылка

`200` — тот же объект ссылки в `data`. `404 LINK_NOT_FOUND`, `400 VALIDATION_ERROR` (нечисловой id).

#### PATCH /api/links/:id — изменить ссылку

Запрос (все поля опциональны, code менять нельзя):

```json
{ "title": "Новое имя", "isActive": false, "originalUrl": "https://example.com/new" }
```

`200` — обновлённый объект. Ошибки: `404 LINK_NOT_FOUND`, `400 VALIDATION_ERROR`.

#### DELETE /api/links/:id

`200`:

```json
{ "data": { "deleted": true }, "error": null }
```

`404 LINK_NOT_FOUND`.

#### GET /api/links/:id/stats/daily — клики по дням

Query: `from`, `to` (ISO-даты, default: последние 30 дней). Дни без кликов возвращаются с нулями (ряд непрерывный — фронтенду не нужно дозаполнять).

`200`:

```json
{
  "data": {
    "from": "2026-07-13",
    "to": "2026-08-11",
    "points": [
      { "date": "2026-07-13", "clicks": 0,  "uniqueVisitors": 0 },
      { "date": "2026-07-14", "clicks": 87, "uniqueVisitors": 61 }
    ],
    "totalClicks": 1523,
    "totalUnique": 980
  },
  "error": null
}
```

Ошибки: `404 LINK_NOT_FOUND`, `400 VALIDATION_ERROR` (кривые даты, from > to, диапазон > 366 дней).

#### GET /api/links/:id/stats/referers — топ источников

Query: `from`, `to`, `limit` (default 10). Referer нормализуется до хоста; пустой → `"(direct)"`.

```json
{
  "data": {
    "items": [
      { "referer": "t.me", "clicks": 640 },
      { "referer": "(direct)", "clicks": 512 },
      { "referer": "google.com", "clicks": 371 }
    ]
  },
  "error": null
}
```

#### GET /api/links/:id/stats/user-agents — срез по устройствам

UA парсится на бэкенде (библиотека `ua-parser-js`) и группируется по браузеру и типу устройства.

```json
{
  "data": {
    "browsers":  [ { "name": "Chrome", "clicks": 900 }, { "name": "Safari", "clicks": 400 } ],
    "devices":   [ { "type": "desktop", "clicks": 800 }, { "type": "mobile", "clicks": 600 }, { "type": "bot", "clicks": 123 } ]
  },
  "error": null
}
```

#### GET /api/stats/summary — сводка для дашборда

```json
{
  "data": {
    "totalLinks": 137,
    "activeLinks": 120,
    "totalClicks": 45210,
    "clicksToday": 312,
    "clicksLast7Days": 2140,
    "uniqueVisitorsLast7Days": 1533
  },
  "error": null
}
```

#### GET /api/stats/daily — клики по дням (все ссылки)

Query и формат ответа — как у `/api/links/:id/stats/daily`, но без привязки к ссылке.

#### GET /api/stats/top — топ ссылок за период

Query: `from`, `to` (default: последние 30 дней), `limit` (default 10). Считается по `click_events`, а не по `clicks_count` (чтобы «топ за период» был честным).

```json
{
  "data": {
    "items": [
      { "id": 42, "code": "r7Ab3xZ", "title": "Августовская рассылка", "shortUrl": "http://localhost:8080/r7Ab3xZ", "clicks": 1200 },
      { "id": 7,  "code": "promo1",  "title": null, "shortUrl": "http://localhost:8080/promo1", "clicks": 850 }
    ]
  },
  "error": null
}
```

#### GET /api/health

```json
{ "data": { "status": "ok", "db": "up" }, "error": null }
```

`503` с `error.code = "DB_UNAVAILABLE"`, если БД недоступна.

#### GET /:code — публичный редирект

- Успех: **`302 Found`**, `Location: <original_url>`, `Cache-Control: no-store`, тело пустое. После ответа асинхронно пишется `click_events` (+ инкремент `links.clicks_count` тем же запросом-транзакцией).
- `404 LINK_NOT_FOUND` — кода не существует.
- `410 LINK_DISABLED` — ссылка существует, но `is_active = false` (клик не учитывается).

CORS: разрешён origin `http://localhost:3000` для `/api/*`.

## 4. Структура компонентов фронтенда (admin-panel)

### 4.1. Стек и обоснование

- **Роутинг**: `react-router` v7 (library mode) — стандарт де-факто, 4 страницы, ничего сложнее не нужно.
- **Серверный стейт**: **TanStack Query (react-query)**. Обоснование: всё состояние приложения — это данные API (ссылки, статистика); Query даёт кеш, инвалидацию после мутаций (создали ссылку → список и summary обновились), состояния loading/error и refetch «из коробки». Redux/Zustand не нужны — клиентского стейта, живущего дольше одного компонента, нет (фильтры списка держим в URL search params, чтобы работали шаринг ссылки и «назад»).
- **Графики**: `recharts` (декларативный, дружит с React).
- **HTTP**: тонкий `apiClient` на fetch: разворачивает конверт `{ data, error }`, при `error !== null` бросает типизированный `ApiError` — компоненты работают с чистыми данными.

### 4.2. Роутинг и дерево компонентов

| Путь | Страница | Данные из API |
|---|---|---|
| `/` | DashboardPage | `GET /api/stats/summary`, `GET /api/stats/daily`, `GET /api/stats/top` |
| `/links` | LinksPage | `GET /api/links?page&search&sort` |
| `/links/new` | CreateLinkPage | `POST /api/links` |
| `/links/:id` | LinkDetailsPage | `GET /api/links/:id`, `.../stats/daily`, `.../stats/referers`, `.../stats/user-agents`; мутации PATCH/DELETE |
| `*` | NotFoundPage | — |

```text
<App>
└── <QueryClientProvider> + <BrowserRouter>
    └── <Layout>                          — сайдбар-навигация, <Outlet/>
        ├── DashboardPage                 /
        │   ├── SummaryCards              ← stats/summary (4 карточки: ссылки, клики, сегодня, 7 дней)
        │   ├── ClicksChart               ← stats/daily (линейный график, переключатель 7/30/90 дней)
        │   └── TopLinksTable             ← stats/top (топ-10, клик по строке → /links/:id)
        ├── LinksPage                     /links
        │   ├── LinksToolbar              — поиск (debounce 300ms), сортировка, кнопка "+ Ссылка"
        │   ├── LinksTable                ← links (код+copy-кнопка, URL, title, клики, дата, active-toggle)
        │   └── Pagination                — page в URL search params
        ├── CreateLinkPage                /links/new
        │   └── LinkForm                  → POST /api/links; успех → редирект на /links/:id + toast
        │                                   409 CODE_TAKEN показывается под полем alias
        ├── LinkDetailsPage               /links/:id
        │   ├── LinkHeader                ← links/:id (shortUrl+copy, edit title, toggle active, delete c confirm)
        │   ├── ClicksChart (reuse)       ← links/:id/stats/daily (клики + уникальные, 2 линии)
        │   ├── ReferersTable             ← links/:id/stats/referers
        │   └── UserAgentsPanel           ← links/:id/stats/user-agents (2 pie/bar: браузеры, устройства)
        └── NotFoundPage                  *
    └── shared/: Card, Table, Spinner, ErrorState, EmptyState, CopyButton,
                 ConfirmDialog, Toast, DateRangePicker
```

Инвалидация кеша: `POST/PATCH/DELETE /api/links*` → invalidate `['links']` и `['stats']`; данные статистики — `staleTime: 60s`.

## 5. План тестирования

Тесты разнесены по уровням, и два из них — **отдельные npm-проекты в корне репозитория**, не подпапки backend/frontend:

| Уровень | Где живёт | Инструменты | Что проверяет | Что нужно поднять |
|---|---|---|---|---|
| Unit backend | `backend/src/**/*.spec.ts` | vitest | чистая логика сервисов на моках | ничего |
| Unit frontend | `frontend/src/**/*.spec.tsx` | vitest + @testing-library/react + msw | компоненты и apiClient на моках HTTP | ничего |
| **api-tests** | `api-tests/` (отдельный проект) | vitest + supertest | **только backend**, чёрный ящик по HTTP: контракт `{ data, error }`, коды ошибок, работа с реальной БД | postgres + backend |
| **e2e-tests** | `e2e-tests/` (отдельный проект) | **Playwright** | сквозные пользовательские сценарии в браузере через реальную admin-panel | postgres + backend + frontend |

Почему так: unit-тесты живут рядом с кодом, потому что лезут во внутренности модулей. `api-tests` и `e2e-tests` внутренностей не знают — у них своя `package.json`, свой tsconfig и никакой зависимости от исходников приложения; их можно запускать против любого окружения (локальный compose, staging) сменой одной переменной `API_URL` / `BASE_URL`.

Общая тестовая БД для `api-tests` и `e2e-tests` — база `linkboard_test` в том же контейнере postgres; изоляция между тестами — TRUNCATE таблиц через служебный хелпер, подключающийся к БД напрямую.

### 5.1. Backend — unit (vitest, моки репозиториев)

- **CodeGeneratorService**: длина 7; только base62; при коллизии (мок кидает 23505) — повторная генерация; 5 коллизий → `CODE_GENERATION_FAILED`; валидация customCode (длина, алфавит, резерв-список `api`, `health`).
- **LinksService**: нормализация/валидация URL (http/https only, отказ `javascript:`, `ftp:`; длина ≤ 2048); маппинг entity → DTO с построением `shortUrl` из `BASE_URL`.
- **RedirectService**: возврат original_url; неактивная ссылка → `LINK_DISABLED`; ошибка записи клика не пробрасывается наружу (только лог).
- **StatsService**: дозаполнение нулями пропущенных дней; границы диапазона from/to; нормализация referer до хоста, `""`/null → `(direct)`; группировка UA (Chrome/Safari/bot, desktop/mobile).
- **TransformInterceptor / HttpExceptionFilter**: любой успешный ответ обёрнут в `{ data, error: null }`; HttpException → `{ data: null, error: { code, message } }`; неизвестное исключение → 500 `INTERNAL_ERROR` без утечки stack trace.

### 5.2. api-tests — контрактные тесты backend (отдельный проект, vitest + supertest)

Проект `api-tests/` не импортирует код backend. Supertest работает не с инстансом Nest-приложения, а с базовым URL: `request(process.env.API_URL ?? 'http://localhost:8080')` — то есть тестируется реально запущенный сервис ровно так, как его увидит фронтенд. Перед сьютом хелпер ждёт `GET /api/health`, между тестами чистит таблицы.

По каждому эндпоинту:

- **POST /api/links**: 201 + корректный конверт и code длиной 7; с customCode — использует его; повторный тот же customCode → 409 `CODE_TAKEN`; резервированный alias (`api`) → 409; невалидный URL / не-http схема / пустое тело → 400 `VALIDATION_ERROR` с details.
- **GET /api/links**: пустая БД → `items: [], total: 0`; пагинация (создать 25, `limit=20` → 20 и 5, корректный `total`); `search` по title и по code; сортировка по `clicks_count desc`; `limit=1000` → 400.
- **GET/PATCH/DELETE /api/links/:id**: 200-сценарии; несуществующий id → 404; `abc` вместо id → 400; PATCH `isActive:false` реально отключает редирект (проверка связкой с `GET /:code`); DELETE каскадно удаляет click_events (проверка count'ом).
- **GET /:code**: 302 + точный `Location` + `Cache-Control: no-store`; после 3 переходов `clicksCount === 3` и в `click_events` 3 строки с referer/user_agent из заголовков запроса; неизвестный код → 404 `LINK_NOT_FOUND`; отключённая ссылка → 410 и клик НЕ записан; редирект-роут не перехватывает `/api/...`.
- **GET /api/links/:id/stats/daily**: сид кликов с заданными occurred_at → правильные суммы по дням; дни без кликов присутствуют с 0; uniqueVisitors по ip_hash; `from>to` → 400; чужой/несуществующий id → 404.
- **GET /api/links/:id/stats/referers** и **/user-agents**: группировка и сортировка по clicks desc; `(direct)` для пустого referer; limit работает.
- **GET /api/stats/summary | daily | top**: суммы сходятся с сидом; top учитывает только клики внутри `from/to`; `clicksToday` считается по UTC-границе дня.
- **Сквозной формат**: для каждого перечисленного случая проверяется инвариант конверта (`data XOR error`).

### 5.3. Frontend (vitest + @testing-library/react, msw для мока API)

- **apiClient**: разворачивает `{ data }`; `{ error }` → бросает `ApiError` с code; сетевые ошибки → `NETWORK_ERROR`.
- **LinkForm**: сабмит валидного URL вызывает POST с правильным телом; ошибка 409 показывается у поля alias; кнопка задизейблена во время запроса.
- **LinksTable**: рендер списка, empty state, состояние ошибки; CopyButton кладёт shortUrl в clipboard.
- **LinksToolbar**: поиск дебаунсится и меняет URL search params.
- **DashboardPage**: карточки показывают значения из `stats/summary`; спиннер при загрузке.
- **ClicksChart**: рендерится по данным daily; переключатель периода меняет параметры запроса.
- Смоук-тест роутинга: переходы `/` → `/links` → `/links/:id` рендерят нужные страницы.

### 5.4. e2e-tests — сквозные сценарии (отдельный проект, Playwright)

Проект `e2e-tests/` гоняет реальный браузер против поднятого стека (`BASE_URL=http://localhost:3000`, `API_URL=http://localhost:8080`). Конфигурация: `playwright.config.ts` с проектами `chromium` (обязательный) и `webkit` (опционально в CI), `trace: 'on-first-retry'`, `video: 'retain-on-failure'`, HTML-репорт в `e2e-tests/playwright-report/`. Подготовка данных — через API (`request` fixture Playwright), а не кликами: сценарий проверяет UI, а не скорость сидирования. Очистка БД — в `globalSetup`/`beforeEach` тем же хелпером, что и в api-tests.

Сценарии:

1. **Создание ссылки**: `/links/new` → ввести URL и title → сабмит → редирект на страницу деталей, короткая ссылка видна, `copy` кладёт её в буфер (проверка через `navigator.clipboard` с грантом разрешения).
2. **Занятый alias**: создать ссылку с alias `promo`, повторить → под полем alias видна ошибка «код занят», навигации нет.
3. **Валидация формы**: `not-a-url` → сообщение об ошибке, запрос не уходит (проверка через `page.route` counter).
4. **Переход и учёт клика**: создать ссылку через API → в новой вкладке открыть короткий URL, убедиться в переходе на целевой адрес → вернуться в админку, обновить → счётчик кликов увеличился, график и таблица referer'ов показывают событие.
5. **Список ссылок**: сид 25 ссылок через API → пагинация (20 + 5), поиск по title фильтрует, сортировка по кликам меняет порядок, состояние поиска сохраняется в URL и переживает перезагрузку.
6. **Отключение ссылки**: toggle `active` на странице деталей → открытие короткой ссылки отдаёт страницу 410, счётчик не растёт.
7. **Удаление**: delete → диалог подтверждения → ссылка исчезла из списка, её страница отдаёт «не найдено».
8. **Дашборд**: сид кликов за разные дни → карточки показывают корректные суммы, переключатель периода 7/30/90 перерисовывает график, клик по строке в топе ведёт на страницу ссылки.
9. **Пустое состояние**: чистая БД → на `/links` виден empty state с кнопкой создания.
10. **Ошибка API**: `page.route` подменяет ответ на 500 → в UI отображается ErrorState, приложение не падает.

### 5.5. Запуск

- `make test-unit` — unit-тесты backend + frontend (без инфраструктуры).
- `make test-api` — поднимает postgres + backend, прогоняет проект `api-tests`.
- `make test-e2e` — поднимает весь стек, прогоняет Playwright.
- `make test` — всё последовательно: unit → api → e2e.
- CI (задел): `make test-unit` и `make test-api` на каждый push, `make test-e2e` — на PR.

## 6. DevOps

### 6.1. docker-compose

Один файл `docker-compose.yml`. Прикладные сервисы поднимаются всегда, тестовые — только под своими **profiles**, поэтому `make start` не тянет за собой образ Playwright (~1.5 ГБ).

| Сервис | Profile | Образ / build | Порты | Ключевые env | Зависимости |
|---|---|---|---|---|---|
| postgres | — | postgres:16-alpine | 5432:5432 | POSTGRES_USER=linkboard, POSTGRES_PASSWORD=linkboard, POSTGRES_DB=linkboard | healthcheck: `pg_isready` |
| backend | — | ./backend (target dev) | 8080:8080 | PORT=8080, DATABASE_URL=postgres://linkboard:linkboard@postgres:5432/linkboard, BASE_URL=http://localhost:8080, CORS_ORIGIN=http://localhost:3000 | postgres (service_healthy) |
| frontend | — | ./frontend (target dev) | 3000:3000 | VITE_API_URL=http://localhost:8080 | backend (service_healthy) |
| api-tests | `test` | ./api-tests | — | API_URL=http://backend:8080, DATABASE_URL=…/linkboard_test | backend (service_healthy) |
| e2e-tests | `e2e` | ./e2e-tests (от `mcr.microsoft.com/playwright:v1.5x-jammy`) | — | BASE_URL=http://frontend:3000, API_URL=http://backend:8080, DATABASE_URL=…/linkboard_test | frontend, backend (service_healthy) |

- Тестовые сервисы — one-shot (`restart: no`, команда = прогон тестов, exit code пробрасывается в `make`).
- Тестовая БД `linkboard_test` создаётся init-скриптом `docker/postgres/init.sql` при первом старте postgres; тестовые прогоны идут в неё, dev-данные в `linkboard` не трогаются.
- Volume `pgdata` для персистентности postgres; отчёты Playwright монтируются наружу в `e2e-tests/playwright-report/`.
- Backend при старте применяет миграции (`migrationsRun: true` в dev) и отдаёт healthcheck `GET /api/health`; frontend healthcheck — HTTP 200 на `/`. Тестовые сервисы ждут `service_healthy`, поэтому гонок «тесты стартовали раньше приложения» нет.
- `.env.example` в корне с дефолтами; compose читает `.env`.

### 6.2. Makefile

| Команда | Действие |
|---|---|
| `make start` | `docker compose up -d --build` — поднять postgres + backend + frontend |
| `make stop` | `docker compose down` |
| `make restart` | `make stop && make start` |
| `make logs` | `docker compose logs -f` (опц. `make logs s=backend`) |
| `make ps` | статус контейнеров |
| `make migrate` | прогнать миграции в контейнере backend |
| `make migration name=...` | сгенерировать новую миграцию |
| `make psql` | psql внутрь контейнера postgres |
| `make test-unit` | unit-тесты backend и frontend (без инфраструктуры) |
| `make test-api` | `docker compose --profile test run --rm api-tests` (поднимет postgres + backend, если не подняты) |
| `make test-e2e` | `docker compose --profile e2e run --rm e2e-tests` — Playwright по всему стеку |
| `make test` | `make test-unit && make test-api && make test-e2e` |
| `make e2e-report` | открыть последний HTML-отчёт Playwright |
| `make db-reset` | пересоздать `linkboard_test` (быстрый сброс перед прогоном) |
| `make clean` | `docker compose down -v --remove-orphans` — снести вместе с данными |

## 7. Структура директорий

```text
Linkboard/
├── CLAUDE.md
├── Makefile
├── docker-compose.yml
├── .env.example
├── docker/
│   └── postgres/init.sql             # создание базы linkboard_test
├── docs/
│   ├── plans/
│   │   └── linkboard.md              # этот документ
│   ├── api/                          # контракт: openapi.yaml, contract.md, error-codes.md, types.ts
│   └── testing/                      # strategy.md, coverage-matrix.md
├── sprints/
│   └── 11-08/                        # план спринта и отчёты по фазам
├── backend/
│   ├── Dockerfile                    # multi-stage: dev (hot-reload) / prod
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts              # только unit
│   ├── src/
│   │   ├── main.ts                   # bootstrap, порт 8080, CORS
│   │   ├── app.module.ts
│   │   ├── config/                   # env-конфиг (DATABASE_URL, BASE_URL...)
│   │   ├── common/
│   │   │   ├── interceptors/transform.interceptor.ts   # конверт { data, error }
│   │   │   ├── filters/http-exception.filter.ts
│   │   │   └── dto/pagination.dto.ts
│   │   ├── database/
│   │   │   ├── data-source.ts
│   │   │   └── migrations/
│   │   ├── links/
│   │   │   ├── links.module.ts
│   │   │   ├── links.controller.ts   # /api/links CRUD
│   │   │   ├── links.service.ts
│   │   │   ├── code-generator.service.ts
│   │   │   ├── entities/link.entity.ts
│   │   │   └── dto/ (create-link.dto.ts, update-link.dto.ts, link-response.dto.ts)
│   │   ├── redirect/
│   │   │   ├── redirect.module.ts
│   │   │   ├── redirect.controller.ts  # GET /:code (регистрируется последним)
│   │   │   └── redirect.service.ts     # lookup + async запись клика
│   │   └── stats/
│   │       ├── stats.module.ts
│   │       ├── stats.controller.ts     # /api/stats/*, /api/links/:id/stats/*
│   │       ├── stats.service.ts
│   │       ├── entities/click-event.entity.ts
│   │       └── dto/
│   └── (unit-спеки лежат рядом с кодом: *.spec.ts)
├── api-tests/                        # отдельный проект: контракт backend по HTTP
│   ├── Dockerfile
│   ├── package.json                  # vitest + supertest, без зависимостей от backend
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── links.spec.ts
│   │   ├── redirect.spec.ts
│   │   ├── stats.spec.ts
│   │   └── health.spec.ts
│   └── support/
│       ├── api-client.ts             # supertest(API_URL) + разворот конверта
│       ├── db.ts                     # прямое подключение к linkboard_test, truncate
│       ├── seed.ts                   # сид ссылок и кликов с заданными датами
│       └── wait-for-health.ts
├── e2e-tests/                        # отдельный проект: Playwright
│   ├── Dockerfile                    # from mcr.microsoft.com/playwright
│   ├── package.json
│   ├── playwright.config.ts          # BASE_URL, projects, trace/video, reporter
│   ├── global-setup.ts               # ожидание стека + очистка БД
│   ├── fixtures/ (api.ts, db.ts)     # подготовка данных через API
│   ├── pages/                        # page objects: LinksPage, LinkFormPage, LinkDetailsPage, DashboardPage
│   ├── specs/
│   │   ├── create-link.spec.ts
│   │   ├── links-list.spec.ts
│   │   ├── redirect-and-clicks.spec.ts
│   │   ├── link-details.spec.ts
│   │   └── dashboard.spec.ts
│   └── playwright-report/            # артефакты прогона (gitignore)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts                # порт 3000
│   ├── vitest.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx                  # QueryClientProvider, Router
│       ├── App.tsx                   # маршруты
│       ├── api/
│       │   ├── client.ts             # fetch + разворот { data, error }
│       │   ├── links.ts              # хуки useLinks, useCreateLink...
│       │   ├── stats.ts              # useSummary, useDailyStats...
│       │   └── types.ts
│       ├── pages/
│       │   ├── DashboardPage.tsx
│       │   ├── LinksPage.tsx
│       │   ├── CreateLinkPage.tsx
│       │   ├── LinkDetailsPage.tsx
│       │   └── NotFoundPage.tsx
│       ├── components/
│       │   ├── layout/ (Layout.tsx, Sidebar.tsx)
│       │   ├── links/ (LinksTable.tsx, LinksToolbar.tsx, LinkForm.tsx, LinkHeader.tsx)
│       │   ├── stats/ (SummaryCards.tsx, ClicksChart.tsx, TopLinksTable.tsx,
│       │   │          ReferersTable.tsx, UserAgentsPanel.tsx)
│       │   └── shared/ (Card, Table, Spinner, ErrorState, EmptyState,
│       │               CopyButton, ConfirmDialog, Toast, DateRangePicker)
│       └── test/ (setup.ts, msw-handlers.ts, *.spec.tsx)
└── .github/                          # задел под CI (вне скоупа v1)
```

## Порядок реализации

1. Каркас: docker-compose (+ profiles `test`/`e2e`) + Makefile + пустые Nest/Vite приложения, health-check, конверт `{ data, error }`.
2. БД: entities + миграции (`links`, `click_events`), init-скрипт с `linkboard_test`.
3. Каркасы тестовых проектов `api-tests` и `e2e-tests` (хелперы, ожидание health, очистка БД) — сразу после каркаса приложения, чтобы тесты писались параллельно фичам.
4. Links CRUD + CodeGenerator (unit-тесты генератора + api-tests на CRUD).
5. Redirect + запись кликов (api-tests на 302/404/410 и учёт кликов).
6. Stats-эндпоинты (daily/referers/user-agents/summary/top) + api-tests на агрегаты.
7. Frontend: apiClient → Layout/роутинг → LinksPage/CreateLink → Dashboard → LinkDetails.
8. Playwright-сценарии из 5.4 по мере готовности страниц, полный прогон `make test`.

Риски и что отложено: авторизация админки (v1 — нет), GeoIP (поле `country` заложено), rollup-агрегаты кликов (понадобятся после ~10M событий), rate limiting на создание ссылок.
