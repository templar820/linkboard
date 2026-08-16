# backend — инварианты

Nest.js API на :8080. Контракт — `docs/api/contract.md` + `error-codes.md` (заморожен, менять только через координатора).

## Стек
- Nest 11, **TypeORM 0.3.x** — не 1.x. API: `DataSource`, `migrationsRun`, `autoLoadEntities`.
- vitest + `unplugin-swc` (без SWC vitest не переваривает декораторы Nest).
- `npm test` = `vitest run`, не watch — иначе `make test-unit` зависает.

## Структура кода — обязательно
- **Все фиче-модули Nest лежат в `src/modules/<name>/`.** Не в корне `src/`. Инфраструктура (`common/`, `config/`, `database/`, `main.ts`, `app.module.ts`) остаётся на своём месте — она не модуль.
- **Тесты модуля лежат в его папке `tests/`**: `src/modules/links/tests/links.service.spec.ts`. Не рядом с исходником. Для инфраструктуры — так же: `src/common/tests/`.
- **Один класс на файл контроллера.** Два контроллера — два файла: `link-stats.controller.ts` и `stats.controller.ts`, а не один файл с двумя классами. Правило распространяется и на сервисы: файл `*.service.ts` объявляет ровно один `@Injectable`.

Ожидаемая раскладка модуля:
```
src/modules/links/
├── links.module.ts
├── links.controller.ts
├── links.service.ts
├── dto/
├── entities/
└── tests/
    ├── links.service.spec.ts
    └── code-generator.service.spec.ts
```

## Маршруты
- **Глобального префикса нет.** Каждый контроллер объявляет полный путь: `@Controller('api/links')`, `@Controller('api/stats')`.
- Редирект — `@Controller()` + `@Get(':code')` без префикса.
- Почему так: `/api/*` — всегда ≥2 сегмента, `/:code` — ровно 1, пересечение невозможно при любом порядке модулей. `setGlobalPrefix` с `exclude` не используем: забытая запись в списке исключений ломает редирект молча. Обоснование целиком — в комментарии `src/main.ts`.
- Слушать `0.0.0.0`, иначе healthcheck контейнера не достучится.

## Ошибки и конверт
- Конверт `{ data, error }` делают `TransformInterceptor` и `HttpExceptionFilter`. **Руками в контроллерах не собирать.**
- Ошибки бросать **только через `ApiException`** (`src/common/errors/api-exception.ts`) с кодом из `src/common/errors/error-code.ts`.
- Фильтр маппит голые исключения Nest по статусу: 404 → `NOT_FOUND`, 400 → `VALIDATION_ERROR`, всё остальное приводится к 500 `INTERNAL_ERROR` (иначе в ответе окажется пара «код + статус», которой нет в реестре). Это страховка, а не разрешение: в коде приложения всё равно бросай `ApiException` — только так в ответ попадёт доменный код вроде `LINK_NOT_FOUND`.
- Stack trace наружу не отдаём: только в лог.

## БД
- Схема меняется **только миграцией**, `synchronize` не включать никогда.
- `npm run migration:generate -- src/database/migrations/<Name>`, затем результат генератора проверять руками — он врёт с типами и именами индексов.
- Индекс с `DESC` (`idx_links_created_at`) декоратором `@Index` не задаётся — только сырым SQL в миграции.
- **BIGINT приходит из `pg` строкой.** Колонки `id`, `clicks_count`, `link_id` идут через `bigintTransformer` (экспортируется из `src/links/entities/link.entity.ts`) → наружу всегда `number`, как требует контракт. Новые BIGINT-колонки — тоже через него.
- PK объявлены через `@Column({ primary: true, generated: 'identity', generatedIdentity: 'ALWAYS' })`, а не `@PrimaryGeneratedColumn`: типы последнего не принимают `transformer`. В БД результат идентичен DDL.

## Новая npm-зависимость
`npm install` на хосте её в контейнер **не доставит**: `node_modules` живёт в именованном томе и перекрывает то, что лежит в образе. После установки на хосте нужно:
```
docker compose exec backend npm install && docker compose restart backend
```
Перезапуск обязателен: `npm install` не трогает `.ts`, поэтому `nest --watch` не перекомпилирует сам и продолжит показывать `Cannot find module`. Тот же том использует `backend-test` — ему нужен `--force-recreate`.

## Тесты
- Здесь — только unit на моках, в папке `tests/` своего модуля (см. «Структура кода»). Кейсы: `docs/testing/coverage-matrix.md`, раздел UNIT-BE.
- HTTP-контракт проверяется **не здесь**, а в проекте `api-tests/`. Не дублировать.
