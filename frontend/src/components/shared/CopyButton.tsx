import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "./classNames";
import styles from "./CopyButton.module.css";

export interface CopyButtonProps {
  /** Значение, которое кладётся в буфер обмена (обычно `link.shortUrl`). */
  value: string;
  /** Текст в состоянии покоя. По умолчанию «Копировать». */
  label?: string;
  /** Текст на ~2 секунды после успешного копирования. По умолчанию «Скопировано». */
  copiedLabel?: string;
  className?: string;
  "data-testid"?: string;
}

const RESET_DELAY_MS = 2000;

/**
 * Кнопка копирования в буфер обмена через `navigator.clipboard`. Используется
 * в `LinksTable` (`links-table-row-copy-button`) и `LinkHeader`
 * (`link-header-copy-button`) — e2e-сценарий 1 проверяет именно
 * `navigator.clipboard` после клика.
 *
 * @example
 * <CopyButton value={link.shortUrl} data-testid="links-table-row-copy-button" />
 */
export function CopyButton({
  value,
  label = "Копировать",
  copiedLabel = "Скопировано",
  className,
  "data-testid": dataTestId,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), RESET_DELAY_MS);
    } catch {
      // Буфер обмена недоступен (нет разрешения / несекьюрный контекст) —
      // молча игнорируем, "скопировано" не показываем. Решение о показе
      // Toast с ошибкой — на усмотрение вызывающей страницы (T17/T19).
    }
  }, [value]);

  return (
    <button
      type="button"
      className={cx(styles.button, copied && styles.copied, className)}
      data-testid={dataTestId}
      onClick={handleClick}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

export default CopyButton;
