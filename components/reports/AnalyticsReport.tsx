'use client';

import { useReports } from '@/lib/useReports';
import { formatCurrency } from '@/lib/exportUtils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function AnalyticsReport() {
  const {
    monthlyComparison,
    categoryDistribution,
    topMovers,
    summaryKPIs,
  } = useReports();

  const profitMargin =
    summaryKPIs.totalSales > 0
      ? ((summaryKPIs.grossProfit / summaryKPIs.totalSales) * 100).toFixed(1)
      : '0';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">التحليلات المتقدمة</h2>
            <p className="text-xs text-slate-500">رؤى استراتيجية لاتخاذ قرارات مالية</p>
          </div>
        </div>
      </div>

      {/* Strategic KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">إجمالي المشتريات</p>
            <TrendingDown className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">
            {formatCurrency(summaryKPIs.totalPurchases)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">إجمالي المبيعات</p>
            <TrendingUp className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">
            {formatCurrency(summaryKPIs.totalSales)}
          </p>
        </div>

        <div
          className={`border rounded-xl p-4 ${
            summaryKPIs.grossProfit >= 0
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className={`text-xs ${
                summaryKPIs.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              صافي الربح/الخسارة
            </p>
            <DollarSign
              className={`w-4 h-4 ${
                summaryKPIs.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            />
          </div>
          <p
            className={`text-xl font-bold font-mono ${
              summaryKPIs.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(summaryKPIs.grossProfit)}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-700">هامش الربح</p>
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xl font-bold text-slate-700 font-mono">%{profitMargin}</p>
        </div>
      </div>

      {/* Monthly Comparison Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          المشتريات مقابل المبيعات شهرياً
        </h3>
        {monthlyComparison.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            لا توجد بيانات كافية للعرض
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyComparison} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  direction: 'rtl',
                  fontFamily: 'Cairo',
                  borderRadius: '8px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="purchases" name="المشتريات" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="sales" name="المبيعات" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Profit Trend Line */}
      {monthlyComparison.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">اتجاه الربح الشهري</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyComparison} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  direction: 'rtl',
                  fontFamily: 'Cairo',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="الربح"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 5, fill: '#8b5cf6' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Distribution & Top Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            توزيع قيمة المخزون حسب التصنيف
          </h3>
          {categoryDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              لا توجد بيانات
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(entry) => `${entry.name}`}
                  labelLine={false}
                >
                  {categoryDistribution.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    direction: 'rtl',
                    fontFamily: 'Cairo',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Movers */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            أكثر 5 أصناف حركة (الصادر)
          </h3>
          {topMovers.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              لا توجد بيانات
            </div>
          ) : (
            <div className="space-y-3">
              {topMovers.map((m, idx) => {
                const maxMovement = topMovers[0]?.totalMovement || 1;
                const percentage = (m.totalMovement / maxMovement) * 100;
                return (
                  <div key={m.itemId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-900 truncate flex-1">
                        <span className="text-slate-400 font-bold ml-2">#{idx + 1}</span>
                        {m.itemName}
                      </span>
                      <span className="font-mono font-bold text-orange-600 mr-2">
                        {m.totalMovement}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[idx % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
