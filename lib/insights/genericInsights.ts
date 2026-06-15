/**
 * Generic insights — for uploaded CSV/XLSX data.
 *
 * Mirrors `talabkInsights.ts` (which assumes Talabk's known schema) but
 * works on arbitrary tabular rows + a detected role map. Crucially, it
 * returns the **same `InsightsBundle` shape**, so the existing
 * components (`KpiGrid`, `AlertsStrip`, `HealthScoreCard`,
 * `TimeIntelCard`, `AbcXyzSection`, `RfmSection`, `NarrativeCard`,
 * `InsightsDashboard`) render either flow without modification.
 *
 * What's different from the Talabk flow:
 *   • No fixed lookback window — uses the data's own date range.
 *   • Alerts are generic (revenue drop/rise, outliers, missing data).
 *   • Health score skips "Risk" (no A/R or stock concept in
 *     uploaded data) — replaced with "Coverage" (data fill rate).
 *   • RFM only computed when customer + date + revenue all resolved.
 */

import { detectGranularity, bucketKey, bucketSeries, type Granularity } from './timeGranularity';
import type { Row, Column } from './dataEngine';
import type { RoleMap } from './roleDetection';
import type {
  InsightsBundle, KpiTile, TimeIntel, TimeIntelRow, Alert,
  HealthScore, HealthSubScore, AbcXyzResult, AbcXyzEntity, AbcClass, XyzClass,
  RfmResult, RfmEntity, RfmSegment,
} from './talabkInsights';

const safeDiv = (a: number, b: number) => (b !== 0 ? a / b : 0);
const pctChange = (cur: number, prev: number): number | null => {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
};
const clamp100 = (x: number) => Math.max(0, Math.min(100, x));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function grade(score: number): HealthScore['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ─── KPIs ───────────────────────────────────────────────────────────────────
function computeKpis(rows: Row[], roles: RoleMap): KpiTile[] {
  const out: KpiTile[] = [];
  const revCol = roles.revenue;
  const profitCol = roles.profit;
  const dateCol = roles.date;

  // Split rows into the most recent half vs the previous half (over the date
  // axis when present, else by row order) so every KPI gets a comparison
  // baseline even on tiny datasets.
  let current = rows;
  let previous: Row[] = [];
  if (dateCol) {
    const dated = rows.filter((r) => r[dateCol] instanceof Date);
    dated.sort((a, b) => (a[dateCol] as Date).getTime() - (b[dateCol] as Date).getTime());
    const mid = Math.floor(dated.length / 2);
    previous = dated.slice(0, mid);
    current  = dated.slice(mid);
  } else if (rows.length >= 4) {
    const mid = Math.floor(rows.length / 2);
    previous = rows.slice(0, mid);
    current  = rows.slice(mid);
  }

  const sumCol = (set: Row[], col?: string) => {
    if (!col) return 0;
    let s = 0;
    for (const r of set) {
      const v = r[col];
      if (typeof v === 'number' && !Number.isNaN(v)) s += v;
    }
    return s;
  };

  if (revCol) {
    const cur = sumCol(current, revCol);
    const prev = sumCol(previous, revCol);
    out.push({
      id: 'revenue',
      label: `إجمالي ${revCol}`,
      value: cur,
      unit: 'money',
      changePct: pctChange(cur, prev),
    });
  }
  if (profitCol) {
    const cur = sumCol(current, profitCol);
    const prev = sumCol(previous, profitCol);
    out.push({
      id: 'profit',
      label: `إجمالي ${profitCol}`,
      value: cur,
      unit: 'money',
      changePct: pctChange(cur, prev),
    });
  }
  if (revCol) {
    const aov = safeDiv(sumCol(current, revCol), current.length);
    const aovPrev = safeDiv(sumCol(previous, revCol), Math.max(1, previous.length));
    out.push({
      id: 'aov',
      label: 'متوسط القيمة لكل سجل',
      value: aov,
      unit: 'money',
      changePct: pctChange(aov, aovPrev),
    });
  }
  out.push({
    id: 'records',
    label: 'عدد السجلات',
    value: current.length,
    unit: 'count',
    changePct: pctChange(current.length, previous.length),
  });
  // Distinct counts when we have entity roles.
  for (const role of ['customer', 'product', 'rep', 'region'] as const) {
    const col = roles[role];
    if (!col) continue;
    const uniqCur  = new Set(current.map((r) => r[col]).filter((v) => v != null)).size;
    const uniqPrev = new Set(previous.map((r) => r[col]).filter((v) => v != null)).size;
    out.push({
      id: `uniq.${role}`,
      label: `عدد ${col} الفريد`,
      value: uniqCur,
      unit: 'count',
      changePct: pctChange(uniqCur, uniqPrev),
    });
    if (out.length >= 6) break;
  }
  return out.slice(0, 6);
}

// ─── Time intelligence ──────────────────────────────────────────────────────
function bucketLabelFromKey(key: string, g: Granularity): string {
  const M = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  switch (g) {
    case 'day':  { const [, m, dd] = key.split('-'); return `${+dd} ${M[+m - 1]}`; }
    case 'week': { const [, m, dd] = key.split('-'); return `أسبوع ${+dd} ${M[+m - 1]}`; }
    case 'quarter': { const [y, q] = key.split('-Q'); return `الربع ${q} ${y}`; }
    case 'year': return key;
    default: { const [y, m] = key.split('-'); return `${M[+m - 1]} ${y}`; }
  }
}

function computeTimeIntel(rows: Row[], roles: RoleMap): TimeIntel | null {
  const dateCol = roles.date;
  const revCol = roles.revenue;
  if (!dateCol || !revCol) return null;
  const profitCol = roles.profit;
  const valid = rows.filter((r) => r[dateCol] instanceof Date && typeof r[revCol] === 'number');
  if (valid.length < 2) return null;

  const g = detectGranularity(valid.map((r) => r[dateCol] as Date));
  const buckets = new Map<string, { revenue: number; profit: number; orders: number }>();
  for (const r of valid) {
    const k = bucketKey(r[dateCol] as Date, g);
    const cur = buckets.get(k) ?? { revenue: 0, profit: 0, orders: 0 };
    cur.revenue += r[revCol] as number;
    cur.profit  += profitCol && typeof r[profitCol] === 'number' ? (r[profitCol] as number) : 0;
    cur.orders  += 1;
    buckets.set(k, cur);
  }
  const keys = [...buckets.keys()].sort();
  const series: TimeIntelRow[] = keys.map((k) => {
    const b = buckets.get(k)!;
    return {
      bucketKey: k,
      bucketLabel: bucketLabelFromKey(k, g),
      revenue: b.revenue,
      netProfit: b.profit,
      orderCount: b.orders,
    };
  });

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const mom = prev ? {
    revenue: pctChange(last.revenue, prev.revenue),
    profit:  pctChange(last.netProfit, prev.netProfit),
    orders:  pctChange(last.orderCount, prev.orderCount),
  } : { revenue: null, profit: null, orders: null };

  const lookback = g === 'year' ? 1 : g === 'quarter' ? 4 : g === 'month' ? 12 : g === 'week' ? 52 : 365;
  const yagoIdx = series.length - 1 - lookback;
  const yago = yagoIdx >= 0 ? series[yagoIdx] : null;
  const yoy = yago ? {
    revenue: pctChange(last.revenue, yago.revenue),
    profit:  pctChange(last.netProfit, yago.netProfit),
    orders:  pctChange(last.orderCount, yago.orderCount),
  } : { revenue: null, profit: null, orders: null };

  const currentYear = new Date().getFullYear().toString();
  const ytdRows = series.filter((s) => s.bucketKey.startsWith(currentYear));
  const ytd = ytdRows.reduce(
    (s, r) => ({ revenue: s.revenue + r.revenue, profit: s.profit + r.netProfit, orders: s.orders + r.orderCount }),
    { revenue: 0, profit: 0, orders: 0 },
  );

  return { granularity: g, series, mom, yoy, ytd };
}

// ─── Alerts ─────────────────────────────────────────────────────────────────
function computeAlerts(rows: Row[], columns: Column[], roles: RoleMap, timeIntel: TimeIntel | null): Alert[] {
  const out: Alert[] = [];

  // 1) Revenue swing across the most recent two buckets.
  if (timeIntel && timeIntel.mom.revenue != null) {
    const pct = timeIntel.mom.revenue;
    if (pct <= -25) {
      out.push({
        id: 'rev.drop',
        severity: 'crit',
        title: `انخفضت ${roles.revenue ?? 'القيمة'} ${Math.abs(pct).toFixed(0)}٪ في آخر فترة`,
        message: 'افحص السجلات الأقدم لمعرفة السبب — قد تكون فترة موسمية أو فعل حقيقي.',
      });
    } else if (pct >= 25) {
      out.push({
        id: 'rev.rise',
        severity: 'info',
        title: `ارتفعت ${roles.revenue ?? 'القيمة'} ${pct.toFixed(0)}٪ في آخر فترة`,
        message: 'استمر فيما يعمل — راجع الأصناف الأعلى مساهمة.',
      });
    }
  }

  // 2) Columns with low fill rate (quality alert).
  const sparse = columns.filter((c) => c.fillRate != null && c.fillRate < 0.5);
  if (sparse.length > 0) {
    out.push({
      id: 'data.sparse',
      severity: 'warn',
      title: `${sparse.length} عمود فيه بيانات ناقصة`,
      message: `الأعمدة "${sparse.slice(0, 3).map((c) => c.name).join('، ')}" نسبة التعبئة فيها أقل من 50٪. قد يؤثر على دقة التحليل.`,
    });
  }

  // 3) Outliers on revenue column (DataEngine.stats logic, but lighter).
  const revCol = roles.revenue;
  if (revCol) {
    const vals: number[] = [];
    for (const r of rows) {
      const v = r[revCol];
      if (typeof v === 'number' && !Number.isNaN(v)) vals.push(v);
    }
    if (vals.length >= 10) {
      const sorted = [...vals].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const high = q3 + 1.5 * iqr;
      const outliers = vals.filter((v) => v > high);
      if (outliers.length >= 3) {
        out.push({
          id: 'outliers',
          severity: 'info',
          title: `${outliers.length} سجل بقيمة استثنائية`,
          message: 'هذه السجلات أعلى بكثير من الوسيط — قد تكون فرص أو أخطاء إدخال.',
        });
      }
    }
  }

  return out;
}

// ─── Health score ──────────────────────────────────────────────────────────
function computeHealth(rows: Row[], columns: Column[], roles: RoleMap, ti: TimeIntel | null): HealthScore {
  // Growth — from time intel MoM (or first-vs-last bucket).
  let growthScore = 50;
  let growthDetail = 'لا توجد بيانات زمنية كافية للنمو';
  if (ti && ti.mom.revenue != null) {
    growthScore = clamp100(50 + ti.mom.revenue);
    growthDetail = `${ti.mom.revenue.toFixed(1)}٪ مقارنة بالفترة السابقة`;
  }

  // Coverage — fraction of columns with fill rate ≥ 80%.
  const filled = columns.filter((c) => (c.fillRate ?? 0) >= 0.8).length;
  const coverageScore = clamp100((filled / Math.max(1, columns.length)) * 100);
  const coverageDetail = `${filled} من ${columns.length} أعمدة بنسبة تعبئة ≥ 80٪`;

  // Retention — repeat-customer share IF customer role exists.
  let retentionScore = 50;
  let retentionDetail = 'لا يوجد عمود عميل للتقدير';
  const custCol = roles.customer;
  if (custCol) {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = r[custCol];
      if (k == null) continue;
      const key = String(k);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (counts.size > 0) {
      const repeaters = [...counts.values()].filter((c) => c > 1).length;
      const frac = repeaters / counts.size;
      retentionScore = clamp100(frac * 100);
      retentionDetail = `${Math.round(frac * 100)}٪ من العملاء تكرّروا`;
    }
  }

  // Stability — CV on the time series.
  let stabilityScore = 60;
  let stabilityDetail = 'بناءً على تذبذب البيانات الزمنية';
  if (ti && ti.series.length >= 3) {
    const sums = ti.series.map((s) => s.revenue);
    const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
    if (mean > 0) {
      const sd = Math.sqrt(sums.reduce((a, v) => a + (v - mean) ** 2, 0) / sums.length);
      const cv = sd / mean;
      stabilityScore = clamp100(100 * (1 - clamp01(cv / 1.5)));
      stabilityDetail = `معامل اختلاف ${cv.toFixed(2)} على المبيعات`;
    }
  }

  const subs: HealthSubScore[] = [
    { id: 'growth',     label: 'النمو',     score: Math.round(growthScore),     weight: 30, detail: growthDetail },
    // Repurpose 'risk' slot as Data Coverage for uploads — keeps the same UI.
    { id: 'risk',       label: 'جودة البيانات', score: Math.round(coverageScore), weight: 25, detail: coverageDetail },
    { id: 'retention',  label: 'الاحتفاظ',   score: Math.round(retentionScore),  weight: 25, detail: retentionDetail },
    { id: 'stability',  label: 'الاستقرار',  score: Math.round(stabilityScore),  weight: 20, detail: stabilityDetail },
  ];
  const total = subs.reduce((s, b) => s + (b.score * b.weight) / 100, 0);
  return { total: Math.round(total), grade: grade(total), subs };
}

// ─── ABC × XYZ ─────────────────────────────────────────────────────────────
function classifyAbc(cum: number): AbcClass { return cum <= 80 ? 'A' : cum <= 95 ? 'B' : 'C'; }
function classifyXyz(cv: number | null): XyzClass {
  if (cv == null || !Number.isFinite(cv)) return '—';
  if (cv < 0.5) return 'X';
  if (cv < 1.0) return 'Y';
  return 'Z';
}

function computeAbcXyz(rows: Row[], roles: RoleMap): AbcXyzResult | null {
  // We need a dimension to classify (product preferred) and a measure.
  const dimRole: Array<keyof RoleMap> = ['product', 'store', 'customer', 'rep', 'category', 'region'];
  const dim = dimRole.map((r) => roles[r]).find(Boolean);
  const measure = roles.revenue ?? roles.profit ?? roles.quantity;
  if (!dim || !measure) return null;

  const byEntity = new Map<string, { value: number; rowsByDate: Record<string, number> }>();
  const dateCol = roles.date;
  for (const r of rows) {
    const k = r[dim];
    if (k == null) continue;
    const v = r[measure];
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    const cur = byEntity.get(String(k)) ?? { value: 0, rowsByDate: {} };
    cur.value += v;
    if (dateCol && r[dateCol] instanceof Date) {
      const dKey = (r[dateCol] as Date).toISOString().slice(0, 10);
      cur.rowsByDate[dKey] = (cur.rowsByDate[dKey] ?? 0) + v;
    }
    byEntity.set(String(k), cur);
  }
  const arr = [...byEntity.entries()].map(([key, v]) => ({ key, ...v })).filter((e) => e.value > 0);
  if (arr.length < 3) return null;
  arr.sort((a, b) => b.value - a.value);
  const total = arr.reduce((s, e) => s + e.value, 0);

  let cum = 0;
  const entities: AbcXyzEntity[] = arr.map((e) => {
    const share = (e.value / total) * 100;
    cum += share;
    const sums = Object.values(e.rowsByDate);
    let cv: number | null = null;
    if (sums.length >= 3) {
      const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
      if (mean > 0) {
        const sd = Math.sqrt(sums.reduce((a, v) => a + (v - mean) ** 2, 0) / sums.length);
        cv = sd / mean;
      }
    }
    return {
      key: e.key,
      value: e.value,
      sharePct: share,
      cumPct: cum,
      abc: classifyAbc(cum),
      cv,
      xyz: classifyXyz(cv),
      periods: sums.length,
    };
  });

  const matrix: Record<string, AbcXyzEntity[]> = {};
  const counts: Record<string, number> = {};
  const totals: Record<string, number> = {};
  for (const a of ['A', 'B', 'C'] as AbcClass[]) {
    for (const x of ['X', 'Y', 'Z', '—'] as XyzClass[]) {
      const k = a + x;
      matrix[k] = [];
      counts[k] = 0;
      totals[k] = 0;
    }
  }
  for (const e of entities) {
    const k = e.abc + e.xyz;
    matrix[k].push(e);
    counts[k]++;
    totals[k] += e.value;
  }
  return { total, entities, matrix, counts, totals };
}

// ─── RFM ───────────────────────────────────────────────────────────────────
function score5(value: number, sortedAsc: number[]): 1 | 2 | 3 | 4 | 5 {
  if (sortedAsc.length === 0) return 3;
  const q = (p: number) => sortedAsc[Math.floor((sortedAsc.length - 1) * p)];
  if (value <= q(0.2)) return 1;
  if (value <= q(0.4)) return 2;
  if (value <= q(0.6)) return 3;
  if (value <= q(0.8)) return 4;
  return 5;
}
function segmentOf(r: number, f: number): RfmSegment {
  if (r >= 4 && f >= 4) return 'Champions';
  if (r >= 3 && f >= 3) return 'Loyal';
  if (r >= 4 && f <= 2) return 'New';
  if (r >= 3 && f <= 2) return 'Potential';
  if (r <= 2 && f >= 3) return 'AtRisk';
  if (r <= 2 && f === 2) return 'Hibernating';
  return 'Lost';
}

function computeRfm(rows: Row[], roles: RoleMap): RfmResult | null {
  const custCol = roles.customer;
  const dateCol = roles.date;
  const revCol = roles.revenue;
  if (!custCol || !dateCol || !revCol) return null;

  const now = Date.now();
  const byCustomer = new Map<string, { lastTs: number; freq: number; total: number }>();
  for (const r of rows) {
    const k = r[custCol];
    const d = r[dateCol];
    const v = r[revCol];
    if (k == null || !(d instanceof Date) || typeof v !== 'number') continue;
    const key = String(k);
    const ts = d.getTime();
    const cur = byCustomer.get(key) ?? { lastTs: 0, freq: 0, total: 0 };
    cur.lastTs = Math.max(cur.lastTs, ts);
    cur.freq += 1;
    cur.total += v;
    byCustomer.set(key, cur);
  }
  if (byCustomer.size < 3) return null;

  const arr = [...byCustomer.entries()];
  const recAsc  = [...arr.map(([, c]) => (now - c.lastTs) / 86_400_000)].sort((a, b) => a - b);
  const freqAsc = [...arr.map(([, c]) => c.freq)].sort((a, b) => a - b);
  const monAsc  = [...arr.map(([, c]) => c.total)].sort((a, b) => a - b);

  const segmentCounts  = { Champions: 0, Loyal: 0, Potential: 0, New: 0, AtRisk: 0, Hibernating: 0, Lost: 0 } as Record<RfmSegment, number>;
  const segmentRevenue = { Champions: 0, Loyal: 0, Potential: 0, New: 0, AtRisk: 0, Hibernating: 0, Lost: 0 } as Record<RfmSegment, number>;

  const entities: RfmEntity[] = arr.map(([key, c]) => {
    const recDays = (now - c.lastTs) / 86_400_000;
    const rRaw = score5(recDays, recAsc);
    const rScore = (6 - rRaw) as 1 | 2 | 3 | 4 | 5;
    const fScore = score5(c.freq, freqAsc);
    const mScore = score5(c.total, monAsc);
    const seg = segmentOf(rScore, fScore);
    segmentCounts[seg]++;
    segmentRevenue[seg] += c.total;
    return {
      key,
      r: Math.round(recDays),
      f: c.freq,
      m: c.total,
      rScore, fScore, mScore,
      segment: seg,
    };
  }).sort((a, b) => b.m - a.m);

  return { entities, segmentCounts, segmentRevenue };
}

// ─── Narrative ─────────────────────────────────────────────────────────────
function buildNarrative(rows: Row[], roles: RoleMap, kpis: KpiTile[], ti: TimeIntel | null, abc: AbcXyzResult | null, rfm: RfmResult | null): string[] {
  const out: string[] = [];
  out.push(`تحليل ${rows.length} سجل من البيانات المرفوعة. تم اكتشاف ${Object.keys(roles).length} دور تلقائياً.`);
  const rev = kpis.find((k) => k.id === 'revenue');
  if (rev) {
    const dir = rev.changePct == null ? '' : rev.changePct >= 0 ? `بنمو ${rev.changePct.toFixed(1)}٪` : `بانخفاض ${Math.abs(rev.changePct).toFixed(1)}٪`;
    out.push(`${roles.revenue ?? 'القيمة'} الإجمالية ${rev.value.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${dir} مقارنة بالنصف السابق من البيانات.`);
  }
  if (ti && ti.granularity) {
    out.push(`البيانات الزمنية على مستوى ${({ day: 'يومي', week: 'أسبوعي', month: 'شهري', quarter: 'ربعي', year: 'سنوي' } as Record<string, string>)[ti.granularity]}.`);
  }
  if (abc) {
    const stars = abc.matrix['AX'].length + abc.matrix['AY'].length + abc.matrix['AZ'].length;
    out.push(`${stars} عنصر ضمن الفئة A — أعلى مساهمة في القيمة الإجمالية.`);
  }
  if (rfm) {
    const champs = rfm.segmentCounts.Champions;
    if (champs > 0) out.push(`${champs} عميل من فئة Champions يستحقون اهتماماً خاصاً.`);
  }
  return out;
}

// ─── Public entry ──────────────────────────────────────────────────────────
export function buildInsightsFromRows(rows: Row[], columns: Column[], roles: RoleMap): InsightsBundle {
  const kpis = computeKpis(rows, roles);
  const timeIntel = computeTimeIntel(rows, roles);
  const alerts = computeAlerts(rows, columns, roles, timeIntel);
  const health = computeHealth(rows, columns, roles, timeIntel);
  const abcXyz = computeAbcXyz(rows, roles);
  const rfm = computeRfm(rows, roles);
  const narrative = buildNarrative(rows, roles, kpis, timeIntel, abcXyz, rfm);
  const signalLevel: InsightsBundle['signalLevel'] =
    rows.length >= 200 ? 'high' :
    rows.length >= 50 ? 'medium' : 'low';
  return {
    kpis, timeIntel, alerts, health, abcXyz, rfm,
    narrative,
    generatedAt: new Date().toISOString(),
    signalLevel,
  };
}
