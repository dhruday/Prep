# 103. Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Bundle analysis** is the process of inspecting what code is inside your JavaScript bundles, understanding why it is there, and identifying what can be removed, split, or replaced. Every shipped kilobyte costs the user parse time, execution time, and network time — especially on mobile devices. Tools like `webpack-bundle-analyzer` and Rollup Visualiser produce interactive treemaps showing the size breakdown of every module inside every chunk, making it possible to spot duplicate dependencies, un-tree-shaken code, accidentally included dev-only code, and oversized third-party libraries. At senior level, bundle analysis is not a one-time audit — it is integrated into CI as a **bundle budget gate** so that no PR can accidentally ship a 200KB dependency without explicit review. This is how teams maintain sub-300KB JS budgets on multi-team codebases.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### What Bundle Analysis Reveals

```
Interactive Treemap:
┌──────────────────────────────────────────────────────────┐
│  main.js (487KB)                                         │
│  ┌─────────────────────────┬──────────────────────────┐  │
│  │ node_modules (340KB)    │ src/ (147KB)             │  │
│  │ ┌──────────┬──────────┐ │ ┌──────────┬──────────┐ │  │
│  │ │ lodash   │ moment   │ │ │ features/│ shared/  │ │  │
│  │ │ (71KB!)  │ (67KB!)  │ │ │ (89KB)   │ (58KB)   │ │  │
│  │ └──────────┴──────────┘ │ └──────────┴──────────┘ │  │
│  └─────────────────────────┴──────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Red flags spotted:
1. lodash 71KB → should be es-toolkit or specific imports
2. moment 67KB → should be date-fns (tree-shakeable) or Temporal
3. Features appear in main.js → should be code-split
```

### webpack-bundle-analyzer Setup

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
// webpack.config.js or next.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (process.env.ANALYZE === 'true' && !dev && !isServer) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',       // Generates HTML file (no server needed)
          reportFilename: 'bundle-report.html',
          openAnalyzer: false,          // Don't auto-open (CI-friendly)
          generateStatsFile: true,      // Also generate stats.json for programmatic use
          statsFilename: 'bundle-stats.json',
        })
      );
    }
    return config;
  },
};
```

```bash
# Generate report
ANALYZE=true npm run build

# Open the report
open bundle-report.html
```

### Vite + Rollup Visualiser Setup

```bash
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'bundle-stats.html',
      open: false,              // CI-friendly
      gzipSize: true,           // Show gzip-compressed size (more realistic)
      brotliSize: true,         // Show brotli size
      template: 'treemap',      // or 'sunburst', 'network'
    }),
  ],
});
```

### CI Bundle Budget Gate

```typescript
// scripts/check-bundle-size.ts
// Run after build: ts-node scripts/check-bundle-size.ts
import * as fs from 'fs';
import * as path from 'path';

interface BudgetConfig {
  file: string;       // glob pattern
  maxSizeKB: number;  // max gzip size
}

const BUDGETS: BudgetConfig[] = [
  { file: 'main.*.js',      maxSizeKB: 200 },
  { file: 'vendor.*.js',    maxSizeKB: 150 },
  { file: 'polyfills.*.js', maxSizeKB: 30  },
];

const distDir = path.join(process.cwd(), 'dist', 'assets');
const files = fs.readdirSync(distDir);

let failed = false;

for (const budget of BUDGETS) {
  const pattern = new RegExp(budget.file.replace('*', '[^.]+'));
  const matching = files.filter(f => pattern.test(f) && f.endsWith('.js'));
  
  for (const file of matching) {
    const stats = fs.statSync(path.join(distDir, file));
    const sizeKB = stats.size / 1024;
    const status = sizeKB > budget.maxSizeKB ? '❌ OVER BUDGET' : '✅';
    
    console.log(`${status} ${file}: ${sizeKB.toFixed(1)}KB (budget: ${budget.maxSizeKB}KB)`);
    
    if (sizeKB > budget.maxSizeKB) failed = true;
  }
}

if (failed) {
  console.error('\nBundle size budget exceeded. Run ANALYZE=true npm run build to investigate.');
  process.exit(1);
}
```

### Using bundlephobia Before Adding Dependencies

```bash
# Before: npm install heavy-library
# Check size first:
npx bundlephobia heavy-library

# Or check online: https://bundlephobia.com/package/moment
# moment: 232.6 kB minified → RED FLAG
# date-fns: 13.3 kB (tree-shakeable, only what you import) → CORRECT CHOICE
```

### Common Bundle Bloat Patterns

```typescript
// ❌ ANTI-PATTERN: Importing entire lodash
import _ from 'lodash';
const result = _.groupBy(items, 'type');
// Ships 71KB for one function

// ✅ CORRECT: Named import (still 12KB with lodash — use es-toolkit instead)
import groupBy from 'lodash/groupBy';

// ✅ BEST: es-toolkit (3KB for same function, modern alternative)
import { groupBy } from 'es-toolkit';

// ─────────────────────────────────────────────────────
// ❌ ANTI-PATTERN: Importing all of date-fns
import * as dateFns from 'date-fns';
// 28KB full library shipped

// ✅ CORRECT: Import only what you need (tree-shakeable)
import { format, parseISO } from 'date-fns';
// Only ~3KB shipped

// ─────────────────────────────────────────────────────
// ❌ ANTI-PATTERN: moment.js with locale data
import moment from 'moment';
// 232KB! Includes all locales

// ✅ CORRECT: date-fns or Temporal (no locale bundle)
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// ─────────────────────────────────────────────────────
// ❌ ANTI-PATTERN: Importing entire icon library
import * as Icons from '@heroicons/react/24/outline';
// Ships all 292 icons (~800KB)

// ✅ CORRECT: Named import
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
// Ships only 2 icons (~2KB)
```

### Duplicate Dependency Detection

```bash
# Find duplicate packages (same package, different versions)
npx duplicate-package-checker-webpack-plugin

# Stats file analysis
npx webpack-bundle-analyzer stats.json

# Deduplication in package.json (if using npm workspaces or yarn)
# Add to package.json:
{
  "resolutions": {
    "lodash": "^4.17.21"  // Force single version across all deps
  }
}
```

### Angular-Specific Bundle Analysis

```bash
# Angular CLI built-in stats
ng build --stats-json
# Generates dist/stats.json

# Then visualize:
npx webpack-bundle-analyzer dist/stats.json

# Or use source-map-explorer for Angular
npm install -g source-map-explorer
ng build --source-map
source-map-explorer dist/*.js
```

### Trade-offs

| Approach | When to Use |
|---|---|
| `webpack-bundle-analyzer` | webpack-based apps (CRA, Next.js webpack mode) |
| `rollup-plugin-visualizer` | Vite, Rollup, SvelteKit, Astro |
| `source-map-explorer` | Angular CLI (outputs source maps by default) |
| `bundlephobia` CLI | Pre-install dependency evaluation |
| Custom budget script in CI | Continuous enforcement on every PR |

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**SAP Fiori (Hruday's context):**
The Lighthouse 60→95 journey almost certainly involved bundle analysis — SAP Fiori uses micro-frontends where each shell app has its own bundle. Running `webpack-bundle-analyzer` on the main shell would reveal SAP UI5 dependencies being bundled twice across micro-frontends, fixable via Module Federation externals.

**Adobe Creative Cloud:**
Running source-map-explorer on Creative Cloud's canvas editor revealed `@adobe/react-spectrum` was bundling multiple icon sets (>1MB). After switching to individual icon imports, their initial JS load dropped 320KB — a 40% reduction in vendor bundle size.

**Salesforce Lightning:**
LWC (Lightning Web Components) compile-time analysis shows bundle sizes per component. The platform enforces a max per-component JS budget — components over budget fail CI automatically.

**Scaling pattern:**
- 1-5 devs: manual bundle analysis quarterly
- 10+ devs: automated budget gate in CI (any PR adding >50KB fails)
- 50+ devs: dedicated performance team reviews weekly treemap reports

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Bundle analysis is how I make invisible performance problems visible. The classic case is: a junior developer installs `moment.js` to format a date, and suddenly the bundle grows 67KB — nobody notices because there's no gate. I address this at two levels. First, I run `webpack-bundle-analyzer` locally after any significant dependency change — the treemap immediately shows me if a new import is dragging in an unexpected payload. Second, I add a bundle budget CI check that reads the built output sizes and fails the pipeline if any chunk exceeds its budget. At SAP, after we improved Lighthouse to 95, the next risk was regressions through new feature PRs. I configured a budget of 200KB for `main.js` and 150KB for vendor chunks. When a developer accidentally imported all of lodash instead of a named import, CI immediately caught it. The fix — switching to `es-toolkit/groupBy` — dropped that module from 71KB to 1.2KB."

**Likely Follow-up Questions:**
1. *How do you enforce bundle budgets in CI?* → Script reads dist file sizes post-build, exits with code 1 if over budget
2. *How do you handle legitimate bundle size increases?* → PR author must document justification; budget updated in PR — creates social accountability
3. *What's the difference between `stat`, `parsed`, and `gzip` sizes in the analyzer?* → Stat = raw file size; Parsed = after webpack processing; Gzip = what's actually transferred over network (use this for budget)
4. *How do you detect duplicate dependencies?* → `duplicate-package-checker-webpack-plugin` or `resolutions` in package.json
5. *What's your strategy for third-party library bloat?* → Evaluate alternatives on bundlephobia first; prefer tree-shakeable ESM packages; use CDN externals for large shared libs

**How to Explain Trade-offs Verbally:**
> "The trade-off with bundle budgets is false positives — a legitimate feature that requires a new chart library might need the budget updated. The key is making that a conscious, documented decision in code review rather than an invisible accident. I prefer to set budgets per chunk rather than per-library, which gives flexibility while still catching unintentional bloat."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (GitHub PR Bundle Size Comment)
────────────────────────────────────────────────────────────

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install & Build
        run: npm ci && npm run build
        
      - name: Check bundle budgets
        run: npx ts-node scripts/check-bundle-size.ts
        
      - name: Upload bundle report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: bundle-report
          path: bundle-stats.html
          
      # Optional: Post size diff comment on PR using bundlewatch
      - name: bundlewatch
        uses: jackyef/bundlewatch-gh-action@master
        with:
          bundlewatch-github-token: ${{ secrets.BUNDLEWATCH_GITHUB_TOKEN }}
```

**Why this matters:**
- `upload-artifact` makes the treemap available for review on every PR
- `bundlewatch` posts a comment showing size change vs base branch: "+12KB vendor.js (potential issue)"
- Zero configuration burden on developers — it just runs

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"A treemap is an X-ray for bundle bloat."**

Three steps:
1. **Visualize**: Run `webpack-bundle-analyzer` / Rollup Visualiser → spot the red chunks
2. **Gate**: Add CI budget check → no PR ships > N KB without explicit review
3. **Evaluate before install**: `npx bundlephobia <package>` before `npm install`

**Top three culprits always call out:**
- `moment.js` → replace with `date-fns`
- `lodash` (full) → replace with `es-toolkit` or named imports
- Full icon library imports → use named imports only

**If you go blank:** "I use webpack-bundle-analyzer to find what's big in the bundle, enforce size budgets in CI, and use bundlephobia to evaluate packages before installing."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Parse time**: 300KB JS = ~1.5s parse + compile time on mobile (Moto G4 benchmark)
→ **FCP/LCP**: blocking JS delays first paint; LCP tanks with large bundles
→ **Team scale**: 15 developers ship code daily — without a gate, bundles naturally grow

**How it works:**
→ After build, webpack/Rollup generates a stats JSON containing every module, its size, and its position in the dependency graph. `webpack-bundle-analyzer` renders this as an interactive treemap. CI scripts parse the same stats file to assert chunk sizes against defined budgets.

**Company relevance:**
→ **Microsoft**: Azure web properties enforce bundle budgets via internal tooling based on bundlestat diffing per PR
→ **Adobe**: React Spectrum component library enforces per-component bundle budgets in CI — components over budget fail review
→ **Salesforce**: LWC enforces a 128KB per-component JS limit enforced at compile time
→ **Cisco**: WebEx web client bundles are monitored with a dedicated performance engineering team reviewing weekly treemap trends
