'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Tag, Trash2, Pencil, Copy, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { Coupon } from '@/lib/types';
import { couponsStorage } from '@/lib/storage/couponsStorage';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] text-sm text-slate-900 dark:text-[#F4F4F5] bg-white dark:bg-[#18181B] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const labelClass = 'block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1.5';

function CouponForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: Coupon;
  onSubmit: (data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initialData?.code ?? '');
  const [type, setType] = useState<'fixed' | 'percentage'>(initialData?.type ?? 'percentage');
  const [value, setValue] = useState(initialData?.value ?? 10);
  const [minOrderValue, setMinOrderValue] = useState(initialData?.minOrderValue ?? 0);
  const [maxUses, setMaxUses] = useState(initialData?.maxUses ?? 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [expiresAt, setExpiresAt] = useState(initialData?.expiresAt?.split('T')[0] ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      minOrderValue: Number(minOrderValue),
      maxUses: Number(maxUses),
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>كود الكوبون *</label>
          <input
            className={inputClass + ' font-mono uppercase'}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            required
          />
        </div>
        <div>
          <label className={labelClass}>نوع الخصم *</label>
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as 'fixed' | 'percentage')}
          >
            <option value="percentage">نسبة مئوية (%)</option>
            <option value="fixed">مبلغ ثابت (د.ل)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>قيمة الخصم *</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            max={type === 'percentage' ? 100 : undefined}
            step={0.01}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            required
          />
          <p className="text-xs text-slate-400 dark:text-[#52525B] mt-1">
            {type === 'percentage' ? 'نسبة من إجمالي الطلب' : 'مبلغ ثابت يُخصم من الإجمالي'}
          </p>
        </div>
        <div>
          <label className={labelClass}>الحد الأدنى للطلب (د.ل)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            step={0.01}
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 dark:text-[#52525B] mt-1">0 = بدون حد أدنى</p>
        </div>
        <div>
          <label className={labelClass}>الحد الأقصى للاستخدام</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
          />
          <p className="text-xs text-slate-400 dark:text-[#52525B] mt-1">0 = غير محدود</p>
        </div>
        <div>
          <label className={labelClass}>تاريخ الانتهاء</label>
          <input
            className={inputClass}
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="text-xs text-slate-400 dark:text-[#52525B] mt-1">اتركه فارغاً للكوبون الدائم</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#0F0F11] rounded-xl">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className="text-brand-600"
        >
          {isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7 text-slate-400 dark:text-[#52525B]" />}
        </button>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-[#F4F4F5]">{isActive ? 'الكوبون نشط' : 'الكوبون معطل'}</p>
          <p className="text-xs text-slate-500 dark:text-[#71717A]">يمكن تفعيل/تعطيل الكوبون في أي وقت</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#27272A]/50">
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit">حفظ الكوبون</Button>
      </div>
    </form>
  );
}

export default function CouponsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setCoupons(couponsStorage.getAll());
  }, []);

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.isActive).length;
    const totalUses = coupons.reduce((s, c) => s + c.usedCount, 0);
    const expired = coupons.filter(
      (c) => c.expiresAt && new Date(c.expiresAt) < new Date()
    ).length;
    return { active, totalUses, expired };
  }, [coupons]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleSave = (data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>) => {
    if (editing) {
      couponsStorage.update(editing.id, data);
      toast.success('تم تحديث الكوبون');
    } else {
      couponsStorage.create(data);
      toast.success('تم إنشاء الكوبون');
    }
    setCoupons(couponsStorage.getAll());
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (coupon: Coupon) => {
    const ok = await confirm({
      title: 'حذف الكوبون',
      description: `هل أنت متأكد من حذف كوبون "${coupon.code}"؟`,
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    couponsStorage.delete(coupon.id);
    setCoupons(couponsStorage.getAll());
    toast.success('تم حذف الكوبون');
  };

  const handleToggle = (coupon: Coupon) => {
    couponsStorage.update(coupon.id, { isActive: !coupon.isActive });
    setCoupons(couponsStorage.getAll());
    toast.success(coupon.isActive ? 'تم تعطيل الكوبون' : 'تم تفعيل الكوبون');
  };

  const isExpired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt) < new Date();
  const isMaxed = (c: Coupon) => c.maxUses > 0 && c.usedCount >= c.maxUses;

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Tag className="w-6 h-6 text-brand-600" />
            الكوبونات والخصومات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">إدارة كوبونات الخصم للعملاء</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setIsModalOpen(true); }}
          icon={<Plus className="w-4 h-4" />}
        >
          إنشاء كوبون
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'كوبونات نشطة', value: stats.active, color: 'text-green-600' },
          { label: 'إجمالي الاستخدامات', value: stats.totalUses, color: 'text-brand-600' },
          { label: 'منتهية الصلاحية', value: stats.expired, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-[#71717A] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] overflow-hidden">
        {coupons.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="لا توجد كوبونات"
            description="أنشئ كوبون خصم لعملائك"
            action={
              <button
                onClick={() => { setEditing(null); setIsModalOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + إنشاء كوبون
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الكود</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الخصم</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحد الأدنى</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الاستخدامات</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الانتهاء</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
                {coupons.map((c) => {
                  const expired = isExpired(c);
                  const maxed = isMaxed(c);
                  const effective = c.isActive && !expired && !maxed;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-[#F4F4F5] bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded-lg text-xs tracking-wider">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleCopy(c.code)}
                            className="p-1 text-slate-400 dark:text-[#52525B] hover:text-slate-700 rounded"
                            title="نسخ"
                          >
                            {copied === c.code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-700">
                        {c.type === 'percentage' ? `${c.value}%` : `${c.value.toFixed(2)} د.ل`}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-[#A1A1AA]">
                        {c.minOrderValue > 0 ? `${c.minOrderValue.toFixed(2)} د.ل` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-[#A1A1AA]">
                        {c.usedCount} {c.maxUses > 0 ? `/ ${c.maxUses}` : ''}
                        {maxed && <span className="mr-1 text-xs text-red-500">(نفد)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-[#A1A1AA] text-xs">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString('ar-LY')
                          : <span className="text-slate-400 dark:text-[#52525B]">دائم</span>}
                        {expired && <span className="mr-1 text-red-500">(منتهي)</span>}
                      </td>
                      <td className="px-4 py-3">
                        {effective ? (
                          <Badge variant="success">نشط</Badge>
                        ) : expired ? (
                          <Badge variant="danger">منتهي</Badge>
                        ) : maxed ? (
                          <Badge variant="warning">نفد</Badge>
                        ) : (
                          <Badge variant="neutral">معطل</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggle(c)}
                            className="p-1.5 text-slate-500 dark:text-[#71717A] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-lg transition-colors"
                            title={c.isActive ? 'تعطيل' : 'تفعيل'}
                          >
                            {c.isActive
                              ? <ToggleRight className="w-4 h-4 text-green-500" />
                              : <ToggleLeft className="w-4 h-4 text-slate-400 dark:text-[#52525B]" />}
                          </button>
                          <button
                            onClick={() => { setEditing(c); setIsModalOpen(true); }}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
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
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(null); }}
        title={editing ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
        size="lg"
      >
        <CouponForm
          initialData={editing ?? undefined}
          onSubmit={handleSave}
          onCancel={() => { setIsModalOpen(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
