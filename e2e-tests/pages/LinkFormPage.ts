import type { Locator, Page } from '@playwright/test';

/**
 * Форма создания ссылки (`/links/new`, `frontend/src/components/links/LinkForm.tsx`).
 * Инлайн-редактирование title на странице деталей использует отдельные
 * testid из `LinkHeader` — см. `LinkDetailsPage`, не эту страницу.
 * Реестр testid — `docs/api/contract.md`, §9.1.
 */
export class LinkFormPage {
  readonly form: Locator;
  readonly originalUrlInput: Locator;
  readonly titleInput: Locator;
  readonly customCodeInput: Locator;
  readonly submitButton: Locator;
  readonly originalUrlError: Locator;
  readonly customCodeError: Locator;

  constructor(private readonly page: Page) {
    this.form = page.getByTestId('link-form');
    this.originalUrlInput = page.getByTestId('link-form-original-url-input');
    this.titleInput = page.getByTestId('link-form-title-input');
    this.customCodeInput = page.getByTestId('link-form-custom-code-input');
    this.submitButton = page.getByTestId('link-form-submit-button');
    this.originalUrlError = page.getByTestId('link-form-original-url-error');
    this.customCodeError = page.getByTestId('link-form-custom-code-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/links/new');
  }

  async fill(input: { originalUrl?: string; title?: string; customCode?: string }): Promise<void> {
    if (input.originalUrl !== undefined) await this.originalUrlInput.fill(input.originalUrl);
    if (input.title !== undefined) await this.titleInput.fill(input.title);
    if (input.customCode !== undefined) await this.customCodeInput.fill(input.customCode);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
