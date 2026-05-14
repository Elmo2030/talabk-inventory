'use client';

import { useMemo } from 'react';
import { useStock } from './StockContext';

// ============================================
// Reports Logic Hook
// كل منطق التقارير في مكان واحد
// ============================================

export function useReports() {
  const { items, suppliers, stockIn, stockOut, currentStock } = useStock();

  // ============================================
  // 1. تقرير الجرد الفعلي
  // ============================================
  const inventoryReport = useMemo(() => {
    return currentStock.map((s) => {
      const item = items.find((i) => i.id === s.itemId);
      return {
        ...s,
        purchasePrice: item?.purchasePrice ?? 0,
        sellingPrice: item?.sellingPrice ?? 0,
        location: item?.location ?? '',
        bookValue: s.currentBalance * (item?.purchasePrice ?? 0),
        marketValue: s.currentBalance * (item?.sellingPrice ?? 0),
        potentialProfit:
          s.currentBalance * ((item?.sellingPrice ?? 0) - (item?.purchasePrice ?? 0)),
      };
    });
  }, [currentStock, items]);

  // ============================================
  // 2. ملخص المشتريات حسب المورد
  // ============================================
  const purchasesSummary = useMemo(() => {
    const summary = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        invoicesCount: number;
        totalQuantity: number;
        totalValue: number;
        lastPurchaseDate: string;
      }
    >();

    stockIn.forEach((m) => {
      const existing = summary.get(m.supplierId);
      if (existing) {
        existing.invoicesCount += 1;
        existing.totalQuantity += m.quantity;
        existing.totalValue += m.totalCost;
        if (m.date > existing.lastPurchaseDate) {
          existing.lastPurchaseDate = m.date;
        }
      } else {
        summary.set(m.supplierId, {
          supplierId: m.supplierId,
          supplierName: m.supplierName ?? '',
          invoicesCount: 1,
          totalQuantity: m.quantity,
          totalValue: m.totalCost,
          lastPurchaseDate: m.date,
        });
      }
    });

    return Array.from(summary.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [stockIn]);

  // ============================================
  // 3. كشف حركة صنف
  // ============================================
  const getItemMovementHistory = (itemId: string) => {
    const inMovements = stockIn
      .filter((m) => m.itemId === itemId)
      .map((m) => ({
        date: m.date,
        type: 'IN' as const,
        operationCode: m.operationCode,
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        totalValue: m.totalCost,
        party: m.supplierName ?? '',
        responsibleEmployee: m.responsibleEmployee,
        reason: 'شراء',
        notes: m.notes ?? '',
      }));

    const outMovements = stockOut
      .filter((m) => m.itemId === itemId)
      .map((m) => ({
        date: m.date,
        type: 'OUT' as const,
        operationCode: m.operationCode,
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        totalValue: m.totalValue,
        party: m.recipientDept,
        responsibleEmployee: m.responsibleEmployee,
        reason: m.reason,
        notes: m.notes ?? '',
      }));

    const combined = [...inMovements, ...outMovements].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // حساب الرصيد المتراكم
    const item = items.find((i) => i.id === itemId);
    let runningBalance = item?.openingQty ?? 0;
    return combined.map((m) => {
      runningBalance += m.type === 'IN' ? m.quantity : -m.quantity;
      return { ...m, runningBalance };
    });
  };

  // ============================================
  // 4. تقرير الأصناف النافذة و تحت الحد
  // ============================================
  const lowStockReport = useMemo(() => {
    return currentStock
      .filter((s) => s.status === 'OUT_OF_STOCK' || s.status === 'NEEDS_REORDER')
      .map((s) => {
        const item = items.find((i) => i.id === s.itemId);
        const reorderQty = (item?.reorderLevel ?? 0) - s.currentBalance;
        return {
          ...s,
          supplierName: item?.supplierName ?? '',
          purchasePrice: item?.purchasePrice ?? 0,
          suggestedReorderQty: Math.max(reorderQty, item?.minStockLevel ?? 0),
          estimatedCost:
            Math.max(reorderQty, item?.minStockLevel ?? 0) * (item?.purchasePrice ?? 0),
        };
      })
      .sort((a, b) => a.currentBalance - b.currentBalance);
  }, [currentStock, items]);

  // ============================================
  // 5. مقارنة المشتريات vs المبيعات شهرياً
  // ============================================
  const monthlyComparison = useMemo(() => {
    const months = new Map<
      string,
      { month: string; purchases: number; sales: number; profit: number }
    >();

    stockIn.forEach((m) => {
      const month = m.date.substring(0, 7); // YYYY-MM
      const existing = months.get(month) ?? {
        month,
        purchases: 0,
        sales: 0,
        profit: 0,
      };
      existing.purchases += m.totalCost;
      months.set(month, existing);
    });

    stockOut.forEach((m) => {
      const month = m.date.substring(0, 7);
      const existing = months.get(month) ?? {
        month,
        purchases: 0,
        sales: 0,
        profit: 0,
      };
      existing.sales += m.totalValue;
      months.set(month, existing);
    });

    const result = Array.from(months.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // حساب الربح
    result.forEach((m) => {
      m.profit = m.sales - m.purchases;
    });

    return result;
  }, [stockIn, stockOut]);

  // ============================================
  // 6. توزيع المخزون حسب التصنيف
  // ============================================
  const categoryDistribution = useMemo(() => {
    const dist = new Map<string, { name: string; value: number; count: number }>();

    inventoryReport.forEach((item) => {
      const existing = dist.get(item.category);
      if (existing) {
        existing.value += item.bookValue;
        existing.count += 1;
      } else {
        dist.set(item.category, {
          name: item.category,
          value: item.bookValue,
          count: 1,
        });
      }
    });

    return Array.from(dist.values()).sort((a, b) => b.value - a.value);
  }, [inventoryReport]);

  // ============================================
  // 7. أنشط الأصناف (Top Movers)
  // ============================================
  const topMovers = useMemo(() => {
    const movement = new Map<
      string,
      { itemId: string; itemName: string; totalMovement: number }
    >();

    stockOut.forEach((m) => {
      const existing = movement.get(m.itemId);
      if (existing) {
        existing.totalMovement += m.quantity;
      } else {
        movement.set(m.itemId, {
          itemId: m.itemId,
          itemName: m.itemName ?? '',
          totalMovement: m.quantity,
        });
      }
    });

    return Array.from(movement.values())
      .sort((a, b) => b.totalMovement - a.totalMovement)
      .slice(0, 5);
  }, [stockOut]);

  // ============================================
  // KPIs ملخصة
  // ============================================
  const summaryKPIs = useMemo(() => {
    const totalInventoryValue = inventoryReport.reduce((sum, i) => sum + i.bookValue, 0);
    const totalPotentialProfit = inventoryReport.reduce(
      (sum, i) => sum + i.potentialProfit,
      0
    );
    const totalPurchases = stockIn.reduce((sum, m) => sum + m.totalCost, 0);
    const totalSales = stockOut.reduce((sum, m) => sum + m.totalValue, 0);
    const inventoryTurnover = totalInventoryValue > 0
      ? (totalSales / totalInventoryValue).toFixed(2)
      : '0';

    return {
      totalInventoryValue,
      totalPotentialProfit,
      totalPurchases,
      totalSales,
      grossProfit: totalSales - totalPurchases,
      inventoryTurnover,
      itemsCount: items.length,
      suppliersCount: suppliers.length,
    };
  }, [inventoryReport, stockIn, stockOut, items, suppliers]);

  return {
    inventoryReport,
    purchasesSummary,
    getItemMovementHistory,
    lowStockReport,
    monthlyComparison,
    categoryDistribution,
    topMovers,
    summaryKPIs,
  };
}
