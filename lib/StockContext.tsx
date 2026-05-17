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
  PurchaseInvoice,
  SalesOrder,
} from '@/lib/types';
import { computeInvoiceItems } from '@/lib/landedCost';
import { suppliersService } from '@/lib/services/suppliersService';
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

      // 2. Now safe to fetch — localStorage keys are correctly tenant-scoped
      const [itemsData, suppliersData, stockInData, stockOutData, stockData, purchasesData, ordersData] =
        await Promise.all([
          _items.getAll(),
          _suppliers.getAll(),
          _stockIn.getAll(),
          _stockOut.getAll(),
          _stockView.getAll(),
          _purchases.getAll(),
          _orders.getAll(),
        ]);

      setItems(itemsData);
      setSuppliers(suppliersData);
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

        // BOM: deduct component materials automatically when receiving manufactured goods.
        // Use in-memory `items` rather than refetching — they're already loaded.
        const manufacturedItem = items.find((i) => i.id === movement.itemId);
        if (manufacturedItem?.isManufactured && manufacturedItem.bom && manufacturedItem.bom.length > 0) {
          for (const bomEntry of manufacturedItem.bom) {
            const deductQty = movement.quantity * bomEntry.quantity;
            await _stockOut.create({
              date: movement.date,
              itemId: bomEntry.componentItemId,
              recipientDept: 'قسم التصنيع',
              quantity: deductQty,
              unitPrice: 0,
              reason: 'تصنيع',
              responsibleEmployee: movement.responsibleEmployee || 'نظام التصنيع',
              notes: `خصم تلقائي - تصنيع ${manufacturedItem.name}`,
            });
          }
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
      try {
        let data: SalesOrder;

        if (!USE_MOCK) {
          // Non-mock: use atomic RPC so order + stock-out are one DB transaction
          const { data: rpcData, error } = await (getSupabaseClient().rpc as any)(
            'place_sales_order',
            {
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
              },
            }
          );
          if (error) throw new Error(error.message);
          data = rpcData as SalesOrder;
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

        // Refresh sales orders + stock (both paths)
        const [newOrders, newStockOut, newStock] = await Promise.all([
          _orders.getAll(),
          _stockOut.getAll(),
          _stockView.getAll(),
        ]);
        setSalesOrders(newOrders);
        setStockOut(newStockOut);
        setCurrentStock(newStock);

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
          const { error } = await (getSupabaseClient().rpc as any)(
            'receive_purchase_invoice',
            {
              p_invoice_id: id,
              p_computed_items: computedItems,
              p_invoice_number: invoice.invoiceNumber,
              p_supplier_id: invoice.supplierId || null,
            }
          );
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
      purchaseInvoices,
      addPurchaseInvoice,
      updatePurchaseInvoice,
      deletePurchaseInvoice,
      receivePurchaseInvoice,
      salesOrders,
      addSalesOrder,
      updateSalesOrder,
      deleteSalesOrder,
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
      purchaseInvoices,
      addPurchaseInvoice,
      updatePurchaseInvoice,
      deletePurchaseInvoice,
      receivePurchaseInvoice,
      salesOrders,
      addSalesOrder,
      updateSalesOrder,
      deleteSalesOrder,
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

