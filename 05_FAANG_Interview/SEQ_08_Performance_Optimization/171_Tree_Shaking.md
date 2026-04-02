# 171. Tree Shaking
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"Tree shaking is dead code elimination at the module level — the bundler statically analyzes import/export relationships, identifies exports that are never imported anywhere, and removes them from the final bundle. At SAP, we found that importing date utilities from a utility package was importing 40KB of Intl polyfills we never used — because the package used CommonJS, not ES modules, so the bundler couldn't tree-shake it. Switching to a tree-shakeable ES module alternative dropped 40KB from the vendor chunk with zero code changes. Tree shaking works only with ES module static imports — `import { x } from 'y'` — not with CommonJS `require()`. The three things I check when tree shaking isn't working are: (1) is the library CJS or ESM? (2) is there a `sideEffects: false` declaration in package.json? (3) are we accidentally importing an entire namespace instead of named exports?"

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Tree shaking is the process by which a bundler (Webpack, Rollup, Vite/Rollup, esbuild) removes unused exports from the final bundle. The term comes from the idea of shaking a dependency tree — dead branches fall off.

**Why it matters:** Most libraries are significantly larger than what any single application uses. Without tree shaking: importing one utility function from a 500KB library bundles all 500KB. With tree shaking: only the imported function and its dependencies are included.

### How Tree Shaking Works

Tree shaking operates on **static analysis** of ES module `import`/`export` syntax:

```
Step 1: Build the module dependency graph
  index.ts → imports → utils.ts → imports → math.ts
                    → imports → string.ts
                    → imports → date.ts ← NOT imported anywhere

Step 2: Mark all exported symbols
  math.ts:   add ✓, subtract ✓, multiply ✗ (exported but never imported)
  string.ts: trim ✓, capitalize ✗
  date.ts:   formatDate ✗ (entire module unreachable)

Step 3: Remove unmarked symbols (tree shaking)
  Bundle: add, subtract, trim — nothing from date.ts
```

**Why ES modules are required:**

```typescript
// ES Modules (ESM) — STATICALLY ANALYZABLE ✅
// Bundler can determine at build time exactly which exports are used
import { add, subtract } from './math'; // explicit named imports
export { add };                         // explicit named exports

// CommonJS (CJS) — NOT statically analyzable ❌
const math = require('./math');  // entire module object loaded at runtime
module.exports = { add, multiply }; // can be dynamic
const fn = isAdmin ? math.adminFn : math.userFn; // runtime branch
```

CommonJS `require()` is dynamic — the imported value is determined at runtime. There's no way for a static analysis tool to determine which exports will be accessed. Therefore CJS libraries cannot be tree-shaken.

### The `sideEffects` Field

Even with ESM, bundlers are conservative — they won't remove an import if it might have **side effects** (code that runs on import and affects program behavior). The `sideEffects` field in `package.json` tells the bundler it's safe to remove unused imports.

```json
// package.json of a well-maintained library
{
  "name": "my-library",
  "sideEffects": false,     // ← entire library is safe to tree-shake
  
  // OR: list files that DO have side effects
  "sideEffects": [
    "./src/polyfills.js",   // this file has side effects (patches globals)
    "*.css",                // CSS imports always have side effects
    "./src/register.js"     // registers something globally
  ]
}
```

**What is a side effect?**
```typescript
// SIDE EFFECT: code that runs on import and affects external state
// (these files cannot be removed even if their exports aren't used)

// Polyfills (add to window/globalThis)
if (!Array.prototype.at) {
  Array.prototype.at = function(index) { /* ... */ };
}

// CSS imports (apply styles to DOM)
import './global.css';

// Service worker registration
navigator.serviceWorker.register('/sw.js');

// Analytics initialization
window._analytics = new Analytics({ key: 'abc' });
```

### Tree Shaking in Practice

**Webpack Configuration:**
```javascript
// webpack.config.js
module.exports = {
  mode: 'production',   // enables tree shaking + minification automatically
  
  optimization: {
    usedExports: true,            // mark unused exports for removal
    sideEffects: true,            // respect package.json sideEffects field
    concatenateModules: true,     // scope hoisting — merges small modules
    
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Terser performs the actual dead code removal after Webpack marks it
          compress: { dead_code: true, unused: true },
        },
      }),
    ],
  },
};
```

**Vite Configuration (Rollup under the hood):**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: 'no-external', // don't assume external packages have side effects
        propertyReadSideEffects: false,    // property access doesn't trigger side effects
        unknownGlobalSideEffects: false,   // unknown globals don't trigger side effects
      },
    },
  },
});
```

### Common Tree Shaking Failures

**Failure 1: Namespace import**
```typescript
// ❌ Imports everything — no tree shaking possible
import * as _ from 'lodash';
const result = _.cloneDeep(data);  // bundler can't know which methods you'll use

// ✅ Named import — tree-shakeable
import { cloneDeep } from 'lodash-es'; // note: lodash-es is the ESM build
const result = cloneDeep(data);
```

**Failure 2: Re-export of entire module**
```typescript
// ❌ utils/index.ts — re-exports everything
export * from './math';      // imports entire math module into index
export * from './string';    // imports entire string module
export * from './date';      // imports entire date module

// Consumer imports one function but gets all three modules bundled:
import { add } from '../utils'; // triggers import of math + string + date

// ✅ Better: consumer imports directly
import { add } from '../utils/math'; // only math module bundled
```

**Failure 3: CommonJS library masquerading as ESM**
```typescript
// Some packages have both CJS and ESM builds
// If the bundler resolves to the CJS build, tree shaking fails

// Check package.json "exports" field:
// "exports": {
//   ".": {
//     "import": "./dist/index.esm.js",  ← bundler prefers this
//     "require": "./dist/index.cjs.js"
//   }
// }

// If no "exports" field, bundler uses "main" (CJS) by default
// The fix: find the ESM build and import it directly
import { debounce } from 'lodash-es';  // lodash-es = full ESM build
```

**Failure 4: Side effect-ful CSS imports in component files**
```typescript
// MyComponent.tsx
import './MyComponent.css'; // side effect!
import { helper } from './helpers'; // helper might get removed

// If 'sideEffects: false' in package.json but component imports CSS,
// bundler tries to remove the component → CSS is also removed

// Solution: mark CSS files explicitly as side-effect-ful
// package.json: "sideEffects": ["*.css"]
```

**Failure 5: Dynamic computed imports using entire module**
```typescript
// ❌ Dynamic property access prevents tree shaking
const validators = { required, minLength, maxLength, email };
const validate = validators[validatorName]; // dynamic access — includes all validators

// ✅ Explicit switch statement — bundler can analyze
function getValidator(name: string) {
  switch (name) {
    case 'required': return required;
    case 'email': return email;
    default: return null;
  }
  // Only imported validators are included
}
```

### Tree Shaking Audit Workflow

```bash
# 1. Build with Bundle Analyzer
npx webpack-bundle-analyzer stats.json
# OR for Vite:
npx vite-bundle-visualizer

# 2. Look for large unexpected includes
# Red flags: entire lodash (70KB), moment (67KB), all of @mui/icons-material (3MB)

# 3. Check if library is CJS or ESM
node -e "const pkg = require('lodash/package.json'); console.log(pkg.exports, pkg.module)"
# If only 'main' field, not 'exports' or 'module' → CJS only → not tree-shakeable

# 4. Replace with ESM alternatives
# lodash → lodash-es (or individual lodash/cloneDeep)
# moment → date-fns (ESM, tree-shakeable from the start)
# @mui/icons-material → import directly from path
```

### Icon Libraries — The Hidden Tree Shaking Problem

Icon libraries are often the biggest tree-shaking failure in enterprise apps:

```typescript
// ❌ WRONG: Imports all 4,000+ Material Icons — 3.4MB
import { Home, Search, Settings, AccountCircle } from '@mui/icons-material';

// ✅ CORRECT: Path import — one file per icon
import HomeIcon         from '@mui/icons-material/Home';
import SearchIcon       from '@mui/icons-material/Search';
import SettingsIcon     from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

// Actually saves 3.39MB of bundle since only 4 icon SVGs are included

// For Lucide React (already tree-shakeable):
import { Home, Search } from 'lucide-react'; // ✅ named imports tree-shake correctly
```

### Scope Hoisting (Module Concatenation)

A related optimization: after tree shaking, Webpack/Rollup "flatten" the remaining modules into a single scope rather than wrapping each in a function. This:
- Reduces function call overhead
- Improves minifier effectiveness (minifier can see all code together)
- Reduces bundle size by 5–15% additionally

```javascript
// Before scope hoisting (each module wrapped):
var module1 = (function() { return { add: function(a,b) { return a+b; } }; })();
var module2 = (function() { return { use: function() { return module1.add(1,2); } }; })();

// After scope hoisting:
function add(a, b) { return a+b; }
function use() { return add(1, 2); }
// Minifier can now inline: function use() { return 3; }
```

---

## 🌍 3. Real-World Examples

### SAP — CJS Date Utility Package
SAP's internal utility package was written before ESM was adopted. It exported dozens of utilities via `module.exports`. Tree shaking was impossible — every import pulled in the entire 42KB package. After converting the package to ESM with named exports and `sideEffects: false`, consumers who imported one utility saw bundle reductions of 35–41KB. The effort was 2 days of refactoring for 41KB saved in every consumer app.

### Microsoft — @fluentui/react-icons
Microsoft Fluent UI's icon library suffered the same path-import problem. An early version required path imports (`@fluentui/react-icons/lib/icons/HomeIcon`). Switching to a properly tree-shakeable version with `sideEffects: false` and ESM build, and checking the bundler resolved to the ESM output, reduced the icon bundle from 1.2MB to 18KB for a typical enterprise app using ~30 icons.

### Adobe — lodash Migration
Adobe's design system consumed lodash with `import * as _ from 'lodash'` across 200+ components. A systematic migration to `lodash-es` imports (named, specific functions) was automated with a codemod script that rewrote imports. Result: vendors chunk reduced from 180KB to 34KB. The migration uncovered that 15 components imported `_.cloneDeep` where `structuredClone()` (now native) was sufficient — further saving one import entirely.

### Salesforce — LWC Component Library Tree Shaking
Salesforce Lightning Web Components uses Rollup for bundling. LWC's base component library has `sideEffects: false` declared, and each component is a separate ES module. When a Salesforce developer builds a page with 12 out of 80 base components, only those 12 compile into the page bundle. An early version without this marking included all base component registrations as side effects — every page got all 80 components regardless of usage. The `sideEffects` configuration change alone saved 280KB from the base page bundle.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Tree shaking is the bundler's static analysis process that removes unused exports. It works only with ES module syntax — `import { x } from 'y'` — because ES modules are statically analyzable at build time. CommonJS `require()` is dynamic, so bundlers can't determine at build time which exports will be accessed. Three things break tree shaking: namespace imports (`import * as lib`), CJS libraries (no ESM build), and missing `sideEffects: false` in package.json (bundler is conservative and keeps everything to avoid breaking side effects). At SAP, a date utility package was CJS — switching to an ESM alternative removed 41KB with zero code changes. The most common hidden problem I find in audits is icon libraries: `import { HomeIcon } from '@mui/icons-material'` imports all 4,000 icons. You need either path imports or a library that properly declares `sideEffects: false` with an ESM build. I verify tree shaking is working with bundle-analyzer and check for unexpected large modules in the vendor chunk."

### Follow-Up Q&A

**Q: What is `sideEffects: false` and why is it required for tree shaking?**
A: Without `sideEffects: false`, a bundler assumes every import could have side effects — code that runs when the module is imported and affects external state. To be safe, it keeps all imported modules even if their exports aren't used. With `sideEffects: false` in package.json, the bundler knows it can safely remove any module that isn't providing used exports. CSS files, polyfills, global registrations are exceptions — they should be listed explicitly: `"sideEffects": ["*.css"]`.

**Q: Does tree shaking work with TypeScript interfaces and types?**
A: TypeScript type imports are erased at compile time before bundling — they're never included in bundles regardless of tree shaking. Using `import type { Foo }` is the explicit syntax for type-only imports; the TypeScript compiler produces no output for them. Tree shaking then operates on the remaining JS `import` statements.

**Q: How do you check if tree shaking is working for a specific library?**
A: Four steps: (1) Run `npx webpack-bundle-analyzer` or `vite-bundle-visualizer` — look for unexpectedly large modules. (2) Check the library's `package.json` for `"exports"` field with an `"import"` entry pointing to an `.mjs` or `.esm.js` file — that's the ESM build. (3) Check for `"sideEffects": false` or explicit list. (4) Write a minimal test: import only one export from the library, build, and measure the size — if the entire library is included, tree shaking failed. Also use `--log-level verbose` in Webpack to see why modules are included.

### Tree Shaking Prerequisites Checklist

| Requirement | What to Check | Fix if Missing |
|-------------|---------------|----------------|
| ESM build of library | `package.json` `exports.import` field | Use `lodash-es` instead of `lodash`, `date-fns` instead of `moment` |
| `sideEffects: false` | `package.json` `sideEffects` field | Upstream PR or use fork |
| Named imports (not namespace) | `import { x }` not `import * as x` | Refactor to named imports |
| No re-export of full namespace | `export * from` in barrel files | Cherry-pick specific exports |
| Production mode build | `mode: 'production'` in Webpack | Never check tree-shaking in dev mode |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Audit script: finds likely tree-shaking failures in codebase

// tree-shake-audit.ts
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Pattern: namespace imports that prevent tree shaking
const namespaceImportPattern = /import\s+\*\s+as\s+\w+\s+from\s+['"]([^'"]+)['"]/g;

// Pattern: large packages that should be tree-shaken by name
const suspiciousPackages = [
  { pattern: /from ['"]lodash['"]/, suggestion: 'lodash-es with named imports' },
  { pattern: /from ['"]moment['"]/, suggestion: 'date-fns (tree-shakeable ESM)' },
  { pattern: /from ['"]@mui\/icons-material['"]/, suggestion: 'path imports: @mui/icons-material/IconName' },
];

function auditFile(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf8');
  const issues: string[] = [];

  // Check for namespace imports
  let match;
  while ((match = namespaceImportPattern.exec(content)) !== null) {
    issues.push(`  ❌ Namespace import from "${match[1]}" (line includes: ${match[0].trim()})`);
  }

  // Check for known problematic packages
  for (const { pattern, suggestion } of suspiciousPackages) {
    if (pattern.test(content)) {
      issues.push(`  ⚠️  "${pattern.source.replace(/\//g, '').slice(6,-2)}" — consider ${suggestion}`);
    }
  }

  return issues;
}

function findFiles(dir: string, ext: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    if (statSync(full).isDirectory()) files.push(...findFiles(full, ext));
    else if (ext.some(e => full.endsWith(e))) files.push(full);
  }
  return files;
}

// Run audit
const sourceFiles = findFiles('./src', ['.ts', '.tsx', '.js', '.jsx']);
const allIssues: Array<{ file: string; issues: string[] }> = [];

for (const file of sourceFiles) {
  const issues = auditFile(file);
  if (issues.length > 0) allIssues.push({ file, issues });
}

if (allIssues.length === 0) {
  console.log('✅ No tree-shaking issues found');
} else {
  console.log(`\n🌳 Tree-shaking audit — ${allIssues.length} file(s) with issues:\n`);
  for (const { file, issues } of allIssues) {
    console.log(`📄 ${file}`);
    issues.forEach(i => console.log(i));
    console.log();
  }
  process.exit(1); // Fail CI if issues found
}
```

```typescript
// ESM library package.json template (for library authors)
// package.json
{
  "name": "my-utils",
  "version": "1.0.0",
  
  // Mark: safe to tree-shake (no global side effects)
  "sideEffects": false,           // OR "sideEffects": ["*.css"] if has CSS
  
  // Entry points for different environments
  "main": "./dist/index.cjs.js",  // CJS for Node.js / old bundlers
  "module": "./dist/index.esm.js", // ESM for bundlers (legacy field)
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",   // ESM — bundlers prefer this
      "require": "./dist/index.cjs.js",   // CJS — Node.js fallback
      "types": "./dist/index.d.ts"
    },
    // Allow direct path imports for maximum tree-shaking
    "./string": {
      "import": "./dist/string.esm.js",
      "require": "./dist/string.cjs.js"
    },
    "./math": {
      "import": "./dist/math.esm.js",
      "require": "./dist/math.cjs.js"
    }
  },
  "types": "./dist/index.d.ts"
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"NESS"**
- **N** — Named imports (not namespace `import * as`) — required for tree shaking
- **E** — ESM (not CommonJS) — static analysis only works on ES modules
- **S** — `sideEffects: false` in package.json — tells bundler it's safe to remove unused
- **S** — Scope hoisting bonus — flattens modules after shaking for additional savings

### The Three Questions for Any Library
```
1. Does it have an ESM build?
   → Check package.json "exports.import" or "module" fields
   → If only "main" → CJS → not tree-shakeable

2. Is sideEffects declared?
   → Check package.json "sideEffects"
   → If absent → bundler assumes side effects → conservative (keeps everything)

3. Am I importing correctly?
   → import { x } from 'lib'  ← tree-shakeable
   → import * as lib from '.' ← NOT tree-shakeable
   → const x = require('lib') ← NOT tree-shakeable
```

### Analogy
Tree shaking is like a **library book returns audit**: your code is a reading list (imports), and the bundler is the librarian. Without tree shaking, the librarian delivers your entire library subscription every time (all exports). With tree shaking, they deliver only the specific books on your reading list. But you need to write a specific list (`import { x }`) — writing "give me everything from section A" (`import * as A`) forces them to bring all of section A.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Libraries are much larger than what any app uses — without tree shaking, `import { cloneDeep } from 'lodash'` bundles 70KB instead of 2KB; icon libraries like `@mui/icons-material` ship 3.4MB but apps use 20–30 icons; at SAP removing a CJS utility package dependency saved 41KB with zero code changes
- **How it works:** Bundler builds the export/import dependency graph using ES module static syntax, marks reachable exports, removes unreachable ones (tree-shaken), then Terser/minifier performs dead code elimination on the marked code; `sideEffects: false` is the permission slip that lets bundlers remove modules even when their exports aren't used
- **How Hruday uses it:** Audits vendor chunks with bundle-analyzer after every major dependency change, checks for namespace imports and CJS libraries, migrated SAP codebase from `lodash` to `lodash-es` with named imports, added an automated tree-shake audit script to CI that fails builds with namespace imports or known un-treeshakeable imports

---

✅ Topic 171/486 complete → Continuing to Topic 172: Memoization Techniques
