// ─────────────────────────────────────────────────────────────────────────────
// middleware/corsConfig.js — Dynamic CORS Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Implements multiple CORS strategies to demonstrate in labs:
//   1. Strict whitelist (production-safe)
//   2. Dynamic origin matching (regex-based)
//   3. Wide-open (deliberately insecure, for demonstrating vulnerabilities)
//   4. Credentials-aware (Access-Control-Allow-Credentials)
//
// Google interview insight:
//   "CORS doesn't protect the server — it protects the USER."
//   → CORS is enforced by the BROWSER, not the server
//   → Server just tells browser what's allowed via response headers
//   → Without CORS, SOP blocks reading cross-origin responses
//   → With wildcard + credentials: browser REFUSES (spec violation)
// ─────────────────────────────────────────────────────────────────────────────

const cors = require('cors');

// ── Allowed Origins ──────────────────────────────────────────────────────────
const WHITELIST = new Set([
  'http://localhost:3001',   // Main server
  'http://localhost:3002',   // Attacker origin for CORS demos
  'http://localhost:5500',   // VS Code Live Server
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'null',                     // file:// origins send "null"
]);

// ── Strategy 1: Strict Whitelist (Recommended for Production) ────────────────
const strictCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, curl, Postman)
    if (!origin) return callback(null, true);
    if (WHITELIST.has(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: Origin ${origin} not in whitelist`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // Preflight cache: 24 hours
});

// ── Strategy 2: Dynamic Origin (Regex-based) ────────────────────────────────
// Use case: multi-tenant apps where origins are *.company.com
const dynamicCors = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Allow any localhost port (for development)
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow *.example.com subdomains
    if (/^https:\/\/[\w-]+\.example\.com$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  maxAge: 86400,
});

// ── Strategy 3: Wide Open (INSECURE — for demo only) ────────────────────────
// WARNING: Reflects any origin back. This is a real vulnerability.
// Used in labs to show what NOT to do.
const insecureCors = cors({
  origin: true,       // Reflects the request Origin header
  credentials: true,  // Combined with reflected origin = dangerous
});

// ── Strategy 4: No Credentials ───────────────────────────────────────────────
// Wildcard origin is only safe when credentials are NOT included.
// Browser blocks wildcard + credentials combination.
const publicCors = cors({
  origin: '*',
  credentials: false,
  methods: ['GET'],
  maxAge: 86400,
});

// ── Custom CORS Handler (for labs that need manual header control) ────────────
function manualCors(options = {}) {
  return (req, res, next) => {
    const origin = req.headers.origin;

    // Preflight
    if (req.method === 'OPTIONS') {
      if (origin && (options.allowAll || WHITELIST.has(origin))) {
        res.set('Access-Control-Allow-Origin', options.allowAll ? origin : origin);
        res.set('Access-Control-Allow-Methods', options.methods || 'GET,POST,PUT,DELETE');
        res.set('Access-Control-Allow-Headers', options.headers || 'Content-Type,Authorization,X-CSRF-Token');
        res.set('Access-Control-Max-Age', String(options.maxAge || 86400));
        if (options.credentials) {
          res.set('Access-Control-Allow-Credentials', 'true');
        }
      }
      return res.status(204).end();
    }

    // Actual request
    if (origin && (options.allowAll || WHITELIST.has(origin))) {
      res.set('Access-Control-Allow-Origin', options.allowAll ? origin : origin);
      if (options.credentials) {
        res.set('Access-Control-Allow-Credentials', 'true');
      }
      if (options.exposeHeaders) {
        res.set('Access-Control-Expose-Headers', options.exposeHeaders);
      }
    }

    next();
  };
}

module.exports = {
  strictCors,
  dynamicCors,
  insecureCors,
  publicCors,
  manualCors,
  WHITELIST,
};
