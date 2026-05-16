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

/**
 * Stock-out reason taxonomy (Arabic) — kept as a real domain enum.
 * Lives here (not in mock-data) so production code can use it safely.
 */
export const STOCK_OUT_REASONS = [
  'بيع',
  'استهلاك داخلي',
  'هدية/تبرع',
  'تلف',
  'إرجاع للمورد',
  'تحويل بين فروع',
  'فقد/سرقة',
  'تسوية جرد',
  'أخرى',
] as const;
export type StockOutReason = typeof STOCK_OUT_REASONS[number];
