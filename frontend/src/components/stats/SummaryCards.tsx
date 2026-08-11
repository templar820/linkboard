import { useSummary } from "../../api/stats";
import type { StatsSummary } from "../../api/types";
import { formatNumber } from "../../lib/format";
import { Card, ErrorState, Spinner } from "../shared";
import styles from "./SummaryCards.module.css";

interface SummaryCardDef {
  key: keyof StatsSummary;
  label: string;
  testId: string;
}

const CARDS: readonly SummaryCardDef[] = [
  { key: "totalLinks", label: "Всего ссылок", testId: "summary-card-total-links" },
  { key: "activeLinks", label: "Активных ссылок", testId: "summary-card-active-links" },
  { key: "totalClicks", label: "Всего кликов", testId: "summary-card-total-clicks" },
  { key: "clicksToday", label: "Кликов сегодня", testId: "summary-card-clicks-today" },
];

/** Четыре карточки сводки дашборда — `GET /api/stats/summary`. */
export function SummaryCards() {
  const { data, isPending, isError, refetch } = useSummary();

  if (isError) {
    return <ErrorState message="Не удалось загрузить сводку" onAction={() => void refetch()} />;
  }

  return (
    <div className={styles.grid}>
      {CARDS.map((card) => (
        <Card key={card.key} data-testid={card.testId} padding="lg">
          {isPending || !data ? (
            <Spinner data-testid={`${card.testId}-loading`} />
          ) : (
            <>
              <p className={styles.label}>{card.label}</p>
              <p className={styles.value}>{formatNumber(data[card.key])}</p>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

export default SummaryCards;
