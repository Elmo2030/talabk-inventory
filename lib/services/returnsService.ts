import { getSupabaseClient } from '@/lib/supabase/client';
import type { ReturnOrder, ReturnOrderItem } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type ReturnOrderRow = Database['public']['Tables']['return_orders']['Row'];
type ReturnOrderInsert = Database['public']['Tables']['return_orders']['Insert'];

// ============================================
// Returns Service
// ============================================

const supabase = () => getSupabaseClient();

function mapReturnOrder(row: ReturnOrderRow): ReturnOrder {
  return {
    id: row.id,
    returnNumber: row.return_number,
    originalOrderId: row.original_order_id,
    originalOrderNumber: row.original_order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    items: (row.items as ReturnOrderItem[]) ?? [],
    reason: row.reason,
    refundAmount: row.refund_amount,
    restockItems: row.restock_items,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const { count } = await supabase()
      .from('return_orders')
      .select('*', { count: 'exact', head: true });
    const next = (count ?? 0) + 1;
    return `RET-${year}-${String(next).padStart(4, '0')}`;
  } catch {
    // Timestamp fallback
    return `RET-${year}-${Date.now().toString().slice(-4)}`;
  }
}

export const returnsService = {
  async getAll(): Promise<ReturnOrder[]> {
    const { data, error } = await supabase()
      .from('return_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`فشل جلب طلبات الإرجاع: ${error.message}`);
    return (data ?? []).map(mapReturnOrder);
  },

  async create(
    ret: Omit<ReturnOrder, 'id' | 'returnNumber' | 'createdAt'>
  ): Promise<ReturnOrder> {
    const returnNumber = await generateReturnNumber();

    const insertData: ReturnOrderInsert = {
      return_number: returnNumber,
      original_order_id: ret.originalOrderId,
      original_order_number: ret.originalOrderNumber,
      customer_name: ret.customerName,
      customer_phone: ret.customerPhone,
      items: ret.items as unknown,
      reason: ret.reason,
      refund_amount: ret.refundAmount,
      restock_items: ret.restockItems,
      status: ret.status,
      notes: ret.notes,
    };

    const { data, error } = await supabase()
      .from('return_orders')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`فشل إضافة طلب الإرجاع: ${error.message}`);
    return mapReturnOrder(data as ReturnOrderRow);
  },

  async update(id: string, updates: Partial<ReturnOrder>): Promise<ReturnOrder> {
    const dbUpdates: Database['public']['Tables']['return_orders']['Update'] = {};
    if (updates.originalOrderId !== undefined) dbUpdates.original_order_id = updates.originalOrderId;
    if (updates.originalOrderNumber !== undefined) dbUpdates.original_order_number = updates.originalOrderNumber;
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
    if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
    if (updates.items !== undefined) dbUpdates.items = updates.items as unknown;
    if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
    if (updates.refundAmount !== undefined) dbUpdates.refund_amount = updates.refundAmount;
    if (updates.restockItems !== undefined) dbUpdates.restock_items = updates.restockItems;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase()
      .from('return_orders')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`فشل تحديث طلب الإرجاع: ${error.message}`);
    return mapReturnOrder(data as ReturnOrderRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('return_orders').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف طلب الإرجاع: ${error.message}`);
  },
};
