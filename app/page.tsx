'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Package,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  AlertTriangle,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';

// ── SVG Pie Chart (no external lib) ──────────────────────────────────────────
function PieChart({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return <div className="text-center text-slate-400 text-sm py-4">لا توجد بيانات</div>;

  let cumAngle = -Math.PI / 2;
  const r = 60;
  const cx = 80;
  const cy = 80;

  const paths = slices.map((sl) => {
    const angle = (sl.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: sl.color, label: sl.label, value: sl.value };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2">
            <title>{p.label}: {p.value}</title>
          </path>
        ))}
      </svg>
      <div className="space-y-2">
        {slices.map((sl, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: sl.color }} />
            <span className="text-slate-600">{sl.label}</span>
            <span className="font-bold text-slate-900 mr-auto">{sl.value}</span>
          </div>
        ))}
        <p className="text-xs text-slate-400 pt-1">الإجمالي: {total} صنف</p>
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart ─────────────────────────────────────────────────────
function HBarChart({
  bars,
}: {
  bars: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="space-y-3">
      {bars.map((bar, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 truncate max-w-[140px]">{bar.label}</span>
            <span className="font-mono font-bold text-slate-900">{bar.value.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(bar.value / max) * 100}%`, backgroundColor: bar.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { items, suppliers, stockIn, stockOut, currentStock } = useStock();

  const totalStockValue = currentStock.reduce((sum, s) => sum + s.stockValue, 0);
  const totalPurchases = stockIn.reduce((sum, m) => sum + m.totalCost, 0);
  const totalSales = stockOut.reduce((sum, m) => sum + m.totalValue, 0);
  const outOfStock = currentStock.filter((s) => s.status === 'OUT_OF_STOCK').length;
  const needsReorder = currentStock.filter((s) => s.status === 'NEEDS_REORDER').length;

  // Pie chart: items by stock status
  const pieSlices = useMemo(() => [
    { label: 'متوفر', value: currentStock.filter((s) => s.status === 'AVAILABLE').length, color: '#22c55e' },
    { label: 'منخفض', value: currentStock.filter((s) => s.status === 'LOW').length, color: '#f97316' },
    { label: 'يحتاج طلب', value: currentStock.filter((s) => s.status === 'NEEDS_REORDER').length, color: '#eab308' },
    { label: 'نافد', value: currentStock.filter((s) => s.status === 'OUT_OF_STOCK').length, color: '#ef4444' },
  ].filter((s) => s.value > 0), [currentStock]);

  // Bar chart: top 5 items by stock value
  const topItems = useMemo(
    () =>
      [...currentStock]
        .sort((a, b) => b.stockValue - a.stockValue)
        .slice(0, 5)
        .map((s, i) => ({
          label: s.itemName,
          value: s.stockValue,
          color: ['#E5302A', '#C42B24', '#F17068', '#F7A09C', '#FBCBC9'][i],
        })),
    [currentStock]
  );

  // Inventory turnover: total out / avg stock value (simplified)
  const turnover = useMemo(() => {
    if (totalStockValue === 0) return 0;
    return ((totalSales / totalStockValue) * 100).toFixed(1);
  }, [totalSales, totalStockValue]);

  // Last 5 movements (in + out combined)
  const lastMovements = useMemo(() => {
    const inMoves = stockIn.map((m) => ({
      id: m.id,
      type: 'in' as const,
      date: m.date,
      code: m.operationCode,
      itemName: m.itemName ?? '',
      qty: m.quantity,
      value: m.totalCost,
    }));
    const outMoves = stockOut.map((m) => ({
      id: m.id,
      type: 'out' as const,
      date: m.date,
      code: m.operationCode,
      itemName: m.itemName ?? '',
      qty: m.quantity,
      value: m.totalValue,
    }));
    return [...inMoves, ...outMoves]
      .sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code))
      .slice(0, 5);
  }, [stockIn, stockOut]);

  const alerts = currentStock
    .filter((s) => s.status === 'OUT_OF_STOCK' || s.status === 'NEEDS_REORDER')
    .slice(0, 5);

  const kpis = [
    { label: 'إجمالي الأصناف', value: items.length, icon: Package, color: 'bg-brand-50 text-brand-600', href: '/items' },
    { label: 'الموردين', value: suppliers.length, icon: Users, color: 'bg-slate-50 text-slate-600', href: '/suppliers' },
    { label: 'حركات الوارد', value: stockIn.length, icon: ArrowDownToLine, color: 'bg-green-50 text-green-600', href: '/stock-in' },
    { label: 'حركات الصادر', value: stockOut.length, icon: ArrowUpFromLine, color: 'bg-orange-50 text-orange-600', href: '/stock-out' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">لوحة التحكم</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">نظرة شاملة على حالة المخزون والحركات اليومية</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{kpi.value}</p>
            </Link>
          );
        })}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-brand-500" />
            قيمة المخزون الحالية
          </div>
          <p className="text-2xl font-bold text-brand-600 font-mono">{totalStockValue.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            إجمالي المشتريات
          </div>
          <p className="text-2xl font-bold text-green-600 font-mono">{totalPurchases.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-brand-600" />
            إجمالي المبيعات/الصرف
          </div>
          <p className="text-2xl font-bold text-brand-600 font-mono">{totalSales.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">
            معدل دوران المخزون: <span className="font-semibold text-slate-600">{turnover}%</span>
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie: Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">توزيع المخزون حسب الحالة</h2>
          <PieChart slices={pieSlices} />
        </div>

        {/* Bar: Top 5 Items by Value */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">أعلى 5 أصناف بقيمة المخزون</h2>
          {topItems.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-4">لا توجد بيانات</div>
          ) : (
            <HBarChart bars={topItems} />
          )}
        </div>
      </div>

      {/* Last Movements + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Last 5 Movements */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">آخر 5 حركات</h2>
            <div className="flex gap-2">
              <Link href="/stock-in" className="text-xs text-green-600 hover:underline">الوارد</Link>
              <span className="text-slate-300">|</span>
              <Link href="/stock-out" className="text-xs text-orange-600 hover:underline">الصادر</Link>
            </div>
          </div>
          {lastMovements.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">لا توجد حركات مسجلة</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[400px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">النوع</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">التاريخ</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الصنف</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الكمية</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">القيمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lastMovements.map((m) => (
                  <tr key={`${m.type}-${m.id}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      {m.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium">
                          <ArrowDownToLine className="w-2.5 h-2.5" />
                          وارد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-medium">
                          <ArrowUpFromLine className="w-2.5 h-2.5" />
                          صادر
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-500">{m.date}</td>
                    <td className="px-3 py-2 text-slate-900 max-w-[120px] truncate">{m.itemName}</td>
                    <td className={`px-3 py-2 font-mono font-bold ${m.type === 'in' ? 'text-green-600' : 'text-orange-600'}`}>
                      {m.type === 'in' ? '+' : '-'}{m.qty}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">{m.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Stock Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              تنبيهات المخزون
            </h2>
            <Link href="/current-stock" className="text-xs text-brand-600 hover:underline">
              عرض الكل
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <span className="text-green-600 font-medium">✓ كل الأصناف ضمن الحدود المقبولة</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <div
                  key={a.itemId}
                  className={`flex items-center justify-between px-4 py-3 ${
                    a.status === 'OUT_OF_STOCK' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {a.status === 'OUT_OF_STOCK' ? (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                    <div>
                      <span className="font-mono text-xs text-slate-500 ml-1">{a.itemCode}</span>
                      <span className="font-medium text-sm text-slate-900">{a.itemName}</span>
                    </div>
                  </div>
                  <div className="text-sm text-left">
                    <span className={`font-mono font-bold ${a.status === 'OUT_OF_STOCK' ? 'text-red-700' : 'text-yellow-700'}`}>
                      {a.currentBalance}
                    </span>
                    <span className="text-slate-400"> / {a.minStockLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
