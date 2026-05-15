/**
 * /setup — Legacy page, no longer needed.
 * Auth setup is now handled entirely by Supabase.
 * Redirect anyone who lands here to the root.
 */
import { redirect } from 'next/navigation';

export default function SetupPage() {
  redirect('/');
}
