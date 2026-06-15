/**
 * Role detection — maps generic column headers to known business roles.
 *
 * Lifted (and TS-ified) from the faras-dashboard DataEngine.js
 * ROLE_PATTERNS + ROLE_SYNONYMS. The two regex layers exist because:
 *
 *   • ROLE_PATTERNS matches the START of a header (anchored regex).
 *     Cheap, catches the common "Revenue", "Customer Name", "تاريخ" etc.
 *   • ROLE_SYNONYMS does a word-boundary scan ANYWHERE in the header.
 *     Catches "Net Sales", "صافي المبيعات", "Total Revenue" where the
 *     prefix doesn't match the canonical role name.
 *
 * Talabk's known-schema flows go through the typed adapter and never
 * touch this file. It's only invoked by the upload pipeline when the
 * user drops an external CSV/XLSX and we have to guess at column intent.
 */

import type { Column } from './dataEngine';

export type Role =
  | 'revenue' | 'quantity' | 'profit' | 'cost'
  | 'store' | 'rep' | 'customer' | 'product' | 'category' | 'region'
  | 'date';

export const ROLE_PATTERNS: Record<Role, RegExp> = {
  revenue:  /^(revenue|sales?|amount|total|price|value|turnover|income|invoice|مبيعات|إيرادات|ايرادات|إيراد|ايراد|قيمة|مبلغ|سعر|إجمالي|اجمالي|دخل|عائد|فواتير)/i,
  quantity: /^(qty|quantity|count|units?|volume|pcs|pieces|كمية|عدد|وحدات|قطع)/i,
  profit:   /^(profit|margin|net|earnings?|gain|ربح|أرباح|ارباح|صافي|هامش|مكسب)/i,
  cost:     /^(cost|expense|cogs|purchase|تكلفة|تكاليف|مصروف|مصاريف|مشتريات)/i,
  store:    /^(store|branch|outlet|shop|pharmacy|متجر|فرع|منفذ|محل|صيدلية)/i,
  rep:      /^(rep|representative|salesman?|agent|sales_rep|مندوب|وكيل|بائع|موظف)/i,
  customer: /^(customer|client|buyer|account|عميل|زبون|حساب)/i,
  product:  /^(product|item|sku|good|منتج|صنف|بضاعة|سلعة)/i,
  category: /^(category|type|class|group|نوع|فئة|تصنيف|مجموعة)/i,
  region:   /^(region|city|area|country|zone|district|منطقة|مدينة|دولة|حي|قطاع)/i,
  date:     /^(date|time|period|day|month|year|تاريخ|وقت|فترة|يوم|شهر|سنة)/i,
};

export const ROLE_SYNONYMS: Partial<Record<Role, RegExp>> = {
  revenue:  /(^|[\s_./-])(revenue|sales|turnover|income|مبيعات|إيرادات|ايرادات|الإيرادات|الايرادات|المبيعات)($|[\s_./-])/i,
  quantity: /(^|[\s_./-])(qty|quantity|units?|الكمية|كمية|الوحدات)($|[\s_./-])/i,
  profit:   /(^|[\s_./-])(profit|margin|الربح|ربح|الهامش|هامش)($|[\s_./-])/i,
  cost:     /(^|[\s_./-])(cost|cogs|التكلفة|تكلفة|التكاليف)($|[\s_./-])/i,
  customer: /(^|[\s_./-])(customer|client|العميل|عميل|العملاء)($|[\s_./-])/i,
  product:  /(^|[\s_./-])(product|item|sku|المنتج|منتج|الصنف|صنف)($|[\s_./-])/i,
  region:   /(^|[\s_./-])(region|city|المنطقة|منطقة|المدينة|مدينة)($|[\s_./-])/i,
  date:     /(^|[\s_./-])(date|التاريخ|تاريخ|الفترة|فترة)($|[\s_./-])/i,
};

export const ROLE_LABELS_AR: Record<Role, string> = {
  revenue:  'الإيرادات / المبيعات',
  quantity: 'الكمية',
  profit:   'الربح',
  cost:     'التكلفة',
  store:    'المتجر / الفرع',
  rep:      'المندوب',
  customer: 'العميل',
  product:  'المنتج / الصنف',
  category: 'التصنيف',
  region:   'المنطقة',
  date:     'التاريخ',
};

const NUMERIC_ROLES = new Set<Role>(['revenue', 'profit', 'quantity', 'cost']);

/** Roles map: role → column name. Only assigned roles appear. */
export type RoleMap = Partial<Record<Role, string>>;

/**
 * Auto-detect roles from column headers.
 *
 * Two-pass algorithm matching the faras-dashboard behavior:
 *   1. Anchored prefix match (ROLE_PATTERNS) — tolerates the Arabic
 *      definite article «ال» being stripped from the start.
 *   2. Free-text synonym match (ROLE_SYNONYMS) when the role hasn't
 *      been claimed yet, and the column type matches the role's
 *      expected kind (numeric for revenue/profit/quantity/cost,
 *      otherwise text/category).
 *
 * Fallbacks (so charts/KPIs always have *something* to grab):
 *   • revenue → first numeric column with usable fill rate.
 *   • date    → first date column.
 *   • category → first text/category column when no entity role is
 *                already claimed.
 */
export function detectRoles(columns: Column[]): RoleMap {
  const roles: RoleMap = {};

  // Pass 1: anchored prefix patterns.
  for (const col of columns) {
    const name = col.name.trim();
    const noAl = name.replace(/^ال/, '');
    for (const [role, re] of Object.entries(ROLE_PATTERNS) as Array<[Role, RegExp]>) {
      if (roles[role]) continue;
      if (re.test(name) || re.test(noAl)) {
        roles[role] = col.name;
        break;
      }
    }
  }

  // Pass 2: free-text synonym scan.
  for (const col of columns) {
    if (Object.values(roles).includes(col.name)) continue;
    for (const [role, re] of Object.entries(ROLE_SYNONYMS) as Array<[Role, RegExp]>) {
      if (roles[role]) continue;
      if (!re.test(col.name)) continue;
      const wantsNumeric = NUMERIC_ROLES.has(role);
      if (wantsNumeric ? col.type === 'number' : col.type !== 'number') {
        roles[role] = col.name;
        break;
      }
    }
  }

  // Fallbacks.
  if (!roles.revenue) {
    const n = columns.find((c) => c.type === 'number' && !c.excludeFromKPI) ?? columns.find((c) => c.type === 'number');
    if (n) roles.revenue = n.name;
  }
  if (!roles.date) {
    const d = columns.find((c) => c.type === 'date');
    if (d) roles.date = d.name;
  }
  const entityRoles: Role[] = ['store', 'rep', 'customer', 'product', 'category', 'region'];
  if (!entityRoles.some((r) => roles[r])) {
    const cat = columns.find((c) => (c.type === 'category' || c.type === 'text') && !c.isId);
    if (cat) roles.category = cat.name;
  }

  return roles;
}
