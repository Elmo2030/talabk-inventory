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
};
