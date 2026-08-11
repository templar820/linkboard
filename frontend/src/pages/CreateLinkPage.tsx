/**
 * Создание ссылки — `/links/new`. Заглушка T6: структура и `data-testid`
 * из реестра (docs/api/contract.md, раздел 9.1) уже на месте, наполнение
 * `LinkForm` (POST /api/links, обработка CODE_TAKEN/VALIDATION_ERROR) —
 * задача T17.
 */
export function CreateLinkPage() {
  return (
    <div>
      <h1>Новая ссылка</h1>
      <div data-testid="link-form">Форма создания ссылки — TODO T17</div>
    </div>
  );
}

export default CreateLinkPage;
