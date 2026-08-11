import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** По умолчанию «Подтвердить». */
  confirmLabel?: string;
  /** По умолчанию «Отмена». */
  cancelLabel?: string;
  /** Красная кнопка подтверждения — для деструктивных действий (удаление). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Префикс testid. По умолчанию `confirm-dialog`, что даёт ровно те
   * идентификаторы, которые ожидает реестр data-testid (contract.md, 9.4):
   * `confirm-dialog`, `confirm-dialog-confirm-button`, `confirm-dialog-cancel-button`.
   */
  "data-testid"?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Доступный модальный диалог подтверждения: `role="dialog"` +
 * `aria-modal="true"`, фокус-трап внутри диалога, закрытие по Escape,
 * возврат фокуса на элемент-триггер при закрытии. Используется для
 * подтверждения удаления ссылки (`LinkHeader` → `link-header-delete-button`).
 *
 * @example
 * <ConfirmDialog
 *   open={isDeleteOpen}
 *   title="Удалить ссылку?"
 *   description="Действие необратимо: удалятся и все клики по ней."
 *   danger
 *   confirmLabel="Удалить"
 *   onConfirm={handleDelete}
 *   onCancel={() => setDeleteOpen(false)}
 * />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  danger = false,
  onConfirm,
  onCancel,
  "data-testid": dataTestId = "confirm-dialog",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = `${dataTestId}-title`;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusable = node?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? null;
    const first = focusable && focusable.length > 0 ? focusable[0] : undefined;
    first?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const current = dialogRef.current;
      if (!current) return;
      const items = Array.from(current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (!firstEl || !lastEl) return;

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={dataTestId}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description !== undefined ? <div className={styles.description}>{description}</div> : null}
        <div className={styles.actions}>
          <button
            type="button"
            className="lb-btn lb-btn--secondary"
            data-testid={`${dataTestId}-cancel-button`}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? "lb-btn lb-btn--danger" : "lb-btn lb-btn--primary"}
            data-testid={`${dataTestId}-confirm-button`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
