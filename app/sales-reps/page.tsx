'use client';

/**
 * Sales Reps page — /sales-reps (Wave G #1)
 *
 * CRUD for field sales reps. Follows the /suppliers pattern: searchable
 * table + modal-based add/edit + soft-delete via status flip. Per-rep
 * KPIs (orders, revenue) come from sales_orders.rep_id joins; this page
 * only owns the rep records — the performance report lives under /reports.
 */

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Phone, Mail, Users, ExternalLink, MapPin } from 'lucide-react';
import { useSalesReps, useOrders } from '@/lib/StockContext';
import { SalesRep } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import Badge from '@/components/ui/Badge';
import SalesRepForm from '@/components/forms/SalesRepForm';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { formatMoney } from '@/lib/format';

const PAGE_SIZE = 15;

export default function SalesRepsPage() {
  const { salesReps, addSalesRep, updateSalesRep, deleteSalesRep } = useSalesReps();
  const { salesOrders } = useOrders();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [page, setPage] = useState(1);

  // Per-rep aggregates: orders count + revenue. Computed once per render —
  // cheap because both arrays are small (reps in the dozens, orders cap
  // at a few thousand for a real merchant).
  const repStats = useMemo(() => {
    const stats: Record<string, { orders: number; revenue: number; netProfit: number; lastOrderAt?: string }> = {};
    for (const o of salesOrders) {
      if (!o.repId) continue;
      const s = stats[o.repId] ?? { orders: 0, revenue: 0, netProfit: 0 };
      s.orders   += 1;
      s.revenue  += o.customerTotal;
      s.netProfit += o.netProfit;
      if (!s.lastOrderAt || o.createdAt > s.lastOrderAt) s.lastOrderAt = o.createdAt;
      stats[o.repId] = s;
    }
    return stats;
  }, [salesOrders]);

  useKeyboardShortcuts({
    'Ctrl+N': () => { setEditingRep(null); setIsModalOpen(true); },
    'ESCAPE': () => { if (isModalOpen) handleCloseModal(); },
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return salesReps;
    const q = searchQuery.toLowerCase();
    return salesReps.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.territory ?? '').toLowerCase().includes(q)
    );
  }, [salesReps, searchQuery]);

  useEffect(() => { setPage(1); }, [searchQuery]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEdit = (rep: SalesRep) => {
    setEditingRep(rep);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRep(null);
  };

  const openAddModal = () => {
    setEditingRep(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<SalesRep, 'id' | 'createdAt' | 'status'>) => {
    try {
      if (editingRep) {
        await updateSalesRep(editingRep.id, { ...data, status: editingRep.status });
        toast.success('تم تعديل بيانات المندوب بنجاح');
      } else {
        await addSalesRep({ ...data, status: 'ACTIVE' });
        toast.success('تم إضافة المندوب بنجاح');
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  const handleDelete = async (rep: SalesRep) => {
    const used = repStats[rep.id]?.orders ?? 0;
    const description = used > 0
      ? `لهذا المندوب ${used} طلب مسجّل. الحذف سيُبقي الطلبات لكن سيُزيل الاسم منها. هل تريد المتابعة؟`
      : `هل أنت متأكد من حذف "${rep.name}"؟`;
    const confirmed = await confirm({
      title: 'حذف المندوب',
      description,
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteSalesRep(rep.id);
      toast.success('تم حذف المندوب');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            المندوبين
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            فريق المبيعات الميداني وأداء كل مندوب
          </p>
        </div>
        <Button
          onClick={openAddModal}
          icon={<Plus className="w-4 h-4" />}
          aria-label="إضافة مندوب جديد"
        >
          إضافة مندوب
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث بالاسم أو الكود أو المنطقة..."
          aria-label="بحث في المندوبين"
        />
        <div className="text-sm text-slate-500 dark:text-[#71717A]">
          إجمالي: <span className="font-bold text-slate-900 dark:text-[#F4F4F5]">{filtered.length}</span>
        </div>
      </div>

      <div
        className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] overflow-hidden card-hover"
        role="region"
        aria-label="قائمة المندوبين"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="لا يوجد مندوبون"
            description="أضف فريق المبيعات للبدء بتتبع أداء كل مندوب"
            action={
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + إضافة مندوب
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
                  <tr>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الكود</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الاسم</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">التواصل</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المنطقة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">العمولة %</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الطلبات</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المبيعات</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحالة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
                  {paginated.map((rep) => {
                    const s = repStats[rep.id] ?? { orders: 0, revenue: 0, netProfit: 0 };
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40">
                        <td className="px-3 py-3 font-mono text-slate-700 dark:text-[#E4E4E7]">{rep.code}</td>
                        <td className="px-3 py-3 font-medium text-slate-900 dark:text-[#F4F4F5]">
                          {rep.name}
                          {s.lastOrderAt && (
                            <span className="block text-[10px] font-normal text-slate-400 dark:text-[#52525B] mt-0.5">
                              آخر طلب: {new Date(s.lastOrderAt).toLocaleDateString('en-US')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            {rep.phone && (
                              <div className="flex items-center gap-1.5 text-xs" dir="ltr">
                                <Phone className="w-3 h-3 text-slate-400 dark:text-[#52525B]" />
                                {rep.phone}
                              </div>
                            )}
                            {rep.email && (
                              <div className="flex items-center gap-1.5 text-xs" dir="ltr">
                                <Mail className="w-3 h-3 text-slate-400 dark:text-[#52525B]" />
                                {rep.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 dark:text-[#E4E4E7]">
                          {rep.territory ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 dark:text-[#52525B]" />
                              {rep.territory}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-3 text-slate-700 dark:text-[#E4E4E7] font-mono">{rep.commissionPct}%</td>
                        <td className="px-3 py-3 font-mono text-slate-900 dark:text-[#F4F4F5]">{s.orders}</td>
                        <td className="px-3 py-3 font-mono text-green-700 dark:text-green-400">{formatMoney(s.revenue)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={rep.status === 'ACTIVE' ? 'success' : 'danger'}>
                            {rep.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/reports?tab=reps#${rep.id}`}
                              className="p-1.5 text-slate-500 dark:text-[#71717A] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-lg transition-colors"
                              title="عرض الأداء"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleEdit(rep)}
                              className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rep)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRep ? `تعديل المندوب — ${editingRep.code}` : 'إضافة مندوب جديد'}
        size="lg"
      >
        <SalesRepForm
          initialData={editingRep ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
