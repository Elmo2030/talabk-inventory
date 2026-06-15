/**
 * Public Storefront — /s/[slug]
 *
 * Read-only catalog for a tenant, shareable on WhatsApp/Instagram.
 * Why this exists: the PM/UX audit flagged "no public storefront" as the
 * biggest competitive gap vs Salla/Bnyaty. This route lets a merchant
 * paste `talabk.app/s/<their-slug>` into a WhatsApp status, customers
 * tap → see items + prices → tap "اطلب عبر واتساب" → a pre-filled
 * WhatsApp message goes to the merchant's number.
 *
 * No auth required. No cart, no checkout, no payments. The order
 * happens out-of-band on WhatsApp; the storefront just creates the
 * lead.
 *
 * Rendered server-side via Supabase anon key + RLS that exposes only
 * `tenants` (status=active) + their `items` (status=ACTIVE).
 */

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Package, Phone, MessageCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { formatMoney } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── Server data fetch ───────────────────────────────────────────────────────
async function loadStorefront(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  // Anon client + column-restricted views. The views
  // `vw_public_storefront_tenants` and `vw_public_storefront_items`
  // (see supabase/migrations/20260526_storefront_view.sql) project only
  // the safe columns — sensitive tenant data (owner_email, monthly_fee,
  // subscription_ends_at, …) is impossible to reach via this code path.
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });

  type TenantRow = {
    id: string;
    slug: string;
    store_name: string;
    owner_phone: string | null;
    logo_url: string | null;
  };
  // Views aren't in the generated `Database` types yet; cast through any
  // for the .from() call only (the row type stays narrow via TenantRow).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenantRaw } = await (supabase.from('vw_public_storefront_tenants' as any) as any)
    .select('id, slug, store_name, owner_phone, logo_url')
    .eq('slug', slug)
    .maybeSingle();

  const tenant = tenantRaw as TenantRow | null;
  if (!tenant) return null;

  type StoreItem = {
    id: string;
    code: string;
    name: string;
    category: string;
    selling_price: number;
    unit: string;
    location: string | null;
    image_url: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemsRaw } = await (supabase.from('vw_public_storefront_items' as any) as any)
    .select('id, code, name, category, selling_price, unit, location, image_url')
    .eq('tenant_id', tenant.id)
    .order('name', { ascending: true })
    .limit(200);

  const items = ((itemsRaw ?? []) as unknown) as StoreItem[];

  return { tenant, items };
}

// ── WhatsApp deep-link builder ──────────────────────────────────────────────
// Normalizes a Libyan number ("0912345678" / "+218912345678" / "00218912345678")
// into the international form WhatsApp expects ("218912345678").
function whatsappHref(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('00218')) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('+218')) cleaned = cleaned.slice(1);
  else if (cleaned.startsWith('0')) cleaned = `218${cleaned.slice(1)}`;
  if (!/^218\d{9}$/.test(cleaned)) return null;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

// ── Page ────────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadStorefront(slug);
  if (!data) return { title: 'متجر غير موجود' };
  return {
    title: `${data.tenant.store_name} — متجر طلبك`,
    description: `تصفح منتجات ${data.tenant.store_name} واطلب مباشرة عبر واتساب.`,
  };
}

export default async function PublicStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadStorefront(slug);
  if (!data) notFound();

  const { tenant, items } = data;
  const generalWhatsapp = whatsappHref(
    tenant.owner_phone,
    `أرغب بالاستفسار عن منتجات ${tenant.store_name}`
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#09090B]" dir="rtl">
      {/* Hero */}
      <header className="bg-white dark:bg-[#18181B] border-b border-[#E5E5EA] dark:border-[#27272A]">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#E5302A]/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-[#E5302A]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#F4F4F5] truncate">
                {tenant.store_name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
                {items.length} منتج متاح
              </p>
            </div>
          </div>
          {generalWhatsapp && (
            <a
              href={generalWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-semibold transition-colors flex-shrink-0"
              aria-label="تواصل عبر واتساب"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">واتساب</span>
            </a>
          )}
        </div>
      </header>

      {/* Catalog */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-[#52525B] mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-[#A1A1AA]">
              لا توجد منتجات متاحة حالياً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {items.map((it) => {
              const itemMessage = `أرغب بطلب: ${it.name} (${it.code}) — السعر: ${formatMoney(it.selling_price)}`;
              const orderHref = whatsappHref(tenant.owner_phone, itemMessage);
              return (
                <article
                  key={it.id}
                  className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E5EA] dark:border-[#27272A] p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F4F4F5] line-clamp-2">
                        {it.name}
                      </h2>
                      <p className="text-[11px] text-slate-400 dark:text-[#71717A] mt-0.5 font-mono">
                        {it.code}
                      </p>
                      {it.category && (
                        <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-1">
                          {it.category}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-base font-bold text-[#E5302A]">
                      {formatMoney(it.selling_price)}
                    </span>
                    {orderHref ? (
                      <a
                        href={orderHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        اطلب
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        اتصل بالمتجر
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer — Talabk attribution (the viral loop) */}
      <footer className="max-w-4xl mx-auto px-4 py-8 mt-4 border-t border-[#E5E5EA] dark:border-[#27272A]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#A1A1AA]">
          {tenant.owner_phone ? (
            <a
              href={`tel:${tenant.owner_phone}`}
              className="inline-flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-[#F4F4F5] transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {tenant.owner_phone}
            </a>
          ) : <span />}
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-[#E5302A] transition-colors"
          >
            <span>مدعوم بواسطة</span>
            <span className="font-bold text-[#E5302A]">طلبك</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

// silence the unused import lint warning until tenant images land
void Image;
