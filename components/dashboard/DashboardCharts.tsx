'use client';

/**
 * Lazy chart island for the tenant dashboard.
 *
 * Imports the entire recharts dependency (~95 KB gzipped) into a single
 * client-component bundle. The parent dashboard page dynamic-imports
 * this whole wrapper, so the KPI cards + onboarding checklist paint
 * without waiting on recharts to hydrate. Charts stream in below.
 *
 * Each render block is self-contained so the wrapper does no logic of
 * its own — purely a presentation island. The parent owns memoization
 * of all the data props.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Bar, Line, BarChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatMoney } from '@/lib/format';

interface DailyPoint { date: string; revenue: number; profit: number }
interface OrderStatusSlice { name: string; value: number; color: string }
interface MonthlyPoint { month: string; revenue: number; netProfit: number }
interface QuarterlyPoint { name: string; revenue: number; profit: number }

interface Props {
  chartData:        DailyPoint[];
  orderStatusData:  OrderStatusSlice[];
  monthlySalesData: MonthlyPoint[];
  quarterlyData:    QuarterlyPoint[];
  isDark:           boolean;
}

export default function DashboardCharts({
  chartData, orderStatusData, monthlySalesData, quarterlyData, isDark,
}: Props) {
  const grid = isDark ? '#27272A' : '#F0F0F0';
  const tick = isDark ? '#71717A' : '#9CA3AF';
  const tooltipStyle = {
    background:   isDark ? '#18181B' : '#fff',
    border:       `1px solid ${isDark ? '#27272A' : '#E5E5EA'}`,
    borderRadius: '12px',
    fontSize:     '12px',
    color:        isDark ? '#F4F4F5' : '#1C1C1E',
  } as const;

  const hasDaily = chartData.some(d => d.revenue || d.profit);

  return (
    <>
      {/* Top: 30-day area + status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 30-day revenue/profit area chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4 text-[#1C1C1E] dark:text-[#F4F4F5]">
            المبيعات والأرباح — آخر 30 يوم
          </h3>
          {!hasDaily ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-center gap-3">
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
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${formatMoney(value)}`,
                    name === 'revenue' ? 'المبيعات' : 'صافي الربح',
                  ]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#E5302A" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
                <Area type="monotone" dataKey="profit"  stroke="#22C55E" strokeWidth={2} fill="url(#profitGrad)"  dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#E5302A] rounded" /> المبيعات</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-green-500 rounded" /> صافي الربح</div>
          </div>
        </div>

        {/* Order status donut */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4 text-[#1C1C1E] dark:text-[#F4F4F5]">توزيع حالات الطلبات</h3>
          {orderStatusData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-xs text-[#AEAEB2]">
              لا توجد طلبات بعد
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {orderStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [`${value} طلب`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
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

      {/* Monthly composed + quarterly bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">
            المبيعات الشهرية — آخر 12 شهراً
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthlySalesData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [`${formatMoney(value)}`, name === 'revenue' ? 'المبيعات' : 'صافي الربح']}
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

        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">
            الأداء الربعي — {new Date().getFullYear()}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={quarterlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [`${formatMoney(value)}`, name === 'revenue' ? 'الإيرادات' : 'الربح']}
              />
              <Bar dataKey="revenue" fill="#E5302A" radius={[4,4,0,0]} name="revenue" opacity={0.85} />
              <Bar dataKey="profit"  fill="#22C55E" radius={[4,4,0,0]} name="profit"  opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#E5302A]" /> الإيرادات</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500" /> الربح</div>
          </div>
        </div>
      </div>
    </>
  );
}
