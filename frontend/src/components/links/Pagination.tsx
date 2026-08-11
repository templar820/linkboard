import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Пагинация списка ссылок. Состояние страницы держит вызывающая страница (URL search params). */
export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <nav className={styles.root} data-testid="links-pagination" aria-label="Пагинация списка ссылок">
      <button
        type="button"
        className="lb-btn lb-btn--secondary"
        data-testid="links-pagination-prev"
        disabled={!canGoPrev}
        onClick={() => onPageChange(page - 1)}
      >
        ← Назад
      </button>
      <span className={styles.info} data-testid="links-pagination-page-info">
        Страница {page} из {totalPages}
      </span>
      <button
        type="button"
        className="lb-btn lb-btn--secondary"
        data-testid="links-pagination-next"
        disabled={!canGoNext}
        onClick={() => onPageChange(page + 1)}
      >
        Далее →
      </button>
    </nav>
  );
}

export default Pagination;
