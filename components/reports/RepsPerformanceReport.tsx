'use client';

/**
 * Reps performance report — Wave G #1
 *
 * Aggregates sales_orders.rep_id joins client-side. For the rep volumes we
 * support (dozens of reps × thousands of orders) a single O(N) pass over
 * the orders array is fine; no need for a server-side RPC yet.
 *
 * KPIs per rep:
 *   • orders count
 *   • total revenue (sum of customerTotal)
 *   • net profit (sum of netProfit)
 *   • commission (commissionPct% of net profit) — display only,
 *     not authoritative for payroll until commission_payouts ships
 *   • last order date
 *   • monthly trend bar (this month vs last month revenue)
 *
 * Range filter: last 30 / 90 / 365 days, with an "all time" escape.
 */

import { useMemo, useState } from 'react';
import { Users, TrendingUp, Award, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSalesReps, useOrders } from '@/lib/StockContext';
import { formatMoney, formatNumber } from '@/lib/format';

type RangeId = '30d' | '90d' | '365d' | 'all';
const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: '30d',  label: 'آخر 30 يوم', days: 30 },
  { id: '90d',  label: 'آخر 90 يوم', days: 90 },
  { id: '365d', label: 'آخر سنة',   days: 365 },
  { id: 'all',  label: 'كل الفترة', days: null },
];

interface RepAgg {
  repId: string | null;
  repName: string;
  code: string;
  territory?: string;
  status: 'ACTIVE' | 'INACTIVE' | null;
  commissionPct: number;
  orders: number;
  revenue: number;
  netProfit: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  lastOrderAt?: string;
}

export default function RepsPerformanceReport() {
  const { salesReps } = useSalesReps();
  const { salesOrders } = useOrders();
  const [range, setRange] = useState<RangeId>('90d');

  const cutoff = useMemo(() => {
    const cfg = RANGES.find((r) => r.id === range)!;
    return cfg.days ? Date.now() - cfg.days * 86400_000 : null;
  }, [range]);

  const { rows, totals } = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const acc: Record<string, RepAgg> = {};
    // Seed every known rep so reps with zero orders still appear (lets the
    // manager see who isn't selling).
    for (const r of salesReps) {
      acc[r.id] = {
        repId: r.id,
        repName: r.name,
        code: r.code,
        territory: r.territory,
        status: r.status,
        commissionPct: r.commissionPct,
        orders: 0,
        revenue: 0,
        netProfit: 0,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
      };
    }
    // Unassigned bucket (orders without a rep) — only added if it ends up
    // non-empty.
    const UNASSIGNED = '__unassigned__';

    for (const o of salesOrders) {
      const t = new Date(o.createdAt).getTime();
      if (cutoff && t < cutoff) continue;
      const key = o.repId ?? UNASSIGNED;
      const bucket = acc[key] ?? {
        repId: o.repId ?? null,
        repName: o.repId ? (o.repName ?? '— مندوب محذوف —') : '— بدون مندوب —',
        code: '',
        status: null,
        commissionPct: 0,
        orders: 0,
        revenue: 0,
        netProfit: 0,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
      };
      bucket.orders   += 1;
      bucket.revenue  += o.customerTotal;
      bucket.netProfit += o.netProfit;
      const monthKey = o.createdAt.slice(0, 7);
      if (monthKey === thisMonth) bucket.thisMonthRevenue += o.customerTotal;
      if (monthKey === lastMonth) bucket.lastMonthRevenue += o.customerTotal;
      if (!bucket.lastOrderAt || o.createdAt > bucket.lastOrderAt) bucket.lastOrderAt = o.createdAt;
      acc[key] = bucket;
    }

    const list = Object.values(acc).sort((a, b) => b.revenue - a.revenue);
    const tot = list.reduce(
      (s, r) => ({
        orders:   s.orders + r.orders,
        revenue:  s.revenue + r.revenue,
        netProfit: s.netProfit + r.netProfit,
        commission: s.commission + (r.netProfit * r.commissionPct) / 100,
      }),
      { orders: 0, revenue: 0, netProfit: 0, commission: 0 }
    );
    return { rows: list, totals: tot };
  }, [salesReps, salesOrders, cutoff]);

  if (salesReps.length === 0) {
    return (
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-12 text-center">
        <Users className="w-12 h-12 text-slate-300 dark:text-[#52525B] mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-900 dark:text-[#F4F4F5] mb-1">لم تضف مندوبين بعد</p>
        <p className="text-sm text-slate-500 dark:text-[#A1A1AA] mb-4">سجّل فريق المبيعات أولاً ليبدأ التقرير في تجميع أدائهم.</p>
        <Link
          href="/sales-reps"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          إضافة مندوب
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Range filter */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              range === r.id
                ? 'bg-[#E5302A] text-white border-[#E5302A]'
                : 'bg-white dark:bg-[#18181B] text-slate-700 dark:text-[#E4E4E7] border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الطلبات',  value: formatNumber(totals.orders, { decimals: 0 }), icon: TrendingUp, color: 'text-brand-600' },
          { label: 'إجمالي المبيعات', value: formatMoney(totals.revenue), icon: Award,    color: 'text-green-600' },
          { label: 'صافي الربح',     value: formatMoney(totals.netProfit), icon: TrendingUp, color: 'text-amber-700' },
          { label: 'إجمالي العمولات', value: formatMoney(totals.commission), icon: Calendar, color: 'text-indigo-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mb-1">{k.label}</p>
            <p className={`text-base sm:text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Per-rep table */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المندوب</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المنطقة</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الطلبات</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المبيعات</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">صافي الربح</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">شهر/الشهر السابق</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">العمولة</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">آخر طلب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500 dark:text-[#A1A1AA] text-sm">
                    <AlertCircle className="w-5 h-5 inline-block ms-2" />
                    لا توجد طلبات في الفترة المحددة
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const trendUp = r.thisMonthRevenue >= r.lastMonthRevenue;
                  const commission = (r.netProfit * r.commissionPct) / 100;
                  const isUnassigned = !r.repId;
                  return (
                    <tr
                      key={r.repId ?? '__unassigned__'}
                      id={r.repId ?? undefined}
                      className={`hover:bg-slate-50 dark:hover:bg-[#27272A]/40 ${
                        isUnassigned ? 'text-slate-500 italic' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900 dark:text-[#F4F4F5]">{r.repName}</div>
                        {r.code && <div className="text-[10px] font-mono text-slate-400 dark:text-[#52525B] mt-0.5">{r.code}</div>}
                        {r.status === 'INACTIVE' && (
                          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">موقوف</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-[#E4E4E7]">{r.territory ?? '—'}</td>
                      <td className="px-3 py-3 font-mono">{r.orders}</td>
                      <td className="px-3 py-3 font-mono text-green-700 dark:text-green-400">{formatMoney(r.revenue)}</td>
                      <td className="px-3 py-3 font-mono text-amber-700 dark:text-amber-400">{formatMoney(r.netProfit)}</td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-slate-600 dark:text-[#A1A1AA]">
                          {formatMoney(r.thisMonthRevenue)} / {formatMoney(r.lastMonthRevenue)}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                          {trendUp ? '↑ نمو' : '↓ انخفاض'}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-indigo-700 dark:text-indigo-400">
                        {r.commissionPct > 0 ? formatMoney(commission) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-[#A1A1AA]">
                        {r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString('en-US') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
