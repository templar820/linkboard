import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { buildContinuousSeries, resolveRange, toIsoDate } from '../date-range.util';

function errorDetails(error: unknown): string[] {
  return ((error as HttpException).getResponse() as { details: string[] }).details;
}

describe('resolveRange', () => {
  const now = new Date('2026-08-11T15:30:00.000Z');

  it('UNIT-BE-29: без параметров берёт последние 30 дней по UTC', () => {
    const range = resolveRange(undefined, undefined, now);

    expect(range.to).toBe('2026-08-11');
    expect(range.from).toBe('2026-07-13');
    expect(toIsoDate(range.toExclusive)).toBe('2026-08-12');
  });

  it('UNIT-BE-30: граница to исключительная — включает весь последний день', () => {
    const range = resolveRange('2026-08-01', '2026-08-01', now);

    expect(range.fromDate.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(range.toExclusive.toISOString()).toBe('2026-08-02T00:00:00.000Z');
  });

  it('UNIT-BE-31: from > to → VALIDATION_ERROR', () => {
    const error = (() => {
      try {
        resolveRange('2026-08-10', '2026-08-01', now);
      } catch (e) {
        return e;
      }
    })();

    expect((error as HttpException).getStatus()).toBe(400);
    expect(errorDetails(error)).toContain('from must not be later than to');
  });

  it('UNIT-BE-32: окно больше 366 дней → VALIDATION_ERROR', () => {
    const error = (() => {
      try {
        resolveRange('2024-01-01', '2026-01-01', now);
      } catch (e) {
        return e;
      }
    })();

    expect(errorDetails(error)[0]).toMatch(/366/);
  });

  it('UNIT-BE-33: ровно 366 дней ещё допустимо', () => {
    expect(() => resolveRange('2026-01-01', '2027-01-01', now)).not.toThrow();
  });
});

describe('buildContinuousSeries', () => {
  const range = resolveRange('2026-08-01', '2026-08-05', new Date('2026-08-11T00:00:00.000Z'));

  it('UNIT-BE-34: дни без кликов возвращаются нулями, ряд непрерывный', () => {
    const points = buildContinuousSeries(
      [{ date: '2026-08-03', clicks: 7, uniqueVisitors: 5 }],
      range,
    );

    expect(points).toHaveLength(5);
    expect(points.map((p) => p.date)).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
    ]);
    expect(points[0]).toEqual({ date: '2026-08-01', clicks: 0, uniqueVisitors: 0 });
    expect(points[2]).toEqual({ date: '2026-08-03', clicks: 7, uniqueVisitors: 5 });
  });
});
