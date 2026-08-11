import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

/**
 * Корневой модуль. Фиче-модули (LinksModule, RedirectModule, StatsModule)
 * подключаются сюда по мере реализации (T11-T13) — HealthModule уже здесь
 * как эталон структуры (controller + service, явный префикс 'api/...').
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule],
})
export class AppModule {}
