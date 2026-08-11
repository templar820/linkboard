import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * Разворачивает дерево ValidationError (включая вложенные объекты через
 * `error.children`) в плоский список человекочитаемых строк для
 * `error.details` (docs/api/error-codes.md, VALIDATION_ERROR).
 */
export function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const ownConstraints = Object.values(error.constraints ?? {});
    const childConstraints = error.children?.length ? flattenValidationErrors(error.children) : [];
    return [...ownConstraints, ...childConstraints];
  });
}

/**
 * `exceptionFactory` для глобального ValidationPipe (см. main.ts): вместо
 * стандартного тела Nest ({ statusCode, message: string[], error }) сразу
 * формирует 400 с { code: "VALIDATION_ERROR", message, details }, как того
 * требует контракт.
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: flattenValidationErrors(errors),
  });
}
