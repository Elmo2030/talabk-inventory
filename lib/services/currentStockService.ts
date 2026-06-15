import { getSupabaseClient } from '@/lib/supabase/client';
import type { CurrentStock } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

const supabase = () => getSupabaseClient();

// Row shape is generated from the `current_stock_view` Postgres view.
// PostgREST emits numerics as JS numbers when ≤ 15 digits, but some
// rows arrive as strings (older PG versions). `toNum` normalizes both
// shapes without a runtime cost on the happy path.
type StockRow = Database['public']['Views']['current_stock_view']['Row'];

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseFloat(v);
}

function mapCurrentStock(row: StockRow): CurrentStock {
  return {
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    category: row.category,
    unit: row.unit,
    openingQty: toNum(row.opening_qty),
    totalIn: toNum(row.total_in),
    totalOut: toNum(row.total_out),
    currentBalance: toNum(row.current_balance),
    minStockLevel: toNum(row.min_stock_level),
    reorderLevel: toNum(row.reorder_level),
    status: row.status,
    stockValue: toNum(row.stock_value),
  };
}

export const currentStockService = {
  async getAll(): Promise<CurrentStock[]> {
    const { data, error } = await supabase()
      .from('current_stock_view')
      .select('*')
      .order('item_code', { ascending: true });

    if (error) throw new Error(`فشل جلب الرصيد: ${error.message}`);
    return (data ?? []).map(mapCurrentStock);
  },

  async getByItemId(itemId: string): Promise<CurrentStock | null> {
    const { data, error } = await supabase()
      .from('current_stock_view')
      .select('*')
      .eq('item_id', itemId)
      .single();

    if (error) return null;
    return data ? mapCurrentStock(data) : null;
  },

  async getCurrentBalance(itemId: string): Promise<number> {
    const stock = await this.getByItemId(itemId);
    return stock?.currentBalance ?? 0;
  },
};
