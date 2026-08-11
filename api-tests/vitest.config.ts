import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    globalSetup: ['support/global-setup.ts'],
    environment: 'node',

    // Тестовая БД одна на весь прогон, изоляция построена на TRUNCATE между
    // тестами — значит параллелить нельзя, иначе тесты вычищают данные друг
    // у друга. Один форк, файлы строго последовательно.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,

    // Ретраев нет: падение здесь означает реальный баг или гонку, а не повод
    // перезапустить (docs/testing/strategy.md).
    retry: 0,

    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
