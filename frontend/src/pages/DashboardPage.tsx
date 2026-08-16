import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useDailyStats } from "../api/stats";
import { ClicksChart } from "../components/stats/ClicksChart";
import { SummaryCards } from "../components/stats/SummaryCards";
import { TopLinksTable } from "../components/stats/TopLinksTable";
import type { DateRangeValue } from "../components/shared";
import { applyRangeToSearchParams, parseRangeSearchParams } from "../lib/dateRange";
import styles from "./DashboardPage.module.css";

/**
 * Дашборд (`/`): сводка, график кликов с переключателем периода (7/30/90
 * дней, состояние — в URL search params), топ ссылок.
 */
export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = useMemo(() => parseRangeSearchParams(searchParams), [searchParams]);
  const dailyStats = useDailyStats({ from: range.from, to: range.to });

  function handleRangeChange(next: DateRangeValue) {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        applyRangeToSearchParams(params, next);
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
