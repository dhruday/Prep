import { NextRequest, NextResponse } from "next/server";

/**
 * Token-bucket rate limiter using Upstash Redis.
 * Falls back to allowing all requests if Redis is not configured.
 *
 * Limits: 20 requests per minute per IP
 */
const REQUESTS_PER_MINUTE = 20;
const WINDOW_SECONDS = 60;

export async function checkRateLimit(
  request: NextRequest
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    // No Redis configured — allow all requests in development
    return { allowed: true, remaining: REQUESTS_PER_MINUTE, reset: 0 };
  }

  const ip = getClientIp(request);
  const key = `ratelimit:chat:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SECONDS;

  try {
    // Sliding window using sorted set (ZRANGEBYSCORE + ZADD + EXPIRE)
    const countRes = await redisCommand(["ZCOUNT", key, windowStart.toString(), now.toString()]);
    const count = typeof countRes === "number" ? countRes : 0;

    if (count >= REQUESTS_PER_MINUTE) {
      // Get oldest entry to compute reset time
      const oldest = await redisCommand(["ZRANGE", key, "0", "0", "WITHSCORES"]);
      const oldestTs = Array.isArray(oldest) && oldest[1] ? parseInt(oldest[1]) : now;
      return { allowed: false, remaining: 0, reset: oldestTs + WINDOW_SECONDS };
    }

    // Record this request
    await redisCommand(["ZADD", key, now.toString(), `${now}-${Math.random()}`]);
    await redisCommand(["EXPIRE", key, WINDOW_SECONDS.toString()]);
    // Clean old entries
    await redisCommand(["ZREMRANGEBYSCORE", key, "-inf", windowStart.toString()]);

    return { allowed: true, remaining: REQUESTS_PER_MINUTE - count - 1, reset: now + WINDOW_SECONDS };
  } catch {
    // If Redis is down, allow the request — don't block users on infrastructure failure
    return { allowed: true, remaining: REQUESTS_PER_MINUTE, reset: 0 };
  }
}

export function rateLimitResponse(reset: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down.", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Retry-After": reset.toString(),
        "X-RateLimit-Limit": REQUESTS_PER_MINUTE.toString(),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function redisCommand(args: string[]): Promise<unknown> {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  return data.result;
}
