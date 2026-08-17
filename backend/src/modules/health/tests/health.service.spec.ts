import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from '../health.service';

function createDataSource(queryImpl: () => Promise<unknown>) {
  return { query: vi.fn(queryImpl) };
}

describe('HealthService', () => {
  it('возвращает { status: "ok", db: "up" }, когда БД отвечает на SELECT 1', async () => {
    const dataSource = createDataSource(() => Promise.resolve([{ '?column?': 1 }]));
    const service = new HealthService(dataSource as never);

    await expect(service.check()).resolves.toEqual({ status: 'ok', db: 'up' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('бросает ApiException(503, DB_UNAVAILABLE), когда запрос к БД падает', async () => {
    const dataSource = createDataSource(() => Promise.reject(new Error('connection refused')));
    const service = new HealthService(dataSource as never);

    await expect(service.check()).rejects.toMatchObject({
      status: 503,
      response: {
        code: 'DB_UNAVAILABLE',
        message: 'Database connection is unavailable',
      },
    });
  });
});
