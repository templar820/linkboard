import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./classNames";
import styles from "./Toast.module.css";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface ShowToastOptions {
  variant?: ToastVariant;
  /** Автоскрытие, мс. По умолчанию 4000. */
  duration?: number;
}

export interface ToastContextValue {
  showToast: (message: string, options?: ShowToastOptions) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION_MS = 4000;

export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Провайдер уведомлений. Должен оборачивать всё дерево приложения ВЫШЕ
 * страниц, которые показывают Toast после мутаций (например, LinkForm
 * после успешного `POST /api/links`), потому что уведомление должно
 * пережить последующую навигацию (переход на `/links/:id`).
 *
 * Эта задача (T8) поставляет только компонент — фактическая обвязка
 * `<ToastProvider>` вокруг `<App />` в `main.tsx`/`App.tsx` — зона
 * задачи, которая первой начинает вызывать `useToast()` (T17: LinkForm),
 * см. docs/design/ui-kit.md, раздел «Toast: где монтировать провайдер».
 *
 * @example
 * // где-то на верхнем уровне дерева (main.tsx/App.tsx):
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * // в компоненте:
 * const { showSuccess, showError } = useToast();
 * showSuccess("Ссылка создана");
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: ShowToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const variant = options?.variant ?? "info";
      const duration = options?.duration ?? DEFAULT_DURATION_MS;
      setToasts((current) => [...current, { id, variant, message }]);
      const timer = setTimeout(() => dismissToast(id), duration);
      timers.current.set(id, timer);
    },
    [dismissToast],
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) =>
      showToast(message, duration !== undefined ? { variant: "success", duration } : { variant: "success" }),
    [showToast],
  );

  const showError = useCallback(
    (message: string, duration?: number) =>
      showToast(message, duration !== undefined ? { variant: "error", duration } : { variant: "error" }),
    [showToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, showSuccess, showError, dismissToast }),
    [showToast, showSuccess, showError, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className={styles.viewport} data-testid="toast-viewport">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              aria-live={toast.variant === "error" ? "assertive" : "polite"}
              className={cx(styles.toast, styles[`toast-${toast.variant}`])}
              data-testid="toast"
              data-variant={toast.variant}
            >
              <span className={styles.message}>{toast.message}</span>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Закрыть уведомление"
                onClick={() => dismissToast(toast.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

/**
 * Хук доступа к уведомлениям. Бросает исключение вне `ToastProvider`
 * (сигнал разработчику забытой обвязки, а не тихий no-op).
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used within a <ToastProvider>");
  }
  return ctx;
}

export default ToastProvider;
