import { NavLink } from "react-router";
import { cx } from "../shared/classNames";
import styles from "./Sidebar.module.css";

/**
 * Сайдбар-навигация admin-panel. Структура, маршруты и data-testid не
 * менялись (T6) — T8 добавляет только токенизацию (className из CSS
 * Module + подсветку активного пункта через `NavLink`'s `isActive`).
 */
export function Sidebar() {
  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    cx(styles.link, isActive && styles.linkActive);

  return (
    <nav className={styles.sidebar} aria-label="Основная навигация" data-testid="sidebar-nav">
      <ul className={styles.list}>
        <li>
          <NavLink to="/" end className={linkClassName}>
            Дашборд
          </NavLink>
        </li>
        <li>
          <NavLink to="/links" className={linkClassName}>
            Ссылки
          </NavLink>
        </li>
        <li>
          <NavLink to="/links/new" className={linkClassName}>
            + Новая ссылка
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Sidebar;
