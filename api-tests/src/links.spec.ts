import { beforeEach, describe, expect, it } from 'vitest';
import { api, expectData, expectError } from '../support/api-client.js';
import { countRows, truncateAll } from '../support/db.js';
import { seedClicks, seedLink } from '../support/seed.js';
import { BASE_URL } from '../support/env.js';

/** Форма `data` для одной ссылки — docs/api/contract.md, LinkResponseDto. */
interface LinkDto {
  id: number;
  code: string;
  shortUrl: string;
  originalUrl: string;
  title: string | null;
  clicksCount: number;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedLinks {
  items: LinkDto[];
  page: number;
  limit: number;
  total: number;
}

const BASE62_7 = /^[0-9a-zA-Z]{7}$/;

describe('POST /api/links', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-01: базовый запрос — 201, конверт { data, error: null }, code длиной 7, base62', async () => {
    const response = await api().post('/api/links').send({ originalUrl: 'https://example.com/page' });

    expect(response.status).toBe(201);
    const data = expectData<LinkDto>(response.body);

    expect(data.code).toMatch(BASE62_7);
    expect(data.shortUrl).toBe(`${BASE_URL}/${data.code}`);
    expect(data.originalUrl).toBe('https://example.com/page');
    expect(data.isActive).toBe(true);
    expect(data.clicksCount).toBe(0);
    expect(data.title).toBeNull();
  });

  it('API-02: с customCode — код ссылки равен переданному customCode', async () => {
    const response = await api()
      .post('/api/links')
      .send({ originalUrl: 'https://example.com/page', customCode: 'myAlias1' });

    expect(response.status).toBe(201);
    const data = expectData<LinkDto>(response.body);
    expect(data.code).toBe('myAlias1');
    expect(data.shortUrl).toBe(`${BASE_URL}/myAlias1`);
  });

  it('API-03: повторный customCode — 409 CODE_TAKEN', async () => {
    await api().post('/api/links').send({ originalUrl: 'https://example.com/1', customCode: 'dupCode1' });
    const response = await api().post('/api/links').send({ originalUrl: 'https://example.com/2', customCode: 'dupCode1' });

    expect(response.status).toBe(409);
    expectError(response.body, 'CODE_TAKEN');
  });

  it('API-04: customCode = "api" (резерв) — 409 CODE_TAKEN', async () => {
    const response = await api().post('/api/links').send({ originalUrl: 'https://example.com/1', customCode: 'api' });

    expect(response.status).toBe(409);
    expectError(response.body, 'CODE_TAKEN');
  });

  it('API-05: originalUrl не URL — 400 VALIDATION_ERROR с details', async () => {
    const response = await api().post('/api/links').send({ originalUrl: 'not-a-url' });

    expect(response.status).toBe(400);
    const error = expectError(response.body, 'VALIDATION_ERROR');
    expect(error.details?.length).toBeGreaterThan(0);
  });

  it('API-06: схема не http/https — 400 VALIDATION_ERROR', async () => {
    const response = await api().post('/api/links').send({ originalUrl: 'javascript:alert(1)' });

    expect(response.status).toBe(400);
    const error = expectError(response.body, 'VALIDATION_ERROR');
    expect(error.details?.length).toBeGreaterThan(0);
  });

  it('API-07: пустое тело — 400 VALIDATION_ERROR с details', async () => {
    const response = await api().post('/api/links').send({});

    expect(response.status).toBe(400);
    const error = expectError(response.body, 'VALIDATION_ERROR');
    expect(error.details?.length).toBeGreaterThan(0);
  });
});

describe('GET /api/links', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-08: пустая БД — items: [], total: 0', async () => {
    const response = await api().get('/api/links');

    expect(response.status).toBe(200);
    const data = expectData<PaginatedLinks>(response.body);
    expect(data).toEqual({ items: [], page: 1, limit: 20, total: 0 });
  });

  it('API-09/API-10: 25 ссылок — пагинация 20 + 5, корректный total', async () => {
    for (let i = 0; i < 25; i += 1) {
      await seedLink({ code: `pag${String(i).padStart(4, '0')}` });
    }

    const page1Response = await api().get('/api/links');
    const page1 = expectData<PaginatedLinks>(page1Response.body);
    expect(page1.items).toHaveLength(20);
    expect(page1.total).toBe(25);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(20);

    const page2Response = await api().get('/api/links').query({ page: 2, limit: 20 });
    const page2 = expectData<PaginatedLinks>(page2Response.body);
    expect(page2.items).toHaveLength(5);
    expect(page2.total).toBe(25);
    expect(page2.page).toBe(2);
  });

  it('API-11: search по title находит ссылку', async () => {
    await seedLink({ code: 'srchtl1', title: 'August campaign' });
    await seedLink({ code: 'srchtl2', title: 'Unrelated' });

    const response = await api().get('/api/links').query({ search: 'august' });
    const data = expectData<PaginatedLinks>(response.body);

    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.code).toBe('srchtl1');
  });

  it('API-12: search по code находит ссылку', async () => {
    await seedLink({ code: 'uniqcode' });
    await seedLink({ code: 'another1' });

    const response = await api().get('/api/links').query({ search: 'uniqcode' });
    const data = expectData<PaginatedLinks>(response.body);

    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.code).toBe('uniqcode');
  });

  it('API-13: sort=clicks_count&order=desc — ссылки по убыванию кликов', async () => {
    await seedLink({ code: 'low00001', clicksCount: 1 });
    await seedLink({ code: 'high0001', clicksCount: 100 });
    await seedLink({ code: 'mid00001', clicksCount: 50 });

    const response = await api().get('/api/links').query({ sort: 'clicks_count', order: 'desc' });
    const data = expectData<PaginatedLinks>(response.body);

    expect(data.items.map((item) => item.code)).toEqual(['high0001', 'mid00001', 'low00001']);
  });

  it('API-14: limit=1000 — 400 VALIDATION_ERROR (> 100)', async () => {
    const response = await api().get('/api/links').query({ limit: 1000 });

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });
});

describe('GET /api/links/:id', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-15: существующий id — 200 с объектом ссылки', async () => {
    const link = await seedLink({ code: 'exist001', title: 'hello' });

    const response = await api().get(`/api/links/${link.id}`);

    expect(response.status).toBe(200);
    const data = expectData<LinkDto>(response.body);
    expect(data.id).toBe(link.id);
    expect(data.code).toBe('exist001');
    expect(data.title).toBe('hello');
  });

  it('API-16: несуществующий id — 404 LINK_NOT_FOUND', async () => {
    const response = await api().get('/api/links/999999');

    expect(response.status).toBe(404);
    expectError(response.body, 'LINK_NOT_FOUND');
  });

  it('API-17: id = "abc" — 400 VALIDATION_ERROR', async () => {
    const response = await api().get('/api/links/abc');

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });
});

describe('PATCH /api/links/:id', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-18: обновление title — 200, поле изменилось', async () => {
    const link = await seedLink({ code: 'patch001', title: 'old' });

    const response = await api().patch(`/api/links/${link.id}`).send({ title: 'new title' });

    expect(response.status).toBe(200);
    const data = expectData<LinkDto>(response.body);
    expect(data.title).toBe('new title');
  });

  it('API-19: isActive: false реально отключает редирект — 200, затем GET /:code — 410', async () => {
    const link = await seedLink({ code: 'patch002' });

    const patchResponse = await api().patch(`/api/links/${link.id}`).send({ isActive: false });
    expect(patchResponse.status).toBe(200);
    expect(expectData<LinkDto>(patchResponse.body).isActive).toBe(false);

    const redirectResponse = await api().get(`/${link.code}`).redirects(0);
    expect(redirectResponse.status).toBe(410);
    expectError(redirectResponse.body, 'LINK_DISABLED');
  });

  it('API-20: обновление originalUrl — 200, поле изменилось, code не менялся', async () => {
    const link = await seedLink({ code: 'patch003', originalUrl: 'https://example.com/old' });

    const response = await api().patch(`/api/links/${link.id}`).send({ originalUrl: 'https://example.com/new' });

    expect(response.status).toBe(200);
    const data = expectData<LinkDto>(response.body);
    expect(data.originalUrl).toBe('https://example.com/new');
    expect(data.code).toBe('patch003');
  });

  it('API-21: несуществующий id — 404 LINK_NOT_FOUND', async () => {
    const response = await api().patch('/api/links/999999').send({ title: 'x' });

    expect(response.status).toBe(404);
    expectError(response.body, 'LINK_NOT_FOUND');
  });

  it('API-22: невалидный originalUrl — 400 VALIDATION_ERROR', async () => {
    const link = await seedLink({ code: 'patch004' });

    const response = await api().patch(`/api/links/${link.id}`).send({ originalUrl: 'ftp://example.com' });

    expect(response.status).toBe(400);
    expectError(response.body, 'VALIDATION_ERROR');
  });
});

describe('DELETE /api/links/:id', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('API-23: успешное удаление — 200 { deleted: true }; GET /:id после — 404', async () => {
    const link = await seedLink({ code: 'del00001' });

    const response = await api().delete(`/api/links/${link.id}`);
    expect(response.status).toBe(200);
    expect(expectData(response.body)).toEqual({ deleted: true });

    const getResponse = await api().get(`/api/links/${link.id}`);
    expect(getResponse.status).toBe(404);
    expectError(getResponse.body, 'LINK_NOT_FOUND');
  });

  it('API-24: несуществующий id — 404 LINK_NOT_FOUND', async () => {
    const response = await api().delete('/api/links/999999');

    expect(response.status).toBe(404);
    expectError(response.body, 'LINK_NOT_FOUND');
  });

  it('API-25: ссылка с кликами — каскадное удаление click_events', async () => {
    const link = await seedLink({ code: 'del00002' });
    await seedClicks([
      { linkId: link.id, occurredAt: new Date() },
      { linkId: link.id, occurredAt: new Date() },
    ]);
    expect(await countRows('click_events')).toBe(2);

    const response = await api().delete(`/api/links/${link.id}`);

    expect(response.status).toBe(200);
    expect(await countRows('click_events')).toBe(0);
  });
});
