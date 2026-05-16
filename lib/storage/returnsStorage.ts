import { ReturnOrder } from '@/lib/types';

let _tenantPrefix = 'shared';
export function setReturnsTenantPrefix(prefix: string) { _tenantPrefix = prefix; }

function key() { return `talabk_returns_v1_${_tenantPrefix}`; }

function readAll(): ReturnOrder[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key()) ?? '[]'); } catch { return []; }
}
function writeAll(data: ReturnOrder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(), JSON.stringify(data));
}
function genId(): string {
  return `rt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function genReturnNumber(existing: ReturnOrder[]): string {
  const year = new Date().getFullYear();
  const next = existing.length + 1;
  return `RET-${year}-${String(next).padStart(4, '0')}`;
}

export const returnsStorage = {
  getAll(): ReturnOrder[] { return readAll(); },
  getById(id: string): ReturnOrder | null {
    return readAll().find((r) => r.id === id) ?? null;
  },
  create(ret: Omit<ReturnOrder, 'id' | 'returnNumber' | 'createdAt'>): ReturnOrder {
    const all = readAll();
    const newReturn: ReturnOrder = {
      ...ret,
      id: genId(),
      returnNumber: genReturnNumber(all),
      createdAt: new Date().toISOString(),
    };
    writeAll([newReturn, ...all]);
    return newReturn;
  },
  update(id: string, updates: Partial<ReturnOrder>): ReturnOrder {
    const all = readAll();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Return ${id} not found`);
    all[idx] = { ...all[idx], ...updates };
    writeAll(all);
    return all[idx];
  },
  delete(id: string): void {
    writeAll(readAll().filter((r) => r.id !== id));
  },
};
