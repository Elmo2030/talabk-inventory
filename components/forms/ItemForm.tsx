'use client';

import { useState, FormEvent } from 'react';
import { Item, Supplier, ItemVariant } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Save, Plus, Trash2, Layers } from 'lucide-react';
import { itemCategories, storageLocations, measurementUnits } from '@/data/mock-data';

interface ItemFormProps {
  initialData?: Partial<Item>;
  suppliers: Supplier[];
  onSubmit: (data: Omit<Item, 'id' | 'supplierName'>) => void;
  onCancel: () => void;
}

function genVariantId() {
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const COLORS = ['أحمر', 'أزرق', 'أخضر', 'أسود', 'أبيض', 'رمادي', 'أصفر', 'بنفسجي', 'بني', 'وردي', 'برتقالي', 'بيج'];
const SIZES  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

export default function ItemForm({ initialData, suppliers, onSubmit, onCancel }: ItemFormProps) {
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

  // ── Variants ─────────────────────────────────────────────────────────────────
  const [hasVariants, setHasVariants] = useState(initialData?.hasVariants ?? false);
  const [variants, setVariants] = useState<ItemVariant[]>(initialData?.variants ?? []);
  const [newVariant, setNewVariant] = useState<Omit<ItemVariant, 'id' | 'sku'>>({
    color: '',
    size: '',
    additionalPrice: 0,
    openingQty: 0,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addVariant = () => {
    if (!newVariant.color && !newVariant.size) return;
    const label = [newVariant.color, newVariant.size].filter(Boolean).join('-');
    const sku = `${formData.code || 'ITEM'}-${label}`.toUpperCase();
    const variant: ItemVariant = {
      id: genVariantId(),
      sku,
      color: newVariant.color || undefined,
      size: newVariant.size || undefined,
      additionalPrice: newVariant.additionalPrice,
      openingQty: newVariant.openingQty,
    };
    setVariants((prev) => [...prev, variant]);
    setNewVariant({ color: '', size: '', additionalPrice: 0, openingQty: 0 });
  };

  const removeVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      hasVariants,
      variants: hasVariants ? variants : [],
    });
  };

  const inputClass =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
      {/* ── Basic Info ──────────────────────────────────────────────────────── */}
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
        {!hasVariants && (
          <Input
            label="الكمية الافتتاحية"
            type="number"
            min={0}
            value={formData.openingQty}
            onChange={(e) => handleChange('openingQty', Number(e.target.value))}
          />
        )}
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

      {/* ── Variants Toggle ─────────────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setHasVariants(!hasVariants)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-right"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-semibold text-slate-900">متغيرات الصنف (ألوان / مقاسات)</span>
            {hasVariants && variants.length > 0 && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                {variants.length} متغير
              </span>
            )}
          </div>
          <div className={`w-10 h-5 rounded-full transition-colors ${hasVariants ? 'bg-brand-600' : 'bg-slate-300'} relative`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hasVariants ? 'translate-x-0.5' : 'translate-x-5'}`} />
          </div>
        </button>

        {hasVariants && (
          <div className="p-4 space-y-4">
            {/* Existing variants */}
            {variants.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">اللون</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">المقاس</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">سعر إضافي</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">كمية افتتاحية</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">SKU</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{v.color || '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{v.size || '—'}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {v.additionalPrice > 0 ? `+${v.additionalPrice.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{v.openingQty}</td>
                        <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{v.sku}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeVariant(v.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add new variant */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-800 mb-3">إضافة متغير جديد</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">اللون</label>
                  <select
                    className={inputClass}
                    value={newVariant.color}
                    onChange={(e) => setNewVariant((p) => ({ ...p, color: e.target.value }))}
                  >
                    <option value="">بدون</option>
                    {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">المقاس</label>
                  <select
                    className={inputClass}
                    value={newVariant.size}
                    onChange={(e) => setNewVariant((p) => ({ ...p, size: e.target.value }))}
                  >
                    <option value="">بدون</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">سعر إضافي</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={inputClass}
                    value={newVariant.additionalPrice}
                    onChange={(e) => setNewVariant((p) => ({ ...p, additionalPrice: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">كمية افتتاحية</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={newVariant.openingQty}
                    onChange={(e) => setNewVariant((p) => ({ ...p, openingQty: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addVariant}
                disabled={!newVariant.color && !newVariant.size}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة المتغير
              </button>
            </div>

            {variants.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">أضف متغيراً واحداً على الأقل</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" icon={<Save className="w-4 h-4" />}>حفظ الصنف</Button>
      </div>
    </form>
  );
}
