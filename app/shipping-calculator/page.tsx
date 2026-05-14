'use client';
import TalabkCalculator from '@/components/shipping/TalabkCalculator';
export default function ShippingCalculatorPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1E]">حاسبة أسعار التوصيل</h1>
        <p className="text-xs sm:text-sm text-[#6C6C70] mt-1">احسب تكلفة الشحن لأي مدينة بناءً على أبعاد الشحنة</p>
      </div>
      <TalabkCalculator />
    </div>
  );
}
