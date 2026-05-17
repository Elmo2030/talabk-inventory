'use client';

/**
 * Network-status banner — listens to the browser's `online`/`offline`
 * events and shows a slim red bar across the app shell while offline.
 * Mutations that fail while offline still bubble through normal error
 * handlers; this banner is purely a heads-up so users understand WHY a
 * save just failed (vs. assuming the app is broken).
 */

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  // Start as `null` on the server so SSR/CSR match — we read the real value
  // in the useEffect below.
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Don't render anything while hydrating or when online — zero CLS impact.
  if (online !== false) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-red-600 text-white text-center text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2"
      dir="rtl"
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span>لا يوجد اتصال بالإنترنت — التغييرات قد لا تُحفظ حتى يعود الاتصال</span>
    </div>
  );
}
