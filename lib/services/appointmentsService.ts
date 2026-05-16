import { getSupabaseClient } from '@/lib/supabase/client';
import type { Appointment, AppointmentStatus } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type AptRow = Database['public']['Tables']['appointments']['Row'];

const supabase = () => getSupabaseClient();

// ── Mapper ────────────────────────────────────────────────────────────────────
function mapRow(row: AptRow): Appointment {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    service: row.service,
    staffName: row.staff_name ?? undefined,
    date: row.date,
    time: row.time,
    durationMinutes: row.duration_minutes,
    notes: row.notes ?? undefined,
    status: row.status as AppointmentStatus,
    createdAt: row.created_at,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────
export const appointmentsService = {
  async getAll(): Promise<Appointment[]> {
    const { data, error } = await supabase()
      .from('appointments')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw new Error(`فشل جلب المواعيد: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  async create(
    data: Omit<Appointment, 'id' | 'createdAt'>
  ): Promise<Appointment> {
    const { data: row, error } = await supabase()
      .from('appointments')
      .insert({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        service: data.service,
        staff_name: data.staffName ?? null,
        date: data.date,
        time: data.time,
        duration_minutes: data.durationMinutes,
        notes: data.notes ?? null,
        status: data.status,
      })
      .select()
      .single();

    if (error) throw new Error(`فشل إنشاء الموعد: ${error.message}`);
    return mapRow(row as AptRow);
  },

  async update(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const dbUpdates: Database['public']['Tables']['appointments']['Update'] = {};

    if (updates.customerName !== undefined)  dbUpdates.customer_name  = updates.customerName;
    if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
    if (updates.service !== undefined)       dbUpdates.service        = updates.service;
    if (updates.staffName !== undefined)     dbUpdates.staff_name     = updates.staffName ?? null;
    if (updates.date !== undefined)          dbUpdates.date           = updates.date;
    if (updates.time !== undefined)          dbUpdates.time           = updates.time;
    if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
    if (updates.notes !== undefined)         dbUpdates.notes          = updates.notes ?? null;
    if (updates.status !== undefined)        dbUpdates.status         = updates.status;

    const { data, error } = await supabase()
      .from('appointments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`فشل تحديث الموعد: ${error.message}`);
    return mapRow(data as AptRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('appointments').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف الموعد: ${error.message}`);
  },
};
