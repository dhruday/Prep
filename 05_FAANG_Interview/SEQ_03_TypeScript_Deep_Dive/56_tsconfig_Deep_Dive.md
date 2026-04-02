# 56. tsconfig Deep Dive — strict, paths, moduleResolution
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`tsconfig.json` controls how TypeScript compiles, type-checks, and resolves modules. The most important option is `"strict": true` — it enables a suite of checks that prevent the most common TypeScript mistakes, including `noImplicitAny`, `strictNullChecks`, and `strictFunctionTypes`. `paths` maps import aliases (`@components/*`) to physical directories. `moduleResolution` tells TypeScript how to resolve module imports — `"bundler"` is the modern default for Vite/esbuild projects. Getting these right is the difference between a TypeScript build that actually catches errors and one that lets unsafe code through.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The `strict` Flag — What It Enables

`"strict": true` is shorthand for enabling this suite of checks individually:

```json
{
  "strictNullChecks": true,       // null/undefined are not assignable to other types
  "noImplicitAny": true,          // error on expressions with inferred type 'any'
  "strictFunctionTypes": true,    // function parameter types are checked contravariantly
  "strictBindCallApply": true,    // bind/call/apply argument types are checked
  "strictPropertyInitialization": true, // class properties must be initialized in constructor
  "noImplicitThis": true,         // 'this' expressions with inferred type 'any' cause errors
  "alwaysStrict": true,           // emit "use strict" in all files
  "useUnknownInCatchVariables": true // catch clause variable is 'unknown' not 'any'
}
```

**`strictNullChecks` — the most impactful:**
```typescript
// Without strictNullChecks
function getName(user: User | null): string {
  return user.name; // ✅ no error — null check skipped, runtime TypeError
}

// With strictNullChecks
function getName(user: User | null): string {
  return user.name; // ❌ error: user might be null
  return user?.name ?? 'Anonymous'; // ✅ forced to handle null
}
```

**`noImplicitAny` — forces explicit types:**
```typescript
// Without noImplicitAny
function process(data) { // data: any implicitly — no error
  return data.value;
}

// With noImplicitAny
function process(data: unknown) { // must be explicit
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: unknown }).value;
  }
}
```

**`useUnknownInCatchVariables` — safer error handling:**
```typescript
try {
  const data = await fetchData();
} catch (error) {
  // With useUnknownInCatchVariables: error is 'unknown'
  if (error instanceof Error) {
    console.error(error.message); // ✅ only after type guard
  }
  // Without it: error is 'any' — .message always accessible but potentially undefined
}
```

### `paths` — Import Aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*":           ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*":      ["src/hooks/*"],
      "@utils/*":      ["src/utils/*"],
      "@types/*":      ["src/types/*"]
    }
  }
}
```

**CRITICAL:** `paths` tells TypeScript where to find types — it does NOT configure the runtime module bundler. You must configure the same aliases in your build tool:

```javascript
// vite.config.ts — must mirror tsconfig paths
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
    }
  }
});
```

### `moduleResolution` — How TypeScript Finds Modules

```json
{
  "moduleResolution": "bundler"  // Modern default for Vite/esbuild (TS 5.0+)
  // OR "node16" / "nodenext"    // For Node.js ESM projects
  // OR "node"                   // Legacy CommonJS (before TS 4.7)
}
```

**Comparison:**
```
"node" (legacy):
  - Resolves index.ts in directories
  - Assumes CommonJS
  - No .js extensions needed in imports (wrong for ESM)

"node16" / "nodenext":
  - Full Node.js ESM support
  - Requires .js extensions in relative imports: import './utils.js'
  - Checks exports field in package.json

"bundler" (TS 5.0+, recommended for Vite):
  - Behaves like modern bundlers (Vite, esbuild, Webpack)
  - No file extension required in imports
  - Respects package.json exports field
  - Does NOT require .js on relative imports
  - Correct for React/Vite projects
```

### Key Compilation Options

```json
{
  "compilerOptions": {
    // Target/Module
    "target": "ES2022",     // Output JS version (affects what gets transpiled)
    "module": "ESNext",     // Module system for output files
    "lib": ["ES2022", "DOM", "DOM.Iterable"], // Built-in type definitions to include

    // Type checking
    "strict": true,
    "noUnusedLocals": true,       // Error on unused local variables
    "noUnusedParameters": true,   // Error on unused function parameters
    "noFallthroughCasesInSwitch": true, // Error on switch cases that fall through

    // Module resolution
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "resolveJsonModule": true,     // Allow importing JSON files
    "allowImportingTsExtensions": true, // Allow .ts in import paths (bundler mode)

    // Output
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,           // Generate .d.ts files
    "declarationMap": true,        // Source maps for .d.ts files
    "sourceMap": true,

    // Interop
    "esModuleInterop": true,       // Allow default imports from CommonJS modules
    "allowSyntheticDefaultImports": true, // Allow default import where none declared

    // JSX
    "jsx": "react-jsx",            // React 17+ automatic JSX transform (no React import)
    
    // Misc
    "isolatedModules": true,       // Required for esbuild/Vite transpile-only mode
    "skipLibCheck": true,          // Skip type checking .d.ts in node_modules (performance)
    "forceConsistentCasingInFileNames": true // Catch case-sensitivity bugs on Windows/Mac
  }
}
```

### `isolatedModules: true` — Why It Matters for Vite

Vite uses esbuild to transpile TypeScript — but esbuild transpiles each file independently (no type information across files). `isolatedModules: true` catches patterns that break with file-isolated transpilation:

```typescript
// ❌ Breaks with isolatedModules: true
export { SomeType };             // Can't tell if SomeType is a type or value at file boundary
const enum Color { Red = 'red' } // Inlining requires cross-file knowledge

// ✅ Correct with isolatedModules
export type { SomeType };        // Explicit type export — safely erased
type Color = 'red' | 'blue';     // Use union instead of const enum
```

### Project References — Monorepo Configuration

```json
// Root tsconfig.json
{
  "references": [
    { "path": "./packages/ui" },
    { "path": "./packages/utils" },
    { "path": "./packages/app" }
  ]
}

// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "composite": true,    // Required for project references
    "outDir": "./dist",
    "declaration": true
  }
}
```

### ⚠️ Anti-Patterns & Pitfalls

- **Using `paths` without mirroring in build tool** — TypeScript compiles fine, but the bundler can't resolve the paths at runtime — module not found errors only surface after build.
- **`skipLibCheck: false` in CI** — slows TypeScript significantly when node_modules contains poorly-typed packages. Use `skipLibCheck: true` unless debugging a third-party type issue.
- **`target: "ES5"` with modern TypeScript** — TypeScript will transpile modern syntax down to ES5, but that's bundler's job in Vite projects. Use `"target": "ES2022"` and let Vite handle transpilation for legacy browsers.
- **Missing `"jsx": "react-jsx"`** — React 17+ auto-import JSX transform doesn't require `import React from 'react'` in every file, but only with `"jsx": "react-jsx"`. Without it, every JSX file needs the React import.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
At SAP Labs, migrating from `"target": "ES5"` to `"target": "ES2022"` with `"moduleResolution": "bundler"` reduced TypeScript build times by 40% — the compiler stopped transpiling modern syntax that Vite handled anyway. Adding `"strict": true` to the SAP Fiori codebase surfaced 200+ hidden null-dereference bugs that were caught in type-checking phase instead of reaching QA. The `paths` migration from relative imports (`../../../components/Button`) to `@components/Button` eliminated an entire category of broken import bugs during file moves.

**At FAANG scale:**
- **Microsoft:** TypeScript's own `tsconfig.json` is the reference implementation — Microsoft interviewers expect deep knowledge of strict mode options
- **Adobe:** React Spectrum uses `composite: true` project references for monorepo builds — TypeScript project references are expected at Adobe platform level
- **Salesforce:** LWC TypeScript compiler wraps `tsc` — tsconfig options directly affect Salesforce build pipelines; `isolatedModules: true` is required
- **Cisco:** Platform SDK build chain uses `declaration: true` and `declarationMap: true` for published packages — tsconfig for library publishing is expected

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "The most important tsconfig options form a triad: `strict: true` for safety, `moduleResolution: 'bundler'` for Vite compatibility, and `isolatedModules: true` to catch patterns that break esbuild's file-by-file transpilation. `paths` gives you clean import aliases but must be mirrored in your build tool — TypeScript uses them for type resolution, Vite needs them for module bundling. The one I enable immediately in every project is `strict: true` — it enables `strictNullChecks` which is the single biggest safety improvement. Without it, null-dereference bugs that TypeScript could have caught still ship to production."

### Likely Follow-up Questions
1. **What does `strict: true` enable?** → `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`
2. **What is `isolatedModules` and why does Vite require it?** → Vite uses esbuild which transpiles each file independently without type information — `isolatedModules: true` catches patterns that only work when the compiler has cross-file context (like `const enum` inlining and re-exporting type-only values)
3. **Difference between `moduleResolution: "node"` and `"bundler"`?** → `"node"` assumes CommonJS resolution; `"bundler"` matches modern bundler behavior (package.json exports, no file extension required, works with Vite/esbuild)
4. **If you set paths in tsconfig, is that all you need for aliases?** → No — tsconfig `paths` only configures TypeScript's type resolution. The build tool (Vite, Webpack) must also be configured with the same aliases for runtime module resolution.

### How to Signal Senior Thinking
> "The tsconfig that ships by default from `create vite@latest` is a good starting point but needs hardening for production: add `noUnusedLocals` and `noUnusedParameters` to catch dead code, set `noFallthroughCasesInSwitch` to enforce exhaustive switches, enable `forceConsistentCasingInFileNames` to prevent Windows/Mac path-casing bugs that only surface in CI. For library publishing, add `declaration: true` and `declarationMap: true` — consumers get jump-to-source navigation. In a monorepo, project references with `composite: true` give incremental builds: only changed packages are recompiled."

---

## 💻 5. Code Example

```jsonc
// tsconfig.json — production-ready React + Vite configuration
{
  "compilerOptions": {
    // ─── Language & Environment ──────────────────────────
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // ─── Module Resolution ───────────────────────────────
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,

    // ─── Import Aliases ──────────────────────────────────
    "baseUrl": ".",
    "paths": {
      "@/*":           ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*":      ["src/hooks/*"],
      "@utils/*":      ["src/utils/*"],
      "@types/*":      ["src/types/*"]
    },

    // ─── Type Safety (Strict Suite) ──────────────────────
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    // ─── JSX ─────────────────────────────────────────────
    "jsx": "react-jsx",   // React 17+ auto-transform — no import React needed

    // ─── Output ──────────────────────────────────────────
    "noEmit": true,       // Vite handles emission; tsc only type-checks
    "isolatedModules": true,  // Required for esbuild/Vite transpile-only

    // ─── Interop ─────────────────────────────────────────
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true  // Skip .d.ts type-checking in node_modules (performance)
  },

  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

```javascript
// vite.config.ts — aliases must mirror tsconfig paths
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@':           path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
      '@utils':      path.resolve(__dirname, './src/utils'),
    }
  }
});
```

---

## 🧠 6. Memory Aid

**Mental Model:** tsconfig = compiler contract. `strict` = null/any safety net. `moduleResolution: bundler` = Vite-compatible. `isolatedModules` = esbuild-safe. `paths` = alias TypeScript side (must mirror in Vite).

**If you go blank:** "strict: true is the one you always enable. moduleResolution: bundler for Vite. isolatedModules: true for esbuild. paths + vite alias together. noEmit: true when Vite handles build output."

**Mnemonic:** **SMILE: Strict, ModuleResolution, IsolatedModules, Library(paths), Emit-control**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: `strictNullChecks` prevents null-dereference runtime errors — direct UX protection  
→ Performance: `isolatedModules` + Vite esbuild = near-instant TypeScript transpilation (esbuild is 10-100x faster than `tsc`)  
→ Business: Misconfigured tsconfig lets unsafe code through type-checking — false sense of TypeScript safety with none of the actual protection

**How it works (3 sentences):**
`tsconfig.json` configures TypeScript's compilation and type-checking behavior — `strict: true` enables the full set of safety checks that catch the most common runtime bugs at compile time. `moduleResolution: "bundler"` aligns TypeScript's module lookup algorithm with how Vite and esbuild resolve imports, preventing resolution mismatches between type-checking and bundling. `isolatedModules: true` prohibits patterns that require cross-file type information (like inlining `const enum` values), which esbuild cannot perform during its file-by-file fast transpilation pass.

**Company relevance:**
- Microsoft: TypeScript team owns tsconfig design — interviewers expect fluency with every strict option and their individual effects
- Adobe: Monorepo with project references is Adobe's TypeScript build architecture — `composite: true` and incremental builds are expected knowledge
- Salesforce: LWC TypeScript configuration requires specific tsconfig settings for the platform build — `isolatedModules` and module resolution are tested
- Cisco: SDK publishing requires `declaration: true` + `declarationMap: true` — library tsconfig is expected at staff level

---
**✅ Topic 56/486 complete.**
**→ Continuing to Topic 57: Declaration Files (.d.ts) — Writing & Consuming**
