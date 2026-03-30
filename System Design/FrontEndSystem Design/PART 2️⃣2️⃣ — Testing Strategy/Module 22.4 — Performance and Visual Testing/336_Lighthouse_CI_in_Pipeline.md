# 336 – Lighthouse CI in Build Pipeline

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Lighthouse CI (LHCI) runs Google Lighthouse audits in CI, setting performance/accessibility budgets that block merges if scores drop. It catches performance regressions before they reach production — automated guardrails for Core Web Vitals, accessibility, SEO, and best practices.

## 2. 🔬 DEEP-DIVE EXPLANATION

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/", "http://localhost:3000/products"],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

```yaml
# ──── GITHUB ACTIONS ────
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Budget Strategy
| Metric | Threshold | Action |
|---|---|---|
| Performance score | ≥ 90 | Block PR if below |
| LCP | ≤ 2.5s | Error |
| CLS | ≤ 0.1 | Error |
| TBT | ≤ 300ms | Error |
| Accessibility | ≥ 95 | Error |
| Bundle size | ≤ +5KB | Warn |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I integrate Lighthouse CI into every PR pipeline. It runs 3 audits (for stability), asserts performance score ≥ 90 and LCP ≤ 2.5s, and blocks merges that regress. At SAP, this is how we maintained the Lighthouse 60→95 improvement — automated budgets prevented regressions."*

## 4. 🧠 MEMORY AID
**"LHCI = automated Lighthouse in CI. Set budgets: perf ≥ 90, a11y ≥ 95, LCP ≤ 2.5s. Block PR on regression. Run 3x for stability."**

## 5. 🎯 KEY INSIGHT
Run Lighthouse CI on the built/served app, not just static HTML. Use `startServerCommand` to serve the production build for accurate metrics.
