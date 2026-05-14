'use client';
import { useState, useEffect } from 'react';
import { Package, Truck, ChevronDown, Info } from 'lucide-react';
import {
  SORTED_CITIES,
  TALABK_CITIES,
  DeliveryType,
  TalabkCity,
  calculateShipping,
  ShippingCalcResult,
  getBasePrice,
} from '@/lib/data/talabkCities';

interface Props {
  compact?: boolean;
  initialCityName?: string;
  onChange?: (result: ShippingCalcResult | null) => void;
}

const deliveryTypeLabels: Record<DeliveryType, string> = {
  home: 'توصيل للبيت',
  office: 'توصيل للمكتب',
  female: 'توصيل نسائي',
};

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-[#E5E5EA] text-sm text-[#1C1C1E] bg-white focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20';
const labelClass = 'block text-xs font-medium text-[#6C6C70] mb-1.5';

export default function TalabkCalculator({ compact = false, initialCityName, onChange }: Props) {
  const [selectedCityName, setSelectedCityName] = useState<string>(initialCityName ?? '');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('home');
  const [length, setLength] = useState<number>(20);
  const [width, setWidth] = useState<number>(20);
  const [height, setHeight] = useState<number>(20);
  const [actualWeight, setActualWeight] = useState<number>(1);
  const [needsPackaging, setNeedsPackaging] = useState<boolean>(false);
  const [result, setResult] = useState<ShippingCalcResult | null>(null);

  const selectedCity: TalabkCity | undefined = TALABK_CITIES.find(
    (c) => c.name === selectedCityName
  );

  // Available delivery types for selected city
  const availableTypes: DeliveryType[] = selectedCity
    ? (['home', 'office', 'female'] as DeliveryType[]).filter(
        (t) => getBasePrice(selectedCity, t) !== null
      )
    : [];

  // When city changes, reset delivery type to first available
  useEffect(() => {
    if (initialCityName !== undefined) {
      setSelectedCityName(initialCityName);
    }
  }, [initialCityName]);

  useEffect(() => {
    if (selectedCity && availableTypes.length > 0 && !availableTypes.includes(deliveryType)) {
      setDeliveryType(availableTypes[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityName]);

  // Calculate on every change
  useEffect(() => {
    if (!selectedCity) {
      setResult(null);
      onChange?.(null);
      return;
    }
    const r = calculateShipping(
      selectedCity,
      deliveryType,
      length,
      width,
      height,
      actualWeight,
      needsPackaging
    );
    setResult(r);
    onChange?.(r);
  }, [selectedCity, deliveryType, length, width, height, actualWeight, needsPackaging, onChange]);

  const fmt = (n: number) =>
    n.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Full mode price table data ────────────────────────────────────────────
  const priceGroups = [
    {
      label: 'طرابلس وضواحيها',
      cities: SORTED_CITIES.filter((c) => c.home !== null && (c.home ?? 0) <= 55 && !['مصراتة','سرت','راس لانوف','قمينس','البريقة','بوقرين','الجفرة','أوجلة','تازربو','جالو','الكفرة','بنغازي (لباب البيت)','الأبيار','الأبرق','المرج','البيضاء','شحات','درنة','سوسة','القبة','طبرق','سبها','براك الشاطئ','أوباري','أم الأرانب','وادي عتبة','قطرون','القريات','مرزق','تراغن','غات'].includes(c.name)),
    },
  ];

  const formFields = (
    <div className="space-y-4">
      {/* City + Type */}
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        <div>
          <label className={labelClass}>المدينة</label>
          <div className="relative">
            <select
              value={selectedCityName}
              onChange={(e) => setSelectedCityName(e.target.value)}
              className={inputClass + ' appearance-none pr-3 pl-8'}
              dir="rtl"
            >
              <option value="">اختر المدينة...</option>
              {SORTED_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C70] pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={labelClass}>نوع التوصيل</label>
          <div className="relative">
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
              className={inputClass + ' appearance-none pr-3 pl-8'}
              dir="rtl"
              disabled={availableTypes.length === 0}
            >
              {availableTypes.length === 0 ? (
                <option value="home">اختر مدينة أولاً</option>
              ) : (
                availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {deliveryTypeLabels[t]}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C70] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <label className={labelClass}>أبعاد الشحنة (سم)</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <input
              type="number"
              min={1}
              value={length}
              onChange={(e) => setLength(Math.max(1, Number(e.target.value)))}
              className={inputClass}
              placeholder="الطول"
              dir="ltr"
            />
            <p className="text-[10px] text-[#6C6C70] text-center mt-1">الطول</p>
          </div>
          <div>
            <input
              type="number"
              min={1}
              value={width}
              onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
              className={inputClass}
              placeholder="العرض"
              dir="ltr"
            />
            <p className="text-[10px] text-[#6C6C70] text-center mt-1">العرض</p>
          </div>
          <div>
            <input
              type="number"
              min={1}
              value={height}
              onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
              className={inputClass}
              placeholder="الارتفاع"
              dir="ltr"
            />
            <p className="text-[10px] text-[#6C6C70] text-center mt-1">الارتفاع</p>
          </div>
        </div>
      </div>

      {/* Weight + Packaging */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>الوزن الفعلي (كغ)</label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={actualWeight}
            onChange={(e) => setActualWeight(Math.max(0.1, Number(e.target.value)))}
            className={inputClass}
            dir="ltr"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2.5">
            <input
              type="checkbox"
              checked={needsPackaging}
              onChange={(e) => setNeedsPackaging(e.target.checked)}
              className="w-4 h-4 rounded accent-[#E5302A] cursor-pointer"
            />
            <span className="text-sm text-[#1C1C1E]">يحتاج تغليف</span>
          </label>
        </div>
      </div>
    </div>
  );

  const resultDisplay = result ? (
    <div className={compact ? 'mt-3 p-3 bg-[#F2F2F7] rounded-xl space-y-2' : 'space-y-3'}>
      {/* Main cost */}
      <div className={compact ? 'flex items-center justify-between' : 'text-center py-4'}>
        {compact ? (
          <>
            <span className="text-sm text-[#6C6C70]">تكلفة التوصيل</span>
            <span className="text-lg font-bold text-[#E5302A]">{fmt(result.shippingCost)} د.ل</span>
          </>
        ) : (
          <>
            <p className="text-xs text-[#6C6C70] mb-1">تكلفة التوصيل</p>
            <p className="text-4xl font-bold text-[#E5302A]">{fmt(result.shippingCost)}</p>
            <p className="text-sm text-[#6C6C70]">دينار ليبي</p>
          </>
        )}
      </div>

      {/* Details */}
      <div className={compact ? 'space-y-1' : 'bg-[#F2F2F7] rounded-xl p-4 space-y-2'}>
        {[
          { label: 'السعر الأساسي', value: `${fmt(result.basePrice)} د.ل` },
          { label: 'الوزن الحجمي', value: `${result.volumetricWeight.toFixed(2)} كغ` },
          { label: 'الوزن المحاسَب', value: `${result.chargeableWeight.toFixed(2)} كغ` },
          { label: 'سعر الكغ الإضافي', value: `${fmt(result.kgRate)} د.ل` },
          ...(result.extraCharge > 0
            ? [{ label: 'رسوم الوزن الإضافي', value: `${fmt(result.extraCharge)} د.ل` }]
            : []),
          ...(result.isSmall
            ? [{ label: 'نوع الشحنة', value: 'صغيرة (أبعاد ≤ 30سم)' }]
            : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-[#6C6C70]">{label}</span>
            <span className="text-[#1C1C1E] font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Packaging */}
      {result.needsPackaging && (
        <div className={compact ? 'flex items-center justify-between text-xs' : 'flex items-center justify-between px-4 py-2 bg-amber-50 rounded-xl border border-amber-100'}>
          <span className={compact ? 'text-[#6C6C70]' : 'text-amber-700 text-sm'}>تكلفة التغليف</span>
          <span className={compact ? 'text-[#1C1C1E] font-medium' : 'text-amber-800 font-bold'}>{fmt(result.packagingCost)} د.ل</span>
        </div>
      )}

      {/* Grand total */}
      <div className={compact ? 'flex items-center justify-between border-t border-[#E5E5EA] pt-2' : 'flex items-center justify-between px-4 py-3 bg-[#E5302A]/5 rounded-xl border border-[#E5302A]/20'}>
        <span className={compact ? 'text-sm font-semibold text-[#1C1C1E]' : 'text-sm font-semibold text-[#1C1C1E]'}>الإجمالي</span>
        <span className="text-base font-bold text-[#E5302A]">{fmt(result.grandTotal)} د.ل</span>
      </div>
    </div>
  ) : selectedCityName ? (
    <div className="text-center py-4 text-sm text-[#6C6C70]">
      لا يوجد سعر لنوع التوصيل المختار في هذه المدينة
    </div>
  ) : (
    <div className="text-center py-4 text-sm text-[#6C6C70]">
      اختر مدينة لحساب تكلفة التوصيل
    </div>
  );

  // ── Compact mode ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="space-y-3">
        {formFields}
        {resultDisplay}
      </div>
    );
  }

  // ── Full mode ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" dir="rtl">
      {/* Hero */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-[#E5302A]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-[#E5302A]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1C1C1E] mb-1">كيف يتم الحساب؟</h2>
            <p className="text-xs text-[#6C6C70] leading-relaxed">
              إذا كانت أبعاد الشحنة ≤ 30×30×30 سم فهي &quot;صغيرة&quot; وتُشحن بالسعر الأساسي فقط.
              للشحنات الأكبر يُحسب الوزن الحجمي = (ط×ع×ا)/5000 ويُقارن بالوزن الفعلي؛ يُطبَّق الأعلى.
              تكلفة التغليف = 10 د.ل + 0.33 لكل سم زائد عن 30.
            </p>
          </div>
        </div>

        {/* Formula chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { icon: <Package className="w-3 h-3" />, text: 'صغيرة ≤30سم: السعر الأساسي فقط' },
            { icon: <Info className="w-3 h-3" />, text: 'الوزن الحجمي = (ط×ع×ا)÷5000' },
            { icon: <Truck className="w-3 h-3" />, text: 'الإضافة = max(وزن فعلي، حجمي) × سعر/كغ' },
          ].map(({ icon, text }) => (
            <span
              key={text}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F2F2F7] rounded-full text-xs text-[#6C6C70]"
            >
              {icon}
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#E5302A]" />
            بيانات الشحنة
          </h3>
          {formFields}
        </div>

        {/* Right: Result */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#E5302A]" />
            نتيجة الحساب
          </h3>
          {resultDisplay}
        </div>
      </div>

      {/* Price table */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E5EA]">
          <h3 className="text-sm font-semibold text-[#1C1C1E]">جدول أسعار طلبك</h3>
          <p className="text-xs text-[#6C6C70] mt-0.5">الأسعار الأساسية (قبل إضافات الوزن والتغليف)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F2F2F7]">
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[#6C6C70]">المدينة</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-[#6C6C70]">للبيت</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-[#6C6C70]">للمكتب</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-[#6C6C70]">نسائي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7]">
              {SORTED_CITIES.map((city) => (
                <tr
                  key={city.name}
                  className={`hover:bg-[#F2F2F7]/50 transition-colors ${
                    city.name === selectedCityName ? 'bg-[#E5302A]/5' : ''
                  }`}
                  onClick={() => setSelectedCityName(city.name)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="px-4 py-2.5 font-medium text-[#1C1C1E]">{city.name}</td>
                  <td className="px-4 py-2.5 text-center text-[#1C1C1E]">
                    {city.home !== null ? (
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {city.home} د.ل
                      </span>
                    ) : (
                      <span className="text-[#E5E5EA]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[#1C1C1E]">
                    {city.office !== null ? (
                      <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        {city.office} د.ل
                      </span>
                    ) : (
                      <span className="text-[#E5E5EA]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[#1C1C1E]">
                    {city.female !== null ? (
                      <span className="inline-block px-2 py-0.5 bg-pink-50 text-pink-700 rounded-full text-xs font-medium">
                        {city.female} د.ل
                      </span>
                    ) : (
                      <span className="text-[#E5E5EA]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
