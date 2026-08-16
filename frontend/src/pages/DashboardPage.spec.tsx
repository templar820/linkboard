import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatNumber } from "../lib/format";
import { exampleSummary } from "../test/msw-handlers";
import { renderWithProviders } from "../test/renderWithProviders";
import { DashboardPage } from "./DashboardPage";

// `toLocaleString("ru-RU")` (formatNumber) вставляет разделитель разрядов
// как неразрывный/узкий неразрывный пробел (U+00A0/U+202F) — ни getByText,
// ни toHaveTextContent не нормализуют оба операнда сравнения одинаково,
// поэтому сравниваем текст, схлопнув все пробельные символы вручную.
function stripWhitespace(value: string): string {
  return value.replace(/[\s  ]+/g, "");
}

describe("DashboardPage", () => {
  it("UNIT-FE-14: пока данные грузятся, карточки показывают Spinner", () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ["/"] });

    expect(screen.getByTestId("summary-card-total-links-loading")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-active-links-loading")).toBeInTheDocument();
  });

  it("UNIT-FE-13: SummaryCards показывают значения из смокового stats/summary", async () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ["/"] });

    await waitFor(() =>
      expect(stripWhitespace(screen.getByTestId("summary-card-total-links").textContent ?? "")).toContain(
        stripWhitespace(formatNumber(exampleSummary.totalLinks)),
      ),
    );
    expect(stripWhitespace(screen.getByTestId("summary-card-active-links").textContent ?? "")).toContain(
      stripWhitespace(formatNumber(exampleSummary.activeLinks)),
    );
    expect(stripWhitespace(screen.getByTestId("summary-card-total-clicks").textContent ?? "")).toContain(
      stripWhitespace(formatNumber(exampleSummary.totalClicks)),
    );
    expect(stripWhitespace(screen.getByTestId("summary-card-clicks-today").textContent ?? "")).toContain(
      stripWhitespace(formatNumber(exampleSummary.clicksToday)),
    );
  });
});
