// ─────────────────────────────────────────────────────────────────────────────
// routes/auth.js — Authentication Flows
// ─────────────────────────────────────────────────────────────────────────────
// Implements two auth strategies side-by-side:
//   1. Session-based (traditional: cookie → server lookup → user)
//   2. Token-based (modern: JWT in Authorization header → decode → user)
//
// Endpoints:
//   POST /api/auth/register             — Create new user
//   POST /api/auth/login/session        — Session-based login
//   POST /api/auth/login/jwt            — JWT-based login (returns access + refresh)
//   GET  /api/auth/me                   — Get current user (accepts both auth methods)
//   POST /api/auth/logout/session       — Destroy session
//   POST /api/auth/logout/jwt           — Blacklist JWT + revoke refresh token
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { statements } = require('../db');
const { JWT_SECRET, JWT_REFRESH_SECRET, verifyJWT, verifySession } = require('../middleware/auth');
const { blacklistToken } = require('../redis');

// ── Register ─────────────────────────────────────────────────────────────────
router.post('/register', express.json(), async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check existing user
  if (statements.findUserByUsername.get(username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  if (statements.findUserByEmail.get(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Hash password (cost 10 for speed in labs, 12+ in production)
  const hash = await bcrypt.hash(password, 10);
  const result = statements.createUser.run(username, email, hash, 'user');

  statements.logEvent.run('REGISTER', result.lastInsertRowid, req.ip, `New user: ${username}`);

  res.status(201).json({
    success: true,
    user: { id: result.lastInsertRowid, username, email, role: 'user' },
  });
});

// ── Session-Based Login ──────────────────────────────────────────────────────
// Flow: verify credentials → create session in DB → set HttpOnly cookie
router.post('/login/session', express.json(), async (req, res) => {
  const { username, password } = req.body;

  const user = statements.findUserByUsername.get(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  statements.createSession.run(user.id, sessionId, req.ip, req.headers['user-agent'], expiresAt);
  statements.logEvent.run('LOGIN_SESSION', user.id, req.ip, `Session: ${sessionId.substring(0, 8)}...`);

  res.cookie('session_id', sessionId, {
    httpOnly: true,     // JS cannot read this cookie (XSS protection)
    secure: false,      // Allow HTTP for localhost
    sameSite: 'Lax',    // CSRF protection
    path: '/',
    maxAge: 3600000,
  });

  res.json({
    success: true,
    message: 'Logged in with session',
    user: { id: user.id, username: user.username, role: user.role },
    session: {
      id: sessionId.substring(0, 8) + '...',
      expiresAt,
      storage: 'Server-side (SQLite) + HttpOnly cookie',
    },
  });
});

// ── JWT-Based Login ──────────────────────────────────────────────────────────
// Flow: verify credentials → sign access token (short) + refresh token (long)
router.post('/login/jwt', express.json(), async (req, res) => {
  const { username, password, deviceId } = req.body;

  const user = statements.findUserByUsername.get(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Access token: short-lived (15 min), contains user info
  const jti = uuidv4(); // JWT ID — needed for blacklisting
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, jti },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );

  // Refresh token: long-lived (7 days), minimal payload
  const refreshJti = uuidv4();
  const refreshToken = jwt.sign(
    { sub: user.id, jti: refreshJti, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: '7d' }
  );

  // Store refresh token HASH in DB (never store raw tokens)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const device = deviceId || 'default';
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
  statements.createRefreshToken.run(user.id, tokenHash, device, req.ip, refreshExpiry);

  // Set refresh token as HttpOnly cookie (more secure than localStorage)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
    path: '/api/auth/refresh', // Only sent to refresh endpoint
    maxAge: 7 * 24 * 3600000,
  });

  statements.logEvent.run('LOGIN_JWT', user.id, req.ip, `Device: ${device}`);

  res.json({
    success: true,
    message: 'Logged in with JWT',
    accessToken,
    refreshToken, // Also in body for storage flexibility (memory vs cookie)
    user: { id: user.id, username: user.username, role: user.role },
    tokenInfo: {
      accessTokenExpiry: '15 minutes',
      refreshTokenExpiry: '7 days',
      jti: jti.substring(0, 8) + '...',
      storage: {
        accessToken: 'Keep in memory (not localStorage!)',
        refreshToken: 'HttpOnly cookie (auto-sent to /api/auth/refresh)',
      },
    },
  });
});

// ── Get Current User (both auth methods) ─────────────────────────────────────
router.get('/me/session', verifySession, (req, res) => {
  res.json({
    authMethod: 'Session-based',
    user: req.user,
    sessionId: req.sessionId.substring(0, 8) + '...',
  });
});

router.get('/me/jwt', verifyJWT, (req, res) => {
  const user = statements.findUserById.get(req.user.sub);
  res.json({
    authMethod: 'JWT-based',
    user,
    tokenClaims: {
      sub: req.user.sub,
      jti: req.user.jti,
      iat: new Date(req.user.iat * 1000).toISOString(),
      exp: new Date(req.user.exp * 1000).toISOString(),
    },
  });
});

// ── Refresh Token ────────────────────────────────────────────────────────────
router.post('/refresh', express.json(), (req, res) => {
  // Accept refresh token from cookie OR body
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Not a refresh token' });
    }

    // Verify token exists in DB and is not revoked
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = statements.findRefreshToken.get(tokenHash);
    if (!stored) {
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    // Rotate: revoke old refresh token, issue new pair
    statements.revokeRefreshToken.run(tokenHash);

    const user = statements.findUserById.get(decoded.sub);
    const newJti = uuidv4();
    const newAccessToken = jwt.sign(
      { sub: user.id, username: user.username, role: user.role, jti: newJti },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' }
    );

    const newRefreshJti = uuidv4();
    const newRefreshToken = jwt.sign(
      { sub: user.id, jti: newRefreshJti, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );

    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    statements.createRefreshToken.run(user.id, newTokenHash, stored.device_id, req.ip, refreshExpiry);

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'Strict',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 3600000,
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      rotated: true,
      message: 'Tokens rotated — old refresh token is now invalid',
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token', details: err.message });
  }
});

// ── Logout (Session) ─────────────────────────────────────────────────────────
router.post('/logout/session', (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    statements.deleteSession.run(sessionId);
    res.clearCookie('session_id');
  }
  res.json({ success: true, message: 'Session destroyed' });
});

// ── Logout (JWT) ─────────────────────────────────────────────────────────────
router.post('/logout/jwt', verifyJWT, async (req, res) => {
  // Blacklist the access token
  const remainingLife = req.user.exp - Math.floor(Date.now() / 1000);
  if (remainingLife > 0) {
    await blacklistToken(req.user.jti, remainingLife);
  }

  // Revoke the refresh token if provided
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    statements.revokeRefreshToken.run(tokenHash);
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  }

  statements.logEvent.run('LOGOUT_JWT', req.user.sub, req.ip, `JTI: ${req.user.jti}`);

  res.json({
    success: true,
    message: 'Access token blacklisted + refresh token revoked',
    blacklistedJti: req.user.jti.substring(0, 8) + '...',
    ttl: remainingLife,
  });
});

// ── Aliases (lab convenience routes) ─────────────────────────────────────────
// HTML labs use /api/auth/login and /api/auth/logout — redirect to JWT variants
router.post('/login', express.json(), (req, res, next) => {
  req.url = '/login/jwt';
  router.handle(req, res, next);
});
router.post('/logout', (req, res, next) => {
  req.url = '/logout/jwt';
  router.handle(req, res, next);
});

// ── Logout All Devices ───────────────────────────────────────────────────────
router.post('/logout/all', verifyJWT, async (req, res) => {
  statements.revokeAllUserTokens.run(req.user.sub);
  statements.deleteUserSessions.run(req.user.sub);

  // Blacklist current token
  const remainingLife = req.user.exp - Math.floor(Date.now() / 1000);
  if (remainingLife > 0) await blacklistToken(req.user.jti, remainingLife);

  res.clearCookie('session_id');
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });

  statements.logEvent.run('LOGOUT_ALL', req.user.sub, req.ip, 'All sessions and tokens revoked');

  res.json({
    success: true,
    message: 'All sessions destroyed + all refresh tokens revoked + current JWT blacklisted',
  });
});

module.exports = router;
