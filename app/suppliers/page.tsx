'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Phone, Mail, Star, Users, ExternalLink } from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { Supplier } from '@/lib/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchBar from '@/components/ui/SearchBar';
import Badge from '@/components/ui/Badge';
import SupplierForm from '@/components/forms/SupplierForm';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useStock();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useKeyboardShortcuts({
    'Ctrl+N': () => { setEditingSupplier(null); setIsModalOpen(true); },
    'ESCAPE': () => { if (isModalOpen) handleCloseModal(); },
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.productType.toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (data: Omit<Supplier, 'id' | 'createdAt' | 'isActive'>) => {
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, { ...data, isActive: editingSupplier.isActive });
        toast.success('تم تعديل بيانات المورد بنجاح');
      } else {
        await addSupplier({ ...data, isActive: true });
        toast.success('تم إضافة المورد بنجاح');
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    const confirmed = await confirm({
      title: 'حذف المورد',
      description: `هل أنت متأكد من حذف "${supplier.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteSupplier(supplier.id);
      toast.success('تم حذف المورد بنجاح');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            الموردين
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">قاعدة بيانات الموردين والشركاء التجاريين</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          إضافة مورد جديد
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="بحث بالاسم أو الكود أو نوع المنتجات..." />
        <div className="text-sm text-slate-500">
          إجمالي: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الكود</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">اسم المورد</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">نوع المنتجات</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التواصل</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">الشخص المسؤول</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">شروط الدفع</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">التقييم</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    {searchQuery ? 'لا توجد نتائج تطابق البحث' : 'لا يوجد موردون مسجلون'}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-mono text-slate-700">{s.code}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-3 py-3">
                      <Badge variant="info">{s.productType}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs" dir="ltr">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {s.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs" dir="ltr">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {s.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{s.contactPerson}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {s.paymentTerms === 0 ? 'فوري' : `${s.paymentTerms} يوم`}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < s.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(s)}
                          className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        title={editingSupplier ? `تعديل المورد — ${editingSupplier.code}` : 'إضافة مورد جديد'}
        size="lg"
      >
        <SupplierForm
          initialData={editingSupplier ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
