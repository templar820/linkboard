import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TransformInterceptor } from './transform.interceptor';

function createContext(headersSent = false): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ headersSent }),
      getRequest: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

function createCallHandler<T>(value: T): CallHandler<T> {
  return { handle: () => of(value) };
}

describe('TransformInterceptor (UNIT-BE-25)', () => {
  it('оборачивает успешный ответ хендлера в { data, error: null }', async () => {
    const interceptor = new TransformInterceptor();
    const payload = { id: 42, code: 'r7Ab3xZ' };

    const result = await new Promise((resolve) => {
      interceptor.intercept(createContext(), createCallHandler(payload)).subscribe(resolve);
    });

    expect(result).toEqual({ data: payload, error: null });
  });

  it('оборачивает примитивные и falsy значения (0/false/[]) без потери данных', async () => {
    const interceptor = new TransformInterceptor();

    for (const value of [0, false, [], { deleted: true }]) {
      const result = await new Promise((resolve) => {
        interceptor.intercept(createContext(), createCallHandler(value)).subscribe(resolve);
      });
      expect(result).toEqual({ data: value, error: null });
    }
  });

  it('undefined от хендлера превращается в data: null', async () => {
    const interceptor = new TransformInterceptor();

    const result = await new Promise((resolve) => {
      interceptor.intercept(createContext(), createCallHandler(undefined)).subscribe(resolve);
    });

    expect(result).toEqual({ data: null, error: null });
  });

  it('не оборачивает ответ, если заголовки уже отправлены (редирект через @Res(), например будущий GET /:code)', async () => {
    const interceptor = new TransformInterceptor();
    const handle = vi.fn(() => of(undefined));

    const result = await new Promise((resolve) => {
      interceptor.intercept(createContext(true), { handle }).subscribe(resolve);
    });

    expect(result).toBeUndefined();
  });
});
