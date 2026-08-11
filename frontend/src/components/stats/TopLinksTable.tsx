import { useNavigate } from "react-router";
import { useTopLinks } from "../../api/stats";
import type { TopLinkItem } from "../../api/types";
import { formatNumber } from "../../lib/format";
import { Card, EmptyState, ErrorState, Table, type TableColumn } from "../shared";

const COLUMNS: readonly TableColumn<TopLinkItem>[] = [
  { key: "code", header: "Код", render: (item) => item.code },
  { key: "title", header: "Название", render: (item) => item.title ?? "—" },
  { key: "clicks", header: "Клики", align: "right", render: (item) => formatNumber(item.clicks) },
];

const TOP_LINKS_LIMIT = 10;

/**
 * Топ-10 ссылок за период (по умолчанию — последние 30 дней, как в
 * контракте `GET /api/stats/top`). Клик по строке ведёт на `/links/:id`.
 */
export function TopLinksTable() {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useTopLinks({ limit: TOP_LINKS_LIMIT });

  return (
    <Card title="Топ ссылок">
      <Table<TopLinkItem>
        data-testid="top-links-table"
        columns={COLUMNS}
        rows={data?.items ?? []}
        getRowKey={(item) => item.id}
        rowTestId="top-links-table-row"
        getRowDataId={(item) => item.id}
        onRowClick={(item) => navigate(`/links/${item.id}`)}
        isLoading={isPending}
        isError={isError}
        errorContent={
          <ErrorState message="Не удалось загрузить топ ссылок" onAction={() => void refetch()} />
        }
        emptyContent={
          <EmptyState title="Пока нет данных" description="За этот период кликов не было" />
        }
      />
    </Card>
  );
}

export default TopLinksTable;
