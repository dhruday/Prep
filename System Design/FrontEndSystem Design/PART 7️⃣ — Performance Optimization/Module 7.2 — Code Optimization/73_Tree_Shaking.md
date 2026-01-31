# 58. Tree Shaking

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Tree Shaking** is the process of eliminating unused code (dead code) from your JavaScript bundles during the build process. It's called "tree shaking" because you imagine the code as a tree—you shake it, and the dead leaves (unused exports) fall off, leaving only the code that's actually used.

### What It Is:

```javascript
// lodash library (entire library: 72KB)
import _ from 'lodash';  // ❌ Imports everything

// Tree shaking (only what you need: 2KB)
import { debounce } from 'lodash-es';  // ✅ Only imports debounce
```

**The Problem Without Tree Shaking**:
```javascript
// You write:
import { Button } from 'ui-library';

// You get (entire library: 500KB):
Button (5KB) + Modal + Form + Table + Charts + ... (495KB unused)

// Result: Users download 500KB for a 5KB button
```

**The Solution With Tree Shaking**:
```javascript
// You write:
import { Button } from 'ui-library';

// You get (only what's used: 5KB):
Button (5KB)

// Result: 99% smaller bundle
```

### How It Works:

Tree shaking relies on **ES6 module syntax** (import/export) which is **statically analyzable**:

```javascript
// ✅ ES6 modules - Tree shakeable
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

// If you only import add:
import { add } from './math';
// subtract is removed from bundle

// ❌ CommonJS - NOT tree shakeable
module.exports = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};
// Both included even if only one is used
```

**Why ES6 Modules Are Tree Shakeable**:
- **Static structure**: Imports/exports are at top level (not dynamic)
- **Analyzable at build time**: Bundler can trace dependencies
- **Explicit exports**: Knows exactly what's exported and what's imported

**Why CommonJS Is NOT Tree Shakeable**:
- **Dynamic**: `require()` can be called conditionally
- **Runtime evaluation**: Can't be analyzed at build time
- **Everything is exported**: Module.exports is a single object

### When and Where Used:

**1. Third-Party Libraries**:
```javascript
// Bad: Import entire library
import _ from 'lodash';              // 72KB
import moment from 'moment';         // 288KB
import * as MaterialUI from '@mui/material';  // 1.2MB

// Good: Import only what you need
import { debounce } from 'lodash-es';     // 2KB
import dayjs from 'dayjs';                // 8KB (alternative)
import { Button, TextField } from '@mui/material';  // 45KB
```

**2. Internal Code**:
```javascript
// utils/index.js - All utilities in one file
export function formatDate() { /* 5KB */ }
export function parseJSON() { /* 2KB */ }
export function generateId() { /* 1KB */ }
export function validateEmail() { /* 3KB */ }

// Only import what you need
import { formatDate } from './utils';  // Only 5KB included
```

**3. Component Libraries**:
```javascript
// Bad: Barrel imports
import { Button, Modal, Table } from './components';  // All included

// Good: Direct imports
import Button from './components/Button';  // Only Button
```

### Real-World Impact:

**Without Tree Shaking**:
```
App.js:
- Your code: 50KB
- React + dependencies: 130KB
- UI library (full): 500KB
- Lodash (full): 72KB
- Moment (full): 288KB
- Icons (all 5000): 450KB
Total: 1.49MB

TTI: 8.5s on 3G
Bounce rate: 58%
```

**With Tree Shaking**:
```
App.js:
- Your code: 50KB
- React + dependencies: 130KB (optimized)
- UI library (used): 45KB
- Lodash-es (3 functions): 6KB
- Day.js: 8KB
- Icons (10 used): 9KB
Total: 248KB

TTI: 2.1s on 3G
Bounce rate: 22%
```

**Savings**: 83% smaller bundle, 75% faster TTI, 62% lower bounce rate

### Role in Large-Scale Applications:

At FAANG scale, tree shaking is:
- **Mandatory**: Every KB matters at millions of users
- **Automated**: Build tools configured for maximum tree shaking
- **Monitored**: Bundle analysis in CI/CD catches regressions
- **Enforced**: Linting rules prevent non-tree-shakeable imports
- **Optimized**: Custom builds of third-party libraries

**Examples**:
- **Facebook**: Custom React builds with unused features removed
- **Google**: Closure Compiler for aggressive dead code elimination
- **Netflix**: Per-device bundles with device-specific code only
- **Amazon**: Region-specific bundles (US users don't get EU tax code)

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### How Tree Shaking Works Under the Hood

#### 1. **Static Analysis Phase**

Bundlers (Webpack, Rollup, ESBuild) analyze your code at build time:

```javascript
// app.js
import { add, multiply } from './math';
import { Button } from './components';

const result = add(5, 3);
console.log(result);

// Button is imported but never used
```

**Analysis Process**:
```
1. Parse all imports/exports
   - app.js imports: add, multiply, Button
   - app.js uses: add

2. Build dependency graph
   math.js
   ├── add (USED)
   └── multiply (UNUSED)
   
   components.js
   └── Button (IMPORTED but UNUSED)

3. Mark used exports
   - add: ✓ KEEP
   - multiply: ✗ REMOVE
   - Button: ✗ REMOVE (imported but never called)

4. Generate optimized bundle
   - Only includes add function
   - multiply and Button eliminated
```

#### 2. **ES6 Module Static Structure**

Why ES6 modules enable tree shaking:

```javascript
// ✅ ES6 Modules - Statically analyzable
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

import { add } from './math';  // Import is top-level, static

// Bundler knows:
// - Exactly what's exported: add, subtract
// - Exactly what's imported: add
// - subtract is never imported → REMOVE
```

```javascript
// ❌ CommonJS - Dynamic, not analyzable
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }

module.exports = { add, subtract };  // Everything in one object

const math = require('./math');  // Entire module imported
const { add } = require('./math');  // Still requires entire module

// Bundler can't know:
// - What will be accessed from module.exports
// - If require() is conditional: if (x) require('./math')
// - Must include entire module
```

**Why Static Analysis Matters**:
```javascript
// Static - Tree shakeable
import { foo } from './module';

// Dynamic - NOT tree shakeable
const moduleName = getModuleName();
import(`./${moduleName}`);  // Can't analyze at build time

// Conditional - NOT tree shakeable
if (condition) {
  import { bar } from './module';  // Can't determine at build time
}
```

#### 3. **Side Effects and Tree Shaking**

**Side effects** are code that does something beyond defining exports:

```javascript
// HAS side effects (not tree shakeable)
export function doSomething() { }

console.log('Module loaded!');  // Side effect
window.globalVar = 'value';     // Side effect
localStorage.setItem('key', 'val');  // Side effect

// Even if doSomething is unused, side effects mean
// this module can't be removed
```

**Pure modules (no side effects)**:
```javascript
// NO side effects (tree shakeable)
export function doSomething() { }
export function doAnother() { }

// If unused, entire module can be removed
```

**Marking Modules as Side-Effect Free**:

```json
// package.json
{
  "name": "my-library",
  "sideEffects": false  // All modules are side-effect free
}

// Or specify files with side effects
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}
```

**Why This Matters**:
```javascript
// Without sideEffects: false
import { Button } from 'ui-library';  // 500KB (includes all CSS, polyfills)

// With sideEffects: false
import { Button } from 'ui-library';  // 5KB (only Button code)
```

#### 4. **Dead Code Elimination (DCE)**

Tree shaking is one form of DCE. Minifiers like Terser perform additional DCE:

```javascript
// Source code
if (false) {
  console.log('Never runs');
}

if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}

// After DCE in production build
// (Both blocks completely removed)
```

**Unreachable Code Elimination**:
```javascript
function example() {
  return 'done';
  console.log('unreachable');  // Removed
}

function neverCalled() {
  // Entire function removed if never called
}
```

**Constant Folding**:
```javascript
// Source
const DEBUG = false;
if (DEBUG) {
  console.log('debug');
}

// After constant folding + DCE
// (Entire if block removed)
```

#### 5. **Webpack Tree Shaking Configuration**

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',  // Enables tree shaking
  
  optimization: {
    usedExports: true,        // Mark unused exports
    minimize: true,           // Run minification (includes DCE)
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            dead_code: true,      // Remove unreachable code
            drop_console: true,   // Remove console.* in production
            drop_debugger: true,  // Remove debugger statements
            pure_funcs: [
              'console.info',
              'console.debug'
            ]
          },
          mangle: true           // Shorten variable names
        }
      })
    ],
    
    // Split chunks intelligently
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Separate vendor code
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10
        },
        // Default group
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false,  // Don't transform ES6 modules
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ]
          }
        }
      }
    ]
  }
};
```

**Critical**: `modules: false` in Babel config preserves ES6 modules for tree shaking.

#### 6. **Rollup Tree Shaking**

Rollup pioneered tree shaking and is generally more aggressive:

```javascript
// rollup.config.js
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  
  plugins: [
    // Resolve node_modules
    resolve(),
    
    // Convert CommonJS to ES6
    commonjs(),
    
    // Minify
    terser({
      compress: {
        dead_code: true,
        drop_console: true,
        pure_funcs: ['console.info', 'console.debug']
      }
    })
  ],
  
  // Mark external dependencies (don't bundle)
  external: ['react', 'react-dom'],
  
  // Tree shaking configuration
  treeshake: {
    moduleSideEffects: false,  // Assume no side effects
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false
  }
};
```

#### 7. **Vite/ESBuild Tree Shaking**

Modern bundlers use ESBuild for speed:

```javascript
// vite.config.js
export default {
  build: {
    target: 'es2015',
    minify: 'terser',  // or 'esbuild'
    
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash-es', 'date-fns']
        }
      }
    },
    
    terserOptions: {
      compress: {
        dead_code: true,
        drop_console: true
      }
    }
  },
  
  optimizeDeps: {
    include: ['lodash-es'],  // Pre-bundle and tree shake
    exclude: ['your-local-package']
  }
};
```

---

### Advanced Tree Shaking Patterns

#### 1. **Barrel Files and Tree Shaking Issues**

**The Problem**:
```javascript
// components/index.js (barrel file)
export { Button } from './Button';
export { Modal } from './Modal';
export { Table } from './Table';
export { Form } from './Form';

// app.js
import { Button } from './components';  // Imports index.js

// Result: All components loaded due to side effects in some components
```

**Why It Fails**:
```javascript
// If Modal.js has side effects:
import './Modal.css';  // Side effect

export function Modal() { }

// Even if you only import Button, Modal.js is executed
// because of the barrel import, pulling in Modal.css
```

**Solutions**:

**Option 1: Direct imports**
```javascript
// Instead of barrel:
import { Button } from './components';

// Use direct imports:
import Button from './components/Button';
```

**Option 2: Side-effect-free barrel**
```javascript
// components/index.js
export { Button } from './Button';
export { Modal } from './Modal';

// package.json
{
  "sideEffects": false
}

// Now tree shaking works with barrel imports
```

**Option 3: Separate CSS imports**
```javascript
// Button.js - No side effects
export function Button() { }

// app.js - Explicit CSS import
import Button from './components/Button';
import './components/Button.css';
```

#### 2. **Tree Shaking React Components**

**Anti-Pattern**:
```javascript
// UILibrary.js
export default {
  Button: () => <button />,
  Modal: () => <div />,
  Table: () => <table />
};

// Usage
import UI from './UILibrary';
<UI.Button />  // Entire UILibrary included
```

**Tree-Shakeable Pattern**:
```javascript
// UILibrary.js
export const Button = () => <button />;
export const Modal = () => <div />;
export const Table = () => <table />;

// Usage
import { Button } from './UILibrary';
<Button />  // Only Button included
```

#### 3. **Tree Shaking Utility Functions**

**Lodash vs Lodash-ES**:

```javascript
// ❌ Lodash (CommonJS) - NO tree shaking
import _ from 'lodash';
const result = _.debounce(fn, 300);
// Result: Entire 72KB library

// ❌ Named import still doesn't work
import { debounce } from 'lodash';
// Result: Still 72KB (CommonJS)

// ✅ Lodash-ES - Tree shakeable
import { debounce } from 'lodash-es';
// Result: Only 2KB
```

**Creating Tree-Shakeable Utils**:

```javascript
// ❌ Not tree shakeable
const utils = {
  debounce: () => { },
  throttle: () => { },
  formatDate: () => { }
};

export default utils;

// ✅ Tree shakeable
export function debounce() { }
export function throttle() { }
export function formatDate() { }
```

#### 4. **Tree Shaking CSS**

**PurgeCSS/PostCSS**:

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: [
        './src/**/*.html',
        './src/**/*.jsx',
        './src/**/*.js'
      ],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: ['active', 'disabled']  // Never remove these
    })
  ]
};
```

**Before PurgeCSS**:
```css
/* Tailwind CSS: 3.8MB */
.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
/* ... 10,000 more classes */
```

**After PurgeCSS**:
```css
/* Only used classes: 15KB */
.p-4 { padding: 1rem; }
.text-blue-500 { color: #3b82f6; }
/* Only 50 classes actually used */
```

#### 5. **Tree Shaking with TypeScript**

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "esnext",        // Don't transform to CommonJS
    "target": "es2015",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // Important for tree shaking
    "declaration": true,
    "declarationMap": true,
    "isolatedModules": true
  }
}
```

**TypeScript and Side Effects**:
```typescript
// Not tree shakeable - class with decorator
@Component
export class MyComponent { }

// Tree shakeable - pure function
export function MyComponent() { }
```

---

### Common Tree Shaking Failures

#### 1. **Babel Transforming Modules**

```javascript
// ❌ Kills tree shaking
{
  "presets": [
    ["@babel/preset-env", {
      "modules": "commonjs"  // Transforms to CommonJS
    }]
  ]
}

// ✅ Preserves tree shaking
{
  "presets": [
    ["@babel/preset-env", {
      "modules": false  // Keep ES6 modules
    }]
  ]
}
```

#### 2. **Side Effects in Imports**

```javascript
// File has side effect
import './polyfills';  // Modifies globals
import 'whatwg-fetch';  // Adds fetch polyfill

export function myFunction() { }

// Even if myFunction is unused, side effects mean
// file can't be tree shaken
```

**Solution**:
```javascript
// Separate side effects
// polyfills.js - only imported in entry file
import 'whatwg-fetch';

// utils.js - pure, tree shakeable
export function myFunction() { }
```

#### 3. **Namespace Imports**

```javascript
// ❌ Prevents tree shaking
import * as utils from './utils';
utils.debounce();

// ✅ Allows tree shaking
import { debounce } from './utils';
debounce();
```

#### 4. **Default Exports**

```javascript
// ❌ Harder to tree shake
export default {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};

// ✅ Easier to tree shake
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
```

#### 5. **Dynamic Imports with Expressions**

```javascript
// ❌ Can't tree shake
const moduleName = getModuleName();
import(`./${moduleName}`);

// ✅ Static, can tree shake
import('./specificModule');
```

---

### Monitoring and Verification

#### **Bundle Analysis**

```bash
# Webpack Bundle Analyzer
npm install --save-dev webpack-bundle-analyzer
```

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: true,
      reportFilename: 'bundle-report.html'
    })
  ]
};
```

**Output**: Interactive visualization showing:
- Which modules are in your bundle
- Size of each module
- Which imports brought them in
- Opportunities for tree shaking

#### **Source Map Explorer**

```bash
npm install -g source-map-explorer
source-map-explorer dist/bundle.js dist/bundle.js.map
```

#### **Custom Tree Shaking Verification**

```javascript
// verify-tree-shaking.js
const fs = require('fs');

const bundle = fs.readFileSync('dist/bundle.js', 'utf8');

// Check for functions that should have been removed
const shouldBeRemoved = [
  'unusedFunction',
  'debugLogger',
  'testHelper'
];

shouldBeRemoved.forEach(fn => {
  if (bundle.includes(fn)) {
    console.error(`❌ Tree shaking failed: ${fn} still in bundle`);
    process.exit(1);
  } else {
    console.log(`✅ ${fn} successfully removed`);
  }
});
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Optimizing Third-Party Libraries

**Before (No Tree Shaking)**:
```javascript
// Using full libraries
import _ from 'lodash';                    // 72KB
import moment from 'moment';               // 288KB
import * as MaterialIcons from '@mui/icons-material';  // 1.8MB

function ProductCard({ product }) {
  const debouncedSearch = _.debounce(search, 300);
  const date = moment(product.createdAt).format('MMM DD');
  
  return (
    <div>
      <MaterialIcons.ShoppingCart />
      <h2>{product.name}</h2>
      <p>{date}</p>
    </div>
  );
}

// Bundle size: 2.16MB for this simple component
```

**After (With Tree Shaking)**:
```javascript
// Using tree-shakeable alternatives
import { debounce } from 'lodash-es';      // 2KB
import { format } from 'date-fns';         // 5KB
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';  // 2KB

function ProductCard({ product }) {
  const debouncedSearch = debounce(search, 300);
  const date = format(new Date(product.createdAt), 'MMM dd');
  
  return (
    <div>
      <ShoppingCartIcon />
      <h2>{product.name}</h2>
      <p>{date}</p>
    </div>
  );
}

// Bundle size: 9KB for same functionality
```

**Results**:
```
Before: 2.16MB
After: 9KB
Savings: 99.6%
Load time: 12.5s → 1.8s (on 3G)
```

---

### Example 2: Component Library Tree Shaking

**Problem**: Large component library with 100+ components.

```javascript
// components/index.js (barrel file)
export { Button } from './Button';
export { Modal } from './Modal';
export { Table } from './Table';
export { Form } from './Form';
export { Chart } from './Chart';
// ... 95 more components
```

**Before (No Tree Shaking)**:
```javascript
// app.js
import { Button, Modal } from './components';

// Webpack bundles ALL components because:
// 1. Some components have side effects (CSS imports)
// 2. Barrel file creates connection to all modules

// Result: 1.2MB (all 100 components)
```

**Solution 1: Mark as Side-Effect Free**:
```json
// package.json
{
  "name": "my-components",
  "sideEffects": false
}
```

```javascript
// Separate CSS imports
// Button.js - No side effects
export function Button() {
  return <button className="btn" />;
}

// app.js - Import CSS separately
import { Button, Modal } from './components';
import './components/Button.css';
import './components/Modal.css';

// Result: 15KB (only Button + Modal)
```

**Solution 2: Direct Imports**:
```javascript
// app.js
import Button from './components/Button';
import Modal from './components/Modal';

// Result: 15KB (only Button + Modal)
// No barrel file, no side effect issues
```

**Solution 3: Tree-Shakeable Barrel with Webpack Magic Comments**:
```javascript
// components/index.js
export { Button } from './Button' /* webpackExports: "Button" */;
export { Modal } from './Modal' /* webpackExports: "Modal" */;

// app.js
import { Button } from './components';

// Webpack explicitly tree shakes other exports
// Result: 8KB (only Button)
```

**Results Comparison**:
```
Original (no tree shaking):
- Bundle: 1.2MB
- TTI: 8.5s
- Used: 2 components
- Wasted: 98 components (1.185MB)

Optimized (tree shaking):
- Bundle: 15KB
- TTI: 2.1s
- Used: 2 components
- Wasted: 0 components
- Savings: 98.75%
```

---

### Example 3: Utility Functions Library

**Problem**: Internal utilities library growing over time.

```javascript
// utils/index.js (before)
export default {
  // Date utilities
  formatDate: () => { /* 5KB */ },
  parseDate: () => { /* 3KB */ },
  addDays: () => { /* 2KB */ },
  
  // String utilities
  capitalize: () => { /* 1KB */ },
  truncate: () => { /* 2KB */ },
  slugify: () => { /* 3KB */ },
  
  // Array utilities
  chunk: () => { /* 2KB */ },
  flatten: () => { /* 2KB */ },
  unique: () => { /* 1KB */ },
  
  // Validation
  validateEmail: () => { /* 4KB */ },
  validatePhone: () => { /* 3KB */ },
  validateURL: () => { /* 2KB */ }
};

// Total: 30KB
```

**Usage (Before)**:
```javascript
import utils from './utils';

function MyComponent() {
  const formatted = utils.formatDate(date);
  const valid = utils.validateEmail(email);
  
  // Result: Entire 30KB imported
  // Used: 9KB
  // Wasted: 21KB
}
```

**Refactor for Tree Shaking**:
```javascript
// utils/date.js
export function formatDate() { /* 5KB */ }
export function parseDate() { /* 3KB */ }
export function addDays() { /* 2KB */ }

// utils/string.js
export function capitalize() { /* 1KB */ }
export function truncate() { /* 2KB */ }
export function slugify() { /* 3KB */ }

// utils/array.js
export function chunk() { /* 2KB */ }
export function flatten() { /* 2KB */ }
export function unique() { /* 1KB */ }

// utils/validation.js
export function validateEmail() { /* 4KB */ }
export function validatePhone() { /* 3KB */ }
export function validateURL() { /* 2KB */ }

// utils/index.js (barrel - tree shakeable)
export * from './date';
export * from './string';
export * from './array';
export * from './validation';
```

**Usage (After)**:
```javascript
import { formatDate, validateEmail } from './utils';

function MyComponent() {
  const formatted = formatDate(date);
  const valid = validateEmail(email);
  
  // Result: Only 9KB imported
  // Used: 9KB
  // Wasted: 0KB
  // Savings: 70%
}
```

**package.json configuration**:
```json
{
  "name": "utils",
  "sideEffects": false,
  "exports": {
    ".": "./index.js",
    "./date": "./date.js",
    "./string": "./string.js",
    "./array": "./array.js",
    "./validation": "./validation.js"
  }
}
```

---

### Example 4: React Application with Aggressive Tree Shaking

**Scenario**: E-commerce app with multiple features, most users only use subset.

**Before**:
```javascript
// app.js
import React from 'react';
import { ProductList } from './features/products';
import { Cart } from './features/cart';
import { Checkout } from './features/checkout';
import { Admin } from './features/admin';
import { Analytics } from './features/analytics';
import { Recommendations } from './features/recommendations';

// Even if user never accesses admin, it's bundled
function App({ user }) {
  return (
    <div>
      <ProductList />
      <Cart />
      {user.isAdmin && <Admin />}  // Admin code bundled for all users
    </div>
  );
}

// Bundle: 2.5MB
// - Products: 400KB
// - Cart: 300KB
// - Checkout: 500KB
// - Admin: 800KB (only used by 2% of users)
// - Analytics: 200KB
// - Recommendations: 300KB
```

**After (Conditional Imports + Tree Shaking)**:
```javascript
// app.js
import React, { lazy, Suspense } from 'react';
import { ProductList } from './features/products';
import { Cart } from './features/cart';

// Conditionally load admin only for admins
const Admin = lazy(() => import('./features/admin'));

function App({ user }) {
  return (
    <div>
      <ProductList />
      <Cart />
      
      {user.isAdmin && (
        <Suspense fallback={<div>Loading admin...</div>}>
          <Admin />
        </Suspense>
      )}
    </div>
  );
}

// Regular users: 700KB (Products + Cart)
// Admin users: 1.5MB (Products + Cart + Admin)
// Savings for 98% of users: 72%
```

**Advanced: Feature Flags + Tree Shaking**:
```javascript
// features.js
export const FEATURES = {
  RECOMMENDATIONS: process.env.FEATURE_RECOMMENDATIONS === 'true',
  ANALYTICS: process.env.FEATURE_ANALYTICS === 'true',
  NEW_CHECKOUT: process.env.FEATURE_NEW_CHECKOUT === 'true'
};

// app.js
import { FEATURES } from './features';

// Dead code elimination removes unused features
if (FEATURES.RECOMMENDATIONS) {
  const Recommendations = lazy(() => import('./features/recommendations'));
  // Included in bundle
}

if (FEATURES.ANALYTICS) {
  const Analytics = lazy(() => import('./features/analytics'));
  // Included in bundle
}

// Build-time: 
// - FEATURE_RECOMMENDATIONS=false → Recommendations code eliminated
// - FEATURE_ANALYTICS=true → Analytics code included
```

**Results**:
```
Build for production (feature flags disabled):
- Base bundle: 700KB
- Recommendations: NOT INCLUDED (saved 300KB)
- Analytics: NOT INCLUDED (saved 200KB)
- New checkout: NOT INCLUDED (saved 450KB)
- Total: 700KB (72% smaller)

Build for internal (all features):
- Base bundle: 700KB
- All features: 1.65MB
- Total: 2.35MB (all features for internal testing)
```

---

### Example 5: CSS Tree Shaking with Tailwind

**Before (Full Tailwind)**:
```html
<!-- index.html -->
<link rel="stylesheet" href="tailwind.css">  <!-- 3.8MB -->

<!-- app.jsx -->
<div className="p-4 bg-blue-500 text-white rounded">
  <h1 className="text-2xl font-bold">Hello</h1>
</div>

<!-- Uses 6 classes, loads 12,000+ classes -->
```

**After (PurgeCSS)**:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};

// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      '@fullhuman/postcss-purgecss': {
        content: [
          './src/**/*.{js,jsx,ts,tsx}',
          './public/index.html'
        ],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
      }
    } : {})
  }
};
```

**Results**:
```
Before (full Tailwind):
- CSS: 3.8MB uncompressed
- CSS: 300KB gzipped
- Used classes: 50
- Unused classes: 11,950

After (PurgeCSS):
- CSS: 12KB uncompressed
- CSS: 4KB gzipped
- Used classes: 50
- Unused classes: 0
- Savings: 99.7% (uncompressed), 98.7% (gzipped)

Load time improvement:
- 3G: 4.5s → 0.2s
- 4G: 1.2s → 0.05s
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question**: "How do you optimize bundle size using tree shaking?"

**Strong Answer**:

"Tree shaking is critical for bundle optimization, and I approach it systematically across three layers: build configuration, code patterns, and library selection.

**First, build configuration**. Tree shaking requires ES6 modules, so I ensure Babel doesn't transform them to CommonJS. In my Webpack config, I set Babel's `modules: false`, enable `optimization.usedExports`, and use Terser for dead code elimination. For production builds at my last company, this configuration alone eliminated 35% of unused code.

**Second, code patterns**. I write tree-shakeable code by using named exports instead of default exports with object exports. For example, our utils library was 45KB with a default export object pattern. After refactoring to named exports and marking the package as `sideEffects: false`, tree shaking reduced it to 8KB for typical usage—an 82% reduction.

**The side effects flag is critical**. Without `sideEffects: false` in package.json, bundlers assume every module might have side effects and can't safely remove unused code. I learned this debugging why our component library wasn't tree shaking—components were importing CSS files directly, creating side effects. We moved CSS imports to the application level and marked the library as side-effect free, which reduced bundle sizes by 70%.

**Third, library selection**. I choose tree-shakeable alternatives: lodash-es instead of lodash, date-fns instead of moment, direct icon imports from Material-UI instead of namespace imports. For example, replacing lodash with lodash-es across our app saved 180KB because we only used 8 functions out of hundreds.

**For verification**, I use webpack-bundle-analyzer in CI/CD to catch tree shaking regressions. We set size budgets and alert if bundles grow unexpectedly. We caught a case where someone imported `import * as utils from 'utils'` instead of `import { debounce } from 'utils'`, which pulled in 40KB of unused code. The namespace import prevented tree shaking.

**Common anti-patterns I avoid**: barrel files with side effects, default exports with object patterns, CommonJS modules, and conditional imports with dynamic strings. These all break static analysis.

**Real impact at scale**: On our e-commerce site, aggressive tree shaking reduced the initial bundle from 1.2MB to 280KB, improved TTI from 8.2s to 2.4s on 3G, and increased mobile conversions by 18%. For our component library used by 50 teams, tree shaking meant teams only bundle components they use, saving 400-900KB per application.

**The key insight**: Tree shaking isn't just about configuration—it's about writing code that's statically analyzable. Use ES6 modules, named exports, avoid side effects, and verify with bundle analysis. Every 100KB saved is 1-2 seconds faster on mobile, which directly impacts user experience and conversions."

---

### Likely Follow-Up Questions

#### 1. **"Why doesn't tree shaking work with CommonJS modules?"**

**Answer**:

"CommonJS modules aren't tree shakeable because they're dynamic and can't be statically analyzed at build time.

**The fundamental difference**:

ES6 modules are static:
```javascript
// Top-level only, no conditionals
import { foo } from './module';
export function bar() { }

// Bundler knows at build time:
// - Exactly what's exported: bar
// - Exactly what's imported: foo
// - Can remove unused exports
```

CommonJS is dynamic:
```javascript
// Can be anywhere, conditional
const x = condition ? require('./a') : require('./b');

// Can't know at build time:
// - Which module will be required
// - What properties will be accessed
// - Must include everything
```

**Specific reasons CommonJS fails tree shaking**:

**1. Module.exports is a single object**:
```javascript
// All exports in one object
module.exports = {
  foo: () => { },
  bar: () => { },
  baz: () => { }
};

// Require gets the entire object
const { foo } = require('./module');

// Bundler sees:
// - Entire module.exports object referenced
// - Can't know which properties will be accessed
// - Must include all functions
```

**2. Require can be called anywhere**:
```javascript
function loadModule() {
  if (someCondition) {
    const utils = require('./utils');
    return utils.format();
  }
}

// Bundler can't determine:
// - If require will execute
// - Which properties will be used
// - Must include entire module
```

**3. Exports can be mutated**:
```javascript
// module.js
exports.foo = () => { };

// Later, conditionally:
if (process.env.DEBUG) {
  exports.bar = () => { };  // Dynamic export
}

// Bundler can't know what will be exported
```

**Real-world example**:

At my last company, we used lodash (CommonJS):
```javascript
const { debounce } = require('lodash');
// Bundle: 72KB (entire library)
```

Switching to lodash-es (ES6):
```javascript
import { debounce } from 'lodash-es';
// Bundle: 2KB (only debounce)
```

**Why the difference?**

Lodash (CommonJS):
```javascript
// lodash/index.js
module.exports = {
  debounce: require('./debounce'),
  throttle: require('./throttle'),
  // ... 300 more functions
};

// Entire object must be included
```

Lodash-es (ES6):
```javascript
// lodash-es/index.js
export { default as debounce } from './debounce.js';
export { default as throttle } from './throttle.js';
// ... 300 more functions

// Only imported functions included
```

**The solution**: Use ES6 modules everywhere, and if you must use CommonJS dependencies, use tools like `@rollup/plugin-commonjs` to convert them, though this isn't perfect for tree shaking."

---

#### 2. **"What are side effects and why do they prevent tree shaking?"**

**Answer**:

"Side effects are code that does something beyond defining exports—modifying global state, executing code at module load time, or importing files that do these things.

**Why they prevent tree shaking**:

If a module has side effects, the bundler must execute it even if its exports aren't used, because removing it might break the application.

**Examples of side effects**:

**1. Global mutations**:
```javascript
// utils.js
export function myFunction() { }

// Side effect: modifies window
window.myGlobal = 'value';

// Even if myFunction is unused, this module can't be removed
// because removing it would mean window.myGlobal isn't set
```

**2. Polyfills**:
```javascript
// module.js
import 'core-js/features/array/flat';  // Adds Array.prototype.flat

export function myFunction() { }

// Can't remove this module even if myFunction is unused
// because other code might depend on the polyfill
```

**3. CSS imports**:
```javascript
// Button.js
import './Button.css';  // Side effect

export function Button() { }

// Even if Button is unused, CSS import is a side effect
// Removing the module means CSS isn't loaded
```

**4. Top-level execution**:
```javascript
// analytics.js
console.log('Module loaded');  // Side effect
fetch('/api/track', { method: 'POST' });  // Side effect

export function trackEvent() { }

// Can't remove even if trackEvent is unused
```

**The `sideEffects` flag**:

```json
// package.json
{
  "sideEffects": false
}
```

This tells bundlers: "None of my modules have side effects, you can safely remove unused exports."

**Real-world debugging story**:

We had a component library where tree shaking wasn't working. Our bundle included 1.2MB even though we only imported Button (5KB).

Investigation:
```javascript
// Button.js
import './Button.css';  // Side effect!
export function Button() { }

// Table.js
import './Table.css';  // Side effect!
export function Table() { }

// index.js (barrel)
export { Button } from './Button';
export { Table } from './Table';

// app.js
import { Button } from 'component-library';
```

Even though we only imported Button, webpack executed the entire index.js, which imported Table.js, which had a CSS side effect. The bundler couldn't remove Table because of the CSS import.

**The fix**:

**Option 1**: Declare CSS as side effects
```json
{
  "sideEffects": ["*.css", "*.scss"]
}
```

**Option 2**: Separate CSS imports
```javascript
// Button.js - No side effects
export function Button() { }

// app.js - Explicit imports
import { Button } from 'component-library';
import 'component-library/Button.css';
```

**Option 3**: CSS-in-JS (no CSS files)
```javascript
// Button.js - No side effects
const styles = { button: { padding: '10px' } };
export function Button() {
  return <button style={styles.button} />;
}
```

We chose option 1 for backward compatibility. After adding the sideEffects array, our bundles dropped from 1.2MB to 8KB for typical single-component imports—a 99% reduction.

**Key lesson**: Always mark packages as `sideEffects: false` if they're pure, or specify which files have side effects. This single flag can make the difference between 1.2MB and 8KB."

---

#### 3. **"How do you verify that tree shaking is working correctly?"**

**Answer**:

"I use a multi-layered approach to verify tree shaking: automated bundle analysis, manual inspection, and regression prevention.

**1. Webpack Bundle Analyzer**:

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json'
    })
  ]
};
```

This generates an interactive visualization showing:
- What's in your bundle
- Size of each module
- Which imports brought them in

**How I use it**:
- Run on every build
- Check if unexpected modules are included
- Verify tree shaking by looking for modules that should be removed

**Example**: We imported `{ Button }` from our component library. Bundle analyzer showed `Modal`, `Table`, and 20 other components were included. This revealed tree shaking wasn't working due to a barrel file with side effects.

**2. Source Map Explorer**:

```bash
npm install -g source-map-explorer
source-map-explorer dist/bundle.js
```

Shows byte-by-byte breakdown of what's in your bundle. Great for finding unexpected large dependencies.

**3. Automated Size Checks in CI/CD**:

```javascript
// size-check.js
const fs = require('fs');
const path = require('path');

const MAX_BUNDLE_SIZE = 250 * 1024; // 250KB
const bundlePath = path.join(__dirname, 'dist/main.js');
const bundleSize = fs.statSync(bundlePath).size;

if (bundleSize > MAX_BUNDLE_SIZE) {
  console.error(`❌ Bundle size ${bundleSize} exceeds maximum ${MAX_BUNDLE_SIZE}`);
  process.exit(1);
}

console.log(`✅ Bundle size ${bundleSize} within limits`);
```

**4. Manual Verification**:

Search the production bundle for functions that should be tree shaken:

```javascript
// verify-tree-shaking.js
const fs = require('fs');

const bundle = fs.readFileSync('dist/bundle.js', 'utf8');

const shouldBeRemoved = [
  'unusedUtilFunction',
  'debugLogger',
  'testHelper',
  '__DEV__'
];

let failed = false;

shouldBeRemoved.forEach(name => {
  if (bundle.includes(name)) {
    console.error(`❌ Tree shaking failed: "${name}" found in bundle`);
    failed = true;
  } else {
    console.log(`✅ "${name}" successfully removed`);
  }
});

if (failed) {
  process.exit(1);
}
```

**5. Bundlephobia for Third-Party Libraries**:

Before adding a dependency, I check bundlephobia.com:
- Bundle size
- Whether it's tree shakeable
- Minified + gzipped size
- Better alternatives

Example:
- Moment: 288KB, not tree shakeable → Use date-fns: 78KB, tree shakeable
- Lodash: 72KB, not tree shakeable → Use lodash-es: 72KB, tree shakeable

**6. Differential Analysis**:

Compare bundle sizes before/after changes:

```bash
# Before change
npm run build
ls -lh dist/main.js  # 450KB

# Make change
# Import { Button } from library

# After change
npm run build
ls -lh dist/main.js  # 455KB

# Only 5KB added? Tree shaking works! ✅
# 500KB added? Tree shaking broken! ❌
```

**7. Lighthouse Bundle Analysis**:

```bash
npm install -g @lhci/cli

lhci autorun --collect.numberOfRuns=1 \
  --assert.preset=lighthouse:recommended \
  --assert.assertions.unused-javascript.level=error
```

Lighthouse identifies unused JavaScript and fails CI if it exceeds thresholds.

**Real-world debugging workflow**:

We noticed our bundle grew from 280KB to 850KB after adding a new feature. Here's how I debugged:

1. **Run bundle analyzer**: Saw `lodash` (72KB) and `moment` (288KB) were included
2. **Search code**: Found `import _ from 'lodash'` and `import moment from 'moment'`
3. **Check imports**: Both were CommonJS, not tree shakeable
4. **Replace dependencies**: 
   - lodash → lodash-es
   - moment → date-fns
5. **Verify**: Bundle dropped to 295KB
6. **Add test**: Added automated check to prevent CommonJS imports

**The key**: Don't trust that tree shaking works—verify it. Use bundle analyzer on every significant change, set size budgets in CI/CD, and manually inspect for known anti-patterns."

---

#### 4. **"What's the difference between tree shaking and dead code elimination?"**

**Answer**:

"Tree shaking and dead code elimination (DCE) are related but different optimizations that work together to reduce bundle size.

**Tree Shaking** (build-time):
- Removes unused **exports** across **modules**
- Works at the **module** level
- Requires **static analysis** of import/export statements
- Happens during **bundling** (Webpack, Rollup)

**Dead Code Elimination** (minification-time):
- Removes unreachable **code within** modules
- Works at the **statement** level
- Removes code that can't be executed
- Happens during **minification** (Terser, UglifyJS)

**Example**:

```javascript
// math.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

// app.js
import { add } from './math';

console.log(add(5, 3));

if (false) {
  console.log('Never runs');
}
```

**Tree Shaking** removes:
- `subtract` function (unused export)

**Dead Code Elimination** removes:
- The `if (false)` block (unreachable code)

**After both optimizations**:
```javascript
console.log(5 + 3);
// Everything else removed
```

**Detailed breakdown**:

**Tree Shaking Removes**:
1. Unused exports:
```javascript
// module.js
export const used = 'keep';
export const unused = 'remove';  // ← Tree shaken

// app.js
import { used } from './module';
```

2. Unused imports:
```javascript
import { used, unused } from './module';  // unused removed
console.log(used);
```

3. Entire unused modules:
```javascript
// If no exports from module.js are used,
// the entire module is removed
```

**Dead Code Elimination Removes**:
1. Unreachable code:
```javascript
function example() {
  return 'done';
  console.log('unreachable');  // ← DCE removes
}
```

2. Unused functions within a module:
```javascript
function used() { return 1; }
function unused() { return 2; }  // ← DCE removes if never called

export default used;
```

3. Dead branches:
```javascript
if (false) {  // ← DCE removes entire block
  console.log('never runs');
}

const DEBUG = false;
if (DEBUG) {  // ← DCE removes after constant folding
  console.log('debug');
}
```

4. Development-only code:
```javascript
if (process.env.NODE_ENV === 'development') {  // ← DCE removes in production
  console.log('dev only');
}
```

**They work together**:

```javascript
// Step 1: Original code
// utils.js
export function used() { return 1; }
export function unused() { return 2; }

// app.js
import { used } from './utils';

if (process.env.NODE_ENV === 'development') {
  console.log(used());
}

// Step 2: Tree Shaking (bundling)
// Removes unused export
function used() { return 1; }
// function unused() removed by tree shaking

if (process.env.NODE_ENV === 'development') {
  console.log(used());
}

// Step 3: Dead Code Elimination (minification)
// In production build, process.env.NODE_ENV === 'production'
// Constant folding makes condition always false
// DCE removes entire if block
function used() { return 1; }
// Everything else removed

// Step 4: Final DCE pass
// used() is defined but never called
// DCE removes it too
// Result: Empty file (completely eliminated)
```

**Real-world example**:

At my last company, we had a debugging utility:

```javascript
// debug.js
export function log(message) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG]: ${message}`);
  }
}

export function trace(object) {
  if (process.env.NODE_ENV === 'development') {
    console.trace(object);
  }
}

export function assert(condition, message) {
  if (process.env.NODE_ENV === 'development') {
    if (!condition) {
      throw new Error(message);
    }
  }
}

// app.js
import { log, trace } from './debug';

log('App started');
// trace is imported but never called
```

**Development build** (tree shaking + no DCE):
- `log()` included with console.log
- `trace()` removed by tree shaking (imported but unused)
- `assert()` removed by tree shaking (not imported)
- Size: ~250 bytes

**Production build** (tree shaking + DCE):
- `log()` reduced to empty function by DCE (condition always false)
- Empty function removed by DCE (does nothing)
- `trace()` removed by tree shaking
- `assert()` removed by tree shaking
- Size: 0 bytes (completely eliminated)

**Key differences**:

| Aspect | Tree Shaking | Dead Code Elimination |
|--------|--------------|----------------------|
| **Level** | Module/export | Statement/expression |
| **Phase** | Bundling | Minification |
| **Tool** | Webpack/Rollup | Terser/UglifyJS |
| **Requires** | ES6 modules | Any code |
| **Removes** | Unused exports | Unreachable code |
| **Example** | `export const unused` | `if (false) { }` |

**Both are essential**: Tree shaking removes unused modules, DCE removes unused code within modules. Together, they can reduce bundles by 80-90%."

---

#### 5. **"How do you make a library tree-shakeable?"**

**Answer**:

"Making a library tree-shakeable requires careful design decisions from architecture to package configuration. I'll walk through the complete process.

**1. Use ES6 Module Syntax**:

```javascript
// ❌ Not tree-shakeable (CommonJS)
module.exports = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};

// ✅ Tree-shakeable (ES6)
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
```

**2. Use Named Exports (Not Default Object Export)**:

```javascript
// ❌ Not tree-shakeable
const utils = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};
export default utils;

// ✅ Tree-shakeable
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
```

**3. Mark Package as Side-Effect Free**:

```json
// package.json
{
  "name": "my-library",
  "version": "1.0.0",
  "sideEffects": false,  // Critical!
  
  // Or specify files with side effects
  "sideEffects": [
    "*.css",
    "*.scss",
    "./polyfills.js"
  ]
}
```

**4. Avoid Side Effects in Modules**:

```javascript
// ❌ Has side effects (not tree-shakeable)
console.log('Module loaded');  // Side effect
window.globalVar = 'value';    // Side effect

export function myFunction() { }

// ✅ No side effects (tree-shakeable)
export function myFunction() { }
```

**5. Separate CSS/Style Imports**:

```javascript
// ❌ CSS import is side effect
import './Button.css';
export function Button() { }

// ✅ Option 1: CSS-in-JS
const styles = { button: { padding: '10px' } };
export function Button() {
  return <button style={styles.button} />;
}

// ✅ Option 2: Separate CSS imports
// Button.js
export function Button() { }

// User imports CSS separately
import { Button } from 'library';
import 'library/Button.css';
```

**6. Configure Babel to Preserve ES6 Modules**:

```json
// .babelrc
{
  "presets": [
    ["@babel/preset-env", {
      "modules": false,  // Don't transform to CommonJS!
      "targets": {
        "esmodules": true
      }
    }]
  ]
}
```

**7. Provide Multiple Entry Points**:

```json
// package.json
{
  "main": "./dist/cjs/index.js",    // CommonJS (legacy)
  "module": "./dist/esm/index.js",  // ES6 modules (tree-shakeable)
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./utils": "./dist/esm/utils.js",
    "./components": "./dist/esm/components.js"
  }
}
```

**8. Organize Code for Optimal Tree Shaking**:

```javascript
// ❌ One large file (harder to tree shake)
// utils.js (500KB)
export function a() { }
export function b() { }
// ... 100 more functions

// ✅ Separated by category
// utils/date.js
export function formatDate() { }
export function parseDate() { }

// utils/string.js
export function capitalize() { }
export function truncate() { }

// utils/index.js (barrel)
export * from './date';
export * from './string';
```

**9. Test Tree Shaking**:

```javascript
// test-tree-shaking.js
const fs = require('fs');
const { build } = require('esbuild');

async function testTreeShaking() {
  // Test importing single function
  await build({
    entryPoints: ['test-entry.js'],
    bundle: true,
    minify: true,
    outfile: 'test-bundle.js'
  });
  
  const size = fs.statSync('test-bundle.js').size;
  
  // Should be small (only one function)
  if (size > 5000) {
    console.error(`Tree shaking failed! Bundle is ${size} bytes`);
    process.exit(1);
  }
  
  console.log(`✅ Tree shaking works! Bundle is ${size} bytes`);
}

testTreeShaking();
```

**10. Document Tree-Shaking in README**:

```markdown
## Tree Shaking

This library is fully tree-shakeable. Import only what you need:

```javascript
// ✅ Good: Only imports Button (5KB)
import { Button } from 'my-library';

// ❌ Bad: Imports everything (500KB)
import * as MyLibrary from 'my-library';
```

## Bundle Size
- Button: 5KB
- Modal: 12KB
- Table: 25KB
```

**Real-world example**:

I built a UI component library that initially wasn't tree shakeable:

**Before** (not tree-shakeable):
```javascript
// components/index.js
import './styles/global.css';  // Side effect!

const components = {
  Button: require('./Button').default,
  Modal: require('./Modal').default,
  Table: require('./Table').default
};

module.exports = components;

// User imports:
const { Button } = require('my-library');
// Bundle: 500KB (all components + CSS)
```

**After** (tree-shakeable):
```json
// package.json
{
  "sideEffects": ["*.css"],
  "module": "dist/esm/index.js",
  "exports": {
    ".": "./dist/esm/index.js",
    "./Button": "./dist/esm/Button.js",
    "./Modal": "./dist/esm/Modal.js"
  }
}
```

```javascript
// components/index.js (no side effects)
export { Button } from './Button';
export { Modal } from './Modal';
export { Table } from './Table';

// components/Button.js (no CSS import)
export function Button() { }

// User imports:
import { Button } from 'my-library';
import 'my-library/styles/Button.css';
// Bundle: 5KB (only Button)
```

**Results**:
- Bundle size for single component: 500KB → 5KB (99% reduction)
- Adoption across teams increased 3x (faster apps)
- Documentation made tree-shaking explicit

**Key takeaways**:
1. ES6 modules only
2. Named exports
3. `sideEffects: false` in package.json
4. No CSS/side effects in module scope
5. Babel must preserve ES6 modules
6. Provide both ESM and CJS builds
7. Test tree shaking in CI
8. Document expected behavior"

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Complete Tree-Shakeable Library Setup

```javascript
// Project structure:
// my-library/
// ├── src/
// │   ├── components/
// │   │   ├── Button.js
// │   │   ├── Modal.js
// │   │   └── index.js
// │   ├── utils/
// │   │   ├── date.js
// │   │   ├── string.js
// │   │   └── index.js
// │   └── index.js
// ├── package.json
// ├── rollup.config.js
// └── .babelrc

// ============================================
// src/components/Button.js
// ============================================
/**
 * Button component - no side effects
 */
export function Button({ children, onClick, variant = 'primary' }) {
  const styles = {
    primary: { background: '#007bff', color: 'white' },
    secondary: { background: '#6c757d', color: 'white' }
  };
  
  return (
    <button onClick={onClick} style={styles[variant]}>
      {children}
    </button>
  );
}

// ============================================
// src/components/Modal.js
// ============================================
export function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: 'white', padding: '20px' }}>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ============================================
// src/components/index.js
// ============================================
/**
 * Barrel file - tree shakeable because:
 * 1. Uses ES6 named exports
 * 2. No side effects
 * 3. Package marked as sideEffects: false
 */
export { Button } from './Button';
export { Modal } from './Modal';

// ============================================
// src/utils/date.js
// ============================================
/**
 * Date utilities - pure functions, no side effects
 */
export function formatDate(date, format = 'MM/DD/YYYY') {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('MM', month)
    .replace('DD', day)
    .replace('YYYY', year);
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

// ============================================
// src/utils/string.js
// ============================================
/**
 * String utilities - pure functions
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str, length = 50) {
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// src/utils/index.js
// ============================================
/**
 * Utils barrel - tree shakeable
 */
export * from './date';
export * from './string';

// ============================================
// src/index.js (main entry)
// ============================================
/**
 * Main entry point - exports everything
 */
export * from './components';
export * from './utils';

// ============================================
// package.json
// ============================================
{
  "name": "my-library",
  "version": "1.0.0",
  "description": "A tree-shakeable component library",
  
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  
  "sideEffects": false,
  
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./components": {
      "import": "./dist/esm/components/index.js",
      "require": "./dist/cjs/components/index.js"
    },
    "./utils": {
      "import": "./dist/esm/utils/index.js",
      "require": "./dist/cjs/utils/index.js"
    }
  },
  
  "files": [
    "dist"
  ],
  
  "scripts": {
    "build": "npm run build:esm && npm run build:cjs && npm run build:types",
    "build:esm": "rollup -c --format esm --file dist/esm/index.js",
    "build:cjs": "rollup -c --format cjs --file dist/cjs/index.js",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist/types",
    "test:tree-shaking": "node scripts/test-tree-shaking.js"
  },
  
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/preset-react": "^7.22.0",
    "@rollup/plugin-babel": "^6.0.0",
    "@rollup/plugin-node-resolve": "^15.2.0",
    "rollup": "^4.0.0",
    "rollup-plugin-terser": "^7.0.2",
    "typescript": "^5.2.0"
  },
  
  "peerDependencies": {
    "react": ">=16.8.0"
  }
}

// ============================================
// .babelrc
// ============================================
{
  "presets": [
    ["@babel/preset-env", {
      "modules": false,
      "targets": {
        "esmodules": true
      }
    }],
    "@babel/preset-react"
  ]
}

// ============================================
// rollup.config.js
// ============================================
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.js',
  
  external: ['react', 'react-dom'],
  
  output: [
    {
      file: 'dist/esm/index.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/cjs/index.js',
      format: 'cjs',
      sourcemap: true
    }
  ],
  
  plugins: [
    resolve(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: [
        ['@babel/preset-env', {
          modules: false,
          targets: {
            esmodules: true
          }
        }],
        '@babel/preset-react'
      ]
    }),
    terser({
      compress: {
        dead_code: true,
        drop_console: false
      }
    })
  ],
  
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false
  }
};

// ============================================
// scripts/test-tree-shaking.js
// ============================================
const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

async function testTreeShaking() {
  console.log('Testing tree shaking...\n');
  
  // Test 1: Import single component
  const test1 = path.join(__dirname, '../test/entry1.js');
  fs.writeFileSync(test1, `
    import { Button } from '../src/index';
    console.log(Button);
  `);
  
  await build({
    entryPoints: [test1],
    bundle: true,
    minify: true,
    outfile: 'test/bundle1.js'
  });
  
  const size1 = fs.statSync('test/bundle1.js').size;
  console.log(`Test 1 - Single component: ${size1} bytes`);
  
  if (size1 > 10000) {
    console.error('❌ Tree shaking failed! Bundle too large for single component.');
    process.exit(1);
  }
  
  // Test 2: Import single util function
  const test2 = path.join(__dirname, '../test/entry2.js');
  fs.writeFileSync(test2, `
    import { formatDate } from '../src/index';
    console.log(formatDate(new Date()));
  `);
  
  await build({
    entryPoints: [test2],
    bundle: true,
    minify: true,
    outfile: 'test/bundle2.js'
  });
  
  const size2 = fs.statSync('test/bundle2.js').size;
  console.log(`Test 2 - Single util: ${size2} bytes`);
  
  if (size2 > 5000) {
    console.error('❌ Tree shaking failed! Bundle too large for single util.');
    process.exit(1);
  }
  
  // Test 3: Verify unused exports are removed
  const bundle = fs.readFileSync('test/bundle1.js', 'utf8');
  
  const shouldBeRemoved = ['Modal', 'capitalize', 'truncate'];
  let failed = false;
  
  shouldBeRemoved.forEach(name => {
    if (bundle.includes(name)) {
      console.error(`❌ "${name}" found in bundle (should be tree-shaken)`);
      failed = true;
    } else {
      console.log(`✅ "${name}" successfully tree-shaken`);
    }
  });
  
  if (failed) {
    process.exit(1);
  }
  
  console.log('\n✅ All tree shaking tests passed!');
}

testTreeShaking().catch(err => {
  console.error(err);
  process.exit(1);
});
```

---

### Webpack Configuration for Maximum Tree Shaking

```javascript
// webpack.config.js
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: argv.mode || 'development',
    
    entry: './src/index.js',
    
    output: {
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    
    optimization: {
      usedExports: true,
      
      minimize: isProduction,
      
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              dead_code: true,
              drop_console: isProduction,
              drop_debugger: true,
              pure_funcs: [
                'console.log',
                'console.info',
                'console.debug',
                'console.trace'
              ],
              passes: 2
            },
            mangle: {
              safari10: true
            },
            output: {
              comments: false,
              ascii_only: true
            }
          },
          extractComments: false
        })
      ],
      
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
      
      runtimeChunk: 'single',
      
      moduleIds: 'deterministic'
    },
    
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  modules: false,
                  useBuiltIns: 'usage',
                  corejs: 3
                }],
                '@babel/preset-react'
              ],
              cacheDirectory: true
            }
          }
        }
      ]
    },
    
    resolve: {
      extensions: ['.js', '.jsx'],
      mainFields: ['module', 'main']
    },
    
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode),
        __DEV__: !isProduction
      }),
      
      isProduction && new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'bundle-report.html',
        openAnalyzer: false
      })
    ].filter(Boolean)
  };
};
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**Performance Impact**:
- **70-90% smaller bundles**: Remove unused code before users download it
- **2-5s faster TTI**: Smaller bundles parse and execute faster
- **Better mobile experience**: Critical for slow networks and limited data
- **Lower bounce rates**: Fast-loading apps retain users

**Business Value**:
- **Higher conversions**: 100ms faster = ~1% higher conversion
- **Reduced infrastructure costs**: $40-80K/month saved at scale
- **Better SEO**: Google's Core Web Vitals favor smaller bundles
- **Global reach**: Makes apps usable in emerging markets

**Developer Experience**:
- **Faster builds**: Smaller bundles build faster
- **Better debugging**: Less code to debug
- **Clearer dependencies**: Tree shaking exposes unused code
- **Library selection**: Forces evaluation of bundle size impact

### How It Works

**Technical Flow**:
```
1. Write code with ES6 imports/exports
   ↓
2. Bundler analyzes imports/exports (static analysis)
   ↓
3. Build dependency graph
   ↓
4. Mark used vs unused exports
   ↓
5. Remove unused exports (tree shaking)
   ↓
6. Minifier removes dead code (DCE)
   ↓
7. Output optimized bundle
```

**Requirements for Tree Shaking**:
1. ✅ ES6 module syntax (`import`/`export`)
2. ✅ Named exports (not default object exports)
3. ✅ `sideEffects: false` in package.json
4. ✅ No side effects in module scope
5. ✅ Babel configured to preserve ES6 modules
6. ✅ Production mode enabled
7. ✅ Minification enabled (Terser)

**Implementation Strategy**:
1. **Audit dependencies**: Replace non-tree-shakeable libraries
2. **Configure build tools**: Enable tree shaking in Webpack/Rollup
3. **Refactor code**: Use named exports, avoid side effects
4. **Mark packages**: Set `sideEffects: false`
5. **Verify**: Use bundle analyzer to confirm
6. **Monitor**: Set size budgets in CI/CD
7. **Maintain**: Enforce patterns with linting

**Key Principle**:
> "Write code that's statically analyzable. Use ES6 modules with named exports, avoid side effects, and let the bundler eliminate unused code. Verify with bundle analysis."

────────────────────────────────────

**In a senior/staff interview, demonstrate**:
- Understanding of ES6 vs CommonJS for tree shaking
- Knowledge of `sideEffects` flag and its impact
- Experience debugging tree shaking failures
- Bundle analysis workflow (webpack-bundle-analyzer)
- Real metrics: before/after bundle sizes, performance impact
- Trade-off awareness: when tree shaking doesn't work
- Library design: making your own libraries tree-shakeable
- Tooling knowledge: Webpack, Rollup, Terser configuration
- Production experience: monitoring, regression prevention
