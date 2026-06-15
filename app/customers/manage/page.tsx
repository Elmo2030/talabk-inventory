'use client';

/**
 * Registered Customers (CRUD) — /customers/manage  (Wave G #2)
 *
 * Different from /customers — which aggregates one-time/walk-in customers
 * from sales_orders — this page manages the *registered* customer entity
 * (credit terms, A/R, addressing). Walk-ins stay anonymous on the
 * existing analytics page; this page is the source of truth for the
 * customer rows referenced by sales_orders.customer_id.
 */

import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Pencil, Phone, MapPin, AlertTriangle, UserCircle } from 'lucide-react';
import { useCustomers } from '@/lib/StockContext';
import { Customer } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import Badge from '@/components/ui/Badge';
import CustomerForm from '@/components/forms/CustomerForm';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { formatMoney } from '@/lib/format';

const PAGE_SIZE = 15;

const CUSTOMER_TYPE_LABELS = {
  retail:    'تجزئة',
  wholesale: 'جملة',
  vip:       'VIP',
} as const;

export default function ManageCustomersPage() {
  const { customers, customerBalances, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);

  // Map for O(1) lookups in the table render.
  const balanceById = useMemo(() => {
    const m = new Map<string, typeof customerBalances[number]>();
    for (const b of customerBalances) m.set(b.customerId, b);
    return m;
  }, [customerBalances]);

  useKeyboardShortcuts({
    'Ctrl+N': () => { setEditing(null); setIsModalOpen(true); },
    'ESCAPE': () => { if (isModalOpen) handleCloseModal(); },
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  useEffect(() => { setPage(1); }, [searchQuery]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Tenant-wide A/R totals at the top of the page.
  const totals = useMemo(() => {
    return customerBalances.reduce(
      (s, b) => ({
        outstanding:  s.outstanding + b.outstanding,
        creditLimit:  s.creditLimit + b.creditLimit,
        overLimit:    s.overLimit + (b.outstanding > b.creditLimit ? 1 : 0),
        countWithBal: s.countWithBal + (b.outstanding > 0 ? 1 : 0),
      }),
      { outstanding: 0, creditLimit: 0, overLimit: 0, countWithBal: 0 }
    );
  }, [customerBalances]);

  const handleEdit = (c: Customer) => {
    setEditing(c);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const openAddModal = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Customer, 'id' | 'createdAt' | 'status'>) => {
    try {
      if (editing) {
        await updateCustomer(editing.id, { ...data, status: editing.status });
        toast.success('تم تعديل بيانات العميل');
      } else {
        await addCustomer({ ...data, status: 'ACTIVE' });
        toast.success('تم إضافة العميل');
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  const handleDelete = async (c: Customer) => {
    const bal = balanceById.get(c.id);
    const description = bal && bal.outstanding > 0
      ? `للعميل رصيد مستحق ${formatMoney(bal.outstanding)}. الحذف سيُبقي الطلبات لكن سيُزيل الربط بالعميل. هل تريد المتابعة؟`
      : `هل أنت متأكد من حذف "${c.name}"؟`;
    const ok = await confirm({
      title: 'حذف العميل',
      description,
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteCustomer(c.id);
      toast.success('تم حذف العميل');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <UserCircle className="w-6 h-6 text-brand-600" />
            إدارة العملاء
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            العملاء المسجّلون مع حدودهم الائتمانية وأرصدتهم المستحقة
          </p>
        </div>
        <Button onClick={openAddModal} icon={<Plus className="w-4 h-4" />} aria-label="إضافة عميل جديد">
          إضافة عميل
        </Button>
      </div>

      {/* A/R totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-3 sm:p-4">
          <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">إجمالي المستحقات</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">{formatMoney(totals.outstanding)}</p>
        </div>
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-3 sm:p-4">
          <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">إجمالي حدود الائتمان</p>
          <p className="text-lg font-bold text-slate-900 dark:text-[#F4F4F5] mt-1">{formatMoney(totals.creditLimit)}</p>
        </div>
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-3 sm:p-4">
          <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">عملاء عليهم ديون</p>
          <p className="text-lg font-bold text-slate-900 dark:text-[#F4F4F5] mt-1">{totals.countWithBal}</p>
        </div>
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-3 sm:p-4">
          <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">تجاوزوا الحد</p>
          <p className={`text-lg font-bold mt-1 ${totals.overLimit > 0 ? 'text-red-600' : 'text-slate-400'}`}>{totals.overLimit}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث بالاسم أو الكود أو الهاتف..."
          aria-label="بحث في العملاء"
        />
        <div className="text-sm text-slate-500 dark:text-[#71717A]">
          إجمالي: <span className="font-bold text-slate-900 dark:text-[#F4F4F5]">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] overflow-hidden card-hover">
        {filtered.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="لا يوجد عملاء مسجّلون"
            description="أضف العملاء الدائمين لتتبع حدودهم الائتمانية وأرصدتهم"
            action={
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + إضافة عميل
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
                  <tr>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الكود</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الاسم</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">النوع</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">التواصل</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحد الائتماني</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المستحق</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المتبقي</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحالة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
                  {paginated.map((c) => {
                    const b = balanceById.get(c.id);
                    const outstanding = b?.outstanding ?? c.openingBalance;
                    const remaining   = c.creditLimit - outstanding;
                    const overLimit   = outstanding > c.creditLimit && c.creditLimit > 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40">
                        <td className="px-3 py-3 font-mono text-slate-700 dark:text-[#E4E4E7]">{c.code}</td>
                        <td className="px-3 py-3 font-medium text-slate-900 dark:text-[#F4F4F5]">
                          {c.name}
                          {c.city && (
                            <span className="block text-[10px] font-normal text-slate-400 dark:text-[#52525B] mt-0.5">
                              <MapPin className="w-3 h-3 inline-block ms-1" />
                              {c.city}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={c.customerType === 'vip' ? 'success' : c.customerType === 'wholesale' ? 'info' : 'neutral'}>
                            {CUSTOMER_TYPE_LABELS[c.customerType]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {c.phone && (
                            <div className="flex items-center gap-1.5" dir="ltr">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {c.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-900 dark:text-[#F4F4F5]">
                          {c.creditLimit > 0 ? formatMoney(c.creditLimit, { withSuffix: false }) : <span className="text-slate-400">نقدي فقط</span>}
                        </td>
                        <td className="px-3 py-3 font-mono text-amber-700 dark:text-amber-400">{formatMoney(outstanding, { withSuffix: false })}</td>
                        <td className="px-3 py-3 font-mono">
                          {c.creditLimit > 0 ? (
                            <span className={remaining < 0 ? 'text-red-600' : remaining < c.creditLimit * 0.2 ? 'text-amber-600' : 'text-green-700'}>
                              {formatMoney(remaining, { withSuffix: false })}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {overLimit ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              تجاوز
                            </span>
                          ) : (
                            <Badge variant={c.status === 'ACTIVE' ? 'success' : 'danger'}>
                              {c.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(c)}
                              className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
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
        title={editing ? `تعديل العميل — ${editing.code}` : 'إضافة عميل جديد'}
        size="lg"
      >
        <CustomerForm
          initialData={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
