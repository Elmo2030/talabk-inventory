/**
 * Shared application constants
 */

/** Full Arabic month names — index 0 = January */
export const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

/** Abbreviated to first 3 chars — used in compact chart labels */
export const MONTH_SHORT = MONTHS.map((m) => m.slice(0, 3)) as readonly string[];
