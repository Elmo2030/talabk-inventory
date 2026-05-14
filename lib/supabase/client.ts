'use client';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// ============================================
// Browser Client - يُستخدم في Client Components
// نستخدم @supabase/supabase-js مباشرةً لدعم TypeScript الكامل
// ============================================

export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton instance for consistent state across the app
let browserClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
