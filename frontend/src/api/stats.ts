/**
 * TanStack Query хуки для аналитики (docs/api/contract.md, раздел 3.2).
 *
 * Ключи запросов лежат под общим корнем `['stats']`, поэтому мутации ссылок
 * (`api/links.ts`) инвалидируют их одним `invalidateQueries({ queryKey: ['stats'] })`.
 * `staleTime: 60_000` — данные аналитики не обязаны быть секунда-в-секунду
 * актуальными, повторный fetch на каждый ремаунт компонента не нужен.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "./client";
import type {
  DailyStats,
  DateRangeParams,
  RefererStats,
  StatsLimitParams,
  StatsSummary,
  TopLinks,
  TopLinksParams,
  UserAgentStats,
} from "./types";

const STATS_STALE_TIME_MS = 60_000;

export const statsKeys = {
  all: ["stats"] as const,
  summary: () => [...statsKeys.all, "summary"] as const,
  daily: (params: DateRangeParams) => [...statsKeys.all, "daily", params] as const,
  top: (params: TopLinksParams) => [...statsKeys.all, "top", params] as const,
  linkDaily: (linkId: number, params: DateRangeParams) =>
    [...statsKeys.all, "link", linkId, "daily", params] as const,
  referers: (linkId: number, params: DateRangeParams & StatsLimitParams) =>
    [...statsKeys.all, "link", linkId, "referers", params] as const,
  userAgents: (linkId: number) => [...statsKeys.all, "link", linkId, "user-agents"] as const,
};

// См. комментарий к аналогичному хелперу в `api/links.ts`: интерфейсы
// контракта не имеют индексной сигнатуры, spread обходит ограничение TS.
function toQueryParams<T extends object>(params: T): QueryParams {
  return { ...params } as QueryParams;
}

/** Сводка для дашборда — `GET /api/stats/summary`. */
export function useSummary(): UseQueryResult<StatsSummary, Error> {
  return useQuery({
    queryKey: statsKeys.summary(),
    queryFn: () => apiClient.get<StatsSummary>("/stats/summary"),
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Клики по дням, все ссылки — `GET /api/stats/daily`. */
export function useDailyStats(params: DateRangeParams = {}): UseQueryResult<DailyStats, Error> {
  return useQuery({
    queryKey: statsKeys.daily(params),
    queryFn: () => apiClient.get<DailyStats>("/stats/daily", toQueryParams(params)),
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Топ ссылок за период — `GET /api/stats/top`. */
export function useTopLinks(params: TopLinksParams = {}): UseQueryResult<TopLinks, Error> {
  return useQuery({
    queryKey: statsKeys.top(params),
    queryFn: () => apiClient.get<TopLinks>("/stats/top", toQueryParams(params)),
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Клики по дням одной ссылки — `GET /api/links/:id/stats/daily`. */
export function useLinkDailyStats(
  linkId: number | undefined,
  params: DateRangeParams = {},
): UseQueryResult<DailyStats, Error> {
  return useQuery({
    queryKey: statsKeys.linkDaily(linkId ?? -1, params),
    queryFn: () => apiClient.get<DailyStats>(`/links/${String(linkId)}/stats/daily`, toQueryParams(params)),
    enabled: linkId !== undefined,
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Топ referer'ов ссылки — `GET /api/links/:id/stats/referers`. */
export function useReferers(
  linkId: number | undefined,
  params: DateRangeParams & StatsLimitParams = {},
): UseQueryResult<RefererStats, Error> {
  return useQuery({
    queryKey: statsKeys.referers(linkId ?? -1, params),
    queryFn: () => apiClient.get<RefererStats>(`/links/${String(linkId)}/stats/referers`, toQueryParams(params)),
    enabled: linkId !== undefined,
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Срез по браузерам/устройствам ссылки — `GET /api/links/:id/stats/user-agents`. */
export function useUserAgents(linkId: number | undefined): UseQueryResult<UserAgentStats, Error> {
  return useQuery({
    queryKey: statsKeys.userAgents(linkId ?? -1),
    queryFn: () => apiClient.get<UserAgentStats>(`/links/${String(linkId)}/stats/user-agents`),
    enabled: linkId !== undefined,
    staleTime: STATS_STALE_TIME_MS,
  });
}
