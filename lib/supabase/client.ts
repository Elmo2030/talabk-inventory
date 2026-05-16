'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// ============================================
// Browser Client — uses @supabase/ssr so the session is written to
// cookies (sb-*-auth-token) that the Edge middleware and Server
// Components can read. The previous @supabase/supabase-js client
// only persisted to localStorage, which caused middleware to bounce
// authenticated users back to /login.
// ============================================

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Singleton instance for consistent state across the app.
// One client per browser session — token-refresh timers are shared.
let browserClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
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
