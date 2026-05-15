'use client';

/**
 * /register/status — يتحقق المستخدم من حالة طلب تسجيله بإدخال بريده الإلكتروني
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Clock, CheckCircle2, XCircle, Search,
  Mail, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import TalabkLogo from '@/components/ui/TalabkLogo';
import type { RegStatus, SubscriptionPlan } from '@/lib/types';

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  trial:      'تجريبي',
  starter:    'مبتدئ',
  pro:        'احترافي',
  enterprise: 'مؤسسي',
};

type RequestResult = {
  store_name: string;
  owner_name: string;
  requested_plan: SubscriptionPlan;
  status: RegStatus;
  created_at: string;
  reviewed_at?: string;
};

export default function RegisterStatusPage() {
  const supabase     = getSupabaseClient();
  const searchParams = useSearchParams();

  const [email,      setEmail]      = useState(searchParams.get('email') ?? '');
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [result,     setResult]     = useState<RequestResult | null>(null);
  const [notFound,   setNotFound]   = useState(false);
  const [error,      setError]      = useState('');

  // Auto-search if email passed via URL
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      setEmail(urlEmail);
      // trigger search after mount
      setTimeout(() => {
        document.getElementById('status-form')?.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setNotFound(false);
    setResult(null);

    const { data, error: fetchErr } = await supabase
      .from('registration_requests')
      .select('store_name, owner_name, requested_plan, status, created_at, reviewed_at')
      .eq('email', email.trim().toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setLoading(false);
    setSearched(true);

    if (fetchErr) {
      setError('حدث خطأ أثناء البحث. حاول مجدداً.');
      return;
    }

    if (!data) {
      setNotFound(true);
      return;
    }

    setResult(data as RequestResult);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('ar-LY', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-arabic"
      dir="rtl"
      style={{ background: 'radial-gradient(ellipse at top, #1a0a08 0%, #0A0C10 60%)' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <TalabkLogo size={48} />
          <h1 className="mt-5 text-2xl font-black text-white">متابعة طلب التسجيل</h1>
          <p className="mt-1.5 text-sm text-white/40">أدخل بريدك الإلكتروني لمعرفة حالة طلبك</p>
        </div>

        {/* Search form */}
        <div className="bg-[#141820] border border-white/8 rounded-2xl p-7 shadow-2xl shadow-black/50">
          <form id="status-form" onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setSearched(false); }}
                  placeholder="owner@store.com"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-[#E5302A]/50 focus:ring-2 focus:ring-[#E5302A]/10 pl-11"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري البحث...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  تحقق من الحالة
                </>
              )}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 bg-red-950/60 border border-red-800/50 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Not found */}
          {searched && notFound && (
            <div className="mt-6 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-white/60 text-sm font-medium">لا يوجد طلب بهذا البريد الإلكتروني</p>
              <p className="text-white/30 text-xs mt-1">تأكد من البريد أو سجّل طلباً جديداً</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 mt-4 text-[#E5302A] text-sm hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                تسجيل متجر جديد
              </Link>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 space-y-4">
              {/* Status badge */}
              {result.status === 'pending' && (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mb-3">
                    <Clock className="w-8 h-8 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold text-white">طلبك قيد المراجعة</p>
                  <p className="text-white/40 text-sm mt-1">
                    يتم مراجعة الطلبات خلال <strong className="text-white/60">24-48 ساعة</strong>
                  </p>
                  <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-400 text-xs font-semibold">في انتظار الموافقة</span>
                  </div>
                </div>
              )}

              {result.status === 'approved' && (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-lg font-bold text-white">تمت الموافقة! 🎉</p>
                  <p className="text-white/40 text-sm mt-1">
                    تم إرسال رابط تفعيل حسابك على بريدك الإلكتروني
                  </p>
                  <Link
                    href="/login"
                    className="mt-4 px-6 py-2.5 rounded-xl bg-[#E5302A] text-white text-sm font-semibold hover:bg-[#C42B24] transition-colors"
                  >
                    تسجيل الدخول
                  </Link>
                </div>
              )}

              {result.status === 'rejected' && (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-3">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-lg font-bold text-white">لم يتم قبول الطلب</p>
                  <p className="text-white/40 text-sm mt-1">
                    تواصل معنا عبر WhatsApp لمعرفة السبب أو تقديم طلب جديد
                  </p>
                  <Link
                    href="/register"
                    className="mt-4 px-6 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                  >
                    تقديم طلب جديد
                  </Link>
                </div>
              )}

              {/* Request details */}
              <div className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/40">المتجر</span>
                  <span className="text-white font-medium">{result.store_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">المالك</span>
                  <span className="text-white/70">{result.owner_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">الخطة</span>
                  <span className="text-[#E5302A] font-semibold">{PLAN_LABELS[result.requested_plan]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">تاريخ الطلب</span>
                  <span className="text-white/70">{fmt(result.created_at)}</span>
                </div>
                {result.reviewed_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">تاريخ المراجعة</span>
                    <span className="text-white/70">{fmt(result.reviewed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-white/30">
          <Link href="/register" className="hover:text-white/60 transition-colors">تسجيل جديد</Link>
          <span>·</span>
          <Link href="/login" className="hover:text-white/60 transition-colors">تسجيل الدخول</Link>
          <span>·</span>
          <Link href="/" className="hover:text-white/60 transition-colors">الرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
