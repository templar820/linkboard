# UI-kit Linkboard admin-panel

Статус: T8 фазы 1 спринта (`sprints/11-08/sprint-plan.md`). Это ТЗ для T17–T19
(наполнение страниц данными), не маркетинговый документ. Здесь фиксируется
публичный API дизайн-системы: где лежат токены, какие компоненты доступны,
какие пропсы у них есть и какие `data-testid` они поддерживают.

Технологии: **только CSS-переменные + CSS Modules** (никаких новых
npm-зависимостей — Tailwind/MUI/styled-components/shadcn в проекте нет и не
появится, см. `CLAUDE.md`). Компоненты — обычный React 19 + TypeScript,
собираются под строгими настройками `frontend/tsconfig.app.json`
(`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).

---

## 1. Токены

### 1.1. Где лежат и как подключены

- `frontend/src/styles/tokens.css` — все CSS custom properties (`:root { --... }`).
- `frontend/src/styles/global.css` — reset/normalize, типографика, фокус-стили,
  импортирует `tokens.css` первой строкой (`@import "./tokens.css";`).
- `frontend/src/main.tsx` импортирует **только** `global.css` — этого
  достаточно, токены приходят транзитивно.

Компоненты **не должны** использовать сырые hex/px — только
`var(--...)`. Если нужного токена нет — его нужно добавить в `tokens.css`,
а не заводить локальную константу в компоненте.

### 1.2. Каталог токенов

| Группа | Примеры переменных | Назначение |
|---|---|---|
| Нейтральная палитра | `--color-neutral-50` … `--color-neutral-900` | база для текста/границ/фонов (slate) |
| Акцент | `--color-accent` (=600), `--color-accent-hover` (=700), `--color-accent-subtle-bg`/`-border` | основной синий: ссылки, primary-кнопки, активный пункт навигации, линия «клики» на графике |
| Состояния | `--color-success`/`-bg`/`-border`/`-text`, `--color-warning-*`, `--color-danger*` | success/warning/danger — бейджи, тосты, ошибки форм |
| Семантика поверхностей | `--color-bg`, `--color-surface`, `--color-border`, `--color-border-strong` | фон страницы vs фон карточки/таблицы, границы |
| Текст | `--color-text-primary/secondary/tertiary/disabled/inverse/link` | иерархия текста |
| Фокус | `--color-focus-ring` | обводка `:focus-visible` |
| Типографика | `--font-family-sans`, `--font-family-mono`, `--font-size-xs…2xl`, `--line-height-*`, `--font-weight-*` | шрифты, размеры (база 14px), веса |
| Отступы | `--space-0…16` (шкала 4px) | все margin/padding/gap |
| Радиусы | `--radius-sm/md/lg/xl/full` | 4/8/12/16px/круг |
| Тени | `--shadow-sm/md/lg` | карточки, диалоги, тосты |
| Переходы | `--transition-fast/base/slow`, `--easing-standard` | 120/180/260ms |
| Z-индексы | `--z-sticky/dropdown/overlay/modal/toast` | единая шкала наложений |
| Layout | `--layout-sidebar-width` (240px), `--layout-content-max-width` (1200px), `--layout-content-padding` | размеры каркаса `Layout`/`Sidebar` |
| Графики | см. раздел 5 | палитра для recharts |

Брейкпоинты для media-запросов (CSS custom properties нельзя использовать
внутри `@media`, поэтому это просто соглашение, не переменные):
`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.

### 1.3. Доступность цвета (WCAG AA)

- `--color-text-primary` (neutral-900) и `--color-text-secondary` (neutral-600)
  на белом фоне (`--color-surface`) дают контраст ≫ 4.5:1 — безопасны для
  любого основного текста.
- `--color-text-tertiary` (neutral-500) — контраст ≈ AA-порог (4.5:1);
  использовать только для вспомогательного текста от 14px, не для мелких
  подписей < 12px.
- `--color-accent` (accent-600) на белом — проходит AA и как текст/ссылка,
  и как фон primary-кнопки с белым текстом (`--color-text-inverse`).
- `--color-danger` (danger-600) аналогично проходит AA как фон
  danger-кнопки с белым текстом.
- **Warning — исключение.** Amber с белым текстом не проходит AA, поэтому
  warning **никогда** не рендерится как заливка кнопки с белым текстом —
  только как светлый фон (`--color-warning-bg`) с тёмным текстом
  (`--color-warning-text`, contrast ≥ 4.5:1). Если нужна активная
  warning-кнопка — используйте danger или secondary с иконкой предупреждения.
- Фокус: `--color-focus-ring` = accent-600, всегда рисуется поверх
  `:focus-visible` с `outline-offset: 2px` — виден на любом фоне каркаса.

---

## 2. Глобальные стили

`frontend/src/styles/global.css` даёт:

- Box-sizing reset, снятие дефолтных отступов у заголовков/списков.
- Базовую типографику `body`/`h1`–`h3`/`small`/`code`.
- Ссылки (`a`) — цвет `--color-text-link`, подчёркивание на hover.
- **Фокус-стили** (обязательное требование доступности): `:focus { outline: none }`
  + `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px }`.
  Мышиный клик не показывает кольцо, клавиатурная навигация — показывает.
- Класс `.visually-hidden` — для текста, нужного только скринридерам
  (используется в `Spinner`).
- Утилитарные классы кнопок/полей общего назначения (не отдельные React-компоненты,
  переиспользуются в T17–T19 при вёрстке форм):
  - `.lb-btn` + модификаторы `.lb-btn--primary/--secondary/--danger/--ghost`
  - `.lb-input` (текстовые поля, `[aria-invalid="true"]` подсвечивает границу красным)

---

## 3. Каталог компонентов (`frontend/src/components/shared`)

Все компоненты экспортируются из `frontend/src/components/shared/index.ts`:

```ts
import {
  Card, Table, Spinner, ErrorState, EmptyState,
  CopyButton, ConfirmDialog, ToastProvider, useToast, DateRangePicker,
  computePresetRange, cx,
} from "../components/shared";
```

Общее правило пропсов: `data-testid?: string` там, где компонент участвует в
e2e/RTL-тестах — прокидывается как есть на корневой DOM-узел (или
используется как *префикс* для дочерних узлов — см. `ConfirmDialog`,
`DateRangePicker`).

### 3.1. `Card`

Контейнер-поверхность с опциональной шапкой (заголовок + правые actions).

```ts
interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg"; // default "md"
  className?: string;
  "data-testid"?: string;
}
```

```tsx
<Card title="Клики по дням" actions={<DateRangePicker .../>} data-testid="clicks-chart">
  <LineChart ... />
</Card>
```

### 3.2. `Table<Row>`

Обобщённая таблица с поддержкой loading/error/empty. Состояния передаются
готовыми узлами (обычно `<ErrorState/>`/`<EmptyState/>` с нужным по контракту
`data-testid`) — сама `Table` не хардкодит эти id, т.к. один и тот же
компонент используется разными страницами с разными требованиями к
data-testid (`links-table-*` vs `top-links-table` без отдельных id для
состояний).

```ts
interface TableColumn<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface TableProps<Row> {
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => React.Key;
  rowTestId?: string;                       // статичный testid на КАЖДУЮ строку
  getRowDataId?: (row: Row) => string | number; // -> атрибут data-id на строке
  onRowClick?: (row: Row) => void;          // делает строку кликабельной (курсор, Enter/Space)
  isLoading?: boolean;
  isError?: boolean;
  loadingContent?: ReactNode;               // default <Spinner/>
  errorContent?: ReactNode;                 // обычно <ErrorState data-testid="..."/>
  emptyContent?: ReactNode;                 // обычно <EmptyState data-testid="..."/>
  caption?: string;
  "data-testid"?: string;
}
```

Пример для `LinksTable` (T17), в точности покрывающий реестр `data-testid`
из `docs/api/contract.md` §9.2:

```tsx
<Table<Link>
  data-testid="links-table"
  columns={[
    { key: "code", header: "Код", render: (l) => (
        <span data-testid="links-table-row-code">{l.code}</span>
      ) },
    { key: "copy", header: "", render: (l) => (
        <CopyButton value={l.shortUrl} data-testid="links-table-row-copy-button" />
      ) },
    { key: "active", header: "Активна", render: (l) => (
        <Toggle data-testid="links-table-row-active-toggle" checked={l.isActive} onChange={...} />
      ) },
    // ...остальные колонки (originalUrl, title, clicksCount, createdAt)
  ]}
  rows={data?.items ?? []}
  getRowKey={(l) => l.id}
  rowTestId="links-table-row"
  getRowDataId={(l) => l.id}
  onRowClick={(l) => navigate(`/links/${l.id}`)}
  isLoading={isLoading}
  isError={isError}
  errorContent={<ErrorState data-testid="links-table-error-state" onAction={refetch} />}
  emptyContent={
    <EmptyState
      data-testid="links-table-empty-state"
      title="Ссылок пока нет"
      description="Создайте первую короткую ссылку"
      action={<Link className="lb-btn lb-btn--primary" to="/links/new">+ Ссылка</Link>}
    />
  }
/>
```

Для `TopLinksTable`/`ReferersTable` — тот же паттерн с `rowTestId="top-links-table-row"`
/ `"referers-table-row"`, `data-testid="top-links-table"` / `"referers-table"`.

### 3.3. `Spinner`

```ts
interface SpinnerProps {
  size?: "sm" | "md" | "lg"; // default "md"
  label?: string;            // default "Загрузка…", только для aria (visually-hidden)
  "data-testid"?: string;    // default "spinner"
}
```

`role="status"`, текст-описание скрыт визуально, но доступен скринридеру.

### 3.4. `ErrorState`

```ts
interface ErrorStateProps {
  title?: string;       // default "Не удалось загрузить данные"
  message?: string;     // default нейтральный текст
  actionLabel?: string; // default "Повторить"
  onAction?: () => void; // если не задан — кнопки действия нет
  "data-testid"?: string;
}
```

`role="alert"`. Используется как деградация при 500 от API (e2e-сценарий 10
архплана: `page.route` подменяет ответ, UI показывает `ErrorState` и не падает).

### 3.5. `EmptyState`

```ts
interface EmptyStateProps {
  title: string;         // обязателен
  description?: string;
  action?: ReactNode;    // например, кнопка/ссылка создания
  icon?: ReactNode;      // default emoji-заглушка 🔗
  "data-testid"?: string;
}
```

### 3.6. `CopyButton`

```ts
interface CopyButtonProps {
  value: string;          // что кладём в буфер (обычно link.shortUrl)
  label?: string;         // default "Копировать"
  copiedLabel?: string;   // default "Скопировано", держится 2с
  className?: string;
  "data-testid"?: string;
}
```

Копирует через `navigator.clipboard.writeText(value)`. Ошибка (нет разрешения/
несекьюрный контекст) — тихо проглатывается, состояние «скопировано» не
показывается (кнопка остаётся кликабельной для повтора). Именно этот
компонент проверяет e2e-сценарий 1 (`docs/plans/linkboard.md`, §5.4):
"copy кладёт её в буфер (проверка через navigator.clipboard с грантом разрешения)".

```tsx
<CopyButton value={link.shortUrl} data-testid="links-table-row-copy-button" />
<CopyButton value={link.shortUrl} data-testid="link-header-copy-button" />
```

### 3.7. `ConfirmDialog`

```ts
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string; // default "Подтвердить"
  cancelLabel?: string;  // default "Отмена"
  danger?: boolean;      // красная кнопка подтверждения (удаление)
  onConfirm: () => void;
  onCancel: () => void;
  "data-testid"?: string; // default "confirm-dialog"
}
```

Доступность:
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` на заголовок.
- **Фокус-трап**: при открытии фокус уходит на первый focusable-элемент
  внутри диалога; `Tab`/`Shift+Tab` циклически остаются внутри диалога.
- **Escape** закрывает диалог (`onCancel`).
- Клик по подложке (вне диалога) — тоже `onCancel`.
- При закрытии фокус возвращается на элемент, который был активен до открытия
  (обычно — кнопка-триггер).
- Рендерится через `createPortal` в `document.body` (не зависит от overflow
  родителя).

С дефолтным `data-testid="confirm-dialog"` даёт ровно те id, которых требует
реестр `docs/api/contract.md` §9.4: `confirm-dialog`,
`confirm-dialog-confirm-button`, `confirm-dialog-cancel-button`.

```tsx
<ConfirmDialog
  open={isDeleteOpen}
  title="Удалить ссылку?"
  description="Действие необратимо: удалятся и все клики по ней."
  danger
  confirmLabel="Удалить"
  onConfirm={handleDelete}
  onCancel={() => setDeleteOpen(false)}
/>
```

### 3.8. `Toast` (`ToastProvider` + `useToast`)

Контекст + хук показа уведомлений (успех/ошибка/инфо) с автоскрытием.

```ts
type ToastVariant = "success" | "error" | "info";

interface ToastContextValue {
  showToast: (message: string, options?: { variant?: ToastVariant; duration?: number }) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

function useToast(): ToastContextValue; // бросает Error вне <ToastProvider>
```

- Автоскрытие: 4000мс по умолчанию (`duration` переопределяем per-toast).
- `role="status"`/`aria-live="polite"` для success/info,
  `role="alert"`/`aria-live="assertive"` для error.
- Рендерится через `createPortal` в `document.body`, контейнер —
  `data-testid="toast-viewport"`, каждое уведомление — `data-testid="toast"`
  с атрибутом `data-variant="success|error|info"` для точечного таргетинга
  в тестах (`page.getByTestId("toast").filter({ hasText: "..." })` или
  `[data-testid="toast"][data-variant="error"]`).

**Куда монтировать провайдер.** T8 поставляет только компонент — он не
задействован автоматически, потому что правка `main.tsx` в этой задаче
ограничена одной строкой (импорт CSS, см. правила задачи T8 в
`sprints/11-08/sprint-plan.md`). Toast должен пережить `navigate()` после
успешного создания ссылки (LinkForm → `/links/:id`), поэтому
`<ToastProvider>` нужно обернуть вокруг `<App/>` **выше** `<Routes>`,
например в `main.tsx`:

```tsx
<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ToastProvider>
</QueryClientProvider>
```

Это делает первая задача, которой реально нужен `useToast()` — по плану
это **T17** (`LinkForm`: успех → toast + редирект на `/links/:id`).

```tsx
const { showSuccess, showError } = useToast();
// после успешного POST /api/links:
showSuccess("Ссылка создана");
// после сетевой ошибки формы:
showError("Не удалось создать ссылку, попробуйте ещё раз");
```

### 3.9. `DateRangePicker`

Переключатель периода: пресеты 7/30/90 дней + опциональный произвольный
диапазон. Используется `ClicksChart` на дашборде и на `LinkDetailsPage`.

```ts
type DateRangePreset = 7 | 30 | 90;

interface DateRangeValue {
  preset: DateRangePreset | "custom";
  from: string; // YYYY-MM-DD, UTC, включительно
  to: string;   // YYYY-MM-DD, UTC, включительно
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  presets?: readonly DateRangePreset[]; // default [7, 30, 90]
  allowCustom?: boolean;                // default true
  "data-testid"?: string;               // default "date-range-picker", см. ниже
}

// хелпер для вычисления { from, to } под конкретный пресет (UTC, включительно)
function computePresetRange(preset: DateRangePreset): { from: string; to: string };
```

**Как получить контрактные testid.** Реестр `docs/api/contract.md` §9.3
требует ровно `clicks-chart-period-7d` / `-30d` / `-90d` на кнопках графика.
`DateRangePicker` строит testid дочерних кнопок как
`` `${data-testid}-period-${preset}d` ``, поэтому `ClicksChart` должен
передать `data-testid="clicks-chart"` **в сам picker** (у `Card`/обёртки
графика может быть свой `data-testid="clicks-chart"` тоже — конфликта нет,
это разные DOM-узлы с одинаковым testid, что для Playwright разрешается
через `.first()`/более точный локатор, либо picker монтируется как
единственный источник этого testid, а обёртка `Card` — без своего testid):

```tsx
const [range, setRange] = useState<DateRangeValue>({ preset: 30, ...computePresetRange(30) });

<Card data-testid="clicks-chart">
  <DateRangePicker
    data-testid="clicks-chart"
    value={range}
    onChange={(next) => {
      setRange(next);
      // next.from / next.to — прокинуть в useQuery как query-параметры
    }}
  />
  <LineChart data={dailyStats?.points} ...>
    <Line dataKey="clicks" stroke="var(--chart-line-clicks)" />
    <Line dataKey="uniqueVisitors" stroke="var(--chart-line-unique)" strokeDasharray="4 3" />
  </LineChart>
</Card>
```

Это даёт кнопки `clicks-chart-period-7d`, `clicks-chart-period-30d`,
`clicks-chart-period-90d` ровно как того требует контракт. Для произвольного
периода дополнительно доступны `clicks-chart-period-custom`,
`clicks-chart-custom-from`, `clicks-chart-custom-to`.

Для generic-использования вне `ClicksChart` (если понадобится где-то ещё)
достаточно не передавать `data-testid` — тогда используется дефолт
`date-range-picker` + суффиксы.

---

## 4. Правила состояний loading/empty/error

Единый паттерн для любого блока, который тянет данные через react-query:

1. **Loading** — `<Spinner/>` (одиночный блок/карточка) или
   `<Table isLoading />` (таблица, спиннер в теле, шапка колонок остаётся
   видна). Не показывать один и тот же спиннер поверх уже отрендеренных
   старых данных при рефетче — react-query `isPending` (первая загрузка), а
   не `isFetching` (фоновый рефетч), должен управлять показом `Spinner`.
2. **Error** — `<ErrorState data-testid="..." onAction={refetch} />`.
   `onAction` — всегда `refetch` из react-query, а не `window.location.reload()`.
3. **Empty** — `<EmptyState data-testid="..." title="..." action={...} />`.
   Различать «данных нет в принципе» (например, пустая БД, e2e-сценарий 9) и
   «нет результатов по текущему фильтру» (поиск не дал совпадений) —
   разными `title`/`description`, но одним и тем же `data-testid`
   (реестр не различает эти случаи отдельным id).
4. Порядок проверки внутри компонента: `isError` **до** `rows.length === 0`
   (ошибка важнее пустого списка) — так же реализовано внутри `Table`.

---

## 5. Палитра графиков (recharts)

Компоненты `ClicksChart` (T18/T19) и `UserAgentsPanel` (T19) используют
только эти токены — не подбирать цвета вручную.

### 5.1. Линии кликов (`ClicksChart`, 2 линии: клики + уникальные)

| Токен | Значение | Назначение |
|---|---|---|
| `--chart-line-clicks` | `#2563eb` (accent-600) | линия «клики» |
| `--chart-line-unique` | `#f59e0b` (amber-500) | линия «уникальные посетители» |
| `--chart-grid` | `#e2e8f0` | сетка (`<CartesianGrid stroke="var(--chart-grid)"/>`) |
| `--chart-axis-text` | `#64748b` | подписи осей |
| `--chart-tooltip-bg` / `--chart-tooltip-text` | `#0f172a` / `#ffffff` | фон/текст тултипа |

Синий и янтарный выбраны специально как пара, различимая при дальтонизме
(в отличие от красно-зелёной или сине-фиолетовой пар). Дополнительно **не
полагаться только на цвет**: линия «уникальные» должна иметь другой
`strokeDasharray` (например, `"4 3"`), чтобы различие читалось и в
ч/б-печати, и людьми с нарушением цветовосприятия — обязательное требование
доступности для графиков.

### 5.2. Категориальная палитра (срезы: браузеры, устройства, referer'ы)

Фиксированный порядок, до 8 сегментов:

```
--chart-categorical-1: #2563eb  (blue)
--chart-categorical-2: #f59e0b  (amber)
--chart-categorical-3: #16a34a  (green)
--chart-categorical-4: #dc2626  (red)
--chart-categorical-5: #7c3aed  (violet)
--chart-categorical-6: #0891b2  (cyan)
--chart-categorical-7: #db2777  (pink)
--chart-categorical-8: #64748b  (neutral — «прочее»/bot/unknown, всегда последний)
```

Использование в `UserAgentsPanel` (пример для `Pie`/`Bar` из recharts):

```tsx
const CATEGORICAL = [1, 2, 3, 4, 5, 6, 7, 8].map(
  (i) => getComputedStyle(document.documentElement).getPropertyValue(`--chart-categorical-${i}`).trim(),
);
// либо захардкодить те же 8 hex-значений локально в компоненте, если
// вызывать getComputedStyle на каждый рендер нежелательно по перформансу —
// значения зафиксированы и синхронизированы с tokens.css.

<Pie data={browsers} dataKey="clicks" nameKey="name">
  {browsers.map((entry, index) => (
    <Cell key={entry.name} fill={CATEGORICAL[index % CATEGORICAL.length]} />
  ))}
</Pie>
```

Правило: сегмент «прочее»/неизвестное значение (`bot`, `unknown` из
`DeviceType`) всегда красится в `--chart-categorical-8` (нейтральный серый),
не в порядковый цвет из ряда — так он визуально не конкурирует с реальными
категориями.

---

## 6. Правила доступности (сводно)

- Все интерактивные элементы — реальные `<button>`/`<a>`/`<input>`, не `<div onClick>`.
- Видимый `:focus-visible` на всех интерактивных элементах (наследуется из `global.css`, ничего дополнительно делать не нужно, если используются нативные элементы или `.lb-btn`/`.lb-input`).
- `ConfirmDialog` — полноценный доступный модал (фокус-трап, Escape, `aria-modal`, возврат фокуса).
- `Toast` — `aria-live`, соответствующий важности (`polite` success/info, `assertive` error).
- `Spinner` — `role="status"` с текстовым описанием для скринридеров (визуально скрыт).
- `ErrorState` — `role="alert"`.
- Графики — различие не только по цвету (см. §5.1 про `strokeDasharray`); подписи/тултипы recharts обязательны (`<Tooltip/>`), не полагаться только на легенду.
- Контраст текста — см. §1.3; не использовать `--color-text-tertiary` для текста < 14px.
- `prefers-reduced-motion` учтён в `Spinner` (снижение частоты анимации); при добавлении новых анимаций в T17–T19 придерживаться того же паттерна.

---

## 7. Что дальше (зона T17–T19, не входит в T8)

- Обвязка `<ToastProvider>` вокруг `<App/>` — при реализации `LinkForm` (T17).
- Компоненты `links/*` (`LinksTable`, `LinksToolbar`, `LinkForm`, `LinkHeader`)
  и `stats/*` (`SummaryCards`, `ClicksChart`, `TopLinksTable`, `ReferersTable`,
  `UserAgentsPanel`) — строятся поверх `shared/*` из этого документа, не
  дублируя вёрстку карточек/таблиц/состояний.
- Тёмная тема — архитектурно не заблокирована (все цвета — семантические
  токены поверх сырой палитры в одном файле `tokens.css`), но не входит в
  скоуп спринта; не реализовывать без отдельной задачи.
