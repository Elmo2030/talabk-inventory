import { SalesOrder } from '@/lib/types';

// Tenant-isolated key — call setTenantPrefix(tenantId) on login to scope data
let _tenantPrefix = 'shared';
export function setOrdersTenantPrefix(prefix: string) { _tenantPrefix = prefix; }

function key() { return `talabk_sales_orders_v1_${_tenantPrefix}`; }

function readAll(): SalesOrder[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key()) ?? '[]'); } catch { return []; }
}
function writeAll(data: SalesOrder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(), JSON.stringify(data));
}
function genId(): string {
  return `so-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function genOrderNumber(existing: SalesOrder[]): string {
  const year = new Date().getFullYear();
  const next = existing.length + 1;
  return `SO-${year}-${String(next).padStart(4, '0')}`;
}

export const salesOrdersStorage = {
  getAll(): SalesOrder[] { return readAll(); },
  getById(id: string): SalesOrder | null {
    return readAll().find((o) => o.id === id) ?? null;
  },
  create(order: Omit<SalesOrder, 'id' | 'orderNumber' | 'createdAt'>): SalesOrder {
    const all = readAll();
    const newOrder: SalesOrder = {
      ...order,
      id: genId(),
      orderNumber: genOrderNumber(all),
      createdAt: new Date().toISOString(),
    };
    writeAll([newOrder, ...all]);
    return newOrder;
  },
  update(id: string, updates: Partial<SalesOrder>): SalesOrder {
    const all = readAll();
    const idx = all.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Sales order ${id} not found`);
    all[idx] = { ...all[idx], ...updates };
    writeAll(all);
    return all[idx];
  },
  delete(id: string): void {
    writeAll(readAll().filter((o) => o.id !== id));
  },
};
