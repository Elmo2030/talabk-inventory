'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, ArrowDownToLine, SlidersHorizontal, X } from 'lucide-react';
import { useItems, useMovements } from '@/lib/StockContext';
import { StockInMovement } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import Select from '@/components/ui/Select';
import StockInForm from '@/components/forms/StockInForm';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { employees } from '@/data/mock-data';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { formatNumber } from '@/lib/format';

const PAGE_SIZE = 20;

interface Filters {
  fromDate: string;
  toDate: string;
  itemId: string;
  employee: string;
}

const emptyFilters: Filters = { fromDate: '', toDate: '', itemId: '', employee: '' };

export default function StockInPage() {
  const { items } = useItems();
  const { stockIn, deleteStockIn } = useMovements();
  const toast = useToast();
  const { confirm } = useConfirm();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<StockInMovement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);

  useKeyboardShortcuts({
    'Ctrl+N': () => { setEditingMovement(null); setIsModalOpen(true); },
    'ESCAPE': () => { if (isModalOpen) handleCloseModal(); },
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const filteredMovements = useMemo(() => {
    let result = stockIn;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.operationCode.toLowerCase().includes(q) ||
          m.invoiceNo.toLowerCase().includes(q) ||
          m.itemName?.toLowerCase().includes(q) ||
          m.supplierName?.toLowerCase().includes(q) ||
          m.responsibleEmployee.toLowerCase().includes(q)
      );
    }

    if (filters.fromDate) {
      result = result.filter((m) => m.date >= filters.fromDate);
    }
    if (filters.toDate) {
      result = result.filter((m) => m.date <= filters.toDate);
    }
    if (filters.itemId) {
      result = result.filter((m) => m.itemId === filters.itemId);
    }
    if (filters.employee) {
      result = result.filter((m) => m.responsibleEmployee === filters.employee);
    }

    return result;
  }, [stockIn, searchQuery, filters]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  const totalPages = Math.ceil(filteredMovements.length / PAGE_SIZE);
  const paginatedMovements = filteredMovements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalQty = stockIn.reduce((sum, m) => sum + m.quantity, 0);
    const totalValue = stockIn.reduce((sum, m) => sum + m.totalCost, 0);
    return { count: stockIn.length, totalQty, totalValue };
  }, [stockIn]);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'حذف حركة الوارد',
      description: 'هل أنت متأكد من حذف هذه الحركة؟ سيتم تعديل الرصيد تلقائياً ولا يمكن التراجع.',
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteStockIn(id);
      toast.success('تم حذف حركة الوارد وتحديث الرصيد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  const handleEdit = (movement: StockInMovement) => {
    setEditingMovement(movement);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMovement(null);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setSearchQuery('');
  };

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <ArrowDownToLine className="w-6 h-6 text-green-600" />
            سجل الوارد
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            تسجيل جميع عمليات إدخال المخزون من الموردين
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="sm"
            icon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setShowFilters((v) => !v)}
          >
            فلاتر{hasActiveFilters && ` (${Object.values(filters).filter(Boolean).length})`}
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            aria-label="تسجيل وارد جديد"
          >
            تسجيل وارد جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-4">
          <p className="text-sm text-slate-500 dark:text-[#71717A]">عدد الحركات</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] mt-1">{stats.count}</p>
        </div>
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-4">
          <p className="text-sm text-slate-500 dark:text-[#71717A]">إجمالي الكميات الواردة</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalQty}</p>
        </div>
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-4">
          <p className="text-sm text-slate-500 dark:text-[#71717A]">إجمالي قيمة المشتريات</p>
          <p className="text-2xl font-bold text-brand-600 mt-1 font-mono">
            {formatNumber(stats.totalValue)}
          </p>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-[#18181B] border border-brand-200 rounded-xl p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-[#E4E4E7]">فلاتر متقدمة</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
              >
                <X className="w-3 h-3" />
                مسح الفلاتر
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1">من تاريخ</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilter('fromDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={filters.toDate}
                min={filters.fromDate}
                onChange={(e) => setFilter('toDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <Select
              label="الصنف"
              value={filters.itemId}
              onChange={(e) => setFilter('itemId', e.target.value)}
              placeholder="كل الأصناف"
              options={items.map((i) => ({ value: i.id, label: i.name }))}
            />
            <Select
              label="المسؤول"
              value={filters.employee}
              onChange={(e) => setFilter('employee', e.target.value)}
              placeholder="كل الموظفين"
              options={employees.map((e) => ({ value: e, label: e }))}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث برقم العملية أو الفاتورة أو الصنف..."
          aria-label="بحث في حركات الوارد"
        />
        <div className="text-sm text-slate-500 dark:text-[#71717A]">
          عرض:{' '}
          <span className="font-bold text-slate-900 dark:text-[#F4F4F5]">{filteredMovements.length}</span>{' '}
          من {stockIn.length}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] overflow-hidden card-hover">
        {filteredMovements.length === 0 ? (
          <EmptyState
            icon={ArrowDownToLine}
            title="لا توجد حركات وارد"
            description="سجّل أول عملية استلام بضاعة"
            action={
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + تسجيل وارد جديد
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
                  <tr>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">رقم العملية</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">التاريخ</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">رقم الفاتورة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الصنف</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المورد</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الكمية</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">سعر الوحدة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الإجمالي</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">المسؤول</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
                  {paginatedMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                      <td className="px-3 py-3 font-mono font-semibold text-green-700">{m.operationCode}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-[#A1A1AA] font-mono text-xs">{m.date}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-[#A1A1AA] font-mono text-xs">{m.invoiceNo}</td>
                      <td className="px-3 py-3 text-slate-900 dark:text-[#F4F4F5] font-medium max-w-[180px] truncate">{m.itemName}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-[#A1A1AA] max-w-[150px] truncate">{m.supplierName}</td>
                      <td className="px-3 py-3 font-mono font-bold text-green-600">{m.quantity}</td>
                      <td className="px-3 py-3 font-mono text-slate-700 dark:text-[#E4E4E7]">{m.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 dark:text-[#F4F4F5]">{formatNumber(m.totalCost)}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-[#E4E4E7] text-xs">{m.responsibleEmployee}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(m)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            aria-label="تعديل"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="حذف"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filteredMovements.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMovement ? `تعديل الوارد — ${editingMovement.operationCode}` : 'تسجيل حركة وارد جديدة'}
        size="lg"
      >
        <StockInForm
          onSuccess={handleCloseModal}
          onCancel={handleCloseModal}
          editId={editingMovement?.id}
          initialData={editingMovement ?? undefined}
        />
      </Modal>
    </div>
  );
}
