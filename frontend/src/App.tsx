import { Route, Routes } from "react-router";
import { Layout } from "./components/layout/Layout";
import { ToastProvider } from "./components/shared";
import { CreateLinkPage } from "./pages/CreateLinkPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LinkDetailsPage } from "./pages/LinkDetailsPage";
import { LinksPage } from "./pages/LinksPage";
import { NotFoundPage } from "./pages/NotFoundPage";

/**
 * Пять маршрутов admin-panel (docs/plans/linkboard.md, раздел 4.2).
 * `QueryClientProvider`/`BrowserRouter` подключаются на уровень выше,
 * в `main.tsx`, чтобы `App` можно было рендерить в тестах с собственным
 * `MemoryRouter`/`QueryClient`.
 *
 * `ToastProvider` — здесь, а не в `main.tsx` (хотя `docs/design/ui-kit.md`
 * предлагает именно `main.tsx`): так тосты переживают `navigate()` в той же
 * мере (провайдер не размонтируется при смене маршрута — `Routes` меняет
 * только дочерний элемент), и одновременно тесты, рендерящие `<App/>`
 * напрямую в своём `MemoryRouter` (`src/test/routing.spec.tsx`), получают
 * контекст `useToast()` без дополнительной обвязки.
 */
export function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="/links/new" element={<CreateLinkPage />} />
          <Route path="/links/:id" element={<LinkDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;
