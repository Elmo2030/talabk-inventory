'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';

const navItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/suppliers', label: 'الموردين', icon: Users },
  { href: '/items', label: 'الأصناف', icon: Package },
  { href: '/stock-in', label: 'سجل الوارد', icon: ArrowDownToLine },
  { href: '/stock-out', label: 'سجل الصادر', icon: ArrowUpFromLine },
  { href: '/current-stock', label: 'الرصيد الحالي', icon: BarChart3 },
  { href: '/reports', label: 'التقارير', icon: FileText },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

// Talabk T-pin SVG logo
function TalabkLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Balloon body */}
      <path
        d="M28 2C13 2 2 13 2 26C2 40 13 52 21 61L28 69L35 61C43 52 54 40 54 26C54 13 43 2 28 2Z"
        fill="#E5302A"
      />
      {/* Inner shadow for depth */}
      <path
        d="M17 9C11 14 8 20 8 27C8 35 13 43 20 50"
        stroke="#C42B24"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
      {/* T — horizontal bar */}
      <rect x="12" y="17" width="32" height="9" rx="3.5" fill="white" />
      {/* T — vertical bar */}
      <rect x="22" y="17" width="12" height="26" rx="3.5" fill="white" />
      {/* Pin arrow */}
      <polygon points="28,69 22,60 34,60" fill="#E5302A" />
      {/* Pin ring */}
      <ellipse
        cx="28"
        cy="71"
        rx="8"
        ry="3"
        stroke="#E5302A"
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentStock } = useStock();

  const alertCount = currentStock.filter(
    (s) => s.status === 'OUT_OF_STOCK' || s.status === 'NEEDS_REORDER'
  ).length;

  return (
    <aside
      className="fixed right-0 top-0 h-screen w-64 flex flex-col"
      style={{ background: '#1C1C1E' }}
    >
      {/* Brand header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <TalabkLogo size={38} />
        <div>
          <h1 className="text-base font-bold text-white leading-tight">طلبك</h1>
          <p className="text-[11px] text-white/40 leading-tight">نظام المخازن</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isStockAlert = item.href === '/current-stock' && alertCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-white/65 hover:bg-white/10 hover:text-white/90'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-white/50'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isStockAlert && (
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer user strip */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: '#E5302A' }}
          >
            ط
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">مدير النظام</p>
            <p className="text-xs text-white/35 truncate">talabk.system</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
