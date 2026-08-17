// ─────────────────────────────────────────────────────────────────────────────
// routes/oauth.js — Simulated OAuth 2.0 Provider
// ─────────────────────────────────────────────────────────────────────────────
// Simulates a complete OAuth 2.0 Authorization Code flow + PKCE.
// No external OAuth provider needed — this IS the provider.
//
// Endpoints:
//   GET  /api/oauth/authorize          — Authorization endpoint (consent page)
//   POST /api/oauth/authorize/grant    — User grants consent
//   POST /api/oauth/token              — Token exchange endpoint
//   GET  /api/oauth/userinfo           — Protected resource (user info)
//   GET  /api/oauth/.well-known/config — OpenID Connect discovery
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { statements } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// Registered OAuth clients (in production: stored in DB)
const CLIENTS = {
  'lab-client': {
    clientId: 'lab-client',
    clientSecret: 'lab-secret-12345',
    redirectUris: ['http://localhost:3001/callback', 'http://localhost:3001/api/oauth/callback-demo'],
    name: 'Security Lab App',
    type: 'public', // public (SPA) or confidential (backend)
  },
};

// ── Authorization Endpoint ───────────────────────────────────────────────────
// User visits this URL, sees consent page, grants or denies access.
router.get('/authorize', (req, res) => {
  const {
    client_id, redirect_uri, response_type, scope, state,
    code_challenge, code_challenge_method,
  } = req.query;

  // Validate client
  const client = CLIENTS[client_id];
  if (!client) {
    return res.status(400).json({ error: 'Unknown client_id' });
  }
  if (!client.redirectUris.includes(redirect_uri)) {
    return res.status(400).json({
      error: 'Redirect URI not registered',
      registered: client.redirectUris,
      received: redirect_uri,
    });
  }
  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Only response_type=code is supported' });
  }

  // Serve consent page
  res.send(`
    <!DOCTYPE html>
    <html><head><title>OAuth Consent — ${client.name}</title>
    <style>
      body { background: #0f1117; color: #e2e8f0; font-family: system-ui; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      .card { background: #1a1b26; border: 1px solid #333; border-radius: 12px; padding: 32px; max-width: 400px; width: 100%; }
      h2 { color: #60a5fa; margin-top: 0; }
      .scope { background: #1e293b; padding: 8px 12px; border-radius: 6px; margin: 4px 0; }
      .btn { padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 4px; }
      .allow { background: #22c55e; color: white; }
      .deny { background: #ef4444; color: white; }
      .info { color: #94a3b8; font-size: 13px; margin-top: 16px; }
      .param { color: #94a3b8; font-size: 12px; word-break: break-all; }
    </style></head>
    <body><div class="card">
      <h2>🔐 Authorization Request</h2>
      <p><strong>${client.name}</strong> wants access to your account</p>
      <h4>Requested permissions:</h4>
      ${(scope || 'profile').split(' ').map(s => `<div class="scope">✓ ${s}</div>`).join('')}
      
      <div style="margin-top:20px;display:flex;gap:8px">
        <form method="POST" action="/api/oauth/authorize/grant" style="flex:1">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="scope" value="${scope || 'profile'}">
          <input type="hidden" name="state" value="${state || ''}">
          <input type="hidden" name="code_challenge" value="${code_challenge || ''}">
          <input type="hidden" name="code_challenge_method" value="${code_challenge_method || ''}">
          <input type="hidden" name="user_id" value="1">
          <button type="submit" class="btn allow" style="width:100%">Allow</button>
        </form>
        <form action="${redirect_uri}?error=access_denied&state=${state || ''}" style="flex:1">
          <button type="submit" class="btn deny" style="width:100%">Deny</button>
        </form>
      </div>
      
      <div class="info">
        <p>OAuth 2.0 Authorization Code Flow${code_challenge ? ' + PKCE' : ''}</p>
        <div class="param">client_id: ${client_id}</div>
        <div class="param">redirect_uri: ${redirect_uri}</div>
        <div class="param">state: ${state || 'none'}</div>
        ${code_challenge ? `<div class="param">PKCE: ${code_challenge_method} challenge present ✓</div>` : '<div class="param">PKCE: not used ⚠️</div>'}
      </div>
    </div></body></html>
  `);
});

// ── Grant Consent (form POST) ────────────────────────────────────────────────
router.post('/authorize/grant', express.urlencoded({ extended: true }), (req, res) => {
  const { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, user_id } = req.body;

  // Generate authorization code (short-lived: 30 seconds, single-use)
  const code = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30000).toISOString();

  statements.createOAuthCode.run(
    code, client_id, parseInt(user_id), redirect_uri,
    scope || '', code_challenge || null, code_challenge_method || null,
    state || '', expiresAt
  );

  // Redirect back to client with authorization code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);

  res.redirect(302, redirectUrl.toString());
});

// ── Token Exchange ───────────────────────────────────────────────────────────
// Client exchanges authorization code for access token + refresh token
router.post('/token', express.json(), express.urlencoded({ extended: true }), (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  // Find and validate the authorization code
  const authCode = statements.findOAuthCode.get(code);
  if (!authCode) {
    return res.status(400).json({ error: 'invalid_grant', message: 'Code expired, already used, or invalid' });
  }

  // Validate client
  if (authCode.client_id !== client_id) {
    return res.status(400).json({ error: 'invalid_client' });
  }
  if (authCode.redirect_uri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant', message: 'redirect_uri mismatch' });
  }

  // Validate PKCE if code_challenge was provided during authorization
  if (authCode.code_challenge) {
    if (!code_verifier) {
      return res.status(400).json({ error: 'invalid_grant', message: 'PKCE code_verifier required' });
    }

    let expectedChallenge;
    if (authCode.code_challenge_method === 'S256') {
      expectedChallenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    } else {
      expectedChallenge = code_verifier; // plain method (not recommended)
    }

    if (expectedChallenge !== authCode.code_challenge) {
      return res.status(400).json({ error: 'invalid_grant', message: 'PKCE verification failed' });
    }
  }

  // Validate client_secret for confidential clients
  const client = CLIENTS[client_id];
  if (client?.type === 'confidential') {
    if (client.clientSecret !== client_secret) {
      return res.status(401).json({ error: 'invalid_client', message: 'Bad client_secret' });
    }
  }

  // Mark code as used (single-use)
  statements.markOAuthCodeUsed.run(code);

  // Issue tokens
  const user = statements.findUserById.get(authCode.user_id);
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, scope: authCode.scope, type: 'access', jti: uuidv4() },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const idToken = jwt.sign(
    {
      iss: 'http://localhost:3001',
      sub: user.id,
      aud: client_id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { algorithm: 'HS256' }
  );

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: authCode.scope,
    id_token: idToken,
    explanation: {
      accessToken: 'Use to call protected APIs (Authorization: Bearer <token>)',
      idToken: 'Contains user identity claims (OpenID Connect)',
      pkceUsed: !!authCode.code_challenge,
    },
  });
});

// ── UserInfo Endpoint (Protected Resource) ───────────────────────────────────
router.get('/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bearer token required' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET, { algorithms: ['HS256'] });
    const user = statements.findUserById.get(decoded.sub);

    // Return claims based on granted scope
    const scopes = (decoded.scope || 'profile').split(' ');
    const claims = { sub: user.id };

    if (scopes.includes('profile')) {
      claims.username = user.username;
      claims.role = user.role;
    }
    if (scopes.includes('email')) {
      claims.email = user.email;
    }

    res.json(claims);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ── OpenID Connect Discovery ─────────────────────────────────────────────────
router.get('/.well-known/config', (req, res) => {
  res.json({
    issuer: 'http://localhost:3001',
    authorization_endpoint: 'http://localhost:3001/api/oauth/authorize',
    token_endpoint: 'http://localhost:3001/api/oauth/token',
    userinfo_endpoint: 'http://localhost:3001/api/oauth/userinfo',
    jwks_uri: 'http://localhost:3001/api/jwt/jwks',
    scopes_supported: ['profile', 'email', 'openid'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
  });
});

// ── Callback Demo Page ───────────────────────────────────────────────────────
router.get('/callback-demo', (req, res) => {
  const { code, state, error } = req.query;
  res.json({
    step: 'OAuth callback received!',
    code: code || null,
    state: state || null,
    error: error || null,
    nextStep: code
      ? 'Exchange this code for tokens at POST /api/oauth/token'
      : 'Authorization was denied or failed',
  });
});

module.exports = router;
