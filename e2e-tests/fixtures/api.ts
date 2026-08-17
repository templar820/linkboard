/**
 * Подготовка тестовых данных через реальный HTTP API (`POST /api/links`),
 * а не кликами по интерфейсу — быстрее и не завязано на вёрстку
 * (e2e-tests/CLAUDE.md, "Подготовка данных"). Исключение — сценарии, где
 * именно создание через форму и есть предмет теста (см. `pages/LinkFormPage`).
 *
 * Локальные типы конверта/DTO — не импорт из `backend/src` или
 * `frontend/src` (запрещено инвариантами проекта), просто согласованы
 * вручную с `docs/api/contract.md` и `docs/api/types.ts`.
 */
import { test as base, request as playwrightRequest, type APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: string[];
}

export interface Envelope<T> {
  data: T | null;
  error: ApiErrorBody | null;
}

export interface SeededLink {
  id: number;
  code: string;
  shortUrl: string;
  originalUrl: string;
  title: string | null;
  clicksCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateLinkInput {
  originalUrl?: string;
  title?: string;
  customCode?: string;
}

/** Разворачивает конверт, бросает при `error !== null` — фикстура должна падать явно, а не тихо. */
async function unwrap<T>(responsePromise: ReturnType<APIRequestContext['post']>): Promise<T> {
  const response = await responsePromise;
  const json = (await response.json()) as Envelope<T>;
  if (json.error !== null || json.data === null) {
    throw new Error(
      `Подготовка данных через API упала: ${response.status()} ${JSON.stringify(json.error ?? json)}`,
    );
  }
  return json.data;
}

let sequence = 0;
function uniqueUrl(): string {
  sequence += 1;
  return `https://example.com/e2e-seed-${Date.now()}-${sequence}`;
}

export interface ApiFixtures {
  /** `APIRequestContext`, нацеленный на `API_URL` — сырой доступ, когда фикстур ниже не хватает. */
  apiContext: APIRequestContext;
  /** Создаёт одну ссылку через `POST /api/links` с разумными дефолтами. */
  createLink: (input?: CreateLinkInput) => Promise<SeededLink>;
  /** Создаёт N ссылок последовательно (сценарий 5 — пагинация/поиск/сортировка на сиде из 25). */
  createLinks: (count: number, input?: (index: number) => CreateLinkInput) => Promise<SeededLink[]>;
}

export const test = base.extend<ApiFixtures>({
  apiContext: async ({}, use) => {
    const context = await playwrightRequest.newContext({ baseURL: API_URL });
    await use(context);
    await context.dispose();
  },

  createLink: async ({ apiContext }, use) => {
    await use(async (input = {}) => {
      const body: CreateLinkInput = {
        originalUrl: input.originalUrl ?? uniqueUrl(),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.customCode !== undefined ? { customCode: input.customCode } : {}),
      };
      return unwrap<SeededLink>(apiContext.post('/api/links', { data: body }));
    });
  },

  createLinks: async ({ createLink }, use) => {
    await use(async (count, input) => {
      const links: SeededLink[] = [];
      for (let index = 0; index < count; index += 1) {
        // eslint-disable-next-line no-await-in-loop -- сидирование намеренно последовательное,
        // чтобы порядок createdAt был предсказуемым для сортировки в тестах.
        links.push(await createLink(input?.(index)));
      }
      return links;
    });
  },
});

export { expect } from '@playwright/test';
