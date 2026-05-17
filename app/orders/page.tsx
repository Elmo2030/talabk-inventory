'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  ShoppingBag,
  TrendingUp,
  Package,
  CheckCircle,
  Clock,
  Truck,
  Copy,
  Check,
  Banknote,
  Printer,
  X,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { SalesOrder, OrderStatus } from '@/lib/types';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { AnimatedList, AnimatedRow } from '@/components/ui/AnimatedList';
import OrderReceipt from '@/components/ui/OrderReceipt';

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING:    { label: 'قيد الانتظار', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  PROCESSING: { label: 'قيد التجهيز', bg: 'bg-slate-50 dark:bg-[#0F0F11]',  text: 'text-slate-700 dark:text-[#E4E4E7]',  border: 'border-slate-200 dark:border-[#27272A]' },
  SHIPPED:    { label: 'تم الشحن',    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  DELIVERED:  { label: 'تم التسليم', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  CANCELLED:  { label: 'ملغي',        bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
};

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const CARRIERS = [
  { value: 'أرامكس', label: 'أرامكس' },
  { value: 'DHL', label: 'DHL' },
  { value: 'FedEx', label: 'FedEx' },
  { value: 'الأمانة', label: 'الأمانة' },
  { value: 'سهل', label: 'سهل' },
  { value: 'خاص', label: 'خاص' },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Tracking Number inline section ───────────────────────────────────────────
function TrackingSection({ order, onSave }: { order: SalesOrder; onSave: (id: string, data: Partial<SalesOrder>) => Promise<void> }) {
  const today = new Date().toISOString().split('T')[0];
  const [showForm, setShowForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState(CARRIERS[0].value);
  const [shippedAt, setShippedAt] = useState(today);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    if (!trackingNumber.trim()) return;
    setSaving(true);
    await onSave(order.id, {
      trackingNumber: trackingNumber.trim(),
      shippingCarrier,
      shippedAt,
    });
    setSaving(false);
    setShowForm(false);
  }

  function handleCopy() {
    if (!order.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (order.trackingNumber) {
    return (
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Truck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
        <span className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">{order.shippingCarrier}</span>
        <span className="font-mono text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
          {order.trackingNumber}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 text-[#6C6C70] dark:text-[#A1A1AA] hover:text-blue-600 rounded transition-colors"
          title="نسخ رقم التتبع"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Truck className="w-3 h-3" />
          أضف رقم التتبع
        </button>
      ) : (
        <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="رقم التتبع"
              className="flex-1 min-w-0 px-2 py-1 text-xs border border-[#E5E5EA] dark:border-[#27272A] rounded-lg focus:outline-none focus:border-blue-400 bg-white dark:bg-[#18181B]"
              dir="rtl"
            />
            <select
              value={shippingCarrier}
              onChange={(e) => setShippingCarrier(e.target.value)}
              className="px-2 py-1 text-xs border border-[#E5E5EA] dark:border-[#27272A] rounded-lg focus:outline-none focus:border-blue-400 bg-white dark:bg-[#18181B]"
              dir="rtl"
            >
              {CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={shippedAt}
              onChange={(e) => setShippedAt(e.target.value)}
              className="px-2 py-1 text-xs border border-[#E5E5EA] dark:border-[#27272A] rounded-lg focus:outline-none focus:border-blue-400 bg-white dark:bg-[#18181B]"
            />
            <button
              onClick={handleSave}
              disabled={saving || !trackingNumber.trim()}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? '...' : 'حفظ'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-2 py-1 text-xs text-[#6C6C70] dark:text-[#A1A1AA] hover:text-[#1C1C1E] rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { salesOrders, updateSalesOrder, deleteSalesOrder } = useStock();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  // Receipt modal state
  const [receiptOrder, setReceiptOrder] = useState<SalesOrder | null>(null);
  // Customer payment modal state
  const [paymentOrder, setPaymentOrder] = useState<SalesOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'check'>('cash');
  const [payNotes, setPayNotes] = useState('');

  const filtered = salesOrders.filter((o) => {
    const matchSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.includes(search);
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const total = salesOrders.length;
  const pending = salesOrders.filter((o) => o.status === 'PENDING').length;
  const delivered = salesOrders.filter((o) => o.status === 'DELIVERED').length;
  const totalRevenue = salesOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + o.customerTotal, 0);
  const totalNetProfit = salesOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + o.netProfit, 0);

  const handleStatusChange = async (order: SalesOrder, newStatus: OrderStatus) => {
    if (newStatus === 'DELIVERED') {
      const confirmed = await confirm({
        title: 'تأكيد التسليم',
        description: 'هل تأكد من أن الطلب وصل للعميل؟ لا يمكن التراجع عن هذه الحالة.',
        variant: 'warning',
        confirmLabel: 'نعم، تم التسليم',
        cancelLabel: 'إلغاء',
      });
      if (!confirmed) return;
    } else if (newStatus === 'CANCELLED') {
      const confirmed = await confirm({
        title: 'إلغاء الطلب',
        description: 'هل أنت متأكد من إلغاء هذا الطلب؟',
        variant: 'danger',
        confirmLabel: 'نعم، إلغاء الطلب',
        cancelLabel: 'تراجع',
      });
      if (!confirmed) return;
    }
    await updateSalesOrder(order.id, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'حذف الطلب',
      description: 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'نعم، احذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(id);
    await deleteSalesOrder(id);
    setDeletingId(null);
  };

  async function handleSaveTracking(id: string, data: Partial<SalesOrder>) {
    await updateSalesOrder(id, data);
  }

  async function handleAddCustomerPayment() {
    if (!paymentOrder) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    const payment = {
      id: `cpay-${Date.now()}`,
      amount,
      date: new Date().toISOString().split('T')[0],
      method: payMethod,
      notes: payNotes.trim() || undefined,
    };

    const prevPaid = paymentOrder.customerPaidAmount ?? 0;
    const newPaid = prevPaid + amount;
    const newStatus: SalesOrder['customerPaymentStatus'] =
      newPaid >= paymentOrder.customerTotal
        ? 'paid'
        : newPaid > 0
        ? 'partial'
        : 'unpaid';

    await updateSalesOrder(paymentOrder.id, {
      customerPayments: [...(paymentOrder.customerPayments ?? []), payment],
      customerPaidAmount: newPaid,
      customerPaymentStatus: newStatus,
    });

    setPaymentOrder(null);
    setPayAmount('');
    setPayMethod('cash');
    setPayNotes('');
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">الطلبات والمبيعات</h1>
          <p className="text-xs sm:text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5">إدارة طلبات العملاء وتتبع المبيعات</p>
        </div>
        <Link
          href="/orders/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
          aria-label="إنشاء طلب جديد"
        >
          <Plus className="w-4 h-4" />
          <span>طلب جديد</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي الطلبات',  value: total.toString(),      icon: ShoppingBag, color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'قيد الانتظار',    value: pending.toString(),     icon: Clock,       color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'تم التسليم',      value: delivered.toString(),   icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'إجمالي الإيرادات', value: `${fmt(totalRevenue)} د.ل`, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'صافي الربح',      value: `${fmt(totalNetProfit)} د.ل`, icon: TrendingUp, color: totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600', bg: totalNetProfit >= 0 ? 'bg-green-50' : 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] truncate">{label}</p>
              <p className="text-sm font-bold text-[#1C1C1E] dark:text-[#F4F4F5] truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C70] dark:text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="بحث في الطلبات"
            className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] text-sm text-[#1C1C1E] dark:text-[#F4F4F5] bg-white dark:bg-[#18181B] focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
            dir="rtl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
                : 'bg-white dark:bg-[#18181B] text-[#6C6C70] dark:text-[#A1A1AA] border-[#E5E5EA] dark:border-[#27272A] hover:border-[#1C1C1E]'
            }`}
          >
            الكل
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
                statusFilter === s
                  ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
                  : 'bg-white dark:bg-[#18181B] text-[#6C6C70] dark:text-[#A1A1AA] border-[#E5E5EA] dark:border-[#27272A] hover:border-[#1C1C1E]'
              }`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden card-hover"
        role="region"
        aria-label="قائمة الطلبات"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="لا توجد طلبات"
            description="ابدأ بإنشاء أول طلب مبيعات من شاشة نقطة البيع"
            action={
              <Link
                href="/orders/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + إنشاء طلب جديد
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA] dark:border-[#27272A]">
                    {['رقم الطلب', 'العميل', 'المدينة', 'المنتجات', 'إجمالي العميل', 'صافي الربح', 'الحالة', 'الدفع', 'إجراءات'].map(
                      (h) => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-medium text-[#6C6C70] dark:text-[#A1A1AA]">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2F7]">
                  <AnimatedList>
                  {paginated.map((order) => (
                    <AnimatedRow
                      key={order.id}
                      rowKey={order.id}
                      as="tr"
                      className="hover:bg-[#F2F2F7]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#E5302A] font-semibold whitespace-nowrap">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1C1C1E] dark:text-[#F4F4F5]">{order.customerName}</div>
                        <div className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">{order.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-[#6C6C70] dark:text-[#A1A1AA] text-xs whitespace-nowrap">{order.customerCity}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F2F2F7] rounded-full text-xs font-medium text-[#1C1C1E] dark:text-[#F4F4F5]">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} قطعة
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] whitespace-nowrap">
                        {fmt(order.customerTotal)} د.ل
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={order.netProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {fmt(order.netProfit)} د.ل
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                            className="text-xs border border-[#E5E5EA] dark:border-[#27272A] rounded-lg px-2 py-1 bg-white dark:bg-[#18181B] focus:outline-none focus:border-[#E5302A] cursor-pointer"
                            dir="rtl"
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          {/* Tracking section — only for SHIPPED orders */}
                          {order.status === 'SHIPPED' && (
                            <TrackingSection order={order} onSave={handleSaveTracking} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {order.customerPaymentStatus && (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                              order.customerPaymentStatus === 'paid'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : order.customerPaymentStatus === 'partial'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {order.customerPaymentStatus === 'paid'
                              ? 'مدفوع'
                              : order.customerPaymentStatus === 'partial'
                              ? `جزئي (${fmt(order.customerPaidAmount ?? 0)})`
                              : 'غير مدفوع'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="p-1.5 text-[#6C6C70] dark:text-[#A1A1AA] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] rounded-lg transition-colors"
                            title="عرض التفاصيل"
                            aria-label="عرض تفاصيل الطلب"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setReceiptOrder(order)}
                            className="p-1.5 text-[#6C6C70] dark:text-[#A1A1AA] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="طباعة الفاتورة"
                            aria-label="طباعة فاتورة الطلب"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {order.customerPaymentStatus !== 'paid' && (
                            <button
                              onClick={() => { setPaymentOrder(order); setPayAmount(''); setPayNotes(''); setPayMethod('cash'); }}
                              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="تسجيل دفعة عميل"
                              aria-label="تسجيل دفعة من العميل"
                            >
                              <Banknote className="w-4 h-4" />
                            </button>
                          )}
                          {(order.status === 'PENDING' || order.status === 'CANCELLED') && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              disabled={deletingId === order.id}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="حذف"
                              aria-label="حذف الطلب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </AnimatedRow>
                  ))}
                  </AnimatedList>
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </div>

      {/* Receipt Modal */}
      <Modal
        isOpen={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
        title={`فاتورة الطلب — ${receiptOrder?.orderNumber ?? ''}`}
        size="sm"
      >
        {receiptOrder && (
          <div dir="rtl" className="space-y-4">
            {/* Print action row */}
            <div className="flex justify-end">
              <OrderReceipt order={receiptOrder} />
            </div>
            {/* Receipt preview summary */}
            <div className="border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-4 space-y-2 text-sm text-[#1C1C1E] dark:text-[#F4F4F5]">
              <div className="flex justify-between">
                <span className="text-[#6C6C70] dark:text-[#A1A1AA]">العميل</span>
                <span className="font-medium">{receiptOrder.customerName}</span>
              </div>
              {receiptOrder.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-[#6C6C70] dark:text-[#A1A1AA]">الهاتف</span>
                  <span>{receiptOrder.customerPhone}</span>
                </div>
              )}
              {receiptOrder.customerCity && (
                <div className="flex justify-between">
                  <span className="text-[#6C6C70] dark:text-[#A1A1AA]">المدينة</span>
                  <span>{receiptOrder.customerCity}</span>
                </div>
              )}
              <div className="border-t border-[#E5E5EA] dark:border-[#27272A] pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6C6C70] dark:text-[#A1A1AA]">المجموع الفرعي</span>
                  <span>{receiptOrder.subtotalProducts.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل</span>
                </div>
                {receiptOrder.shippingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#6C6C70] dark:text-[#A1A1AA]">الشحن</span>
                    <span>{receiptOrder.shippingCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل</span>
                  </div>
                )}
                {receiptOrder.discountAmount && receiptOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>الخصم{receiptOrder.couponCode ? ` (${receiptOrder.couponCode})` : ''}</span>
                    <span>-{receiptOrder.discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل</span>
                  </div>
                )}
                {receiptOrder.vatAmount && receiptOrder.vatAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#6C6C70] dark:text-[#A1A1AA]">ضريبة VAT{receiptOrder.vatRate ? ` (${receiptOrder.vatRate}%)` : ''}</span>
                    <span>{receiptOrder.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-[#E5E5EA] dark:border-[#27272A] pt-2 text-base">
                  <span>الإجمالي</span>
                  <span>{receiptOrder.customerTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] text-center">اضغط على زر "طباعة" أعلاه لطباعة الفاتورة أو حفظها كـ PDF</p>
          </div>
        )}
      </Modal>

      {/* Customer Payment Modal */}
      {paymentOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setPaymentOrder(null)}
        >
          <div
            className="bg-white dark:bg-[#18181B] rounded-2xl w-full max-w-sm shadow-2xl p-5"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">تسجيل دفعة — {paymentOrder.orderNumber}</h3>
              <button
                onClick={() => setPaymentOrder(null)}
                className="p-1 text-[#6C6C70] dark:text-[#A1A1AA] hover:text-[#1C1C1E] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mb-4 space-y-0.5">
              <div>إجمالي الطلب: <span className="font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{fmt(paymentOrder.customerTotal)} د.ل</span></div>
              <div>المدفوع: <span className="font-semibold text-green-600">{fmt(paymentOrder.customerPaidAmount ?? 0)} د.ل</span></div>
              <div>المتبقي: <span className="font-semibold text-red-600">{fmt(paymentOrder.customerTotal - (paymentOrder.customerPaidAmount ?? 0))} د.ل</span></div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#6C6C70] dark:text-[#A1A1AA] mb-1">المبلغ (د.ل) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  max={paymentOrder.customerTotal - (paymentOrder.customerPaidAmount ?? 0)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] text-sm focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-[#6C6C70] dark:text-[#A1A1AA] mb-1">طريقة الدفع</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] text-sm focus:outline-none focus:border-[#E5302A]"
                >
                  <option value="cash">نقداً</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="check">شيك</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#6C6C70] dark:text-[#A1A1AA] mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] text-sm focus:outline-none focus:border-[#E5302A]"
                  placeholder="اختياري..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPaymentOrder(null)}
                className="flex-1 px-4 py-2 border border-[#E5E5EA] dark:border-[#27272A] text-sm text-[#6C6C70] dark:text-[#A1A1AA] rounded-xl hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddCustomerPayment}
                disabled={!payAmount || parseFloat(payAmount) <= 0}
                className="flex-1 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                تسجيل الدفعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
