'use client';

import { useReports } from '@/lib/useReports';
import { exportToCSV, printReport, formatCurrency } from '@/lib/exportUtils';
import {
  Download,
  Printer,
  AlertOctagon,
  ShoppingCart,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function LowStockReport() {
  const { lowStockReport } = useReports();

  const outOfStockCount = lowStockReport.filter((i) => i.status === 'OUT_OF_STOCK').length;
  const needsReorderCount = lowStockReport.filter((i) => i.status === 'NEEDS_REORDER').length;
  const totalReorderCost = lowStockReport.reduce((sum, i) => sum + i.estimatedCost, 0);

  const handleExport = () => {
    exportToCSV(
      'low-stock-report',
      [
        'الكود',
        'اسم الصنف',
        'التصنيف',
        'الرصيد الحالي',
        'الحد الأدنى',
        'الكمية المقترحة',
        'سعر الشراء',
        'التكلفة المتوقعة',
        'المورد',
        'الحالة',
      ],
      lowStockReport.map((i) => [
        i.itemCode,
        i.itemName,
        i.category,
        i.currentBalance,
        i.minStockLevel,
        i.suggestedReorderQty,
        i.purchasePrice.toFixed(2),
        i.estimatedCost.toFixed(2),
        i.supplierName,
        i.status === 'OUT_OF_STOCK' ? 'نافد' : 'يحتاج طلب',
      ])
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">تقرير الأصناف النافذة</h2>
            <p className="text-xs text-slate-500">قائمة شراء فورية لتجنب نفاد المخزون</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => printReport('low-stock-print', 'تقرير الأصناف النافذة وأمر الشراء')}
            icon={<Printer className="w-4 h-4" />}
          >
            طباعة أمر شراء
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-700 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            أصناف نافذة
          </p>
          <p className="text-2xl font-bold text-red-700 mt-1">{outOfStockCount}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs text-yellow-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            تحتاج إعادة طلب
          </p>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{needsReorderCount}</p>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <p className="text-xs text-brand-700 flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            التكلفة الإجمالية المتوقعة
          </p>
          <p className="text-2xl font-bold text-brand-700 mt-1 font-mono">
            {formatCurrency(totalReorderCost)}
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      {lowStockReport.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-green-900">جميع الأصناف في حالة جيدة</h3>
          <p className="text-sm text-green-700 mt-1">
            لا توجد أصناف تحت الحد الأدنى — لا حاجة لأوامر شراء عاجلة
          </p>
        </div>
      ) : (
        <div id="low-stock-print" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <AlertOctagon className="w-4 h-4" />
              <strong>تنبيه:</strong> الأصناف التالية تحتاج إجراء فوري — مرتبة من الأكثر حرجاً
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">#</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الكود</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">اسم الصنف</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الرصيد</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الحد الأدنى</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">المقترح طلبه</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">سعر الشراء</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التكلفة</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">المورد المقترح</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockReport.map((i, idx) => (
                  <tr
                    key={i.itemId}
                    className={i.status === 'OUT_OF_STOCK' ? 'bg-red-50/40' : 'bg-yellow-50/40'}
                  >
                    <td className="px-3 py-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">{i.itemCode}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{i.itemName}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`font-mono font-bold ${
                          i.status === 'OUT_OF_STOCK' ? 'text-red-700' : 'text-yellow-700'
                        }`}
                      >
                        {i.currentBalance}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-500">{i.minStockLevel}</td>
                    <td className="px-3 py-3 font-mono font-bold text-brand-700">
                      +{i.suggestedReorderQty}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-700">
                      {i.purchasePrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-slate-900">
                      {formatCurrency(i.estimatedCost)}
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-xs max-w-[150px] truncate">
                      {i.supplierName}
                    </td>
                    <td className="px-3 py-3">
                      {i.status === 'OUT_OF_STOCK' ? (
                        <Badge variant="danger">نافد</Badge>
                      ) : (
                        <Badge variant="warning">يحتاج طلب</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={7} className="px-3 py-3 font-bold text-slate-900 text-left">
                    إجمالي تكلفة أمر الشراء:
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-brand-700 text-base">
                    {formatCurrency(totalReorderCost)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
