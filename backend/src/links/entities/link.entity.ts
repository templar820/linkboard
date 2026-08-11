import { Column, CreateDateColumn, Entity, OneToMany, Unique, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { ClickEvent } from '../../stats/entities/click-event.entity';

/**
 * PostgreSQL BIGINT (int8) columns are returned by the `pg` driver — and therefore by
 * TypeORM — as JS `string`, because BIGINT's range exceeds what `number` can represent
 * without precision loss (IEEE-754 double, safe up to 2^53-1). The API contract
 * (docs/api/contract.md §7 "Соглашение об именовании полей", docs/plans/linkboard.md §3.2)
 * requires `id` and `clicksCount` to be plain JSON numbers in responses
 * (e.g. `"id": 42, "clicksCount": 1523`), not quoted strings — if left untransformed,
 * TypeORM would leak the raw string straight into DTOs/JSON and silently break the
 * contract (and any frontend code doing arithmetic/comparisons on these fields).
 *
 * Decision: attach a `ValueTransformer` to every BIGINT column that converts
 * string -> number on read (`from`) and passes numbers through unchanged on write (`to`).
 * This is safe for this service's realistic scale — link ids and click counters are
 * expected to stay far below `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) for a
 * pet/small-service deployment (see docs/plans/linkboard.md, "rollup-агрегаты кликов
 * понадобятся после ~10M событий" — orders of magnitude below the safe-integer ceiling).
 * BIGINT is still used in the DDL (per the architecture plan) purely for headroom /
 * future-proofing; the application layer works with plain `number` end-to-end.
 *
 * Exported so `ClickEvent` (stats/entities/click-event.entity.ts) reuses the exact same
 * transformer for its own BIGINT columns (`id`, `link_id`) instead of duplicating it.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};

/**
 * `links` table — short links created by the admin.
 *
 * Column <-> property naming follows docs/api/contract.md §7: DB columns are snake_case
 * (`original_url`, `clicks_count`, ...), entity properties are camelCase (`originalUrl`,
 * `clicksCount`, ...); mapping is explicit via `name:` on every `@Column`.
 *
 * Index `idx_links_created_at` (created_at DESC, used for the default list sort in
 * `GET /api/links`) is declared and created in the migration rather than via an entity
 * decorator: TypeORM's `@Index` decorator has no way to express per-column sort order
 * (ASC/DESC) for a composite/simple btree index — only raw SQL in a migration can pin
 * down `DESC` exactly as required by docs/plans/linkboard.md §2.1. See
 * `database/migrations/*-CreateLinksAndClickEvents.ts`.
 */
@Entity({ name: 'links' })
@Unique('uq_links_code', ['code'])
export class Link {
  /**
   * `@PrimaryGeneratedColumn`'s option types (`PrimaryGeneratedColumnNumericOptions` /
   * `...IdentityOptions`) don't expose a `transformer` property, so it can't produce a
   * BIGINT PK with the `bigintTransformer` above. `@Column` accepts the full
   * `ColumnOptions` (primary + generated + transformer), so it's used here instead —
   * with `generated: 'identity'` + `generatedIdentity: 'ALWAYS'` to match the DDL's
   * `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (docs/plans/linkboard.md §2.1)
   * exactly, rather than the classic `SERIAL`/sequence-default strategy.
   */
  @Column({
    type: 'bigint',
    name: 'id',
    primary: true,
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintTransformer,
  })
  id: number;

  @Column({ type: 'varchar', length: 16, name: 'code' })
  code: string;

  @Column({ type: 'text', name: 'original_url' })
  originalUrl: string;

  @Column({ type: 'varchar', length: 255, name: 'title', nullable: true })
  title: string | null;

  @Column({
    type: 'bigint',
    name: 'clicks_count',
    default: 0,
    transformer: bigintTransformer,
  })
  clicksCount: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ClickEvent, (clickEvent) => clickEvent.link)
  clickEvents: ClickEvent[];
}
