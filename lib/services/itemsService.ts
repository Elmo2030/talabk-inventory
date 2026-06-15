import { getSupabaseClient } from '@/lib/supabase/client';
import type { Item } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type ItemRow = Database['public']['Tables']['items']['Row'];
type ItemInsert = Database['public']['Tables']['items']['Insert'];

// ============================================
// Items Service
// ============================================

const supabase = () => getSupabaseClient();

// Slim type for the fields we stash in items.metadata jsonb. The column
// exists on the schema (DEFAULT '{}'::jsonb) and the previous mappers
// never read from it, so the field has been dormant. Wave G #3 starts
// using it for priceTiers (so wholesale/vip pricing can land without a
// new column migration).
interface ItemMetadata {
  priceTiers?: Item['priceTiers'];
  imageUrl?: string;
  hasVariants?: boolean;
  variants?: Item['variants'];
  isManufactured?: boolean;
  bom?: Item['bom'];
  isPerishable?: boolean;
  isSerialTracked?: boolean;
}

function readMeta(row: ItemRow): ItemMetadata {
  const raw = row.metadata as unknown;
  if (!raw || typeof raw !== 'object') return {};
  return raw as ItemMetadata;
}

function mapItem(row: ItemRow & { suppliers?: { name?: string } | null }): Item {
  const meta = readMeta(row);
  return {
    id: row.id,
    code: row.code,
    // Stale generated types don't carry `barcode` yet (migration 20260530).
    // Read it defensively until the next `npm run supabase:types`.
    barcode: ((row as unknown as { barcode?: string | null }).barcode) ?? undefined,
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
    // Pull the metadata-backed fields out so consumers (forms, picker,
    // tier logic) see a flat domain shape.
    priceTiers:      meta.priceTiers,
    imageUrl:        meta.imageUrl,
    hasVariants:     meta.hasVariants,
    variants:        meta.variants,
    isManufactured:  meta.isManufactured,
    bom:             meta.bom,
    isPerishable:    meta.isPerishable,
    isSerialTracked: meta.isSerialTracked,
  };
}

// Build a metadata jsonb object from the domain fields. Anything left
// undefined is stripped so the stored JSON stays tidy.
function buildMeta(item: Partial<Item>): ItemMetadata {
  const m: ItemMetadata = {};
  if (item.priceTiers !== undefined)      m.priceTiers = item.priceTiers;
  if (item.imageUrl !== undefined)        m.imageUrl = item.imageUrl;
  if (item.hasVariants !== undefined)     m.hasVariants = item.hasVariants;
  if (item.variants !== undefined)        m.variants = item.variants;
  if (item.isManufactured !== undefined)  m.isManufactured = item.isManufactured;
  if (item.bom !== undefined)             m.bom = item.bom;
  if (item.isPerishable !== undefined)    m.isPerishable = item.isPerishable;
  if (item.isSerialTracked !== undefined) m.isSerialTracked = item.isSerialTracked;
  return m;
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
    const insertData: ItemInsert & { barcode?: string | null } = {
      code: item.code,
      // Barcode is a real column added by migration 20260530. We cast the
      // Insert type so it compiles before the next types regen.
      barcode: item.barcode?.trim() ? item.barcode.trim() : null,
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
      // Persist priceTiers + variants + flags here so create() actually
      // saves them (previously the form data was dropped on write).
      metadata: buildMeta(item) as ItemInsert['metadata'],
    };

    // Cast to any for the insert: generated types don't carry `barcode`
    // yet (migration 20260530). Drop the cast after the next types regen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('items') as any)
      .insert(insertData)
      .select('*, suppliers(name)')
      .single();

    if (error) {
      // Plan limit exceeded — surface the Arabic message from the trigger
      if (error.message?.includes('تجاوزت الحد')) {
        throw new Error(error.message);
      }
      throw new Error(`فشل إضافة الصنف: ${error.message}`);
    }
    return mapItem(data as ItemRow & { suppliers?: { name?: string } | null });
  },

  async update(id: string, updates: Partial<Item>): Promise<Item> {
    // Build a partial DB payload from the camelCase domain updates.
    // We use the table's generated `Update` type so misspelled columns
    // or wrong nullability fail at compile time.
    const dbUpdates: Database['public']['Tables']['items']['Update'] = {};
    if (updates.code) dbUpdates.code = updates.code;
    // Barcode: empty string → null (clears scanner ID); undefined → leave alone.
    if (updates.barcode !== undefined) {
      (dbUpdates as { barcode?: string | null }).barcode =
        updates.barcode.trim() ? updates.barcode.trim() : null;
    }
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

    // Metadata update: read current metadata first then merge with the
    // partial domain updates. A blind overwrite would wipe sibling keys
    // (e.g. variants when the caller only touches priceTiers).
    const touchesMeta = (['priceTiers', 'imageUrl', 'hasVariants', 'variants',
      'isManufactured', 'bom', 'isPerishable', 'isSerialTracked'] as const)
      .some((k) => k in updates);

    if (touchesMeta) {
      const { data: current } = await supabase()
        .from('items')
        .select('metadata')
        .eq('id', id)
        .single();
      const merged = {
        ...(readMeta(current as ItemRow)),
        ...buildMeta(updates),
      };
      dbUpdates.metadata = merged as Database['public']['Tables']['items']['Update']['metadata'];
    }

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
