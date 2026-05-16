'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Package, AlertTriangle, ExternalLink } from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { Item } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import Badge from '@/components/ui/Badge';
import ItemForm from '@/components/forms/ItemForm';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { usePermissions } from '@/lib/usePermissions';

const PAGE_SIZE = 15;

export default function ItemsPage() {
  const { items, suppliers, currentStock, addItem, updateItem, deleteItem } = useStock();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { can } = usePermissions();
  const canSeePurchasePrices = can('purchase_prices:read');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [page, setPage] = useState(1);

  useKeyboardShortcuts({
    'Ctrl+N': () => { setEditingItem(null); setIsModalOpen(true); },
    'ESCAPE': () => { if (isModalOpen) handleCloseModal(); },
  });

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getBalance = (itemId: string) =>
    currentStock.find((s) => s.itemId === itemId)?.currentBalance ?? 0;

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Item, 'id' | 'supplierName'>) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, data);
        toast.success('تم تعديل الصنف بنجاح');
      } else {
        await addItem(data);
        toast.success('تم إضافة الصنف بنجاح');
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  const handleDelete = async (item: Item) => {
    const confirmed = await confirm({
      title: 'حذف الصنف',
      description: `هل أنت متأكد من حذف "${item.name}"؟ سيتم حذف جميع البيانات المرتبطة به.`,
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteItem(item.id);
      toast.success('تم حذف الصنف بنجاح');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            الأصناف
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">السجل الرئيسي لجميع أصناف المخزون</p>
        </div>
        <Button
          onClick={openAddModal}
          icon={<Plus className="w-4 h-4" />}
          aria-label="إضافة صنف جديد"
        >
          إضافة صنف جديد
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث بالاسم أو الكود أو التصنيف..."
          aria-label="بحث في الأصناف"
        />
        <div className="text-sm text-slate-500">
          إجمالي: <span className="font-bold text-slate-900">{filteredItems.length}</span>
        </div>
      </div>

      <div
        className="bg-white rounded-xl border border-slate-200 overflow-hidden card-hover"
        role="region"
        aria-label="قائمة الأصناف"
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="لا توجد أصناف"
            description="ابدأ بإضافة الأصناف إلى المخزون"
            action={
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + إضافة صنف
              </button>
            }
          />
        ) : (
          <>
            {/* Mobile cards — sm and below */}
            <div className="sm:hidden divide-y divide-slate-100">
              {paginatedItems.map((item) => {
                const balance = getBalance(item.id);
                const isBelowMin = balance <= item.minStockLevel;
                const isSuspended = item.status === 'SUSPENDED';
                return (
                  <div
                    key={item.id}
                    className={`bg-white border border-[#E5E5EA] rounded-xl p-4 space-y-2 m-3 ${isSuspended ? 'bg-red-50/60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-mono">{item.code}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                      </div>
                      {item.status === 'ACTIVE' ? (
                        <Badge variant="success">نشط</Badge>
                      ) : (
                        <Badge variant="danger">موقوف</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-slate-400">الرصيد</p>
                        <p className={`text-2xl font-bold ${isBelowMin ? 'text-amber-600' : 'text-slate-900'}`}>
                          {balance}
                          {isBelowMin && <AlertTriangle className="inline w-4 h-4 text-amber-500 mr-1 mb-0.5" />}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-400">سعر البيع</p>
                        <p className="text-sm font-semibold text-slate-700">{item.sellingPrice.toFixed(2)} د.ل</p>
                        {canSeePurchasePrices && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            شراء: {item.purchasePrice.toFixed(2)} د.ل
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                      <Link
                        href={`/items/${item.id}`}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table — md and above */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الكود</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">اسم الصنف</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التصنيف</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">المورد</th>
                    {canSeePurchasePrices && (
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">سعر الشراء</th>
                    )}
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">سعر البيع</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الرصيد الحالي</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الحد الأدنى</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الحالة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map((item) => {
                    const balance = getBalance(item.id);
                    const isBelowMin = balance <= item.minStockLevel;
                    const isSuspended = item.status === 'SUSPENDED';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSuspended ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-3 font-mono text-slate-700">{item.code}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-3 py-3 text-slate-600">{item.category}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs">{item.supplierName}</td>
                        {canSeePurchasePrices && (
                          <td className="px-3 py-3 font-mono text-slate-700">
                            {item.purchasePrice.toFixed(2)}
                          </td>
                        )}
                        <td className="px-3 py-3 font-mono text-slate-700">
                          {item.sellingPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold">
                          <span className={isBelowMin ? 'text-amber-600' : 'text-slate-900'}>
                            {balance}
                          </span>
                          {isBelowMin && (
                            <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 mr-1" />
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-500">{item.minStockLevel}</td>
                        <td className="px-3 py-3">
                          {item.status === 'ACTIVE' ? (
                            <Badge variant="success">نشط</Badge>
                          ) : (
                            <Badge variant="danger">موقوف</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/items/${item.id}`}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                              title="عرض التفاصيل"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
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
              total={filteredItems.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? `تعديل الصنف — ${editingItem.code}` : 'إضافة صنف جديد'}
        size="lg"
      >
        <ItemForm
          initialData={editingItem ?? undefined}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
