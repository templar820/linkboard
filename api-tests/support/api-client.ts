import supertest from 'supertest';
import { expect } from 'vitest';
import { API_URL } from './env.js';

/**
 * supertest поверх базового URL, а НЕ поверх инстанса Nest-приложения.
 * Тестируется реально запущенный сервис — ровно так, как его увидит фронтенд.
 */
export function api() {
  return supertest(API_URL);
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: string[];
}

export interface Envelope<T = unknown> {
  data: T | null;
  error: ApiErrorBody | null;
}

/**
 * Инвариант конверта: ровно одно из data / error не null.
 * Вызывать в каждом кейсе — это сквозная проверка контракта.
 */
export function expectEnvelope<T>(body: unknown): Envelope<T> {
  expect(body, 'тело ответа должно быть объектом-конвертом').toBeTypeOf('object');
  const envelope = body as Envelope<T>;

  expect(Object.keys(envelope).sort(), 'конверт содержит ровно поля data и error').toEqual(['data', 'error']);

  const dataIsNull = envelope.data === null;
  const errorIsNull = envelope.error === null;
  expect(dataIsNull !== errorIsNull, `ровно одно поле конверта должно быть non-null, получено ${JSON.stringify(body)}`).toBe(true);

  return envelope;
}

/** Успешный ответ: возвращает data, попутно проверив инвариант. */
export function expectData<T>(body: unknown): T {
  const envelope = expectEnvelope<T>(body);
  expect(envelope.error, 'ожидался успешный ответ').toBeNull();
  return envelope.data as T;
}

/** Ошибочный ответ: проверяет инвариант и машинный код. */
export function expectError(body: unknown, code: string): ApiErrorBody {
  const envelope = expectEnvelope(body);
  expect(envelope.data, 'при ошибке data обязана быть null').toBeNull();
  expect(envelope.error?.code, `ожидался error.code = ${code}`).toBe(code);
  return envelope.error as ApiErrorBody;
}

/**
 * Клик по редиректу пишется асинхронно ПОСЛЕ ответа 302, поэтому счётчик
 * проверяется опросом, а не sleep'ом (docs/testing/strategy.md).
 */
export async function waitFor<T>(
  probe: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 5_000, intervalMs = 100 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T = await probe();

  while (Date.now() < deadline) {
    if (predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await probe();
  }

  throw new Error(`Условие не выполнилось за ${timeoutMs} мс. Последнее значение: ${JSON.stringify(last)}`);
}
