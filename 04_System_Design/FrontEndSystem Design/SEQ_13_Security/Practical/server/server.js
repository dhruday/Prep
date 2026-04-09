// ─────────────────────────────────────────────────────────────────────────────
// server.js — Main Entry Point for Security Labs Server
// ─────────────────────────────────────────────────────────────────────────────
// Single Express server serving:
//   1. API endpoints for all security labs (13 route modules)
//   2. Static HTML files from the lab directories
//   3. Attacker origin on port 3002 for CORS/CSRF cross-origin demos
//
// Start: npm start | npm run dev (with file watching)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

// ── Initialize Express App ───────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;
const ATTACKER_PORT = 3002;

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── CORS (applied globally with permissive settings for labs) ────────────────
// Individual route files use more specific CORS for their demos
const { strictCors } = require('./middleware/corsConfig');
app.use(strictCors);

// ── Secure Headers (balanced preset for static files) ────────────────────────
const { secureHeadersBalanced } = require('./middleware/secureHeaders');
// Don't apply globally — some labs need specific header configurations
// app.use(secureHeadersBalanced);

// ── CSP Violation Report Endpoint ────────────────────────────────────────────
const { cspReportHandler, getCspViolations } = require('./middleware/csp');
app.post('/api/csp/report', express.json({ type: 'application/csp-report' }), cspReportHandler);
app.post('/api/csp/report', express.json({ type: 'application/json' }), cspReportHandler);
app.get('/api/csp/violations', (req, res) => res.json(getCspViolations()));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/xss',           require('./routes/xss'));
app.use('/api/csrf',          require('./routes/csrf'));
app.use('/api/cors',          require('./routes/cors'));
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/jwt',           require('./routes/jwt'));
app.use('/api/oauth',         require('./routes/oauth'));
app.use('/api/sensitive',     require('./routes/sensitive'));
app.use('/api/secure',        require('./routes/apiSecure'));
app.use('/api/clickjack',     require('./routes/clickjack'));
app.use('/api/refresh',       require('./routes/tokenRefresh'));
app.use('/api/sri',           require('./routes/sri'));
app.use('/api/webauthn',      require('./routes/webauthn'));

// ── Audit Log Endpoint ──────────────────────────────────────────────────────
const { statements } = require('./db');
app.get('/api/audit', (req, res) => {
  res.json(statements.getAuditLog.all());
});

// ── Static File Serving (Lab HTML Files) ─────────────────────────────────────
// Serve all HTML labs from the parent Practical/ directory
const practicalDir = path.join(__dirname, '..');
app.use('/labs', express.static(practicalDir, {
  extensions: ['html'],
  index: false,
}));

// ── Index Page (Lab Directory) ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Labs — Google Senior Frontend Prep</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0f1117; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
        h1 { font-size: 28px; color: #60a5fa; margin-bottom: 8px; }
        .sub { color: #94a3b8; margin-bottom: 32px; }
        .module { margin-bottom: 32px; }
        .module h2 { color: #f59e0b; font-size: 18px; margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 8px; }
        .topics { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
        .topic { background: #1a1b26; border: 1px solid #2d2d3d; border-radius: 8px; padding: 16px; }
        .topic h3 { font-size: 14px; margin-bottom: 8px; }
        .topic a { color: #60a5fa; text-decoration: none; font-size: 13px; display: block; padding: 2px 0; }
        .topic a:hover { color: #93bbfc; text-decoration: underline; }
        .status { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .status.server { background: #22c55e; }
        .status.client { background: #f59e0b; }
        .legend { display: flex; gap: 16px; margin-bottom: 24px; font-size: 13px; color: #94a3b8; }
        .api-test { background: #1e293b; border-radius: 8px; padding: 16px; margin-top: 24px; }
        .api-test h3 { color: #22c55e; font-size: 14px; margin-bottom: 8px; }
        code { background: #0d1117; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
        .quick-test { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
        .btn { background: #1e40af; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .btn:hover { background: #2563eb; }
        #output { background: #0d1117; padding: 12px; border-radius: 6px; margin-top: 12px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; display: none; }
      </style>
    </head><body>
      <div class="container">
        <h1>🔐 Security Labs — Hands-On Practice</h1>
        <p class="sub">Google Senior Frontend Interview Prep · Real Express Server + Redis + SQLite</p>

        <div class="legend">
          <span><span class="status server"></span>Requires server (localhost:3001)</span>
          <span><span class="status client"></span>Client-side only</span>
        </div>

        <div class="module">
          <h2>📦 Module 12.1 — Web Threats</h2>
          <div class="topics">
            <div class="topic">
              <h3>01 · XSS (Cross-Site Scripting)</h3>
              <a href="/labs/12.1_Web_Threats/01_XSS/01_Reflected_XSS.html"><span class="status server"></span>01 Reflected XSS</a>
              <a href="/labs/12.1_Web_Threats/01_XSS/02_Stored_XSS.html"><span class="status server"></span>02 Stored XSS</a>
              <a href="/labs/12.1_Web_Threats/01_XSS/03_DOM_Based_XSS.html"><span class="status client"></span>03 DOM-Based XSS</a>
              <a href="/labs/12.1_Web_Threats/01_XSS/04_XSS_Sanitization_DOMPurify.html"><span class="status client"></span>04 Sanitization (DOMPurify)</a>
              <a href="/labs/12.1_Web_Threats/01_XSS/05_CSP_Nonce_XSS_Prevention.html"><span class="status server"></span>05 CSP Nonce XSS Prevention</a>
              <a href="/labs/12.1_Web_Threats/01_XSS/06_Trusted_Types.html"><span class="status client"></span>06 Trusted Types</a>
              <a href="/labs/12.1_Web_Threats/01_XSS/07_Double_Encoding_Attack.html"><span class="status server"></span>07 Double Encoding Attack</a>
            </div>
            <div class="topic">
              <h3>02 · CSRF (Cross-Site Request Forgery)</h3>
              <a href="/labs/12.1_Web_Threats/02_CSRF/01_CSRF_Attack_Mechanics.html"><span class="status server"></span>01 CSRF Attack Mechanics</a>
              <a href="/labs/12.1_Web_Threats/02_CSRF/02_CSRF_Token_Patterns.html"><span class="status server"></span>02 CSRF Token Patterns</a>
              <a href="/labs/12.1_Web_Threats/02_CSRF/03_SameSite_Cookie_Defense.html"><span class="status server"></span>03 SameSite Cookie Defense</a>
              <a href="/labs/12.1_Web_Threats/02_CSRF/04_CSRF_in_SPAs.html"><span class="status server"></span>04 CSRF in SPAs</a>
              <a href="/labs/12.1_Web_Threats/02_CSRF/05_CSRF_CORS_Interplay.html"><span class="status server"></span>05 CSRF/CORS Interplay</a>
            </div>
            <div class="topic">
              <h3>03 · CORS (Cross-Origin Resource Sharing)</h3>
              <a href="/labs/12.1_Web_Threats/03_CORS/01_CORS_Fundamentals.html"><span class="status server"></span>01 CORS Fundamentals</a>
              <a href="/labs/12.1_Web_Threats/03_CORS/02_Preflight_Deep_Dive.html"><span class="status server"></span>02 Preflight Deep Dive</a>
              <a href="/labs/12.1_Web_Threats/03_CORS/03_CORS_Misconfigurations.html"><span class="status server"></span>03 CORS Misconfigurations</a>
              <a href="/labs/12.1_Web_Threats/03_CORS/04_Credentialed_CORS.html"><span class="status server"></span>04 Credentialed CORS</a>
              <a href="/labs/12.1_Web_Threats/03_CORS/05_CORS_Microservices.html"><span class="status server"></span>05 CORS Microservices</a>
              <a href="/labs/12.1_Web_Threats/03_CORS/06_CORS_Debugging_Toolkit.html"><span class="status server"></span>06 CORS Debugging Toolkit</a>
            </div>
            <div class="topic">
              <h3>04 · Prototype Pollution</h3>
              <a href="/labs/12.1_Web_Threats/04_Prototype_Pollution/01_Prototype_Pollution_Basics.html"><span class="status client"></span>01 Prototype Pollution Basics</a>
              <a href="/labs/12.1_Web_Threats/04_Prototype_Pollution/02_Pollution_to_XSS.html"><span class="status client"></span>02 Pollution to XSS</a>
              <a href="/labs/12.1_Web_Threats/04_Prototype_Pollution/03_Safe_Merge_Patterns.html"><span class="status client"></span>03 Safe Merge Patterns</a>
              <a href="/labs/12.1_Web_Threats/04_Prototype_Pollution/04_Freeze_and_Null_Proto.html"><span class="status client"></span>04 Freeze & Null Proto</a>
              <a href="/labs/12.1_Web_Threats/04_Prototype_Pollution/05_Server_Side_Pollution.html"><span class="status client"></span>05 Server-Side Pollution</a>
              <a href="/labs/12.1_Web_Threats/04_Prototype_Pollution/06_Detecting_Pollution.html"><span class="status client"></span>06 Detecting Pollution</a>
            </div>
            <div class="topic">
              <h3>05 · Supply Chain Attacks</h3>
              <a href="/labs/12.1_Web_Threats/05_Supply_Chain/01_npm_Supply_Chain_Attacks.html"><span class="status client"></span>01 npm Supply Chain Attacks</a>
              <a href="/labs/12.1_Web_Threats/05_Supply_Chain/02_Dependency_Confusion.html"><span class="status server"></span>02 Dependency Confusion</a>
              <a href="/labs/12.1_Web_Threats/05_Supply_Chain/03_Lockfile_Integrity.html"><span class="status client"></span>03 Lockfile Integrity</a>
              <a href="/labs/12.1_Web_Threats/05_Supply_Chain/04_npm_Audit_Scanning.html"><span class="status client"></span>04 npm Audit Scanning</a>
              <a href="/labs/12.1_Web_Threats/05_Supply_Chain/05_Secure_CICD_Pipeline.html"><span class="status client"></span>05 Secure CI/CD Pipeline</a>
            </div>
          </div>
        </div>

        <div class="module">
          <h2>🔑 Module 12.2 — Auth & Tokens</h2>
          <div class="topics">
            <div class="topic">
              <h3>06 · Authentication Flows</h3>
              <a href="/labs/12.2_Auth_Tokens/06_Authentication_Flows/01_Session_vs_Token.html"><span class="status server"></span>01 Session vs Token</a>
              <a href="/labs/12.2_Auth_Tokens/06_Authentication_Flows/02_Cookie_Security_Attributes.html"><span class="status server"></span>02 Cookie Security Attributes</a>
              <a href="/labs/12.2_Auth_Tokens/06_Authentication_Flows/03_Secure_Login_Flow.html"><span class="status server"></span>03 Secure Login Flow</a>
              <a href="/labs/12.2_Auth_Tokens/06_Authentication_Flows/04_Multi_Factor_Auth.html"><span class="status server"></span>04 Multi-Factor Auth</a>
              <a href="/labs/12.2_Auth_Tokens/06_Authentication_Flows/05_Session_Fixation_Hijacking.html"><span class="status server"></span>05 Session Fixation/Hijacking</a>
              <a href="/labs/12.2_Auth_Tokens/06_Authentication_Flows/06_Password_Security_Hashing.html"><span class="status server"></span>06 Password Security</a>
            </div>
            <div class="topic">
              <h3>07 · Token Storage</h3>
              <a href="/labs/12.2_Auth_Tokens/07_Token_Storage/01_Token_Storage_Comparison.html"><span class="status server"></span>01 Token Storage Comparison</a>
              <a href="/labs/12.2_Auth_Tokens/07_Token_Storage/02_In_Memory_Token_Pattern.html"><span class="status client"></span>02 In-Memory Token Pattern</a>
              <a href="/labs/12.2_Auth_Tokens/07_Token_Storage/03_HttpOnly_BFF_Pattern.html"><span class="status server"></span>03 HttpOnly BFF Pattern</a>
              <a href="/labs/12.2_Auth_Tokens/07_Token_Storage/04_Web_Crypto_Encryption.html"><span class="status server"></span>04 Web Crypto Encryption</a>
              <a href="/labs/12.2_Auth_Tokens/07_Token_Storage/05_Cross_Tab_Sync.html"><span class="status client"></span>05 Cross-Tab Sync</a>
            </div>
            <div class="topic">
              <h3>08 · OAuth 2.0</h3>
              <a href="/labs/12.2_Auth_Tokens/08_OAuth/01_Authorization_Code_Flow.html"><span class="status server"></span>01 Authorization Code Flow</a>
              <a href="/labs/12.2_Auth_Tokens/08_OAuth/02_PKCE_Deep_Dive.html"><span class="status server"></span>02 PKCE Deep Dive</a>
              <a href="/labs/12.2_Auth_Tokens/08_OAuth/03_OAuth_Vulnerabilities.html"><span class="status server"></span>03 OAuth Vulnerabilities</a>
              <a href="/labs/12.2_Auth_Tokens/08_OAuth/04_OpenID_Connect.html"><span class="status server"></span>04 OpenID Connect</a>
              <a href="/labs/12.2_Auth_Tokens/08_OAuth/05_OAuth_SPA_Best_Practices.html"><span class="status server"></span>05 OAuth SPA Best Practices</a>
            </div>
            <div class="topic">
              <h3>09 · JWT Deep Dive</h3>
              <a href="/labs/12.2_Auth_Tokens/09_JWT_Deep_Dive/01_JWT_Structure_Anatomy.html"><span class="status server"></span>01 JWT Structure Anatomy</a>
              <a href="/labs/12.2_Auth_Tokens/09_JWT_Deep_Dive/02_JWT_Signing_Algorithms.html"><span class="status server"></span>02 JWT Signing Algorithms</a>
              <a href="/labs/12.2_Auth_Tokens/09_JWT_Deep_Dive/03_JWT_Attacks_Exploits.html"><span class="status server"></span>03 JWT Attacks & Exploits</a>
              <a href="/labs/12.2_Auth_Tokens/09_JWT_Deep_Dive/04_JWT_Revocation.html"><span class="status server"></span>04 JWT Revocation</a>
              <a href="/labs/12.2_Auth_Tokens/09_JWT_Deep_Dive/05_JWKS_Key_Rotation.html"><span class="status server"></span>05 JWKS Key Rotation</a>
              <a href="/labs/12.2_Auth_Tokens/09_JWT_Deep_Dive/06_JWT_Best_Practices.html"><span class="status server"></span>06 JWT Best Practices</a>
            </div>
            <div class="topic">
              <h3>10 · Passkeys & WebAuthn</h3>
              <a href="/labs/12.2_Auth_Tokens/10_Passkeys_WebAuthn/01_WebAuthn_Fundamentals.html"><span class="status server"></span>01 WebAuthn Fundamentals</a>
              <a href="/labs/12.2_Auth_Tokens/10_Passkeys_WebAuthn/02_Passkey_Registration.html"><span class="status server"></span>02 Passkey Registration</a>
              <a href="/labs/12.2_Auth_Tokens/10_Passkeys_WebAuthn/03_Passkey_Authentication.html"><span class="status client"></span>03 Passkey Authentication</a>
              <a href="/labs/12.2_Auth_Tokens/10_Passkeys_WebAuthn/04_Passkey_Security_Analysis.html"><span class="status client"></span>04 Passkey Security Analysis</a>
              <a href="/labs/12.2_Auth_Tokens/10_Passkeys_WebAuthn/05_Passkey_UX_Patterns.html"><span class="status server"></span>05 Passkey UX Patterns</a>
            </div>
          </div>
        </div>

        <div class="module">
          <h2>🛡️ Module 12.3 — Hardening UI</h2>
          <div class="topics">
            <div class="topic">
              <h3>11 · Sensitive UI Data</h3>
              <a href="/labs/12.3_Hardening_UI/11_Sensitive_UI_Data/01_DOM_Data_Exposure.html"><span class="status server"></span>01 DOM Data Exposure</a>
              <a href="/labs/12.3_Hardening_UI/11_Sensitive_UI_Data/02_Autocomplete_Form_Security.html"><span class="status client"></span>02 Autocomplete Form Security</a>
              <a href="/labs/12.3_Hardening_UI/11_Sensitive_UI_Data/03_Console_DevTools_Leaks.html"><span class="status client"></span>03 Console/DevTools Leaks</a>
              <a href="/labs/12.3_Hardening_UI/11_Sensitive_UI_Data/04_Data_Masking_Sanitization.html"><span class="status client"></span>04 Data Masking & Sanitization</a>
              <a href="/labs/12.3_Hardening_UI/11_Sensitive_UI_Data/05_Clipboard_Screenshot_Protection.html"><span class="status client"></span>05 Clipboard/Screenshot Protection</a>
            </div>
            <div class="topic">
              <h3>12 · Secure API Consumption</h3>
              <a href="/labs/12.3_Hardening_UI/12_Secure_API_Consumption/01_Fetch_API_Security.html"><span class="status server"></span>01 Fetch API Security</a>
              <a href="/labs/12.3_Hardening_UI/12_Secure_API_Consumption/02_Input_Validation_Sanitization.html"><span class="status server"></span>02 Input Validation</a>
              <a href="/labs/12.3_Hardening_UI/12_Secure_API_Consumption/03_Rate_Limiting.html"><span class="status server"></span>03 Rate Limiting</a>
              <a href="/labs/12.3_Hardening_UI/12_Secure_API_Consumption/04_HTTPS_Transport_Security.html"><span class="status server"></span>04 HTTPS Transport Security</a>
              <a href="/labs/12.3_Hardening_UI/12_Secure_API_Consumption/05_API_Error_Handling.html"><span class="status server"></span>05 API Error Handling</a>
              <a href="/labs/12.3_Hardening_UI/12_Secure_API_Consumption/06_API_Security_Checklist.html"><span class="status server"></span>06 API Security Checklist</a>
            </div>
            <div class="topic">
              <h3>13 · Clickjacking</h3>
              <a href="/labs/12.3_Hardening_UI/13_Clickjacking/01_Clickjacking_Basics.html"><span class="status server"></span>01 Clickjacking Basics</a>
              <a href="/labs/12.3_Hardening_UI/13_Clickjacking/02_X_Frame_Options.html"><span class="status server"></span>02 X-Frame-Options</a>
              <a href="/labs/12.3_Hardening_UI/13_Clickjacking/03_Frame_Ancestors_CSP.html"><span class="status server"></span>03 frame-ancestors CSP</a>
              <a href="/labs/12.3_Hardening_UI/13_Clickjacking/04_Frame_Busting.html"><span class="status client"></span>04 Frame Busting</a>
              <a href="/labs/12.3_Hardening_UI/13_Clickjacking/05_Advanced_UI_Redressing.html"><span class="status client"></span>05 Advanced UI Redressing</a>
            </div>
            <div class="topic">
              <h3>14 · Content Security Policy</h3>
              <a href="/labs/12.3_Hardening_UI/14_CSP/01_CSP_Fundamentals.html"><span class="status client"></span>01 CSP Fundamentals</a>
              <a href="/labs/12.3_Hardening_UI/14_CSP/02_Nonces_Hashes.html"><span class="status server"></span>02 Nonces & Hashes</a>
              <a href="/labs/12.3_Hardening_UI/14_CSP/03_Report_Only.html"><span class="status client"></span>03 Report-Only Mode</a>
              <a href="/labs/12.3_Hardening_UI/14_CSP/04_CSP_Bypasses.html"><span class="status server"></span>04 CSP Bypasses</a>
              <a href="/labs/12.3_Hardening_UI/14_CSP/05_CSP_SPAs.html"><span class="status server"></span>05 CSP for SPAs</a>
              <a href="/labs/12.3_Hardening_UI/14_CSP/06_CSP_Best_Practices.html"><span class="status client"></span>06 CSP Best Practices</a>
            </div>
            <div class="topic">
              <h3>15 · Secure Headers</h3>
              <a href="/labs/12.3_Hardening_UI/15_Secure_Headers/01_Helmet_Overview.html"><span class="status server"></span>01 Helmet Overview</a>
              <a href="/labs/12.3_Hardening_UI/15_Secure_Headers/02_HSTS_Deep_Dive.html"><span class="status server"></span>02 HSTS Deep Dive</a>
              <a href="/labs/12.3_Hardening_UI/15_Secure_Headers/03_Referrer_Policy.html"><span class="status client"></span>03 Referrer-Policy</a>
              <a href="/labs/12.3_Hardening_UI/15_Secure_Headers/04_Permissions_Policy.html"><span class="status client"></span>04 Permissions-Policy</a>
              <a href="/labs/12.3_Hardening_UI/15_Secure_Headers/05_Cross_Origin_Policies.html"><span class="status server"></span>05 Cross-Origin Policies</a>
              <a href="/labs/12.3_Hardening_UI/15_Secure_Headers/06_Headers_Audit.html"><span class="status server"></span>06 Headers Audit</a>
            </div>
            <div class="topic">
              <h3>16 · Token Refresh</h3>
              <a href="/labs/12.3_Hardening_UI/16_Token_Refresh/01_Refresh_Fundamentals.html"><span class="status server"></span>01 Refresh Fundamentals</a>
              <a href="/labs/12.3_Hardening_UI/16_Token_Refresh/02_Token_Rotation.html"><span class="status server"></span>02 Token Rotation</a>
              <a href="/labs/12.3_Hardening_UI/16_Token_Refresh/03_Silent_Refresh.html"><span class="status server"></span>03 Silent Refresh</a>
              <a href="/labs/12.3_Hardening_UI/16_Token_Refresh/04_Race_Conditions.html"><span class="status client"></span>04 Race Conditions</a>
              <a href="/labs/12.3_Hardening_UI/16_Token_Refresh/05_Multi_Tab_Sync.html"><span class="status server"></span>05 Multi-Tab Sync</a>
              <a href="/labs/12.3_Hardening_UI/16_Token_Refresh/06_Refresh_Best_Practices.html"><span class="status server"></span>06 Refresh Best Practices</a>
            </div>
            <div class="topic">
              <h3>17 · Data Leak Prevention</h3>
              <a href="/labs/12.3_Hardening_UI/17_Data_Leak_Prevention/01_Referrer_URL_Leaks.html"><span class="status client"></span>01 Referrer/URL Leaks</a>
              <a href="/labs/12.3_Hardening_UI/17_Data_Leak_Prevention/02_PostMessage_Security.html"><span class="status client"></span>02 PostMessage Security</a>
              <a href="/labs/12.3_Hardening_UI/17_Data_Leak_Prevention/03_Blob_History_Cache.html"><span class="status client"></span>03 Blob/History/Cache</a>
              <a href="/labs/12.3_Hardening_UI/17_Data_Leak_Prevention/04_Timing_Side_Channels.html"><span class="status server"></span>04 Timing Side Channels</a>
              <a href="/labs/12.3_Hardening_UI/17_Data_Leak_Prevention/05_Storage_Memory_Security.html"><span class="status client"></span>05 Storage/Memory Security</a>
              <a href="/labs/12.3_Hardening_UI/17_Data_Leak_Prevention/06_DLP_Checklist.html"><span class="status client"></span>06 DLP Checklist</a>
            </div>
            <div class="topic">
              <h3>18 · Subresource Integrity</h3>
              <a href="/labs/12.3_Hardening_UI/18_SRI/01_SRI_Fundamentals.html"><span class="status server"></span>01 SRI Fundamentals</a>
              <a href="/labs/12.3_Hardening_UI/18_SRI/02_Hash_Generation.html"><span class="status server"></span>02 Hash Generation</a>
              <a href="/labs/12.3_Hardening_UI/18_SRI/03_CDN_Integrity.html"><span class="status server"></span>03 CDN Integrity</a>
              <a href="/labs/12.3_Hardening_UI/18_SRI/04_Dynamic_Script_SRI.html"><span class="status server"></span>04 Dynamic Script SRI</a>
              <a href="/labs/12.3_Hardening_UI/18_SRI/05_SRI_Build_Integration.html"><span class="status client"></span>05 SRI Build Integration</a>
              <a href="/labs/12.3_Hardening_UI/18_SRI/06_SRI_Monitoring.html"><span class="status server"></span>06 SRI Monitoring</a>
            </div>
          </div>
        </div>

        <div class="api-test">
          <h3>⚡ Quick API Test</h3>
          <p style="font-size:13px;color:#94a3b8;margin-bottom:8px">Verify the server is working by testing these endpoints:</p>
          <div class="quick-test">
            <button class="btn" onclick="testAPI('/api/xss/comments')">XSS Comments</button>
            <button class="btn" onclick="testAPI('/api/cors/simple')">CORS Simple</button>
            <button class="btn" onclick="testAPI('/api/sensitive/user-data/masked')">Masked Data</button>
            <button class="btn" onclick="testAPI('/api/jwt/jwks')">JWKS Keys</button>
            <button class="btn" onclick="testAPI('/api/sri/generate-hash')">SRI Hashes</button>
            <button class="btn" onclick="testAPI('/api/oauth/.well-known/config')">OIDC Config</button>
            <button class="btn" onclick="testAPI('/api/audit')">Audit Log</button>
          </div>
          <pre id="output"></pre>
        </div>
      </div>
      <script>
        async function testAPI(url) {
          const output = document.getElementById('output');
          output.style.display = 'block';
          output.textContent = 'Fetching ' + url + '...';
          try {
            const res = await fetch(url);
            const data = await res.json();
            output.textContent = JSON.stringify(data, null, 2);
          } catch (err) {
            output.textContent = 'Error: ' + err.message;
          }
        }
      </script>
    </body></html>
  `);
});

// ── Start Main Server ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   🔐 Security Labs Server                       ║');
  console.log('  ║                                                  ║');
  console.log('  ║   Main:     http://localhost:' + PORT + '                ║');
  console.log('  ║   Labs:     http://localhost:' + PORT + '/labs            ║');
  console.log('  ║   API:      http://localhost:' + PORT + '/api/*           ║');
  console.log('  ║                                                  ║');
  console.log('  ║   Test users: alice/Password123! (admin)         ║');
  console.log('  ║               bob/Password456! (user)            ║');
  console.log('  ║               charlie/Password789! (viewer)      ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
});

// ── Attacker Origin Server (Port 3002) ───────────────────────────────────────
// A separate Express instance simulating an attacker's website.
// Used for CORS and CSRF cross-origin demos.
const attackerApp = express();
attackerApp.use(express.static(path.join(practicalDir, '12.1_Web_Threats')));
attackerApp.get('/', (req, res) => {
  res.send(`
    <html><body style="background:#1a0000;color:#ef4444;font-family:monospace;padding:20px">
      <h1>☠️ Attacker's Website (Port ${ATTACKER_PORT})</h1>
      <p>This simulates an attacker-controlled domain for CORS/CSRF demos.</p>
      <p>Open the CSRF and CORS lab files from this origin to see cross-origin behavior.</p>
    </body></html>
  `);
});

attackerApp.listen(ATTACKER_PORT, () => {
  console.log(`  [Attacker] http://localhost:${ATTACKER_PORT} (cross-origin demos)`);
});
