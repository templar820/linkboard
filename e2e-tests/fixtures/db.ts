/**
 * Прямое подключение к `linkboard_test` для точечных проверок счётчиков/строк
 * в БД (например, что клик по редиректу реально записался в `click_events`,
 * до того как это отразится в UI — см. R3 в sprint-plan.md про асинхронную
 * запись клика). Тот же паттерн, что в `api-tests/support/db.ts`
 * (переиспользуется идея, не код — отдельные npm-проекты, импортов между
 * ними быть не должно).
 */
import { test as base } from '@playwright/test';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://linkboard:linkboard@localhost:5432/linkboard_test';

let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({ connectionString: DATABASE_URL, max: 4 });
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** Очистка на весь прогон — вызывается один раз из `global-setup.ts`, не между тестами. */
export async function truncateAll(): Promise<void> {
  await getPool().query('TRUNCATE TABLE click_events, links RESTART IDENTITY CASCADE');
}

export async function countRows(table: 'links' | 'click_events'): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table}`);
  return Number(rows[0]?.count ?? 0);
}

export async function getClicksCount(linkId: number): Promise<number> {
  const { rows } = await getPool().query<{ clicks_count: number }>(
    'SELECT clicks_count FROM links WHERE id = $1',
    [linkId],
  );
  return rows[0]?.clicks_count ?? 0;
}

/** Ждёт готовности БД. Отдельно от health-check бэкенда, второй эшелон против гонок старта (R2). */
export async function waitForDatabase(timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await getPool().query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Тестовая БД недоступна за ${timeoutMs} мс: ${String(lastError)}`);
}

export interface DbFixture {
  countRows(table: 'links' | 'click_events'): Promise<number>;
  getClicksCount(linkId: number): Promise<number>;
}

export interface DbFixtures {
  db: DbFixture;
}

export const test = base.extend<DbFixtures>({
  db: async ({}, use) => {
    await use({ countRows, getClicksCount });
  },
});

export { expect } from '@playwright/test';
