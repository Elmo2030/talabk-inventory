'use client';

/**
 * /insights/upload — Smart insights from uploaded CSV/XLSX (Wave H3)
 *
 * Three-stage UX:
 *   1. Drop / pick a file → parser detects columns + roles.
 *   2. User reviews the auto-detected role map and can override.
 *   3. Same `InsightsDashboard` from the live flow renders the bundle.
 *
 * The whole pipeline runs client-side (xlsx + zero network) so the
 * merchant's data never leaves the browser.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { UploadCloud, FileText, AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { parseFile, type ParseResult } from '@/lib/insights/fileParser';
import { detectRoles, ROLE_LABELS_AR, type Role, type RoleMap } from '@/lib/insights/roleDetection';
import { buildInsightsFromRows } from '@/lib/insights/genericInsights';
import { InsightsDashboard } from '@/components/insights/InsightsCards';

type Stage = 'pick' | 'map' | 'view';

const ROLE_ORDER: Role[] = [
  'revenue', 'profit', 'quantity', 'cost',
  'date', 'customer', 'product', 'category', 'region', 'store', 'rep',
];

export default function InsightsUploadPage() {
  const [stage, setStage] = useState<Stage>('pick');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [roles, setRoles] = useState<RoleMap>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const bundle = useMemo(() => {
    if (stage !== 'view' || !parsed) return null;
    return buildInsightsFromRows(parsed.rows, parsed.columns, roles);
  }, [stage, parsed, roles]);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const result = await parseFile(file);
      setParsed(result);
      setRoles(detectRoles(result.columns));
      setStage('map');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر قراءة الملف.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setParsed(null);
    setRoles({});
    setError('');
    setStage('pick');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-brand-600" />
            رفع بيانات للتحليل
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            CSV / XLSX من خارج النظام — البيانات تُعالج محلياً في متصفحك ولا تُرفع لأي خادم.
          </p>
        </div>
        <Link
          href="/insights"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-[#E4E4E7] hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة لذكاء البيانات
        </Link>
      </div>

      {/* Stage 1 — file picker */}
      {stage === 'pick' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void handleFile(f);
          }}
          className="bg-white dark:bg-[#18181B] border-2 border-dashed border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-12 text-center"
        >
          <UploadCloud className="w-12 h-12 text-slate-300 dark:text-[#52525B] mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-900 dark:text-[#F4F4F5] mb-1">اسحب الملف هنا أو اختر من جهازك</p>
          <p className="text-sm text-slate-500 dark:text-[#A1A1AA] mb-5">يدعم: .xlsx / .xls / .csv / .tsv</p>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold transition-colors cursor-pointer">
            <FileText className="w-4 h-4" />
            اختر ملفاً
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              disabled={busy}
            />
          </label>
          {busy && <p className="text-xs text-slate-500 mt-4">جارٍ القراءة…</p>}
          {error && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Stage 2 — role mapping */}
      {stage === 'map' && parsed && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F4F5]">تحقّق من الأعمدة</h3>
              <span className="text-xs text-slate-500">{parsed.rows.length} سجل · {parsed.columns.length} عمود · ورقة "{parsed.sheetName}"</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mb-4">
              اخترنا الأعمدة تلقائياً من العناوين. عدّل لو لزم — كلما كانت الأدوار أدقّ، كان التحليل أعمق.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_ORDER.map((role) => (
                <div key={role}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-1">
                    {ROLE_LABELS_AR[role]}
                  </label>
                  <select
                    value={roles[role] ?? ''}
                    onChange={(e) => setRoles((prev) => ({ ...prev, [role]: e.target.value || undefined }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#27272A] text-sm bg-white dark:bg-[#18181B] text-slate-900 dark:text-[#F4F4F5] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">— غير محدّد —</option>
                    {parsed.columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.type === 'number' ? 'رقمي' : c.type === 'date' ? 'تاريخ' : 'نص'})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-[#E4E4E7] bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              ملف آخر
            </button>
            <button
              onClick={() => setStage('view')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#E5302A] hover:bg-[#C42B24] text-white text-sm font-semibold transition-colors"
            >
              عرض التحليلات
            </button>
          </div>
        </div>
      )}

      {/* Stage 3 — insights dashboard */}
      {stage === 'view' && bundle && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#0F0F11] border border-slate-200 dark:border-[#27272A] rounded-xl px-4 py-2">
            <span className="text-xs text-slate-600 dark:text-[#A1A1AA]">
              تحليل {parsed?.rows.length ?? 0} سجل من ملف "{parsed?.sheetName}"
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStage('map')}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                تعديل الأدوار
              </button>
              <button
                onClick={reset}
                className="text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:underline"
              >
                ملف آخر
              </button>
            </div>
          </div>
          <InsightsDashboard bundle={bundle} />
        </div>
      )}
    </div>
  );
}
