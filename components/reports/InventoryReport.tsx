'use client';

import { useReports } from '@/lib/useReports';
import { exportToCSV, printReport, formatCurrency } from '@/lib/exportUtils';
import { Download, Printer, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function InventoryReport() {
  const { inventoryReport, summaryKPIs } = useReports();

  const handleExport = () => {
    exportToCSV(
      'inventory-report',
      [
        'الكود',
        'اسم الصنف',
        'التصنيف',
        'الوحدة',
        'الموقع',
        'الرصيد',
        'سعر الشراء',
        'القيمة الدفترية',
        'سعر البيع',
        'القيمة السوقية',
        'الربح المتوقع',
        'الحالة',
      ],
      inventoryReport.map((i) => [
        i.itemCode,
        i.itemName,
        i.category,
        i.unit,
        i.location,
        i.currentBalance,
        i.purchasePrice.toFixed(2),
        i.bookValue.toFixed(2),
        i.sellingPrice.toFixed(2),
        i.marketValue.toFixed(2),
        i.potentialProfit.toFixed(2),
        i.status === 'OUT_OF_STOCK'
          ? 'نافد'
          : i.status === 'NEEDS_REORDER'
          ? 'يحتاج طلب'
          : i.status === 'LOW'
          ? 'منخفض'
          : 'متوفر',
      ])
    );
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">تقرير الجرد الفعلي</h2>
            <p className="text-xs text-slate-500">حالة المخزون الكاملة لحظياً</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => printReport('inventory-report-print', 'تقرير الجرد الفعلي')}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">إجمالي الأصناف</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summaryKPIs.itemsCount}
          </p>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <p className="text-xs text-brand-700">القيمة الدفترية</p>
          <p className="text-2xl font-bold text-brand-700 mt-1 font-mono">
            {formatCurrency(summaryKPIs.totalInventoryValue)}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700">الربح المتوقع</p>
          <p className="text-2xl font-bold text-green-700 mt-1 font-mono">
            {formatCurrency(summaryKPIs.totalPotentialProfit)}
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-700">معدل الدوران</p>
          <p className="text-2xl font-bold text-slate-700 mt-1 font-mono">
            {summaryKPIs.inventoryTurnover}x
          </p>
        </div>
      </div>

      {/* Table */}
      <div id="inventory-report-print" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الكود</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">اسم الصنف</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التصنيف</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الموقع</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الرصيد</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">سعر الشراء</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">القيمة الدفترية</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">سعر البيع</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الربح المتوقع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryReport.map((i) => (
                <tr key={i.itemId} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-mono text-slate-700">{i.itemCode}</td>
                  <td className="px-3 py-3 font-medium text-slate-900">{i.itemName}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{i.category}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{i.location}</td>
                  <td className="px-3 py-3 font-mono font-bold text-slate-900">
                    {i.currentBalance}
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-700">
                    {i.purchasePrice.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-brand-700">
                    {formatCurrency(i.bookValue)}
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-700">
                    {i.sellingPrice.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-green-700">
                    {formatCurrency(i.potentialProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={6} className="px-3 py-3 font-bold text-slate-900 text-left">
                  الإجمالي:
                </td>
                <td className="px-3 py-3 font-mono font-bold text-brand-700">
                  {formatCurrency(summaryKPIs.totalInventoryValue)}
                </td>
                <td></td>
                <td className="px-3 py-3 font-mono font-bold text-green-700">
                  {formatCurrency(summaryKPIs.totalPotentialProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
