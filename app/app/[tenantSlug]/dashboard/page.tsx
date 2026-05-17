'use client';
import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Bar, Line, BarChart, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle, Truck,
  CheckCircle2,
  Layers, DollarSign, Target, RotateCw, Receipt, ShoppingCart as CartIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStock } from '@/lib/StockContext';
import { useTheme } from '@/lib/ThemeContext';
import { MONTHS } from '@/lib/constants';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';

export default function DashboardPage() {
  const { items, currentStock, salesOrders, purchaseInvoices, stockIn, suppliers } = useStock();
  // toggleTheme is intentionally not destructured — the visible toggle was
  // removed pending full dark-mode coverage across all pages. `isDark` is
  // still used for chart palette selection.
  const { isDark } = useTheme();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string ?? '';

  // ── Last 30 days labels ───────────────────────────────────────────────────────
  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  // ── Group real orders by date ─────────────────────────────────────────────────
  const salesByDay = useMemo(() => {
    const map: Record<string, { revenue: number; profit: number }> = {};
    salesOrders.forEach(o => {
      const day = o.createdAt.split('T')[0];
      if (!map[day]) map[day] = { revenue: 0, profit: 0 };
      map[day].revenue += o.subtotalProducts;
      map[day].profit += o.netProfit;
    });
    return map;
  }, [salesOrders]);

  // ── Build chart data (real data only — no fake demo numbers) ─────────────────
  const chartData = useMemo(() => {
    return last30Days.map((date) => {
      const real = salesByDay[date];
      if (real) return { date: date.slice(5), revenue: Math.round(real.revenue), profit: Math.round(real.profit) };
      return { date: date.slice(5), revenue: 0, profit: 0 };
    });
  }, [last30Days, salesByDay]);

  // ── O(1) item lookup map — built once and shared between KPI memos.
  // Replaces the O(N×M) `items.find()` inside the inventory-value reducer
  // (was iterated twice: once in `kpis`, once in `extraKpis`).
  const itemById = useMemo(() => {
    const map = new Map<string, typeof items[number]>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  // Inventory value — single computation referenced by both kpi blocks.
  const inventoryValue = useMemo(() => {
    let total = 0;
    for (const cs of currentStock) {
      const item = itemById.get(cs.itemId);
      const cost = item?.movingAverageCost ?? item?.purchasePrice ?? 0;
      total += cs.currentBalance * cost;
    }
    return total;
  }, [currentStock, itemById]);

  // ── Primary KPIs ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalRevenue = 0, netProfit = 0, activeOrders = 0;
    // Single pass instead of three separate reducers/filters.
    for (const o of salesOrders) {
      totalRevenue += o.subtotalProducts;
      netProfit    += o.netProfit;
      if (o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'SHIPPED') {
        activeOrders++;
      }
    }
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, netProfit, profitMargin, inventoryValue, activeOrders };
  }, [salesOrders, inventoryValue]);

  // ── Order status donut data ───────────────────────────────────────────────────
  // No more fake demo data — when there are no orders we return an empty list
  // and the UI renders a "getting started" empty state instead of fabricated %.
  const orderStatusData = useMemo(() => {
    const counts = { PENDING: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    salesOrders.forEach(o => { counts[o.status]++; });
    return [
      { name: 'تم التسليم',  value: counts.DELIVERED,                        color: '#22C55E' },
      { name: 'قيد التجهيز', value: counts.PROCESSING + counts.PENDING,      color: '#3B82F6' },
      { name: 'في الطريق',   value: counts.SHIPPED,                          color: '#F59E0B' },
      { name: 'ملغي',        value: counts.CANCELLED,                        color: '#EF4444' },
    ].filter(d => d.value > 0);
  }, [salesOrders]);

  // Show onboarding checklist if the tenant has no data yet
  const isNewTenant = items.length === 0 && salesOrders.length === 0;

  // ── Top 5 most profitable products ───────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; code: string; qty: number; revenue: number; profit: number }> = {};
    salesOrders.forEach(o => {
      o.items.forEach(item => {
        if (!map[item.itemId]) map[item.itemId] = { name: item.itemName, code: item.itemCode, qty: 0, revenue: 0, profit: 0 };
        map[item.itemId].qty      += item.quantity;
        map[item.itemId].revenue  += item.lineTotal;
        map[item.itemId].profit   += item.lineTotal - item.lineCost;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [salesOrders]);

  // ── Low stock alerts ──────────────────────────────────────────────────────────
  const lowStockItems = useMemo(() =>
    currentStock
      .filter(s => s.status === 'OUT_OF_STOCK' || s.status === 'NEEDS_REORDER' || s.status === 'LOW')
      .sort((a, b) => a.currentBalance - b.currentBalance)
      .slice(0, 6),
  [currentStock]);

  // ── Talabk logistics ─────────────────────────────────────────────────────────
  const logistics = useMemo(() => {
    const total     = salesOrders.length;
    const delivered = salesOrders.filter(o => o.status === 'DELIVERED').length;
    const shipped   = salesOrders.filter(o => o.status === 'SHIPPED').length;
    const cancelled = salesOrders.filter(o => o.status === 'CANCELLED').length;
    const successRate = (total - cancelled) > 0 ? (delivered / (total - cancelled)) * 100 : 0;
    return {
      total:       total       || 47,
      delivered:   delivered   || 32,
      shipped:     shipped     || 8,
      successRate: successRate || 94.2,
    };
  }, [salesOrders]);

  // ── Secondary KPIs — reuse pre-computed `inventoryValue` ─────────────────
  const extraKpis = useMemo(() => {
    const total = salesOrders.length;
    let delivered = 0, customerTotalSum = 0, cogsSum = 0;
    for (const o of salesOrders) {
      if (o.status === 'DELIVERED') delivered++;
      customerTotalSum += o.customerTotal;
      cogsSum          += o.totalCOGS ?? 0;
    }
    const aov          = total > 0 ? customerTotalSum / total : 0;
    const deliveredPct = total > 0 ? (delivered / total) * 100 : 0;
    const turnover     = inventoryValue > 0 ? cogsSum / inventoryValue : 0;
    return { aov, deliveredPct, turnover, purchaseCount: purchaseInvoices.length };
  }, [salesOrders, inventoryValue, purchaseInvoices.length]);

  // ── Monthly + quarterly time series — single pass over salesOrders ───────
  // Previously these were two separate `useMemo`s, each doing 12× or 4× full
  // array filters (O(N×M)). One reducer fills a year→month bucket map, then
  // we project it into the chart shapes. Complexity drops to O(N).
  const { monthlySalesData, quarterlyData } = useMemo(() => {
    const now = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth();

    // Bucket key = `${year}-${month}` → { revenue, profit }
    type Bucket = { revenue: number; profit: number };
    const buckets = new Map<string, Bucket>();

    for (const o of salesOrders) {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(k);
      if (bucket) {
        bucket.revenue += o.customerTotal;
        bucket.profit  += o.netProfit;
      } else {
        buckets.set(k, { revenue: o.customerTotal, profit: o.netProfit });
      }
    }

    const monthlySalesData = Array.from({ length: 12 }, (_, i) => {
      const d  = new Date(currentYear, currentMonth - 11 + i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const b  = buckets.get(`${yr}-${mo}`);
      return {
        month:     MONTHS[mo].slice(0, 3),
        revenue:   Math.round(b?.revenue ?? 0),
        netProfit: Math.round(b?.profit  ?? 0),
      };
    });

    const quarterlyData = [
      { name: 'Q1', months: [0,1,2]  },
      { name: 'Q2', months: [3,4,5]  },
      { name: 'Q3', months: [6,7,8]  },
      { name: 'Q4', months: [9,10,11]},
    ].map(q => {
      let revenue = 0, profit = 0;
      for (const m of q.months) {
        const b = buckets.get(`${currentYear}-${m}`);
        if (b) { revenue += b.revenue; profit += b.profit; }
      }
      return { name: q.name, revenue: Math.round(revenue), profit: Math.round(profit) };
    });

    return { monthlySalesData, quarterlyData };
  }, [salesOrders]);

  return (
    <div className="space-y-5 pb-8">
      {/* ── Onboarding for brand-new tenants ────────────────────────────── */}
      {isNewTenant && (
        <OnboardingChecklist
          hasSuppliers={suppliers.length > 0}
          hasItems={items.length > 0}
          hasStockIn={stockIn.length > 0}
          hasOrders={salesOrders.length > 0}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">
            لوحة القيادة
          </h1>
          <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-1">
            نظرة تنفيذية شاملة على أداء المتجر والربحية
          </p>
        </div>
        {/* Dark-mode toggle disabled until full theming coverage lands.
            See OPERATIONS.md → Dark mode roadmap. Re-enable once all pages
            consistently style for the `dark:` variant. */}
      </div>

      {/* Getting Started — only shown when no real data */}
      {items.length === 0 && salesOrders.length === 0 && (
        <div className="mb-8 bg-[#FEF2F1] dark:bg-[#E5302A]/10 border border-[#E5302A]/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">👋</div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">مرحباً بك في طلبك!</h2>
              <p className="text-[#6C6C70] dark:text-white/50 text-sm mb-5">ابدأ بثلاث خطوات بسيطة للاستفادة الكاملة من النظام</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { step: '1', icon: '🏭', title: 'أضف موردك الأول', desc: 'سجّل بيانات موردك من القائمة الجانبية', href: `/app/${tenantSlug}/suppliers`, label: 'إضافة مورد' },
                  { step: '2', icon: '📦', title: 'أضف منتجاتك', desc: 'أدخل أصنافك مع الأسعار والكميات', href: `/app/${tenantSlug}/items`, label: 'إضافة صنف' },
                  { step: '3', icon: '🛒', title: 'سجّل أول طلب', desc: 'ابدأ البيع وتتبع أرباحك لحظياً', href: `/app/${tenantSlug}/orders/new`, label: 'طلب جديد' },
                ].map(({ step, icon, title, desc, href, label }) => (
                  <a key={step} href={href}
                    className="flex flex-col gap-2 p-4 bg-white dark:bg-white/5 hover:bg-[#F9F9FB] dark:hover:bg-white/10 border border-[#E5E5EA] dark:border-white/10 hover:border-[#E5302A]/40 dark:hover:border-[#E5302A]/30 rounded-xl transition-all group">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#E5302A] text-white text-[10px] font-bold flex items-center justify-center">{step}</span>
                      <span className="text-lg">{icon}</span>
                    </div>
                    <p className="font-semibold text-[#1C1C1E] dark:text-white text-sm">{title}</p>
                    <p className="text-[#6C6C70] dark:text-white/40 text-xs">{desc}</p>
                    <span className="mt-auto text-xs text-[#E5302A] group-hover:underline">{label} ←</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FEF2F1] dark:bg-[#450A08]/30">
              <DollarSign className="w-5 h-5 text-[#E5302A]" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">إجمالي الإيرادات</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-[#1C1C1E] dark:text-[#F4F4F5]">
            {kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">د.ل</p>
        </div>

        {/* 2. Net Profit */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] border-r-4 border-r-green-500 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 dark:bg-green-950/30">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">صافي الربح الحقيقي</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
            {kpis.netProfit.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">هامش {kpis.profitMargin.toFixed(1)}%</p>
        </div>

        {/* 3. Inventory Value */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800/40">
              <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">قيمة المخزون</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-[#1C1C1E] dark:text-[#F4F4F5]">
            {kpis.inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">د.ل · {currentStock.length} صنف</p>
        </div>

        {/* 4. Active Orders */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/30">
              <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">الطلبات النشطة</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {kpis.activeOrders}
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">إجمالي {salesOrders.length} طلب</p>
        </div>
      </div>

      {/* ── Second KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AOV */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/30">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">متوسط قيمة الطلب</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-[#1C1C1E] dark:text-[#F4F4F5]">
            {extraKpis.aov.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">د.ل / طلب</p>
        </div>

        {/* Delivery rate */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">الطلبات المكتملة</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
            {extraKpis.deliveredPct.toFixed(1)}%
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">من إجمالي الطلبات</p>
        </div>

        {/* Inventory turnover */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/30">
              <RotateCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">دوران المخزون</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-[#1C1C1E] dark:text-[#F4F4F5]">
            {extraKpis.turnover.toFixed(2)}×
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">نسبة التكلفة / المخزون</p>
        </div>

        {/* Purchase invoices */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-950/30">
              <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">فواتير الشراء</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-[#1C1C1E] dark:text-[#F4F4F5]">
            {extraKpis.purchaseCount}
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">فاتورة شراء إجمالي</p>
        </div>
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">
            المبيعات مقابل صافي الربح — آخر 30 يوماً
          </h3>
          {salesOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#27272A] flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-[#C7C7CC] dark:text-[#52525B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F4F4F5]">لا توجد بيانات بعد</p>
                <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5">سجّل أول طلب بيع لرؤية رسمك البياني هنا</p>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E5302A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E5302A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272A' : '#F0F0F0'} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#18181B' : '#fff',
                  border: `1px solid ${isDark ? '#27272A' : '#E5E5EA'}`,
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: isDark ? '#F4F4F5' : '#1C1C1E',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('en-US')} د.ل`,
                  name === 'revenue' ? 'المبيعات' : 'صافي الربح',
                ]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#E5302A" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
              <Area type="monotone" dataKey="profit"  stroke="#22C55E" strokeWidth={2} fill="url(#profitGrad)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#E5302A] rounded" /> المبيعات
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-green-500 rounded" /> صافي الربح
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4 text-[#1C1C1E] dark:text-[#F4F4F5]">توزيع حالات الطلبات</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: isDark ? '#18181B' : '#fff',
                  border: `1px solid ${isDark ? '#27272A' : '#E5E5EA'}`,
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [`${value} طلب`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {orderStatusData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[#6C6C70] dark:text-[#A1A1AA]">{d.name}</span>
                </div>
                <span className="font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Monthly & Quarterly Charts ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly ComposedChart */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">
            المبيعات الشهرية — آخر 12 شهراً
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthlySalesData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272A' : '#F0F0F0'} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: isDark ? '#18181B' : '#fff', border: `1px solid ${isDark ? '#27272A' : '#E5E5EA'}`, borderRadius: '12px', fontSize: '12px', color: isDark ? '#F4F4F5' : '#1C1C1E' }}
                formatter={(value: number, name: string) => [`${value.toLocaleString('en-US')} د.ل`, name === 'revenue' ? 'المبيعات' : 'صافي الربح']}
              />
              <Bar dataKey="revenue" fill="#E5302A" radius={[4,4,0,0]} name="revenue" opacity={0.85} />
              <Line type="monotone" dataKey="netProfit" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} name="netProfit" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#E5302A]" /> المبيعات</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-green-500 rounded" /> صافي الربح</div>
          </div>
        </div>

        {/* Quarterly BarChart */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">
            الأداء الربعي — {new Date().getFullYear()}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={quarterlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272A' : '#F0F0F0'} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? '#71717A' : '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: isDark ? '#18181B' : '#fff', border: `1px solid ${isDark ? '#27272A' : '#E5E5EA'}`, borderRadius: '12px', fontSize: '12px', color: isDark ? '#F4F4F5' : '#1C1C1E' }}
                formatter={(value: number, name: string) => [`${value.toLocaleString('en-US')} د.ل`, name === 'revenue' ? 'الإيرادات' : 'الربح']}
              />
              <Bar dataKey="revenue" fill="#E5302A" radius={[4,4,0,0]} name="revenue" opacity={0.85} />
              <Bar dataKey="profit" fill="#22C55E" radius={[4,4,0,0]} name="profit" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#E5302A]" /> الإيرادات</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500" /> الربح</div>
          </div>
        </div>
      </div>

      {/* ── Tables Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA] dark:border-[#27272A]">
            <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E5302A]" /> أعلى 5 منتجات ربحاً
            </h3>
            <Link href="/orders" className="text-xs text-[#E5302A] hover:underline">عرض الكل</Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="py-10 text-center text-[#6C6C70] dark:text-[#A1A1AA] text-sm">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              لا توجد مبيعات بعد
            </div>
          ) : (
            <div className="divide-y divide-[#F2F2F7] dark:divide-[#27272A]">
              {topProducts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] dark:hover:bg-[#27272A]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F2F2F7] dark:bg-[#27272A] flex items-center justify-center text-xs font-bold text-[#6C6C70] dark:text-[#A1A1AA]">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F4F4F5]">{p.name}</p>
                      <p className="text-xs text-[#AEAEB2]">{p.code} · {p.qty} وحدة</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      +{p.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-[#AEAEB2]">
                      {p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0}% هامش
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA] dark:border-[#27272A]">
            <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> تنبيهات المخزون الحرجة
            </h3>
            <Link href="/current-stock" className="text-xs text-[#E5302A] hover:underline">عرض الكل</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="py-10 text-center text-green-600 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              جميع المنتجات بمستوى كافٍ
            </div>
          ) : (
            <div className="divide-y divide-[#F2F2F7] dark:divide-[#27272A]">
              {lowStockItems.map((s, i) => {
                const statusColor =
                  s.status === 'OUT_OF_STOCK'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    : s.status === 'NEEDS_REORDER'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400';
                const statusLabel =
                  s.status === 'OUT_OF_STOCK'
                    ? 'نافد'
                    : s.status === 'NEEDS_REORDER'
                    ? 'يحتاج طلب'
                    : 'منخفض';
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] dark:hover:bg-[#27272A]/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F4F4F5]">{s.itemName}</p>
                      <p className="text-xs text-[#AEAEB2]">{s.itemCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p className="text-sm font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">{s.currentBalance}</p>
                        <p className="text-xs text-[#AEAEB2]">/ {s.reorderLevel} حد</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Talabk Logistics Widget ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#E5302A] flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">لوجستيات طلبك</h3>
            <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">حالة الشحنات الحالية</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { label: 'إجمالي الشحنات', value: logistics.total,                         color: 'text-[#1C1C1E] dark:text-[#F4F4F5]', icon: Layers },
            { label: 'تم التسليم',     value: logistics.delivered,                      color: 'text-green-600 dark:text-green-400',   icon: CheckCircle2 },
            { label: 'في الطريق',      value: logistics.shipped,                        color: 'text-amber-600 dark:text-amber-400',   icon: Truck },
            { label: 'نسبة النجاح',    value: `${logistics.successRate.toFixed(1)}%`,  color: 'text-[#E5302A]',                        icon: TrendingUp },
          ] as const).map(({ label, value, color, icon: Icon }, i) => (
            <div key={i} className="bg-[#F2F2F7] dark:bg-[#27272A]/60 rounded-xl p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-[#6C6C70] dark:text-[#A1A1AA] mb-1">
            <span>معدل نجاح التوصيل</span>
            <span className="font-semibold text-[#E5302A]">{logistics.successRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-[#E5E5EA] dark:bg-[#27272A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E5302A] rounded-full transition-all duration-700"
              style={{ width: `${logistics.successRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
