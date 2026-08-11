import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../../api/client";
import { useCreateLink } from "../../api/links";
import type { CreateLinkRequest } from "../../api/types";
import { useToast } from "../shared";
import styles from "./LinkForm.module.css";

const GENERIC_ERROR_MESSAGE = "Не удалось создать ссылку, попробуйте ещё раз";
const VALIDATION_TOAST_MESSAGE = "Проверьте правильность заполнения формы";

/**
 * Форма создания ссылки (`/links/new`). Успех — тост + переход на
 * `/links/:id`. `409 CODE_TAKEN` — ошибка под полем alias (не общий тост,
 * остальные значения полей сохраняются). `VALIDATION_ERROR` — сопоставляем
 * `error.details` с полями по эвристике "первое слово строки — имя поля"
 * (docs/api/error-codes.md).
 */
export function LinkForm() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const createLink = useCreateLink();

  const [originalUrl, setOriginalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [originalUrlError, setOriginalUrlError] = useState<string | undefined>(undefined);
  const [customCodeError, setCustomCodeError] = useState<string | undefined>(undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOriginalUrlError(undefined);
    setCustomCodeError(undefined);

    const trimmedUrl = originalUrl.trim();
    const trimmedTitle = title.trim();
    const trimmedCode = customCode.trim();

    const body: CreateLinkRequest = {
      originalUrl: trimmedUrl,
      ...(trimmedTitle.length > 0 ? { title: trimmedTitle } : {}),
      ...(trimmedCode.length > 0 ? { customCode: trimmedCode } : {}),
    };

    createLink.mutate(body, {
      onSuccess: (link) => {
        showSuccess("Ссылка создана");
        navigate(`/links/${link.id}`);
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          if (error.code === "CODE_TAKEN") {
            setCustomCodeError(error.message);
            return;
          }
          if (error.code === "VALIDATION_ERROR") {
            let matched = false;
            for (const detail of error.details ?? []) {
              const field = detail.split(" ")[0];
              if (field === "originalUrl") {
                setOriginalUrlError(detail);
                matched = true;
              } else if (field === "customCode") {
                setCustomCodeError(detail);
                matched = true;
              }
            }
            if (!matched) showError(VALIDATION_TOAST_MESSAGE);
            return;
          }
        }
        showError(GENERIC_ERROR_MESSAGE);
      },
    });
  }

  return (
    <form className={styles.form} data-testid="link-form" onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="link-form-original-url">
          Ссылка *
        </label>
        <input
          id="link-form-original-url"
          className="lb-input"
          data-testid="link-form-original-url-input"
          type="text"
          placeholder="https://example.com/very/long/path"
          value={originalUrl}
          onChange={(event) => setOriginalUrl(event.target.value)}
          aria-invalid={originalUrlError !== undefined}
          required
        />
        {originalUrlError !== undefined ? (
          <p className={styles.error} data-testid="link-form-original-url-error">
            {originalUrlError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="link-form-title">
          Название
        </label>
        <input
          id="link-form-title"
          className="lb-input"
          data-testid="link-form-title-input"
          type="text"
          placeholder="Например, «Августовская рассылка»"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={255}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="link-form-custom-code">
          Свой код (опционально)
        </label>
        <input
          id="link-form-custom-code"
          className="lb-input"
          data-testid="link-form-custom-code-input"
          type="text"
          placeholder="3-16 символов, латиница и цифры"
          value={customCode}
          onChange={(event) => setCustomCode(event.target.value)}
          aria-invalid={customCodeError !== undefined}
          minLength={3}
          maxLength={16}
        />
        {customCodeError !== undefined ? (
          <p className={styles.error} data-testid="link-form-custom-code-error">
            {customCodeError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className={`lb-btn lb-btn--primary ${styles.submit}`}
        data-testid="link-form-submit-button"
        disabled={createLink.isPending}
      >
        {createLink.isPending ? "Создаём…" : "Создать ссылку"}
      </button>
    </form>
  );
}

export default LinkForm;
