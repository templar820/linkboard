import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { ApiError } from "../api/client";
import { useLink } from "../api/links";
import { useLinkDailyStats } from "../api/stats";
import { LinkHeader } from "../components/links/LinkHeader";
import { EmptyState, ErrorState, Spinner, type DateRangeValue } from "../components/shared";
import { ClicksChart } from "../components/stats/ClicksChart";
import { ReferersTable } from "../components/stats/ReferersTable";
import { UserAgentsPanel } from "../components/stats/UserAgentsPanel";
import { applyRangeToSearchParams, parseRangeSearchParams } from "../lib/dateRange";
import styles from "./LinkDetailsPage.module.css";

/**
 * Детали ссылки (`/links/:id`): заголовок с действиями, график кликов
 * (2 линии — клики + уникальные), источники переходов, срез по UA.
 */
export function LinkDetailsPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const linkId = idParam !== undefined ? Number(idParam) : Number.NaN;
  const isValidId = Number.isFinite(linkId);

  const [searchParams, setSearchParams] = useSearchParams();
  const range = useMemo(() => parseRangeSearchParams(searchParams), [searchParams]);

  const linkQuery = useLink(isValidId ? linkId : undefined);
  const dailyStats = useLinkDailyStats(isValidId ? linkId : undefined, { from: range.from, to: range.to });

  function handleRangeChange(next: DateRangeValue) {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        applyRangeToSearchParams(params, next);
        return params;
      },
      { replace: true },
    );
  }

  if (!isValidId) {
    return (
      <div className={styles.page}>
        <EmptyState title="Ссылка не найдена" description="Некорректный адрес страницы." />
      </div>
    );
  }

  if (linkQuery.isPending) {
    return (
      <div className={styles.page}>
        <div className={styles.stateBox}>
          <Spinner />
        </div>
      </div>
    );
  }

  if (linkQuery.isError || !linkQuery.data) {
    const isNotFound = linkQuery.error instanceof ApiError && linkQuery.error.code === "LINK_NOT_FOUND";
    return (
      <div className={styles.page}>
        {isNotFound ? (
          <EmptyState title="Ссылка не найдена" description="Возможно, она была удалена." />
        ) : (
          <ErrorState message="Не удалось загрузить ссылку" onAction={() => void linkQuery.refetch()} />
        )}
      </div>
    );
  }

  const link = linkQuery.data;

  return (
    <div className={styles.page}>
      <LinkHeader link={link} />
      <ClicksChart
        data={dailyStats.data}
        isLoading={dailyStats.isPending}
        isError={dailyStats.isError}
        onRetry={() => void dailyStats.refetch()}
        range={range}
        onRangeChange={handleRangeChange}
        metrics={["clicks", "uniqueVisitors"]}
      />
      <ReferersTable linkId={link.id} />
      <UserAgentsPanel linkId={link.id} />
    </div>
  );
}

export default LinkDetailsPage;
