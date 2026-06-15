'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useItems, useMovements } from '@/lib/StockContext';
import { StockOutMovement } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Save, AlertTriangle, CheckCircle2, Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { employees, recipientDepartments } from '@/data/mock-data';
import { STOCK_OUT_REASONS as issueReasons } from '@/lib/constants';

interface StockOutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  // في وضع التعديل
  editId?: string;
  initialData?: Partial<StockOutMovement>;
}

export default function StockOutForm({
  onSuccess,
  onCancel,
  editId,
  initialData,
}: StockOutFormProps) {
  const { items } = useItems();
  const { addStockOut, updateStockOut, getCurrentBalance } = useMovements();
  const toast = useToast();
  const isEditMode = !!editId;
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: initialData?.date || today,
    itemId: initialData?.itemId || '',
    recipientDept: initialData?.recipientDept || '',
    quantity: initialData?.quantity || 0,
    reason: initialData?.reason || '',
    responsibleEmployee: initialData?.responsibleEmployee || '',
    notes: initialData?.notes || '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const selectedItem = useMemo(
    () => items.find((i) => i.id === formData.itemId),
    [items, formData.itemId]
  );

  // في وضع التعديل: الرصيد المتاح = الرصيد الحالي + الكمية القديمة (لأننا سنحذف الحركة القديمة)
  const currentBalance = useMemo(() => {
    if (!formData.itemId) return 0;
    const balance = getCurrentBalance(formData.itemId);
    return isEditMode ? balance + (initialData?.quantity || 0) : balance;
  }, [formData.itemId, getCurrentBalance, isEditMode, initialData?.quantity]);

  const isQuantityValid = formData.quantity > 0 && formData.quantity <= currentBalance;
  const isQuantityTooHigh = formData.quantity > currentBalance && formData.quantity > 0;

  const handleChange = (field: string, value: string | number) => {
    setSubmitError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (
      !formData.itemId ||
      !formData.recipientDept ||
      !formData.reason ||
      !formData.responsibleEmployee
    ) {
      setSubmitError('يرجى ملء جميع الحقول الإلزامية');
      return;
    }
    if (formData.quantity <= 0) {
      setSubmitError('الكمية يجب أن تكون أكبر من صفر');
      return;
    }

    const item = items.find((i) => i.id === formData.itemId);
    const unitPrice = item?.sellingPrice || 0;

    const payload = {
      date: formData.date,
      itemId: formData.itemId,
      recipientDept: formData.recipientDept,
      quantity: formData.quantity,
      unitPrice,
      reason: formData.reason,
      responsibleEmployee: formData.responsibleEmployee,
      notes: formData.notes,
    };

    setSubmitting(true);
    const result = isEditMode
      ? await updateStockOut(editId, payload)
      : await addStockOut(payload);
    setSubmitting(false);

    if (result.success) {
      toast.success(isEditMode ? 'تم تعديل حركة الصادر بنجاح' : 'تم تسجيل حركة الصادر بنجاح');
      onSuccess();
    } else {
      setSubmitError(result.error || 'فشل الحفظ');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {selectedItem && (
        <div
          className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
            isQuantityTooHigh
              ? 'bg-red-50 border-red-200 text-red-800'
              : isQuantityValid
              ? 'bg-green-50 border-green-200 text-green-800'
              : isEditMode
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          {isQuantityTooHigh ? (
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : isEditMode ? (
            <Pencil className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="font-semibold">
              الرصيد المتاح:
              <span className="font-mono mr-1">{currentBalance}</span>
              {selectedItem.unit}
              {isEditMode && (
                <span className="text-xs font-normal mr-2">
                  (يشمل كمية الحركة القديمة: {initialData?.quantity || 0})
                </span>
              )}
            </div>
            {isQuantityTooHigh && (
              <div className="mt-1 text-xs">
                ⚠️ الكمية المطلوبة ({formData.quantity}) تتجاوز الرصيد المتاح.
              </div>
            )}
            {isQuantityValid && (
              <div className="mt-1 text-xs">
                ✓ بعد هذه الحركة، الرصيد المتبقي:{' '}
                <strong>{currentBalance - formData.quantity}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedItem && isEditMode && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Pencil className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>وضع التعديل: سيتم حذف الحركة القديمة وإنشاء جديدة لإعادة حساب الرصيد.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="تاريخ العملية"
          type="date"
          required
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
        />
        <Select
          label="المسؤول"
          required
          value={formData.responsibleEmployee}
          onChange={(e) => handleChange('responsibleEmployee', e.target.value)}
          placeholder="اختر المسؤول"
          options={employees.map((emp) => ({ value: emp, label: emp }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="الصنف"
          required
          value={formData.itemId}
          onChange={(e) => handleChange('itemId', e.target.value)}
          placeholder="اختر الصنف"
          options={items.map((item) => {
            const bal = getCurrentBalance(item.id);
            return {
              value: item.id,
              label: `${item.code} - ${item.name} (متاح: ${bal})`,
            };
          })}
        />
        <Select
          label="الجهة المستفيدة"
          required
          value={formData.recipientDept}
          onChange={(e) => handleChange('recipientDept', e.target.value)}
          placeholder="اختر الجهة"
          options={recipientDepartments.map((d) => ({ value: d, label: d }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            الكمية المنصرفة
            <span className="text-red-500 mr-1">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={currentBalance || undefined}
            required
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', Number(e.target.value))}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              isQuantityTooHigh
                ? 'border-red-500 focus:ring-red-500 bg-red-50'
                : 'border-[#E5E5EA] focus:ring-brand-600 focus:border-brand-600'
            }`}
          />
        </div>
        <Select
          label="سبب الصرف"
          required
          value={formData.reason}
          onChange={(e) => handleChange('reason', e.target.value)}
          placeholder="اختر السبب"
          options={issueReasons.map((r) => ({ value: r, label: r }))}
        />
      </div>

      <Input
        label="ملاحظات"
        placeholder="اختياري"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
      />

      {submitError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" />
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={isQuantityTooHigh || !formData.itemId || submitting}
          icon={
            submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )
          }
        >
          {submitting
            ? 'جاري الحفظ...'
            : isEditMode
            ? 'حفظ التعديلات'
            : 'حفظ حركة الصادر'}
        </Button>
      </div>
    </form>
  );
}
