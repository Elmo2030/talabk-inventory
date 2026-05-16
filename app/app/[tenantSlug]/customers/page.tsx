'use client';

import { useMemo, useState } from 'react';
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  ShoppingBag,
  Calendar,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { SalesOrder } from '@/lib/types';

// ── Customer aggregate type ───────────────────────────────────────────────────
interface CustomerData {
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  totalProfit: number;
  lastOrderDate: string;
  lastCity: string;
  orders: SalesOrder[];
}

// ── Status badge ─────────────────────────────────────────────────────────────
const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'معلق',       color: 'bg-amber-100 text-amber-700' },
  PROCESSING: { label: 'قيد التجهيز', color: 'bg-blue-100 text-blue-700' },
  SHIPPED:    { label: 'تم الشحن',   color: 'bg-purple-100 text-purple-700' },
  DELIVERED:  { label: 'مُسلَّم',    color: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'ملغي',       color: 'bg-red-100 text-red-700' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const { salesOrders } = useStock();

  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState<'totalSpent' | 'orderCount' | 'lastOrderDate'>('totalSpent');
  const [sortDir, setSortDir]         = useState<'desc' | 'asc'>('desc');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // ── Aggregate customers from salesOrders ─────────────────────────────────
  const customers = useMemo<CustomerData[]>(() => {
    const map = new Map<string, CustomerData>();
    salesOrders.forEach(order => {
      const key = order.customerPhone || order.customerName;
      const existing = map.get(key);
      if (existing) {
        existing.orderCount++;
        existing.totalSpent  += order.customerTotal;
        existing.totalProfit += order.netProfit;
        if (order.createdAt > existing.lastOrderDate) {
          existing.lastOrderDate = order.createdAt;
          existing.lastCity      = order.customerCity;
        }
        existing.orders.push(order);
      } else {
        map.set(key, {
          name:          order.customerName,
          phone:         order.customerPhone,
          orderCount:    1,
          totalSpent:    order.customerTotal,
          totalProfit:   order.netProfit,
          lastOrderDate: order.createdAt,
          lastCity:      order.customerCity,
          orders:        [order],
        });
      }
    });
    return Array.from(map.values());
  }, [salesOrders]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const thisMonthCustomers = new Set<string>();
    salesOrders.forEach(o => {
      const d = new Date(o.createdAt);
      if (d.getMonth() === month && d.getFullYear() === year) {
        thisMonthCustomers.add(o.customerPhone || o.customerName);
      }
    });

    const aov    = customers.length > 0
      ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.reduce((s, c) => s + c.orderCount, 0)
      : 0;
    const topCustomer = [...customers].sort((a, b) => b.totalSpent - a.totalSpent)[0] ?? null;

    return {
      total:             customers.length,
      thisMonth:         thisMonthCustomers.size,
      avgOrderValue:     aov,
      topCustomerName:   topCustomer?.name ?? '—',
      topCustomerSpent:  topCustomer?.totalSpent ?? 0,
    };
  }, [customers, salesOrders]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    let list = [...customers];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        c => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'totalSpent')    diff = a.totalSpent - b.totalSpent;
      if (sortBy === 'orderCount')    diff = a.orderCount - b.orderCount;
      if (sortBy === 'lastOrderDate') diff = a.lastOrderDate.localeCompare(b.lastOrderDate);
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [customers, search, sortBy, sortDir]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  function SortIcon({ field }: { field: typeof sortBy }) {
    if (sortBy !== field) return <ChevronDown className="w-3.5 h-3.5 opacity-30" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3.5 h-3.5 text-[#E5302A]" />
      : <ChevronUp   className="w-3.5 h-3.5 text-[#E5302A]" />;
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (salesOrders.length === 0) {
    return (
      <div className="space-y-5 pb-8" dir="rtl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1C1E]">العملاء</h1>
          <p className="text-sm text-[#6C6C70] mt-1">قاعدة بيانات عملائك وتاريخ مشترياتهم</p>
        </div>
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F2F2F7] flex items-center justify-center">
            <Users className="w-8 h-8 text-[#C7C7CC]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#1C1C1E]">لا يوجد عملاء بعد</p>
            <p className="text-sm text-[#6C6C70] mt-1">سجّل أول طلب بيع لتظهر بيانات عملائك هنا</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1C1E]">العملاء</h1>
        <p className="text-sm text-[#6C6C70] mt-1">قاعدة بيانات عملائك وتاريخ مشترياتهم</p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total customers */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FEF2F1] mb-3">
            <Users className="w-5 h-5 text-[#E5302A]" />
          </div>
          <p className="text-xs text-[#6C6C70]">إجمالي العملاء</p>
          <p className="text-2xl font-bold mt-1 text-[#1C1C1E]">{kpis.total}</p>
          <p className="text-xs text-[#AEAEB2] mt-1">عميل مسجّل</p>
        </div>

        {/* This month */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-[#6C6C70]">عملاء هذا الشهر</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{kpis.thisMonth}</p>
          <p className="text-xs text-[#AEAEB2] mt-1">عميل جديد</p>
        </div>

        {/* AOV */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xs text-[#6C6C70]">متوسط قيمة الطلب</p>
          <p className="text-2xl font-bold mt-1 text-[#1C1C1E]">
            {kpis.avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-[#AEAEB2] mt-1">د.ل / طلب</p>
        </div>

        {/* Top customer */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 mb-3">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xs text-[#6C6C70]">أعلى عميل إنفاقاً</p>
          <p className="text-base font-bold mt-1 text-[#1C1C1E] truncate">{kpis.topCustomerName}</p>
          <p className="text-xs text-[#AEAEB2] mt-1">
            {kpis.topCustomerSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })} د.ل
          </p>
        </div>
      </div>

      {/* ── Search + Sort Controls ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-sm bg-white border border-[#E5E5EA] rounded-xl text-[#1C1C1E] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-[#E5302A]/20 focus:border-[#E5302A]"
            dir="rtl"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex gap-2 flex-wrap">
          {([
            { field: 'totalSpent' as const,    label: 'الإنفاق' },
            { field: 'orderCount' as const,    label: 'الطلبات' },
            { field: 'lastOrderDate' as const, label: 'آخر طلب' },
          ]).map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                sortBy === field
                  ? 'border-[#E5302A] bg-[#FEF2F1] text-[#E5302A]'
                  : 'border-[#E5E5EA] bg-white text-[#6C6C70] hover:bg-[#F2F2F7]'
              }`}
            >
              {label}
              <SortIcon field={field} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Customer List ────────────────────────────────────────────────────── */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-10 text-center text-[#6C6C70] text-sm">
          لا توجد نتائج للبحث
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => {
            const key        = customer.phone || customer.name;
            const isExpanded = expandedKey === key;
            const isVip      = customer.totalSpent > 1000;

            return (
              <div
                key={key}
                className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden"
              >
                {/* Customer row */}
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : key)}
                  className="w-full text-right"
                >
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#F9F9FB] transition-colors">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#FEF2F1] flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#E5302A]" />
                    </div>

                    {/* Name + phone */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1C1C1E] truncate">{customer.name}</p>
                        {isVip && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
                            VIP
                          </span>
                        )}
                        {!isVip && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-[#F2F2F7] text-[#6C6C70] rounded-full flex-shrink-0">
                            عادي
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-xs text-[#6C6C70]">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.lastCity && (
                          <span className="flex items-center gap-1 text-xs text-[#6C6C70]">
                            <MapPin className="w-3 h-3" />
                            {customer.lastCity}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#1C1C1E]">{customer.orderCount}</p>
                        <p className="text-xs text-[#AEAEB2]">طلب</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#E5302A]">
                          {customer.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-[#AEAEB2]">د.ل</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-[#1C1C1E]">{formatDate(customer.lastOrderDate)}</p>
                        <p className="text-xs text-[#AEAEB2]">آخر طلب</p>
                      </div>
                    </div>

                    {/* Mobile stats */}
                    <div className="sm:hidden text-left">
                      <p className="text-sm font-bold text-[#E5302A]">
                        {customer.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} د.ل
                      </p>
                      <p className="text-xs text-[#AEAEB2]">{customer.orderCount} طلب</p>
                    </div>

                    {/* Expand icon */}
                    <div className="flex-shrink-0">
                      {isExpanded
                        ? <ChevronUp   className="w-4 h-4 text-[#AEAEB2]" />
                        : <ChevronDown className="w-4 h-4 text-[#AEAEB2]" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded order history */}
                {isExpanded && (
                  <div className="border-t border-[#F2F2F7] px-5 pb-4">
                    <p className="text-xs font-semibold text-[#6C6C70] pt-3 pb-2">
                      سجل الطلبات ({customer.orders.length})
                    </p>
                    <div className="space-y-2">
                      {[...customer.orders]
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map(order => {
                          const st = ORDER_STATUS_MAP[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };
                          return (
                            <div
                              key={order.id}
                              className="flex items-center justify-between bg-[#F9F9FB] rounded-xl px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <ShoppingBag className="w-4 h-4 text-[#AEAEB2] flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-[#1C1C1E]">{order.orderNumber}</p>
                                  <p className="text-xs text-[#AEAEB2]">{formatDate(order.createdAt)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-left">
                                  <p className="text-sm font-bold text-[#1C1C1E]">
                                    {order.customerTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} د.ل
                                  </p>
                                  <p className="text-xs text-green-600">
                                    +{order.netProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ربح
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${st.color}`}>
                                  {st.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
