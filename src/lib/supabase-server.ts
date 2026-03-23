import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

let _client: SupabaseClient | null = null;

// IMPORTANT: This client uses the service-role key.
// It must ONLY be used in server-side code (API routes, server components).
// Never import this file in client components.
export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = getServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}

// Convenience alias for backwards compatibility
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
