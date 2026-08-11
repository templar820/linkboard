/**
 * msw-хендлеры по контракту API (docs/api/contract.md). Валидные ответы —
 * примеры из контракта 1:1. Используются ТОЛЬКО в тестах (vitest + msw/node,
 * см. `src/test/server.ts`/`src/test/setup.ts`) — в рантайме приложения msw
 * не подключается (см. `src/main.tsx`).
 */
import { http, HttpResponse } from "msw";
import type {
  DailyStats,
  Health,
  Link,
  LinkList,
  RefererStats,
  StatsSummary,
  TopLinks,
  UserAgentStats,
} from "../api/types";

export const API_BASE = "http://localhost:8080/api";

export const exampleLink: Link = {
  id: 42,
  code: "r7Ab3xZ",
  shortUrl: "http://localhost:8080/r7Ab3xZ",
  originalUrl: "https://example.com/very/long/path?utm_source=newsletter",
  title: "Августовская рассылка",
  clicksCount: 1523,
  isActive: true,
  createdAt: "2026-08-11T10:00:00.000Z",
};

export const exampleLinkList: LinkList = {
  items: [exampleLink],
  page: 1,
  limit: 20,
  total: 137,
};

export const exampleDailyStats: DailyStats = {
  from: "2026-07-13",
  to: "2026-08-11",
  points: [
    { date: "2026-07-13", clicks: 0, uniqueVisitors: 0 },
    { date: "2026-07-14", clicks: 87, uniqueVisitors: 61 },
  ],
  totalClicks: 1523,
  totalUnique: 980,
};

export const exampleReferers: RefererStats = {
  items: [
    { referer: "t.me", clicks: 640 },
    { referer: "(direct)", clicks: 512 },
    { referer: "google.com", clicks: 371 },
  ],
};

export const exampleUserAgents: UserAgentStats = {
  browsers: [
    { name: "Chrome", clicks: 900 },
    { name: "Safari", clicks: 400 },
  ],
  devices: [
    { type: "desktop", clicks: 800 },
    { type: "mobile", clicks: 600 },
    { type: "bot", clicks: 123 },
  ],
};

export const exampleSummary: StatsSummary = {
  totalLinks: 137,
  activeLinks: 120,
  totalClicks: 45210,
  clicksToday: 312,
  clicksLast7Days: 2140,
  uniqueVisitorsLast7Days: 1533,
};

export const exampleTopLinks: TopLinks = {
  items: [
    {
      id: 42,
      code: "r7Ab3xZ",
      title: "Августовская рассылка",
      shortUrl: "http://localhost:8080/r7Ab3xZ",
      clicks: 1200,
    },
    { id: 7, code: "promo1", title: null, shortUrl: "http://localhost:8080/promo1", clicks: 850 },
  ],
};

export const exampleHealth: Health = { status: "ok", db: "up" };

export const handlers = [
  http.post(`${API_BASE}/links`, () =>
    HttpResponse.json({ data: exampleLink, error: null }, { status: 201 }),
  ),
  http.get(`${API_BASE}/links`, () => HttpResponse.json({ data: exampleLinkList, error: null })),
  http.get(`${API_BASE}/links/:id`, () => HttpResponse.json({ data: exampleLink, error: null })),
  http.patch(`${API_BASE}/links/:id`, () => HttpResponse.json({ data: exampleLink, error: null })),
  http.delete(`${API_BASE}/links/:id`, () =>
    HttpResponse.json({ data: { deleted: true }, error: null }),
  ),
  http.get(`${API_BASE}/links/:id/stats/daily`, () =>
    HttpResponse.json({ data: exampleDailyStats, error: null }),
  ),
  http.get(`${API_BASE}/links/:id/stats/referers`, () =>
    HttpResponse.json({ data: exampleReferers, error: null }),
  ),
  http.get(`${API_BASE}/links/:id/stats/user-agents`, () =>
    HttpResponse.json({ data: exampleUserAgents, error: null }),
  ),
  http.get(`${API_BASE}/stats/summary`, () => HttpResponse.json({ data: exampleSummary, error: null })),
  http.get(`${API_BASE}/stats/daily`, () => HttpResponse.json({ data: exampleDailyStats, error: null })),
  http.get(`${API_BASE}/stats/top`, () => HttpResponse.json({ data: exampleTopLinks, error: null })),
  http.get(`${API_BASE}/health`, () => HttpResponse.json({ data: exampleHealth, error: null })),
];
