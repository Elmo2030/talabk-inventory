'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useStock } from '@/lib/StockContext';
import { StockInMovement } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Save, AlertCircle, Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { employees } from '@/data/mock-data';

interface StockInFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  // في وضع التعديل
  editId?: string;
  initialData?: Partial<StockInMovement>;
}

export default function StockInForm({
  onSuccess,
  onCancel,
  editId,
  initialData,
}: StockInFormProps) {
  const { items, suppliers, stockIn, addStockIn, updateStockIn } = useStock();
  const toast = useToast();
  const isEditMode = !!editId;

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const nextInvoiceNo = `INV-${currentYear}-${String(stockIn.length + 1).padStart(3, '0')}`;

  const [formData, setFormData] = useState({
    date: initialData?.date || today,
    invoiceNo: initialData?.invoiceNo || nextInvoiceNo,
    itemId: initialData?.itemId || '',
    supplierId: initialData?.supplierId || '',
    quantity: initialData?.quantity || 0,
    unitPrice: initialData?.unitPrice || 0,
    responsibleEmployee: initialData?.responsibleEmployee || '',
    notes: initialData?.notes || '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-fill from selected item (only in add mode)
  useEffect(() => {
    if (!isEditMode && formData.itemId) {
      const item = items.find((i) => i.id === formData.itemId);
      if (item) {
        setFormData((prev) => ({
          ...prev,
          unitPrice: prev.unitPrice === 0 ? item.purchasePrice : prev.unitPrice,
          supplierId: prev.supplierId || item.supplierId,
        }));
      }
    }
  }, [formData.itemId, items, isEditMode]);

  const totalCost = formData.quantity * formData.unitPrice;

  const handleChange = (field: string, value: string | number) => {
    setSubmitError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!formData.itemId || !formData.supplierId || !formData.responsibleEmployee) {
      setSubmitError('يرجى ملء جميع الحقول الإلزامية');
      return;
    }
    if (formData.quantity <= 0) {
      setSubmitError('الكمية يجب أن تكون أكبر من صفر');
      return;
    }

    const payload = {
      date: formData.date,
      invoiceNo: formData.invoiceNo,
      itemId: formData.itemId,
      supplierId: formData.supplierId,
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      responsibleEmployee: formData.responsibleEmployee,
      notes: formData.notes,
    };

    setSubmitting(true);
    const result = isEditMode
      ? await updateStockIn(editId, payload)
      : await addStockIn(payload);
    setSubmitting(false);

    if (result.success) {
      toast.success(isEditMode ? 'تم تعديل حركة الوارد بنجاح' : 'تم تسجيل حركة الوارد بنجاح');
      onSuccess();
    } else {
      setSubmitError(result.error || 'فشل الحفظ');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
          isEditMode
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {isEditMode ? (
          <Pencil className="w-4 h-4 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        )}
        <span>
          {isEditMode
            ? 'وضع التعديل: سيتم حذف الحركة القديمة وإنشاء حركة جديدة لإعادة حساب الرصيد تلقائياً.'
            : `سيتم زيادة رصيد الصنف تلقائياً عبر Supabase بمقدار ${formData.quantity || 0} وحدة.`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="تاريخ العملية"
          type="date"
          required
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
        />
        <Input
          label="رقم الفاتورة"
          required
          value={formData.invoiceNo}
          onChange={(e) => handleChange('invoiceNo', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="الصنف"
          required
          value={formData.itemId}
          onChange={(e) => handleChange('itemId', e.target.value)}
          placeholder="اختر الصنف"
          options={items.map((item) => ({
            value: item.id,
            label: `${item.code} - ${item.name}`,
          }))}
        />
        <Select
          label="المورد"
          required
          value={formData.supplierId}
          onChange={(e) => handleChange('supplierId', e.target.value)}
          placeholder="اختر المورد"
          options={suppliers.map((s) => ({
            value: s.id,
            label: `${s.code} - ${s.name}`,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Input
          label="الكمية الواردة"
          type="number"
          min={1}
          required
          value={formData.quantity}
          onChange={(e) => handleChange('quantity', Number(e.target.value))}
        />
        <Input
          label="سعر الوحدة"
          type="number"
          min={0}
          step={0.01}
          required
          value={formData.unitPrice}
          onChange={(e) => handleChange('unitPrice', Number(e.target.value))}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            إجمالي التكلفة
            <span className="text-xs text-slate-400 mr-1">(تلقائي)</span>
          </label>
          <div className="w-full px-3 py-2 text-sm bg-green-50 border border-green-200 rounded-lg font-mono font-bold text-green-700">
            {totalCost.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="المسؤول"
          required
          value={formData.responsibleEmployee}
          onChange={(e) => handleChange('responsibleEmployee', e.target.value)}
          placeholder="اختر المسؤول"
          options={employees.map((emp) => ({ value: emp, label: emp }))}
        />
        <Input
          label="ملاحظات"
          placeholder="اختياري"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
        />
      </div>

      {submitError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          icon={
            submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )
          }
        >
          {submitting ? 'جاري الحفظ...' : isEditMode ? 'حفظ التعديلات' : 'حفظ حركة الوارد'}
        </Button>
      </div>
    </form>
  );
}
