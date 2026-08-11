import { API_URL } from './env.js';

/**
 * Второй эшелон защиты от гонок старта: compose уже ждёт service_healthy,
 * но при локальном запуске и при пересборке образа бэкенд может быть
 * не готов. Без этого тесты флакуют на первом же кейсе.
 */
export async function waitForHealth(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastProblem = 'запрос не выполнялся';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (response.ok) {
        const body = (await response.json()) as { data?: { status?: string } };
        if (body.data?.status === 'ok') return;
        lastProblem = `health вернул ${JSON.stringify(body)}`;
      } else {
        lastProblem = `HTTP ${response.status}`;
      }
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Backend на ${API_URL} не поднялся за ${timeoutMs} мс. Последняя проблема: ${lastProblem}`);
}
