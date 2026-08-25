/**
 * COOKIE DEEP DIVE — Hands-On Practice Server
 * Run: node server.js
 * Open: http://localhost:3000
 *
 * Covers:
 *  1. HttpOnly + Secure + SameSite session cookie
 *  2. CSRF double-submit pattern
 *  3. Signed cookie (tamper detection)
 *  4. Cookie consent simulation
 *  5. Cookie eviction / deletion
 */

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ─── In-memory stores (no DB needed for practice) ───────────────────────────
const sessions = new Map();   // sessionId → { userId, role, createdAt }
const users = {               // fake user db
  "alice@example.com": { id: 1, name: "Alice", password: "pass123", role: "admin" },
  "bob@example.com":   { id: 2, name: "Bob",   password: "pass456", role: "user"  },
};

const COOKIE_SECRET = "super-secret-hmac-key-change-in-prod";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Parse the Cookie request header into a plain object */
function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((acc, pair) => {
    const idx = pair.indexOf("=");
    if (idx < 0) return acc;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    acc[key] = val;
    return acc;
  }, {});
}

/** Build a Set-Cookie header string */
function buildSetCookie(name, value, opts = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (opts.path)     cookie += `; Path=${opts.path}`;
  if (opts.maxAge != null) cookie += `; Max-Age=${opts.maxAge}`;
  if (opts.domain)   cookie += `; Domain=${opts.domain}`;
  if (opts.httpOnly) cookie += `; HttpOnly`;
  if (opts.secure)   cookie += `; Secure`;
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.partitioned) cookie += `; Partitioned`;
  return cookie;
}

/** Sign a value with HMAC-SHA256 */
function sign(value) {
  const sig = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(value)
    .digest("base64url");
  return `${value}.${sig}`;
}

/** Verify and unsign — returns original value or null */
function unsign(signed) {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot < 0) return null;
  const value = signed.slice(0, lastDot);
  const expected = sign(value);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signed.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signed))) return null;
  return value;
}

/** Parse JSON body from request */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

/** Send JSON response */
function json(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

/** GET / — serve index.html */
function handleRoot(req, res) {
  const filePath = path.join(__dirname, "index.html");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end("Could not read index.html");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
}

/**
 * POST /api/login
 * Sets HttpOnly session cookie + non-HttpOnly CSRF cookie
 *
 * PRACTICE: Inspect Set-Cookie headers in DevTools → Network tab.
 *           Notice the session cookie is invisible in Application → Cookies
 *           because it is HttpOnly (you still see it listed but JS cannot read it).
 */
async function handleLogin(req, res) {
  const { email, password } = await parseBody(req);
  const user = users[email];

  if (!user || user.password !== password) {
    return json(res, 401, { error: "Invalid credentials" });
  }

  const sessionId = generateId();
  sessions.set(sessionId, {
    userId: user.id,
    name: user.name,
    role: user.role,
    createdAt: Date.now(),
  });

  const csrfToken = generateId(16);

  // Signed session cookie: tamper-evident, server verifies signature
  const signedSessionId = sign(sessionId);

  const setCookies = [
    // 1. HttpOnly session cookie — XSS cannot steal this
    buildSetCookie("sid", signedSessionId, {
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
      httpOnly: true,
      secure: false,   // NOTE: set true in production (HTTPS). false here for localhost HTTP practice.
      sameSite: "Lax",
    }),
    // 2. CSRF token — NOT HttpOnly so client JS can read it
    buildSetCookie("csrf-token", csrfToken, {
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
      httpOnly: false,  // Intentional: client must read for double-submit
      secure: false,
      sameSite: "Strict",
    }),
    // 3. A "preference" cookie — long-lived, accessible to JS
    buildSetCookie("prefs", JSON.stringify({ theme: "dark", lang: "en" }), {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    }),
  ];

  json(res, 200, { message: `Welcome, ${user.name}!`, role: user.role }, {
    "Set-Cookie": setCookies,
  });
}

/**
 * POST /api/logout
 * Destroys session and clears all cookies
 */
function handleLogout(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const rawSigned = cookies["sid"];

  if (rawSigned) {
    const sessionId = unsign(rawSigned);
    if (sessionId) sessions.delete(sessionId);
  }

  // Delete cookies by setting Max-Age=0
  const clearCookies = [
    buildSetCookie("sid", "", { path: "/", maxAge: 0, httpOnly: true, secure: false, sameSite: "Lax" }),
    buildSetCookie("csrf-token", "", { path: "/", maxAge: 0, httpOnly: false, secure: false, sameSite: "Strict" }),
    buildSetCookie("prefs", "", { path: "/", maxAge: 0, httpOnly: false, secure: false, sameSite: "Lax" }),
  ];

  json(res, 200, { message: "Logged out" }, { "Set-Cookie": clearCookies });
}

/**
 * GET /api/me
 * Returns current user info — protected by session cookie
 *
 * PRACTICE: Try calling this without logging in → 401
 *           Try modifying the cookie value in DevTools → 401 (signature fails)
 */
function handleMe(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const rawSigned = cookies["sid"];

  if (!rawSigned) {
    return json(res, 401, { error: "No session cookie — please log in" });
  }

  const sessionId = unsign(rawSigned);
  if (!sessionId) {
    return json(res, 401, { error: "Cookie signature invalid — possible tampering detected!" });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return json(res, 401, { error: "Session not found or expired" });
  }

  const age = Date.now() - session.createdAt;
  if (age > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return json(res, 401, { error: "Session expired" });
  }

  json(res, 200, {
    userId: session.userId,
    name: session.name,
    role: session.role,
    sessionAgeSeconds: Math.floor(age / 1000),
    cookiesReceived: Object.keys(cookies),         // Which cookies the server sees
    note: "Notice 'sid' is present but 'prefs' and 'csrf-token' are also here",
  });
}

/**
 * POST /api/transfer
 * Simulates a state-changing action protected by CSRF double-submit
 *
 * PRACTICE: Remove the X-CSRF-Token header in the fetch call in index.html → 403
 *           Try sending a wrong token → 403
 *           Valid flow: cookie token === header token → 200
 */
async function handleTransfer(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const cookieCsrf  = cookies["csrf-token"];
  const headerCsrf  = req.headers["x-csrf-token"];

  // ── CSRF validation ──────────────────────────────────────────────────────
  if (!cookieCsrf || !headerCsrf || cookieCsrf !== headerCsrf) {
    return json(res, 403, {
      error: "CSRF validation failed",
      detail: "Cookie token and X-CSRF-Token header must match",
      receivedCookieToken: cookieCsrf || "(missing)",
      receivedHeaderToken: headerCsrf || "(missing)",
    });
  }

  // ── Session validation ───────────────────────────────────────────────────
  const rawSigned = cookies["sid"];
  if (!rawSigned || !unsign(rawSigned)) {
    return json(res, 401, { error: "Not authenticated" });
  }

  const { to, amount } = await parseBody(req);
  json(res, 200, {
    message: `Transfer of $${amount} to ${to} completed successfully`,
    csrfValidation: "PASSED ✓",
  });
}

/**
 * GET /api/cookies/debug
 * Shows all cookies the server received — educational endpoint
 */
function handleCookieDebug(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const rawSigned = cookies["sid"];
  const signatureStatus = rawSigned ? (unsign(rawSigned) ? "VALID ✓" : "INVALID — TAMPERED ✗") : "NOT PRESENT";

  json(res, 200, {
    rawCookieHeader: req.headers.cookie || "(no Cookie header)",
    parsed: cookies,
    signatureCheck: signatureStatus,
    activeSessions: sessions.size,
    note: "HttpOnly cookies ARE sent to the server — they are just hidden from JS",
  });
}

/**
 * POST /api/cookies/set-partitioned
 * Demonstrates the Partitioned / CHIPS attribute
 * (Only meaningful in cross-site iframe context — shows the header)
 */
function handleSetPartitioned(req, res) {
  const cookie = buildSetCookie("__Host-widget", generateId(8), {
    path: "/",
    maxAge: 3600,
    httpOnly: false,
    secure: false,   // Would be true in production
    sameSite: "None",
    partitioned: true,
  });

  json(res, 200, {
    message: "Partitioned cookie set (CHIPS)",
    setCookieHeader: cookie,
    explanation: "This cookie is keyed by top-level site. If embedded on site-a.com and site-b.com, they get different cookie jars — no cross-site tracking.",
  }, { "Set-Cookie": [cookie] });
}

// ─── Router ─────────────────────────────────────────────────────────────────
const routes = {
  "GET /":                          handleRoot,
  "GET /api/me":                    handleMe,
  "GET /api/cookies/debug":         handleCookieDebug,
  "POST /api/login":                handleLogin,
  "POST /api/logout":               handleLogout,
  "POST /api/transfer":             handleTransfer,
  "POST /api/cookies/set-partitioned": handleSetPartitioned,
};

const server = http.createServer(async (req, res) => {
  // CORS for local practice
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const key = `${req.method} ${req.url.split("?")[0]}`;
  const handler = routes[key];

  if (handler) {
    try {
      await handler(req, res);
    } catch (err) {
      json(res, 500, { error: "Internal server error", detail: err.message });
    }
  } else {
    json(res, 404, { error: `Route not found: ${key}` });
  }
});

server.listen(3000, () => {
  console.log("─────────────────────────────────────────────");
  console.log("  Cookie Practice Server running on :3000");
  console.log("  Open → http://localhost:3000");
  console.log("─────────────────────────────────────────────");
  console.log("  Test users:");
  console.log("    alice@example.com / pass123  (admin)");
  console.log("    bob@example.com   / pass456  (user)");
  console.log("─────────────────────────────────────────────");
});
