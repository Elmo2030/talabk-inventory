'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
} from 'react';
import {
  Item,
  Supplier,
  StockInMovement,
  StockOutMovement,
  CurrentStock,
} from '@/lib/types';
import { suppliersService } from '@/lib/services/suppliersService';
import { itemsService } from '@/lib/services/itemsService';
import { stockInService } from '@/lib/services/stockInService';
import { stockOutService } from '@/lib/services/stockOutService';
import { currentStockService } from '@/lib/services/currentStockService';

// Mock mode imports — only active when NEXT_PUBLIC_USE_MOCK=true
import {
  mockItemsService,
  mockSuppliersService,
  mockStockInService,
  mockStockOutService,
  mockCurrentStockService,
} from '@/lib/storage/mockServices';
import { seedMockDataIfNeeded } from '@/lib/storage/seedData';

// ── Service selector ──────────────────────────────────────────────────────────
// Use mock mode when:
//   1. NEXT_PUBLIC_USE_MOCK=true  (explicit flag), OR
//   2. Supabase URL is missing or placeholder (no real DB configured)
const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
  !_supabaseUrl ||
  _supabaseUrl.includes('placeholder');

const _items      = USE_MOCK ? mockItemsService      : itemsService;
const _suppliers  = USE_MOCK ? mockSuppliersService  : suppliersService;
const _stockIn    = USE_MOCK ? mockStockInService     : stockInService;
const _stockOut   = USE_MOCK ? mockStockOutService    : stockOutService;
const _stockView  = USE_MOCK ? mockCurrentStockService : currentStockService;

// ============================================
// Context Type
// ============================================
interface StockContextType {
  // Data
  items: Item[];
  suppliers: Supplier[];
  stockIn: StockInMovement[];
  stockOut: StockOutMovement[];
  currentStock: CurrentStock[];

  // Loading & Error states
  loading: boolean;
  error: string | null;

  // Core logic
  getCurrentBalance: (itemId: string) => number;
  canIssueQuantity: (itemId: string, qty: number) => boolean;

  // Mutations
  addStockIn: (
    movement: Omit<StockInMovement, 'id' | 'operationCode' | 'totalCost' | 'itemName' | 'category' | 'supplierName'>
  ) => Promise<{ success: boolean; error?: string }>;
  addStockOut: (
    movement: Omit<StockOutMovement, 'id' | 'operationCode' | 'totalValue' | 'itemName' | 'category'>
  ) => Promise<{ success: boolean; error?: string }>;
  updateStockIn: (
    id: string,
    movement: Omit<StockInMovement, 'id' | 'operationCode' | 'totalCost' | 'itemName' | 'category' | 'supplierName'>
  ) => Promise<{ success: boolean; error?: string }>;
  updateStockOut: (
    id: string,
    movement: Omit<StockOutMovement, 'id' | 'operationCode' | 'totalValue' | 'itemName' | 'category'>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteStockIn: (id: string) => Promise<void>;
  deleteStockOut: (id: string) => Promise<void>;

  addItem: (item: Omit<Item, 'id' | 'supplierName'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Manual refresh
  refresh: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================
export function StockProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockIn, setStockIn] = useState<StockInMovement[]>([]);
  const [stockOut, setStockOut] = useState<StockOutMovement[]>([]);
  const [currentStock, setCurrentStock] = useState<CurrentStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Load all data
  // ============================================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Seed demo data on first run in mock mode
      if (USE_MOCK) seedMockDataIfNeeded();

      const [itemsData, suppliersData, stockInData, stockOutData, stockData] =
        await Promise.all([
          _items.getAll(),
          _suppliers.getAll(),
          _stockIn.getAll(),
          _stockOut.getAll(),
          _stockView.getAll(),
        ]);

      setItems(itemsData);
      setSuppliers(suppliersData);
      setStockIn(stockInData);
      setStockOut(stockOutData);
      setCurrentStock(stockData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(message);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh only stock view (faster after mutations)
  const refreshStock = useCallback(async () => {
    try {
      const stockData = await _stockView.getAll();
      setCurrentStock(stockData);
    } catch (err) {
      console.error('Error refreshing stock:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // Balance calculator (uses cached currentStock for speed)
  // ============================================
  const getCurrentBalance = useCallback(
    (itemId: string): number => {
      const stock = currentStock.find((s) => s.itemId === itemId);
      return stock?.currentBalance ?? 0;
    },
    [currentStock]
  );

  const canIssueQuantity = useCallback(
    (itemId: string, qty: number): boolean => {
      return getCurrentBalance(itemId) >= qty;
    },
    [getCurrentBalance]
  );

  // ============================================
  // Mutations - Stock Movements
  // ============================================
  const addStockIn = useCallback(
    async (movement: Parameters<StockContextType['addStockIn']>[0]) => {
      try {
        const newMovement = await _stockIn.create(movement);
        setStockIn((prev) => [newMovement, ...prev]);
        await refreshStock();
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'فشل الحفظ';
        return { success: false, error: message };
      }
    },
    [refreshStock]
  );

  const addStockOut = useCallback(
    async (movement: Parameters<StockContextType['addStockOut']>[0]) => {
      const result = await _stockOut.create(movement);
      if (result.success && result.data) {
        setStockOut((prev) => [result.data!, ...prev]);
        await refreshStock();
        return { success: true };
      }
      return { success: false, error: result.error };
    },
    [refreshStock]
  );

  const deleteStockIn = useCallback(
    async (id: string) => {
      await _stockIn.delete(id);
      setStockIn((prev) => prev.filter((m) => m.id !== id));
      await refreshStock();
    },
    [refreshStock]
  );

  const deleteStockOut = useCallback(
    async (id: string) => {
      await _stockOut.delete(id);
      setStockOut((prev) => prev.filter((m) => m.id !== id));
      await refreshStock();
    },
    [refreshStock]
  );

  // تعديل حركة وارد: حذف القديم + إنشاء جديد لضمان إعادة حساب الرصيد
  const updateStockIn = useCallback(
    async (id: string, movement: Parameters<StockContextType['addStockIn']>[0]) => {
      try {
        await _stockIn.delete(id);
        const newMovement = await _stockIn.create(movement);
        setStockIn((prev) => [newMovement, ...prev.filter((m) => m.id !== id)]);
        await refreshStock();
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'فشل التعديل';
        return { success: false, error: message };
      }
    },
    [refreshStock]
  );

  const updateStockOut = useCallback(
    async (id: string, movement: Parameters<StockContextType['addStockOut']>[0]) => {
      try {
        await _stockOut.delete(id);
        const result = await _stockOut.create(movement);
        if (result.success && result.data) {
          const newMovement = result.data;
          setStockOut((prev) => [...prev.filter((m) => m.id !== id), newMovement]);
          await refreshStock();
          return { success: true };
        }
        return { success: false, error: result.error };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'فشل التعديل';
        return { success: false, error: message };
      }
    },
    [refreshStock]
  );

  // ============================================
  // Mutations - Items
  // ============================================
  const addItem = useCallback(
    async (item: Omit<Item, 'id' | 'supplierName'>) => {
      const newItem = await _items.create(item);
      setItems((prev) => [...prev, newItem]);
      await refreshStock();
    },
    [refreshStock]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Item>) => {
      const updated = await _items.update(id, updates);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      await refreshStock();
    },
    [refreshStock]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await _items.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      await refreshStock();
    },
    [refreshStock]
  );

  // ============================================
  // Mutations - Suppliers
  // ============================================
  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier = await _suppliers.create(supplier);
    setSuppliers((prev) => [...prev, newSupplier]);
  }, []);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    const updated = await _suppliers.update(id, updates);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    await _suppliers.delete(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo<StockContextType>(
    () => ({
      items,
      suppliers,
      stockIn,
      stockOut,
      currentStock,
      loading,
      error,
      getCurrentBalance,
      canIssueQuantity,
      addStockIn,
      addStockOut,
      updateStockIn,
      updateStockOut,
      deleteStockIn,
      deleteStockOut,
      addItem,
      updateItem,
      deleteItem,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      refresh: loadData,
    }),
    [
      items,
      suppliers,
      stockIn,
      stockOut,
      currentStock,
      loading,
      error,
      getCurrentBalance,
      canIssueQuantity,
      addStockIn,
      addStockOut,
      updateStockIn,
      updateStockOut,
      deleteStockIn,
      deleteStockOut,
      addItem,
      updateItem,
      deleteItem,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      loadData,
    ]
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be used within StockProvider');
  return ctx;
}
