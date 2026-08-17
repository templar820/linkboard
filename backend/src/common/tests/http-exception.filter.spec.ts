import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../errors/api-exception';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

function createHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: 'GET', url: '/api/links/999' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('UNIT-BE-26: ApiException/HttpException с {code, message} -> { data: null, error: { code, message } } с тем же статусом', () => {
    const { host, status, json } = createHost();
    const exception = new ApiException(HttpStatus.NOT_FOUND, 'LINK_NOT_FOUND', 'Link with id 42 was not found');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'LINK_NOT_FOUND', message: 'Link with id 42 was not found' },
    });
  });

  it('переносит details для VALIDATION_ERROR', () => {
    const { host, status, json } = createHost();
    const exception = new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
      'originalUrl must be a valid http(s) URL',
    ]);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['originalUrl must be a valid http(s) URL'],
      },
    });
  });

  it('UNIT-BE-43: голый NotFoundException от роутера Nest -> 404 NOT_FOUND, а не INTERNAL_ERROR', () => {
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException('Cannot GET /api/links/999'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Route GET /api/links/999 was not found' },
    });
  });

  it('UNIT-BE-44: голый HttpException с нештатным статусом приводится к 500 — пары «код + статус» вне реестра быть не должно', () => {
    const { host, status, json } = createHost();

    filter.catch(new HttpException('Payload too large', HttpStatus.PAYLOAD_TOO_LARGE), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('UNIT-BE-27: непредвиденный Error -> 500 INTERNAL_ERROR без утечки stack trace в тело ответа', () => {
    const { host, status, json } = createHost();
    const exception = new Error('connection terminated unexpectedly, at /some/internal/path.ts:42');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });

    const responseBody = json.mock.calls[0][0];
    expect(JSON.stringify(responseBody)).not.toContain('connection terminated');
    expect(JSON.stringify(responseBody)).not.toContain('.ts:42');
  });

  it('непредвиденное не-Error значение (например, брошенная строка) -> тоже 500 INTERNAL_ERROR', () => {
    const { host, status, json } = createHost();

    filter.catch('boom', host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
