/**
 * Единый источник правды для значений `error.code` в конверте ответа.
 *
 * Значения синхронизированы буквально с замороженным контрактом:
 * docs/api/error-codes.md и docs/api/types.ts (`ErrorCode`).
 * `NETWORK_ERROR` сюда намеренно не включён — это клиентский код,
 * который синтезирует frontend-apiClient и который backend никогда
 * не возвращает в HTTP-ответе.
 */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'LINK_NOT_FOUND',
  'LINK_DISABLED',
  'CODE_TAKEN',
  'CODE_GENERATION_FAILED',
  'DB_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Тело `error` в конверте `{ data: null, error: ApiErrorBody }`.
 * `details` заполняется только для `VALIDATION_ERROR`.
 */
export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: string[];
}
