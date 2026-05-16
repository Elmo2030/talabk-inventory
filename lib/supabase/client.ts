'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// ============================================
// Browser Client — uses @supabase/ssr so the session is written to
// cookies (sb-*-auth-token) that the Edge middleware and Server
// Components can read.
//
// We cast the return type to `SupabaseClient<Database>` (the type
// produced by @supabase/supabase-js) because the rest of the codebase
// expects that shape — @supabase/ssr's generic inference produces a
// slightly different SupabaseClient signature that breaks downstream
// query typing (results become `never`).
// ============================================

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>;
}

// Singleton instance for consistent state across the app.
// One client per browser session — token-refresh timers are shared.
let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

/**
 * Call this after sign-out to destroy the singleton and stop
 * the background token-refresh timer for the previous session.
 */
export function resetSupabaseClient() {
  browserClient = undefined;
}
