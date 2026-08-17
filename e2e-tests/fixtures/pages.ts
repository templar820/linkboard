/** Фикстуры page objects — по одному готовому инстансу на тест, привязанному к `page`. */
import { test as base } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { LinkDetailsPage } from '../pages/LinkDetailsPage.js';
import { LinkFormPage } from '../pages/LinkFormPage.js';
import { LinksPage } from '../pages/LinksPage.js';

export interface PageObjectFixtures {
  linksPage: LinksPage;
  linkFormPage: LinkFormPage;
  linkDetailsPage: LinkDetailsPage;
  dashboardPage: DashboardPage;
}

export const test = base.extend<PageObjectFixtures>({
  linksPage: async ({ page }, use) => {
    await use(new LinksPage(page));
  },
  linkFormPage: async ({ page }, use) => {
    await use(new LinkFormPage(page));
  },
  linkDetailsPage: async ({ page }, use) => {
    await use(new LinkDetailsPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
