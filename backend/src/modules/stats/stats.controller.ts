import { Controller, Get, Query } from '@nestjs/common';
import { DateRangeQueryDto, RankedStatsQueryDto } from './dto/stats-query.dto';
import { StatsService } from './stats.service';

/** Сводная статистика по всем ссылкам — дашборд admin-panel. */
@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  summary() {
    return this.statsService.summary();
  }

  @Get('daily')
  daily(@Query() query: DateRangeQueryDto) {
    return this.statsService.globalDaily(query.from, query.to);
  }

  @Get('top')
  top(@Query() query: RankedStatsQueryDto) {
    return this.statsService.top(query.from, query.to, query.limit);
  }
}
