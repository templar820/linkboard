import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { ApiException } from '../errors/api-exception';

/**
 * Замена встроенному Nest ParseIntPipe: тот при некорректном значении бросает голый
 * BadRequestException, который HttpExceptionFilter (пока не закрыт известный дефект,
 * см. backend/CLAUDE.md) превращает в error.code = "INTERNAL_ERROR" вместо
 * "VALIDATION_ERROR". Используется на всех :id-параметрах (`/api/links/:id`,
 * `/api/links/:id/stats/*`).
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d+$/.test(value)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', ['id must be a positive integer']);
    }
    return Number(value);
  }
}
