/**
 * Terms of Service — replace placeholders with lawyer-reviewed text.
 */
export const metadata = { title: 'شروط الاستخدام — طلبك' };

export default function TermsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#0A0C10] text-white px-6 py-12">
      <article className="max-w-3xl mx-auto space-y-6 leading-loose">
        <h1 className="text-3xl font-bold">شروط الاستخدام</h1>
        <p className="text-white/60 text-sm">آخر تحديث: ٢٠٢٦/٠٥/١٦</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">قبول الشروط</h2>
          <p className="text-white/80">
            باستخدامك منصة طلبك فإنك توافق على الشروط الموضحة أدناه. إذا لم
            توافق على أي بند منها فيرجى الامتناع عن استخدام المنصة.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">الاشتراك والدفع</h2>
          <ul className="list-disc pr-6 text-white/80 space-y-1">
            <li>الاشتراك شهري أو سنوي ويُحدّد عند التسجيل.</li>
            <li>الدفع عبر USDT (شبكة TRC-20) أو نقداً وفق الطرق المعتمدة.</li>
            <li>
              في حال تأخر الدفع تتحول حالة المتجر إلى "موقوف" حتى يتم السداد.
            </li>
            <li>المبالغ المدفوعة غير قابلة للاسترداد إلا في حالات استثنائية.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">حدود الاستخدام</h2>
          <p className="text-white/80">
            لكل باقة حدود قصوى لعدد المنتجات، عدد المستخدمين، وعدد الطلبات
            الشهرية. عند تجاوز الحد يجب الترقية لباقة أعلى.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">الاستخدام المحظور</h2>
          <ul className="list-disc pr-6 text-white/80 space-y-1">
            <li>محاولة اختراق المنصة أو الوصول لبيانات متاجر أخرى.</li>
            <li>استخدام المنصة لأنشطة غير قانونية.</li>
            <li>إعادة بيع الخدمة أو الوصول لأطراف ثالثة دون إذن.</li>
          </ul>
        </section>

        <section id="refund" className="space-y-3 scroll-mt-12">
          <h2 className="text-xl font-semibold">سياسة الاسترجاع</h2>
          <ul className="list-disc pr-6 text-white/80 space-y-1">
            <li>الاشتراك الشهري قابل للاسترجاع كاملاً خلال 7 أيام من الدفع الأول لباقة جديدة، شرط عدم تجاوز 5 طلبات بيع.</li>
            <li>الاشتراكات السنوية: استرجاع جزئي حسب الأشهر غير المستخدمة بعد خصم رسوم التشغيل.</li>
            <li>لا يحق الاسترجاع في حالة إيقاف الحساب بسبب انتهاك الشروط.</li>
            <li>تتم معالجة طلبات الاسترجاع خلال 7 أيام عمل بنفس وسيلة الدفع الأصلية.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">حدود المسؤولية</h2>
          <p className="text-white/80">
            نسعى لتوفر الخدمة بنسبة 99.5% شهرياً. لسنا مسؤولين عن أي خسائر غير
            مباشرة ناتجة عن انقطاع مؤقت للخدمة. ننصح دائماً بأخذ نسخ احتياطية
            دورية من بياناتك.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">إنهاء الخدمة</h2>
          <p className="text-white/80">
            يمكنك إنهاء اشتراكك في أي وقت. نحتفظ بحق إنهاء حسابك في حال انتهاك
            هذه الشروط مع إشعار مسبق.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">التواصل</h2>
          <p className="text-white/80">
            لأي استفسار:{' '}
            <a className="underline" href="mailto:support@talabk.app">
              support@talabk.app
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
