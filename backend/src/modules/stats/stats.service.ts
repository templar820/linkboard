import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfigService } from '../../config/app-config.service';
import { Link } from '../links/entities/link.entity';
import { LinksService } from '../links/links.service';
import { ClickEvent } from './entities/click-event.entity';
import { buildContinuousSeries, resolveRange, startOfUtcDay, ResolvedRange } from './date-range.util';
import {
  DailyStatsDto,
  DeviceType,
  RefererStatsDto,
  StatsSummaryDto,
  TopLinksDto,
  UserAgentStatsDto,
} from './dto/stats-response.dto';
import { detectBrowserName, detectDeviceType, normalizeReferer, toBrowserStats, toDeviceStats } from './user-agent.util';

const DAY_MS = 24 * 60 * 60 * 1000;

interface DailyRow {
  date: string;
  clicks: string;
  unique_visitors: string;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(ClickEvent) private readonly clicksRepository: Repository<ClickEvent>,
    @InjectRepository(Link) private readonly linksRepository: Repository<Link>,
    private readonly linksService: LinksService,
    private readonly config: AppConfigService,
  ) {}

  async linkDaily(linkId: number, from?: string, to?: string): Promise<DailyStatsDto> {
    await this.linksService.getEntityOrFail(linkId);
    return this.daily(resolveRange(from, to), linkId);
  }

  async globalDaily(from?: string, to?: string): Promise<DailyStatsDto> {
    return this.daily(resolveRange(from, to));
  }

  async linkReferers(linkId: number, from: string | undefined, to: string | undefined, limit: number): Promise<RefererStatsDto> {
    await this.linksService.getEntityOrFail(linkId);
    const range = resolveRange(from, to);

    // Группируем по сырому referer в БД, а хост вычисляем в приложении:
    // разбор URL в SQL был бы регуляркой, а нормализация уже нужна и
    // тестируется отдельно как чистая функция.
    const rows = await this.rangeQuery(range, linkId)
      .select('click.referer', 'referer')
      .addSelect('count(*)', 'clicks')
      .groupBy('click.referer')
      .getRawMany<{ referer: string | null; clicks: string }>();

    const entries = rows.map((row): [string, number] => [normalizeReferer(row.referer), Number(row.clicks)]);
    const items = toBrowserStats(entries)
      .map(({ name, clicks }) => ({ referer: name, clicks }))
      .slice(0, limit);

    return { items };
  }

  async linkUserAgents(linkId: number, from?: string, to?: string): Promise<UserAgentStatsDto> {
    await this.linksService.getEntityOrFail(linkId);
    const range = resolveRange(from, to);

    const rows = await this.rangeQuery(range, linkId)
      .select('click.userAgent', 'user_agent')
      .addSelect('count(*)', 'clicks')
      .groupBy('click.userAgent')
      .getRawMany<{ user_agent: string | null; clicks: string }>();

    const browserEntries: Array<[string, number]> = [];
    const deviceEntries: Array<[DeviceType, number]> = [];

    for (const row of rows) {
      const clicks = Number(row.clicks);
      browserEntries.push([detectBrowserName(row.user_agent), clicks]);
      deviceEntries.push([detectDeviceType(row.user_agent), clicks]);
    }

    return { browsers: toBrowserStats(browserEntries), devices: toDeviceStats(deviceEntries) };
  }

  async summary(now: Date = new Date()): Promise<StatsSummaryDto> {
    const todayStart = startOfUtcDay(now);
    const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);

    const [totalLinks, activeLinks, totalClicks, clicksToday, lastWeek] = await Promise.all([
      this.linksRepository.count(),
      this.linksRepository.countBy({ isActive: true }),
      this.clicksRepository.count(),
      this.clicksRepository
        .createQueryBuilder('click')
        .where('click.occurredAt >= :todayStart', { todayStart })
        .getCount(),
      this.clicksRepository
        .createQueryBuilder('click')
        .select('count(*)', 'clicks')
        .addSelect('count(DISTINCT click.ipHash)', 'unique_visitors')
        .where('click.occurredAt >= :weekStart', { weekStart })
        .getRawOne<{ clicks: string; unique_visitors: string }>(),
    ]);

    return {
      totalLinks,
      activeLinks,
      totalClicks,
      clicksToday,
      clicksLast7Days: Number(lastWeek?.clicks ?? 0),
      uniqueVisitorsLast7Days: Number(lastWeek?.unique_visitors ?? 0),
    };
  }

  /**
   * Топ считается по click_events внутри периода, а НЕ по links.clicks_count:
   * денормализованный счётчик хранит клики за всё время и дал бы неверный
   * «топ за месяц» (docs/plans/linkboard.md §3.2).
   */
  async top(from: string | undefined, to: string | undefined, limit: number): Promise<TopLinksDto> {
    const range = resolveRange(from, to);

    const rows = await this.rangeQuery(range)
      .innerJoin(Link, 'link', 'link.id = click.linkId')
      .select('link.id', 'id')
      .addSelect('link.code', 'code')
      .addSelect('link.title', 'title')
      .addSelect('count(*)', 'clicks')
      .groupBy('link.id')
      .addGroupBy('link.code')
      .addGroupBy('link.title')
      .orderBy('count(*)', 'DESC')
      .addOrderBy('link.id', 'ASC')
      .limit(limit)
      .getRawMany<{ id: string; code: string; title: string | null; clicks: string }>();

    return {
      items: rows.map((row) => ({
        id: Number(row.id),
        code: row.code,
        title: row.title,
        shortUrl: `${this.config.baseUrl}/${row.code}`,
        clicks: Number(row.clicks),
      })),
    };
  }

  private async daily(range: ResolvedRange, linkId?: number): Promise<DailyStatsDto> {
    const rows = await this.rangeQuery(range, linkId)
      .select("to_char(date_trunc('day', click.occurredAt AT TIME ZONE 'UTC'), 'YYYY-MM-DD')", 'date')
      .addSelect('count(*)', 'clicks')
      .addSelect('count(DISTINCT click.ipHash)', 'unique_visitors')
      .groupBy('1')
      .orderBy('1', 'ASC')
      .getRawMany<DailyRow>();

    const points = buildContinuousSeries(
      rows.map((row) => ({ date: row.date, clicks: Number(row.clicks), uniqueVisitors: Number(row.unique_visitors) })),
      range,
    );

    return {
      from: range.from,
      to: range.to,
      points,
      totalClicks: points.reduce((sum, point) => sum + point.clicks, 0),
      // Уникальные за период считаются отдельным запросом, а не суммой по дням:
      // один посетитель, заходивший в разные дни, не должен посчитаться дважды.
      totalUnique: await this.countUnique(range, linkId),
    };
  }

  private async countUnique(range: ResolvedRange, linkId?: number): Promise<number> {
    const row = await this.rangeQuery(range, linkId)
      .select('count(DISTINCT click.ipHash)', 'unique_visitors')
      .getRawOne<{ unique_visitors: string }>();
    return Number(row?.unique_visitors ?? 0);
  }

  /** Общий каркас запроса по диапазону: occurred_at ∈ [from, toExclusive). */
  private rangeQuery(range: ResolvedRange, linkId?: number) {
    const qb = this.clicksRepository
      .createQueryBuilder('click')
      .where('click.occurredAt >= :fromDate', { fromDate: range.fromDate })
      .andWhere('click.occurredAt < :toExclusive', { toExclusive: range.toExclusive });

    if (linkId !== undefined) {
      qb.andWhere('click.linkId = :linkId', { linkId });
    }

    return qb;
  }
}
