'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Store, Settings, LogOut, Shield, CreditCard, History } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/superadmin',          label: 'لوحة التحكم',   icon: LayoutDashboard },
  { href: '/superadmin/tenants',  label: 'إدارة المتاجر', icon: Store },
  { href: '/superadmin/payments', label: 'المدفوعات',     icon: CreditCard },
  { href: '/superadmin/audit',    label: 'سجل الأحداث',   icon: History },
  { href: '/superadmin/settings', label: 'الإعدادات',     icon: Settings },
];

function TalabkLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 72" fill="none">
      <path d="M28 2C13 2 2 13 2 26C2 40 13 52 21 61L28 69L35 61C43 52 54 40 54 26C54 13 43 2 28 2Z" fill="#E5302A" />
      <rect x="12" y="17" width="32" height="9" rx="3.5" fill="white" />
      <rect x="22" y="17" width="12" height="26" rx="3.5" fill="white" />
      <polygon points="28,69 22,60 34,60" fill="#E5302A" />
    </svg>
  );
}

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = getSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Super-admins log back in via the dedicated /superadmin/login page,
    // not the tenant /login flow.
    router.push('/superadmin/login');
  };

  return (
    <aside className="fixed top-0 right-0 h-screen w-64 flex flex-col z-50" style={{ background: '#1C1C1E' }}>

      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <TalabkLogo size={32} />
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">طلبك</h1>
          <p className="text-[10px] text-white/40 leading-tight">الإدارة العليا</p>
        </div>
      </div>

      {/* Super admin badge */}
      <div className="mx-3 mt-4 px-3 py-2 rounded-xl bg-[#E5302A]/15 border border-[#E5302A]/30 flex items-center gap-2">
        <Shield className="w-4 h-4 text-[#E5302A] flex-shrink-0" />
        <span className="text-xs font-semibold text-[#E5302A]">Super Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const Icon     = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/superadmin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-[#E5302A] text-white'
                  : 'text-white/65 hover:bg-white/10 hover:text-white/90'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
