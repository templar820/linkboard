import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Общие query-параметры пагинации (docs/api/contract.md §2).
 * `GET /api/links` (T11) расширяет этот DTO своими полями (search/sort/order).
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

/**
 * Форма `data` для пагинированных списков — { items, page, limit, total }.
 */
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
