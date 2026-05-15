'use client';

import {
  employees as defaultEmployees,
  recipientDepartments as defaultDepartments,
  issueReasons as defaultIssueReasons,
  itemCategories as defaultCategories,
  storageLocations as defaultLocations,
  measurementUnits as defaultUnits,
} from '@/data/mock-data';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Settings Service
// يدير القوائم الديناميكية
// Primary storage: Supabase (tenant_settings table)
// Local cache: localStorage (instant reads + offline fallback)
// ============================================

export type SettingKey =
  | 'employees'
  | 'departments'
  | 'issueReasons'
  | 'categories'
  | 'storageLocations'
  | 'measurementUnits';

export interface SystemSettings {
  employees: string[];
  departments: string[];
  issueReasons: string[];
  categories: string[];
  storageLocations: string[];
  measurementUnits: string[];
}

const STORAGE_KEY = 'inventory_system_settings';

export const defaults: SystemSettings = {
  employees: defaultEmployees,
  departments: defaultDepartments,
  issueReasons: defaultIssueReasons,
  categories: defaultCategories,
  storageLocations: defaultLocations,
  measurementUnits: defaultUnits,
};

// ── Local cache helpers ────────────────────────────────────────────────────────

function readCache(): SystemSettings {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaults };
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return { ...defaults };
  }
}

function writeCache(settings: SystemSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota errors
  }
}

// ── Supabase helpers ───────────────────────────────────────────────────────────

async function fetchFromSupabase(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<SystemSettings | null> {
  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('settings')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) return null;
    const raw = data.settings as Partial<SystemSettings>;
    return { ...defaults, ...raw };
  } catch {
    return null;
  }
}

async function upsertToSupabase(
  supabase: SupabaseClient,
  tenantId: string,
  settings: SystemSettings,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tenant_settings')
      .upsert(
        { tenant_id: tenantId, settings, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' },
      );
    return !error;
  } catch {
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const settingsService = {
  /**
   * Synchronous read from localStorage cache.
   * Always fast; may be stale until `load()` completes.
   */
  getAll(): SystemSettings {
    return readCache();
  },

  /** Synchronous read of a single list from cache. */
  getList(key: SettingKey): string[] {
    return this.getAll()[key];
  },

  /**
   * Load settings from Supabase (authoritative source).
   * Updates the local cache and returns the merged result.
   * Falls back to localStorage if Supabase is unavailable.
   */
  async load(supabase: SupabaseClient, tenantId: string): Promise<SystemSettings> {
    const remote = await fetchFromSupabase(supabase, tenantId);
    if (remote) {
      writeCache(remote);
      return remote;
    }
    // Fallback: return local cache
    return readCache();
  },

  /**
   * Save a single list key — writes to Supabase + local cache.
   * Returns true if Supabase write succeeded.
   */
  async saveList(
    supabase: SupabaseClient,
    tenantId: string,
    key: SettingKey,
    list: string[],
  ): Promise<boolean> {
    const current = readCache();
    const updated: SystemSettings = { ...current, [key]: list };
    // Write to cache immediately for instant UI feedback
    writeCache(updated);
    // Persist to Supabase
    return upsertToSupabase(supabase, tenantId, updated);
  },

  /**
   * Reset to defaults — clears Supabase row + local cache.
   */
  async resetToDefaults(supabase: SupabaseClient, tenantId: string): Promise<void> {
    writeCache({ ...defaults });
    await supabase
      .from('tenant_settings')
      .delete()
      .eq('tenant_id', tenantId);
  },

  /** Export current settings as a JSON string (reads from cache). */
  exportSettings(): string {
    return JSON.stringify(readCache(), null, 2);
  },

  /**
   * Import settings from a JSON string — validates, merges, and persists.
   */
  async importSettings(
    supabase: SupabaseClient,
    tenantId: string,
    json: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const parsed = JSON.parse(json) as Partial<SystemSettings>;
      const current = readCache();
      const merged: SystemSettings = { ...current };

      const keys: SettingKey[] = [
        'employees', 'departments', 'issueReasons',
        'categories', 'storageLocations', 'measurementUnits',
      ];

      for (const key of keys) {
        if (Array.isArray(parsed[key])) {
          merged[key] = parsed[key] as string[];
        }
      }

      writeCache(merged);
      await upsertToSupabase(supabase, tenantId, merged);
      return { success: true };
    } catch {
      return { success: false, error: 'ملف JSON غير صالح' };
    }
  },
};
