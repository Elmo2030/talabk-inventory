import { Coupon } from '@/lib/types';

let _tenantPrefix = 'shared';
export function setCouponsTenantPrefix(prefix: string) { _tenantPrefix = prefix; }

function key() { return `talabk_coupons_v1_${_tenantPrefix}`; }

function readAll(): Coupon[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key()) ?? '[]'); } catch { return []; }
}
function writeAll(data: Coupon[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(), JSON.stringify(data));
}
function genId(): string {
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const couponsStorage = {
  getAll(): Coupon[] { return readAll(); },
  getById(id: string): Coupon | null {
    return readAll().find((c) => c.id === id) ?? null;
  },
  getByCode(code: string): Coupon | null {
    return readAll().find((c) => c.code.toUpperCase() === code.toUpperCase()) ?? null;
  },
  create(coupon: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Coupon {
    const all = readAll();
    const newCoupon: Coupon = {
      ...coupon,
      id: genId(),
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    writeAll([newCoupon, ...all]);
    return newCoupon;
  },
  update(id: string, updates: Partial<Coupon>): Coupon {
    const all = readAll();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Coupon ${id} not found`);
    all[idx] = { ...all[idx], ...updates };
    writeAll(all);
    return all[idx];
  },
  incrementUsed(id: string): void {
    const all = readAll();
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], usedCount: all[idx].usedCount + 1 };
      writeAll(all);
    }
  },
  delete(id: string): void {
    writeAll(readAll().filter((c) => c.id !== id));
  },
};
