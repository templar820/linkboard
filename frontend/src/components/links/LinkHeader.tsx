import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useDeleteLink, useUpdateLink } from "../../api/links";
import type { Link } from "../../api/types";
import { Card, ConfirmDialog, CopyButton, useToast } from "../shared";
import { ActiveToggle } from "./ActiveToggle";
import styles from "./LinkHeader.module.css";

export interface LinkHeaderProps {
  link: Link;
}

/**
 * Заголовок страницы деталей ссылки: shortUrl + copy, inline-редактируемый
 * title (коммитится по blur/Enter), toggle активности, удаление через
 * `ConfirmDialog` с переходом на `/links` после успеха. Мутации PATCH/DELETE
 * инвалидируют `['links']` и `['stats']` (см. `api/links.ts`).
 */
export function LinkHeader({ link }: LinkHeaderProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const updateLink = useUpdateLink(link.id);
  const deleteLink = useDeleteLink();

  const [titleDraft, setTitleDraft] = useState(link.title ?? "");
  const [isDeleteOpen, setDeleteOpen] = useState(false);

  // Ресинхронизация черновика при смене ссылки (навигация /links/:id →
  // /links/:otherId без размонтирования) или при обновлении title извне
  // (успех мутации, refetch после инвалидации).
  useEffect(() => {
    setTitleDraft(link.title ?? "");
  }, [link.id, link.title]);

  function commitTitle() {
    const trimmed = titleDraft.trim();
    const current = link.title ?? "";
    if (trimmed === current) return;

    updateLink.mutate(
      { title: trimmed.length > 0 ? trimmed : null },
      {
        onError: () => {
          showError("Не удалось обновить название");
          setTitleDraft(link.title ?? "");
        },
      },
    );
  }

  function handleToggleActive() {
    updateLink.mutate(
      { isActive: !link.isActive },
      { onError: () => showError("Не удалось изменить статус ссылки") },
    );
  }

  function handleDelete() {
    deleteLink.mutate(link.id, {
      onSuccess: () => {
        showSuccess("Ссылка удалена");
        navigate("/links");
      },
      onError: () => {
        showError("Не удалось удалить ссылку");
        setDeleteOpen(false);
      },
    });
  }

  return (
    <Card data-testid="link-header">
      <div className={styles.row}>
        <span className={styles.shortUrl} data-testid="link-header-short-url">
          {link.shortUrl}
        </span>
        <CopyButton value={link.shortUrl} data-testid="link-header-copy-button" />
        {link.isActive ? null : <span className={styles.badge}>отключена</span>}
        <span className={styles.spacer} />
        <ActiveToggle
          isActive={link.isActive}
          disabled={updateLink.isPending}
          label={link.isActive ? "Отключить ссылку" : "Включить ссылку"}
          data-testid="link-header-active-toggle"
          onToggle={handleToggleActive}
        />
        <button
          type="button"
          className="lb-btn lb-btn--danger"
          data-testid="link-header-delete-button"
          onClick={() => setDeleteOpen(true)}
        >
          Удалить
        </button>
      </div>

      <input
        className={`lb-input ${styles.titleInput}`}
        data-testid="link-header-title-input"
        aria-label="Название ссылки"
        placeholder="Без названия"
        value={titleDraft}
        maxLength={255}
        onChange={(event) => setTitleDraft(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setTitleDraft(link.title ?? "");
            event.currentTarget.blur();
          }
        }}
      />

      <p className={styles.originalUrl}>{link.originalUrl}</p>

      <ConfirmDialog
        open={isDeleteOpen}
        title="Удалить ссылку?"
        description="Действие необратимо: удалятся и все клики по ней."
        danger
        confirmLabel="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Card>
  );
}

export default LinkHeader;
