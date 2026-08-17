import type { Locator, Page } from '@playwright/test';

/**
 * Список ссылок (`/links`) — `frontend/src/pages/LinksPage.tsx`.
 * Локаторы только по `data-testid` из реестра `docs/api/contract.md`, §9.2.
 * Строки таблицы таргетируются по `data-id`, не по позиционному индексу —
 * устойчиво к сортировке/пагинации.
 */
export class LinksPage {
  readonly toolbar: Locator;
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly createButton: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;
  readonly pagination: Locator;
  readonly paginationPrev: Locator;
  readonly paginationNext: Locator;
  readonly paginationPageInfo: Locator;

  constructor(private readonly page: Page) {
    this.toolbar = page.getByTestId('links-toolbar');
    this.searchInput = page.getByTestId('links-search-input');
    this.sortSelect = page.getByTestId('links-sort-select');
    this.createButton = page.getByTestId('links-create-button');
    this.table = page.getByTestId('links-table');
    this.emptyState = page.getByTestId('links-table-empty-state');
    this.errorState = page.getByTestId('links-table-error-state');
    this.pagination = page.getByTestId('links-pagination');
    this.paginationPrev = page.getByTestId('links-pagination-prev');
    this.paginationNext = page.getByTestId('links-pagination-next');
    this.paginationPageInfo = page.getByTestId('links-pagination-page-info');
  }

  async goto(): Promise<void> {
    await this.page.goto('/links');
  }

  /** Строка списка по `id` ссылки (атрибут `data-id` на элементе `links-table-row`). */
  row(linkId: number): Locator {
    return this.page.locator(`[data-testid="links-table-row"][data-id="${linkId}"]`);
  }

  rowCode(linkId: number): Locator {
    return this.row(linkId).getByTestId('links-table-row-code');
  }

  rowCopyButton(linkId: number): Locator {
    return this.row(linkId).getByTestId('links-table-row-copy-button');
  }

  rowActiveToggle(linkId: number): Locator {
    return this.row(linkId).getByTestId('links-table-row-active-toggle');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async goToCreate(): Promise<void> {
    await this.createButton.click();
  }
}
