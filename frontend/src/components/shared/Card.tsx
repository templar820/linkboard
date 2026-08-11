import type { ReactNode } from "react";
import { cx } from "./classNames";
import styles from "./Card.module.css";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: ReactNode;
  /** Заголовок карточки. Если не задан вместе с `actions` — шапка не рендерится. */
  title?: ReactNode;
  /** Правая часть шапки (кнопки, переключатель периода и т.п.). */
  actions?: ReactNode;
  /** Внутренний отступ тела карточки. По умолчанию `md`. */
  padding?: CardPadding;
  className?: string;
  "data-testid"?: string;
}

const PADDING_CLASS: Record<CardPadding, string> = {
  none: styles["padding-none"] ?? "",
  sm: styles["padding-sm"] ?? "",
  md: styles["padding-md"] ?? "",
  lg: styles["padding-lg"] ?? "",
};

/**
 * Базовый контейнер-карточка. Используется как обёртка для SummaryCards,
 * ClicksChart, ReferersTable/UserAgentsPanel и т.п. — везде, где страницам
 * нужна единая поверхность с рамкой/тенью/радиусом.
 *
 * @example
 * <Card title="Клики по дням" actions={<DateRangePicker ... />}>
 *   <ClicksChartBody ... />
 * </Card>
 */
export function Card({
  children,
  title,
  actions,
  padding = "md",
  className,
  "data-testid": dataTestId,
}: CardProps) {
  const hasHeader = title !== undefined || actions !== undefined;

  return (
    <section className={cx(styles.card, className)} data-testid={dataTestId}>
      {hasHeader ? (
        <header className={styles.header}>
          {title !== undefined ? <h2 className={styles.title}>{title}</h2> : <span />}
          {actions !== undefined ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={cx(styles.body, PADDING_CLASS[padding])}>{children}</div>
    </section>
  );
}

export default Card;
