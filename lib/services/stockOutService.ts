'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { StockOutMovement } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type StockOutRow = Database['public']['Tables']['stock_out_movements']['Row'];
type StockOutInsert = Database['public']['Tables']['stock_out_movements']['Insert'];
type StockOutWithJoins = StockOutRow & {
  items?: { name?: string; category?: string } | null;
};

const supabase = () => getSupabaseClient();

function mapStockOut(row: StockOutWithJoins): StockOutMovement {
  return {
    id: row.id,
    operationCode: row.operation_code,
    date: row.date,
    itemId: row.item_id,
    itemName: row.items?.name,
    category: row.items?.category,
    recipientDept: row.recipient_dept,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalValue: row.total_value,
    reason: row.reason,
    responsibleEmployee: row.responsible_employee,
    notes: row.notes ?? '',
  };
}

export const stockOutService = {
  async getAll(): Promise<StockOutMovement[]> {
    const { data, error } = await supabase()
      .from('stock_out_movements')
      .select('*, items(name, category)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`فشل جلب حركات الصادر: ${error.message}`);
    return (data ?? []).map(mapStockOut);
  },

  async getByItemId(itemId: string): Promise<StockOutMovement[]> {
    const { data, error } = await supabase()
      .from('stock_out_movements')
      .select('*, items(name, category)')
      .eq('item_id', itemId)
      .order('date', { ascending: true });

    if (error) throw new Error(`فشل جلب حركات الصنف: ${error.message}`);
    return (data ?? []).map(mapStockOut);
  },

  // مهم جداً: الـ Trigger في DB يمنع الرصيد السالب
  async create(
    movement: Omit<StockOutMovement, 'id' | 'operationCode' | 'totalValue' | 'itemName' | 'category'>
  ): Promise<{ success: boolean; data?: StockOutMovement; error?: string }> {
    const insertData: StockOutInsert = {
      date: movement.date,
      item_id: movement.itemId,
      recipient_dept: movement.recipientDept,
      quantity: movement.quantity,
      unit_price: movement.unitPrice,
      reason: movement.reason,
      responsible_employee: movement.responsibleEmployee,
      notes: movement.notes ?? null,
    };

    const { data, error } = await supabase()
      .from('stock_out_movements')
      .insert(insertData)
      .select('*, items(name, category)')
      .single();

    if (error) {
      // الـ Trigger يرفع خطأ يحتوي على رسالة عربية
      const errorMsg = error.message.includes('الرصيد غير كافٍ')
        ? error.message
        : `فشل تسجيل الصادر: ${error.message}`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: mapStockOut(data as StockOutWithJoins) };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('stock_out_movements').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف الحركة: ${error.message}`);
  },
};
