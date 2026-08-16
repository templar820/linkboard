import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '../errors/error-code';

/**
 * Глобальный фильтр исключений — вторая половина конверта { data, error }
 * (docs/api/contract.md §1, docs/api/error-codes.md).
 *
 * - HttpException с телом { code, message, details? } (см. ApiException) —
 *   переносится в конверт как есть, с тем же HTTP-статусом.
 * - HttpException, брошенный самим Nest (у него нет поля `code`), маппится по
 *   HTTP-статусу: 404 -> NOT_FOUND, 400 -> VALIDATION_ERROR. Всё остальное
 *   считается непредвиденным и приводится к 500 INTERNAL_ERROR — так каждый
 *   код реестра остаётся привязан к своему статусу, как требует
 *   docs/api/error-codes.md. Раньше здесь сохранялся исходный статус, из-за
 *   чего наружу уходил невозможный по контракту ответ «INTERNAL_ERROR + 404».
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
      const { status, errorBody } = this.mapHttpException(exception, request);

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
   * Приводит HttpException к паре { status, errorBody }. Исключения, брошенные
   * через ApiException, уже содержат { code, message, details? } и проходят
   * насквозь вместе со своим статусом. Голые исключения Nest маппятся по
   * статусу — сырое тело Nest ({ statusCode, message, error }) наружу не
   * попадает никогда.
   */
  private mapHttpException(
    exception: HttpException,
    request: Request,
  ): { status: number; errorBody: ApiErrorBody } {
    const status = exception.getStatus();
    const rawResponse = exception.getResponse();

    if (typeof rawResponse === 'object' && rawResponse !== null && 'code' in rawResponse) {
      const body = rawResponse as Record<string, unknown>;
      const code = body.code as ApiErrorBody['code'];
      const message = typeof body.message === 'string' ? body.message : 'Error';
      const details = Array.isArray(body.details) ? (body.details as string[]) : undefined;
      return { status, errorBody: details ? { code, message, details } : { code, message } };
    }

    if (status === HttpStatus.NOT_FOUND) {
      return {
        status,
        errorBody: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} was not found` },
      };
    }

    if (status === HttpStatus.BAD_REQUEST) {
      const message = this.extractMessage((rawResponse as Record<string, unknown>)?.message);
      return { status, errorBody: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [message] } };
    }

    // Непредвиденное исключение framework'а: статус приводим к 500, иначе в
    // ответе окажется пара «код + статус», которой нет в реестре ошибок.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorBody: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
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
