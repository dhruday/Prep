// ─────────────────────────────────────────────────────────────────────────────
// db.js — SQLite Database Setup (better-sqlite3)
// ─────────────────────────────────────────────────────────────────────────────
// WHY SQLite?
//   - Zero config, file-based — no separate DB server to install
//   - Synchronous API via better-sqlite3 — simpler than async drivers
//   - Perfect for learning: you see the actual SQL, transactions, and schema
//   - Google interviews often ask about storage trade-offs:
//     SQLite (embedded) vs PostgreSQL (networked) vs Redis (in-memory)
//
// TABLES:
//   users            — Registration, login, role-based access
//   sessions         — Server-side session management (traditional auth)
//   refresh_tokens   — JWT refresh token rotation + revocation
//   xss_comments     — Stored XSS demo (intentionally vulnerable)
//   webauthn_creds   — WebAuthn/Passkey credential storage
//   oauth_codes      — OAuth authorization codes (simulated provider)
//   audit_log        — Security event logging
// ─────────────────────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'security.db');

// ── Create DB with WAL mode for better concurrent read performance ──────────
// WAL (Write-Ahead Logging) allows readers to not block writers and vice versa.
// Google-scale insight: In production you'd use PostgreSQL with connection pooling,
// but the same schema design principles apply.
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema Creation ─────────────────────────────────────────────────────────

db.exec(`
  -- Users table: stores credentials + role for RBAC demos
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    UNIQUE NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    DEFAULT 'user' CHECK(role IN ('user', 'admin', 'viewer')),
    created_at    TEXT    DEFAULT (datetime('now'))
  );

  -- Sessions table: server-side session storage (traditional auth pattern)
  -- Each row = one active session. Compare this with JWT stateless approach.
  CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  TEXT    UNIQUE NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    expires_at  TEXT    NOT NULL
  );

  -- Refresh tokens: supports rotation + per-device revocation
  -- WHY store hash, not raw token? Same reason you hash passwords —
  -- if DB is compromised, attacker can't use stolen refresh tokens.
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT    UNIQUE NOT NULL,
    device_id   TEXT    NOT NULL,
    ip          TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    expires_at  TEXT    NOT NULL,
    revoked     INTEGER DEFAULT 0
  );

  -- XSS comments: intentionally stores raw HTML for Stored XSS demo
  -- In production, you'd sanitize on write AND on read (defense in depth)
  CREATE TABLE IF NOT EXISTS xss_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL,
    comment    TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  -- WebAuthn credentials: stores public keys for passkey authentication
  CREATE TABLE IF NOT EXISTS webauthn_creds (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT    UNIQUE NOT NULL,
    public_key    TEXT    NOT NULL,
    counter       INTEGER DEFAULT 0,
    transports    TEXT,
    created_at    TEXT    DEFAULT (datetime('now'))
  );

  -- OAuth authorization codes: simulated OAuth provider
  -- Codes are short-lived (30s) and single-use
  CREATE TABLE IF NOT EXISTS oauth_codes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT    UNIQUE NOT NULL,
    client_id     TEXT    NOT NULL,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    redirect_uri  TEXT    NOT NULL,
    scope         TEXT,
    code_challenge TEXT,
    code_challenge_method TEXT,
    state         TEXT,
    created_at    TEXT    DEFAULT (datetime('now')),
    expires_at    TEXT    NOT NULL,
    used          INTEGER DEFAULT 0
  );

  -- Audit log: tracks security events for monitoring labs
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event      TEXT    NOT NULL,
    user_id    INTEGER,
    ip         TEXT,
    details    TEXT,
    created_at TEXT    DEFAULT (datetime('now'))
  );
`);

// ── Seed Data ───────────────────────────────────────────────────────────────
// Pre-populate with test users so labs work immediately without registration.

const seedUsers = [
  { username: 'alice',   email: 'alice@example.com',   password: 'Password123!', role: 'admin'  },
  { username: 'bob',     email: 'bob@example.com',     password: 'Password456!', role: 'user'   },
  { username: 'charlie', email: 'charlie@example.com', password: 'Password789!', role: 'viewer' },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, email, password_hash, role)
  VALUES (?, ?, ?, ?)
`);

// Use a transaction for atomic seed — all or nothing
const seedTransaction = db.transaction(() => {
  for (const user of seedUsers) {
    // bcryptjs.hashSync is fine for seed data; in routes we use async
    const hash = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.username, user.email, hash, user.role);
  }
});

// Only seed if users table is empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  seedTransaction();
  console.log('[DB] Seeded 3 test users: alice (admin), bob (user), charlie (viewer)');
}

// ── Prepared Statements (Performance) ────────────────────────────────────────
// Preparing statements once and reusing them is significantly faster than
// preparing on each call. At Google scale, this matters for high-RPM endpoints.

const statements = {
  // Users
  findUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findUserByEmail:    db.prepare('SELECT * FROM users WHERE email = ?'),
  findUserById:       db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?'),
  createUser:         db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'),

  // Sessions
  createSession:      db.prepare('INSERT INTO sessions (user_id, session_id, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)'),
  findSession:        db.prepare('SELECT * FROM sessions WHERE session_id = ? AND expires_at > datetime(\'now\')'),
  deleteSession:      db.prepare('DELETE FROM sessions WHERE session_id = ?'),
  deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),

  // Refresh Tokens
  createRefreshToken:   db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, device_id, ip, expires_at) VALUES (?, ?, ?, ?, ?)'),
  findRefreshToken:     db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime(\'now\')'),
  revokeRefreshToken:   db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?'),
  revokeAllUserTokens:  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?'),
  revokeDeviceTokens:   db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND device_id = ?'),
  getUserRefreshTokens: db.prepare('SELECT id, device_id, ip, created_at, expires_at, revoked FROM refresh_tokens WHERE user_id = ?'),

  // XSS Comments
  getComments:    db.prepare('SELECT * FROM xss_comments ORDER BY created_at DESC LIMIT 50'),
  addComment:     db.prepare('INSERT INTO xss_comments (username, comment) VALUES (?, ?)'),
  clearComments:  db.prepare('DELETE FROM xss_comments'),

  // WebAuthn
  createWebAuthnCred:   db.prepare('INSERT INTO webauthn_creds (user_id, credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)'),
  findWebAuthnCred:     db.prepare('SELECT * FROM webauthn_creds WHERE credential_id = ?'),
  getUserWebAuthnCreds: db.prepare('SELECT * FROM webauthn_creds WHERE user_id = ?'),
  updateWebAuthnCounter: db.prepare('UPDATE webauthn_creds SET counter = ? WHERE credential_id = ?'),

  // OAuth Codes
  createOAuthCode: db.prepare('INSERT INTO oauth_codes (code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, state, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  findOAuthCode:   db.prepare('SELECT * FROM oauth_codes WHERE code = ? AND used = 0 AND expires_at > datetime(\'now\')'),
  markOAuthCodeUsed: db.prepare('UPDATE oauth_codes SET used = 1 WHERE code = ?'),

  // Audit Log
  logEvent: db.prepare('INSERT INTO audit_log (event, user_id, ip, details) VALUES (?, ?, ?, ?)'),
  getAuditLog: db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100'),
};

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = { db, statements };
