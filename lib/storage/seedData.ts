// ============================================
// seedData — Populates localStorage with demo data on first run
// Only runs when localStorage is empty (no 'mock_seeded' flag set).
// ============================================

import {
  mockSuppliers,
  mockItems,
  initialStockIn,
  initialStockOut,
} from '@/data/mock-data';

const SEED_FLAG = 'mock_seeded_v1';

const KEYS = {
  items: 'mock_items',
  suppliers: 'mock_suppliers',
  stockIn: 'mock_stock_in',
  stockOut: 'mock_stock_out',
} as const;

function write(key: string, data: unknown[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Seeds localStorage with demo data if it hasn't been seeded yet.
 * Calling this multiple times is safe — it only seeds once.
 */
export function seedMockDataIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_FLAG)) return;

  write(KEYS.suppliers, mockSuppliers);
  write(KEYS.items, mockItems);
  write(KEYS.stockIn, initialStockIn);
  write(KEYS.stockOut, initialStockOut);

  localStorage.setItem(SEED_FLAG, 'true');
  console.info('[Mock] بيانات تجريبية تم تحميلها في localStorage');
}

/**
 * Clears all mock data and the seed flag so the next load re-seeds.
 * Useful for the "reset to defaults" button in Settings.
 */
export function clearMockData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.items);
  localStorage.removeItem(KEYS.suppliers);
  localStorage.removeItem(KEYS.stockIn);
  localStorage.removeItem(KEYS.stockOut);
  localStorage.removeItem(SEED_FLAG);
  console.info('[Mock] تم مسح بيانات localStorage');
}
