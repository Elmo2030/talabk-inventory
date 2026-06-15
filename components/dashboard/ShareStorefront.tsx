'use client';

/**
 * Storefront share card — gives the merchant a one-tap way to copy or
 * share their public catalog URL (/s/<slug>). The PM/UX audit pegged
 * this as the missing viral loop: every share is a Talabk-branded
 * landing page that signs up the next merchant.
 *
 * Mounted on the tenant dashboard. Hidden on tenants that haven't
 * added any items yet — no point sharing an empty catalog.
 */

import { useState } from 'react';
import { ExternalLink, Copy, Check, MessageCircle, Share2 } from 'lucide-react';

interface Props {
  tenantSlug: string;
  storeName: string;
  itemCount: number;
}

export default function ShareStorefront({ tenantSlug, storeName, itemCount }: Props) {
  const [copied, setCopied] = useState(false);

  if (itemCount === 0) return null;

  // Build the public URL. Falls back to a relative path during SSR (no
  // window) — the browser fills in the origin on hydration.
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/s/${tenantSlug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browsers — fall back to a hidden input + execCommand
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        /* ignore */
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `تصفح منتجات ${storeName}: ${url}`
  )}`;

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: storeName,
          text: `تصفح منتجات ${storeName}`,
          url,
        });
      } catch {
        /* user dismissed */
      }
    }
  };

  return (
    <div className="bg-gradient-to-l from-[#E5302A]/5 to-transparent dark:from-[#E5302A]/10 border border-[#E5302A]/20 dark:border-[#E5302A]/30 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[#E5302A]" />
            رابط متجرك العام
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mt-1">
            شارك الرابط في واتساب وانستجرام — يستعرض الزبائن منتجاتك ويطلبون مباشرة
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white dark:bg-[#0F0F11] border border-slate-200 dark:border-[#27272A] rounded-xl px-3 py-2 mb-3">
        <code
          className="flex-1 text-xs sm:text-sm font-mono text-slate-700 dark:text-[#E4E4E7] truncate"
          dir="ltr"
          aria-label="رابط المتجر العام"
        >
          {url || `/s/${tenantSlug}`}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg text-[#E5302A] hover:bg-[#E5302A]/10 transition-colors"
          aria-label="نسخ الرابط"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              نُسخ
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              نسخ
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={whatsappShare}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          مشاركة عبر واتساب
        </a>
        <a
          href={`/s/${tenantSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A] text-slate-700 dark:text-[#E4E4E7] text-xs font-semibold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          معاينة
        </a>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={nativeShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A] text-slate-700 dark:text-[#E4E4E7] text-xs font-semibold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            مشاركة
          </button>
        )}
      </div>
    </div>
  );
}
