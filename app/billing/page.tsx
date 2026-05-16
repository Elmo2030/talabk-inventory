'use client';

/**
 * Billing Page — /billing
 * عرض الخطة الحالية، سجل المدفوعات، وترقية الاشتراك عبر كاش أو USDT
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  Copy,
  Check,
  DollarSign,
  Lock,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useTenant } from '@/lib/TenantContext';
import type { SubscriptionPayment } from '@/lib/types';

// ── Plan definitions ──────────────────────────────────────────────────────────

interface PlanDef {
  key: string;
  name: string;
  pricePerMonth: number; // LYD (Libyan Dinar)
  description: string;
  features: string[];
  badge?: string;
}

const PLANS: PlanDef[] = [
  {
    key: 'starter',
    name: 'أساسي',
    pricePerMonth: 99,
    description: '99 د.ل / شهر',
    features: ['حتى 500 صنف', '500 طلب/شهر', '5 مستخدمين'],
  },
  {
    key: 'pro',
    name: 'احترافي',
    pricePerMonth: 249,
    description: '249 د.ل / شهر',
    features: ['حتى 5,000 صنف', '5,000 طلب/شهر', '15 مستخدم'],
    badge: 'الأكثر شعبية',
  },
  {
    key: 'enterprise',
    name: 'مؤسسي',
    pricePerMonth: 599,
    description: '599 د.ل / شهر',
    features: ['أصناف غير محدودة', 'طلبات غير محدودة', 'دعم أولوية'],
  },
];

const BILLING_PERIODS: { months: number; label: string; discount: number }[] = [
  { months: 1,  label: 'شهر واحد',   discount: 0  },
  { months: 3,  label: '3 أشهر',     discount: 5  },
  { months: 6,  label: '6 أشهر',     discount: 10 },
  { months: 12, label: '12 شهراً',   discount: 20 },
];

const PLAN_LABEL: Record<string, string> = {
  trial:      'تجريبي',
  starter:    'أساسي',
  pro:        'احترافي',
  enterprise: 'مؤسسي',
};

const STATUS_LABEL: Record<string, string> = {
  active:    'فعّال',
  pending:   'معلّق',
  suspended: 'موقوف',
  cancelled: 'ملغى',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-LY', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function calcAmount(plan: PlanDef, months: number): number {
  const period = BILLING_PERIODS.find((p) => p.months === months)!;
  const base   = plan.pricePerMonth * months;
  return parseFloat((base * (1 - period.discount / 100)).toFixed(2));
}

// ── Badges ────────────────────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status: SubscriptionPayment['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'قيد المراجعة', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    approved: { label: 'موافق عليه',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    rejected: { label: 'مرفوض',        cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#3C3C3E] transition-colors"
      title="نسخ"
    >
      {copied
        ? <Check className="w-4 h-4 text-green-500" />
        : <Copy className="w-4 h-4 text-slate-500" />}
    </button>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step, current }: { step: number; current: number }) {
  const done   = current > step;
  const active = current === step;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
      done   ? 'bg-[#E5302A] border-[#E5302A] text-white'
      : active ? 'border-[#E5302A] text-[#E5302A] bg-white dark:bg-[#1C1C1E]'
      :          'border-slate-300 text-slate-400 dark:border-[#3C3C3E] bg-white dark:bg-[#1C1C1E]'
    }`}>
      {done ? <Check className="w-3.5 h-3.5" /> : step}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type PaymentMethod = 'cash' | 'usdt';

export default function BillingPage() {
  const { tenant, tenantId, isLoading: tenantLoading } = useTenant();

  const [payments,        setPayments]        = useState<SubscriptionPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [showModal,       setShowModal]       = useState(false);

  // Modal wizard state
  const [step,          setStep]          = useState<1 | 2 | 3>(1);
  const [selectedPlan,  setSelectedPlan]  = useState<PlanDef | null>(null);
  const [billingMonths, setBillingMonths] = useState(1);
  // USDT payments are gated on having a wallet address configured.
  // When NEXT_PUBLIC_USDT_WALLET is empty, only cash is offered to avoid
  // taking a customer's TX hash with no destination address to verify.
  const usdtEnabled = !!process.env.NEXT_PUBLIC_USDT_WALLET;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    usdtEnabled ? 'usdt' : 'cash',
  );

  // Step 3 form
  const [txHash,      setTxHash]      = useState('');
  const [proofNotes,  setProofNotes]  = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  const walletAddress = process.env.NEXT_PUBLIC_USDT_WALLET ?? '';

  // ── Load payment history ──────────────────────────────────────────────────

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
          plan:          row.plan,
          billingMonths: row.billing_months,
          amount:        row.amount,
          currency:      row.currency,
          paymentMethod: row.payment_method as PaymentMethod,
          status:        row.status as SubscriptionPayment['status'],
          txHash:        row.tx_hash ?? undefined,
          proofNotes:    row.proof_notes ?? undefined,
          adminNotes:    row.admin_notes ?? undefined,
          reviewedAt:    row.reviewed_at ?? undefined,
          createdAt:     row.created_at,
        }))
      );
    }
    setPaymentsLoading(false);
  }, [tenantId]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openModal() {
    setStep(1);
    setSelectedPlan(null);
    setBillingMonths(1);
    setPaymentMethod(usdtEnabled ? 'usdt' : 'cash');
    setTxHash('');
    setProofNotes('');
    setSubmitting(false);
    setSubmitted(false);
    setSubmitError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  // ── Submit payment request ────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedPlan) return;

    if (paymentMethod === 'usdt' && !txHash.trim()) {
      setSubmitError('يرجى إدخال هاش المعاملة (TX Hash)');
      return;
    }
    if (paymentMethod === 'cash' && !proofNotes.trim()) {
      setSubmitError('يرجى إدخال ملاحظات تفاصيل الدفع');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/billing/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan:           selectedPlan.key,
          billing_months: billingMonths,
          payment_method: paymentMethod,
          tx_hash:        paymentMethod === 'usdt' ? txHash.trim() : null,
          proof_notes:    proofNotes.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json.error ?? 'حدث خطأ أثناء الإرسال، يرجى المحاولة مجدداً');
        return;
      }

      setSubmitted(true);
      loadPayments();
    } catch {
      setSubmitError('حدث خطأ في الاتصال، يرجى المحاولة مجدداً');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

  const finalAmount = selectedPlan ? calcAmount(selectedPlan, billingMonths) : 0;
  const period      = BILLING_PERIODS.find((p) => p.months === billingMonths)!;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8" dir="rtl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">الفوترة والاشتراك</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">إدارة خطتك ومدفوعاتك</p>
      </div>

      {/* ── Current Plan Card ── */}
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

            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#c72620] text-white rounded-xl text-sm font-medium transition-colors"
            >
              ترقية الاشتراك
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-6 py-3 text-right font-medium">الخطة</th>
                  <th className="px-6 py-3 text-right font-medium">المبلغ</th>
                  <th className="px-6 py-3 text-right font-medium">طريقة الدفع</th>
                  <th className="px-6 py-3 text-right font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {fmtDate(p.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {PLAN_LABEL[p.plan] ?? p.plan}
                      {p.billingMonths > 1 && (
                        <span className="text-slate-400 font-normal"> — {p.billingMonths} أشهر</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {p.amount.toLocaleString('ar-LY')} {p.currency === 'LYD' ? 'د.ل' : p.currency}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {p.paymentMethod === 'usdt' ? '🔐 USDT' : '💵 كاش'}
                    </td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Upgrade Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">ترقية الاشتراك</h2>
                {/* Step indicators */}
                <div className="hidden sm:flex items-center gap-2">
                  <StepIndicator step={1} current={step} />
                  <div className="w-6 h-0.5 bg-slate-200 dark:bg-[#3C3C3E]" />
                  <StepIndicator step={2} current={step} />
                  <div className="w-6 h-0.5 bg-slate-200 dark:bg-[#3C3C3E]" />
                  <StepIndicator step={3} current={step} />
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* ── STEP 1: اختر الخطة ── */}
              {step === 1 && (
                <>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    الخطوة 1 — اختر الخطة
                  </p>

                  {/* Plan cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    {PLANS.map((plan) => (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative text-right p-4 rounded-xl border-2 transition-all ${
                          selectedPlan?.key === plan.key
                            ? 'border-[#E5302A] bg-[#E5302A]/5'
                            : 'border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#E5302A]/50'
                        }`}
                      >
                        {plan.badge && (
                          <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5302A] text-white">
                            {plan.badge}
                          </span>
                        )}
                        <p className="font-bold text-slate-900 dark:text-white">{plan.name}</p>
                        <p className="text-lg font-bold text-[#E5302A] mt-1">{plan.pricePerMonth.toLocaleString('ar-LY')} <span className="text-xs font-normal text-slate-400">د.ل/شهر</span></p>
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

                  {/* Billing period */}
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">مدة الاشتراك</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {BILLING_PERIODS.map((p) => (
                        <button
                          key={p.months}
                          type="button"
                          onClick={() => setBillingMonths(p.months)}
                          className={`relative text-center py-3 px-2 rounded-xl border-2 transition-all text-sm ${
                            billingMonths === p.months
                              ? 'border-[#E5302A] bg-[#E5302A]/5 text-[#E5302A] font-semibold'
                              : 'border-[#E5E5EA] dark:border-[#2C2C2E] text-slate-600 dark:text-slate-400 hover:border-[#E5302A]/50'
                          }`}
                        >
                          {p.label}
                          {p.discount > 0 && (
                            <span className="absolute -top-2 -left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500 text-white">
                              وفّر {p.discount}%
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary & CTA */}
                  {selectedPlan && (
                    <div className="bg-slate-50 dark:bg-[#2C2C2E] rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500">الإجمالي</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {finalAmount.toLocaleString('ar-LY', { minimumFractionDigits: 2 })}
                          <span className="text-sm font-normal text-slate-500 mr-1">د.ل</span>
                        </p>
                        {period.discount > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            وفّرت {period.discount}% مقارنةً بالدفع الشهري
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E5302A] hover:bg-[#c72620] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        التالي
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: اختر طريقة الدفع ── */}
              {step === 2 && selectedPlan && (
                <>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    الخطوة 2 — اختر طريقة الدفع
                  </p>

                  {/* Plan recap */}
                  <div className="bg-slate-50 dark:bg-[#2C2C2E] rounded-xl p-3 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      {selectedPlan.name} — {period.label}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{finalAmount.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Cash */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-[#E5302A] bg-[#E5302A]/5'
                          : 'border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#E5302A]/50'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-3xl">
                        <DollarSign className="w-7 h-7 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-900 dark:text-white">💵 كاش</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          تواصل مع فريق الدعم لترتيب الدفع
                        </p>
                      </div>
                    </button>

                    {/* USDT — only shown when a wallet address is configured */}
                    {usdtEnabled && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('usdt')}
                        className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                          paymentMethod === 'usdt'
                            ? 'border-[#E5302A] bg-[#E5302A]/5'
                            : 'border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#E5302A]/50'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Lock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-900 dark:text-white">🔐 USDT (TRC-20)</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            تحويل مباشر للمحفظة
                          </p>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2C2C2E] transition-colors"
                    >
                      رجوع
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 py-2.5 bg-[#E5302A] hover:bg-[#c72620] text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      التالي
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP 3: تفاصيل الدفع ── */}
              {step === 3 && selectedPlan && (
                <>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    الخطوة 3 — تفاصيل الدفع
                  </p>

                  {/* Plan recap */}
                  <div className="bg-slate-50 dark:bg-[#2C2C2E] rounded-xl p-3 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      {selectedPlan.name} — {period.label} — {paymentMethod === 'usdt' ? 'USDT' : 'كاش'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{finalAmount.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل</span>
                  </div>

                  {submitted ? (
                    /* Success state */
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="w-9 h-9 text-green-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">تم الإرسال بنجاح</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          تم إرسال طلب الدفع، سيتم مراجعته خلال 24 ساعة
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-6 py-2.5 bg-[#E5302A] hover:bg-[#c72620] text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        إغلاق
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {paymentMethod === 'usdt' ? (
                        <>
                          {/* Wallet address + QR */}
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              عنوان المحفظة (TRC-20)
                            </p>
                            <div className="flex flex-col sm:flex-row items-start gap-3">
                              {walletAddress && (
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(walletAddress)}`}
                                  alt="QR code"
                                  width={120}
                                  height={120}
                                  className="rounded-xl border border-[#E5E5EA] dark:border-[#3C3C3E] bg-white p-1.5 flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 w-full space-y-2">
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3C3C3E] rounded-xl px-4 py-3">
                                  <span className="flex-1 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                                    {walletAddress}
                                  </span>
                                  <CopyButton text={walletAddress} />
                                </div>
                                <a
                                  href={`https://tronscan.org/#/address/${walletAddress}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  عرض على TronScan ↗
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-sm">
                            <span className="text-slate-600 dark:text-slate-400">المبلغ المطلوب</span>
                            <span className="font-bold text-blue-700 dark:text-blue-400">
                              {finalAmount.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل
                            </span>
                          </div>

                          {/* TX Hash */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              هاش المعاملة (TX Hash) <span className="text-[#E5302A]">*</span>
                            </label>
                            <input
                              type="text"
                              value={txHash}
                              onChange={(e) => setTxHash(e.target.value)}
                              placeholder="0x..."
                              dir="ltr"
                              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#3C3C3E] bg-white dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5302A]/30 focus:border-[#E5302A]"
                            />
                          </div>

                          {/* Optional notes */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              ملاحظات إضافية (اختياري)
                            </label>
                            <textarea
                              value={proofNotes}
                              onChange={(e) => setProofNotes(e.target.value)}
                              rows={2}
                              placeholder="أي ملاحظات تودّ إضافتها..."
                              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#3C3C3E] bg-white dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5302A]/30 focus:border-[#E5302A] resize-none"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Cash instructions */}
                          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>سيتواصل معك فريقنا خلال 24 ساعة لتأكيد الدفع وترتيب استلام المبلغ.</span>
                          </div>

                          {/* Notes / receipt */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              ملاحظات (رقم الإيصال، اسم المرسل، إلخ) <span className="text-[#E5302A]">*</span>
                            </label>
                            <textarea
                              value={proofNotes}
                              onChange={(e) => setProofNotes(e.target.value)}
                              rows={3}
                              placeholder="مثال: سأدفع نقداً في مكتب الرياض، اسمي محمد أحمد..."
                              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#3C3C3E] bg-white dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5302A]/30 focus:border-[#E5302A] resize-none"
                            />
                          </div>
                        </>
                      )}

                      {/* Error */}
                      {submitError && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {submitError}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          disabled={submitting}
                          className="flex-1 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2C2C2E] transition-colors disabled:opacity-50"
                        >
                          رجوع
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="flex-1 py-2.5 bg-[#E5302A] hover:bg-[#c72620] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                          إرسال طلب الدفع
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
