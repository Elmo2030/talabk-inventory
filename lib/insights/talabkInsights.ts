/**
 * Talabk-specific insights engine.
 *
 * Takes the merchant's live Talabk data (sales orders, items, customers,
 * sales reps, current stock) and produces a structured insights bundle for
 * the /insights dashboard.
 *
 * Why a single module instead of porting the 8 generic files from
 * faras-dashboard? Because Talabk's schema is fully known. We can skip
 * role-detection, semantic tagging, and NLP entirely and write each
 * analysis in 30–60 LOC of typesafe code.
 *
 * Insight surfaces produced:
 *   • kpis         — 6 hero KPIs (revenue, profit, AOV, orders, customers, A/R)
 *   • timeIntel    — MoM, YoY, YTD on revenue + profit + orders
 *   • alerts       — anomalies: dropping customers, dropping items, low stock
 *   • healthScore  — 0–100 with Growth / Risk / Retention / Stability subscores
 *   • abcXyz       — ABC×XYZ matrix for items (value × demand stability)
 *   • rfm          — RFM segmentation for customers (Champions, At Risk, etc.)
 *   • narrative    — 3–5 plain-Arabic sentences summarizing the above
 *
 * Each section degrades gracefully when data is missing — a brand-new
 * tenant with one sale still sees something useful.
 */

import type { SalesOrder, Item, Customer, CustomerBalance, SalesRep, CurrentStock } from '@/lib/types';
import { bucketSeries, bucketKey, detectGranularity, type Granularity } from './timeGranularity';

// ── Input bundle (collected by the page from Talabk's StockContext) ─────────
export interface InsightsInput {
  orders:      SalesOrder[];
  items:       Item[];
  customers:   Customer[];
  balances:    CustomerBalance[];
  salesReps:   SalesRep[];
  stock:       CurrentStock[];
  /** Inclusive lookback window in days for time-sensitive analyses. */
  rangeDays?:  number;
}

// ── Output shape ────────────────────────────────────────────────────────────
export interface KpiTile {
  id: string;
  label: string;
  value: number;
  unit: 'money' | 'count' | 'percent';
  /** Percent change vs prior equivalent window. Null when no baseline. */
  changePct: number | null;
  hint?: string;
}

export interface TimeIntelRow {
  bucketKey: string;
  bucketLabel: string;
  revenue: number;
  netProfit: number;
  orderCount: number;
}

export interface TimeIntel {
  granularity: Granularity;
  series: TimeIntelRow[];
  mom: { revenue: number | null; profit: number | null; orders: number | null };
  yoy: { revenue: number | null; profit: number | null; orders: number | null };
  ytd: { revenue: number; profit: number; orders: number };
}

export type AlertSeverity = 'info' | 'warn' | 'crit';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Optional deep-link inside the app. */
  href?: string;
}

export interface HealthSubScore {
  id: 'growth' | 'risk' | 'retention' | 'stability';
  label: string;
  score: number;        // 0–100
  weight: number;       // sums to 100 across subscores
  detail: string;
}

export interface HealthScore {
  total: number;        // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  subs: HealthSubScore[];
}

export type AbcClass = 'A' | 'B' | 'C';
export type XyzClass = 'X' | 'Y' | 'Z' | '—';

export interface AbcXyzEntity {
  key: string;
  itemId?: string;
  value: number;        // total revenue from this item
  sharePct: number;
  cumPct: number;
  abc: AbcClass;
  cv: number | null;    // coefficient of variation across time buckets
  xyz: XyzClass;
  periods: number;
}

export interface AbcXyzResult {
  total: number;
  entities: AbcXyzEntity[];
  matrix: Record<string, AbcXyzEntity[]>;  // 'AX' | 'AY' | ... | 'CZ'
  counts: Record<string, number>;
  totals: Record<string, number>;
}

export type RfmSegment =
  | 'Champions' | 'Loyal' | 'Potential' | 'New'
  | 'AtRisk'    | 'Hibernating' | 'Lost';

export interface RfmEntity {
  customerId?: string;
  key: string;
  r: number;            // days since last order
  f: number;            // order count
  m: number;            // total monetary
  rScore: 1 | 2 | 3 | 4 | 5;
  fScore: 1 | 2 | 3 | 4 | 5;
  mScore: 1 | 2 | 3 | 4 | 5;
  segment: RfmSegment;
}

export interface RfmResult {
  entities: RfmEntity[];
  segmentCounts: Record<RfmSegment, number>;
  segmentRevenue: Record<RfmSegment, number>;
}

export interface InsightsBundle {
  generatedAt: string;
  kpis: KpiTile[];
  timeIntel: TimeIntel | null;
  alerts: Alert[];
  health: HealthScore;
  abcXyz: AbcXyzResult | null;
  rfm: RfmResult | null;
  narrative: string[];
  /** Tenant-wide order count gated by orders length so a one-order tenant
   *  doesn't see scary "no signal" zones — the UI can fall back to a tip. */
  signalLevel: 'low' | 'medium' | 'high';
}

// ─── helpers ────────────────────────────────────────────────────────────────
const safeDiv = (a: number, b: number) => (b !== 0 ? a / b : 0);
const pctChange = (cur: number, prev: number): number | null => {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function clamp100(x: number) { return Math.max(0, Math.min(100, x)); }

function grade(score: number): HealthScore['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ─── KPIs ───────────────────────────────────────────────────────────────────
function computeKpis(input: InsightsInput, lookbackDays: number): KpiTile[] {
  const now = Date.now();
  const cutoff = now - lookbackDays * 86_400_000;
  const prevCutoff = now - 2 * lookbackDays * 86_400_000;

  const current = input.orders.filter(
    (o) => o.status !== 'CANCELLED' && new Date(o.createdAt).getTime() >= cutoff,
  );
  const previous = input.orders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    const t = new Date(o.createdAt).getTime();
    return t >= prevCutoff && t < cutoff;
  });

  const sumBy = (rows: SalesOrder[], f: (o: SalesOrder) => number) =>
    rows.reduce((s, o) => s + (f(o) || 0), 0);

  const revenue = sumBy(current, (o) => o.customerTotal);
  const revPrev = sumBy(previous, (o) => o.customerTotal);
  const profit = sumBy(current, (o) => o.netProfit);
  const profitPrev = sumBy(previous, (o) => o.netProfit);
  const orders = current.length;
  const ordersPrev = previous.length;
  const aov = safeDiv(revenue, orders);
  const aovPrev = safeDiv(revPrev, ordersPrev);

  const uniqueCustomers = new Set(current.map((o) => o.customerId || o.customerPhone || o.customerName)).size;
  const prevCustomers = new Set(previous.map((o) => o.customerId || o.customerPhone || o.customerName)).size;
  const arOutstanding = input.balances.reduce((s, b) => s + b.outstanding, 0);

  return [
    { id: 'revenue',     label: 'إجمالي المبيعات',    value: revenue,        unit: 'money', changePct: pctChange(revenue, revPrev) },
    { id: 'profit',      label: 'صافي الربح',         value: profit,         unit: 'money', changePct: pctChange(profit, profitPrev) },
    { id: 'aov',         label: 'متوسط قيمة الطلب',   value: aov,            unit: 'money', changePct: pctChange(aov, aovPrev) },
    { id: 'orders',      label: 'عدد الطلبات',        value: orders,         unit: 'count', changePct: pctChange(orders, ordersPrev) },
    { id: 'customers',   label: 'عملاء فريدون',       value: uniqueCustomers, unit: 'count', changePct: pctChange(uniqueCustomers, prevCustomers) },
    { id: 'ar',          label: 'مستحقات قيد التحصيل', value: arOutstanding,  unit: 'money', changePct: null, hint: 'إجمالي ديون العملاء المسجلين' },
  ];
}

// ─── Time intelligence ──────────────────────────────────────────────────────
function computeTimeIntel(input: InsightsInput): TimeIntel | null {
  if (input.orders.length < 2) return null;

  const active = input.orders.filter((o) => o.status !== 'CANCELLED');
  if (!active.length) return null;

  // Project rows into a Date-indexed shape the bucketing helpers expect.
  const rows = active.map((o) => ({
    date: new Date(o.createdAt),
    revenue: o.customerTotal,
    profit: o.netProfit,
    one: 1,
  }));

  const dates = rows.map((r) => r.date);
  const g = detectGranularity(dates);

  const buckets = new Map<string, { revenue: number; profit: number; orders: number }>();
  for (const r of rows) {
    const k = bucketKey(r.date, g);
    const cur = buckets.get(k) ?? { revenue: 0, profit: 0, orders: 0 };
    cur.revenue += r.revenue;
    cur.profit  += r.profit;
    cur.orders  += 1;
    buckets.set(k, cur);
  }

  const keys = Array.from(buckets.keys()).sort();
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

  // MoM / YoY using the last bucket as the anchor.
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const mom = prev ? {
    revenue: pctChange(last.revenue, prev.revenue),
    profit:  pctChange(last.netProfit, prev.netProfit),
    orders:  pctChange(last.orderCount, prev.orderCount),
  } : { revenue: null, profit: null, orders: null };

  // Year-ago = same bucket key minus 12 buckets (rough but matches monthly grain).
  const lookback = g === 'year' ? 1 : g === 'quarter' ? 4 : g === 'month' ? 12 : g === 'week' ? 52 : 365;
  const yoyIdx = series.length - 1 - lookback;
  const yago = yoyIdx >= 0 ? series[yoyIdx] : null;
  const yoy = yago ? {
    revenue: pctChange(last.revenue, yago.revenue),
    profit:  pctChange(last.netProfit, yago.netProfit),
    orders:  pctChange(last.orderCount, yago.orderCount),
  } : { revenue: null, profit: null, orders: null };

  // YTD = sum of buckets whose key starts with current year.
  const currentYear = new Date().getFullYear().toString();
  const ytdRows = series.filter((s) => s.bucketKey.startsWith(currentYear));
  const ytd = ytdRows.reduce(
    (s, r) => ({ revenue: s.revenue + r.revenue, profit: s.profit + r.netProfit, orders: s.orders + r.orderCount }),
    { revenue: 0, profit: 0, orders: 0 },
  );

  return { granularity: g, series, mom, yoy, ytd };
}

// Local label helper (avoid bringing the lang-aware one — Arabic only here).
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

// ─── Alerts ─────────────────────────────────────────────────────────────────
function computeAlerts(input: InsightsInput, lookbackDays: number): Alert[] {
  const out: Alert[] = [];
  const now = Date.now();
  const cutoff = now - lookbackDays * 86_400_000;
  const recent = input.orders.filter(
    (o) => o.status !== 'CANCELLED' && new Date(o.createdAt).getTime() >= cutoff,
  );

  // 1) Low / out-of-stock items
  const lowStock = input.stock.filter((s) => s.status === 'NEEDS_REORDER' || s.status === 'LOW');
  const outOfStock = input.stock.filter((s) => s.status === 'OUT_OF_STOCK');
  if (outOfStock.length > 0) {
    out.push({
      id: 'stock.out',
      severity: 'crit',
      title: `${outOfStock.length} صنف نفد من المخزون`,
      message: 'هذه الأصناف لن تظهر في الطلبات الجديدة. تابع المخزون الحالي وأنشئ فاتورة مشتريات.',
      href: '/current-stock',
    });
  }
  if (lowStock.length > 0) {
    out.push({
      id: 'stock.low',
      severity: 'warn',
      title: `${lowStock.length} صنف اقترب من نفاد المخزون`,
      message: 'وصلت الكمية لحد إعادة الطلب. راجع التقرير قبل أن ينفد.',
      href: '/current-stock',
    });
  }

  // 2) Over-credit-limit customers
  const overLimit = input.balances.filter(
    (b) => b.creditLimit > 0 && b.outstanding > b.creditLimit,
  );
  if (overLimit.length > 0) {
    out.push({
      id: 'ar.over_limit',
      severity: 'crit',
      title: `${overLimit.length} عميل تجاوز الحد الائتماني`,
      message: 'تحقّق من المستحقات قبل قبول أي طلب جديد منهم.',
      href: '/customers/manage',
    });
  }

  // 3) Customers who dropped to zero this window vs last
  const prevCutoff = now - 2 * lookbackDays * 86_400_000;
  const prevWindow = input.orders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    const t = new Date(o.createdAt).getTime();
    return t >= prevCutoff && t < cutoff;
  });
  const recentBuyers = new Set(recent.map((o) => o.customerId || o.customerPhone));
  const churned: { name: string; lastTotal: number }[] = [];
  const tally: Record<string, { name: string; total: number }> = {};
  for (const o of prevWindow) {
    const key = (o.customerId || o.customerPhone) ?? '';
    if (!key) continue;
    const c = tally[key] ?? { name: o.customerName, total: 0 };
    c.total += o.customerTotal;
    tally[key] = c;
  }
  for (const [key, c] of Object.entries(tally)) {
    if (!recentBuyers.has(key) && c.total > 0) churned.push({ name: c.name, lastTotal: c.total });
  }
  if (churned.length >= 3) {
    out.push({
      id: 'cust.churn',
      severity: 'warn',
      title: `${churned.length} عميل اشترى آخر فترة ولم يرجع`,
      message: 'فرصة لتواصل سريع — قد يكون انتقل لمنافس.',
      href: '/customers',
    });
  }

  // 4) Revenue drop vs previous window
  const curRev = recent.reduce((s, o) => s + o.customerTotal, 0);
  const prevRev = prevWindow.reduce((s, o) => s + o.customerTotal, 0);
  if (prevRev > 0) {
    const dropPct = ((curRev - prevRev) / prevRev) * 100;
    if (dropPct <= -25) {
      out.push({
        id: 'rev.drop',
        severity: 'crit',
        title: `انخفضت المبيعات ${Math.abs(dropPct).toFixed(0)}٪ مقارنة بالفترة السابقة`,
        message: 'افحص الأصناف والعملاء الأكثر تأثراً في تبويب أعمار الديون وتصنيف ABC.',
      });
    } else if (dropPct >= 25) {
      out.push({
        id: 'rev.rise',
        severity: 'info',
        title: `ارتفعت المبيعات ${dropPct.toFixed(0)}٪ مقارنة بالفترة السابقة`,
        message: 'استمرّ في ما يعمل — قد تكون فرصة لتوسيع الحملات أو زيادة المخزون من الأصناف الأعلى مبيعاً.',
      });
    }
  }

  return out;
}

// ─── Health score ──────────────────────────────────────────────────────────
function computeHealth(input: InsightsInput, lookbackDays: number): HealthScore {
  // ── Growth: revenue trend over recent vs previous window
  const now = Date.now();
  const cutoff = now - lookbackDays * 86_400_000;
  const prevCutoff = now - 2 * lookbackDays * 86_400_000;
  const recent = input.orders.filter((o) => o.status !== 'CANCELLED' && new Date(o.createdAt).getTime() >= cutoff);
  const prev   = input.orders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    const t = new Date(o.createdAt).getTime();
    return t >= prevCutoff && t < cutoff;
  });
  const curRev = recent.reduce((s, o) => s + o.customerTotal, 0);
  const prevRev = prev.reduce((s, o) => s + o.customerTotal, 0);
  const growthPct = pctChange(curRev, prevRev);
  // Map −50%..+50% → 0..100 with neutral at 50.
  const growthScore = clamp100(50 + (growthPct ?? 0));

  // ── Risk: weighted by over-credit customers + out-of-stock items
  const overLimit = input.balances.filter((b) => b.creditLimit > 0 && b.outstanding > b.creditLimit).length;
  const overLimitFrac = safeDiv(overLimit, Math.max(1, input.customers.length));
  const outFrac = safeDiv(input.stock.filter((s) => s.status === 'OUT_OF_STOCK').length, Math.max(1, input.stock.length));
  const riskRaw = (overLimitFrac * 60) + (outFrac * 40);
  const riskScore = clamp100(100 - riskRaw * 100);

  // ── Retention: repeat-customer share
  const buyerCount = new Map<string, number>();
  for (const o of input.orders) {
    if (o.status === 'CANCELLED') continue;
    const k = o.customerId || o.customerPhone;
    if (!k) continue;
    buyerCount.set(k, (buyerCount.get(k) ?? 0) + 1);
  }
  const repeaters = Array.from(buyerCount.values()).filter((c) => c > 1).length;
  const repeatFrac = safeDiv(repeaters, Math.max(1, buyerCount.size));
  const retentionScore = clamp100(repeatFrac * 100);

  // ── Stability: coefficient of variation on the weekly revenue series
  const dates = input.orders
    .filter((o) => o.status !== 'CANCELLED')
    .map((o) => new Date(o.createdAt));
  let stabilityScore = 60; // neutral default when no signal
  if (dates.length >= 6) {
    const rows = input.orders
      .filter((o) => o.status !== 'CANCELLED')
      .map((o) => ({ date: new Date(o.createdAt), revenue: o.customerTotal } as const)) as Record<string, unknown>[];
    const bs = bucketSeries(rows, 'date', 'revenue');
    if (bs.sums.length >= 3) {
      const mean = bs.sums.reduce((a, b) => a + b, 0) / bs.sums.length;
      if (mean > 0) {
        const sd = Math.sqrt(bs.sums.reduce((a, v) => a + (v - mean) ** 2, 0) / bs.sums.length);
        const cv = sd / mean;
        // CV 0 = perfectly steady → 100, CV ≥ 1.5 → 0.
        stabilityScore = clamp100(100 * (1 - clamp01(cv / 1.5)));
      }
    }
  }

  const subs: HealthSubScore[] = [
    { id: 'growth',     label: 'النمو',     score: Math.round(growthScore),    weight: 30, detail: growthPct == null ? 'لا توجد فترة سابقة للمقارنة' : `تغيّر ${growthPct.toFixed(1)}٪ مقارنة بالفترة السابقة` },
    { id: 'risk',       label: 'المخاطر',   score: Math.round(riskScore),      weight: 25, detail: overLimit > 0 ? `${overLimit} عميل تجاوز الحد` : 'لا توجد مخاطر ائتمانية بارزة' },
    { id: 'retention',  label: 'الاحتفاظ',  score: Math.round(retentionScore), weight: 25, detail: `${Math.round(repeatFrac * 100)}٪ من العملاء تكرّروا` },
    { id: 'stability',  label: 'الاستقرار', score: Math.round(stabilityScore), weight: 20, detail: 'بناءً على تذبذب المبيعات الأسبوعية' },
  ];
  const total = subs.reduce((s, b) => s + (b.score * b.weight) / 100, 0);
  return { total: Math.round(total), grade: grade(total), subs };
}

// ─── ABC × XYZ for items ────────────────────────────────────────────────────
function classifyAbc(cumPct: number): AbcClass {
  if (cumPct <= 80) return 'A';
  if (cumPct <= 95) return 'B';
  return 'C';
}
function classifyXyz(cv: number | null): XyzClass {
  if (cv == null || !Number.isFinite(cv)) return '—';
  if (cv < 0.5) return 'X';
  if (cv < 1.0) return 'Y';
  return 'Z';
}

function computeAbcXyz(input: InsightsInput): AbcXyzResult | null {
  if (input.orders.length < 3) return null;
  // Aggregate revenue per item from sales_orders.items (each line carries itemId + qty + price).
  const byItem = new Map<string, { itemId: string; name: string; value: number; rowsByDate: Record<string, number> }>();
  for (const o of input.orders) {
    if (o.status === 'CANCELLED') continue;
    if (!Array.isArray(o.items)) continue;
    const dayKey = o.createdAt.slice(0, 10); // YYYY-MM-DD
    for (const line of o.items) {
      const lineValue = (line.quantity ?? 0) * (line.sellingPrice ?? 0);
      const cur = byItem.get(line.itemId) ?? {
        itemId: line.itemId,
        name: line.itemName ?? line.itemCode ?? line.itemId,
        value: 0,
        rowsByDate: {},
      };
      cur.value += lineValue;
      cur.rowsByDate[dayKey] = (cur.rowsByDate[dayKey] ?? 0) + lineValue;
      byItem.set(line.itemId, cur);
    }
  }
  const arr = Array.from(byItem.values()).filter((e) => e.value > 0);
  if (arr.length < 3) return null;
  arr.sort((a, b) => b.value - a.value);
  const total = arr.reduce((s, e) => s + e.value, 0);
  if (total <= 0) return null;

  let cum = 0;
  const entities: AbcXyzEntity[] = arr.map((e) => {
    const share = (e.value / total) * 100;
    cum += share;
    // CV per entity from its daily series.
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
      key: e.name,
      itemId: e.itemId,
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

// ─── RFM segmentation for customers ────────────────────────────────────────
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
  // Standard 11-cell map collapsed into 7 useful segments.
  if (r >= 4 && f >= 4) return 'Champions';
  if (r >= 3 && f >= 3) return 'Loyal';
  if (r >= 4 && f <= 2) return 'New';
  if (r >= 3 && f <= 2) return 'Potential';
  if (r <= 2 && f >= 3) return 'AtRisk';
  if (r <= 2 && f === 2) return 'Hibernating';
  return 'Lost';
}

function computeRfm(input: InsightsInput): RfmResult | null {
  if (input.orders.length < 3) return null;
  const now = Date.now();
  const byCustomer = new Map<string, { id: string; name: string; lastTs: number; freq: number; total: number; isRegistered: boolean }>();
  for (const o of input.orders) {
    if (o.status === 'CANCELLED') continue;
    const key = o.customerId ?? o.customerPhone ?? o.customerName;
    if (!key) continue;
    const isReg = !!o.customerId;
    const ts = new Date(o.createdAt).getTime();
    const cur = byCustomer.get(key) ?? { id: key, name: o.customerName, lastTs: 0, freq: 0, total: 0, isRegistered: isReg };
    cur.lastTs = Math.max(cur.lastTs, ts);
    cur.freq += 1;
    cur.total += o.customerTotal;
    cur.isRegistered = cur.isRegistered || isReg;
    byCustomer.set(key, cur);
  }
  const arr = Array.from(byCustomer.values());
  if (arr.length < 3) return null;

  // Lower recency = better (sorted ascending). We invert so a smaller R gets a higher score.
  const recencyDays = arr.map((c) => (now - c.lastTs) / 86_400_000);
  const recAsc = [...recencyDays].sort((a, b) => a - b);
  const freqAsc = [...arr.map((c) => c.freq)].sort((a, b) => a - b);
  const monAsc  = [...arr.map((c) => c.total)].sort((a, b) => a - b);

  const segmentCounts = { Champions: 0, Loyal: 0, Potential: 0, New: 0, AtRisk: 0, Hibernating: 0, Lost: 0 } as Record<RfmSegment, number>;
  const segmentRevenue = { Champions: 0, Loyal: 0, Potential: 0, New: 0, AtRisk: 0, Hibernating: 0, Lost: 0 } as Record<RfmSegment, number>;

  const entities: RfmEntity[] = arr.map((c) => {
    const recDays = (now - c.lastTs) / 86_400_000;
    // Invert for R-score: less recent days = lower position in ascending sort = HIGHER score.
    const rRaw = score5(recDays, recAsc);
    const rScore = (6 - rRaw) as 1 | 2 | 3 | 4 | 5;
    const fScore = score5(c.freq, freqAsc);
    const mScore = score5(c.total, monAsc);
    const seg = segmentOf(rScore, fScore);
    segmentCounts[seg]++;
    segmentRevenue[seg] += c.total;
    return {
      customerId: c.isRegistered ? c.id : undefined,
      key: c.name,
      r: Math.round(recDays),
      f: c.freq,
      m: c.total,
      rScore, fScore, mScore,
      segment: seg,
    };
  }).sort((a, b) => b.m - a.m);

  return { entities, segmentCounts, segmentRevenue };
}

// ─── Narrative — short Arabic summary ──────────────────────────────────────
function buildNarrative(b: Omit<InsightsBundle, 'narrative' | 'generatedAt' | 'signalLevel'>): string[] {
  const out: string[] = [];
  const rev = b.kpis.find((k) => k.id === 'revenue');
  const profit = b.kpis.find((k) => k.id === 'profit');
  const ar = b.kpis.find((k) => k.id === 'ar');
  if (rev) {
    const dir = rev.changePct == null ? '' : rev.changePct >= 0 ? `بنمو ${rev.changePct.toFixed(1)}٪` : `بانخفاض ${Math.abs(rev.changePct).toFixed(1)}٪`;
    out.push(`المبيعات الإجمالية ${rev.value.toLocaleString('en-US', { maximumFractionDigits: 0 })} د.ل ${dir} مقارنة بالفترة السابقة.`);
  }
  if (profit && profit.value > 0) {
    out.push(`صافي الربح ${profit.value.toLocaleString('en-US', { maximumFractionDigits: 0 })} د.ل — هامش ${rev && rev.value > 0 ? ((profit.value / rev.value) * 100).toFixed(1) : '0'}٪.`);
  }
  if (ar && ar.value > 0) {
    out.push(`المستحقات قيد التحصيل ${ar.value.toLocaleString('en-US', { maximumFractionDigits: 0 })} د.ل — تابع تبويب أعمار الديون.`);
  }
  if (b.abcXyz) {
    const stars = b.abcXyz.matrix['AX'].length + b.abcXyz.matrix['AY'].length + b.abcXyz.matrix['AZ'].length;
    out.push(`${stars} صنف ضمن الفئة A — تستحق أعلى أولوية للحماية والمخزون.`);
  }
  if (b.rfm) {
    const champs = b.rfm.segmentCounts.Champions;
    const atRisk = b.rfm.segmentCounts.AtRisk + b.rfm.segmentCounts.Hibernating;
    if (champs > 0) out.push(`لديك ${champs} عميل من فئة Champions — استثمر في الاحتفاظ بهم.`);
    if (atRisk > 0) out.push(`${atRisk} عميل في فئة At Risk أو Hibernating — فرصة لتواصل سريع.`);
  }
  if (b.alerts.some((a) => a.severity === 'crit')) {
    out.push('هناك تنبيهات حرجة في الأعلى — راجعها قبل إغلاق اليوم.');
  }
  return out;
}

// ─── Public entry ──────────────────────────────────────────────────────────
export function buildInsights(input: InsightsInput): InsightsBundle {
  const lookback = input.rangeDays ?? 30;
  const kpis = computeKpis(input, lookback);
  const timeIntel = computeTimeIntel(input);
  const alerts = computeAlerts(input, lookback);
  const health = computeHealth(input, lookback);
  const abcXyz = computeAbcXyz(input);
  const rfm = computeRfm(input);

  const validOrders = input.orders.filter((o) => o.status !== 'CANCELLED').length;
  const signalLevel: InsightsBundle['signalLevel'] =
    validOrders >= 50 ? 'high' :
    validOrders >= 10 ? 'medium' : 'low';

  const partial: Omit<InsightsBundle, 'narrative' | 'generatedAt' | 'signalLevel'> = {
    kpis, timeIntel, alerts, health, abcXyz, rfm,
  };

  return {
    ...partial,
    narrative: buildNarrative(partial),
    generatedAt: new Date().toISOString(),
    signalLevel,
  };
}

// Segment metadata for the UI.
export const RFM_SEGMENT_LABELS: Record<RfmSegment, { label: string; color: string; advice: string }> = {
  Champions:   { label: 'أبطال',         color: 'text-emerald-700 bg-emerald-50',   advice: 'أعطهم برنامج VIP — احتفظ بهم.' },
  Loyal:       { label: 'مخلصون',        color: 'text-blue-700 bg-blue-50',          advice: 'حوافز للترقية إلى Champions.' },
  Potential:   { label: 'محتملون',       color: 'text-violet-700 bg-violet-50',      advice: 'حملات تنشيط لاستكمال الرحلة.' },
  New:         { label: 'جدد',           color: 'text-cyan-700 bg-cyan-50',          advice: 'رسالة ترحيب وعرض أول طلب.' },
  AtRisk:      { label: 'في خطر',        color: 'text-amber-700 bg-amber-50',        advice: 'تواصل شخصي — قد يكون انتقل لمنافس.' },
  Hibernating: { label: 'خامدون',        color: 'text-orange-700 bg-orange-50',      advice: 'حملة استعادة بخصم أو منتج جديد.' },
  Lost:        { label: 'مفقودون',       color: 'text-red-700 bg-red-50',            advice: 'تكلفة الاسترجاع عالية — ركز موارد محدودة.' },
};

export const ABC_CELL_LABELS: Record<string, { label: string; advice: string }> = {
  AX: { label: 'نجوم مستقرة',     advice: 'أولوية حماية المخزون والتوفر.' },
  AY: { label: 'نجوم متقلّبة',    advice: 'احتفظ بمخزون أمان أعلى.' },
  AZ: { label: 'نجوم غير منتظمة', advice: 'راقب عن قرب — صعب التنبؤ.' },
  BX: { label: 'أساسيات مستقرة',   advice: 'إدارة قياسية بالأتمتة.' },
  BY: { label: 'أساسيات متقلّبة',  advice: 'اضبط مستويات إعادة الطلب دورياً.' },
  BZ: { label: 'أساسيات غير منتظمة', advice: 'راجع الجدوى أو حوّل لطلب عند الحاجة.' },
  CX: { label: 'هامشية مستقرة',    advice: 'كميات صغيرة وأتمتة كاملة.' },
  CY: { label: 'هامشية متقلّبة',   advice: 'قلّل المخزون.' },
  CZ: { label: 'ذيل طويل غير منتظم', advice: 'مرشّحة للتقليم أو الإلغاء.' },
};
