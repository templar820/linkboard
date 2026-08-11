/**
 * Формы `data` для stats-эндпоинтов. Синхронизированы с docs/api/types.ts
 * (DailyStats, RefererStats, UserAgentStats, StatsSummary, TopLinks).
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

export interface DailyPointDto {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

export interface DailyStatsDto {
  from: string;
  to: string;
  points: DailyPointDto[];
  totalClicks: number;
  totalUnique: number;
}

export interface RefererItemDto {
  referer: string;
  clicks: number;
}

export interface RefererStatsDto {
  items: RefererItemDto[];
}

export interface BrowserStatDto {
  name: string;
  clicks: number;
}

export interface DeviceStatDto {
  type: DeviceType;
  clicks: number;
}

export interface UserAgentStatsDto {
  browsers: BrowserStatDto[];
  devices: DeviceStatDto[];
}

export interface StatsSummaryDto {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  clicksToday: number;
  clicksLast7Days: number;
  uniqueVisitorsLast7Days: number;
}

export interface TopLinkItemDto {
  id: number;
  code: string;
  title: string | null;
  shortUrl: string;
  clicks: number;
}

export interface TopLinksDto {
  items: TopLinkItemDto[];
}
