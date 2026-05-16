/**
 * Privacy Policy — required for app/store/payment compliance.
 * Replace the placeholders with content reviewed by a lawyer before
 * scaling to many tenants.
 */
export const metadata = { title: 'سياسة الخصوصية — طلبك' };

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#0A0C10] text-white px-6 py-12">
      <article className="max-w-3xl mx-auto space-y-6 leading-loose">
        <h1 className="text-3xl font-bold">سياسة الخصوصية</h1>
        <p className="text-white/60 text-sm">آخر تحديث: ٢٠٢٦/٠٥/١٦</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">المعلومات التي نجمعها</h2>
          <p className="text-white/80">
            نقوم بجمع المعلومات اللازمة لتشغيل المنصة: اسم المتجر، البريد
            الإلكتروني، رقم الهاتف، وبيانات المخزون والمبيعات التي تُدخلها أنت.
            لا نجمع بيانات بطاقات الدفع — تتم المدفوعات عبر تحويل بنكي أو USDT.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">كيف نستخدم البيانات</h2>
          <ul className="list-disc pr-6 text-white/80 space-y-1">
            <li>تشغيل خدمة إدارة المخزون والمبيعات لمتجرك</li>
            <li>إرسال إشعارات تتعلق بحسابك (تسجيل دخول، فواتير، إلخ.)</li>
            <li>تحسين المنصة عبر إحصائيات مجمّعة لا تحدد هويتك</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">عزل البيانات</h2>
          <p className="text-white/80">
            بيانات كل متجر معزولة عن باقي المتاجر باستخدام Row-Level Security
            على مستوى قاعدة البيانات — لا يستطيع أي متجر الوصول لبيانات متجر
            آخر مهما كانت الظروف.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">حقوقك</h2>
          <p className="text-white/80">
            يمكنك طلب نسخة من بياناتك أو حذفها بالكامل عبر التواصل معنا على
            البريد:{' '}
            <a className="underline" href="mailto:support@talabk.app">
              support@talabk.app
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">الكوكيز</h2>
          <p className="text-white/80">
            نستخدم كوكيز ضرورية لتسجيل الدخول وحفظ جلستك فقط — لا نستخدم كوكيز
            للإعلانات أو التتبع عبر مواقع أخرى.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">التحديثات</h2>
          <p className="text-white/80">
            قد نقوم بتحديث هذه السياسة من وقت لآخر. سنقوم بإشعارك بأي تغييرات
            جوهرية عبر البريد الإلكتروني المسجل في حسابك.
          </p>
        </section>
      </article>
    </main>
  );
}
