import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export type LinkSortField = 'created_at' | 'clicks_count';
export type SortOrder = 'asc' | 'desc';

/**
 * `sort` передаёт имя колонки БД, а не поля ответа — осознанное исключение из
 * camelCase-конвенции API, см. docs/api/contract.md §7.
 */
export class ListLinksQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['created_at', 'clicks_count'])
  sort: LinkSortField = 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: SortOrder = 'desc';
}
