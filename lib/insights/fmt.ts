/**
 * Compact + full number formatters for the insights engine.
 *
 * Forked from faras-dashboard `lib/fmt.js` and TS-ified. The Talabk-wide
 * canonical formatter is `lib/format.ts` (formatMoney/formatNumber); these
 * variants exist because the engine wants K/M/B compact form and a
 * type-aware cell formatter that the canonical helpers don't expose.
 */

export function fmtNum(v: unknown): string {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function fmtFull(v: unknown): string {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export type CellType = 'number' | 'date' | 'string';

export function fmtCell(v: unknown, type?: CellType): string {
  if (v == null || v === '') return '';
  if (type === 'number') return Number(v).toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (type === 'date') {
    const d = v instanceof Date ? v : new Date(String(v));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return String(v);
}

export const PALETTE = [
  '#4abaf5', '#003d6b', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1',
];
