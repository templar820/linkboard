import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LinksModule } from './links/links.module';

/**
 * Корневой модуль. RedirectModule (T12, GET /:code, без префикса) подключается
 * координатором отдельно, чтобы не конфликтовать по файлам с этой задачей.
 * StatsModule (T13) ещё не написан — подключить при его появлении.
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, LinksModule],
})
export class AppModule {}
