'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { CurrentStock } from '@/lib/types';

const supabase = () => getSupabaseClient();

function mapCurrentStock(row: any): CurrentStock {
  return {
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    category: row.category,
    unit: row.unit,
    openingQty: parseFloat(row.opening_qty),
    totalIn: parseFloat(row.total_in),
    totalOut: parseFloat(row.total_out),
    currentBalance: parseFloat(row.current_balance),
    minStockLevel: parseFloat(row.min_stock_level),
    reorderLevel: parseFloat(row.reorder_level),
    status: row.status,
    stockValue: parseFloat(row.stock_value),
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
