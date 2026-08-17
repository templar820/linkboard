import { Controller, Get, Param, Query } from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { DateRangeQueryDto, RankedStatsQueryDto } from './dto/stats-query.dto';
import { StatsService } from './stats.service';

/**
 * Статистика конкретной ссылки. Путь глубже, чем `api/links/:id` из
 * LinksController, поэтому маршруты не конфликтуют.
 */
@Controller('api/links/:id/stats')
export class LinkStatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('daily')
  daily(@Param('id', ParseIdPipe) id: number, @Query() query: DateRangeQueryDto) {
    return this.statsService.linkDaily(id, query.from, query.to);
  }

  @Get('referers')
  referers(@Param('id', ParseIdPipe) id: number, @Query() query: RankedStatsQueryDto) {
    return this.statsService.linkReferers(id, query.from, query.to, query.limit);
  }

  @Get('user-agents')
  userAgents(@Param('id', ParseIdPipe) id: number, @Query() query: DateRangeQueryDto) {
    return this.statsService.linkUserAgents(id, query.from, query.to);
  }
}
