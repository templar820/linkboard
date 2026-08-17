/**
 * Единая точка входа для спеков: `import { test, expect } from '../fixtures'`.
 * Объединяет фикстуры данных (`api.ts`, `db.ts`) и готовые page objects
 * (`pages.ts`) через `mergeTests`, чтобы будущие спеки (T22–T24) не тянули
 * три отдельных импорта.
 */
import { mergeTests } from '@playwright/test';
import { test as apiTest } from './api.js';
import { test as dbTest } from './db.js';
import { test as pagesTest } from './pages.js';

export const test = mergeTests(apiTest, dbTest, pagesTest);
export { expect } from '@playwright/test';
export type { CreateLinkInput, SeededLink } from './api.js';
export type { DbFixture } from './db.js';
