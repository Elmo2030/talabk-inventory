'use client';

/**
 * Super Admin Dashboard — /superadmin
 *
 * KPIs: active tenants · MRR · new registrations · churn
 * Charts: tenant growth (Area) · plan distribution (Donut)
 * Table: pending registration requests
 */

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Store, TrendingUp, UserPlus, AlertCircle,
  CheckCircle2, XCircle, Clock, RefreshCw,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { TenantStats, RegistrationRequest, SubscriptionPlan } from '@/lib/types';

// Defer the recharts bundle (~95 KB gzip) — the KPI cards and pending-requests
// table paint immediately while the chart island streams in below. SSR is off
// because recharts requires browser-only APIs.
const SuperadminCharts = dynamic(
  () => import('@/components/superadmin/SuperadminCharts'),
  {
    ssr: false,
    loading: () => (
      <>
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-5 h-[280px] animate-pulse" />
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-5 h-[280px] animate-pulse" />
      </>
    ),
  },
);

// ── Plan colours ──────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  trial:      '#AEAEB2',
  starter:    '#34C759',
  pro:        '#E5302A',
  enterprise: '#1C1C1E',
};

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  trial:      'تجريبي',
  starter:    'مبتدئ',
  pro:        'احترافي',
  enterprise: 'مؤسسي',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' د.ل';
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  icon: Icon, label, value, sub, color = '#E5302A', delta,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  /** 24-hour change. Positive renders green arrow ↑, negative red ↓, 0 hidden. */
  delta?: number;
}) {
  const hasDelta = typeof delta === 'number' && delta !== 0;
  const isUp     = (delta ?? 0) > 0;
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: `${color}18` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5] leading-none">{value}</p>
          {hasDelta && (
            <span
              className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                isUp ? 'text-emerald-600' : 'text-red-600'
              }`}
              title="مقارنةً بالـ 24 ساعة الماضية"
            >
              {isUp ? '↑' : '↓'}{Math.abs(delta!)}
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Registration request row ──────────────────────────────────────────────────
function RegRow({
  req,
  onApprove,
  onReject,
  actionLoading,
}: {
  req: RegistrationRequest;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
  actionLoading?: string | null; // id currently being processed
}) {
  const isLoading = actionLoading === req.id;

  return (
    <tr className="border-t border-[#F2F2F7] dark:border-[#27272A] hover:bg-[#F9F9FB] dark:hover:bg-[#27272A] transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-sm text-[#1C1C1E] dark:text-[#F4F4F5]">{req.store_name}</p>
        <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">{req.owner_name}</p>
        {req.phone && (
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5 dir-ltr text-right">{req.phone}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-[#6C6C70] dark:text-[#A1A1AA]">{req.email}</td>
      <td className="px-4 py-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F2F2F7] dark:bg-[#27272A] text-[#1C1C1E] dark:text-[#F4F4F5]">
          {PLAN_LABELS[req.requested_plan]}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
        {new Date(req.created_at).toLocaleDateString('ar-LY', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3">
        {req.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onApprove(req.id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
            >
              {isLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              قبول
            </button>
            <button
              onClick={() => onReject(req.id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F2F7] dark:bg-[#27272A] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] disabled:opacity-50 disabled:cursor-not-allowed text-[#1C1C1E] dark:text-[#F4F4F5] text-xs font-semibold transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              رفض
            </button>
          </div>
        ) : req.status === 'approved' ? (
          <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> مقبول
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[#E5302A] text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" /> مرفوض
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const supabase = getSupabaseClient();

  const [stats,          setStats]          = useState<TenantStats[]>([]);
  const [requests,       setRequests]       = useState<RegistrationRequest[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [actionError,    setActionError]    = useState<string>('');

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const activeTenants  = stats.filter(t => t.status === 'active').length;
  const trialTenants   = stats.filter(t => t.subscription_plan === 'trial').length;
  const mrr            = stats
    .filter(t => t.status === 'active' && t.subscription_plan !== 'trial')
    .reduce((s, t) => s + (t.monthly_fee ?? 0), 0);
  const pendingCount   = requests.filter(r => r.status === 'pending').length;

  // ── 24-hour deltas ────────────────────────────────────────────────────────
  // How many of each KPI's rows were created in the last 24 hours. Helps the
  // super-admin spot growth or sudden spikes at a glance.
  const DAY_AGO = Date.now() - 86_400_000;
  const isRecent = (iso?: string) => !!iso && new Date(iso).getTime() >= DAY_AGO;

  const activeDelta   = stats.filter(t => t.status === 'active' && isRecent(t.created_at)).length;
  const trialDelta    = stats.filter(t => t.subscription_plan === 'trial' && isRecent(t.created_at)).length;
  const pendingDelta  = requests.filter(r => r.status === 'pending' && isRecent(r.created_at)).length;
  const mrrDelta      = stats
    .filter(t => t.status === 'active' && t.subscription_plan !== 'trial' && isRecent(t.created_at))
    .reduce((s, t) => s + (t.monthly_fee ?? 0), 0);

  // Plan distribution for donut chart
  const planData = (['trial', 'starter', 'pro', 'enterprise'] as SubscriptionPlan[]).map(plan => ({
    name:  PLAN_LABELS[plan],
    value: stats.filter(t => t.subscription_plan === plan).length,
    color: PLAN_COLORS[plan],
  })).filter(d => d.value > 0);

  // Monthly growth (last 6 months)
  const growthData = (() => {
    const months: { month: string; tenants: number; mrr: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('ar-LY', { month: 'short', year: '2-digit' });
      const count = stats.filter(t => {
        const created = new Date(t.created_at);
        return created <= new Date(d.getFullYear(), d.getMonth() + 1, 0);
      }).length;
      const mrrAtMonth = stats.filter(t => {
        const created = new Date(t.created_at);
        return t.status === 'active' &&
               t.subscription_plan !== 'trial' &&
               created <= new Date(d.getFullYear(), d.getMonth() + 1, 0);
      }).reduce((s, t) => s + (t.monthly_fee ?? 0), 0);
      months.push({ month: label, tenants: count, mrr: mrrAtMonth });
    }
    return months;
  })();

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [statsRes, reqRes] = await Promise.all([
        supabase.rpc('get_tenant_stats'),
        supabase
          .from('registration_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (statsRes.data)  setStats(statsRes.data as TenantStats[]);
      if (reqRes.data)    setRequests(reqRes.data as RegistrationRequest[]);
    } catch (err) {
      console.error('[SuperAdmin] fetchData error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    setActionLoading(id);
    setActionError('');

    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId:  req.id,
          storeName:  req.store_name,
          ownerName:  req.owner_name,
          email:      req.email,
          plan:       req.requested_plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error ?? 'فشلت العملية، حاول مجدداً');
      } else {
        fetchData(true);
      }
    } catch {
      setActionError('خطأ في الاتصال، حاول مجدداً');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    await supabase
      .from('registration_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    fetchData(true);
  };

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[#E5E5EA] dark:bg-[#27272A] rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#E5E5EA] dark:bg-[#27272A] rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-[#E5E5EA] dark:bg-[#27272A] rounded-2xl" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">لوحة الإدارة العليا</h1>
          <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5">
            مرحباً — إجمالي المتاجر: {fmt(stats.length)}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-sm font-medium text-[#1C1C1E] dark:text-[#F4F4F5] hover:bg-[#F2F2F7] dark:hover:bg-[#27272A] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Store}
          label="المتاجر النشطة"
          value={fmt(activeTenants)}
          sub={`${fmt(trialTenants)} تجريبي`}
          color="#34C759"
          delta={activeDelta}
        />
        <KPICard
          icon={TrendingUp}
          label="الإيراد الشهري (MRR)"
          value={fmtCurrency(mrr)}
          sub={`${fmt(stats.filter(t => t.subscription_plan !== 'trial' && t.status === 'active').length)} اشتراك مدفوع`}
          color="#E5302A"
          delta={mrrDelta}
        />
        <KPICard
          icon={UserPlus}
          label="طلبات التسجيل"
          value={fmt(pendingCount)}
          sub="في انتظار المراجعة"
          color="#FF9F0A"
          delta={pendingDelta}
        />
        <KPICard
          icon={AlertCircle}
          label="متاجر موقوفة"
          value={fmt(stats.filter(t => t.status === 'suspended').length)}
          sub={`${fmt(stats.filter(t => t.status === 'cancelled').length)} ملغي · ${fmt(trialDelta)} تجريبي جديد اليوم`}
          color="#6C6C70"
        />
      </div>

      {/* Charts Row — lazy-loaded recharts island (~95 KB deferred from initial paint) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SuperadminCharts growthData={growthData} planData={planData} />
      </div>

      {/* Pending Registration Requests */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F2F7] dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF9F0A]" />
            <h2 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">
              طلبات التسجيل الجديدة
            </h2>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FF9F0A] text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <Link
            href="/superadmin/tenants"
            className="flex items-center gap-1 text-xs text-[#E5302A] hover:underline"
          >
            كل المتاجر
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {actionError && (
          <div className="mx-5 mt-4 flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {actionError}
          </div>
        )}
        {requests.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#AEAEB2]">
            لا توجد طلبات تسجيل جديدة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[#F9F9FB] dark:bg-[#27272A]">
                  {['المتجر / جهة الاتصال', 'البريد الإلكتروني', 'الخطة', 'التاريخ', 'الإجراء'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-[#6C6C70] dark:text-[#A1A1AA]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <RegRow
                    key={req.id}
                    req={req}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    actionLoading={actionLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
