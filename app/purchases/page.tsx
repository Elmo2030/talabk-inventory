'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Eye, CheckCircle, ShoppingCart,
  FileText, Clock, PackageCheck, Search, CreditCard, X,
} from 'lucide-react';
import { usePurchases } from '@/lib/StockContext';
import { PurchaseInvoice, SupplierPayment } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { formatMoney, formatNumber } from '@/lib/format';

const PAGE_SIZE = 15;

const STATUS_MAP: Record<PurchaseInvoice['status'], { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'مسودة',   color: 'bg-slate-100 text-slate-600',  icon: Clock },
  CONFIRMED: { label: 'مؤكدة',   color: 'bg-amber-100 text-amber-700',  icon: FileText },
  RECEIVED:  { label: 'مستلمة',  color: 'bg-green-100 text-green-700',  icon: PackageCheck },
};

export default function PurchasesPage() {
  const { purchaseInvoices, deletePurchaseInvoice, receivePurchaseInvoice, updatePurchaseInvoice } = usePurchases();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseInvoice['status'] | 'ALL'>('ALL');
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [paymentInvoice, setPaymentInvoice] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'check'>('cash');
  const [payNotes, setPayNotes] = useState('');

  const filtered = useMemo(() => {
    let list = purchaseInvoices;
    if (statusFilter !== 'ALL') list = list.filter((p) => p.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.invoiceNumber.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [purchaseInvoices, search, statusFilter]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: purchaseInvoices.length,
    draft: purchaseInvoices.filter((p) => p.status === 'DRAFT').length,
    confirmed: purchaseInvoices.filter((p) => p.status === 'CONFIRMED').length,
    received: purchaseInvoices.filter((p) => p.status === 'RECEIVED').length,
    totalValue: purchaseInvoices
      .filter((p) => p.status === 'RECEIVED')
      .reduce((s, p) => s + p.grandTotal, 0),
  }), [purchaseInvoices]);

  async function handleReceive(invoice: PurchaseInvoice) {
    const ok = await confirm({
      title: 'تأكيد استلام البضاعة',
      description: `هل تريد تأكيد استلام فاتورة ${invoice.invoiceNumber}؟ سيتم تحديث المخزون وحساب المتوسط المرجح للتكلفة.`,
      confirmLabel: 'نعم، استلم',
      variant: 'info',
    });
    if (!ok) return;
    setReceivingId(invoice.id);
    const result = await receivePurchaseInvoice(invoice.id);
    setReceivingId(null);
    if (result.success) {
      toast.success(`تم استلام ${invoice.invoiceNumber} وتحديث المخزون بنجاح`);
    } else {
      toast.error(result.error ?? 'فشل الاستلام');
    }
  }

  async function handleDelete(invoice: PurchaseInvoice) {
    if (invoice.status === 'RECEIVED') {
      toast.error('لا يمكن حذف فاتورة مستلمة');
      return;
    }
    const ok = await confirm({
      title: 'حذف الفاتورة',
      description: `هل تريد حذف فاتورة ${invoice.invoiceNumber}؟`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    await deletePurchaseInvoice(invoice.id);
    toast.success('تم حذف الفاتورة');
  }

  // suppress unused router warning — router available for future programmatic nav
  void router;

  async function handleAddPayment() {
    if (!paymentInvoice) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    const payment: SupplierPayment = {
      id: `pay-${Date.now()}`,
      amount,
      date: new Date().toISOString().split('T')[0],
      method: payMethod,
      notes: payNotes.trim() || undefined,
    };

    const newPaid = paymentInvoice.paidAmount + amount;
    const newStatus: PurchaseInvoice['paymentStatus'] =
      newPaid >= paymentInvoice.grandTotal
        ? 'paid'
        : newPaid > 0
        ? 'partial'
        : 'unpaid';

    await updatePurchaseInvoice(paymentInvoice.id, {
      payments: [...(paymentInvoice.payments ?? []), payment],
      paidAmount: newPaid,
      paymentStatus: newStatus,
    });

    toast.success(`تم تسجيل دفعة بمبلغ ${amount.toFixed(2)} د.ل`);
    setPaymentInvoice(null);
    setPayAmount('');
    setPayMethod('cash');
    setPayNotes('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1E]">فواتير المشتريات</h1>
          <p className="text-xs sm:text-sm text-[#6C6C70] mt-1">إدارة المشتريات وحساب تكلفة الاستيراد</p>
        </div>
        <Link
          href="/purchases/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E5302A] hover:bg-[#C42B24] text-white font-semibold text-sm rounded-xl transition-colors"
          aria-label="إنشاء فاتورة شراء جديدة"
        >
          <Plus className="w-4 h-4" />
          فاتورة شراء جديدة
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الفواتير', value: stats.total, color: 'text-[#1C1C1E]', bg: 'bg-white' },
          { label: 'مسودة', value: stats.draft, color: 'text-slate-600', bg: 'bg-white' },
          { label: 'مؤكدة', value: stats.confirmed, color: 'text-amber-700', bg: 'bg-white' },
          { label: 'قيمة المستلمة', value: `${formatNumber(stats.totalValue)} ر.س`, color: 'text-green-700', bg: 'bg-white' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border border-[#E5E5EA] rounded-xl p-3 sm:p-4`}>
            <p className="text-xs text-[#6C6C70] mb-1">{s.label}</p>
            <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة أو المورد..."
            aria-label="بحث في فواتير المشتريات"
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-[#E5E5EA] text-sm text-[#1C1C1E] placeholder-[#AEAEB2] focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'DRAFT', 'CONFIRMED', 'RECEIVED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-[#E5302A] text-white'
                  : 'bg-white border border-[#E5E5EA] text-[#6C6C70] hover:bg-[#F2F2F7]'
              }`}
            >
              {s === 'ALL' ? 'الكل' : STATUS_MAP[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden card-hover"
        role="region"
        aria-label="قائمة فواتير المشتريات"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="لا توجد فواتير مشتريات"
            description="أنشئ أول فاتورة شراء لتبدأ تتبع تكاليف الاستيراد"
            action={
              <Link
                href="/purchases/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + فاتورة شراء جديدة
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5EA] bg-[#F2F2F7]">
                    {['رقم الفاتورة', 'المورد', 'التاريخ', 'الأصناف', 'الإجمالي', 'الحالة', 'الدفع', 'إجراءات'].map((h) => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#6C6C70]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv) => {
                    const status = STATUS_MAP[inv.status];
                    const StatusIcon = status.icon;
                    return (
                      <tr key={inv.id} className="border-b border-[#E5E5EA] hover:bg-[#F2F2F7] transition-colors last:border-0">
                        <td className="px-4 py-3 font-mono font-semibold text-[#1C1C1E]">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-[#1C1C1E]">{inv.supplierName}</td>
                        <td className="px-4 py-3 text-[#6C6C70]">{inv.invoiceDate}</td>
                        <td className="px-4 py-3 text-[#6C6C70]">{inv.items.length} صنف</td>
                        <td className="px-4 py-3 font-mono font-semibold text-[#1C1C1E]">
                          {formatMoney(inv.grandTotal, { withSuffix: false })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            inv.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {inv.paymentStatus === 'paid' ? 'مدفوع' :
                             inv.paymentStatus === 'partial' ? `جزئي (${inv.paidAmount.toFixed(0)})` :
                             'غير مدفوع'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/purchases/${inv.id}`}
                              className="p-1.5 rounded-lg text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] transition-colors"
                              title="عرض"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {inv.status !== 'RECEIVED' && (
                              <button
                                onClick={() => handleReceive(inv)}
                                disabled={receivingId === inv.id}
                                className="p-1.5 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                                title="استلام البضاعة"
                              >
                                {receivingId === inv.id ? (
                                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {inv.paymentStatus !== 'paid' && (
                              <button
                                onClick={() => { setPaymentInvoice(inv); setPayAmount(''); }}
                                className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                                title="تسجيل دفعة"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            {inv.status !== 'RECEIVED' && (
                              <button
                                onClick={() => handleDelete(inv)}
                                className="p-1.5 rounded-lg text-[#6C6C70] hover:text-[#E5302A] hover:bg-red-50 transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </div>
      {/* Payment Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPaymentInvoice(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">تسجيل دفعة — {paymentInvoice.invoiceNumber}</h3>
              <button onClick={() => setPaymentInvoice(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500 mb-4">
              الإجمالي: {paymentInvoice.grandTotal.toFixed(2)} د.ل
              {' | '}
              المدفوع: {paymentInvoice.paidAmount.toFixed(2)} د.ل
              {' | '}
              المتبقي: <span className="font-semibold text-red-600">{(paymentInvoice.grandTotal - paymentInvoice.paidAmount).toFixed(2)} د.ل</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">المبلغ (د.ل) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  max={paymentInvoice.grandTotal - paymentInvoice.paidAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">طريقة الدفع</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="cash">نقداً</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="check">شيك</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  placeholder="اختياري..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPaymentInvoice(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddPayment}
                disabled={!payAmount || parseFloat(payAmount) <= 0}
                className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                تسجيل الدفعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
