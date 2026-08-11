import { Controller, Get, HttpStatus, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RedirectService } from './redirect.service';

/**
 * Публичный редирект `GET /:code` — единственный маршрут без префикса `api/`.
 *
 * Пересечения с `/api/*` не возникает структурно: `/api/...` — это всегда
 * минимум два сегмента пути, `:code` — ровно один (см. решение по маршрутизации
 * в src/main.ts и backend/CLAUDE.md). Порядок регистрации модулей роли не играет.
 */
@Controller()
export class RedirectController {
  constructor(private readonly redirectService: RedirectService) {}

  @Get(':code')
  async redirect(@Param('code') code: string, @Req() request: Request, @Res() response: Response): Promise<void> {
    const link = await this.redirectService.resolve(code);

    // 302, а не 301: 301 браузеры кешируют, и последующие переходы вообще не
    // дойдут до сервера — статистика кликов станет неполной. no-store страхует
    // от кеширования и промежуточными прокси (docs/plans/linkboard.md §1).
    response.setHeader('Cache-Control', 'no-store');
    response.redirect(HttpStatus.FOUND, link.originalUrl);

    // Fire-and-forget: ответ уже отправлен, посетитель не ждёт запись клика.
    // Ошибки проглатываются внутри recordClick и только логируются.
    void this.redirectService.recordClick(link.id, {
      referer: request.get('referer') ?? null,
      userAgent: request.get('user-agent') ?? null,
      ip: request.ip ?? request.socket.remoteAddress ?? null,
    });
  }
}
