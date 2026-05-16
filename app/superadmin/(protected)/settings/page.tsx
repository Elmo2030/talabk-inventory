'use client';

/**
 * Super-Admin Settings — system-wide configuration and visibility.
 *
 * Sections:
 *   1. Environment / wallet status
 *   2. Plan-tier reference (read-only)
 *   3. System counters (tenants, users, payments)
 *   4. Recent audit log
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Wallet, CheckCircle2, AlertCircle, Users, Store, CreditCard,
  Activity, ShieldCheck, Database, Mail,
} from 'lucide-react';

interface SystemStats {
  tenants_total:      number;
  tenants_active:     number;
  tenants_pending:    number;
  tenants_suspended:  number;
  users_total:        number;
  payments_pending:   number;
  payments_approved:  number;
}

interface AuditEntry {
  id:          string;
  actor_role:  string | null;
  action:      string;
  target_type: string | null;
  target_id:   string | null;
  payload:     Record<string, unknown> | null;
  created_at:  string;
}

const PLANS = [
  { code: 'trial',      label: 'تجريبي',     users: 3,  items: 100,   orders: 200,    price: 0   },
  { code: 'starter',    label: 'أساسي',      users: 5,  items: 500,   orders: 1000,   price: 99  },
  { code: 'pro',        label: 'احترافي',    users: 15, items: 5000,  orders: 10000,  price: 249 },
  { code: 'enterprise', label: 'مؤسسي',      users: 50, items: 50000, orders: 100000, price: 599 },
];

export default function SuperAdminSettingsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const usdtWallet = process.env.NEXT_PUBLIC_USDT_WALLET ?? '';
  const usdtConfigured = !!usdtWallet;

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseClient();

      // ── Stats — parallel head-only counts (no rows fetched) ──────────────
      const [tenantsAll, tenantsActive, tenantsPending, tenantsSuspended,
        usersAll, paymentsPending, paymentsApproved] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('subscription_payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('subscription_payments').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      setStats({
        tenants_total:     tenantsAll.count       ?? 0,
        tenants_active:    tenantsActive.count    ?? 0,
        tenants_pending:   tenantsPending.count   ?? 0,
        tenants_suspended: tenantsSuspended.count ?? 0,
        users_total:       usersAll.count         ?? 0,
        payments_pending:  paymentsPending.count  ?? 0,
        payments_approved: paymentsApproved.count ?? 0,
      });

      // ── Recent audit log (audit_log is new — bypass type narrowing) ──────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: auditData } = await (supabase as any)
        .from('audit_log')
        .select('id, actor_role, action, target_type, target_id, payload, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      setAudit((auditData ?? []) as AuditEntry[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div dir="rtl" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            الإعدادات
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            إعدادات النظام والإحصائيات العامة
          </p>
        </div>
      </header>

      {/* ── Payment configuration ─────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E5302A]/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#E5302A]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">إعدادات الدفع</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">عناوين المحافظ ومزوّدي الدفع</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#2C2C2E]/40">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">محفظة USDT (TRC-20)</p>
              {usdtConfigured ? (
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 break-all">
                  {usdtWallet}
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  غير مضبوطة — خيار USDT مخفي من صفحة الدفع تلقائياً. أضف
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#3a3a3c] font-mono">NEXT_PUBLIC_USDT_WALLET</code>
                  في Vercel ثم أعد النشر.
                </p>
              )}
            </div>
            {usdtConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
          </div>
        </div>
      </section>

      {/* ── Plan reference ────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">الباقات وحدودها</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">حدود افتراضية — يمكن تخصيصها لكل متجر من صفحة المتاجر</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2C2C2E]">
                <th className="text-right p-3 font-semibold">الباقة</th>
                <th className="text-right p-3 font-semibold">السعر شهرياً</th>
                <th className="text-right p-3 font-semibold">المستخدمين</th>
                <th className="text-right p-3 font-semibold">المنتجات</th>
                <th className="text-right p-3 font-semibold">الطلبات/شهر</th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map(p => (
                <tr key={p.code} className="border-b border-slate-100 dark:border-[#2C2C2E]/50">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.label}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{p.price === 0 ? 'مجاناً' : `${p.price.toLocaleString('ar-LY')} د.ل`}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{p.users}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{p.items.toLocaleString()}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{p.orders.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── System stats ──────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">إحصائيات النظام</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">نظرة سريعة على الحالة الحالية</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-[#2C2C2E]/40 animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Store}      label="إجمالي المتاجر"      value={stats.tenants_total}     color="slate" />
            <StatCard icon={CheckCircle2} label="متاجر فعّالة"        value={stats.tenants_active}    color="emerald" />
            <StatCard icon={AlertCircle} label="بانتظار الاعتماد"    value={stats.tenants_pending}   color="amber" />
            <StatCard icon={ShieldCheck} label="متاجر موقوفة"        value={stats.tenants_suspended} color="red" />
            <StatCard icon={Users}      label="المستخدمين"          value={stats.users_total}        color="blue" />
            <StatCard icon={CreditCard} label="مدفوعات قيد المراجعة" value={stats.payments_pending}  color="amber" />
            <StatCard icon={CheckCircle2} label="مدفوعات معتمدة"      value={stats.payments_approved} color="emerald" />
          </div>
        )}
      </section>

      {/* ── Audit log ─────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">آخر الأحداث</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">سجل قرارات السوبر أدمن والمهام التلقائية</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">جاري التحميل...</p>
        ) : audit.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            لا توجد أحداث مسجّلة بعد
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#2C2C2E]/50">
            {audit.map(e => (
              <div key={e.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {actionLabel(e.action)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {e.actor_role ?? 'system'}{e.target_type ? ` · ${e.target_type}` : ''}
                  </p>
                </div>
                <time className="text-xs text-slate-500 dark:text-slate-500 flex-shrink-0">
                  {new Date(e.created_at).toLocaleString('ar-LY')}
                </time>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Operations links ──────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">روابط تشغيلية</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <a href="/api/health" target="_blank" rel="noopener noreferrer"
             className="p-3 rounded-xl border border-slate-200 dark:border-[#2C2C2E] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/40 transition-colors">
            <p className="font-semibold text-slate-900 dark:text-white">فحص حالة النظام</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">/api/health</p>
          </a>
          <a href="https://supabase.com/dashboard/project/bleezrdtmthhvsrsvfmp" target="_blank" rel="noopener noreferrer"
             className="p-3 rounded-xl border border-slate-200 dark:border-[#2C2C2E] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/40 transition-colors">
            <p className="font-semibold text-slate-900 dark:text-white">لوحة Supabase</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">قاعدة البيانات، Auth، إعدادات الـ Email</p>
          </a>
          <a href="https://vercel.com/ahmed-yehias-projects-6d1847de/inventory-app" target="_blank" rel="noopener noreferrer"
             className="p-3 rounded-xl border border-slate-200 dark:border-[#2C2C2E] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/40 transition-colors">
            <p className="font-semibold text-slate-900 dark:text-white">لوحة Vercel</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">النشر، Env Vars، Cron Jobs</p>
          </a>
          <a href="https://faras-zv.sentry.io/projects/inventory-app/" target="_blank" rel="noopener noreferrer"
             className="p-3 rounded-xl border border-slate-200 dark:border-[#2C2C2E] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/40 transition-colors">
            <p className="font-semibold text-slate-900 dark:text-white">Sentry — تتبع الأخطاء</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">قائمة الأخطاء والتنبيهات</p>
          </a>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'slate' | 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const colorMap: Record<typeof color, string> = {
    slate:   'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red:     'bg-red-500/10 text-red-600 dark:text-red-400',
    blue:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#2C2C2E]/40">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value.toLocaleString('ar-LY')}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'payment.approve':    'تم اعتماد دفعة اشتراك',
    'payment.reject':     'تم رفض دفعة اشتراك',
    'tenant.approve':     'تمت الموافقة على متجر',
    'tenant.suspend':     'تم إيقاف متجر',
    'cron.sweep_expired': 'تشغيل تلقائي: إيقاف الاشتراكات المنتهية',
    'sweep.expired':      'إيقاف الاشتراكات المنتهية',
  };
  return map[action] ?? action;
}
