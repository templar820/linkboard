/**
 * Linkboard API — единый источник правды для TypeScript-типов.
 *
 * Этот файл не зависит от Nest.js, React или любых других фреймворков —
 * чистые типы, независимо импортируемые frontend'ом (`frontend/src/api/types.ts`
 * может ре-экспортировать отсюда) и проектом `api-tests`.
 *
 * Источник спецификации: docs/api/openapi.yaml, docs/api/contract.md,
 * docs/api/error-codes.md. Любое изменение здесь должно быть синхронизировано
 * с openapi.yaml.
 */

// ---------------------------------------------------------------------------
// Конверт ответа { data, error }
// ---------------------------------------------------------------------------

/**
 * Успешный ответ API: data заполнена, error === null.
 */
export interface ApiSuccessEnvelope<T> {
  data: T;
  error: null;
}

/**
 * Ответ API с ошибкой: data === null, error заполнена.
 */
export interface ApiErrorEnvelope {
  data: null;
  error: ApiErrorObject;
}

/**
 * Полный конверт ответа API. Инвариант: data XOR error
 * (ровно одно из полей не null). Различать успех/ошибку — по полю `error`.
 */
export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface ApiErrorObject {
  code: ErrorCode;
  /** Человекочитаемое сообщение. Не предназначено для программного разбора — используйте code. */
  message: string;
  /** Только для VALIDATION_ERROR: список отдельных нарушений валидации. */
  details?: string[];
}

/**
 * Полный реестр кодов ошибок API. Подробности и HTTP-статусы — docs/api/error-codes.md.
 *
 * NETWORK_ERROR — единственный код, который никогда не приходит от сервера:
 * он синтезируется клиентским apiClient при сетевом сбое/невалидном ответе.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "LINK_NOT_FOUND"
  | "NOT_FOUND"
  | "LINK_DISABLED"
  | "CODE_TAKEN"
  | "CODE_GENERATION_FAILED"
  | "DB_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

// ---------------------------------------------------------------------------
// Пагинация (общие типы)
// ---------------------------------------------------------------------------

export interface PaginationParams {
  /** Номер страницы, с единицы. Дефолт 1. */
  page?: number;
  /** Размер страницы. Дефолт 20, максимум 100. */
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  /** Общее число элементов, удовлетворяющих фильтру (без учёта пагинации). */
  total: number;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export interface Link {
  id: number;
  /** Короткий код: base62, 7 символов авто-генерация / 3-16 кастомный alias. */
  code: string;
  /** Полный короткий URL: BASE_URL + '/' + code. */
  shortUrl: string;
  /** Только http/https, до 2048 символов. */
  originalUrl: string;
  title: string | null;
  /** Денормализованный счётчик кликов. */
  clicksCount: number;
  /** false — ссылка мягко отключена, редирект отдаёт 410. */
  isActive: boolean;
  /** ISO 8601 UTC. */
  createdAt: string;
}

export interface CreateLinkRequest {
  /** Только http/https, до 2048 символов. */
  originalUrl: string;
  /** Опциональное человекочитаемое имя, до 255 символов. */
  title?: string;
  /**
   * Опциональный кастомный alias, base62 [0-9a-zA-Z], 3-16 символов.
   * Если не передан — код генерируется автоматически (7 символов).
   * Зарезервированные значения (`api`, `health`, ...) недопустимы.
   */
  customCode?: string;
}

export interface UpdateLinkRequest {
  /** code менять нельзя — поле отсутствует в типе намеренно. */
  title?: string | null;
  isActive?: boolean;
  originalUrl?: string;
}

export type LinkSortField = "created_at" | "clicks_count";
export type SortOrder = "asc" | "desc";

export interface ListLinksParams extends PaginationParams {
  /** Поиск по title/code/originalUrl (ILIKE, регистронезависимый). */
  search?: string;
  /** Дефолт created_at. */
  sort?: LinkSortField;
  /** Дефолт desc. */
  order?: SortOrder;
}

export type LinkList = PaginatedResult<Link>;

export interface DeleteResult {
  deleted: true;
}

// ---------------------------------------------------------------------------
// Stats — общие типы диапазона дат
// ---------------------------------------------------------------------------

export interface DateRangeParams {
  /** ISO-дата (YYYY-MM-DD), UTC. Дефолт: 30 дней назад от `to`. */
  from?: string;
  /** ISO-дата (YYYY-MM-DD), UTC. Дефолт: сегодня (UTC). */
  to?: string;
}

export interface StatsLimitParams {
  /** Дефолт 10. */
  limit?: number;
}

export interface DailyPoint {
  /** ISO-дата (YYYY-MM-DD). */
  date: string;
  clicks: number;
  /** Уникальные посетители за день (по ip_hash). */
  uniqueVisitors: number;
}

export interface DailyStats {
  from: string;
  to: string;
  /** Непрерывный ряд дней от from до to включительно, дни без кликов — с нулями. */
  points: DailyPoint[];
  totalClicks: number;
  totalUnique: number;
}

export interface RefererItem {
  /** Хост источника перехода; пустой/отсутствующий Referer — "(direct)". */
  referer: string;
  clicks: number;
}

export interface RefererStats {
  /** Отсортировано по clicks desc. */
  items: RefererItem[];
}

export type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export interface BrowserStat {
  name: string;
  clicks: number;
}

export interface DeviceStat {
  type: DeviceType;
  clicks: number;
}

export interface UserAgentStats {
  /** Отсортировано по clicks desc. */
  browsers: BrowserStat[];
  /** Отсортировано по clicks desc. */
  devices: DeviceStat[];
}

export interface StatsSummary {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  /** Клики за текущие UTC-сутки. */
  clicksToday: number;
  clicksLast7Days: number;
  uniqueVisitorsLast7Days: number;
}

export interface TopLinkItem {
  id: number;
  code: string;
  title: string | null;
  shortUrl: string;
  /** Клики за запрошенный период [from, to], считается по click_events. */
  clicks: number;
}

export interface TopLinksParams extends DateRangeParams, StatsLimitParams {}

export interface TopLinks {
  /** Отсортировано по clicks desc. */
  items: TopLinkItem[];
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface Health {
  status: "ok";
  db: "up" | "down";
}

// ---------------------------------------------------------------------------
// Envelope-алиасы по каждому эндпоинту (удобны для точечного импорта в тестах)
// ---------------------------------------------------------------------------

export type CreateLinkResponse = ApiEnvelope<Link>;
export type GetLinkResponse = ApiEnvelope<Link>;
export type UpdateLinkResponse = ApiEnvelope<Link>;
export type ListLinksResponse = ApiEnvelope<LinkList>;
export type DeleteLinkResponse = ApiEnvelope<DeleteResult>;

export type LinkDailyStatsResponse = ApiEnvelope<DailyStats>;
export type LinkRefererStatsResponse = ApiEnvelope<RefererStats>;
export type LinkUserAgentStatsResponse = ApiEnvelope<UserAgentStats>;

export type StatsSummaryResponse = ApiEnvelope<StatsSummary>;
export type GlobalDailyStatsResponse = ApiEnvelope<DailyStats>;
export type TopLinksResponse = ApiEnvelope<TopLinks>;

export type HealthResponse = ApiEnvelope<Health>;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isApiSuccess<T>(
  envelope: ApiEnvelope<T>,
): envelope is ApiSuccessEnvelope<T> {
  return envelope.error === null;
}

export function isApiError<T>(
  envelope: ApiEnvelope<T>,
): envelope is ApiErrorEnvelope {
  return envelope.error !== null;
}
