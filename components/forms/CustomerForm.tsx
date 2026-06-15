'use client';

import { useState, FormEvent } from 'react';
import { Customer, CustomerType } from '@/lib/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Save } from 'lucide-react';

interface CustomerFormProps {
  initialData?: Partial<Customer>;
  onSubmit: (data: Omit<Customer, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
}

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: 'retail',    label: 'تجزئة' },
  { value: 'wholesale', label: 'جملة' },
  { value: 'vip',       label: 'VIP' },
];

export default function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [formData, setFormData] = useState({
    code:           initialData?.code           ?? '',
    name:           initialData?.name           ?? '',
    phone:          initialData?.phone          ?? '',
    email:          initialData?.email          ?? '',
    address:        initialData?.address        ?? '',
    city:           initialData?.city           ?? '',
    customerType:   initialData?.customerType   ?? ('retail' as CustomerType),
    creditLimit:    initialData?.creditLimit    ?? 0,
    openingBalance: initialData?.openingBalance ?? 0,
    notes:          initialData?.notes          ?? '',
  });

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="كود العميل"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
          placeholder="CUST-001"
          required
        />
        <Input
          label="اسم العميل"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="محمد علي"
          required
        />
        <Input
          label="رقم الهاتف"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="0912345678"
          dir="ltr"
        />
        <Input
          label="البريد الإلكتروني"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          dir="ltr"
        />
        <Input
          label="المدينة"
          value={formData.city}
          onChange={(e) => handleChange('city', e.target.value)}
          placeholder="طرابلس"
        />
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1.5">نوع العميل</label>
          <select
            value={formData.customerType}
            onChange={(e) => handleChange('customerType', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] text-sm text-slate-900 dark:text-[#F4F4F5] bg-white dark:bg-[#18181B] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            {CUSTOMER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Input
            label="العنوان"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>
        <Input
          label="الحد الائتماني (د.ل)"
          type="number"
          step="0.01"
          min="0"
          value={formData.creditLimit}
          onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
          placeholder="0 = نقدي فقط"
        />
        <Input
          label="رصيد افتتاحي (د.ل)"
          type="number"
          step="0.01"
          min="0"
          value={formData.openingBalance}
          onChange={(e) => handleChange('openingBalance', parseFloat(e.target.value) || 0)}
          placeholder="دين سابق إن وجد"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1.5">ملاحظات</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] text-sm text-slate-900 dark:text-[#F4F4F5] bg-white dark:bg-[#18181B] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#27272A]">
        <Button type="submit" icon={<Save className="w-4 h-4" />}>حفظ</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
      </div>
    </form>
  );
}
