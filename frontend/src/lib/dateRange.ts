/**
 * Кодирование/декодирование периода `ClicksChart` (`DateRangeValue` из
 * дизайн-системы) в URL search params `period`/`from`/`to`. Общий хелпер
 * для `DashboardPage` (`GET /api/stats/daily`) и `LinkDetailsPage`
 * (`GET /api/links/:id/stats/daily`) — период держится в URL, а не в
 * стейт-менеджере (frontend/CLAUDE.md).
 */
import { computePresetRange, type DateRangePreset, type DateRangeValue } from "../components/shared";

/** `period=custom` без валидных `from`/`to` откатывается на дефолт 30 дней. */
export function parseRangeSearchParams(searchParams: URLSearchParams): DateRangeValue {
  const period = searchParams.get("period");

  if (period === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from !== null && to !== null && from.length > 0 && to.length > 0) {
      return { preset: "custom", from, to };
    }
  }

  const preset: DateRangePreset = period === "7" ? 7 : period === "90" ? 90 : 30;
  return { preset, ...computePresetRange(preset) };
}

/** Мутирует переданный `URLSearchParams` (обычно копию из функционального `setSearchParams`). */
export function applyRangeToSearchParams(params: URLSearchParams, next: DateRangeValue): void {
  params.set("period", String(next.preset));
  if (next.preset === "custom") {
    params.set("from", next.from);
    params.set("to", next.to);
  } else {
    params.delete("from");
    params.delete("to");
  }
}
