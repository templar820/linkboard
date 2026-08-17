import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeGeneratorService } from '../code-generator.service';
import { LinksService } from '../links.service';

function createRepository() {
  return {
    create: vi.fn((data: unknown) => data),
    save: vi.fn(),
    remove: vi.fn(),
    findOneBy: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
}

function createConfig(baseUrl = 'http://localhost:8080') {
  return { baseUrl } as { baseUrl: string };
}

describe('LinksService', () => {
  let repository: ReturnType<typeof createRepository>;
  let service: LinksService;

  beforeEach(() => {
    repository = createRepository();
    service = new LinksService(repository as never, new CodeGeneratorService(), createConfig() as never);
  });

  describe('validateOriginalUrl (через create)', () => {
    it('UNIT-BE-08: принимает http://', async () => {
      repository.save.mockResolvedValue({
        id: 1,
        code: 'abc1234',
        originalUrl: 'http://example.com',
        title: null,
        clicksCount: 0,
        isActive: true,
        createdAt: new Date('2026-08-11T10:00:00.000Z'),
      });

      await expect(service.create({ originalUrl: 'http://example.com' })).resolves.toMatchObject({
        originalUrl: 'http://example.com',
      });
    });

    it('UNIT-BE-09: принимает https://', async () => {
      repository.save.mockResolvedValue({
        id: 1,
        code: 'abc1234',
        originalUrl: 'https://example.com',
        title: null,
        clicksCount: 0,
        isActive: true,
        createdAt: new Date('2026-08-11T10:00:00.000Z'),
      });

      await expect(service.create({ originalUrl: 'https://example.com' })).resolves.toMatchObject({
        originalUrl: 'https://example.com',
      });
    });

    it('UNIT-BE-10: отклоняет схему javascript:', async () => {
      await expect(service.create({ originalUrl: 'javascript:alert(1)' })).rejects.toMatchObject({
        status: 400,
        response: { code: 'VALIDATION_ERROR' },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('UNIT-BE-11: отклоняет схему ftp:', async () => {
      await expect(service.create({ originalUrl: 'ftp://example.com/file' })).rejects.toMatchObject({
        status: 400,
        response: { code: 'VALIDATION_ERROR' },
      });
    });

    it('UNIT-BE-12: отклоняет originalUrl длиной > 2048', async () => {
      const longUrl = `https://example.com/${'a'.repeat(2048)}`;
      await expect(service.create({ originalUrl: longUrl })).rejects.toMatchObject({
        status: 400,
        response: { code: 'VALIDATION_ERROR' },
      });
    });
  });

  it('UNIT-BE-13: маппинг entity -> DTO строит shortUrl = ${BASE_URL}/${code}', async () => {
    repository.save.mockResolvedValue({
      id: 42,
      code: 'r7Ab3xZ',
      originalUrl: 'https://example.com',
      title: 'title',
      clicksCount: 0,
      isActive: true,
      createdAt: new Date('2026-08-11T10:00:00.000Z'),
    });

    const result = await service.create({ originalUrl: 'https://example.com', title: 'title' });

    expect(result).toEqual({
      id: 42,
      code: 'r7Ab3xZ',
      shortUrl: 'http://localhost:8080/r7Ab3xZ',
      originalUrl: 'https://example.com',
      title: 'title',
      clicksCount: 0,
      isActive: true,
      createdAt: '2026-08-11T10:00:00.000Z',
    });
  });

  it('customCode занятый (23505 на insert) -> 409 CODE_TAKEN', async () => {
    repository.save.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }));

    await expect(service.create({ originalUrl: 'https://example.com', customCode: 'augnews2' })).rejects.toMatchObject({
      status: 409,
      response: { code: 'CODE_TAKEN' },
    });
  });

  it('customCode зарезервированный (api) -> 409 CODE_TAKEN без похода в БД', async () => {
    await expect(service.create({ originalUrl: 'https://example.com', customCode: 'api' })).rejects.toMatchObject({
      status: 409,
      response: { code: 'CODE_TAKEN' },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('getEntityOrFail: несуществующий id -> 404 LINK_NOT_FOUND', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toMatchObject({
      status: 404,
      response: { code: 'LINK_NOT_FOUND' },
    });
  });

  it('remove: удаляет найденную ссылку и возвращает { deleted: true }', async () => {
    const link = { id: 1, code: 'abc1234' };
    repository.findOneBy.mockResolvedValue(link);
    repository.remove.mockResolvedValue(link);

    await expect(service.remove(1)).resolves.toEqual({ deleted: true });
    expect(repository.remove).toHaveBeenCalledWith(link);
  });
});
