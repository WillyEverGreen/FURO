"use client";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

// Safe for client-side use – only uses the anon key.
// Only used for direct-to-storage uploads via signed URLs.
export const supabaseBrowser = createClient(
  getPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
);
