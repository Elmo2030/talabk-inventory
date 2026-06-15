'use client';

/**
 * New Tenant Registration — /register
 * Public-facing signup form. Inserts a registration_request row.
 * Super Admin reviews it from the dashboard before the tenant goes live.
 */

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { SubscriptionPlan } from '@/lib/types';

const PLANS: { plan: SubscriptionPlan; label: string; price: string; features: string[] }[] = [
  {
    plan: 'trial',
    label: 'تجريبي',
    price: 'مجاناً',
    features: ['14 يوم', 'مستخدمان', '50 صنف', '100 طلب شهرياً'],
  },
  {
    plan: 'starter',
    label: 'مبتدئ',
    price: '99 د.ل / شهر',
    features: ['5 مستخدمين', '500 صنف', '500 طلب شهرياً', 'دعم عبر البريد'],
  },
  {
    plan: 'pro',
    label: 'احترافي',
    price: '249 د.ل / شهر',
    features: ['15 مستخدم', '5,000 صنف', 'طلبات غير محدودة', 'API', 'تقارير متقدمة'],
  },
  {
    plan: 'enterprise',
    label: 'مؤسسي',
    price: '599 د.ل / شهر',
    features: ['مستخدمون غير محدودون', 'أصناف غير محدودة', 'نطاق مخصص', 'دعم أولوية'],
  },
];

function TalabkLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 72" fill="none">
      <path d="M28 2C13 2 2 13 2 26C2 40 13 52 21 61L28 69L35 61C43 52 54 40 54 26C54 13 43 2 28 2Z" fill="#E5302A" />
      <path d="M17 9C11 14 8 20 8 27C8 35 13 43 20 50" stroke="#C42B24" strokeWidth="5" strokeLinecap="round" opacity="0.55" fill="none" />
      <rect x="12" y="17" width="32" height="9" rx="3.5" fill="white" />
      <rect x="22" y="17" width="12" height="26" rx="3.5" fill="white" />
      <polygon points="28,69 22,60 34,60" fill="#E5302A" />
      <ellipse cx="28" cy="71" rx="8" ry="3" stroke="#E5302A" strokeWidth="1.8" fill="none" />
    </svg>
  );
}

export default function RegisterPage() {
  const [step,          setStep]          = useState<'form' | 'success'>('form');
  const [successMode,   setSuccessMode]   = useState<'pending_review' | 'auto_provisioned'>('pending_review');
  const [selectedPlan,  setSelectedPlan]  = useState<SubscriptionPlan>('starter');
  const [isLoading,     setIsLoading]     = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const [form, setForm] = useState({
    store_name: '',
    owner_name: '',
    email:      '',
    phone:      '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<Partial<typeof form> & { terms?: string }>({});

  const validate = () => {
    const e: Partial<typeof form> & { terms?: string } = {};
    if (!form.store_name.trim()) e.store_name = 'اسم المتجر مطلوب';
    else if (form.store_name.trim().length < 2) e.store_name = 'الاسم قصير جداً';
    if (!form.owner_name.trim()) e.owner_name = 'الاسم مطلوب';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'بريد إلكتروني صحيح مطلوب';
    // Libyan phone format (optional): +218XXXXXXXXX or 09XXXXXXXX
    if (form.phone.trim()) {
      const cleaned = form.phone.replace(/\s|-/g, '');
      if (!/^(\+218|00218|0)?9[1-5]\d{7}$/.test(cleaned))
        e.phone = 'رقم هاتف ليبي غير صالح (مثال: 0912345678)';
    }
    if (!acceptedTerms) e.terms = 'يجب الموافقة على الشروط للمتابعة';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrorMsg('');

    // POST to /api/register — server-side validation, rate limit, and
    // single chokepoint for future auto-provisioning.
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name:     form.store_name.trim(),
          owner_name:     form.owner_name.trim(),
          email:          form.email.trim().toLowerCase(),
          phone:          form.phone.trim() || null,
          requested_plan: selectedPlan,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setErrorMsg('تم تجاوز الحد المسموح من المحاولات. حاول بعد قليل.');
        } else if (data?.code === 'duplicate' || res.status === 409) {
          setErrorMsg(data?.error ?? 'هذا البريد الإلكتروني مسجل مسبقاً.');
        } else {
          setErrorMsg(data?.error ?? 'حدث خطأ أثناء الإرسال. حاول مجدداً أو تواصل معنا.');
        }
      } else {
        setSubmittedEmail(form.email.trim().toLowerCase());
        setSuccessMode(data?.mode === 'auto_provisioned' ? 'auto_provisioned' : 'pending_review');
        setStep('success');
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === 'success') {
    const isAuto = successMode === 'auto_provisioned';
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-[#1C1C1E] mb-3">
            {isAuto ? 'متجرك جاهز! 🎉' : 'تم استلام طلبك بنجاح! 🎉'}
          </h1>
          <p className="text-sm text-[#6C6C70] leading-relaxed mb-4">
            {isAuto ? (
              <>
                أرسلنا لك رابط التفعيل على: <strong>{submittedEmail}</strong>
                <br />
                افتح الرابط لتعيين كلمة المرور والدخول مباشرة.
              </>
            ) : (
              <>
                سنراجع طلبك <strong>خلال ساعات قليلة</strong> وسنرسل لك رابط تفعيل الحساب على:{' '}
                <strong>{submittedEmail}</strong>
              </>
            )}
          </p>

          {/* Info box */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 text-right">
            <p className="text-sm font-semibold text-indigo-700 mb-3">
              {isAuto ? 'الخطوات التالية:' : 'ماذا يحدث بعد ذلك؟'}
            </p>
            <ul className="space-y-2">
              {isAuto ? (
                <>
                  <li className="text-sm text-indigo-600">✉️ افتح بريدك الإلكتروني وابحث عن رسالة من طلبك</li>
                  <li className="text-sm text-indigo-600">🔐 اضغط الرابط وعيّن كلمة المرور</li>
                  <li className="text-sm text-indigo-600">🚀 ابدأ استخدام النظام فوراً — 14 يوم تجريبي</li>
                </>
              ) : (
                <>
                  <li className="text-sm text-indigo-600">💳 سنتواصل معك لاستلام الدفع</li>
                  <li className="text-sm text-indigo-600">✉️ بعد التأكيد ستصلك رسالة إيميل بالتفعيل</li>
                  <li className="text-sm text-indigo-600">🚀 تبدأ الاستخدام فوراً</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/register/status?email=${encodeURIComponent(submittedEmail)}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E5302A] text-white font-semibold text-sm hover:bg-[#C42B24] transition-colors"
            >
              تتبع حالة طلبك
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#E5E5EA] text-[#6C6C70] font-semibold text-sm hover:bg-[#F2F2F7] transition-colors"
            >
              الصفحة الرئيسية
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#AEAEB2]">
            تواصل معنا عبر WhatsApp إذا لم تصلك رسالة خلال ساعات قليلة
          </p>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F2F2F7] py-10 px-4">
      <div className="w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <TalabkLogo size={52} />
          <h1 className="mt-4 text-2xl font-bold text-[#1C1C1E]">سجّل متجرك في طلبك</h1>
          <p className="mt-1 text-sm text-[#6C6C70] text-center">
            انضم إلى المنصة الأمثل لإدارة المتاجر الإلكترونية
          </p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {PLANS.map(p => (
            <button
              key={p.plan}
              type="button"
              onClick={() => setSelectedPlan(p.plan)}
              className={`flex flex-col gap-2 p-4 rounded-2xl border text-right transition-all
                ${selectedPlan === p.plan
                  ? 'border-[#E5302A] bg-[#E5302A]/5 ring-2 ring-[#E5302A]/20'
                  : 'border-[#E5E5EA] bg-white hover:border-[#E5302A]/40'}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-base font-bold text-[#1C1C1E]">{p.label}</span>
                {selectedPlan === p.plan && (
                  <CheckCircle2 className="w-4 h-4 text-[#E5302A] flex-shrink-0 mt-0.5" />
                )}
              </div>
              <span className="text-xs font-semibold text-[#E5302A]">{p.price}</span>
              <ul className="space-y-1">
                {p.features.map(f => (
                  <li key={f} className="text-[11px] text-[#6C6C70] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#AEAEB2] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">
          {/* Process timeline */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            {/* Step 1 */}
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#E5302A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-xs text-[#6C6C70]">📝 أكمل بياناتك</span>
            </div>
            <span className="text-[#AEAEB2] text-xs">→</span>
            {/* Step 2 */}
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#E5302A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-xs text-[#6C6C70]">🔍 نراجع طلبك</span>
            </div>
            <span className="text-[#AEAEB2] text-xs">→</span>
            {/* Step 3 */}
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#E5302A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span className="text-xs text-[#6C6C70]">✉️ نرسل لك إيميل الدخول</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {errorMsg && (
              <div className="px-4 py-3 rounded-xl bg-[#E5302A]/10 border border-[#E5302A]/20 text-sm text-[#E5302A]">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Store name */}
              <div>
                <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">اسم المتجر *</label>
                <input
                  value={form.store_name}
                  onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))}
                  placeholder="متجر الأناقة"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[#1C1C1E] bg-white placeholder-[#AEAEB2] outline-none transition-all
                    ${errors.store_name ? 'border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20' : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'}`}
                />
                {errors.store_name && <p className="mt-1 text-xs text-[#E5302A]">{errors.store_name}</p>}
              </div>

              {/* Owner name */}
              <div>
                <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">اسم صاحب المتجر *</label>
                <input
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  placeholder="محمد الأمين"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[#1C1C1E] bg-white placeholder-[#AEAEB2] outline-none transition-all
                    ${errors.owner_name ? 'border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20' : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'}`}
                />
                {errors.owner_name && <p className="mt-1 text-xs text-[#E5302A]">{errors.owner_name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="owner@store.com"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[#1C1C1E] bg-white placeholder-[#AEAEB2] outline-none transition-all
                    ${errors.email ? 'border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20' : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'}`}
                />
                {errors.email && <p className="mt-1 text-xs text-[#E5302A]">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">رقم الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0912 345 678"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[#1C1C1E] bg-white placeholder-[#AEAEB2] outline-none focus:ring-2 transition-all ${
                    errors.phone
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-[#E5302A]/20'
                  }`}
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Terms acceptance */}
            <div className="space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#E5E5EA] text-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
                />
                <span className="text-xs text-[#6C6C70] leading-relaxed">
                  أوافق على{' '}
                  <Link href="/terms" target="_blank" className="text-[#E5302A] hover:underline font-medium">
                    شروط الاستخدام
                  </Link>
                  {' '}و{' '}
                  <Link href="/privacy" target="_blank" className="text-[#E5302A] hover:underline font-medium">
                    سياسة الخصوصية
                  </Link>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-red-600">{errors.terms}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] active:bg-[#B02520] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري إرسال الطلب...' : 'إرسال طلب التسجيل'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#AEAEB2] mt-6">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-[#E5302A] hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
