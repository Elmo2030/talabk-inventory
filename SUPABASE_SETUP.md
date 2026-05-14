# 🚀 دليل ربط Supabase — خطوة بخطوة

## الجزء 1: إعداد مشروع Supabase

### 1.1 إنشاء حساب ومشروع

اذهب إلى https://supabase.com وسجّل دخول عبر GitHub. ثم:

1. اضغط **New Project**
2. الاسم: `inventory-system-2026`
3. كلمة المرور: اختر كلمة مرور قوية واحفظها
4. المنطقة: **Frankfurt (eu-central-1)** — الأقرب لليبيا
5. اضغط **Create new project** وانتظر دقيقتين

### 1.2 تشغيل الـ Migration

1. في القائمة الجانبية اضغط **SQL Editor**
2. اضغط **+ New query**
3. افتح ملف `supabase/migration.sql` ⇒ انسخ المحتوى بالكامل
4. الصق في الـ SQL Editor
5. اضغط **Run** (أو Ctrl+Enter)
6. يجب أن ترى: `Migration successful ✓ | suppliers_count: 5 | items_count: 10`

### 1.3 الحصول على API Keys

1. في القائمة اضغط **Project Settings** ⇒ **API**
2. انسخ القيمتين التاليتين:
   - **Project URL**: مثال `https://abcxyz.supabase.co`
   - **anon public**: مفتاح طويل يبدأ بـ `eyJhbGciOi...`

---

## الجزء 2: إعداد المشروع المحلي

### 2.1 تثبيت الحزم الجديدة

```bash
cd inventory-app
npm install
```

سيُثبّت:
- `@supabase/supabase-js`
- `@supabase/ssr`
- `recharts`

### 2.2 إنشاء ملف .env.local

في جذر المشروع:

```bash
cp .env.local.example .env.local
```

افتح `.env.local` والصق القيم من Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcxyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

⚠️ **مهم:** لا تترك المسافات حول علامة `=` ولا تستخدم علامات اقتباس.

### 2.3 إعادة تشغيل الخادم

```bash
npm run dev
```

افتح http://localhost:3000

---

## الجزء 3: التحقق من النجاح

### ✅ علامات النجاح

- شاشة "جاري الاتصال" تظهر ثوانٍ ثم تختفي
- شاشة لوحة التحكم تعرض 10 أصناف و 5 موردين
- شاشة الرصيد الحالي تعرض البيانات من Supabase

### ❌ علامات الفشل

- شاشة "فشل الاتصال" حمراء ⇒ راجع `.env.local`
- البيانات فارغة ⇒ تأكد من تشغيل migration.sql
- خطأ "relation does not exist" ⇒ migration لم يكتمل، أعد تشغيله

---

## الجزء 4: اختبار النظام

### 4.1 اختبار الإضافة

1. اذهب إلى **سجل الوارد**
2. اضغط **تسجيل وارد جديد**
3. املأ النموذج واضغط حفظ
4. **يجب أن يظهر** رقم العملية IN006 تلقائياً
5. تحقق من شاشة **الرصيد الحالي** — يجب أن يكون الرصيد ازداد

### 4.2 اختبار منع الرصيد السالب

1. اذهب إلى **سجل الصادر**
2. اختر صنف رصيده 10
3. حاول صرف 50
4. **يجب أن يظهر** خطأ من Trigger Supabase:
   `الرصيد غير كافٍ. المتاح: 10, المطلوب: 50`

### 4.3 اختبار التزامن (Real-time)

1. افتح المشروع في علامة تبويب أخرى
2. أضف حركة وارد في التبويب الأول
3. **حالياً:** يجب تحديث الصفحة في التبويب الثاني لرؤية التغيير
4. **في المرحلة B:** سنضيف Real-time subscriptions

---

## الجزء 5: استكشاف الأخطاء

### المشكلة: "Missing environment variables"

**السبب:** ملف `.env.local` غير موجود أو متغيرات مفقودة.

**الحل:**
```bash
# تحقق من وجود الملف
ls -la .env.local

# تحقق من المتغيرات
cat .env.local
```

### المشكلة: "JWT expired"

**السبب:** المتصفح يحتفظ بـ session قديمة.

**الحل:** افتح Developer Tools ⇒ Application ⇒ Clear all data

### المشكلة: "Row Level Security policy violation"

**السبب:** المستخدم غير مسجل دخول وRLS مفعّل.

**الحل المؤقت:** في Supabase SQL Editor شغّل:
```sql
-- للتطوير فقط - لا تستخدم في الإنتاج
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_out_movements DISABLE ROW LEVEL SECURITY;
```

**الحل الدائم:** سنضيف Authentication في المرحلة التالية.

---

## الجزء 6: ما الذي تغيّر؟

### قبل (Mock Data):

- البيانات في الذاكرة فقط
- تختفي عند تحديث الصفحة
- لا يمكن مشاركتها بين مستخدمين

### بعد (Supabase):

- البيانات دائمة في PostgreSQL
- محفوظة على السحابة
- قابلة للمشاركة بين عدة مستخدمين
- Trigger يمنع الرصيد السالب على مستوى DB
- View يحسب الأرصدة لحظياً

---

## الخطوات التالية (المرحلة B)

1. ✅ ربط Supabase الأساسي (هذه المرحلة)
2. ⏳ Real-time subscriptions
3. ⏳ نظام المصادقة (Authentication)
4. ⏳ نظام الصلاحيات (Roles & Permissions)
5. ⏳ Server Actions للعمليات الحساسة
6. ⏳ النسخ الاحتياطي والاستعادة
