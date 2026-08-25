# Security Labs Server — Setup Guide

## Prerequisites

```bash
# 1. Install Redis (for token blacklist, sessions, rate limiting)
brew install redis
brew services start redis

# 2. Verify Redis is running
redis-cli ping   # Should respond: PONG

# 3. Node.js 18+ required
node --version
```

## Quick Start

```bash
cd Practical/server
npm install
npm start        # Starts on http://localhost:3001
```

## What's Running

| Port | Purpose |
|------|---------|
| 3001 | Main server — serves labs + API endpoints |
| 3002 | Attacker origin — for CORS/CSRF cross-origin demos |

## Architecture

```
server/
├── server.js           Main entry — wires routes, middleware, static serving
├── db.js               SQLite: users, sessions, refresh_tokens, xss_comments
├── redis.js            Redis: token blacklist, rate limits, distributed sessions
├── middleware/
│   ├── auth.js         JWT verify + session check
│   ├── csrf.js         CSRF token generation + validation
│   ├── cors.js         Dynamic origin whitelist + preflight
│   ├── csp.js          CSP nonce generation, header injection
│   ├── secureHeaders.js HSTS, X-Content-Type-Options, Referrer-Policy, etc.
│   └── rateLimit.js    Redis-based sliding window rate limiter
└── routes/
    ├── xss.js          Reflected, Stored, DOM-based XSS endpoints
    ├── csrf.js         Token validation, transfer simulation
    ├── cors.js         Simple, preflight, credentials endpoints
    ├── auth.js         Register, login (session + JWT), logout
    ├── tokens.js       Refresh, rotate, revoke, blacklist-check
    ├── oauth.js        Simulated OAuth 2.0 provider
    ├── jwt.js          Sign, verify, decode, JWKS endpoint
    ├── webauthn.js     WebAuthn registration + authentication
    ├── sensitive.js    Masked vs raw user data by role
    ├── apiSecure.js    Protected resources, API key proxy
    ├── clickjack.js    Pages with/without X-Frame-Options
    ├── tokenRefresh.js Silent refresh, rotation, revoke-all
    └── sri.js          Intact vs tampered script serving
```

## Database

SQLite DB auto-creates at `server/security.db` on first run.

**Tables:**
- `users` — id, username, email, password_hash, role, created_at
- `sessions` — id, user_id, session_id, ip, user_agent, created_at, expires_at
- `refresh_tokens` — id, user_id, token_hash, device_id, ip, created_at, expires_at, revoked
- `xss_comments` — id, username, comment, created_at (used by Stored XSS lab)
- `webauthn_credentials` — id, user_id, credential_id, public_key, counter, created_at

## Redis Keys

| Pattern | Purpose |
|---------|---------|
| `bl:<jti>` | Blacklisted JWT (TTL = remaining token life) |
| `sess:<session_id>` | Session data (TTL = session expiry) |
| `rl:<ip>:<endpoint>` | Rate limit counter (TTL = window size) |
| `refresh:<user_id>:<device_id>` | Refresh token metadata |

## Troubleshooting

- **Redis not running**: `brew services start redis`
- **Port in use**: `lsof -i :3001` then `kill <PID>`
- **Reset DB**: `rm server/security.db` and restart
- **Reset Redis**: `redis-cli FLUSHDB`
