import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * `code` намеренно отсутствует в схеме (docs/api/contract.md §6 — код неизменяем):
 * глобальный ValidationPipe с `whitelist: true` молча отбрасывает любое поле `code`,
 * пришедшее в теле PATCH, а не отклоняет запрос — ровно то поведение, которое описано
 * в docs/api/error-codes.md (VALIDATION_ERROR, PATCH /api/links/{id}).
 */
export class UpdateLinkDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  title?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  originalUrl?: string;
}
