import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { LinksModule } from './modules/links/links.module';
import { RedirectModule } from './modules/redirect/redirect.module';
import { StatsModule } from './modules/stats/stats.module';

/**
 * Корневой модуль. Порядок импортов на маршрутизацию не влияет: `GET /:code`
 * из RedirectModule — один сегмент пути, все API-контроллеры — два и больше
 * (см. решение по маршрутизации в main.ts).
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, LinksModule, StatsModule, RedirectModule],
})
export class AppModule {}
