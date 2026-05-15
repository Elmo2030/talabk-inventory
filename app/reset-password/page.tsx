'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import TalabkLogo from '@/components/ui/TalabkLogo';

// ── Expired link screen with resend option ────────────────────────────────────
function ExpiredLinkScreen() {
  const supabase = getSupabaseClient();
  const [email,      setEmail]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [resendErr,  setResendErr]  = useState('');
  const [showForm,   setShowForm]   = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setResendErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?type=recovery` }
    );
    setSending(false);
    if (error) {
      setResendErr('فشل الإرسال، تأكد من البريد الإلكتروني وحاول مجدداً.');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center p-4 font-arabic" dir="rtl">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-[#E5302A]/15 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-[#E5302A]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">الرابط منتهي الصلاحية</h2>
        <p className="text-white/50 text-sm mb-6">
          رابط إعادة تعيين كلمة المرور منتهي أو تم استخدامه مسبقاً.
        </p>

        {sent ? (
          <div className="bg-[#141820] border border-white/8 rounded-2xl p-5 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-white font-semibold text-sm">تم إرسال رابط جديد!</p>
            <p className="text-white/40 text-xs mt-1">تحقق من بريدك الإلكتروني</p>
          </div>
        ) : showForm ? (
          <div className="bg-[#141820] border border-white/8 rounded-2xl p-5">
            <form onSubmit={handleResend} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setResendErr(''); }}
                  placeholder="أدخل بريدك الإلكتروني"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E5302A]/50 focus:ring-2 focus:ring-[#E5302A]/10 pr-4 pl-11"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              </div>
              {resendErr && (
                <p className="text-red-400 text-xs">{resendErr}</p>
              )}
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full py-2.5 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                ) : (
                  'إرسال رابط جديد'
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="w-full px-6 py-2.5 rounded-xl bg-[#E5302A] text-white text-sm font-semibold hover:bg-[#C42B24] transition-colors"
            >
              إرسال رابط جديد
            </button>
            <Link
              href="/login"
              className="w-full px-6 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        )}

        {!sent && (
          <Link href="/login" className="inline-block mt-4 text-white/30 text-xs hover:text-white/60 transition-colors">
            العودة لتسجيل الدخول
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main reset page (inner — uses useSearchParams, must be inside Suspense) ───
function ResetPasswordInner() {
  const router       = useRouter();
  const supabase     = getSupabaseClient();
  const searchParams = useSearchParams();
  const flowType     = searchParams.get('type'); // 'invite' | 'recovery' | null
  const isInvite     = flowType === 'invite';

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [errorMsg,        setErrorMsg]        = useState('');
  const [success,         setSuccess]         = useState(false);
  const [hasSession,      setHasSession]      = useState<boolean | null>(null);

  // Check that we actually have a session (the auth callback should have set it)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg('فشل تغيير كلمة المرور، حاول مجدداً');
        return;
      }
      setSuccess(true);
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (!session) { router.push('/login'); return; }
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, tenant_id')
            .eq('id', session.user.id)
            .single();
          if (profile?.role === 'super_admin') {
            router.push('/superadmin');
          } else if (profile?.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants').select('slug').eq('id', profile.tenant_id).single();
            router.push(tenant?.slug ? `/app/${tenant.slug}/dashboard` : '/login');
          } else {
            router.push('/login');
          }
        });
      }, 3000);
    } catch {
      setErrorMsg('حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  if (hasSession === null) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E5302A]/30 border-t-[#E5302A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasSession) {
    return <ExpiredLinkScreen />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-arabic"
      dir="rtl"
      style={{ background: 'radial-gradient(ellipse at top, #1a0a08 0%, #0A0C10 60%)' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <TalabkLogo size={52} />
          <h1 className="mt-5 text-2xl font-black text-white">
            {isInvite ? 'تعيين كلمة المرور' : 'إعادة تعيين كلمة المرور'}
          </h1>
          <p className="mt-1.5 text-sm text-white/40">
            {isInvite ? 'أنشئ كلمة مرور للدخول إلى حسابك' : 'طلبك — للمتاجر الإلكترونية'}
          </p>
        </div>

        <div className="bg-[#141820] border border-white/8 rounded-2xl p-7 shadow-2xl shadow-black/50">

          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">
                {isInvite ? 'مرحباً بك! 🎉' : 'تم تغيير كلمة المرور'}
              </h3>
              <p className="text-white/50 text-sm">جاري تحويلك تلقائياً...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {errorMsg && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/60 border border-red-800/50 rounded-xl text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
                    placeholder="8 أحرف على الأقل"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-[#E5302A]/50 focus:ring-2 focus:ring-[#E5302A]/10 pl-11"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrorMsg(''); }}
                    placeholder="أعد كتابة كلمة المرور"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-[#E5302A]/50 focus:ring-2 focus:ring-[#E5302A]/10 pl-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length < 6 ? (i === 0 ? 'bg-red-500' : 'bg-white/10') :
                        password.length < 8 ? (i <= 1 ? 'bg-yellow-500' : 'bg-white/10') :
                        password.length < 12 ? (i <= 2 ? 'bg-blue-500' : 'bg-white/10') :
                        'bg-green-500'
                      }`}
                    />
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#E5302A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحفظ...
                  </span>
                ) : (
                  'حفظ كلمة المرور الجديدة'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          <Link href="/login" className="text-white/40 hover:text-white/70 transition-colors">
            العودة لتسجيل الدخول
          </Link>
        </p>

      </div>
    </div>
  );
}

// ── Page export wrapped in Suspense (required for useSearchParams) ────────────
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E5302A]/30 border-t-[#E5302A] rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
