import { getSupabaseClient } from '@/lib/supabase/client';
import type { Item } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type ItemRow = Database['public']['Tables']['items']['Row'];
type ItemInsert = Database['public']['Tables']['items']['Insert'];

// ============================================
// Items Service
// ============================================

const supabase = () => getSupabaseClient();

function mapItem(row: ItemRow & { suppliers?: { name?: string } | null }): Item {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    unit: row.unit,
    supplierId: row.supplier_id ?? '',
    supplierName: row.suppliers?.name,
    purchasePrice: row.purchase_price,
    sellingPrice: row.selling_price,
    openingQty: row.opening_qty,
    minStockLevel: row.min_stock_level,
    reorderLevel: row.reorder_level,
    location: row.location ?? '',
    status: row.status,
    movingAverageCost: row.moving_average_cost ?? undefined,
  };
}

export const itemsService = {
  async getAll(): Promise<Item[]> {
    const { data, error } = await supabase()
      .from('items')
      .select('*, suppliers(name)')
      .order('code', { ascending: true });

    if (error) throw new Error(`فشل جلب الأصناف: ${error.message}`);
    return (data ?? []).map(mapItem);
  },

  async getById(id: string): Promise<Item | null> {
    const { data, error } = await supabase()
      .from('items')
      .select('*, suppliers(name)')
      .eq('id', id)
      .single();

    if (error) return null;
    return data ? mapItem(data) : null;
  },

  async create(item: Omit<Item, 'id' | 'supplierName'>): Promise<Item> {
    const insertData: ItemInsert = {
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      supplier_id: item.supplierId || null,
      purchase_price: item.purchasePrice,
      selling_price: item.sellingPrice,
      opening_qty: item.openingQty,
      min_stock_level: item.minStockLevel,
      reorder_level: item.reorderLevel,
      location: item.location,
      status: item.status,
      metadata: {},
    };

    const { data, error } = await supabase()
      .from('items')
      .insert(insertData)
      .select('*, suppliers(name)')
      .single();

    if (error) throw new Error(`فشل إضافة الصنف: ${error.message}`);
    return mapItem(data as ItemRow & { suppliers?: { name?: string } | null });
  },

  async update(id: string, updates: Partial<Item>): Promise<Item> {
    const dbUpdates: any = {};
    if (updates.code) dbUpdates.code = updates.code;
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.unit) dbUpdates.unit = updates.unit;
    if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId || null;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
    if (updates.openingQty !== undefined) dbUpdates.opening_qty = updates.openingQty;
    if (updates.minStockLevel !== undefined) dbUpdates.min_stock_level = updates.minStockLevel;
    if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.movingAverageCost !== undefined) dbUpdates.moving_average_cost = updates.movingAverageCost ?? null;

    const { data, error } = await supabase()
      .from('items')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, suppliers(name)')
      .single();

    if (error) throw new Error(`فشل تحديث الصنف: ${error.message}`);
    return mapItem(data as ItemRow & { suppliers?: { name?: string } | null });
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('items').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف الصنف: ${error.message}`);
  },
};
