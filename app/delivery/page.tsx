'use client';

import { useMemo, useState } from 'react';
import { Truck, Phone, MapPin, CheckCircle, Clock, Package } from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { SalesOrder } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';

const DELIVERY_TYPE_LABEL = { home: 'بيت', office: 'مكتب', female: 'نسائي' };

export default function DeliveryPage() {
  const { salesOrders, updateSalesOrder } = useStock();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PROCESSING' | 'SHIPPED' | 'ALL'>('ALL');

  const orders = useMemo(() => {
    return salesOrders
      .filter((o) =>
        o.status === 'PROCESSING' || o.status === 'SHIPPED'
      )
      .filter((o) => {
        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.customerCity.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [salesOrders, search, statusFilter]);

  const stats = useMemo(() => ({
    processing: salesOrders.filter((o) => o.status === 'PROCESSING').length,
    shipped: salesOrders.filter((o) => o.status === 'SHIPPED').length,
    delivered: salesOrders.filter((o) => o.status === 'DELIVERED').length,
  }), [salesOrders]);

  const handleMarkShipped = async (order: SalesOrder) => {
    const ok = await confirm({
      title: 'تأكيد الشحن',
      description: `هل تم شحن طلب ${order.orderNumber} للعميل ${order.customerName}؟`,
      confirmLabel: 'نعم، تم الشحن',
      cancelLabel: 'إلغاء',
      variant: 'info',
    });
    if (!ok) return;
    await updateSalesOrder(order.id, {
      status: 'SHIPPED',
      shippedAt: new Date().toISOString(),
    });
    toast.success(`تم تحديث حالة ${order.orderNumber} إلى "في الطريق"`);
  };

  const handleMarkDelivered = async (order: SalesOrder) => {
    const ok = await confirm({
      title: 'تأكيد التسليم',
      description: `هل تم تسليم طلب ${order.orderNumber} للعميل ${order.customerName} بنجاح؟`,
      confirmLabel: 'نعم، تم التسليم',
      cancelLabel: 'إلغاء',
      variant: 'info',
    });
    if (!ok) return;
    await updateSalesOrder(order.id, { status: 'DELIVERED' });
    toast.success(`تم تسليم ${order.orderNumber} ✓`);
  };

  const openWhatsApp = (phone: string, order: SalesOrder) => {
    const msg = encodeURIComponent(
      `مرحباً ${order.customerName}، طلبك رقم ${order.orderNumber} في الطريق إليك. سيصلك قريباً. 📦`
    );
    const clean = phone.replace(/\D/g, '');
    const intl = clean.startsWith('0') ? '218' + clean.slice(1) : clean;
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-brand-600" />
          لوحة التوصيل
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          إدارة الطلبات قيد التوصيل وتأكيد الاستلام
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'قيد التجهيز', value: stats.processing, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'في الطريق', value: stats.shipped, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'تم التسليم اليوم', value: stats.delivered, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="بحث باسم العميل أو الهاتف أو المدينة..."
          className="flex-1"
        />
        <div className="flex gap-2">
          {(['ALL', 'PROCESSING', 'SHIPPED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'ALL' ? 'الكل' : s === 'PROCESSING' ? 'قيد التجهيز' : 'في الطريق'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list — mobile-first cards */}
      {orders.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="لا توجد طلبات نشطة"
          description="ستظهر هنا طلبات التوصيل قيد التجهيز والشحن"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                  <div className="flex items-center gap-2 mt-1">
                    {order.status === 'PROCESSING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
                        <Clock className="w-3 h-3" />
                        قيد التجهيز
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                        <Truck className="w-3 h-3" />
                        في الطريق
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {DELIVERY_TYPE_LABEL[order.deliveryType]}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-brand-700">{order.customerTotal.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">د.ل</p>
                </div>
              </div>

              {/* Customer info */}
              <div className="flex flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {order.customerName.charAt(0)}
                  </span>
                  {order.customerName}
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {order.customerCity}
                </div>
              </div>

              {/* Items summary */}
              <div className="bg-slate-50 rounded-xl p-3 mb-3">
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  محتوى الطلب ({order.items.length} صنف)
                </p>
                <div className="space-y-1">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">{item.itemName}</span>
                      <span className="text-slate-500">×{item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-xs text-slate-400">+{order.items.length - 3} أصناف أخرى</p>
                  )}
                </div>
              </div>

              {/* Tracking */}
              {order.trackingNumber && (
                <div className="text-xs text-slate-600 mb-3">
                  رقم التتبع: <span className="font-mono font-semibold text-brand-700">{order.trackingNumber}</span>
                  {order.shippingCarrier && ` · ${order.shippingCarrier}`}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={`tel:${order.customerPhone}`}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  اتصال
                </a>
                <button
                  onClick={() => openWhatsApp(order.customerPhone, order)}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  واتساب
                </button>
                {order.status === 'PROCESSING' && (
                  <button
                    onClick={() => handleMarkShipped(order)}
                    className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-xl transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    تم الشحن
                  </button>
                )}
                {order.status === 'SHIPPED' && (
                  <button
                    onClick={() => handleMarkDelivered(order)}
                    className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    تم التسليم
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
