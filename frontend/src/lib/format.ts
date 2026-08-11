/**
 * Небольшие форматтеры для чисел/дат, переиспользуемые в components/links
 * и components/stats (T17-T19). Не часть дизайн-системы (`components/shared`)
 * — чистые функции без UI.
 */

/** `1523` → `"1 523"` (разряды по-русски). */
export function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU");
}

/** ISO 8601 UTC timestamp (`createdAt` и т.п.) → `"11.08.2026"`. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** `"2026-07-14"` (DailyPoint.date) → `"14.07"`, для подписей оси графика. */
export function formatShortDate(isoDate: string): string {
  const parts = isoDate.split("-");
  const month = parts[1] ?? "";
  const day = parts[2] ?? "";
  return `${day}.${month}`;
}
