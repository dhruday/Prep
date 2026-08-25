# 470 – Bundle Analysis and Tree Shaking

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Bundle analysis** reveals what's in your JavaScript bundles — find large dependencies, duplicates, unused code. **Tree shaking** eliminates unused exports at build time (dead code elimination). Tools: `@next/bundle-analyzer`, `webpack-bundle-analyzer`, `source-map-explorer`. ES modules enable tree shaking; CommonJS blocks it.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── NEXT.JS BUNDLE ANALYZER ────
// Install: npm install @next/bundle-analyzer

// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // next config
});

// Run: ANALYZE=true npm run build
// Opens interactive treemap visualization

// ──── TREE SHAKING — how it works ────
// ES Modules: tree-shakeable ✅
export function add(a: number, b: number) { return a + b; }
export function multiply(a: number, b: number) { return a * b; }
export function complexMath() { /* 1000 lines */ }

// Consumer:
import { add } from './math'; // multiply and complexMath are removed!

// CommonJS: NOT tree-shakeable ❌
module.exports = { add, multiply, complexMath };
const { add } = require('./math'); // entire module included!

// ──── IMPORT OPTIMIZATION ────
// ❌ BAD: imports entire library
import _ from 'lodash';
_.debounce(fn, 300); // includes ALL of lodash (~70KB)

// ✅ GOOD: import specific function
import debounce from 'lodash/debounce'; // only debounce (~1KB)

// ✅ GOOD: use lodash-es (ES modules, tree-shakeable)
import { debounce } from 'lodash-es';

// ❌ BAD: import entire icon library
import { FaHome, FaUser } from 'react-icons/fa'; // may pull all icons

// ✅ GOOD: deep import
import FaHome from 'react-icons/fa/FaHome';

// ──── BARREL FILES WARNING ────
// utils/index.ts (barrel file)
export { formatDate } from './date';
export { formatCurrency } from './currency';
export { heavyChartUtils } from './charts'; // 50KB library!

// Consumer only needs formatDate:
import { formatDate } from './utils'; 
// ⚠️ Depending on bundler, may include heavyChartUtils!

// Fix: import directly
import { formatDate } from './utils/date';

// Next.js fix: optimizePackageImports
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lodash-es', '@mui/icons-material', 'date-fns'],
  },
};

// ──── ANALYZING BUNDLE COMPOSITION ────
// source-map-explorer (alternative tool)
// npm install source-map-explorer
// npx source-map-explorer .next/static/chunks/*.js

// ──── COMMON BUNDLE OPTIMIZATION STRATEGIES ────

// 1. Replace heavy libraries
// moment.js (300KB) → date-fns (tree-shakeable) or dayjs (2KB)
// lodash (70KB) → lodash-es or native JS

// 2. Dynamic imports for heavy libraries
const Chart = dynamic(() => import('recharts').then(m => m.LineChart), {
  ssr: false,
});

// 3. Externalize large dependencies (CDN)
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = { 'heavy-lib': 'HeavyLib' };
    }
    return config;
  },
};

// 4. Analyze with Import Cost VS Code extension
// Shows import size inline in editor

// ──── MEASURING IMPACT ────
// next build output shows chunk sizes
// Route                              Size     First Load JS
// ┌ ○ /                              5.2 kB   89 kB
// ├ ○ /about                         1.1 kB   85 kB
// └ λ /dashboard                     12.3 kB  96 kB
// + First Load JS shared by all      84 kB
```

### Optimization Checklist
| Action | Impact |
|---|---|
| Analyze bundles | Find largest chunks |
| Named imports | Enable tree shaking |
| Replace heavy libs | moment → dayjs |
| Dynamic import | Load on demand |
| Avoid barrel re-exports | Prevent unintended includes |
| optimizePackageImports | Next.js auto-optimization |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Bundle analysis (@next/bundle-analyzer) reveals what's in chunks. Tree shaking removes unused ES module exports (CommonJS blocks it). Key strategies: named imports (not *), replace heavy libs (moment→dayjs), dynamic import for heavy components, avoid barrel file re-exports, use optimizePackageImports in Next.js."*

## 4. 🧠 MEMORY AID
**"Analyze: @next/bundle-analyzer. Tree shake: ES modules only. Named imports. moment→dayjs. Dynamic import heavy libs. Avoid barrel re-exports."**
