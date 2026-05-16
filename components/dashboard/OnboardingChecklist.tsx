'use client';

/**
 * Onboarding checklist for brand-new tenants.
 * Shown on the dashboard when there's no data yet — replaces the
 * fabricated demo donut that misled new users into thinking they
 * had orders.
 */

import Link from 'next/link';
import { Package, Truck, ShoppingBag, Rocket, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface OnboardingChecklistProps {
  hasSuppliers: boolean;
  hasItems:     boolean;
  hasStockIn:   boolean;
  hasOrders:    boolean;
}

export default function OnboardingChecklist({
  hasSuppliers,
  hasItems,
  hasStockIn,
  hasOrders,
}: OnboardingChecklistProps) {
  const steps = [
    {
      done: hasSuppliers,
      icon: Truck,
      title: 'أضف أول مورد',
      desc:  'من هنا تشتري منتجاتك',
      href:  '/suppliers',
    },
    {
      done: hasItems,
      icon: Package,
      title: 'أضف أول صنف',
      desc:  'المنتجات اللي تبيعها لعملائك',
      href:  '/items',
    },
    {
      done: hasStockIn,
      icon: Rocket,
      title: 'سجّل أول دفعة مخزون داخل',
      desc:  'كميات بدأ بها مخزونك',
      href:  '/stock-in',
    },
    {
      done: hasOrders,
      icon: ShoppingBag,
      title: 'أنشئ أول طلب بيع',
      desc:  'بدّل التسجيلات لمبيعات حقيقية',
      href:  '/orders/new',
    },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const progress  = (doneCount / steps.length) * 100;

  return (
    <div className="bg-white dark:bg-[#18181B] border-2 border-[#E5302A]/20 rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-[#F4F4F5] flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#E5302A]" /> ابدأ متجرك في 4 خطوات
          </h2>
          <p className="text-sm text-[#6C6C70] dark:text-[#A1A1AA] mt-1">
            تابع الخطوات حتى تجهّز متجرك للبيع
          </p>
        </div>
        <div className="text-left">
          <p className="text-2xl font-bold text-[#E5302A]">{doneCount}/{steps.length}</p>
          <p className="text-xs text-[#AEAEB2]">مكتمل</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#F2F2F7] dark:bg-[#27272A] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-l from-[#E5302A] to-[#C42B24] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return step.done ? (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 line-through opacity-80">
                  {step.title}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">تم ✓</p>
              </div>
            </div>
          ) : (
            <Link
              key={idx}
              href={step.href}
              className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E5EA] dark:border-[#27272A] hover:border-[#E5302A] hover:bg-[#E5302A]/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E5302A]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E5302A] group-hover:text-white transition-colors">
                <Icon className="w-5 h-5 text-[#E5302A] group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F5]">{step.title}</p>
                <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">{step.desc}</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#AEAEB2] group-hover:text-[#E5302A] flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
