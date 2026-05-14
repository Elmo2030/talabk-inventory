'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

function TalabkLogo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M28 2C13 2 2 13 2 26C2 40 13 52 21 61L28 69L35 61C43 52 54 40 54 26C54 13 43 2 28 2Z"
        fill="#E5302A"
      />
      <path
        d="M17 9C11 14 8 20 8 27C8 35 13 43 20 50"
        stroke="#C42B24"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
      <rect x="12" y="17" width="32" height="9" rx="3.5" fill="white" />
      <rect x="22" y="17" width="12" height="26" rx="3.5" fill="white" />
      <polygon points="28,69 22,60 34,60" fill="#E5302A" />
      <ellipse cx="28" cy="71" rx="8" ry="3" stroke="#E5302A" strokeWidth="1.8" fill="none" />
    </svg>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const { isSetupDone, initialized, setup } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirm?: string }>({});

  useEffect(() => {
    if (initialized && isSetupDone) {
      router.replace('/login');
    }
  }, [initialized, isSetupDone, router]);

  const passwordChecks = {
    length: password.length >= 6,
    hasLetter: /[a-zA-Z؀-ۿ]/.test(password),
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!username.trim()) newErrors.username = 'اسم المستخدم مطلوب';
    else if (username.trim().length < 3) newErrors.username = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
    if (!password) newErrors.password = 'كلمة المرور مطلوبة';
    else if (password.length < 6) newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (!confirmPassword) newErrors.confirm = 'تأكيد كلمة المرور مطلوب';
    else if (password !== confirmPassword) newErrors.confirm = 'كلمتا المرور غير متطابقتين';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await setup(username.trim(), password);
      router.push('/');
    } catch {
      setErrors({ password: 'حدث خطأ أثناء إنشاء الحساب، حاول مجدداً' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <TalabkLogo size={64} />
          <h1 className="mt-4 text-2xl font-bold text-[#1C1C1E]">مرحباً بك في طلبك</h1>
          <p className="mt-1 text-sm text-[#6C6C70] text-center">
            قم بإنشاء حساب المدير لحماية بياناتك
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                className={`w-full px-4 py-2.5 rounded-xl border text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all
                  ${errors.username
                    ? 'border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'
                    : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'
                  }`}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-[#E5302A]">{errors.username}</p>
              )}
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 rounded-xl border text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all pl-10
                    ${errors.password
                      ? 'border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'
                      : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6C6C70] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#E5302A]">{errors.password}</p>
              )}

              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center gap-1.5 text-xs ${passwordChecks.length ? 'text-green-600' : 'text-[#AEAEB2]'}`}>
                    {passwordChecks.length ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    6 أحرف على الأقل
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${passwordChecks.hasLetter ? 'text-green-600' : 'text-[#AEAEB2]'}`}>
                    {passwordChecks.hasLetter ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    يحتوي على حرف واحد على الأقل
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-[#6C6C70] mb-1.5">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 rounded-xl border text-[#1C1C1E] text-sm bg-white placeholder-[#AEAEB2] outline-none transition-all pl-10
                    ${errors.confirm
                      ? 'border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'
                      : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6C6C70] transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm && (
                <p className="mt-1 text-xs text-[#E5302A]">{errors.confirm}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] active:bg-[#B02520] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب والبدء'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#AEAEB2] mt-6">
          هذه البيانات محفوظة على جهازك فقط ولا تُرسل لأي خادم
        </p>
      </div>
    </div>
  );
}
