import { closePool, truncateAll, waitForDatabase } from './db.js';
import { waitForHealth } from './wait-for-health.js';
import { API_URL, DATABASE_URL } from './env.js';

/**
 * Один раз на прогон: дождаться стека и начать с чистой БД.
 * Очистка между тестами — в самих спеках (beforeEach), здесь только старт.
 */
export async function setup(): Promise<void> {
  if (!/linkboard_test/.test(DATABASE_URL)) {
    throw new Error(
      `Отказ: api-tests подключаются к "${DATABASE_URL}". Разрешена только база linkboard_test — ` +
        'хелперы делают TRUNCATE и снесли бы dev-данные.',
    );
  }

  console.log(`[api-tests] API_URL=${API_URL}`);
  await waitForDatabase();
  await waitForHealth();
  await truncateAll();
}

export async function teardown(): Promise<void> {
  await closePool();
}
