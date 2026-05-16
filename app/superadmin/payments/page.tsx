'use client';

/**
 * Super Admin — Payments Review
 * /superadmin/payments
 * مراجعة طلبات الدفع (كاش / USDT) وقبولها أو رفضها
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string;
  tenant_id: string;
  plan: string;
  billing_months: number;
  amount: number;
  currency: string;
  payment_method: 'cash' | 'usdt';
  status: 'pending' | 'approved' | 'rejected';
  tx_hash: string | null;
  proof_notes: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const PLAN_LABEL: Record<string, string> = {
  trial:      'تجريبي',
  starter:    'أساسي',
  pro:        'احترافي',
  enterprise: 'مؤسسي',
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'الكل'    },
  { key: 'pending',  label: 'معلّق'   },
  { key: 'approved', label: 'موافق'   },
  { key: 'rejected', label: 'مرفوض'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(s: string, n = 14) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ── Small components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentRow['status'] }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:  { label: 'قيد المراجعة', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
    approved: { label: 'موافق عليه',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { label: 'مرفوض',        cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

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
      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#3C3C3E] transition-colors"
      title="نسخ"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-500" />
        : <Copy className="w-3.5 h-3.5 text-slate-400" />}
    </button>
  );
}

// ── Review Dialog ─────────────────────────────────────────────────────────────

interface ReviewDialogProps {
  payment: PaymentRow;
  action: 'approve' | 'reject';
  onClose: () => void;
  onDone: () => void;
}

function ReviewDialog({ payment, action, onClose, onDone }: ReviewDialogProps) {
  const [note,      setNote]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  async function submit() {
    if (action === 'reject' && !note.trim()) {
      setError('يرجى إدخال سبب الرفض');
      return;
    }

    setLoading(true);
    setError('');
    const supabase = getSupabaseClient();

    // 1. Update the payment record
    const { error: payErr } = await supabase
      .from('subscription_payments')
      .update({
        status:      action === 'approve' ? 'approved' : 'rejected',
        admin_notes: note.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (payErr) {
      setError('خطأ في تحديث السجل: ' + payErr.message);
      setLoading(false);
      return;
    }

    // 2. If approved: activate tenant subscription
    if (action === 'approve') {
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + payment.billing_months);

      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          status:               'active',
          subscription_plan:    payment.plan as 'trial' | 'starter' | 'pro' | 'enterprise',
          subscription_ends_at: endsAt.toISOString(),
        })
        .eq('id', payment.tenant_id);

      if (tenantErr) {
        setError('تم قبول الدفع لكن حدث خطأ في تحديث بيانات المتجر: ' + tenantErr.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onDone();
  }

  const isApprove = action === 'approve';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] w-full max-w-md shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className={`text-base font-bold ${isApprove ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isApprove ? '✅ تأكيد الموافقة' : '❌ تأكيد الرفض'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#2C2C2E]">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Payment summary */}
        <div className="bg-slate-50 dark:bg-[#2C2C2E] rounded-xl p-3 text-sm space-y-1">
          <p className="text-slate-600 dark:text-slate-400">
            المتجر: <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{truncate(payment.tenant_id, 20)}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            الخطة: <span className="font-medium text-slate-800 dark:text-slate-200">{PLAN_LABEL[payment.plan] ?? payment.plan}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            المبلغ: <span className="font-bold text-slate-900 dark:text-white">${payment.amount.toFixed(2)} {payment.currency}</span>
          </p>
          {payment.tx_hash && (
            <p className="text-slate-600 dark:text-slate-400">
              TX: <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{truncate(payment.tx_hash, 24)}</span>
            </p>
          )}
        </div>

        {/* Note field */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {isApprove ? 'ملاحظة (اختياري)' : 'سبب الرفض'}{!isApprove && <span className="text-[#E5302A]"> *</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={isApprove ? 'ملاحظة للمتجر...' : 'أدخل سبب الرفض...'}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#3C3C3E] bg-white dark:bg-[#2C2C2E] text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5302A]/30 focus:border-[#E5302A] resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2C2C2E] transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2 ${
              isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isApprove ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SuperAdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<FilterTab>('all');

  const [reviewTarget, setReviewTarget] = useState<{ payment: PaymentRow; action: 'approve' | 'reject' } | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPayments(data as PaymentRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const filtered = filter === 'all'
    ? payments
    : payments.filter((p) => p.status === filter);

  const counts = {
    all:      payments.length,
    pending:  payments.filter((p) => p.status === 'pending').length,
    approved: payments.filter((p) => p.status === 'approved').length,
    rejected: payments.filter((p) => p.status === 'rejected').length,
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">مراجعة المدفوعات</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          مراجعة طلبات الدفع اليدوي (كاش / USDT) وقبولها أو رفضها
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-[#E5302A] text-white'
                : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-slate-600 dark:text-slate-400 hover:border-[#E5302A]/50'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-[#2C2C2E] text-slate-500'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Clock className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">لا توجد طلبات دفع</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">المتجر</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">الخطة</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">المبلغ</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">الطريقة</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">TX Hash</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">ملاحظات المتجر</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/50 transition-colors">

                    {/* Tenant ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          {truncate(p.tenant_id, 12)}
                        </span>
                        <CopyButton text={p.tenant_id} />
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {PLAN_LABEL[p.plan] ?? p.plan}
                      {p.billing_months > 1 && (
                        <span className="text-slate-400 font-normal text-xs"> / {p.billing_months}م</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      ${p.amount.toFixed(2)}
                      <span className="text-xs font-normal text-slate-400 mr-0.5">{p.currency}</span>
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.payment_method === 'usdt' ? '🔐 USDT' : '💵 كاش'}
                    </td>

                    {/* TX Hash */}
                    <td className="px-4 py-3">
                      {p.tx_hash ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                            {truncate(p.tx_hash, 14)}
                          </span>
                          <CopyButton text={p.tx_hash} />
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Proof notes */}
                    <td className="px-4 py-3 max-w-[160px]">
                      {p.proof_notes ? (
                        <span
                          className="text-xs text-slate-600 dark:text-slate-400 truncate block"
                          title={p.proof_notes}
                        >
                          {p.proof_notes}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {fmtDate(p.created_at)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {p.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReviewTarget({ payment: p, action: 'approve' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            موافقة
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewTarget({ payment: p, action: 'reject' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {p.reviewed_at ? fmtDate(p.reviewed_at) : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review dialog */}
      {reviewTarget && (
        <ReviewDialog
          payment={reviewTarget.payment}
          action={reviewTarget.action}
          onClose={() => setReviewTarget(null)}
          onDone={() => {
            setReviewTarget(null);
            loadPayments();
          }}
        />
      )}
    </div>
  );
}
