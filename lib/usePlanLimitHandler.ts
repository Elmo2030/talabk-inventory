'use client';

/**
 * Detect plan-limit-exceeded errors from Postgres and surface a friendly
 * Arabic message + a CTA pointing to /billing for upgrade.
 *
 * The DB triggers throw with messages like:
 *   "حد المستخدمين للباقة الحالية تم استنفاده (5/5)"
 * We sniff for the leading phrase "حد ... تم استنفاده" to catch all three
 * (users / items / orders) without coupling to exact wording.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const PLAN_LIMIT_HINTS = [
  'حد المستخدمين',
  'حد المنتجات',
  'حد الأصناف',
  'حد الطلبات',
  'تم استنفاده',
];

function isPlanLimitError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? String(err);
  return PLAN_LIMIT_HINTS.some(h => msg.includes(h));
}

export function usePlanLimitHandler() {
  const router  = useRouter();
  const toast   = useToast();
  const { confirm } = useConfirm();

  /**
   * Wrap any async operation; if it throws a plan-limit error,
   * show an upgrade prompt and return null. Otherwise re-throw.
   */
  const handle = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      return await operation();
    } catch (err) {
      if (isPlanLimitError(err)) {
        const msg = (err as { message?: string })?.message ?? '';
        const wantUpgrade = await confirm({
          title:        'وصلت لحدود باقتك الحالية',
          description:  `${msg}\n\nهل تريد ترقية باقتك الآن للحصول على حدود أعلى؟`,
          confirmLabel: 'ترقية الباقة',
          cancelLabel:  'إلغاء',
          variant:      'warning',
        });
        if (wantUpgrade) router.push('/billing');
        return null;
      }
      // Unrelated error — show a generic toast and rethrow so caller can log it
      const msg = (err as { message?: string })?.message ?? 'حدث خطأ غير متوقع';
      toast.error(msg);
      throw err;
    }
  }, [router, toast, confirm]);

  return { handle, isPlanLimitError };
}
