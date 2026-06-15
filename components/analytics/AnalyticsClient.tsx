'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, BarChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, DollarSign, Package, ChevronDown, ChevronUp,
  Edit2, Check, X, Target, BarChart2, Users, MapPin, Truck, Home, Briefcase,
} from 'lucide-react';
import { useItems, useMovements, useOrders, usePurchases } from '@/lib/StockContext';
import { useTheme } from '@/lib/ThemeContext';
import { MONTHS } from '@/lib/constants';
import { formatNumber , formatMoney} from '@/lib/format';

// ─── Constants ───────────────────────────────────────────────────────────────
const PALETTE = ['#E5302A','#3B82F6','#22C55E','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#F97316'];
const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#22C55E',
  PENDING: '#F59E0B',
  PROCESSING: '#3B82F6',
  SHIPPED: '#F97316',
  CANCELLED: '#EF4444',
};
const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'تم التسليم',
  PENDING: 'معلّق',
  PROCESSING: 'قيد التجهيز',
  SHIPPED: 'في الطريق',
  CANCELLED: 'ملغي',
};

interface Targets {
  year: number;
  month: number;
  revenueTarget: number;
  profitTarget: number;
  ordersTarget: number;
}

const defaultTargets: Targets = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  revenueTarget: 50000,
  profitTarget: 15000,
  ordersTarget: 50,
};

// ─── Small helpers ────────────────────────────────────────────────────────────
function fmt(n: number) { return formatNumber(n, { decimals: 0 }); }
function fmtD(n: number, d = 1) { return formatNumber(n, { decimals: d }); }

function KpiCard({
  label, value, sub, color, icon: Icon, isDark,
}: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType; isDark: boolean;
}) {
  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1 text-[#1C1C1E] dark:text-[#F4F4F5]">{value}</p>
      {sub && <p className="text-xs text-[#AEAEB2] mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">{children}</h2>
  );
}

function ChartCard({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5 ${full ? 'col-span-full' : ''}`}>
      <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ProgressBar({ label, actual, target, color, formatFn }: {
  label: string; actual: number; target: number; color: string; formatFn: (n: number) => string;
}) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[#1C1C1E] dark:text-[#F4F4F5]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color }}>{formatFn(actual)}</span>
          <span className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">/ {formatFn(target)}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color + '20', color }}>{fmtD(pct)}%</span>
        </div>
      </div>
      <div className="h-2.5 bg-[#E5E5EA] dark:bg-[#27272A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Main client island (lazy-loaded from app/analytics/page.tsx) ──────────
export default function AnalyticsClient() {
  const { items } = useItems();
  const { currentStock } = useMovements();
  const { salesOrders } = useOrders();
  const { purchaseInvoices } = usePurchases();
  const { isDark } = useTheme();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Year filter
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Monthly targets state
  const [targets, setTargets] = useState<Targets>(defaultTargets);
  const [targetsOpen, setTargetsOpen] = useState(true);
  const [editingTargets, setEditingTargets] = useState(false);
  const [draftTargets, setDraftTargets] = useState<Targets>(defaultTargets);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('analytics_targets');
      if (stored) {
        const parsed = JSON.parse(stored) as Targets;
        setTargets(parsed);
        setDraftTargets(parsed);
      }
    } catch {}
  }, []);

  function saveTargets() {
    const updated = { ...draftTargets, year: currentYear, month: currentMonth };
    setTargets(updated);
    localStorage.setItem('analytics_targets', JSON.stringify(updated));
    setEditingTargets(false);
  }

  // ── Filter orders by selected year ──────────────────────────────────────────
  const yearOrders = useMemo(
    () => salesOrders.filter(o => new Date(o.createdAt).getFullYear() === selectedYear),
    [salesOrders, selectedYear],
  );

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalRevenue = yearOrders.reduce((s, o) => s + o.customerTotal, 0);
    const totalProfit  = yearOrders.reduce((s, o) => s + o.netProfit, 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const aov = yearOrders.length > 0 ? totalRevenue / yearOrders.length : 0;
    const delivered = yearOrders.filter(o => o.status === 'DELIVERED').length;
    return { totalRevenue, totalProfit, margin, aov, total: yearOrders.length, delivered };
  }, [yearOrders]);

  // ── Monthly analysis ─────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return MONTHS.map((name, mo) => {
      const filtered = yearOrders.filter(o => new Date(o.createdAt).getMonth() === mo);
      const revenue = filtered.reduce((s, o) => s + o.customerTotal, 0);
      const cogs    = filtered.reduce((s, o) => s + (o.totalCOGS ?? 0), 0);
      const profit  = filtered.reduce((s, o) => s + o.netProfit, 0);
      return { month: name.slice(0, 3), revenue: Math.round(revenue), cogs: Math.round(cogs), netProfit: Math.round(profit) };
    });
  }, [yearOrders]);

  // ── Quarterly ────────────────────────────────────────────────────────────────
  const quarterlyData = useMemo(() => {
    return [
      { name: 'Q1 (يناير-مارس)', months: [0,1,2] },
      { name: 'Q2 (أبريل-يونيو)', months: [3,4,5] },
      { name: 'Q3 (يوليو-سبتمبر)', months: [6,7,8] },
      { name: 'Q4 (أكتوبر-ديسمبر)', months: [9,10,11] },
    ].map(q => {
      const filtered = yearOrders.filter(o => q.months.includes(new Date(o.createdAt).getMonth()));
      return {
        name: q.name.split(' ')[0],
        fullName: q.name,
        revenue: Math.round(filtered.reduce((s, o) => s + o.customerTotal, 0)),
        profit: Math.round(filtered.reduce((s, o) => s + o.netProfit, 0)),
      };
    });
  }, [yearOrders]);

  // ── Order status distribution ─────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    yearOrders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([status, value]) => ({ name: STATUS_LABELS[status] ?? status, value, color: STATUS_COLORS[status] ?? '#999' }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [yearOrders]);

  // ── Top 10 products by revenue ────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number }> = {};
    yearOrders.forEach(o => {
      o.items.forEach(item => {
        if (!map[item.itemId]) map[item.itemId] = { name: item.itemName, revenue: 0 };
        map[item.itemId].revenue += item.lineTotal;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({ ...p, revenue: Math.round(p.revenue) }));
  }, [yearOrders]);

  // ── Sales by city ─────────────────────────────────────────────────────────────
  const cityData = useMemo(() => {
    const map: Record<string, number> = {};
    yearOrders.forEach(o => {
      const city = o.customerCity?.trim() || 'غير محدد';
      map[city] = (map[city] ?? 0) + o.customerTotal;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([city, revenue]) => ({ city, revenue: Math.round(revenue) }));
  }, [yearOrders]);

  // ── Category analysis ─────────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, { revenue: number; cost: number }> = {};
    yearOrders.forEach(o => {
      o.items.forEach(item => {
        const cat = item.category?.trim() || 'أخرى';
        if (!map[cat]) map[cat] = { revenue: 0, cost: 0 };
        map[cat].revenue += item.lineTotal;
        map[cat].cost    += item.lineCost;
      });
    });
    return Object.entries(map)
      .map(([cat, d]) => ({
        category: cat,
        revenue: Math.round(d.revenue),
        margin: d.revenue > 0 ? Math.round(((d.revenue - d.cost) / d.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [yearOrders]);

  const categoryPieData = useMemo(
    () => categoryData.map((c, i) => ({ name: c.category, value: c.revenue, color: PALETTE[i % PALETTE.length] })),
    [categoryData],
  );

  // ── Delivery type breakdown ───────────────────────────────────────────────────
  const deliveryBreakdown = useMemo(() => {
    const types: Record<string, { count: number; revenue: number }> = {};
    yearOrders.forEach(o => {
      const t = o.deliveryType?.trim() || 'غير محدد';
      if (!types[t]) types[t] = { count: 0, revenue: 0 };
      types[t].count++;
      types[t].revenue += o.customerTotal;
    });
    return types;
  }, [yearOrders]);

  // ── Purchase vs Sales monthly ─────────────────────────────────────────────────
  const purchaseSalesData = useMemo(() => {
    return MONTHS.map((name, mo) => {
      const salesFiltered = salesOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === mo;
      });
      const purchFiltered = purchaseInvoices.filter(p => {
        const d = new Date(p.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === mo;
      });
      return {
        month: name.slice(0, 3),
        purchases: Math.round(purchFiltered.reduce((s, p) => s + (p.grandTotal ?? 0), 0)),
        sales: Math.round(salesFiltered.reduce((s, o) => s + o.customerTotal, 0)),
      };
    });
  }, [salesOrders, purchaseInvoices, selectedYear]);

  // ── Monthly targets actuals ───────────────────────────────────────────────────
  const thisMonthOrders = useMemo(
    () => salesOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }),
    [salesOrders, currentYear, currentMonth],
  );
  const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + o.customerTotal, 0);
  const thisMonthProfit  = thisMonthOrders.reduce((s, o) => s + o.netProfit, 0);
  const thisMonthCount   = thisMonthOrders.length;

  // ── Comparison toggle: this month vs same month last year ─────────────────
  const [compareEnabled, setCompareEnabled] = useState(false);
  const prevYearMonthOrders = useMemo(
    () => salesOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === currentYear - 1 && d.getMonth() === currentMonth;
    }),
    [salesOrders, currentYear, currentMonth],
  );
  const prevYearRevenue = prevYearMonthOrders.reduce((s, o) => s + o.customerTotal, 0);
  const prevYearProfit  = prevYearMonthOrders.reduce((s, o) => s + o.netProfit, 0);
  const prevYearCount   = prevYearMonthOrders.length;

  const pct = (curr: number, prev: number): number | null => {
    if (prev === 0) return curr === 0 ? null : 100;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const revenuePct = pct(thisMonthRevenue, prevYearRevenue);
  const profitPct  = pct(thisMonthProfit,  prevYearProfit);
  const countPct   = pct(thisMonthCount,   prevYearCount);

  // tooltip style helper
  const tooltipStyle = {
    contentStyle: {
      background: isDark ? '#18181B' : '#fff',
      border: `1px solid ${isDark ? '#27272A' : '#E5E5EA'}`,
      borderRadius: '12px',
      fontSize: '12px',
      color: isDark ? '#F4F4F5' : '#1C1C1E',
    },
  };

  const gridColor = isDark ? '#27272A' : '#F0F0F0';
  const tickColor = isDark ? '#71717A' : '#9CA3AF';

  const marginBarColor = (m: number) => m > 30 ? '#22C55E' : m >= 15 ? '#3B82F6' : '#F59E0B';

  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">
            لوحة التحليلات
          </h1>
          <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-1">
            تحليل شامل للمبيعات والأرباح والمخزون
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 text-xs text-[#6C6C70] dark:text-[#A1A1AA] cursor-pointer">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={e => setCompareEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
            />
            مقارنة بالعام السابق
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">السنة:</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1C1C1E] dark:text-[#F4F4F5] text-sm font-medium"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison strip — only when toggle is on */}
      {compareEnabled && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3">
            مقارنة هذا الشهر مع نفس الشهر من العام السابق
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ComparisonRow
              label="الإيرادات"
              current={`${fmt(thisMonthRevenue)} د.ل`}
              previous={`${fmt(prevYearRevenue)} د.ل`}
              pct={revenuePct}
            />
            <ComparisonRow
              label="الأرباح"
              current={`${fmt(thisMonthProfit)} د.ل`}
              previous={`${fmt(prevYearProfit)} د.ل`}
              pct={profitPct}
            />
            <ComparisonRow
              label="عدد الطلبات"
              current={`${thisMonthCount}`}
              previous={`${prevYearCount}`}
              pct={countPct}
            />
          </div>
        </div>
      )}

      {/* ── Section: KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="إجمالي الإيرادات"
          value={`${fmt(kpis.totalRevenue)} د.ل`}
          sub={`${yearOrders.length} طلب في ${selectedYear}`}
          color="#E5302A"
          icon={DollarSign}
          isDark={isDark}
        />
        <KpiCard
          label="صافي الربح"
          value={`${fmt(kpis.totalProfit)} د.ل`}
          sub={`هامش ${fmtD(kpis.margin)}%`}
          color="#22C55E"
          icon={TrendingUp}
          isDark={isDark}
        />
        <KpiCard
          label="متوسط قيمة الطلب"
          value={`${fmt(kpis.aov)} د.ل`}
          sub="متوسط قيمة الطلب"
          color="#3B82F6"
          icon={Target}
          isDark={isDark}
        />
        <KpiCard
          label="إجمالي الطلبات"
          value={`${kpis.total}`}
          sub={`${kpis.delivered} مكتمل`}
          color="#F59E0B"
          icon={ShoppingBag}
          isDark={isDark}
        />
      </div>

      {/* ── Section: Monthly Targets ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden">
        <button
          onClick={() => setTargetsOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F9F9F9] dark:hover:bg-[#27272A]/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#E5302A]" />
            <span className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">
              أهداف الشهر — {MONTHS[currentMonth]} {currentYear}
            </span>
          </div>
          {targetsOpen ? <ChevronUp className="w-4 h-4 text-[#6C6C70]" /> : <ChevronDown className="w-4 h-4 text-[#6C6C70]" />}
        </button>

        {targetsOpen && (
          <div className="px-5 pb-5 border-t border-[#E5E5EA] dark:border-[#27272A] pt-4">
            {editingTargets ? (
              <div className="space-y-3 mb-4">
                {[
                  { key: 'revenueTarget', label: 'هدف المبيعات (د.ل)' },
                  { key: 'profitTarget',  label: 'هدف الربح (د.ل)' },
                  { key: 'ordersTarget',  label: 'هدف الطلبات (طلب)' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] w-44">{label}</label>
                    <input
                      type="number"
                      value={(draftTargets as unknown as Record<string,number>)[key]}
                      onChange={e => setDraftTargets(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] bg-white dark:bg-[#27272A] text-[#1C1C1E] dark:text-[#F4F4F5] text-sm"
                    />
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={saveTargets}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5302A] text-white text-sm font-medium hover:bg-[#C42B24] transition-colors"
                  >
                    <Check className="w-4 h-4" /> حفظ
                  </button>
                  <button
                    onClick={() => { setEditingTargets(false); setDraftTargets(targets); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] text-[#6C6C70] dark:text-[#A1A1AA] text-sm hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] transition-colors"
                  >
                    <X className="w-4 h-4" /> إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingTargets(true)}
                className="mb-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#E5302A] border border-[#E5302A]/30 hover:bg-[#E5302A]/5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> تعديل الأهداف
              </button>
            )}

            <ProgressBar
              label="هدف المبيعات الشهري"
              actual={thisMonthRevenue}
              target={targets.revenueTarget}
              color="#E5302A"
              formatFn={n => `${fmt(n)} د.ل`}
            />
            <ProgressBar
              label="هدف الربح الشهري"
              actual={thisMonthProfit}
              target={targets.profitTarget}
              color="#22C55E"
              formatFn={n => `${fmt(n)} د.ل`}
            />
            <ProgressBar
              label="هدف الطلبات الشهري"
              actual={thisMonthCount}
              target={targets.ordersTarget}
              color="#3B82F6"
              formatFn={n => `${n} طلب`}
            />
          </div>
        )}
      </div>

      {/* ── Section: Monthly Analysis ───────────────────────────────────────── */}
      <ChartCard title="التحليل الشهري — المبيعات والتكلفة وصافي الربح" full>
        {yearOrders.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-[#6C6C70] dark:text-[#A1A1AA] text-sm">
            لا توجد بيانات كافية
          </div>
        ) : (
          <>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => {
                    const labels: Record<string,string> = { revenue: 'المبيعات', cogs: 'التكلفة', netProfit: 'صافي الربح' };
                    return [`${formatMoney(value)}`, labels[name] ?? name];
                  }} />
                  <Bar dataKey="revenue"   fill="#E5302A" radius={[4,4,0,0]} opacity={0.85} name="revenue" />
                  <Bar dataKey="cogs"      fill="#6C6C70" radius={[4,4,0,0]} opacity={0.7}  name="cogs" />
                  <Line type="monotone" dataKey="netProfit" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 3 }} name="netProfit" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-5 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#E5302A]" /> المبيعات</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#6C6C70]" /> التكلفة</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#22C55E] rounded" /> صافي الربح</div>
            </div>
          </>
        )}
      </ChartCard>

      {/* ── Section: Quarterly + Order Status ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="الأداء الربعي">
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quarterlyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${formatMoney(value)}`, name === 'revenue' ? 'الإيرادات' : 'الربح']} />
                <Bar dataKey="revenue" fill="#E5302A" radius={[4,4,0,0]} opacity={0.85} name="revenue" />
                <Bar dataKey="profit"  fill="#22C55E" radius={[4,4,0,0]} opacity={0.85} name="profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#E5302A]" /> الإيرادات</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#22C55E]" /> الربح</div>
          </div>
        </ChartCard>

        <ChartCard title="توزيع حالات الطلبات">
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-[#6C6C70] dark:text-[#A1A1AA] text-sm">لا توجد بيانات كافية</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div dir="ltr" className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${value} طلب`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 min-w-[130px]">
                {statusData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-[#6C6C70] dark:text-[#A1A1AA]">{d.name}</span>
                    </div>
                    <span className="font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Section: Top Products + Sales by City ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="أعلى 10 منتجات إيراداً">
          {topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-[#6C6C70] dark:text-[#A1A1AA] text-sm">لا توجد بيانات كافية</div>
          ) : (
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip {...tooltipStyle} formatter={(value: number) => [`${formatMoney(value)}`, 'الإيرادات']} />
                  <Bar dataKey="revenue" fill="#E5302A" radius={[0,4,4,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="المبيعات حسب المدينة">
          {cityData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-[#6C6C70] dark:text-[#A1A1AA] text-sm">لا توجد بيانات كافية</div>
          ) : (
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cityData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <YAxis type="category" dataKey="city" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(value: number) => [`${formatMoney(value)}`, 'المبيعات']} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[0,4,4,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Section: Category Analysis ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="توزيع المبيعات بالفئة">
          {categoryPieData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-[#6C6C70] dark:text-[#A1A1AA] text-sm">لا توجد بيانات كافية</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div dir="ltr" className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {categoryPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${formatMoney(value)}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 min-w-[120px]">
                {categoryPieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[#6C6C70] dark:text-[#A1A1AA] truncate max-w-[90px]">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="هامش الربح بالفئة">
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-[#6C6C70] dark:text-[#A1A1AA] text-sm">لا توجد بيانات كافية</div>
          ) : (
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 35)}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value}%`, 'هامش الربح']} />
                  <Bar dataKey="margin" radius={[0,4,4,0]} opacity={0.85}>
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={marginBarColor(entry.margin)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#22C55E]" /> {'>'} 30%</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#3B82F6]" /> 15–30%</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#F59E0B]" /> {'<'} 15%</div>
          </div>
        </ChartCard>
      </div>

      {/* ── Section: Delivery Type Breakdown ───────────────────────────────── */}
      <div>
        <SectionTitle>تفصيل نوع التوصيل</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.keys(deliveryBreakdown).length === 0 ? (
            <div className="col-span-3 bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-8 text-center text-[#6C6C70] dark:text-[#A1A1AA] text-sm">
              لا توجد بيانات توصيل
            </div>
          ) : (
            Object.entries(deliveryBreakdown).slice(0, 3).map(([type, data], i) => {
              const icons = [Home, Briefcase, Users];
              const colors = ['#E5302A', '#3B82F6', '#8B5CF6'];
              const Icon = icons[i % icons.length];
              const color = colors[i % colors.length];
              return (
                <div key={type} className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <span className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] truncate">{type}</span>
                  </div>
                  <p className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">{data.count} طلب</p>
                  <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-1">{fmt(data.revenue)} د.ل</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Section: Purchase vs Sales Monthly ─────────────────────────────── */}
      <ChartCard title="المشتريات مقابل المبيعات شهرياً" full>
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={purchaseSalesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
              <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${formatMoney(value)}`, name === 'purchases' ? 'المشتريات' : 'المبيعات']} />
              <Bar dataKey="purchases" fill="#6C6C70" radius={[4,4,0,0]} opacity={0.75} name="purchases" />
              <Line type="monotone" dataKey="sales" stroke="#E5302A" strokeWidth={2.5} dot={{ fill: '#E5302A', r: 3 }} name="sales" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-5 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#6C6C70]" /> المشتريات</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#E5302A] rounded" /> المبيعات</div>
        </div>
      </ChartCard>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Comparison row for the analytics this-vs-previous-year strip.
// Renders current value, previous value, and a coloured % delta.
// ────────────────────────────────────────────────────────────────────────────
function ComparisonRow({
  label, current, previous, pct,
}: { label: string; current: string; previous: string; pct: number | null }) {
  const isUp   = (pct ?? 0) > 0;
  const isDown = (pct ?? 0) < 0;
  return (
    <div className="bg-white dark:bg-[#18181B] rounded-xl p-3 border border-blue-100 dark:border-blue-900/40">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-lg font-bold text-slate-900 dark:text-white">{current}</p>
        {pct === null ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <span className={`text-xs font-semibold ${
            isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-slate-500'
          }`}>
            {isUp ? '↑' : isDown ? '↓' : '·'} {Math.abs(pct)}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5">العام السابق: {previous}</p>
    </div>
  );
}
