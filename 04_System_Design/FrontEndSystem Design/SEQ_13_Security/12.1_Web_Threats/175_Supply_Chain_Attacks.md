# 175. Supply Chain Attacks ★★★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Supply chain attacks** in frontend development are security compromises that target the dependencies, build tools, CDN assets, or third-party scripts your application uses — rather than attacking your code directly. Attackers inject malicious code upstream, so your application unknowingly includes and executes it. The most devastating examples include the **SolarWinds attack** (malicious build system compromise), **event-stream npm package compromise** (malicious code added to a dependency with 2M weekly downloads targeting Bitcoin wallets), **Polyfill.io CDN hijacking** (June 2024 — Polyfill.io domain purchased by Chinese company that served malicious scripts to 100K+ websites), and the **XZ Utils backdoor** (March 2024 — malicious maintainer inserted backdoor in a Linux compression library). For frontend engineers, the critical attack surfaces are: npm packages (your `node_modules`), CDN-hosted third-party scripts (`<script src="cdn.example.com/...">`), and compromised CI/CD systems that modify build artifacts. Defending against supply chain attacks requires **Subresource Integrity (SRI)**, **Content Security Policy (CSP)**, minimal dependency philosophy, and dependency auditing.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Attack Surface Map

```
FRONTEND SUPPLY CHAIN ATTACK SURFACES:
─────────────────────────────────────────────────────────
1. npm packages (node_modules)
   - Malicious package with typosquatting name
   - Legitimate package taken over by malicious actor
   - Dependency of dependency compromise
   
2. CDN-hosted scripts
   - CDN domain compromised (Polyfill.io incident)
   - CDN serves different content than original
   - DNS hijacking of CDN domain

3. CI/CD pipeline
   - Compromised GitHub Action
   - Malicious build tool/plugin
   - Environment variable exfiltration in CI logs

4. Browser extensions
   - Malicious extension modifying DOM of your app
   - Extension injecting keyloggers on your login forms

5. Third-party SaaS scripts
   - Analytics/chat/payment widget compromised at source
   - Magecart card-skimming attacks on payment pages
```

### npm Dependency Attacks — Defense in Depth

```typescript
// package.json lockfile + integrity hashes = first line of defense

// ──── CHECK 1: npm audit ────
// Run in CI: fails build if high/critical vulnerability found
// npm audit --audit-level=high

// ──── CHECK 2: lock exact versions ────
// package-lock.json contains integrity sha512 hash for every package
// Any modification to a published package changes the hash → build fails
// Example from package-lock.json:
// "lodash": {
//   "version": "4.17.21",
//   "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
//   "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZkFeRoSw8cLWhBt/kpA=="
// }

// ──── CHECK 3: Dependency graph minimization ────
// Goal: minimize transitive dependencies
// Bad:  1 feature → 1 package → 40 transitive deps (huge attack surface)
// Good: 1 feature → native API or tiny focused package → 0-3 transitive deps

// ──── CHECK 4: package provenance verification (npm 9.5+) ────
// npm now supports provenance: packages signed with OIDC tokens proving
// they were built from a specific GitHub Actions workflow
// Check: npm info lodash dist.attestations

// ──── CHECK 5: Renovate/Dependabot for automated patch PRs ────
// Automated PRs when dependencies publish security patches
// Ensures you stay current without manual tracking
```

### Subresource Integrity (SRI) — CDN Protection

```html
<!-- ❌ UNSAFE — no integrity check, CDN compromise = XSS -->
<script src="https://cdn.example.com/jquery-3.7.1.min.js"></script>

<!-- ✅ SAFE — browser verifies hash before executing -->
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"
  integrity="sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZkFeRoSw8cLWhBt/kpA=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
></script>

<!-- If CDN serves DIFFERENT content, sha512 hash won't match → script blocked, error in console -->
```

```typescript
// Generate SRI hash for a local file (Node.js utility)
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

function generateSriHash(filePath: string): string {
  const content = readFileSync(filePath);
  const hash = createHash('sha384').update(content).digest('base64');
  return `sha384-${hash}`;
}

// Generate for your own bundled assets too
const mainBundleHash = generateSriHash('./dist/main.bundle.js');
console.log(`integrity="${mainBundleHash}"`);

// Webpack plugin to auto-generate SRI for all output files:
// webpack-subresource-integrity plugin
// Adds integrity attribute to all <script> and <link> tags in generated HTML
```

### Content Security Policy — Script Allowlist

```typescript
// CSP strict-dynamic approach:
// Only scripts with a valid server-issued nonce can execute
// All inline scripts blocked unless they have the nonce
// External scripts only allowed if loaded by a trusted script

// Express middleware to set CSP nonce header
import { randomBytes } from 'crypto';

function cspMiddleware(req: Request, res: Response, next: NextFunction): void {
  const nonce = randomBytes(16).toString('base64');  // Fresh nonce per request
  
  // Store nonce in locals for template rendering
  res.locals.nonce = nonce;
  
  res.setHeader('Content-Security-Policy', [
    `default-src 'self'`,
    `script-src 'strict-dynamic' 'nonce-${nonce}' https:`,
    // strict-dynamic: scripts loaded by trusted (nonce-bearing) scripts are also trusted
    // This enables module bundlers (webpack/vite) to work with CSP
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https:`,
    `connect-src 'self' https://api.yourapp.com`,
    `frame-ancestors 'none'`,  // Prevent clickjacking
    `form-action 'self'`,
    `base-uri 'self'`,
    `report-uri /api/csp-violations`,  // Log violations to backend
  ].join('; '));
  
  next();
}

// HTML template uses nonce:
// <script nonce="{{nonce}}">/* Your inline scripts */</script>
// <script nonce="{{nonce}}" src="/main.bundle.js"></script>
```

### Detecting Malicious npm Packages

```typescript
// Pattern: Postinstall script that runs on npm install — common malware vector
// "scripts": { "postinstall": "node ./malicious.js" }

// Defense: --ignore-scripts flag in CI
// npm ci --ignore-scripts

// Audit for suspicious package names (typosquatting):
const COMMON_TYPOSQUATS = [
  ['lodash', 'lodahs', 'lodas', 'iodash'],
  ['react', 'raect', 'reaxt'],
  ['webpack', 'webpakc'],
  ['express', 'exprss'],
];

// Tool: npm-audit-ci, Socket.dev, Snyk CLI

// Check if a package is recently published with postinstall scripts (suspicious):
// npm view <package> time created scripts.postinstall

// MINIMUM: run these in CI pipeline:
// 1. npm audit --audit-level=high
// 2. Verify package.json has exact-version lock (no ^ or ~)
// 3. Check package-lock.json is committed and up-to-date
// 4. Use Socket.dev GitHub Action for supply chain intelligence
```

### The Polyfill.io Incident (2024) — Lessons

```typescript
// WHAT HAPPENED:
// polyfill.io domain was purchased by a Chinese company in early 2024
// From June 2024, the CDN started serving malicious JavaScript to browsers
// 100,000+ websites were affected
// The malicious script redirected mobile users to gambling/scam sites

// AFFECTED CODE (UNSAFE):
// <script src="https://polyfill.io/v3/polyfill.min.js"></script>

// CORRECT FIX:
// Option 1: Self-host the polyfills (most secure)
// Option 2: Use alternative CDN that you own the hash for:
// <script 
//   src="https://cdnjs.cloudflare.com/polyfills/3.111.0/polyfill.min.js"
//   integrity="sha384-..."
//   crossorigin="anonymous"
// ></script>

// LONGER-TERM FIX: Don't use runtime polyfills at all
// Babel/core-js at build time is safer — compiled into YOUR bundle
// which you control completely

// General rule: NEVER include a CDN script without SRI integrity hash
// If you don't control the CDN domain, you don't control what it serves
```

### CI/CD Pipeline Security

```yaml
# GitHub Actions — Pinned action versions (prevent compromised action updates)
# ❌ UNSAFE — action can be updated to malicious version
- uses: actions/checkout@main

# ✅ SAFE — pinned to exact commit hash
- uses: actions/checkout@v4.1.1@sha256:abc123def456...  # Pin to commit SHA

# ✅ ALSO SAFE — pin to tagged release (trust the maintainer's release process)
- uses: actions/checkout@v4.1.1

# Minimal permissions principle
permissions:
  contents: read     # NOT write unless needed
  id-token: write    # Only if using OIDC for npm provenance

# Never log environment variables
env:
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  # Never: run: echo "Token is $NPM_TOKEN"  ← logs secret in CI output
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**event-stream (2018):**
The `event-stream` npm package (2.4M weekly downloads) was transferred to a malicious actor who added `flatmap-stream` as a dependency. When installed, it searched for an encrypted Bitcoin wallet file and exfiltrated it. The attack targeted specifically the Copay Bitcoin wallet application. Discovered weeks later.

**Polyfill.io (June 2024):**
The polyfill.io CDN domain was sold. The new owners served malicious JavaScript to 100K+ websites. Sites using `<script src="https://polyfill.io/...">` without SRI hashes were immediately compromised. Cloudflare and Fastly launched alternative polyfill CDNs with static content.

**SolarWinds (2020):**
Not frontend-specific but established the supply chain attack playbook: compromise the build system, not the developer's code. The malicious Orion build inserted the backdoor during compile time — the source code was clean, the binary was not.

**Magecart / Card Skimming:**
Multiple attacks (British Airways, Ticketmaster, Newegg) injected card-skimming JavaScript into checkout pages via compromised third-party analytics or chat widget scripts. Client-side JavaScript read credit card field values and exfiltrated to attacker servers.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Supply chain attacks target the weakest link in the dependency chain — your code might be perfect while a dependency 3 levels deep is compromised. My defense strategy has multiple layers. For npm packages: committed package-lock.json with integrity hashes, `npm audit` failing the CI build on high severity, minimal transitive dependencies philosophy, and Snyk or Socket.dev for supply chain intelligence beyond CVE databases. For external CDN scripts: Subresource Integrity on every third-party script tag — if I don't have the SRI hash, I either self-host it or don't include it. The Polyfill.io incident in 2024 hit 100K sites; every single one that had an SRI hash on the script was unaffected. For CI/CD: pinned action versions to exact git SHAs, minimal secrets scope, never echo secrets to logs. And Content-Security Policy as the last defense layer — even if something malicious gets in, a strict CSP prevents data exfiltration to unauthorized domains."

**Follow-up Questions:**
1. *How is the Polyfill.io attack different from a traditional XSS?* → XSS injects script via user-controlled input into your own pages; supply chain injects via a trusted CDN you chose to include. Both result in attacker-controlled JavaScript executing in your page context, with access to same credentials/cookies.
2. *What's `--ignore-scripts` in npm install and when would you use it?* → Prevents `postinstall`, `preinstall` scripts from running during `npm install`. Use in CI for security; tradeoff is that some packages (node-sass, native bindings) require postinstall for compilation.
3. *How do you handle the case where you need polyfills but don't want CDN risk?* → Bundle with Babel/core-js at build time — polyfills become part of YOUR bundle, which you control and serve from your own CDN. No external runtime dependency.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// Vite plugin: auto-generate SRI hashes for all chunk outputs
import type { Plugin } from 'vite';
import { createHash } from 'crypto';

export function sriPlugin(): Plugin {
  const assetHashes = new Map<string, string>();
  
  return {
    name: 'sri-hashes',
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' || chunk.type === 'asset') {
          const content = chunk.type === 'chunk' ? chunk.code : chunk.source;
          const contentBuffer = typeof content === 'string'
            ? Buffer.from(content, 'utf-8')
            : Buffer.from(content);
          
          const hash = createHash('sha384').update(contentBuffer).digest('base64');
          assetHashes.set(fileName, `sha384-${hash}`);
        }
      }
    },
    transformIndexHtml(html) {
      // Replace script/link tags with integrity-bearing versions
      return html.replace(
        /<script([^>]*) src="([^"]+)"([^>]*)>/g,
        (match, pre, src, post) => {
          const fileName = src.replace(/^\//, '');
          const integrity = assetHashes.get(fileName);
          if (!integrity) return match;
          return `<script${pre} src="${src}" integrity="${integrity}" crossorigin="anonymous"${post}>`;
        }
      );
    },
  };
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Supply Chain Attack Vectors:**
1. **npm packages** → `npm audit` + lockfile integrity + minimal deps
2. **CDN scripts** → SRI hash on every external `<script src="...">` — no SRI = vulnerability
3. **CI/CD** → Pin action versions to SHA, minimal permissions, no secret logging
4. **Third-party SaaS** → CSP blocks exfiltration even if script is compromised

**Polyfill.io 2024 lesson:** "If you don't own the CDN domain, you don't control what it serves."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ Your own code reviews mean nothing if your dependencies are compromised
→ Average npm package has 40-80 transitive dependencies — each is an attack surface
→ CDN-based attacks are particularly dangerous: trust in a CDN comes from convenience, not security verification

**How it works:**
→ Attacker compromises an upstream package (maintainer account takeover, typosquatting, postinstall scripts)
→ Developers install/update dependencies → malicious code enters `node_modules`
→ Build includes malicious code → shipped to users
→ SRI prevents CDN compromise by verifying file hash before execution
→ CSP limits damage by preventing exfiltration to unauthorized origins

**Company relevance:**
→ **Microsoft**: GitHub npm registry provides provenance attestations and Advisory Database — Microsoft is actively investing in supply chain security
→ **Adobe**: After 2020 security reviews, Adobe requires SRI for all third-party scripts in Experience Cloud products
→ **Salesforce**: AppExchange security review specifically checks for CDN scripts without SRI — blocked from marketplace listing without it
→ **Cisco**: PSIRT (Product Security Incident Response Team) has SBOMs (Software Bill of Materials) requirements for all products — mandatory supply chain visibility
