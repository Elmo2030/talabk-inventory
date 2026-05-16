'use client';

/**
 * Super-Admin Audit Log — /superadmin/audit
 * Browsable, filterable history of every administrative action.
 */

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  History, Filter, ChevronRight, ChevronLeft, RefreshCw,
} from 'lucide-react';

interface AuditEntry {
  id:          string;
  actor_id:    string | null;
  actor_role:  string | null;
  action:      string;
  target_type: string | null;
  target_id:   string | null;
  payload:     Record<string, unknown> | null;
  created_at:  string;
}

const ACTION_LABELS: Record<string, string> = {
  'payment.approve':    'اعتماد دفعة اشتراك',
  'payment.reject':     'رفض دفعة اشتراك',
  'tenant.approve':     'الموافقة على متجر',
  'tenant.suspend':     'إيقاف متجر',
  'tenant.reactivate':  'إعادة تفعيل متجر',
  'cron.sweep_expired': 'تشغيل تلقائي: إيقاف اشتراكات منتهية',
  'sweep.expired':      'إيقاف الاشتراكات المنتهية',
};

const ACTION_BADGE: Record<string, string> = {
  'payment.approve':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'payment.reject':     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'tenant.approve':     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'tenant.suspend':     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'cron.sweep_expired': 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
  'sweep.expired':      'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
};

const PAGE_SIZE = 50;

export default function SuperAdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const [total,   setTotal]   = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [targetFilter, setTargetFilter] = useState<string>('');

  const fromIdx = page * PAGE_SIZE;
  const toIdx   = fromIdx + PAGE_SIZE - 1;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = getSupabaseClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = (supabase as any)
        .from('audit_log')
        .select('id, actor_id, actor_role, action, target_type, target_id, payload, created_at',
                { count: 'exact' });

      if (actionFilter) q = q.eq('action', actionFilter);
      if (targetFilter) q = q.eq('target_type', targetFilter);

      const { data, count } = await q
        .order('created_at', { ascending: false })
        .range(fromIdx, toIdx);

      if (!cancelled) {
        setEntries((data ?? []) as AuditEntry[]);
        setTotal(count ?? 0);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, actionFilter, targetFilter, fromIdx, toIdx]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Unique action / target values for filter dropdowns
  const actionOptions = useMemo(
    () => Array.from(new Set([...Object.keys(ACTION_LABELS), ...entries.map(e => e.action)])).sort(),
    [entries],
  );
  const targetOptions = useMemo(
    () => Array.from(new Set(entries.map(e => e.target_type).filter(Boolean) as string[])).sort(),
    [entries],
  );

  return (
    <div dir="rtl" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-purple-500" /> سجل الأحداث
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            تاريخ كامل لقرارات السوبر أدمن والمهام التلقائية ({total.toLocaleString('ar-LY')} حدث)
          </p>
        </div>
        <button
          onClick={() => { setPage(0); setActionFilter(''); setTargetFilter(''); }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2C2C2E] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/40 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          إعادة تعيين
        </button>
      </header>

      {/* Filters */}
      <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] p-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Filter className="w-3.5 h-3.5" /> الفلاتر
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">نوع الإجراء</label>
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#3a3a3c] bg-white dark:bg-[#2C2C2E] text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="">كل الإجراءات</option>
              {actionOptions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">نوع الهدف</label>
            <select
              value={targetFilter}
              onChange={e => { setTargetFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#3a3a3c] bg-white dark:bg-[#2C2C2E] text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="">كل الأنواع</option>
              {targetOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Entries */}
      <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">جاري التحميل...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">لا توجد أحداث مطابقة للفلاتر</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#2C2C2E]/50">
            {entries.map(e => (
              <AuditRow key={e.id} entry={e} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-[#2C2C2E]/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              صفحة {page + 1} من {totalPages.toLocaleString('ar-LY')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2C2C2E] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" /> السابق
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2C2C2E] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                التالي <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasPayload = entry.payload && Object.keys(entry.payload).length > 0;

  return (
    <div className="p-4 hover:bg-slate-50/50 dark:hover:bg-[#2C2C2E]/20 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
              ACTION_BADGE[entry.action] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400'
            }`}>
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
            <span className="text-xs text-slate-500">
              بواسطة <span className="font-medium">{entry.actor_role ?? 'system'}</span>
            </span>
            {entry.target_type && (
              <span className="text-xs text-slate-500">
                · {entry.target_type}
              </span>
            )}
          </div>
          {entry.target_id && (
            <p className="text-xs font-mono text-slate-400 mt-0.5">ID: {entry.target_id.slice(0, 8)}…</p>
          )}
          {hasPayload && (
            <button
              onClick={() => setExpanded(x => !x)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </button>
          )}
          {expanded && hasPayload && (
            <pre className="text-[11px] font-mono bg-slate-50 dark:bg-[#0F0F11] p-3 rounded-lg mt-2 overflow-x-auto text-slate-700 dark:text-slate-300">
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
          )}
        </div>
        <time className="text-xs text-slate-500 dark:text-slate-500 flex-shrink-0">
          {new Date(entry.created_at).toLocaleString('ar-LY', {
            year:   'numeric', month: 'short', day: 'numeric',
            hour:   '2-digit', minute: '2-digit',
          })}
        </time>
      </div>
    </div>
  );
}
