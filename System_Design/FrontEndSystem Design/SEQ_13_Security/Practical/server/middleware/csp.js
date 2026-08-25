// ─────────────────────────────────────────────────────────────────────────────
// middleware/csp.js — Content Security Policy Middleware
// ─────────────────────────────────────────────────────────────────────────────
// Generates per-request nonces and injects CSP headers.
//
// Three modes:
//   1. Nonce-based (recommended) — nonce changes every request
//   2. Hash-based — precomputed hashes of known inline scripts
//   3. Report-only — logs violations without blocking
//
// Google interview insight:
//   "Why nonces over hashes?"
//   → Nonces: dynamic, work when inline scripts change per-request
//   → Hashes: static, must be recomputed on every code change
//   → strict-dynamic: best of both — nonce on entry point, cascading trust
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

// ── Nonce Generator ──────────────────────────────────────────────────────────
// Cryptographically random, base64 encoded, 16 bytes = 128 bits of entropy
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

// ── Nonce-Based CSP Middleware ────────────────────────────────────────────────
function cspNonce(options = {}) {
  const reportUri = options.reportUri || '/api/csp/report';

  return (req, res, next) => {
    const nonce = generateNonce();
    res.locals.cspNonce = nonce; // Available in templates/routes

    const directives = [
      `default-src 'self'`,
      `script-src 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'unsafe-inline'`, // Inline styles are lower risk than inline scripts
      `img-src 'self' data: https:`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' http://localhost:3001 http://localhost:3002`,
      `frame-ancestors 'self'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `report-uri ${reportUri}`,
    ];

    if (options.reportOnly) {
      res.set('Content-Security-Policy-Report-Only', directives.join('; '));
    } else {
      res.set('Content-Security-Policy', directives.join('; '));
    }

    next();
  };
}

// ── Hash-Based CSP ───────────────────────────────────────────────────────────
// For pages with known, static inline scripts
function cspHash(scriptHashes = []) {
  return (req, res, next) => {
    const hashSources = scriptHashes.map(h => `'sha256-${h}'`).join(' ');
    const directives = [
      `default-src 'self'`,
      `script-src 'self' ${hashSources}`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data:`,
    ];
    res.set('Content-Security-Policy', directives.join('; '));
    next();
  };
}

// ── Report-Only CSP ──────────────────────────────────────────────────────────
// Logs violations without blocking — use for rollout testing
function cspReportOnly(policy) {
  return (req, res, next) => {
    res.set('Content-Security-Policy-Report-Only', policy);
    next();
  };
}

// ── CSP Violation Report Handler ─────────────────────────────────────────────
// Receives violation reports from browsers
// In production: send to logging service (Cloud Logging, Sentry)
const cspViolations = [];

function cspReportHandler(req, res) {
  const report = req.body?.['csp-report'] || req.body;
  if (report) {
    cspViolations.push({
      ...report,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    // Keep only last 100 reports
    if (cspViolations.length > 100) cspViolations.shift();
  }
  res.status(204).end();
}

function getCspViolations() {
  return cspViolations;
}

module.exports = {
  generateNonce,
  cspNonce,
  cspHash,
  cspReportOnly,
  cspReportHandler,
  getCspViolations,
};
