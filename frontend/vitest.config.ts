import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Отдельный конфиг для vitest (не переиспользует dev-server опции из
// vite.config.ts — тестам не нужен ни порт 3000, ни host: true).
// defineConfig импортируется из "vitest/config" (а не "vite"), только он
// типизирует поле `test` в UserConfig.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
  },
});
