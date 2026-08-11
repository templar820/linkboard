import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { LinkSortField, SortOrder } from "../../api/types";
import styles from "./LinksToolbar.module.css";

export interface LinksToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: LinkSortField;
  order: SortOrder;
  onSortChange: (sort: LinkSortField, order: SortOrder) => void;
}

interface SortOption {
  value: string;
  label: string;
  sort: LinkSortField;
  order: SortOrder;
}

const SORT_OPTIONS: readonly SortOption[] = [
  { value: "created_at-desc", label: "Сначала новые", sort: "created_at", order: "desc" },
  { value: "created_at-asc", label: "Сначала старые", sort: "created_at", order: "asc" },
  { value: "clicks_count-desc", label: "Сначала популярные", sort: "clicks_count", order: "desc" },
  { value: "clicks_count-asc", label: "Сначала непопулярные", sort: "clicks_count", order: "asc" },
];

const DEBOUNCE_MS = 300;

/**
 * Тулбар списка ссылок: поиск (debounce 300мс), сортировка, кнопка создания.
 * Состояние — снаружи, в URL search params (`LinksPage`); этот компонент —
 * презентационный, кроме локального состояния текста поля поиска, нужного
 * только для debounce.
 */
export function LinksToolbar({ search, onSearchChange, sort, order, onSortChange }: LinksToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const onSearchChangeRef = useRef(onSearchChange);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Внешнее изменение search (навигация «назад», прямой заход по URL) —
  // синхронизируем локальный черновик, не дожидаясь debounce.
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (localSearch === search) return undefined;
    const timer = setTimeout(() => {
      onSearchChangeRef.current(localSearch);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localSearch, search]);

  const sortValue = `${sort}-${order}`;

  return (
    <div className={styles.toolbar} data-testid="links-toolbar">
      <input
        type="search"
        className={`lb-input ${styles.search}`}
        data-testid="links-search-input"
        placeholder="Поиск по названию, коду или URL"
        aria-label="Поиск ссылок"
        value={localSearch}
        onChange={(event) => setLocalSearch(event.target.value)}
      />
      <select
        className={`lb-input ${styles.sort}`}
        data-testid="links-sort-select"
        aria-label="Сортировка"
        value={sortValue}
        onChange={(event) => {
          const option = SORT_OPTIONS.find((candidate) => candidate.value === event.target.value);
          if (option) onSortChange(option.sort, option.order);
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.spacer} />
      <Link className="lb-btn lb-btn--primary" to="/links/new" data-testid="links-create-button">
        + Ссылка
      </Link>
    </div>
  );
}

export default LinksToolbar;
