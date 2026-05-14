'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  FileText,
  Settings,
  BookOpen,
  Store,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useStock } from '@/lib/StockContext';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/suppliers', label: 'الموردين', icon: Users },
  { href: '/items', label: 'الأصناف', icon: Package },
  { href: '/stock-in', label: 'سجل الوارد', icon: ArrowDownToLine },
  { href: '/stock-out', label: 'سجل الصادر', icon: ArrowUpFromLine },
  { href: '/current-stock', label: 'الرصيد الحالي', icon: BarChart3 },
  { href: '/reports', label: 'التقارير', icon: FileText },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
  { href: '/store', label: 'بيانات المتجر', icon: Store },
  { href: '/guide', label: 'دليل المستخدم', icon: BookOpen },
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
  const router = useRouter();
  const { currentStock } = useStock();
  const { username, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const alertCount = currentStock.filter(
    (s) => s.status === 'OUT_OF_STOCK' || s.status === 'NEEDS_REORDER'
  ).length;

  const sidebarContent = (
    <>
      {/* Brand header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <TalabkLogo size={38} />
        <div className="flex-1">
          <h1 className="text-base font-bold text-white leading-tight">طلبك</h1>
          <p className="text-[11px] text-white/40 leading-tight">نظام المخازن</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          aria-label="إغلاق القائمة"
        >
          <X className="w-5 h-5" />
        </button>
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
              onClick={() => setMobileOpen(false)}
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
            {username ? username.charAt(0).toUpperCase() : 'ط'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">{username ?? 'مدير النظام'}</p>
            <p className="text-xs text-white/35 truncate">talabk.system</p>
          </div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            title="تسجيل الخروج"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-40 h-14 flex items-center justify-between px-4" style={{ background: '#1C1C1E' }}>
        {/* Right side: hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          aria-label="فتح القائمة"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Center: logo + name */}
        <div className="flex items-center gap-2">
          <TalabkLogo size={28} />
          <span className="text-base font-bold text-white">طلبك</span>
        </div>

        {/* Left: spacer for balance */}
        <div className="w-10" />
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 h-screen w-72 md:w-64 flex flex-col z-50
          transition-transform duration-300 ease-in-out
          md:right-0 md:translate-x-0 right-0
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        style={{ background: '#1C1C1E' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
