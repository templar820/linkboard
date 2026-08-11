import { useParams } from "react-router";

/**
 * Детали ссылки — `/links/:id`. Заглушка T6: структура и `data-testid`
 * из реестра (docs/api/contract.md, разделы 9.3-9.4) уже на месте,
 * наполнение `LinkHeader`/`ClicksChart`/`ReferersTable`/`UserAgentsPanel`
 * данными из `GET /api/links/:id` и `.../stats/*` — задача T19.
 */
export function LinkDetailsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>Ссылка #{id}</h1>
      <div data-testid="link-header">Заголовок ссылки (shortUrl, edit, toggle, delete) — TODO T19</div>
      <div data-testid="clicks-chart">График кликов и уникальных посетителей — TODO T19</div>
      <div data-testid="referers-table">Таблица источников переходов — TODO T19</div>
      <div data-testid="user-agents-browsers-chart">Срез по браузерам — TODO T19</div>
      <div data-testid="user-agents-devices-chart">Срез по устройствам — TODO T19</div>
    </div>
  );
}

export default LinkDetailsPage;
