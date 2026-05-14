'use client';
import { useState } from 'react';
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
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { SalesOrder, OrderStatus } from '@/lib/types';

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
  return n.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrdersPage() {
  const router = useRouter();
  const { salesOrders, updateSalesOrder, deleteSalesOrder } = useStock();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = salesOrders.filter((o) => {
    const matchSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.includes(search);
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
    await updateSalesOrder(order.id, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    setDeletingId(id);
    await deleteSalesOrder(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1E]">الطلبات والمبيعات</h1>
          <p className="text-xs sm:text-sm text-[#6C6C70] mt-0.5">إدارة طلبات العملاء وتتبع المبيعات</p>
        </div>
        <Link
          href="/orders/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
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
          <div key={label} className="bg-white border border-[#E5E5EA] rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#6C6C70] truncate">{label}</p>
              <p className="text-sm font-bold text-[#1C1C1E] truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C70]" />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#E5E5EA] text-sm text-[#1C1C1E] bg-white focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
            dir="rtl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
                : 'bg-white text-[#6C6C70] border-[#E5E5EA] hover:border-[#1C1C1E]'
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
                  : 'bg-white text-[#6C6C70] border-[#E5E5EA] hover:border-[#1C1C1E]'
              }`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="w-10 h-10 text-[#E5E5EA] mx-auto mb-3" />
            <p className="text-sm text-[#6C6C70]">لا توجد طلبات</p>
            <Link href="/orders/new" className="mt-3 inline-block text-xs text-[#E5302A] hover:underline">
              + إنشاء طلب جديد
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                  {['رقم الطلب', 'العميل', 'المدينة', 'المنتجات', 'إجمالي العميل', 'صافي الربح', 'الحالة', 'إجراءات'].map(
                    (h) => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-medium text-[#6C6C70]">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7]">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#E5302A] font-semibold whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1C1C1E]">{order.customerName}</div>
                      <div className="text-xs text-[#6C6C70]">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-[#6C6C70] text-xs whitespace-nowrap">{order.customerCity}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F2F2F7] rounded-full text-xs font-medium text-[#1C1C1E]">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} قطعة
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1C1C1E] whitespace-nowrap">
                      {fmt(order.customerTotal)} د.ل
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={order.netProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {fmt(order.netProfit)} د.ل
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                        className="text-xs border border-[#E5E5EA] rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#E5302A] cursor-pointer"
                        dir="rtl"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="p-1.5 text-[#6C6C70] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(order.status === 'PENDING' || order.status === 'CANCELLED') && (
                          <button
                            onClick={() => handleDelete(order.id)}
                            disabled={deletingId === order.id}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
