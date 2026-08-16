import { Link } from "react-router";
import { useUpdateLink } from "../../api/links";
import type { Link as LinkModel } from "../../api/types";
import { formatDateTime, formatNumber } from "../../lib/format";
import { CopyButton, EmptyState, ErrorState, Table, useToast, type TableColumn } from "../shared";
import { ActiveToggle } from "./ActiveToggle";
import styles from "./LinksTable.module.css";

export interface LinksTableProps {
  links: readonly LinkModel[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Отличает «пустая БД» от «нет результатов поиска» — разный текст EmptyState. */
  hasSearch: boolean;
}

/** Переключатель `isActive` в строке — своя мини-компонента, т.к. вызывает
 * `useUpdateLink(link.id)` (хук не может быть вызван внутри `render()` колонки). */
function ActiveToggleCell({ link }: { link: LinkModel }) {
  const updateLink = useUpdateLink(link.id);
  const { showError } = useToast();

  return (
    <ActiveToggle
      isActive={link.isActive}
      disabled={updateLink.isPending}
      label={link.isActive ? `Отключить ссылку ${link.code}` : `Включить ссылку ${link.code}`}
      data-testid="links-table-row-active-toggle"
      onToggle={() => {
        updateLink.mutate(
          { isActive: !link.isActive },
          { onError: () => showError("Не удалось изменить статус ссылки") },
        );
      }}
    />
  );
}

const COLUMNS: readonly TableColumn<LinkModel>[] = [
  {
    key: "code",
    header: "Код",
    render: (link) => (
      <Link to={`/links/${link.id}`} className={styles.codeLink} data-testid="links-table-row-code">
        {link.code}
      </Link>
    ),
  },
  {
    key: "copy",
    header: "",
    render: (link) => <CopyButton value={link.shortUrl} data-testid="links-table-row-copy-button" />,
  },
  {
    key: "originalUrl",
    header: "URL",
    render: (link) => (
      <span className={styles.urlCell} title={link.originalUrl}>
        {link.originalUrl}
      </span>
    ),
  },
  {
    key: "title",
    header: "Название",
    render: (link) => link.title ?? "—",
  },
  {
    key: "clicksCount",
    header: "Клики",
    align: "right",
    render: (link) => formatNumber(link.clicksCount),
  },
  {
    key: "createdAt",
    header: "Создана",
    render: (link) => formatDateTime(link.createdAt),
  },
  {
    key: "active",
    header: "Активна",
    align: "center",
    render: (link) => <ActiveToggleCell link={link} />,
  },
];

/**
 * Таблица ссылок (`/links`). Код — ссылка на `LinkDetailsPage`, отдельная
 * `CopyButton`, toggle активности мутирует `PATCH /api/links/:id` напрямую.
 * Состояния loading/error/empty — через встроенные в `Table` слоты.
 */
export function LinksTable({ links, isLoading, isError, onRetry, hasSearch }: LinksTableProps) {
  return (
    <Table<LinkModel>
      data-testid="links-table"
      columns={COLUMNS}
      rows={links}
      getRowKey={(link) => link.id}
      isLoading={isLoading}
      isError={isError}
      errorContent={
        <ErrorState
          data-testid="links-table-error-state"
          message="Не удалось загрузить список ссылок"
          onAction={onRetry}
        />
      }
      emptyContent={
        hasSearch ? (
          <EmptyState
            data-testid="links-table-empty-state"
            title="Ничего не найдено"
            description="Попробуйте изменить условия поиска"
          />
        ) : (
          <EmptyState
            data-testid="links-table-empty-state"
            title="Ссылок пока нет"
            description="Создайте первую короткую ссылку"
            action={
              <Link className="lb-btn lb-btn--primary" to="/links/new">
                + Ссылка
              </Link>
            }
          />
        )
      }
    />
  );
}

export default LinksTable;
