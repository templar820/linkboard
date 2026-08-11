import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useLinks } from "../api/links";
import type { LinkSortField, ListLinksParams, SortOrder } from "../api/types";
import { LinksTable } from "../components/links/LinksTable";
import { LinksToolbar } from "../components/links/LinksToolbar";
import { Pagination } from "../components/links/Pagination";
import styles from "./LinksPage.module.css";

const DEFAULT_LIMIT = 20;

function parseListParams(searchParams: URLSearchParams): Required<Pick<ListLinksParams, "page" | "limit">> &
  Pick<ListLinksParams, "search" | "sort" | "order"> {
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const search = searchParams.get("search") ?? "";
  const sortRaw = searchParams.get("sort");
  const sort: LinkSortField = sortRaw === "clicks_count" ? "clicks_count" : "created_at";
  const orderRaw = searchParams.get("order");
  const order: SortOrder = orderRaw === "asc" ? "asc" : "desc";

  return {
    page,
    limit: DEFAULT_LIMIT,
    ...(search.length > 0 ? { search } : {}),
    sort,
    order,
  };
}

/**
 * Список ссылок (`/links`). Состояние поиска/сортировки/страницы живёт в URL
 * search params (шаринг ссылки, кнопка «назад» — см. frontend/CLAUDE.md).
 */
export function LinksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseListParams(searchParams), [searchParams]);
  const linksQuery = useLinks(params);

  function patchParams(patch: Record<string, string | undefined>, resetPage = false) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value.length === 0) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        if (resetPage) next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  const links = linksQuery.data?.items ?? [];
  const page = linksQuery.data?.page ?? params.page;
  const limit = linksQuery.data?.limit ?? params.limit;
  const total = linksQuery.data?.total ?? 0;

  return (
    <div className={styles.page}>
      <h1>Ссылки</h1>
      <LinksToolbar
        search={params.search ?? ""}
        onSearchChange={(value) => patchParams({ search: value }, true)}
        sort={params.sort ?? "created_at"}
        order={params.order ?? "desc"}
        onSortChange={(sort, order) => patchParams({ sort, order })}
      />
      <LinksTable
        links={links}
        isLoading={linksQuery.isPending}
        isError={linksQuery.isError}
        onRetry={() => void linksQuery.refetch()}
        hasSearch={(params.search ?? "").length > 0}
      />
      <Pagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={(nextPage) => patchParams({ page: nextPage === 1 ? undefined : String(nextPage) })}
      />
    </div>
  );
}

export default LinksPage;
