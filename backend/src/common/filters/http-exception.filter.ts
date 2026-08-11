import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '../errors/error-code';

/**
 * Глобальный фильтр исключений — вторая половина конверта { data, error }
 * (docs/api/contract.md §1, docs/api/error-codes.md).
 *
 * - HttpException с телом { code, message, details? } (см. ApiException) —
 *   переносится в конверт как есть, с тем же HTTP-статусом.
 * - Любой другой HttpException (например, брошенный самим Nest — 404 на
 *   несуществующий маршрут, синтетические ошибки framework'а) — оборачивается
 *   с кодом INTERNAL_ERROR, но с сохранением исходного HTTP-статуса.
 * - Любое непойманное исключение, не являющееся HttpException — это всегда
 *   500 INTERNAL_ERROR. Полная информация (stack trace) идёт только в лог,
 *   наружу утекает исключительно { code: "INTERNAL_ERROR", message }.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorBody = this.toErrorBody(exception.getResponse());

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`${request.method} ${request.url} -> ${status} ${errorBody.code}: ${errorBody.message}`);
      } else {
        this.logger.warn(`${request.method} ${request.url} -> ${status} ${errorBody.code}: ${errorBody.message}`);
      }

      response.status(status).json({ data: null, error: errorBody });
      return;
    }

    const stack = exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, stack);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } satisfies ApiErrorBody,
    });
  }

  /**
   * Приводит тело HttpException к ApiErrorBody. Исключения, брошенные через
   * ApiException, уже содержат { code, message, details? } — используем их
   * as-is. Остальные (голые HttpException/BadRequestException и т.п.,
   * которые в норме код приложения бросать не должен) получают безопасный
   * фолбэк INTERNAL_ERROR, чтобы наружу никогда не утекло сырое тело Nest
   * ({ statusCode, message, error }).
   */
  private toErrorBody(rawResponse: string | object): ApiErrorBody {
    if (typeof rawResponse === 'object' && rawResponse !== null && 'code' in rawResponse) {
      const body = rawResponse as Record<string, unknown>;
      const code = body.code as ApiErrorBody['code'];
      const message = typeof body.message === 'string' ? body.message : 'Error';
      const details = Array.isArray(body.details) ? (body.details as string[]) : undefined;
      return details ? { code, message, details } : { code, message };
    }

    const message =
      typeof rawResponse === 'string'
        ? rawResponse
        : this.extractMessage((rawResponse as Record<string, unknown>)?.message);

    return { code: 'INTERNAL_ERROR', message };
  }

  private extractMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
    return 'Internal server error';
  }
}
