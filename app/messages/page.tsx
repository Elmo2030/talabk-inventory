'use client';

import { useState } from 'react';
import { Search, Copy, Check, MessageSquare, ExternalLink } from 'lucide-react';

type Template = {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  text: string;
};

const TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'تأكيد الطلب',
    category: 'PENDING',
    categoryColor: 'bg-amber-100 text-amber-700',
    text: 'السلام عليكم {name}، تم استلام طلبك رقم {order} بنجاح. إجمالي الطلب: {total} د.ل. سنتواصل معك قريباً لتأكيد التوصيل.',
  },
  {
    id: '2',
    title: 'الطلب قيد التجهيز',
    category: 'PROCESSING',
    categoryColor: 'bg-slate-100 text-slate-700',
    text: 'مرحباً {name}، طلبك رقم {order} قيد التجهيز الآن. سنخبرك فور شحنه. شكراً لثقتك بنا! 🚀',
  },
  {
    id: '3',
    title: 'تم الشحن',
    category: 'SHIPPED',
    categoryColor: 'bg-blue-100 text-blue-700',
    text: 'أخبار سارة {name}! 📦 طلبك رقم {order} في الطريق إليك. رقم التتبع: {tracking}. متوقع الوصول خلال 1-3 أيام.',
  },
  {
    id: '4',
    title: 'تم التسليم',
    category: 'DELIVERED',
    categoryColor: 'bg-green-100 text-green-700',
    text: 'مرحباً {name}، نأمل أن طلبك رقم {order} وصلك بحالة ممتازة! 🎉 رأيك يهمنا، شاركنا تجربتك.',
  },
  {
    id: '5',
    title: 'الطلب ملغي',
    category: 'CANCELLED',
    categoryColor: 'bg-red-100 text-red-700',
    text: 'مع الأسف {name}، اضطررنا لإلغاء طلبك رقم {order}. للاستفسار تواصل معنا مباشرة.',
  },
  {
    id: '6',
    title: 'تذكير بالدفع',
    category: 'دفع',
    categoryColor: 'bg-orange-100 text-orange-700',
    text: 'مرحباً {name}، نذكرك بأن القسط المستحق لطلبك {order} بمبلغ {total} د.ل لم يُسدَّد بعد. نرجو التواصل معنا.',
  },
  {
    id: '7',
    title: 'رد على استفسار',
    category: 'عام',
    categoryColor: 'bg-purple-100 text-purple-700',
    text: 'شكراً لتواصلك معنا! سيتواصل معك أحد موظفينا في أقرب وقت. أوقات العمل: 9 ص – 6 م.',
  },
];

function TemplateCard({ template }: { template: Template }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(template.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsApp() {
    const encoded = encodeURIComponent(template.text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  return (
    <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 hover:border-[#E5302A]/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-[#1C1C1E] text-sm">{template.title}</h3>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${template.categoryColor}`}>
            {template.category}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
            title="فتح في واتساب"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            فتح في واتساب
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              copied
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-[#1C1C1E] bg-[#F2F2F7] hover:bg-[#E5E5EA] border-[#E5E5EA]'
            }`}
            title="نسخ النص"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                نسخ النص
              </>
            )}
          </button>
        </div>
      </div>
      <div className="bg-[#F2F2F7] rounded-xl p-3 font-mono text-sm text-[#1C1C1E] leading-relaxed whitespace-pre-wrap break-words">
        {template.text}
      </div>
      <p className="text-xs text-[#AEAEB2]">
        المتغيرات: {'{name}'} الاسم &bull; {'{order}'} رقم الطلب &bull; {'{total}'} الإجمالي &bull; {'{tracking}'} رقم التتبع
      </p>
    </div>
  );
}

export default function MessagesPage() {
  const [search, setSearch] = useState('');

  const filtered = TEMPLATES.filter(
    (t) =>
      !search ||
      t.title.includes(search) ||
      t.category.includes(search) ||
      t.text.includes(search)
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1E]">قوالب الرسائل</h1>
          <p className="text-xs sm:text-sm text-[#6C6C70] mt-0.5">رسائل واتساب جاهزة للنسخ والإرسال للعملاء</p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-xl border border-green-200">
          <MessageSquare className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C70]" />
        <input
          type="text"
          placeholder="بحث في القوالب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="بحث في قوالب الرسائل"
          className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#E5E5EA] text-sm text-[#1C1C1E] bg-white focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20"
          dir="rtl"
        />
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
        استبدل المتغيرات بالبيانات الفعلية قبل الإرسال: <span className="font-mono font-semibold">{'{name}'}</span> باسم العميل،{' '}
        <span className="font-mono font-semibold">{'{order}'}</span> برقم الطلب،{' '}
        <span className="font-mono font-semibold">{'{total}'}</span> بالمبلغ،{' '}
        <span className="font-mono font-semibold">{'{tracking}'}</span> برقم التتبع.
      </div>

      {/* Templates grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-12 text-center">
          <MessageSquare className="w-10 h-10 text-[#AEAEB2] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1C1C1E]">لا توجد قوالب مطابقة</p>
          <p className="text-xs text-[#6C6C70] mt-1">جرب كلمة بحث مختلفة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
