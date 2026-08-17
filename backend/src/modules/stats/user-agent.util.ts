import { UAParser } from 'ua-parser-js';
import { BrowserStatDto, DeviceStatDto, DeviceType } from './dto/stats-response.dto';

/** Подсказки на ботов, которых ua-parser не относит к device.type. */
const BOT_HINTS = ['bot', 'crawler', 'spider', 'curl', 'wget', 'headless', 'python-requests'];

/**
 * Тип устройства по User-Agent. ua-parser отдаёт `device.type` только для
 * не-десктопов (mobile/tablet/...), для настольных браузеров поле пустое —
 * поэтому «пусто, но браузер определился» трактуется как desktop, а вовсе
 * нераспознанный UA — как unknown.
 */
export function detectDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) return 'unknown';

  const lower = userAgent.toLowerCase();
  if (BOT_HINTS.some((hint) => lower.includes(hint))) return 'bot';

  const parsed = UAParser(userAgent);
  const type = parsed.device.type;

  if (type === 'mobile') return 'mobile';
  if (type === 'tablet') return 'tablet';
  if (parsed.browser.name) return 'desktop';

  return 'unknown';
}

export function detectBrowserName(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  return UAParser(userAgent).browser.name ?? 'unknown';
}

/**
 * Referer нормализуется до хоста: сотня ссылок с одного сайта должна схлопнуться
 * в одну строку статистики. Пустой или нераспознанный — "(direct)"
 * (docs/api/types.ts, RefererItem).
 */
export function normalizeReferer(referer: string | null): string {
  if (!referer || referer.trim().length === 0) return '(direct)';
  try {
    return new URL(referer).host || '(direct)';
  } catch {
    return '(direct)';
  }
}

/** Схлопывает пары «ключ → клики» в отсортированный по убыванию список. */
export function aggregateCounts<T extends string>(entries: Array<[T, number]>): Array<{ key: T; clicks: number }> {
  const totals = new Map<T, number>();
  for (const [key, clicks] of entries) {
    totals.set(key, (totals.get(key) ?? 0) + clicks);
  }
  return [...totals.entries()]
    .map(([key, clicks]) => ({ key, clicks }))
    .sort((a, b) => b.clicks - a.clicks || a.key.localeCompare(b.key));
}

export function toBrowserStats(entries: Array<[string, number]>): BrowserStatDto[] {
  return aggregateCounts(entries).map(({ key, clicks }) => ({ name: key, clicks }));
}

export function toDeviceStats(entries: Array<[DeviceType, number]>): DeviceStatDto[] {
  return aggregateCounts(entries).map(({ key, clicks }) => ({ type: key, clicks }));
}
