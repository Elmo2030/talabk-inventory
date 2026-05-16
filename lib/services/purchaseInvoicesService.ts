import { getSupabaseClient } from '@/lib/supabase/client';
import type { PurchaseInvoice, PurchaseInvoiceItem, SupplierPayment } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type PIRow = Database['public']['Tables']['purchase_invoices']['Row'];
type PIInsert = Database['public']['Tables']['purchase_invoices']['Insert'];

const supabase = () => getSupabaseClient();

// ── Number generation ────────────────────────────────────────────────────────
async function genInvoiceNumber(): Promise<string> {
  const { data: { session } } = await supabase().auth.getSession();
  const tenantId = session?.user?.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    const year = new Date().getFullYear();
    return `PO-${year}-${Date.now().toString().slice(-4)}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase() as any).rpc('next_order_number', {
    p_tenant_id: tenantId,
    p_prefix: 'PO',
    p_year: new Date().getFullYear(),
  });
  if (error || !data) throw new Error(`فشل توليد رقم الفاتورة: ${(error as { message?: string })?.message}`);
  return data as string;
}

// ── Mapper ───────────────────────────────────────────────────────────────────
function mapRow(row: PIRow): PurchaseInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    supplierId: row.supplier_id ?? '',
    supplierName: row.supplier_name,
    invoiceDate: row.invoice_date,
    currency: row.currency,
    exchangeRate: row.exchange_rate,
    intlShipping: row.intl_shipping,
    localShipping: row.local_shipping,
    customsDuties: row.customs_duties,
    clearanceFees: row.clearance_fees,
    otherExpenses: row.other_expenses,
    allocationMethod: row.allocation_method,
    items: (row.items as PurchaseInvoiceItem[]) ?? [],
    subtotal: row.subtotal,
    totalLandedCosts: row.total_landed_costs,
    grandTotal: row.grand_total,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    receivedAt: row.received_at ?? undefined,
    paymentStatus: row.payment_status,
    paidAmount: row.paid_amount,
    dueDate: row.due_date ?? undefined,
    payments: (row.payments as SupplierPayment[]) ?? [],
  };
}

function toInsert(
  invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt'>,
  invoiceNumber: string
): PIInsert {
  return {
    invoice_number: invoiceNumber,
    supplier_id: invoice.supplierId || null,
    supplier_name: invoice.supplierName,
    invoice_date: invoice.invoiceDate,
    currency: invoice.currency,
    exchange_rate: invoice.exchangeRate,
    intl_shipping: invoice.intlShipping,
    local_shipping: invoice.localShipping,
    customs_duties: invoice.customsDuties,
    clearance_fees: invoice.clearanceFees,
    other_expenses: invoice.otherExpenses,
    allocation_method: invoice.allocationMethod,
    items: invoice.items as unknown,
    subtotal: invoice.subtotal,
    total_landed_costs: invoice.totalLandedCosts,
    grand_total: invoice.grandTotal,
    status: invoice.status ?? 'DRAFT',
    notes: invoice.notes,
    payment_status: invoice.paymentStatus,
    paid_amount: invoice.paidAmount,
    due_date: invoice.dueDate ?? null,
    payments: (invoice.payments ?? []) as unknown,
  };
}

// ── Service ──────────────────────────────────────────────────────────────────
export const purchaseInvoicesService = {
  async getAll(page = 0, pageSize = 200): Promise<PurchaseInvoice[]> {
    const from = page * pageSize;
    const to   = from + pageSize - 1;

    const { data, error } = await supabase()
      .from('purchase_invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`فشل جلب فواتير الشراء: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<PurchaseInvoice | null> {
    const { data, error } = await supabase()
      .from('purchase_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data ? mapRow(data) : null;
  },

  async create(
    invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt'>
  ): Promise<PurchaseInvoice> {
    const invoiceNumber = await genInvoiceNumber();
    const insertData = toInsert(invoice, invoiceNumber);

    const { data, error } = await supabase()
      .from('purchase_invoices')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`فشل إنشاء فاتورة الشراء: ${error.message}`);
    return mapRow(data as PIRow);
  },

  async update(id: string, updates: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> {
    const dbUpdates: Database['public']['Tables']['purchase_invoices']['Update'] = {};

    if (updates.supplierName !== undefined) dbUpdates.supplier_name = updates.supplierName;
    if (updates.supplierId !== undefined)   dbUpdates.supplier_id   = updates.supplierId || null;
    if (updates.invoiceDate !== undefined)  dbUpdates.invoice_date  = updates.invoiceDate;
    if (updates.currency !== undefined)     dbUpdates.currency      = updates.currency;
    if (updates.exchangeRate !== undefined) dbUpdates.exchange_rate = updates.exchangeRate;
    if (updates.intlShipping !== undefined) dbUpdates.intl_shipping = updates.intlShipping;
    if (updates.localShipping !== undefined) dbUpdates.local_shipping = updates.localShipping;
    if (updates.customsDuties !== undefined) dbUpdates.customs_duties = updates.customsDuties;
    if (updates.clearanceFees !== undefined) dbUpdates.clearance_fees = updates.clearanceFees;
    if (updates.otherExpenses !== undefined) dbUpdates.other_expenses = updates.otherExpenses;
    if (updates.allocationMethod !== undefined) dbUpdates.allocation_method = updates.allocationMethod;
    if (updates.items !== undefined)        dbUpdates.items         = updates.items;
    if (updates.subtotal !== undefined)     dbUpdates.subtotal      = updates.subtotal;
    if (updates.totalLandedCosts !== undefined) dbUpdates.total_landed_costs = updates.totalLandedCosts;
    if (updates.grandTotal !== undefined)   dbUpdates.grand_total   = updates.grandTotal;
    if (updates.status !== undefined)       dbUpdates.status        = updates.status;
    if (updates.notes !== undefined)        dbUpdates.notes         = updates.notes;
    if (updates.receivedAt !== undefined)   dbUpdates.received_at   = updates.receivedAt ?? null;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.paidAmount !== undefined)   dbUpdates.paid_amount   = updates.paidAmount;
    if (updates.dueDate !== undefined)      dbUpdates.due_date      = updates.dueDate ?? null;
    if (updates.payments !== undefined)     dbUpdates.payments      = updates.payments;

    const { data, error } = await supabase()
      .from('purchase_invoices')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`فشل تحديث فاتورة الشراء: ${error.message}`);
    return mapRow(data as PIRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('purchase_invoices').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف فاتورة الشراء: ${error.message}`);
  },
};
