import { getSupabaseClient } from '@/lib/supabase/client';
import type { StoreSettings } from '@/lib/types';

export const storeSettingsService = {
  async get(): Promise<StoreSettings> {
    const { data } = await getSupabaseClient()
      .from('store_settings')
      .select('*')
      .single();
    if (!data) return { vatEnabled: false, vatRate: 15 };
    return {
      vatEnabled: data.vat_enabled,
      vatRate: Number(data.vat_rate),
      vatNumber: data.vat_number ?? undefined,
      storeName: data.store_name ?? undefined,
    };
  },

  async save(settings: Partial<StoreSettings>): Promise<void> {
    const payload = {
      vat_enabled: settings.vatEnabled,
      vat_rate: settings.vatRate,
      vat_number: settings.vatNumber ?? null,
      store_name: settings.storeName ?? null,
      updated_at: new Date().toISOString(),
    };
    await getSupabaseClient()
      .from('store_settings')
      .upsert(payload, { onConflict: 'tenant_id' });
  },
};
