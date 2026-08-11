import { getPool } from './db.js';

/**
 * Сидирование напрямую в БД.
 *
 * Ссылки в норме создаются через API — это честнее. Прямой INSERT нужен там,
 * где через API состояние недостижимо: клики с историческими occurred_at
 * (API проставляет now()), заданный ip_hash, конкретный referer и user-agent.
 */

export interface SeedLinkInput {
  code: string;
  originalUrl?: string;
  title?: string | null;
  clicksCount?: number;
  isActive?: boolean;
  createdAt?: Date;
}

export interface SeededLink {
  id: number;
  code: string;
}

export async function seedLink(input: SeedLinkInput): Promise<SeededLink> {
  const { rows } = await getPool().query<{ id: string; code: string }>(
    `INSERT INTO links (code, original_url, title, clicks_count, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), now())
     RETURNING id::text, code`,
    [
      input.code,
      input.originalUrl ?? `https://example.com/${input.code}`,
      input.title ?? null,
      input.clicksCount ?? 0,
      input.isActive ?? true,
      input.createdAt ?? null,
    ],
  );

  const row = rows[0];
  if (!row) throw new Error('seedLink: INSERT не вернул строку');
  return { id: Number(row.id), code: row.code };
}

export interface SeedClickInput {
  linkId: number;
  occurredAt: Date;
  referer?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
  country?: string | null;
}

export async function seedClick(input: SeedClickInput): Promise<void> {
  await getPool().query(
    `INSERT INTO click_events (link_id, occurred_at, referer, user_agent, ip_hash, country)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.linkId,
      input.occurredAt,
      input.referer ?? null,
      input.userAgent ?? null,
      input.ipHash ?? null,
      input.country ?? null,
    ],
  );
}

/** Пакетная вставка кликов — для тестов агрегатов, где нужны десятки событий. */
export async function seedClicks(inputs: SeedClickInput[]): Promise<void> {
  for (const input of inputs) {
    await seedClick(input);
  }
}

/**
 * Синхронизирует денормализованный счётчик с фактическим числом событий.
 * Нужно, когда клики засеяны напрямую в обход инкремента в сервисе.
 */
export async function syncClicksCount(linkId: number): Promise<void> {
  await getPool().query(
    `UPDATE links SET clicks_count = (SELECT count(*) FROM click_events WHERE link_id = $1) WHERE id = $1`,
    [linkId],
  );
}

/** Детерминированный ip_hash для тестов уникальных посетителей. */
export function fakeIpHash(seed: string): string {
  return seed.padEnd(64, '0').slice(0, 64);
}
