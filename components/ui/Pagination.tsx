'use client';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, totalPages, total, pageSize, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page numbers with ellipsis
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all';
  const btnActive = 'bg-[#E5302A] text-white shadow-sm';
  const btnInactive = 'bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] text-[#1C1C1E] dark:text-[#F4F4F5] hover:bg-[#F2F2F7] dark:hover:bg-[#27272A]';
  const btnDisabled = 'opacity-40 cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[#E5E5EA] dark:border-[#27272A]">
      <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA]">
        عرض {from}–{to} من {total} سجل
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled + ' ' + btnInactive : btnInactive}`}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="w-8 text-center text-xs text-[#AEAEB2]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
              aria-label={`صفحة ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled + ' ' + btnInactive : btnInactive}`}
          aria-label="الصفحة التالية"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
