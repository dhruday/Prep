# 173. Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"Bundle analysis is how you find out what's actually in your JavaScript bundle and why it's there. The tool — webpack-bundle-analyzer for Webpack, rollup-plugin-visualizer for Vite/Rollup — generates an interactive treemap where rectangle area = file size. You run it after a production build and look for the largest rectangles that shouldn't be there. At SAP, our first analyzer run revealed three problems nobody knew existed: the entire lodash library (70KB) included because one component used `_.isEqual`, moment.js (67KB) from a date picker that nobody knew used it, and the entire Angular common module duplicated inside a lazy-loaded feature module. That one analysis session identified 180KB of dead weight we removed in a week. Bundle analysis is not a one-time activity — I run it before and after every build change involving dependencies and make it a mandatory step in PR checklist for any `npm install` of a package over 20KB."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Bundle analysis tools parse the compiled JavaScript output and visualize the relationship between source modules and their contribution to final bundle size. They answer:

1. Why is this bundle 800KB? (what's in it)
2. Which third-party library takes the most space?
3. Is tree shaking working? (is the entire library included or just used parts?)
4. Are the expected code split points preserved? (is everything in one chunk?)
5. Are there duplicated dependencies? (same library in multiple chunks)

Without bundle analysis these questions require manual inspection of minified JS files — impractical.

### The Treemap Visualization

```
Bundle Treemap (each rectangle = module, area = file size)
───────────────────────────────────────────────────────────────
│ vendor.js (485KB)              │ main.js (120KB)             │
│  ┌─────────────────────────┐  │  ┌─────────────────────────┐│
│  │ react (42KB)            │  │  │ src/features/ (80KB)    ││
│  │  ├ react-dom (130KB)    │  │  │  ├ reports/ (40KB)      ││
│  │  └ scheduler (17KB)     │  │  │  ├ dashboard/ (25KB)    ││
│  ├─────────────────────────┤  │  │  └ admin/ (15KB)        ││
│  │ lodash (70KB) ← RED FLAG│  │  └─────────────────────────┘│
│  ├─────────────────────────┤  └─────────────────────────────┘
│  │ moment (67KB) ← RED FLAG│
│  └─────────────────────────┘
└───────────────────────────────────────────────────────────────
```

Red flags:
- Any library you don't explicitly use (transitive dep including full package)
- Libraries you explicitly use but should be smaller (`lodash` vs `lodash-es` named imports)
- Production source code appearing in vendor chunk (misconfigured split)
- Large duplicate chunks (same dep in multiple split bundles)

### webpack-bundle-analyzer Setup

```bash
# Install
npm install --save-dev webpack-bundle-analyzer

# Option 1: CLI analysis after build
npm run build -- --env analyze
# OR
npx webpack-bundle-analyzer dist/stats.json

# Option 2: Generate stats.json from webpack
# package.json
{
  "scripts": {
    "build:analyze": "webpack --profile --json > stats.json && webpack-bundle-analyzer stats.json"
  }
}
```

```javascript
// webpack.config.js — integrated plugin
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    // Only runs when ANALYZE env var is set (not on every build)
    process.env.ANALYZE === 'true' && new BundleAnalyzerPlugin({
      analyzerMode: 'server',       // Opens browser window
      // analyzerMode: 'static',    // Generates HTML report file (for CI)
      // analyzerMode: 'json',      // Outputs JSON for programmatic use
      reportFilename: 'bundle-report.html',
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'stats.json',
      statsOptions: {               // Include module details for accurate analysis
        source: false,
        reasons: false,
        assets: true,
        chunks: true,
        chunkModules: true,
        modules: true,
      },
    }),
  ].filter(Boolean),
};

// Run: ANALYZE=true npm run build
```

### Vite / Rollup — rollup-plugin-visualizer

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
      // Only generate on explicit build with ANALYZE=true
      open: process.env.ANALYZE === 'true',
      filename: 'dist/bundle-analysis.html',
      
      gzipSize: true,   // Shows gzip sizes (more accurate for transfer cost)
      brotliSize: true, // Shows brotli sizes
      
      template: 'treemap',  // or 'sunburst' | 'network' | 'list' | 'raw-data'
    }),
  ],
  build: {
    // Generate rollup output info for the plugin
    rollupOptions: {
      output: {
        // Ensure readable chunk names
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name.replace(/\./g, '_');
          return `assets/${name}-[hash].js`;
        },
      },
    },
  },
});
// Run: ANALYZE=true npm run build
```

### What to Look For in a Bundle Analysis

**Pattern 1: Unexpected Full Library Inclusion (Tree Shaking Failure)**
```
Expected: recharts/LineChart.js (8KB)
Actual:   recharts/index.js (320KB) — entire library included

Root cause: import Recharts from 'recharts' (namespace import)
Fix:        import { LineChart, XAxis, YAxis } from 'recharts' (named import)
```

**Pattern 2: Unexpected Transitive Dependencies**
```
Expected: I don't use moment
Actual:   moment.js (67KB) in vendor chunk

Root cause: react-date-picker v2.x depends on moment.js internally
Fix:        Upgrade to react-date-picker v4+ (switched to date-fns)
            OR: replace with react-datepicker (no moment dependency)
```

**Pattern 3: Code Split Boundary Not Working**
```
Expected: admin.chunk.js → contains admin/* code only
Actual:   vendor.js contains admin/AdminPanel (should be in admin chunk)

Root cause: AdminPanel imported in main App.tsx (not behind lazy())
Fix:        Wrap AdminPanel in React.lazy()
```

**Pattern 4: Duplicate Packages in Multiple Chunks**
```
Expected: react-router-dom appears once in vendor chunk
Actual:   react-router-dom appears in: vendor.js, chunk1.js, chunk2.js

Root cause: Each feaure module bundled its own version (hoisting mismatch)
Fix:        Webpack splitChunks config — set minChunks:2 for shared deps
```

### Automated Bundle Size Tracking in CI

```typescript
// scripts/track-bundle-size.ts
// Compares current build's bundle sizes against stored baseline
// Fails CI if any chunk grew > threshold

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

interface BundleEntry {
  name: string;
  sizeBytes: number;
  gzipEstimate: number; // rough: gzip ≈ 30% of raw
}

interface BundleSnapshot {
  timestamp: string;
  entries: BundleEntry[];
  totalBytes: number;
}

const BASELINE_PATH = join(process.cwd(), '.bundle-baseline.json');
const DIST_PATH = join(process.cwd(), 'dist');

function getJsFiles(dir: string): BundleEntry[] {
  const files: BundleEntry[] = [];
  for (const f of readdirSync(dir, { recursive: true }) as string[]) {
    if (!f.endsWith('.js') || f.endsWith('.map')) continue;
    const full = join(dir, f);
    const size = statSync(full).size;
    files.push({
      name: f,
      sizeBytes: size,
      gzipEstimate: Math.round(size * 0.3),
    });
  }
  return files.sort((a, b) => b.sizeBytes - a.sizeBytes);
}

function analyzeChanges(
  baseline: BundleSnapshot,
  current: BundleSnapshot,
  regressionThresholdKB = 20
): { passed: boolean; report: string[] } {
  const report: string[] = [];
  let passed = true;

  // Total size change
  const totalDiff = current.totalBytes - baseline.totalBytes;
  const totalKB = (totalDiff / 1024).toFixed(1);
  report.push(`\n📦 Bundle size change: ${totalDiff > 0 ? '+' : ''}${totalKB}KB`);

  // Per-chunk changes
  const baselineMap = new Map(baseline.entries.map(e => [e.name, e]));
  for (const entry of current.entries) {
    const base = baselineMap.get(entry.name);
    if (!base) {
      const newKB = (entry.sizeBytes / 1024).toFixed(1);
      report.push(`  🆕 New chunk: ${entry.name} (${newKB}KB)`);
      continue;
    }
    const diff = entry.sizeBytes - base.sizeBytes;
    const diffKB = (diff / 1024).toFixed(1);
    if (Math.abs(diff) < 1024) continue; // < 1KB change: ignore noise

    const emoji = diff > 0 ? '📈' : '📉';
    const sign = diff > 0 ? '+' : '';
    report.push(`  ${emoji} ${entry.name}: ${sign}${diffKB}KB`);

    if (diff > regressionThresholdKB * 1024) {
      report.push(`  ❌ REGRESSION: exceeded ${regressionThresholdKB}KB threshold`);
      passed = false;
    }
  }

  return { passed, report };
}

// Run
const current: BundleSnapshot = {
  timestamp: new Date().toISOString(),
  entries: getJsFiles(DIST_PATH),
  totalBytes: 0,
};
current.totalBytes = current.entries.reduce((s, e) => s + e.sizeBytes, 0);

if (!existsSync(BASELINE_PATH)) {
  console.log('No baseline found. Creating baseline...');
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2));
  console.log('✅ Baseline created');
} else {
  const baseline: BundleSnapshot = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const { passed, report } = analyzeChanges(baseline, current, 20); // 20KB threshold

  report.forEach(line => console.log(line));

  if (!passed) {
    console.error('\n❌ Bundle regression detected. Investigate with: ANALYZE=true npm run build');
    process.exit(1);
  }
  console.log('\n✅ Bundle size within acceptable change');
}
```

### Next.js — Built-in Bundle Analysis

```bash
# Next.js has official bundle analysis built in
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  // Generates: .next/analyze/client.html + .next/analyze/server.html
});

module.exports = withBundleAnalyzer({
  // your next.config.js options
});

// Run: ANALYZE=true next build
// Opens two reports: client bundle + server bundle
```

### Angular — `ng build --stats-json`

```bash
# Angular CLI generates Webpack stats file
ng build --stats-json

# Then analyze with:
npx webpack-bundle-analyzer dist/my-app/stats.json

# OR use source-map-explorer for more accurate per-source-file analysis:
npx source-map-explorer 'dist/my-app/**/*.js'
```

### Reading the Report — Checklist

```
Bundle Analysis Checklist:
□ Are all expected lazy-loaded routes in separate chunks? (not merged into main)
□ Any library > 50KB that shouldn't be there?
□ Is moment.js present? (should be replaced with date-fns)
□ Is lodash present without tree-shaking? (should see lodash/cloneDeep, not lodash)
□ Are any @mui/icons-material/* files? (path imports, not namespace)
□ Is the same library appearing in multiple chunks? (deduplication issue)
□ Is source code in vendor chunk? (should only be node_modules)
□ Has any chunk grown > 20KB since last build?
□ Is React core in vendor chunk (stable, good for caching)?
□ Are all polyfills conditional on browser support?
```

### Common Findings and Fixes

| Finding | Typical Size | Fix |
|---------|-------------|-----|
| Full `lodash` | 70KB | Switch to `lodash-es` with named imports |
| `moment.js` | 67KB | Replace with `date-fns` or `Temporal` |
| All `@mui/icons-material` | 3.4MB | Path imports per icon |
| `xlsx` spreadsheet library | 420KB | Dynamic import, load only on export action |
| `react-pdf` | 500KB | Dynamic import, load only on view action |
| `mapbox-gl` | 200KB | Dynamic import, load only on map section render |
| `chart.js` full | 320KB | Import only needed chart types |
| `firebase` SDK full | 470KB | Use modular SDK (v9+) with named imports |
| Duplicate React (two versions) | 84KB extra | Fix peer dependency conflict |
| Test utilities in production | Variable | Ensure test files excluded from build config |

---

## 🌍 3. Real-World Examples

### SAP — Three Surprises in First Analysis Run
Running webpack-bundle-analyzer on the SAP BI Launchpad production build for the first time revealed:
1. `moment.js` 67KB — from `ng2-datepicker@2.x` which internally depended on moment. Nobody knew. Fix: replaced `ng2-datepicker` with `ngx-matero-datepicker` (date-fns-based) → minus 67KB.
2. `lodash` 70KB — from `_.isEqual` in one component. Fix: replaced with custom shallow-equal function (20 lines) → minus 69KB.
3. Angular common module duplicated in two lazy modules — they both imported a shared `SharedModule` that incorrectly included half of `@angular/common`. Fix: restructured `SharedModule` to import only what each feature needed → minus 36KB per lazy module.
Total: ~180KB identified and removed in one week.

### Microsoft — Webpack Stats in PR Process  
Microsoft Teams web team runs `source-map-explorer` on every PR and posts a comment with the top 10 largest contributors by chunk. Any new entry in the top 10 (relative to base branch) triggers a mandatory review comment: "Why is this dependency here? Is it the right choice?" This single process caught: a developer adding `crypto-js` (80KB) when the browser's native `crypto.subtle` would work, and a developer accidentally importing an entire Adobe-licensed font library (220KB) from a copied snippet.

### Adobe — Source Map Explorer for Accurate Attribution
Adobe found webpack-bundle-analyzer inaccurate for components that used dynamic imports with ESM namespace re-exports. Source-map-explorer, which parses source maps directly rather than stats JSON, was more accurate. After switching to `npx source-map-explorer 'dist/**/*.js' --html report.html`, they identified a 180KB chunk attributable entirely to `@adobe/spectrum-css` being imported via stale paths that bypassed tree shaking. Fixing the import paths eliminated the 180KB.

### Salesforce — Bundle Regression in Automated Test
Salesforce Lightning uses Bundlesize (now deprecated, succeeded by `size-limit`) running in CI. Every PR generates a bundle size diff. A developer accidentally `import *`-ed an entire internal component library (740 components, 2.1MB) when they needed only one. The Bundlesize check failed with "+2.1MB — requires review approval from performance team." This prevented the regression from shipping and the developer learned the pattern.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Bundle analysis is mandatory after any build change. The tool — webpack-bundle-analyzer or rollup-plugin-visualizer — generates an interactive treemap where area = bytes. At SAP, our first analysis run revealed three problems nobody knew about: full lodash (70KB), moment.js from a date picker we'd upgraded but hadn't cleaned up (67KB), and a duplicated Angular module (36KB per lazy chunk). That's 180KB identified in 20 minutes. I look for four things: libraries bigger than expected (tree shaking failure), libraries I don't directly use (transitive dependencies), code in the wrong chunk (code split boundary failing), and duplicated dependencies across chunks. I run analysis with `ANALYZE=true npm run build` on every PR that touches package.json, and I track bundle size in CI using a baseline file — if any chunk grows more than 20KB versus baseline, the build fails. The goal is making bundle regression visible before it ships."

### Follow-Up Q&A

**Q: What's the difference between webpack-bundle-analyzer and source-map-explorer?**
A: `webpack-bundle-analyzer` uses Webpack's stats JSON to build its visualization — fast and integrated, but can be inaccurate for modules that are split, concatenated, or re-exported. `source-map-explorer` parses the actual source maps of the compiled output — slower to run but more accurate because it works from ground truth (mapping every byte back to its source file). For debugging specific size mysteries, source-map-explorer is more trustworthy; for regular CI tracking, bundle-analyzer is faster and sufficient.

**Q: How do you find why a specific package is included?**
A: Webpack's `--display-reasons` flag (or `reasons: true` in stats options) shows why each module was included — the import chain from entry point to that module. For Vite/Rollup, `rollup-plugin-visualizer`'s raw-data mode shows import chains. In Next.js, `@next/bundle-analyzer` shows the import graph. Alternatively: `npx why-is-that-module-in-my-bundle <package-name>` for Webpack.

**Q: How do you analyze the impact of third-party scripts (analytics, chat, etc.) on bundle size?**
A: Third-party scripts loaded via `<script>` or tag managers don't appear in your bundle analysis — they bypass your bundler entirely. For those, use WebPageTest's "Content Breakdown" view or the Coverage panel in Chrome DevTools (shows unexecuted JS from all sources including third-party). Lighthouse's "Remove unused JavaScript" audit also flags bytes from third-party scripts not executed from the page.

---

## 💻 5. Code Example (TypeScript)

```typescript
// size-limit config — lightweight bundle size tracking alternative to custom scripts
// .size-limit.json
[
  {
    "path": "dist/main*.js",
    "limit": "120 kB",
    "name": "Main bundle"
  },
  {
    "path": "dist/vendor*.js",
    "limit": "250 kB",
    "name": "Vendor bundle"
  },
  {
    "path": "dist/checkout*.js",
    "limit": "80 kB",
    "name": "Checkout chunk"
  }
]
```

```yaml
# GitHub Actions — bundle analysis in PR
# .github/workflows/bundle-analysis.yml
name: Bundle Analysis

on:
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      
      - run: npm ci
      
      - name: Build with stats
        run: ANALYZE=true npm run build
        env:
          NODE_ENV: production

      # Check bundle sizes against limits
      - name: Check bundle size limits
        run: npx size-limit --json > size-report.json
        
      - name: Post size report to PR
        uses: actions/github-script@v7
        with:
          script: |
            const report = require('./size-report.json');
            const lines = report.map(r => {
              const status = r.passed ? '✅' : '❌';
              return `${status} **${r.name}**: ${r.size} / ${r.limit}`;
            });
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📦 Bundle Size Report\n\n${lines.join('\n')}`,
            });

      - name: Upload HTML report as artifact
        uses: actions/upload-artifact@v4
        with:
          name: bundle-report
          path: dist/bundle-analysis.html
          
      - name: Fail if limits exceeded
        run: node -e "
          const r = require('./size-report.json');
          const failures = r.filter(x => !x.passed);
          if (failures.length) {
            console.error('Bundle limits exceeded:', failures.map(f => f.name).join(', '));
            process.exit(1);
          }
        "
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"DUST"**
- **D** — Duplicates (same library in multiple chunks → deduplication fix)
- **U** — Unexpected libraries (transitive deps you didn't know about)
- **S** — Split boundaries broken (lazy route code in main chunk)
- **T** — Treeshaking failure (entire library when you imported one function)

### Analogy
Bundle analysis is the **airport security X-ray machine** for your bundle. Without it, you're packing a suitcase blindly — you may have brought items you don't need, forgotten you packed a 2-liter liquid (moment.js), or accidentally packed your entire wardrobe instead of 3 days' clothes. The X-ray (bundle analyzer) shows you exactly what's in the bag, where everything came from, and what doesn't need to be there.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Bundles accumulate unintended content — transitive dependencies, CJS libraries that bypass tree shaking, code-split boundaries that silently break; at SAP a single analysis session identified 180KB of unintended bundle content removed in one week, improving LCP by reducing parse time
- **How it works:** `webpack-bundle-analyzer` parses Webpack stats JSON to build a proportional treemap visualization; `rollup-plugin-visualizer` does the same for Vite/Rollup output; `source-map-explorer` reads actual source maps for the most accurate byte-to-source attribution — all reveal which source modules contributed to which chunk and at what size
- **How Hruday uses it:** Runs analysis on every PR involving `package.json` changes; tracks baseline in CI with custom script (20KB threshold triggers failure); added to SAP pipeline after first analysis identified 180KB of unknown bundle weight; teaches developers to check `ANALYZE=true npm run build` before opening any PR that adds a dependency

---

✅ Topic 173/486 complete → Continuing to Topic 174: Virtualization (Large Lists)
