// ─────────────────────────────────────────────────────────────────────────────
// routes/webauthn.js — WebAuthn / Passkey Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Implements WebAuthn registration and authentication using @simplewebauthn/server.
//
// Endpoints:
//   POST /api/webauthn/register/options    — Generate registration options
//   POST /api/webauthn/register/verify     — Verify registration response
//   POST /api/webauthn/auth/options        — Generate authentication options
//   POST /api/webauthn/auth/verify         — Verify authentication response
//   GET  /api/webauthn/credentials/:userId — List user's credentials
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { statements } = require('../db');

// SimpleWebAuthn server-side library
let simpleWebAuthn;
try {
  simpleWebAuthn = require('@simplewebauthn/server');
} catch {
  console.warn('[WebAuthn] @simplewebauthn/server not installed — WebAuthn routes will return stubs');
}

// Configuration
const RP_NAME = 'Security Labs';
const RP_ID = 'localhost';
const ORIGIN = 'http://localhost:3001';

// In-memory challenge store (in production: use Redis with TTL)
const challengeStore = new Map();

// ── Registration Options ─────────────────────────────────────────────────────
router.post('/register/options', express.json(), async (req, res) => {
  if (!simpleWebAuthn) return res.status(501).json({ error: 'WebAuthn not available — install @simplewebauthn/server' });

  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });

  const user = statements.findUserByUsername.get(username);
  if (!user) return res.status(404).json({ error: 'User not found. Register first via /api/auth/register' });

  // Get existing credentials to exclude (prevent duplicate registration)
  const existingCreds = statements.getUserWebAuthnCreds.all(user.id);

  const options = await simpleWebAuthn.generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(String(user.id)),
    userName: user.username,
    userDisplayName: user.username,
    attestationType: 'none', // 'none' for most use cases (don't need attestation)
    excludeCredentials: existingCreds.map(c => ({
      id: c.credential_id,
      type: 'public-key',
      transports: JSON.parse(c.transports || '[]'),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',           // Passkey (discoverable credential)
      userVerification: 'preferred',      // Biometric/PIN if available
      authenticatorAttachment: 'platform', // Built-in authenticator (Touch ID, Windows Hello)
    },
  });

  // Store challenge for verification
  challengeStore.set(user.id, options.challenge);

  res.json({
    options,
    explanation: {
      challenge: 'Random bytes the authenticator must sign (prevents replay attacks)',
      rpId: 'Relying Party ID — must match the domain (phishing protection)',
      residentKey: 'preferred = store credential on device for passwordless login',
      userVerification: 'preferred = ask for biometric/PIN if device supports it',
    },
  });
});

// ── Registration Verification ────────────────────────────────────────────────
router.post('/register/verify', express.json(), async (req, res) => {
  if (!simpleWebAuthn) return res.status(501).json({ error: 'WebAuthn not available' });

  const { username, credential } = req.body;
  const user = statements.findUserByUsername.get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const expectedChallenge = challengeStore.get(user.id);
  if (!expectedChallenge) return res.status(400).json({ error: 'No pending registration challenge' });

  try {
    const verification = await simpleWebAuthn.verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential: cred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Store credential in database
      statements.createWebAuthnCred.run(
        user.id,
        Buffer.from(cred.id).toString('base64url'),
        Buffer.from(cred.publicKey).toString('base64'),
        cred.counter,
        JSON.stringify(credential.response?.transports || [])
      );

      challengeStore.delete(user.id);

      res.json({
        verified: true,
        credentialId: Buffer.from(cred.id).toString('base64url').substring(0, 20) + '...',
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        explanation: {
          publicKey: 'Stored on server — used to verify future signatures',
          privateKey: 'Stays on your device — NEVER leaves it',
          counter: 'Increments on each use — detects cloned credentials',
        },
      });
    } else {
      res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (err) {
    res.status(400).json({ verified: false, error: err.message });
  }
});

// ── Authentication Options ───────────────────────────────────────────────────
router.post('/auth/options', express.json(), async (req, res) => {
  if (!simpleWebAuthn) return res.status(501).json({ error: 'WebAuthn not available' });

  const { username } = req.body;

  let allowCredentials = [];
  if (username) {
    const user = statements.findUserByUsername.get(username);
    if (user) {
      const creds = statements.getUserWebAuthnCreds.all(user.id);
      allowCredentials = creds.map(c => ({
        id: c.credential_id,
        type: 'public-key',
        transports: JSON.parse(c.transports || '[]'),
      }));
    }
  }

  const options = await simpleWebAuthn.generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'preferred',
  });

  // Store challenge (using a generic key for discoverable credentials)
  challengeStore.set('auth:' + (username || 'discoverable'), options.challenge);

  res.json({
    options,
    explanation: {
      challenge: 'Fresh random value — authenticator signs this to prove possession of private key',
      allowCredentials: allowCredentials.length > 0
        ? 'Specific credentials listed — authenticator knows which key to use'
        : 'Empty — authenticator shows all available passkeys (discoverable credentials)',
    },
  });
});

// ── Authentication Verification ──────────────────────────────────────────────
router.post('/auth/verify', express.json(), async (req, res) => {
  if (!simpleWebAuthn) return res.status(501).json({ error: 'WebAuthn not available' });

  const { username, credential } = req.body;
  const challengeKey = 'auth:' + (username || 'discoverable');
  const expectedChallenge = challengeStore.get(challengeKey);

  if (!expectedChallenge) return res.status(400).json({ error: 'No pending auth challenge' });

  // Find the credential in DB
  const credId = credential.id;
  const storedCred = statements.findWebAuthnCred.get(credId);
  if (!storedCred) return res.status(400).json({ error: 'Unknown credential' });

  try {
    const verification = await simpleWebAuthn.verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: storedCred.credential_id,
        publicKey: new Uint8Array(Buffer.from(storedCred.public_key, 'base64')),
        counter: storedCred.counter,
      },
    });

    if (verification.verified) {
      // Update counter (prevents credential cloning detection)
      statements.updateWebAuthnCounter.run(verification.authenticationInfo.newCounter, credId);
      challengeStore.delete(challengeKey);

      const user = statements.findUserById.get(storedCred.user_id);

      res.json({
        verified: true,
        user: { id: user.id, username: user.username, role: user.role },
        newCounter: verification.authenticationInfo.newCounter,
        explanation: {
          whatHappened: 'Authenticator signed the challenge with the private key. Server verified with stored public key.',
          phishingProtection: 'Origin is checked — credential only works on localhost, not on attacker.com',
        },
      });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (err) {
    res.status(400).json({ verified: false, error: err.message });
  }
});

// ── List Credentials ─────────────────────────────────────────────────────────
router.get('/credentials/:userId', (req, res) => {
  const creds = statements.getUserWebAuthnCreds.all(parseInt(req.params.userId));
  res.json({
    credentials: creds.map(c => ({
      id: c.credential_id.substring(0, 20) + '...',
      counter: c.counter,
      transports: JSON.parse(c.transports || '[]'),
      createdAt: c.created_at,
    })),
    count: creds.length,
  });
});

module.exports = router;
