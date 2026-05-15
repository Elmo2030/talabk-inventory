'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import TalabkLogo from '@/components/ui/TalabkLogo';

export default function ResetPasswordPage() {
  const router   = useRouter();
  const supabase = getSupabaseClient();

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
        // Check if super_admin to redirect correctly
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (!session) { router.push('/login'); return; }
          const { data: profile } = await supabase
            .from('user_profiles').select('role').eq('id', session.user.id).single();
          const p = profile as unknown as { role: string } | null;
          router.push(p?.role === 'super_admin' ? '/superadmin' : '/login');
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
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center p-4 font-arabic" dir="rtl">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-[#E5302A] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">الرابط منتهي الصلاحية</h2>
          <p className="text-white/50 text-sm mb-6">رابط إعادة تعيين كلمة المرور منتهي أو تم استخدامه مسبقاً.</p>
          <Link href="/login" className="px-6 py-2.5 rounded-xl bg-[#E5302A] text-white text-sm font-semibold hover:bg-[#C42B24] transition-colors">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
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
          <h1 className="mt-5 text-2xl font-black text-white">إعادة تعيين كلمة المرور</h1>
          <p className="mt-1.5 text-sm text-white/40">طلبك — للمتاجر الإلكترونية</p>
        </div>

        <div className="bg-[#141820] border border-white/8 rounded-2xl p-7 shadow-2xl shadow-black/50">

          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">تم تغيير كلمة المرور</h3>
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
