'use client';

import { useState, FormEvent } from 'react';
import { Item, Supplier } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Save } from 'lucide-react';
import { itemCategories, storageLocations, measurementUnits } from '@/data/mock-data';

interface ItemFormProps {
  initialData?: Partial<Item>;
  suppliers: Supplier[];
  onSubmit: (data: Omit<Item, 'id' | 'supplierName'>) => void;
  onCancel: () => void;
}

export default function ItemForm({
  initialData,
  suppliers,
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    category: initialData?.category || itemCategories[0],
    unit: initialData?.unit || measurementUnits[0],
    supplierId: initialData?.supplierId || '',
    purchasePrice: initialData?.purchasePrice || 0,
    sellingPrice: initialData?.sellingPrice || 0,
    openingQty: initialData?.openingQty || 0,
    minStockLevel: initialData?.minStockLevel || 0,
    reorderLevel: initialData?.reorderLevel || 0,
    location: initialData?.location || storageLocations[0],
    status: initialData?.status || ('ACTIVE' as 'ACTIVE' | 'SUSPENDED'),
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
          label="كود الصنف"
          required
          placeholder="INV-0001"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
        />
        <Input
          label="اسم الصنف"
          required
          placeholder="اسم المنتج التجاري"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        <Select
          label="التصنيف"
          required
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
          options={itemCategories.map((c) => ({ value: c, label: c }))}
        />
        <Select
          label="وحدة القياس"
          required
          value={formData.unit}
          onChange={(e) => handleChange('unit', e.target.value)}
          options={measurementUnits.map((u) => ({ value: u, label: u }))}
        />
        <Select
          label="المورد"
          required
          value={formData.supplierId}
          onChange={(e) => handleChange('supplierId', e.target.value)}
          placeholder="اختر المورد"
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          label="موقع التخزين"
          required
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          options={storageLocations.map((l) => ({ value: l, label: l }))}
        />
        <Input
          label="سعر الشراء"
          type="number"
          min={0}
          step={0.01}
          required
          value={formData.purchasePrice}
          onChange={(e) => handleChange('purchasePrice', Number(e.target.value))}
        />
        <Input
          label="سعر البيع"
          type="number"
          min={0}
          step={0.01}
          required
          value={formData.sellingPrice}
          onChange={(e) => handleChange('sellingPrice', Number(e.target.value))}
        />
        <Input
          label="الكمية الافتتاحية"
          type="number"
          min={0}
          value={formData.openingQty}
          onChange={(e) => handleChange('openingQty', Number(e.target.value))}
        />
        <Input
          label="الحد الأدنى للمخزون"
          type="number"
          min={0}
          required
          value={formData.minStockLevel}
          onChange={(e) => handleChange('minStockLevel', Number(e.target.value))}
        />
        <Input
          label="مستوى إعادة الطلب"
          type="number"
          min={0}
          required
          value={formData.reorderLevel}
          onChange={(e) => handleChange('reorderLevel', Number(e.target.value))}
        />
        <Select
          label="حالة الصنف"
          required
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          options={[
            { value: 'ACTIVE', label: 'نشط' },
            { value: 'SUSPENDED', label: 'موقوف' },
          ]}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" icon={<Save className="w-4 h-4" />}>
          حفظ الصنف
        </Button>
      </div>
    </form>
  );
}
