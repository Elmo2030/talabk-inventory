'use client';

/**
 * /guide — Comprehensive user guide
 * Covers every feature added across the 4 premium refactor phases plus a
 * journey map that shows the typical path a new tenant takes from signup
 * through daily operation. RTL Arabic, sectioned, scannable.
 */

import Link from 'next/link';
import { whatsappLink } from '@/lib/brand';
import {
  BookOpen, Rocket, Sparkles, Package, Users, ShoppingCart, ShoppingBag,
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Warehouse, CalendarClock,
  RotateCcw, Tag, MessageSquare, BarChart2, FileText, Truck,
  Calculator, Settings, Store, CreditCard, LayoutDashboard, Command,
  Bell, AlertTriangle, ShieldCheck, Wifi, CheckCircle2, ArrowLeft,
  Eye, Search, Download, Upload, Smartphone,
} from 'lucide-react';

// ── Section heading ──────────────────────────────────────────────────────────
function SectionTitle({
  icon: Icon, title, subtitle, accent = '#E5302A',
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}15`, color: accent }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, description, href, badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  badge?: 'جديد' | 'محسّن';
}) {
  const inner = (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-4 h-full hover:border-[#E5302A]/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Icon className="w-5 h-5 text-[#E5302A] flex-shrink-0" />
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            badge === 'جديد'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>{badge}</span>
        )}
      </div>
      <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">{title}</h3>
      <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed">{description}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

// ── Journey step ─────────────────────────────────────────────────────────────
function JourneyStep({
  num, title, description, items, accent,
}: {
  num: number;
  title: string;
  description: string;
  items?: string[];
  accent: string;
}) {
  return (
    <div className="relative pr-12 pb-6 last:pb-0">
      <div
        className="absolute right-0 top-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ background: accent }}
      >
        {num}
      </div>
      {/* Vertical connector */}
      <div
        className="absolute right-[17px] top-9 bottom-0 w-px"
        style={{ background: `${accent}30` }}
      />
      <h3 className="text-base font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">{title}</h3>
      <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-2">
        {description}
      </p>
      {items && (
        <ul className="space-y-1 text-sm text-[#1C1C1E] dark:text-[#E4E4E7]">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Tip box ──────────────────────────────────────────────────────────────────
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-sm text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2 my-3">
      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ── Keyboard shortcut chip ───────────────────────────────────────────────────
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-[#F2F2F7] dark:bg-[#27272A] text-[#1C1C1E] dark:text-[#F4F4F5] border border-[#E5E5EA] dark:border-[#3F3F46] rounded">
      {children}
    </kbd>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function GuidePage() {
  return (
    <div dir="rtl" className="max-w-4xl mx-auto pb-12 space-y-10">

      {/* Hero */}
      <header className="bg-gradient-to-bl from-[#E5302A] to-[#C42B24] rounded-2xl text-white p-8 sm:p-10 shadow-lg shadow-[#E5302A]/20">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-2xl sm:text-3xl font-black">دليل المستخدم — طلبك 2026</h1>
        </div>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          كل ما تحتاج معرفته لإدارة متجرك من البداية للاحتراف.
          اقرأ الرحلة المنصوح بها للمتجر الجديد، أو انتقل مباشرةً للقسم الذي يهمك.
        </p>
        <nav className="mt-6 flex flex-wrap gap-2">
          {[
            ['#journey',  'رحلة المتجر'],
            ['#features', 'الميزات'],
            ['#shortcuts','الاختصارات'],
            ['#sa',       'للسوبر أدمن'],
            ['#faq',      'أسئلة شائعة'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            >
              {label} <ArrowLeft className="w-3 h-3" />
            </a>
          ))}
        </nav>
      </header>

      {/* ── 1. JOURNEY MAP ───────────────────────────────────────────────── */}
      <section id="journey" className="scroll-mt-8">
        <SectionTitle
          icon={Rocket}
          title="رحلة المتجر — من التسجيل إلى البيع الأول"
          subtitle="الخطوات الموصى بها للمتاجر الجديدة"
        />
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5 sm:p-6">
          <JourneyStep
            num={1}
            title="التسجيل والموافقة"
            description="املأ نموذج التسجيل في /register، اختر الباقة المناسبة، وانتظر مراجعة الإدارة."
            items={[
              'اسم المتجر، اسم صاحبه، البريد الإلكتروني، الهاتف (تنسيق ليبي: 09xxxxxxxx)',
              'وافق على شروط الاستخدام وسياسة الخصوصية',
              'تابع حالة طلبك عبر /register/status (يُحدّث تلقائياً كل 30 ثانية)',
              'سيصلك بريد التفعيل خلال 24 ساعة من الموافقة',
            ]}
            accent="#E5302A"
          />
          <JourneyStep
            num={2}
            title="تفعيل الحساب وتسجيل الدخول"
            description="اضغط رابط التفعيل، اضبط كلمة المرور، وادخل للمرة الأولى."
            items={[
              'استخدم كلمة مرور قوية (12 حرفاً مع تنوع — مؤشر القوة سيرشدك)',
              'بعد الدخول ستهبط مباشرة على لوحة التحكم تحت /app/<slug>/dashboard',
              'سترى قائمة "ابدأ متجرك في 4 خطوات" — اتبعها لتجهيز المتجر',
            ]}
            accent="#3B82F6"
          />
          <JourneyStep
            num={3}
            title="إعداد البيانات الأساسية"
            description="أضف الموردين، الأصناف، والمخزون الافتتاحي قبل البدء بالبيع."
            items={[
              'الموردين أولاً (/suppliers) — من تشتري منهم',
              'الأصناف (/items) — يمكن الاستيراد بـ CSV لـ 500 صنف دفعة واحدة',
              'المخزون الافتتاحي عبر /stock-in — حدّد الكميات الموجودة فعلياً',
              'اضبط الباركود والصور والأسعار في كل صنف',
            ]}
            accent="#22C55E"
          />
          <JourneyStep
            num={4}
            title="إعداد ملف المتجر والاشتراك"
            description="املأ بيانات المتجر العامة وفعّل الاشتراك."
            items={[
              '/store — اسم المتجر، الواتساب، الشبكات الاجتماعية (مع معاينة مباشرة)',
              '/settings — VAT (إن وُجد)، رقم تجاري، إعدادات الفواتير',
              '/billing — اختر الباقة وادفع كاش أو USDT (يظهر QR + رابط TronScan)',
            ]}
            accent="#F59E0B"
          />
          <JourneyStep
            num={5}
            title="بدء البيع اليومي"
            description="العمليات الأكثر تكراراً تأخذ ثوانٍ معدودة بفضل الميزات السريعة."
            items={[
              'طلب جديد عبر /orders/new — يُحفظ تلقائياً draft كل حركة',
              'تطبيق كوبون خصم وتحديد طريقة التوصيل (بيت/مكتب/نسائي)',
              'تحديث حالة الطلب من /delivery (Kanban بعمودين) — يتغير الحال فوراً',
              'تواصل مع العميل بضغطة على رمز الواتساب أو الهاتف',
            ]}
            accent="#A855F7"
          />
          <JourneyStep
            num={6}
            title="المراقبة والتحليل"
            description="راجع الأداء يومياً والاتجاهات الشهرية لاتخاذ قرارات صحيحة."
            items={[
              '/dashboard — إحصائيات اليوم + الـ 30 يوم الماضية',
              '/analytics — مقارنة سنوية (هذا الشهر vs نفس الشهر العام السابق)',
              '/reports — تقارير قابلة للتصدير بصيغة CSV',
              '/batches — تنبيهات صلاحية بـ 5 مستويات (منتهي/7/30/60/سليم)',
            ]}
            accent="#06B6D4"
          />
        </div>
      </section>

      {/* ── 2. FEATURES BY CATEGORY ──────────────────────────────────────── */}
      <section id="features" className="scroll-mt-8">
        <SectionTitle
          icon={Sparkles}
          title="جميع الميزات"
          subtitle="مرتّبة حسب القسم"
          accent="#A855F7"
        />

        <h3 className="text-sm font-bold text-[#6C6C70] dark:text-[#A1A1AA] uppercase tracking-wider mb-3">
          📦 المخزون
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <FeatureCard icon={Package} href="/items" title="الأصناف" description="إدارة المنتجات، الفئات، الباركود، المتغيّرات، تسعير الجملة، تصدير/استيراد CSV." />
          <FeatureCard icon={Users} href="/suppliers" title="الموردين" description="قاعدة بيانات الموردين مع عرض عدد الأصناف لكل مورد فوراً." badge="محسّن" />
          <FeatureCard icon={ShoppingCart} href="/purchases" title="فواتير الشراء" description="تسجيل فواتير الشراء وحساب التكلفة المتحركة تلقائياً." />
          <FeatureCard icon={ArrowDownToLine} href="/stock-in" title="إضافة مخزون" description="تسجيل وارد جديد. الأصناف المصنّعة (BOM) تخصم المكونات تلقائياً بالتوازي." badge="محسّن" />
          <FeatureCard icon={ArrowUpFromLine} href="/stock-out" title="صرف مخزون" description="تسجيل صرف مع منع الرصيد السالب وعرض الرصيد المتاح لحظياً." />
          <FeatureCard icon={BarChart3} href="/current-stock" title="المخزون الحالي" description="رؤية فورية للأرصدة بحالات: متوفر / منخفض / يحتاج طلب / منتهي." />
          <FeatureCard icon={Warehouse} href="/warehouses" title="المستودعات" description="إدارة مواقع التخزين والتحويل بين الفروع." />
          <FeatureCard icon={CalendarClock} href="/batches" title="الدفعات والصلاحية" description="تنبيهات صلاحية بـ 5 مستويات: منتهية/حرج 7 أيام/30 يوم/60 يوم/سليم." badge="محسّن" />
        </div>

        <h3 className="text-sm font-bold text-[#6C6C70] dark:text-[#A1A1AA] uppercase tracking-wider mb-3">
          🛒 المبيعات
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <FeatureCard icon={ShoppingBag} href="/orders/new" title="طلب بيع جديد" description="نموذج ذكي يحفظ مسوّدة الطلب تلقائياً، يطبّق الكوبونات والخصومات." badge="محسّن" />
          <FeatureCard icon={ShoppingBag} href="/orders" title="قائمة الطلبات" description="بحث وفلترة بحالة الطلب. تغيير الحالة يحدث في الواجهة فوراً (Optimistic UI)." badge="محسّن" />
          <FeatureCard icon={Truck} href="/delivery" title="لوحة التوصيل" description="Kanban بعمودين: قيد التجهيز / في الطريق. تواصل مباشر بضغطة." badge="جديد" />
          <FeatureCard icon={RotateCcw} href="/returns" title="المرتجعات" description="إدارة طلبات الإرجاع، الموافقة/الرفض، حساب المبلغ المسترد." />
          <FeatureCard icon={Tag} href="/coupons" title="الكوبونات" description="كوبونات ثابتة أو نسبة. تتبع الاستخدامات وتعطيل تلقائي عند الحد." />
          <FeatureCard icon={Users} href="/customers" title="العملاء" description="تجميع تلقائي للعملاء من الطلبات مع تحريك بصري سلس." badge="محسّن" />
          <FeatureCard icon={MessageSquare} href="/messages" title="قوالب الرسائل" description="قوالب جاهزة لواتساب — تأكيد، شحن، تسليم، تذكير دفع." />
        </div>

        <h3 className="text-sm font-bold text-[#6C6C70] dark:text-[#A1A1AA] uppercase tracking-wider mb-3">
          📊 التقارير والأدوات
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <FeatureCard icon={LayoutDashboard} href="/" title="لوحة التحكم" description="نظرة شاملة على KPIs، آخر 30 يوم، توزيع حالات الطلبات، وقائمة بدء سريعة." badge="محسّن" />
          <FeatureCard icon={BarChart2} href="/analytics" title="التحليلات المتقدمة" description="مقارنة شهرية وسنوية، أعلى المنتجات ربحاً، هوامش الربح، أهداف شهرية." badge="محسّن" />
          <FeatureCard icon={FileText} href="/reports" title="التقارير" description="تقارير قابلة للتصدير CSV: مخزون، مبيعات، أرباح، عملاء." />
          <FeatureCard icon={CalendarClock} href="/appointments" title="المواعيد" description="جدولة مواعيد العملاء — عرض قائمة أو تقويم شهري كامل." badge="جديد" />
          <FeatureCard icon={Calculator} href="/shipping-calculator" title="حاسبة الشحن" description="احسب تكلفة الشحن لـ 71 مدينة ليبية تكامل مع أسعار شركة طلبك." />
        </div>

        <h3 className="text-sm font-bold text-[#6C6C70] dark:text-[#A1A1AA] uppercase tracking-wider mb-3">
          ⚙️ الإعدادات والاشتراك
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <FeatureCard icon={Store} href="/store" title="ملف المتجر" description="بيانات المتجر العامة مع معاينة مباشرة لكيف يراها العملاء." badge="جديد" />
          <FeatureCard icon={Settings} href="/settings" title="الإعدادات" description="VAT، رقم تجاري، إعدادات الفواتير، اللغة." />
          <FeatureCard icon={CreditCard} href="/billing" title="الفواتير والاشتراك" description="ترقية الباقة، تاريخ المدفوعات، QR للمحفظة، رابط TronScan." badge="محسّن" />
        </div>
      </section>

      {/* ── 3. KEYBOARD SHORTCUTS ────────────────────────────────────────── */}
      <section id="shortcuts" className="scroll-mt-8">
        <SectionTitle
          icon={Command}
          title="الاختصارات والميزات السرية"
          subtitle="وفّر وقتك بهذه الحيل"
          accent="#3B82F6"
        />
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Search className="w-5 h-5 text-[#E5302A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">
                <Kbd>⌘</Kbd> <Kbd>K</Kbd> أو <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> — البحث السريع
              </p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
                من أي صفحة، اضغط هذا الاختصار لفتح لوحة البحث الشاملة.
                ابحث عن صفحة، صنف، طلب، أو عميل — وانتقل مباشرةً.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-[#E5302A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">مركز التنبيهات</p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
                الجرس في الأعلى يعرض تنبيهات المخزون الحرج والطلبات الجديدة.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Wifi className="w-5 h-5 text-[#E5302A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">شريط الاتصال</p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
                إذا فقدت الإنترنت سيظهر شريط أحمر يخبرك أن التغييرات قد لا تُحفظ.
                بمجرد عودة الاتصال يختفي الشريط تلقائياً.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#E5302A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">تنبيه انتهاء الاشتراك</p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
                شريط تحذير قبل 7 أيام من انتهاء الاشتراك مع زر مباشر للترقية.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-[#E5302A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">استيراد CSV للأصناف</p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
                صفحة /items فيها زر استيراد CSV — أضف 500 صنف دفعة واحدة.
                الأعمدة المطلوبة: code, name, category (اختياري: unit, purchase_price, selling_price, opening_qty …)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-[#E5302A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">تصدير CSV</p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
                نفس الصفحة لديها زر تصدير. التصدير بـ UTF-8 (BOM) يفتح بـ Excel مباشرةً بدون مشاكل عربية.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-[#E5302A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">دعم الجوال</p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
                كل الصفحات مُحسّنة للجوال. لوحة التوصيل بشكل خاص مُصممة للموبايل أولاً
                ليستخدمها المندوب أثناء التسليم.
              </p>
            </div>
          </div>
        </div>
        <Tip>
          ميزة <strong>Optimistic UI</strong>: عند تغيير حالة طلب أو إضافة صنف،
          الواجهة تتحدث فوراً قبل وصول الخادم. لو فشل الحفظ يتم التراجع تلقائياً.
        </Tip>
      </section>

      {/* ── 4. SUPER ADMIN SECTION ───────────────────────────────────────── */}
      <section id="sa" className="scroll-mt-8">
        <SectionTitle
          icon={ShieldCheck}
          title="للسوبر أدمن"
          subtitle="ميزات إدارة المنصة"
          accent="#0F172A"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FeatureCard icon={LayoutDashboard} href="/superadmin" title="لوحة الإدارة" description="نظرة شاملة على كل المتاجر مع مؤشرات تغيّر آخر 24 ساعة (↑↓)." badge="محسّن" />
          <FeatureCard icon={Store} href="/superadmin/tenants" title="إدارة المتاجر" description="بحث، فلترة، موافقة/رفض، تعليق، إعادة تفعيل." />
          <FeatureCard icon={CreditCard} href="/superadmin/payments" title="مراجعة المدفوعات" description="RPC ذرّي للموافقة/الرفض. روابط TronScan لكل TX." badge="محسّن" />
          <FeatureCard icon={BookOpen} href="/superadmin/audit" title="سجل الأحداث" description="تاريخ كامل لقرارات السوبر أدمن مع فلاتر وتصفّح." badge="جديد" />
          <FeatureCard icon={Settings} href="/superadmin/settings" title="إعدادات النظام" description="حالة المحفظة، الباقات، إحصائيات النظام، روابط تشغيلية." badge="جديد" />
        </div>
      </section>

      {/* ── 5. FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-8">
        <SectionTitle
          icon={BookOpen}
          title="أسئلة شائعة"
          accent="#10B981"
        />
        <div className="space-y-3">
          {FAQ.map((q, i) => (
            <details
              key={i}
              className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl px-5 py-3 group"
            >
              <summary className="cursor-pointer font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] text-sm marker:hidden flex items-center justify-between">
                {q.q}
                <ArrowLeft className="w-4 h-4 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed">
                {q.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="bg-[#F2F2F7] dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-6 text-center">
        <p className="text-sm text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">
          محتاج مساعدة أكثر؟
        </p>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1da851] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          تواصل عبر واتساب
        </a>
      </section>
    </div>
  );
}

// ── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ: { q: string; a: string }[] = [
  {
    q: 'كيف أبدأ كمتجر جديد؟',
    a: 'سجّل عبر /register، اختر الباقة، انتظر الموافقة (تتبع حالتك في /register/status). بعد التفعيل ادخل واتبع قائمة "ابدأ في 4 خطوات" في لوحة التحكم.',
  },
  {
    q: 'هل بياناتي معزولة عن باقي المتاجر؟',
    a: 'نعم تماماً. Row-Level Security على مستوى قاعدة البيانات يضمن أن أي متجر لا يستطيع رؤية بيانات متجر آخر. كل جدول حساس له سياسة عزل صارمة بـ tenant_id.',
  },
  {
    q: 'هل أستطيع استيراد بياناتي القديمة؟',
    a: 'نعم. /items فيها زر استيراد CSV. الأعمدة المطلوبة: code, name, category. الأعمدة الاختيارية: unit, purchase_price, selling_price, opening_qty, min_stock_level, reorder_level, location. ملف UTF-8 (BOM للعربية في Excel).',
  },
  {
    q: 'ماذا يحدث لو انتهى اشتراكي؟',
    a: 'قبل 7 أيام يظهر شريط تحذير. عند الانتهاء يتحول حالة المتجر إلى "موقوف" تلقائياً (في الساعة 3 صباحاً GMT). بياناتك تبقى محفوظة — جدّد الاشتراك في أي وقت لاستعادة الوصول الكامل.',
  },
  {
    q: 'كيف أدفع الاشتراك؟',
    a: 'في /billing اختر الباقة والمدة (شهر/3/6/12). للدفع: USDT (شبكة TRC-20 مع QR + رابط TronScan)، أو كاش (تواصل مع الدعم). الفواتير السنوية فيها خصومات حتى 20%.',
  },
  {
    q: 'هل المنصة آمنة لمعلومات عملائي؟',
    a: 'نعم. لا نخزّن بطاقات الدفع. كل البيانات محمية بـ HTTPS + Row-Level Security + JWT signed. الأخطاء يلتقطها Sentry بدون أي بيانات شخصية (مسح PII تلقائي).',
  },
  {
    q: 'هل يعمل البرنامج بدون إنترنت؟',
    a: 'لا، لأنه نظام متعدد المتاجر وقاعدة بياناته في السحابة. لكن إذا انقطع الإنترنت أثناء استخدامك ستظهر إشارة حمراء واضحة وستفقد التغييرات غير المحفوظة فقط.',
  },
  {
    q: 'هل البرنامج جوال-أولاً؟',
    a: 'كل الصفحات تعمل على الجوال. لوحة التوصيل (/delivery) مُصممة خصيصاً للجوال ليستخدمها المندوب بسهولة، مع روابط مباشرة للاتصال والواتساب.',
  },
  {
    q: 'كم متجر فرعي / مستودع يمكنني إدارته؟',
    a: 'باقة Starter: 5 مستخدمين. Pro: 15. Enterprise: غير محدود. كل الباقات تدعم مستودعات متعددة مع تحويلات بين الفروع.',
  },
  {
    q: 'هل يمكنني استرجاع اشتراكي؟',
    a: 'الاشتراك الشهري قابل للاسترداد كاملاً خلال 7 أيام من الدفع الأول، شرط عدم تجاوز 5 طلبات. التفاصيل في /terms#refund.',
  },
];
