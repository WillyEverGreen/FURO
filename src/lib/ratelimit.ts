import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getServerEnv } from "@/lib/env";

const redis = new Redis({
  url: getServerEnv("UPSTASH_REDIS_REST_URL"),
  token: getServerEnv("UPSTASH_REDIS_REST_TOKEN"),
});

// 5 page creates per minute per IP
export const createLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "rl:create",
});

// 10 file uploads per minute per IP
export const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "rl:upload",
});
