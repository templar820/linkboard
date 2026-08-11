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
  },
  preview: {
    port: 3000,
    host: true,
    strictPort: true,
  },
});
