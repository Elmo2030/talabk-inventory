'use client';

/**
 * Customer A/R Aging Report — Wave G #2
 *
 * Buckets each customer's outstanding by the age of the oldest unpaid
 * order. Standard buckets: current (0–30d), 30–60d, 60–90d, 90+d.
 *
 * Source of truth:
 *   • customer balance from `vw_customer_balance` (snapshot)
 *   • per-bucket aging derived from the sales_orders array client-side
 *
 * For the order volumes Talabk targets this is a single O(N) pass; no
 * server-side aggregation needed.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, UserCircle } from 'lucide-react';
import { useCustomers, useOrders } from '@/lib/StockContext';
import { formatMoney } from '@/lib/format';

interface AgingRow {
  customerId: string;
  code: string;
  name: string;
  creditLimit: number;
  current:  number;
  bucket30: number;
  bucket60: number;
  bucket90: number;
  outstanding: number;
  oldestDays?: number;
}

export default function CustomerAgingReport() {
  const { customers, customerBalances } = useCustomers();
  const { salesOrders } = useOrders();

  const rows = useMemo<AgingRow[]>(() => {
    const balanceById = new Map<string, typeof customerBalances[number]>();
    for (const b of customerBalances) balanceById.set(b.customerId, b);

    const now = Date.now();
    const ageOfOrder = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 86400_000);

    // Pre-group orders by customer for O(N + M) instead of O(N×M).
    const ordersByCust: Record<string, typeof salesOrders> = {};
    for (const o of salesOrders) {
      if (!o.customerId) continue;
      if (o.status === 'CANCELLED') continue;
      const list = ordersByCust[o.customerId] ?? [];
      list.push(o);
      ordersByCust[o.customerId] = list;
    }

    const out: AgingRow[] = [];
    for (const c of customers) {
      const bal = balanceById.get(c.id);
      const outstanding = bal?.outstanding ?? c.openingBalance;
      if (outstanding <= 0) continue;

      const orders = ordersByCust[c.id] ?? [];
      let current = 0, b30 = 0, b60 = 0, b90 = 0;
      let oldestDays: number | undefined;
      // Aging is per-invoice, not bulk. We approximate by allocating the
      // customer's outstanding across their unpaid orders in FIFO order,
      // bucketing each order's unpaid portion by its age.
      const unpaidOrders = orders
        .filter((o) => (o.customerTotal ?? 0) > (o.customerPaidAmount ?? 0))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      // First slot the opening_balance into 90+ (we don't know when it was
      // created — treat as ancient by convention).
      if (c.openingBalance > 0) b90 += c.openingBalance;

      for (const o of unpaidOrders) {
        const unpaid = (o.customerTotal ?? 0) - (o.customerPaidAmount ?? 0);
        if (unpaid <= 0) continue;
        const age = ageOfOrder(o.createdAt);
        if (oldestDays === undefined || age > oldestDays) oldestDays = age;
        if (age < 30)      current += unpaid;
        else if (age < 60) b30     += unpaid;
        else if (age < 90) b60     += unpaid;
        else               b90     += unpaid;
      }

      out.push({
        customerId: c.id,
        code: c.code,
        name: c.name,
        creditLimit: c.creditLimit,
        current, bucket30: b30, bucket60: b60, bucket90: b90,
        outstanding,
        oldestDays,
      });
    }
    // Sort by oldest debt first — surfaces collection priorities.
    return out.sort((a, b) => (b.oldestDays ?? 0) - (a.oldestDays ?? 0));
  }, [customers, customerBalances, salesOrders]);

  const totals = useMemo(() => {
    return rows.reduce(
      (s, r) => ({
        current: s.current + r.current,
        b30:     s.b30 + r.bucket30,
        b60:     s.b60 + r.bucket60,
        b90:     s.b90 + r.bucket90,
        total:   s.total + r.outstanding,
      }),
      { current: 0, b30: 0, b60: 0, b90: 0, total: 0 }
    );
  }, [rows]);

  if (customers.length === 0) {
    return (
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-12 text-center">
        <UserCircle className="w-12 h-12 text-slate-300 dark:text-[#52525B] mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-900 dark:text-[#F4F4F5] mb-1">لا يوجد عملاء مسجّلون</p>
        <p className="text-sm text-slate-500 dark:text-[#A1A1AA] mb-4">أضف العملاء الدائمين ليبدأ تقرير الأعمار في رصد المستحقات.</p>
        <Link
          href="/customers/manage"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          إضافة عميل
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'الإجمالي',  value: totals.total,   color: 'text-slate-900 dark:text-[#F4F4F5]' },
          { label: '0–30 يوم',  value: totals.current, color: 'text-green-700 dark:text-green-400' },
          { label: '30–60 يوم', value: totals.b30,     color: 'text-amber-700 dark:text-amber-400' },
          { label: '60–90 يوم', value: totals.b60,     color: 'text-orange-700 dark:text-orange-400' },
          { label: '90+ يوم',   value: totals.b90,     color: 'text-red-700 dark:text-red-400' },
        ].map((b) => (
          <div key={b.label} className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-xl p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mb-1">{b.label}</p>
            <p className={`text-base sm:text-lg font-bold ${b.color}`}>{formatMoney(b.value)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-[#0F0F11] border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">العميل</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الحد الائتماني</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">0–30</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">30–60</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">60–90</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">90+</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">الإجمالي</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] uppercase">أقدم دين</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500 dark:text-[#A1A1AA] text-sm">
                    <AlertCircle className="w-5 h-5 inline-block ms-2" />
                    لا توجد مستحقات حالياً — كل العملاء مدفوعة حساباتهم
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const over = r.creditLimit > 0 && r.outstanding > r.creditLimit;
                  return (
                    <tr key={r.customerId} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900 dark:text-[#F4F4F5]">{r.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-[#52525B] mt-0.5">{r.code}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-700 dark:text-[#E4E4E7]">
                        {r.creditLimit > 0 ? formatMoney(r.creditLimit, { withSuffix: false }) : '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-green-700 dark:text-green-400">{formatMoney(r.current, { withSuffix: false, placeholder: '0' })}</td>
                      <td className="px-3 py-3 font-mono text-amber-700 dark:text-amber-400">{formatMoney(r.bucket30, { withSuffix: false, placeholder: '0' })}</td>
                      <td className="px-3 py-3 font-mono text-orange-700 dark:text-orange-400">{formatMoney(r.bucket60, { withSuffix: false, placeholder: '0' })}</td>
                      <td className="px-3 py-3 font-mono text-red-700 dark:text-red-400">{formatMoney(r.bucket90, { withSuffix: false, placeholder: '0' })}</td>
                      <td className={`px-3 py-3 font-mono font-bold ${over ? 'text-red-700' : 'text-slate-900 dark:text-[#F4F4F5]'}`}>
                        {formatMoney(r.outstanding, { withSuffix: false })}
                        {over && <span className="block text-[10px] text-red-600 mt-0.5">تجاوز الحد</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-[#A1A1AA]">
                        {r.oldestDays != null ? `${r.oldestDays} يوم` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
