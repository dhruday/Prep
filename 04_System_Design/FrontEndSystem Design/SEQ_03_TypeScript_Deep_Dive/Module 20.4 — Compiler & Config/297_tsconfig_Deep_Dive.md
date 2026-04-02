# 297 – tsconfig Deep Dive — strict, paths, moduleResolution

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

`tsconfig.json` controls how TypeScript compiles your code. The three most impactful settings: **`strict: true`** (enables all strict type checks — must-have for production), **`paths`** (module path aliases like `@/components/*`), and **`moduleResolution`** (how TS finds imported modules — `node`, `bundler`, or `nodenext`). Understanding these shows you can configure TypeScript for real projects, not just use it with defaults.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### strict: true (enables all of these)

```json
{
  "compilerOptions": {
    "strict": true
    // Equivalent to enabling ALL of:
    // "strictNullChecks": true       — null/undefined are distinct types
    // "strictFunctionTypes": true    — function param types checked properly
    // "strictBindCallApply": true    — bind/call/apply typed correctly
    // "strictPropertyInitialization": true — class props must be initialized
    // "noImplicitAny": true          — can't have implicit 'any' type
    // "noImplicitThis": true         — 'this' must be typed
    // "alwaysStrict": true           — emit "use strict" in JS
    // "useUnknownInCatchVariables": true — catch errors are unknown, not any
  }
}
```

### paths (Module Aliases)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
// Requires bundler config to match (Vite: resolve.alias, Webpack: resolve.alias)
```

### moduleResolution

```json
// "node"     — Legacy Node.js resolution (CJS) — most common with Webpack
// "node16"   — Modern Node.js with ESM support
// "nodenext" — Latest Node.js ESM, requires file extensions
// "bundler"  — For Vite/Webpack/esbuild (recommended for modern apps)
{
  "compilerOptions": {
    "moduleResolution": "bundler", // ✅ for Vite/Webpack projects
    "module": "ESNext"
  }
}
```

### Other Important Settings

```json
{
  "compilerOptions": {
    "target": "ES2022",              // Output JS version
    "jsx": "react-jsx",             // React 17+ JSX transform
    "esModuleInterop": true,        // import React from 'react' works
    "isolatedModules": true,        // Required for Vite/esbuild
    "skipLibCheck": true,           // Skip .d.ts checking (faster builds)
    "forceConsistentCasingInFileNames": true, // Prevent case-sensitive path bugs
    "resolveJsonModule": true,      // import data from './data.json'
    "noUncheckedIndexedAccess": true // arr[0] is T | undefined, not T
  }
}
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I enforced `strict: true` across all repos, configured path aliases (`@components/`, `@services/`), and used `bundler` moduleResolution with Vite. `noUncheckedIndexedAccess` caught 12 potential array out-of-bounds bugs in the first week.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Three tsconfig priorities: (1) `strict: true` — enables all strict checks, non-negotiable for production. (2) `paths` for module aliases (`@/components/*`), keeping imports clean. (3) `moduleResolution: 'bundler'` for Vite/Webpack projects. I also enable `noUncheckedIndexedAccess` which makes array/object access return `T | undefined`, catching out-of-bounds bugs at compile time."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```json
// Production tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"strict: true is non-negotiable. paths for clean imports. bundler for Vite/Webpack."** strict = all null checks + no implicit any. paths needs matching bundler config. moduleResolution: bundler for modern, node for legacy. noUncheckedIndexedAccess catches array bugs.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** tsconfig knowledge shows production TypeScript experience — not just using default settings.
**How:** strict: true, paths for aliases, bundler for modern resolution, noUncheckedIndexedAccess for safety.
**Companies:** Microsoft (TS creators — expect deep config knowledge), all four use TypeScript in production.
