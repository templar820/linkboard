/**
 * Один раз на прогон: дождаться готовности всего стека (БД + backend +
 * frontend) и начать с чистой БД. В отличие от `api-tests`, очистка между
 * тестами здесь не делается автоматически — сценарии сидируют собственные
 * данные через API (`fixtures/api.ts`) и не должны зависеть друг от друга;
 * TRUNCATE тут — только стартовое состояние прогона.
 */
import { closePool, truncateAll, waitForDatabase } from './fixtures/db.js';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://linkboard:linkboard@localhost:5432/linkboard_test';

/**
 * Второй эшелон защиты от гонок старта: compose уже ждёт `service_healthy`
 * для `frontend-e2e`/`backend-test`, но при локальном запуске или сразу
 * после пересборки образа сервис может ещё не принимать соединения.
 */
async function waitForUrl(url: string, label: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastProblem = 'запрос не выполнялся';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastProblem = `HTTP ${response.status}`;
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${label} на ${url} не поднялся за ${timeoutMs} мс. Последняя проблема: ${lastProblem}`);
}

export default async function globalSetup(): Promise<void> {
  // Обязательный предохранитель (тот же, что в api-tests/support/global-setup.ts):
  // отказ стартовать, если DATABASE_URL не указывает на linkboard_test — TRUNCATE
  // ниже снёс бы dev-данные при перепутанных переменных окружения.
  if (!/linkboard_test/.test(DATABASE_URL)) {
    throw new Error(
      `Отказ: e2e-tests подключаются к "${DATABASE_URL}". Разрешена только база linkboard_test — ` +
        'global-setup делает TRUNCATE и снёс бы dev-данные.',
    );
  }

  console.log(`[e2e-tests] BASE_URL=${BASE_URL} API_URL=${API_URL}`);

  await waitForDatabase();
  await waitForUrl(`${API_URL}/api/health`, 'Backend');
  await waitForUrl(BASE_URL, 'Frontend');
  await truncateAll();
  await closePool();
}
