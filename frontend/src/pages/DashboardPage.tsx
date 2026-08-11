/**
 * Дашборд — `/`. Заглушка T6: структура и `data-testid` из реестра
 * (docs/api/contract.md, раздел 9.3) уже на месте, наполнение данными
 * из `GET /api/stats/summary|daily|top` — задача T18.
 */
export function DashboardPage() {
  return (
    <div>
      <h1>Дашборд</h1>
      <div data-testid="summary-card-total-links">Всего ссылок — TODO T18</div>
      <div data-testid="summary-card-active-links">Активных ссылок — TODO T18</div>
      <div data-testid="summary-card-total-clicks">Всего кликов — TODO T18</div>
      <div data-testid="summary-card-clicks-today">Кликов сегодня — TODO T18</div>
      <div data-testid="clicks-chart">График кликов — TODO T18</div>
      <div data-testid="top-links-table">Топ ссылок — TODO T18</div>
    </div>
  );
}

export default DashboardPage;
