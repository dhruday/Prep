# 167. Lighthouse CI — Automating Performance Budgets in CI/CD
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"At SAP, after we drove Lighthouse from 60 to 95, the next challenge was preventing regression. Without automation, the score drifted back to 78 within two sprints — developers shipping features without checking performance. I implemented Lighthouse CI in our GitHub Actions pipeline: every PR runs three Lighthouse audits on a staging URL, results are compared against defined budgets (LCP < 2500ms, TBT < 200ms, CLS < 0.1, bundle size < 250KB per route), and the PR is blocked if any budget is exceeded. This made performance a hard quality gate like linting or unit tests. Lighthouse CI also uploads HTML reports so reviewers can see exactly which new script or image caused the regression. For teams targeting Microsoft, Adobe, or Salesforce, this pattern is table-stakes — they expect senior engineers to have institutionalized performance accountability, not just fixed it once."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**Lighthouse CI (LHCI)** is Google's official tool for running Lighthouse audits in continuous integration pipelines. It:
1. Runs Lighthouse multiple times on a URL (eliminates noise from single-run variance)
2. Compares metric results against user-defined budgets
3. Fails the CI build if budgets are exceeded
4. Stores historical results for trend tracking (LHCI server or public temporary storage)
5. Posts inline PR comments with metric summaries

Without LHCI, performance improvements are **ad hoc and reversible** — teams fix performance once but regress with each feature sprint. LHCI makes regression prevention automatic and non-negotiable.

### Architecture Overview

```
Developer pushes PR
        │
        ▼
GitHub Actions / Jenkins CI starts
        │
        ▼
LHCI: autorun (mobile + mobile throttling)
        │
        ├── Run Lighthouse 3× on staging URL
        │         ↓
        │   Median of 3 runs (eliminates outliers)
        │
        ├── LHCI assertions
        │         ↓
        │   Compare median vs budgets
        │         │
        │         ├── ✅ All within budget → CI passes
        │         └── ❌ Any exceeded → CI fails with details
        │
        ├── LHCI upload
        │         ↓
        │   HTML reports → LHCI server or temporary-public-storage
        │
        └── Status check → GitHub PR blocked or approved
```

### LHCI Configuration — `.lighthouserc.js`

```javascript
// .lighthouserc.js — place in project root
'use strict';

module.exports = {
  ci: {
    collect: {
      // Run Lighthouse 3 times per URL — median used for assertions
      numberOfRuns: 3,
      
      // URLs to audit — can be relative if using startServerCommand
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products',
        'http://localhost:3000/checkout',
      ],
      
      // Optionally start dev server before collection
      startServerCommand: 'npm run start:ci',
      startServerReadyPattern: 'ready on port 3000',
      
      // Emulate mobile (default) — matches Google CrUX mobile assessment
      settings: {
        preset: 'desktop',     // or 'perf' (mobile throttled - most strict)
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        // Throttling: mobile preset = 4× CPU slowdown, 3G network throttling
        // desktop preset = no throttling
      },
    },
    
    assert: {
      preset: 'lighthouse:recommended', // base preset (can override below)
      
      assertions: {
        // Core Web Vitals — errors block PR merge
        'largest-contentful-paint':     ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':          ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift':      ['error', { maxNumericValue: 0.1 }],
        
        // Loading — warnings (informational, don't block)
        'first-contentful-paint':       ['warn',  { maxNumericValue: 1800 }],
        'speed-index':                  ['warn',  { maxNumericValue: 3400 }],
        
        // Resource budgets — errors block PR merge
        // 'budget' assertion type checks JS/CSS/image transfer sizes
        'resource-summary:script:size':     ['error', { maxNumericValue: 250_000 }],  // 250KB JS
        'resource-summary:stylesheet:size': ['warn',  { maxNumericValue: 50_000 }],   // 50KB CSS
        'resource-summary:image:size':      ['warn',  { maxNumericValue: 500_000 }],  // 500KB images
        'resource-summary:total:size':      ['error', { maxNumericValue: 1_000_000 }],// 1MB total
        
        // Audit scores — 0.0 to 1.0
        'uses-optimized-images':            ['warn',  { minScore: 0.9 }],
        'uses-webp-images':                 ['warn',  { minScore: 0.9 }],
        'unused-javascript':                ['warn',  { maxNumericValue: 50_000 }], // bytes
        'unused-css-rules':                 ['warn',  { maxNumericValue: 10_000 }],
        'render-blocking-resources':        ['error', { maxNumericValue: 0 }],
        
        // Accessibility — always errors
        'categories:accessibility':         ['error', { minScore: 0.9 }],
      },
    },
    
    upload: {
      // Option 1: LHCI server (self-hosted, keeps history)
      // target: 'lhci',
      // serverBaseUrl: 'https://lhci.your-company.com',
      // token: process.env.LHCI_TOKEN,
      
      // Option 2: Temporary public storage (good for open source / demos)
      target: 'temporary-public-storage',
    },
  },
};
```

### GitHub Actions Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build production bundle
        run: npm run build
        env:
          NODE_ENV: production

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: '.lighthouserc.js'
          uploadArtifacts: true         # Store HTML reports as GitHub artifacts
          temporaryPublicStorage: true  # Also post public link to PR
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          # App token allows inline PR comments with metric details
```

### Multiple Routes — Route-Specific Budgets

Different routes have different performance characteristics. A checkout page has stricter LCP than a settings page:

```javascript
// .lighthouserc.js with per-route budget overrides
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products',
        'http://localhost:3000/checkout',
      ],
    },
    assert: {
      // Global assertion (applies to all URLs)
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'total-blocking-time':      ['error', { maxNumericValue: 300 }],
      },
      
      // URL-specific overrides — stricter for critical paths
      assertMatrix: [
        {
          matchingUrlPattern: '.*/$',           // Home page — most visible
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2000 }], // stricter
            'total-blocking-time':      ['error', { maxNumericValue: 150 }],
          },
        },
        {
          matchingUrlPattern: '.*/checkout$',   // Checkout — conversion critical
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
            'total-blocking-time':      ['error', { maxNumericValue: 100 }],
            'cumulative-layout-shift':  ['error', { maxNumericValue: 0.05 }], // tighter CLS
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

### Performance Budget File (Alternative: `budget.json`)

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script",     "budget": 250 },
      { "resourceType": "stylesheet", "budget": 50  },
      { "resourceType": "image",      "budget": 500 },
      { "resourceType": "font",       "budget": 100 },
      { "resourceType": "total",      "budget": 800 }
    ],
    "resourceCounts": [
      { "resourceType": "script",    "budget": 10 },
      { "resourceType": "third-party", "budget": 5 }
    ],
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "total-blocking-time",       "budget": 200  },
      { "metric": "cumulative-layout-shift",   "budget": 0.1  }
    ]
  }
]
```

### LHCI Server — Self-Hosted History Tracking

```bash
# docker-compose.yml for self-hosted LHCI server
version: '3'
services:
  lhci-server:
    image: patrickhulce/lhci-server:latest
    ports:
      - '9001:9001'
    environment:
      LHCI_STORAGE__SQL_DIALECT: sqlite
      LHCI_STORAGE__SQL_DATABASE_PATH: /data/lhci.db
    volumes:
      - lhci-data:/data

volumes:
  lhci-data:
```

The LHCI server provides:
- Historical trend charts (did LCP worsen after a specific commit?)
- Diff views (compare this PR's Lighthouse report to base branch)
- Project-level aggregates (all routes, all runs)
- Alert webhooks for threshold breaches

### Variance & Noise Mitigation

Lighthouse scores have variance of ±5–15 points on a single run, especially on shared CI machines. Mitigation strategies:

| Strategy | How |
|---|---|
| `numberOfRuns: 3` minimum | Take median of 3 runs — eliminates single-run outliers |
| `numberOfRuns: 5` for sensitive budgets | Even more stable median |
| Dedicated CI runner | Shared runners have CPU/network contention; use dedicated |
| `--chrome-flags="--no-sandbox"` | Required in Linux CI containers |
| Disable GPU in container | `--disable-gpu` flag to Chrome for headless stability |
| Set `--throttling-method=simulate` | More consistent than actual throttling on VMs |

```yaml
# Stable LHCI collect settings for CI environment
collect:
  numberOfRuns: 3
  settings:
    chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu'
    throttlingMethod: 'simulate'
    # simulate throttling is more consistent in CI than devtools throttling
```

### Jenkins Integration

```groovy
// Jenkinsfile
pipeline {
  agent any
  stages {
    stage('Install') {
      steps { sh 'npm ci' }
    }
    stage('Build') {
      steps { sh 'npm run build' }
    }
    stage('Start server') {
      steps {
        sh 'npx serve -s build -p 3000 &'
        sh 'sleep 5' // wait for server to start
      }
    }
    stage('Lighthouse CI') {
      steps {
        sh 'npx lhci autorun'
      }
      post {
        always {
          // Archive HTML reports as build artifacts
          archiveArtifacts artifacts: '.lighthouseci/*.html', fingerprint: true
        }
      }
    }
  }
}
```

### Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| `numberOfRuns: 1` | High variance; a single slow run fails a healthy PR | Use 3+ runs, take median |
| Auditing localhost without build | Dev server scores are 30–40 pts lower than production | Always audit production build |
| Not using `startServerCommand` | URL hardcoded; fails in ephemeral CI environments | Use LHCI's `startServerCommand` |
| Same budget for all routes | Home page budget too loose; checkout too strict per same rule | `assertMatrix` for per-URL budgets |
| `warn` for everything | PRs always green; nobody reads warnings | Reserve `error` for show-stoppers, fix warnings in sprint |
| Skipping Lighthouse CI on hotfixes | Hotfix bypass habit becomes permanent exception | Add job but don't block emergency deploys (use separate gate) |
| Not archiving HTML reports | Regression found but no report to investigate | `uploadArtifacts: true` always |

---

## 🌍 3. Real-World Examples

### SAP Labs — Preventing Regression
After the manual performance sprints at SAP (Lighthouse 60→95), I added LHCI to our GitHub Actions pipeline with two-stage budgets: `warn` at current targets (LCP 2.3s, TBT 180ms) and `error` at 20% regression (LCP 2.75s, TBT 216ms). The first PR it caught was a new reporting dashboard widget that imported `moment.js` directly (267KB) instead of the `date-fns` subset already in the bundle — TBT jumped to 430ms. The PR was blocked. Developer switched to `date-fns`, TBT returned to 190ms, PR merged. Without LHCI that regression would have shipped.

### Microsoft — Pull Request Performance Score Cards
Microsoft's Office web team posts a "Performance Score Card" comment on every PR via LHCI's GitHub App integration. It shows current vs base branch metrics for each tracked URL, color-coded (green/yellow/red). Engineers can see the performance cost of their PR before merge. This created a healthy culture of performance awareness — engineers proactively optimize rather than waiting for performance reviews.

### Adobe — Route-Specific Budgets in Creative Cloud
Adobe Creative Cloud has vastly different performance profiles per surface: the asset browser is image-heavy (tight CLS budget), the settings page is JS-heavy (tight TBT budget), the home dashboard is both. They use `assertMatrix` with strict budgets gated by route pattern. The image upload flow has a TBT budget of 100ms (interaction-critical) while marketing pages allow 400ms. This granularity prevents false failures on low-priority pages and tight gates on revenue-critical paths.

### Salesforce — LHCI Server for Performance Trending
Salesforce maintains a self-hosted LHCI server tracking 200+ routes across Lightning Experience. The server stores 90 days of history, enabling them to answer: "The P75 LCP for the Opportunity list view was 3.1s three months ago and is now 2.4s — which commit caused the improvement?" They present this data in quarterly engineering reviews as evidence of technical investment paying off. Each release must demonstrate no regression in median Lighthouse performance scores.

### Cisco — Green Build Gate for INP
Cisco Webex uses a custom LHCI assertion plugin that replays user interaction scripts using Puppeteer during LHCI collection, measuring synthetic INP for critical interactions (click chat, open sidebar, toggle view). This bridges the lab-vs-field gap: while TBT is the standard lab proxy, Cisco's critical UIs are interaction-dense enough to warrant scripted interaction testing in CI.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Lighthouse CI is how you make performance a hard engineering constraint rather than a periodic clean-up. At SAP, after driving our score from 60 to 95, I added LHCI to GitHub Actions — every PR runs Lighthouse three times on staging, takes the median, and compares against budgets: LCP < 2.5s, TBT < 200ms, CLS < 0.1, JS bundle < 250KB. If any budget is exceeded, the PR is blocked, the same as failing unit tests. The first regression it caught was a developer importing moment.js at 267KB — TBT jumped to 430ms, PR blocked. They switched to date-fns, budget met, merged. The key config decisions are: `numberOfRuns: 3` for noise reduction, separate `assertMatrix` for different routes, `error` vs `warn` distinction (errors block, warnings inform), and always archiving HTML report artifacts so engineers can diagnose what changed. For teams targeting Microsoft or Adobe, this pattern demonstrates that you think about performance systemically, not reactively."

### Follow-Up Q&A

**Q: How do you handle Lighthouse variance in CI? Sometimes the same code gets different scores.**
A: Variance is real — typically ±5-15 points on a single run due to CPU/network contention on shared CI runners. Three strategies: (1) `numberOfRuns: 3` with median eliminates single-run outliers. (2) Add 20% headroom to budgets — if field LCP target is 2.5s, set CI budget at 3.0s (catches regressions without false failures). (3) Use dedicated CI runners, not shared pools, for the Lighthouse job specifically. The `--throttling-method=simulate` flag also gives more consistent results than actual (devtools) throttling in VMs.

**Q: How do you audit authenticated pages in LHCI?**
A: Two approaches: (1) **Server-rendered tokens** — configure `puppeteerScript` in LHCI collect to run a login flow before Lighthouse runs (Puppeteer navigates to login, fills credentials, stores session cookie). (2) **Bypass authentication** — add a special header/cookie that development/staging environments accept to skip auth for Lighthouse runs, never in production. Store credentials as CI secrets, not in configuration files.

**Q: Should Lighthouse CI gate be blocking on every PR?**
A: For most teams, yes — but with calibrated severity levels. `error` assertions (block merge) for Core Web Vitals regressions and bundle size explosions; `warn` assertions (informational, don't block) for secondary metrics and opportunities. Emergency hotfix branches should have a documented bypass process (not a permanent bypass). The key insight: `warn` means nobody reads it; `error` means it actually prevents regression.

### Comparison: LHCI vs Alternatives

| Tool | Type | Lab/Field | Automation | Cost |
|------|------|-----------|------------|------|
| Lighthouse CI | Lab | Lab | Full CI/CD | Free (open source) |
| WebPageTest API | Lab | Lab | API-driven | Free + paid tiers |
| SpeedCurve | Lab+Field | Both | Full CI/CD | Paid |
| Calibre | Lab | Lab | CI/CD + alerts | Paid |
| Datadog RUM | Field | Field | Monitoring | Paid |
| Chrome CrUX | Field | Field | Read-only | Free |

**When to use what:** LHCI for blocking CI gates (free, good enough); SpeedCurve/Calibre for executive dashboards with beautiful trend charts; Datadog RUM for production field data; CrUX for Google ranking signals.

---

## 💻 5. Code Example (TypeScript)

```typescript
// Custom LHCI assertion plugin — adds bundle size check beyond Lighthouse defaults
// plugins/bundle-size-plugin.js

import fs from 'fs';
import path from 'path';

interface BundleEntry {
  name: string;
  sizeBytes: number;
  gzipSizeBytes: number;
}

interface BudgetConfig {
  maxJsKB: number;
  maxCssKB: number;
  maxTotalKB: number;
}

// Standalone bundle size checker (run before LHCI or as separate CI step)
async function checkBundleSizes(
  buildDir: string,
  budget: BudgetConfig
): Promise<{ passed: boolean; violations: string[] }> {
  const violations: string[] = [];

  const files = fs.readdirSync(buildDir, { recursive: true }) as string[];

  const jsBundles = files
    .filter(f => f.endsWith('.js') && !f.endsWith('.map'))
    .map(f => ({
      name: f,
      sizeBytes: fs.statSync(path.join(buildDir, f)).size,
    }));

  const cssBundles = files
    .filter(f => f.endsWith('.css') && !f.endsWith('.map'))
    .map(f => ({
      name: f,
      sizeBytes: fs.statSync(path.join(buildDir, f)).size,
    }));

  const totalJsKB = jsBundles.reduce((sum, b) => sum + b.sizeBytes, 0) / 1024;
  const totalCssKB = cssBundles.reduce((sum, b) => sum + b.sizeBytes, 0) / 1024;
  const totalKB = (totalJsKB + totalCssKB);

  if (totalJsKB > budget.maxJsKB) {
    violations.push(`JS total: ${totalJsKB.toFixed(1)}KB > budget ${budget.maxJsKB}KB`);
    // Show largest bundles for diagnosis
    const largest = [...jsBundles]
      .sort((a, b) => b.sizeBytes - a.sizeBytes)
      .slice(0, 5);
    largest.forEach(b => {
      violations.push(`  └ ${b.name}: ${(b.sizeBytes / 1024).toFixed(1)}KB`);
    });
  }

  if (totalCssKB > budget.maxCssKB) {
    violations.push(`CSS total: ${totalCssKB.toFixed(1)}KB > budget ${budget.maxCssKB}KB`);
  }

  if (totalKB > budget.maxTotalKB) {
    violations.push(`Total: ${totalKB.toFixed(1)}KB > budget ${budget.maxTotalKB}KB`);
  }

  return { passed: violations.length === 0, violations };
}

// Usage in CI script
const result = await checkBundleSizes('./dist/static', {
  maxJsKB: 250,
  maxCssKB: 50,
  maxTotalKB: 350,
});

if (!result.passed) {
  console.error('❌ Bundle size budget exceeded:');
  result.violations.forEach(v => console.error(v));
  process.exit(1);
}

console.log('✅ Bundle size within budget');
```

```yaml
# Complete production-grade CI pipeline with LHCI
# .github/workflows/ci.yml

name: CI Pipeline

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test -- --coverage --ci

  build:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
        env: { NODE_ENV: production }
      - run: node scripts/check-bundle-sizes.js
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  lighthouse:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - uses: actions/download-artifact@v4
        with: { name: build-output, path: dist/ }
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: '.lighthouserc.js'
          uploadArtifacts: true
          temporaryPublicStorage: true
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"CARVE"**
- **C** — Collect (3× runs, take median)
- **A** — Assert (error vs warn, per-route budgets)
- **R** — Report (upload HTML artifacts)
- **V** — Version (compare PR vs base branch)
- **E** — Enforce (block merge, don't just warn)

### Analogy
Lighthouse CI is the **QA inspector on the assembly line**, not the annual audit. Without it, you'd catch defects only at end-of-year quality reviews (when it's expensive to fix). With LHCI as a CI gate, every PR is inspected at the point of assembly — cheap to fix, impossible to miss.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Performance improvements without CI enforcement regress — at SAP, scores drifted from 95 back to 78 within two sprints before LHCI was implemented; automation is the only scalable prevention
- **How it works:** LHCI runs Lighthouse 3× per URL in a CI agent, takes the median, compares against budget assertions (error = block merge, warn = inform only), and uploads HTML reports for forensic investigation of any regression
- **How Hruday uses it:** Implemented in GitHub Actions pipeline with `assertMatrix` for home, products, and checkout routes; first catch was a `moment.js` import causing TBT 430ms; blocked PR, informed developer, fixed to `date-fns`, merged — exactly the prevention it was designed for

---

✅ Topic 167/486 complete → Continuing to Topic 168: Real User Monitoring (RUM) vs Synthetic Testing
