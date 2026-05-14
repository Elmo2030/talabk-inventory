// ── City data ──────────────────────────────────────────────────────────────────
export type DeliveryType = 'home' | 'office' | 'female';

export type TalabkCity = {
  name: string;
  home: number | null;
  office: number | null;
  female: number | null;
};

export const TALABK_CITIES: TalabkCity[] = [
  // طرابلس وضواحيها
  { name: "طرابلس (الباب للبيت)",       home: 15,   office: null, female: null },
  { name: "طرابلس (توصيل نسائي)",       home: null, office: null, female: 25   },
  { name: "ضواحي طرابلس",               home: 20,   office: null, female: 30   },
  { name: "القره بوللي",                home: 20,   office: null, female: null },
  { name: "زليتن",                      home: 20,   office: null, female: null },
  { name: "الخمس",                      home: 20,   office: null, female: null },
  { name: "ورشفانة / الساعدية",         home: 25,   office: null, female: null },
  { name: "الزاوية",                    home: 25,   office: null, female: null },
  { name: "صرمان",                      home: 25,   office: null, female: null },
  { name: "المطرد",                     home: 25,   office: null, female: null },
  { name: "صبراتة",                     home: 25,   office: null, female: null },
  { name: "غريان",                      home: 25,   office: null, female: 40   },
  { name: "بني وليد",                   home: 30,   office: null, female: null },
  { name: "ترهونة",                     home: 30,   office: null, female: null },
  { name: "مسلاتة",                     home: 30,   office: null, female: null },
  { name: "العجيلات",                   home: 30,   office: null, female: null },
  { name: "زوارة",                      home: 30,   office: null, female: null },
  { name: "الإصابعة",                   home: 30,   office: null, female: null },
  { name: "الجميل",                     home: 35,   office: null, female: null },
  { name: "بوكماش",                     home: 35,   office: null, female: null },
  { name: "رقدالين",                    home: 40,   office: null, female: null },
  { name: "القواليش",                   home: 40,   office: null, female: null },
  { name: "أم الجرسان",                 home: 40,   office: null, female: null },
  { name: "ككلة",                       home: 40,   office: null, female: null },
  { name: "المشاشية",                   home: 40,   office: null, female: null },
  { name: "القلعة",                     home: 40,   office: null, female: null },
  { name: "الرياينة",                   home: 40,   office: null, female: null },
  { name: "الزنتان",                    home: 40,   office: null, female: null },
  { name: "يفرن",                       home: 40,   office: null, female: null },
  { name: "زلطن",                       home: 45,   office: null, female: null },
  { name: "الرجبان",                    home: 45,   office: null, female: null },
  { name: "الرحيبات",                   home: 45,   office: null, female: null },
  { name: "جادو",                       home: 45,   office: null, female: null },
  { name: "الجوش",                      home: 45,   office: null, female: null },
  { name: "تيجي",                       home: 45,   office: null, female: null },
  { name: "الحوامد",                    home: 45,   office: null, female: null },
  { name: "نالوت",                      home: 50,   office: null, female: null },
  { name: "طمزين",                      home: 50,   office: null, female: null },
  { name: "الحرابة",                    home: 50,   office: null, female: null },
  { name: "شكشوك",                      home: 50,   office: null, female: null },
  { name: "بدر",                        home: 50,   office: null, female: null },
  { name: "وازن",                       home: 55,   office: null, female: null },
  // مصراتة والوسط
  { name: "مصراتة",                     home: 25,   office: null, female: null },
  { name: "سرت",                        home: 35,   office: null, female: null },
  { name: "راس لانوف",                  home: 40,   office: null, female: null },
  { name: "قمينس",                      home: 40,   office: null, female: null },
  { name: "البريقة",                    home: 40,   office: null, female: null },
  { name: "بوقرين",                     home: 45,   office: null, female: null },
  { name: "الجفرة",                     home: 45,   office: null, female: null },
  { name: "أوجلة",                      home: 45,   office: null, female: null },
  { name: "تازربو",                     home: 45,   office: null, female: null },
  { name: "جالو",                       home: 50,   office: null, female: null },
  { name: "الكفرة",                     home: 50,   office: null, female: null },
  // بنغازي والشرق
  { name: "بنغازي (لباب البيت)",        home: 30,   office: 15,   female: null },
  { name: "الأبيار",                    home: 40,   office: null, female: null },
  { name: "الأبرق",                     home: 40,   office: null, female: null },
  { name: "المرج",                      home: 40,   office: null, female: null },
  { name: "البيضاء",                    home: 40,   office: null, female: null },
  { name: "شحات",                       home: 40,   office: null, female: null },
  { name: "درنة",                       home: 40,   office: null, female: null },
  { name: "سوسة",                       home: 40,   office: null, female: null },
  { name: "القبة",                      home: 45,   office: null, female: null },
  { name: "طبرق",                       home: 45,   office: null, female: null },
  // الجنوب
  { name: "سبها",                       home: 35,   office: null, female: null },
  { name: "براك الشاطئ",                home: 40,   office: null, female: null },
  { name: "أوباري",                     home: 45,   office: null, female: null },
  { name: "أم الأرانب",                 home: 50,   office: null, female: null },
  { name: "وادي عتبة",                  home: 50,   office: null, female: null },
  { name: "قطرون",                      home: 50,   office: null, female: null },
  { name: "القريات",                    home: 50,   office: null, female: null },
  { name: "مرزق",                       home: 50,   office: null, female: null },
  { name: "تراغن",                      home: 50,   office: null, female: null },
  { name: "غات",                        home: 55,   office: null, female: null },
];

export const SORTED_CITIES = [...TALABK_CITIES].sort((a, b) =>
  a.name.localeCompare(b.name, 'ar')
);

// ── Calculation helpers ────────────────────────────────────────────────────────

export function getKgRate(basePrice: number): number {
  if (basePrice <= 20) return 2.0;
  if (basePrice <= 30) return 2.5;
  if (basePrice <= 40) return 3.0;
  return 3.5;
}

export function roundUpHalf(value: number): number {
  return Math.ceil(value * 2) / 2;
}

export function getBasePrice(city: TalabkCity, type: DeliveryType): number | null {
  if (type === 'home') return city.home;
  if (type === 'office') return city.office;
  if (type === 'female') return city.female;
  return null;
}

export type ShippingCalcResult = {
  cityName: string;
  deliveryType: DeliveryType;
  basePrice: number;
  kgRate: number;
  isSmall: boolean;
  volumetricWeight: number;
  chargeableWeight: number;
  extraCharge: number;
  shippingCost: number;        // final delivery price (rounded)
  needsPackaging: boolean;
  packagingCost: number;
  grandTotal: number;
};

export function calculateShipping(
  city: TalabkCity,
  deliveryType: DeliveryType,
  length: number,
  width: number,
  height: number,
  actualWeight: number,
  needsPackaging: boolean
): ShippingCalcResult | null {
  const basePrice = getBasePrice(city, deliveryType);
  if (basePrice === null) return null;

  const isSmall = length <= 30 && width <= 30 && height <= 30;
  const volumetricWeight = (length * width * height) / 5000;
  const chargeableWeight = isSmall ? 0 : Math.max(actualWeight, volumetricWeight);
  const kgRate = getKgRate(basePrice);
  const extraCharge = isSmall ? 0 : chargeableWeight * kgRate;
  const shippingCost = roundUpHalf(basePrice + extraCharge);

  const extraL = Math.max(0, length - 30);
  const extraW = Math.max(0, width - 30);
  const extraH = Math.max(0, height - 30);
  const packagingCost = needsPackaging
    ? 10 + (extraL + extraW + extraH) * 0.33
    : 0;

  return {
    cityName: city.name,
    deliveryType,
    basePrice,
    kgRate,
    isSmall,
    volumetricWeight,
    chargeableWeight,
    extraCharge,
    shippingCost,
    needsPackaging,
    packagingCost,
    grandTotal: shippingCost + packagingCost,
  };
}
