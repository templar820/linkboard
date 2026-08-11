-- Инициализационный скрипт postgres-контейнера.
-- Выполняется автоматически ТОЛЬКО при первой инициализации пустого volume `pgdata`
-- (docker-entrypoint-initdb.d прогоняется один раз, при создании кластера).
-- Если volume уже существует (повторный `make start`), скрипт не выполнится —
-- для пересоздания тестовой базы используйте `make db-reset`.

-- Основная база `linkboard` уже создана переменной окружения POSTGRES_DB
-- при старте официального образа postgres. Здесь создаём вторую базу —
-- изолированную тестовую БД для api-tests и e2e-tests, чтобы прогоны тестов
-- не трогали dev-данные в `linkboard`.
SELECT 'CREATE DATABASE linkboard_test OWNER linkboard'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'linkboard_test')
\gexec
