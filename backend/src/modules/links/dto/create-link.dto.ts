import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * originalUrl: только формат/наличие проверяет DTO (пустое тело/не-строка -> 400 из
 * глобального ValidationPipe до похода в сервис); протокол http(s) и лимит 2048 символов
 * проверяет LinksService.validateOriginalUrl (docs/api/contract.md §5) — так эта логика
 * остаётся unit-тестируемой без поднятия HTTP-стека (coverage-matrix.md, UNIT-BE-08..12).
 *
 * customCode: формат (3-16, base62) и резерв-список проверяет
 * CodeGeneratorService.validateCustomCode — по той же причине.
 */
export class CreateLinkDto {
  @IsString()
  @IsNotEmpty()
  originalUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  customCode?: string;
}
