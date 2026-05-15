'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, Package, Truck, ShieldCheck,
  ArrowLeft, Star,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

// ── Logo ──────────────────────────────────────────────────────────────────────
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

// ── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, desc,
}: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="bg-[#141820] border border-white/5 rounded-2xl p-6 hover:border-[#E5302A]/30 transition-all hover:-translate-y-1 duration-300">
      <Icon className="w-7 h-7 text-[#E5302A] mb-4" />
      <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({
  name, price, features, highlight = false,
}: { name: string; price: string; features: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 border flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1
      ${highlight
        ? 'bg-[#E5302A] border-[#E5302A] shadow-lg shadow-[#E5302A]/20'
        : 'bg-[#141820] border-white/5 hover:border-white/20'}`}>
      <div>
        <p className={`text-sm font-semibold ${highlight ? 'text-white/80' : 'text-[#E5302A]'}`}>{name}</p>
        <p className={`text-3xl font-bold mt-1 ${highlight ? 'text-white' : 'text-white'}`}>{price}</p>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map(f => (
          <li key={f} className={`flex items-center gap-2 text-sm ${highlight ? 'text-white/90' : 'text-white/60'}`}>
            <Star className={`w-3.5 h-3.5 flex-shrink-0 ${highlight ? 'text-white' : 'text-[#E5302A]'}`} />
            {f}
          </li>
        ))}
      </ul>
      <Link href="/register"
        className={`w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-colors
          ${highlight
            ? 'bg-white text-[#E5302A] hover:bg-white/90'
            : 'bg-white/10 text-white hover:bg-white/20'}`}>
        ابدأ الآن
      </Link>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router   = useRouter();
  const supabase = getSupabaseClient();

  // If already logged in → redirect to the right place
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from('user_profiles').select('role, tenant_id').eq('id', session.user.id).single();
      const p = profile as unknown as { role: string; tenant_id: string | null } | null;
      if (p?.role === 'super_admin') { router.replace('/superadmin'); return; }
      if (p?.tenant_id) {
        const { data: t } = await supabase.from('tenants').select('slug').eq('id', p.tenant_id).single();
        const tenant = t as unknown as { slug: string } | null;
        if (tenant) { router.replace(`/app/${tenant.slug}/dashboard`); return; }
      }
    });
  }, [supabase, router]);

  return (
    <div className="min-h-screen bg-[#0A0C10] font-arabic" dir="rtl">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#0A0C10]/80">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TalabkLogo size={32} />
            <span className="text-white font-bold text-lg">طلبك</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="px-4 py-2 rounded-xl text-white/70 hover:text-white text-sm font-medium transition-colors">
              تسجيل الدخول
            </Link>
            <Link href="/register"
              className="px-4 py-2 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold transition-colors">
              تسجيل متجر جديد
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-5">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E5302A]/30 bg-[#E5302A]/10 text-[#E5302A] text-xs font-semibold mb-8">
            المنصة الرسمية للتجارة الإلكترونية
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-6">
            نظام{' '}
            <span className="text-[#E5302A]">المتجر الذكي</span>
            {' '}2026
          </h1>

          <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            الحل المتكامل لإدارة المبيعات، المخازن، واللوجستيات في ليبيا
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white font-bold text-base transition-all hover:scale-105 shadow-lg shadow-[#E5302A]/25">
              تسجيل متجر جديد
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/15 hover:border-white/30 text-white font-bold text-base transition-all hover:bg-white/5">
              تسجيل الدخول
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
            {[
              { n: '+500', label: 'متجر نشط' },
              { n: '+50K', label: 'طلب مُعالَج' },
              { n: '99.9%', label: 'وقت تشغيل' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.n}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-[#0D1017]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-1 h-8 bg-[#E5302A] inline-block ml-3 align-middle rounded-full" />
            <h2 className="text-2xl sm:text-3xl font-black text-white inline-block align-middle">
              لماذا تختار منصتنا؟
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FeatureCard
              icon={BarChart3}
              title="داشبورد احترافية"
              desc="رؤية شاملة لأرباحك الصافية، أداء شركات الشحن، والمنتجات الأكثر مبيعاً في ثوانٍ."
            />
            <FeatureCard
              icon={Package}
              title="إدارة المخزون المتقدمة"
              desc="تتبع رصيدك اللحظي، متوسط التكلفة الاستيرادية، وتنبيهات النفاذ قبل وقوعها."
            />
            <FeatureCard
              icon={Truck}
              title="حاسبة طلبك الذكية"
              desc="تكامل كامل مع أسعار شركة طلبك. احسب تكلفة الشحن والجمارك آلياً لكل طلب."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-1 h-8 bg-[#E5302A] inline-block ml-3 align-middle rounded-full" />
            <h2 className="text-2xl sm:text-3xl font-black text-white inline-block align-middle">
              خطط الأسعار
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <PlanCard name="تجريبي"   price="مجاناً"        features={['14 يوم', '2 مستخدمين', '50 صنف']} />
            <PlanCard name="مبتدئ"    price="99 د.ل/شهر"    features={['5 مستخدمين', '500 صنف', 'دعم بريد']} />
            <PlanCard name="احترافي"  price="249 د.ل/شهر"   features={['15 مستخدم', '5,000 صنف', 'API']} highlight />
            <PlanCard name="مؤسسي"   price="599 د.ل/شهر"   features={['غير محدود', 'نطاق مخصص', 'دعم أولوية']} />
          </div>
        </div>
      </section>

      {/* ── Security Badge ─────────────────────────────────────────────────── */}
      <section className="py-12 px-5 border-t border-white/5">
        <div className="max-w-xl mx-auto text-center">
          <ShieldCheck className="w-10 h-10 text-[#E5302A] mx-auto mb-3" />
          <p className="text-white/40 text-sm">
            بياناتك محمية بتشفير كامل وعزل تام بين المتاجر. لا مشاركة للبيانات أبداً.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <TalabkLogo size={24} />
            <span className="text-white/60 text-sm">طلبك</span>
          </div>
          <p className="text-white/30 text-xs">
            جميع الحقوق محفوظة © 2026 — صنع بواسطة{' '}
            <span className="text-[#E5302A]">talabk.ly</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
