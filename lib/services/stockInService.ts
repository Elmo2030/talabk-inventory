import { getSupabaseClient } from '@/lib/supabase/client';
import type { StockInMovement } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type StockInRow = Database['public']['Tables']['stock_in_movements']['Row'];
type StockInInsert = Database['public']['Tables']['stock_in_movements']['Insert'];
type StockInWithJoins = StockInRow & {
  items?: { name?: string; category?: string } | null;
  suppliers?: { name?: string } | null;
};

const supabase = () => getSupabaseClient();

function mapStockIn(row: StockInWithJoins): StockInMovement {
  return {
    id: row.id,
    operationCode: row.operation_code,
    date: row.date,
    invoiceNo: row.invoice_no ?? '',
    itemId: row.item_id,
    itemName: row.items?.name,
    category: row.items?.category,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalCost: row.total_cost,
    responsibleEmployee: row.responsible_employee,
    notes: row.notes ?? '',
  };
}

export const stockInService = {
  async getAll(): Promise<StockInMovement[]> {
    const { data, error } = await supabase()
      .from('stock_in_movements')
      .select('*, items(name, category), suppliers(name)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`فشل جلب حركات الوارد: ${error.message}`);
    return (data ?? []).map(mapStockIn);
  },

  async getByItemId(itemId: string): Promise<StockInMovement[]> {
    const { data, error } = await supabase()
      .from('stock_in_movements')
      .select('*, items(name, category), suppliers(name)')
      .eq('item_id', itemId)
      .order('date', { ascending: true });

    if (error) throw new Error(`فشل جلب حركات الصنف: ${error.message}`);
    return (data ?? []).map(mapStockIn);
  },

  async create(
    movement: Omit<StockInMovement, 'id' | 'operationCode' | 'totalCost' | 'itemName' | 'category' | 'supplierName'>
  ): Promise<StockInMovement> {
    const insertData: StockInInsert = {
      date: movement.date,
      invoice_no: movement.invoiceNo ?? null,
      item_id: movement.itemId,
      supplier_id: movement.supplierId,
      quantity: movement.quantity,
      unit_price: movement.unitPrice,
      responsible_employee: movement.responsibleEmployee,
      notes: movement.notes ?? null,
    };

    const { data, error } = await supabase()
      .from('stock_in_movements')
      .insert(insertData)
      .select('*, items(name, category), suppliers(name)')
      .single();

    if (error) throw new Error(`فشل تسجيل الوارد: ${error.message}`);
    return mapStockIn(data as StockInWithJoins);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('stock_in_movements').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف الحركة: ${error.message}`);
  },
};
