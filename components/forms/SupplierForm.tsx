'use client';

import { useState, FormEvent } from 'react';
import { Supplier } from '@/lib/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Save } from 'lucide-react';

interface SupplierFormProps {
  initialData?: Partial<Supplier>;
  onSubmit: (data: Omit<Supplier, 'id' | 'createdAt' | 'isActive'>) => void;
  onCancel: () => void;
}

export default function SupplierForm({
  initialData,
  onSubmit,
  onCancel,
}: SupplierFormProps) {
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    productType: initialData?.productType || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    contactPerson: initialData?.contactPerson || '',
    paymentTerms: initialData?.paymentTerms || 30,
    rating: initialData?.rating || 3,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="كود المورد"
          required
          placeholder="SUP-0001"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
        />
        <Input
          label="اسم المورد"
          required
          placeholder="مثال: شركة الفارابي للأدوية"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        <Input
          label="نوع المنتجات"
          required
          placeholder="أدوية / مستلزمات طبية"
          value={formData.productType}
          onChange={(e) => handleChange('productType', e.target.value)}
        />
        <Input
          label="رقم الهاتف"
          required
          placeholder="+218-21-0000000"
          dir="ltr"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
        />
        <Input
          label="البريد الإلكتروني"
          type="email"
          placeholder="info@example.com"
          dir="ltr"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
        />
        <Input
          label="الشخص المسؤول"
          placeholder="م. محمد علي"
          value={formData.contactPerson}
          onChange={(e) => handleChange('contactPerson', e.target.value)}
        />
        <Input
          label="العنوان"
          placeholder="المدينة - الشارع"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
        />
        <Input
          label="شروط الدفع (بالأيام)"
          type="number"
          min={0}
          placeholder="30"
          value={formData.paymentTerms}
          onChange={(e) => handleChange('paymentTerms', Number(e.target.value))}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" icon={<Save className="w-4 h-4" />}>
          حفظ المورد
        </Button>
      </div>
    </form>
  );
}
