// ============================================
// mockServices — Wraps mockStorageAdapter to match the
// exact service interface used by StockContext.tsx.
//
// Key difference: mockStockOutService.create() returns
// { success, data?, error? } to match stockOutService shape.
// ============================================

import { mockStorageAdapter } from './mockStorage';
import { Item, Supplier, StockInMovement, StockOutMovement } from '@/lib/types';

// ── Balance helper (needed for stock-out validation) ──────────────────────────

function computeBalance(itemId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const items: Item[] = JSON.parse(localStorage.getItem('mock_items') ?? '[]');
    const stockIn: StockInMovement[] = JSON.parse(localStorage.getItem('mock_stock_in') ?? '[]');
    const stockOut: StockOutMovement[] = JSON.parse(localStorage.getItem('mock_stock_out') ?? '[]');
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;
    const totalIn = stockIn.filter((m) => m.itemId === itemId).reduce((s, m) => s + m.quantity, 0);
    const totalOut = stockOut.filter((m) => m.itemId === itemId).reduce((s, m) => s + m.quantity, 0);
    return item.openingQty + totalIn - totalOut;
  } catch {
    return 0;
  }
}

// ── Items ─────────────────────────────────────────────────────────────────────

export const mockItemsService = {
  getAll: (): Promise<Item[]> =>
    mockStorageAdapter.items.getAll(),

  create: (item: Omit<Item, 'id' | 'supplierName'>): Promise<Item> =>
    mockStorageAdapter.items.create(item),

  update: (id: string, updates: Partial<Item>): Promise<Item> =>
    mockStorageAdapter.items.update(id, updates),

  delete: (id: string): Promise<void> =>
    mockStorageAdapter.items.delete(id),
};

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const mockSuppliersService = {
  getAll: (): Promise<Supplier[]> =>
    mockStorageAdapter.suppliers.getAll(),

  create: (supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> =>
    mockStorageAdapter.suppliers.create(supplier),

  update: (id: string, updates: Partial<Supplier>): Promise<Supplier> =>
    mockStorageAdapter.suppliers.update(id, updates),

  delete: (id: string): Promise<void> =>
    mockStorageAdapter.suppliers.delete(id),
};

// ── Stock In ──────────────────────────────────────────────────────────────────

export const mockStockInService = {
  getAll: (): Promise<StockInMovement[]> =>
    mockStorageAdapter.stockIn.getAll(),

  create: (
    payload: Omit<StockInMovement, 'id' | 'operationCode' | 'totalCost' | 'itemName' | 'category' | 'supplierName'>
  ): Promise<StockInMovement> =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockStorageAdapter.stockIn.create(payload as any),

  delete: (id: string): Promise<void> =>
    mockStorageAdapter.stockIn.delete(id),
};

// ── Stock Out ─────────────────────────────────────────────────────────────────
// Returns { success, data?, error? } to match the real stockOutService shape.

export const mockStockOutService = {
  getAll: (): Promise<StockOutMovement[]> =>
    mockStorageAdapter.stockOut.getAll(),

  create: async (
    payload: Omit<StockOutMovement, 'id' | 'operationCode' | 'totalValue' | 'itemName' | 'category'>
  ): Promise<{ success: boolean; data?: StockOutMovement; error?: string }> => {
    try {
      const available = computeBalance(payload.itemId);
      if (available < payload.quantity) {
        return {
          success: false,
          error: `الرصيد غير كافٍ — المتاح: ${available} ${payload.quantity > available ? `(المطلوب: ${payload.quantity})` : ''}`,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await mockStorageAdapter.stockOut.create(payload as any);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل تسجيل حركة الصادر',
      };
    }
  },

  delete: (id: string): Promise<void> =>
    mockStorageAdapter.stockOut.delete(id),
};

// ── Current Stock ─────────────────────────────────────────────────────────────

export const mockCurrentStockService = {
  getAll: () => mockStorageAdapter.currentStock.getAll(),
};

// ── Purchase Invoices ─────────────────────────────────────────────────────────

import { purchaseInvoicesStorage } from './purchaseInvoicesStorage';
import { PurchaseInvoice } from '@/lib/types';

export const mockPurchaseInvoicesService = {
  getAll: async (): Promise<PurchaseInvoice[]> =>
    Promise.resolve(purchaseInvoicesStorage.getAll()),
  getById: async (id: string): Promise<PurchaseInvoice | null> =>
    Promise.resolve(purchaseInvoicesStorage.getById(id)),
  create: async (
    invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt'>
  ): Promise<PurchaseInvoice> =>
    Promise.resolve(purchaseInvoicesStorage.create(invoice)),
  update: async (id: string, updates: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> =>
    Promise.resolve(purchaseInvoicesStorage.update(id, updates)),
  delete: async (id: string): Promise<void> =>
    Promise.resolve(purchaseInvoicesStorage.delete(id)),
};

// ── Sales Orders ──────────────────────────────────────────────────────────────

import { salesOrdersStorage } from './salesOrdersStorage';
import { SalesOrder } from '@/lib/types';

export const mockSalesOrdersService = {
  getAll: async (): Promise<SalesOrder[]> =>
    Promise.resolve(salesOrdersStorage.getAll()),
  getById: async (id: string): Promise<SalesOrder | null> =>
    Promise.resolve(salesOrdersStorage.getById(id)),
  create: async (
    order: Omit<SalesOrder, 'id' | 'orderNumber' | 'createdAt'>
  ): Promise<SalesOrder> =>
    Promise.resolve(salesOrdersStorage.create(order)),
  update: async (id: string, updates: Partial<SalesOrder>): Promise<SalesOrder> =>
    Promise.resolve(salesOrdersStorage.update(id, updates)),
  delete: async (id: string): Promise<void> =>
    Promise.resolve(salesOrdersStorage.delete(id)),
};
