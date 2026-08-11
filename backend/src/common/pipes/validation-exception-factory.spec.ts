import { ValidationPipe } from '@nestjs/common';
import { IsInt, IsUrl, Max, Min } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { validationExceptionFactory } from './validation-exception-factory';

class CreateLinkDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  originalUrl!: string;
}

class PaginationDto {
  @IsInt()
  @Min(1)
  @Max(100)
  limit!: number;
}

describe('validationExceptionFactory (VALIDATION_ERROR + details)', () => {
  it('формирует 400 с error.code = VALIDATION_ERROR и error.details: string[]', async () => {
    const pipe = new ValidationPipe({ exceptionFactory: validationExceptionFactory });

    await expect(
      pipe.transform({ originalUrl: 'not-a-url' }, { type: 'body', metatype: CreateLinkDto }),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.arrayContaining([expect.stringContaining('originalUrl')]),
      },
    });
  });

  it('собирает нарушения нескольких полей в один плоский массив details', async () => {
    const pipe = new ValidationPipe({ exceptionFactory: validationExceptionFactory });

    try {
      await pipe.transform({ limit: 1000 }, { type: 'query', metatype: PaginationDto });
      expect.unreachable('ожидалось исключение валидации');
    } catch (error: unknown) {
      const response = (error as { response: { details: string[] } }).response;
      expect(response.details.length).toBeGreaterThan(0);
      expect(response.details.every((detail) => typeof detail === 'string')).toBe(true);
    }
  });
});
