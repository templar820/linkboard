import { defineConfig, devices } from '@playwright/test';

// Адреса только из env (e2e-tests/CLAUDE.md): в контейнере — сервисы docker-сети
// (frontend-e2e/backend-test), локально — дефолты на localhost.
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.ts',

  timeout: 30_000,
  expect: { timeout: 10_000 },

  // БД linkboard_test общая на весь прогон и чистится один раз в global-setup
  // (не между тестами, как в api-tests) — сценарии сидируют собственные данные
  // через API. Часть сценариев (пустое состояние, точная пагинация по count)
  // требует предсказуемого состояния БД на момент проверки, поэтому прогон
  // последовательный: один воркер, без параллелизации файлов — тот же принцип
  // изоляции, что в api-tests/vitest.config.ts (см. R9 в sprint-plan.md).
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  // retries: 0 в разработке, максимум 1 на стадии стабилизации (e2e-tests/CLAUDE.md).
  // Тихий ретрай флака запрещён — либо чинится сразу, либо test.fixme с тикетом.
  retries: process.env.CI ? 1 : 0,

  reporter: [
    // Пишет в e2e-tests/playwright-report/ — эта директория смонтирована наружу
    // volume'ом сервиса e2e-tests в docker-compose.yml.
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      // Обязательный проект — гоняется в make test-e2e по умолчанию.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Опциональный: тот же набор сценариев, но WebKit чаще ловит флаки в
      // контейнерах и не входит в критерий приёмки спринта (docs/plans/linkboard.md, §5.4).
      // Прогон только нужного проекта — `npx playwright test --project=chromium`.
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
