'use client';

/**
 * Global Command Palette — opens with ⌘K / Ctrl+K.
 * Fuzzy-searches across navigation routes and live data (items, customers,
 * orders). Selecting a result navigates to the relevant page.
 *
 * Designed to be a single component owning its open/close state so it can
 * be mounted once in AppShell without prop drilling.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Package, Users, ShoppingBag, LayoutDashboard, Truck,
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Warehouse, CalendarClock,
  RotateCcw, Tag, MessageSquare, BarChart2, FileText, Calculator,
  Settings, Store, BookOpen, CreditCard, UserCircle, ShoppingCart,
} from 'lucide-react';
import { useItems, useSuppliers, useOrders } from '@/lib/StockContext';
import { useTenant } from '@/lib/TenantContext';

interface PaletteItem {
  id:    string;
  label: string;
  sub?:  string;
  href:  string;
  icon:  React.ComponentType<{ className?: string }>;
  group: string;
}

const NAV_ITEMS: PaletteItem[] = [
  { id: 'nav-items',          label: 'الأصناف',           href: '/items',               icon: Package,          group: 'الانتقال' },
  { id: 'nav-suppliers',      label: 'الموردين',          href: '/suppliers',           icon: Users,            group: 'الانتقال' },
  { id: 'nav-purchases',      label: 'فواتير الشراء',     href: '/purchases',           icon: ShoppingCart,     group: 'الانتقال' },
  { id: 'nav-stock-in',       label: 'إضافة مخزون',       href: '/stock-in',            icon: ArrowDownToLine,  group: 'الانتقال' },
  { id: 'nav-stock-out',      label: 'صرف مخزون',         href: '/stock-out',           icon: ArrowUpFromLine,  group: 'الانتقال' },
  { id: 'nav-current-stock',  label: 'المخزون الحالي',    href: '/current-stock',       icon: BarChart3,        group: 'الانتقال' },
  { id: 'nav-warehouses',     label: 'المستودعات',        href: '/warehouses',          icon: Warehouse,        group: 'الانتقال' },
  { id: 'nav-batches',        label: 'الدفعات والصلاحية', href: '/batches',             icon: CalendarClock,    group: 'الانتقال' },
  { id: 'nav-orders',         label: 'طلبات البيع',       href: '/orders',              icon: ShoppingBag,      group: 'الانتقال' },
  { id: 'nav-returns',        label: 'المرتجعات',         href: '/returns',             icon: RotateCcw,        group: 'الانتقال' },
  { id: 'nav-coupons',        label: 'الكوبونات',         href: '/coupons',             icon: Tag,              group: 'الانتقال' },
  { id: 'nav-customers',      label: 'العملاء',           href: '/customers',           icon: UserCircle,       group: 'الانتقال' },
  { id: 'nav-delivery',       label: 'لوحة التوصيل',      href: '/delivery',            icon: Truck,            group: 'الانتقال' },
  { id: 'nav-messages',       label: 'قوالب الرسائل',     href: '/messages',            icon: MessageSquare,    group: 'الانتقال' },
  { id: 'nav-analytics',      label: 'التحليلات',         href: '/analytics',           icon: BarChart2,        group: 'الانتقال' },
  { id: 'nav-reports',        label: 'التقارير',          href: '/reports',             icon: FileText,         group: 'الانتقال' },
  { id: 'nav-appointments',   label: 'المواعيد',          href: '/appointments',        icon: CalendarClock,    group: 'الانتقال' },
  { id: 'nav-shipping',       label: 'حاسبة الشحن',       href: '/shipping-calculator', icon: Calculator,       group: 'الانتقال' },
  { id: 'nav-settings',       label: 'الإعدادات',         href: '/settings',            icon: Settings,         group: 'الانتقال' },
  { id: 'nav-store',          label: 'الملف التجاري',     href: '/store',               icon: Store,            group: 'الانتقال' },
  { id: 'nav-billing',        label: 'الفواتير والاشتراك', href: '/billing',            icon: CreditCard,       group: 'الانتقال' },
  { id: 'nav-guide',          label: 'دليل المستخدم',     href: '/guide',               icon: BookOpen,         group: 'الانتقال' },
];

const QUICK_ACTIONS: PaletteItem[] = [
  { id: 'qa-new-item',     label: 'إضافة صنف جديد',      href: '/items',          icon: Package,         group: 'إجراءات سريعة' },
  { id: 'qa-new-order',    label: 'إنشاء طلب بيع جديد',  href: '/orders/new',     icon: ShoppingBag,     group: 'إجراءات سريعة' },
  { id: 'qa-new-purchase', label: 'إنشاء فاتورة شراء',   href: '/purchases/new',  icon: ShoppingCart,    group: 'إجراءات سريعة' },
  { id: 'qa-stock-in',     label: 'تسجيل دخول مخزون',    href: '/stock-in',       icon: ArrowDownToLine, group: 'إجراءات سريعة' },
];

export default function CommandPalette() {
  const router = useRouter();
  const { items } = useItems();
  const { suppliers } = useSuppliers();
  const { salesOrders } = useOrders();
  const { tenant } = useTenant();
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Keyboard: Cmd/Ctrl+K toggles, Escape closes ──────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Result list ─────────────────────────────────────────────────────────
  // Memoize so the object's identity is stable across renders — feeds into
  // the `filtered` useMemo deps below.
  const dashboardItem: PaletteItem = useMemo(
    () => ({
      id: 'nav-dashboard',
      label: 'لوحة التحكم',
      href: tenant?.slug ? `/app/${tenant.slug}/dashboard` : '/',
      icon: LayoutDashboard,
      group: 'الانتقال',
    }),
    [tenant?.slug],
  );

  const dataItems: PaletteItem[] = useMemo(() => {
    const itemMatches = items.slice(0, 5).map(i => ({
      id:    `item-${i.id}`,
      label: i.name,
      sub:   i.code,
      href:  `/items/${i.id}`,
      icon:  Package,
      group: 'الأصناف',
    }));
    const supplierMatches = suppliers.slice(0, 5).map(s => ({
      id:    `sup-${s.id}`,
      label: s.name,
      sub:   s.code,
      href:  `/suppliers/${s.id}`,
      icon:  Users,
      group: 'الموردين',
    }));
    const orderMatches = salesOrders.slice(0, 5).map(o => ({
      id:    `order-${o.id}`,
      label: `طلب ${o.orderNumber}`,
      sub:   o.customerName,
      href:  `/orders/${o.id}`,
      icon:  ShoppingBag,
      group: 'الطلبات',
    }));
    return [...itemMatches, ...supplierMatches, ...orderMatches];
  }, [items, suppliers, salesOrders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: PaletteItem[] = [dashboardItem, ...QUICK_ACTIONS, ...NAV_ITEMS, ...dataItems];
    if (!q) return all.slice(0, 12);
    return all.filter(i =>
      i.label.toLowerCase().includes(q) ||
      (i.sub?.toLowerCase().includes(q) ?? false),
    ).slice(0, 25);
  }, [query, dataItems, dashboardItem]);

  // Reset active idx when filtered changes
  useEffect(() => { setActiveIdx(0); }, [filtered.length]);

  const onSelect = (item: PaletteItem) => {
    setOpen(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault();
      onSelect(filtered[activeIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      dir="rtl"
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-[#E5E5EA] dark:border-[#27272A] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5EA] dark:border-[#27272A]">
          <Search className="w-5 h-5 text-[#AEAEB2] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ابحث عن صفحة، صنف، طلب، عميل..."
            className="flex-1 bg-transparent outline-none text-sm text-[#1C1C1E] dark:text-[#F4F4F5] placeholder-[#AEAEB2]"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F2F2F7] dark:bg-[#27272A] text-[#6C6C70] dark:text-[#A1A1AA]">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#AEAEB2]">لا توجد نتائج</p>
          ) : (
            renderGrouped(filtered, activeIdx, onSelect)
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#E5E5EA] dark:border-[#27272A] bg-[#F9F9F9] dark:bg-[#0F0F11] text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
          <span>
            <kbd className="font-mono px-1 py-0.5 rounded bg-white dark:bg-[#27272A] border border-[#E5E5EA] dark:border-[#3a3a3c]">↑↓</kbd>{' '}للتنقل
          </span>
          <span>
            <kbd className="font-mono px-1 py-0.5 rounded bg-white dark:bg-[#27272A] border border-[#E5E5EA] dark:border-[#3a3a3c]">↵</kbd>{' '}للفتح
          </span>
          <span className="opacity-60">⌘K للإغلاق</span>
        </div>
      </div>
    </div>
  );
}

function renderGrouped(items: PaletteItem[], activeIdx: number, onSelect: (i: PaletteItem) => void) {
  const groups: Record<string, { items: PaletteItem[]; startIdx: number }> = {};
  items.forEach((it, idx) => {
    if (!groups[it.group]) groups[it.group] = { items: [], startIdx: idx };
    groups[it.group].items.push(it);
  });

  return Object.entries(groups).map(([group, { items: gi, startIdx }]) => (
    <div key={group}>
      <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#AEAEB2] bg-[#F9F9F9] dark:bg-[#0F0F11]">{group}</p>
      {gi.map((item, j) => {
        const Icon = item.icon;
        const globalIdx = startIdx + j;
        const isActive = globalIdx === activeIdx;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
              isActive
                ? 'bg-[#E5302A]/10 text-[#E5302A]'
                : 'hover:bg-[#F2F2F7] dark:hover:bg-[#27272A]/50 text-[#1C1C1E] dark:text-[#F4F4F5]'
            }`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#E5302A]' : 'text-[#6C6C70] dark:text-[#A1A1AA]'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              {item.sub && <p className="text-xs text-[#AEAEB2] truncate">{item.sub}</p>}
            </div>
          </button>
        );
      })}
    </div>
  ));
}
