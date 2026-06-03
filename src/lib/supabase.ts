/**
 * Supabase client.
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the build-time env.
 * The anon key is safe to ship to the browser — row-level security (set up in
 * the 003 migration) keeps students inside their own data.
 *
 * If the env vars are not set (e.g. before the first deploy), we return null
 * and the UI shows a "not configured" message instead of crashing.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("your-project") && !anonKey.includes("your-anon-key")
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: false },
    })
  : null;

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[PhysicsHub] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable persistence."
  );
}
