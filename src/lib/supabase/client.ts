import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || "https://zekhmpcrbxpkotcuzhso.supabase.co";
  const supabaseKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "sb_publishable_EBfkIvQNL7k8SGy4N0xNOA_c8ZPDZFp";

  return createSupabaseClient(supabaseUrl, supabaseKey);
}
