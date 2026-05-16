// ============================================
// Types - Matched to Excel Original (نظام_المخازن_2026)
// ============================================

export type Supplier = {
  id: string;
  code: string;
  name: string;
  productType: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  paymentTerms: number;
  rating: number;
  isActive: boolean;
  createdAt: string;
};

// ── Item Variants (ألوان / مقاسات) ───────────────────────────────────────────
export type ItemVariant = {
  id: string;
  sku: string;           // e.g.  "SHIRT-RED-L"
  color?: string;
  size?: string;
  additionalPrice: number; // delta on top of base sellingPrice (0 = same price)
  openingQty: number;
};

export type Item = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  supplierId: string;
  supplierName?: string;
  purchasePrice: number;
  sellingPrice: number;
  openingQty: number;
  minStockLevel: number;
  reorderLevel: number;
  movingAverageCost?: number;
  location: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
  // Variant support
  hasVariants?: boolean;
  variants?: ItemVariant[];
  imageUrl?: string;
  // Wholesale pricing tiers (شرائح سعرية)
  priceTiers?: Array<{
    minQty: number;   // minimum quantity to qualify for this tier
    price: number;    // price per unit at this tier
    label?: string;   // e.g. "جملة", "نصف جملة"
  }>;
  // Bill of Materials — التصنيع
  isManufactured?: boolean;               // منتج مصنّع (يُجمَّع من أصناف أخرى)
  bom?: Array<{                           // قائمة مواد التصنيع
    componentItemId: string;
    quantity: number;
  }>;
  // Feature A: Batch & Expiry
  isPerishable?: boolean;    // يحتاج تتبع الصلاحية
  // Feature B: Serial Number Tracking
  isSerialTracked?: boolean; // يحتاج أرقام سيريال
};

// ── Store Settings (VAT & general) ───────────────────────────────────────────
export type StoreSettings = {
  vatEnabled?: boolean;      // تفعيل الضريبة
  vatRate?: number;          // نسبة الضريبة % (e.g. 15)
  vatNumber?: string;        // الرقم الضريبي
  storeName?: string;        // اسم المتجر
};

export type StockInMovement = {
  id: string;
  operationCode: string;
  date: string;
  invoiceNo: string;
  itemId: string;
  itemName?: string;
  category?: string;
  supplierId: string;
  supplierName?: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  responsibleEmployee: string;
  notes?: string;
  // Feature A: Batch & Expiry
  batchNumber?: string;   // رقم الدفعة e.g. "BATCH-001"
  expiryDate?: string;    // تاريخ انتهاء الصلاحية ISO date string "2026-12-31"
};

export type StockOutMovement = {
  id: string;
  operationCode: string;
  date: string;
  itemId: string;
  itemName?: string;
  category?: string;
  recipientDept: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reason: string;
  responsibleEmployee: string;
  notes?: string;
};

export type CurrentStock = {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  openingQty: number;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
  minStockLevel: number;
  reorderLevel: number;
  status: 'OUT_OF_STOCK' | 'NEEDS_REORDER' | 'LOW' | 'AVAILABLE';
  stockValue: number;
};

export type StockStatus = CurrentStock['status'];

// ── Purchase Invoice ──────────────────────────────────────────────────────────

export type LandedCostMethod = 'VALUE' | 'QUANTITY' | 'EQUAL';

export type PurchaseInvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED';

// ── Supplier Payment tracking ─────────────────────────────────────────────────
export type SupplierPayment = {
  id: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'check';
  notes?: string;
};

export type PurchaseInvoiceItem = {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  category: string;
  quantity: number;
  unitPrice: number;           // سعر الوحدة من المورد
  lineTotal: number;           // quantity * unitPrice

  // Landed cost (computed)
  allocatedLandedCost: number; // المصاريف الموزعة على هذا الصنف
  landedCostPerUnit: number;   // allocatedLandedCost / quantity
  totalUnitCost: number;       // unitPrice + landedCostPerUnit — تكلفة الوحدة الفعلية

  // MAC snapshot (filled when received)
  previousMAC: number;
  newMAC: number;
};

export type PurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;          // YYYY-MM-DD
  currency: string;             // SAR | USD | EUR | AED | GBP
  exchangeRate: number;         // 1.0 for SAR
  // Landed cost fields
  intlShipping: number;
  localShipping: number;
  customsDuties: number;
  clearanceFees: number;
  otherExpenses: number;
  allocationMethod: LandedCostMethod;
  // Items
  items: PurchaseInvoiceItem[];
  // Computed totals
  subtotal: number;
  totalLandedCosts: number;
  grandTotal: number;
  // Meta
  status: PurchaseInvoiceStatus;
  notes: string;
  createdAt: string;
  receivedAt?: string;
  // Payment tracking (Feature 9)
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  dueDate?: string;
  payments: SupplierPayment[];
};

// ── Sales Orders ──────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type SalesOrderItem = {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  category: string;
  quantity: number;
  sellingPrice: number;       // سعر البيع للعميل
  lineTotal: number;          // quantity * sellingPrice
  costSnapshot: number;       // MAC at time of order (for profit calc)
  lineCost: number;           // quantity * costSnapshot
  variantId?: string;         // optional variant (color/size)
  variantLabel?: string;      // e.g. "أحمر / L"
  // Feature B: Serial Number Tracking
  serialNumbers?: string[];   // أرقام السيريال المبيعة
};

// ── Coupons & Discounts ───────────────────────────────────────────────────────
export type Coupon = {
  id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;              // amount off or percentage
  minOrderValue: number;      // minimum cart total to apply
  maxUses: number;            // 0 = unlimited
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
};

// ── Return Orders ─────────────────────────────────────────────────────────────
export type ReturnOrderItem = {
  id: string;
  originalOrderItemId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  sellingPrice: number;
  lineTotal: number;
};

export type ReturnOrder = {
  id: string;
  returnNumber: string;
  originalOrderId: string;
  originalOrderNumber: string;
  customerName: string;
  customerPhone: string;
  items: ReturnOrderItem[];
  reason: string;
  refundAmount: number;
  restockItems: boolean;      // true = add items back to inventory
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string;
  createdAt: string;
};

export type SalesOrder = {
  id: string;
  orderNumber: string;        // SO-YYYY-NNNN

  // Customer
  customerName: string;
  customerPhone: string;
  customerCity: string;
  deliveryType: 'home' | 'office' | 'female';

  // Items
  items: SalesOrderItem[];

  // Shipping details
  shippingLength: number;
  shippingWidth: number;
  shippingHeight: number;
  shippingWeight: number;
  needsPackaging: boolean;

  // Computed costs
  subtotalProducts: number;   // sum of lineTotals
  shippingCost: number;
  packagingCost: number;

  // Who pays
  shippingOnStore: boolean;   // true = store absorbs shipping cost
  packagingOnStore: boolean;  // true = store absorbs packaging cost

  // Customer invoice total
  customerTotal: number;

  // Profit (internal)
  totalCOGS: number;          // sum of lineCosts
  storeShippingExpense: number; // shippingCost if shippingOnStore else 0
  storePackagingExpense: number; // packagingCost if packagingOnStore else 0
  grossProfit: number;        // subtotalProducts - totalCOGS
  vatRate?: number;           // نسبة الضريبة %
  vatAmount?: number;         // مبلغ الضريبة
  netProfit: number;          // grossProfit - storeShippingExpense - storePackagingExpense
  profitMargin: number;       // netProfit / subtotalProducts * 100

  status: OrderStatus;
  notes: string;
  createdAt: string;
  // Coupon / Discount (Feature 2)
  couponCode?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
  // Shipping Tracking (Feature 8)
  trackingNumber?: string;
  shippingCarrier?: string;
  shippedAt?: string;
  // Returns reference
  hasReturn?: boolean;
  // Customer payment tracking
  customerPaymentStatus?: 'unpaid' | 'partial' | 'paid';
  customerPaidAmount?: number;
  customerPayments?: Array<{
    id: string;
    amount: number;
    date: string;
    method: 'cash' | 'bank_transfer' | 'check';
    notes?: string;
  }>;
};

// ── Appointments ─────────────────────────────────────────────────────────────
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type Appointment = {
  id: string;
  customerName: string;
  customerPhone: string;
  service: string;
  staffName?: string;
  date: string;             // "2026-05-20"
  time: string;             // "14:30"
  durationMinutes: number;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
};

// ── Multi-Tenant / SaaS ───────────────────────────────────────────────────────

export type SubscriptionPlan = 'trial' | 'starter' | 'pro' | 'enterprise';
export type TenantStatus     = 'pending' | 'active' | 'suspended' | 'cancelled';
export type UserRole         = 'super_admin' | 'tenant_admin' | 'tenant_user';
export type RegStatus        = 'pending' | 'approved' | 'rejected';

export interface Tenant {
  id: string;
  slug: string;           // used in subdomain / path routing
  store_name: string;
  owner_email: string;
  owner_phone?: string;
  logo_url?: string;
  subscription_plan: SubscriptionPlan;
  status: TenantStatus;
  subscription_ends_at?: string;
  monthly_fee: number;
  max_users: number;
  max_items: number;
  max_orders_per_month: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string | null;  // null for super_admin
  role: UserRole;
  full_name?: string;
  /** Granular permission overrides: { "reports:read": true, "settings:write": false } */
  permissions: Partial<Record<Permission, boolean>>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Aggregate stats row returned by the super-admin view */
export interface TenantStats extends Tenant {
  total_users:     number;
  active_users:    number;
  total_orders:    number;
  orders_last_30d: number;
  gmv_last_30d:    number;
}

export interface RegistrationRequest {
  id: string;
  store_name: string;
  owner_name: string;
  email: string;
  phone?: string;
  requested_plan: SubscriptionPlan;
  status: RegStatus;
  notes?: string;
  tenant_id?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface SubscriptionPayment {
  id: string;
  tenantId: string;
  plan: string;
  billingMonths: number;
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'usdt';
  status: 'pending' | 'approved' | 'rejected';
  txHash?: string;
  proofNotes?: string;
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SubscriptionEvent {
  id: string;
  tenant_id: string;
  event_type: 'created' | 'upgraded' | 'downgraded' | 'suspended' | 'cancelled' | 'payment_received';
  plan_from?: SubscriptionPlan;
  plan_to?: SubscriptionPlan;
  amount?: number;
  notes?: string;
  created_at: string;
}

export interface PlanLimit {
  plan: SubscriptionPlan;
  display_name: string;
  monthly_fee: number;
  max_users: number;
  max_items: number;
  max_orders_mo: number;
  has_api_access: boolean;
  has_multi_store: boolean;
}

// ── RBAC Permissions ──────────────────────────────────────────────────────────

export type Permission =
  | 'stock-in:read'  | 'stock-in:write'
  | 'stock-out:read' | 'stock-out:write'
  | 'items:read'     | 'items:write'
  | 'suppliers:read' | 'suppliers:write'
  | 'purchases:read' | 'purchases:write'
  | 'orders:read'    | 'orders:write'
  | 'reports:read'
  | 'settings:read'  | 'settings:write'
  | 'users:read'     | 'users:write'
  | 'customers:read'
  | 'returns:read'   | 'returns:write'
  | 'coupons:read'   | 'coupons:write'
  | 'analytics:read'
  | 'purchase_prices:read';

export const DEFAULT_PERMISSIONS: Record<UserRole, Record<Permission, boolean>> = {
  super_admin: Object.fromEntries(
    ([ 'stock-in:read','stock-in:write','stock-out:read','stock-out:write',
       'items:read','items:write','suppliers:read','suppliers:write',
       'purchases:read','purchases:write','orders:read','orders:write',
       'reports:read','settings:read','settings:write','users:read','users:write',
       'customers:read','returns:read','returns:write','coupons:read','coupons:write',
       'analytics:read','purchase_prices:read',
    ] as Permission[]).map(k => [k, true])
  ) as Record<Permission, boolean>,

  tenant_admin: Object.fromEntries(
    ([ 'stock-in:read','stock-in:write','stock-out:read','stock-out:write',
       'items:read','items:write','suppliers:read','suppliers:write',
       'purchases:read','purchases:write','orders:read','orders:write',
       'reports:read','settings:read','settings:write','users:read','users:write',
       'customers:read','returns:read','returns:write','coupons:read','coupons:write',
       'analytics:read','purchase_prices:read',
    ] as Permission[]).map(k => [k, true])
  ) as Record<Permission, boolean>,

  tenant_user: {
    'stock-in:read': true,  'stock-in:write': true,
    'stock-out:read': true, 'stock-out:write': true,
    'items:read': true,     'items:write': false,
    'suppliers:read': true, 'suppliers:write': false,
    'purchases:read': true, 'purchases:write': false,
    'orders:read': true,    'orders:write': true,
    'reports:read': false,
    'settings:read': false, 'settings:write': false,
    'users:read': false,    'users:write': false,
    'customers:read': true,
    'returns:read': true,   'returns:write': true,
    'coupons:read': true,   'coupons:write': false,
    'analytics:read': false,
    'purchase_prices:read': false,
  },
};

