# Матрица покрытия тестами — Linkboard

Статус: черновик к SYNC-1/SYNC-4. Дата: 2026-08-11.
Дополняет `docs/testing/strategy.md`. Источник кейсов — `docs/plans/linkboard.md`, раздел 5.

Обозначения: `UNIT-BE-xx` — backend unit, `UNIT-FE-xx` — frontend unit, `API-xx` — api-tests, `E2E-xx` — e2e-сценарий (совпадает с нумерацией 5.4 архплана). «—» в ячейке всегда сопровождается обоснованием пропуска.

---

## 1. Каталог кейсов Unit backend (27)

`backend/src/**/*.spec.ts`, vitest, моки репозиториев.

| ID | Класс | Кейс | Ожидаемый результат |
|---|---|---|---|
| UNIT-BE-01 | CodeGeneratorService | генерация кода | длина строго 7 символов |
| UNIT-BE-02 | CodeGeneratorService | алфавит кода | только `[0-9a-zA-Z]` (base62) |
| UNIT-BE-03 | CodeGeneratorService | коллизия (мок кидает 23505) | повторная генерация нового кода, успешный insert со второй попытки |
| UNIT-BE-04 | CodeGeneratorService | 5 коллизий подряд | выброс `CODE_GENERATION_FAILED`, 6-й попытки нет |
| UNIT-BE-05 | CodeGeneratorService | `customCode` длиной вне [3,16] | отклонён валидацией до похода в БД |
| UNIT-BE-06 | CodeGeneratorService | `customCode` с символом вне base62 | отклонён валидацией |
| UNIT-BE-07 | CodeGeneratorService | `customCode` из резерв-списка (`api`, `health`) | отклонён как занятый ещё до INSERT |
| UNIT-BE-08 | LinksService | `originalUrl` с `http://` | принят |
| UNIT-BE-09 | LinksService | `originalUrl` с `https://` | принят |
| UNIT-BE-10 | LinksService | схема `javascript:` | отклонён |
| UNIT-BE-11 | LinksService | схема `ftp:` | отклонён |
| UNIT-BE-12 | LinksService | `originalUrl` длиной > 2048 | отклонён |
| UNIT-BE-13 | LinksService | маппинг entity → DTO | `shortUrl = ${BASE_URL}/${code}` |
| UNIT-BE-14 | RedirectService | активная ссылка | возвращает `originalUrl` |
| UNIT-BE-15 | RedirectService | `is_active = false` | выброс `LINK_DISABLED` |
| UNIT-BE-16 | RedirectService | несуществующий код | выброс `LINK_NOT_FOUND` |
| UNIT-BE-17 | RedirectService | ошибка записи клика (мок бросает Error) | не пробрасывается наружу, только лог (spy на logger) |
| UNIT-BE-18 | StatsService | дни без кликов в диапазоне | дозаполняются нулями (`clicks: 0, uniqueVisitors: 0`) |
| UNIT-BE-19 | StatsService | границы диапазона `from`/`to` | клики ровно на границах суток попадают в выборку |
| UNIT-BE-20 | StatsService | referer с полным URL | нормализуется до хоста |
| UNIT-BE-21 | StatsService | referer `null`/`""` | `"(direct)"` |
| UNIT-BE-22 | StatsService | группировка UA по браузеру | Chrome/Safari/... на моковых UA-строках |
| UNIT-BE-23 | StatsService | группировка UA по устройству | включает отдельную группу `bot` |
| UNIT-BE-24 | StatsService | `clicksToday` на границе суток (мок часов) | клик 23:59:59 UTC «вчера» не считается, 00:00:00 UTC «сегодня» считается |
| UNIT-BE-25 | TransformInterceptor | успешный ответ хендлера | обёрнут в `{ data, error: null }` |
| UNIT-BE-26 | HttpExceptionFilter | `HttpException(status, {code, message})` | `{ data: null, error: { code, message } }` с тем же статусом |
| UNIT-BE-27 | HttpExceptionFilter | непредвиденный `Error` | 500 `INTERNAL_ERROR`, без stack trace в теле |

## 2. Каталог кейсов Unit frontend (17)

`frontend/src/**/*.spec.tsx`, vitest + @testing-library/react + msw.

| ID | Компонент | Кейс | Ожидаемый результат |
|---|---|---|---|
| UNIT-FE-01 | apiClient | ответ `{ data }` | разворачивается, возвращается `data` |
| UNIT-FE-02 | apiClient | ответ `{ error }` | бросает `ApiError` с `code = error.code` |
| UNIT-FE-03 | apiClient | сетевая ошибка (fetch reject) | `ApiError` с `code = NETWORK_ERROR` |
| UNIT-FE-04 | LinkForm | сабмит валидного URL | `POST /api/links` с телом `{ originalUrl, title, customCode }` из формы |
| UNIT-FE-05 | LinkForm | ответ 409 `CODE_TAKEN` | текст ошибки под полем alias, без навигации |
| UNIT-FE-06 | LinkForm | запрос в процессе | кнопка submit `disabled`, после ответа снова активна |
| UNIT-FE-07 | LinksTable | список ссылок | построчный рендер (code, url, title, clicks, дата) |
| UNIT-FE-08 | LinksTable | пустой список | `EmptyState` вместо таблицы |
| UNIT-FE-09 | LinksTable | состояние ошибки запроса | `ErrorState` вместо таблицы |
| UNIT-FE-10 | CopyButton | клик по кнопке | `shortUrl` в `navigator.clipboard` (мок) |
| UNIT-FE-11 | LinksToolbar | ввод в поиск | дебаунс 300ms перед изменением `search` в URL |
| UNIT-FE-12 | LinksToolbar | смена сортировки | меняет `sort`/`order` в URL |
| UNIT-FE-13 | DashboardPage | карточки SummaryCards | значения из смокового `stats/summary` |
| UNIT-FE-14 | DashboardPage | данные грузятся | `Spinner` вместо карточек |
| UNIT-FE-15 | ClicksChart | рендер по `stats/daily` | точки графика соответствуют данным |
| UNIT-FE-16 | ClicksChart | переключатель периода (7/30/90) | меняет query-параметры (`from`/`to`) запроса |
| UNIT-FE-17 | Routing smoke | переходы `/` → `/links` → `/links/:id` | рендерят `DashboardPage`/`LinksPage`/`LinkDetailsPage` |

## 3. Каталог кейсов api-tests (55, из них 54 в обычном прогоне)

`api-tests/src/*.spec.ts`, vitest + supertest против `API_URL`.

| ID | Группа | Кейс | Ожидаемый результат |
|---|---|---|---|
| API-01 | POST /api/links | базовый запрос | 201, конверт `{ data, error: null }`, `code` длиной 7, base62 |
| API-02 | POST /api/links | с `customCode` | код ссылки = переданному `customCode` |
| API-03 | POST /api/links | повторный `customCode` | 409 `CODE_TAKEN` |
| API-04 | POST /api/links | `customCode = "api"` (резерв) | 409 `CODE_TAKEN` |
| API-05 | POST /api/links | `originalUrl` не URL | 400 `VALIDATION_ERROR` с `details` |
| API-06 | POST /api/links | схема не http/https | 400 `VALIDATION_ERROR` |
| API-07 | POST /api/links | пустое тело | 400 `VALIDATION_ERROR` |
| API-08 | GET /api/links | пустая БД | `items: [], total: 0` |
| API-09 | GET /api/links | 25 ссылок, `limit=20` (default), стр.1 | 20 items, `total: 25` |
| API-10 | GET /api/links | `page=2, limit=20` | 5 items |
| API-11 | GET /api/links | `search` по title | ILIKE-поиск находит ссылку |
| API-12 | GET /api/links | `search` по code | находит ссылку |
| API-13 | GET /api/links | `sort=clicks_count&order=desc` | ссылки по убыванию кликов |
| API-14 | GET /api/links | `limit=1000` | 400 `VALIDATION_ERROR` (> 100) |
| API-15 | GET /api/links/:id | существующий id | 200 с объектом ссылки |
| API-16 | GET /api/links/:id | несуществующий id | 404 `LINK_NOT_FOUND` |
| API-17 | GET /api/links/:id | `id = "abc"` | 400 `VALIDATION_ERROR` |
| API-18 | PATCH /api/links/:id | обновление `title` | 200, поле изменилось |
| API-19 | PATCH /api/links/:id | `isActive: false` | 200; последующий `GET /:code` → 410 |
| API-20 | PATCH /api/links/:id | обновление `originalUrl` | 200, поле изменилось, `code` не менялся |
| API-21 | PATCH /api/links/:id | несуществующий id | 404 |
| API-22 | PATCH /api/links/:id | невалидный `originalUrl` | 400 `VALIDATION_ERROR` |
| API-23 | DELETE /api/links/:id | успешное удаление | 200 `{ deleted: true }`; `GET /:id` после → 404 |
| API-24 | DELETE /api/links/:id | несуществующий id | 404 |
| API-25 | DELETE /api/links/:id | ссылка с кликами | каскадное удаление `click_events` (SELECT count = 0) |
| API-26 | GET /:code | активная ссылка | 302, точный `Location`, `Cache-Control: no-store`, пустое тело |
| API-27 | GET /:code | 3 перехода подряд | `clicksCount === 3`, 3 строки в `click_events` с referer/UA из заголовков (через poll-хелпер, см. strategy §4) |
| API-28 | GET /:code | неизвестный код | 404 `LINK_NOT_FOUND` |
| API-29 | GET /:code | `is_active = false` | 410 `LINK_DISABLED`, клик НЕ записан |
| API-30 | GET /:code | запрос на `/api/links` | не перехватывается редирект-роутом |
| API-31 | GET /api/links/:id/stats/daily | сид кликов на заданные `occurred_at` | суммы по дням совпадают с ожидаемым |
| API-32 | GET /api/links/:id/stats/daily | дни без кликов | присутствуют в `points` с `clicks: 0` |
| API-33 | GET /api/links/:id/stats/daily | `uniqueVisitors` | по количеству уникальных `ip_hash` в дне |
| API-34 | GET /api/links/:id/stats/daily | `from > to` | 400 `VALIDATION_ERROR` |
| API-35 | GET /api/links/:id/stats/daily | диапазон > 366 дней | 400 `VALIDATION_ERROR` |
| API-36 | GET /api/links/:id/stats/daily | несуществующий/чужой id | 404 `LINK_NOT_FOUND` |
| API-37 | GET /api/links/:id/stats/referers | группировка | сортировка по `clicks desc` |
| API-38 | GET /api/links/:id/stats/referers | клики без referer | группируются в `"(direct)"` |
| API-39 | GET /api/links/:id/stats/referers | `limit` | ограничивает число записей |
| API-40 | GET /api/links/:id/stats/user-agents | `browsers[]` | группировка и сортировка по `clicks` |
| API-41 | GET /api/links/:id/stats/user-agents | `devices[]` | включает группу `bot` |
| API-42 | GET /api/stats/summary | `totalLinks`/`activeLinks` | соответствуют сиду |
| API-43 | GET /api/stats/summary | `totalClicks` | сумма кликов по всем ссылкам |
| API-44 | GET /api/stats/summary | `clicksToday` | строго по UTC-границе суток |
| API-45 | GET /api/stats/summary | `clicksLast7Days`/`uniqueVisitorsLast7Days` | соответствуют сиду за 7 дней |
| API-46 | GET /api/stats/daily | суммы по дням | агрегированы по всем ссылкам |
| API-47 | GET /api/stats/daily | `from > to` | 400 `VALIDATION_ERROR` |
| API-48 | GET /api/stats/top | топ за период | сходится с сидом, сортировка по убыванию |
| API-49 | GET /api/stats/top | ссылка с большим `clicks_count`, но без кликов в периоде | не попадает в топ (считается по `click_events`, не по денормализованному счётчику) |
| API-50 | GET /api/stats/top | `limit` | ограничивает размер списка |
| API-51 | GET /api/health | БД поднята | 200 `{ status: "ok", db: "up" }` |
| API-52 | GET /api/health | БД остановлена (тег `degraded`, вне `make test-api`) | 503 `DB_UNAVAILABLE` |
| API-53 | Конверт (envelope.spec.ts) | выборка успешных ответов | `data !== null`, `error === null` |
| API-54 | Конверт | выборка ошибочных ответов (400/404/409) | `data === null`, `error.code`/`error.message` заполнены |
| API-55 | Конверт | параметризованный матчер по всем кейсам выше | инвариант `data XOR error`, кроме 302 без тела |

## 4. Таблица «эндпоинт × уровень»

| # | Эндпоинт | Unit | api-tests | e2e |
|---|---|---|---|---|
| 1 | `POST /api/links` | UNIT-BE-05..13 | API-01..07 | E2E-01, E2E-02, E2E-03 |
| 2 | `GET /api/links` | — (тонкий контроллер, маппинг покрыт UNIT-BE-13) | API-08..14 | E2E-05, E2E-09 |
| 3 | `GET /api/links/:id` | — (см. п.2) | API-15..17 | — (используется неявно внутри E2E-01/06/07, отдельно не выделяем) |
| 4 | `PATCH /api/links/:id` | UNIT-BE-08..12 (валидация URL переиспользуется) | API-18..22 | E2E-06 (только `isActive`; редактирование `title` — см. «Пробелы») |
| 5 | `DELETE /api/links/:id` | — | API-23..25 | E2E-07 |
| 6 | `GET /api/links/:id/stats/daily` | UNIT-BE-18, 19 | API-31..36 | E2E-04 |
| 7 | `GET /api/links/:id/stats/referers` | UNIT-BE-20, 21 | API-37..39 | E2E-04 |
| 8 | `GET /api/links/:id/stats/user-agents` | UNIT-BE-22, 23 | API-40, 41 | — (не входит ни в один из 10 сценариев 5.4 — см. «Пробелы») |
| 9 | `GET /api/stats/summary` | UNIT-BE-24 | API-42..45 | E2E-08 |
| 10 | `GET /api/stats/daily` | UNIT-BE-18, 19 (общая логика с п.6) | API-46, 47 | E2E-08 |
| 11 | `GET /api/stats/top` | — (нет отдельного unit-кейса в 5.1 архплана — см. «Пробелы») | API-48..50 | E2E-08 (клик по строке топа) |
| 12 | `GET /api/health` | — (тривиальный контроллер, проверка требует реальной БД) | API-51, API-52 | — (не пользовательский сценарий; косвенно используется healthcheck'ами стека, не тест-кейс) |
| 13 | `GET /:code` (редирект) | UNIT-BE-14..17 | API-26..30 | E2E-04, E2E-06 |

## 5. Таблица «пользовательский сценарий admin-panel × уровень»

| ID | Сценарий (5.4 архплана) | Что покрывает | Пересечение с api-tests | Почему пересечение допустимо |
|---|---|---|---|---|
| E2E-01 | Создание ссылки | `LinkForm` → `POST /api/links` → редирект на `/links/:id` → clipboard | API-01, API-02, API-15 | Дублирует только happy-path; дополнительно проверяет навигацию, toast и `navigator.clipboard` — недоступно вне браузера |
| E2E-02 | Занятый alias | Отображение ошибки под полем alias, отсутствие навигации | API-03 | Проверяется не код 409 сам по себе, а его отображение в конкретном UI-поле и блокировка перехода — поведение формы, не HTTP |
| E2E-03 | Валидация формы (`not-a-url`) | Клиентская валидация до отправки запроса (счётчик через `page.route`) | — | Уникально для e2e: подтверждает, что запрос вообще не уходит на backend; на api-tests нечего проверять (запроса нет) |
| E2E-04 | Переход и учёт клика | Реальная навигация по короткой ссылке в новой вкладке, обновление счётчика/графика/referers в админке | API-26, API-27, API-37, API-38 | Намеренное дублирование: это самый рискованный путь проекта (асинхронная запись после 302, §4 strategy.md) — оправдана избыточность на двух уровнях |
| E2E-05 | Список ссылок | Пагинация, поиск, сортировка, персистентность состояния в URL при перезагрузке | API-09..13 | api-tests проверяют сам расчёт (числа), e2e — что состояние переживает `reload()` и «назад» браузера (недоступно вне браузера) |
| E2E-06 | Отключение ссылки | Toggle `active` → короткая ссылка отдаёт 410 в браузере | API-19, API-29 | e2e проверяет, что PATCH из UI реально меняет поведение публичного роута через реальный HTTP-переход, а не только JSON-ответ |
| E2E-07 | Удаление | Диалог подтверждения, исчезновение из списка, «не найдено» на странице | API-23 | e2e проверяет UX подтверждения и обновление кеша списка — вне зоны api-tests |
| E2E-08 | Дашборд | Карточки, график 7/30/90, переход по строке топа | API-42..50 | api-tests подтверждают цифры, e2e — что react-query/recharts корректно их отрисовывают и что переключатель реально меняет запрос в браузере |
| E2E-09 | Пустое состояние | `EmptyState` на чистой БД с кнопкой создания | — | Нет пересечения: чистый UI-рендер на реальном пустом ответе API, не перебор данных |
| E2E-10 | Ошибка API (500 через `page.route`) | `ErrorState`, приложение не падает | — | Нет пересечения: подмена ответа `page.route` — техника, доступная только в браузерном тесте |

## 6. Таблица «краевой случай → где ловится»

| Краевой случай | Уровень(и) | ID кейсов |
|---|---|---|
| Коллизия короткого кода (23505) | Unit (мок) | UNIT-BE-03, UNIT-BE-04 — реальную коллизию в api-tests детерминированно не спровоцировать (пространство 62^7), проверяется только на мокнутом репозитории |
| Зарезервированный alias (`api`, `health`) | Unit + api-tests | UNIT-BE-07, API-04 |
| `from > to` | api-tests | API-34, API-47 (аналог для глобального daily) |
| Диапазон дат > 366 дней | api-tests | API-35 |
| Пустой referer → `(direct)` | Unit + api-tests | UNIT-BE-21, API-38 |
| UA бота | Unit + api-tests | UNIT-BE-23, API-41 |
| Отключённая ссылка (410) | Unit + api-tests + e2e | UNIT-BE-15, API-29, E2E-06 |
| Каскадное удаление кликов | api-tests | API-25 (в e2e не проверяется — UI подтверждает только «ссылка исчезла», не количество удалённых `click_events`) |
| `limit > 100` | api-tests | API-14 |
| Нечисловой id | api-tests | API-17 |
| UTC-граница дня для `clicksToday` | Unit + api-tests | UNIT-BE-24, API-44 |
| Инвариант конверта `data XOR error` | Unit + api-tests | UNIT-BE-25, UNIT-BE-26, UNIT-BE-27, API-53, API-54, API-55 |

## 7. Итоговый счётчик кейсов

| Уровень | Кейсов | Задачи-исполнители |
|---|---|---|
| Unit backend | 27 (UNIT-BE-01..27) | входит в T11 (14 шт. — CodeGenerator/LinksService), T12 (4 шт. — RedirectService), T13 (9 шт. — StatsService), T5 (3 шт. — TransformInterceptor/HttpExceptionFilter, пересчитано в общие 27 без дублей) |
| Unit frontend | 17 (UNIT-FE-01..17) | T20 |
| api-tests | 55, из них 54 в обычном прогоне `make test-api` + 1 (`API-52`) отдельным тегом | T14 (18 шт. — links CRUD/health), T15 (5 шт. — redirect), T16 (20 шт. — stats + envelope), T9 (health API-51/52 в каркасе) |
| e2e-tests | 10 сценариев | T22 (E2E-01, 02, 03, 05, 09 — 5 сценариев), T23 (E2E-04, 06, 07 — 3 сценария), T24 (E2E-08, 10 — 2 сценария) |
| **Итого функциональных кейсов** | **109** (44 unit + 55 api + 10 e2e-сценариев) | — |

## 8. Чек-лист «матрица закрыта» (прогоняется на SYNC-4)

- [ ] Все 27 кейсов `UNIT-BE-01..27` реализованы, `make test-unit` (backend-часть) зелёный.
- [ ] Все 17 кейсов `UNIT-FE-01..17` реализованы, `make test-unit` (frontend-часть) зелёный.
- [ ] Все 54 обычных кейса `API-01..51, API-53..55` реализованы, `make test-api` зелёный.
- [ ] `API-52` (health-degraded) реализован отдельным тегом/скриптом и прогнан минимум 1 раз вручную (см. strategy.md §6).
- [ ] Все 10 сценариев `E2E-01..10` реализованы, `make test-e2e` зелёный.
- [ ] Ни один ID из этого документа не помечен как отсутствующий/`TODO` в соответствующем spec-файле.
- [ ] Ни один тест не в необоснованном карантине (`test.fixme`/`test.skip` без тикета).
- [ ] Список `data-testid`, использованных в `e2e-tests/pages/*`, сверен с фактическими атрибутами в компонентах frontend.
- [ ] `api-tests/package.json`/`tsconfig.json` не содержат зависимостей на `backend/src` (грепом).
- [ ] Пробелы из раздела 9 либо закрыты дополнительными кейсами, либо осознанно приняты координатором (T29) с пометкой в `docs/plans/tech-debt.md`.

## 9. Пробелы и противоречия в архплане, обнаруженные при построении матрицы

1. **Редактирование `title` через UI не покрыто ни одним из 10 e2e-сценариев.** `LinkHeader` в разделе 4.2 архплана явно описывает inline-edit title, но список сценариев 5.4 покрывает только `toggle active` (сценарий 6) и `delete` (сценарий 7). Предложение: не заводить новый сценарий, а добавить дополнительный `test()` в тот же файл `link-details.spec.ts` (задача T23), без увеличения числа файлов/сценариев в счётчике DoD-8 (там жёстко зафиксировано «все 10 сценариев» — 11-й создавать не нужно, это расширение существующего).
2. **`UserAgentsPanel` не проверяется ни в одном e2e-сценарии.** Компонент явно описан в 4.2 (`LinkDetailsPage`), но ни один из 10 сценариев его не упоминает. Предложение: расширить сценарий 4 (`redirect-and-clicks.spec.ts`, T23) дополнительной проверкой — переход по короткой ссылке с заданным `User-Agent` через `page.setExtraHTTPHeaders`/`browser.newContext({ userAgent })`, затем ассерт, что `UserAgentsPanel` отразил событие. Тоже без увеличения числа официальных сценариев.
3. **`GET /api/stats/top` не имеет отдельного unit-кейса в разделе 5.1 архплана.** Раздел 5.1 перечисляет для `StatsService` дозаполнение нулями, границы диапазона, нормализацию referer, группировку UA — но не логику «топ считается по `click_events`, а не по `clicks_count`» (это ключевое бизнес-правило раздела 3.2). Рекомендация: добавить необязательный `UNIT-BE-28` (StatsService: top учитывает только клики внутри `from/to`, игнорируя денормализованный счётчик) — дешевле и быстрее ловит регрессию, чем ждать её на api-tests (`API-49`). Не блокирует SYNC-4, но рекомендован к T13.
4. **Валидация `from > to` и диапазона > 366 дней зафиксирована архпланом только на уровне api-tests (5.2), без явного unit-кейса в 5.1.** Если валидация реализована через кастомный `class-validator`-декоратор в DTO (а не ad-hoc в сервисе), имеет смысл дополнительно покрыть его unit-тестом самого валидатора — быстрее фидбек, чем через HTTP. Оставлено на усмотрение `backend-developer` (T13), не входит в обязательный счётчик 27.
5. **Проверка `503 DB_UNAVAILABLE` (`API-52`) не укладывается в обычный пайплайн `make test-api`** — останов контейнера БД внутри сьюта, который переиспользует ту же `linkboard_test`, ломает соседние тесты/параллельные прогоны. В матрице она явно вынесена отдельным тегом вне стандартного прогона (см. strategy.md §6); T9/T25 должны согласовать конкретный механизм (отдельный npm-скрипт vs шаг в CI) — на T4 это решение не принимается, только фиксируется необходимость.
6. **`retries` для Playwright не зафиксированы явно в архплане** (раздел 5.4/6.1 описывают `trace`/`video`, но не `retries`). Strategy.md §5 предписывает `retries: 0` для обычного прогона и `retries: 1` только для стабилизационного — это решение `qa-expert`, которое владелец `e2e-tests/playwright.config.ts` (T10) обязан внедрить дословно, иначе критерий DoD-13 (3 прогона без флаков) не будет измерим одинаково у всех агентов.
