import { beforeEach, describe, expect, it } from 'vitest';
import { countRows, truncateAll } from '../support/db.js';
import { fakeIpHash, seedClicks, seedLink, syncClicksCount } from '../support/seed.js';

/**
 * Самопроверка тестового каркаса. Не проверяет продукт — проверяет, что
 * изоляция и сидирование работают. Если этот файл красный, все остальные
 * спеки недостоверны.
 */
describe('тестовый каркас', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('HARNESS-01: TRUNCATE очищает обе таблицы между тестами', async () => {
    expect(await countRows('links')).toBe(0);
    expect(await countRows('click_events')).toBe(0);

    await seedLink({ code: 'seed001' });
    expect(await countRows('links')).toBe(1);
  });

  it('HARNESS-02: предыдущий тест не оставил следов', async () => {
    expect(await countRows('links')).toBe(0);
  });

  it('HARNESS-03: клики сидируются с заданными occurred_at, referer и ip_hash', async () => {
    const link = await seedLink({ code: 'seed002' });

    await seedClicks([
      { linkId: link.id, occurredAt: new Date('2026-07-01T10:00:00Z'), referer: 'https://t.me/x', ipHash: fakeIpHash('a') },
      { linkId: link.id, occurredAt: new Date('2026-07-02T10:00:00Z'), referer: null, ipHash: fakeIpHash('b') },
    ]);
    await syncClicksCount(link.id);

    expect(await countRows('click_events')).toBe(2);
  });

  it('HARNESS-04: удаление ссылки каскадно уносит её клики', async () => {
    const link = await seedLink({ code: 'seed003' });
    await seedClicks([{ linkId: link.id, occurredAt: new Date() }]);

    const { getPool } = await import('../support/db.js');
    await getPool().query('DELETE FROM links WHERE id = $1', [link.id]);

    expect(await countRows('click_events')).toBe(0);
  });
});
