const ENV_HINT = "Set it in Vercel Project Settings -> Environment Variables (and .env.local for local dev).";

type PublicEnvKey = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY";
type ServerEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "UPSTASH_REDIS_REST_URL"
  | "UPSTASH_REDIS_REST_TOKEN"
  | "CRON_SECRET";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[ENV] Missing ${name}. ${ENV_HINT}`);
  }
  return value;
}

export function getPublicEnv(name: PublicEnvKey): string {
  // Next.js only inlines NEXT_PUBLIC_* env vars in client bundles when accessed statically.
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(`[ENV] Missing ${name}. ${ENV_HINT}`);
  }

  return value;
}

export function getServerEnv(name: ServerEnvKey): string {
  return requireEnv(name);
}