'use client';

/**
 * Mobile bottom navigation — fixed strip with 4 jobs-to-be-done +
 * a sticky raised "+" FAB for "new order" in the center.
 *
 * Why this exists: The PM/UX audit flagged the hamburger-only mobile UX
 * as the single biggest mobile friction. Merchants are on phones; the
 * top three daily jobs (الرئيسية / طلب جديد / المخزون) were buried in
 * a 23-item sidebar drawer. This bar puts them in thumb reach.
 *
 * Hidden on `md` and up (desktop keeps the existing left sidebar).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Plus, MoreHorizontal } from 'lucide-react';
import type { ElementType } from 'react';

interface BottomNavItem {
  label: string;
  href: string;
  icon: ElementType;
  match: (pathname: string) => boolean;
}

const ITEMS: BottomNavItem[] = [
  {
    label: 'الرئيسية',
    href: '/',
    icon: Home,
    match: (p) => p === '/' || /^\/app\/[^/]+\/dashboard$/.test(p),
  },
  {
    label: 'المخزون',
    href: '/items',
    icon: Package,
    match: (p) => p.startsWith('/items') || p.startsWith('/current-stock'),
  },
  // Center slot is the FAB — rendered separately.
  {
    label: 'المزيد',
    href: '#more',
    icon: MoreHorizontal,
    match: () => false,
  },
];

interface BottomNavProps {
  /** Called when the "more" button is tapped — opens the existing sidebar drawer. */
  onOpenMore?: () => void;
  /** New-order destination. Defaults to /orders/new but tenant routes can override. */
  newOrderHref?: string;
}

export default function BottomNav({ onOpenMore, newOrderHref = '/orders/new' }: BottomNavProps) {
  const pathname = usePathname() ?? '/';

  return (
    <>
      {/* Spacer so page content isn't hidden behind the fixed bar. */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#18181B] border-t border-[#E5E5EA] dark:border-[#27272A] pb-[env(safe-area-inset-bottom)]"
        aria-label="التنقل السفلي"
      >
        <div className="grid grid-cols-5 items-end h-16 relative">
          {/* Slot 1: Home */}
          <NavSlot item={ITEMS[0]} active={ITEMS[0].match(pathname)} />

          {/* Slot 2: Inventory */}
          <NavSlot item={ITEMS[1]} active={ITEMS[1].match(pathname)} />

          {/* Slot 3 (center): raised FAB for new order */}
          <div className="flex items-center justify-center">
            <Link
              href={newOrderHref}
              aria-label="إنشاء طلب جديد"
              className="-mt-6 w-14 h-14 rounded-full bg-[#E5302A] hover:bg-[#C42B24] text-white shadow-lg shadow-[#E5302A]/30 flex items-center justify-center transition-colors"
            >
              <Plus className="w-7 h-7" />
            </Link>
          </div>

          {/* Slot 4: placeholder (kept empty for grid symmetry around the FAB) */}
          <div aria-hidden="true" />

          {/* Slot 5: More — opens the existing drawer */}
          <button
            type="button"
            onClick={onOpenMore}
            className="flex flex-col items-center justify-center gap-1 h-full text-[#6C6C70] dark:text-[#A1A1AA] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F5] transition-colors"
            aria-label="فتح القائمة الكاملة"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">المزيد</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function NavSlot({ item, active }: { item: BottomNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center justify-center gap-1 h-full transition-colors ${
        active
          ? 'text-[#E5302A]'
          : 'text-[#6C6C70] dark:text-[#A1A1AA] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F5]'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}
