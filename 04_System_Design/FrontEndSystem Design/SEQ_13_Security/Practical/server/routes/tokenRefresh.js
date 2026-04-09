// ─────────────────────────────────────────────────────────────────────────────
// routes/tokenRefresh.js — Token Refresh Pattern Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Demonstrates refresh token rotation, revocation, and device management.
//
// Endpoints:
//   POST /api/refresh/silent          — Silent refresh (auto-rotate)
//   POST /api/refresh/rotate          — Manual rotation with device tracking
//   POST /api/refresh/revoke          — Revoke specific device's refresh token
//   POST /api/refresh/revoke-all      — Revoke ALL refresh tokens (logout all devices)
//   GET  /api/refresh/devices         — List active sessions/devices
//   GET  /api/refresh/status          — Check token status in Redis
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { statements } = require('../db');
const { JWT_SECRET, JWT_REFRESH_SECRET, verifyJWT } = require('../middleware/auth');
const { setRefreshMeta, getRefreshMeta, deleteAllRefreshMeta, blacklistToken } = require('../redis');

// ── Silent Refresh ───────────────────────────────────────────────────────────
// Called automatically by the frontend when access token expires
// Uses HttpOnly cookie refresh token → returns new access + refresh tokens
router.post('/silent', express.json(), async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token', action: 'REDIRECT_TO_LOGIN' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = statements.findRefreshToken.get(tokenHash);

    if (!stored) {
      // Possible token reuse attack — revoke ALL tokens for this user
      statements.revokeAllUserTokens.run(decoded.sub);
      await deleteAllRefreshMeta(decoded.sub);
      return res.status(401).json({
        error: 'Refresh token reuse detected!',
        action: 'ALL_TOKENS_REVOKED',
        explanation: 'If a revoked refresh token is reused, it means it was stolen. All tokens are revoked as a safety measure.',
      });
    }

    // Rotate: revoke old, issue new
    statements.revokeRefreshToken.run(tokenHash);

    const user = statements.findUserById.get(decoded.sub);
    const newAccessToken = jwt.sign(
      { sub: user.id, username: user.username, role: user.role, jti: uuidv4() },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { sub: user.id, jti: uuidv4(), type: 'refresh' },
      JWT_REFRESH_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiry = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    statements.createRefreshToken.run(user.id, newHash, stored.device_id, req.ip, expiry);

    // Update Redis metadata
    await setRefreshMeta(user.id, stored.device_id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      lastRefresh: new Date().toISOString(),
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true, secure: false, sameSite: 'Strict',
      path: '/api', maxAge: 7 * 24 * 3600000,
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      rotated: true,
      device: stored.device_id,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token', details: err.message, action: 'REDIRECT_TO_LOGIN' });
  }
});

// ── Revoke Specific Device ───────────────────────────────────────────────────
router.post('/revoke', express.json(), verifyJWT, (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

  statements.revokeDeviceTokens.run(req.user.sub, deviceId);
  res.json({ success: true, message: `Device ${deviceId} refresh tokens revoked` });
});

// ── Revoke All Devices ───────────────────────────────────────────────────────
router.post('/revoke-all', express.json(), verifyJWT, async (req, res) => {
  statements.revokeAllUserTokens.run(req.user.sub);
  statements.deleteUserSessions.run(req.user.sub);
  await deleteAllRefreshMeta(req.user.sub);

  // Blacklist current access token too
  const remaining = req.user.exp - Math.floor(Date.now() / 1000);
  if (remaining > 0) await blacklistToken(req.user.jti, remaining);

  res.clearCookie('session_id');
  res.clearCookie('refresh_token', { path: '/api' });

  res.json({
    success: true,
    message: 'All sessions and refresh tokens revoked across all devices',
    userId: req.user.sub,
  });
});

// ── List Active Devices ──────────────────────────────────────────────────────
router.get('/devices', verifyJWT, (req, res) => {
  const tokens = statements.getUserRefreshTokens.all(req.user.sub);
  const active = tokens.filter(t => !t.revoked);
  const revoked = tokens.filter(t => t.revoked);

  res.json({
    activeDevices: active.map(t => ({
      deviceId: t.device_id,
      ip: t.ip,
      createdAt: t.created_at,
      expiresAt: t.expires_at,
    })),
    revokedCount: revoked.length,
    totalCount: tokens.length,
  });
});

module.exports = router;
