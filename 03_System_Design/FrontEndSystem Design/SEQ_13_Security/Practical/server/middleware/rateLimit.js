// ─────────────────────────────────────────────────────────────────────────────
// middleware/rateLimit.js — Redis-Based Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────
// Implements fixed-window counter with Redis for distributed rate limiting.
//
// Algorithm: INCR key per request, EXPIRE after window.
//   Pros: simple, O(1) Redis ops, works across multiple servers
//   Cons: burst at window boundary (2x limit possible)
//
// Better algorithms (Google-scale):
//   - Sliding window log: ZADD + ZRANGEBYSCORE — exact but more memory
//   - Token bucket: allows controlled bursts — used by Google Cloud Endpoints
//   - Leaky bucket: smooths output rate — used by Nginx
//
// Interview tip: Mention that you'd use a managed service (Cloud Armor,
// Cloudflare) in production, but understand the underlying algorithms.
// ─────────────────────────────────────────────────────────────────────────────

const { checkRateLimit } = require('../redis');

function rateLimit(options = {}) {
  const limit = options.limit || 100;
  const windowSec = options.windowSec || 60;
  const keyPrefix = options.keyPrefix || 'api';
  const message = options.message || 'Too many requests, please try again later';

  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const endpoint = keyPrefix + ':' + (options.keyFn ? options.keyFn(req) : req.path);

    try {
      const result = await checkRateLimit(ip, endpoint, limit, windowSec);

      // Always set rate limit headers (good API design)
      res.set('X-RateLimit-Limit', String(result.limit));
      res.set('X-RateLimit-Remaining', String(result.remaining));
      res.set('X-RateLimit-Reset', String(result.resetIn));

      if (!result.allowed) {
        return res.status(429).json({
          error: message,
          retryAfter: result.resetIn,
          limit: result.limit,
          current: result.current,
        });
      }

      next();
    } catch (err) {
      // If Redis is down, allow the request (fail-open)
      // Trade-off: availability over strict rate limiting
      console.warn('[RateLimit] Redis error, allowing request:', err.message);
      next();
    }
  };
}

// ── Preset Configurations ────────────────────────────────────────────────────

// Auth endpoints: strict rate limiting (brute force protection)
const authRateLimit = rateLimit({
  limit: 10,
  windowSec: 300,     // 10 requests per 5 minutes
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Try again in 5 minutes.',
});

// API endpoints: standard rate limiting
const apiRateLimit = rateLimit({
  limit: 100,
  windowSec: 60,      // 100 requests per minute
  keyPrefix: 'api',
});

// Token refresh: moderate rate limiting
const refreshRateLimit = rateLimit({
  limit: 20,
  windowSec: 60,      // 20 refreshes per minute
  keyPrefix: 'refresh',
  message: 'Too many token refresh requests.',
});

module.exports = {
  rateLimit,
  authRateLimit,
  apiRateLimit,
  refreshRateLimit,
};
