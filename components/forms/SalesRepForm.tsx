'use client';

import { useState, FormEvent } from 'react';
import { SalesRep } from '@/lib/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Save } from 'lucide-react';

interface SalesRepFormProps {
  initialData?: Partial<SalesRep>;
  /** Submit payload: status is added by the page wrapper. */
  onSubmit: (data: Omit<SalesRep, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
}

export default function SalesRepForm({
  initialData,
  onSubmit,
  onCancel,
}: SalesRepFormProps) {
  const [formData, setFormData] = useState({
    code:          initialData?.code          ?? '',
    name:          initialData?.name          ?? '',
    phone:         initialData?.phone         ?? '',
    email:         initialData?.email         ?? '',
    commissionPct: initialData?.commissionPct ?? 0,
    territory:     initialData?.territory     ?? '',
    notes:         initialData?.notes         ?? '',
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
          label="كود المندوب"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
          placeholder="REP-001"
          required
          aria-required="true"
        />
        <Input
          label="اسم المندوب"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="أحمد محمد"
          required
          aria-required="true"
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
          label="نسبة العمولة (%)"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formData.commissionPct}
          onChange={(e) => handleChange('commissionPct', parseFloat(e.target.value) || 0)}
          placeholder="5"
        />
        <Input
          label="المنطقة"
          value={formData.territory}
          onChange={(e) => handleChange('territory', e.target.value)}
          placeholder="طرابلس"
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
