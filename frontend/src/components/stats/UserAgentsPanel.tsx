import type { ReactNode } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useUserAgents } from "../../api/stats";
import type { BrowserStat, DeviceStat, DeviceType } from "../../api/types";
import { formatNumber } from "../../lib/format";
import { Card, EmptyState, ErrorState, Spinner } from "../shared";
import styles from "./UserAgentsPanel.module.css";

export interface UserAgentsPanelProps {
  linkId: number;
}

// Категориальная палитра — docs/design/ui-kit.md §5.2. Значения
// зафиксированы и синхронизированы с tokens.css (--chart-categorical-1..8);
// захардкожены локально, чтобы не дёргать getComputedStyle на каждый рендер.
const CATEGORICAL_COLORS: readonly string[] = [
  "#2563eb",
  "#f59e0b",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#64748b",
];
const OTHER_COLOR = CATEGORICAL_COLORS[7] ?? "#64748b";

const DEVICE_LABEL: Record<DeviceType, string> = {
  desktop: "Десктоп",
  mobile: "Мобильные",
  tablet: "Планшеты",
  bot: "Боты",
  unknown: "Неизвестно",
};

function browserColor(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] ?? OTHER_COLOR;
}

/** `bot`/`unknown` всегда красятся в нейтральный «прочее» — не в порядковый цвет. */
function deviceColor(type: DeviceType, index: number): string {
  if (type === "bot" || type === "unknown") return OTHER_COLOR;
  return CATEGORICAL_COLORS[index % (CATEGORICAL_COLORS.length - 1)] ?? OTHER_COLOR;
}

function ChartState({
  isLoading,
  isError,
  onRetry,
  isEmpty,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isEmpty: boolean;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className={styles.stateBox}>
        <Spinner />
      </div>
    );
  }
  if (isError) {
    return (
      <div className={styles.stateBox}>
        <ErrorState message="Не удалось загрузить данные" onAction={onRetry} />
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className={styles.stateBox}>
        <EmptyState title="Пока нет данных" description="Кликов по ссылке ещё не было" />
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Срез по браузерам и типам устройств — `GET /api/links/:id/stats/user-agents`.
 * Два пирога (recharts), категориальная палитра токенов, `bot`/`unknown`
 * всегда нейтрального цвета (docs/design/ui-kit.md §5.2).
 */
export function UserAgentsPanel({ linkId }: UserAgentsPanelProps) {
  const { data, isPending, isError, refetch } = useUserAgents(linkId);
  const browsers: readonly BrowserStat[] = data?.browsers ?? [];
  const devices: readonly DeviceStat[] = data?.devices ?? [];

  return (
    <div className={styles.grid}>
      <Card title="Браузеры" data-testid="user-agents-browsers-chart">
        <ChartState isLoading={isPending} isError={isError} onRetry={() => void refetch()} isEmpty={browsers.length === 0}>
          <ResponsiveContainer width="100%" height={240} initialDimension={{ width: 400, height: 240 }}>
            <PieChart>
              <Pie data={[...browsers]} dataKey="clicks" nameKey="name" outerRadius={80}>
                {browsers.map((entry, index) => (
                  <Cell key={entry.name} fill={browserColor(index)} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartState>
      </Card>

      <Card title="Устройства" data-testid="user-agents-devices-chart">
        <ChartState isLoading={isPending} isError={isError} onRetry={() => void refetch()} isEmpty={devices.length === 0}>
          <ResponsiveContainer width="100%" height={240} initialDimension={{ width: 400, height: 240 }}>
            <PieChart>
              <Pie data={[...devices]} dataKey="clicks" nameKey="type" outerRadius={80}>
                {devices.map((entry, index) => (
                  <Cell key={entry.type} fill={deviceColor(entry.type, index)} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Legend formatter={(value) => DEVICE_LABEL[value as DeviceType] ?? value} />
            </PieChart>
          </ResponsiveContainer>
        </ChartState>
      </Card>
    </div>
  );
}

export default UserAgentsPanel;
