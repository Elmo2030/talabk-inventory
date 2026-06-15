'use client';

/**
 * Tenant Management — /superadmin/tenants
 * Full list of tenants with search, filter by status/plan, and quick actions.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Filter, ChevronDown, MoreVertical,
  CheckCircle2, AlertTriangle, XCircle, Clock,
  TrendingUp, Users, ShoppingBag, RefreshCw,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { TenantStats, TenantStatus, SubscriptionPlan } from '@/lib/types';
import { formatNumber } from '@/lib/format';

// ── Constants ─────────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  trial:      'تجريبي',
  starter:    'مبتدئ',
  pro:        'احترافي',
  enterprise: 'مؤسسي',
};

const STATUS_CONFIG: Record<TenantStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: 'نشط',         color: '#34C759', icon: CheckCircle2 },
  pending:   { label: 'معلق',        color: '#FF9F0A', icon: Clock },
  suspended: { label: 'موقوف',       color: '#E5302A', icon: AlertTriangle },
  cancelled: { label: 'ملغي',        color: '#AEAEB2', icon: XCircle },
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  trial:      '#AEAEB2',
  starter:    '#34C759',
  pro:        '#E5302A',
  enterprise: '#1C1C1E',
};

function fmt(n: number) {
  return formatNumber(n, { decimals: 0 });
}

// ── Tenant Row ────────────────────────────────────────────────────────────────
function TenantRow({
  tenant,
  onStatusChange,
}: {
  tenant: TenantStats;
  onStatusChange: (id: string, status: TenantStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_CONFIG[tenant.status];
  const StatusIcon = sc.icon;

  return (
    <tr className="border-t border-[#F2F2F7] dark:border-[#27272A] hover:bg-[#F9F9FB] dark:hover:bg-[#27272A] transition-colors">
      {/* Store */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: '#E5302A' }}
          >
            {tenant.store_name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm text-[#1C1C1E] dark:text-[#F4F4F5]">{tenant.store_name}</p>
            <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">{tenant.slug}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${sc.color}18`, color: sc.color }}>
          <StatusIcon className="w-3 h-3" />
          {sc.label}
        </span>
      </td>

      {/* Plan */}
      <td className="px-4 py-3">
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
          style={{ background: PLAN_COLORS[tenant.subscription_plan] }}
        >
          {PLAN_LABELS[tenant.subscription_plan]}
        </span>
      </td>

      {/* Users */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
          <Users className="w-3.5 h-3.5" />
          {fmt(tenant.active_users)} / {fmt(tenant.total_users)}
        </div>
      </td>

      {/* Orders (30d) */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
          <ShoppingBag className="w-3.5 h-3.5" />
          {fmt(tenant.orders_last_30d)}
        </div>
      </td>

      {/* GMV (30d) */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">
          <TrendingUp className="w-3.5 h-3.5 text-[#34C759]" />
          {fmt(tenant.gmv_last_30d)} د.ل
        </div>
      </td>

      {/* Created */}
      <td className="px-4 py-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
        {new Date(tenant.created_at).toLocaleDateString('ar-LY', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-[#6C6C70] dark:text-[#A1A1AA]" />
        </button>

        {open && (
          <div className="absolute left-0 top-12 z-50 w-44 bg-white dark:bg-[#1C1C1E] rounded-xl shadow-lg border border-[#E5E5EA] dark:border-[#2C2C2E] py-1 text-sm">
            {tenant.status !== 'active' && (
              <button onClick={() => { onStatusChange(tenant.id, 'active'); setOpen(false); }}
                      className="w-full text-right px-4 py-2 hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] text-green-600">
                تفعيل
              </button>
            )}
            {tenant.status !== 'suspended' && (
              <button onClick={() => { onStatusChange(tenant.id, 'suspended'); setOpen(false); }}
                      className="w-full text-right px-4 py-2 hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] text-amber-600">
                إيقاف مؤقت
              </button>
            )}
            {tenant.status !== 'cancelled' && (
              <button onClick={() => { onStatusChange(tenant.id, 'cancelled'); setOpen(false); }}
                      className="w-full text-right px-4 py-2 hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] text-[#E5302A]">
                إلغاء الاشتراك
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const supabase = getSupabaseClient();

  const [tenants,      setTenants]      = useState<TenantStats[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all');
  const [planFilter,   setPlanFilter]   = useState<SubscriptionPlan | 'all'>('all');

  const fetchTenants = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    const { data } = await supabase.rpc('get_tenant_stats');
    if (data) setTenants(data as TenantStats[]);

    setIsLoading(false);
    setIsRefreshing(false);
  }, [supabase]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleStatusChange = async (id: string, status: TenantStatus) => {
    await supabase.from('tenants').update({ status }).eq('id', id);
    fetchTenants(true);
  };

  // Filtered list
  const filtered = tenants.filter(t => {
    const matchSearch = !search ||
      t.store_name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.includes(search.toLowerCase()) ||
      t.owner_email.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPlan   = planFilter   === 'all' || t.subscription_plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">إدارة المتاجر</h1>
          <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5">
            {fmt(tenants.length)} متجر مسجل · {fmt(tenants.filter(t => t.status === 'active').length)} نشط
          </p>
        </div>
        <button
          onClick={() => fetchTenants(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-sm font-medium hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الـ slug أو البريد..."
            className="w-full pr-9 pl-4 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-sm text-[#1C1C1E] dark:text-[#F4F4F5] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-[#E5302A]/20 focus:border-[#E5302A]"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as TenantStatus | 'all')}
            className="appearance-none pr-8 pl-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-sm text-[#1C1C1E] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-[#E5302A]/20"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="pending">معلق</option>
            <option value="suspended">موقوف</option>
            <option value="cancelled">ملغي</option>
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#AEAEB2] pointer-events-none" />
        </div>

        {/* Plan filter */}
        <div className="relative">
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value as SubscriptionPlan | 'all')}
            className="appearance-none pr-8 pl-3 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-sm text-[#1C1C1E] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-[#E5302A]/20"
          >
            <option value="all">كل الخطط</option>
            <option value="trial">تجريبي</option>
            <option value="starter">مبتدئ</option>
            <option value="pro">احترافي</option>
            <option value="enterprise">مؤسسي</option>
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#AEAEB2] pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-[#F2F2F7] dark:bg-[#27272A] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-10 h-10 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#6C6C70] dark:text-[#A1A1AA]">
              {search || statusFilter !== 'all' || planFilter !== 'all'
                ? 'لا توجد نتائج مطابقة'
                : 'لا توجد متاجر مسجلة بعد'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[#F9F9FB] dark:bg-[#27272A]">
                  {['المتجر', 'الحالة', 'الخطة', 'المستخدمون', 'الطلبات (30 يوم)', 'GMV (30 يوم)', 'تاريخ الإنشاء', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6C6C70] dark:text-[#A1A1AA] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <TenantRow key={t.id} tenant={t} onStatusChange={handleStatusChange} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
