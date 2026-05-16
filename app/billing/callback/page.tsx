'use client';

/**
 * Billing Callback Page — /billing/callback
 * Moyasar redirects here after payment with query params:
 *   ?id=...&status=paid|failed&message=...
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';

type PaymentResult = 'paid' | 'failed' | 'initiated' | 'authorized' | 'unknown';

const STATUS_CONFIG: Record<PaymentResult, {
  icon:    React.ReactNode;
  title:   string;
  message: string;
  color:   string;
}> = {
  paid: {
    icon:    <CheckCircle className="w-16 h-16 text-green-500" />,
    title:   'تم الدفع بنجاح!',
    message: 'شكرًا لك، تم تفعيل اشتراكك بنجاح. يمكنك الآن الاستمتاع بجميع ميزات خطتك.',
    color:   'text-green-600 dark:text-green-400',
  },
  authorized: {
    icon:    <Clock className="w-16 h-16 text-blue-500" />,
    title:   'جاري التحقق من الدفع',
    message: 'تمت عملية الدفع وهي قيد التحقق. سيتم تفعيل اشتراكك خلال دقائق قليلة.',
    color:   'text-blue-600 dark:text-blue-400',
  },
  initiated: {
    icon:    <Clock className="w-16 h-16 text-yellow-500" />,
    title:   'الدفع قيد المعالجة',
    message: 'تم استلام طلب الدفع وهو قيد المعالجة. يرجى الانتظار.',
    color:   'text-yellow-600 dark:text-yellow-400',
  },
  failed: {
    icon:    <AlertCircle className="w-16 h-16 text-red-500" />,
    title:   'فشل الدفع',
    message: 'لم تتم عملية الدفع بنجاح. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.',
    color:   'text-red-600 dark:text-red-400',
  },
  unknown: {
    icon:    <AlertCircle className="w-16 h-16 text-slate-400" />,
    title:   'حالة غير معروفة',
    message: 'تعذّر التحقق من حالة الدفع. يرجى التواصل مع الدعم.',
    color:   'text-slate-600 dark:text-slate-400',
  },
};

export default function BillingCallbackPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  const rawStatus = searchParams.get('status') ?? 'unknown';
  const paymentId = searchParams.get('id') ?? '';
  const message   = searchParams.get('message') ?? '';

  const status: PaymentResult = (
    ['paid', 'failed', 'initiated', 'authorized'].includes(rawStatus)
      ? rawStatus
      : 'unknown'
  ) as PaymentResult;

  const config = STATUS_CONFIG[status];

  useEffect(() => {
    // Brief delay to show loading state while Moyasar processes
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#E5302A]" />
          <p className="text-slate-500 dark:text-slate-400">جاري التحقق من حالة الدفع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" dir="rtl">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-8 max-w-md w-full text-center shadow-lg space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          {config.icon}
        </div>

        {/* Title */}
        <div>
          <h1 className={`text-2xl font-bold ${config.color}`}>{config.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">
            {config.message}
          </p>
        </div>

        {/* Error message from Moyasar */}
        {status === 'failed' && message && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 text-right">
            {decodeURIComponent(message)}
          </div>
        )}

        {/* Payment ID */}
        {paymentId && (
          <div className="bg-slate-50 dark:bg-[#2C2C2E] rounded-xl p-3 text-xs text-slate-400 text-right">
            <span className="font-medium">رقم العملية: </span>
            <span className="font-mono">{paymentId}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {status === 'failed' && (
            <Link
              href="/billing"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#E5302A] hover:bg-[#c72620] text-white rounded-xl text-sm font-medium transition-colors"
            >
              حاول مجددًا
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <Link
            href="/"
            className={`inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
              status === 'failed'
                ? 'bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#3C3C3E]'
                : 'bg-[#E5302A] hover:bg-[#c72620] text-white'
            }`}
          >
            {status === 'failed' ? 'الرجوع للرئيسية' : 'الذهاب للوحة التحكم'}
            <ArrowRight className="w-4 h-4" />
          </Link>

          {status !== 'failed' && (
            <Link
              href="/billing"
              className="text-sm text-slate-500 hover:text-[#E5302A] transition-colors"
            >
              عرض سجل المدفوعات
            </Link>
          )}
        </div>

        {/* Support note */}
        <p className="text-xs text-slate-400">
          هل تحتاج مساعدة؟ تواصل مع{' '}
          <a href="mailto:support@talabak.app" className="text-[#E5302A] hover:underline">
            الدعم الفني
          </a>
        </p>
      </div>
    </div>
  );
}
