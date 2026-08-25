// ─────────────────────────────────────────────────────────────────────────────
// middleware/auth.js — Authentication Middleware
// ─────────────────────────────────────────────────────────────────────────────
// Two auth strategies:
//   1. JWT verification — stateless, checks Authorization: Bearer <token>
//   2. Session verification — stateful, checks session_id cookie
//
// Google interview insight:
//   "How do you handle authentication at scale?"
//   → JWT for stateless verification (no DB lookup per request)
//   → Sessions for traditional apps (server-side state, easy revocation)
//   → Both have trade-offs in latency, scalability, and security
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const { statements } = require('../db');
const { isTokenBlacklisted } = require('../redis');

// ── Secrets ──────────────────────────────────────────────────────────────────
// In production: use RS256 with public/private key pair, store in Secret Manager
// For labs: symmetric HMAC (HS256) with a static secret
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production';

// ── JWT Auth Middleware ──────────────────────────────────────────────────────
// Extracts Bearer token from Authorization header, verifies signature + expiry,
// checks blacklist, and attaches user to req.user
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing or invalid Authorization header',
      hint: 'Send: Authorization: Bearer <your-jwt-token>',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // IMPORTANT: restrict algorithms to prevent confusion attacks
    });

    // Check blacklist (async) — revoked tokens are rejected even if not expired
    isTokenBlacklisted(decoded.jti).then((blacklisted) => {
      if (blacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
      req.user = decoded;
      req.token = token;
      next();
    }).catch(() => {
      // If Redis is down, allow the request (fail-open for availability)
      // In production at Google: this would be fail-closed
      req.user = decoded;
      req.token = token;
      next();
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', details: err.message });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

// ── Optional JWT (doesn't fail if no token) ──────────────────────────────────
function optionalJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token = anonymous request, continue
  }
  verifyJWT(req, res, next);
}

// ── Session Auth Middleware ───────────────────────────────────────────────────
// Checks session_id cookie against SQLite sessions table
function verifySession(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({
      error: 'No session cookie',
      hint: 'Login first to get a session_id cookie',
    });
  }

  const session = statements.findSession.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const user = statements.findUserById.get(session.user_id);
  if (!user) {
    return res.status(401).json({ error: 'Session user not found' });
  }

  req.user = user;
  req.sessionId = sessionId;
  next();
}

// ── Role-Based Access Control ────────────────────────────────────────────────
// Usage: router.get('/admin', verifyJWT, requireRole('admin'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user?.role || 'none',
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  verifyJWT,
  optionalJWT,
  verifySession,
  requireRole,
};
