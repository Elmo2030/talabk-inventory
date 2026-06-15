import { getSupabaseClient } from '@/lib/supabase/client';
import type { SalesRep } from '@/lib/types';

// ============================================
// Sales Reps Service
//
// `sales_reps` isn't in the generated `Database` types yet (the
// migration ships separately). Once `npm run supabase:types` is rerun
// the `as any` casts here can be replaced with a typed row alias —
// the rest of this file already uses the SalesRep domain type.
// ============================================

const supabase = () => getSupabaseClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function mapRep(row: Row): SalesRep {
  return {
    id:            row.id,
    code:          row.code,
    name:          row.name,
    phone:         row.phone ?? '',
    email:         row.email ?? '',
    commissionPct: row.commission_pct != null ? Number(row.commission_pct) : 0,
    territory:     row.territory ?? '',
    status:        row.status,
    notes:         row.notes ?? '',
    createdAt:     row.created_at,
  };
}

interface RepWritePayload {
  code: string;
  name: string;
  phone?: string;
  email?: string;
  commission_pct?: number;
  territory?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}

function toRow(rep: Partial<SalesRep>): RepWritePayload {
  const payload: RepWritePayload = {
    code: rep.code ?? '',
    name: rep.name ?? '',
  };
  if (rep.phone !== undefined)         payload.phone = rep.phone || undefined;
  if (rep.email !== undefined)         payload.email = rep.email || undefined;
  if (rep.commissionPct !== undefined) payload.commission_pct = rep.commissionPct;
  if (rep.territory !== undefined)     payload.territory = rep.territory || undefined;
  if (rep.status !== undefined)        payload.status = rep.status;
  if (rep.notes !== undefined)         payload.notes = rep.notes || undefined;
  return payload;
}

export const salesRepsService = {
  async getAll(): Promise<SalesRep[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('sales_reps' as any) as any)
      .select('*')
      .order('code', { ascending: true });
    if (error) throw new Error(`فشل جلب المندوبين: ${error.message}`);
    return ((data ?? []) as Row[]).map(mapRep);
  },

  async create(rep: Omit<SalesRep, 'id' | 'createdAt'>): Promise<SalesRep> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('sales_reps' as any) as any)
      .insert(toRow(rep))
      .select('*')
      .single();
    if (error) throw new Error(`فشل إضافة المندوب: ${error.message}`);
    return mapRep(data as Row);
  },

  async update(id: string, updates: Partial<SalesRep>): Promise<SalesRep> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase().from('sales_reps' as any) as any)
      .update(toRow(updates))
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(`فشل تعديل المندوب: ${error.message}`);
    return mapRep(data as Row);
  },

  async delete(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase().from('sales_reps' as any) as any)
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف المندوب: ${error.message}`);
  },
};
