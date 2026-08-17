import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Диапазон дат для агрегатов (docs/api/contract.md, DateRangeParams).
 * Формат — YYYY-MM-DD в UTC. Дефолты и проверка `from <= to` живут в
 * StatsService: они зависят от «сегодня», а DTO должен оставаться чистой
 * проверкой формы.
 */
export class DateRangeQueryDto {
  @IsOptional()
  @Matches(ISO_DATE, { message: 'from must be an ISO date (YYYY-MM-DD)' })
  from?: string;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'to must be an ISO date (YYYY-MM-DD)' })
  to?: string;
}

/** Диапазон + limit — для топ-списков (referers, top links). */
export class RankedStatsQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
