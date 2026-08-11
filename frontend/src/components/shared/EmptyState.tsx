import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Опциональное действие, например кнопка/ссылка «Создать ссылку». */
  action?: ReactNode;
  /** Кастомная иконка/эмодзи. По умолчанию — нейтральный символ ссылки. */
  icon?: ReactNode;
  "data-testid"?: string;
}

/**
 * Состояние «нет данных» — пустой список ссылок, пустой результат поиска,
 * пустая БД на дашборде (e2e-сценарий 9 из архплана).
 *
 * @example
 * <EmptyState
 *   data-testid="links-table-empty-state"
 *   title="Ссылок пока нет"
 *   description="Создайте первую короткую ссылку"
 *   action={<Link className="lb-btn lb-btn--primary" to="/links/new">+ Ссылка</Link>}
 * />
 */
export function EmptyState({ title, description, action, icon, "data-testid": dataTestId }: EmptyStateProps) {
  return (
    <div className={styles.root} data-testid={dataTestId}>
      <div className={styles.icon} aria-hidden="true">
        {icon ?? "🔗"}
      </div>
      <p className={styles.title}>{title}</p>
      {description !== undefined ? <p className={styles.description}>{description}</p> : null}
      {action !== undefined ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

export default EmptyState;
