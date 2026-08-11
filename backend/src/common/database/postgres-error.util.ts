/** Postgres SQLSTATE for unique_violation (docs/plans/linkboard.md §2.3). */
export const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * TypeORM's QueryFailedError spreads the driver error's own properties onto itself
 * (see node_modules/typeorm/error/QueryFailedError.js), so `.code` is available directly;
 * `.driverError.code` is checked too for safety against future TypeORM versions.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const withCode = error as { code?: unknown; driverError?: { code?: unknown } };
  return withCode.code === POSTGRES_UNIQUE_VIOLATION || withCode.driverError?.code === POSTGRES_UNIQUE_VIOLATION;
}
