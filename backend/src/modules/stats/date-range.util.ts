import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception';
import { DailyPointDto } from './dto/stats-response.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 30;

/** Разрешённый диапазон: строковые границы для ответа + границы UTC для SQL. */
export interface ResolvedRange {
  /** YYYY-MM-DD, попадает в ответ как есть. */
  from: string;
  to: string;
  /** Начало суток `from` в UTC — включительно. */
  fromDate: Date;
  /** Начало суток, следующих за `to` — граница исключительная (occurred_at < toExclusive). */
  toExclusive: Date;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Дефолты и проверки диапазона (docs/api/contract.md, DateRangeParams):
 * `to` — сегодня UTC, `from` — 30 дней назад включительно, `from <= to`,
 * окно не больше 366 дней. Всё считается по UTC, чтобы границы суток не
 * зависели от таймзоны сервера.
 */
export function resolveRange(from: string | undefined, to: string | undefined, now: Date = new Date()): ResolvedRange {
  const toDate = to ? parseIsoDate(to, 'to') : startOfUtcDay(now);
  const fromDate = from ? parseIsoDate(from, 'from') : new Date(toDate.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
      'from must not be later than to',
    ]);
  }

  const days = Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) {
    throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
      `date range must not exceed ${MAX_RANGE_DAYS} days`,
    ]);
  }

  return {
    from: toIsoDate(fromDate),
    to: toIsoDate(toDate),
    fromDate,
    toExclusive: new Date(toDate.getTime() + DAY_MS),
  };
}

function parseIsoDate(value: string, field: 'from' | 'to'): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
      `${field} must be an ISO date (YYYY-MM-DD)`,
    ]);
  }
  return parsed;
}

/**
 * Достраивает непрерывный ряд дней: дни без кликов возвращаются с нулями,
 * чтобы фронтенду не приходилось дозаполнять график (docs/api/types.ts,
 * DailyStats.points).
 */
export function buildContinuousSeries(
  rows: Array<{ date: string; clicks: number; uniqueVisitors: number }>,
  range: ResolvedRange,
): DailyPointDto[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const points: DailyPointDto[] = [];

  for (let time = range.fromDate.getTime(); time <= range.toExclusive.getTime() - DAY_MS; time += DAY_MS) {
    const date = toIsoDate(new Date(time));
    const row = byDate.get(date);
    points.push({ date, clicks: row?.clicks ?? 0, uniqueVisitors: row?.uniqueVisitors ?? 0 });
  }

  return points;
}
