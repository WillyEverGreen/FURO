"use client";
import { createClient } from "@supabase/supabase-js";

// Safe for client-side use – only uses the anon key.
// Only used for direct-to-storage uploads via signed URLs.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
