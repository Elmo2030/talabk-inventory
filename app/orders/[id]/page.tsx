'use client';
import { use } from 'react';
import Link from 'next/link';
import { ArrowRight, User, MapPin, Package, TrendingUp, Printer } from 'lucide-react';
import { useOrders } from '@/lib/StockContext';
import { OrderStatus, SalesOrder } from '@/lib/types';
import { formatMoney } from '@/lib/format';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING:    { label: 'قيد الانتظار', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  PROCESSING: { label: 'قيد التجهيز', bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200' },
  SHIPPED:    { label: 'تم الشحن',    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  DELIVERED:  { label: 'تم التسليم', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  CANCELLED:  { label: 'ملغي',        bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
};

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  home: 'توصيل للبيت',
  office: 'توصيل للمكتب',
  female: 'توصيل نسائي',
};

function fmt(n: number) {
  return formatMoney(n, { withSuffix: false });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { salesOrders, updateSalesOrder } = useOrders();
  const order: SalesOrder | undefined = salesOrders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="text-center py-20" dir="rtl">
        <p className="text-[#6C6C70]">الطلب غير موجود</p>
        <Link href="/orders" className="mt-2 inline-block text-sm text-[#E5302A] hover:underline">
          العودة للطلبات
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    await updateSalesOrder(order.id, { status: newStatus });
  };

  const createdDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6C6C70]">
        <Link href="/orders" className="hover:text-[#1C1C1E]">الطلبات</Link>
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span className="text-[#1C1C1E] font-medium">{order.orderNumber}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#1C1C1E] font-mono">{order.orderNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-[#6C6C70] mt-1">{order.customerName} · {createdDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E5EA] text-[#6C6C70] text-sm font-medium hover:bg-[#F2F2F7] transition-colors print:hidden"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
            <label className="text-xs text-[#6C6C70]">تغيير الحالة:</label>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
              className="px-3 py-2 text-sm border border-[#E5E5EA] rounded-xl bg-white focus:outline-none focus:border-[#E5302A] cursor-pointer"
              dir="rtl"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer info */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#E5302A]" />
              بيانات العميل
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'الاسم', value: order.customerName },
                { label: 'الهاتف', value: order.customerPhone || '—' },
                { label: 'المدينة', value: order.customerCity },
                { label: 'نوع التوصيل', value: DELIVERY_TYPE_LABELS[order.deliveryType] ?? order.deliveryType },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-[#6C6C70] mb-0.5">{label}</p>
                  <p className="font-medium text-[#1C1C1E]">{value}</p>
                </div>
              ))}
              {order.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-[#6C6C70] mb-0.5">ملاحظات</p>
                  <p className="font-medium text-[#1C1C1E]">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#E5302A]" />
              <h2 className="text-sm font-semibold text-[#1C1C1E]">المنتجات</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F2F2F7]">
                    {['المنتج', 'الكمية', 'سعر البيع', 'التكلفة', 'الإجمالي', 'ربح السطر'].map(
                      (h) => (
                        <th key={h} className="text-right px-4 py-2.5 text-xs font-medium text-[#6C6C70]">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2F7]">
                  {order.items.map((item) => {
                    const lineProfit = item.lineTotal - item.lineCost;
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#1C1C1E]">{item.itemName}</p>
                          <p className="text-xs text-[#6C6C70]">{item.itemCode}</p>
                        </td>
                        <td className="px-4 py-3 text-[#1C1C1E]">{item.quantity}</td>
                        <td className="px-4 py-3 text-[#1C1C1E]">{fmt(item.sellingPrice)}</td>
                        <td className="px-4 py-3 text-[#6C6C70]">{fmt(item.costSnapshot)}</td>
                        <td className="px-4 py-3 font-semibold text-[#1C1C1E]">{fmt(item.lineTotal)}</td>
                        <td className="px-4 py-3">
                          <span className={lineProfit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {fmt(lineProfit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#F2F2F7]">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-medium text-[#6C6C70]">
                      إجمالي المنتجات
                    </td>
                    <td className="px-4 py-2.5 font-bold text-[#1C1C1E]">{fmt(order.subtotalProducts)}</td>
                    <td className="px-4 py-2.5 font-bold text-green-600">
                      {fmt(order.subtotalProducts - order.totalCOGS)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Shipping card */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E5302A]" />
              تفاصيل الشحن
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                { label: 'تكلفة التوصيل', value: `${fmt(order.shippingCost)} د.ل` },
                { label: 'تكلفة التغليف', value: order.needsPackaging ? `${fmt(order.packagingCost)} د.ل` : '—' },
                { label: 'التوصيل على', value: order.shippingOnStore ? 'المتجر' : 'العميل' },
                { label: 'التغليف على', value: order.packagingOnStore ? 'المتجر' : 'العميل' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-[#F2F2F7] rounded-xl">
                  <p className="text-xs text-[#6C6C70] mb-1">{label}</p>
                  <p className="font-semibold text-[#1C1C1E]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Financial summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E5302A]" />
              <h2 className="text-sm font-semibold text-[#1C1C1E]">الملخص المالي</h2>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'إجمالي المنتجات', value: fmt(order.subtotalProducts) },
                { label: 'تكلفة التوصيل', value: fmt(order.shippingCost) },
                { label: 'تكلفة التغليف', value: fmt(order.packagingCost) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[#6C6C70]">{label}</span>
                  <span className="font-medium text-[#1C1C1E]">{value} د.ل</span>
                </div>
              ))}

              <div className="pt-3 border-t border-[#E5E5EA]">
                <p className="text-xs text-[#6C6C70] mb-1">الإجمالي المطلوب من العميل</p>
                <p className="text-3xl font-bold text-[#E5302A]">{fmt(order.customerTotal)}</p>
                <p className="text-xs text-[#6C6C70]">دينار ليبي</p>
              </div>

              <div className="pt-3 border-t border-[#E5E5EA] space-y-2">
                <p className="text-xs font-semibold text-[#6C6C70] uppercase tracking-wide">تحليل الربحية</p>
                {[
                  { label: 'تكلفة البضاعة', value: fmt(order.totalCOGS), color: 'text-[#1C1C1E]' },
                  { label: 'هامش الربح الإجمالي', value: fmt(order.grossProfit), color: order.grossProfit >= 0 ? 'text-green-600' : 'text-red-600' },
                  ...(order.storeShippingExpense > 0
                    ? [{ label: 'مصاريف التوصيل', value: `-${fmt(order.storeShippingExpense)}`, color: 'text-red-500' }]
                    : []),
                  ...(order.storePackagingExpense > 0
                    ? [{ label: 'مصاريف التغليف', value: `-${fmt(order.storePackagingExpense)}`, color: 'text-red-500' }]
                    : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-[#6C6C70]">{label}</span>
                    <span className={`font-medium ${color}`}>{value} د.ل</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-[#E5E5EA]">
                  <span className="text-sm font-semibold text-[#1C1C1E]">صافي الربح</span>
                  <span className={`text-lg font-bold ${order.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(order.netProfit)} د.ل
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6C6C70]">نسبة الهامش</span>
                  <span className={`font-semibold ${order.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {order.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
