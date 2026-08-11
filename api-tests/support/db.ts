import { Pool } from 'pg';
import { DATABASE_URL } from './env.js';

/**
 * Прямое подключение к тестовой БД. Нужно ровно для двух вещей:
 * очистки между тестами и сидирования данных, которые невозможно создать
 * через API (клики с историческими occurred_at). Всё остальное — только HTTP.
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({ connectionString: DATABASE_URL, max: 4 });
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** Очистка между тестами. RESTART IDENTITY — чтобы id не зависели от порядка прогона. */
export async function truncateAll(): Promise<void> {
  await getPool().query('TRUNCATE TABLE click_events, links RESTART IDENTITY CASCADE');
}

export async function countRows(table: 'links' | 'click_events'): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table}`);
  return Number(rows[0]?.count ?? 0);
}

/**
 * Ждёт готовности БД. Отдельно от health-check бэкенда: контейнер тестов
 * может стартовать раньше, чем Postgres примет соединения.
 */
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
