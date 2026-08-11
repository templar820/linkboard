import { cx } from "./classNames";
import styles from "./Spinner.module.css";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Текст для скринридеров (не отображается визуально). По умолчанию «Загрузка…». */
  label?: string;
  "data-testid"?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: styles["spinner-sm"] ?? "",
  md: styles["spinner-md"] ?? "",
  lg: styles["spinner-lg"] ?? "",
};

/**
 * Индикатор загрузки. Используется как дефолтное содержимое `Table`
 * в состоянии `isLoading`, а также самостоятельно на страницах, пока
 * react-query грузит данные.
 *
 * @example
 * <Spinner data-testid="spinner" size="lg" />
 */
export function Spinner({ size = "md", label = "Загрузка…", "data-testid": dataTestId = "spinner" }: SpinnerProps) {
  return (
    <span className={cx(styles.spinner, SIZE_CLASS[size])} role="status" data-testid={dataTestId}>
      <span className={styles.circle} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export default Spinner;
