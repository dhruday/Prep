// ─────────────────────────────────────────────────────────────────────────────
// routes/sri.js — Subresource Integrity Demo Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Serves scripts with correct and INTENTIONALLY WRONG integrity hashes
// so labs can demonstrate SRI blocking in action.
//
// Endpoints:
//   GET /api/sri/script.js           — Serves a legitimate script
//   GET /api/sri/tampered-script.js  — Serves a modified (tampered) script
//   GET /api/sri/style.css           — Serves a legitimate stylesheet
//   GET /api/sri/generate-hash       — Generates SRI hash for given content
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const LEGITIMATE_SCRIPT = `
// Legitimate analytics library (v1.0.0)
(function() {
  console.log('[Analytics] Loaded successfully — version 1.0.0');
  window.analytics = {
    track: function(event) { console.log('[Analytics] Event:', event); },
    identify: function(userId) { console.log('[Analytics] User:', userId); },
    version: '1.0.0'
  };
})();
`.trim();

const TAMPERED_SCRIPT = `
// Tampered analytics library — INJECTED MALICIOUS CODE
(function() {
  console.log('[Analytics] Loaded successfully — version 1.0.0');
  window.analytics = {
    track: function(event) { console.log('[Analytics] Event:', event); },
    identify: function(userId) { console.log('[Analytics] User:', userId); },
    version: '1.0.0'
  };
  // MALICIOUS: steal cookies and send to attacker
  console.warn('⚠️ TAMPERED: This script was modified by an attacker!');
  console.warn('⚠️ In a real attack, it would steal cookies, inject keyloggers, etc.');
})();
`.trim();

const LEGITIMATE_STYLE = `
/* Legitimate UI library stylesheet */
.analytics-widget { background: #1a1b26; color: #e2e8f0; padding: 16px; border-radius: 8px; }
.analytics-widget h3 { color: #60a5fa; }
.analytics-widget .count { font-size: 24px; font-weight: bold; }
`.trim();

// ── Serve Legitimate Script ──────────────────────────────────────────────────
router.get('/script.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=31536000'); // 1 year (immutable content)
  res.send(LEGITIMATE_SCRIPT);
});

// ── Serve Tampered Script (same URL pattern, different content) ──────────────
router.get('/tampered-script.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.set('Access-Control-Allow-Origin', '*');
  res.send(TAMPERED_SCRIPT);
});

// ── Serve Legitimate Stylesheet ──────────────────────────────────────────────
router.get('/style.css', (req, res) => {
  res.set('Content-Type', 'text/css');
  res.set('Access-Control-Allow-Origin', '*');
  res.send(LEGITIMATE_STYLE);
});

// ── Generate SRI Hash ────────────────────────────────────────────────────────
router.get('/generate-hash', (req, res) => {
  const algorithms = ['sha256', 'sha384', 'sha512'];
  const resources = {
    'script.js': LEGITIMATE_SCRIPT,
    'tampered-script.js': TAMPERED_SCRIPT,
    'style.css': LEGITIMATE_STYLE,
  };

  const hashes = {};
  for (const [name, content] of Object.entries(resources)) {
    hashes[name] = {};
    for (const alg of algorithms) {
      const hash = crypto.createHash(alg).update(content).digest('base64');
      hashes[name][alg] = `${alg}-${hash}`;
    }
  }

  res.json({
    hashes,
    usage: {
      script: `<script src="/api/sri/script.js" integrity="${hashes['script.js'].sha384}" crossorigin="anonymous"></script>`,
      style: `<link rel="stylesheet" href="/api/sri/style.css" integrity="${hashes['style.css'].sha384}" crossorigin="anonymous">`,
    },
    explanation: {
      whatHappens: 'Browser downloads the resource, hashes it, compares with integrity attribute',
      ifMatch: 'Resource loads normally',
      ifMismatch: 'Browser BLOCKS the resource — network error, onerror fires',
      whyCrossorigin: 'SRI requires CORS — browser needs to read the response to hash it',
    },
  });
});

// ── Custom Content Hash ──────────────────────────────────────────────────────
router.post('/hash', express.json(), (req, res) => {
  const { content, algorithm = 'sha384' } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const validAlgorithms = ['sha256', 'sha384', 'sha512'];
  if (!validAlgorithms.includes(algorithm)) {
    return res.status(400).json({ error: 'algorithm must be sha256, sha384, or sha512' });
  }

  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  res.json({
    integrity: `${algorithm}-${hash}`,
    algorithm,
    contentLength: content.length,
  });
});

// ── Alias: /demo (labs use /api/sri/demo) ───────────────────────────────────
router.get('/demo', (req, res) => {
  const scriptContent = 'console.log("Hello from CDN script");';
  const hash384 = crypto.createHash('sha384').update(scriptContent).digest('base64');
  const hash256 = crypto.createHash('sha256').update(scriptContent).digest('base64');
  res.json({
    demo: 'SRI Hash Verification',
    scriptContent,
    hashes: {
      'sha256': `sha256-${hash256}`,
      'sha384': `sha384-${hash384}`,
    },
    usage: `<script src="..." integrity="sha384-${hash384}" crossorigin="anonymous"></script>`,
  });
});

module.exports = router;
