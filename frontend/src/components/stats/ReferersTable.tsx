import { useReferers } from "../../api/stats";
import type { RefererItem } from "../../api/types";
import { formatNumber } from "../../lib/format";
import { Card, EmptyState, ErrorState, Table, type TableColumn } from "../shared";

export interface ReferersTableProps {
  linkId: number;
}

const COLUMNS: readonly TableColumn<RefererItem>[] = [
  { key: "referer", header: "Источник", render: (item) => item.referer },
  { key: "clicks", header: "Клики", align: "right", render: (item) => formatNumber(item.clicks) },
];

/** Топ источников переходов ссылки — `GET /api/links/:id/stats/referers`. */
export function ReferersTable({ linkId }: ReferersTableProps) {
  const { data, isPending, isError, refetch } = useReferers(linkId);

  return (
    <Card title="Источники переходов">
      <Table<RefererItem>
        data-testid="referers-table"
        columns={COLUMNS}
        rows={data?.items ?? []}
        getRowKey={(item) => item.referer}
        rowTestId="referers-table-row"
        isLoading={isPending}
        isError={isError}
        errorContent={
          <ErrorState message="Не удалось загрузить источники переходов" onAction={() => void refetch()} />
        }
        emptyContent={<EmptyState title="Пока нет данных" description="Переходов по ссылке ещё не было" />}
      />
    </Card>
  );
}

export default ReferersTable;
