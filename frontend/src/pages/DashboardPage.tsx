import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useDailyStats } from "../api/stats";
import { ClicksChart } from "../components/stats/ClicksChart";
import { SummaryCards } from "../components/stats/SummaryCards";
import { TopLinksTable } from "../components/stats/TopLinksTable";
import { computePresetRange, type DateRangePreset, type DateRangeValue } from "../components/shared";
import styles from "./DashboardPage.module.css";

/** period=custom требует ещё from/to — иначе откатываемся на 30 дней. */
function parseRange(searchParams: URLSearchParams): DateRangeValue {
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

/**
 * Дашборд (`/`): сводка, график кликов с переключателем периода (7/30/90
 * дней, состояние — в URL search params), топ ссылок.
 */
export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = useMemo(() => parseRange(searchParams), [searchParams]);
  const dailyStats = useDailyStats({ from: range.from, to: range.to });

  function handleRangeChange(next: DateRangeValue) {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        params.set("period", String(next.preset));
        if (next.preset === "custom") {
          params.set("from", next.from);
          params.set("to", next.to);
        } else {
          params.delete("from");
          params.delete("to");
        }
        return params;
      },
      { replace: true },
    );
  }

  return (
    <div className={styles.page}>
      <h1>Дашборд</h1>
      <SummaryCards />
      <ClicksChart
        data={dailyStats.data}
        isLoading={dailyStats.isPending}
        isError={dailyStats.isError}
        onRetry={() => void dailyStats.refetch()}
        range={range}
        onRangeChange={handleRangeChange}
      />
      <TopLinksTable />
    </div>
  );
}

export default DashboardPage;
