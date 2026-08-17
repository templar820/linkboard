import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { ApiException } from '../../common/errors/api-exception';
import { ClickEvent } from '../stats/entities/click-event.entity';
import { Link } from '../links/entities/link.entity';

/** Данные запроса, которые попадают в click_events. Собираются контроллером. */
export interface ClickContext {
  referer: string | null;
  userAgent: string | null;
  ip: string | null;
}

@Injectable()
export class RedirectService {
  private readonly logger = new Logger(RedirectService.name);

  constructor(
    @InjectRepository(Link) private readonly linksRepository: Repository<Link>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Поиск целевого адреса. Неактивная ссылка отдаёт 410 и клик НЕ учитывается
   * (docs/plans/linkboard.md §3.2, docs/api/error-codes.md).
   */
  async resolve(code: string): Promise<Link> {
    const link = await this.linksRepository.findOneBy({ code });

    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'LINK_NOT_FOUND', `Short code '${code}' was not found`);
    }
    if (!link.isActive) {
      throw new ApiException(HttpStatus.GONE, 'LINK_DISABLED', `Short code '${code}' is disabled`);
    }

    return link;
  }

  /**
   * Запись клика. Вызывается ПОСЛЕ отправки 302 — посетитель не ждёт INSERT.
   *
   * Инвариант из CLAUDE.md: ошибка записи клика логируется, но не ломает
   * редирект. Поэтому метод не бросает наружу ничего — он и не может: к моменту
   * вызова ответ клиенту уже ушёл, бросать исключение некуда.
   *
   * Событие и инкремент денормализованного счётчика идут одной транзакцией,
   * иначе счётчик и click_events разъезжаются при сбое между двумя запросами.
   */
  async recordClick(linkId: number, context: ClickContext): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(ClickEvent, {
          linkId,
          referer: context.referer,
          userAgent: context.userAgent,
          ipHash: this.hashIp(context.ip),
        });
        await manager.increment(Link, { id: linkId }, 'clicksCount', 1);
      });
    } catch (error) {
      this.logger.error(
        `Не удалось записать клик по ссылке ${linkId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Псевдонимизация IP: сырой адрес в БД не хранится. Соль меняется каждые
   * UTC-сутки, поэтому по хешу нельзя связать визиты одного посетителя за
   * разные дни — этого достаточно для подсчёта уникальных в пределах дня
   * (docs/plans/linkboard.md §2.1, поле ip_hash).
   */
  private hashIp(ip: string | null): string | null {
    if (!ip) return null;
    const dailySalt = new Date().toISOString().slice(0, 10);
    return createHash('sha256').update(`${ip}:${dailySalt}`).digest('hex');
  }
}
