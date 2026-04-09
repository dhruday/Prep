import { sha256 } from "@/utils/hash";
import type { SourceChunk } from "@/types";

interface CachedResponse {
  answer: string;
  sources: SourceChunk[];
  cachedAt: number;
}

/**
 * Two-layer cache:
 * 1. In-memory Map (L1) — zero-latency, lost on restart
 * 2. Upstash Redis via REST (L2) — persistent, survives restarts
 *
 * TTL: 1 hour for identical queries
 */
const memoryCache = new Map<string, CachedResponse>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getCachedResponse(
  query: string
): Promise<CachedResponse | null> {
  const key = await sha256(query.toLowerCase().trim());

  // L1: in-memory
  const memHit = memoryCache.get(key);
  if (memHit && Date.now() - memHit.cachedAt < CACHE_TTL_MS) {
    return memHit;
  }

  // L2: Redis (optional — only if env vars present)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const redisHit = await redisGet<CachedResponse>(key);
    if (redisHit) {
      // Populate L1 from L2
      memoryCache.set(key, { ...redisHit, cachedAt: Date.now() });
      return redisHit;
    }
  }

  return null;
}

export async function setCachedResponse(
  query: string,
  response: Omit<CachedResponse, "cachedAt">
): Promise<void> {
  const key = await sha256(query.toLowerCase().trim());
  const payload: CachedResponse = { ...response, cachedAt: Date.now() };

  // L1
  memoryCache.set(key, payload);

  // L2: Redis
  if (process.env.UPSTASH_REDIS_REST_URL) {
    await redisSet(key, payload, 3600); // 1hr TTL in seconds
  }
}

// ─── Upstash Redis REST helpers ───────────────────────────────────────────────

async function redisGet<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
      {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      }
    );
    const data = await res.json();
    if (data.result === null) return null;
    return JSON.parse(data.result) as T;
  } catch {
    return null; // cache miss on error — degrade gracefully
  }
}

async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([JSON.stringify(value), "EX", ttlSeconds]),
    });
  } catch {
    // Non-fatal — cache writes are best-effort
  }
}
