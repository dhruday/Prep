# 298 – Declaration Files (.d.ts) — Writing & Consuming

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Declaration files (`.d.ts`) provide **type information without runtime code**. They serve three purposes: **(1) Typing third-party JS libraries** (DefinitelyTyped `@types/*`), **(2) Declaring global variables** (environment variables, window extensions), and **(3) Publishing library type definitions** alongside compiled JS. Understanding `.d.ts` files shows you can work with the TypeScript ecosystem at a library/infrastructure level, not just consume types.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Consuming Type Declarations

```bash
# Most libraries have types via DefinitelyTyped
npm install @types/react @types/node @types/lodash
# Some libraries ship their own types (no @types needed)
# axios, zod, react-query — check package.json "types" field
```

### Writing Declaration Files

```typescript
// global.d.ts — extend global types
declare global {
  interface Window {
    __APP_CONFIG__: { apiUrl: string; version: string; env: 'dev' | 'prod' };
  }
}

// env.d.ts — type environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_API_URL: string;
    REACT_APP_VERSION: string;
  }
}

// Vite env types
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}

// Module declaration for non-JS imports
declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}
declare module '*.css' { const classes: Record<string, string>; export default classes; }
```

### Publishing Library Types

```json
// package.json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts", // points to declaration file
  "files": ["dist"]
}
```

```typescript
// Generate .d.ts from source
// tsconfig.json
{ "compilerOptions": { "declaration": true, "declarationDir": "dist/types" } }
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I wrote `.d.ts` files for our internal SAPUI5 APIs that lacked TypeScript support, enabling type-safe usage across our team. Also declared global window properties for runtime configuration injection.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Declaration files provide types without runtime code. I use them for: typing global variables (window extensions, env vars), declaring module types for non-JS imports (SVG, CSS), and consuming @types/* for third-party libraries. For publishing, I generate .d.ts with `declaration: true` in tsconfig. At SAP, I wrote custom declarations for internal APIs that lacked TypeScript support."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// types/global.d.ts
declare global {
  interface Window {
    analytics: { track: (event: string, props?: Record<string, unknown>) => void };
  }
}

// types/modules.d.ts
declare module '*.png' { const src: string; export default src; }
declare module '*.json' { const value: Record<string, unknown>; export default value; }

// types/api.d.ts — typing a JS library without types
declare module 'legacy-api-client' {
  export interface ApiClient {
    get<T>(url: string): Promise<T>;
    post<T>(url: string, body: unknown): Promise<T>;
  }
  export function createClient(config: { baseUrl: string }): ApiClient;
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**".d.ts = types without runtime code."** Three uses: (1) @types/* for libraries, (2) global.d.ts for window/env extensions, (3) module declarations for non-JS imports. Generate with `declaration: true`. `declare module` for untyped libraries.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Shows infrastructure-level TypeScript knowledge — not just consuming types but creating them.
**How:** global.d.ts for globals, module declarations for assets, @types/* for libraries, declaration: true to generate.
**Companies:** Microsoft (library-level TS), all four have internal libraries requiring declarations.
