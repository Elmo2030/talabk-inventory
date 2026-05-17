'use client';

import { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Plus, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ReturnOrder, SalesOrder } from '@/lib/types';
import { returnsStorage } from '@/lib/storage/returnsStorage';
import { useStock } from '@/lib/StockContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] text-sm text-slate-900 dark:text-[#F4F4F5] bg-white dark:bg-[#18181B] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelClass = 'block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1.5';

function NewReturnForm({
  salesOrders,
  onSubmit,
  onCancel,
}: {
  salesOrders: SalesOrder[];
  onSubmit: (data: Omit<ReturnOrder, 'id' | 'returnNumber' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [restockItems, setRestockItems] = useState(true);
  const [selectedItems, setSelectedItems] = useState<{ id: string; qty: number }[]>([]);

  const selectedOrder = salesOrders.find((o) => o.id === orderId);

  const handleOrderChange = (id: string) => {
    setOrderId(id);
    const order = salesOrders.find((o) => o.id === id);
    if (order) {
      setSelectedItems(order.items.map((i) => ({ id: i.id, qty: i.quantity })));
    } else {
      setSelectedItems([]);
    }
  };

  const handleQtyChange = (itemId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, qty: Math.max(0, qty) } : i))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const returnItems = selectedItems
      .filter((si) => si.qty > 0)
      .map((si, idx) => {
        const original = selectedOrder.items.find((i) => i.id === si.id)!;
        return {
          id: `ri-${Date.now()}-${idx}`,
          originalOrderItemId: original.id,
          itemId: original.itemId,
          itemName: original.itemName,
          itemCode: original.itemCode,
          quantity: si.qty,
          sellingPrice: original.sellingPrice,
          lineTotal: si.qty * original.sellingPrice,
        };
      });

    const refundAmount = returnItems.reduce((s, i) => s + i.lineTotal, 0);

    onSubmit({
      originalOrderId: selectedOrder.id,
      originalOrderNumber: selectedOrder.orderNumber,
      customerName: selectedOrder.customerName,
      customerPhone: selectedOrder.customerPhone,
      items: returnItems,
      reason,
      refundAmount,
      restockItems,
      status: 'PENDING',
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div>
        <label className={labelClass}>الطلب الأصلي *</label>
        <select
          className={inputClass}
          value={orderId}
          onChange={(e) => handleOrderChange(e.target.value)}
          required
        >
          <option value="">اختر الطلب...</option>
          {salesOrders
            .filter((o) => o.status !== 'CANCELLED')
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.customerName} — {o.customerTotal.toFixed(2)} د.ل
              </option>
            ))}
        </select>
      </div>

      {selectedOrder && (
        <div className="border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-[#0F0F11] px-4 py-2 border-b border-slate-200 dark:border-[#27272A]">
            <p className="text-xs font-semibold text-slate-600 dark:text-[#A1A1AA]">اختر المنتجات المرتجعة والكمية</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
            {selectedOrder.items.map((item) => {
              const sel = selectedItems.find((s) => s.id === item.id);
              return (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F4F4F5] truncate">{item.itemName}</p>
                    <p className="text-xs text-slate-500 dark:text-[#71717A]">
                      {item.sellingPrice.toFixed(2)} د.ل × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-[#71717A]">كمية الإرجاع:</span>
                    <input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={sel?.qty ?? 0}
                      onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm text-center rounded-lg border border-slate-200 dark:border-[#27272A] focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>سبب الإرجاع *</label>
        <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} required>
          <option value="">اختر السبب...</option>
          {['منتج تالف', 'حجم خاطئ', 'لون خاطئ', 'لم يعجب العميل', 'تأخر التوصيل', 'طلب خاطئ', 'أخرى'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>ملاحظات</label>
        <textarea
          className={inputClass + ' resize-none'}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="تفاصيل إضافية..."
        />
      </div>

      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#0F0F11] rounded-xl">
        <input
          type="checkbox"
          id="restock"
          checked={restockItems}
          onChange={(e) => setRestockItems(e.target.checked)}
          className="w-4 h-4 text-brand-600 rounded"
        />
        <label htmlFor="restock" className="text-sm text-slate-700 dark:text-[#E4E4E7] cursor-pointer">
          إعادة المنتجات إلى المخزون عند الموافقة
        </label>
      </div>

      {selectedOrder && selectedItems.some((s) => s.qty > 0) && (
        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl">
          <p className="text-sm font-semibold text-brand-800">
            إجمالي المبلغ المسترد:{' '}
            {selectedItems
              .filter((s) => s.qty > 0)
              .reduce((sum, s) => {
                const item = selectedOrder.items.find((i) => i.id === s.id);
                return sum + s.qty * (item?.sellingPrice ?? 0);
              }, 0)
              .toFixed(2)}{' '}
            د.ل
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#27272A]/50">
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" disabled={!orderId || !reason || !selectedItems.some((s) => s.qty > 0)}>
          تسجيل المرتجع
        </Button>
      </div>
    </form>
  );
}

const STATUS_CONFIG = {
  PENDING: { label: 'قيد المراجعة', variant: 'warning' as const, icon: Clock },
  APPROVED: { label: 'موافق', variant: 'success' as const, icon: CheckCircle },
  REJECTED: { label: 'مرفوض', variant: 'danger' as const, icon: XCircle },
};

export default function ReturnsPage() {
  const { salesOrders } = useStock();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setReturns(returnsStorage.getAll());
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return returns;
    const q = searchQuery.toLowerCase();
    return returns.filter(
      (r) =>
        r.returnNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.originalOrderNumber.toLowerCase().includes(q)
    );
  }, [returns, searchQuery]);

  const stats = useMemo(() => ({
    pending: returns.filter((r) => r.status === 'PENDING').length,
    approved: returns.filter((r) => r.status === 'APPROVED').length,
    totalRefund: returns
      .filter((r) => r.status === 'APPROVED')
      .reduce((s, r) => s + r.refundAmount, 0),
  }), [returns]);

  const handleCreate = (data: Omit<ReturnOrder, 'id' | 'returnNumber' | 'createdAt'>) => {
    returnsStorage.create(data);
    setReturns(returnsStorage.getAll());
    setIsModalOpen(false);
    toast.success('تم تسجيل المرتجع بنجاح');
  };

  const handleApprove = async (ret: ReturnOrder) => {
    const ok = await confirm({
      title: 'الموافقة على المرتجع',
      description: `الموافقة على مرتجع ${ret.returnNumber} وإرجاع مبلغ ${ret.refundAmount.toFixed(2)} د.ل`,
      confirmLabel: 'موافقة',
      cancelLabel: 'إلغاء',
      variant: 'warning',
    });
    if (!ok) return;
    returnsStorage.update(ret.id, { status: 'APPROVED' });
    setReturns(returnsStorage.getAll());
    toast.success('تمت الموافقة على المرتجع');
  };

  const handleReject = async (ret: ReturnOrder) => {
    const ok = await confirm({
      title: 'رفض المرتجع',
      description: `هل تريد رفض مرتجع ${ret.returnNumber}؟`,
      confirmLabel: 'رفض',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    returnsStorage.update(ret.id, { status: 'REJECTED' });
    setReturns(returnsStorage.getAll());
    toast.success('تم رفض المرتجع');
  };

  const handleDelete = async (ret: ReturnOrder) => {
    const ok = await confirm({
      title: 'حذف المرتجع',
      description: `هل أنت متأكد من حذف ${ret.returnNumber}؟`,
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    returnsStorage.delete(ret.id);
    setReturns(returnsStorage.getAll());
    toast.success('تم حذف المرتجع');
  };

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-brand-600" />
            المرتجعات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">إدارة مرتجعات طلبات البيع</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          تسجيل مرتجع
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'قيد المراجعة', value: stats.pending, color: 'text-amber-600' },
          { label: 'تمت الموافقة', value: stats.approved, color: 'text-green-600' },
          { label: 'إجمالي المبالغ المستردة', value: `${stats.totalRefund.toFixed(2)} د.ل`, color: 'text-brand-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-[#71717A] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث برقم المرتجع أو اسم العميل..."
        />
      </div>

      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="لا توجد مرتجعات"
            description="سجّل مرتجعات الطلبات هنا"
            action={
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + تسجيل مرتجع
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">رقم المرتجع</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الطلب الأصلي</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">العميل</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">السبب</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">مبلغ الاسترداد</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
                {filtered.map((ret) => {
                  const cfg = STATUS_CONFIG[ret.status];
                  return (
                    <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-bold text-slate-900 dark:text-[#F4F4F5]">{ret.returnNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-700">{ret.originalOrderNumber}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-[#E4E4E7]">{ret.customerName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-[#A1A1AA] text-xs">{ret.reason}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-[#F4F4F5]">{ret.refundAmount.toFixed(2)} د.ل</td>
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {ret.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(ret)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="موافقة"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(ret)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="رفض"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(ret)}
                            className="p-1.5 text-slate-400 dark:text-[#52525B] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل مرتجع جديد"
        size="lg"
      >
        <NewReturnForm
          salesOrders={salesOrders}
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
