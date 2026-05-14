'use client';

import {
  BookOpen,
  Users,
  Package,
  ShoppingCart,
  ShoppingBag,
  Truck,
  BarChart3,
  FileText,
  Settings,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ChevronLeft,
  Star,
  Shield,
  TrendingUp,
  Calculator,
  Moon,
  Sun,
  Lock,
  Store,
} from 'lucide-react';

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, color = 'brand' }: {
  icon: React.ElementType;
  title: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    brand:  'bg-[#FEE2E2] text-[#E5302A] dark:bg-[#3F1212] dark:text-[#F87171]',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    amber:  'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    slate:  'bg-[#F2F2F7] text-[#6C6C70] dark:bg-[#27272A] dark:text-[#A1A1AA]',
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] ?? colors.brand}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-[#F4F4F5]">{title}</h2>
    </div>
  );
}

// ─── Step card ─────────────────────────────────────────────────────────────────
function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E5302A] text-white text-sm font-bold flex items-center justify-center mt-0.5">
        {num}
      </div>
      <div>
        <p className="font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] text-sm">{title}</p>
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Tip box ───────────────────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Note box ──────────────────────────────────────────────────────────────────
function Note({ text }: { text: string }) {
  return (
    <div className="flex gap-3 bg-[#FEF2F2] dark:bg-[#3F1212]/50 border border-[#FECACA] dark:border-[#7F1D1D] rounded-xl p-4">
      <AlertCircle className="w-5 h-5 text-[#E5302A] dark:text-[#F87171] flex-shrink-0 mt-0.5" />
      <p className="text-sm text-[#991B1B] dark:text-[#FCA5A5] leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Warning box ───────────────────────────────────────────────────────────────
function Warning({ text }: { text: string }) {
  return (
    <div className="flex gap-3 bg-red-100 dark:bg-red-950/60 border border-red-400 dark:border-red-700 rounded-xl p-4">
      <Shield className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed font-medium">{text}</p>
    </div>
  );
}

// ─── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-[#18181B] rounded-xl border border-[#E5E5EA] dark:border-[#27272A] p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] text-sm mb-1">{title}</p>
      <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── FAQ item ──────────────────────────────────────────────────────────────────
function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="border border-[#E5E5EA] dark:border-[#27272A] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F2F2F7] dark:bg-[#27272A]">
        <AlertCircle className="w-3.5 h-3.5 text-[#E5302A] dark:text-[#F87171] flex-shrink-0" />
        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{q}</p>
      </div>
      <div className="flex items-start gap-2 px-4 py-2.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">{a}</p>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6">

      {/* ══ 1. Hero ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-8 text-center">
        <div className="w-16 h-16 bg-[#FEE2E2] dark:bg-[#3F1212] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-[#E5302A] dark:text-[#F87171]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-2">دليل المستخدم الشامل</h1>
        <p className="text-[#6C6C70] dark:text-[#A1A1AA] text-sm leading-relaxed max-w-md mx-auto mb-4">
          كل ما تحتاج معرفته لإدارة مخزنك ومبيعاتك بكفاءة — من أول تسجيل دخول حتى تحليل الأرباح.
        </p>
        <span className="inline-block px-3 py-1 bg-[#E5302A] text-white text-xs font-bold rounded-full">
          النسخة 2.0
        </span>
      </div>

      {/* ══ 2. نظرة عامة ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={LayoutDashboard} title="نظرة عامة على ميزات النظام" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          النظام مصمم لإدارة كل دورة حياة المنتج — من الاستيراد حتى البيع وتحليل الأرباح.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <FeatureCard icon={LayoutDashboard} title="لوحة القيادة"      desc="KPIs والمبيعات والأرباح لحظياً"        color="bg-[#FEE2E2] dark:bg-[#3F1212] text-[#E5302A] dark:text-[#F87171]" />
          <FeatureCard icon={Store}           title="بيانات المتجر"     desc="معلومات المتجر وتسويقه والأمان"        color="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
          <FeatureCard icon={Users}           title="الموردين"          desc="إدارة موردي البضائع والتواصل"          color="bg-[#F2F2F7] dark:bg-[#27272A] text-[#6C6C70] dark:text-[#A1A1AA]" />
          <FeatureCard icon={Package}         title="الأصناف"           desc="كتالوج المنتجات وتكاليفها"            color="bg-[#F2F2F7] dark:bg-[#27272A] text-[#6C6C70] dark:text-[#A1A1AA]" />
          <FeatureCard icon={ShoppingCart}    title="فواتير المشتريات"  desc="استيراد بالتكاليف الفعلية والـMAC"    color="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
          <FeatureCard icon={ShoppingBag}     title="الطلبات والمبيعات" desc="نقطة بيع POS مع تحليل الربح"         color="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
          <FeatureCard icon={Truck}           title="حاسبة الشحن"      desc="71 مدينة ليبية وأسعار تلقائية"        color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
          <FeatureCard icon={BarChart3}       title="الرصيد الحالي"     desc="مستوى المخزون لحظياً بالألوان"        color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
          <FeatureCard icon={FileText}        title="سجل الوارد"        desc="حركات الاستلام اليدوية"               color="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
          <FeatureCard icon={FileText}        title="سجل الصادر"        desc="حركات الإصدار اليدوية"               color="bg-[#FEE2E2] dark:bg-[#3F1212] text-[#E5302A] dark:text-[#F87171]" />
          <FeatureCard icon={TrendingUp}      title="التقارير"          desc="5 تقارير تحليلية وإدارية"             color="bg-[#F2F2F7] dark:bg-[#27272A] text-[#6C6C70] dark:text-[#A1A1AA]" />
          <FeatureCard icon={Settings}        title="الإعدادات"         desc="تكوين النظام والقوائم"                color="bg-[#F2F2F7] dark:bg-[#27272A] text-[#6C6C70] dark:text-[#A1A1AA]" />
        </div>
      </div>

      {/* ══ 3. البداية السريعة ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={CheckCircle2} title="البداية السريعة — 5 خطوات فقط" color="green" />
        <div className="space-y-5 mb-5">
          <Step num={1} title="إنشاء الحساب وتسجيل الدخول"
            desc="أول مرة تفتح التطبيق ستُطلب منك إنشاء اسم مستخدم وكلمة مرور. بعد ذلك يمكنك الدخول في أي وقت." />
          <Step num={2} title="أكمل بيانات المتجر"
            desc='اذهب إلى «بيانات المتجر» وأدخل اسم متجرك ورقم هاتفك وواتساب وعنوانك وروابط التواصل الاجتماعي.' />
          <Step num={3} title="أضف الموردين"
            desc="اذهب إلى «الموردين» وأضف شركات وأشخاص التوريد. بدونهم لن تتمكن من إنشاء فواتير مشتريات." />
          <Step num={4} title="أضف الأصناف"
            desc="اذهب إلى «الأصناف» وأدخل كل منتج تبيعه مع كميته الافتتاحية وسعر الشراء والبيع." />
          <Step num={5} title="أنشئ أول طلب بيع"
            desc='اذهب إلى «الطلبات والمبيعات» واضغط «طلب جديد». أدخل بيانات العميل وأضف المنتجات واحفظ الطلب.' />
        </div>
        <Tip text="ابدأ دائماً بالموردين ثم الأصناف — هذا الترتيب مهم لأن الأصناف تحتاج مورداً وفواتير المشتريات تحتاج موردين وأصنافاً." />
      </div>

      {/* ══ 4. تسجيل الدخول والأمان ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={Lock} title="تسجيل الدخول والأمان" color="brand" />
        <div className="space-y-4 mb-5">
          <Step num={1} title="الإعداد الأول"
            desc="أول مرة تشغّل التطبيق ستُطلب منك إنشاء اسم مستخدم وكلمة مرور. اختر كلمة مرور قوية لا تقل عن 6 أحرف." />
          <Step num={2} title="صفحة تسجيل الدخول"
            desc="في كل مرة تفتح المتصفح تحتاج إلى إعادة الدخول — الجلسة تنتهي عند إغلاق المتصفح تلقائياً لحماية بياناتك." />
          <Step num={3} title="تسجيل الخروج"
            desc='زر «تسجيل الخروج» موجود في أسفل القائمة الجانبية. استخدمه دائماً عند مغادرة الجهاز.' />
          <Step num={4} title="تغيير اسم المستخدم أو كلمة المرور"
            desc='اذهب إلى «بيانات المتجر» وابحث عن قسم «الأمان» في أسفل الصفحة.' />
        </div>
        <Warning text="لا تشارك كلمة مرورك مع أحد. إذا نسيتها اتصل بالدعم الفني لإعادة تعيينها." />
      </div>

      {/* ══ 5. لوحة القيادة ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={LayoutDashboard} title="لوحة القيادة التنفيذية" color="brand" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          الصفحة الرئيسية تعطيك نظرة شاملة على أداء متجرك في لحظة واحدة.
        </p>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">بطاقات المؤشرات الأربع (KPIs):</p>
        <div className="space-y-2 mb-5">
          {[
            { t: 'إجمالي الإيرادات', d: 'مجموع قيمة الطلبات المكتملة (ما دفعه العملاء فعلياً).' },
            { t: 'صافي الربح', d: 'الإيرادات ناقص تكلفة البضائع (COGS) وتكاليف الشحن والتغليف على المتجر.' },
            { t: 'قيمة المخزون', d: 'مجموع تكلفة جميع الأصناف الموجودة حالياً (الكمية × متوسط التكلفة MAC).' },
            { t: 'الطلبات النشطة', d: 'عدد الطلبات في حالة «قيد المعالجة» أو «تم الشحن» — تحتاج متابعة.' },
          ].map((k) => (
            <div key={k.t} className="flex items-start gap-3 p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl">
              <ChevronLeft className="w-4 h-4 text-[#E5302A] dark:text-[#F87171] flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{k.t}: </span>
                <span className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">{k.d}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">الرسوم البيانية:</p>
        <div className="space-y-2 mb-5">
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">مخطط المساحة (آخر 30 يوم):</strong> يقارن المبيعات اليومية بصافي الربح — المسافة بين الخطين هي تكلفة البضائع.
          </div>
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">المخطط الدائري (الطلبات):</strong> توزيع حالات الطلبات (معلق / معالجة / شُحن / تم / ملغي).
          </div>
        </div>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">جداول لوحة القيادة:</p>
        <div className="space-y-2 mb-5">
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">أكثر 5 أصناف ربحية:</strong> قائمة بأعلى المنتجات مردوداً — يساعدك على التركيز في الترويج لها.
          </div>
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">تنبيهات نقص المخزون:</strong> أصناف وصلت للحد الأدنى أو نفدت — تصرف فوراً.
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl mb-4">
          <Moon className="w-5 h-5 text-[#6C6C70] dark:text-[#A1A1AA] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">تبديل الوضع الداكن / الفاتح</p>
            <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
              زر التبديل بين الوضع الداكن والفاتح موجود في الزاوية العلوية اليمنى من لوحة القيادة. اضغطه في أي وقت لتغيير مظهر التطبيق بالكامل.
            </p>
          </div>
        </div>
        <Tip text="بطاقات KPI تعكس الطلبات المكتملة فقط. الطلبات المعلقة لا تُحسب في الإيرادات حتى يتم تسليمها." />
      </div>

      {/* ══ 6. بيانات المتجر ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={Store} title="بيانات المتجر" color="purple" />
        <div className="space-y-4 mb-5">
          <Step num={1} title="معلومات المتجر الأساسية"
            desc="اسم المتجر، رقم الهاتف، رقم الواتساب، البريد الإلكتروني، والعنوان. هذه المعلومات تظهر في الفواتير والتقارير." />
          <Step num={2} title="روابط التواصل الاجتماعي"
            desc="أضف روابط صفحاتك على فيسبوك، انستقرام، تويتر، تيك توك، سناب شات، والموقع الإلكتروني." />
          <Step num={3} title="رقم المتجر الفريد"
            desc="كل متجر يحصل على رقم تعريفي فريد يبدأ من 101 يُولَّد تلقائياً — لا يمكن تغييره." />
          <Step num={4} title="تغيير اسم المستخدم أو كلمة المرور"
            desc='ابحث عن قسم «الأمان» في أسفل الصفحة. أدخل كلمة المرور الحالية ثم الكلمة الجديدة مرتين للتأكيد.' />
        </div>
        <Tip text="تأكد أن رقم الواتساب صحيح — بعض عملاء طلبك يستخدمونه للتواصل المباشر." />
      </div>

      {/* ══ 7. الموردون ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={Users} title="إدارة الموردين" color="slate" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          الموردون هم شركات أو أفراد يمدّونك بالبضائع. يجب إضافتهم قبل إنشاء أي فاتورة مشتريات.
        </p>
        <div className="space-y-4 mb-5">
          <Step num={1} title='اضغط "إضافة مورد جديد"'
            desc="الزر الأحمر في أعلى الصفحة." />
          <Step num={2} title="أدخل بيانات المورد"
            desc="الاسم (إلزامي)، الكود، نوع المنتج، الهاتف، البريد الإلكتروني، والعنوان." />
          <Step num={3} title="حدد شروط الدفع والتقييم"
            desc="شروط الدفع: عدد أيام الائتمان (0 = نقداً فوري). التقييم من 1 إلى 5 نجوم حسب موثوقية المورد وجودة بضاعته." />
          <Step num={4} title='اضغط "حفظ"'
            desc="يظهر المورد فوراً في القائمة ويمكن استخدامه في الفواتير." />
        </div>
        <div className="p-4 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl mb-4 text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
          <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">تعديل أو حذف مورد:</strong> اضغط أيقونة القلم في صف المورد للتعديل، أو أيقونة سلة المهملات للحذف. سيطلب النظام تأكيداً قبل الحذف.
        </div>
        <Warning text="لا يمكن حذف مورد مرتبط بفواتير موجودة — عدّل بياناته بدلاً من الحذف." />
      </div>

      {/* ══ 8. الأصناف ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={Package} title="إدارة الأصناف" color="slate" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          الصنف هو أي منتج في مخزنك. يجب إضافته أولاً قبل أي حركة مخزنية.
        </p>
        <div className="space-y-4 mb-5">
          <Step num={1} title="الحقول الأساسية"
            desc="الاسم، الكود، التصنيف، وحدة القياس، المورد الافتراضي، سعر الشراء، سعر البيع." />
          <Step num={2} title="الكمية الافتتاحية"
            desc="الكمية الموجودة في المخزن الآن. إذا بدأت من صفر أدخل 0. هذه هي نقطة البداية لحساب الرصيد." />
          <Step num={3} title="حدود التنبيه"
            desc="الحد الأدنى: عند الوصول إليه يصبح الوضع حرجاً. مستوى إعادة الطلب: الكمية التي تبدأ عندها في الطلب من المورد." />
          <Step num={4} title="موقع التخزين"
            desc="رف أو منطقة في المخزن — يساعدك على إيجاد الصنف بسرعة." />
        </div>
        <div className="p-4 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl mb-4">
          <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">حقل متوسط التكلفة المرجح (MAC)</p>
          <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            هذا الحقل يُحدَّث تلقائياً من قِبَل النظام في كل مرة تستلم فيها بضاعة عبر فاتورة مشتريات. لا تعدّله يدوياً — النظام يحسبه بدقة بناءً على التكاليف الفعلية.
          </p>
        </div>
        <Note text="الكمية الافتتاحية مهمة جداً. جرد مخزنك أولاً وأدخل الأرقام الصحيحة — الخطأ هنا سيؤثر على كل الأرقام اللاحقة." />
      </div>

      {/* ══ 9. فواتير المشتريات ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={ShoppingCart} title="فواتير المشتريات (متقدم)" color="blue" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          فاتورة المشتريات هي الطريقة الاحترافية لتسجيل البضاعة الواردة مع احتساب التكلفة الفعلية الكاملة بعد المصاريف.
        </p>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">ما هي التكلفة الفعلية للاستيراد (Landed Cost)؟</p>
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          عندما تستورد بضاعة، تكلفة الوحدة الحقيقية ليست فقط سعر الشراء — بل تشمل أيضاً: شحن دولي، شحن محلي، جمارك، رسوم تخليص، ومصاريف أخرى. النظام يوزع هذه التكاليف على الأصناف تلقائياً.
        </p>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">خطوات إنشاء فاتورة مشتريات:</p>
        <div className="space-y-4 mb-5">
          <Step num={1} title="أنشئ فاتورة جديدة"
            desc='اضغط «فاتورة جديدة». ستحصل على رقم تلقائي بصيغة PO-YYYY-NNNN. اختر المورد والتاريخ والعملة.' />
          <Step num={2} title="أضف الأصناف"
            desc="أضف كل صنف في الفاتورة مع الكمية وسعر الشراء من المورد." />
          <Step num={3} title="أدخل التكاليف المضافة (Landed Costs)"
            desc="أدخل: الشحن الدولي، الشحن المحلي، الجمارك، رسوم التخليص، ومصاريف أخرى. ستظهر في جدول المعاينة." />
          <Step num={4} title="اختر طريقة توزيع التكاليف"
            desc="اختر إحدى الطرق الثلاث لتوزيع المصاريف على الأصناف." />
          <Step num={5} title="راجع التكلفة الفعلية للوحدة"
            desc="جدول المعاينة يُظهر في الوقت الفعلي التكلفة الفعلية لكل وحدة بعد توزيع المصاريف." />
          <Step num={6} title='احفظ كـ"مسودة" أو "مؤكد"'
            desc="المسودة لا تُغيّر المخزون. المؤكد يعني أن الفاتورة صحيحة وجاهزة للاستلام." />
          <Step num={7} title='غيّر الحالة إلى "تم الاستلام"'
            desc="عندما تصل البضاعة فعلياً إلى مخزنك، غيّر حالة الفاتورة إلى «تم الاستلام». عندها فقط يتحدث المخزون وتُحسب تكاليف MAC الجديدة." />
        </div>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">طرق توزيع التكاليف الثلاث:</p>
        <div className="space-y-3 mb-5">
          {[
            {
              t: 'بالقيمة (موصى به)',
              d: 'تُوزَّع المصاريف بنسبة قيمة كل صنف من إجمالي الفاتورة. الصنف الأغلى يتحمل أكبر حصة. الأنسب للاستيراد التجاري.',
            },
            {
              t: 'بالكمية',
              d: 'تُوزَّع المصاريف بالتساوي على كل وحدة بغض النظر عن سعرها. مناسب عندما تكون كل وحدة لها نفس الحجم والوزن.',
            },
            {
              t: 'بالتساوي',
              d: 'تُقسَّم المصاريف الإجمالية بالتساوي على عدد أنواع الأصناف (بغض النظر عن الكمية أو القيمة).',
            },
          ].map((m) => (
            <div key={m.t} className="p-4 border border-[#E5E5EA] dark:border-[#27272A] rounded-xl">
              <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">{m.t}</p>
              <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA]">{m.d}</p>
            </div>
          ))}
        </div>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">معادلة متوسط التكلفة المرجح (MAC):</p>
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-3">
          في كل مرة تستلم بضاعة، يُعيد النظام حساب متوسط التكلفة المرجح (Moving Average Cost) باستخدام المعادلة:
        </p>
        <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3F3F46] rounded-xl p-4 mb-4 font-mono text-sm text-[#1C1C1E] dark:text-[#E4E4E7] leading-relaxed">
          <p className="mb-1">MAC الجديد = (الكمية الحالية × MAC الحالي + الكمية الواردة × التكلفة الفعلية)</p>
          <p className="mb-3 mr-16">÷ (الكمية الحالية + الكمية الواردة)</p>
          <div className="border-t border-[#E5E5EA] dark:border-[#3F3F46] pt-3 mt-2">
            <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] font-sans mb-2 font-semibold">مثال عملي:</p>
            <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] font-sans">المخزون الحالي: 100 وحدة بتكلفة 50 د.ل/وحدة</p>
            <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] font-sans">الوارد الجديد: 50 وحدة بتكلفة فعلية 60 د.ل/وحدة</p>
            <p className="mt-2 text-xs font-sans text-[#1C1C1E] dark:text-[#E4E4E7]">MAC الجديد = (100 × 50 + 50 × 60) ÷ (100 + 50)</p>
            <p className="text-xs font-sans text-[#1C1C1E] dark:text-[#E4E4E7] mr-28">= (5000 + 3000) ÷ 150</p>
            <p className="text-xs font-sans text-[#1C1C1E] dark:text-[#E4E4E7] mr-28">= 8000 ÷ 150</p>
            <p className="text-xs font-bold font-sans text-[#E5302A] dark:text-[#F87171] mr-28">= 53.33 د.ل/وحدة ✓</p>
          </div>
        </div>
        <Tip text="دائماً غيّر حالة الفاتورة إلى «تم الاستلام» فقط عندما تصل البضاعة فعلياً — هذه اللحظة هي التي يتحدث فيها المخزون وتُحسب تكاليف MAC." />
      </div>

      {/* ══ 10. الطلبات والمبيعات ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={ShoppingBag} title="إنشاء الطلبات والمبيعات (POS)" color="green" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          شاشة المبيعات تجمع بين إنشاء الطلب وحساب الشحن وتحليل الربح في مكان واحد. رقم الطلب تلقائي بصيغة SO-YYYY-NNNN.
        </p>
        <div className="space-y-4 mb-5">
          <Step num={1} title="بيانات العميل"
            desc="أدخل اسم العميل ورقم هاتفه. اختر المدينة من القائمة — هذا يزامن حاسبة الشحن تلقائياً." />
          <Step num={2} title="إضافة المنتجات للسلة"
            desc="ابحث عن الصنف وأضفه. يمكنك تعديل الكمية وسعر البيع لكل صنف مباشرة في السلة." />
          <Step num={3} title="ضبط أبعاد الطرد (للشحن)"
            desc="أدخل الطول والعرض والارتفاع بالسنتيمتر. النظام يحسب الوزن الحجمي (L×W×H÷5000) ويحدد سعر الشحن تلقائياً." />
          <Step num={4} title="تحديد من يدفع الشحن والتغليف"
            desc='في لوحة الملخص المالي، اضغط «على المتجر» أو «على العميل» لكل من الشحن والتغليف. هذا يحدد المبلغ الذي يدفعه العميل.' />
          <Step num={5} title="قراءة لوحة التحليل المالي"
            desc="تُظهر: إجمالي المنتجات، تكلفة البضائع (COGS)، هامش الربح الإجمالي، صافي الربح بعد مصاريف المتجر، ونسبة هامش الربح %." />
          <Step num={6} title="حفظ الطلب"
            desc="عند الحفظ، يُخصَم المخزون تلقائياً لكل صنف في السلة. لا حاجة لتسجيل سجل صادر يدوي." />
          <Step num={7} title="تحديث حالة الطلب"
            desc="تابع الطلب وغيّر حالته: معلق ← قيد المعالجة ← تم الشحن ← تم التسليم. أو ألغِه إذا لزم." />
        </div>
        <Tip text="سعر البيع في السلة يمكن تعديله لكل طلب — مفيد لإعطاء خصومات أو أسعار خاصة دون تغيير السعر الافتراضي للصنف." />
        <div className="mt-4">
          <Note text="عند حفظ الطلب يُنشأ تلقائياً سجل صادر لكل صنف. لا تسجّل الصادر يدوياً للطلبات المنشأة من هذه الشاشة." />
        </div>
      </div>

      {/* ══ 11. حاسبة الشحن ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={Calculator} title="حاسبة الشحن" color="amber" />
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-5">
          حاسبة مخصصة لأسعار شحن طلبك تشمل 71 مدينة ليبية. يمكن استخدامها مستقلاً أو من داخل شاشة الطلب.
        </p>

        <div className="space-y-4 mb-5">
          <Step num={1} title="اختر المدينة"
            desc="اختر المدينة الوجهة من 71 مدينة ليبية — كل مدينة لها سعر أساسي خاص بها." />
          <Step num={2} title="أدخل الوزن والأبعاد"
            desc="أدخل الوزن الفعلي (كيلوجرام) وأبعاد الطرد (طول × عرض × ارتفاع) بالسنتيمتر." />
          <Step num={3} title="احصل على النتيجة"
            desc="النظام يحسب تكلفة الشحن والتغليف والإجمالي تلقائياً." />
        </div>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">كيف تُحسب الأسعار:</p>
        <div className="space-y-2 mb-5">
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">الوزن الحجمي:</strong> (الطول × العرض × الارتفاع) ÷ 5000. يُستخدم الأكبر بين الوزن الفعلي والحجمي.
          </div>
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">سعر الكيلوجرام (4 مستويات):</strong> ≤20 كجم → 2.0 د.ل · ≤30 كجم → 2.5 د.ل · ≤40 كجم → 3.0 د.ل · أكثر من 40 كجم → 3.5 د.ل
          </div>
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">سعر الشحن:</strong> السعر الأساسي للمدينة + (الوزن المحاسَب × سعر الكجم)
          </div>
          <div className="p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl text-sm text-[#6C6C70] dark:text-[#A1A1AA]">
            <strong className="text-[#1C1C1E] dark:text-[#F4F4F5]">خدمة التغليف:</strong> 10 د.ل أساس + 0.33 د.ل لكل سنتيمتر إضافي عن المقاس القياسي
          </div>
        </div>
        <Tip text="الحاسبة مدمجة داخل شاشة الطلب وتتحدث تلقائياً عند تغيير المدينة أو الأبعاد — لا تحتاج الانتقال لصفحة منفصلة أثناء إنشاء الطلب." />
      </div>

      {/* ══ 12. الرصيد والتقارير ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={BarChart3} title="الرصيد الحالي والتقارير" color="amber" />

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">الرصيد الحالي:</p>
        <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] leading-relaxed mb-4">
          تُظهر هذه الصفحة رصيد كل صنف لحظياً. يتحدث تلقائياً مع كل عملية استلام أو بيع أو حركة مخزنية.
        </p>
        <div className="bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-[#6C6C70] dark:text-[#A1A1AA] mb-3">دلالة الألوان:</p>
          <div className="space-y-2">
            {[
              { color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400', label: 'متوفر', desc: 'الكمية كافية — لا داعي للقلق.' },
              { color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', label: 'منخفض', desc: 'وصلت لمستوى إعادة الطلب — ابدأ في التواصل مع المورد.' },
              { color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', label: 'يحتاج طلب', desc: 'وصلت للحد الأدنى — اطلب البضاعة فوراً.' },
              { color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400', label: 'نافد', desc: 'لا توجد كمية في المخزون — لا يمكن البيع.' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${s.color}`}>{s.label}</span>
                <span className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">التقارير المتاحة (5 تقارير):</p>
        <div className="space-y-2 mb-4">
          {[
            { t: 'تقرير التحليلات', d: 'إحصائيات شاملة عن المبيعات والأرباح ومعدلات الدوران.' },
            { t: 'تقرير المخزون', d: 'قائمة بجميع الأصناف وكمياتها وقيمتها الإجمالية (MAC × الكمية).' },
            { t: 'كشف حركة صنف', d: 'تاريخ كامل لصنف محدد — متى دخل ومتى خرج وما هو الرصيد في كل نقطة.' },
            { t: 'تقرير الأصناف الناقصة', d: 'قائمة جاهزة بالأصناف التي تحتاج إعادة طلب — مثالية لطلبات الشراء.' },
            { t: 'ملخص المشتريات', d: 'إجمالي المشتريات من كل مورد وعدد الفواتير والمبالغ.' },
          ].map((r) => (
            <div key={r.t} className="flex items-start gap-3 p-3 bg-[#F2F2F7] dark:bg-[#27272A] rounded-xl">
              <ChevronLeft className="w-4 h-4 text-[#E5302A] dark:text-[#F87171] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{r.t}</p>
                <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mt-0.5">{r.d}</p>
              </div>
            </div>
          ))}
        </div>
        <Tip text="كل تقرير يمكن تصديره كـ CSV لفتحه في Excel أو طباعته مباشرة من زر الطباعة." />
      </div>

      {/* ══ 13. أسئلة شائعة ══ */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-5 sm:p-6">
        <SectionTitle icon={Star} title="أسئلة شائعة" color="amber" />
        <div className="space-y-3">
          <FAQ
            q='ما الفرق بين "سعر الشراء" و"متوسط التكلفة المرجح (MAC)"؟'
            a='سعر الشراء هو ما أدخلته يدوياً في بيانات الصنف. MAC هو المتوسط الحسابي المرجح لكل الدفعات التي استلمتها مع مصاريفها الفعلية — يُحدَّث تلقائياً عند كل استلام عبر فاتورة مشتريات. MAC هو الرقم الأدق لحساب التكلفة الحقيقية.'
          />
          <FAQ
            q='متى أستخدم فاتورة المشتريات بدلاً من سجل الوارد البسيط؟'
            a='استخدم فاتورة المشتريات عند الاستيراد أو الشراء الذي يحمل مصاريف إضافية (شحن، جمارك، تخليص). استخدم سجل الوارد البسيط للتعديلات السريعة والإضافات اليدوية دون مصاريف.'
          />
          <FAQ
            q='كيف تُحسب التكلفة الفعلية للوحدة في فاتورة الاستيراد؟'
            a='التكلفة الفعلية = (سعر الشراء + حصة الصنف من المصاريف المضافة). مثلاً لو اشتريت 10 قطع بـ 100 د.ل والمصاريف الإجمالية 50 د.ل موزعة بالتساوي، فتكلفة كل قطعة = 10 + 5 = 15 د.ل.'
          />
          <FAQ
            q='هل يمكنني تغيير سعر بيع الصنف عند إنشاء الطلب؟'
            a='نعم. سعر البيع في سلة الطلب قابل للتعديل في كل طلب على حدة دون أن يؤثر على السعر الافتراضي المحفوظ في بيانات الصنف.'
          />
          <FAQ
            q='ماذا يحدث للمخزون عند حفظ الطلب؟'
            a='عند حفظ طلب جديد، يُنشئ النظام تلقائياً حركات صادر لكل صنف في الطلب ويخصم الكميات من الرصيد. لا تحتاج لتسجيل الصادر يدوياً.'
          />
          <FAQ
            q='كيف أتحكم في من يدفع الشحن — المتجر أم العميل؟'
            a='في لوحة الملخص المالي بشاشة الطلب، يوجد زر تبديل بجانب "تكلفة الشحن" وآخر بجانب "تكلفة التغليف". اختر «على المتجر» إذا ستتحمله أنت، أو «على العميل» إذا ستضيفه على المبلغ المطلوب منه.'
          />
          <FAQ
            q='هل البيانات محفوظة على سيرفر أم على الجهاز؟'
            a='البيانات محفوظة على سيرفر آمن (Supabase) وليس على جهازك. يعني ذلك أن بياناتك متاحة من أي جهاز بعد تسجيل الدخول، وأنها لن تضيع إذا فُقد الجهاز.'
          />
        </div>
      </div>

      {/* ══ Footer ══ */}
      <div className="text-center py-4">
        <p className="text-xs text-[#AEAEB2] dark:text-[#71717A]">
          آخر تحديث: مايو 2026 — النسخة 2.0 · نظام طلبك لإدارة المخازن والمبيعات
        </p>
      </div>

    </div>
  );
}
