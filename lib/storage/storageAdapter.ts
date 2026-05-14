// ============================================
// Storage Adapter Interface
// Abstracts data layer so switching from localStorage → Supabase
// requires only a new implementation, no UI changes.
// ============================================

import { Item, Supplier, StockInMovement, StockOutMovement, CurrentStock } from '@/lib/types';

// Generic query options shared across adapters
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface FilterOptions {
  fromDate?: string;
  toDate?: string;
  itemId?: string;
  supplierId?: string;
  employee?: string;
  reason?: string;
}

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Items ────────────────────────────────────────────────────────────────────

export interface ItemsAdapter {
  getAll(): Promise<Item[]>;
  getById(id: string): Promise<Item | null>;
  create(item: Omit<Item, 'id' | 'supplierName'>): Promise<Item>;
  update(id: string, updates: Partial<Item>): Promise<Item>;
  delete(id: string): Promise<void>;
}

// ── Suppliers ────────────────────────────────────────────────────────────────

export interface SuppliersAdapter {
  getAll(): Promise<Supplier[]>;
  getById(id: string): Promise<Supplier | null>;
  create(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier>;
  update(id: string, updates: Partial<Supplier>): Promise<Supplier>;
  delete(id: string): Promise<void>;
}

// ── Stock-In Movements ───────────────────────────────────────────────────────

export type StockInPayload = Omit<
  StockInMovement,
  'id' | 'operationCode' | 'totalCost' | 'itemName' | 'category' | 'supplierName'
>;

export interface StockInAdapter {
  getAll(options?: QueryOptions & FilterOptions): Promise<StockInMovement[]>;
  getById(id: string): Promise<StockInMovement | null>;
  create(movement: StockInPayload): Promise<StockInMovement>;
  delete(id: string): Promise<void>;
}

// ── Stock-Out Movements ──────────────────────────────────────────────────────

export type StockOutPayload = Omit<
  StockOutMovement,
  'id' | 'operationCode' | 'totalValue' | 'itemName' | 'category'
>;

export interface StockOutAdapter {
  getAll(options?: QueryOptions & FilterOptions): Promise<StockOutMovement[]>;
  getById(id: string): Promise<StockOutMovement | null>;
  create(movement: StockOutPayload): Promise<StockOutMovement>;
  delete(id: string): Promise<void>;
}

// ── Current Stock View ───────────────────────────────────────────────────────

export interface CurrentStockAdapter {
  getAll(): Promise<CurrentStock[]>;
  getByItemId(itemId: string): Promise<CurrentStock | null>;
  // refresh() triggers a recalculation from source movements
  refresh(): Promise<CurrentStock[]>;
}

// ── Composite Adapter (full system) ──────────────────────────────────────────

export interface StorageAdapter {
  items: ItemsAdapter;
  suppliers: SuppliersAdapter;
  stockIn: StockInAdapter;
  stockOut: StockOutAdapter;
  currentStock: CurrentStockAdapter;
}
