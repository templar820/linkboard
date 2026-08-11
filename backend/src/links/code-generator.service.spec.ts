import { describe, expect, it, vi } from 'vitest';
import { AUTO_CODE_LENGTH, CodeGeneratorService, MAX_GENERATION_ATTEMPTS } from './code-generator.service';

function uniqueViolation(): Error & { code: string } {
  return Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
}

describe('CodeGeneratorService', () => {
  it('UNIT-BE-01: generateCode() возвращает код длиной ровно 7', () => {
    const service = new CodeGeneratorService();
    expect(service.generateCode()).toHaveLength(AUTO_CODE_LENGTH);
  });

  it('UNIT-BE-02: алфавит кода — только [0-9a-zA-Z] (base62)', () => {
    const service = new CodeGeneratorService();
    for (let i = 0; i < 200; i += 1) {
      expect(service.generateCode()).toMatch(/^[0-9a-zA-Z]{7}$/);
    }
  });

  it('UNIT-BE-03: коллизия (23505) на первой попытке -> повторная генерация, успех со второй попытки', async () => {
    const service = new CodeGeneratorService();
    const insert = vi.fn().mockRejectedValueOnce(uniqueViolation()).mockResolvedValueOnce(undefined);

    const code = await service.generateUniqueCode(insert);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(code).toMatch(/^[0-9a-zA-Z]{7}$/);
  });

  it('UNIT-BE-04: 5 коллизий подряд -> CODE_GENERATION_FAILED, 6-й попытки нет', async () => {
    const service = new CodeGeneratorService();
    const insert = vi.fn().mockRejectedValue(uniqueViolation());

    await expect(service.generateUniqueCode(insert)).rejects.toMatchObject({
      status: 500,
      response: { code: 'CODE_GENERATION_FAILED' },
    });
    expect(insert).toHaveBeenCalledTimes(MAX_GENERATION_ATTEMPTS);
  });

  it('пробрасывает наружу ошибку insert, не являющуюся коллизией уникальности', async () => {
    const service = new CodeGeneratorService();
    const insert = vi.fn().mockRejectedValue(new Error('connection lost'));

    await expect(service.generateUniqueCode(insert)).rejects.toThrow('connection lost');
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('UNIT-BE-05: customCode длиной вне [3,16] отклонён валидацией до похода в БД', () => {
    const service = new CodeGeneratorService();

    expect(() => service.validateCustomCode('ab')).toThrow(
      expect.objectContaining({ status: 400, response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
    expect(() => service.validateCustomCode('a'.repeat(17))).toThrow(
      expect.objectContaining({ status: 400, response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('UNIT-BE-06: customCode с символом вне base62 отклонён валидацией', () => {
    const service = new CodeGeneratorService();

    expect(() => service.validateCustomCode('bad code!')).toThrow(
      expect.objectContaining({ status: 400, response: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('UNIT-BE-07: customCode из резерв-списка (api, health) отклонён как занятый ещё до INSERT', () => {
    const service = new CodeGeneratorService();

    for (const reserved of ['api', 'health']) {
      expect(() => service.validateCustomCode(reserved)).toThrow(
        expect.objectContaining({ status: 409, response: expect.objectContaining({ code: 'CODE_TAKEN' }) }),
      );
    }
  });

  it('customCode валидной формы проходит без исключений', () => {
    const service = new CodeGeneratorService();
    expect(() => service.validateCustomCode('augnews2')).not.toThrow();
  });
});
