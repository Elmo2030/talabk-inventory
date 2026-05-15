'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, ArrowUpFromLine, SlidersHorizontal, X } from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { StockOutMovement } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import StockOutForm from '@/components/forms/StockOutForm';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { employees, issueReasons } from '@/data/mock-data';

interface Filters {
  fromDate: string;
  toDate: string;
  itemId: string;
  employee: string;
  reason: string;
}

const emptyFilters: Filters = {
  fromDate: '',
  toDate: '',
  itemId: '',
  employee: '',
  reason: '',
};

export default function StockOutPage() {
  const { stockOut, deleteStockOut, items } = useStock();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useKeyboardShortcuts({
    'Ctrl+N': () => { setEditingMovement(null); setIsModalOpen(true); },
    'ESCAPE': () => { if (isModalOpen) handleCloseModal(); },
  });
  const [editingMovement, setEditingMovement] = useState<StockOutMovement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const filteredMovements = useMemo(() => {
    let result = stockOut;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.operationCode.toLowerCase().includes(q) ||
          m.itemName?.toLowerCase().includes(q) ||
          m.recipientDept.toLowerCase().includes(q) ||
          m.reason.toLowerCase().includes(q) ||
          m.responsibleEmployee.toLowerCase().includes(q)
      );
    }

    if (filters.fromDate) result = result.filter((m) => m.date >= filters.fromDate);
    if (filters.toDate) result = result.filter((m) => m.date <= filters.toDate);
    if (filters.itemId) result = result.filter((m) => m.itemId === filters.itemId);
    if (filters.employee) result = result.filter((m) => m.responsibleEmployee === filters.employee);
    if (filters.reason) result = result.filter((m) => m.reason === filters.reason);

    return result;
  }, [stockOut, searchQuery, filters]);

  const stats = useMemo(() => {
    const totalQty = stockOut.reduce((sum, m) => sum + m.quantity, 0);
    const totalValue = stockOut.reduce((sum, m) => sum + m.totalValue, 0);
    return { count: stockOut.length, totalQty, totalValue };
  }, [stockOut]);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'حذف حركة الصادر',
      description: 'هل أنت متأكد من حذف هذه الحركة؟ سيتم إعادة الكمية للرصيد ولا يمكن التراجع.',
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteStockOut(id);
      toast.success('تم حذف حركة الصادر وإعادة الكمية للرصيد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  const handleEdit = (movement: StockOutMovement) => {
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

  const getReasonVariant = (reason: string) => {
    if (reason === 'بيع') return 'success' as const;
    if (reason === 'تلف') return 'danger' as const;
    if (reason === 'استهلاك داخلي') return 'info' as const;
    if (reason === 'إرجاع للمورد') return 'warning' as const;
    return 'neutral' as const;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpFromLine className="w-6 h-6 text-orange-600" />
            سجل الصادر
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            تسجيل جميع عمليات صرف وإخراج المخزون
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
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
            تسجيل صادر جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">عدد الحركات</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.count}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">إجمالي الكميات المنصرفة</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{stats.totalQty}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">إجمالي قيمة المبيعات/الصرف</p>
          <p className="text-2xl font-bold text-brand-600 mt-1 font-mono">
            {stats.totalValue.toLocaleString('en-US')}
          </p>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-orange-200 rounded-xl p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">فلاتر متقدمة</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">من تاريخ</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilter('fromDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">إلى تاريخ</label>
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
            <Select
              label="سبب الصرف"
              value={filters.reason}
              onChange={(e) => setFilter('reason', e.target.value)}
              placeholder="كل الأسباب"
              options={issueReasons.map((r) => ({ value: r, label: r }))}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث برقم العملية أو الصنف أو الجهة المستفيدة..."
        />
        <div className="text-sm text-slate-500">
          عرض:{' '}
          <span className="font-bold text-slate-900">{filteredMovements.length}</span>{' '}
          من {stockOut.length}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">رقم العملية</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التاريخ</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الصنف</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الجهة المستفيدة</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الكمية</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">القيمة</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">سبب الصرف</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">المسؤول</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    {hasActiveFilters || searchQuery
                      ? 'لا توجد نتائج تطابق الفلاتر المحددة'
                      : 'لا توجد حركات صادر مسجلة'}
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-mono font-semibold text-orange-700">
                      {m.operationCode}
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-mono text-xs">{m.date}</td>
                    <td className="px-3 py-3 text-slate-900 font-medium max-w-[180px] truncate">
                      {m.itemName}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{m.recipientDept}</td>
                    <td className="px-3 py-3 font-mono font-bold text-orange-600">
                      {m.quantity}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-slate-900">
                      {m.totalValue.toLocaleString('en-US')}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={getReasonVariant(m.reason)}>{m.reason}</Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-700 text-xs">
                      {m.responsibleEmployee}
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingMovement
            ? `تعديل الصادر — ${editingMovement.operationCode}`
            : 'تسجيل حركة صادر جديدة'
        }
        size="lg"
      >
        <StockOutForm
          onSuccess={handleCloseModal}
          onCancel={handleCloseModal}
          editId={editingMovement?.id}
          initialData={editingMovement ?? undefined}
        />
      </Modal>
    </div>
  );
}
