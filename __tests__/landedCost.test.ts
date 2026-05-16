import { describe, it, expect } from 'vitest';
import {
  allocateLandedCosts,
  calculateNewMAC,
  computeInvoiceItems,
} from '@/lib/landedCost';

// ─────────────────────────────────────────────────────────────────────────────
// allocateLandedCosts
// ─────────────────────────────────────────────────────────────────────────────

describe('allocateLandedCosts', () => {
  const rows = [
    { id: 'a', lineTotal: 600, quantity: 3 },
    { id: 'b', lineTotal: 400, quantity: 2 },
  ];

  it('returns zero allocation when totalLandedCost is 0', () => {
    const result = allocateLandedCosts(rows, 0, 'VALUE');
    expect(result['a']).toBe(0);
    expect(result['b']).toBe(0);
  });

  it('returns zero allocation for empty rows', () => {
    const result = allocateLandedCosts([], 100, 'VALUE');
    expect(Object.keys(result)).toHaveLength(0);
  });

  describe('VALUE method — proportional to line total', () => {
    it('splits 1000 by value (600/400)', () => {
      const result = allocateLandedCosts(rows, 1000, 'VALUE');
      expect(result['a']).toBeCloseTo(600);   // 60%
      expect(result['b']).toBeCloseTo(400);   // 40%
    });

    it('sums to total landed cost', () => {
      const result = allocateLandedCosts(rows, 1000, 'VALUE');
      const total = Object.values(result).reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(1000);
    });
  });

  describe('QUANTITY method — proportional to quantity', () => {
    it('splits 500 by quantity (3/2)', () => {
      const result = allocateLandedCosts(rows, 500, 'QUANTITY');
      expect(result['a']).toBeCloseTo(300);   // 3/5 × 500
      expect(result['b']).toBeCloseTo(200);   // 2/5 × 500
    });

    it('sums to total landed cost', () => {
      const result = allocateLandedCosts(rows, 500, 'QUANTITY');
      const total = Object.values(result).reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(500);
    });
  });

  describe('EQUAL method — equal split per row', () => {
    it('splits 300 equally across 2 rows', () => {
      const result = allocateLandedCosts(rows, 300, 'EQUAL');
      expect(result['a']).toBeCloseTo(150);
      expect(result['b']).toBeCloseTo(150);
    });

    it('splits 100 equally across 4 rows', () => {
      const fourRows = ['c', 'd', 'e', 'f'].map((id) => ({
        id,
        lineTotal: 100,
        quantity: 5,
      }));
      const result = allocateLandedCosts(fourRows, 100, 'EQUAL');
      Object.values(result).forEach((v) => expect(v).toBeCloseTo(25));
    });
  });

  it('handles single row — all landed cost goes to that row', () => {
    const single = [{ id: 'x', lineTotal: 200, quantity: 4 }];
    const r = allocateLandedCosts(single, 80, 'VALUE');
    expect(r['x']).toBeCloseTo(80);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateNewMAC — Weighted Moving Average Cost
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateNewMAC', () => {
  it('basic weighted average: 10 units @ 5 + 10 units @ 7 = 6', () => {
    expect(calculateNewMAC(10, 5, 10, 7)).toBeCloseTo(6);
  });

  it('returns new cost when current qty is 0 (first purchase)', () => {
    expect(calculateNewMAC(0, 0, 5, 10)).toBe(10);
  });

  it('returns current MAC when new qty is 0', () => {
    // totalQty = 10, weighted average leans toward currentMAC
    expect(calculateNewMAC(10, 8, 0, 999)).toBeCloseTo(8);
  });

  it('higher current quantity pulls MAC toward current MAC', () => {
    const mac = calculateNewMAC(100, 10, 10, 20);
    // 100×10 + 10×20 = 1200 / 110 ≈ 10.91
    expect(mac).toBeCloseTo(10.909, 2);
  });

  it('both qtys zero → returns new unit cost', () => {
    // edge case: nothing in stock, buying 0 units (degenerate)
    expect(calculateNewMAC(0, 5, 0, 12)).toBe(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeInvoiceItems — full integration of allocation + MAC
// ─────────────────────────────────────────────────────────────────────────────

describe('computeInvoiceItems', () => {
  const rows = [
    {
      id: 'row1',
      itemId: 'item-A',
      itemName: 'منتج أ',
      itemCode: 'A001',
      category: 'الإلكترونيات',
      quantity: 10,
      unitPrice: 50,
    },
    {
      id: 'row2',
      itemId: 'item-B',
      itemName: 'منتج ب',
      itemCode: 'B001',
      category: 'الإلكترونيات',
      quantity: 5,
      unitPrice: 100,
    },
  ];
  // lineTotal A = 500, lineTotal B = 500 → equal value share

  const landedCost = 100; // 50 to each
  const balances = { 'item-A': 20, 'item-B': 10 };
  const macs = { 'item-A': 45, 'item-B': 90 };

  it('returns correct number of computed items', () => {
    const result = computeInvoiceItems(rows, landedCost, 'VALUE', balances, macs);
    expect(result).toHaveLength(2);
  });

  it('lineTotal is quantity × unitPrice', () => {
    const result = computeInvoiceItems(rows, landedCost, 'VALUE', balances, macs);
    expect(result[0].lineTotal).toBeCloseTo(500);
    expect(result[1].lineTotal).toBeCloseTo(500);
  });

  it('allocatedLandedCost sums to totalLandedCost', () => {
    const result = computeInvoiceItems(rows, landedCost, 'VALUE', balances, macs);
    const total = result.reduce((s, r) => s + r.allocatedLandedCost, 0);
    expect(total).toBeCloseTo(landedCost);
  });

  it('totalUnitCost = unitPrice + landedCostPerUnit', () => {
    const result = computeInvoiceItems(rows, landedCost, 'VALUE', balances, macs);
    result.forEach((r) => {
      const expected = r.unitPrice + r.landedCostPerUnit;
      expect(r.totalUnitCost).toBeCloseTo(expected);
    });
  });

  it('newMAC is correctly updated from previous stock (VALUE split)', () => {
    const result = computeInvoiceItems(rows, landedCost, 'VALUE', balances, macs);
    // item-A: landedPerUnit = 5 → totalUnitCost = 55
    // newMAC = (20×45 + 10×55) / 30 = (900+550)/30 = 48.33...
    expect(result[0].newMAC).toBeCloseTo(48.333, 2);
  });

  it('newMAC for item with zero current balance = totalUnitCost', () => {
    const result = computeInvoiceItems(
      [rows[0]],
      0,
      'VALUE',
      { 'item-A': 0 },
      { 'item-A': 0 }
    );
    // No landed cost, no prior stock → newMAC = unitPrice = 50
    expect(result[0].newMAC).toBeCloseTo(50);
  });

  it('EQUAL allocation gives same landedCostPerUnit regardless of value', () => {
    // Rows have different line totals: 500 and 500 but different quantities
    const result = computeInvoiceItems(rows, 100, 'EQUAL', balances, macs);
    // Each row gets 50, but quantity differs: row1=10 qty → 5/unit, row2=5 qty → 10/unit
    expect(result[0].landedCostPerUnit).toBeCloseTo(5);
    expect(result[1].landedCostPerUnit).toBeCloseTo(10);
  });

  it('preserves original item fields', () => {
    const result = computeInvoiceItems(rows, 0, 'VALUE', {}, {});
    expect(result[0].itemId).toBe('item-A');
    expect(result[0].itemName).toBe('منتج أ');
    expect(result[0].itemCode).toBe('A001');
  });
});
