/**
 * Unified formatting helpers for money, numbers, and dates.
 *
 * Goal: every currency/number appears the same way in every screen,
 * every receipt, every export. We use `en-US` locale for digit grouping
 * (Western digits with comma thousand separator) because Libyan finance
 * conventions favor Western digits in pricing/invoicing, matching Daftra.
 *
 * Currency is suffix `د.ل` (Libyan Dinar). The space before the suffix
 * is a regular space, not NBSP — receipts render it correctly because
 * the components carry `dir="rtl"` on the parent.
 */

const LOCALE = 'en-US';
const CURRENCY_SUFFIX = 'د.ل';

/**
 * Format a monetary amount. Always 2 decimals (unless `decimals` overridden).
 *
 *   formatMoney(1234.5)          → "1,234.50 د.ل"
 *   formatMoney(0)               → "0.00 د.ل"
 *   formatMoney(1234.5, { withSuffix: false }) → "1,234.50"
 *   formatMoney(null)            → "—"   (sentinel for missing values)
 */
export function formatMoney(
  value: number | null | undefined,
  opts: { decimals?: number; withSuffix?: boolean; placeholder?: string } = {}
): string {
  const { decimals = 2, withSuffix = true, placeholder = '—' } = opts;
  if (value == null || !Number.isFinite(value)) return placeholder;
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return withSuffix ? `${formatted} ${CURRENCY_SUFFIX}` : formatted;
}

/**
 * Format a plain count or quantity (no currency suffix, no forced decimals).
 *
 *   formatNumber(1234)     → "1,234"
 *   formatNumber(1234.5)   → "1,234.5"
 *   formatNumber(0)        → "0"
 */
export function formatNumber(
  value: number | null | undefined,
  opts: { decimals?: number; placeholder?: string } = {}
): string {
  const { decimals, placeholder = '—' } = opts;
  if (value == null || !Number.isFinite(value)) return placeholder;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals ?? 2,
  }).format(value);
}

/**
 * Compact human format for KPI cards. Switches to k/m suffix above thresholds.
 *
 *   formatCompact(950)     → "950"
 *   formatCompact(12_500)  → "12.5k"
 *   formatCompact(2_400_000) → "2.4m"
 */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (abs >= 1_000)     return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(value));
}

/**
 * Format a percentage. Input is the raw ratio or the percent number —
 * use `asRatio: true` for inputs like 0.25 → "25%".
 *
 *   formatPercent(25)            → "25%"
 *   formatPercent(0.25, { asRatio: true }) → "25%"
 *   formatPercent(25.456, { decimals: 1 }) → "25.5%"
 */
export function formatPercent(
  value: number | null | undefined,
  opts: { decimals?: number; asRatio?: boolean } = {}
): string {
  const { decimals = 0, asRatio = false } = opts;
  if (value == null || !Number.isFinite(value)) return '—';
  const pct = asRatio ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format a Date / ISO string. Default style "short" produces dd/mm/yyyy
 * with Western digits, consistent with merchants' receipt expectations.
 *
 *   formatDate('2026-05-18')                  → "18/05/2026"
 *   formatDate(new Date(), { style: 'long' }) → "18 May 2026"
 *   formatDate(null)                          → "—"
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  opts: { style?: 'short' | 'long' | 'time' | 'datetime' } = {}
): string {
  const { style = 'short' } = opts;
  if (value == null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  switch (style) {
    case 'long':
      return new Intl.DateTimeFormat(LOCALE, {
        day: '2-digit', month: 'short', year: 'numeric',
      }).format(d);
    case 'time':
      return new Intl.DateTimeFormat(LOCALE, {
        hour: '2-digit', minute: '2-digit',
      }).format(d);
    case 'datetime':
      return new Intl.DateTimeFormat(LOCALE, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(d);
    case 'short':
    default:
      return new Intl.DateTimeFormat(LOCALE, {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }).format(d);
  }
}

/**
 * Human-relative date — for activity feeds and notifications.
 * Uses the Intl.RelativeTimeFormat API.
 *
 *   formatRelative(new Date(Date.now() - 60_000)) → "1 minute ago"
 */
export function formatRelative(value: Date | string | number | null | undefined): string {
  if (value == null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = d.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat('ar-LY', { numeric: 'auto' });
  const abs = Math.abs(diffMs);
  if (abs < 60_000) return rtf.format(Math.round(diffMs / 1_000), 'second');
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diffMs / 86_400_000), 'day');
  if (abs < 365 * 86_400_000) return rtf.format(Math.round(diffMs / (30 * 86_400_000)), 'month');
  return rtf.format(Math.round(diffMs / (365 * 86_400_000)), 'year');
}

// Legacy alias kept temporarily for back-compat with older imports.
// New code should use `formatMoney` directly.
export const formatCurrency = formatMoney;
