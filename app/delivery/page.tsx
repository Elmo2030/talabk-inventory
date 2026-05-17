'use client';

/**
 * Delivery board — Kanban layout
 * Two columns (PROCESSING ↔ SHIPPED) with action buttons that progress
 * an order through the pipeline. Cards keep tel: + WhatsApp shortcuts.
 */

import { useMemo, useState } from 'react';
import {
  Truck, Phone, MapPin, CheckCircle, Clock, Package, Search, X,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { SalesOrder } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const DELIVERY_TYPE_LABEL: Record<string, string> = {
  home: 'بيت', office: 'مكتب', female: 'نسائي',
};

export default function DeliveryPage() {
  const { salesOrders, updateSalesOrder } = useStock();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');

  const matches = (o: SalesOrder, q: string) =>
    !q ||
    o.orderNumber.toLowerCase().includes(q) ||
    o.customerName.toLowerCase().includes(q) ||
    o.customerPhone.includes(q) ||
    o.customerCity.toLowerCase().includes(q);

  const { processing, shipped, deliveredToday } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sorted = [...salesOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      processing: sorted.filter(o => o.status === 'PROCESSING' && matches(o, q)),
      shipped:    sorted.filter(o => o.status === 'SHIPPED'    && matches(o, q)),
      deliveredToday: sorted.filter(
        o => o.status === 'DELIVERED'
          && new Date(o.createdAt).getTime() >= today.getTime(),
      ).length,
    };
  }, [salesOrders, search]);

  const handleMarkShipped = async (order: SalesOrder) => {
    const ok = await confirm({
      title:        'تأكيد الشحن',
      description:  `هل تم شحن طلب ${order.orderNumber} للعميل ${order.customerName}؟`,
      confirmLabel: 'نعم، تم الشحن',
      cancelLabel:  'إلغاء',
      variant:      'info',
    });
    if (!ok) return;
    await updateSalesOrder(order.id, {
      status:    'SHIPPED',
      shippedAt: new Date().toISOString(),
    });
    toast.success(`تم تحديث ${order.orderNumber} إلى "في الطريق"`);
  };

  const handleMarkDelivered = async (order: SalesOrder) => {
    const ok = await confirm({
      title:        'تأكيد التسليم',
      description:  `هل تم تسليم طلب ${order.orderNumber} للعميل ${order.customerName}؟`,
      confirmLabel: 'نعم، تم التسليم',
      cancelLabel:  'إلغاء',
      variant:      'info',
    });
    if (!ok) return;
    await updateSalesOrder(order.id, { status: 'DELIVERED' });
    toast.success(`تم تسليم ${order.orderNumber} ✓`);
  };

  const openWhatsApp = (phone: string, order: SalesOrder) => {
    const msg   = encodeURIComponent(
      `مرحباً ${order.customerName}، طلبك رقم ${order.orderNumber} في الطريق إليك. سيصلك قريباً. 📦`,
    );
    const clean = phone.replace(/\D/g, '');
    const intl  = clean.startsWith('0') ? '218' + clean.slice(1) : clean;
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  return (
    <div dir="rtl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Truck className="w-6 h-6 text-brand-600" /> لوحة التوصيل
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            اسحب الطلبات عبر مراحل التجهيز والشحن والتسليم
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-[#71717A] flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {deliveredToday} تسليم اليوم</span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#52525B]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث باسم العميل أو الهاتف أو المدينة..."
          className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-[#27272A]"
            aria-label="مسح البحث"
          >
            <X className="w-3.5 h-3.5 text-slate-500 dark:text-[#71717A]" />
          </button>
        )}
      </div>

      {/* Kanban — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Column
          title="قيد التجهيز"
          subtitle="جهّز ثم اضغط 'تم الشحن'"
          icon={Clock}
          iconColor="text-amber-600"
          bgColor="bg-amber-50/40 border-amber-200"
          count={processing.length}
          countColor="bg-amber-100 text-amber-700"
        >
          {processing.length === 0 ? (
            <EmptyColumn message="لا توجد طلبات بانتظار التجهيز" />
          ) : (
            processing.map(o => (
              <OrderCard key={o.id} order={o}
                onWhatsApp={() => openWhatsApp(o.customerPhone, o)}
                primaryAction={{
                  label: 'تم الشحن',
                  icon:  Truck,
                  className: 'bg-blue-600 hover:bg-blue-700 text-white',
                  onClick: () => handleMarkShipped(o),
                }}
              />
            ))
          )}
        </Column>

        <Column
          title="في الطريق"
          subtitle="مع المندوب — اضغط 'تم التسليم' عند الوصول"
          icon={Truck}
          iconColor="text-blue-600"
          bgColor="bg-blue-50/40 border-blue-200"
          count={shipped.length}
          countColor="bg-blue-100 text-blue-700"
        >
          {shipped.length === 0 ? (
            <EmptyColumn message="لا توجد طلبات في الطريق" />
          ) : (
            shipped.map(o => (
              <OrderCard key={o.id} order={o}
                onWhatsApp={() => openWhatsApp(o.customerPhone, o)}
                primaryAction={{
                  label: 'تم التسليم',
                  icon:  CheckCircle,
                  className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                  onClick: () => handleMarkDelivered(o),
                }}
              />
            ))
          )}
        </Column>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function Column({
  title, subtitle, icon: Icon, iconColor, bgColor, count, countColor, children,
}: {
  title:       string;
  subtitle:    string;
  icon:        React.ComponentType<{ className?: string }>;
  iconColor:   string;
  bgColor:     string;
  count:       number;
  countColor:  string;
  children:    React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border ${bgColor} p-3`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-[#F4F4F5]">{title}</h3>
            <p className="text-[10px] text-slate-500 dark:text-[#71717A]">{subtitle}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countColor}`}>
          {count}
        </span>
      </div>
      <div className="space-y-3 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-xs text-slate-400 dark:text-[#52525B] border-2 border-dashed border-slate-200 dark:border-[#27272A] rounded-xl bg-white/40">
      {message}
    </div>
  );
}

function OrderCard({
  order, primaryAction, onWhatsApp,
}: {
  order: SalesOrder;
  primaryAction: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    onClick: () => void;
  };
  onWhatsApp: () => void;
}) {
  const Icon = primaryAction.icon;
  return (
    <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-mono font-bold text-slate-900 dark:text-[#F4F4F5] text-xs">{order.orderNumber}</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-[#F4F4F5] truncate mt-0.5">{order.customerName}</p>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="text-base font-bold text-brand-700">
            {order.customerTotal.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-[#52525B]">د.ل</p>
        </div>
      </div>

      {/* Location + delivery type */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#A1A1AA] mb-2">
        <MapPin className="w-3 h-3 text-slate-400 dark:text-[#52525B] flex-shrink-0" />
        <span className="truncate">{order.customerCity}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500 dark:text-[#71717A]">{DELIVERY_TYPE_LABEL[order.deliveryType] ?? order.deliveryType}</span>
      </div>

      {/* Items summary */}
      <div className="bg-slate-50 dark:bg-[#0F0F11] rounded-lg p-2 mb-2 text-[11px]">
        <p className="text-slate-600 dark:text-[#A1A1AA] flex items-center gap-1 mb-1">
          <Package className="w-3 h-3" /> {order.items.length} صنف
        </p>
        <p className="text-slate-700 dark:text-[#E4E4E7] truncate">
          {order.items.slice(0, 2).map(i => `${i.itemName} ×${i.quantity}`).join('، ')}
          {order.items.length > 2 && ` +${order.items.length - 2}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <a
          href={`tel:${order.customerPhone}`}
          className="flex items-center justify-center gap-1 flex-1 py-1.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 text-slate-700 dark:text-[#E4E4E7] text-[11px] font-medium rounded-lg transition-colors"
          title="اتصال"
        >
          <Phone className="w-3 h-3" /> اتصال
        </a>
        <button
          onClick={onWhatsApp}
          className="flex items-center justify-center gap-1 flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-medium rounded-lg transition-colors"
          title="فتح واتساب"
        >
          واتساب
        </button>
        <button
          onClick={primaryAction.onClick}
          className={`flex items-center justify-center gap-1 flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${primaryAction.className}`}
        >
          <Icon className="w-3 h-3" /> {primaryAction.label}
        </button>
      </div>
    </div>
  );
}
