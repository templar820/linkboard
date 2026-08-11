import styles from "./ErrorState.module.css";

export interface ErrorStateProps {
  /** Заголовок. По умолчанию «Не удалось загрузить данные». */
  title?: string;
  /** Пояснение. По умолчанию нейтральный текст про повтор запроса. */
  message?: string;
  /** Подпись кнопки повтора. По умолчанию «Повторить». */
  actionLabel?: string;
  /** Если не задан — кнопка действия не рендерится. */
  onAction?: () => void;
  "data-testid"?: string;
}

/**
 * Состояние ошибки для карточек/таблиц/страниц (например,
 * `links-table-error-state`, деградация дашборда при 500 от API —
 * e2e-сценарий 10 из архплана).
 *
 * @example
 * <ErrorState
 *   data-testid="links-table-error-state"
 *   message="Не удалось загрузить список ссылок"
 *   onAction={() => refetch()}
 * />
 */
export function ErrorState({
  title = "Не удалось загрузить данные",
  message = "Попробуйте обновить страницу или повторить запрос позже.",
  actionLabel = "Повторить",
  onAction,
  "data-testid": dataTestId,
}: ErrorStateProps) {
  return (
    <div className={styles.root} role="alert" data-testid={dataTestId}>
      <span className={styles.icon} aria-hidden="true">
        !
      </span>
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
      {onAction ? (
        <button type="button" className="lb-btn lb-btn--secondary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default ErrorState;
