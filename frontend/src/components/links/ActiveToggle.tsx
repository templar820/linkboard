import { cx } from "../shared";
import styles from "./ActiveToggle.module.css";

export interface ActiveToggleProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Полный `aria-label` — вызывающая сторона формулирует текст (зависит от контекста: строка таблицы vs заголовок деталей). */
  label: string;
  "data-testid"?: string;
}

/**
 * Переключатель `isActive`. Презентационный — не знает про мутацию
 * `PATCH /api/links/:id`, только рендерит состояние и зовёт `onToggle`.
 * Используется в `LinksTable` (`links-table-row-active-toggle`) и
 * `LinkHeader` (`link-header-active-toggle`) — вынесен сюда, чтобы не
 * дублировать разметку/стили между T17 и T19.
 */
export function ActiveToggle({ isActive, onToggle, disabled = false, label, "data-testid": dataTestId }: ActiveToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label={label}
      className={cx(styles.toggle, isActive && styles.toggleOn)}
      data-testid={dataTestId}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className={styles.toggleThumb} aria-hidden="true" />
    </button>
  );
}

export default ActiveToggle;
