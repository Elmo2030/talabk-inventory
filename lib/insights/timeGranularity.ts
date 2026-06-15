/**
 * Adaptive time-granularity detection & bucketing.
 *
 * Data may be daily, weekly, monthly, quarterly, or yearly. We detect the
 * native granularity from the spacing of distinct dates, roll up when a
 * level would produce too many buckets, and default to MONTH when unclear.
 */
export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
export const GRAN_ORDER: Granularity[] = ['day', 'week', 'month', 'quarter', 'year'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY = 86400000;
const MAX_BUCKETS = 60;   // roll up to a coarser level beyond this

/** Bucket key for a date at a given granularity (sortable as a string). */
export function bucketKey(d: Date, g: Granularity): string {
  const y = d.getFullYear(), m = d.getMonth();
  switch (g) {
    case 'day':
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    case 'week': {                       // Monday-anchored ISO-ish week
      const t = new Date(d); const dow = (t.getDay() + 6) % 7;
      t.setDate(t.getDate() - dow);
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }
    case 'quarter': return `${y}-Q${Math.floor(m / 3) + 1}`;
    case 'year':    return `${y}`;
    default:        return `${y}-${String(m + 1).padStart(2, '0')}`;   // month
  }
}

export type Lang = 'ar' | 'en';

/** Human-readable label for a bucket key. */
export function bucketLabel(key: string, g: Granularity, lang: Lang = 'ar'): string {
  const M = lang === 'en' ? MONTHS_EN : MONTHS_AR;
  switch (g) {
    case 'day':  { const [, m, dd] = key.split('-'); return `${+dd} ${M[+m - 1]}`; }
    case 'week': { const [, m, dd] = key.split('-'); return lang === 'en' ? `Week of ${M[+m - 1]} ${+dd}` : `أسبوع ${+dd} ${M[+m - 1]}`; }
    case 'quarter': { const [y, q] = key.split('-Q'); return lang === 'en' ? `Q${q} ${y}` : `الربع ${q} ${y}`; }
    case 'year': return key;
    default: { const [y, m] = key.split('-'); return `${M[+m - 1]} ${y}`; }   // month
  }
}

/** Advance a bucket key by n periods (used for forecasting). */
export function nextBucket(key: string, g: Granularity, n = 1): string {
  switch (g) {
    case 'day':  { const d = new Date(key + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);     return d.toISOString().slice(0, 10); }
    case 'week': { const d = new Date(key + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 7 * n); return d.toISOString().slice(0, 10); }
    case 'quarter': { let [y, q] = key.split('-Q').map(Number); const t = y * 4 + (q - 1) + n; return `${Math.floor(t / 4)}-Q${(t % 4) + 1}`; }
    case 'year': return `${+key + n}`;
    default: { const [y, m] = key.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; }
  }
}

/** Detect the granularity of a set of dates. */
export function detectGranularity(dates: Date[]): Granularity {
  const ts = [...new Set(dates.filter((d) => d instanceof Date && !isNaN(d.getTime())).map((d) => d.getTime()))].sort((a, b) => a - b);
  if (ts.length < 2) return 'month';                 // default when ambiguous

  const gaps: number[] = [];
  for (let i = 1; i < ts.length; i++) gaps.push((ts[i] - ts[i - 1]) / DAY);
  gaps.sort((a, b) => a - b);
  const med = gaps[Math.floor(gaps.length / 2)];

  let g: Granularity = med <= 3 ? 'day'
        : med <= 10 ? 'week'
        : med <= 45 ? 'month'
        : med <= 135 ? 'quarter'
        : 'year';

  // Roll up if the chosen level yields too many buckets to read.
  let idx = GRAN_ORDER.indexOf(g);
  while (idx < GRAN_ORDER.length - 1) {
    const n = new Set(ts.map(t => bucketKey(new Date(t), GRAN_ORDER[idx]))).size;
    if (n <= MAX_BUCKETS) break;
    idx++;
  }
  return GRAN_ORDER[idx];
}

export interface BucketSeries {
  granularity: Granularity;
  keys: string[];
  labels: string[];
  sums: number[];
}

/** Bucket rows by detected granularity → { granularity, labels, keys, sums }. */
export function bucketSeries(
  rows: Record<string, unknown>[],
  dateName: string,
  valName: string,
  lang: Lang = 'ar',
): BucketSeries {
  const dates = rows.map((r) => r[dateName]).filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
  const g = detectGranularity(dates);
  const buckets: Record<string, number> = {};
  for (const r of rows) {
    const d = r[dateName];
    const v = r[valName];
    if (!(d instanceof Date) || isNaN(d.getTime()) || typeof v !== 'number' || Number.isNaN(v)) continue;
    const k = bucketKey(d, g);
    buckets[k] = (buckets[k] || 0) + v;
  }
  const keys = Object.keys(buckets).sort();
  return { granularity: g, keys, labels: keys.map(k => bucketLabel(k, g, lang)), sums: keys.map(k => buckets[k]) };
}

/** Bucket key + granularity → { start, end } as 'YYYY-MM-DD' strings. */
export function bucketRange(key: string, g: Granularity): { start: string; end: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (g) {
    case 'day':  return { start: key, end: key };
    case 'week': { const s = new Date(key + 'T00:00:00Z'); const e = new Date(s); e.setUTCDate(e.getUTCDate() + 6); return { start: iso(s), end: iso(e) }; }
    case 'quarter': { const [y, q] = key.split('-Q').map(Number); const s = new Date(Date.UTC(y, (q - 1) * 3, 1)); const e = new Date(Date.UTC(y, q * 3, 0)); return { start: iso(s), end: iso(e) }; }
    case 'year': return { start: `${key}-01-01`, end: `${key}-12-31` };
    default: { const [y, m] = key.split('-').map(Number); const e = new Date(Date.UTC(y, m, 0)); return { start: `${key}-01`, end: iso(e) }; }
  }
}
