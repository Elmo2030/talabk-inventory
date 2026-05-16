'use client';

import { useMemo } from 'react';
import { CalendarClock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useStock } from '@/lib/StockContext';

type BatchStatus = 'expired' | 'critical' | 'warning' | 'watch' | 'ok';

interface BatchRow {
  id: string;
  itemName: string;
  itemCode: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
  status: BatchStatus;
}

/**
 * Multi-tier classification (worst → best):
 *   expired   — already past expiry
 *   critical  — within 7 days
 *   warning   — within 30 days
 *   watch     — within 60 days
 *   ok        — more than 60 days remaining
 */
function classifyBatch(expiryDate: string): { status: BatchStatus; daysRemaining: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let status: BatchStatus;
  if (daysRemaining < 0) status = 'expired';
  else if (daysRemaining <= 7)  status = 'critical';
  else if (daysRemaining <= 30) status = 'warning';
  else if (daysRemaining <= 60) status = 'watch';
  else status = 'ok';
  return { status, daysRemaining };
}

const STATUS_CONFIG: Record<BatchStatus, { label: string; rowClass: string; badgeClass: string; icon: React.ElementType }> = {
  expired: {
    label: 'منتهية الصلاحية',
    rowClass: 'bg-red-50 border-red-100',
    badgeClass: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  critical: {
    label: 'تنتهي خلال 7 أيام (حرج)',
    rowClass: 'bg-red-50 border-red-100',
    badgeClass: 'bg-red-100 text-red-600',
    icon: AlertTriangle,
  },
  warning: {
    label: 'تنتهي خلال 30 يوم',
    rowClass: 'bg-amber-50 border-amber-100',
    badgeClass: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
  },
  watch: {
    label: 'تنتهي خلال 60 يوم',
    rowClass: 'bg-yellow-50 border-yellow-100',
    badgeClass: 'bg-yellow-100 text-yellow-700',
    icon: AlertTriangle,
  },
  ok: {
    label: 'سليمة',
    rowClass: 'bg-green-50 border-green-100',
    badgeClass: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
};

function DaysCell({ daysRemaining, status }: { daysRemaining: number; status: BatchStatus }) {
  if (status === 'expired') {
    return (
      <span className="text-red-600 font-semibold text-sm">
        منتهية منذ {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'يوم' : 'أيام'}
      </span>
    );
  }
  const colour =
    status === 'critical' ? 'text-red-700' :
    status === 'warning'  ? 'text-amber-700' :
    status === 'watch'    ? 'text-yellow-700' :
                            'text-green-700';
  return (
    <span className={`font-semibold text-sm ${colour}`}>
      {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'يوم'}
    </span>
  );
}

function SectionTable({ rows, status }: { rows: BatchRow[]; status: BatchStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Section header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${config.rowClass}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold">{config.label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.badgeClass}`}>{rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">اسم الصنف</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">رقم الدفعة</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الكمية</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">تاريخ الانتهاء</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الأيام المتبقية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
                <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                  {row.batchNumber || <span className="text-slate-400 italic">—</span>}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-slate-800">{row.quantity}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.expiryDate}</td>
                <td className="px-4 py-3">
                  <DaysCell daysRemaining={row.daysRemaining} status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BatchesPage() {
  const { stockIn, items } = useStock();

  const { expired, critical, warning, watch, ok } = useMemo(() => {
    const batches: BatchRow[] = stockIn
      .filter((m) => !!m.expiryDate)
      .map((m) => {
        const item = items.find((i) => i.id === m.itemId);
        const { status, daysRemaining } = classifyBatch(m.expiryDate!);
        return {
          id: m.id,
          itemName: m.itemName ?? item?.name ?? m.itemId,
          itemCode: item?.code ?? '',
          batchNumber: m.batchNumber ?? '',
          quantity: m.quantity,
          expiryDate: m.expiryDate!,
          daysRemaining,
          status,
        };
      });

    const byStatus = (s: BatchStatus) =>
      batches.filter((b) => b.status === s).sort((a, b) => a.daysRemaining - b.daysRemaining);
    return {
      expired:  byStatus('expired'),
      critical: byStatus('critical'),
      warning:  byStatus('warning'),
      watch:    byStatus('watch'),
      ok:       byStatus('ok'),
    };
  }, [stockIn, items]);

  const total = expired.length + critical.length + warning.length + watch.length + ok.length;

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-brand-600" />
            الدفعات والصلاحية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متابعة تواريخ انتهاء صلاحية الدفعات المستلمة
          </p>
        </div>
      </div>

      {/* Summary cards — 5 tiers */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-600 font-medium">منتهية</p>
          <p className="text-xl font-bold text-red-700 mt-1">{expired.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-600 font-medium">7 أيام</p>
          <p className="text-xl font-bold text-red-700 mt-1">{critical.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-600 font-medium">30 يوم</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{warning.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs text-yellow-700 font-medium">60 يوم</p>
          <p className="text-xl font-bold text-yellow-700 mt-1">{watch.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs text-green-600 font-medium">سليمة</p>
          <p className="text-xl font-bold text-green-700 mt-1">{ok.length}</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">لا توجد دفعات بتاريخ صلاحية</p>
          <p className="text-slate-400 text-xs mt-1">
            عند تسجيل وارد جديد، فعّل خيار &quot;هذه الدفعة لها تاريخ صلاحية&quot; لتظهر هنا
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {expired.length  > 0 && <SectionTable rows={expired}  status="expired"  />}
          {critical.length > 0 && <SectionTable rows={critical} status="critical" />}
          {warning.length  > 0 && <SectionTable rows={warning}  status="warning"  />}
          {watch.length    > 0 && <SectionTable rows={watch}    status="watch"    />}
          {ok.length       > 0 && <SectionTable rows={ok}       status="ok"       />}
        </div>
      )}
    </div>
  );
}
