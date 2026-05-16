'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, Calculator, Package, TrendingDown, FileText } from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { LandedCostMethod } from '@/lib/types';
import type { StoreSettings } from '@/lib/types';
import { storeSettingsService } from '@/lib/services/storeSettingsService';
import { computeInvoiceItems } from '@/lib/landedCost';
import { useToast } from '@/components/ui/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormRow {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
}

interface LandedCosts {
  intlShipping: number;
  localShipping: number;
  customsDuties: number;
  clearanceFees: number;
  otherExpenses: number;
}

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genRowId() { return `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function numInput(val: number, setter: (v: number) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setter(isNaN(v) || v < 0 ? 0 : v);
  };
}

// suppress unused warning — val param is required for the signature pattern
void (numInput as (val: number, setter: (v: number) => void) => React.ChangeEventHandler<HTMLInputElement>);

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-[#E5E5EA] text-sm text-[#1C1C1E] placeholder-[#AEAEB2] focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20 bg-white";
const labelCls = "block text-xs font-medium text-[#6C6C70] mb-1.5";

// ── Component ─────────────────────────────────────────────────────────────────

export default function PurchaseInvoiceForm({ onSuccess, onCancel }: Props) {
  const { suppliers, items, currentStock, addPurchaseInvoice, receivePurchaseInvoice } = useStock();
  const toast = useToast();

  // Header state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('SAR');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [notes, setNotes] = useState('');

  // Item rows
  const [rows, setRows] = useState<FormRow[]>([{ id: genRowId(), itemId: '', quantity: 1, unitPrice: 0 }]);

  // Landed costs
  const [landedCosts, setLandedCosts] = useState<LandedCosts>({
    intlShipping: 0, localShipping: 0, customsDuties: 0, clearanceFees: 0, otherExpenses: 0,
  });

  // Allocation method
  const [method, setMethod] = useState<LandedCostMethod>('VALUE');

  // Loading
  const [saving, setSaving] = useState(false);

  // VAT settings — loaded from Supabase with localStorage fallback
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('talabk_store_settings') : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    storeSettingsService.get()
      .then((s) => setStoreSettings(s))
      .catch(() => {
        // Supabase unavailable — localStorage fallback already applied in initial state
      });
  }, []);

  const vatEnabled: boolean = storeSettings.vatEnabled ?? false;
  const vatRate: number = storeSettings.vatRate ?? 15;

  // ── Derived data ─────────────────────────────────────────────────────────────

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive), [suppliers]);

  const totalLandedCosts = useMemo(() =>
    Object.values(landedCosts).reduce((s, v) => s + v, 0),
  [landedCosts]);

  const subtotal = useMemo(() =>
    rows.reduce((s, r) => s + (r.quantity * r.unitPrice), 0),
  [rows]);

  const grandTotal = subtotal + totalLandedCosts;
  const vatAmount: number = vatEnabled ? (grandTotal * vatRate) / 100 : 0;

  // Current balances and MACs for preview
  const currentBalances = useMemo(() => {
    const map: Record<string, number> = {};
    currentStock.forEach((s) => { map[s.itemId] = s.currentBalance; });
    return map;
  }, [currentStock]);

  const currentMACs = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((it) => { map[it.id] = it.movingAverageCost ?? it.purchasePrice ?? 0; });
    return map;
  }, [items]);

  // Compute allocation preview
  const validRows = useMemo(() =>
    rows.filter((r) => r.itemId && r.quantity > 0 && r.unitPrice >= 0),
  [rows]);

  const computedItems = useMemo(() => {
    if (validRows.length === 0) return [];
    return computeInvoiceItems(
      validRows.map((r) => {
        const item = items.find((i) => i.id === r.itemId);
        return {
          id: r.id,
          itemId: r.itemId,
          itemName: item?.name ?? '',
          itemCode: item?.code ?? '',
          category: item?.category ?? '',
          quantity: r.quantity,
          unitPrice: r.unitPrice,
        };
      }),
      totalLandedCosts,
      method,
      currentBalances,
      currentMACs
    );
  }, [validRows, totalLandedCosts, method, currentBalances, currentMACs, items]);

  // ── Row handlers ─────────────────────────────────────────────────────────────

  const addRow = useCallback(() =>
    setRows((prev) => [...prev, { id: genRowId(), itemId: '', quantity: 1, unitPrice: 0 }]),
  []);

  const removeRow = useCallback((id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id)),
  []);

  const updateRow = useCallback((id: string, field: keyof FormRow, value: string | number) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r)),
  []);

  // Auto-fill unit price from item's purchase price
  const handleItemSelect = useCallback((rowId: string, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    setRows((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, itemId, unitPrice: item?.purchasePrice ?? 0 } : r
    ));
  }, [items]);

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(receiveNow: boolean) {
    if (!supplierId) { toast.error('يرجى اختيار المورد'); return; }
    if (validRows.length === 0) { toast.error('يرجى إضافة صنف واحد على الأقل'); return; }

    const supplier = suppliers.find((s) => s.id === supplierId);
    setSaving(true);

    try {
      const finalItems = computeInvoiceItems(
        validRows.map((r) => {
          const item = items.find((i) => i.id === r.itemId);
          return {
            id: r.id, itemId: r.itemId,
            itemName: item?.name ?? '', itemCode: item?.code ?? '',
            category: item?.category ?? '',
            quantity: r.quantity, unitPrice: r.unitPrice,
          };
        }),
        totalLandedCosts, method, currentBalances, currentMACs
      );

      const result = await addPurchaseInvoice({
        supplierId,
        supplierName: supplier?.name ?? '',
        invoiceDate,
        currency,
        exchangeRate,
        intlShipping: landedCosts.intlShipping,
        localShipping: landedCosts.localShipping,
        customsDuties: landedCosts.customsDuties,
        clearanceFees: landedCosts.clearanceFees,
        otherExpenses: landedCosts.otherExpenses,
        allocationMethod: method,
        items: finalItems,
        subtotal,
        totalLandedCosts,
        grandTotal,
        notes,
        // Payment tracking defaults
        paymentStatus: 'unpaid',
        paidAmount: 0,
        payments: [],
      });

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'فشل الحفظ');
        return;
      }

      if (receiveNow) {
        const recResult = await receivePurchaseInvoice(result.data.id);
        if (recResult.success) {
          toast.success('تم حفظ الفاتورة واستلام البضاعة وتحديث المخزون');
        } else {
          toast.error(recResult.error ?? 'تم الحفظ لكن فشل الاستلام');
        }
      } else {
        toast.success('تم حفظ الفاتورة كمسودة');
      }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1E]">فاتورة شراء جديدة</h1>

      {/* ── Section 1: Invoice Header ── */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[#1C1C1E] mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#E5302A]" /> بيانات الفاتورة
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>المورد *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
              <option value="">— اختر المورد —</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>تاريخ الفاتورة *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>العملة</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              {['SAR', 'USD', 'EUR', 'AED', 'GBP'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {currency !== 'SAR' && (
            <div>
              <label className={labelCls}>سعر الصرف إلى ر.س</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setExchangeRate(isNaN(v) || v <= 0 ? 1 : v);
                }}
                className={inputCls}
              />
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي ملاحظات إضافية..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Items ── */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <h2 className="text-sm font-semibold text-[#1C1C1E] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#E5302A]" /> الأصناف الواردة
          </h2>
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E5302A] hover:bg-[#C42B24] text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة صنف
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                {['الصنف', 'الكمية', 'سعر الوحدة (ر.س)', 'المجموع', ''].map((h) => (
                  <th key={h} className="text-right px-4 py-2.5 text-xs font-semibold text-[#6C6C70]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#E5E5EA] last:border-0">
                  <td className="px-4 py-2.5 w-2/5">
                    <select
                      value={row.itemId}
                      onChange={(e) => handleItemSelect(row.id, e.target.value)}
                      className={inputCls}
                    >
                      <option value="">— اختر الصنف —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.name} ({it.code})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 w-24">
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-4 py-2.5 w-32">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-[#1C1C1E]">
                    {(row.quantity * row.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5">
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 rounded-lg text-[#AEAEB2] hover:text-[#E5302A] hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F2F2F7] border-t-2 border-[#E5E5EA]">
                <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-[#6C6C70]">مجموع قيم الأصناف</td>
                <td className="px-4 py-2.5 font-mono font-bold text-[#1C1C1E]">
                  {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Section 3: Landed Costs ── */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[#1C1C1E] mb-1 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-amber-600" /> المصاريف الإضافية (Landed Costs)
        </h2>
        <p className="text-xs text-[#6C6C70] mb-4">أدخل جميع التكاليف الإضافية — سيتم توزيعها على الأصناف تلقائياً</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {([
            { key: 'intlShipping',  label: 'شحن دولي' },
            { key: 'localShipping', label: 'شحن محلي' },
            { key: 'customsDuties', label: 'جمارك' },
            { key: 'clearanceFees', label: 'تخليص جمركي' },
            { key: 'otherExpenses', label: 'مصاريف أخرى' },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <label className={labelCls}>{label} (ر.س)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={landedCosts[key]}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setLandedCosts((prev) => ({ ...prev, [key]: isNaN(v) || v < 0 ? 0 : v }));
                }}
                className={inputCls}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-[#6C6C70] mb-2 font-medium">طريقة توزيع المصاريف:</p>
            <div className="flex gap-2 flex-wrap">
              {([
                { v: 'VALUE',    label: 'بالقيمة',  desc: 'نسبة لقيمة كل صنف' },
                { v: 'QUANTITY', label: 'بالكمية',  desc: 'نسبة لكمية كل صنف' },
                { v: 'EQUAL',    label: 'متساوٍ',   desc: 'موزع بالتساوي' },
              ] as const).map(({ v, label, desc }) => (
                <button
                  key={v}
                  onClick={() => setMethod(v)}
                  title={desc}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    method === v
                      ? 'bg-[#E5302A] text-white border-[#E5302A]'
                      : 'bg-white text-[#6C6C70] border-[#E5E5EA] hover:bg-[#F2F2F7]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs text-[#6C6C70]">إجمالي المصاريف</p>
            <p className="text-xl font-bold font-mono text-amber-700">
              {totalLandedCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 4: Allocation Preview ── */}
      {computedItems.length > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#E5302A]" />
            <h2 className="text-sm font-semibold text-[#1C1C1E]">معاينة التكلفة الفعلية والمتوسط المرجح</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead>
                <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                  {[
                    'الصنف', 'الكمية', 'سعر الوحدة',
                    'مصاريف موزعة', 'مصاريف/وحدة',
                    'تكلفة الوحدة الفعلية ✦',
                    'م.م. سابق', 'م.م. جديد ✦',
                  ].map((h) => (
                    <th
                      key={h}
                      className={`text-right px-4 py-2.5 text-xs font-semibold ${h.includes('✦') ? 'text-[#E5302A]' : 'text-[#6C6C70]'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {computedItems.map((ci) => (
                  <tr key={ci.id} className="border-b border-[#E5E5EA] last:border-0 hover:bg-[#F2F2F7]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1C1E]">{ci.itemName}</p>
                      <p className="text-xs text-[#AEAEB2]">{ci.itemCode}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#1C1C1E]">{ci.quantity}</td>
                    <td className="px-4 py-3 font-mono text-[#1C1C1E]">{ci.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-amber-600">{ci.allocatedLandedCost.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-amber-600">{ci.landedCostPerUnit.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#E5302A]">{ci.totalUnitCost.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-[#6C6C70]">{ci.previousMAC.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-green-700">{ci.newMAC.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Grand total footer */}
          <div className="px-5 py-4 border-t-2 border-[#E5E5EA] bg-[#F2F2F7]">
            <div className="flex flex-wrap justify-end gap-6 text-sm">
              <div className="text-center">
                <p className="text-xs text-[#6C6C70]">قيمة الأصناف</p>
                <p className="font-mono font-semibold text-[#1C1C1E]">{subtotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#6C6C70]">المصاريف الإضافية</p>
                <p className="font-mono font-semibold text-amber-700">+ {totalLandedCosts.toFixed(2)}</p>
              </div>
              {vatEnabled && vatAmount > 0 && (
                <div className="text-center">
                  <p className="text-xs text-[#6C6C70]">ضريبة القيمة المضافة ({vatRate}%)</p>
                  <p className="font-mono font-semibold text-indigo-600">+ {vatAmount.toFixed(2)}</p>
                </div>
              )}
              <div className="text-center border-r border-[#E5E5EA] pr-6">
                <p className="text-xs font-semibold text-[#6C6C70]">الإجمالي الكلي</p>
                <p className="font-mono font-bold text-lg text-[#E5302A]">{(grandTotal + vatAmount).toFixed(2)} ر.س</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-sm text-[#6C6C70] hover:bg-[#F2F2F7] transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl border border-[#E5302A] text-sm text-[#E5302A] font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? 'جاري المعالجة...' : '✓ تأكيد واستلام البضاعة'}
        </button>
      </div>
    </div>
  );
}


