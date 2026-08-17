import { describe, expect, it, vi } from 'vitest';
import { HealthController } from '../health.controller';
import type { HealthService } from '../health.service';

describe('HealthController', () => {
  it('делегирует проверку в HealthService и возвращает её результат as-is (конверт добавляет TransformInterceptor)', async () => {
    const healthService = {
      check: vi.fn().mockResolvedValue({ status: 'ok', db: 'up' }),
    } as unknown as HealthService;

    const controller = new HealthController(healthService);

    await expect(controller.check()).resolves.toEqual({ status: 'ok', db: 'up' });
    expect(healthService.check).toHaveBeenCalledTimes(1);
  });
});
