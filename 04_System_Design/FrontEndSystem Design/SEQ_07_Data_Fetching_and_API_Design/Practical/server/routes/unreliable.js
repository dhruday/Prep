// ── Unreliable endpoints — for retry, circuit breaker, degradation labs ──────
const express = require('express');
const router = express.Router();
const { statements } = require('../db');
const { errorSimulator } = require('../middleware/errorSimulator');

// State tracking for circuit breaker labs
let requestCount = 0;
let failStreak = 0;
const serviceHealth = { products: 'healthy', posts: 'healthy', comments: 'healthy' };

// ── GET /api/unreliable/products — 30% failure rate ─────────────────────────
router.get('/products', errorSimulator({ failRate: 0.3, timeoutRate: 0.05, rateLimitRate: 0.05 }), (req, res) => {
  requestCount++;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const products = statements.getProducts.all(limit, (page - 1) * limit);
  failStreak = 0;
  res.json({ data: products, _debug: { requestNumber: requestCount, failStreak } });
});

// ── GET /api/unreliable/flaky — configurable failure rate via query param ────
router.get('/flaky', (req, res) => {
  requestCount++;
  const failRate = Math.min(1, Math.max(0, parseFloat(req.query.failRate) || 0.5));
  const roll = Math.random();

  if (roll < failRate) {
    failStreak++;
    const codes = [500, 502, 503];
    const code = codes[Math.floor(Math.random() * codes.length)];
    return res.status(code).json({
      error: 'Simulated failure',
      code,
      requestNumber: requestCount,
      failStreak,
      failRate,
    });
  }

  failStreak = 0;
  res.json({
    data: { message: 'Success!', value: Math.random() },
    requestNumber: requestCount,
    failStreak,
  });
});

// ── GET /api/unreliable/timeout — sometimes hangs ───────────────────────────
router.get('/timeout', (req, res) => {
  requestCount++;
  const timeoutChance = parseFloat(req.query.chance) || 0.5;
  const timeoutMs = parseInt(req.query.ms) || 10000;

  if (Math.random() < timeoutChance) {
    // Just hang — client needs to abort
    res.setHeader('X-Simulated-Error', 'timeout-pending');
    setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Gateway Timeout', simulated: true });
      }
    }, timeoutMs);
    return;
  }

  res.json({ data: { message: 'Fast response!', ms: 0 }, requestNumber: requestCount });
});

// ── GET /api/unreliable/rate-limited — always returns 429 after N requests ──
const rateLimitBuckets = new Map();
router.get('/rate-limited', (req, res) => {
  const bucket = req.query.bucket || 'default';
  const max = parseInt(req.query.max) || 5;
  const windowMs = parseInt(req.query.windowMs) || 10000;

  let entry = rateLimitBuckets.get(bucket);
  const now = Date.now();
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
    rateLimitBuckets.set(bucket, entry);
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
    return res.status(429).json({ error: 'Too Many Requests', retryAfter, remaining: 0 });
  }

  res.json({ data: { message: 'OK', requestInWindow: entry.count }, remaining });
});

// ── POST /api/unreliable/idempotent — idempotency key demo ──────────────────
router.post('/idempotent', (req, res) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return res.status(400).json({ error: 'X-Idempotency-Key header required' });

  // Check if we've seen this key before
  const existing = statements.getIdempotencyKey.get(key);
  if (existing) {
    res.setHeader('X-Idempotent-Replay', 'true');
    return res.status(existing.status).json(JSON.parse(existing.response));
  }

  // Simulate occasional failure (for retry testing)
  if (Math.random() < 0.3) {
    return res.status(500).json({ error: 'Simulated failure — retry with same idempotency key' });
  }

  const response = { id: Date.now(), data: req.body, created: true };
  statements.setIdempotencyKey.run(key, JSON.stringify(response), 201);
  res.status(201).json(response);
});

// ── GET /api/unreliable/health — service health for circuit breaker labs ─────
router.get('/health', (req, res) => {
  res.json({ services: serviceHealth, requestCount, failStreak });
});

// ── POST /api/unreliable/health/:service — toggle service health ────────────
router.post('/health/:service', (req, res) => {
  const { service } = req.params;
  const { status } = req.body;
  if (serviceHealth[service] !== undefined && ['healthy', 'degraded', 'down'].includes(status)) {
    serviceHealth[service] = status;
  }
  res.json({ services: serviceHealth });
});

module.exports = router;
