import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DailyStats } from "../../api/types";
import { computePresetRange } from "../shared";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ClicksChart } from "./ClicksChart";

const DAILY_STATS: DailyStats = {
  from: "2026-07-13",
  to: "2026-08-11",
  points: [
    { date: "2026-07-13", clicks: 5, uniqueVisitors: 3 },
    { date: "2026-07-14", clicks: 87, uniqueVisitors: 61 },
  ],
  totalClicks: 92,
  totalUnique: 64,
};

describe("ClicksChart", () => {
  it("UNIT-FE-15: рендерит график по данным stats/daily (линия кликов и подписи оси Х из ответа)", () => {
    const { container } = renderWithProviders(
      <ClicksChart
        data={DAILY_STATS}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        range={{ preset: 30, ...computePresetRange(30) }}
        onRangeChange={vi.fn()}
      />,
    );

    // Ни спиннера, ни ErrorState — данные отрисованы.
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    // Линия "клики" отрисована recharts (SVG path); ось Х подписана
    // formatShortDate(point.date) хотя бы по одной из точек ответа —
    // recharts сам решает, сколько тиков поместится, поэтому не завязываемся
    // на точное число подписей.
    expect(container.querySelector(".recharts-line-curve")).not.toBeNull();
    expect(container.querySelectorAll(".recharts-cartesian-axis-tick").length).toBeGreaterThan(0);
    expect(screen.getByText("14.07")).toBeInTheDocument();
  });

  it("UNIT-FE-16: переключатель периода меняет диапазон, переданный в onRangeChange", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();

    renderWithProviders(
      <ClicksChart
        data={DAILY_STATS}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        range={{ preset: 30, ...computePresetRange(30) }}
        onRangeChange={onRangeChange}
      />,
    );

    await user.click(screen.getByTestId("clicks-chart-period-7d"));

    expect(onRangeChange).toHaveBeenCalledWith({ preset: 7, ...computePresetRange(7) });
  });
});
