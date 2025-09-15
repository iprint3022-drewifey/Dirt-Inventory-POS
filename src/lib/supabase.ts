// src/lib/supabase.ts
// CDN fallback so it works even if npm install is flaky on StackBlitz.
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js?dts";

const url  = import.meta.env.VITE_SUPABASE_URL || "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Safe: null client if env missing
export const supabase = (url && anon) ? createClient(url, anon) : null;
