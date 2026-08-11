import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorBody, ErrorCode } from './error-code';

/**
 * Типизированная обёртка над HttpException, гарантирующая, что тело
 * исключения уже содержит { code, message, details? } строго по реестру
 * error-codes.md. HttpExceptionFilter распознаёт такие исключения по полю
 * `code` и переносит их as-is в конверт `{ data: null, error }`.
 *
 * Сервисные модули (LinksService, RedirectService, StatsService и т.д.,
 * задачи T7/T11-T13) должны бросать именно ApiException вместо голых
 * NotFoundException/ConflictException — это единственный способ гарантировать
 * правильный `error.code` в ответе.
 */
export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, details?: string[]) {
    const body: ApiErrorBody = details ? { code, message, details } : { code, message };
    super(body, status);
  }
}
