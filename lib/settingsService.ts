'use client';

import {
  employees as defaultEmployees,
  recipientDepartments as defaultDepartments,
  issueReasons as defaultIssueReasons,
  itemCategories as defaultCategories,
  storageLocations as defaultLocations,
  measurementUnits as defaultUnits,
} from '@/data/mock-data';

// ============================================
// Settings Service
// يدير القوائم الديناميكية المحفوظة في localStorage
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

const defaults: SystemSettings = {
  employees: defaultEmployees,
  departments: defaultDepartments,
  issueReasons: defaultIssueReasons,
  categories: defaultCategories,
  storageLocations: defaultLocations,
  measurementUnits: defaultUnits,
};

export const settingsService = {
  getAll(): SystemSettings {
    if (typeof window === 'undefined') return defaults;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ...defaults };
      return { ...defaults, ...JSON.parse(stored) };
    } catch {
      return { ...defaults };
    }
  },

  getList(key: SettingKey): string[] {
    return this.getAll()[key];
  },

  saveList(key: SettingKey, list: string[]): void {
    if (typeof window === 'undefined') return;
    const current = this.getAll();
    current[key] = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  resetToDefaults(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  },

  exportSettings(): string {
    return JSON.stringify(this.getAll(), null, 2);
  },

  importSettings(json: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(json) as Partial<SystemSettings>;
      const current = this.getAll();
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return { success: true };
    } catch {
      return { success: false, error: 'ملف JSON غير صالح' };
    }
  },
};
