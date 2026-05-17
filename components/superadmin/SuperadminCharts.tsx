'use client';

/**
 * Lazy chart island for /superadmin (the overview page).
 *
 * Recharts ships ~95 KB gzipped. By extracting all chart JSX into this
 * dedicated client component and dynamic-importing it from the page,
 * the KPI cards + pending-requests table paint without waiting on recharts
 * to hydrate. The charts then stream in below.
 *
 * Why a wrapper rather than per-component `next/dynamic`? Recharts'
 * `Tooltip` carries a generic Formatter signature that loses precision
 * under per-component dynamic imports. Wrapping the whole island in
 * `next/dynamic` once keeps the recharts internals fully typed inside
 * this file while still moving the bundle off the critical path.
 */

import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface GrowthPoint {
  month:   string;
  tenants: number;
  mrr:     number;
}

interface PlanSlice {
  name:  string;
  value: number;
  color: string;
}

export default function SuperadminCharts({
  growthData,
  planData,
}: {
  growthData: GrowthPoint[];
  planData:   PlanSlice[];
}) {
  return (
    <>
      {/* Growth Area Chart */}
      <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-5">
        <h2 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">
          نمو المتاجر — آخر 6 أشهر
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTenants" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#E5302A" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#E5302A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradMRR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#34C759" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6C6C70' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6C6C70' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1C1C1E', border: 'none', borderRadius: 12, color: '#F4F4F5', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="tenants" name="المتاجر" stroke="#E5302A" strokeWidth={2} fill="url(#gradTenants)" dot={false} />
            <Area type="monotone" dataKey="mrr"     name="MRR"     stroke="#34C759" strokeWidth={2} fill="url(#gradMRR)"     dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Plan Distribution Donut */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-5">
        <h2 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-4">
          توزيع خطط الاشتراك
        </h2>
        {planData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {planData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1C1C1E', border: 'none', borderRadius: 12, color: '#F4F4F5', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {planData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-[#6C6C70] dark:text-[#A1A1AA]">{d.name}</span>
                  </div>
                  <span className="font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-xs text-[#AEAEB2]">
            لا توجد متاجر بعد
          </div>
        )}
      </div>
    </>
  );
}
