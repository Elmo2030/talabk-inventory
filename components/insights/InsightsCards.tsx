'use client';

/**
 * Insights cards — Wave H
 *
 * Six related render surfaces for the /insights dashboard, bundled in
 * one file because they all consume the same InsightsBundle and are
 * small enough that splitting would just add boilerplate.
 *
 *   KpiGrid          — 6 hero KPI tiles with MoM/YoY arrow
 *   AlertsStrip      — actionable issues sorted by severity
 *   HealthScoreCard  — circular gauge + 4 subscores
 *   TimeIntelCard    — revenue/profit/orders sparkline with MoM/YoY/YTD
 *   AbcXyzSection    — 3×4 product classification matrix
 *   RfmSection       — 7-segment customer table with counts + revenue
 *   NarrativeCard    — auto-written Arabic summary
 */

import { TrendingUp, TrendingDown, AlertCircle, AlertTriangle, Info, Award, Sparkles, ExternalLink, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { formatMoney, formatNumber } from '@/lib/format';
import type {
  InsightsBundle, KpiTile, Alert, HealthScore, TimeIntel, AbcXyzResult, RfmResult,
} from '@/lib/insights/talabkInsights';
import { RFM_SEGMENT_LABELS, ABC_CELL_LABELS } from '@/lib/insights/talabkInsights';

// ─── Shared atoms ──────────────────────────────────────────────────────────
function ChangeChip({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[10px] text-slate-400">—</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const color = up ? 'text-emerald-700' : 'text-red-700';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}٪
    </span>
  );
}

function formatKpi(value: number, unit: KpiTile['unit']): string {
  if (unit === 'money') return formatMoney(value);
  if (unit === 'percent') return `${value.toFixed(1)}٪`;
  return formatNumber(value, { decimals: 0 });
}

// ─── KPI grid ──────────────────────────────────────────────────────────────
export function KpiGrid({ kpis }: { kpis: KpiTile[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {kpis.map((k) => (
        <div
          key={k.id}
          className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-4"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">{k.label}</p>
            <ChangeChip value={k.changePct} />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5]">
            {formatKpi(k.value, k.unit)}
          </p>
          {k.hint && (
            <p className="text-[11px] text-slate-400 dark:text-[#71717A] mt-1">{k.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Alerts strip ──────────────────────────────────────────────────────────
const ALERT_STYLE: Record<Alert['severity'], { Icon: typeof AlertCircle; bg: string; text: string; border: string }> = {
  crit: { Icon: AlertCircle,    bg: 'bg-red-50 dark:bg-red-950/20',     text: 'text-red-700 dark:text-red-300',     border: 'border-red-200 dark:border-red-900/40' },
  warn: { Icon: AlertTriangle,  bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-900/40' },
  info: { Icon: Info,            bg: 'bg-blue-50 dark:bg-blue-950/20',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-200 dark:border-blue-900/40' },
};

export function AlertsStrip({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-2xl p-4 flex items-center gap-3">
        <Award className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">لا توجد تنبيهات حالياً — كل المؤشرات في المعدل الطبيعي.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const s = ALERT_STYLE[a.severity];
        const Body = (
          <div className={`flex items-start gap-3 p-4 rounded-2xl border ${s.bg} ${s.text} ${s.border}`}>
            <s.Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-xs mt-0.5 opacity-90">{a.message}</p>
            </div>
            {a.href && <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />}
          </div>
        );
        return a.href ? (
          <Link key={a.id} href={a.href} className="block transition-opacity hover:opacity-90">{Body}</Link>
        ) : (
          <div key={a.id}>{Body}</div>
        );
      })}
    </div>
  );
}

// ─── Health score gauge ────────────────────────────────────────────────────
const GRADE_COLOR: Record<HealthScore['grade'], string> = {
  A: 'text-emerald-600', B: 'text-blue-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-red-600',
};

export function HealthScoreCard({ health }: { health: HealthScore }) {
  // Pure CSS conic-gradient gauge — no extra recharts allocation for this tiny ring.
  const pct = Math.max(0, Math.min(100, health.total));
  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F4F5]">صحة المتجر</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-28 h-28 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(currentColor ${pct * 3.6}deg, #E5E5EA 0deg)` }}
            aria-hidden="true"
          />
          <div className={`absolute inset-0 rounded-full ${GRADE_COLOR[health.grade]}`} style={{ opacity: 0 }} />
          <div className="absolute inset-2 bg-white dark:bg-[#18181B] rounded-full flex items-center justify-center flex-col">
            <span className={`text-2xl font-bold ${GRADE_COLOR[health.grade]}`}>{health.total}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">من 100</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-2 w-full">
          {health.subs.map((s) => (
            <div key={s.id} className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600 dark:text-[#A1A1AA]">{s.label}</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-[#F4F4F5]">{s.score}</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-[#27272A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${s.score}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-[#71717A] mt-1 line-clamp-1">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Time intelligence card ────────────────────────────────────────────────
export function TimeIntelCard({ ti }: { ti: TimeIntel | null }) {
  if (!ti) {
    return (
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-6 text-center text-sm text-slate-500">
        لا توجد بيانات كافية للتحليل الزمني — سجّل بضعة طلبات أولاً.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F4F5]">الذكاء الزمني — المبيعات</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-[#A1A1AA]">شهر مقابل سابق:</span>{' '}
            <ChangeChip value={ti.mom.revenue} />
          </div>
          <div>
            <span className="text-slate-500 dark:text-[#A1A1AA]">سنوي:</span>{' '}
            <ChangeChip value={ti.yoy.revenue} />
          </div>
          <div>
            <span className="text-slate-500 dark:text-[#A1A1AA]">منذ بداية السنة:</span>{' '}
            <span className="font-mono text-slate-900 dark:text-[#F4F4F5] font-semibold">{formatMoney(ti.ytd.revenue, { withSuffix: false })}</span>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ti.series} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#E5302A" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#E5302A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
            <XAxis dataKey="bucketLabel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v, { decimals: 0 })} />
            <Tooltip
              formatter={(v: number) => formatMoney(v)}
              labelStyle={{ direction: 'rtl' }}
            />
            <Area type="monotone" dataKey="revenue" name="المبيعات" stroke="#E5302A" fill="url(#rev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── ABC × XYZ section ─────────────────────────────────────────────────────
export function AbcXyzSection({ data }: { data: AbcXyzResult | null }) {
  if (!data) {
    return (
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-6 text-center text-sm text-slate-500">
        لا توجد بيانات كافية لتصنيف ABC×XYZ — تحتاج إلى 3 أصناف على الأقل في الطلبات.
      </div>
    );
  }
  const abcRows: Array<{ a: 'A' | 'B' | 'C'; label: string }> = [
    { a: 'A', label: 'A — قيمة عالية' }, { a: 'B', label: 'B — قيمة متوسطة' }, { a: 'C', label: 'C — قيمة منخفضة' },
  ];
  const xyzCols: Array<{ x: 'X' | 'Y' | 'Z' | '—'; label: string }> = [
    { x: 'X', label: 'X — مستقر' }, { x: 'Y', label: 'Y — متقلب' }, { x: 'Z', label: 'Z — غير منتظم' }, { x: '—', label: '—' },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F4F5]">تصنيف الأصناف ABC × XYZ</h3>
        <span className="text-xs text-slate-500">{data.entities.length} صنف · إجمالي {formatMoney(data.total)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr>
              <th className="px-2 py-2 text-right font-semibold text-slate-600 dark:text-[#A1A1AA]"></th>
              {xyzCols.map((c) => (
                <th key={c.x} className="px-2 py-2 text-center font-semibold text-slate-600 dark:text-[#A1A1AA]">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {abcRows.map((r) => (
              <tr key={r.a}>
                <td className="px-2 py-2 font-semibold text-slate-700 dark:text-[#E4E4E7]">{r.label}</td>
                {xyzCols.map((c) => {
                  const k = r.a + c.x;
                  const cnt = data.counts[k] ?? 0;
                  const total = data.totals[k] ?? 0;
                  const cell = ABC_CELL_LABELS[k];
                  const intensity = cnt > 0 ? Math.min(1, 0.15 + (total / data.total)) : 0;
                  return (
                    <td
                      key={k}
                      className="px-2 py-2 text-center align-top"
                      style={{ background: cnt > 0 ? `rgba(229, 48, 42, ${intensity * 0.25})` : undefined }}
                    >
                      <div className="font-mono font-bold text-slate-900 dark:text-[#F4F4F5]">{cnt}</div>
                      {cnt > 0 && <div className="text-[10px] text-slate-500 dark:text-[#A1A1AA] mt-0.5">{formatMoney(total, { withSuffix: false })}</div>}
                      {cell && cnt > 0 && (
                        <div className="text-[10px] text-slate-600 dark:text-[#A1A1AA] mt-1 leading-tight">{cell.label}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-3">
        A = أعلى 80٪ من القيمة. X = طلب مستقر. ركّز موارد المخزون على خلية AX.
      </p>
    </div>
  );
}

// ─── RFM section ───────────────────────────────────────────────────────────
const SEGMENT_ORDER: Array<keyof typeof RFM_SEGMENT_LABELS> = [
  'Champions', 'Loyal', 'Potential', 'New', 'AtRisk', 'Hibernating', 'Lost',
];

export function RfmSection({ data }: { data: RfmResult | null }) {
  if (!data) {
    return (
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-6 text-center text-sm text-slate-500">
        لا توجد بيانات كافية لتقسيم العملاء RFM — تحتاج إلى 3 عملاء فريدين على الأقل.
      </div>
    );
  }
  const totalCount = SEGMENT_ORDER.reduce((s, k) => s + data.segmentCounts[k], 0);
  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F4F5]">تقسيم العملاء RFM</h3>
        <span className="text-xs text-slate-500">{totalCount} عميل</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SEGMENT_ORDER.map((seg) => {
          const meta = RFM_SEGMENT_LABELS[seg];
          const cnt = data.segmentCounts[seg];
          const rev = data.segmentRevenue[seg];
          if (cnt === 0) return null;
          return (
            <div key={seg} className="rounded-xl p-3 border border-[#E5E5EA] dark:border-[#27272A]">
              <div className="flex items-center justify-between mb-1">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="text-xs font-mono text-slate-700 dark:text-[#E4E4E7]">{cnt}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[#A1A1AA] mb-1">{meta.advice}</p>
              <p className="text-xs font-mono text-slate-900 dark:text-[#F4F4F5]">{formatMoney(rev)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Narrative card ────────────────────────────────────────────────────────
export function NarrativeCard({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="bg-gradient-to-l from-brand-500/10 to-transparent border border-brand-500/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F4F5]">ملخص الذكاء التحليلي</h3>
      </div>
      <ul className="space-y-2 text-sm text-slate-700 dark:text-[#E4E4E7]">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-brand-500 mt-1">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Container that wires the whole bundle into a single tree ──────────────
export function InsightsDashboard({ bundle }: { bundle: InsightsBundle }) {
  return (
    <div className="space-y-5">
      <NarrativeCard lines={bundle.narrative} />
      <KpiGrid kpis={bundle.kpis} />
      <AlertsStrip alerts={bundle.alerts} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <HealthScoreCard health={bundle.health} />
        <TimeIntelCard ti={bundle.timeIntel} />
      </div>
      <AbcXyzSection data={bundle.abcXyz} />
      <RfmSection data={bundle.rfm} />
      <p className="text-[10px] text-slate-400 dark:text-[#71717A] text-center">
        تم التحديث في {new Date(bundle.generatedAt).toLocaleString('en-US')}
        {bundle.signalLevel === 'low' && ' · إشارة محدودة — سجّل المزيد من الطلبات لتحليل أعمق'}
      </p>
    </div>
  );
}

// Adapter symbol re-export so the page only imports from this module.
export type { InsightsBundle };
