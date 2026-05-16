'use client';

/**
 * Billing Page — /billing
 * عرض الخطة الحالية، سجل المدفوعات، وترقية الاشتراك عبر Moyasar
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useTenant } from '@/lib/TenantContext';
import type { SubscriptionPayment } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  key: string;
  name: string;
  price: number;       // SAR per month; 0 = free
  description: string;
  features: string[];
  badge?: string;
}

const PLANS: Plan[] = [
  {
    key: 'trial',
    name: 'تجريبي',
    price: 0,
    description: 'مجاني لمدة 30 يومًا',
    features: ['حتى 3 مستخدمين', '500 صنف', '100 طلب/شهر'],
    badge: 'مجاني',
  },
  {
    key: 'starter',
    name: 'أساسي',
    price: 99,
    description: '99 ريال / شهر',
    features: ['حتى 10 مستخدمين', '5,000 صنف', '1,000 طلب/شهر', 'دعم عبر البريد'],
  },
  {
    key: 'pro',
    name: 'احترافي',
    price: 199,
    description: '199 ريال / شهر',
    features: ['مستخدمون غير محدودين', 'أصناف غير محدودة', 'طلبات غير محدودة', 'دعم أولوية', 'تقارير متقدمة'],
    badge: 'الأكثر شعبية',
  },
];

const PLAN_LABEL: Record<string, string> = {
  trial:      'تجريبي',
  starter:    'أساسي',
  pro:        'احترافي',
  enterprise: 'مؤسسي',
};

const STATUS_LABEL: Record<string, string> = {
  active:    'نشط',
  pending:   'معلق',
  suspended: 'موقوف',
  cancelled: 'ملغى',
};

// ── Moyasar global type ───────────────────────────────────────────────────────
declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });
}

function fmtCurrency(n: number, currency = 'SAR') {
  return `${n.toLocaleString('ar-SA')} ${currency}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid:       { label: 'مدفوع',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    captured:   { label: 'مؤكد',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    initiated:  { label: 'بدأ',      cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    authorized: { label: 'مخوَّل',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    failed:     { label: 'فشل',      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    refunded:   { label: 'مستردّ',   cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { tenant, tenantId, isLoading: tenantLoading } = useTenant();

  const [payments,        setPayments]        = useState<SubscriptionPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [showModal,       setShowModal]       = useState(false);
  const [selectedPlan,    setSelectedPlan]    = useState<Plan | null>(null);
  const [billingMonths,   setBillingMonths]   = useState(1);
  const [scriptLoaded,    setScriptLoaded]    = useState(false);
  const [formReady,       setFormReady]       = useState(false);
  const moyasarInitRef = useRef(false);

  // ── Load payment history ────────────────────────────────────────────────────
  const loadPayments = useCallback(async () => {
    if (!tenantId) return;
    setPaymentsLoading(true);
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setPayments(
        data.map((row) => ({
          id:            row.id,
          tenantId:      row.tenant_id,
          amount:        row.amount,
          currency:      row.currency,
          moyasarId:     row.moyasar_id ?? undefined,
          moyasarStatus: row.moyasar_status ?? undefined,
          plan:          row.plan,
          billingMonths: row.billing_months,
          description:   row.description ?? undefined,
          createdAt:     row.created_at,
          confirmedAt:   row.confirmed_at ?? undefined,
        }))
      );
    }
    setPaymentsLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // ── Load Moyasar script ─────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('moyasar-script')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id  = 'moyasar-script';
    script.src = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
    document.head.appendChild(link);
  }, []);

  // ── Init Moyasar when modal opens and script is ready ─────────────────────
  useEffect(() => {
    if (!showModal || !selectedPlan || !scriptLoaded || !formReady || !tenantId) return;
    if (moyasarInitRef.current) return;

    if (!window.Moyasar) return;

    moyasarInitRef.current = true;

    const totalAmount = selectedPlan.price * billingMonths;

    window.Moyasar.init({
      element:             '#moyasar-form',
      amount:              totalAmount * 100, // halalas
      currency:            'SAR',
      description:         `اشتراك ${selectedPlan.name} — ${billingMonths} ${billingMonths === 1 ? 'شهر' : 'أشهر'}`,
      publishable_api_key: process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY,
      callback_url:        `${window.location.origin}/billing/callback`,
      metadata: {
        tenant_id:      tenantId,
        plan:           selectedPlan.key,
        billing_months: String(billingMonths),
      },
      methods: ['creditcard', 'applepay', 'stcpay'],
    });
  }, [showModal, selectedPlan, scriptLoaded, formReady, billingMonths, tenantId]);

  // ── Open modal & reset Moyasar ─────────────────────────────────────────────
  function openModal(plan: Plan) {
    setSelectedPlan(plan);
    setBillingMonths(1);
    setFormReady(false);
    moyasarInitRef.current = false;
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedPlan(null);
    setFormReady(false);
    moyasarInitRef.current = false;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5302A]" />
      </div>
    );
  }

  const currentPlanKey   = tenant?.subscription_plan ?? 'trial';
  const currentPlanLabel = PLAN_LABEL[currentPlanKey] ?? currentPlanKey;
  const statusLabel      = STATUS_LABEL[tenant?.status ?? 'pending'] ?? tenant?.status;
  const isActive         = tenant?.status === 'active';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8" dir="rtl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">الفوترة والاشتراك</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">إدارة خطتك ومدفوعاتك</p>
      </div>

      {/* ── Current Plan ── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E5302A]/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-[#E5302A]" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">الخطة الحالية</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{currentPlanLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {isActive
                ? <CheckCircle className="w-4 h-4" />
                : <Clock className="w-4 h-4" />}
              {statusLabel}
            </span>

            {/* Upgrade button */}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#c72620] text-white rounded-xl text-sm font-medium transition-colors"
            >
              ترقية الاشتراك
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expiry */}
        {tenant?.subscription_ends_at && (
          <div className="mt-4 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4" />
            <span>
              ينتهي الاشتراك في:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {fmtDate(tenant.subscription_ends_at)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Payment History ── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E]">
        <div className="px-6 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">سجل المدفوعات</h2>
        </div>

        {paymentsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CreditCard className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">لا توجد مدفوعات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
            {payments.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#2C2C2E] flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {PLAN_LABEL[p.plan] ?? p.plan}
                      {p.billingMonths > 1 && ` — ${p.billingMonths} أشهر`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(p.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {fmtCurrency(p.amount, p.currency)}
                  </span>
                  {p.moyasarStatus && <PaymentStatusBadge status={p.moyasarStatus} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Plan Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">اختر خطتك</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Plan cards */}
              {!selectedPlan || selectedPlan.price === 0 ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.key}
                      onClick={() => {
                        if (plan.price === 0) return; // trial — no payment
                        openModal(plan);
                      }}
                      disabled={plan.price === 0}
                      className={`relative text-right p-4 rounded-xl border-2 transition-all ${
                        selectedPlan?.key === plan.key
                          ? 'border-[#E5302A] bg-[#E5302A]/5'
                          : 'border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#E5302A]/50'
                      } ${plan.price === 0 ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                    >
                      {plan.badge && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5302A] text-white">
                          {plan.badge}
                        </span>
                      )}
                      <p className="font-bold text-slate-900 dark:text-white">{plan.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                      <ul className="mt-3 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* If a paid plan is selected, show payment form */}
              {selectedPlan && selectedPlan.price > 0 && (
                <div className="space-y-4">
                  {/* Back to plan selection */}
                  <button
                    onClick={() => {
                      setSelectedPlan(null);
                      setFormReady(false);
                      moyasarInitRef.current = false;
                    }}
                    className="text-sm text-[#E5302A] hover:underline flex items-center gap-1"
                  >
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    تغيير الخطة
                  </button>

                  {/* Selected plan summary */}
                  <div className="bg-slate-50 dark:bg-[#2C2C2E] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedPlan.name}</p>
                      <p className="text-sm text-slate-500">{selectedPlan.price} ريال / شهر</p>
                    </div>
                    {/* Billing period selector */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600 dark:text-slate-400">المدة:</label>
                      <select
                        value={billingMonths}
                        onChange={(e) => {
                          setBillingMonths(Number(e.target.value));
                          setFormReady(false);
                          moyasarInitRef.current = false;
                        }}
                        className="text-sm border border-[#E5E5EA] dark:border-[#3C3C3E] rounded-lg px-2 py-1 bg-white dark:bg-[#1C1C1E] text-slate-800 dark:text-slate-200"
                      >
                        {[1, 3, 6, 12].map((m) => (
                          <option key={m} value={m}>
                            {m} {m === 1 ? 'شهر' : 'أشهر'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-slate-500">الإجمالي</span>
                    <span className="font-bold text-lg text-slate-900 dark:text-white">
                      {fmtCurrency(selectedPlan.price * billingMonths)}
                    </span>
                  </div>

                  {/* Moyasar payment form */}
                  <div
                    id="moyasar-form"
                    ref={() => {
                      if (!formReady) setFormReady(true);
                    }}
                    className="min-h-[200px]"
                  />

                  {!scriptLoaded && (
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-8">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري تحميل نموذج الدفع...
                    </div>
                  )}
                </div>
              )}

              {/* Initial state — show plan grid for selection */}
              {!selectedPlan && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {PLANS.filter((p) => p.price > 0).map((plan) => (
                    <button
                      key={plan.key}
                      onClick={() => openModal(plan)}
                      className="relative text-right p-4 rounded-xl border-2 border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#E5302A]/50 transition-all cursor-pointer"
                    >
                      {plan.badge && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5302A] text-white">
                          {plan.badge}
                        </span>
                      )}
                      <p className="font-bold text-slate-900 dark:text-white">{plan.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                      <ul className="mt-3 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-[#E5E5EA] dark:border-[#3C3C3E] text-center">
                        <span className="text-sm font-bold text-[#E5302A]">اشترك الآن</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Note about free trial */}
              <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-[#2C2C2E] rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  يتم تفعيل الاشتراك تلقائيًا بعد اكتمال الدفع. للتجربة المجانية يرجى التواصل مع الدعم.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
