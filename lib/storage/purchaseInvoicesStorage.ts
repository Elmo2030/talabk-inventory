import { PurchaseInvoice } from '@/lib/types';

// Tenant-isolated key — call setTenantPrefix(tenantId) on login to scope data
let _tenantPrefix = 'shared';
export function setInvoicesTenantPrefix(prefix: string) { _tenantPrefix = prefix; }

function key() { return `talabk_purchase_invoices_v1_${_tenantPrefix}`; }

function readAll(): PurchaseInvoice[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key()) ?? '[]'); } catch { return []; }
}
function writeAll(data: PurchaseInvoice[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(), JSON.stringify(data));
}
function genId(): string {
  return `pi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function genInvoiceNumber(existing: PurchaseInvoice[]): string {
  const year = new Date().getFullYear();
  const next = existing.length + 1;
  return `PO-${year}-${String(next).padStart(4, '0')}`;
}

export const purchaseInvoicesStorage = {
  getAll(): PurchaseInvoice[] { return readAll(); },
  getById(id: string): PurchaseInvoice | null {
    return readAll().find((p) => p.id === id) ?? null;
  },
  create(invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt'>): PurchaseInvoice {
    const all = readAll();
    const newInvoice: PurchaseInvoice = {
      ...invoice,
      id: genId(),
      invoiceNumber: genInvoiceNumber(all),
      createdAt: new Date().toISOString(),
    };
    writeAll([newInvoice, ...all]);
    return newInvoice;
  },
  update(id: string, updates: Partial<PurchaseInvoice>): PurchaseInvoice {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Purchase invoice ${id} not found`);
    all[idx] = { ...all[idx], ...updates };
    writeAll(all);
    return all[idx];
  },
  delete(id: string): void {
    writeAll(readAll().filter((p) => p.id !== id));
  },
};
