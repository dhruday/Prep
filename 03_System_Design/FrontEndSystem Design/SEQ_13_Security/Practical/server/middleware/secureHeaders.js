// ─────────────────────────────────────────────────────────────────────────────
// middleware/secureHeaders.js — Security Headers Middleware
// ─────────────────────────────────────────────────────────────────────────────
// Sets essential HTTP security headers. Each header is explained with:
//   - What it does
//   - What attack it prevents
//   - Browser behavior details
//   - Google-scale considerations
//
// In production: use Helmet.js which handles all of these.
// Here we implement them manually so you understand what each does.
// ─────────────────────────────────────────────────────────────────────────────

function secureHeaders(options = {}) {
  return (req, res, next) => {
    // ── HSTS (HTTP Strict Transport Security) ────────────────────────────
    // Forces browser to ONLY use HTTPS for this domain.
    // max-age=31536000 = 1 year. includeSubDomains covers *.domain.com.
    // preload: submit to hstspreload.org to be hardcoded in browser.
    // CRITICAL: Once set, you CANNOT revert to HTTP without waiting max-age.
    if (options.hsts !== false) {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // ── X-Content-Type-Options ───────────────────────────────────────────
    // Prevents browser from MIME-sniffing a response away from declared type.
    // Without this: a file served as text/plain could be executed as JS
    // if browser "sniffs" it as application/javascript.
    // Attack: upload a .jpg that's actually JS → browser executes it.
    res.set('X-Content-Type-Options', 'nosniff');

    // ── X-Frame-Options ──────────────────────────────────────────────────
    // Controls whether your page can be loaded in an iframe.
    // DENY: never. SAMEORIGIN: only same domain.
    // Modern replacement: CSP frame-ancestors (more flexible).
    // Both should be set for backward compatibility.
    if (options.frameOptions !== false) {
      res.set('X-Frame-Options', options.frameOptions || 'DENY');
    }

    // ── X-XSS-Protection ────────────────────────────────────────────────
    // DEPRECATED — disable entirely. The browser XSS filter had bugs that
    // actually INTRODUCED vulnerabilities (XSS Auditor attacks).
    // Chrome removed it in 2019. Set to 0 to ensure it's off.
    res.set('X-XSS-Protection', '0');

    // ── Referrer-Policy ──────────────────────────────────────────────────
    // Controls how much of the URL is sent in the Referer header.
    // strict-origin-when-cross-origin: send full URL on same-origin,
    // only origin on cross-origin (HTTPS→HTTPS), nothing on downgrade.
    // Prevents leaking URL paths/query params to third parties.
    res.set('Referrer-Policy', options.referrerPolicy || 'strict-origin-when-cross-origin');

    // ── Permissions-Policy ───────────────────────────────────────────────
    // Controls which browser features your page can use.
    // Prevents embedded iframes from accessing camera, mic, geolocation etc.
    // Previously called Feature-Policy.
    res.set('Permissions-Policy',
      options.permissionsPolicy ||
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
    );

    // ── Cross-Origin-Resource-Policy (CORP) ──────────────────────────────
    // Controls WHO can load your resources (images, scripts, etc.)
    // same-origin: only your origin. same-site: your site (incl. subdomains).
    // cross-origin: anyone (needed if you serve public assets).
    if (options.corp !== false) {
      res.set('Cross-Origin-Resource-Policy', options.corp || 'same-origin');
    }

    // ── Cross-Origin-Embedder-Policy (COEP) ──────────────────────────────
    // require-corp: all sub-resources must have CORP header or CORS.
    // Enables SharedArrayBuffer and high-resolution timers.
    // Needed for WebAssembly threads, OffscreenCanvas, etc.
    if (options.coep) {
      res.set('Cross-Origin-Embedder-Policy', 'require-corp');
    }

    // ── Cross-Origin-Opener-Policy (COOP) ────────────────────────────────
    // Isolates your browsing context from cross-origin popups.
    // same-origin: your window can't be referenced by cross-origin windows.
    // Required (with COEP) for cross-origin isolation.
    if (options.coop) {
      res.set('Cross-Origin-Opener-Policy', 'same-origin');
    }

    next();
  };
}

// ── Preset Configurations ────────────────────────────────────────────────────

// Maximum security (everything locked down)
const secureHeadersStrict = secureHeaders({
  hsts: true,
  frameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  corp: 'same-origin',
  coep: true,
  coop: true,
});

// Balanced (allows embedding, cross-origin resources)
const secureHeadersBalanced = secureHeaders({
  hsts: true,
  frameOptions: 'SAMEORIGIN',
  referrerPolicy: 'strict-origin-when-cross-origin',
  corp: 'cross-origin',
});

// Minimal (only essential headers — for APIs)
const secureHeadersMinimal = secureHeaders({
  hsts: true,
  frameOptions: false,
  corp: false,
});

module.exports = {
  secureHeaders,
  secureHeadersStrict,
  secureHeadersBalanced,
  secureHeadersMinimal,
};
