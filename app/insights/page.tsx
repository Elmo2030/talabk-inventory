'use client';

/**
 * /insights — Smart insights dashboard (Wave H)
 *
 * Reads live Talabk data (orders, items, customers, balances, reps,
 * current stock) and renders a 6-card dashboard with KPIs, alerts,
 * health score, time intelligence, ABC×XYZ, and RFM. The analysis
 * runs entirely in the browser so the page works offline once the
 * data is loaded.
 *
 * Range filter: 30 / 90 / 365 days. Default 30. The full orders array
 * is always passed to the engine for ABC/RFM (which need the whole
 * history) — only the KPIs and alerts honor the lookback window.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, RefreshCw, UploadCloud } from 'lucide-react';
import { useItems, useOrders, useCustomers, useMovements, useSalesReps } from '@/lib/StockContext';
import { buildInsights } from '@/lib/insights/talabkInsights';
import { InsightsDashboard } from '@/components/insights/InsightsCards';

type RangeId = '30d' | '90d' | '365d';
const RANGES: { id: RangeId; label: string; days: number }[] = [
  { id: '30d',  label: 'آخر 30 يوم', days: 30 },
  { id: '90d',  label: 'آخر 90 يوم', days: 90 },
  { id: '365d', label: 'آخر سنة',   days: 365 },
];

export default function InsightsPage() {
  const { items } = useItems();
  const { salesOrders } = useOrders();
  const { customers, customerBalances } = useCustomers();
  const { currentStock } = useMovements();
  const { salesReps } = useSalesReps();

  const [range, setRange] = useState<RangeId>('30d');

  const bundle = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days;
    return buildInsights({
      orders:    salesOrders,
      items,
      customers,
      balances:  customerBalances,
      salesReps,
      stock:     currentStock,
      rangeDays: days,
    });
  }, [salesOrders, items, customers, customerBalances, salesReps, currentStock, range]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-600" />
            ذكاء البيانات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            تحليل ذكي يتجدّد لحظياً من بيانات متجرك — KPIs، تنبيهات، تصنيف الأصناف، وتقسيم العملاء.
          </p>
        </div>
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
          {/* Upload-mode entry point. The CSV/XLSX flow runs in a separate
              route to keep the live-data hook tree clean and to give the
              file picker its own URL the user can bookmark. */}
          <Link
            href="/insights/upload"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border bg-white dark:bg-[#18181B] text-slate-700 dark:text-[#E4E4E7] border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A] transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            رفع ملف خارجي
          </Link>
        </div>
      </div>

      {salesOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-12 text-center">
          <RefreshCw className="w-12 h-12 text-slate-300 dark:text-[#52525B] mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-900 dark:text-[#F4F4F5] mb-1">لا توجد طلبات لتحليلها</p>
          <p className="text-sm text-slate-500 dark:text-[#A1A1AA]">سجّل أول طلب لتبدأ في رؤية التحليلات الذكية هنا.</p>
        </div>
      ) : (
        <InsightsDashboard bundle={bundle} />
      )}
    </div>
  );
}
