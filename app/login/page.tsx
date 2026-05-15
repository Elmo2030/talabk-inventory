'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function TalabkLogo({ size = 56 }: { size?: number }) {
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

export default function LoginPage() {
  const router   = useRouter();
  const supabase = getSupabaseClient();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');

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

      const p = profile as unknown as { role: string; tenant_id: string | null } | null;

      if (p?.role === 'super_admin') {
        router.replace('/superadmin');
      } else if (p?.tenant_id) {
        // Get tenant slug
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug')
          .eq('id', p.tenant_id)
          .single();
        const t = tenant as unknown as { slug: string } | null;
        router.replace(t ? `/app/${t.slug}/dashboard` : '/');
      } else {
        router.replace('/');
      }
    });
  }, [supabase, router]);

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

      // Fetch profile to determine redirect
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('id', data.session.user.id)
        .single();

      const p = profile as unknown as { role: string; tenant_id: string | null } | null;

      if (p?.role === 'super_admin') {
        router.push('/superadmin');
      } else if (p?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug')
          .eq('id', p.tenant_id)
          .single();
        const t = tenant as unknown as { slug: string } | null;
        router.push(t ? `/app/${t.slug}/dashboard` : '/');
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
