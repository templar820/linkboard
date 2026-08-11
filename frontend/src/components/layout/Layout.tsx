import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import styles from "./Layout.module.css";

/**
 * Корневой layout admin-panel: сайдбар-навигация + область текущей страницы.
 * Структура и data-testid не менялись (T6) — T8 добавляет только токенизацию
 * (className из CSS Module) для визуальной цельности каркаса.
 */
export function Layout() {
  return (
    <div className={styles.layout} data-testid="app-layout">
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
