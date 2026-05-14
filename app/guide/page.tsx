'use client';

import {
  BookOpen,
  Users,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  FileText,
  Settings,
  LayoutDashboard,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ChevronLeft,
  Star,
} from 'lucide-react';

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, color = 'brand' }: {
  icon: React.ElementType;
  title: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    brand:  'bg-brand-50 text-brand-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    slate:  'bg-slate-100 text-slate-600',
  };
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-[#1C1C1E]">{title}</h2>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
        {num}
      </div>
      <div>
        <p className="font-semibold text-[#1C1C1E] text-sm">{title}</p>
        <p className="text-sm text-[#6C6C70] mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Tip box ──────────────────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Note box ─────────────────────────────────────────────────────────────────
function Note({ text }: { text: string }) {
  return (
    <div className="flex gap-3 bg-brand-50 border border-brand-200 rounded-xl p-4">
      <AlertCircle className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-brand-800 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Feature card (quick overview) ───────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5EA] p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-semibold text-[#1C1C1E] text-sm mb-1">{title}</p>
      <p className="text-xs text-[#6C6C70] leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto pb-16">

      {/* ── Hero ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 mb-6 text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#1C1C1E] mb-2">دليل المستخدم</h1>
        <p className="text-[#6C6C70] text-sm leading-relaxed max-w-md mx-auto">
          مرحباً بك في نظام طلبك لإدارة المخازن. هذا الدليل سيشرح لك كل شيء خطوة بخطوة
          حتى لو كانت هذه أول مرة تستخدم فيها نظام مخازن.
        </p>
      </div>

      {/* ── Quick overview ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={LayoutDashboard} title="ماذا يفعل هذا النظام؟" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-5">
          نظام المخازن يساعدك على متابعة كل ما يدخل ويخرج من مخزنك بشكل منظم.
          بدلاً من الأوراق والملفات، كل شيء محفوظ ومرتب في مكان واحد.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FeatureCard icon={Users}            title="الموردين"       desc="سجّل شركات وأشخاص توريد البضائع"        color="bg-slate-100 text-slate-600" />
          <FeatureCard icon={Package}          title="الأصناف"        desc="قائمة بجميع المنتجات في المخزن"         color="bg-slate-100 text-slate-600" />
          <FeatureCard icon={ArrowDownToLine}  title="سجل الوارد"     desc="تسجيل كل بضاعة تدخل المخزن"            color="bg-green-50 text-green-600"  />
          <FeatureCard icon={ArrowUpFromLine}  title="سجل الصادر"     desc="تسجيل كل بضاعة تخرج من المخزن"         color="bg-brand-50 text-brand-600"  />
          <FeatureCard icon={BarChart3}        title="الرصيد الحالي"  desc="اعرف كمية كل صنف في أي وقت"            color="bg-amber-50 text-amber-600"  />
          <FeatureCard icon={FileText}         title="التقارير"       desc="تقارير وإحصائيات عن حركة المخزون"      color="bg-slate-100 text-slate-600" />
        </div>
      </div>

      {/* ── Quick start ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={CheckCircle2} title="البداية السريعة — 4 خطوات فقط" color="green" />
        <div className="space-y-5">
          <Step num={1} title="أضف الموردين أولاً"
            desc="اذهب إلى قسم «الموردين» واضغط «إضافة مورد جديد». أدخل اسم الشركة ورقم الهاتف وبيانات التواصل." />
          <Step num={2} title="أضف الأصناف"
            desc="اذهب إلى «الأصناف» واضغط «إضافة صنف جديد». أدخل اسم الصنف والكمية الافتتاحية (الكمية الموجودة عندك الآن) وسعر الشراء." />
          <Step num={3} title="سجّل حركات الوارد"
            desc="كل ما وصلتك بضاعة من مورد، اذهب إلى «سجل الوارد» واضغط «تسجيل وارد جديد» وأدخل التفاصيل." />
          <Step num={4} title="سجّل حركات الصادر"
            desc="كل ما خرجت بضاعة من المخزن (بيع أو توزيع)، اذهب إلى «سجل الصادر» وسجّل العملية." />
        </div>
        <div className="mt-5">
          <Tip text="ابدأ دائماً بإضافة الموردين ثم الأصناف — بدونهم لن تتمكن من تسجيل حركات الوارد والصادر." />
        </div>
      </div>

      {/* ── Suppliers ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={Users} title="قسم الموردين" color="slate" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-5">
          المورد هو الشخص أو الشركة التي توفر لك البضائع. يجب أن تضيف موردًا قبل أن تتمكن من تسجيل أي بضاعة واردة.
        </p>
        <div className="space-y-4 mb-5">
          <Step num={1} title='اضغط "إضافة مورد جديد"'
            desc="الزر الأحمر في أعلى يسار الصفحة." />
          <Step num={2} title="أدخل بيانات المورد"
            desc="الاسم والهاتف والبريد الإلكتروني ونوع المنتجات التي يوفرها. الحقول المميزة بـ * إلزامية." />
          <Step num={3} title="اختر شروط الدفع والتقييم"
            desc="شروط الدفع: عدد الأيام المسموح بها للدفع (0 = دفع فوري). التقييم: من 1 إلى 5 نجوم حسب جودة المورد." />
          <Step num={4} title='اضغط "حفظ"'
            desc="سيظهر المورد في القائمة فوراً ويمكنك الاستخدامه مباشرة." />
        </div>
        <div className="bg-[#F2F2F7] rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-[#6C6C70] mb-2 flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> تعديل أو حذف مورد
          </p>
          <p className="text-sm text-[#1C1C1E] leading-relaxed">
            في صف المورد، اضغط أيقونة القلم <strong>✏️</strong> للتعديل، أو أيقونة سلة المهملات <strong>🗑️</strong> للحذف.
            سيطلب منك تأكيد الحذف قبل تنفيذه.
          </p>
        </div>
        <Tip text="يمكنك الضغط على أيقونة الرابط ↗ بجانب كل مورد لمشاهدة صفحة تفصيلية بكل فواتيره وأصنافه." />
      </div>

      {/* ── Items ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={Package} title="قسم الأصناف" color="slate" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-5">
          الصنف هو أي منتج تحتفظ به في مخزنك. يجب إضافة الصنف أولاً قبل تسجيل أي حركة له.
        </p>
        <div className="space-y-4 mb-5">
          <Step num={1} title='اضغط "إضافة صنف جديد"'
            desc="الزر الأحمر في أعلى الصفحة." />
          <Step num={2} title="أدخل اسم الصنف والتصنيف"
            desc="مثال: اسم الصنف «لاب توب Dell i7»، التصنيف «إلكترونيات»، وحدة القياس «قطعة»." />
          <Step num={3} title="أدخل الكمية الافتتاحية"
            desc="هي الكمية الموجودة عندك الآن في المخزن. إذا لم يكن عندك شيء ابدأ بـ 0." />
          <Step num={4} title="حدد حدود التنبيه"
            desc="الحد الأدنى: الكمية التي إذا وصلت إليها يكون الوضع حرجاً. مستوى إعادة الطلب: الكمية التي تبدأ عندها في الطلب من المورد." />
          <Step num={5} title="اختر المورد وأدخل الأسعار"
            desc="سعر الشراء: ما تدفعه للمورد. سعر البيع: ما تبيعه للعميل." />
        </div>
        <Note text="الكمية الافتتاحية مهمة جداً — هي نقطة البداية لحساب الرصيد. إذا أدخلتها بشكل خاطئ ستكون كل الأرقام غلط. خذ وقتك في جرد مخزنك أولاً." />
      </div>

      {/* ── Stock In ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={ArrowDownToLine} title="سجل الوارد — تسجيل بضاعة دخلت المخزن" color="green" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-5">
          كل ما اشتريت بضاعة من مورد أو استلمت شحنة، سجّلها هنا. هذا يزيد الرصيد تلقائياً.
        </p>
        <div className="space-y-4 mb-5">
          <Step num={1} title='اضغط "تسجيل وارد جديد"'
            desc="الزر الأحمر في أعلى الصفحة." />
          <Step num={2} title="اختر الصنف والمورد"
            desc="من القوائم المنسدلة اختر الصنف الذي وصل، ثم المورد الذي أرسله." />
          <Step num={3} title="أدخل الكمية وسعر الوحدة"
            desc="الكمية الواردة وسعر الشراء لكل وحدة. الإجمالي سيُحسب تلقائياً." />
          <Step num={4} title="أدخل رقم الفاتورة والتاريخ"
            desc="رقم الفاتورة مهم للمراجعة لاحقاً. التاريخ يُملأ تلقائياً لكن يمكنك تغييره." />
          <Step num={5} title='اضغط "حفظ"'
            desc="الرصيد سيزيد فوراً في صفحة الرصيد الحالي." />
        </div>
        <Tip text="يمكنك استخدام الفلاتر في أعلى الصفحة للبحث عن فاتورة معينة بالتاريخ أو الصنف أو المسؤول." />
      </div>

      {/* ── Stock Out ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={ArrowUpFromLine} title="سجل الصادر — تسجيل بضاعة خرجت من المخزن" color="brand" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-5">
          سواء كانت مبيعات أو استهلاك داخلي أو هدايا، كل بضاعة تخرج من المخزن سجّلها هنا.
        </p>
        <div className="space-y-4 mb-5">
          <Step num={1} title='اضغط "تسجيل صادر جديد"'
            desc="الزر الأحمر في أعلى الصفحة." />
          <Step num={2} title="اختر الصنف"
            desc="ستظهر الكمية المتاحة تلقائياً تحت اسم الصنف. تأكد أن الكمية كافية." />
          <Step num={3} title="أدخل الكمية وسعر البيع"
            desc="لا يمكنك إدخال كمية أكبر من الرصيد الموجود — النظام سيمنعك تلقائياً." />
          <Step num={4} title="حدد جهة الاستلام والسبب"
            desc="مثال: جهة الاستلام «قسم المبيعات»، السبب «بيع»." />
          <Step num={5} title='اضغط "حفظ"'
            desc="الرصيد سينقص فوراً." />
        </div>
        <Note text="إذا ظهرت رسالة «الرصيد غير كافٍ» فهذا يعني أن الكمية المطلوبة أكبر من المتوفر في المخزن. راجع صفحة الرصيد الحالي." />
      </div>

      {/* ── Current Stock ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={BarChart3} title="الرصيد الحالي" color="amber" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-5">
          هذه الصفحة تُظهر رصيد كل صنف في الوقت الحالي. يتحدث تلقائياً مع كل عملية وارد أو صادر.
        </p>
        <div className="bg-[#F2F2F7] rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-[#6C6C70] mb-3">معنى ألوان الحالة:</p>
          <div className="space-y-2">
            {[
              { color: 'bg-green-100 text-green-700', label: 'متوفر', desc: 'الكمية كافية ولا توجد مشكلة' },
              { color: 'bg-amber-100 text-amber-700', label: 'منخفض', desc: 'الكمية وصلت لمستوى إعادة الطلب — فكّر في الشراء قريباً' },
              { color: 'bg-orange-100 text-orange-700', label: 'يحتاج طلب', desc: 'الكمية وصلت للحد الأدنى — يجب الطلب الآن' },
              { color: 'bg-red-100 text-red-700',    label: 'نافذ',   desc: 'لا يوجد رصيد — المخزن فارغ من هذا الصنف' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>
                <span className="text-xs text-[#6C6C70]">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <Tip text="استخدم زر «تصدير CSV» في أعلى الصفحة لتصدير جدول الرصيد إلى Excel." />
      </div>

      {/* ── Reports ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={FileText} title="التقارير" color="slate" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-4">
          أربعة تقارير جاهزة تساعدك على فهم وضع مخزنك:
        </p>
        <div className="space-y-3">
          {[
            { title: 'الجرد الفعلي',      desc: 'قائمة شاملة بجميع الأصناف وأسعارها وقيمتها الإجمالية في المخزن.' },
            { title: 'ملخص المشتريات',    desc: 'إجمالي ما اشتريته من كل مورد وعدد الفواتير والمتوسط.' },
            { title: 'كشف حركة صنف',     desc: 'تاريخ كامل لصنف معين — متى دخل ومتى خرج وكم الرصيد.' },
            { title: 'الأصناف الناقصة',   desc: 'قائمة بالأصناف التي وصلت للحد الأدنى أو نفدت.' },
            { title: 'التحليلات',          desc: 'إحصائيات عامة عن المخزون ومعدل الدوران وهامش الربح.' },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-[#F2F2F7] rounded-xl">
              <ChevronLeft className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1C1C1E]">{r.title}</p>
                <p className="text-xs text-[#6C6C70] mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Tip text="كل تقرير يمكن طباعته أو تصديره كـ CSV. استخدم أزرار «طباعة» و«تصدير CSV» في أعلى التقرير." />
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={Settings} title="الإعدادات" color="slate" />
        <p className="text-sm text-[#6C6C70] leading-relaxed mb-4">
          يمكنك تخصيص قوائم النظام حسب احتياجك:
        </p>
        <div className="space-y-3 mb-4">
          {[
            { title: 'الموظفون',      desc: 'أسماء الموظفين المسؤولين عن حركات المخزون.' },
            { title: 'الأقسام',       desc: 'أقسام الشركة التي تستلم البضائع.' },
            { title: 'أسباب الصرف',  desc: 'أسباب إخراج البضائع (بيع، استهلاك، تلف...).' },
            { title: 'مواقع التخزين', desc: 'أسماء المخازن والرفوف.' },
            { title: 'التصنيفات',    desc: 'فئات الأصناف (إلكترونيات، أثاث...).' },
            { title: 'وحدات القياس', desc: 'قطعة، كيلو، لتر، كرتون...' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#F2F2F7] rounded-xl">
              <ChevronLeft className="w-4 h-4 text-[#AEAEB2]" />
              <div>
                <span className="text-sm font-semibold text-[#1C1C1E]">{s.title}</span>
                <span className="text-sm text-[#6C6C70] mr-2">— {s.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <Tip text="بعد تعديل أي قائمة اضغط «حفظ التغييرات» حتى تُطبَّق. لا تنسَ هذه الخطوة!" />
      </div>

      {/* ── Common mistakes ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={AlertCircle} title="أخطاء شائعة — تجنبها من البداية" color="brand" />
        <div className="space-y-3">
          {[
            { q: 'لماذا رصيد الصنف صفر؟',           a: 'لأن الكمية الافتتاحية أُدخلت بـ 0. عدّل الصنف وأدخل الكمية الصحيحة.' },
            { q: 'لماذا لا أجد الصنف في سجل الوارد؟', a: 'يجب إضافة الصنف في قسم «الأصناف» أولاً قبل استخدامه.' },
            { q: 'ظهرت رسالة «الرصيد غير كافٍ»',      a: 'الكمية التي تريد إصدارها أكبر من المتوفر. تحقق من الرصيد الحالي.' },
            { q: 'حذفت سجلاً بالخطأ',                 a: 'الحذف نهائي ولا يمكن التراجع عنه. فكّر جيداً قبل الحذف.' },
            { q: 'لا يظهر المورد في القائمة',           a: 'اذهب إلى «الموردين» وتأكد أن المورد مضاف وحالته «نشط».' },
          ].map((item, i) => (
            <div key={i} className="border border-[#E5E5EA] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F2F2F7]">
                <AlertCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-[#1C1C1E]">{item.q}</p>
              </div>
              <div className="flex items-start gap-2 px-4 py-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#6C6C70]">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Keyboard shortcuts ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 mb-6">
        <SectionTitle icon={Star} title="اختصارات لوحة المفاتيح" color="slate" />
        <p className="text-sm text-[#6C6C70] mb-4">اختصارات تسرّع عملك في أي صفحة:</p>
        <div className="space-y-2">
          {[
            { keys: ['Ctrl', 'N'], desc: 'فتح نافذة إضافة جديد (وارد / صادر / صنف / مورد)' },
            { keys: ['Esc'],       desc: 'إغلاق أي نافذة مفتوحة' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#F2F2F7] rounded-xl">
              <div className="flex gap-1">
                {s.keys.map(k => (
                  <kbd key={k} className="px-2.5 py-1 bg-white border border-[#E5E5EA] rounded-lg text-xs font-mono font-bold text-[#1C1C1E] shadow-sm">
                    {k}
                  </kbd>
                ))}
              </div>
              <p className="text-sm text-[#6C6C70]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center py-4">
        <p className="text-xs text-[#AEAEB2]">طلبك — نظام إدارة المخازن · نسخة 2026</p>
      </div>

    </div>
  );
}
