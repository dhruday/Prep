// ─────────────────────────────────────────────────────────────────────────────
// routes/csrf.js — CSRF Attack & Defense Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Simulates a bank transfer API to demonstrate CSRF attacks and defenses.
//
// Endpoints:
//   POST /api/csrf/login                      — Login (sets session cookie)
//   GET  /api/csrf/token                      — Get CSRF token (sync pattern)
//   GET  /api/csrf/balance                    — Check balance
//   POST /api/csrf/transfer/vulnerable        — Transfer WITHOUT CSRF check
//   POST /api/csrf/transfer/sync-token        — Transfer WITH sync token
//   POST /api/csrf/transfer/double-submit     — Transfer WITH double submit
//   POST /api/csrf/transfer/origin-check      — Transfer WITH origin check
//   POST /api/csrf/transfer/samesite          — Transfer WITH SameSite cookie
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { statements } = require('../db');
const bcrypt = require('bcryptjs');
const {
  csrfSynchronizerGenerate,
  csrfSynchronizerValidate,
  csrfDoubleSubmitSet,
  csrfDoubleSubmitValidate,
  csrfOriginCheck,
} = require('../middleware/csrf');

// In-memory "bank accounts" for the demo
const accounts = new Map();

function getBalance(username) {
  if (!accounts.has(username)) accounts.set(username, 10000);
  return accounts.get(username);
}

// ── Login (creates session cookie) ───────────────────────────────────────────
router.post('/login', express.json(), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  const user = statements.findUserByUsername.get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  statements.createSession.run(user.id, sessionId, req.ip, req.headers['user-agent'], expiresAt);

  // Set session cookie — DEFAULT: no SameSite (for demonstrating CSRF vulnerability)
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: false,       // Allow HTTP for localhost
    path: '/',
    maxAge: 3600000,
    // Note: NO SameSite — this is intentional for the CSRF demo
  });

  // Also set a SameSite=Strict cookie for the SameSite demo
  res.cookie('session_strict', sessionId, {
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
    path: '/',
    maxAge: 3600000,
  });

  // Also set a SameSite=Lax cookie
  res.cookie('session_lax', sessionId, {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    path: '/',
    maxAge: 3600000,
  });

  res.json({ success: true, message: `Logged in as ${username}`, balance: getBalance(username) });
});

// ── Get Balance ──────────────────────────────────────────────────────────────
router.get('/balance', (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) return res.status(401).json({ error: 'Not logged in' });

  const session = statements.findSession.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const user = statements.findUserById.get(session.user_id);
  res.json({ username: user.username, balance: getBalance(user.username) });
});

// ── Get CSRF Token (Synchronizer Token Pattern) ──────────────────────────────
router.get('/token', csrfSynchronizerGenerate, (req, res) => {
  res.json({ csrfToken: req.csrfToken, hint: 'Include this in X-CSRF-Token header' });
});

// ── Transfer: VULNERABLE (no CSRF protection) ───────────────────────────────
// DANGER: Any cross-origin form submission will succeed because
// the browser automatically includes the session_id cookie.
router.post('/transfer/vulnerable', express.json(), (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) return res.status(401).json({ error: 'Not logged in' });

  const session = statements.findSession.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const user = statements.findUserById.get(session.user_id);
  const { to, amount } = req.body;
  const transferAmount = parseInt(amount);

  if (!to || !transferAmount || transferAmount <= 0) {
    return res.status(400).json({ error: 'Invalid transfer: need "to" and "amount"' });
  }

  const balance = getBalance(user.username);
  if (transferAmount > balance) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  accounts.set(user.username, balance - transferAmount);
  accounts.set(to, getBalance(to) + transferAmount);

  res.json({
    success: true,
    message: `Transferred $${transferAmount} to ${to}`,
    newBalance: getBalance(user.username),
    warning: '⚠️ This endpoint has NO CSRF protection!',
  });
});

// ── Transfer: Synchronizer Token Pattern ─────────────────────────────────────
router.post('/transfer/sync-token', express.json(), csrfSynchronizerValidate, (req, res) => {
  const sessionId = req.cookies?.session_id;
  const session = statements.findSession.get(sessionId);
  const user = statements.findUserById.get(session.user_id);
  const { to, amount } = req.body;
  const transferAmount = parseInt(amount);

  const balance = getBalance(user.username);
  if (transferAmount > balance) return res.status(400).json({ error: 'Insufficient funds' });

  accounts.set(user.username, balance - transferAmount);
  accounts.set(to, getBalance(to) + transferAmount);

  res.json({
    success: true,
    message: `Transferred $${transferAmount} to ${to}`,
    newBalance: getBalance(user.username),
    protection: '✅ Synchronizer Token Pattern — CSRF token validated',
  });
});

// ── Transfer: Double Submit Cookie ───────────────────────────────────────────
router.post('/transfer/double-submit', express.json(), csrfDoubleSubmitValidate, (req, res) => {
  const sessionId = req.cookies?.session_id;
  const session = statements.findSession.get(sessionId);
  const user = statements.findUserById.get(session.user_id);
  const { to, amount } = req.body;
  const transferAmount = parseInt(amount);

  const balance = getBalance(user.username);
  if (transferAmount > balance) return res.status(400).json({ error: 'Insufficient funds' });

  accounts.set(user.username, balance - transferAmount);
  accounts.set(to, getBalance(to) + transferAmount);

  res.json({
    success: true,
    message: `Transferred $${transferAmount} to ${to}`,
    newBalance: getBalance(user.username),
    protection: '✅ Double Submit Cookie — cookie value matched header value',
  });
});

// ── Transfer: Origin/Referer Check ───────────────────────────────────────────
router.post('/transfer/origin-check', express.json(),
  csrfOriginCheck(['http://localhost:3001', 'http://127.0.0.1:3001']),
  (req, res) => {
    const sessionId = req.cookies?.session_id;
    const session = statements.findSession.get(sessionId);
    const user = statements.findUserById.get(session.user_id);
    const { to, amount } = req.body;
    const transferAmount = parseInt(amount);

    const balance = getBalance(user.username);
    if (transferAmount > balance) return res.status(400).json({ error: 'Insufficient funds' });

    accounts.set(user.username, balance - transferAmount);
    accounts.set(to, getBalance(to) + transferAmount);

    res.json({
      success: true,
      message: `Transferred $${transferAmount} to ${to}`,
      newBalance: getBalance(user.username),
      protection: '✅ Origin Check — request came from allowed origin',
      origin: req.headers.origin,
    });
  }
);

// ── Transfer: SameSite Cookie Demo ───────────────────────────────────────────
// This endpoint checks the session_strict cookie (SameSite=Strict)
// Cross-origin requests won't include this cookie at all
router.post('/transfer/samesite', express.json(), (req, res) => {
  const sessionId = req.cookies?.session_strict;
  if (!sessionId) {
    return res.status(401).json({
      error: 'No SameSite=Strict cookie found',
      explanation: 'The browser did NOT send the session_strict cookie because this is a cross-origin request and the cookie has SameSite=Strict',
    });
  }

  const session = statements.findSession.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const user = statements.findUserById.get(session.user_id);
  const { to, amount } = req.body;
  const transferAmount = parseInt(amount);

  const balance = getBalance(user.username);
  if (transferAmount > balance) return res.status(400).json({ error: 'Insufficient funds' });

  accounts.set(user.username, balance - transferAmount);
  accounts.set(to, getBalance(to) + transferAmount);

  res.json({
    success: true,
    message: `Transferred $${transferAmount} to ${to}`,
    newBalance: getBalance(user.username),
    protection: '✅ SameSite=Strict — cookie only sent on same-origin requests',
  });
});

// ── Reset Balances (for testing) ─────────────────────────────────────────────
router.post('/reset', (req, res) => {
  accounts.clear();
  res.json({ success: true, message: 'All balances reset to $10,000' });
});

module.exports = router;
