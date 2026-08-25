// ─────────────────────────────────────────────────────────────────────────────
// redis.js — Redis Client + Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
// WHY Redis?
//   - In-memory key-value store: O(1) reads/writes, sub-ms latency
//   - Built-in TTL (Time-To-Live): perfect for token blacklists, rate limits
//   - Distributed: works across multiple server instances (horizontal scaling)
//   - Google uses Memorystore (managed Redis) for exactly these use cases
//
// PATTERNS IMPLEMENTED:
//   1. Token Blacklist    — Revoke JWTs before expiry (key = jti, TTL = remaining life)
//   2. Rate Limiting      — Sliding window counter per IP+endpoint
//   3. Session Store      — Distributed session data (alternative to SQLite sessions)
//   4. Refresh Token Meta — Track active refresh tokens across devices
// ─────────────────────────────────────────────────────────────────────────────

const Redis = require('ioredis');

// ── Create Redis Client ──────────────────────────────────────────────────────
// Default: localhost:6379. In production, use REDIS_URL env var.
// lazyConnect: true means we don't block server startup if Redis is down —
// the server still works for non-Redis labs.

let redis;
let redisAvailable = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 200, 1000);
    },
  });

  redis.on('connect', () => {
    redisAvailable = true;
    console.log('[Redis] Connected to localhost:6379');
  });

  redis.on('error', (err) => {
    if (redisAvailable) {
      console.error('[Redis] Connection lost:', err.message);
    }
    redisAvailable = false;
  });

  // Attempt connection (non-blocking)
  redis.connect().catch(() => {
    console.warn('[Redis] Not available — Redis-dependent labs will use fallback. Run: brew services start redis');
  });
} catch (err) {
  console.warn('[Redis] Failed to initialize:', err.message);
}

// ── In-Memory Fallback ───────────────────────────────────────────────────────
// If Redis isn't running, use a simple Map as fallback.
// This lets non-Redis labs work without Redis installed.
const fallbackStore = new Map();

function isRedisUp() {
  return redisAvailable && redis && redis.status === 'ready';
}

// ── 1. TOKEN BLACKLIST ───────────────────────────────────────────────────────
// When a user logs out or a token is revoked, we add the JWT's `jti` (JWT ID)
// to the blacklist with a TTL equal to the token's remaining lifetime.
//
// WHY NOT just delete the token?
//   JWTs are stateless — the server never stored them. The only way to
//   "invalidate" a JWT before expiry is to maintain a deny-list.
//
// ARCHITECTURE TRADE-OFF (Google interview topic):
//   - Short-lived tokens (5min) + refresh rotation = small blacklist
//   - Long-lived tokens (1hr) = larger blacklist, more Redis memory
//   - At Google scale: billions of tokens → need Redis Cluster with eviction policy

async function blacklistToken(jti, expiresInSeconds) {
  const key = `bl:${jti}`;
  if (isRedisUp()) {
    await redis.set(key, '1', 'EX', expiresInSeconds);
  } else {
    fallbackStore.set(key, { value: '1', expires: Date.now() + expiresInSeconds * 1000 });
  }
}

async function isTokenBlacklisted(jti) {
  const key = `bl:${jti}`;
  if (isRedisUp()) {
    return (await redis.exists(key)) === 1;
  }
  const entry = fallbackStore.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expires) { fallbackStore.delete(key); return false; }
  return true;
}

// ── 2. RATE LIMITING (Sliding Window Counter) ────────────────────────────────
// Algorithm: Fixed window counter with Redis INCR + EXPIRE
//   - Key format: rl:<ip>:<endpoint>
//   - Window: configurable (default 60s)
//   - Limit: configurable (default 100 requests)
//
// WHY sliding window?
//   Fixed windows have a burst problem at window boundaries.
//   A true sliding window uses sorted sets (ZRANGEBYSCORE), but for learning
//   purposes the fixed window counter is simpler and demonstrates the concept.
//
// Google uses token bucket / leaky bucket for their APIs (Cloud Endpoints).

async function checkRateLimit(ip, endpoint, limit = 100, windowSec = 60) {
  const key = `rl:${ip}:${endpoint}`;

  if (isRedisUp()) {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSec);
    }
    return {
      allowed: current <= limit,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      resetIn: await redis.ttl(key),
    };
  }

  // Fallback: in-memory counter
  const entry = fallbackStore.get(key) || { count: 0, expires: Date.now() + windowSec * 1000 };
  if (Date.now() > entry.expires) {
    entry.count = 0;
    entry.expires = Date.now() + windowSec * 1000;
  }
  entry.count++;
  fallbackStore.set(key, entry);

  return {
    allowed: entry.count <= limit,
    current: entry.count,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetIn: Math.ceil((entry.expires - Date.now()) / 1000),
  };
}

// ── 3. SESSION STORE ─────────────────────────────────────────────────────────
// Store session data in Redis for distributed access across server instances.
// TTL auto-expires sessions.
//
// KEY DIFFERENCE from SQLite sessions:
//   SQLite = persistent but slower, single-server
//   Redis  = ephemeral but faster, multi-server

async function setSession(sessionId, data, ttlSeconds = 3600) {
  const key = `sess:${sessionId}`;
  if (isRedisUp()) {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } else {
    fallbackStore.set(key, { value: data, expires: Date.now() + ttlSeconds * 1000 });
  }
}

async function getSession(sessionId) {
  const key = `sess:${sessionId}`;
  if (isRedisUp()) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  const entry = fallbackStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { fallbackStore.delete(key); return null; }
  return entry.value;
}

async function deleteSession(sessionId) {
  const key = `sess:${sessionId}`;
  if (isRedisUp()) {
    await redis.del(key);
  } else {
    fallbackStore.delete(key);
  }
}

// ── 4. REFRESH TOKEN METADATA ────────────────────────────────────────────────
// Track which devices have active refresh tokens.
// Used for "logout all devices" and per-device revocation.

async function setRefreshMeta(userId, deviceId, meta, ttlSeconds = 604800) {
  const key = `refresh:${userId}:${deviceId}`;
  if (isRedisUp()) {
    await redis.set(key, JSON.stringify(meta), 'EX', ttlSeconds);
  } else {
    fallbackStore.set(key, { value: meta, expires: Date.now() + ttlSeconds * 1000 });
  }
}

async function getRefreshMeta(userId, deviceId) {
  const key = `refresh:${userId}:${deviceId}`;
  if (isRedisUp()) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  const entry = fallbackStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { fallbackStore.delete(key); return null; }
  return entry.value;
}

async function deleteAllRefreshMeta(userId) {
  if (isRedisUp()) {
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) await redis.del(...keys);
  } else {
    for (const [key] of fallbackStore) {
      if (key.startsWith(`refresh:${userId}:`)) fallbackStore.delete(key);
    }
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = {
  redis,
  isRedisUp,
  blacklistToken,
  isTokenBlacklisted,
  checkRateLimit,
  setSession,
  getSession,
  deleteSession,
  setRefreshMeta,
  getRefreshMeta,
  deleteAllRefreshMeta,
};
