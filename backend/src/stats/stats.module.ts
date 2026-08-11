import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from '../links/entities/link.entity';
import { LinksModule } from '../links/links.module';
import { ClickEvent } from './entities/click-event.entity';
import { LinkStatsController, StatsController } from './stats.controller';
import { StatsService } from './stats.service';

/**
 * LinksModule импортируется ради LinksService.getEntityOrFail — проверки
 * существования ссылки перед агрегатами, чтобы `/api/links/999/stats/daily`
 * отдавал LINK_NOT_FOUND, а не пустой ряд нулей.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ClickEvent, Link]), LinksModule],
  controllers: [LinkStatsController, StatsController],
  providers: [StatsService],
})
export class StatsModule {}
