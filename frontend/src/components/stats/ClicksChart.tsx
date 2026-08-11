import type { ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyStats } from "../../api/types";
import { formatShortDate } from "../../lib/format";
import { Card, DateRangePicker, ErrorState, Spinner, type DateRangeValue } from "../shared";
import styles from "./ClicksChart.module.css";

export type ClicksChartMetric = "clicks" | "uniqueVisitors";

const METRIC_LABEL: Record<ClicksChartMetric, string> = {
  clicks: "Клики",
  uniqueVisitors: "Уникальные посетители",
};

export interface ClicksChartProps {
  /** Заголовок карточки. По умолчанию «Клики по дням». */
  title?: ReactNode;
  data: DailyStats | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  range: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
  /**
   * Какие линии рисовать. По умолчанию только `clicks` (дашборд).
   * `LinkDetailsPage` (T19) переиспользует компонент с
   * `metrics={["clicks", "uniqueVisitors"]}` — 2 линии, как того требует
   * архплан (раздел 4.2).
   */
  metrics?: readonly ClicksChartMetric[];
  /**
   * data-testid прокидывается в `DateRangePicker`, чтобы кнопки периода
   * получили ровно `clicks-chart-period-7d/-30d/-90d` из реестра
   * (docs/api/contract.md, §9.3) — см. docs/design/ui-kit.md, раздел 3.9.
   */
  "data-testid"?: string;
}

const DEFAULT_METRICS: readonly ClicksChartMetric[] = ["clicks"];

/**
 * График кликов по дням (recharts, линии). Переиспользуется на дашборде
 * (1 линия — клики) и на `LinkDetailsPage` (2 линии — клики + уникальные).
 */
export function ClicksChart({
  title = "Клики по дням",
  data,
  isLoading,
  isError,
  onRetry,
  range,
  onRangeChange,
  metrics = DEFAULT_METRICS,
  "data-testid": dataTestId = "clicks-chart",
}: ClicksChartProps) {
  return (
    <Card title={title} actions={<DateRangePicker data-testid={dataTestId} value={range} onChange={onRangeChange} />}>
      {isLoading ? (
        <div className={styles.stateBox}>
          <Spinner />
        </div>
      ) : isError ? (
        <div className={styles.stateBox}>
          <ErrorState message="Не удалось загрузить график кликов" onAction={onRetry} />
        </div>
      ) : (
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.points ?? []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} stroke="var(--chart-axis-text)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--chart-axis-text)" fontSize={12} width={40} />
              <Tooltip
                labelFormatter={(value) => formatShortDate(String(value))}
                contentStyle={{
                  background: "var(--chart-tooltip-bg)",
                  color: "var(--chart-tooltip-text)",
                  border: "none",
                  borderRadius: "8px",
                }}
              />
              {metrics.includes("clicks") ? (
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name={METRIC_LABEL.clicks}
                  stroke="var(--chart-line-clicks)"
                  strokeWidth={2}
                  dot={false}
                />
              ) : null}
              {metrics.includes("uniqueVisitors") ? (
                <Line
                  type="monotone"
                  dataKey="uniqueVisitors"
                  name={METRIC_LABEL.uniqueVisitors}
                  stroke="var(--chart-line-unique)"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  dot={false}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default ClicksChart;
