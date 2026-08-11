import { useId, useState } from "react";
import { cx } from "./classNames";
import styles from "./DateRangePicker.module.css";

export type DateRangePreset = 7 | 30 | 90;

export interface DateRangeValue {
  preset: DateRangePreset | "custom";
  /** ISO-дата YYYY-MM-DD, UTC, включительно. */
  from: string;
  /** ISO-дата YYYY-MM-DD, UTC, включительно. */
  to: string;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Набор пресетов. По умолчанию `[7, 30, 90]` (архплан, раздел 4.2). */
  presets?: readonly DateRangePreset[];
  /** Показывать ли переключатель на произвольный диапазон. По умолчанию true. */
  allowCustom?: boolean;
  /**
   * Префикс testid. По умолчанию `date-range-picker`. Чтобы получить ровно
   * `clicks-chart-period-7d` / `-30d` / `-90d`, как того требует реестр
   * data-testid (contract.md, 9.3), передайте `data-testid="clicks-chart"`
   * из ClicksChart — см. docs/design/ui-kit.md.
   */
  "data-testid"?: string;
}

const DEFAULT_PRESETS: readonly DateRangePreset[] = [7, 30, 90];

function todayUtc(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
}

function daysAgoUtc(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return date.toISOString().slice(0, 10);
}

/** Вычисляет `{ from, to }` для пресета в днях (включительно, UTC). */
export function computePresetRange(preset: DateRangePreset): { from: string; to: string } {
  return { from: daysAgoUtc(preset), to: todayUtc() };
}

/**
 * Переключатель периода: пресеты 7/30/90 дней + опциональный произвольный
 * диапазон. Используется `ClicksChart` на дашборде и странице деталей
 * ссылки (переиспользуемый компонент, контракт пропсов согласован в T18).
 *
 * @example
 * const [range, setRange] = useState<DateRangeValue>({ preset: 30, ...computePresetRange(30) });
 * <DateRangePicker data-testid="clicks-chart" value={range} onChange={setRange} />
 */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  allowCustom = true,
  "data-testid": dataTestId = "date-range-picker",
}: DateRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(value.preset === "custom");
  const fromInputId = useId();
  const toInputId = useId();

  function handlePresetClick(preset: DateRangePreset) {
    setCustomOpen(false);
    onChange({ preset, ...computePresetRange(preset) });
  }

  function handleCustomToggle() {
    setCustomOpen(true);
    onChange({ preset: "custom", from: value.from, to: value.to });
  }

  function handleFromChange(nextFrom: string) {
    if (nextFrom.length > 0 && value.to.length > 0 && nextFrom > value.to) return;
    onChange({ preset: "custom", from: nextFrom, to: value.to });
  }

  function handleToChange(nextTo: string) {
    if (nextTo.length > 0 && value.from.length > 0 && value.from > nextTo) return;
    onChange({ preset: "custom", from: value.from, to: nextTo });
  }

  return (
    <div className={styles.root} data-testid={dataTestId}>
      <div className={styles.presetGroup} role="group" aria-label="Период">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={cx(styles.presetButton, value.preset === preset && styles.presetButtonActive)}
            aria-pressed={value.preset === preset}
            data-testid={`${dataTestId}-period-${preset}d`}
            onClick={() => handlePresetClick(preset)}
          >
            {preset} дн.
          </button>
        ))}
        {allowCustom ? (
          <button
            type="button"
            className={cx(styles.presetButton, value.preset === "custom" && styles.presetButtonActive)}
            aria-pressed={value.preset === "custom"}
            data-testid={`${dataTestId}-period-custom`}
            onClick={handleCustomToggle}
          >
            Свой период
          </button>
        ) : null}
      </div>
      {allowCustom && customOpen ? (
        <div className={styles.customGroup}>
          <label className={styles.customLabel} htmlFor={fromInputId}>
            С
            <input
              id={fromInputId}
              type="date"
              className={cx("lb-input", styles.dateInput)}
              value={value.from}
              max={value.to}
              data-testid={`${dataTestId}-custom-from`}
              onChange={(event) => handleFromChange(event.target.value)}
            />
          </label>
          <label className={styles.customLabel} htmlFor={toInputId}>
            По
            <input
              id={toInputId}
              type="date"
              className={cx("lb-input", styles.dateInput)}
              value={value.to}
              min={value.from}
              max={todayUtc()}
              data-testid={`${dataTestId}-custom-to`}
              onChange={(event) => handleToChange(event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export default DateRangePicker;
