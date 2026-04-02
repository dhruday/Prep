# 57. Declaration Files (.d.ts) — Writing & Consuming
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`.d.ts` declaration files describe the types of JavaScript code without including any implementation — they're TypeScript's API contract for libraries. When you install `@types/react`, you get `.d.ts` files that describe React's API. You write `.d.ts` files to type-check untyped third-party libraries, add types to global variables, augment existing module types, or publish typed packages. Understanding them is essential for consuming libraries correctly and for writing any library consumed by TypeScript.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What Declaration Files Are

A `.d.ts` file is a type declaration — only type information, no executable JavaScript. It mirrors the shape of a corresponding `.js` file without the implementation.

```typescript
// Actual implementation: utils.ts
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
}

// Generated declaration: utils.d.ts
export declare function formatCurrency(amount: number, currency: string): string;
```

### Three Sources of Declaration Files

**1. Bundled with the package** — modern libraries ship their own `.d.ts`:
```
node_modules/
  axios/
    index.d.ts    ← ships with package
  package.json  ← "types": "index.d.ts"
```

**2. Separate `@types` packages** — DefinitelyTyped:
```bash
npm install --save-dev @types/react @types/node @types/lodash
```
These are community-maintained type definitions for libraries that don't ship their own.

**3. Written by you** — for untyped local JS or third-party libraries with no types.

### Writing Declaration Files

**For an untyped JS library (e.g., `legacy-analytics.js`):**
```typescript
// src/types/legacy-analytics.d.ts

declare module 'legacy-analytics' {
  export interface TrackOptions {
    event: string;
    properties?: Record<string, unknown>;
    userId?: string;
  }

  export function track(options: TrackOptions): void;
  export function identify(userId: string, traits?: Record<string, unknown>): void;
  export function page(name: string, properties?: Record<string, unknown>): void;

  // Default export
  interface Analytics {
    track: typeof track;
    identify: typeof identify;
    page: typeof page;
  }
  const analytics: Analytics;
  export default analytics;
}
```

**Global variable declarations** — for browser globals injected outside bundler:
```typescript
// src/types/globals.d.ts

// Extend Window interface
interface Window {
  __APP_CONFIG__: {
    apiBaseUrl: string;
    featureFlags: Record<string, boolean>;
    buildVersion: string;
  };
  dataLayer: Array<Record<string, unknown>>; // Google Tag Manager
}

// Global variable without Window
declare const __COMMIT_HASH__: string; // Injected by Vite define
declare const __BUILD_ENV__: 'development' | 'staging' | 'production';
```

**Ambient module declarations** — typing non-JS imports (CSS modules, SVGs, etc.):
```typescript
// src/types/assets.d.ts

// CSS Modules
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// SVG as React components (with SVGR)
declare module '*.svg' {
  import React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const url: string;
  export default url;
}

// Image assets
declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.webp'{ const src: string; export default src; }
```

### Module Augmentation — Extending Existing Types

```typescript
// Extend React Router's location state
import 'react-router-dom';

declare module 'react-router-dom' {
  interface LocationState { // extends existing, does not replace
    backgroundLocation?: Location;
    from?: string;
  }
}

// Extend Express Request for authentication
import 'express';

declare module 'express' {
  interface Request {
    user?: { id: string; role: string; }; // Added by auth middleware
  }
}

// Extend a library's existing interface (declaration merging)
import 'some-ui-library';

declare module 'some-ui-library' {
  interface ComponentTheme {
    customColor: string; // Add custom theme token
  }
}
```

### Publishing a Typed Library

```json
// package.json of published library
{
  "name": "@myorg/utils",
  "version": "1.0.0",
  "main":  "./dist/index.js",
  "types": "./dist/index.d.ts",      // ← tells TypeScript where declarations are
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"   // ← modern exports field
    }
  }
}
```

```json
// tsconfig.json for library compilation
{
  "compilerOptions": {
    "declaration": true,      // generate .d.ts files
    "declarationMap": true,   // generate .d.ts.map for go-to-source
    "declarationDir": "./dist",
    "emitDeclarationOnly": false, // true if using esbuild for JS, tsc only for types
    "stripInternal": true     // removes @internal JSDoc-tagged declarations from .d.ts
  }
}
```

### `/// <reference>` Directives

```typescript
// Reference a types library
/// <reference types="vite/client" />
// Adds Vite's built-in types: import.meta.env, import.meta.hot, etc.

// Reference a specific .d.ts file
/// <reference path="./custom-types.d.ts" />
```

### ⚠️ Anti-Patterns & Pitfalls

- **`declare module '*'` (wildcard catch-all)** — types every import as `any`. Used as a quick fix but defeats TypeScript entirely. Write specific module declarations.
- **Missing `tsconfig.json` `include` for `.d.ts` files** — global declaration files in `src/types/` must be in TypeScript's project scope. Add `"include": ["src"]` and ensure types folder is inside.
- **Module augmentation without importing the module first** — open augmentation only works when you first import the module in the same file. Without the import, TypeScript treats the file as a script (not a module), and the augmentation has no effect.
- **`declare module` vs `interface` merging** — use `declare module 'name' { ... }` for third-party library typing; use `interface` merging for extending globally available interfaces like `Window`.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
At SAP Labs, several legacy SAP UI5 JavaScript APIs had no TypeScript types. Writing `declare module '@sap/ui5-bundle'` with hand-crafted declarations for the 15 most-used APIs took 2 hours but gave the entire team type safety for those integrations — catching wrong argument types that previously only surfaced in runtime SAP exception dialogs. The `Window.__APP_CONFIG__` global was injected by the backend Fiori Launchpad — declaring it in `globals.d.ts` let every component access it without TypeScript errors.

**At FAANG scale:**
- **Microsoft:** TypeScript's own `lib.dom.d.ts` is the reference declaration file — interviewing at Microsoft means knowing how declaration files model APIs
- **Adobe:** React Spectrum ships hand-authored declaration files for its component library — consuming and extending these is standard Adobe frontend work
- **Salesforce:** LWC JavaScript API is declared in `.d.ts` files — platform engineers write and maintain these for Apex method return types
- **Cisco:** Webex Web SDK ships `.d.ts` files — extending them for organization-specific event types via module augmentation is expected

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Declaration files are the type layer for JavaScript without touching the implementation. They're how `@types/react` describes React's API without React's source code. I write them in four scenarios: typing untyped third-party libraries with `declare module`, declaring browser globals injected outside the bundler, typing non-JS imports like SVGs and CSS modules with ambient declarations, and module augmentation when I need to add properties to an existing library's types. The key with augmentation is you must import from the module in the same file — otherwise TypeScript treats it as a script context and the augmentation is ignored."

### Likely Follow-up Questions
1. **What is `declare module`?** → Declares the type shape of a JavaScript module that TypeScript doesn't know about — used for untyped or partially-typed libraries
2. **What is module augmentation?** → Adding to an existing module's types without replacing them — requires importing the module first in the same file, then redeclaring the module to merge additional types
3. **Where does TypeScript look for `.d.ts` files?** → In the package's `types`/`typings` field (`package.json`), in `@types/*` in node_modules, and in paths included by `tsconfig.json`
4. **What is `/// <reference types="..." />`?** → A triple-slash directive that adds a types library to the compilation — equivalent to adding it to `compilerOptions.types`

### How to Signal Senior Thinking
> "The distinction between `declare module` for global declarations and module augmentation is subtle but important. Module augmentation lets you add to `react-router-dom`'s types without replacing them — but you must import from it first to put TypeScript in 'module mode'. If the file has no imports/exports, TypeScript sees it as a script, not a module, and `declare module` creates a new ambient module rather than augmenting. That's the bug that trips up most developers: they write the augmentation but put it in a file with no imports, and it silently has no effect."

---

## 💻 5. Code Example

```typescript
// ─── 1. Typing an untyped analytics library ──────────────────────────
// src/types/analytics.d.ts

declare module 'sapanalytics' {
  export type EventName =
    | 'page_view'
    | 'button_click'
    | 'form_submit'
    | 'order_created';

  export interface TrackPayload {
    event: EventName;
    userId?: string;
    properties?: Record<string, string | number | boolean>;
    timestamp?: number;
  }

  export function track(payload: TrackPayload): void;
  export function setUser(userId: string, traits?: Record<string, string>): void;
  export function reset(): void;
}

// ─── 2. Global window augmentation ───────────────────────────────────
// src/types/globals.d.ts

interface AppConfig {
  apiBaseUrl: string;
  featureFlags: Readonly<Record<string, boolean>>;
  buildVersion: string;
  environment: 'dev' | 'staging' | 'prod';
}

interface Window {
  __APP_CONFIG__: AppConfig;
  dataLayer: Array<Record<string, unknown>>;
}

declare const __COMMIT_HASH__: string;   // injected by Vite define
declare const __BUILD_ENV__: AppConfig['environment'];

// ─── 3. Asset module declarations ────────────────────────────────────
// src/types/assets.d.ts

declare module '*.svg' {
  import React from 'react';
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  const src: string;
  export default src;
}

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

// ─── 4. Module augmentation — extending React Router ─────────────────
// src/types/router-augment.d.ts

import 'react-router-dom';  // ← MUST import first for module mode

declare module 'react-router-dom' {
  interface Register { // React Router v6.4+ registration pattern
  }
}

// ─── 5. Publishing a typed package ───────────────────────────────────

// packages/order-utils/src/index.ts
export function formatOrderId(id: string): string {
  return `ORD-${id.toUpperCase()}`;
}

export interface OrderSummary {
  id: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
}

// After compilation with declaration:true, generates:
// packages/order-utils/dist/index.d.ts

export declare function formatOrderId(id: string): string;
export interface OrderSummary {
  id: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
}

// tsconfig.json snippet that enables this:
// "declaration": true,
// "declarationDir": "./dist",
// "declarationMap": true
```

---

## 🧠 6. Memory Aid

**Mental Model:** `.d.ts` = type contract without implementation. `declare module` = type an untyped JS library. Module augmentation = extend an existing library's types (import first). `declaration: true` = generate `.d.ts` when publishing.

**If you go blank:** "Declaration files describe JS types without code. `declare module 'name'` types a whole library. Import first for augmentation to work. `@types/` packages are community declarations. `declaration: true` in tsconfig generates .d.ts from your TS source."

**Mnemonic:** **D = Describe, not Implement. M = Module declares types. A = Augment after import. P = Publish with declaration:true**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Untyped third-party APIs cause silent `any` propagation through codebases — writing declarations restores type safety at the boundary  
→ Performance: `skipLibCheck: false` type-checks all `.d.ts` in node_modules — understanding declaration structure helps debug type errors faster  
→ Business: Libraries published without `.d.ts` files have no TypeScript consumers — every SDK team must ship declarations for adoption

**How it works (3 sentences):**
`.d.ts` files contain only type declarations — `declare function`, `declare class`, `declare const`, `declare module` — with no executable JavaScript. TypeScript finds them via the package's `types` field in `package.json`, the `@types/` namespace in node_modules, or paths included in `tsconfig.json`. Module augmentation extends an existing module's types by importing the module in the same file (making TypeScript treat the file as a module), then re-declaring the module with additional type members that merge with the originals.

**Company relevance:**
- Microsoft: `lib.dom.d.ts` and TypeScript's own `tsserver.d.ts` are the gold standard — Microsoft expects deep `.d.ts` authoring knowledge, especially ambient module patterns
- Adobe: React Spectrum ships tightly maintained declaration files — Adobe's TypeScript interviews include questions on how types propagate through declaration files in component libraries
- Salesforce: LWC Apex types are auto-generated `.d.ts` files — platform engineers need to understand how to consume and extend them
- Cisco: Webex SDK's TypeScript surface is entirely declared via `.d.ts` files — writing augmentations for org-specific events is a common task

---
**✅ Topic 57/486 complete.**
**→ Continuing to Topic 58: TypeScript with Vite vs Webpack**
