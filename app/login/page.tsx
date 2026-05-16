'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import TalabkLogo from '@/components/ui/TalabkLogo';

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = getSupabaseClient();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [capsLockOn,   setCapsLockOn]   = useState(false);

  // Surface auth-callback failures (e.g. expired recovery link) as a visible message.
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'auth_callback_failed') {
      const type = searchParams.get('type');
      setErrorMsg(
        type === 'recovery'
          ? 'انتهت صلاحية رابط إعادة تعيين كلمة المرور. اطلب رابطاً جديداً'
          : 'فشل التحقق من الرابط — قد يكون منتهياً أو مُستخدماً مسبقاً'
      );
    }
  }, [searchParams]);

  const [forgotMode,    setForgotMode]    = useState(false);
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotSent,    setForgotSent]    = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;

      // Check role and redirect accordingly
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'super_admin') {
        router.replace('/superadmin');
      } else if (profile?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug')
          .eq('id', profile.tenant_id)
          .single();
        router.replace(tenant?.slug ? `/app/${tenant.slug}/dashboard` : '/');
      } else {
        router.replace('/');
      }
    });
  }, [supabase, router]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      });

      if (error || !data.session) {
        // Differentiate common Supabase auth errors so the user knows
        // what to fix. We keep the wrong-credentials message intentionally
        // generic to avoid leaking which emails are registered (account
        // enumeration), but flag rate-limit / email-not-confirmed cases.
        const code = error?.message?.toLowerCase() ?? '';
        if (code.includes('rate') || code.includes('too many')) {
          setErrorMsg('محاولات كثيرة. حاول مرة أخرى بعد دقائق');
        } else if (code.includes('confirm') || code.includes('email not confirmed')) {
          setErrorMsg('الحساب غير مفعّل. افتح البريد لتأكيد البريد الإلكتروني');
        } else if (code.includes('disabled')) {
          setErrorMsg('الحساب موقوف. تواصل مع الدعم');
        } else {
          setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
        return;
      }

      // Fetch profile to determine redirect
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('id', data.session.user.id)
        .single();

      if (profile?.role === 'super_admin') {
        router.push('/superadmin');
      } else if (profile?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug')
          .eq('id', profile.tenant_id)
          .single();
        router.push(tenant?.slug ? `/app/${tenant.slug}/dashboard` : '/');
      } else {
        router.push('/');
      }
    } catch {
      setErrorMsg('حدث خطأ أثناء تسجيل الدخول، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <TalabkLogo size={64} />
          <h1 className="mt-4 text-2xl font-bold text-[#1C1C1E]">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-[#6C6C70]">طلبك — للمتاجر الإلكترونية</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">

          {forgotMode ? (
            /* ── Forgot-password panel ── */
            forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="text-sm text-[#1C1C1E] leading-relaxed">
                  أُرسل لك رابط إعادة تعيين كلمة المرور، تحقق من بريدك الإلكتروني
                </p>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}
                  className="text-sm text-[#E5302A] hover:underline"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <h2 className="text-base font-semibold text-[#1C1C1E]">إعادة تعيين كلمة المرور</h2>

                <div>
                  <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="example@email.com"
                    autoComplete="email"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? 'جاري الإرسال...' : 'إرسال الرابط'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setForgotEmail(''); }}
                    className="text-sm text-[#E5302A] hover:underline"
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            )
          ) : (
            /* ── Normal login form ── */
            <form onSubmit={handleSubmit} className="space-y-5">

              {errorMsg && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-[#E5302A]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                  placeholder="example@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
                    onKeyDown={e => setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'))}
                    onKeyUp={e => setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'))}
                    placeholder="أدخل كلمة المرور"
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6C6C70]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    ⚠️ مفتاح Caps Lock مفعّل
                  </p>
                )}
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs text-[#E5302A] hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </button>
            </form>
          )}

        </div>

        <p className="text-center text-xs text-[#AEAEB2] mt-6">
          متجر جديد؟{' '}
          <Link href="/register" className="text-[#E5302A] hover:underline">
            سجّل متجرك
          </Link>
        </p>

      </div>
    </div>
  );
}
