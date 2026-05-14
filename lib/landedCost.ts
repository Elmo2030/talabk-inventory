import { LandedCostMethod, PurchaseInvoiceItem } from '@/lib/types';

/** Distribute totalLandedCost across items by chosen method.
 *  Returns a map: itemRowId → allocated amount */
export function allocateLandedCosts(
  rows: Array<{ id: string; lineTotal: number; quantity: number }>,
  totalLandedCost: number,
  method: LandedCostMethod
): Record<string, number> {
  if (rows.length === 0 || totalLandedCost === 0) {
    return Object.fromEntries(rows.map((r) => [r.id, 0]));
  }
  switch (method) {
    case 'VALUE': {
      const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0);
      if (subtotal === 0) break;
      return Object.fromEntries(
        rows.map((r) => [r.id, totalLandedCost * (r.lineTotal / subtotal)])
      );
    }
    case 'QUANTITY': {
      const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
      if (totalQty === 0) break;
      return Object.fromEntries(
        rows.map((r) => [r.id, totalLandedCost * (r.quantity / totalQty)])
      );
    }
    case 'EQUAL': {
      const perRow = totalLandedCost / rows.length;
      return Object.fromEntries(rows.map((r) => [r.id, perRow]));
    }
  }
  // fallback: equal split
  const perRow = totalLandedCost / rows.length;
  return Object.fromEntries(rows.map((r) => [r.id, perRow]));
}

/** Weighted Moving Average Cost formula:
 *  newMAC = (currentQty * currentMAC + newQty * newUnitCost) / (currentQty + newQty) */
export function calculateNewMAC(
  currentQty: number,
  currentMAC: number,
  newQty: number,
  newUnitCost: number  // = unitPrice + landedCostPerUnit
): number {
  const totalQty = currentQty + newQty;
  if (totalQty === 0) return newUnitCost;
  return (currentQty * currentMAC + newQty * newUnitCost) / totalQty;
}

/** Build fully-computed PurchaseInvoiceItems from form rows + landed costs */
export function computeInvoiceItems(
  rows: Array<{
    id: string;
    itemId: string;
    itemName: string;
    itemCode: string;
    category: string;
    quantity: number;
    unitPrice: number;
  }>,
  totalLandedCost: number,
  method: LandedCostMethod,
  currentBalances: Record<string, number>,   // itemId → current qty in stock
  currentMACs: Record<string, number>        // itemId → current MAC
): PurchaseInvoiceItem[] {
  const allocations = allocateLandedCosts(
    rows.map((r) => ({ id: r.id, lineTotal: r.quantity * r.unitPrice, quantity: r.quantity })),
    totalLandedCost,
    method
  );

  return rows.map((r) => {
    const lineTotal = r.quantity * r.unitPrice;
    const allocatedLandedCost = allocations[r.id] ?? 0;
    const landedCostPerUnit = r.quantity > 0 ? allocatedLandedCost / r.quantity : 0;
    const totalUnitCost = r.unitPrice + landedCostPerUnit;
    const prevMAC = currentMACs[r.itemId] ?? r.unitPrice;
    const currentQty = currentBalances[r.itemId] ?? 0;
    const newMAC = calculateNewMAC(currentQty, prevMAC, r.quantity, totalUnitCost);

    return {
      id: r.id,
      itemId: r.itemId,
      itemName: r.itemName,
      itemCode: r.itemCode,
      category: r.category,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      lineTotal,
      allocatedLandedCost,
      landedCostPerUnit,
      totalUnitCost,
      previousMAC: prevMAC,
      newMAC,
    };
  });
}
