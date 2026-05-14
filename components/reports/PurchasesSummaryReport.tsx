'use client';

import { useReports } from '@/lib/useReports';
import { exportToCSV, printReport, formatCurrency } from '@/lib/exportUtils';
import { Download, Printer, Users, TrendingUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function PurchasesSummaryReport() {
  const { purchasesSummary, summaryKPIs } = useReports();

  const handleExport = () => {
    exportToCSV(
      'purchases-summary',
      ['كود المورد', 'اسم المورد', 'عدد الفواتير', 'إجمالي الكمية', 'إجمالي القيمة', 'آخر شراء'],
      purchasesSummary.map((p) => [
        p.supplierId,
        p.supplierName,
        p.invoicesCount,
        p.totalQuantity,
        p.totalValue.toFixed(2),
        p.lastPurchaseDate,
      ])
    );
  };

  const chartData = purchasesSummary.slice(0, 5).map((p) => ({
    name: p.supplierName.substring(0, 15),
    value: p.totalValue,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">ملخص المشتريات حسب المورد</h2>
            <p className="text-xs text-slate-500">تتبع الالتزامات المالية مع الموردين</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => printReport('purchases-print', 'ملخص المشتريات حسب المورد')}
            icon={<Printer className="w-4 h-4" />}
          >
            طباعة
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
          >
            تصدير CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">عدد الموردين النشطين</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{purchasesSummary.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700">إجمالي المشتريات</p>
          <p className="text-2xl font-bold text-green-700 mt-1 font-mono">
            {formatCurrency(summaryKPIs.totalPurchases)}
          </p>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <p className="text-xs text-brand-700">متوسط الفاتورة</p>
          <p className="text-2xl font-bold text-brand-700 mt-1 font-mono">
            {formatCurrency(
              purchasesSummary.length > 0
                ? summaryKPIs.totalPurchases /
                    purchasesSummary.reduce((sum, p) => sum + p.invoicesCount, 0)
                : 0
            )}
          </p>
        </div>
      </div>

      {/* Top Suppliers Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            أعلى 5 موردين من حيث القيمة
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ direction: 'rtl', fontFamily: 'Cairo' }}
              />
              <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div id="purchases-print" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">#</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">كود المورد</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">اسم المورد</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">عدد الفواتير</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الكمية الكلية</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">إجمالي القيمة</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">% من الإجمالي</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">آخر شراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchasesSummary.map((p, idx) => {
                const percentage =
                  summaryKPIs.totalPurchases > 0
                    ? (p.totalValue / summaryKPIs.totalPurchases) * 100
                    : 0;
                return (
                  <tr key={p.supplierId} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">{p.supplierId}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{p.supplierName}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">{p.invoicesCount}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">{p.totalQuantity}</td>
                    <td className="px-3 py-3 font-mono font-bold text-green-700">
                      {formatCurrency(p.totalValue)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-[80px]">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-600">
                          %{percentage.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {p.lastPurchaseDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={5} className="px-3 py-3 font-bold text-slate-900 text-left">
                  الإجمالي:
                </td>
                <td className="px-3 py-3 font-mono font-bold text-green-700">
                  {formatCurrency(summaryKPIs.totalPurchases)}
                </td>
                <td colSpan={2} className="px-3 py-3 font-bold text-slate-900">
                  %100
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
