// ── In-memory rate limiter for labs (no Redis needed) ────────────────────────

const windows = new Map();

function rateLimit(opts = {}) {
  const windowMs = opts.windowMs || 60000;
  const max = opts.max || 30;
  const keyFn = opts.keyFn || ((req) => req.ip + ':' + req.baseUrl);

  // Cleanup old windows every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of windows) {
      if (now - val.start > windowMs * 2) windows.delete(key);
    }
  }, windowMs);

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let entry = windows.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      windows.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, max - entry.count);
    const resetAt = entry.start + windowMs;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    if (entry.count > max) {
      const retryAfter = Math.ceil((resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter,
        limit: max,
        windowMs,
      });
    }

    next();
  };
}

module.exports = { rateLimit };
