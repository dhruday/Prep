// ─────────────────────────────────────────────────────────────────────────────
// middleware/csrf.js — CSRF Protection Middleware
// ─────────────────────────────────────────────────────────────────────────────
// Implements three CSRF defense patterns:
//   1. Synchronizer Token Pattern (stateful — token stored in DB)
//   2. Double Submit Cookie Pattern (stateless — token in cookie + header)
//   3. Origin/Referer Checking (header-based)
//
// Google interview insight:
//   "What's the difference between CSRF tokens and SameSite cookies?"
//   → CSRF tokens: explicit defense, works in all browsers
//   → SameSite cookies: implicit defense, browser-enforced, newer
//   → Best practice: use BOTH (defense in depth)
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const { statements } = require('../db');

// ── Generate CSRF Token ──────────────────────────────────────────────────────
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Synchronizer Token Pattern ───────────────────────────────────────────────
// Server generates token, stores in DB linked to session, sends to client.
// Client includes token in form field or header on state-changing requests.
// Server validates token matches the session's stored token.
function csrfSynchronizerGenerate(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Session required for CSRF token' });
  }

  const token = generateCsrfToken();
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  statements.createCsrfToken.run(sessionId, token, expiresAt);

  req.csrfToken = token;
  next();
}

function csrfSynchronizerValidate(req, res, next) {
  const sessionId = req.cookies?.session_id;
  const token = req.headers['x-csrf-token'] || req.body?._csrf;

  if (!sessionId || !token) {
    return res.status(403).json({
      error: 'CSRF validation failed',
      reason: !sessionId ? 'No session' : 'No CSRF token',
      hint: 'Include X-CSRF-Token header or _csrf body field',
    });
  }

  const valid = statements.getCsrfToken.get(token, sessionId);
  if (!valid) {
    return res.status(403).json({
      error: 'Invalid or expired CSRF token',
      hint: 'Fetch a new token from GET /api/csrf/token',
    });
  }

  // Consume the token (one-time use for highest security)
  statements.deleteCsrfToken.run(token);
  next();
}

// ── Double Submit Cookie Pattern ─────────────────────────────────────────────
// Server sets a random token in a non-HttpOnly cookie (so JS can read it).
// Client reads cookie, sends the same value in a header.
// Server checks: cookie value === header value.
//
// WHY this works:
// An attacker on evil.com can trigger a cross-origin request that SENDS cookies,
// but they CANNOT READ the cookie value due to Same-Origin Policy.
// So they can't include the matching header value.
function csrfDoubleSubmitSet(req, res, next) {
  if (!req.cookies?.csrf_double) {
    const token = generateCsrfToken();
    res.cookie('csrf_double', token, {
      httpOnly: false,  // JS needs to read it
      secure: false,    // Allow HTTP for localhost labs
      sameSite: 'Lax',
      path: '/',
      maxAge: 3600000,  // 1 hour
    });
  }
  next();
}

function csrfDoubleSubmitValidate(req, res, next) {
  const cookieToken = req.cookies?.csrf_double;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: 'CSRF double-submit validation failed',
      reason: !cookieToken ? 'No CSRF cookie' : 'No X-CSRF-Token header',
    });
  }

  // Timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }

  next();
}

// ── Origin/Referer Check ─────────────────────────────────────────────────────
// Simpler defense: check that Origin or Referer header matches allowed origins.
// Limitation: some browsers don't send Origin on same-origin requests,
// and Referer can be suppressed by Referrer-Policy.
function csrfOriginCheck(allowedOrigins = ['http://localhost:3001']) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // For non-mutating methods, skip check
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    if (origin) {
      if (allowedOrigins.includes(origin)) return next();
      return res.status(403).json({
        error: 'Origin not allowed',
        origin,
        allowed: allowedOrigins,
      });
    }

    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (allowedOrigins.includes(refererOrigin)) return next();
      } catch { /* invalid URL */ }
      return res.status(403).json({ error: 'Referer origin not allowed' });
    }

    // Neither Origin nor Referer present — block by default (strictest)
    return res.status(403).json({
      error: 'No Origin or Referer header — cannot verify request source',
    });
  };
}

module.exports = {
  generateCsrfToken,
  csrfSynchronizerGenerate,
  csrfSynchronizerValidate,
  csrfDoubleSubmitSet,
  csrfDoubleSubmitValidate,
  csrfOriginCheck,
};
