import { getSupabaseClient } from '@/lib/supabase/client';
import type { Coupon } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type CouponRow = Database['public']['Tables']['coupons']['Row'];
type CouponInsert = Database['public']['Tables']['coupons']['Insert'];

// ============================================
// Coupons Service
// ============================================

const supabase = () => getSupabaseClient();

function mapCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    minOrderValue: row.min_order_value,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    isActive: row.is_active,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

export const couponsService = {
  async getAll(): Promise<Coupon[]> {
    const { data, error } = await supabase()
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`فشل جلب الكوبونات: ${error.message}`);
    return (data ?? []).map(mapCoupon);
  },

  async getByCode(code: string): Promise<Coupon | null> {
    const { data, error } = await supabase()
      .from('coupons')
      .select('*')
      .ilike('code', code)
      .single();

    if (error) return null;
    return data ? mapCoupon(data) : null;
  },

  async create(coupon: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Promise<Coupon> {
    const insertData: CouponInsert = {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order_value: coupon.minOrderValue,
      max_uses: coupon.maxUses,
      used_count: 0,
      is_active: coupon.isActive,
      expires_at: coupon.expiresAt ?? null,
    };

    const { data, error } = await supabase()
      .from('coupons')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`فشل إضافة الكوبون: ${error.message}`);
    return mapCoupon(data as CouponRow);
  },

  async update(id: string, updates: Partial<Coupon>): Promise<Coupon> {
    const dbUpdates: Database['public']['Tables']['coupons']['Update'] = {};
    if (updates.code !== undefined) dbUpdates.code = updates.code;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.minOrderValue !== undefined) dbUpdates.min_order_value = updates.minOrderValue;
    if (updates.maxUses !== undefined) dbUpdates.max_uses = updates.maxUses;
    if (updates.usedCount !== undefined) dbUpdates.used_count = updates.usedCount;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt ?? null;

    const { data, error } = await supabase()
      .from('coupons')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`فشل تحديث الكوبون: ${error.message}`);
    return mapCoupon(data as CouponRow);
  },

  async incrementUsed(id: string): Promise<void> {
    // Use rpc or a read-modify approach; simple increment via update
    const { data: current, error: fetchErr } = await supabase()
      .from('coupons')
      .select('used_count')
      .eq('id', id)
      .single();

    if (fetchErr || !current) return;

    const { error } = await supabase()
      .from('coupons')
      .update({ used_count: current.used_count + 1 })
      .eq('id', id);

    if (error) throw new Error(`فشل تحديث عداد الكوبون: ${error.message}`);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('coupons').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف الكوبون: ${error.message}`);
  },
};
