'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Eye, CheckCircle, ShoppingCart,
  FileText, Clock, PackageCheck, Search,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { PurchaseInvoice } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';

const PAGE_SIZE = 15;

const STATUS_MAP: Record<PurchaseInvoice['status'], { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'مسودة',   color: 'bg-slate-100 text-slate-600',  icon: Clock },
  CONFIRMED: { label: 'مؤكدة',   color: 'bg-amber-100 text-amber-700',  icon: FileText },
  RECEIVED:  { label: 'مستلمة',  color: 'bg-green-100 text-green-700',  icon: PackageCheck },
};

export default function PurchasesPage() {
  const { purchaseInvoices, deletePurchaseInvoice, receivePurchaseInvoice } = useStock();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseInvoice['status'] | 'ALL'>('ALL');
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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
          { label: 'قيمة المستلمة', value: `${stats.totalValue.toLocaleString()} ر.س`, color: 'text-green-700', bg: 'bg-white' },
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
                    {['رقم الفاتورة', 'المورد', 'التاريخ', 'الأصناف', 'الإجمالي', 'الحالة', 'إجراءات'].map((h) => (
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
                          {inv.grandTotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
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
    </div>
  );
}
