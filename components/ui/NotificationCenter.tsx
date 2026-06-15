'use client';

import { useState, useMemo } from 'react';
import { Bell, X, AlertTriangle, Package, ShoppingBag, CheckCircle } from 'lucide-react';
import { useMovements, useOrders, usePurchases } from '@/lib/StockContext';
import { formatMoney } from '@/lib/format';

type Notification = {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'new_order' | 'pending_invoice';
  title: string;
  message: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  time: string;
};

export default function NotificationCenter() {
  const { currentStock } = useMovements();
  const { salesOrders } = useOrders();
  const { purchaseInvoices } = usePurchases();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const notifications = useMemo<Notification[]>(() => {
    const list: Notification[] = [];

    // Out of stock
    currentStock
      .filter((s) => s.status === 'OUT_OF_STOCK')
      .slice(0, 5)
      .forEach((s) => {
        const id = `out-${s.itemId}`;
        list.push({
          id,
          type: 'out_of_stock',
          title: 'نفاد المخزون',
          message: `${s.itemName} — الرصيد صفر`,
          icon: Package,
          color: 'text-red-600',
          bg: 'bg-red-50',
          time: 'الآن',
        });
      });

    // Low stock (needs reorder)
    currentStock
      .filter((s) => s.status === 'NEEDS_REORDER' || s.status === 'LOW')
      .slice(0, 5)
      .forEach((s) => {
        const id = `low-${s.itemId}`;
        list.push({
          id,
          type: 'low_stock',
          title: 'مخزون منخفض',
          message: `${s.itemName} — الرصيد: ${s.currentBalance} (الحد الأدنى: ${s.minStockLevel})`,
          icon: AlertTriangle,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          time: 'الآن',
        });
      });

    // Pending orders (today)
    const today = new Date().toISOString().split('T')[0];
    const pendingOrders = salesOrders
      .filter((o) => o.status === 'PENDING' && o.createdAt.startsWith(today))
      .slice(0, 3);
    pendingOrders.forEach((o) => {
      const id = `order-${o.id}`;
      list.push({
        id,
        type: 'new_order',
        title: 'طلب جديد',
        message: `${o.orderNumber} — ${o.customerName} — ${formatMoney(o.customerTotal)}`,
        icon: ShoppingBag,
        color: 'text-brand-600',
        bg: 'bg-brand-50',
        time: 'اليوم',
      });
    });

    // Draft invoices
    const draftInvoices = purchaseInvoices
      .filter((p) => p.status === 'DRAFT')
      .slice(0, 3);
    draftInvoices.forEach((p) => {
      const id = `inv-${p.id}`;
      list.push({
        id,
        type: 'pending_invoice',
        title: 'فاتورة مشتريات معلقة',
        message: `${p.invoiceNumber} — ${p.supplierName}`,
        icon: CheckCircle,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        time: new Date(p.createdAt).toLocaleDateString('ar-LY'),
      });
    });

    return list.filter((n) => !dismissed.has(n.id));
  }, [currentStock, salesOrders, purchaseInvoices, dismissed]);

  const unreadCount = notifications.length;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const dismissAll = () => {
    setDismissed(new Set(notifications.map((n) => n.id)));
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        aria-label="التنبيهات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#E5302A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute left-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-900">التنبيهات</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={dismissAll}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                تجاهل الكل
              </button>
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">لا توجد تنبيهات</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 ${n.bg} hover:opacity-90 transition-opacity`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg bg-white ${n.color} flex-shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${n.color}`}>{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                        </div>
                        <button
                          onClick={() => dismiss(n.id)}
                          className="p-0.5 text-slate-300 hover:text-slate-500 rounded flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">{unreadCount} تنبيه نشط</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
