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
  SalesRep,
  Customer,
  CustomerBalance,
  StockInMovement,
  StockOutMovement,
  CurrentStock,
  PurchaseInvoice,
  SalesOrder,
} from '@/lib/types';
import { computeInvoiceItems } from '@/lib/landedCost';
import { suppliersService } from '@/lib/services/suppliersService';
import { salesRepsService } from '@/lib/services/salesRepsService';
import { customersService } from '@/lib/services/customersService';
import { itemsService } from '@/lib/services/itemsService';
import { stockInService } from '@/lib/services/stockInService';
import { stockOutService } from '@/lib/services/stockOutService';
import { currentStockService } from '@/lib/services/currentStockService';
import { purchaseInvoicesService } from '@/lib/services/purchaseInvoicesService';
import { salesOrdersService } from '@/lib/services/salesOrdersService';
import { couponsService } from '@/lib/services/couponsService';
import { returnsService } from '@/lib/services/returnsService';

// Mock mode imports — only active when NEXT_PUBLIC_USE_MOCK=true
import {
  mockItemsService,
  mockSuppliersService,
  mockStockInService,
  mockStockOutService,
  mockCurrentStockService,
  mockPurchaseInvoicesService,
  mockSalesOrdersService,
  mockCouponsService,
  mockReturnsService,
} from '@/lib/storage/mockServices';
import { seedMockDataIfNeeded } from '@/lib/storage/seedData';
import { setInvoicesTenantPrefix } from '@/lib/storage/purchaseInvoicesStorage';
import { setOrdersTenantPrefix }   from '@/lib/storage/salesOrdersStorage';
import { setCouponsTenantPrefix }  from '@/lib/storage/couponsStorage';
import { setReturnsTenantPrefix }  from '@/lib/storage/returnsStorage';
import { setAppointmentsTenantPrefix } from '@/lib/storage/appointmentsStorage';
import { getSupabaseClient } from '@/lib/supabase/client';
import { rpcPlaceSalesOrder, rpcReceivePurchaseInvoice } from '@/lib/supabase/rpc';

// ── Service selector ──────────────────────────────────────────────────────────
// Use mock mode when:
//   1. NEXT_PUBLIC_USE_MOCK=true  (explicit flag), OR
//   2. Supabase URL is missing or placeholder (no real DB configured)
const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
  !_supabaseUrl ||
  _supabaseUrl.includes('placeholder');

const _items      = USE_MOCK ? mockItemsService       : itemsService;
const _suppliers  = USE_MOCK ? mockSuppliersService   : suppliersService;
const _stockIn    = USE_MOCK ? mockStockInService      : stockInService;
const _stockOut   = USE_MOCK ? mockStockOutService     : stockOutService;
const _stockView  = USE_MOCK ? mockCurrentStockService : currentStockService;

// Purchase invoices & sales orders: use Supabase in production, localStorage mock in demo mode
const _purchases  = USE_MOCK ? mockPurchaseInvoicesService : purchaseInvoicesService;
const _orders     = USE_MOCK ? mockSalesOrdersService     : salesOrdersService;

// Coupons & returns: use Supabase in production, localStorage mock in demo mode
export const _coupons = USE_MOCK ? mockCouponsService : couponsService;
export const _returns = USE_MOCK ? mockReturnsService : returnsService;

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

  // Sales reps (Wave G #1 — field sales attribution)
  salesReps: SalesRep[];
  addSalesRep: (rep: Omit<SalesRep, 'id' | 'createdAt'>) => Promise<void>;
  updateSalesRep: (id: string, updates: Partial<SalesRep>) => Promise<void>;
  deleteSalesRep: (id: string) => Promise<void>;

  // Customers (Wave G #2 — credit + A/R)
  customers: Customer[];
  customerBalances: CustomerBalance[];
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  refreshCustomerBalances: () => Promise<void>;

  // Purchase Invoices
  purchaseInvoices: PurchaseInvoice[];
  addPurchaseInvoice: (
    invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'status'>
  ) => Promise<{ success: boolean; data?: PurchaseInvoice; error?: string }>;
  updatePurchaseInvoice: (
    id: string,
    updates: Partial<PurchaseInvoice>
  ) => Promise<{ success: boolean; error?: string }>;
  deletePurchaseInvoice: (id: string) => Promise<void>;
  receivePurchaseInvoice: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Sales Orders
  salesOrders: SalesOrder[];
  addSalesOrder: (
    order: Omit<SalesOrder, 'id' | 'orderNumber' | 'createdAt'>
  ) => Promise<{ success: boolean; data?: SalesOrder; error?: string }>;
  updateSalesOrder: (
    id: string,
    updates: Partial<SalesOrder>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteSalesOrder: (id: string) => Promise<void>;

  // Manual refresh
  refresh: () => Promise<void>;
}

// ============================================
// Per-slice context types — narrower surfaces for targeted consumers
// ============================================
// A component that only renders items doesn't need to re-render when an
// order is created. By splitting the value memo into per-slice contexts
// (while keeping the same state owner inside StockProvider), each consumer
// can subscribe to only the slice it actually reads.

export interface ItemsContextType {
  items: Item[];
  addItem:    StockContextType['addItem'];
  updateItem: StockContextType['updateItem'];
  deleteItem: StockContextType['deleteItem'];
}

export interface SuppliersContextType {
  suppliers: Supplier[];
  addSupplier:    StockContextType['addSupplier'];
  updateSupplier: StockContextType['updateSupplier'];
  deleteSupplier: StockContextType['deleteSupplier'];
}

export interface SalesRepsContextType {
  salesReps:      SalesRep[];
  addSalesRep:    StockContextType['addSalesRep'];
  updateSalesRep: StockContextType['updateSalesRep'];
  deleteSalesRep: StockContextType['deleteSalesRep'];
}

export interface CustomersContextType {
  customers:               Customer[];
  customerBalances:        CustomerBalance[];
  addCustomer:             StockContextType['addCustomer'];
  updateCustomer:          StockContextType['updateCustomer'];
  deleteCustomer:          StockContextType['deleteCustomer'];
  refreshCustomerBalances: StockContextType['refreshCustomerBalances'];
}

export interface MovementsContextType {
  stockIn:           StockInMovement[];
  stockOut:          StockOutMovement[];
  currentStock:      CurrentStock[];
  getCurrentBalance: StockContextType['getCurrentBalance'];
  canIssueQuantity:  StockContextType['canIssueQuantity'];
  addStockIn:        StockContextType['addStockIn'];
  addStockOut:       StockContextType['addStockOut'];
  updateStockIn:     StockContextType['updateStockIn'];
  updateStockOut:    StockContextType['updateStockOut'];
  deleteStockIn:     StockContextType['deleteStockIn'];
  deleteStockOut:    StockContextType['deleteStockOut'];
}

export interface OrdersContextType {
  salesOrders:       SalesOrder[];
  addSalesOrder:     StockContextType['addSalesOrder'];
  updateSalesOrder:  StockContextType['updateSalesOrder'];
  deleteSalesOrder:  StockContextType['deleteSalesOrder'];
}

export interface PurchasesContextType {
  purchaseInvoices:        PurchaseInvoice[];
  addPurchaseInvoice:      StockContextType['addPurchaseInvoice'];
  updatePurchaseInvoice:   StockContextType['updatePurchaseInvoice'];
  deletePurchaseInvoice:   StockContextType['deletePurchaseInvoice'];
  receivePurchaseInvoice:  StockContextType['receivePurchaseInvoice'];
}

export interface StockMetaContextType {
  loading: boolean;
  error:   string | null;
  refresh: StockContextType['refresh'];
}

const ItemsContext     = createContext<ItemsContextType | undefined>(undefined);
const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined);
const SalesRepsContext = createContext<SalesRepsContextType | undefined>(undefined);
const CustomersContext = createContext<CustomersContextType | undefined>(undefined);
const MovementsContext = createContext<MovementsContextType | undefined>(undefined);
const OrdersContext    = createContext<OrdersContextType | undefined>(undefined);
const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined);
const StockMetaContext = createContext<StockMetaContextType | undefined>(undefined);

// `StockContextType` is kept ONLY as a type-derivation source for the
// per-slice context interfaces above (they reference its fields via
// indexed access types like `StockContextType['addItem']`). There is
// intentionally no runtime context object for it anymore — every
// consumer reads through a narrow per-slice context.

// ============================================
// Provider
// ============================================
export function StockProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);
  const [stockIn, setStockIn] = useState<StockInMovement[]>([]);
  const [stockOut, setStockOut] = useState<StockOutMovement[]>([]);
  const [currentStock, setCurrentStock] = useState<CurrentStock[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Load all data
  // ============================================
  // Synchronously apply the tenant prefix BEFORE any data load so localStorage
  // reads/writes target the correct tenant's namespace from the very first
  // call. Previously a race could read with the `anon` prefix while the
  // session resolved in the background — leaking another tenant's cached data.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Resolve session and lock in the tenant prefix BEFORE any service call
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const prefix = session?.user?.id ?? 'anon';
      setInvoicesTenantPrefix(prefix);
      setOrdersTenantPrefix(prefix);
      setCouponsTenantPrefix(prefix);
      setReturnsTenantPrefix(prefix);
      setAppointmentsTenantPrefix(prefix);

      // Seed demo data on first run in mock mode
      if (USE_MOCK) seedMockDataIfNeeded();

      // 2. Now safe to fetch — localStorage keys are correctly tenant-scoped.
      // sales_reps is wrapped in `.catch(() => [])` because the table is
      // added by migration 20260528 — older deployments won't have it yet
      // and we don't want the whole context load to fail on a missing
      // relation. After the migration runs the catch path never triggers.
      // sales_reps, customers and vw_customer_balance live in migrations
      // that older deployments may not have applied. Each fetch is wrapped
      // in `.catch(() => [])` so a missing relation degrades gracefully —
      // the context still loads, the related UI just shows empty state.
      const [itemsData, suppliersData, salesRepsData, customersData, customerBalancesData, stockInData, stockOutData, stockData, purchasesData, ordersData] =
        await Promise.all([
          _items.getAll(),
          _suppliers.getAll(),
          USE_MOCK ? Promise.resolve([] as SalesRep[]) : salesRepsService.getAll().catch(() => [] as SalesRep[]),
          USE_MOCK ? Promise.resolve([] as Customer[]) : customersService.getAll().catch(() => [] as Customer[]),
          USE_MOCK ? Promise.resolve([] as CustomerBalance[]) : customersService.getBalances().catch(() => [] as CustomerBalance[]),
          _stockIn.getAll(),
          _stockOut.getAll(),
          _stockView.getAll(),
          _purchases.getAll(),
          _orders.getAll(),
        ]);

      setItems(itemsData);
      setSuppliers(suppliersData);
      setSalesReps(salesRepsData);
      setCustomers(customersData);
      setCustomerBalances(customerBalancesData);
      setStockIn(stockInData);
      setStockOut(stockOutData);
      setCurrentStock(stockData);
      setPurchaseInvoices(purchasesData);
      setSalesOrders(ordersData);
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
  // Balance calculator — O(1) Map lookup
  // ============================================
  // Forms and table renders call this hundreds of times per render (e.g.
  // /current-stock, /items, /orders/new picker). Linear scan over an array
  // was the hottest function in the app once tenants hit ~500 items.
  // We pre-bin currentStock into a Map<itemId, balance> once per state update
  // and serve all lookups in O(1).
  const balanceByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of currentStock) map.set(s.itemId, s.currentBalance);
    return map;
  }, [currentStock]);

  const getCurrentBalance = useCallback(
    (itemId: string): number => balanceByItemId.get(itemId) ?? 0,
    [balanceByItemId]
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

        // BOM: deduct component materials automatically when receiving manufactured goods.
        // Use in-memory `items` rather than refetching — they're already loaded.
        // Parallelize the per-component _stockOut.create calls — they're
        // independent, so awaiting them serially was N round-trips for no reason.
        const manufacturedItem = items.find((i) => i.id === movement.itemId);
        if (manufacturedItem?.isManufactured && manufacturedItem.bom && manufacturedItem.bom.length > 0) {
          await Promise.all(
            manufacturedItem.bom.map((bomEntry) =>
              _stockOut.create({
                date: movement.date,
                itemId: bomEntry.componentItemId,
                recipientDept: 'قسم التصنيع',
                quantity: movement.quantity * bomEntry.quantity,
                unitPrice: 0,
                reason: 'تصنيع',
                responsibleEmployee: movement.responsibleEmployee || 'نظام التصنيع',
                notes: `خصم تلقائي - تصنيع ${manufacturedItem.name}`,
              })
            )
          );
          await refreshStock();
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'فشل الحفظ';
        return { success: false, error: message };
      }
    },
    [refreshStock, items]
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
  // Mutations - Items (optimistic, with rollback on failure)
  // ============================================
  // The pattern across all three:
  //   1. Apply the change locally with a tempId / snapshot.
  //   2. Persist to the server.
  //   3. On success: replace the optimistic row with the canonical server copy.
  //   4. On failure: roll back the state change so the UI never lies.
  // Only `refreshStock` is called because items with `opening_qty > 0` can
  // affect computed balances; for a typical edit that doesn't touch qty,
  // this is a cheap single-view refresh (no expensive joins).

  const addItem = useCallback(
    async (item: Omit<Item, 'id' | 'supplierName'>) => {
      const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const optimistic = { ...item, id: tempId } as Item;
      setItems((prev) => [...prev, optimistic]);
      try {
        const newItem = await _items.create(item);
        setItems((prev) => prev.map((i) => (i.id === tempId ? newItem : i)));
        await refreshStock();
      } catch (err) {
        // Roll back the optimistic insert
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        throw err;
      }
    },
    [refreshStock]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Item>) => {
      let snapshot: Item | undefined;
      setItems((prev) => {
        snapshot = prev.find((i) => i.id === id);
        return prev.map((i) => (i.id === id ? { ...i, ...updates } : i));
      });
      try {
        const updated = await _items.update(id, updates);
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        await refreshStock();
      } catch (err) {
        // Roll back the optimistic update
        if (snapshot) {
          setItems((prev) => prev.map((i) => (i.id === id ? snapshot! : i)));
        }
        throw err;
      }
    },
    [refreshStock]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      let snapshot: Item | undefined;
      setItems((prev) => {
        snapshot = prev.find((i) => i.id === id);
        return prev.filter((i) => i.id !== id);
      });
      try {
        await _items.delete(id);
        await refreshStock();
      } catch (err) {
        // Roll back the optimistic delete by re-inserting the snapshot
        if (snapshot) setItems((prev) => [...prev, snapshot!]);
        throw err;
      }
    },
    [refreshStock]
  );

  // ============================================
  // Mutations - Suppliers (optimistic with rollback — mirrors items pattern)
  // ============================================
  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimistic = { ...supplier, id: tempId, createdAt: new Date().toISOString() } as Supplier;
    setSuppliers((prev) => [...prev, optimistic]);
    try {
      const newSupplier = await _suppliers.create(supplier);
      setSuppliers((prev) => prev.map((s) => (s.id === tempId ? newSupplier : s)));
    } catch (err) {
      setSuppliers((prev) => prev.filter((s) => s.id !== tempId));
      throw err;
    }
  }, []);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    let snapshot: Supplier | undefined;
    setSuppliers((prev) => {
      snapshot = prev.find((s) => s.id === id);
      return prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
    });
    try {
      const updated = await _suppliers.update(id, updates);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      if (snapshot) setSuppliers((prev) => prev.map((s) => (s.id === id ? snapshot! : s)));
      throw err;
    }
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    let snapshot: Supplier | undefined;
    setSuppliers((prev) => {
      snapshot = prev.find((s) => s.id === id);
      return prev.filter((s) => s.id !== id);
    });
    try {
      await _suppliers.delete(id);
    } catch (err) {
      if (snapshot) setSuppliers((prev) => [...prev, snapshot!]);
      throw err;
    }
  }, []);

  // ============================================
  // Mutations - Sales Reps (Wave G #1)
  // ============================================
  // Optimistic insert/update/delete with rollback on failure, matching the
  // pattern from suppliers. Mock-mode short-circuits to local state only.
  const addSalesRep = useCallback(async (rep: Omit<SalesRep, 'id' | 'createdAt'>) => {
    if (USE_MOCK) {
      const newRep: SalesRep = {
        ...rep,
        id: `rep-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setSalesReps((prev) => [newRep, ...prev]);
      return;
    }
    const created = await salesRepsService.create(rep);
    setSalesReps((prev) => [created, ...prev]);
  }, []);

  const updateSalesRep = useCallback(async (id: string, updates: Partial<SalesRep>) => {
    let snapshot: SalesRep | undefined;
    setSalesReps((prev) => {
      snapshot = prev.find((r) => r.id === id);
      return prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
    });
    try {
      if (!USE_MOCK) await salesRepsService.update(id, updates);
    } catch (err) {
      if (snapshot) setSalesReps((prev) => prev.map((r) => (r.id === id ? snapshot! : r)));
      throw err;
    }
  }, []);

  const deleteSalesRep = useCallback(async (id: string) => {
    let snapshot: SalesRep | undefined;
    setSalesReps((prev) => {
      snapshot = prev.find((r) => r.id === id);
      return prev.filter((r) => r.id !== id);
    });
    try {
      if (!USE_MOCK) await salesRepsService.delete(id);
    } catch (err) {
      if (snapshot) setSalesReps((prev) => [...prev, snapshot!]);
      throw err;
    }
  }, []);

  // ============================================
  // Mutations - Customers (Wave G #2)
  // ============================================
  const addCustomer = useCallback(async (c: Omit<Customer, 'id' | 'createdAt'>) => {
    if (USE_MOCK) {
      const newC: Customer = { ...c, id: `cust-${Date.now()}`, createdAt: new Date().toISOString() };
      setCustomers((prev) => [newC, ...prev]);
      return;
    }
    const created = await customersService.create(c);
    setCustomers((prev) => [created, ...prev]);
  }, []);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    let snapshot: Customer | undefined;
    setCustomers((prev) => {
      snapshot = prev.find((x) => x.id === id);
      return prev.map((x) => (x.id === id ? { ...x, ...updates } : x));
    });
    try {
      if (!USE_MOCK) await customersService.update(id, updates);
    } catch (err) {
      if (snapshot) setCustomers((prev) => prev.map((x) => (x.id === id ? snapshot! : x)));
      throw err;
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    let snapshot: Customer | undefined;
    setCustomers((prev) => {
      snapshot = prev.find((x) => x.id === id);
      return prev.filter((x) => x.id !== id);
    });
    try {
      if (!USE_MOCK) await customersService.delete(id);
    } catch (err) {
      if (snapshot) setCustomers((prev) => [...prev, snapshot!]);
      throw err;
    }
  }, []);

  // Pulled separately because the balance view is recomputed by the DB
  // after every sales order / payment — UI calls this on success to
  // refresh the running outstanding numbers without re-fetching everything.
  const refreshCustomerBalances = useCallback(async () => {
    if (USE_MOCK) return;
    try {
      const data = await customersService.getBalances();
      setCustomerBalances(data);
    } catch (err) {
      console.error('refreshCustomerBalances error', err);
    }
  }, []);

  // ============================================
  // Mutations - Purchase Invoices
  // ============================================
  const addPurchaseInvoice = useCallback(
    async (invoice: Parameters<StockContextType['addPurchaseInvoice']>[0]) => {
      try {
        const data = await _purchases.create({ ...invoice, status: 'DRAFT' });
        setPurchaseInvoices((prev) => [data, ...prev]);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'فشل الحفظ' };
      }
    },
    []
  );

  const updatePurchaseInvoice = useCallback(
    async (id: string, updates: Partial<PurchaseInvoice>) => {
      try {
        const updated = await _purchases.update(id, updates);
        setPurchaseInvoices((prev) => prev.map((p) => (p.id === id ? updated : p)));
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'فشل التعديل' };
      }
    },
    []
  );

  const deletePurchaseInvoice = useCallback(async (id: string) => {
    await _purchases.delete(id);
    setPurchaseInvoices((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ============================================
  // Mutations - Sales Orders
  // ============================================
  const addSalesOrder = useCallback(
    async (order: Parameters<StockContextType['addSalesOrder']>[0]) => {
      // Capture the function in scope so the side-effect refresh below is
      // stable across renders. Declared as a local so the useCallback
      // dependency list doesn't have to grow.
      const _refreshBalances = refreshCustomerBalances;
      try {
        let data: SalesOrder;

        if (!USE_MOCK) {
          // Non-mock: use atomic RPC so order + stock-out are one DB transaction.
          // Wrapped in a typed helper (lib/supabase/rpc.ts) to surface schema
          // drift at compile time instead of as a silent runtime cast.
          const { data: rpcData, error } = await rpcPlaceSalesOrder(getSupabaseClient(), {
            p_order: {
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              customerCity: order.customerCity,
              deliveryType: order.deliveryType,
              items: order.items,
              shippingCost: order.shippingCost,
              shippingOnStore: order.shippingOnStore,
              subtotalProducts: order.subtotalProducts,
              discountAmount: order.discountAmount,
              discountType: order.discountType,
              discountValue: order.discountValue,
              couponCode: order.couponCode,
              customerTotal: order.customerTotal,
              totalCOGS: order.totalCOGS,
              grossProfit: order.grossProfit,
              netProfit: order.netProfit,
              profitMargin: order.profitMargin,
              vatRate: order.vatRate,
              vatAmount: order.vatAmount,
              status: order.status ?? 'PENDING',
              trackingNumber: order.trackingNumber,
              shippingCarrier: order.shippingCarrier,
              notes: order.notes,
              customerPaymentStatus: order.customerPaymentStatus,
              customerPaidAmount: order.customerPaidAmount,
              customerPayments: order.customerPayments ?? [],
              shippedAt: order.shippedAt,
              // Wave G #1: sales rep attribution. The RPC server-side
              // validates that the id belongs to this tenant + is ACTIVE.
              repId: order.repId,
              // Wave G #2: registered customer. RPC checks tenant + status,
              // then evaluates credit_limit against current outstanding +
              // this order's unpaid portion. Raises if the cap is breached.
              customerId: order.customerId,
            },
          });
          if (error) throw new Error(error.message);
          if (!rpcData) throw new Error('place_sales_order returned no data');
          data = rpcData;
          // Refresh the customer balance view so the next render shows
          // the updated outstanding without waiting for a full reload.
          if (order.customerId) {
            void _refreshBalances();
          }
        } else {
          // Mock mode: keep existing multi-step logic
          data = await _orders.create(order);

          // Decrement stock for each item
          for (const item of order.items) {
            await _stockOut.create({
              date: new Date().toISOString().split('T')[0],
              itemId: item.itemId,
              recipientDept: order.customerName,
              quantity: item.quantity,
              unitPrice: item.sellingPrice,
              reason: 'بيع',
              responsibleEmployee: 'نظام المبيعات',
              notes: `طلب مبيعات ${data.orderNumber}`,
            });
          }
        }

        // Merge the new order in-place rather than redownloading the entire
        // table. Same for stockOut: append the freshly-created movement(s)
        // instead of refetching all of them. Only `currentStock` is a
        // derived view we can't reconstruct locally, so refresh that one.
        setSalesOrders((prev) => [data, ...prev]);
        // Mock mode created stock-out rows above; in RPC mode they're created
        // server-side. Either way a single targeted fetch covers both cases
        // and is far cheaper than the full-table dump we were doing.
        const newStock = await _stockView.getAll();
        setCurrentStock(newStock);
        // stockOut state is read-only outside of mutations; we accept a brief
        // staleness window here in exchange for not downloading thousands of
        // movement rows after every checkout. A subsequent /stock-out visit
        // will surface the new rows via its own load.

        return { success: true, data };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'فشل حفظ الطلب' };
      }
    },
    []
  );

  /**
   * Optimistic status / field update for sales orders.
   * Strategy:
   *  1. Snapshot the previous row and apply the change locally **immediately**
   *     so the UI feels native (status badge flips before the network round-trip).
   *  2. Fire the server update + side-effects (stock reversal on CANCELLED).
   *  3. On success, replace the optimistic row with the canonical server copy.
   *  4. On failure, roll back to the snapshot and surface the error.
   * Uses the functional `setSalesOrders(prev => …)` form throughout so this
   * callback has no `salesOrders` dependency — preventing stale closures.
   */
  const updateSalesOrder = useCallback(
    async (id: string, updates: Partial<SalesOrder>) => {
      // 1. Snapshot + optimistic apply
      let snapshot: SalesOrder | undefined;
      setSalesOrders((prev) => {
        snapshot = prev.find((o) => o.id === id);
        return prev.map((o) => (o.id === id ? { ...o, ...updates } : o));
      });
      const wasCancelled = snapshot?.status === 'CANCELLED';
      const becomingCancelled = updates.status === 'CANCELLED' && !wasCancelled;

      try {
        // 2. Reverse stock deductions if transitioning to CANCELLED
        if (becomingCancelled && snapshot) {
          for (const orderItem of snapshot.items) {
            await _stockIn.create({
              date: new Date().toISOString().split('T')[0],
              invoiceNo: `CANCEL-${snapshot.orderNumber}`,
              itemId: orderItem.itemId,
              supplierId: '',
              quantity: orderItem.quantity,
              unitPrice: orderItem.costSnapshot,
              responsibleEmployee: 'نظام الإلغاء',
              notes: `إعادة مخزون - إلغاء طلب ${snapshot.orderNumber}`,
            });
          }
        }

        // 3. Persist + replace optimistic row with canonical copy
        const updated = await _orders.update(id, updates);
        setSalesOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));

        // Refresh stock view only when balances actually changed
        if (becomingCancelled) {
          const [newStockIn, newStock] = await Promise.all([
            _stockIn.getAll(),
            _stockView.getAll(),
          ]);
          setStockIn(newStockIn);
          setCurrentStock(newStock);
        }

        return { success: true };
      } catch (err) {
        // 4. Roll back optimistic mutation
        if (snapshot) {
          setSalesOrders((prev) => prev.map((o) => (o.id === id ? snapshot! : o)));
        }
        return { success: false, error: err instanceof Error ? err.message : 'فشل التعديل' };
      }
    },
    []
  );

  const deleteSalesOrder = useCallback(async (id: string) => {
    await _orders.delete(id);
    setSalesOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  // The key function: receive an invoice → create StockIn movements + update MACs
  const receivePurchaseInvoice = useCallback(
    async (id: string) => {
      try {
        const invoice = purchaseInvoices.find((p) => p.id === id);
        if (!invoice) return { success: false, error: 'الفاتورة غير موجودة' };
        if (invoice.status === 'RECEIVED') return { success: false, error: 'تم استلام هذه الفاتورة مسبقاً' };

        // 1. Re-compute items with current balances & MACs
        const currentBalances: Record<string, number> = {};
        const currentMACs: Record<string, number> = {};
        currentStock.forEach((s) => { currentBalances[s.itemId] = s.currentBalance; });
        items.forEach((it) => {
          currentMACs[it.id] = it.movingAverageCost ?? it.purchasePrice ?? 0;
        });

        const totalLandedCosts =
          invoice.intlShipping + invoice.localShipping +
          invoice.customsDuties + invoice.clearanceFees + invoice.otherExpenses;

        const computedItems = computeInvoiceItems(
          invoice.items.map((r) => ({
            id: r.id,
            itemId: r.itemId,
            itemName: r.itemName,
            itemCode: r.itemCode,
            category: r.category,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
          })),
          totalLandedCosts,
          invoice.allocationMethod,
          currentBalances,
          currentMACs
        );

        // 2. Create StockIn movements + update MACs + mark RECEIVED — atomically in non-mock mode
        if (!USE_MOCK) {
          const { error } = await rpcReceivePurchaseInvoice(getSupabaseClient(), {
            p_invoice_id: id,
            p_computed_items: computedItems,
            p_invoice_number: invoice.invoiceNumber,
            p_supplier_id: invoice.supplierId || null,
          });
          if (error) throw new Error(error.message);
        } else {
          // Mock mode: keep existing multi-step logic
          for (const ci of computedItems) {
            await _stockIn.create({
              date: new Date().toISOString().split('T')[0],
              invoiceNo: invoice.invoiceNumber,
              itemId: ci.itemId,
              supplierId: invoice.supplierId,
              quantity: ci.quantity,
              unitPrice: ci.totalUnitCost,
              responsibleEmployee: 'نظام المشتريات',
              notes: `فاتورة مشتريات ${invoice.invoiceNumber} — تكلفة استيرادية: ${ci.totalUnitCost.toFixed(2)}`,
            });
            // Update item's movingAverageCost
            await _items.update(ci.itemId, { movingAverageCost: ci.newMAC });
          }

          await _purchases.update(id, {
            status: 'RECEIVED',
            receivedAt: new Date().toISOString(),
            items: computedItems,
          });
        }

        // For refreshing state we need the latest invoice — refetch it
        const receivedInvoice = (await _purchases.getAll()).find((p) => p.id === id)
          ?? { ...invoice, status: 'RECEIVED' as const, receivedAt: new Date().toISOString(), items: computedItems };

        // 4. Refresh local state
        setPurchaseInvoices((prev) => prev.map((p) => (p.id === id ? receivedInvoice : p)));
        const [newItems, newStockIn, newStock] = await Promise.all([
          _items.getAll(),
          _stockIn.getAll(),
          _stockView.getAll(),
        ]);
        setItems(newItems);
        setStockIn(newStockIn);
        setCurrentStock(newStock);

        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'فشل الاستلام' };
      }
    },
    [purchaseInvoices, currentStock, items]
  );

  // ============================================
  // Per-slice context values (memoized with only their own deps)
  // ============================================
  // Strategy: the StockProvider keeps the same single source of truth — every
  // setState owner is in this component — but we expose 5 narrowly-scoped
  // contexts in addition to the legacy `StockContext`. Consumers that only
  // need items (e.g. /items page) can switch from `useStock()` to `useItems()`
  // and stop re-rendering when, say, sales orders change.
  //
  // The legacy `useStock()` still works (it gathers from all slices) — this
  // split is a non-breaking addition; consumers migrate at their own pace.
  // See OPERATIONS.md → "StockContext split" for the migration playbook.

  const itemsValue = useMemo<ItemsContextType>(
    () => ({ items, addItem, updateItem, deleteItem }),
    [items, addItem, updateItem, deleteItem],
  );

  const suppliersValue = useMemo<SuppliersContextType>(
    () => ({ suppliers, addSupplier, updateSupplier, deleteSupplier }),
    [suppliers, addSupplier, updateSupplier, deleteSupplier],
  );

  const salesRepsValue = useMemo<SalesRepsContextType>(
    () => ({ salesReps, addSalesRep, updateSalesRep, deleteSalesRep }),
    [salesReps, addSalesRep, updateSalesRep, deleteSalesRep],
  );

  const customersValue = useMemo<CustomersContextType>(
    () => ({
      customers, customerBalances,
      addCustomer, updateCustomer, deleteCustomer, refreshCustomerBalances,
    }),
    [customers, customerBalances, addCustomer, updateCustomer, deleteCustomer, refreshCustomerBalances],
  );

  const movementsValue = useMemo<MovementsContextType>(
    () => ({
      stockIn, stockOut, currentStock,
      getCurrentBalance, canIssueQuantity,
      addStockIn, addStockOut, updateStockIn, updateStockOut, deleteStockIn, deleteStockOut,
    }),
    [
      stockIn, stockOut, currentStock,
      getCurrentBalance, canIssueQuantity,
      addStockIn, addStockOut, updateStockIn, updateStockOut, deleteStockIn, deleteStockOut,
    ],
  );

  const ordersValue = useMemo<OrdersContextType>(
    () => ({ salesOrders, addSalesOrder, updateSalesOrder, deleteSalesOrder }),
    [salesOrders, addSalesOrder, updateSalesOrder, deleteSalesOrder],
  );

  const purchasesValue = useMemo<PurchasesContextType>(
    () => ({
      purchaseInvoices,
      addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, receivePurchaseInvoice,
    }),
    [purchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, receivePurchaseInvoice],
  );

  const metaValue = useMemo<StockMetaContextType>(
    () => ({ loading, error, refresh: loadData }),
    [loading, error, loadData],
  );

  // Legacy barrel removed — every consumer now reads through a narrow
  // per-slice hook (useItems/useSuppliers/useMovements/useOrders/
  // usePurchases/useStockMeta). The barrel's value memo used to depend
  // on every slice, so any single mutation re-rendered all 27 consumers;
  // dropping it locks in the gain from the Phase 7 split.

  return (
    <ItemsContext.Provider value={itemsValue}>
      <SuppliersContext.Provider value={suppliersValue}>
        <SalesRepsContext.Provider value={salesRepsValue}>
          <CustomersContext.Provider value={customersValue}>
            <MovementsContext.Provider value={movementsValue}>
              <OrdersContext.Provider value={ordersValue}>
                <PurchasesContext.Provider value={purchasesValue}>
                  <StockMetaContext.Provider value={metaValue}>
                    {children}
                  </StockMetaContext.Provider>
                </PurchasesContext.Provider>
              </OrdersContext.Provider>
            </MovementsContext.Provider>
          </CustomersContext.Provider>
        </SalesRepsContext.Provider>
      </SuppliersContext.Provider>
    </ItemsContext.Provider>
  );
}

// ============================================
// Per-slice hooks (preferred for new code — narrower re-render surface)
// ============================================

export function useItems(): ItemsContextType {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within StockProvider');
  return ctx;
}

export function useSuppliers(): SuppliersContextType {
  const ctx = useContext(SuppliersContext);
  if (!ctx) throw new Error('useSuppliers must be used within StockProvider');
  return ctx;
}

export function useSalesReps(): SalesRepsContextType {
  const ctx = useContext(SalesRepsContext);
  if (!ctx) throw new Error('useSalesReps must be used within StockProvider');
  return ctx;
}

export function useCustomers(): CustomersContextType {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error('useCustomers must be used within StockProvider');
  return ctx;
}

export function useMovements(): MovementsContextType {
  const ctx = useContext(MovementsContext);
  if (!ctx) throw new Error('useMovements must be used within StockProvider');
  return ctx;
}

export function useOrders(): OrdersContextType {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within StockProvider');
  return ctx;
}

export function usePurchases(): PurchasesContextType {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchases must be used within StockProvider');
  return ctx;
}

export function useStockMeta(): StockMetaContextType {
  const ctx = useContext(StockMetaContext);
  if (!ctx) throw new Error('useStockMeta must be used within StockProvider');
  return ctx;
}

// Legacy `useStock()` barrel removed in Wave B. Use the narrow per-slice
// hooks above. Kept as a build-time stub that throws so any forgotten
// callers fail loudly with a useful pointer rather than silently.
export function useStock(): never {
  throw new Error(
    'useStock() has been removed. Use a narrow hook: useItems, useSuppliers, useMovements, useOrders, usePurchases, or useStockMeta.'
  );
}

