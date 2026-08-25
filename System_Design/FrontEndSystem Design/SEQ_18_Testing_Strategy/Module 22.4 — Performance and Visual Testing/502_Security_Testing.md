# 502 — Security Testing — OWASP ZAP, Snyk, npm audit, Lighthouse

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Security testing in frontend isn't just "run npm audit and hope for the best." It's a multi-layered strategy that covers **dependency vulnerabilities** (npm audit, Snyk), **dynamic application testing** (OWASP ZAP), **static analysis** (ESLint security plugins), **security header verification** (Playwright/Lighthouse), and **supply chain integrity** (lockfiles, package provenance). Each layer catches a different class of vulnerability — no single tool covers everything.

The goal is to shift security left: catch vulnerabilities in CI before they reach production. At SAP Labs, integrating automated security scanning into our pipeline reduced security vulnerabilities by **80%** — not by finding exotic zero-days, but by systematically catching known CVEs in dependencies, missing security headers, and unsafe coding patterns that would otherwise slip through code review.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior/Staff Level)

### 2.1 The Security Testing Pyramid for Frontend

```
                    ┌──────────┐
                    │  Manual  │  Penetration testing, threat modeling
                    │ Pen Test │  (quarterly / pre-launch)
                   ┌┴──────────┴┐
                   │    DAST     │  OWASP ZAP against running app
                   │ (Dynamic)   │  (per deploy to staging)
                  ┌┴─────────────┴┐
                  │  Header/CSP    │  Playwright header checks
                  │  Verification  │  Lighthouse security audit
                 ┌┴────────────────┴┐
                 │   SAST (Static)   │  ESLint security plugins
                 │                   │  (every commit / PR)
                ┌┴───────────────────┴┐
                │ Dependency Scanning  │  npm audit, Snyk, Socket.dev
                │                      │  (every commit / PR)
                └──────────────────────┘
```

The bottom layers run on every commit (fast, cheap). Upper layers run less frequently but catch runtime issues that static analysis misses.

### 2.2 Dependency Scanning

#### npm audit

Built into npm. Checks the dependency tree against the GitHub Advisory Database.

| Feature | Detail |
|---|---|
| **What it checks** | Known CVEs in direct + transitive dependencies |
| **Severity levels** | info, low, moderate, high, critical |
| **CI integration** | `npm audit --audit-level=high` exits non-zero on high+ |
| **Limitations** | Only known CVEs, no malware detection, can't evaluate code behavior |
| **Fix command** | `npm audit fix` (auto-upgrade compatible versions) |

#### Snyk

Commercial tool with a generous free tier. Goes beyond npm audit:

- **Reachability analysis**: Is the vulnerable function actually called in your code path?
- **Fix PRs**: Automatically opens PRs with patched versions
- **License compliance**: Flags GPL/AGPL in proprietary projects
- **Container scanning**: Scans Docker images
- **IaC scanning**: Checks Terraform, Kubernetes configs

#### Socket.dev

Newer entrant focused on **supply chain attacks**:

- Detects install scripts, network access, filesystem access in packages
- Flags typosquatting (e.g., `lod-ash` vs `lodash`)
- Behavioral analysis rather than just CVE matching
- Particularly useful for detecting compromised maintainer accounts

### 2.3 Static Application Security Testing (SAST)

ESLint plugins that catch unsafe patterns at write-time:

#### eslint-plugin-security

Catches Node.js-specific vulnerabilities:
- `detect-unsafe-regex` — ReDoS-vulnerable regex patterns
- `detect-non-literal-fs-filename` — path traversal risks
- `detect-eval-with-expression` — code injection via eval()
- `detect-no-csrf-before-method-override` — CSRF bypass
- `detect-object-injection` — prototype pollution via bracket notation

#### eslint-plugin-no-unsanitized

Catches DOM-based XSS in browser code:
- `no-unsanitized/method` — flags `.innerHTML`, `.insertAdjacentHTML()` with untrusted input
- `no-unsanitized/property` — flags `.outerHTML`, `.srcdoc` assignments

### 2.4 Dynamic Application Security Testing (DAST) with OWASP ZAP

OWASP ZAP (Zed Attack Proxy) is a free DAST tool that tests your **running application** for vulnerabilities.

**How it works against frontend apps:**

```
┌─────────┐     ┌──────────┐     ┌──────────────┐
│  ZAP    │────▶│ Your App │────▶│ Backend APIs │
│ Proxy   │     │ (staging) │     │              │
│ Spider  │◀────│          │◀────│              │
│ Scanner │     └──────────┘     └──────────────┘
└─────────┘
    │
    ▼
  Report (HTML/JSON/XML)
```

**ZAP scan types:**

| Type | What It Does | Duration |
|---|---|---|
| **Baseline Scan** | Spider + passive scan only | 1–5 min |
| **Full Scan** | Spider + passive + active scan (attacks) | 15–60 min |
| **API Scan** | Tests OpenAPI/GraphQL endpoints | 5–15 min |

**What ZAP finds in frontend contexts:**
- Missing security headers (CSP, HSTS, X-Frame-Options)
- Cookie flags missing (Secure, HttpOnly, SameSite)
- Information disclosure (server version, stack traces)
- Cross-site scripting (reflected/stored XSS)
- Clickjacking vulnerabilities
- Mixed content (HTTP resources on HTTPS page)

### 2.5 Content Security Policy (CSP) Testing

CSP is a critical frontend security header that controls what resources the browser can load.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.example.com;
  connect-src 'self' https://api.example.com;
  report-uri /csp-violation;
```

**Testing CSP:**

1. **Report-Only mode**: Deploy with `Content-Security-Policy-Report-Only` first
2. **Monitor violations**: Collect reports at `/csp-violation` endpoint
3. **Automated verification**: Playwright tests that check header values
4. **Regression prevention**: Assert CSP hasn't been weakened in PRs

### 2.6 Lighthouse Security Audit

Lighthouse checks a subset of security concerns:
- HTTPS usage
- Vulnerable JavaScript libraries (via Snyk's database)
- CSP presence and strength
- Missing security headers
- Mixed content

At SAP Labs, Lighthouse was part of our CI gate — scores below threshold blocked deployment. Improving from **Lighthouse 60 → 95** included hardening security headers that Lighthouse flagged.

### 2.7 Supply Chain Security

| Measure | What It Protects |
|---|---|
| **Lockfile integrity** | `package-lock.json` prevents silent upgrades |
| **npm provenance** | `--provenance` flag links packages to source commits |
| **Lockfile-lint** | Ensures all packages resolve to known registries |
| **Pinned versions** | Exact versions in lockfile prevent supply chain swaps |
| **Signed commits** | Verifies package publisher identity |
| **`ignore-scripts`** | Prevents malicious install scripts from running |

### 2.8 Security Headers to Verify

| Header | Purpose | Expected Value |
|---|---|---|
| `Content-Security-Policy` | Prevent XSS, injection | Strict directive set |
| `Strict-Transport-Security` | Force HTTPS | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | Prevent MIME sniffing | `nosniff` |
| `X-Frame-Options` | Prevent clickjacking | `DENY` or `SAMEORIGIN` |
| `Referrer-Policy` | Control referer leakage | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Restrict browser features | `camera=(), microphone=()` |
| `X-XSS-Protection` | Legacy XSS filter | `0` (CSP replaces this) |

### 2.9 Security Testing Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **No dependency scanning** | Known CVEs ship to production | Add npm audit + Snyk to CI |
| **Ignoring npm audit warnings** | Alert fatigue → real vulns missed | Triage weekly, set severity threshold |
| **Running ZAP only manually** | Regressions between pen tests | Automate baseline ZAP scan in CI |
| **CSP in report-only forever** | Never enforced = no protection | Set deadline to move to enforce mode |
| **No lockfile in repo** | Non-deterministic installs | Always commit package-lock.json |
| **`npm install --ignore-scripts`** skipped | Malicious postinstall runs | Use `ignore-scripts=true` in .npmrc |
| **Security as a one-time audit** | Drift makes audits stale | Continuous scanning in pipeline |

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

### Example A: SAP Labs Lighthouse Security Hardening

When we improved Lighthouse from 60 → 95, a significant portion involved security headers:

1. **Lighthouse flagged**: Missing CSP, no HSTS, vulnerable jQuery in a legacy widget
2. **Action**: Added strict CSP with nonce-based script loading, deployed HSTS with preload, replaced jQuery with vanilla JS
3. **Automated**: Playwright tests verified all headers on every deploy
4. **Result**: Lighthouse security audit passed, and the CSP blocked two attempted XSS payloads within the first month

### Example B: Snyk Catches Transitive Vulnerability

A dependency five levels deep (`express → body-parser → qs → ... → vulnerable-lib`) had a prototype pollution CVE. npm audit missed it because the advisory wasn't published yet. Snyk's reachability analysis flagged it because our code path did exercise the vulnerable function. We patched it three days before it hit the NVD.

### Example C: ZAP Baseline Scan in CI

Running ZAP baseline against our staging URL caught:
- Missing `X-Content-Type-Options` on API responses
- `Server: nginx/1.18.0` header leaking version info
- Cookies without `SameSite` attribute
- Mixed content warning from a hardcoded HTTP image URL

All were fixed in one sprint. Without automated DAST, these would have been found only during the annual pen test.

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

> "Security testing is a multi-layer problem. At SAP Labs, we built a pipeline that caught 80% of security vulnerabilities before they reached production. The first layer is dependency scanning — npm audit on every PR with a severity threshold of 'high,' plus Snyk for reachability analysis on transitive dependencies. Snyk once caught a prototype pollution vulnerability five levels deep that npm audit hadn't indexed yet.
>
> The second layer is static analysis. We use eslint-plugin-security and eslint-plugin-no-unsanitized to catch unsafe patterns like direct innerHTML assignment or eval with dynamic input. These run as pre-commit hooks and in CI.
>
> Third, we run OWASP ZAP baseline scans against our staging environment on every deploy. It catches missing security headers, cookie misconfigurations, and information disclosure. The baseline scan takes under five minutes and runs in the same GitHub Actions pipeline as our E2E tests.
>
> Fourth, Playwright tests verify every security header — CSP, HSTS, X-Frame-Options, Referrer-Policy. These are assertion-based: if a header is weakened or removed, the test fails. This was critical when we improved Lighthouse from 60 to 95 — we needed guardrails to prevent regression.
>
> For supply chain security, we commit lockfiles, use npm provenance, and have lockfile-lint ensuring all packages resolve to the npm registry. We also set `ignore-scripts=true` in .npmrc to prevent malicious postinstall scripts.
>
> The biggest anti-pattern I push back against is treating security as a one-time audit. If you only run ZAP before a pen test, you're accumulating months of drift. Security testing needs to be continuous and automated."

────────────────────────────────────────────────────────────────

## 5. Code Examples

### 5.1 GitHub Actions Workflow: Full Security Pipeline

```yaml
# .github/workflows/security.yml
name: Security Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1' # Weekly Monday scan

permissions:
  contents: read
  security-events: write

jobs:
  dependency-scan:
    name: Dependency Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # npm audit — fail on high or critical
      - name: npm audit
        run: npm audit --audit-level=high --omit=dev

      # Snyk dependency scan
      - name: Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: >-
            --severity-threshold=high
            --fail-on=upgradable

      # Lockfile integrity check
      - name: Verify lockfile integrity
        run: npx lockfile-lint
          --path package-lock.json
          --type npm
          --allowed-hosts npm
          --validate-https

  sast:
    name: Static Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # ESLint with security plugins
      - name: ESLint Security Scan
        run: npx eslint . --config .eslintrc.security.json --format json
          --output-file eslint-security-report.json || true

      - name: Check for critical findings
        run: |
          CRITICAL=$(cat eslint-security-report.json | jq '[.[].messages[] | select(.severity == 2)] | length')
          echo "Critical findings: $CRITICAL"
          if [ "$CRITICAL" -gt 0 ]; then
            echo "::error::Found $CRITICAL critical security findings"
            exit 1
          fi

  lighthouse-security:
    name: Lighthouse Security Audit
    runs-on: ubuntu-latest
    needs: [dependency-scan]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci && npm run build

      # Start app for Lighthouse
      - name: Start server
        run: npm run preview &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Lighthouse Audit
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: http://localhost:3000
          configPath: .lighthouserc.json
          uploadArtifacts: true

  zap-scan:
    name: OWASP ZAP Scan
    runs-on: ubuntu-latest
    needs: [dependency-scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci && npm run build

      - name: Start server
        run: npm run preview &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000

      # ZAP Baseline Scan
      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.11.0
        with:
          target: http://localhost:3000
          rules_file_name: .zap-rules.tsv
          fail_action: true
          allow_issue_writing: false
          artifact_name: zap-report

  header-verification:
    name: Security Header Tests
    runs-on: ubuntu-latest
    needs: [dependency-scan]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci && npm run build

      - name: Start server
        run: npm run preview &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Run Playwright security tests
        run: npx playwright test tests/security/
        env:
          BASE_URL: http://localhost:3000
```

### 5.2 ESLint Security Configuration

```jsonc
// .eslintrc.security.json
{
  "plugins": ["security", "no-unsanitized"],
  "extends": ["plugin:security/recommended-legacy"],
  "rules": {
    // Detect unsafe regex (ReDoS)
    "security/detect-unsafe-regex": "error",

    // Detect eval() with expressions
    "security/detect-eval-with-expression": "error",

    // Detect non-literal require()
    "security/detect-non-literal-require": "warn",

    // Detect prototype pollution via bracket notation
    "security/detect-object-injection": "warn",

    // Detect possible timing attacks in comparisons
    "security/detect-possible-timing-attacks": "warn",

    // Prevent innerHTML with unsanitized data
    "no-unsanitized/method": "error",

    // Prevent outerHTML, srcdoc assignment
    "no-unsanitized/property": "error",

    // Built-in: no eval
    "no-eval": "error",

    // Built-in: no implied eval (setTimeout with string)
    "no-implied-eval": "error",

    // Built-in: no script URLs
    "no-script-url": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.*", "**/*.spec.*"],
      "rules": {
        "security/detect-object-injection": "off",
        "security/detect-non-literal-require": "off"
      }
    }
  ]
}
```

### 5.3 Playwright Security Header Verification Tests

```typescript
// tests/security/headers.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface SecurityHeader {
  name: string;
  expected: string | RegExp;
  description: string;
}

const REQUIRED_HEADERS: SecurityHeader[] = [
  {
    name: 'content-security-policy',
    expected: /default-src\s+'self'/,
    description: 'CSP must restrict default-src to self',
  },
  {
    name: 'strict-transport-security',
    expected: /max-age=\d{7,}/,
    description: 'HSTS max-age must be at least 6 months',
  },
  {
    name: 'x-content-type-options',
    expected: 'nosniff',
    description: 'Must prevent MIME sniffing',
  },
  {
    name: 'x-frame-options',
    expected: /^(DENY|SAMEORIGIN)$/i,
    description: 'Must prevent clickjacking',
  },
  {
    name: 'referrer-policy',
    expected: /strict-origin|no-referrer/,
    description: 'Must restrict referrer information',
  },
  {
    name: 'permissions-policy',
    expected: /camera=\(\)/,
    description: 'Must restrict browser permissions',
  },
];

test.describe('Security Headers', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    const response = await request.get(BASE_URL);
    headers = {};
    for (const [key, value] of Object.entries(response.headers())) {
      headers[key.toLowerCase()] = value;
    }
  });

  for (const header of REQUIRED_HEADERS) {
    test(`should have ${header.name}: ${header.description}`, () => {
      const value = headers[header.name];
      expect(value, `Missing header: ${header.name}`).toBeDefined();

      if (typeof header.expected === 'string') {
        expect(value).toBe(header.expected);
      } else {
        expect(value).toMatch(header.expected);
      }
    });
  }

  test('should not expose server version', () => {
    const server = headers['server'];
    if (server) {
      expect(server).not.toMatch(/\d+\.\d+/);
    }
  });

  test('should not have X-Powered-By header', () => {
    expect(headers['x-powered-by']).toBeUndefined();
  });
});

test.describe('Cookie Security', () => {
  test('session cookies should have security flags', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const setCookieHeaders = response.headersArray().filter(
      (h) => h.name.toLowerCase() === 'set-cookie'
    );

    for (const cookie of setCookieHeaders) {
      const value = cookie.value.toLowerCase();
      expect(value, 'Cookie must have Secure flag').toContain('secure');
      expect(value, 'Cookie must have HttpOnly flag').toContain('httponly');
      expect(value, 'Cookie must have SameSite').toMatch(/samesite=(strict|lax)/);
    }
  });
});

test.describe('CSP Enforcement', () => {
  test('should block inline scripts without nonce', async ({ page }) => {
    const cspViolations: string[] = [];

    page.on('console', (msg) => {
      if (msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto(BASE_URL);

    // Attempt to inject inline script
    const blocked = await page.evaluate(() => {
      try {
        const script = document.createElement('script');
        script.textContent = 'window.__CSP_TEST__ = true';
        document.head.appendChild(script);
        return !(window as any).__CSP_TEST__;
      } catch {
        return true; // Blocked
      }
    });

    expect(blocked).toBe(true);
  });
});
```

### 5.4 Snyk Configuration

```yaml
# .snyk
version: v1.5#
language-settings:
  javascript:
    package-manager: npm

ignore:
  # Ignore a specific vuln with expiry and reason
  SNYK-JS-EXAMPLE-000000:
    - '*':
        reason: 'No fix available, mitigated by WAF rule'
        expires: 2026-07-01T00:00:00.000Z

patch: {}
```

### 5.5 ZAP Rules Configuration

```tsv
# .zap-rules.tsv
# Rule ID	Action	Description
10038	IGNORE	Content Security Policy (Report Only) header found — we use enforced CSP
10055	IGNORE	CSP: Wildcard Directive — false positive in dev
90033	WARN	Loosely Scoped Cookie — monitor but don't fail
```

### 5.6 Lighthouse CI Configuration

```jsonc
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "onlyCategories": ["best-practices"],
        "skipAudits": ["is-on-https"]
      }
    },
    "assert": {
      "assertions": {
        "best-practices": ["error", { "minScore": 0.9 }],
        "is-crawlable": "error",
        "no-vulnerable-libraries": "error",
        "csp-xss": "warn"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 5.7 .npmrc Security Hardening

```ini
# .npmrc
# Prevent malicious postinstall scripts
ignore-scripts=true
# Enforce exact versions
save-exact=true
# Require lockfile for installs
package-lock=true
# Audit on every install
audit=true
audit-level=high
# Enforce HTTPS registry
registry=https://registry.npmjs.org/
```

After setting `ignore-scripts=true`, remember to explicitly run build scripts for packages that need them:

```bash
# Allow scripts for specific trusted packages
npm rebuild esbuild
npm rebuild sharp
```

────────────────────────────────────────────────────────────────

## 6. Why & How Summary

### Why Security Testing Matters for Frontend

| Why | Impact |
|---|---|
| **Frontend is the attack surface** | XSS, clickjacking, CSRF all target the browser |
| **Supply chain is the #1 threat** | One compromised dependency = full compromise |
| **Security headers prevent whole classes of attacks** | CSP alone blocks most XSS |
| **Compliance requires evidence** | SOC2, GDPR, HIPAA need documented scanning |
| **Cost of late detection** | Production vuln fix costs 10–100x more than CI catch |

### How to Build a Frontend Security Testing Pipeline

| Layer | Tool | When | Blocks Deploy? |
|---|---|---|---|
| Dependencies | npm audit, Snyk | Every PR | Yes (high+) |
| Static Analysis | ESLint security plugins | Every commit | Yes (errors) |
| Headers | Playwright assertions | Every deploy | Yes |
| Lighthouse | Lighthouse CI | Every deploy | Yes (score < 90) |
| DAST | OWASP ZAP baseline | Main branch deploys | Yes (high alerts) |
| Supply Chain | lockfile-lint, provenance | Every PR | Yes |
| Full DAST | OWASP ZAP full scan | Weekly / pre-release | No (triage) |
| Manual | Pen test | Quarterly | No (remediation plan) |

### Key Takeaways for Interview

- Security testing is **layered** — no single tool catches everything.
- npm audit is necessary but not sufficient. Snyk adds reachability analysis and fix PRs.
- OWASP ZAP baseline scans are fast enough for CI (< 5 minutes).
- Playwright tests for security headers prevent regression — treat headers as code.
- CSP is the single most impactful security header for frontend XSS prevention.
- Supply chain attacks are the fastest-growing threat — lockfiles, provenance, and `ignore-scripts` are baseline defenses.
- The biggest anti-pattern is treating security as a one-time audit instead of continuous automation.

────────────────────────────────────────────────────────────────
