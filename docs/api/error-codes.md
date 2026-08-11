# Реестр кодов ошибок API

Единый источник правды для значений `error.code` в конверте `{ data: null, error: { code, message, details? } }`.
Источник для `backend` (что бросать), `frontend` (что показывать пользователю) и `api-tests` (что проверять).

Полные типы — `docs/api/types.ts` (`ErrorCode`). Формальные схемы ответов — `docs/api/openapi.yaml`
(`components.schemas.ErrorCode`, `components.schemas.ErrorObject`).

Общий вид тела ошибки:

```json
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": ["..."] } }
```

`message` — человекочитаемый текст, **не предназначен для программного разбора** (может меняться без версионирования
контракта). Ветвление логики на фронтенде и в тестах — только по `error.code`. `details` присутствует только у
`VALIDATION_ERROR` (список отдельных нарушений, каждый элемент — самостоятельная человекочитаемая строка).

---

## VALIDATION_ERROR

| | |
|---|---|
| HTTP-статус | `400 Bad Request` |
| Источник | `class-validator` через `ValidationPipe`, либо ручная проверка бизнес-правил, не выражаемых DTO (например `from > to` в диапазоне дат) |

Когда возникает:

- `POST /api/links`: `originalUrl` отсутствует / не URL / не `http`/`https` / длиннее 2048 символов; `customCode` вне `[3–16]` символов или содержит символы вне base62 (`[0-9a-zA-Z]`); `title` длиннее 255 символов; пустое тело запроса.
- `PATCH /api/links/{id}`: те же правила для переданных полей; попытка передать `code` (поле неизменяемо — игнорируется валидатором как неизвестное свойство/лишнее поле в строгом DTO).
- `GET /api/links/{id}`, `.../stats/*`: `id` не является числом (`ParseIntPipe`).
- `GET /api/links`: `limit > 100`, `limit < 1`, `page < 1`, `sort` вне `[created_at, clicks_count]`, `order` вне `[asc, desc]`.
- `GET .../stats/daily`, `/api/stats/daily`: `from`/`to` не ISO-дата, `from > to`, диапазон `to - from > 366` дней.
- `GET .../stats/referers`, `.../stats/top`: `limit` вне допустимого диапазона.

Пример тела ответа:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      "originalUrl must be a valid http(s) URL",
      "customCode must be 3-16 alphanumeric characters"
    ]
  }
}
```

Что показывает фронтенд: ошибки привязываются к конкретным полям формы по совпадению имени поля в тексте `details`
(эвристика на фронте: первое слово строки — имя поля в camelCase); если сопоставить не удалось — общий тост
«Проверьте правильность заполнения формы». Для `GET`-запросов со списками/статистикой (кривые query-параметры) —
компонент `ErrorState` с сообщением «Некорректные параметры запроса» без деталей реализации.

---

## LINK_NOT_FOUND

| | |
|---|---|
| HTTP-статус | `404 Not Found` |
| Источник | `LinksService` / `RedirectService` / `StatsService` не находят ссылку по `id` (числовой, существующий формат) или по `code` |

Когда возникает:

- `GET/PATCH/DELETE /api/links/{id}` — ссылки с таким `id` нет.
- `GET /api/links/{id}/stats/*` — ссылки с таким `id` нет (сначала проверяется существование ссылки, потом считается агрегат).
- `GET /{code}` (публичный редирект) — код не зарегистрирован ни у одной ссылки.

Пример тела ответа:

```json
{ "data": null, "error": { "code": "LINK_NOT_FOUND", "message": "Link with id 42 was not found" } }
```

Для редиректа:

```json
{ "data": null, "error": { "code": "LINK_NOT_FOUND", "message": "Short link 'r7Ab3xZ' was not found" } }
```

Что показывает фронтенд: на `LinkDetailsPage` — полноэкранный `EmptyState`/`ErrorState` «Ссылка не найдена» со ссылкой
назад на `/links`; в списке/дашборде при устаревшей ссылке (удалена в другой вкладке) — тост «Ссылка больше не
существует» + инвалидация кеша `['links']`. Публичный редирект по несуществующему коду — простая HTML/текстовая
страница «Ссылка не найдена» отдаётся браузеру напрямую бэкендом (вне admin-panel), т.к. посетитель редиректа не
является пользователем admin-panel.

---

## LINK_DISABLED

| | |
|---|---|
| HTTP-статус | `410 Gone` |
| Источник | `RedirectService`: ссылка найдена, но `is_active = false` |

Когда возникает: **только** на `GET /{code}` — попытка перейти по короткой ссылке, которую владелец отключил через
`PATCH /api/links/{id}` (`isActive: false`). Клик в `click_events` при этом **не записывается** и `clicksCount` не
растёт.

Пример тела ответа:

```json
{ "data": null, "error": { "code": "LINK_DISABLED", "message": "Short link 'r7Ab3xZ' is disabled" } }
```

Что показывает фронтенд: не применимо к admin-panel напрямую (эта ошибка приходит посетителю обычной ссылки, не
пользователю панели). Бэкенд отдаёт посетителю простую страницу «Ссылка отключена автором». Внутри admin-panel
статус `isActive: false` отражается на `LinkHeader` как выключенный toggle и бейдж «отключена», без обращения к
этому коду ошибки.

---

## CODE_TAKEN

| | |
|---|---|
| HTTP-статус | `409 Conflict` |
| Источник | Нарушение `UNIQUE (code)` при вставке с явным `customCode`, либо `customCode` входит в резерв-список (`api`, `health`) |

Когда возникает: `POST /api/links` с `customCode`, который уже занят другой ссылкой или зарезервирован системой.
**Не возникает** при авто-генерации кода — коллизии там обрабатываются ретраем (см. `CODE_GENERATION_FAILED`).

Пример тела ответа:

```json
{ "data": null, "error": { "code": "CODE_TAKEN", "message": "Short code 'aug-news' is already in use" } }
```

Что показывает фронтенд: `LinkForm` показывает ошибку непосредственно под полем `customCode` (`alias`):
«Этот код уже занят, выберите другой» — без общего тоста, фокус остаётся на поле, отправка формы не считается
проваленной полностью (остальные значения полей сохраняются).

---

## CODE_GENERATION_FAILED

| | |
|---|---|
| HTTP-статус | `500 Internal Server Error` |
| Источник | `CodeGeneratorService`: 5 подряд коллизий `UNIQUE (code)` при авто-генерации base62-кода длиной 7 |

Когда возникает: теоретический случай (при 3.5 × 10¹² комбинациях и 1 млн ссылок вероятность ничтожна), но код
обязан быть обработан явно, а не падать как generic `INTERNAL_ERROR`, чтобы отличать «система физически не смогла
выделить код» от прочих внутренних сбоев.

Пример тела ответа:

```json
{ "data": null, "error": { "code": "CODE_GENERATION_FAILED", "message": "Failed to generate a unique short code after 5 attempts" } }
```

Что показывает фронтенд: общий тост «Не удалось создать ссылку, попробуйте ещё раз» с кнопкой повтора отправки
формы; технические детали не показываются пользователю.

---

## DB_UNAVAILABLE

| | |
|---|---|
| HTTP-статус | `503 Service Unavailable` |
| Источник | `GET /api/health` не может выполнить проверочный запрос к PostgreSQL |

Когда возникает: **только** на `GET /api/health`. Остальные эндпоинты при недоступности БД возвращают
`500 INTERNAL_ERROR` (потеря соединения посреди обработки запроса — непредвиденная ситуация, а не штатная проверка
здоровья).

Пример тела ответа:

```json
{ "data": null, "error": { "code": "DB_UNAVAILABLE", "message": "Database connection is unavailable" } }
```

Что показывает фронтенд: admin-panel не опрашивает `/api/health` напрямую в UI (это healthcheck для
docker-compose/мониторинга). Если бэкенд в целом недоступен — фронтенд получит `NETWORK_ERROR` (см. ниже) при любом
запросе и покажет общий `ErrorState` «Сервис временно недоступен, попробуйте позже».

---

## INTERNAL_ERROR

| | |
|---|---|
| HTTP-статус | `500 Internal Server Error` |
| Источник | Любое необработанное исключение, пойманное глобальным `HttpExceptionFilter` (не `HttpException` и не один из специализированных кодов выше) |

Когда возникает: непредвиденные ошибки сервера (обрыв соединения с БД посреди запроса, баг в коде и т.п.). Тело
ответа **не содержит** stack trace, имена файлов, SQL-текст и прочие внутренние детали — только код и общее
сообщение.

Пример тела ответа:

```json
{ "data": null, "error": { "code": "INTERNAL_ERROR", "message": "Internal server error" } }
```

Что показывает фронтенд: общий `ErrorState` «Что-то пошло не так, попробуйте обновить страницу»; кнопка «Повторить»
триггерит refetch. Ошибка логируется в консоль браузера (dev) для отладки, но не показывается пользователю в сыром
виде.

---

## NETWORK_ERROR (клиентский, не приходит от сервера)

| | |
|---|---|
| HTTP-статус | — (запрос не дошёл до сервера или ответ не удалось разобрать) |
| Источник | `apiClient` фронтенда: `fetch` бросил исключение (офлайн, DNS, CORS, таймаут) либо тело ответа не JSON / не соответствует конверту `{ data, error }` |

Когда возникает: backend недоступен, сеть недоступна, ответ пришёл не в формате конверта (например, 502 от
инфраструктуры, HTML-страница ошибки прокси и т.п.). Этот код **никогда не встречается в HTTP-ответах backend** —
он существует только в `ErrorCode` на стороне клиента (`docs/api/types.ts`) как единообразная точка обработки
«я не смог понять, что ответил сервер».

Формат, который синтезирует `apiClient` (для единообразия с остальными ошибками):

```json
{ "code": "NETWORK_ERROR", "message": "Network request failed" }
```

Что показывает фронтенд: общий `ErrorState` «Нет соединения с сервером, проверьте подключение и попробуйте снова»;
не отличается визуально от `INTERNAL_ERROR`/`DB_UNAVAILABLE` для пользователя, но используется в unit-тестах
(`api-tests` его не проверяет — он клиентский; проверяется только в frontend unit-тестах `apiClient`).

---

## Сводная таблица

| Код | HTTP | Эндпоинты, где встречается |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `POST /api/links`, `GET /api/links`, `GET/PATCH /api/links/{id}`, `GET /api/links/{id}/stats/*`, `GET /api/stats/daily`, `GET /api/stats/top` |
| `LINK_NOT_FOUND` | 404 | `GET/PATCH/DELETE /api/links/{id}`, `GET /api/links/{id}/stats/*`, `GET /{code}` |
| `LINK_DISABLED` | 410 | `GET /{code}` |
| `CODE_TAKEN` | 409 | `POST /api/links` |
| `CODE_GENERATION_FAILED` | 500 | `POST /api/links` |
| `DB_UNAVAILABLE` | 503 | `GET /api/health` |
| `INTERNAL_ERROR` | 500 | любой эндпоинт (fallback) |
| `NETWORK_ERROR` | — (клиентский) | не приходит от сервера; синтезируется `apiClient` |
