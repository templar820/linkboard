import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // host: true (0.0.0.0) — обязательно для докера, иначе Vite слушает
    // только 127.0.0.1 внутри контейнера и порт не пробрасывается наружу
    // через docker-compose (см. frontend/Dockerfile, CMD --host 0.0.0.0).
    host: true,
    strictPort: true,
    // Vite 6 по умолчанию отклоняет запросы с Host-заголовком, не похожим на
    // localhost/IP (защита от DNS rebinding) — 403 даже на валидный запрос.
    // Сервис frontend-e2e (docker-compose.yml, profile "e2e") обращается
    // именно по внутреннему DNS-имени сети compose (браузер Playwright
    // резолвит localhost как сам контейнер e2e-tests, не frontend-e2e), так
    // что Host-заголовок — "frontend-e2e:3000". Этот же конфиг использует и
    // обычный dev-сервис frontend, у которого порт ОПУБЛИКОВАН наружу
    // (docker-compose.yml, "${FRONTEND_PORT:-3000}:3000") — поэтому список
    // разрешённых хостов сужен до конкретного имени, а не отключён целиком:
    // allowedHosts: true снял бы защиту и с публично доступного dev-сервера.
    allowedHosts: ["frontend-e2e"],
  },
  preview: {
    port: 3000,
    host: true,
    strictPort: true,
  },
});
