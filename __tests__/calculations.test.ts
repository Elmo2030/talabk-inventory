import { describe, it, expect } from 'vitest';
import { calcDiscountAmount, calcSalesOrder } from '@/lib/calculations';

// ─────────────────────────────────────────────────────────────────────────────
// calcDiscountAmount
// ─────────────────────────────────────────────────────────────────────────────

describe('calcDiscountAmount', () => {
  it('returns 0 for null discount', () => {
    expect(calcDiscountAmount(500, null)).toBe(0);
  });

  it('percentage: 10% of 200 = 20', () => {
    expect(calcDiscountAmount(200, { type: 'percentage', value: 10 })).toBeCloseTo(20);
  });

  it('percentage: 0% → no discount', () => {
    expect(calcDiscountAmount(500, { type: 'percentage', value: 0 })).toBe(0);
  });

  it('percentage: 100% → full subtotal as discount', () => {
    expect(calcDiscountAmount(500, { type: 'percentage', value: 100 })).toBeCloseTo(500);
  });

  it('fixed: 30 off 200 → 30', () => {
    expect(calcDiscountAmount(200, { type: 'fixed', value: 30 })).toBe(30);
  });

  it('fixed: caps at subtotal — discount cannot exceed order value', () => {
    expect(calcDiscountAmount(50, { type: 'fixed', value: 200 })).toBe(50);
  });

  it('fixed: zero discount value', () => {
    expect(calcDiscountAmount(300, { type: 'fixed', value: 0 })).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcSalesOrder — full financial summary
// ─────────────────────────────────────────────────────────────────────────────

describe('calcSalesOrder', () => {
  const singleItem = [
    { quantity: 2, sellingPrice: 100, costSnapshot: 60 },
  ];
  // subtotal = 200, COGS = 120

  it('basic order with no discount, no VAT, no shipping', () => {
    const r = calcSalesOrder(singleItem, null, 0, false, 0, false, 0, false);
    expect(r.subtotalProducts).toBeCloseTo(200);
    expect(r.discountAmount).toBe(0);
    expect(r.totalCOGS).toBeCloseTo(120);
    expect(r.customerTotal).toBeCloseTo(200);
    expect(r.vatAmount).toBe(0);
    expect(r.grossProfit).toBeCloseTo(80);   // 200 - 0 - 120
    expect(r.netProfit).toBeCloseTo(80);
    expect(r.profitMargin).toBeCloseTo(40);  // 80/200 × 100
  });

  it('applies percentage discount correctly', () => {
    const r = calcSalesOrder(singleItem, { type: 'percentage', value: 10 }, 0, false, 0, false, 0, false);
    // discount = 10% × 200 = 20
    expect(r.discountAmount).toBeCloseTo(20);
    expect(r.customerTotal).toBeCloseTo(180);
    expect(r.grossProfit).toBeCloseTo(60); // 200 - 20 - 120
  });

  it('customer pays shipping when shippingOnStore=false', () => {
    const r = calcSalesOrder(singleItem, null, 30, false, 0, false, 0, false);
    expect(r.customerTotal).toBeCloseTo(230);  // 200 + 30
    expect(r.netProfit).toBeCloseTo(80);       // store doesn't pay shipping
  });

  it('store absorbs shipping when shippingOnStore=true', () => {
    const r = calcSalesOrder(singleItem, null, 30, true, 0, false, 0, false);
    expect(r.customerTotal).toBeCloseTo(200);  // customer pays nothing extra
    expect(r.grossProfit).toBeCloseTo(80);     // grossProfit unchanged
    expect(r.netProfit).toBeCloseTo(50);       // 80 - 30
  });

  it('store absorbs packaging when packagingOnStore=true', () => {
    const r = calcSalesOrder(singleItem, null, 0, false, 15, true, 0, false);
    expect(r.customerTotal).toBeCloseTo(200);
    expect(r.netProfit).toBeCloseTo(65);       // 80 - 15
  });

  it('customer pays packaging when packagingOnStore=false', () => {
    const r = calcSalesOrder(singleItem, null, 0, false, 15, false, 0, false);
    expect(r.customerTotal).toBeCloseTo(215);
    expect(r.netProfit).toBeCloseTo(80);
  });

  it('VAT is added to customer total based on (subtotal - discount)', () => {
    // subtotal=200, discount=0, vatRate=14%
    const r = calcSalesOrder(singleItem, null, 0, false, 0, false, 14, true);
    expect(r.vatAmount).toBeCloseTo(28);       // 14% × 200
    expect(r.customerTotal).toBeCloseTo(228);
  });

  it('VAT ignored when vatEnabled=false', () => {
    const r = calcSalesOrder(singleItem, null, 0, false, 0, false, 14, false);
    expect(r.vatAmount).toBe(0);
    expect(r.customerTotal).toBeCloseTo(200);
  });

  it('VAT applies to discounted base', () => {
    // 10% discount → vatBase = 180 → VAT = 14% × 180 = 25.2
    const r = calcSalesOrder(
      singleItem,
      { type: 'percentage', value: 10 },
      0, false, 0, false, 14, true
    );
    expect(r.vatAmount).toBeCloseTo(25.2);
    expect(r.customerTotal).toBeCloseTo(205.2); // 180 + 25.2
  });

  it('profit margin is 0 when subtotal is 0', () => {
    const r = calcSalesOrder([], null, 0, false, 0, false, 0, false);
    expect(r.profitMargin).toBe(0);
  });

  it('negative grossProfit when discount + COGS > subtotal', () => {
    // Huge discount: 50% × 200 = 100, COGS = 120 → gross = 200-100-120 = -20
    const r = calcSalesOrder(singleItem, { type: 'percentage', value: 50 }, 0, false, 0, false, 0, false);
    expect(r.grossProfit).toBeCloseTo(-20);
    expect(r.profitMargin).toBeLessThan(0);
  });

  it('multi-item cart totals correctly', () => {
    const cart = [
      { quantity: 3, sellingPrice: 50, costSnapshot: 30 },
      { quantity: 2, sellingPrice: 80, costSnapshot: 50 },
    ];
    // subtotal = 3×50 + 2×80 = 150 + 160 = 310
    // COGS = 3×30 + 2×50 = 90 + 100 = 190
    const r = calcSalesOrder(cart, null, 0, false, 0, false, 0, false);
    expect(r.subtotalProducts).toBeCloseTo(310);
    expect(r.totalCOGS).toBeCloseTo(190);
    expect(r.grossProfit).toBeCloseTo(120);
    expect(r.profitMargin).toBeCloseTo((120 / 310) * 100, 2);
  });
});
