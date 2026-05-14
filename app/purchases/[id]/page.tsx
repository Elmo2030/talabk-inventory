'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useStock } from '@/lib/StockContext';

const STATUS_MAP = {
  DRAFT:     { label: 'مسودة',  color: 'bg-slate-100 text-slate-600' },
  CONFIRMED: { label: 'مؤكدة',  color: 'bg-amber-100 text-amber-700' },
  RECEIVED:  { label: 'مستلمة', color: 'bg-green-100 text-green-700' },
};

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { purchaseInvoices } = useStock();
  const inv = purchaseInvoices.find((p) => p.id === id);

  if (!inv) return (
    <div className="text-center py-20 text-[#6C6C70]">
      <p className="text-lg font-medium">الفاتورة غير موجودة</p>
      <Link href="/purchases" className="text-[#E5302A] text-sm mt-2 inline-block hover:underline">
        العودة إلى الفواتير
      </Link>
    </div>
  );

  const status = STATUS_MAP[inv.status];
  const totalLandedCosts = inv.intlShipping + inv.localShipping + inv.customsDuties + inv.clearanceFees + inv.otherExpenses;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6C6C70]">
        <Link href="/purchases" className="hover:text-[#1C1C1E] transition-colors">فواتير المشتريات</Link>
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span className="font-mono text-[#1C1C1E] font-medium">{inv.invoiceNumber}</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#1C1C1E] font-mono">{inv.invoiceNumber}</h1>
            <p className="text-sm text-[#6C6C70] mt-0.5">{inv.supplierName} · {inv.invoiceDate}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'المورد', value: inv.supplierName },
            { label: 'تاريخ الفاتورة', value: inv.invoiceDate },
            { label: 'العملة', value: `${inv.currency} (${inv.exchangeRate})` },
            { label: 'طريقة توزيع المصاريف', value: inv.allocationMethod === 'VALUE' ? 'بالقيمة' : inv.allocationMethod === 'QUANTITY' ? 'بالكمية' : 'متساوي' },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs text-[#6C6C70]">{f.label}</p>
              <p className="font-medium text-[#1C1C1E] mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Landed Costs card */}
      {totalLandedCosts > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#1C1C1E] mb-3">المصاريف الإضافية (Landed Costs)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {[
              { label: 'شحن دولي', value: inv.intlShipping },
              { label: 'شحن محلي', value: inv.localShipping },
              { label: 'جمارك', value: inv.customsDuties },
              { label: 'تخليص', value: inv.clearanceFees },
              { label: 'مصاريف أخرى', value: inv.otherExpenses },
            ].filter((f) => f.value > 0).map((f) => (
              <div key={f.label} className="bg-[#F2F2F7] rounded-lg p-3">
                <p className="text-xs text-[#6C6C70]">{f.label}</p>
                <p className="font-mono font-semibold text-[#1C1C1E]">{f.value.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E5EA]">
          <h2 className="text-sm font-semibold text-[#1C1C1E]">الأصناف</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                {['الصنف', 'الكمية', 'سعر الوحدة', 'مصاريف موزعة', 'مصاريف/وحدة', 'تكلفة الوحدة الفعلية', 'م.م. سابق', 'م.م. جديد'].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#6C6C70]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item) => (
                <tr key={item.id} className="border-b border-[#E5E5EA] last:border-0 hover:bg-[#F2F2F7]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1C1C1E]">{item.itemName}</p>
                    <p className="text-xs text-[#AEAEB2]">{item.itemCode}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#1C1C1E]">{item.quantity}</td>
                  <td className="px-4 py-3 font-mono text-[#1C1C1E]">{item.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-amber-700">{item.allocatedLandedCost.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-amber-700">{item.landedCostPerUnit.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-[#E5302A]">{item.totalUnitCost.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-[#6C6C70]">{item.previousMAC.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-green-700">{item.newMAC.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Totals footer */}
        <div className="px-5 py-4 border-t border-[#E5E5EA] bg-[#F2F2F7]">
          <div className="flex flex-wrap justify-end gap-6 text-sm">
            <div className="text-center">
              <p className="text-xs text-[#6C6C70]">قيمة الأصناف</p>
              <p className="font-mono font-semibold text-[#1C1C1E]">{inv.subtotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#6C6C70]">المصاريف الإضافية</p>
              <p className="font-mono font-semibold text-amber-700">{inv.totalLandedCosts.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#6C6C70] font-semibold">الإجمالي الكلي</p>
              <p className="font-mono font-bold text-lg text-[#E5302A]">{inv.grandTotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {inv.notes && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#1C1C1E] mb-2">ملاحظات</h2>
          <p className="text-sm text-[#6C6C70]">{inv.notes}</p>
        </div>
      )}
    </div>
  );
}
