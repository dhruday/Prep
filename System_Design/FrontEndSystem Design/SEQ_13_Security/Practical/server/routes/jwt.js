// ─────────────────────────────────────────────────────────────────────────────
// routes/jwt.js — JWT Deep Dive Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Endpoints for inspecting, signing, verifying, and attacking JWTs.
//
// Endpoints:
//   POST /api/jwt/sign              — Sign a payload into JWT
//   POST /api/jwt/verify            — Verify a JWT (checks signature + expiry)
//   POST /api/jwt/decode            — Decode WITHOUT verification (unsafe)
//   GET  /api/jwt/jwks              — JWKS endpoint (public keys)
//   POST /api/jwt/algorithm-attack  — Demonstrate algorithm confusion attack
//   POST /api/jwt/blacklist         — Add JWT to Redis blacklist
//   GET  /api/jwt/blacklist/:jti    — Check if JTI is blacklisted
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, verifyJWT } = require('../middleware/auth');
const { blacklistToken, isTokenBlacklisted } = require('../redis');

// Generate RSA key pair for RS256 demo
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ── Sign JWT ─────────────────────────────────────────────────────────────────
router.post('/sign', express.json(), (req, res) => {
  const { payload, algorithm = 'HS256', expiresIn = '15m' } = req.body;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'payload (object) required' });
  }

  const jti = uuidv4();
  const fullPayload = { ...payload, jti, iat: Math.floor(Date.now() / 1000) };

  let token;
  let signingInfo;

  if (algorithm === 'RS256') {
    token = jwt.sign(fullPayload, privateKey, { algorithm: 'RS256', expiresIn });
    signingInfo = {
      algorithm: 'RS256 (Asymmetric — RSA)',
      signingKey: 'Server private key (NEVER shared)',
      verificationKey: 'Public key (can be shared via JWKS)',
      useCase: 'Multi-service architectures — services verify with public key without sharing secret',
    };
  } else {
    token = jwt.sign(fullPayload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
    signingInfo = {
      algorithm: 'HS256 (Symmetric — HMAC-SHA256)',
      signingKey: 'Shared secret (same key for sign + verify)',
      useCase: 'Single server or trusted services that share the secret',
    };
  }

  // Decode parts for educational display
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

  res.json({
    token,
    parts: {
      header: { encoded: parts[0], decoded: header },
      payload: { encoded: parts[1], decoded: decodedPayload },
      signature: { encoded: parts[2], note: 'Base64url-encoded HMAC/RSA signature' },
    },
    signingInfo,
    structure: 'header.payload.signature',
    expiresIn,
    jti,
  });
});

// ── Verify JWT ───────────────────────────────────────────────────────────────
router.post('/verify', express.json(), async (req, res) => {
  const { token, algorithm = 'HS256' } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  try {
    const secret = algorithm === 'RS256' ? publicKey : JWT_SECRET;
    const decoded = jwt.verify(token, secret, {
      algorithms: [algorithm], // IMPORTANT: restrict to expected algorithm
    });

    // Check blacklist
    const blacklisted = decoded.jti ? await isTokenBlacklisted(decoded.jti) : false;

    res.json({
      valid: !blacklisted,
      blacklisted,
      decoded,
      checklist: {
        signatureValid: true,
        notExpired: true,
        algorithmMatch: true,
        blacklistClear: !blacklisted,
      },
    });
  } catch (err) {
    res.json({
      valid: false,
      error: err.message,
      errorType: err.name,
      checklist: {
        signatureValid: err.name !== 'JsonWebTokenError',
        notExpired: err.name !== 'TokenExpiredError',
        algorithmMatch: !err.message.includes('algorithm'),
      },
    });
  }
});

// ── Decode (WITHOUT Verification) ────────────────────────────────────────────
// WARNING: This just base64-decodes — does NOT verify signature
router.post('/decode', express.json(), (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  try {
    const decoded = jwt.decode(token, { complete: true });
    res.json({
      warning: '⚠️ This is DECODED, not VERIFIED. Never trust decoded-only JWTs!',
      header: decoded.header,
      payload: decoded.payload,
      signature: decoded.signature,
      dangerousUse: 'Attacker can modify payload and decode will still work. Always VERIFY.',
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid JWT format', details: err.message });
  }
});

// ── JWKS Endpoint ────────────────────────────────────────────────────────────
// In production: this is how services discover your public key for RS256
// Example: https://accounts.google.com/.well-known/jwks
router.get('/jwks', (req, res) => {
  // Convert PEM to JWK format
  const keyObject = crypto.createPublicKey(publicKey);
  const jwk = keyObject.export({ format: 'jwk' });

  res.json({
    keys: [{
      ...jwk,
      kid: 'lab-key-1',
      use: 'sig',
      alg: 'RS256',
    }],
    explanation: {
      whatIsThis: 'JSON Web Key Set — public keys for verifying RS256 JWTs',
      howToUse: 'Fetch this endpoint, find key by "kid", verify token signature',
      realWorld: 'Google: https://www.googleapis.com/oauth2/v3/certs',
    },
  });
});

// ── Algorithm Confusion Attack Demo ──────────────────────────────────────────
// CVE-2015-9235: If server accepts both HS256 and RS256, attacker can:
// 1. Get the public key (from JWKS or certificate)
// 2. Sign a token with HS256 using the public key as the secret
// 3. Server verifies with public key (thinking it's RS256 secret) — succeeds!
router.post('/algorithm-attack', express.json(), (req, res) => {
  const { mode } = req.body;

  if (mode === 'create-malicious') {
    // Simulate attacker creating a token signed with public key as HMAC secret
    const maliciousPayload = {
      sub: 1,
      username: 'admin',
      role: 'admin',
      jti: uuidv4(),
    };

    // Sign with HS256 using the PUBLIC key as HMAC secret
    const maliciousToken = jwt.sign(maliciousPayload, publicKey, { algorithm: 'HS256' });

    return res.json({
      attack: 'Algorithm Confusion (CVE-2015-9235)',
      maliciousToken,
      explanation: [
        '1. Attacker gets the server\'s RS256 public key (from JWKS or TLS cert)',
        '2. Attacker signs a JWT with HS256 using the public key as the HMAC secret',
        '3. If the server doesn\'t restrict algorithms, it uses the public key to verify HS256',
        '4. Verification succeeds! Attacker has a valid admin token.',
      ],
    });
  }

  if (mode === 'verify-vulnerable') {
    const { token } = req.body;
    try {
      // VULNERABLE: accepts ANY algorithm
      const decoded = jwt.verify(token, publicKey); // No algorithm restriction!
      return res.json({
        vulnerable: true,
        valid: true,
        decoded,
        problem: 'Server accepted HS256 token verified with RSA public key!',
      });
    } catch (err) {
      return res.json({ vulnerable: true, valid: false, error: err.message });
    }
  }

  if (mode === 'verify-secure') {
    const { token } = req.body;
    try {
      // SECURE: restrict to RS256 only
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      return res.json({
        secure: true,
        valid: true,
        decoded,
        fix: 'Server ONLY accepts RS256 — HS256 tokens are rejected',
      });
    } catch (err) {
      return res.json({
        secure: true,
        valid: false,
        error: err.message,
        fix: 'Token rejected because algorithm doesn\'t match RS256',
      });
    }
  }

  res.json({
    modes: ['create-malicious', 'verify-vulnerable', 'verify-secure'],
    usage: 'POST with { mode: "create-malicious" } to start the attack flow',
  });
});

// ── Blacklist Token ──────────────────────────────────────────────────────────
router.post('/blacklist', express.json(), async (req, res) => {
  const { jti, ttlSeconds = 900 } = req.body;
  if (!jti) return res.status(400).json({ error: 'jti required' });

  await blacklistToken(jti, ttlSeconds);
  res.json({ success: true, blacklisted: jti, ttl: ttlSeconds });
});

router.get('/blacklist/:jti', async (req, res) => {
  const blacklisted = await isTokenBlacklisted(req.params.jti);
  res.json({ jti: req.params.jti, blacklisted });
});

module.exports = router;
