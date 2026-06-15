/**
 * Brand constants — single source of truth for marketing copy that
 * differs per environment (the public WhatsApp number, the demo URL,
 * the founder's name on the landing trust pack, etc.).
 *
 * Pulled from env vars so the owner can override per-deployment without
 * editing source files. All values fall back to documented placeholders
 * that are intentionally obvious (a Libyan SIM range that doesn't dial
 * anywhere) so an unset env is loud in QA but doesn't break SSR.
 */

// All NEXT_PUBLIC_ vars are inlined at build time. Defaults keep dev
// builds working without a populated .env.local.
const PLACEHOLDER_PHONE = '218910000000';

export const BRAND = {
  /** Public WhatsApp number (international format, no +). */
  publicWhatsApp:
    process.env.NEXT_PUBLIC_PUBLIC_WHATSAPP?.replace(/[^\d]/g, '') ||
    PLACEHOLDER_PHONE,
  /** Display form for landing-page contact lines. */
  publicWhatsAppDisplay:
    process.env.NEXT_PUBLIC_PUBLIC_WHATSAPP_DISPLAY ||
    'wa.me/218910000000',
  /** Public-facing demo URL — replaces the bare Vercel preview link. */
  demoUrl:
    process.env.NEXT_PUBLIC_DEMO_URL ||
    'https://inventory-app-nine-lilac.vercel.app/app/demo/dashboard',
  /** Founder name on trust pack — empty until populated. */
  founderName: process.env.NEXT_PUBLIC_FOUNDER_NAME || '',
  /** Optional founder photo path (served from /public/). */
  founderPhotoSrc: process.env.NEXT_PUBLIC_FOUNDER_PHOTO || '',
} as const;

/** True if the current build is using the placeholder phone number. */
export function isPlaceholderPhone(): boolean {
  return BRAND.publicWhatsApp === PLACEHOLDER_PHONE;
}

/** Build a wa.me URL with an optional pre-filled message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${BRAND.publicWhatsApp}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
