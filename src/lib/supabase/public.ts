import { createClient } from "@supabase/supabase-js";

// Unauthenticated Supabase client — only for public read queries (share pages)
export const createPublicSupabaseClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? ""
  );
