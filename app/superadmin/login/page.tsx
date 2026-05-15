'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, ShieldCheck, Lock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import TalabkLogo from '@/components/ui/TalabkLogo';

export default function SuperAdminLoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = getSupabaseClient();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');

  const [forgotMode,    setForgotMode]    = useState(false);
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotSent,    setForgotSent]    = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Redirect if already logged in as super_admin
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      const p = profile as unknown as { role: string } | null;
      if (p?.role === 'super_admin') {
        const redirect = searchParams.get('redirect') ?? '/superadmin';
        router.replace(redirect);
      }
    });
  }, [supabase, router, searchParams]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: 'https://inventory-app-nine-lilac.vercel.app/auth/callback?type=recovery',
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
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        return;
      }

      // Verify super_admin role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      const p = profile as unknown as { role: string } | null;

      if (p?.role !== 'super_admin') {
        await supabase.auth.signOut();
        setErrorMsg('ليس لديك صلاحية الوصول إلى لوحة الإدارة');
        return;
      }

      const redirect = searchParams.get('redirect') ?? '/superadmin';
      router.push(redirect);
    } catch {
      setErrorMsg('حدث خطأ أثناء تسجيل الدخول، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-arabic"
      dir="rtl"
      style={{
        background: 'radial-gradient(ellipse at top, #1a0a08 0%, #0A0C10 60%)',
      }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(229,48,42,0.08) 0%, transparent 60%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {/* Shield icon above logo */}
          <div className="relative mb-1">
            <TalabkLogo size={56} />
            <div className="absolute -bottom-1 -left-1 bg-[#E5302A] rounded-full p-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <h1 className="mt-5 text-2xl font-black text-white tracking-tight">لوحة الإدارة</h1>
          <p className="mt-1.5 text-sm text-white/40">وصول المسؤولين فقط — طلبك</p>
        </div>

        {/* Card */}
        <div className="bg-[#141820] border border-white/8 rounded-2xl p-7 shadow-2xl shadow-black/50">

          {/* Restricted badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E5302A]/10 border border-[#E5302A]/20 mb-6">
            <Lock className="w-3.5 h-3.5 text-[#E5302A] flex-shrink-0" />
            <p className="text-xs text-[#E5302A]/90">منطقة مقيّدة — للمسؤولين فقط</p>
          </div>

          {forgotMode ? (
            /* ── Forgot-password panel ── */
            forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
                <p className="text-sm text-green-400 leading-relaxed">
                  أُرسل لك رابط إعادة تعيين كلمة المرور، تحقق من بريدك الإلكتروني
                </p>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <h2 className="text-base font-bold text-white">إعادة تعيين كلمة المرور</h2>

                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="admin@talabk.ly"
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-[#E5302A]/50 focus:ring-2 focus:ring-[#E5302A]/10 focus:bg-white/8"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#E5302A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? 'جاري الإرسال...' : 'إرسال الرابط'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setForgotEmail(''); }}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
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
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/60 border border-red-800/50 rounded-xl text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                  placeholder="admin@talabk.ly"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-[#E5302A]/50 focus:ring-2 focus:ring-[#E5302A]/10 focus:bg-white/8"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-[#E5302A]/50 focus:ring-2 focus:ring-[#E5302A]/10 focus:bg-white/8 pl-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="flex justify-start">
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
                className="w-full py-3 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#E5302A]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري التحقق...
                  </span>
                ) : (
                  'دخول لوحة الإدارة'
                )}
              </button>
            </form>
          )}

        </div>

        {/* Back to store login */}
        <p className="text-center text-xs text-white/20 mt-6">
          هل أنت صاحب متجر؟{' '}
          <Link href="/login" className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">
            تسجيل دخول المتاجر
          </Link>
        </p>

      </div>
    </div>
  );
}
