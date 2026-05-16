import { getSupabaseClient } from '@/lib/supabase/client';
import type { SalesOrder, SalesOrderItem } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type SORow = Database['public']['Tables']['sales_orders']['Row'];

const supabase = () => getSupabaseClient();

// ── Number generation ────────────────────────────────────────────────────────
async function genOrderNumber(): Promise<string> {
  // Get current tenant from session
  const { data: { session } } = await supabase().auth.getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    // Fallback for non-tenant context: timestamp-based
    const year = new Date().getFullYear();
    return `SO-${year}-${Date.now().toString().slice(-4)}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase() as any).rpc('next_order_number', {
    p_tenant_id: tenantId,
    p_prefix: 'SO',
    p_year: new Date().getFullYear(),
  });
  if (error || !data) throw new Error(`فشل توليد رقم الطلب: ${(error as { message?: string })?.message}`);
  return data as string;
}

// ── Mapper row → SalesOrder ──────────────────────────────────────────────────
function mapRow(row: SORow): SalesOrder {
  // items stored as JSONB — cast via unknown
  const items = (row.items as unknown as SalesOrderItem[]) ?? [];

  // The DB stores all fields in a flat columns + a metadata jsonb for extended fields
  // We use customer_payments jsonb for the nested object fields
  const ext = (row.customer_payments as unknown as Partial<SalesOrder>) ?? {};

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerCity: row.customer_city,
    deliveryType: row.delivery_type as SalesOrder['deliveryType'],
    items,
    shippingCost: row.shipping_cost,
    shippingOnStore: row.shipping_on_store,
    subtotalProducts: row.subtotal,
    customerTotal: row.customer_total,
    totalCOGS: row.total_cogs,
    grossProfit: row.gross_profit,
    netProfit: row.net_profit,
    profitMargin: row.profit_margin,
    vatRate: row.vat_rate ?? undefined,
    vatAmount: row.vat_amount ?? undefined,
    status: row.status as SalesOrder['status'],
    trackingNumber: row.tracking_number ?? undefined,
    shippingCarrier: row.shipping_carrier ?? undefined,
    notes: row.notes,
    couponCode: row.coupon_code ?? undefined,
    discountType: (row.discount_type as SalesOrder['discountType']) ?? undefined,
    discountValue: row.discount_value ?? undefined,
    discountAmount: row.discount_amount,
    customerPaymentStatus: (row.customer_payment_status as SalesOrder['customerPaymentStatus']) ?? undefined,
    customerPaidAmount: row.customer_paid_amount ?? undefined,
    customerPayments: (row.customer_payments as unknown as SalesOrder['customerPayments']) ?? [],
    createdAt: row.created_at,
    shippedAt: row.shipped_at ?? undefined,
    // Extended fields stored in ext (graceful fallback for existing rows)
    shippingLength: (ext as SalesOrder).shippingLength ?? 0,
    shippingWidth:  (ext as SalesOrder).shippingWidth  ?? 0,
    shippingHeight: (ext as SalesOrder).shippingHeight ?? 0,
    shippingWeight: (ext as SalesOrder).shippingWeight ?? 0,
    needsPackaging: (ext as SalesOrder).needsPackaging ?? false,
    packagingCost:  (ext as SalesOrder).packagingCost  ?? 0,
    packagingOnStore: (ext as SalesOrder).packagingOnStore ?? false,
    storeShippingExpense: (ext as SalesOrder).storeShippingExpense ?? 0,
    storePackagingExpense: (ext as SalesOrder).storePackagingExpense ?? 0,
  };
}

// ── Service ──────────────────────────────────────────────────────────────────
export const salesOrdersService = {
  async getAll(page = 0, pageSize = 200): Promise<SalesOrder[]> {
    const from = page * pageSize;
    const to   = from + pageSize - 1;

    const { data, error } = await supabase()
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`فشل جلب طلبات البيع: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<SalesOrder | null> {
    const { data, error } = await supabase()
      .from('sales_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data ? mapRow(data) : null;
  },

  async create(
    order: Omit<SalesOrder, 'id' | 'orderNumber' | 'createdAt'>
  ): Promise<SalesOrder> {
    const orderNumber = await genOrderNumber();

    // Extended fields that don't have dedicated columns go into customer_payments
    // (reusing the jsonb column since it's always replaced wholesale on update anyway)
    // We store the full order as extended payload to avoid data loss.
    // Primary columns cover the most queried fields.
    const extendedPayload = {
      shippingLength: order.shippingLength,
      shippingWidth: order.shippingWidth,
      shippingHeight: order.shippingHeight,
      shippingWeight: order.shippingWeight,
      needsPackaging: order.needsPackaging,
      packagingCost: order.packagingCost,
      packagingOnStore: order.packagingOnStore,
      storeShippingExpense: order.storeShippingExpense,
      storePackagingExpense: order.storePackagingExpense,
    };

    const { data, error } = await supabase()
      .from('sales_orders')
      .insert({
        order_number: orderNumber,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_city: order.customerCity,
        delivery_type: order.deliveryType,
        items: order.items as unknown,
        shipping_cost: order.shippingCost,
        shipping_on_store: order.shippingOnStore,
        subtotal: order.subtotalProducts,
        discount_amount: order.discountAmount ?? 0,
        discount_type: order.discountType ?? null,
        discount_value: order.discountValue ?? null,
        coupon_code: order.couponCode ?? null,
        customer_total: order.customerTotal,
        total_cogs: order.totalCOGS,
        gross_profit: order.grossProfit,
        net_profit: order.netProfit,
        profit_margin: order.profitMargin,
        vat_rate: order.vatRate ?? null,
        vat_amount: order.vatAmount ?? null,
        status: order.status ?? 'PENDING',
        tracking_number: order.trackingNumber ?? null,
        shipping_carrier: order.shippingCarrier ?? null,
        notes: order.notes ?? '',
        customer_payment_status: order.customerPaymentStatus ?? null,
        customer_paid_amount: order.customerPaidAmount ?? null,
        customer_payments: extendedPayload as unknown,
        shipped_at: order.shippedAt ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`فشل إنشاء طلب البيع: ${error.message}`);
    return mapRow(data as SORow);
  },

  async update(id: string, updates: Partial<SalesOrder>): Promise<SalesOrder> {
    // Build update object with only the columns that exist in the DB
    const dbUpdates: Database['public']['Tables']['sales_orders']['Update'] = {};

    if (updates.customerName !== undefined)    dbUpdates.customer_name    = updates.customerName;
    if (updates.customerPhone !== undefined)   dbUpdates.customer_phone   = updates.customerPhone;
    if (updates.customerCity !== undefined)    dbUpdates.customer_city    = updates.customerCity;
    if (updates.deliveryType !== undefined)    dbUpdates.delivery_type    = updates.deliveryType;
    if (updates.items !== undefined)           dbUpdates.items            = updates.items as unknown;
    if (updates.shippingCost !== undefined)    dbUpdates.shipping_cost    = updates.shippingCost;
    if (updates.shippingOnStore !== undefined) dbUpdates.shipping_on_store = updates.shippingOnStore;
    if (updates.subtotalProducts !== undefined) dbUpdates.subtotal        = updates.subtotalProducts;
    if (updates.discountAmount !== undefined)  dbUpdates.discount_amount  = updates.discountAmount;
    if (updates.discountType !== undefined)    dbUpdates.discount_type    = updates.discountType ?? null;
    if (updates.discountValue !== undefined)   dbUpdates.discount_value   = updates.discountValue ?? null;
    if (updates.couponCode !== undefined)      dbUpdates.coupon_code      = updates.couponCode ?? null;
    if (updates.customerTotal !== undefined)   dbUpdates.customer_total   = updates.customerTotal;
    if (updates.totalCOGS !== undefined)       dbUpdates.total_cogs       = updates.totalCOGS;
    if (updates.grossProfit !== undefined)     dbUpdates.gross_profit     = updates.grossProfit;
    if (updates.netProfit !== undefined)       dbUpdates.net_profit       = updates.netProfit;
    if (updates.profitMargin !== undefined)    dbUpdates.profit_margin    = updates.profitMargin;
    if (updates.vatRate !== undefined)         dbUpdates.vat_rate         = updates.vatRate ?? null;
    if (updates.vatAmount !== undefined)       dbUpdates.vat_amount       = updates.vatAmount ?? null;
    if (updates.status !== undefined)          dbUpdates.status           = updates.status;
    if (updates.trackingNumber !== undefined)  dbUpdates.tracking_number  = updates.trackingNumber ?? null;
    if (updates.shippingCarrier !== undefined) dbUpdates.shipping_carrier = updates.shippingCarrier ?? null;
    if (updates.notes !== undefined)           dbUpdates.notes            = updates.notes;
    if (updates.customerPaymentStatus !== undefined) dbUpdates.customer_payment_status = updates.customerPaymentStatus ?? null;
    if (updates.customerPaidAmount !== undefined)    dbUpdates.customer_paid_amount    = updates.customerPaidAmount ?? null;
    if (updates.shippedAt !== undefined)       dbUpdates.shipped_at       = updates.shippedAt ?? null;

    // Extended fields: fetch current row's payload and merge
    if (
      updates.shippingLength !== undefined ||
      updates.shippingWidth !== undefined  ||
      updates.shippingHeight !== undefined ||
      updates.shippingWeight !== undefined ||
      updates.needsPackaging !== undefined ||
      updates.packagingCost !== undefined  ||
      updates.packagingOnStore !== undefined ||
      updates.storeShippingExpense !== undefined ||
      updates.storePackagingExpense !== undefined
    ) {
      const { data: current } = await supabase()
        .from('sales_orders').select('customer_payments').eq('id', id).single();
      const prev = (current?.customer_payments as Record<string, unknown>) ?? {};
      dbUpdates.customer_payments = {
        ...prev,
        ...(updates.shippingLength !== undefined   && { shippingLength: updates.shippingLength }),
        ...(updates.shippingWidth !== undefined    && { shippingWidth: updates.shippingWidth }),
        ...(updates.shippingHeight !== undefined   && { shippingHeight: updates.shippingHeight }),
        ...(updates.shippingWeight !== undefined   && { shippingWeight: updates.shippingWeight }),
        ...(updates.needsPackaging !== undefined   && { needsPackaging: updates.needsPackaging }),
        ...(updates.packagingCost !== undefined    && { packagingCost: updates.packagingCost }),
        ...(updates.packagingOnStore !== undefined && { packagingOnStore: updates.packagingOnStore }),
        ...(updates.storeShippingExpense !== undefined && { storeShippingExpense: updates.storeShippingExpense }),
        ...(updates.storePackagingExpense !== undefined && { storePackagingExpense: updates.storePackagingExpense }),
      } as unknown;
    } else if (updates.customerPayments !== undefined) {
      dbUpdates.customer_payments = updates.customerPayments as unknown;
    }

    const { data, error } = await supabase()
      .from('sales_orders')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`فشل تحديث طلب البيع: ${error.message}`);
    return mapRow(data as SORow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('sales_orders').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف طلب البيع: ${error.message}`);
  },
};
