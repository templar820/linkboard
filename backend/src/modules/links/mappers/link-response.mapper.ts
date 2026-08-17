import { Link } from '../entities/link.entity';
import { LinkResponseDto } from '../dto/link-response.dto';

/**
 * entity -> DTO. Чистая функция — unit-тестируется напрямую (coverage-matrix.md,
 * UNIT-BE-13) без поднятия LinksService целиком. `shortUrl = ${baseUrl}/${code}`.
 */
export function toLinkResponseDto(link: Link, baseUrl: string): LinkResponseDto {
  return {
    id: link.id,
    code: link.code,
    shortUrl: `${baseUrl}/${link.code}`,
    originalUrl: link.originalUrl,
    title: link.title,
    clicksCount: link.clicksCount,
    isActive: link.isActive,
    createdAt: link.createdAt.toISOString(),
  };
}
