import type { Key, ReactNode } from "react";
import { Spinner } from "./Spinner";
import { cx } from "./classNames";
import styles from "./Table.module.css";

export type TableColumnAlign = "left" | "center" | "right";

export interface TableColumn<Row> {
  /** Уникальный ключ колонки (используется как React key заголовка/ячеек). */
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: TableColumnAlign;
  /** CSS-ширина колонки (например, `"12rem"`), опционально. */
  width?: string;
}

export interface TableProps<Row> {
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => Key;
  /**
   * Статичный testid, проставляемый на КАЖДУЮ строку (по конвенции реестра
   * data-testid — `links-table-row`, `top-links-table-row` и т.п.), строки
   * различаются атрибутом `data-id` (см. `getRowDataId`), а не индексом.
   */
  rowTestId?: string;
  /** Значение атрибута `data-id` на строке — обычно `row.id`. */
  getRowDataId?: (row: Row) => string | number;
  /** Если задан — строка кликабельна (курсор, hover, Enter/Space с клавиатуры). */
  onRowClick?: (row: Row) => void;
  isLoading?: boolean;
  isError?: boolean;
  /** Содержимое строки состояния загрузки. По умолчанию `<Spinner />`. */
  loadingContent?: ReactNode;
  /** Содержимое строки состояния ошибки — обычно `<ErrorState data-testid="..." />`. */
  errorContent?: ReactNode;
  /** Содержимое строки пустого состояния — обычно `<EmptyState data-testid="..." />`. */
  emptyContent?: ReactNode;
  /** Текст `<caption>` для скринридеров/доступности. */
  caption?: string;
  "data-testid"?: string;
}

/**
 * Обобщённая таблица со встроенными состояниями loading/error/empty.
 * Конкретные data-testid для этих состояний намеренно НЕ зашиты внутрь —
 * их передаёт вызывающий компонент через `loadingContent`/`errorContent`/
 * `emptyContent`, потому что один и тот же контракт (`links-table-empty-state`
 * vs просто отсутствие теста для TopLinksTable) отличается по странице.
 *
 * @example
 * <Table<Link>
 *   data-testid="links-table"
 *   columns={columns}
 *   rows={data?.items ?? []}
 *   getRowKey={(row) => row.id}
 *   rowTestId="links-table-row"
 *   getRowDataId={(row) => row.id}
 *   onRowClick={(row) => navigate(`/links/${row.id}`)}
 *   isLoading={isLoading}
 *   isError={isError}
 *   errorContent={<ErrorState data-testid="links-table-error-state" onAction={refetch} />}
 *   emptyContent={<EmptyState data-testid="links-table-empty-state" title="Ссылок пока нет" />}
 * />
 */
export function Table<Row>({
  columns,
  rows,
  getRowKey,
  rowTestId,
  getRowDataId,
  onRowClick,
  isLoading = false,
  isError = false,
  loadingContent,
  errorContent,
  emptyContent,
  caption,
  "data-testid": dataTestId,
}: TableProps<Row>) {
  const columnCount = columns.length;

  return (
    <table className={styles.table} data-testid={dataTestId}>
      {caption !== undefined ? <caption className={styles.caption}>{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className={cx(styles.headCell, column.align !== undefined && styles[`align-${column.align}`])}
              style={column.width !== undefined ? { width: column.width } : undefined}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <tr>
            <td className={styles.stateCell} colSpan={columnCount}>
              {loadingContent ?? <Spinner data-testid={dataTestId !== undefined ? `${dataTestId}-loading` : "table-loading"} />}
            </td>
          </tr>
        ) : isError ? (
          <tr>
            <td className={styles.stateCell} colSpan={columnCount}>
              {errorContent}
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td className={styles.stateCell} colSpan={columnCount}>
              {emptyContent}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={getRowKey(row)}
              data-testid={rowTestId}
              data-id={getRowDataId ? String(getRowDataId(row)) : undefined}
              className={cx(styles.row, onRowClick !== undefined && styles.clickableRow)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(styles.cell, column.align !== undefined && styles[`align-${column.align}`])}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default Table;
