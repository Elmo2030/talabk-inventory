/**
 * Pure financial calculation utilities for sales orders.
 * All functions are side-effect-free and fully testable.
 */

export interface CartItem {
  quantity: number;
  sellingPrice: number;
  costSnapshot: number;
}

export interface DiscountInput {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface SalesOrderCalcResult {
  subtotalProducts: number;
  discountAmount: number;
  totalCOGS: number;
  customerTotal: number;
  vatAmount: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number; // percentage, 0-100
}

/**
 * Calculate discount amount from subtotal + coupon/discount config.
 * percentage discount is capped at subtotal (can't go negative).
 */
export function calcDiscountAmount(
  subtotal: number,
  discount: DiscountInput | null
): number {
  if (!discount) return 0;
  if (discount.type === 'percentage') {
    return (subtotal * discount.value) / 100;
  }
  // fixed — cap at subtotal so discount can't exceed order value
  return Math.min(discount.value, subtotal);
}

/**
 * Full sales-order financial calculation.
 *
 * @param cart           items in the cart
 * @param discount       optional coupon/discount
 * @param shippingCost   raw shipping cost
 * @param shippingOnStore  if true, shipping is absorbed by the store (not charged to customer)
 * @param packagingCost  raw packaging cost
 * @param packagingOnStore  if true, packaging is absorbed by the store
 * @param vatRate        VAT percentage (0-100), only applied when vatEnabled is true
 * @param vatEnabled     whether VAT should be added
 */
export function calcSalesOrder(
  cart: CartItem[],
  discount: DiscountInput | null,
  shippingCost: number,
  shippingOnStore: boolean,
  packagingCost: number,
  packagingOnStore: boolean,
  vatRate: number,
  vatEnabled: boolean
): SalesOrderCalcResult {
  const subtotalProducts = cart.reduce(
    (s, i) => s + i.quantity * i.sellingPrice,
    0
  );

  const discountAmount = calcDiscountAmount(subtotalProducts, discount);

  const totalCOGS = cart.reduce(
    (s, i) => s + i.quantity * i.costSnapshot,
    0
  );

  // What the customer pays for shipping/packaging
  const customerShipping = shippingOnStore ? 0 : shippingCost;
  const customerPackaging = packagingOnStore ? 0 : packagingCost;

  // VAT is applied on (subtotal − discount), not on shipping
  const vatBase = subtotalProducts - discountAmount;
  const vatAmount = vatEnabled ? (vatBase * vatRate) / 100 : 0;

  const customerTotal =
    subtotalProducts - discountAmount + customerShipping + customerPackaging + vatAmount;

  // Store absorbs its share of shipping/packaging
  const storeShippingExpense = shippingOnStore ? shippingCost : 0;
  const storePackagingExpense = packagingOnStore ? packagingCost : 0;

  const grossProfit = subtotalProducts - discountAmount - totalCOGS;
  const netProfit = grossProfit - storeShippingExpense - storePackagingExpense;
  const profitMargin =
    subtotalProducts > 0 ? (netProfit / subtotalProducts) * 100 : 0;

  return {
    subtotalProducts,
    discountAmount,
    totalCOGS,
    customerTotal,
    vatAmount,
    grossProfit,
    netProfit,
    profitMargin,
  };
}
