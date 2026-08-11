import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service';

/**
 * Явный префикс 'api/health' в @Controller() — см. main.ts, раздел с решением
 * по маршрутизации /api/* vs публичного редиректа GET /:code (задача T12).
 */
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
