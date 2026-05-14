'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Supplier } from '@/lib/types';
import type { Database } from '@/lib/supabase/database.types';

type SupplierRow = Database['public']['Tables']['suppliers']['Row'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];

// ============================================
// Suppliers Service
// كل عمليات قاعدة البيانات للموردين
// ============================================

const supabase = () => getSupabaseClient();

function mapSupplier(row: SupplierRow & { [key: string]: unknown }): Supplier {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    productType: row.product_type ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    contactPerson: row.contact_person ?? '',
    paymentTerms: row.payment_terms,
    rating: row.rating,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export const suppliersService = {
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase()
      .from('suppliers')
      .select('*')
      .order('code', { ascending: true });

    if (error) throw new Error(`فشل جلب الموردين: ${error.message}`);
    return (data ?? []).map(mapSupplier);
  },

  async getById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase()
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data ? mapSupplier(data) : null;
  },

  async create(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    const insertData: SupplierInsert = {
      code: supplier.code,
      name: supplier.name,
      product_type: supplier.productType || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address: supplier.address || null,
      contact_person: supplier.contactPerson || null,
      payment_terms: supplier.paymentTerms,
      rating: supplier.rating,
      is_active: supplier.isActive,
      notes: null,
    };

    const { data, error } = await supabase()
      .from('suppliers')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`فشل إضافة المورد: ${error.message}`);
    return mapSupplier(data as SupplierRow);
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const dbUpdates: any = {};
    if (updates.code) dbUpdates.code = updates.code;
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.productType !== undefined) dbUpdates.product_type = updates.productType;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
    if (updates.paymentTerms !== undefined) dbUpdates.payment_terms = updates.paymentTerms;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase()
      .from('suppliers')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`فشل تحديث المورد: ${error.message}`);
    return mapSupplier(data as SupplierRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase().from('suppliers').delete().eq('id', id);
    if (error) throw new Error(`فشل حذف المورد: ${error.message}`);
  },
};
