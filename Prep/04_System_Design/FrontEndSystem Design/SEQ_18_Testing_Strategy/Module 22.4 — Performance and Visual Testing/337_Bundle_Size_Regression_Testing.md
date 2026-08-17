# 337 – Bundle Size Regression Testing

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Bundle size regression testing tracks JavaScript/CSS bundle sizes across builds and alerts/blocks when a PR increases bundle size beyond a threshold. Tools: **bundlesize**, **size-limit**, **webpack-bundle-analyzer**, **Import Cost** (VS Code). Prevents "death by a thousand imports."

## 2. 🔬 DEEP-DIVE EXPLANATION

```json
// ──── SIZE-LIMIT (recommended) ────
// package.json
{
  "size-limit": [
    { "path": "dist/index.js", "limit": "50 KB" },
    { "path": "dist/vendor.js", "limit": "150 KB" },
    { "path": "dist/**/*.css", "limit": "20 KB" }
  ],
  "scripts": {
    "size": "size-limit",
    "size:check": "size-limit --check"
  }
}
```

```yaml
# ──── GITHUB ACTIONS ────
name: Bundle Size Check
on: [pull_request]
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Posts bundle size diff as PR comment
```

```typescript
// ──── MANUAL BUNDLE ANALYSIS ────
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
    }),
  ],
};
// Run: ANALYZE=true npm run build

// ──── IMPORT COST AWARENESS ────
// BAD: imports entire library (70KB for one function)
import _ from 'lodash';
const sorted = _.sortBy(users, 'name');

// GOOD: tree-shakeable import (4KB)
import sortBy from 'lodash/sortBy';
const sorted = sortBy(users, 'name');

// BEST: native (0KB)
const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
```

### Budget Strategy
| Chunk | Budget | Action |
|---|---|---|
| Main bundle | 50KB gzipped | Error on exceed |
| Vendor chunk | 150KB gzipped | Warn on +10KB |
| Route chunks | 30KB each | Warn on exceed |
| CSS total | 20KB gzipped | Warn on exceed |
| Total | 300KB gzipped | Error on exceed |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I use size-limit in CI to post bundle size diffs on every PR. Budgets: main ≤ 50KB, vendor ≤ 150KB gzipped. The PR comment shows exactly what grew and by how much. At SAP, this caught a 40KB moment.js import that someone added accidentally."*

## 4. 🧠 MEMORY AID
**"size-limit = budget enforcement. webpack-bundle-analyzer = visual inspection. Import Cost = IDE feedback. Rule: every import has a cost, make it explicit."**

## 5. 🎯 KEY INSIGHT
The best time to catch a large import is at PR review time, not after it's shipped. Automated bundle size comments make the cost visible to every reviewer.
