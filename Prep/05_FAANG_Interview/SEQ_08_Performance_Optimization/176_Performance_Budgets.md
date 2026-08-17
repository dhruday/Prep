# 176. Performance Budgets
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"A performance budget is a constraint — a maximum allowed value for a metric — that you define upfront and enforce automatically in CI. Without budgets, performance degrades through a thousand small decisions: 'this lodash import is fine', 'this chart library is only 80KB', 'let's add this animation library'. None of those decisions is wrong in isolation, but together they add up to a 2MB bundle and a 5-second LCP. A budget makes the trade-off explicit: if adding a library would breach the 150KB JavaScript budget, the PR fails CI and the team has a deliberate conversation about what to remove to make room. At SAP, we introduced performance budgets after a 14-member team grew the bundle from 280KB to 1.4MB in six months without anyone noticing. We defined: total JS ≤ 400KB (gzip), LCP ≤ 2.5s (P75), TBT ≤ 200ms. Lighthouse CI enforced these on every PR. In the first week, three PRs were blocked — one added moment.js, one duplicated an Angular module, one added a full video player that was never used. Budgets redirected conversations from 'performance is slow' to 'which PR caused the regression.'"

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Budget Types Taxonomy

```
Performance Budgets
├── Quantity-Based (size budgets)
│    ├── Total JavaScript (compressed): ≤ 150–400KB by page type
│    ├── Total CSS: ≤ 100KB
│    ├── Total page weight (all resources): ≤ 1.5MB
│    ├── Total image weight: ≤ 500KB
│    └── Third-party JS: ≤ 50KB
│
├── Timing-Based (performance budgets)
│    ├── LCP: ≤ 2.5s (Google threshold)
│    ├── FCP: ≤ 1.8s
│    ├── TBT: ≤ 200ms
│    ├── INP: ≤ 200ms
│    └── TTFB: ≤ 800ms
│
├── Rule-Based (count budgets)
│    ├── Max number of third-party scripts: ≤ 5
│    ├── Max render-blocking resources: 0
│    ├── Max font files: ≤ 3
│    └── Max DOM depth: ≤ 32 levels
│
└── Score-Based
     └── Lighthouse Performance score: ≥ 80 (or ≥ 90 for landing pages)
```

### Setting Budgets: The 20% Headroom Rule

Never set a budget at today's value — set it at 20% better than today, then tighten quarterly:

```
Current state: bundle = 420KB, LCP = 3.2s, TBT = 380ms

Initial budgets (20% better):
  Bundle: 420KB × 0.8 = 336KB → round to 350KB
  LCP:    3.2s  × 0.8 = 2.56s → round to 2.5s (use Google threshold)
  TBT:    380ms × 0.8 = 304ms → round to 300ms

Quarterly targets:
  Q2: Bundle 300KB, LCP 2.5s, TBT 200ms
  Q3: Bundle 250KB, LCP 2.0s, TBT 150ms
```

### Tool 1 — Lighthouse CI Budget Assertions (timing budgets)

```javascript
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: [
        'http://localhost:3000/',             // landing
        'http://localhost:3000/products',     // product list
        'http://localhost:3000/checkout',     // most critical
      ],
    },
    assert: {
      assertMatrix: [
        // Landing page — strictest
        {
          matchingUrlPattern: '.*localhost:3000/$',
          assertions: {
            'first-contentful-paint': ['error', { maxNumericValue: 1600 }],
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'total-blocking-time': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        // Product list — medium
        {
          matchingUrlPattern: '.*localhost:3000/products',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
            'total-blocking-time': ['error', { maxNumericValue: 350 }],
          },
        },
        // Checkout — most critical user journey
        {
          matchingUrlPattern: '.*localhost:3000/checkout',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
            'total-blocking-time': ['error', { maxNumericValue: 150 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
          },
        },
      ],
      // Applied to ALL URLs
      preset: 'lighthouse:no-pwa',
    },
  },
};
```

### Tool 2 — size-limit (JavaScript size budgets)

`size-limit` measures the actual cost to the user: not file size but parse + evaluate time:

```json
// package.json — size-limit config
{
  "size-limit": [
    {
      "name": "Initial JS (home)",
      "path": "dist/js/main.*.js",
      "limit": "150 KB",
      "gzip": true
    },
    {
      "name": "Initial JS (total entry)",
      "path": "dist/js/*.js",
      "limit": "400 KB",
      "gzip": true
    },
    {
      "name": "Total CSS",
      "path": "dist/css/*.css",
      "limit": "100 KB",
      "gzip": true
    },
    {
      "name": "Charts vendor chunk",
      "path": "dist/js/charts.*.js",
      "limit": "120 KB",
      "gzip": true
    }
  ],
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"
  }
}
```

```bash
# Run locally:
npx size-limit

# Output:
  Package         Size      Difference   Status
  ─────────────────────────────────────────────
  Initial JS      148 KB    +12 KB       ✅ within limit (150 KB)
  Charts chunk    134 KB    +24 KB       ❌ EXCEEDS limit (120 KB)

# --why flag: shows which module is responsible for the increase
npx size-limit --why
# > recharts: +18 KB (switching from AreaChart to ComposedChart included all chart types)
```

### Tool 3 — bundlesize (simpler CI file size budgets)

```json
// .bundlesizerc.json — simpler alternative to size-limit for file-based budgets
{
  "files": [
    { "path": "./dist/js/main.*.js",    "maxSize": "150 kB" },
    { "path": "./dist/js/vendor.*.js",  "maxSize": "200 kB" },
    { "path": "./dist/css/main.*.css",  "maxSize": "50 kB"  },
    { "path": "./dist/js/charts.*.js",  "maxSize": "120 kB" }
  ]
}
```

### CI Integration — GitHub Actions

```yaml
# .github/workflows/performance-budget.yml
name: Performance Budget

on: [pull_request]

jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install & build
        run: npm ci && npm run build

      - name: Check JS bundle size
        run: npx size-limit
        # Fails CI if any budget is exceeded

      - name: Comment size diff on PR
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Adds a PR comment showing size change for each chunk
          # e.g. "main.js: 145 KB → 162 KB (+17 KB) ❌ exceeded 150 KB limit"

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: '.lighthouserc.js'
          uploadArtifacts: true
          temporaryPublicStorage: true
          githubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Budget by Page Type Template

```
Page Type          JS Budget   LCP Budget   TBT Budget   Notes
─────────────────────────────────────────────────────────────────────────
Landing / Home     150 KB      2.0s         150ms        SEO + first impression
Product List       250 KB      2.5s         250ms        Core shopping flow
Product Detail     250 KB      2.5s         250ms        Add to cart must be fast
Checkout           200 KB      2.0s         100ms        Conversion-critical
Dashboard          350 KB      3.0s         350ms        Auth-gated, complex
Settings           200 KB      3.0s         300ms        Low traffic, lower priority
Admin              400 KB      3.5s         400ms        Internal, non-public
```

### Communicating Budgets to Stakeholders

```
Performance Budget Charter (team agreement)

What: Maximum allowed values for key performance metrics
Why: Each 100ms of LCP improvement = 2–5% conversion increase (Amazon/Google data)
     Each 1s improvement on mobile = 27% conversion (Mobify data)

Budgets:
  - LCP ≤ 2.5s (P75 in field)
  - TBT ≤ 200ms (in Lighthouse)
  - JS bundle ≤ 350KB (gzipped)

Process:
  - Budgets enforced automatically in CI — PRs fail if breached
  - Breaching a budget is not a blocker — it's a conversation
  - To breach: (1) remove something to make room, OR (2) team decides to raise budget
  - Budgets reviewed quarterly — target is to tighten, not loosen

Accountability:
  - Dashboard: [LHCI Server URL] — 90-day trending by URL
  - Budget owner: [Engineering Lead]
```

---

## 🌍 3. Real-World Examples

### SAP — Bundle Growth Caught: 1.4MB → 350KB
After introducing `size-limit` with a 400KB gzip budget in Lighthouse CI, three PRs were blocked in the first week: moment.js (+67KB), a duplicated Angular routing module (+36KB), and an un-tree-shaken chart library (+180KB). Before budgets, these additions would have been merged unnoticed. After the budget gates, developers started using `size-limit --why` before submitting PRs and self-correcting. Six months later, the bundle was 350KB — 75% smaller than the 1.4MB it had reached before budgets were introduced.

### Google — Real Budget Numbers
Google publicly states their performance budget for Search results: they target an LCP of under 2.5 seconds at the 75th percentile and a CLS of under 0.1. Their internal tooling (WebPageTest + CrUX) monitors every deployment against these budgets. Any release that would push P75 LCP above budget requires explicit sign-off from a VP of Engineering. This is the gold standard: budgets enforced organizationally, not just technically.

### Etsy — Performance Score as KPI
Etsy published that they track SpeedIndex as a business KPI alongside revenue and conversion. When SpeedIndex rises above budget, it gets the same priority as a revenue bug. Their internal dashboard shows SpeedIndex vs conversion rate on the same chart, making the business impact of performance regression visible to non-engineers. This cultural integration — not just technical enforcement — is what made their performance program sustainable.

### Twitter/X — Tweet Load Budget
Twitter's tweet compose page has a strict TBT budget because interaction latency on the compose button directly impacts tweet volume. They run synthetic Lighthouse tests 4× daily (not just on PR) to catch regressions from CDN/infrastructure changes that don't go through code review. Their budget monitoring catches not just code regressions but infrastructure regressions (CDN misconfiguration, new A/B test script loading).

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Performance budgets are the mechanism that makes performance a first-class engineering concern rather than a quarterly audit. Without them, performance degrades through accumulated small decisions that each seem reasonable. I define three budget categories: size budgets (JavaScript gzip ≤ 150KB for entry bundles), timing budgets (LCP ≤ 2.5s, TBT ≤ 200ms), and rule budgets (zero render-blocking resources, max 3 font files). I enforce them in CI — size-limit or bundlesize for JS size, Lighthouse CI for timing. The GitHub Actions integration comments directly on PRs: 'main.js increased from 145KB to 162KB (+17KB), exceeding the 150KB limit.' This makes the conversation immediate and specific. At SAP, before budgets, no one knew the bundle had grown from 280KB to 1.4MB over six months. After budgets, every regression was caught at PR time within a day. Budgets also revealed the business case — I correlated the LCP regression with a 3% checkout conversion drop using RUM data, which made the case for dedicated sprint time to fix it."

### Follow-Up Q&A

**Q: What if a new feature genuinely needs more JavaScript than the budget allows?**
A: This is the right conversation budgets are designed to force. Options: (1) Code-split the new feature so it's not in the initial bundle — only load it when needed. (2) Remove something else to make room — identify unused features or over-included dependencies. (3) Explicitly raise the budget as a team decision, documented, with a plan to bring it back down. The worst outcome is raising the budget without a plan — it signals that the budget is a suggestion, not a constraint. The best practice is "bank the gains" — when optimizations shrink the bundle, don't immediately spend the savings on new features. Let the budget reflect the new lower value.

**Q: How do you handle budget differences between mobile and desktop?**
A: Lighthouse CI supports per-URL budget configuration, but not per-device in one config. Best practice: run two LHCI jobs — one with mobile throttling (the default: Moto G4, 4G) and one with desktop. Budget mobile at 150KB JS / LCP 2.5s; budget desktop at 250KB JS / LCP 2s. Mobile budget is stricter because mobile CPU parse time is 3–5× slower than desktop. The key metric to focus on for mobile is TBT (CPU time) not just transfer size.

---

## 💻 5. Code Example (TypeScript)

```typescript
// Automated bundle regression tracking with PR-level reporting

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as path from 'path';

interface ChunkBudget {
  pattern: RegExp;
  maxKB: number;
  name: string;
}

interface ChunkResult {
  name: string;
  filePath: string;
  sizeBytes: number;
  sizeKB: number;
  budgetKB: number;
  passed: boolean;
  diffKB?: number; // vs baseline
}

const BUDGETS: ChunkBudget[] = [
  { name: 'Main JS (entry)',    pattern: /main\.\w+\.js$/,    maxKB: 150 },
  { name: 'Vendor chunk',       pattern: /vendor\.\w+\.js$/,  maxKB: 200 },
  { name: 'Charts chunk',       pattern: /charts\.\w+\.js$/,  maxKB: 120 },
  { name: 'Main CSS',           pattern: /main\.\w+\.css$/,   maxKB: 50  },
];

function analyzeBundle(distDir: string): ChunkResult[] {
  const { readdirSync, statSync } = require('fs');
  const files = readdirSync(distDir);
  const results: ChunkResult[] = [];

  for (const budget of BUDGETS) {
    const matchedFile = files.find((f: string) => budget.pattern.test(f));
    if (!matchedFile) continue;

    const filePath = path.join(distDir, matchedFile);
    const sizeBytes = statSync(filePath).size;
    const sizeKB = Math.round(sizeBytes / 1024 * 10) / 10;

    results.push({
      name: budget.name,
      filePath,
      sizeBytes,
      sizeKB,
      budgetKB: budget.maxKB,
      passed: sizeKB <= budget.maxKB,
    });
  }
  return results;
}

function loadBaseline(baselinePath: string): Record<string, number> {
  if (!existsSync(baselinePath)) return {};
  return JSON.parse(readFileSync(baselinePath, 'utf-8'));
}

function formatReport(results: ChunkResult[]): string {
  const rows = results.map(r => {
    const status = r.passed ? '✅' : '❌';
    const diff = r.diffKB !== undefined
      ? (r.diffKB > 0 ? ` (+${r.diffKB} KB)` : ` (${r.diffKB} KB)`)
      : '';
    const vs = `${r.sizeKB} KB${diff}`;
    const limit = `${r.budgetKB} KB limit`;
    return `| ${status} | ${r.name} | ${vs} | ${limit} |`;
  });

  const header = '| Status | Chunk | Size | Budget |\n|--------|-------|------|--------|';
  return `## Bundle Budget Report\n\n${header}\n${rows.join('\n')}`;
}

// Main CI script
function runBudgetCheck() {
  const distDir = './dist/js';
  const baselinePath = '.bundle-baseline.json';

  const results = analyzeBundle(distDir);
  const baseline = loadBaseline(baselinePath);

  // Attach diff against baseline (e.g., main branch)
  results.forEach(r => {
    const baselineKB = baseline[r.name];
    if (baselineKB !== undefined) {
      r.diffKB = Math.round((r.sizeKB - baselineKB) * 10) / 10;
    }
  });

  const report = formatReport(results);
  console.log(report);

  // Write report for GitHub Actions PR comment
  writeFileSync('./bundle-report.md', report);

  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} budget(s) exceeded:`);
    failures.forEach(f => {
      console.error(`   ${f.name}: ${f.sizeKB} KB (limit: ${f.budgetKB} KB)`);
    });
    process.exit(1); // Fail CI
  } else {
    console.log('\n✅ All budgets passed');
    process.exit(0);
  }
}

runBudgetCheck();
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"BEST"**
- **B** — Budget by page type (checkout stricter than settings)
- **E** — Enforce in CI (PRs fail — not just warn)
- **S** — Size + Timing + Rules (three budget categories)
- **T** — Tighten quarterly (budgets are ceilings, not floors)

### The Three Budget Rules
```
1. 20% better than today (not "where we want to be eventually")
2. Fail on ERROR (not warn) for critical pages
3. Always distinguish ENTRY bundle from TOTAL bundle:
   Entry bundle (initial JS loaded before interactive): ≤ 150KB
   Total JS for page: ≤ 400KB
   (code-split chunks load on demand — don't count toward entry)
```

### Analogy
Performance budgets are like a **luggage weight limit** on a plane. Without the limit, every passenger brings "just one more thing" until no one's bags fit in the overhead bin. With the limit: every traveler knows what they can bring, trade-offs are made before boarding (not at the gate), and the process is transparent. The enforcement point (the gate) is automatic and consistent.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Without budgets, performance degrades through accumulated small decisions invisible to any one engineer; at SAP a 14-person team grew the bundle from 280KB to 1.4MB in six months; budgets make each regression visible at PR time instead of quarterly performance review
- **How it works:** `size-limit` measures gzip-compressed JS/CSS and fails CI if any chunk exceeds its limit; Lighthouse CI measures timing metrics (LCP, TBT, CLS) in a controlled environment and fails CI on `error`-level assertions; `andresz1/size-limit-action` adds PR comments with size diffs for immediate feedback
- **How Hruday uses it:** Defined and introduced performance budgets at SAP (400KB JS gzip, LCP ≤ 2.5s, TBT ≤ 200ms); enforced via GitHub Actions; identified the business impact by correlating LCP with checkout conversion drop using RUM data; led the conversation to allocate a sprint to performance work

---

✅ Topic 176/486 complete → Continuing to Topic 177: Angular OnPush + trackBy Performance Patterns
