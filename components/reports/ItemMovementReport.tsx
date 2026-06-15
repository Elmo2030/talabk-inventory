'use client';

import { useState } from 'react';
import { useItems } from '@/lib/StockContext';
import { useReports } from '@/lib/useReports';
import { exportToCSV, printReport, formatCurrency } from '@/lib/exportUtils';
import {
  Download,
  Printer,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';

export default function ItemMovementReport() {
  const { items } = useItems();
  const { getItemMovementHistory } = useReports();
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? '');

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const history = selectedItemId ? getItemMovementHistory(selectedItemId) : [];

  const totalIn = history.filter((h) => h.type === 'IN').reduce((s, h) => s + h.quantity, 0);
  const totalOut = history.filter((h) => h.type === 'OUT').reduce((s, h) => s + h.quantity, 0);
  const currentBalance = (selectedItem?.openingQty ?? 0) + totalIn - totalOut;

  const handleExport = () => {
    if (!selectedItem) return;
    exportToCSV(
      `item-movement-${selectedItem.code}`,
      ['التاريخ', 'النوع', 'رقم العملية', 'الكمية', 'السعر', 'القيمة', 'الجهة', 'السبب', 'الرصيد بعد الحركة'],
      history.map((h) => [
        h.date,
        h.type === 'IN' ? 'وارد' : 'صادر',
        h.operationCode,
        h.quantity,
        h.unitPrice.toFixed(2),
        h.totalValue.toFixed(2),
        h.party,
        h.reason,
        h.runningBalance,
      ])
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">كشف حركة صنف</h2>
            <p className="text-xs text-slate-500">تتبع تاريخي كامل لجميع حركات الصنف</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => printReport('movement-print', `كشف حركة - ${selectedItem?.name}`)}
            icon={<Printer className="w-4 h-4" />}
            disabled={!selectedItemId}
          >
            طباعة
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
            disabled={!selectedItemId}
          >
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Item Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <Select
          label="اختر الصنف"
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          options={items.map((i) => ({
            value: i.id,
            label: `${i.code} - ${i.name}`,
          }))}
        />
      </div>

      {selectedItem && (
        <>
          {/* Item Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">الكمية الافتتاحية</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {selectedItem.openingQty}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-700">إجمالي الوارد</p>
              <p className="text-2xl font-bold text-green-700 mt-1 font-mono">+{totalIn}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs text-orange-700">إجمالي الصادر</p>
              <p className="text-2xl font-bold text-orange-700 mt-1 font-mono">-{totalOut}</p>
            </div>
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
              <p className="text-xs text-brand-700">الرصيد الحالي</p>
              <p className="text-2xl font-bold text-brand-700 mt-1 font-mono">{currentBalance}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-700">عدد الحركات</p>
              <p className="text-2xl font-bold text-slate-700 mt-1 font-mono">{history.length}</p>
            </div>
          </div>

          {/* Movement Table */}
          <div id="movement-print" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-slate-600">{selectedItem.code}</span>
                  <span className="font-bold text-slate-900 mr-2">{selectedItem.name}</span>
                </div>
                <Badge variant="info">{selectedItem.category}</Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">#</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التاريخ</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">النوع</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">رقم العملية</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الكمية</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">السعر</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">القيمة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الجهة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">السبب</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening Row */}
                  <tr className="bg-slate-50">
                    <td className="px-3 py-3 text-slate-500">0</td>
                    <td className="px-3 py-3 text-slate-500 font-mono text-xs">—</td>
                    <td className="px-3 py-3" colSpan={6}>
                      <span className="text-slate-600 italic">رصيد افتتاحي</span>
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-slate-700">
                      {selectedItem.openingQty}
                    </td>
                  </tr>

                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                        لا توجد حركات مسجلة لهذا الصنف
                      </td>
                    </tr>
                  ) : (
                    history.map((h, idx) => (
                      <tr key={`${h.operationCode}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-3 py-3 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-3 text-slate-600 font-mono text-xs">{h.date}</td>
                        <td className="px-3 py-3">
                          {h.type === 'IN' ? (
                            <div className="flex items-center gap-1 text-green-700 text-xs font-medium">
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                              وارد
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-700 text-xs font-medium">
                              <ArrowUpFromLine className="w-3.5 h-3.5" />
                              صادر
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-700">
                          {h.operationCode}
                        </td>
                        <td
                          className={`px-3 py-3 font-mono font-bold ${
                            h.type === 'IN' ? 'text-green-600' : 'text-orange-600'
                          }`}
                        >
                          {h.type === 'IN' ? '+' : '-'}
                          {h.quantity}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-700">
                          {h.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-700">
                          {formatCurrency(h.totalValue)}
                        </td>
                        <td className="px-3 py-3 text-slate-600 text-xs max-w-[140px] truncate">
                          {h.party}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={h.type === 'IN' ? 'success' : 'warning'}>
                            {h.reason}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-brand-700">
                          {h.runningBalance}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
