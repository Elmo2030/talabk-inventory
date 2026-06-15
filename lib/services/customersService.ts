import { getSupabaseClient } from '@/lib/supabase/client';
import type { Customer, CustomerBalance } from '@/lib/types';

// ============================================
// Customers Service — Wave G #2
//
// `customers` + `vw_customer_balance` aren't in the generated `Database`
// types yet (migration 20260529). All Supabase calls cast through any
// for now; the rest of the file uses the domain types.
// ============================================

const supabase = () => getSupabaseClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function mapCustomer(row: Row): Customer {
  return {
    id:             row.id,
    code:           row.code,
    name:           row.name,
    phone:          row.phone ?? '',
    email:          row.email ?? '',
    address:        row.address ?? '',
    city:           row.city ?? '',
    customerType:   row.customer_type,
    creditLimit:    row.credit_limit != null ? Number(row.credit_limit) : 0,
    openingBalance: row.opening_balance != null ? Number(row.opening_balance) : 0,
    status:         row.status,
    notes:          row.notes ?? '',
    createdAt:      row.created_at,
  };
}

function mapBalance(row: Row): CustomerBalance {
  return {
    customerId:     row.customer_id,
    code:           row.code,
    name:           row.name,
    creditLimit:    row.credit_limit != null ? Number(row.credit_limit) : 0,
    openingBalance: row.opening_balance != null ? Number(row.opening_balance) : 0,
    totalInvoiced:  row.total_invoiced != null ? Number(row.total_invoiced) : 0,
    totalPaid:      row.total_paid != null ? Number(row.total_paid) : 0,
    outstanding:    row.outstanding != null ? Number(row.outstanding) : 0,
    lastOrderAt:    row.last_order_at ?? undefined,
  };
}

interface CustomerWritePayload {
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  customer_type?: 'retail' | 'wholesale' | 'vip';
  credit_limit?: number;
  opening_balance?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}

function toRow(c: Partial<Customer>): CustomerWritePayload {
  const r: CustomerWritePayload = {
    code: c.code ?? '',
    name: c.name ?? '',
  };
  if (c.phone !== undefined)          r.phone = c.phone || undefined;
  if (c.email !== undefined)          r.email = c.email || undefined;
  if (c.address !== undefined)        r.address = c.address || undefined;
  if (c.city !== undefined)           r.city = c.city || undefined;
  if (c.customerType !== undefined)   r.customer_type = c.customerType;
  if (c.creditLimit !== undefined)    r.credit_limit = c.creditLimit;
  if (c.openingBalance !== undefined) r.opening_balance = c.openingBalance;
  if (c.status !== undefined)         r.status = c.status;
  if (c.notes !== undefined)          r.notes = c.notes || undefined;
  return r;
}

export const customersService = {
  async getAll(): Promise<Customer[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('customers' as any) as any)
      .select('*')
      .order('code', { ascending: true });
    if (error) throw new Error(`فشل جلب العملاء: ${error.message}`);
    return ((data ?? []) as Row[]).map(mapCustomer);
  },

  async create(c: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('customers' as any) as any)
      .insert(toRow(c))
      .select('*')
      .single();
    if (error) throw new Error(`فشل إضافة العميل: ${error.message}`);
    return mapCustomer(data as Row);
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('customers' as any) as any)
      .update(toRow(updates))
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(`فشل تعديل العميل: ${error.message}`);
    return mapCustomer(data as Row);
  },

  async delete(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase().from('customers' as any) as any)
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف العميل: ${error.message}`);
  },

  async getBalances(): Promise<CustomerBalance[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('vw_customer_balance' as any) as any)
      .select('*');
    if (error) throw new Error(`فشل جلب أرصدة العملاء: ${error.message}`);
    return ((data ?? []) as Row[]).map(mapBalance);
  },
};
