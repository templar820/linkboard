import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Link, bigintTransformer } from '../../links/entities/link.entity';

/**
 * `click_events` table — raw click events, one row per redirect through `GET /:code`.
 * This is the source of truth for all stats aggregates (daily/referers/user-agents/top);
 * `links.clicks_count` is only a denormalized fast counter (see docs/plans/linkboard.md §1).
 *
 * BIGINT `id`/`link_id` use the same `bigintTransformer` as `Link` (see link.entity.ts for
 * the full rationale) so both come back as JS `number`, never a driver `string`.
 *
 * Indexes `idx_click_events_link_time` (link_id, occurred_at) and `idx_click_events_time`
 * (occurred_at) are declared here via `@Index` (plain btree, ASC — matches the DDL in
 * docs/plans/linkboard.md §2.1 exactly, no explicit sort order is required for these two)
 * AND created by the migration; kept on the entity too purely for discoverability/
 * documentation when reading the entity in isolation.
 */
@Entity({ name: 'click_events' })
@Index('idx_click_events_link_time', ['linkId', 'occurredAt'])
@Index('idx_click_events_time', ['occurredAt'])
export class ClickEvent {
  /** See link.entity.ts for why `@Column` (not `@PrimaryGeneratedColumn`) is used for a
   * BIGINT identity PK with a transformer. */
  @Column({
    type: 'bigint',
    name: 'id',
    primary: true,
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: bigintTransformer,
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'link_id',
    transformer: bigintTransformer,
  })
  linkId: number;

  @ManyToOne(() => Link, (link) => link.clickEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'link_id' })
  link: Link;

  @CreateDateColumn({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;

  @Column({ type: 'text', name: 'referer', nullable: true })
  referer: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'char', length: 64, name: 'ip_hash', nullable: true })
  ipHash: string | null;

  @Column({ type: 'char', length: 2, name: 'country', nullable: true })
  country: string | null;
}
