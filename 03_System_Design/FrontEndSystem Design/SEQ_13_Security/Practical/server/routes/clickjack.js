// ─────────────────────────────────────────────────────────────────────────────
// routes/clickjack.js — Clickjacking Demo Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Serves pages with different clickjacking protections.
//
// Endpoints:
//   GET /api/clickjack/vulnerable    — No frame protection
//   GET /api/clickjack/x-frame       — X-Frame-Options: DENY
//   GET /api/clickjack/csp           — CSP frame-ancestors: 'self'
//   GET /api/clickjack/sameorigin    — X-Frame-Options: SAMEORIGIN
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const bankPage = (title, color, protection) => `
  <!DOCTYPE html>
  <html><head><title>${title}</title>
  <style>
    body { background: #0f1117; color: #e2e8f0; font-family: system-ui; padding: 20px; }
    .card { background: #1a1b26; border: 1px solid ${color}; border-radius: 12px; padding: 24px; max-width: 400px; }
    h2 { color: ${color}; margin-top: 0; }
    .btn { background: ${color}; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; width: 100%; }
    .info { color: #94a3b8; font-size: 12px; margin-top: 16px; }
  </style></head>
  <body>
    <div class="card">
      <h2>${title}</h2>
      <p>Confirm wire transfer of <strong>$5,000</strong> to Account #8675309</p>
      <button class="btn" onclick="alert('Transfer confirmed!')">Confirm Transfer</button>
      <div class="info">${protection}</div>
    </div>
  </body></html>
`;

// ── Vulnerable (NO frame protection) ─────────────────────────────────────────
router.get('/vulnerable', (req, res) => {
  // No X-Frame-Options or CSP frame-ancestors — can be embedded anywhere
  res.send(bankPage(
    '⚠️ Vulnerable Bank Page',
    '#ef4444',
    'This page has NO clickjacking protection. It can be embedded in any iframe on any site.'
  ));
});

// ── X-Frame-Options: DENY ────────────────────────────────────────────────────
router.get('/x-frame', (req, res) => {
  res.set('X-Frame-Options', 'DENY');
  res.send(bankPage(
    '✅ Protected (X-Frame-Options: DENY)',
    '#22c55e',
    'X-Frame-Options: DENY — Browser refuses to render this in any iframe.'
  ));
});

// ── CSP frame-ancestors ──────────────────────────────────────────────────────
router.get('/csp', (req, res) => {
  res.set('Content-Security-Policy', "frame-ancestors 'self'");
  res.send(bankPage(
    '✅ Protected (CSP frame-ancestors)',
    '#22c55e',
    "CSP frame-ancestors 'self' — Modern browsers use this. More flexible than X-Frame-Options."
  ));
});

// ── X-Frame-Options: SAMEORIGIN ──────────────────────────────────────────────
router.get('/sameorigin', (req, res) => {
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.send(bankPage(
    '✅ Protected (SAMEORIGIN)',
    '#60a5fa',
    'X-Frame-Options: SAMEORIGIN — Can only be embedded by same-origin pages.'
  ));
});

// ── Alias: /protected → /x-frame (labs use /api/clickjack/protected) ────────
router.get('/protected', (req, res) => {
  res.set('X-Frame-Options', 'DENY');
  res.set('Content-Security-Policy', "frame-ancestors 'none'");
  res.send(bankPage(
    '✅ Protected Bank Page',
    '#22c55e',
    'This page is protected with both X-Frame-Options: DENY and CSP frame-ancestors.'
  ));
});

module.exports = router;
