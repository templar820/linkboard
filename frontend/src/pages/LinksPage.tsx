/**
 * Список ссылок — `/links`. Заглушка T6: структура и `data-testid` из
 * реестра (docs/api/contract.md, раздел 9.2) уже на месте, наполнение
 * `LinksToolbar`/`LinksTable`/`Pagination` данными из `GET /api/links` —
 * задача T17.
 */
export function LinksPage() {
  return (
    <div>
      <h1>Ссылки</h1>
      <div data-testid="links-toolbar">Тулбар (поиск/сортировка/создание) — TODO T17</div>
      <div data-testid="links-table">Таблица ссылок — TODO T17</div>
      <div data-testid="links-pagination">Пагинация — TODO T17</div>
    </div>
  );
}

export default LinksPage;
