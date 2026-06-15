/**
 * Typed wrappers for custom Postgres RPCs that aren't covered by the
 * auto-generated `Database['public']['Functions']` types (because the
 * generator hasn't been re-run since they were added).
 *
 * Adding signatures here keeps the call sites type-safe without the
 * `(client.rpc as any)` escape hatch and gives us one place to update
 * when the SQL signature changes.
 *
 * NOTE: When `npm run supabase:types` is rerun and these RPCs end up
 * in the generated types, you can collapse this file into a thin
 * passthrough or delete it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SalesOrder } from '@/lib/types';

// ── place_sales_order ────────────────────────────────────────────────────────
// Server-side: atomically creates a sales_orders row + the corresponding
// stock_out rows + decrements current_stock. Returns the inserted order
// with server-generated `id` and `orderNumber`.
//
// `p_order` shape is whatever the route expects — we type it loosely as
// a record because the SQL function does its own JSON validation.
export interface PlaceSalesOrderArgs {
  p_order: Record<string, unknown>;
}

export async function rpcPlaceSalesOrder(
  client: SupabaseClient,
  args: PlaceSalesOrderArgs
): Promise<{ data: SalesOrder | null; error: { message: string } | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (client.rpc as any)('place_sales_order', args);
  return res as { data: SalesOrder | null; error: { message: string } | null };
}

// ── receive_purchase_invoice ─────────────────────────────────────────────────
// Server-side: marks an invoice RECEIVED, creates stock_in rows for each
// computed line, and updates each item's moving-average cost. Returns nothing
// meaningful — callers only check the `error`.
export interface ReceivePurchaseInvoiceArgs {
  p_invoice_id: string;
  p_computed_items: Array<{
    itemId: string;
    quantity: number;
    totalUnitCost: number;
    newMAC: number;
  }>;
  p_invoice_number: string;
  p_supplier_id: string | null;
}

export async function rpcReceivePurchaseInvoice(
  client: SupabaseClient,
  args: ReceivePurchaseInvoiceArgs
): Promise<{ error: { message: string } | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (client.rpc as any)('receive_purchase_invoice', args);
  return res as { error: { message: string } | null };
}
