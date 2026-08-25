// ─────────────────────────────────────────────────────────────────────────────
// routes/cors.js — CORS Demo Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Demonstrates different CORS configurations and their effects.
//
// Endpoints:
//   GET  /api/cors/no-cors          — No CORS headers (blocked by browser)
//   GET  /api/cors/simple           — Simple request (no preflight needed)
//   GET  /api/cors/preflight        — Custom headers trigger preflight
//   POST /api/cors/preflight        — POST with JSON triggers preflight
//   GET  /api/cors/credentials      — Requires credentials (cookies)
//   GET  /api/cors/wildcard         — Access-Control-Allow-Origin: *
//   GET  /api/cors/reflected        — INSECURE: reflects Origin header
//   GET  /api/cors/whitelist        — Dynamic whitelist check
//   GET  /api/cors/max-age          — Preflight cache demo
//   GET  /api/cors/expose-headers   — Custom response headers
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { WHITELIST } = require('../middleware/corsConfig');

// ── No CORS Headers ──────────────────────────────────────────────────────────
// Browser will block the response in JS (but the request IS still sent!)
// IMPORTANT: CORS doesn't prevent the request — it prevents JS from READING the response
router.get('/no-cors', (req, res) => {
  // Deliberately not setting any Access-Control-* headers
  res.json({
    data: 'This response has NO CORS headers',
    explanation: 'The browser sent the request and the server responded. But the browser will NOT let JavaScript access this response because there are no Access-Control-Allow-Origin headers.',
    youWillSee: 'A CORS error in the browser console, but this server log shows the request was received.',
    requestOrigin: req.headers.origin || 'none (same-origin or non-browser)',
  });
});

// ── Simple Request (no preflight) ────────────────────────────────────────────
// Conditions for "simple request" (no OPTIONS preflight):
//   1. Method: GET, HEAD, or POST
//   2. Headers: only Accept, Accept-Language, Content-Language, Content-Type
//   3. Content-Type: only text/plain, multipart/form-data, application/x-www-form-urlencoded
router.get('/simple', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.json({
    data: 'Simple GET request — no preflight needed',
    why: 'GET with no custom headers = simple request. Browser sends it directly.',
    headers: { origin: origin || 'same-origin' },
  });
});

// ── Preflight Required ───────────────────────────────────────────────────────
// Adding a custom header (X-Custom-Header) or Content-Type: application/json
// triggers a preflight OPTIONS request first
router.options('/preflight', (req, res) => {
  const origin = req.headers.origin;
  if (origin && WHITELIST.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Custom-Header');
    res.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24h
  }
  res.status(204).end();
});

router.get('/preflight', (req, res) => {
  const origin = req.headers.origin;
  if (origin && WHITELIST.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.json({
    data: 'This required a preflight because you sent a custom header',
    customHeader: req.headers['x-custom-header'] || 'none',
  });
});

router.post('/preflight', express.json(), (req, res) => {
  const origin = req.headers.origin;
  if (origin && WHITELIST.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.json({
    data: 'POST with Content-Type: application/json triggers preflight',
    body: req.body,
    contentType: req.headers['content-type'],
  });
});

// ── Credentials (Cookies with CORS) ──────────────────────────────────────────
// Key rule: When credentials: true, you CANNOT use wildcard (*) for origin.
// Must echo back the specific origin.
router.get('/credentials', (req, res) => {
  const origin = req.headers.origin;
  if (origin && WHITELIST.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin); // MUST be specific, not *
    res.set('Access-Control-Allow-Credentials', 'true');
  }

  // Read a cookie to prove credentials were sent
  const sessionId = req.cookies?.session_id;
  res.json({
    data: 'Credentials endpoint — checks for cookies',
    cookieReceived: !!sessionId,
    sessionId: sessionId ? sessionId.substring(0, 8) + '...' : null,
    rule: 'Access-Control-Allow-Origin MUST be specific origin (not *) when credentials: true',
  });
});

// ── Wildcard Origin ──────────────────────────────────────────────────────────
// Safe for public APIs that don't use cookies/credentials
router.get('/wildcard', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  // Note: Access-Control-Allow-Credentials is NOT set (would fail with *)
  res.json({
    data: 'Public data accessible from any origin',
    rule: 'Wildcard (*) is OK for public data without credentials',
    cannotCombineWith: 'Access-Control-Allow-Credentials: true',
  });
});

// ── Reflected Origin (INSECURE) ──────────────────────────────────────────────
// DANGER: Reflects any origin. Combined with credentials, this means
// ANY website can make authenticated requests to your API.
router.options('/reflected', (req, res) => {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Methods', 'GET,POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).end();
});

router.get('/reflected', (req, res) => {
  // VULNERABILITY: blindly reflecting the Origin header
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.json({
    data: '⚠️ INSECURE: This endpoint reflects any origin!',
    reflectedOrigin: req.headers.origin,
    danger: 'Any website can read this response including cookies. This is equivalent to no CORS protection.',
    sessionCookie: req.cookies?.session_id ? 'EXPOSED!' : 'none',
  });
});

// ── Dynamic Whitelist ────────────────────────────────────────────────────────
router.options('/whitelist', (req, res) => {
  const origin = req.headers.origin;
  if (origin && WHITELIST.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Max-Age', '86400');
    res.set('Vary', 'Origin'); // IMPORTANT for CDN caching
  }
  res.status(204).end();
});

router.get('/whitelist', (req, res) => {
  const origin = req.headers.origin;
  const allowed = origin && WHITELIST.has(origin);

  if (allowed) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Vary', 'Origin');
  }

  res.json({
    data: allowed ? 'Origin is whitelisted' : 'Origin is NOT whitelisted',
    origin: origin || 'none',
    whitelist: Array.from(WHITELIST),
    allowed,
    tip: 'Always set Vary: Origin when dynamically setting Access-Control-Allow-Origin for CDN correctness',
  });
});

// ── Max-Age / Preflight Cache Demo ───────────────────────────────────────────
router.options('/max-age', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'X-Perf-Test');
    res.set('Access-Control-Max-Age', '600'); // 10 minutes — browser caches preflight
  }
  console.log('[CORS] Preflight request received for /max-age at', new Date().toISOString());
  res.status(204).end();
});

router.get('/max-age', (req, res) => {
  const origin = req.headers.origin;
  if (origin) res.set('Access-Control-Allow-Origin', origin);
  res.json({
    data: 'Check server logs — preflight is cached for 10 minutes',
    tip: 'First request: 2 network calls (OPTIONS + GET). Subsequent: only GET.',
    maxAge: 600,
  });
});

// ── Expose Headers ───────────────────────────────────────────────────────────
// By default, JS can only read "simple" response headers.
// Custom headers need Access-Control-Expose-Headers to be readable.
router.get('/expose-headers', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Expose-Headers', 'X-Request-Id, X-RateLimit-Remaining');
  }
  res.set('X-Request-Id', 'req-' + Date.now());
  res.set('X-RateLimit-Remaining', '95');
  res.json({
    data: 'Check response headers — X-Request-Id and X-RateLimit-Remaining are exposed',
    simpleHeaders: ['Cache-Control', 'Content-Language', 'Content-Type', 'Expires', 'Last-Modified', 'Pragma'],
    note: 'Without Access-Control-Expose-Headers, JS cannot read custom headers',
  });
});

module.exports = router;
