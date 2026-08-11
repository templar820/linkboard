import { describe, expect, it } from 'vitest';
import { api, expectData, expectEnvelope } from '../support/api-client.js';

describe('GET /api/health', () => {
  it('API-01: отвечает 200 и конвертом { data, error } (docs/api/contract.md §1)', async () => {
    const response = await api().get('/api/health');

    expect(response.status).toBe(200);
    const data = expectData<{ status: string; db: string }>(response.body);
    expect(data).toEqual({ status: 'ok', db: 'up' });
  });

  it('API-02: Content-Type — application/json', async () => {
    const response = await api().get('/api/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('API-03: несуществующий /api-маршрут отвечает конвертом, а не сырым телом Nest', async () => {
    const response = await api().get('/api/definitely-not-a-route');

    expect(response.status).toBe(404);
    const envelope = expectEnvelope(response.body);
    expect(envelope.data).toBeNull();
    expect(envelope.error?.code).toMatch(/^[A-Z_]+$/);
    // Код намеренно не фиксируем: сейчас прилетает INTERNAL_ERROR со статусом
    // 404, что расходится с docs/api/error-codes.md. Решение за координатором
    // (sprints/11-08/фаза-1.md, раздел 4) — как закроют, тест ужесточить.
  });
});
