// ─────────────────────────────────────────────────────────────────────────────
// routes/xss.js — XSS Attack & Defense Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Provides both VULNERABLE and SECURE endpoints so labs can demonstrate
// the difference side-by-side.
//
// Endpoints:
//   GET  /api/xss/reflect/vulnerable?q=<input>   — Reflects input unsanitized
//   GET  /api/xss/reflect/secure?q=<input>        — HTML-encodes input
//   POST /api/xss/comments/vulnerable             — Stores raw HTML
//   POST /api/xss/comments/secure                 — Sanitizes with DOMPurify
//   GET  /api/xss/comments                        — Lists all comments
//   POST /api/xss/comments/clear                  — Clears all comments
//   GET  /api/xss/dom-context                     — Returns data for DOM XSS demo
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { statements } = require('../db');

// Server-side DOMPurify (via jsdom)
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// ── HTML Encoding Helper ─────────────────────────────────────────────────────
// This is what frameworks like React do automatically (auto-escaping)
function htmlEncode(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Reflected XSS: Vulnerable ────────────────────────────────────────────────
// DANGER: Reflects user input directly into the HTML response.
// Attack: /api/xss/reflect/vulnerable?q=<script>alert('XSS')</script>
router.get('/reflect/vulnerable', (req, res) => {
  const query = req.query.q || '';
  // VULNERABILITY: No encoding — raw input injected into HTML
  res.send(`
    <html><body style="background:#1a1a2e;color:#e2e8f0;font-family:monospace;padding:20px">
      <h2 style="color:#ef4444">⚠️ VULNERABLE Reflected XSS</h2>
      <p>You searched for: ${query}</p>
      <p style="color:#666;font-size:12px">Notice: your input was reflected WITHOUT encoding</p>
    </body></html>
  `);
});

// ── Reflected XSS: Secure ────────────────────────────────────────────────────
// SAFE: HTML-encodes all user input before reflection
router.get('/reflect/secure', (req, res) => {
  const query = req.query.q || '';
  const safeQuery = htmlEncode(query);
  res.send(`
    <html><body style="background:#0f1117;color:#e2e8f0;font-family:monospace;padding:20px">
      <h2 style="color:#22c55e">✅ SECURE Reflected XSS</h2>
      <p>You searched for: ${safeQuery}</p>
      <p style="color:#666;font-size:12px">Notice: your input was HTML-encoded (< → &lt;)</p>
    </body></html>
  `);
});

// ── Stored XSS: Vulnerable ───────────────────────────────────────────────────
// DANGER: Stores raw HTML in database, renders it unsanitized
router.post('/comments/vulnerable', express.json(), (req, res) => {
  const { username, comment } = req.body;
  if (!username || !comment) {
    return res.status(400).json({ error: 'username and comment required' });
  }
  // VULNERABILITY: Storing raw HTML — any script tags will execute when rendered
  statements.addComment.run(username, comment);
  res.json({ success: true, message: 'Comment stored (unsanitized)', username, comment });
});

// ── Stored XSS: Secure ──────────────────────────────────────────────────────
// SAFE: Sanitizes with DOMPurify before storing
router.post('/comments/secure', express.json(), (req, res) => {
  const { username, comment } = req.body;
  if (!username || !comment) {
    return res.status(400).json({ error: 'username and comment required' });
  }
  // SAFE: DOMPurify strips all dangerous tags/attributes
  const safeUsername = DOMPurify.sanitize(username, { ALLOWED_TAGS: [] }); // text only
  const safeComment = DOMPurify.sanitize(comment);
  statements.addComment.run(safeUsername, safeComment);
  res.json({ success: true, message: 'Comment stored (sanitized)', username: safeUsername, comment: safeComment });
});

// ── Get Comments (renders both safe and unsafe) ──────────────────────────────
router.get('/comments', (req, res) => {
  const comments = statements.getComments.all();
  res.json({
    comments,
    warning: 'Some comments may contain raw HTML (from vulnerable endpoint). Render with caution.',
    total: comments.length,
  });
});

// ── Clear Comments ───────────────────────────────────────────────────────────
router.post('/comments/clear', (req, res) => {
  statements.clearComments.run();
  res.json({ success: true, message: 'All comments cleared' });
});

// ── DOM XSS Context ──────────────────────────────────────────────────────────
// Returns data that labs use to demonstrate DOM-based XSS
// (the vulnerability is in the CLIENT JavaScript, not the server)
router.get('/dom-context', (req, res) => {
  res.json({
    message: 'This data is safe from the server. DOM XSS happens when CLIENT JavaScript unsafely writes user input to the DOM.',
    examples: {
      dangerous: [
        'document.getElementById("output").innerHTML = location.hash.slice(1)',
        'eval(new URLSearchParams(location.search).get("code"))',
        'document.write(decodeURIComponent(location.search))',
      ],
      safe: [
        'element.textContent = userInput',
        'element.setAttribute("data-value", sanitize(userInput))',
        'const safe = DOMPurify.sanitize(userInput); element.innerHTML = safe',
      ],
    },
  });
});

// ── Double Encoding Demo ─────────────────────────────────────────────────────
// Shows how double-encoding can bypass naive sanitization
router.get('/double-encode', (req, res) => {
  const input = req.query.q || '';

  // Naive sanitization: only decodes once
  const naiveDecoded = decodeURIComponent(input);
  const naiveSanitized = naiveDecoded.replace(/<script>/gi, '').replace(/<\/script>/gi, '');

  // Proper sanitization: use DOMPurify after full decoding
  let fullyDecoded = input;
  try {
    // Decode until no more changes (handles multi-encoding)
    let prev;
    let safety = 0;
    do {
      prev = fullyDecoded;
      fullyDecoded = decodeURIComponent(fullyDecoded);
      safety++;
    } while (prev !== fullyDecoded && safety < 5);
  } catch { /* invalid encoding */ }
  const properSanitized = DOMPurify.sanitize(fullyDecoded, { ALLOWED_TAGS: [] });

  res.json({
    original: input,
    naive: { decoded: naiveDecoded, sanitized: naiveSanitized, safe: false },
    proper: { decoded: fullyDecoded, sanitized: properSanitized, safe: true },
  });
});

module.exports = router;
