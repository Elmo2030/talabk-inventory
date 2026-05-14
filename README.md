# نظام إدارة المخزون - المرحلة الثانية

نظام احترافي لإدارة المخزون مبني بـ Next.js 14 + Tailwind CSS + Lucide React.

## المميزات

- ✅ دعم كامل للغة العربية (RTL)
- ✅ خط Cairo للنصوص العربية
- ✅ شاشة الموردين مع بحث و CRUD كامل
- ✅ شاشة الأصناف مع تلوين الأصناف الموقوفة
- ✅ تنبيه للأصناف التي تقل عن الحد الأدنى
- ✅ نوافذ منبثقة (Modals) قابلة لإعادة الاستخدام
- ✅ مكونات UI نظيفة (Button, Input, Select, Badge, SearchBar)
- ✅ Layout متجاوب مع Sidebar

## بنية المشروع

```
inventory-app/
├── app/
│   ├── layout.tsx              # Root Layout مع دعم RTL
│   ├── page.tsx                # لوحة التحكم
│   ├── suppliers/page.tsx      # شاشة الموردين
│   ├── items/page.tsx          # شاشة الأصناف
│   └── globals.css             # CSS عام + خط Cairo
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx         # القائمة الجانبية
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   └── SearchBar.tsx
│   └── forms/
│       ├── SupplierForm.tsx
│       └── ItemForm.tsx
├── lib/
│   └── types.ts                # تعريفات TypeScript
└── data/
    └── mock-data.ts            # بيانات تجريبية
```

## التشغيل

```bash
# 1. تثبيت الحزم
npm install

# 2. تشغيل خادم التطوير
npm run dev

# 3. افتح المتصفح على
# http://localhost:3000
```

## الخطوة التالية

1. ربط النظام بقاعدة بيانات Supabase
2. بناء شاشات الوارد (Stock In) والصادر (Stock Out)
3. بناء التقارير ولوحة التحكم المتقدمة
4. إضافة نظام المصادقة والصلاحيات
