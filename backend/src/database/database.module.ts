import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';

/**
 * Подключение к PostgreSQL через DATABASE_URL (docker-compose.yml, сервис backend).
 *
 * - Сущности подхватываются глобом, а не `autoLoadEntities`. Причина: при
 *   autoLoadEntities в метаданные попадают только те сущности, которые кто-то
 *   зарегистрировал через `TypeOrmModule.forFeature([...])`. Связь Link →
 *   ClickEvent роняла старт приложения («Entity metadata for Link#clickEvents
 *   was not found»), пока ClickEvent не был зарегистрирован ни одним модулем.
 *   Глоб снимает зависимость метаданных от порядка написания фиче-модулей и
 *   совпадает с тем, как устроен data-source.ts для CLI.
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
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
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
