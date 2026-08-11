import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `links` and `click_events` exactly per docs/plans/linkboard.md §2.1 (DDL) —
 * generated via `npm run migration:generate` off the `Link`/`ClickEvent` entities and then
 * hand-corrected (as required by the task): the generator produced everything from the
 * entity metadata correctly (types, `uq_links_code`, `ON DELETE CASCADE`, both
 * `click_events` indexes) EXCEPT `idx_links_created_at`, which TypeORM's `@Index`
 * decorator cannot express with `DESC` ordering — that index is added here by hand with
 * raw SQL to match the DDL (`created_at DESC`) precisely; see the comment in
 * `links/entities/link.entity.ts`.
 */
export class CreateLinksAndClickEvents1786439516449 implements MigrationInterface {
  name = 'CreateLinksAndClickEvents1786439516449';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "links" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "code" character varying(16) NOT NULL, "original_url" text NOT NULL, "title" character varying(255), "clicks_count" bigint NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_links_code" UNIQUE ("code"), CONSTRAINT "PK_ecf17f4a741d3c5ba0b4c5ab4b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_links_created_at" ON "links" ("created_at" DESC) `);
    await queryRunner.query(
      `CREATE TABLE "click_events" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "link_id" bigint NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "referer" text, "user_agent" text, "ip_hash" character(64), "country" character(2), CONSTRAINT "PK_2e3b14f5049a9fdbd8c9b1b10bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_click_events_time" ON "click_events" ("occurred_at") `);
    await queryRunner.query(`CREATE INDEX "idx_click_events_link_time" ON "click_events" ("link_id", "occurred_at") `);
    await queryRunner.query(
      `ALTER TABLE "click_events" ADD CONSTRAINT "FK_e27e2d62deabf3c458aa8d0e456" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "click_events" DROP CONSTRAINT "FK_e27e2d62deabf3c458aa8d0e456"`);
    await queryRunner.query(`DROP INDEX "public"."idx_click_events_link_time"`);
    await queryRunner.query(`DROP INDEX "public"."idx_click_events_time"`);
    await queryRunner.query(`DROP TABLE "click_events"`);
    await queryRunner.query(`DROP INDEX "public"."idx_links_created_at"`);
    await queryRunner.query(`DROP TABLE "links"`);
  }
}
