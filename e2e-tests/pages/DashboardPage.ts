import type { Locator, Page } from '@playwright/test';

/**
 * Дашборд (`/`, `frontend/src/pages/DashboardPage.tsx`).
 * Реестр testid — `docs/api/contract.md`, §9.3.
 */
export class DashboardPage {
  readonly totalLinksCard: Locator;
  readonly activeLinksCard: Locator;
  readonly totalClicksCard: Locator;
  readonly clicksTodayCard: Locator;
  readonly clicksChart: Locator;
  readonly period7d: Locator;
  readonly period30d: Locator;
  readonly period90d: Locator;
  readonly topLinksTable: Locator;

  constructor(private readonly page: Page) {
    this.totalLinksCard = page.getByTestId('summary-card-total-links');
    this.activeLinksCard = page.getByTestId('summary-card-active-links');
    this.totalClicksCard = page.getByTestId('summary-card-total-clicks');
    this.clicksTodayCard = page.getByTestId('summary-card-clicks-today');
    this.clicksChart = page.getByTestId('clicks-chart');
    this.period7d = page.getByTestId('clicks-chart-period-7d');
    this.period30d = page.getByTestId('clicks-chart-period-30d');
    this.period90d = page.getByTestId('clicks-chart-period-90d');
    this.topLinksTable = page.getByTestId('top-links-table');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** Строка топ-таблицы по `id` ссылки (атрибут `data-id` на `top-links-table-row`). */
  topLinksRow(linkId: number): Locator {
    return this.page.locator(`[data-testid="top-links-table-row"][data-id="${linkId}"]`);
  }
}
