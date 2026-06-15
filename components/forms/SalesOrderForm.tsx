'use client';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Plus, Minus, Trash2, Search, X, ShoppingCart, User, MapPin, Package, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { useItems, useOrders, useMovements, useSalesReps, useCustomers } from '@/lib/StockContext';
import { Item, Coupon } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ShippingCalcResult } from '@/lib/data/talabkCities';
import { SORTED_CITIES, DeliveryType, getBasePrice, TALABK_CITIES } from '@/lib/data/talabkCities';
import TalabkCalculator from '@/components/shipping/TalabkCalculator';
import { couponsStorage } from '@/lib/storage/couponsStorage';
import { storeSettingsService } from '@/lib/services/storeSettingsService';
import type { StoreSettings } from '@/lib/types';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

type CartItem = {
  itemId: string;
  itemName: string;
  itemCode: string;
  category: string;
  quantity: number;
  sellingPrice: number;
  costSnapshot: number;
  serialNumbers?: string[];  // Feature B
};

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-[#E5E5EA] text-sm text-[#1C1C1E] bg-white focus:outline-none focus:border-[#E5302A] focus:ring-2 focus:ring-[#E5302A]/20';
const labelClass = 'block text-xs font-medium text-[#6C6C70] mb-1.5';

const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  home: 'توصيل للبيت',
  office: 'توصيل للمكتب',
  female: 'توصيل نسائي',
};

function fmt(n: number) {
  return formatMoney(n, { withSuffix: false });
}

export default function SalesOrderForm({ onSuccess, onCancel }: Props) {
  const { items } = useItems();
  const { addSalesOrder } = useOrders();
  const { getCurrentBalance } = useMovements();
  const { salesReps } = useSalesReps();
  const { customers, customerBalances } = useCustomers();
  const { confirm } = useConfirm();

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('home');
  const [notes, setNotes] = useState('');
  // Sales rep attribution — empty string = no rep (walk-in / store sale).
  const [repId, setRepId] = useState('');
  // Registered customer attribution. Empty = walk-in; fields below stay
  // editable. Selecting a registered customer pre-fills name/phone/city
  // and surfaces their running balance + credit headroom.
  const [customerId, setCustomerId] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);
  // Barcode scan flow (Wave G #4). HID scanners type into the focused
  // input and send Enter as the line terminator. We pre-bin items by
  // barcode for O(1) lookup so even a 10k-item tenant scans instantly.
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeError, setBarcodeError] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Shipping
  const [shippingResult, setShippingResult] = useState<ShippingCalcResult | null>(null);
  const [shippingOnStore, setShippingOnStore] = useState(false);
  const [packagingOnStore, setPackagingOnStore] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // ── Draft autosave (localStorage) ──────────────────────────────────────
  // Restores any in-progress order on mount and persists every change so
  // accidental refreshes / closed tabs don't lose work. Cleared on submit.
  const DRAFT_KEY = 'talabk_order_draft_v1';
  const isHydrated = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<{
          customerName: string;
          customerPhone: string;
          customerCity: string;
          deliveryType: DeliveryType;
          notes: string;
          cart: CartItem[];
          shippingOnStore: boolean;
          packagingOnStore: boolean;
          couponInput: string;
          repId: string;
          customerId: string;
        }>;
        if (d.customerName)    setCustomerName(d.customerName);
        if (d.customerPhone)   setCustomerPhone(d.customerPhone);
        if (d.customerCity)    setCustomerCity(d.customerCity);
        if (d.deliveryType)    setDeliveryType(d.deliveryType);
        if (d.notes)           setNotes(d.notes);
        if (d.cart)            setCart(d.cart);
        if (d.shippingOnStore !== undefined)  setShippingOnStore(d.shippingOnStore);
        if (d.packagingOnStore !== undefined) setPackagingOnStore(d.packagingOnStore);
        if (d.couponInput)     setCouponInput(d.couponInput);
        if (d.repId)           setRepId(d.repId);
        if (d.customerId)      setCustomerId(d.customerId);
      }
    } catch { /* corrupt JSON — ignore */ }
    isHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!isHydrated.current || typeof window === 'undefined') return;
    // Only persist a draft when there's actual content
    const hasContent = customerName || customerPhone || customerCity || cart.length > 0 || notes;
    if (!hasContent) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        customerName, customerPhone, customerCity, deliveryType, notes, cart,
        shippingOnStore, packagingOnStore, couponInput, repId, customerId,
      }));
    } catch { /* quota error — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName, customerPhone, customerCity, deliveryType, notes, cart,
      shippingOnStore, packagingOnStore]);

  const clearDraft = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY);
  };

  // VAT settings — loaded from Supabase with localStorage fallback
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('talabk_store_settings') : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    storeSettingsService.get()
      .then((s) => setStoreSettings(s))
      .catch(() => {
        // Supabase unavailable — localStorage fallback already applied in initial state
      });
  }, []);

  const vatEnabled: boolean = storeSettings.vatEnabled ?? false;
  const vatRate: number = storeSettings.vatRate ?? 15;

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // Active items — memoized so a 500-item tenant doesn't re-filter on every
  // unrelated keystroke (customer name, phone, notes, etc.).
  const activeItems = useMemo(
    () => items.filter((i) => i.status === 'ACTIVE'),
    [items]
  );

  // Available delivery types for selected city.
  const selectedCity = useMemo(
    () => TALABK_CITIES.find((c) => c.name === customerCity),
    [customerCity]
  );
  const availableDeliveryTypes: DeliveryType[] = useMemo(
    () =>
      selectedCity
        ? (['home', 'office', 'female'] as DeliveryType[]).filter(
            (t) => getBasePrice(selectedCity, t) !== null
          )
        : ['home', 'office', 'female'],
    [selectedCity]
  );

  // Item picker filtered — depends only on `activeItems` + `itemSearch`,
  // not on cart / customer / discount state. Also searches barcode so a
  // partial scan / manual barcode lookup works in the picker too.
  const pickerItems = useMemo(() => {
    if (!itemSearch) return activeItems;
    const q = itemSearch.toLowerCase();
    return activeItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.barcode ?? '').toLowerCase().includes(q)
    );
  }, [activeItems, itemSearch]);

  // Exact-match barcode index. Built once per items-change so the scan
  // loop is O(1) regardless of catalog size.
  const itemByBarcode = useMemo(() => {
    const m = new Map<string, Item>();
    for (const it of activeItems) if (it.barcode) m.set(it.barcode.trim(), it);
    return m;
  }, [activeItems]);

  // Currently selected registered customer's type — empty string for
  // walk-in sales (which means "no customer-type tier applies").
  const activeCustomerType = useMemo(() => {
    if (!customerId) return '' as const;
    return customers.find((c) => c.id === customerId)?.customerType ?? '' as const;
  }, [customerId, customers]);

  // ── Tier price helpers — stable callbacks ────────────────────────────────
  // Picker order (Wave G #3):
  //   1. Tier with matching customerType AND qty >= minQty → wins.
  //      Among matches we pick the one with the highest minQty (deepest
  //      discount) so wholesale customers buying in bulk get the bulk
  //      step too.
  //   2. Tier without customerType AND qty >= minQty → fallback (legacy
  //      quantity tier).
  //   3. item.sellingPrice.
  //
  // Both helpers share the same selection logic so the price + label
  // come from the same tier — no chance of "shows wholesale label, uses
  // retail price".
  function pickTier(item: Item, qty: number, custType: '' | 'retail' | 'wholesale' | 'vip') {
    if (!item.priceTiers || item.priceTiers.length === 0) return null;
    let bestCustomerMin = -1;
    let bestCustomer: NonNullable<Item['priceTiers']>[number] | null = null;
    let bestQtyMin = -1;
    let bestQty: NonNullable<Item['priceTiers']>[number] | null = null;
    for (const t of item.priceTiers) {
      if (qty < t.minQty) continue;
      if (custType && t.customerType === custType) {
        if (t.minQty > bestCustomerMin) {
          bestCustomerMin = t.minQty;
          bestCustomer = t;
        }
      } else if (!t.customerType) {
        if (t.minQty > bestQtyMin) {
          bestQtyMin = t.minQty;
          bestQty = t;
        }
      }
    }
    return bestCustomer ?? bestQty;
  }

  const getBestTierPrice = useCallback((item: Item, qty: number): number | null => {
    const t = pickTier(item, qty, activeCustomerType);
    return t ? t.price : null;
  }, [activeCustomerType]);

  const getBestTierLabel = useCallback((item: Item, qty: number): string | null => {
    const t = pickTier(item, qty, activeCustomerType);
    if (!t) return null;
    return t.label ?? null;
  }, [activeCustomerType]);

  // Whether the currently-applied tier is a customer-type tier (used for
  // the "auto applied" badge next to the cart line).
  const isCustomerTypeTierActive = useCallback((item: Item, qty: number): boolean => {
    const t = pickTier(item, qty, activeCustomerType);
    return !!(t && t.customerType);
  }, [activeCustomerType]);

  const addToCart = (item: Item) => {
    const existing = cart.find((c) => c.itemId === item.id);
    if (existing) {
      // When re-adding, bump qty and recalculate tier price
      setCart((prev) =>
        prev.map((c) => {
          if (c.itemId !== item.id) return c;
          const newQty = c.quantity + 1;
          const tierPrice = getBestTierPrice(item, newQty);
          return { ...c, quantity: newQty, sellingPrice: tierPrice ?? item.sellingPrice };
        })
      );
    } else {
      const costSnapshot = item.movingAverageCost ?? item.purchasePrice ?? 0;
      // At qty=1 check if any tier applies
      const tierPrice = getBestTierPrice(item, 1);
      setCart((prev) => [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          category: item.category,
          quantity: 1,
          sellingPrice: tierPrice ?? item.sellingPrice,
          costSnapshot,
        },
      ]);
    }
    setItemSearch('');
  };

  // Barcode scan: called on Enter inside the dedicated input. Looks up
  // exact match in `itemByBarcode`, adds to cart, clears. Shows an
  // inline error for 1.5s on miss so the cashier doesn't have to chase
  // a toast across the screen.
  const handleBarcodeScan = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    const hit = itemByBarcode.get(code);
    if (hit) {
      addToCart(hit);
      setBarcodeInput('');
      setBarcodeError('');
      // Keep focus so the next scan works without clicking back.
      requestAnimationFrame(() => barcodeInputRef.current?.focus());
    } else {
      setBarcodeError(`لا يوجد صنف بالباركود "${code}"`);
      setBarcodeInput('');
      requestAnimationFrame(() => barcodeInputRef.current?.focus());
      window.setTimeout(() => setBarcodeError(''), 1500);
    }
  };

  // When the active customer's type changes (or a customer is unselected),
  // re-run the tier picker over every cart line so wholesale/vip prices
  // auto-apply or revert. Manual price overrides are preserved: we only
  // reprice a line whose current sellingPrice matches a price the picker
  // would have produced under the *previous* state — i.e. the cashier
  // didn't type a custom number.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCart((prev) => prev.map((c) => {
      const item = items.find((i) => i.id === c.itemId);
      if (!item) return c;
      const newTierPrice = getBestTierPrice(item, c.quantity);
      // Heuristic: if current price equals item.sellingPrice or any tier
      // price for this item, treat it as auto-priced and replace it.
      // Otherwise (custom typed value) leave alone.
      const knownPrices = new Set<number>([item.sellingPrice]);
      for (const t of item.priceTiers ?? []) knownPrices.add(t.price);
      if (!knownPrices.has(c.sellingPrice)) return c;
      const next = newTierPrice ?? item.sellingPrice;
      return next === c.sellingPrice ? c : { ...c, sellingPrice: next };
    }));
  }, [activeCustomerType]);

  const updateQtyWithTier = (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    setCart((prev) =>
      prev.map((c) => {
        if (c.itemId !== itemId) return c;
        const newQty = Math.max(1, c.quantity + delta);
        const tierPrice = item ? getBestTierPrice(item, newQty) : null;
        const newPrice = tierPrice ?? (item?.sellingPrice ?? c.sellingPrice);
        return { ...c, quantity: newQty, sellingPrice: newPrice };
      })
    );
  };

  const updatePrice = (itemId: string, price: number) => {
    setCart((prev) =>
      prev.map((c) => (c.itemId === itemId ? { ...c, sellingPrice: Math.max(0, price) } : c))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId));
  };

  const updateSerialNumbers = (itemId: string, raw: string) => {
    const serials = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    setCart((prev) =>
      prev.map((c) => (c.itemId === itemId ? { ...c, serialNumbers: serials } : c))
    );
  };

  const handleShippingChange = useCallback((result: ShippingCalcResult | null) => {
    setShippingResult(result);
  }, []);

  // ── Coupon helpers ────────────────────────────────────────────────────────
  const applyCoupon = () => {
    setCouponError('');
    const coupon = couponsStorage.getByCode(couponInput.trim());
    if (!coupon) { setCouponError('الكوبون غير موجود'); return; }
    if (!coupon.isActive) { setCouponError('هذا الكوبون غير نشط'); return; }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) { setCouponError('انتهت صلاحية الكوبون'); return; }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) { setCouponError('وصل الكوبون للحد الأقصى من الاستخدامات'); return; }
    setAppliedCoupon(coupon);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  // ── Profit calculations ───────────────────────────────────────────────────
  const subtotalProducts = cart.reduce((s, i) => s + i.quantity * i.sellingPrice, 0);
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'percentage'
      ? (subtotalProducts * appliedCoupon.value) / 100
      : Math.min(appliedCoupon.value, subtotalProducts)
    : 0;
  const totalCOGS = cart.reduce((s, i) => s + i.quantity * i.costSnapshot, 0);
  const shippingCost = shippingResult?.shippingCost ?? 0;
  const packagingCost = shippingResult?.packagingCost ?? 0;
  const storeShippingExpense = shippingOnStore ? shippingCost : 0;
  const storePackagingExpense = packagingOnStore ? packagingCost : 0;
  const customerTotal =
    subtotalProducts -
    discountAmount +
    (shippingOnStore ? 0 : shippingCost) +
    (packagingOnStore ? 0 : packagingCost);
  const vatBase = subtotalProducts - discountAmount;
  const vatAmount = vatEnabled ? (vatBase * vatRate) / 100 : 0;
  const grossProfit = subtotalProducts - discountAmount - totalCOGS;
  const netProfit = grossProfit - storeShippingExpense - storePackagingExpense;
  const profitMargin = subtotalProducts > 0 ? (netProfit / subtotalProducts) * 100 : 0;

  const validate = () => {
    const errs: string[] = [];
    if (!customerName.trim()) errs.push('اسم العميل مطلوب');
    if (!customerCity) errs.push('المدينة مطلوبة');
    if (cart.length === 0) errs.push('أضف منتجاً واحداً على الأقل');
    if (!shippingResult) errs.push('احسب تكلفة التوصيل أولاً');
    // Credit-limit client-side check. The RPC enforces this server-side
    // too — duplicating here gives the cashier instant feedback before
    // the round-trip.
    if (customerId) {
      const cust = customers.find((c) => c.id === customerId);
      const bal  = customerBalances.find((b) => b.customerId === customerId);
      if (cust) {
        const outstanding = bal?.outstanding ?? cust.openingBalance;
        const proposed    = outstanding + customerTotal;
        if (cust.creditLimit > 0 && proposed > cust.creditLimit) {
          errs.push(`الطلب يتجاوز الحد الائتماني للعميل (${cust.creditLimit.toFixed(2)} د.ل)`);
        } else if (cust.creditLimit === 0 && customerTotal > 0) {
          errs.push('هذا العميل نقدي فقط — لا يمكن إصدار طلب بالأجل');
        }
      }
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);

    const confirmed = await confirm({
      title: 'تأكيد حفظ الطلب',
      description: 'سيتم خصم الكميات المطلوبة من المخزون ولا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟',
      variant: 'warning',
      confirmLabel: 'نعم، حفظ الطلب',
      cancelLabel: 'إلغاء',
    });
    if (!confirmed) return;

    setSaving(true);

    const orderItems = cart.map((c, idx) => ({
      id: `oi-${Date.now()}-${idx}`,
      itemId: c.itemId,
      itemName: c.itemName,
      itemCode: c.itemCode,
      category: c.category,
      quantity: c.quantity,
      sellingPrice: c.sellingPrice,
      lineTotal: c.quantity * c.sellingPrice,
      costSnapshot: c.costSnapshot,
      lineCost: c.quantity * c.costSnapshot,
    }));

    // Increment coupon usage
    if (appliedCoupon) {
      couponsStorage.incrementUsed(appliedCoupon.id);
    }

    const result = await addSalesOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerCity,
      deliveryType,
      items: orderItems,
      shippingLength: 0,
      shippingWidth: 0,
      shippingHeight: 0,
      shippingWeight: 0,
      needsPackaging: shippingResult?.needsPackaging ?? false,
      subtotalProducts,
      shippingCost,
      packagingCost,
      shippingOnStore,
      packagingOnStore,
      customerTotal,
      totalCOGS,
      storeShippingExpense,
      storePackagingExpense,
      grossProfit,
      vatRate: vatEnabled ? vatRate : undefined,
      vatAmount: vatEnabled ? vatAmount : undefined,
      netProfit,
      profitMargin,
      status: 'PENDING',
      notes: notes.trim(),
      couponCode: appliedCoupon?.code,
      discountType: appliedCoupon?.type,
      discountValue: appliedCoupon?.value,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      repId: repId || undefined,
      repName: repId ? salesReps.find((r) => r.id === repId)?.name : undefined,
      customerId: customerId || undefined,
    });

    setSaving(false);
    if (result.success) {
      clearDraft();
      onSuccess();
    } else {
      setErrors([result.error ?? 'فشل حفظ الطلب']);
    }
  };

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Section 1: Customer */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#E5302A]" />
              بيانات العميل
            </h2>

            {/* Registered-customer picker. Hidden when no registered
                customers exist so retail-only tenants don't see a
                dead-end widget. */}
            {customers.length > 0 && (
              <div className="mb-4">
                <label className={labelClass}>عميل مسجّل (اختياري)</label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCustomerId(id);
                    // Pre-fill the walk-in fields from the registered
                    // customer so the cashier doesn't retype anything.
                    if (id) {
                      const c = customers.find((x) => x.id === id);
                      if (c) {
                        setCustomerName(c.name);
                        if (c.phone) setCustomerPhone(c.phone);
                        if (c.city)  setCustomerCity(c.city);
                      }
                    }
                  }}
                  className={inputClass + ' appearance-none'}
                  dir="rtl"
                >
                  <option value="">— عميل عابر —</option>
                  {customers
                    .filter((c) => c.status === 'ACTIVE' || c.id === customerId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
                {(() => {
                  if (!customerId) return null;
                  const cust = customers.find((c) => c.id === customerId);
                  const bal  = customerBalances.find((b) => b.customerId === customerId);
                  if (!cust) return null;
                  const outstanding = bal?.outstanding ?? cust.openingBalance;
                  const newUnpaid   = Math.max(0, customerTotal - 0); // assume fully unpaid at order time
                  const proposed    = outstanding + newUnpaid;
                  const over        = cust.creditLimit > 0 && proposed > cust.creditLimit;
                  const cashOnly    = cust.creditLimit === 0;
                  return (
                    <div className={`mt-2 text-xs rounded-xl p-3 ${
                      over
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : cashOnly
                          ? 'bg-amber-50 border border-amber-200 text-amber-700'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">
                          {cashOnly ? 'هذا العميل نقدي فقط' : `الحد الائتماني: ${cust.creditLimit.toFixed(2)} د.ل`}
                        </span>
                        {over && <span className="font-bold">تجاوز الحد!</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px]">
                        <span>المستحق الحالي: <strong className="font-mono">{outstanding.toFixed(2)}</strong></span>
                        <span>هذا الطلب: <strong className="font-mono">{newUnpaid.toFixed(2)}</strong></span>
                        <span>الإجمالي المتوقع: <strong className="font-mono">{proposed.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>اسم العميل *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                  placeholder="الاسم الكامل"
                  dir="rtl"
                />
              </div>
              <div>
                <label className={labelClass}>رقم الهاتف</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={inputClass}
                  placeholder="09XXXXXXXX"
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>المدينة *</label>
                <div className="relative">
                  <select
                    value={customerCity}
                    onChange={(e) => {
                      setCustomerCity(e.target.value);
                      const city = TALABK_CITIES.find((c) => c.name === e.target.value);
                      if (city) {
                        const available = (['home', 'office', 'female'] as DeliveryType[]).filter(
                          (t) => getBasePrice(city, t) !== null
                        );
                        if (available.length > 0 && !available.includes(deliveryType)) {
                          setDeliveryType(available[0]);
                        }
                      }
                    }}
                    className={inputClass + ' appearance-none'}
                    dir="rtl"
                  >
                    <option value="">اختر المدينة...</option>
                    {SORTED_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>نوع التوصيل</label>
                <div className="relative">
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                    className={inputClass + ' appearance-none'}
                    dir="rtl"
                    disabled={availableDeliveryTypes.length === 0}
                  >
                    {availableDeliveryTypes.map((t) => (
                      <option key={t} value={t}>
                        {DELIVERY_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Sales rep attribution. Hidden when no reps are defined so
                  tenants that don't use the field-sales model don't see a
                  dead-end picker. */}
              {salesReps.length > 0 && (
                <div>
                  <label className={labelClass}>المندوب</label>
                  <div className="relative">
                    <select
                      value={repId}
                      onChange={(e) => setRepId(e.target.value)}
                      className={inputClass + ' appearance-none'}
                      dir="rtl"
                    >
                      <option value="">— بدون مندوب —</option>
                      {salesReps
                        .filter((r) => r.status === 'ACTIVE' || r.id === repId)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {r.territory ? `· ${r.territory}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={labelClass}>ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={inputClass + ' resize-none'}
                  placeholder="ملاحظات إضافية..."
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Cart */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#1C1C1E] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#E5302A]" />
                المنتجات
              </h2>
              <button
                onClick={() => setShowItemPicker(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#E5302A]/10 hover:bg-[#E5302A]/20 text-[#E5302A] text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة منتج
              </button>
            </div>

            {/* Barcode scan input. Visible only if at least one item in
                the catalog has a barcode — otherwise the row is dead
                space. HID scanners send Enter automatically. */}
            {itemByBarcode.size > 0 && (
              <div className="mb-4">
                <label className="block text-xs text-[#6C6C70] mb-1">امسح الباركود</label>
                <div className="relative">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeScan();
                      }
                    }}
                    placeholder="ضع المؤشر هنا ثم امسح بالماسح"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm text-[#1C1C1E] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 bg-white ${
                      barcodeError
                        ? 'border-red-400 focus:ring-red-500/20'
                        : 'border-[#E5E5EA] focus:border-[#E5302A] focus:ring-[#E5302A]/20'
                    }`}
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  {barcodeError && (
                    <p className="absolute right-0 top-full mt-1 text-[11px] text-red-600">{barcodeError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Item picker modal */}
            {showItemPicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowItemPicker(false)}>
                <div
                  className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-4 border-b border-[#E5E5EA]">
                    <h3 className="text-sm font-semibold text-[#1C1C1E]">اختر منتجاً</h3>
                    <button onClick={() => setShowItemPicker(false)} className="p-1 text-[#6C6C70] hover:text-[#1C1C1E] rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 border-b border-[#E5E5EA]">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C70]" />
                      <input
                        type="text"
                        placeholder="بحث بالاسم أو الكود..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 rounded-xl border border-[#E5E5EA] text-sm focus:outline-none focus:border-[#E5302A]"
                        dir="rtl"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {pickerItems.length === 0 ? (
                      <p className="text-center py-8 text-sm text-[#6C6C70]">لا توجد نتائج</p>
                    ) : (
                      pickerItems.map((item) => {
                        const inCart = cart.some((c) => c.itemId === item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-right transition-colors ${inCart ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-[#F2F2F7]'}`}
                          >
                            <div className="flex items-center gap-2">
                              {inCart && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex-shrink-0">✓</span>
                              )}
                              <div>
                                <p className="text-sm font-medium text-[#1C1C1E]">{item.name}</p>
                                <p className="text-xs text-[#6C6C70]">{item.code} · {item.category}</p>
                                <p className="text-xs text-[#6C6C70]">
                                  الرصيد:{' '}
                                  <span className={getCurrentBalance(item.id) <= 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                                    {getCurrentBalance(item.id)}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-[#E5302A] whitespace-nowrap">
                              {fmt(item.sellingPrice)} د.ل
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {/* Done button */}
                  <div className="p-3 border-t border-[#E5E5EA]">
                    <button
                      onClick={() => setShowItemPicker(false)}
                      className="w-full py-2.5 bg-[#E5302A] text-white rounded-xl font-semibold text-sm"
                    >
                      تم الاختيار ✓
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cart items */}
            {cart.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-[#E5E5EA] rounded-xl">
                <Package className="w-8 h-8 text-[#E5E5EA] mx-auto mb-2" />
                <p className="text-sm text-[#6C6C70]">لم تُضف منتجات بعد</p>
                <button onClick={() => setShowItemPicker(true)} className="mt-2 text-xs text-[#E5302A] hover:underline">
                  + إضافة منتج
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.itemId} className="rounded-xl overflow-hidden bg-[#F2F2F7]">
                  <div
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1C1C1E] truncate">{c.itemName}</p>
                      <p className="text-xs text-[#6C6C70]">{c.itemCode}</p>
                      {(() => {
                        const item = items.find((i) => i.id === c.itemId);
                        const tierLabel = item ? getBestTierLabel(item, c.quantity) : null;
                        const tierPrice = item ? getBestTierPrice(item, c.quantity) : null;
                        const byCustomerType = item ? isCustomerTypeTierActive(item, c.quantity) : false;
                        if (!tierPrice) return null;
                        const fallbackLabel = byCustomerType
                          ? (activeCustomerType === 'wholesale' ? 'سعر الجملة'
                            : activeCustomerType === 'vip' ? 'سعر VIP'
                            : 'سعر التجزئة')
                          : 'سعر الجملة';
                        return (
                          <span className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                            byCustomerType ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {byCustomerType ? '⭐' : '💰'} {tierLabel || fallbackLabel}
                            {byCustomerType ? ' — تطبيق تلقائي' : ` (×${c.quantity})`}
                          </span>
                        );
                      })()}
                    </div>
                    {/* Qty controls */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateQtyWithTier(c.itemId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#E5E5EA] hover:border-[#E5302A] text-[#6C6C70] hover:text-[#E5302A] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-[#1C1C1E]">
                        {c.quantity}
                      </span>
                      <button
                        onClick={() => updateQtyWithTier(c.itemId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#E5E5EA] hover:border-[#E5302A] text-[#6C6C70] hover:text-[#E5302A] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Price */}
                    <div className="flex-shrink-0">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={c.sellingPrice}
                        onChange={(e) => updatePrice(c.itemId, Number(e.target.value))}
                        className="w-24 px-2 py-1.5 text-sm text-center border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#E5302A] bg-white"
                        dir="ltr"
                      />
                    </div>
                    {/* Line total */}
                    <div className="flex-shrink-0 w-24 text-left">
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {fmt(c.quantity * c.sellingPrice)}
                      </p>
                      <p className="text-xs text-[#6C6C70]">د.ل</p>
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(c.itemId)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Feature B: Serial Numbers textarea */}
                  {(() => {
                    const item = items.find((i) => i.id === c.itemId);
                    if (!item?.isSerialTracked) return null;
                    const serialText = (c.serialNumbers ?? []).join('\n');
                    const count = (c.serialNumbers ?? []).length;
                    return (
                      <div className="px-3 pb-3">
                        <label className="block text-xs font-medium text-[#6C6C70] mb-1">
                          أرقام السيريال (رقم لكل سطر)
                          <span className={`mr-2 font-semibold ${count > c.quantity ? 'text-red-500' : 'text-[#1C1C1E]'}`}>
                            {count}/{c.quantity}
                          </span>
                        </label>
                        <textarea
                          rows={Math.min(4, Math.max(2, c.quantity))}
                          value={serialText}
                          onChange={(e) => updateSerialNumbers(c.itemId, e.target.value)}
                          placeholder={'SN-0001\nSN-0002\n...'}
                          className="w-full px-2.5 py-2 text-xs font-mono border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#E5302A] bg-white resize-none"
                          dir="ltr"
                        />
                      </div>
                    );
                  })()}
                  </div>
                ))}
                {/* Subtotal */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-[#E5E5EA] mt-2">
                  <span className="text-xs text-[#6C6C70]">إجمالي المنتجات</span>
                  <span className="text-sm font-bold text-[#1C1C1E]">{fmt(subtotalProducts)} د.ل</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Shipping */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E5302A]" />
              تفاصيل الشحن
            </h2>
            <TalabkCalculator
              compact
              initialCityName={customerCity}
              onChange={handleShippingChange}
            />
          </div>
        </div>

        {/* ── Right sticky summary panel ──────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E5EA]">
              <h2 className="text-sm font-semibold text-[#1C1C1E]">ملخص الطلب</h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Products total */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6C6C70]">إجمالي المنتجات</span>
                <span className="text-sm font-semibold text-[#1C1C1E]">{fmt(subtotalProducts)} د.ل</span>
              </div>

              {/* Coupon */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#6C6C70] flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  كوبون الخصم
                </p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-xs font-bold text-green-800 font-mono">{appliedCoupon.code}</p>
                        <p className="text-xs text-green-600">
                          خصم {appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `${fmt(appliedCoupon.value)} د.ل`}
                          {' · '}-{fmt(discountAmount)} د.ل
                        </p>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="p-1 text-green-600 hover:bg-green-100 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        placeholder="أدخل الكوبون..."
                        className="flex-1 px-2.5 py-1.5 text-xs font-mono uppercase border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#E5302A] bg-white"
                        dir="ltr"
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={!couponInput.trim()}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#1C1C1E] text-white rounded-lg hover:bg-black disabled:opacity-40 transition-colors"
                      >
                        تطبيق
                      </button>
                    </div>
                    {couponError && (
                      <p className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Shipping toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6C6C70]">تكلفة التوصيل</span>
                  <span className="text-sm font-semibold text-[#1C1C1E]">{fmt(shippingCost)} د.ل</span>
                </div>
                <div className="flex rounded-xl overflow-hidden border border-[#E5E5EA] text-xs font-medium">
                  <button
                    onClick={() => setShippingOnStore(true)}
                    className={`flex-1 py-2 transition-colors ${
                      shippingOnStore
                        ? 'bg-[#E5302A] text-white'
                        : 'bg-white text-[#6C6C70] hover:bg-[#F2F2F7]'
                    }`}
                  >
                    على المتجر
                  </button>
                  <button
                    onClick={() => setShippingOnStore(false)}
                    className={`flex-1 py-2 transition-colors ${
                      !shippingOnStore
                        ? 'bg-[#1C1C1E] text-white'
                        : 'bg-white text-[#6C6C70] hover:bg-[#F2F2F7]'
                    }`}
                  >
                    على العميل
                  </button>
                </div>
              </div>

              {/* Packaging toggle */}
              {packagingCost > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6C6C70]">تكلفة التغليف</span>
                    <span className="text-sm font-semibold text-[#1C1C1E]">{fmt(packagingCost)} د.ل</span>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-[#E5E5EA] text-xs font-medium">
                    <button
                      onClick={() => setPackagingOnStore(true)}
                      className={`flex-1 py-2 transition-colors ${
                        packagingOnStore
                          ? 'bg-[#E5302A] text-white'
                          : 'bg-white text-[#6C6C70] hover:bg-[#F2F2F7]'
                      }`}
                    >
                      على المتجر
                    </button>
                    <button
                      onClick={() => setPackagingOnStore(false)}
                      className={`flex-1 py-2 transition-colors ${
                        !packagingOnStore
                          ? 'bg-[#1C1C1E] text-white'
                          : 'bg-white text-[#6C6C70] hover:bg-[#F2F2F7]'
                      }`}
                    >
                      على العميل
                    </button>
                  </div>
                </div>
              )}

              {/* Discount line */}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-green-700">
                  <span>الخصم ({appliedCoupon?.code})</span>
                  <span className="font-semibold">-{fmt(discountAmount)} د.ل</span>
                </div>
              )}

              {/* VAT line */}
              {vatEnabled && vatAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-indigo-700">
                  <span>ضريبة القيمة المضافة ({vatRate}%)</span>
                  <span className="font-semibold">+{fmt(vatAmount)} د.ل</span>
                </div>
              )}

              {/* Customer total */}
              <div className="py-3 border-t border-b border-[#E5E5EA]">
                <p className="text-xs text-[#6C6C70] mb-1">الإجمالي المطلوب من العميل</p>
                <p className="text-3xl font-bold text-[#E5302A]">{fmt(customerTotal + vatAmount)}</p>
                <p className="text-xs text-[#6C6C70]">دينار ليبي</p>
              </div>

              {/* Profit analysis */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#6C6C70] uppercase tracking-wide">تحليل الربحية</p>
                {[
                  { label: 'تكلفة البضاعة المباعة', value: fmt(totalCOGS), color: 'text-[#1C1C1E]' },
                  { label: 'إجمالي المبيعات', value: fmt(subtotalProducts), color: 'text-[#1C1C1E]' },
                  { label: 'هامش الربح الإجمالي', value: fmt(grossProfit), color: grossProfit >= 0 ? 'text-green-600' : 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-[#6C6C70]">{label}</span>
                    <span className={`font-medium ${color}`}>{value} د.ل</span>
                  </div>
                ))}
                {storeShippingExpense > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6C6C70]">مصاريف التوصيل (المتجر)</span>
                    <span className="font-medium text-red-500">-{fmt(storeShippingExpense)} د.ل</span>
                  </div>
                )}
                {storePackagingExpense > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6C6C70]">مصاريف التغليف (المتجر)</span>
                    <span className="font-medium text-red-500">-{fmt(storePackagingExpense)} د.ل</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[#E5E5EA]">
                  <span className="text-sm font-semibold text-[#1C1C1E]">صافي الربح</span>
                  <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(netProfit)} د.ل
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6C6C70]">نسبة هامش الربح</span>
                  <span className={`font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 border border-[#E5E5EA] text-sm font-medium text-[#6C6C70] rounded-xl hover:bg-[#F2F2F7] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ الطلب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


