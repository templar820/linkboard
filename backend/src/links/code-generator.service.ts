import { randomInt } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../common/database/postgres-error.util';
import { ApiException } from '../common/errors/api-exception';

/** base62, [0-9a-zA-Z] — docs/plans/linkboard.md §2.3, docs/api/contract.md §6. */
export const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE62_PATTERN = /^[0-9a-zA-Z]+$/;

export const AUTO_CODE_LENGTH = 7;
export const CUSTOM_CODE_MIN_LENGTH = 3;
export const CUSTOM_CODE_MAX_LENGTH = 16;
export const MAX_GENERATION_ATTEMPTS = 5;

/** Зарезервированные значения code — docs/api/contract.md §6, §10. */
export const RESERVED_CODES = ['api', 'health'];

/**
 * Генерация и валидация короткого кода ссылки. Сама по себе БД не трогает — retry на
 * коллизии реализован через колбэк `insert`, который вызывающая сторона (LinksService)
 * подключает к реальному репозиторию; это делает retry-логику unit-тестируемой без БД
 * (см. coverage-matrix.md, UNIT-BE-01..07).
 */
@Injectable()
export class CodeGeneratorService {
  /** Криптослучайный base62-код длиной 7 (не последовательный — crypto.randomInt). */
  generateCode(): string {
    let code = '';
    for (let i = 0; i < AUTO_CODE_LENGTH; i += 1) {
      code += BASE62_ALPHABET[randomInt(BASE62_ALPHABET.length)];
    }
    return code;
  }

  /**
   * Валидирует customCode: длина 3-16 (400 VALIDATION_ERROR), алфавит base62
   * (400 VALIDATION_ERROR), резерв-список `api`/`health` (409 CODE_TAKEN — резерв
   * трактуется как «уже занято», не как ошибка формата).
   */
  validateCustomCode(customCode: string): void {
    if (customCode.length < CUSTOM_CODE_MIN_LENGTH || customCode.length > CUSTOM_CODE_MAX_LENGTH) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
        `customCode must be ${CUSTOM_CODE_MIN_LENGTH}-${CUSTOM_CODE_MAX_LENGTH} alphanumeric characters`,
      ]);
    }

    if (!BASE62_PATTERN.test(customCode)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
        'customCode must contain only [0-9a-zA-Z] characters',
      ]);
    }

    if (RESERVED_CODES.includes(customCode)) {
      throw new ApiException(HttpStatus.CONFLICT, 'CODE_TAKEN', `Short code '${customCode}' is already in use`);
    }
  }

  /**
   * Генерирует код и вызывает `insert(code)`; при конфликте уникальности (23505) —
   * повторная генерация нового кода, максимум 5 попыток суммарно, затем
   * 500 CODE_GENERATION_FAILED. Любая другая ошибка из `insert` пробрасывается как есть.
   */
  async generateUniqueCode(insert: (code: string) => Promise<void>): Promise<string> {
    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const code = this.generateCode();
      try {
        await insert(code);
        return code;
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        if (attempt === MAX_GENERATION_ATTEMPTS) {
          throw new ApiException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'CODE_GENERATION_FAILED',
            'Failed to generate a unique short code after 5 attempts',
          );
        }
      }
    }

    /* istanbul ignore next -- unreachable: loop always returns or throws above */
    throw new ApiException(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'CODE_GENERATION_FAILED',
      'Failed to generate a unique short code after 5 attempts',
    );
  }
}
