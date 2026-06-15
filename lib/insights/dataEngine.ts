/**
 * DataEngine — TypeScript port for Talabk.
 *
 * Lifted from the faras-dashboard `lib/DataEngine.js` agentic-BI module.
 * Pure data layer, zero React/DOM dependency. All aggregation, profiling,
 * grouping, top-N, trend, correlation, and stats live here.
 *
 * Differences from the original:
 *   • Strongly typed (Row = record of unknown).
 *   • Role detection is removed — Talabk calls `assignRoles()` explicitly
 *     because our schema is known. NLP/intent parsing also dropped (the
 *     /insights page has no chat interface).
 *   • Memoization preserved (WeakMap → Map cache keyed by rows-array
 *     identity + op signature) so multiple cards reusing the same
 *     groupBy/sum hit the cache once per state update.
 */

export type ColType = 'number' | 'date' | 'category' | 'text';

export interface Column {
  name: string;
  type: ColType;
  /** Number of distinct non-null values seen in the rows. */
  uniqueCount: number;
  /** Domain role — assigned manually by the Talabk adapter. */
  role?: string;
  /** Display label (Arabic preferred). */
  label?: string;
  /** Default aggregation operator for this column. */
  defaultAgg?: 'sum' | 'avg' | 'count' | 'uniq';

  // ── populated by profileAll() ────────────────────────────────────────────
  nonNullCount?: number;
  nullCount?: number;
  fillRate?: number;
  cardinality?: number;
  sparsity?: number;
  skewness?: number;
  isId?: boolean;
  isDimension?: boolean;
  excludeFromKPI?: boolean;
  excludeFromCharts?: boolean;
}

export type Row = Record<string, unknown>;
export type AggType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'uniq';

export interface GroupRow {
  key: string;
  value: number;
  count: number;
  sum: number;
  avg: number;
}

export interface Stats {
  sum: number;
  mean: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  count: number;
  outliers: number[];
}

export interface TrendInfo {
  firstMean: number;
  lastMean: number;
  changePct: number;
}

// ─── Pure column-type detection (used when raw rows arrive untyped) ─────────
export function detectColumns(rows: Row[]): Column[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((name) => {
    const samples = rows.slice(0, 200).map((r) => r[name]).filter((v) => v != null && v !== '');
    let numCount = 0;
    let dateCount = 0;
    for (const s of samples) {
      if (typeof s === 'number' || (typeof s === 'string' && !Number.isNaN(+s) && s.trim() !== '')) numCount++;
      else if (s instanceof Date || (typeof s === 'string' && !Number.isNaN(Date.parse(s)))) dateCount++;
    }
    const ratio = samples.length || 1;
    let type: ColType = 'text';
    if (numCount / ratio > 0.7) type = 'number';
    else if (dateCount / ratio > 0.5) type = 'date';
    const unique = new Set<string>();
    for (const r of rows) {
      const v = r[name];
      if (v != null && v !== '') unique.add(String(v));
    }
    return { name, type, uniqueCount: unique.size };
  });
}

// ─── DataEngine ─────────────────────────────────────────────────────────────
export class DataEngine {
  rows: Row[];
  columns: Column[];
  private _memo: WeakMap<Row[], Map<string, unknown>>;

  constructor(rows: Row[], columns: Column[]) {
    this.rows = rows ?? [];
    this.columns = columns ?? [];
    this._memo = new WeakMap();
  }

  private _cached<T>(rows: Row[], key: string, compute: () => T): T {
    if (!Array.isArray(rows)) return compute();
    let m = this._memo.get(rows);
    if (!m) {
      m = new Map();
      this._memo.set(rows, m);
    }
    if (m.has(key)) return m.get(key) as T;
    const v = compute();
    m.set(key, v);
    return v;
  }

  // ── Column helpers ─────────────────────────────────────────────────────
  col(name: string): Column | undefined { return this.columns.find((c) => c.name === name); }
  byRole(role: string): Column | undefined { return this.columns.find((c) => c.role === role); }
  numCols(): Column[]  { return this.columns.filter((c) => c.type === 'number'); }
  catCols(): Column[]  { return this.columns.filter((c) => c.type === 'category' || (c.type === 'text' && !c.isId)); }
  dateCols(): Column[] { return this.columns.filter((c) => c.type === 'date'); }

  // ── Profiling: cardinality, fill rate, skewness, ID/dimension flags ────
  profileAll(): Column[] {
    const total = this.rows.length || 1;
    for (const col of this.columns) {
      const raw = this.rows.map((r) => r[col.name]);
      const nonNull = raw.filter((v) => v != null && v !== '');
      const nn = nonNull.length;
      col.nonNullCount = nn;
      col.nullCount = total - nn;
      col.fillRate = nn / total;
      col.cardinality = nn ? col.uniqueCount / nn : 0;

      if (col.type === 'number') {
        const v = nonNull.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
        const zeros = v.filter((x) => x === 0).length;
        col.sparsity = (zeros + col.nullCount) / total;
        const n = v.length;
        if (n > 2) {
          const mean = v.reduce((a, b) => a + b, 0) / n;
          const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
          col.skewness = sd > 0 ? v.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0) / n : 0;
        } else col.skewness = 0;
        col.excludeFromKPI = col.sparsity > 0.6;
      } else {
        col.sparsity = col.nullCount / total;
        col.excludeFromKPI = true;
        col.skewness = 0;
      }
      col.isId = (col.type === 'text' || col.type === 'category') && col.cardinality > 0.9 && nn > 10;
      col.isDimension = (col.type === 'category' || col.type === 'text') && col.cardinality < 0.05 && col.uniqueCount > 1 && col.uniqueCount <= 50;
      col.excludeFromCharts = col.isId || (col.type === 'text' && col.uniqueCount > 50 && !col.isDimension);
    }
    return this.columns;
  }

  // ── Aggregation primitives ─────────────────────────────────────────────
  vals(rows: Row[], col: string): number[] {
    const out: number[] = [];
    for (const r of rows) {
      const v = r[col];
      if (v != null && typeof v === 'number' && !Number.isNaN(v)) out.push(v);
      else if (typeof v === 'string') {
        const n = Number(v);
        if (!Number.isNaN(n)) out.push(n);
      }
    }
    return out;
  }
  sum(rows: Row[], col: string): number { return this._cached(rows, `sum|${col}`, () => this.vals(rows, col).reduce((a, b) => a + b, 0)); }
  avg(rows: Row[], col: string): number | null { const v = this.vals(rows, col); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
  min(rows: Row[], col: string): number | null { const v = this.vals(rows, col); return v.length ? Math.min(...v) : null; }
  max(rows: Row[], col: string): number | null { const v = this.vals(rows, col); return v.length ? Math.max(...v) : null; }
  count(rows: Row[], col: string): number { return rows.filter((r) => r[col] != null).length; }
  uniq(rows: Row[], col: string): number { return new Set(rows.map((r) => r[col]).filter((v) => v != null)).size; }

  agg(rows: Row[], col: string, type: AggType): number | null {
    switch (type) {
      case 'sum':   return this.sum(rows, col);
      case 'avg':   return this.avg(rows, col);
      case 'min':   return this.min(rows, col);
      case 'max':   return this.max(rows, col);
      case 'uniq':  return this.uniq(rows, col);
      default:      return this.count(rows, col);
    }
  }

  // Full statistics
  stats(rows: Row[], col: string): Stats | null {
    const v = this.vals(rows, col).sort((a, b) => a - b);
    if (!v.length) return null;
    const n = v.length;
    const sum = v.reduce((a, b) => a + b, 0);
    const q1 = v[Math.floor(n * 0.25)];
    const q3 = v[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const med = n % 2 ? v[Math.floor(n / 2)] : (v[n / 2 - 1] + v[n / 2]) / 2;
    return {
      sum, mean: sum / n, min: v[0], max: v[n - 1],
      median: med, q1, q3, iqr, count: n,
      outliers: v.filter((x) => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr),
    };
  }

  // Crude two-half trend used by the alerts engine.
  trend(rows: Row[], col: string): TrendInfo | null {
    const v = this.vals(rows, col);
    if (v.length < 4) return null;
    const h = Math.floor(v.length / 2);
    const firstMean = v.slice(0, h).reduce((a, b) => a + b, 0) / h;
    const lastMean = v.slice(h).reduce((a, b) => a + b, 0) / (v.length - h);
    const changePct = firstMean !== 0 ? ((lastMean - firstMean) / Math.abs(firstMean)) * 100 : 0;
    return { firstMean, lastMean, changePct };
  }

  // Pearson correlation between two numeric columns.
  pearson(rows: Row[], aName: string, bName: string): number | null {
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (const r of rows) {
      const x = r[aName];
      const y = r[bName];
      if (typeof x !== 'number' || typeof y !== 'number') continue;
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    }
    if (n < 4) return null;
    const cov = sxy - sx * sy / n;
    const vx = sxx - sx * sx / n;
    const vy = syy - sy * sy / n;
    if (vx <= 0 || vy <= 0) return null;
    return cov / Math.sqrt(vx * vy);
  }

  // GroupBy aggregation → sorted [{key, value, count, sum, avg}].
  // Returns a shallow copy so callers can sort/reverse without poisoning
  // the cache for other consumers.
  groupBy(rows: Row[], catCol: string, valCol: string, aggType: AggType = 'sum'): GroupRow[] {
    return this._cached(rows, `gb|${catCol}|${valCol}|${aggType}`,
      () => this._groupByRaw(rows, catCol, valCol, aggType)).slice() as GroupRow[];
  }

  private _groupByRaw(rows: Row[], catCol: string, valCol: string, aggType: AggType): GroupRow[] {
    const groups: Record<string, { sum: number; count: number }> = {};
    for (const r of rows) {
      const k = String(r[catCol] ?? '—');
      const raw = r[valCol];
      const v = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
      if (Number.isNaN(v)) continue;
      if (!(k in groups)) groups[k] = { sum: 0, count: 0 };
      groups[k].sum += v;
      groups[k].count++;
    }
    return Object.entries(groups)
      .map(([key, g]) => {
        const value =
          aggType === 'avg' ? g.sum / g.count :
          aggType === 'count' ? g.count :
          g.sum;
        return { key, value, count: g.count, sum: g.sum, avg: g.sum / g.count };
      })
      .sort((a, b) => b.value - a.value);
  }

  topN(rows: Row[], catCol: string, valCol: string, n = 5, dir: 'top' | 'bottom' = 'top', aggType: AggType = 'sum'): GroupRow[] {
    const groups = this.groupBy(rows, catCol, valCol, aggType);
    return dir === 'top' ? groups.slice(0, n) : [...groups].reverse().slice(0, n);
  }
}
