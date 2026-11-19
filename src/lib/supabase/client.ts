import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

export const SUPERADMIN_EMAIL = (
  import.meta.env.VITE_SUPERADMIN_EMAIL || ""
)
  .trim()
  .toLowerCase();

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email || !SUPERADMIN_EMAIL) return false;
  return email.trim().toLowerCase() === SUPERADMIN_EMAIL;
}

let supabaseInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "[Security Notice] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Please ensure environment variables are configured in .env.local"
    );
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}
