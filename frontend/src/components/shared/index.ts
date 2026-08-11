/**
 * Публичный API дизайн-системы admin-panel. Подробная документация,
 * правила состояний и палитра графиков — docs/design/ui-kit.md.
 */

export { Card } from "./Card";
export type { CardProps, CardPadding } from "./Card";

export { Table } from "./Table";
export type { TableProps, TableColumn, TableColumnAlign } from "./Table";

export { Spinner } from "./Spinner";
export type { SpinnerProps, SpinnerSize } from "./Spinner";

export { ErrorState } from "./ErrorState";
export type { ErrorStateProps } from "./ErrorState";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { CopyButton } from "./CopyButton";
export type { CopyButtonProps } from "./CopyButton";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";

export { ToastProvider, useToast } from "./Toast";
export type { ToastVariant, ToastItem, ShowToastOptions, ToastContextValue } from "./Toast";

export { DateRangePicker, computePresetRange } from "./DateRangePicker";
export type { DateRangePickerProps, DateRangeValue, DateRangePreset } from "./DateRangePicker";

export { cx } from "./classNames";
