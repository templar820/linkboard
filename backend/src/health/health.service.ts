import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { ApiException } from '../common/errors/api-exception';

export interface HealthStatus {
  status: 'ok';
  db: 'up';
}

/**
 * GET /api/health — используется docker-compose healthcheck (см. docker-compose.yml,
 * сервис backend) и мониторингом. Проверка БД — лёгкий SELECT 1, а не тяжёлый запрос.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      this.logger.error('Health check failed: database is unavailable', error instanceof Error ? error.stack : String(error));
      throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, 'DB_UNAVAILABLE', 'Database connection is unavailable');
    }

    return { status: 'ok', db: 'up' };
  }
}
