import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedirectService } from './redirect.service';

function createRepository() {
  return { findOneBy: vi.fn() };
}

function createDataSource(transactionImpl?: () => Promise<void>) {
  return {
    transaction: vi.fn(transactionImpl ?? (async (cb: (m: unknown) => Promise<void>) => cb(createManager()))),
  };
}

function createManager() {
  return { insert: vi.fn(), increment: vi.fn() };
}

function errorBody(error: unknown): { code: string; message: string } {
  return (error as HttpException).getResponse() as { code: string; message: string };
}

describe('RedirectService', () => {
  let repository: ReturnType<typeof createRepository>;

  beforeEach(() => {
    repository = createRepository();
  });

  describe('resolve', () => {
    it('UNIT-BE-18: возвращает ссылку по коду', async () => {
      const link = { id: 1, code: 'abc1234', originalUrl: 'https://example.com', isActive: true };
      repository.findOneBy.mockResolvedValue(link);
      const service = new RedirectService(repository as never, createDataSource() as never);

      await expect(service.resolve('abc1234')).resolves.toBe(link);
    });

    it('UNIT-BE-19: неизвестный код → LINK_NOT_FOUND 404', async () => {
      repository.findOneBy.mockResolvedValue(null);
      const service = new RedirectService(repository as never, createDataSource() as never);

      const error = await service.resolve('nope123').catch((e: unknown) => e);
      expect((error as HttpException).getStatus()).toBe(404);
      expect(errorBody(error).code).toBe('LINK_NOT_FOUND');
    });

    it('UNIT-BE-20: отключённая ссылка → LINK_DISABLED 410', async () => {
      repository.findOneBy.mockResolvedValue({ id: 1, code: 'off1234', isActive: false });
      const service = new RedirectService(repository as never, createDataSource() as never);

      const error = await service.resolve('off1234').catch((e: unknown) => e);
      expect((error as HttpException).getStatus()).toBe(410);
      expect(errorBody(error).code).toBe('LINK_DISABLED');
    });
  });

  describe('recordClick', () => {
    it('UNIT-BE-21: пишет событие и инкрементит счётчик одной транзакцией', async () => {
      const manager = createManager();
      const dataSource = { transaction: vi.fn(async (cb: (m: unknown) => Promise<void>) => cb(manager)) };
      const service = new RedirectService(repository as never, dataSource as never);

      await service.recordClick(42, { referer: 'https://t.me/x', userAgent: 'curl/8', ip: '1.2.3.4' });

      expect(manager.insert).toHaveBeenCalledOnce();
      expect(manager.increment).toHaveBeenCalledWith(expect.anything(), { id: 42 }, 'clicksCount', 1);

      const inserted = manager.insert.mock.calls[0]?.[1] as { referer: string; ipHash: string };
      expect(inserted.referer).toBe('https://t.me/x');
      expect(inserted.ipHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('UNIT-BE-22: без IP пишет ipHash = null, а не хеш пустой строки', async () => {
      const manager = createManager();
      const dataSource = { transaction: vi.fn(async (cb: (m: unknown) => Promise<void>) => cb(manager)) };
      const service = new RedirectService(repository as never, dataSource as never);

      await service.recordClick(1, { referer: null, userAgent: null, ip: null });

      expect((manager.insert.mock.calls[0]?.[1] as { ipHash: string | null }).ipHash).toBeNull();
    });

    it('UNIT-BE-23: ошибка записи не пробрасывается наружу — редирект не должен ломаться', async () => {
      const dataSource = { transaction: vi.fn().mockRejectedValue(new Error('db is down')) };
      const service = new RedirectService(repository as never, dataSource as never);

      await expect(service.recordClick(1, { referer: null, userAgent: null, ip: '1.2.3.4' })).resolves.toBeUndefined();
    });
  });
});
