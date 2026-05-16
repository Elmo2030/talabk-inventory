'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, Package, Truck, ShieldCheck,
  ArrowLeft, Star, ChevronDown,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import TalabkLogo from '@/components/ui/TalabkLogo';

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

// ── FAQ Accordion Item ────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#141820] border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-right gap-3 hover:bg-white/3 transition-colors"
      >
        <span className="text-white text-sm font-medium leading-snug">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-white/50 text-sm leading-relaxed">{a}</p>
        </div>
      )}
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
              { n: '100%', label: 'عربي بالكامل' },
              { n: '71', label: 'مدينة ليبية' },
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

      {/* ── App Preview ──────────────────────────────────────────────────── */}
      <section className="pb-16 px-5">
        <div className="max-w-5xl mx-auto">
          {/* Browser chrome */}
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
            {/* Browser bar */}
            <div className="bg-[#1a1d26] px-4 py-3 flex items-center gap-3 border-b border-white/8">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 bg-white/5 rounded-lg px-3 py-1 text-xs text-white/30 text-center">
                talabk.ly/app/متجرك/dashboard
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="bg-[#0D1017] p-4 flex gap-3" style={{ minHeight: 280 }}>
              {/* Sidebar strip */}
              <div className="w-10 flex flex-col gap-2 pt-1">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className={`h-2 rounded-full ${i === 0 ? 'bg-[#E5302A] w-8' : 'bg-white/10 w-6'}`} />
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 flex flex-col gap-3">
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'الإيرادات', value: '84,500 د.ل', color: 'text-green-400' },
                    { label: 'صافي الربح', value: '23,200 د.ل', color: 'text-emerald-400' },
                    { label: 'قيمة المخزون', value: '156,000 د.ل', color: 'text-blue-400' },
                    { label: 'الطلبات', value: '47', color: 'text-[#E5302A]' },
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
                      <p className="text-white/40 text-[9px] mb-1">{kpi.label}</p>
                      <p className={`font-bold text-sm ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                {/* Chart area */}
                <div className="flex gap-2 flex-1">
                  <div className="flex-1 bg-white/5 rounded-xl border border-white/8 p-3">
                    <p className="text-white/30 text-[9px] mb-2">المبيعات مقابل الأرباح</p>
                    <div className="flex items-end gap-1 h-16">
                      {[40,65,45,80,55,90,70,85,60,95,75,100].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-0.5 items-center">
                          <div className="w-full rounded-sm bg-[#E5302A]/60" style={{ height: `${h * 0.4}%` }} />
                          <div className="w-full rounded-sm bg-blue-500/40" style={{ height: `${h * 0.25}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-32 bg-white/5 rounded-xl border border-white/8 p-3 flex flex-col items-center justify-center gap-2">
                    <p className="text-white/30 text-[9px]">حالة الطلبات</p>
                    <div className="w-14 h-14 rounded-full border-4 border-[#E5302A]/60" style={{ background: 'conic-gradient(#E5302A 60%, #3B82F6 60% 80%, #10B981 80%)' }} />
                    <div className="space-y-1 w-full">
                      {[['مكتمل','#E5302A','60%'],['شحن','#3B82F6','20%'],['جديد','#10B981','20%']].map(([l,c,v])=>(
                        <div key={l} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                          <span className="text-white/30 text-[8px]">{l}</span>
                          <span className="text-white/50 text-[8px] mr-auto">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-white/25 text-xs mt-3">داشبورد حقيقي — كل ما تراه بياناتك الفعلية</p>
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

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-[#0D1017]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-1 h-8 bg-[#E5302A] inline-block ml-3 align-middle rounded-full" />
            <h2 className="text-2xl sm:text-3xl font-black text-white inline-block align-middle">
              كيف تبدأ؟
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'سجّل متجرك', desc: 'أكمل نموذج التسجيل واختر خطتك المناسبة في دقيقتين.' },
              { n: '02', title: 'انتظر الموافقة', desc: 'فريقنا يراجع طلبك ويرسل لك رابط تفعيل الحساب خلال 24 ساعة.' },
              { n: '03', title: 'ابدأ البيع', desc: 'أضف منتجاتك، سجّل طلباتك، وتابع أرباحك لحظياً من أي جهاز.' },
            ].map(s => (
              <div key={s.n} className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white/3 border border-white/6">
                <div className="text-5xl font-black text-[#E5302A]/20 mb-4 leading-none">{s.n}</div>
                <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-1 h-8 bg-[#E5302A] inline-block ml-3 align-middle rounded-full" />
            <h2 className="text-2xl sm:text-3xl font-black text-white inline-block align-middle">
              ماذا يقول أصحاب المتاجر؟
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                name: 'أحمد المنصوري',
                store: 'متجر الأناقة — طرابلس',
                text: 'قبل طلبك كنت أحسب أرباحي بالإكسل وكنت دايماً غلطان. الآن أشوف صافي ربحي لكل طلب فوراً.',
                avatar: 'أ',
              },
              {
                name: 'فاطمة الزروق',
                store: 'ستايل هوم — بنغازي',
                text: 'حاسبة الشحن وفّرت عليّ ساعات من الحسابات اليدوية. أنصح كل متجر ليبي باستخدام المنصة.',
                avatar: 'ف',
              },
              {
                name: 'يوسف الترهوني',
                store: 'تك زون — مصراتة',
                text: 'المخزون كان مشكلتي الأولى — الآن أعرف بالضبط متى أشتري وبكم. النظام سهّل حياتي.',
                avatar: 'ي',
              },
            ].map(t => (
              <div key={t.name} className="bg-[#141820] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-white/60 text-sm leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-[#E5302A] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">{t.name}</p>
                    <p className="text-white/35 text-xs">{t.store}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-[#0D1017]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-1 h-8 bg-[#E5302A] inline-block ml-3 align-middle rounded-full" />
            <h2 className="text-2xl sm:text-3xl font-black text-white inline-block align-middle">
              أسئلة شائعة
            </h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: 'هل يعمل النظام على الجوال؟',
                a: 'نعم، النظام متجاوب بالكامل ويعمل بسلاسة على الجوال والتابلت والكمبيوتر.',
              },
              {
                q: 'هل يمكنني تجربة النظام قبل الشراء؟',
                a: 'نعم، خطة "تجريبي" مجانية لمدة 14 يوماً دون الحاجة لبطاقة ائتمان.',
              },
              {
                q: 'كيف يحسب النظام تكلفة الشحن؟',
                a: 'يتكامل مع أسعار شركة طلبك الرسمية لـ 71 مدينة ليبية، ويحسب الوزن الحجمي مقابل الوزن الفعلي آلياً.',
              },
              {
                q: 'هل بياناتي آمنة؟',
                a: 'نعم، نستخدم Supabase مع تشفير كامل وعزل تام بين بيانات كل متجر (Row Level Security). لا يمكن لأي متجر الوصول لبيانات متجر آخر.',
              },
              {
                q: 'ماذا يحدث بعد انتهاء الخطة التجريبية؟',
                a: 'ستتلقى تنبيهاً قبل الانتهاء بـ 3 أيام. يمكنك الترقية لأي خطة أو التواصل معنا لتمديد التجربة.',
              },
            ].map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
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
          <div className="flex items-center gap-4 text-xs">
            <a href="/privacy" className="text-white/40 hover:text-white/80 transition-colors">سياسة الخصوصية</a>
            <a href="/terms"   className="text-white/40 hover:text-white/80 transition-colors">شروط الاستخدام</a>
          </div>
          <p className="text-white/30 text-xs">
            جميع الحقوق محفوظة © 2026 — صنع بواسطة{' '}
            <span className="text-[#E5302A]">talabk.ly</span>
          </p>
          <p className="text-white/40 text-xs w-full sm:w-auto text-center sm:text-right">
            📞 تواصل معنا: <a href="https://wa.me/218910000000" target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline">wa.me/218910000000</a>
          </p>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/218910000000"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#1da851] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 hover:shadow-[#25D366]/50 transition-all hover:scale-110"
        title="تواصل معنا على واتساب"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

    </div>
  );
}
