import { Route, Routes } from "react-router";
import { Layout } from "./components/layout/Layout";
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
 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/links" element={<LinksPage />} />
        <Route path="/links/new" element={<CreateLinkPage />} />
        <Route path="/links/:id" element={<LinkDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
