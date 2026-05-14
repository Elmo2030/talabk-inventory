// ============================================
// Mock Storage (localStorage implementation)
// Implements StorageAdapter entirely in-browser.
// Drop-in replacement for Supabase services during development/offline work.
//
// SQL equivalents are noted as comments for migration reference.
// ============================================

import {
  StorageAdapter,
  ItemsAdapter,
  SuppliersAdapter,
  StockInAdapter,
  StockOutAdapter,
  CurrentStockAdapter,
  StockInPayload,
  StockOutPayload,
  QueryOptions,
  FilterOptions,
} from './storageAdapter';
import { Item, Supplier, StockInMovement, StockOutMovement, CurrentStock } from '@/lib/types';

// ── Key constants ─────────────────────────────────────────────────────────────

const KEYS = {
  items: 'mock_items',
  suppliers: 'mock_suppliers',
  stockIn: 'mock_stock_in',
  stockOut: 'mock_stock_out',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLS<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function writeLS<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateOperationCode(prefix: string, existing: { operationCode: string }[]): string {
  const year = new Date().getFullYear();
  const next = existing.length + 1;
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

// ── Items Adapter ─────────────────────────────────────────────────────────────
// SQL: SELECT * FROM items JOIN suppliers ON items.supplier_id = suppliers.id

const mockItems: ItemsAdapter = {
  async getAll(): Promise<Item[]> {
    const items = readLS<Item>(KEYS.items);
    const suppliers = readLS<Supplier>(KEYS.suppliers);
    return items.map((item) => ({
      ...item,
      supplierName: suppliers.find((s) => s.id === item.supplierId)?.name,
    }));
  },

  async getById(id: string): Promise<Item | null> {
    const items = readLS<Item>(KEYS.items);
    return items.find((i) => i.id === id) ?? null;
  },

  async create(item: Omit<Item, 'id' | 'supplierName'>): Promise<Item> {
    // SQL: INSERT INTO items (...) VALUES (...) RETURNING *
    const items = readLS<Item>(KEYS.items);
    const newItem: Item = { ...item, id: generateId() };
    writeLS(KEYS.items, [...items, newItem]);
    return newItem;
  },

  async update(id: string, updates: Partial<Item>): Promise<Item> {
    // SQL: UPDATE items SET ... WHERE id = $id RETURNING *
    const items = readLS<Item>(KEYS.items);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`الصنف غير موجود: ${id}`);
    items[idx] = { ...items[idx], ...updates };
    writeLS(KEYS.items, items);
    return items[idx];
  },

  async delete(id: string): Promise<void> {
    // SQL: DELETE FROM items WHERE id = $id
    const items = readLS<Item>(KEYS.items);
    writeLS(KEYS.items, items.filter((i) => i.id !== id));
  },
};

// ── Suppliers Adapter ─────────────────────────────────────────────────────────

const mockSuppliers: SuppliersAdapter = {
  async getAll(): Promise<Supplier[]> {
    return readLS<Supplier>(KEYS.suppliers);
  },

  async getById(id: string): Promise<Supplier | null> {
    return readLS<Supplier>(KEYS.suppliers).find((s) => s.id === id) ?? null;
  },

  async create(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    const suppliers = readLS<Supplier>(KEYS.suppliers);
    const newSupplier: Supplier = {
      ...supplier,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    writeLS(KEYS.suppliers, [...suppliers, newSupplier]);
    return newSupplier;
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const suppliers = readLS<Supplier>(KEYS.suppliers);
    const idx = suppliers.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`المورد غير موجود: ${id}`);
    suppliers[idx] = { ...suppliers[idx], ...updates };
    writeLS(KEYS.suppliers, suppliers);
    return suppliers[idx];
  },

  async delete(id: string): Promise<void> {
    writeLS(KEYS.suppliers, readLS<Supplier>(KEYS.suppliers).filter((s) => s.id !== id));
  },
};

// ── Stock-In Adapter ──────────────────────────────────────────────────────────

const mockStockIn: StockInAdapter = {
  async getAll(options?: QueryOptions & FilterOptions): Promise<StockInMovement[]> {
    // SQL: SELECT si.*, i.name item_name, s.name supplier_name
    //      FROM stock_in_movements si
    //      JOIN items i ON si.item_id = i.id
    //      JOIN suppliers s ON si.supplier_id = s.id
    //      WHERE ... ORDER BY date DESC
    let result = readLS<StockInMovement>(KEYS.stockIn);
    if (options?.fromDate) result = result.filter((m) => m.date >= options.fromDate!);
    if (options?.toDate) result = result.filter((m) => m.date <= options.toDate!);
    if (options?.itemId) result = result.filter((m) => m.itemId === options.itemId);
    if (options?.supplierId) result = result.filter((m) => m.supplierId === options.supplierId);
    if (options?.employee) result = result.filter((m) => m.responsibleEmployee === options.employee);
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  },

  async getById(id: string): Promise<StockInMovement | null> {
    return readLS<StockInMovement>(KEYS.stockIn).find((m) => m.id === id) ?? null;
  },

  async create(payload: StockInPayload): Promise<StockInMovement> {
    // SQL: INSERT INTO stock_in_movements (...) VALUES (...) RETURNING *
    // DB trigger on INSERT recalculates current_stock_view automatically.
    const existing = readLS<StockInMovement>(KEYS.stockIn);
    const items = readLS<Item>(KEYS.items);
    const suppliers = readLS<Supplier>(KEYS.suppliers);
    const item = items.find((i) => i.id === payload.itemId);
    const supplier = suppliers.find((s) => s.id === payload.supplierId);

    const newMovement: StockInMovement = {
      ...payload,
      id: generateId(),
      operationCode: generateOperationCode('IN', existing),
      totalCost: payload.quantity * payload.unitPrice,
      itemName: item?.name,
      category: item?.category,
      supplierName: supplier?.name,
    };
    writeLS(KEYS.stockIn, [...existing, newMovement]);
    return newMovement;
  },

  async delete(id: string): Promise<void> {
    // SQL: DELETE FROM stock_in_movements WHERE id = $id
    // DB trigger on DELETE recalculates current_stock_view automatically.
    writeLS(KEYS.stockIn, readLS<StockInMovement>(KEYS.stockIn).filter((m) => m.id !== id));
  },
};

// ── Stock-Out Adapter ─────────────────────────────────────────────────────────

const mockStockOut: StockOutAdapter = {
  async getAll(options?: QueryOptions & FilterOptions): Promise<StockOutMovement[]> {
    let result = readLS<StockOutMovement>(KEYS.stockOut);
    if (options?.fromDate) result = result.filter((m) => m.date >= options.fromDate!);
    if (options?.toDate) result = result.filter((m) => m.date <= options.toDate!);
    if (options?.itemId) result = result.filter((m) => m.itemId === options.itemId);
    if (options?.employee) result = result.filter((m) => m.responsibleEmployee === options.employee);
    if (options?.reason) result = result.filter((m) => m.reason === options.reason);
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  },

  async getById(id: string): Promise<StockOutMovement | null> {
    return readLS<StockOutMovement>(KEYS.stockOut).find((m) => m.id === id) ?? null;
  },

  async create(payload: StockOutPayload): Promise<StockOutMovement> {
    // SQL: INSERT INTO stock_out_movements (...) VALUES (...) RETURNING *
    // DB trigger checks balance > 0 before INSERT and raises exception if insufficient.
    const existing = readLS<StockOutMovement>(KEYS.stockOut);
    const items = readLS<Item>(KEYS.items);
    const item = items.find((i) => i.id === payload.itemId);

    const newMovement: StockOutMovement = {
      ...payload,
      id: generateId(),
      operationCode: generateOperationCode('OUT', existing),
      totalValue: payload.quantity * payload.unitPrice,
      itemName: item?.name,
      category: item?.category,
    };
    writeLS(KEYS.stockOut, [...existing, newMovement]);
    return newMovement;
  },

  async delete(id: string): Promise<void> {
    writeLS(KEYS.stockOut, readLS<StockOutMovement>(KEYS.stockOut).filter((m) => m.id !== id));
  },
};

// ── Current Stock Adapter (computed from movements) ───────────────────────────
// SQL equivalent: SELECT * FROM current_stock_view
// The view is defined in Supabase and recomputed by DB triggers.
// In mock mode we compute it in-memory from localStorage data.

const mockCurrentStock: CurrentStockAdapter = {
  async getAll(): Promise<CurrentStock[]> {
    return mockCurrentStock.refresh();
  },

  async getByItemId(itemId: string): Promise<CurrentStock | null> {
    const all = await mockCurrentStock.refresh();
    return all.find((s) => s.itemId === itemId) ?? null;
  },

  async refresh(): Promise<CurrentStock[]> {
    const items = readLS<Item>(KEYS.items);
    const stockInMovements = readLS<StockInMovement>(KEYS.stockIn);
    const stockOutMovements = readLS<StockOutMovement>(KEYS.stockOut);

    return items.map((item) => {
      const totalIn = stockInMovements
        .filter((m) => m.itemId === item.id)
        .reduce((s, m) => s + m.quantity, 0);
      const totalOut = stockOutMovements
        .filter((m) => m.itemId === item.id)
        .reduce((s, m) => s + m.quantity, 0);
      const currentBalance = item.openingQty + totalIn - totalOut;

      let status: CurrentStock['status'] = 'AVAILABLE';
      if (currentBalance <= 0) status = 'OUT_OF_STOCK';
      else if (currentBalance <= item.minStockLevel) status = 'NEEDS_REORDER';
      else if (currentBalance <= item.reorderLevel) status = 'LOW';

      return {
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        openingQty: item.openingQty,
        totalIn,
        totalOut,
        currentBalance,
        minStockLevel: item.minStockLevel,
        reorderLevel: item.reorderLevel,
        status,
        stockValue: currentBalance * item.purchasePrice,
      };
    });
  },
};

// ── Export composite adapter ──────────────────────────────────────────────────

export const mockStorageAdapter: StorageAdapter = {
  items: mockItems,
  suppliers: mockSuppliers,
  stockIn: mockStockIn,
  stockOut: mockStockOut,
  currentStock: mockCurrentStock,
};
