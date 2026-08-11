import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';

/**
 * Подключение к PostgreSQL через DATABASE_URL (docker-compose.yml, сервис backend).
 *
 * - `autoLoadEntities: true` — сущности регистрируются самими фиче-модулями через
 *   `TypeOrmModule.forFeature([...])` (T7 добавит Link/ClickEvent), здесь их
 *   перечислять не нужно — приложение обязано стартовать и с пустой схемой.
 * - `migrationsRun` включён только в development: миграции применяются
 *   автоматически при старте контейнера backend (см. docs/plans/linkboard.md §6.1).
 *   В production миграции прогоняются осознанно (`make migrate` / CI-шаг), не
 *   как побочный эффект старта процесса.
 * - `synchronize` всегда false — схема управляется исключительно миграциями,
 *   никогда автогенерацией TypeORM на лету.
 */
@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres' as const,
        url: config.databaseUrl,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: config.isDevelopment,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        logging: config.isDevelopment ? ['error', 'warn'] : ['error'],
      }),
    }),
  ],
})
export class DatabaseModule {}
