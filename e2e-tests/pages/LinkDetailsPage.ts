import type { Locator, Page } from '@playwright/test';

/**
 * Страница деталей ссылки (`/links/:id`, `frontend/src/pages/LinkDetailsPage.tsx`).
 * Реестр testid — `docs/api/contract.md`, §9.3 (график/таблицы) и §9.4
 * (заголовок и диалог подтверждения, переиспользуемый из `shared/`).
 */
export class LinkDetailsPage {
  readonly header: Locator;
  readonly shortUrl: Locator;
  readonly copyButton: Locator;
  readonly titleInput: Locator;
  readonly activeToggle: Locator;
  readonly deleteButton: Locator;
  readonly confirmDialog: Locator;
  readonly confirmDialogConfirmButton: Locator;
  readonly confirmDialogCancelButton: Locator;
  readonly clicksChart: Locator;
  readonly referersTable: Locator;
  readonly userAgentsBrowsersChart: Locator;
  readonly userAgentsDevicesChart: Locator;

  constructor(private readonly page: Page) {
    this.header = page.getByTestId('link-header');
    this.shortUrl = page.getByTestId('link-header-short-url');
    this.copyButton = page.getByTestId('link-header-copy-button');
    this.titleInput = page.getByTestId('link-header-title-input');
    this.activeToggle = page.getByTestId('link-header-active-toggle');
    this.deleteButton = page.getByTestId('link-header-delete-button');
    this.confirmDialog = page.getByTestId('confirm-dialog');
    this.confirmDialogConfirmButton = page.getByTestId('confirm-dialog-confirm-button');
    this.confirmDialogCancelButton = page.getByTestId('confirm-dialog-cancel-button');
    this.clicksChart = page.getByTestId('clicks-chart');
    this.referersTable = page.getByTestId('referers-table');
    this.userAgentsBrowsersChart = page.getByTestId('user-agents-browsers-chart');
    this.userAgentsDevicesChart = page.getByTestId('user-agents-devices-chart');
  }

  async goto(linkId: number): Promise<void> {
    await this.page.goto(`/links/${linkId}`);
  }

  referersRow(index = 0): Locator {
    return this.page.getByTestId('referers-table-row').nth(index);
  }

  async deleteWithConfirm(): Promise<void> {
    await this.deleteButton.click();
    await this.confirmDialogConfirmButton.click();
  }
}
