'use client';

import { useMemo, useState } from 'react';
import { Warehouse, ArrowLeftRight, Plus, Package, AlertTriangle } from 'lucide-react';
import { useItems, useMovements } from '@/lib/StockContext';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

// ── Types ────────────────────────────────────────────────────────────────────
interface WarehouseSummary {
  name: string;
  itemCount: number;
  totalBalance: number;
  lowStock: number;
  stockValue: number;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] text-sm text-slate-900 dark:text-[#F4F4F5] bg-white dark:bg-[#18181B] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelClass = 'block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1.5';

export default function WarehousesPage() {
  const { items } = useItems();
  const { currentStock, addStockIn, addStockOut } = useMovements();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [transferItemId, setTransferItemId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

  // Aggregate stock by location
  const warehouses = useMemo<WarehouseSummary[]>(() => {
    const locationMap = new Map<string, WarehouseSummary>();

    items.forEach((item) => {
      const loc = item.location || 'المستودع الرئيسي';
      const stock = currentStock.find((s) => s.itemId === item.id);
      const balance = stock?.currentBalance ?? 0;
      const value = balance * (item.movingAverageCost ?? item.purchasePrice ?? 0);
      const isLow = stock ? ['LOW', 'NEEDS_REORDER', 'OUT_OF_STOCK'].includes(stock.status) : false;

      if (!locationMap.has(loc)) {
        locationMap.set(loc, { name: loc, itemCount: 0, totalBalance: 0, lowStock: 0, stockValue: 0 });
      }
      const entry = locationMap.get(loc)!;
      entry.itemCount++;
      entry.totalBalance += balance;
      if (isLow) entry.lowStock++;
      entry.stockValue += value;
    });

    return Array.from(locationMap.values()).sort((a, b) => b.stockValue - a.stockValue);
  }, [items, currentStock]);

  // Items in selected warehouse
  const warehouseItems = useMemo(() => {
    if (!selectedWarehouse) return [];
    return items
      .filter((i) => (i.location || 'المستودع الرئيسي') === selectedWarehouse)
      .map((item) => {
        const stock = currentStock.find((s) => s.itemId === item.id);
        return { ...item, balance: stock?.currentBalance ?? 0, status: stock?.status ?? 'AVAILABLE' };
      });
  }, [items, currentStock, selectedWarehouse]);

  // Available items for transfer from a warehouse
  const transferableItems = useMemo(() => {
    if (!fromLocation) return [];
    return items.filter((i) => (i.location || 'المستودع الرئيسي') === fromLocation);
  }, [items, fromLocation]);

  const allLocations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location || 'المستودع الرئيسي'))),
    [items]
  );

  const handleTransfer = async () => {
    if (!fromLocation || !toLocation || !transferItemId || transferQty <= 0) return;
    if (fromLocation === toLocation) {
      toast.error('المستودع المصدر والوجهة متطابقان');
      return;
    }

    const item = items.find((i) => i.id === transferItemId);
    const stock = currentStock.find((s) => s.itemId === transferItemId);
    if (!item || !stock) return;

    if (stock.currentBalance < transferQty) {
      toast.error(`الرصيد غير كافٍ — المتاح: ${stock.currentBalance}`);
      return;
    }

    const ok = await confirm({
      title: 'تأكيد نقل المخزون',
      description: `نقل ${transferQty} وحدة من "${item.name}" من ${fromLocation} إلى ${toLocation}`,
      confirmLabel: 'نقل',
      cancelLabel: 'إلغاء',
      variant: 'warning',
    });
    if (!ok) return;

    setSaving(true);
    try {
      // Stock-out from source
      await addStockOut({
        date: new Date().toISOString().split('T')[0],
        itemId: transferItemId,
        recipientDept: toLocation,
        quantity: transferQty,
        unitPrice: item.movingAverageCost ?? item.purchasePrice ?? 0,
        reason: `نقل إلى ${toLocation}`,
        responsibleEmployee: 'نظام نقل المستودعات',
        notes: `نقل داخلي من ${fromLocation} إلى ${toLocation}`,
      });
      // Stock-in to destination
      await addStockIn({
        date: new Date().toISOString().split('T')[0],
        invoiceNo: `TRANSFER-${Date.now()}`,
        itemId: transferItemId,
        supplierId: item.supplierId,
        quantity: transferQty,
        unitPrice: item.movingAverageCost ?? item.purchasePrice ?? 0,
        responsibleEmployee: 'نظام نقل المستودعات',
        notes: `نقل داخلي من ${fromLocation} إلى ${toLocation}`,
      });
      toast.success(`تم نقل ${transferQty} وحدة إلى ${toLocation} بنجاح`);
      setIsTransferOpen(false);
      setFromLocation('');
      setToLocation('');
      setTransferItemId('');
      setTransferQty(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل النقل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-brand-600" />
            المستودعات والمواقع
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            متابعة المخزون حسب الموقع ونقل البضائع بين المستودعات
          </p>
        </div>
        <button
          onClick={() => setIsTransferOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          نقل بين المستودعات
        </button>
      </div>

      {/* Summary cards */}
      {warehouses.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="لا توجد مستودعات"
          description="أضف مواقع تخزين للأصناف لتظهر هنا"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {warehouses.map((wh) => (
            <button
              key={wh.name}
              onClick={() => setSelectedWarehouse(selectedWarehouse === wh.name ? null : wh.name)}
              className={`text-right p-5 bg-white dark:bg-[#18181B] border rounded-xl transition-all hover:shadow-md ${
                selectedWarehouse === wh.name
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-slate-200 dark:border-[#27272A]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-50 rounded-lg">
                  <Warehouse className="w-5 h-5 text-brand-600" />
                </div>
                {wh.lowStock > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {wh.lowStock} منخفض
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-[#F4F4F5] text-base mb-1">{wh.name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-[#71717A]">عدد الأصناف</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-[#F4F4F5]">{wh.itemCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-[#71717A]">قيمة المخزون</p>
                  <p className="text-lg font-bold text-brand-700">{wh.stockValue.toFixed(0)} د.ل</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected warehouse items */}
      {selectedWarehouse && warehouseItems.length > 0 && (
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
            <h2 className="font-semibold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-600" />
              أصناف {selectedWarehouse}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA]">الكود</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA]">الصنف</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA]">التصنيف</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA]">الرصيد</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA]">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
                {warehouseItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-[#A1A1AA]">{item.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-[#F4F4F5]">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-[#A1A1AA] text-xs">{item.category}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-[#F4F4F5]">{item.balance}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' :
                        item.status === 'NEEDS_REORDER' ? 'bg-amber-100 text-amber-700' :
                        item.status === 'LOW' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.status === 'OUT_OF_STOCK' ? 'نافد' :
                         item.status === 'NEEDS_REORDER' ? 'يحتاج طلب' :
                         item.status === 'LOW' ? 'منخفض' : 'متاح'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="نقل بين المستودعات"
        size="sm"
      >
        <div className="space-y-4" dir="rtl">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
            النقل يُسجَّل كـ صرف من المستودع المصدر وإضافة للمستودع الوجهة بنفس سعر التكلفة.
          </div>

          <div>
            <label className={labelClass}>المستودع المصدر</label>
            <select
              className={inputClass}
              value={fromLocation}
              onChange={(e) => { setFromLocation(e.target.value); setTransferItemId(''); }}
            >
              <option value="">اختر المستودع...</option>
              {allLocations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>المستودع الوجهة</label>
            <select
              className={inputClass}
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
            >
              <option value="">اختر المستودع...</option>
              {allLocations.filter((l) => l !== fromLocation).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>الصنف</label>
            <select
              className={inputClass}
              value={transferItemId}
              onChange={(e) => setTransferItemId(e.target.value)}
              disabled={!fromLocation}
            >
              <option value="">اختر الصنف...</option>
              {transferableItems.map((i) => {
                const bal = currentStock.find((s) => s.itemId === i.id)?.currentBalance ?? 0;
                return (
                  <option key={i.id} value={i.id} disabled={bal <= 0}>
                    {i.name} (الرصيد: {bal})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={labelClass}>الكمية المراد نقلها</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={transferQty}
              onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsTransferOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-[#27272A] text-sm text-slate-600 dark:text-[#A1A1AA] rounded-xl hover:bg-slate-50 dark:hover:bg-[#27272A]/40"
            >
              إلغاء
            </button>
            <button
              onClick={handleTransfer}
              disabled={!fromLocation || !toLocation || !transferItemId || transferQty <= 0 || saving}
              className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'جاري النقل...' : 'تأكيد النقل'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
