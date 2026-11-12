import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

export const SUPERADMIN_EMAIL = (
  import.meta.env.VITE_SUPERADMIN_EMAIL || "rohitaju21@gmail.com"
)
  .trim()
  .toLowerCase();

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPERADMIN_EMAIL;
}

let supabaseInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || "https://zekhmpcrbxpkotcuzhso.supabase.co";
  const supabaseKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "sb_publishable_EBfkIvQNL7k8SGy4N0xNOA_c8ZPDZFp";

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}
