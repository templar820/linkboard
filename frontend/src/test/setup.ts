import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

// jsdom не реализует ResizeObserver, а recharts (ClicksChart/UserAgentsPanel)
// инстанцирует его безусловно внутри ResponsiveContainer. В браузере он
// нужен для замера контейнера; в тестах используется `initialDimension`
// на ResponsiveContainer + этот no-op стаб, чтобы просто не падать.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom не считает layout — getBoundingClientRect всегда возвращает нули.
// ResponsiveContainer recharts использует именно его (не только
// ResizeObserver) для измерения контейнера сразу при монтировании и тут же
// затирает `initialDimension` нулями, из-за чего графики в тестах остаются
// пустыми. Фиксируем неотрицательный размер, чтобы ClicksChart/UserAgentsPanel
// рендерились в vitest так же, как в браузере.
Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    width: 600,
    height: 280,
    top: 0,
    left: 0,
    right: 600,
    bottom: 280,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  } as DOMRect;
};

// msw поднимается только в тестовом окружении vitest — в рантайме
// приложения (`src/main.tsx`) он не подключается.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
