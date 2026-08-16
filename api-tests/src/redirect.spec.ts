import { beforeEach, describe, expect, it } from 'vitest';
import { api, expectData, expectError, waitFor } from '../support/api-client.js';
import { countRows, getPool, truncateAll } from '../support/db.js';
import { seedLink } from '../support/seed.js';

interface LinkDto {
  clicksCount: number;
}

/**
 * GET /:code — публичный редирект (docs/api/contract.md §1, §8;
 * docs/api/error-codes.md LINK_NOT_FOUND/LINK_DISABLED).
 *
 * `.redirects(0)` ОБЯЗАТЕЛЕН на каждом запросе: без него supertest
 * последует за Location и тест улетит на example.com.
 */
describe('GET /:code', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-26: активная ссылка — 302, точный Location, Cache-Control: no-store, пустое тело', async () => {
    const link = await seedLink({ code: 'red00001', originalUrl: 'https://example.com/target?x=1' });

    const response = await api().get(`/${link.code}`).redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/target?x=1');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).toBe('');
  });

  it('API-27: три перехода подряд — clicksCount === 3, три строки в click_events с referer/user-agent из заголовков', async () => {
    const link = await seedLink({ code: 'red00002' });

    for (let i = 0; i < 3; i += 1) {
      await api()
        .get(`/${link.code}`)
        .set('Referer', 'https://ref.example.com/page')
        .set('User-Agent', 'Mozilla/5.0 TestAgent/1.0')
        .redirects(0);
    }

    // Клик пишется асинхронно ПОСЛЕ 302 — опрашиваем счётчик, а не sleep.
    await waitFor(
      async () => expectData<LinkDto>((await api().get(`/api/links/${link.id}`)).body).clicksCount,
      (count) => count === 3,
    );

    const { rows } = await getPool().query<{ referer: string; user_agent: string }>(
      'SELECT referer, user_agent FROM click_events WHERE link_id = $1 ORDER BY id',
      [link.id],
    );

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.referer).toBe('https://ref.example.com/page');
      expect(row.user_agent).toBe('Mozilla/5.0 TestAgent/1.0');
    }
  });

  it('API-28: неизвестный код — 404 LINK_NOT_FOUND', async () => {
    const response = await api().get('/definitely-not-a-code').redirects(0);

    expect(response.status).toBe(404);
    expectError(response.body, 'LINK_NOT_FOUND');
  });

  it('API-29: is_active = false — 410 LINK_DISABLED, клик НЕ записан', async () => {
    const link = await seedLink({ code: 'red00003', isActive: false });

    const response = await api().get(`/${link.code}`).redirects(0);

    expect(response.status).toBe(410);
    expectError(response.body, 'LINK_DISABLED');

    // Отрицательное условие («клика не будет никогда») нечего опрашивать
    // predicate'ом — даём асинхронной записи шанс проявиться и проверяем
    // отсутствие эффекта, а не sleep вместо ожидания результата.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(await countRows('click_events')).toBe(0);
  });

  it('API-30: GET /api/links не перехватывается редирект-роутом', async () => {
    await seedLink({ code: 'red00004' });

    const response = await api().get('/api/links').redirects(0);

    expect(response.status).toBe(200);
    const data = expectData<{ items: unknown[] }>(response.body);
    expect(Array.isArray(data.items)).toBe(true);
  });
});
