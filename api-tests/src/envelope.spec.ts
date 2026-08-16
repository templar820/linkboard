import { beforeEach, describe, expect, it } from 'vitest';
import { api, expectEnvelope } from '../support/api-client.js';
import { truncateAll } from '../support/db.js';
import { seedLink } from '../support/seed.js';

/**
 * Сквозная проверка инварианта конверта { data, error } на выборке
 * эндпоинтов разных типов (docs/api/contract.md §1). Кейсы для конкретной
 * бизнес-логики — в links.spec.ts / redirect.spec.ts / stats.spec.ts, здесь
 * проверяется только форма ответа.
 */
describe('Инвариант конверта { data, error }', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-53: успешные ответы разных типов эндпоинтов — data !== null, error === null', async () => {
    const link = await seedLink({ code: 'env00001' });

    const responses = await Promise.all([
      api().get('/api/health'),
      api().get('/api/links'),
      api().get(`/api/links/${link.id}`),
      api().get('/api/stats/summary'),
      api().post('/api/links').send({ originalUrl: 'https://example.com/env' }),
    ]);

    for (const response of responses) {
      expect(response.status).toBeLessThan(300);
      const envelope = expectEnvelope(response.body);
      expect(envelope.data).not.toBeNull();
      expect(envelope.error).toBeNull();
    }
  });

  it('API-54: ошибочные ответы (400/404/409) — data === null, error.code/error.message заполнены', async () => {
    await api().post('/api/links').send({ originalUrl: 'https://example.com', customCode: 'envDup01' });

    const responses = await Promise.all([
      api().get('/api/links/999999'), // 404 LINK_NOT_FOUND
      api().get('/api/links/abc'), // 400 VALIDATION_ERROR
      api().post('/api/links').send({}), // 400 VALIDATION_ERROR
      api().post('/api/links').send({ originalUrl: 'https://example.com', customCode: 'envDup01' }), // 409 CODE_TAKEN
    ]);

    for (const response of responses) {
      expect(response.status).toBeGreaterThanOrEqual(400);
      const envelope = expectEnvelope(response.body);
      expect(envelope.data).toBeNull();
      expect(envelope.error?.code).toMatch(/^[A-Z_]+$/);
      expect(envelope.error?.message).toBeTruthy();
    }
  });

  it.each<[string, () => Promise<{ status: number; body: unknown }>]>([
    ['GET /api/health', () => api().get('/api/health')],
    ['GET /api/links', () => api().get('/api/links')],
    ['GET /api/links/:id (404)', () => api().get('/api/links/999999')],
    ['POST /api/links (400)', () => api().post('/api/links').send({})],
    ['PATCH /api/links/:id (404)', () => api().patch('/api/links/999999').send({ title: 'x' })],
    ['DELETE /api/links/:id (404)', () => api().delete('/api/links/999999')],
    ['GET /api/stats/summary', () => api().get('/api/stats/summary')],
    ['GET /api/stats/daily', () => api().get('/api/stats/daily')],
    ['GET /api/stats/top', () => api().get('/api/stats/top')],
  ])('API-55: конверт %s соответствует инварианту data XOR error', async (_name, run) => {
    const response = await run();
    expectEnvelope(response.body);
  });

  it('API-55: конверт для 200/404 на статистике конкретной ссылки соответствует инварианту data XOR error', async () => {
    const link = await seedLink({ code: 'env00002' });

    const responses = await Promise.all([
      api().get(`/api/links/${link.id}/stats/daily`),
      api().get(`/api/links/${link.id}/stats/referers`),
      api().get(`/api/links/${link.id}/stats/user-agents`),
      api().get('/api/links/999999/stats/daily'),
    ]);

    for (const response of responses) {
      expectEnvelope(response.body);
    }
  });
});
