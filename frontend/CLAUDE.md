# frontend — инварианты

Admin-panel на :3000. Контракт API — `docs/api/contract.md` (заморожен). Дизайн-система — `docs/design/ui-kit.md`.

## Стек
- Vite 6 + React 19, **`react-router` v7 в library mode** — пакета `react-router-dom` в проекте нет, импортировать из него нельзя.
- TanStack Query v5, recharts.
- vitest 3 + jsdom + @testing-library + msw. `npm test` = `vitest run`, не watch.
- Vite: порт 3000, `host: true`, `strictPort` — иначе порт не пробрасывается из контейнера.

## Состояние
- **Стейт-менеджера нет и не заводить.** Серверные данные — TanStack Query, фильтры/пагинация/период — URL search params (нужно для шаринга ссылки и кнопки «назад»).
- Мутации инвалидируют ключи `['links']` и `['stats']`. Статистика — `staleTime: 60_000`.

## API-слой
- Компоненты **не знают про конверт** `{ data, error }`: `apiClient` (`src/api/client.ts`) разворачивает его и бросает типизированный `ApiError` с полями `code`, `message`, `details`, `status`. Сетевой сбой и ответ не в форме конверта → `NETWORK_ERROR`.
- `src/api/types.ts` синхронизирован с `docs/api/types.ts`. В одностороннем порядке не править: файл скопирован, потому что в Docker копируется только контекст `./frontend`.

## Тесты и селекторы
- **msw только в тестах.** В рантайме (`main.tsx`) не подключать — это критерий приёмки спринта. Проверка: `grep msw dist/assets/*.js` после `npm run build` должен быть пуст.
- `data-testid` берутся из реестра `docs/api/contract.md`, раздел 9. Не переименовывать и не выдумывать свои — по ним пишутся Playwright-тесты в `e2e-tests/`. Селекторы по CSS-классам в тестах запрещены.

## UI
- Переиспользуемые компоненты — `src/components/shared/` (`Card`, `Table`, `Spinner`, `ErrorState`, `EmptyState`, `CopyButton`, `ConfirmDialog`, `Toast`, `DateRangePicker`), токены — `src/styles/tokens.css`. Сначала смотреть, что уже есть, и только потом писать своё.
- Только обычный CSS и CSS Modules. **Новых npm-зависимостей не добавлять** без явной необходимости: сборка идёт через `npm ci`, расхождение lock-файла ломает образ.
- Каждая страница обязана иметь состояния loading / empty / error.
- ⚠️ `ToastProvider` написан, но ещё не обёрнут вокруг `<App/>` в `main.tsx` — подключить при первом использовании тостов.

## TypeScript
Строгий режим с `exactOptionalPropertyTypes` и `noUncheckedIndexedAccess`: не присваивать явный `undefined` опциональному полю — собирать объект условно.
