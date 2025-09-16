// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL || "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

if (!url || !anon) {
  // Won’t crash your app in dev; uploads are simply disabled
  console.warn("[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Uploads disabled.");
}
