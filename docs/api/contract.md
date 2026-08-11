# Контракт API Linkboard

Единый источник правды для трёх независимых потребителей: `backend` (реализация), `frontend` (клиент)
и `api-tests` (чёрный ящик по HTTP). Формальная машиночитаемая спецификация — `docs/api/openapi.yaml`.
TypeScript-типы, импортируемые frontend'ом и api-tests без зависимости друг от друга — `docs/api/types.ts`.
Полный реестр кодов ошибок с примерами — `docs/api/error-codes.md`.

Base URL (dev): `http://localhost:8080`. Все API-эндпоинты — под префиксом `/api`, кроме публичного
редиректа `GET /{code}`.

---

## 1. Конверт ответа

Каждый JSON-ответ бэкенда (кроме успешного `302` на `GET /{code}`) — объект с ровно двумя полями:

```json
{ "data": <результат>, "error": null }
```

либо

```json
{ "data": null, "error": { "code": "LINK_NOT_FOUND", "message": "...", "details": ["..."] } }
```

**Инвариант конверта — `data XOR error`**: ровно одно из полей `null`, второе — нет. Это единственный
надёжный способ отличить успех от ошибки программно; HTTP-статус дублирует эту информацию для
инструментов (curl, браузер, мониторинг), но код клиента должен опираться на `error !== null`, а не
только на статус.

Реализуется на бэкенде глобальной парой `TransformInterceptor` (оборачивает успешный возврат хендлера в
`{ data, error: null }`) + `HttpExceptionFilter` (маппит `HttpException` → `{ data: null, error }`,
непойманное исключение → `500 INTERNAL_ERROR` без утечки stack trace).

`error.message` — человекочитаемый текст для логов/отладки, **не для ветвления логики**: он может меняться
без изменения версии контракта. Ветвиться нужно по `error.code` (полный список — `docs/api/error-codes.md`).
`error.details` присутствует только у `VALIDATION_ERROR`.

Единственное исключение из конверта — успешный `GET /{code}`: ответ `302 Found` без тела (публичный
редирект для конечных посетителей, а не JSON API для admin-panel). Ошибки того же эндпоинта (`404`, `410`)
— в конверте, как и везде.

---

## 2. Пагинация

Списочные эндпоинты (`GET /api/links`) принимают:

| Параметр | Тип | Дефолт | Ограничения |
|---|---|---|---|
| `page` | integer | `1` | `>= 1` |
| `limit` | integer | `20` | `1 <= limit <= 100`; `limit > 100` → `400 VALIDATION_ERROR` |

Ответ оборачивает список в объект пагинации:

```json
{ "items": [...], "page": 1, "limit": 20, "total": 137 }
```

`total` — общее число элементов, удовлетворяющих фильтрам (`search`), **без учёта** `page`/`limit` —
именно по нему фронтенд считает число страниц (`Math.ceil(total / limit)`). Пустой результат — не ошибка:
`items: [], total: 0` с HTTP `200`.

Срезы статистики (`stats/referers`, `stats/top`) используют упрощённую пагинацию — только `limit` (без
`page`), т.к. это top-N выборки, а не постраничные списки; полный набор данных для них не нужен UI.

---

## 3. Формат дат

Все даты и время в ответах — **ISO 8601 UTC**:

- Полная метка времени (`createdAt` и т.п.): `"2026-08-11T10:00:00.000Z"` (миллисекунды, суффикс `Z`).
- Дата без времени (`DailyPoint.date`, query-параметры `from`/`to`): `"2026-08-11"` (`YYYY-MM-DD`), граница
  суток — UTC. Например, `clicksToday` в `/api/stats/summary` считается по UTC-границе текущих суток, а не
  по локальному времени клиента.

Query-параметры `from`/`to` (диапазон статистики) — даты без времени, включительно с обеих сторон.
Дефолт при отсутствии обоих — последние 30 дней (`to` = сегодня UTC, `from` = `to - 29 дней`, итого 30 точек
ряда). Ограничение: `from <= to` и `to - from <= 366` дней, иначе `400 VALIDATION_ERROR`.

Ряды `DailyStats.points` **непрерывны**: каждый день диапазона `[from, to]` присутствует в ответе, дни без
кликов — с `clicks: 0, uniqueVisitors: 0`. Фронтенду не нужно дозаполнять пропуски перед отрисовкой графика.

---

## 4. CORS-политика

`/api/*` разрешает единственный origin: `http://localhost:3000` (адрес admin-panel в dev-окружении,
`CORS_ORIGIN` в env бэкенда). Публичный редирект `GET /{code}` не ограничен CORS — им пользуются обычные
браузерные переходы (`Location`-редирект), а не XHR/fetch с произвольного origin.

---

## 5. Валидация URL (`originalUrl`)

- Обязателен только протокол `http://` или `https://` — любые другие схемы (`javascript:`, `ftp:`,
  `data:` и т.п.) отклоняются как `400 VALIDATION_ERROR`.
- Максимальная длина — **2048 символов** (ограничение колонки `TEXT` не техническое, а продуктовое —
  соответствует практическому лимиту большинства браузеров/прокси на длину URL).
- URL валидируется как есть, без нормализации (без добавления trailing slash, без сортировки query-параметров)
  — что прислали, то и хранится и то же возвращается в `originalUrl`.

---

## 6. Правила короткого кода

- **Алфавит**: base62 — `[0-9a-zA-Z]` (62 символа, без спецсимволов, безопасен в URL без экранирования).
- **Авто-генерация**: длина ровно **7** символов, криптослучайная (`crypto.randomInt`), не
  последовательная. При коллизии `UNIQUE(code)` — до **5** повторных попыток, затем
  `500 CODE_GENERATION_FAILED`.
- **Кастомный alias** (`customCode` в `POST /api/links`): опционален, base62, длина **3–16** символов.
  Занятый или совпадающий с зарезервированным словом → `409 CODE_TAKEN`.
- **Резерв-список**: `api`, `health` (и любые будущие системные префиксы верхнего уровня). Код `code`
  ссылки никогда не может совпасть с этими значениями — ни при авто-генерации (коллизий с ними не бывает
  структурно), ни при кастомном alias (явно отклоняется).
- **Неизменяемость**: `code` не может быть изменён после создания — в `PATCH /api/links/{id}` такого поля
  в схеме запроса нет.

---

## 7. Соглашение об именовании полей

- **API (JSON)** — `camelCase` для всех полей: `originalUrl`, `clicksCount`, `isActive`, `createdAt`,
  `shortUrl`, `uniqueVisitors`, `customCode` и т.д.
- **БД (PostgreSQL)** — `snake_case` для всех колонок: `original_url`, `clicks_count`, `is_active`,
  `created_at`, `link_id`, `occurred_at`, `ip_hash`.
- Маппинг между слоями — ответственность backend (TypeORM entity ↔ DTO). Ни один `snake_case` идентификатор
  не должен просочиться в тело ответа API; ни один `camelCase` — в имя колонки БД.
- Query-параметры сортировки (`sort=created_at|clicks_count`) — единственное осознанное исключение: они
  передают **имя колонки БД**, а не поля ответа, потому что сортировка выполняется SQL-ом напрямую по
  индексируемым колонкам (`idx_links_created_at`). Значения `sort` фиксированы перечислением
  (`created_at`, `clicks_count`), поэтому риска утечки БД-специфики в свободной форме нет.

---

## 8. Таблица «эндпоинт → возможные коды ошибок»

| Метод | Путь | Успех | Возможные `error.code` |
|---|---|---|---|
| POST | `/api/links` | `201` | `VALIDATION_ERROR` (400), `CODE_TAKEN` (409), `CODE_GENERATION_FAILED` (500) |
| GET | `/api/links` | `200` | `VALIDATION_ERROR` (400) |
| GET | `/api/links/{id}` | `200` | `VALIDATION_ERROR` (400, нечисловой id), `LINK_NOT_FOUND` (404) |
| PATCH | `/api/links/{id}` | `200` | `VALIDATION_ERROR` (400), `LINK_NOT_FOUND` (404) |
| DELETE | `/api/links/{id}` | `200` | `LINK_NOT_FOUND` (404) |
| GET | `/api/links/{id}/stats/daily` | `200` | `VALIDATION_ERROR` (400), `LINK_NOT_FOUND` (404) |
| GET | `/api/links/{id}/stats/referers` | `200` | `VALIDATION_ERROR` (400), `LINK_NOT_FOUND` (404) |
| GET | `/api/links/{id}/stats/user-agents` | `200` | `VALIDATION_ERROR` (400), `LINK_NOT_FOUND` (404) |
| GET | `/api/stats/summary` | `200` | — (без параметров, отказов по бизнес-правилам нет) |
| GET | `/api/stats/daily` | `200` | `VALIDATION_ERROR` (400) |
| GET | `/api/stats/top` | `200` | `VALIDATION_ERROR` (400) |
| GET | `/api/health` | `200` | `DB_UNAVAILABLE` (503) |
| GET | `/{code}` | `302` (без тела) | `LINK_NOT_FOUND` (404), `LINK_DISABLED` (410) |

Любой из перечисленных эндпоинтов дополнительно может вернуть `500 INTERNAL_ERROR` как fallback на
непредвиденное исключение — эта строка не дублируется в таблице для каждого пути.

---

## 9. Реестр `data-testid`

Согласованные атрибуты `data-testid` для future Playwright e2e и `@testing-library/react`. Правило
именования: `<область>-<элемент>`, kebab-case, без индексов в статичных элементах; для элементов списка —
суффикс `-row` с вложенным `data-id`/`data-code` для точечного таргетинга конкретной строки, а не порядковым
индексом (устойчиво к сортировке/пагинации).

### 9.1. Форма создания/редактирования ссылки (`LinkForm`)

| `data-testid` | Элемент |
|---|---|
| `link-form` | корневой `<form>` |
| `link-form-original-url-input` | поле `originalUrl` |
| `link-form-title-input` | поле `title` |
| `link-form-custom-code-input` | поле `customCode` (alias) |
| `link-form-submit-button` | кнопка отправки (задизейблена во время запроса) |
| `link-form-original-url-error` | текст ошибки валидации под полем URL |
| `link-form-custom-code-error` | текст ошибки под полем alias (в т.ч. `CODE_TAKEN`) |

### 9.2. Таблица ссылок (`LinksTable`, `LinksToolbar`, `Pagination`)

| `data-testid` | Элемент |
|---|---|
| `links-toolbar` | контейнер тулбара (поиск/сортировка/кнопка создания) |
| `links-search-input` | поле поиска (debounce 300ms) |
| `links-sort-select` | селект сортировки |
| `links-create-button` | кнопка «+ Ссылка» |
| `links-table` | корневая таблица |
| `links-table-row` | строка таблицы (атрибут `data-id="<link.id>"` на том же элементе) |
| `links-table-row-code` | ячейка кода ссылки в строке |
| `links-table-row-copy-button` | кнопка копирования shortUrl в строке |
| `links-table-row-active-toggle` | переключатель `isActive` в строке |
| `links-table-empty-state` | пустое состояние (нет ссылок / нет результатов поиска) |
| `links-table-error-state` | состояние ошибки загрузки списка |
| `links-pagination` | контейнер пагинации |
| `links-pagination-prev` / `links-pagination-next` | кнопки навигации по страницам |
| `links-pagination-page-info` | текст «Страница X из Y» |

### 9.3. Карточки и графики дашборда (`SummaryCards`, `ClicksChart`, `TopLinksTable`)

| `data-testid` | Элемент |
|---|---|
| `summary-card-total-links` | карточка «Всего ссылок» |
| `summary-card-active-links` | карточка «Активных ссылок» |
| `summary-card-total-clicks` | карточка «Всего кликов» |
| `summary-card-clicks-today` | карточка «Кликов сегодня» |
| `clicks-chart` | контейнер графика кликов (переиспользуется на дашборде и на `LinkDetailsPage`) |
| `clicks-chart-period-7d` / `clicks-chart-period-30d` / `clicks-chart-period-90d` | кнопки-переключатели периода |
| `top-links-table` | таблица топ-ссылок |
| `top-links-table-row` | строка топ-таблицы (атрибут `data-id="<link.id>"`, клик по строке ведёт на `/links/:id`) |
| `referers-table` | таблица источников переходов (`LinkDetailsPage`) |
| `referers-table-row` | строка таблицы referer'ов |
| `user-agents-browsers-chart` | график/диаграмма по браузерам |
| `user-agents-devices-chart` | график/диаграмма по типам устройств |

### 9.4. Диалог подтверждения (`ConfirmDialog`) и заголовок деталей ссылки (`LinkHeader`)

| `data-testid` | Элемент |
|---|---|
| `confirm-dialog` | корневой контейнер диалога подтверждения (переиспользуемый) |
| `confirm-dialog-confirm-button` | кнопка подтверждения действия |
| `confirm-dialog-cancel-button` | кнопка отмены |
| `link-header` | заголовок страницы деталей ссылки |
| `link-header-short-url` | текст короткой ссылки |
| `link-header-copy-button` | кнопка копирования shortUrl |
| `link-header-title-input` | inline-редактируемое поле title |
| `link-header-active-toggle` | переключатель `isActive` |
| `link-header-delete-button` | кнопка «Удалить» (открывает `confirm-dialog`) |

Общие shared-компоненты (`Toast`, `Spinner`, `DateRangePicker`) получают `data-testid` по тому же правилу
на усмотрение `ui-designer`/`frontend-developer` при реализации (`toast`, `spinner`, `date-range-picker` +
контекстный суффикс места использования при необходимости различать несколько инстансов на одной странице).

---

## 10. Порядок регистрации маршрутов на бэкенде

`RedirectController` (`GET /{code}`) должен регистрироваться **после** всех модулей с префиксом `/api`,
иначе однобуквенно-похожий на код путь `/api` был бы перехвачен редиректом. Дополнительная защита —
резерв-список кодов (раздел 6) и глобальный префикс `/api` для API-модулей на уровне `main.ts`.

---

## 11. Версионирование контракта

v1 контракта не содержит версионирования в URL/заголовках (единственный клиент — admin-panel из этого же
репозитория, синхронно деплоящаяся с бэкендом). Любое изменение контракта после фриза (SYNC-1 спринта)
проходит только через явное решение координатора спринта с уведомлением всех трёх треков-потребителей
(backend, frontend, api-tests) — см. `sprints/11-08/sprint-plan.md`, раздел «Точки синхронизации».
