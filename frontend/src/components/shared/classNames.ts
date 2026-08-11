/**
 * Утилита объединения CSS-классов (CSS Modules классы типизированы как
 * `string`, значения из динамических выражений часто `string | false |
 * undefined` — под `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`
 * их нельзя склеивать через шаблонную строку без явного отсева falsy).
 *
 * Не публикуется в паблик API дизайн-системы отдельным компонентом —
 * внутренний хелпер shared/*, но экспортируется из index.ts, т.к. полезен
 * и вне shared (например, в T17-T19 при сборке классов строк таблицы).
 */
export function cx(
  ...values: ReadonlyArray<string | false | null | undefined>
): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}
