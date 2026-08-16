import { beforeEach, describe, expect, it } from 'vitest';
import { api, expectData, expectError } from '../support/api-client.js';
import { truncateAll } from '../support/db.js';
import { fakeIpHash, seedClicks, seedLink } from '../support/seed.js';

/** Формы `data` для stats-эндпоинтов — docs/api/contract.md, docs/api/types.ts. */
interface DailyPointDto {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

interface DailyStatsDto {
  from: string;
  to: string;
  points: DailyPointDto[];
  totalClicks: number;
  totalUnique: number;
}

interface RefererStatsDto {
  items: Array<{ referer: string; clicks: number }>;
}

interface UserAgentStatsDto {
  browsers: Array<{ name: string; clicks: number }>;
  devices: Array<{ type: string; clicks: number }>;
}

interface StatsSummaryDto {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  clicksToday: number;
  clicksLast7Days: number;
  uniqueVisitorsLast7Days: number;
}

interface TopLinksDto {
  items: Array<{ id: number; code: string; title: string | null; shortUrl: string; clicks: number }>;
}

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

describe('GET /api/links/:id/stats/daily', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-31: сид кликов на заданные occurred_at — суммы по дням совпадают с ожидаемым', async () => {
    const link = await seedLink({ code: 'stday001' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date('2026-07-01T09:00:00Z') },
      { linkId: link.id, occurredAt: new Date('2026-07-01T20:00:00Z') },
      { linkId: link.id, occurredAt: new Date('2026-07-03T12:00:00Z') },
    ]);

    const response = await api().get(`/api/links/${link.id}/stats/daily`).query({ from: '2026-07-01', to: '2026-07-03' });

    expect(response.status).toBe(200);
    const data = expectData<DailyStatsDto>(response.body);

    expect(data.from).toBe('2026-07-01');
    expect(data.to).toBe('2026-07-03');
    expect(data.points).toEqual([
      { date: '2026-07-01', clicks: 2, uniqueVisitors: 0 },
      { date: '2026-07-02', clicks: 0, uniqueVisitors: 0 },
      { date: '2026-07-03', clicks: 1, uniqueVisitors: 0 },
    ]);
    expect(data.totalClicks).toBe(3);
  });

  it('API-32: дни без кликов присутствуют в points с clicks: 0', async () => {
    const link = await seedLink({ code: 'stday002' });
    await seedClicks([{ linkId: link.id, occurredAt: new Date('2026-07-05T12:00:00Z') }]);

    const response = await api().get(`/api/links/${link.id}/stats/daily`).query({ from: '2026-07-01', to: '2026-07-05' });
    const data = expectData<DailyStatsDto>(response.body);

    expect(data.points.map((point) => point.date)).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ]);
    expect(data.points.filter((point) => point.clicks === 0)).toHaveLength(4);
  });

  it('API-33: uniqueVisitors — по количеству уникальных ip_hash в дне', async () => {
    const link = await seedLink({ code: 'stday003' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date('2026-07-01T08:00:00Z'), ipHash: fakeIpHash('a') },
      { linkId: link.id, occurredAt: new Date('2026-07-01T09:00:00Z'), ipHash: fakeIpHash('a') },
      { linkId: link.id, occurredAt: new Date('2026-07-01T10:00:00Z'), ipHash: fakeIpHash('b') },
    ]);

    const response = await api().get(`/api/links/${link.id}/stats/daily`).query({ from: '2026-07-01', to: '2026-07-01' });
    const data = expectData<DailyStatsDto>(response.body);

    expect(data.points).toEqual([{ date: '2026-07-01', clicks: 3, uniqueVisitors: 2 }]);
    expect(data.totalUnique).toBe(2);
  });

  it('API-34: from > to — 400 VALIDATION_ERROR', async () => {
    const link = await seedLink({ code: 'stday004' });

    const response = await api().get(`/api/links/${link.id}/stats/daily`).query({ from: '2026-07-10', to: '2026-07-01' });

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });

  it('API-35: диапазон > 366 дней — 400 VALIDATION_ERROR', async () => {
    const link = await seedLink({ code: 'stday005' });

    const response = await api().get(`/api/links/${link.id}/stats/daily`).query({ from: '2025-01-01', to: '2026-01-05' });

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });

  it('API-36: несуществующий id — 404 LINK_NOT_FOUND', async () => {
    const response = await api().get('/api/links/999999/stats/daily');

    expect(response.status).toBe(404);
    expectError(response.body, 'LINK_NOT_FOUND');
  });

  it('доп. кейс: кривой формат даты — 400 VALIDATION_ERROR', async () => {
    const link = await seedLink({ code: 'stday006' });

    const response = await api().get(`/api/links/${link.id}/stats/daily`).query({ from: 'not-a-date', to: '2026-07-01' });

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });
});

describe('GET /api/links/:id/stats/referers', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-37: группировка — сортировка по clicks desc', async () => {
    const link = await seedLink({ code: 'stref001' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date(), referer: 'https://a.example.com/x' },
      { linkId: link.id, occurredAt: new Date(), referer: 'https://a.example.com/y' },
      { linkId: link.id, occurredAt: new Date(), referer: 'https://b.example.com/z' },
    ]);

    const response = await api().get(`/api/links/${link.id}/stats/referers`);
    const data = expectData<RefererStatsDto>(response.body);

    expect(data.items).toEqual([
      { referer: 'a.example.com', clicks: 2 },
      { referer: 'b.example.com', clicks: 1 },
    ]);
  });

  it('API-38: клики без referer группируются в "(direct)"', async () => {
    const link = await seedLink({ code: 'stref002' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date(), referer: null },
      { linkId: link.id, occurredAt: new Date(), referer: '' },
    ]);

    const response = await api().get(`/api/links/${link.id}/stats/referers`);
    const data = expectData<RefererStatsDto>(response.body);

    expect(data.items).toEqual([{ referer: '(direct)', clicks: 2 }]);
  });

  it('API-39: limit ограничивает число записей', async () => {
    const link = await seedLink({ code: 'stref003' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date(), referer: 'https://one.example.com' },
      { linkId: link.id, occurredAt: new Date(), referer: 'https://two.example.com' },
      { linkId: link.id, occurredAt: new Date(), referer: 'https://three.example.com' },
    ]);

    const response = await api().get(`/api/links/${link.id}/stats/referers`).query({ limit: 2 });
    const data = expectData<RefererStatsDto>(response.body);

    expect(data.items).toHaveLength(2);
  });
});

describe('GET /api/links/:id/stats/user-agents', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0';
  const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

  it('API-40: browsers[] — группировка и сортировка по clicks', async () => {
    const link = await seedLink({ code: 'stua0001' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date(), userAgent: CHROME_UA },
      { linkId: link.id, occurredAt: new Date(), userAgent: CHROME_UA },
      { linkId: link.id, occurredAt: new Date(), userAgent: FIREFOX_UA },
    ]);

    const response = await api().get(`/api/links/${link.id}/stats/user-agents`);
    const data = expectData<UserAgentStatsDto>(response.body);

    expect(data.browsers[0]).toEqual({ name: 'Chrome', clicks: 2 });
    expect(data.browsers.find((browser) => browser.name === 'Firefox')).toEqual({ name: 'Firefox', clicks: 1 });
  });

  it('API-41: devices[] — включает отдельную группу bot', async () => {
    const link = await seedLink({ code: 'stua0002' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date(), userAgent: CHROME_UA },
      { linkId: link.id, occurredAt: new Date(), userAgent: BOT_UA },
    ]);

    const response = await api().get(`/api/links/${link.id}/stats/user-agents`);
    const data = expectData<UserAgentStatsDto>(response.body);

    expect(data.devices.find((device) => device.type === 'bot')).toEqual({ type: 'bot', clicks: 1 });
    expect(data.devices.find((device) => device.type === 'desktop')).toEqual({ type: 'desktop', clicks: 1 });
  });
});

describe('GET /api/stats/summary', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-42: totalLinks/activeLinks соответствуют сиду', async () => {
    await seedLink({ code: 'sum00001', isActive: true });
    await seedLink({ code: 'sum00002', isActive: true });
    await seedLink({ code: 'sum00003', isActive: false });

    const response = await api().get('/api/stats/summary');
    const data = expectData<StatsSummaryDto>(response.body);

    expect(data.totalLinks).toBe(3);
    expect(data.activeLinks).toBe(2);
  });

  it('API-43: totalClicks — сумма кликов по всем ссылкам', async () => {
    const link1 = await seedLink({ code: 'sum00004' });
    const link2 = await seedLink({ code: 'sum00005' });
    await seedClicks([
      { linkId: link1.id, occurredAt: new Date() },
      { linkId: link1.id, occurredAt: new Date() },
      { linkId: link2.id, occurredAt: new Date() },
    ]);

    const response = await api().get('/api/stats/summary');
    const data = expectData<StatsSummaryDto>(response.body);

    expect(data.totalClicks).toBe(3);
  });

  it('API-44: clicksToday считается строго по UTC-границе суток', async () => {
    const link = await seedLink({ code: 'sum00006' });
    const midnight = todayUtcMidnight();

    await seedClicks([
      // 23:59:59.999 UTC «вчера» — не должен войти в clicksToday.
      { linkId: link.id, occurredAt: new Date(midnight.getTime() - 1) },
      // 00:00:00.000 UTC «сегодня» — граница включительно.
      { linkId: link.id, occurredAt: midnight },
      { linkId: link.id, occurredAt: new Date(midnight.getTime() + 3_600_000) },
    ]);

    const response = await api().get('/api/stats/summary');
    const data = expectData<StatsSummaryDto>(response.body);

    expect(data.clicksToday).toBe(2);
  });

  it('API-45: clicksLast7Days/uniqueVisitorsLast7Days соответствуют сиду за 7 дней', async () => {
    const link = await seedLink({ code: 'sum00007' });
    const midnight = todayUtcMidnight();
    const weekStart = new Date(midnight.getTime() - 6 * 24 * 60 * 60 * 1000);

    await seedClicks([
      // За пределами окна (весь диапазон — [weekStart, now]).
      { linkId: link.id, occurredAt: new Date(weekStart.getTime() - 1), ipHash: fakeIpHash('outside') },
      { linkId: link.id, occurredAt: weekStart, ipHash: fakeIpHash('a') },
      { linkId: link.id, occurredAt: new Date(weekStart.getTime() + 3_600_000), ipHash: fakeIpHash('a') },
      { linkId: link.id, occurredAt: new Date(midnight.getTime() + 3_600_000), ipHash: fakeIpHash('b') },
    ]);

    const response = await api().get('/api/stats/summary');
    const data = expectData<StatsSummaryDto>(response.body);

    expect(data.clicksLast7Days).toBe(3);
    expect(data.uniqueVisitorsLast7Days).toBe(2);
  });
});

describe('GET /api/stats/daily', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-46: суммы по дням агрегированы по всем ссылкам', async () => {
    const link1 = await seedLink({ code: 'gday0001' });
    const link2 = await seedLink({ code: 'gday0002' });

    await seedClicks([
      { linkId: link1.id, occurredAt: new Date('2026-07-01T08:00:00Z') },
      { linkId: link2.id, occurredAt: new Date('2026-07-01T09:00:00Z') },
      { linkId: link1.id, occurredAt: new Date('2026-07-02T08:00:00Z') },
    ]);

    const response = await api().get('/api/stats/daily').query({ from: '2026-07-01', to: '2026-07-02' });
    const data = expectData<DailyStatsDto>(response.body);

    expect(data.points).toEqual([
      { date: '2026-07-01', clicks: 2, uniqueVisitors: 0 },
      { date: '2026-07-02', clicks: 1, uniqueVisitors: 0 },
    ]);
    expect(data.totalClicks).toBe(3);
  });

  it('API-47: from > to — 400 VALIDATION_ERROR', async () => {
    const response = await api().get('/api/stats/daily').query({ from: '2026-07-10', to: '2026-07-01' });

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });

  it('доп. кейс: диапазон > 366 дней — 400 VALIDATION_ERROR', async () => {
    const response = await api().get('/api/stats/daily').query({ from: '2025-01-01', to: '2026-01-05' });

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });
});

describe('GET /api/stats/top', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-48: топ за период сходится с сидом, сортировка по убыванию', async () => {
    const link1 = await seedLink({ code: 'top00001', title: 'One' });
    const link2 = await seedLink({ code: 'top00002', title: 'Two' });
    const link3 = await seedLink({ code: 'top00003', title: 'Three' });

    await seedClicks([
      { linkId: link1.id, occurredAt: new Date('2026-07-01T08:00:00Z') },
      { linkId: link2.id, occurredAt: new Date('2026-07-01T08:00:00Z') },
      { linkId: link2.id, occurredAt: new Date('2026-07-01T09:00:00Z') },
      { linkId: link2.id, occurredAt: new Date('2026-07-01T10:00:00Z') },
      { linkId: link3.id, occurredAt: new Date('2026-07-01T08:00:00Z') },
      { linkId: link3.id, occurredAt: new Date('2026-07-01T09:00:00Z') },
    ]);

    const response = await api().get('/api/stats/top').query({ from: '2026-07-01', to: '2026-07-01' });
    const data = expectData<TopLinksDto>(response.body);

    expect(data.items.map((item) => item.code)).toEqual(['top00002', 'top00003', 'top00001']);
    expect(data.items[0]?.clicks).toBe(3);
  });

  it('API-49: ссылка с большим clicks_count, но без кликов в периоде — не попадает в топ', async () => {
    // Денормализованный счётчик выставлен вручную, click_events для неё пусты за период.
    await seedLink({ code: 'top00004', clicksCount: 1000 });
    const fresh = await seedLink({ code: 'top00005', clicksCount: 0 });
    await seedClicks([{ linkId: fresh.id, occurredAt: new Date('2026-07-01T08:00:00Z') }]);

    const response = await api().get('/api/stats/top').query({ from: '2026-07-01', to: '2026-07-01' });
    const data = expectData<TopLinksDto>(response.body);

    expect(data.items.map((item) => item.code)).toEqual(['top00005']);
    expect(data.items.find((item) => item.code === 'top00004')).toBeUndefined();
  });

  it('API-50: limit ограничивает размер списка', async () => {
    const links = await Promise.all([
      seedLink({ code: 'top00006' }),
      seedLink({ code: 'top00007' }),
      seedLink({ code: 'top00008' }),
    ]);
    await seedClicks(links.map((link) => ({ linkId: link.id, occurredAt: new Date('2026-07-01T08:00:00Z') })));

    const response = await api().get('/api/stats/top').query({ from: '2026-07-01', to: '2026-07-01', limit: 2 });
    const data = expectData<TopLinksDto>(response.body);

    expect(data.items).toHaveLength(2);
  });
});
