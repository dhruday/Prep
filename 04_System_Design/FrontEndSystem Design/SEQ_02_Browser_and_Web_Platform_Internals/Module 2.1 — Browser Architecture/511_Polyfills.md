# 511. Polyfills — Deep Dive

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
A polyfill is a piece of JavaScript code that provides modern browser API functionality in older browsers that don't natively support it. Unlike a shim (which provides a new API) or a transpiler (which converts syntax), a polyfill implements the **exact same API** defined in the spec so that production code works identically across browsers. Core examples: `Promise`, `fetch()`, `Array.prototype.includes()`, `Object.assign()`, `IntersectionObserver`, `ResizeObserver`, `Array.from()`, `String.prototype.padStart()`, `globalThis`, `structuredClone()`.

**Why it exists:**
Browser adoption of new APIs is uneven. When TC39 ratifies a proposal (Stage 4) or WHATWG publishes a spec, it takes months to years for all browsers to ship implementations. Meanwhile, developers want to use modern APIs today. Polyfills bridge this gap, letting teams write future-proof code while maintaining backward compatibility. At enterprise scale (SAP, Microsoft, Salesforce), dropping older browser support isn't always possible — customers on IE11, older Safari versions, or corporate-locked Chrome versions still need to be served.

**When and where it's used:**
- Enterprise apps supporting older browsers (SAP Fiori supporting IE11 until 2023)
- Progressive enhancement: use native API where available, polyfill where not
- Core-js: the standard library polyfill used by Babel (40B+ npm downloads)
- `@babel/preset-env` with `useBuiltIns` for automatic polyfill injection
- Service workers polyfilling network-level features (offline, background sync)
- Custom Elements polyfill for Web Components in legacy browsers
- `polyfill.io` (now Fastly-hosted) for CDN-delivered, UA-specific polyfills

**Role in large-scale applications:**
At FAANG scale, polyfill strategy directly impacts bundle size, performance, and engineering velocity. Google's approach: ship modern bundles to modern browsers (`<script type="module">`) and legacy bundles with polyfills to older browsers (`<script nomodule>`). This "differential serving" pattern eliminates polyfill overhead for 90%+ of users while maintaining backward compatibility. Understanding polyfills vs. transpilation, core-js vs. manual polyfills, and bundle-size impact is a senior frontend interview topic.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Polyfill vs. Transpile vs. Shim vs. Ponyfill**

| Term | What It Does | Example | How It Works |
|------|-------------|---------|--------------|
| **Polyfill** | Adds missing native API to global scope | `Promise` polyfill on IE11 | Checks if API exists, if not, adds it to global |
| **Transpiler** | Converts new syntax to old syntax | `const` → `var`, `?.` → `&&` chains | AST transformation at build time (Babel, SWC) |
| **Shim** | Provides a compatibility layer (may differ from spec) | `es5-shim` for `Object.create` | Adapts interface, may not be 100% spec-compliant |
| **Ponyfill** | Provides API as module export, NOT on global | `fetch` ponyfill via `node-fetch` | `import fetch from 'node-fetch'` — doesn't modify global |

```
┌────────────────────────────────────────────────────────────────┐
│                    WHAT NEEDS WHAT?                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  New SYNTAX (arrow functions, optional chaining, class):       │
│  → Needs TRANSPILATION (Babel/SWC converts to older syntax)    │
│  → Cannot be polyfilled (syntax is parser-level)               │
│                                                                │
│  New BUILT-IN (Promise, Symbol, Map, Set, WeakRef):            │
│  → Needs POLYFILL (adds constructor/prototype to global)       │
│  → Cannot be transpiled (it's runtime behavior, not syntax)    │
│                                                                │
│  New STATIC METHOD (Array.from, Object.assign):                │
│  → Needs POLYFILL                                              │
│                                                                │
│  New INSTANCE METHOD (Array.prototype.includes, .at()):        │
│  → Needs POLYFILL                                              │
│                                                                │
│  New WEB API (fetch, IntersectionObserver, ResizeObserver):    │
│  → Needs POLYFILL (not part of core-js, separate packages)    │
│                                                                │
│  New SYNTAX + BUILT-IN (async/await):                          │
│  → Needs BOTH: Babel transpiles syntax + regenerator-runtime   │
│    polyfills the async iterator protocol                       │
└────────────────────────────────────────────────────────────────┘
```

### **B. How Polyfills Work Internally**

#### Basic Pattern: Feature Detection + Implementation

```typescript
// Array.prototype.includes polyfill (simplified, spec-compliant)
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function (searchElement: unknown, fromIndex?: number): boolean {
      if (this == null) {
        throw new TypeError('"this" is null or undefined');
      }
      const o = Object(this);
      const len = o.length >>> 0; // ToUint32
      if (len === 0) return false;

      const n = fromIndex ?? 0;
      let k = Math.max(n >= 0 ? n : len + n, 0);

      while (k < len) {
        // SameValueZero comparison (handles NaN correctly)
        if (o[k] === searchElement || (Number.isNaN(o[k]) && Number.isNaN(searchElement as number))) {
          return true;
        }
        k++;
      }
      return false;
    },
    configurable: true,
    writable: true,
  });
}
```

#### Promise Polyfill Architecture (Simplified)

```typescript
// Stripped-down Promise implementation showing the state machine
type PromiseState = 'pending' | 'fulfilled' | 'rejected';
type Resolve<T> = (value: T | PromiseLike<T>) => void;
type Reject = (reason?: unknown) => void;
type Callback<T> = {
  onFulfilled: ((value: T) => unknown) | null;
  onRejected: ((reason: unknown) => unknown) | null;
  resolve: Resolve<unknown>;
  reject: Reject;
};

class PromisePolyfill<T> {
  private state: PromiseState = 'pending';
  private value: T | undefined;
  private reason: unknown;
  private callbacks: Callback<T>[] = [];

  constructor(executor: (resolve: Resolve<T>, reject: Reject) => void) {
    try {
      executor(this.resolve.bind(this), this.reject.bind(this));
    } catch (error) {
      this.reject(error);
    }
  }

  private resolve(value: T | PromiseLike<T>): void {
    if (this.state !== 'pending') return;

    // Handle thenables (Promise resolution procedure)
    if (value && typeof (value as PromiseLike<T>).then === 'function') {
      (value as PromiseLike<T>).then(
        (v) => this.resolve(v as T),
        (r) => this.reject(r)
      );
      return;
    }

    this.state = 'fulfilled';
    this.value = value as T;
    this.flush();
  }

  private reject(reason?: unknown): void {
    if (this.state !== 'pending') return;
    this.state = 'rejected';
    this.reason = reason;
    this.flush();
  }

  private flush(): void {
    // Microtask scheduling (queueMicrotask or setTimeout fallback)
    const schedule = typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (fn: () => void) => setTimeout(fn, 0);

    schedule(() => {
      for (const cb of this.callbacks) {
        if (this.state === 'fulfilled') {
          try {
            if (cb.onFulfilled) {
              cb.resolve(cb.onFulfilled(this.value!));
            } else {
              cb.resolve(this.value!);
            }
          } catch (e) {
            cb.reject(e);
          }
        } else if (this.state === 'rejected') {
          try {
            if (cb.onRejected) {
              cb.resolve(cb.onRejected(this.reason));
            } else {
              cb.reject(this.reason);
            }
          } catch (e) {
            cb.reject(e);
          }
        }
      }
      this.callbacks = [];
    });
  }

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromisePolyfill<TResult1 | TResult2> {
    return new PromisePolyfill<TResult1 | TResult2>((resolve, reject) => {
      this.callbacks.push({
        onFulfilled: onFulfilled as ((value: T) => unknown) | null ?? null,
        onRejected: onRejected as ((reason: unknown) => unknown) | null ?? null,
        resolve: resolve as Resolve<unknown>,
        reject,
      });
      if (this.state !== 'pending') this.flush();
    });
  }

  catch<TResult = never>(
    onRejected: (reason: unknown) => TResult | PromiseLike<TResult>
  ): PromisePolyfill<T | TResult> {
    return this.then(null, onRejected);
  }

  static resolve<T>(value: T): PromisePolyfill<T> {
    return new PromisePolyfill<T>((resolve) => resolve(value));
  }

  static reject(reason: unknown): PromisePolyfill<never> {
    return new PromisePolyfill<never>((_, reject) => reject(reason));
  }

  static all<T>(promises: PromisePolyfill<T>[]): PromisePolyfill<T[]> {
    return new PromisePolyfill<T[]>((resolve, reject) => {
      const results: T[] = new Array(promises.length);
      let remaining = promises.length;
      if (remaining === 0) { resolve([]); return; }
      promises.forEach((p, i) => {
        p.then(
          (value) => {
            results[i] = value;
            if (--remaining === 0) resolve(results);
          },
          reject
        );
      });
    });
  }
}
```

### **C. core-js — The Standard Polyfill Library**

core-js is the de facto standard library polyfill, providing polyfills for:
- ECMAScript: `Promise`, `Symbol`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Array.from`, `Object.assign`, `String.prototype.includes`, `Array.prototype.flat`, etc.
- Web APIs: `URL`, `URLSearchParams`, `structuredClone`, `queueMicrotask`, `globalThis`
- TC39 proposals: `Iterator.prototype.map`, `Set.prototype.intersection`, `Promise.allSettled`

**Bundle size impact of core-js:**

| Configuration | Bundle Size (gzipped) | Coverage |
|--------------|----------------------|----------|
| `core-js` full import | ~40 KB | Everything since ES3 |
| `core-js` with `useBuiltIns: 'usage'` | 5-15 KB | Only what your code uses |
| `core-js` with `useBuiltIns: 'entry'` | 15-25 KB | Everything for your browserslist |
| No polyfills (modern only) | 0 KB | Modern browsers only |

**Babel integration:**

```json
// babel.config.json — the production pattern
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": "> 0.25%, not dead",
        "useBuiltIns": "usage",
        "corejs": { "version": "3.36", "proposals": false },
        "modules": false,
        "bugfixes": true
      }
    ],
    "@babel/preset-typescript"
  ]
}
```

| `useBuiltIns` | Behavior | Bundle Size | Maintenance |
|--------------|----------|-------------|-------------|
| `false` | No polyfills injected | Smallest (no polyfills) | Manual |
| `"entry"` | Replace `import 'core-js'` with needed modules based on targets | Medium | Add entry import |
| `"usage"` | Auto-inject polyfills per file based on usage | Smallest + automatic | Zero maintenance |

### **D. Differential Serving (Module / Nomodule Pattern)**

```html
<!-- Modern browsers load this (no polyfills, ES2020+, smaller) -->
<script type="module" src="/app.modern.js"></script>

<!-- Legacy browsers load this (transpiled, polyfilled, larger) -->
<script nomodule src="/app.legacy.js"></script>
```

```
┌──────────────────────────────────────────────────────────────┐
│                  DIFFERENTIAL SERVING                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Modern (90%+ of users):                                     │
│  ┌──────────────────────────────────────────┐               │
│  │ ES2020 syntax (optional chaining, ??)     │               │
│  │ No polyfills                              │               │
│  │ Smaller bundle (~30-50% smaller)          │               │
│  │ <script type="module">                    │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
│  Legacy (<10% of users):                                     │
│  ┌──────────────────────────────────────────┐               │
│  │ ES5 syntax (transpiled by Babel)          │               │
│  │ core-js polyfills included                │               │
│  │ regenerator-runtime for async/await       │               │
│  │ Larger bundle                             │               │
│  │ <script nomodule>                         │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
│  Browser behavior:                                           │
│  Chrome 61+ → loads type="module", ignores nomodule         │
│  Safari 10.1+ → loads type="module", ignores nomodule       │
│  IE 11 → ignores type="module", loads nomodule              │
│  ⚠️ Safari 10.1 loads BOTH → use nomodule guard script      │
└──────────────────────────────────────────────────────────────┘
```

### **E. Common Interview Polyfill Questions**

Interviewers often ask to implement polyfills from scratch:

#### `Array.prototype.flat` Polyfill

```typescript
if (!Array.prototype.flat) {
  Array.prototype.flat = function<T>(this: T[], depth: number = 1): T[] {
    const flatten = (arr: unknown[], d: number): unknown[] => {
      return arr.reduce<unknown[]>((acc, val) => {
        if (Array.isArray(val) && d > 0) {
          acc.push(...flatten(val, d - 1));
        } else {
          acc.push(val);
        }
        return acc;
      }, []);
    };
    return flatten(this, depth) as T[];
  };
}

// [1, [2, [3, [4]]]].flat(2) → [1, 2, 3, [4]]
// [1, [2, [3, [4]]]].flat(Infinity) → [1, 2, 3, 4]
```

#### `Object.assign` Polyfill

```typescript
if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    value: function (target: Record<string, unknown>, ...sources: Record<string, unknown>[]) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      const to = Object(target);
      for (const source of sources) {
        if (source != null) {
          for (const key of Object.keys(source)) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              to[key] = source[key];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true,
  });
}
```

#### `Array.prototype.reduce` Polyfill

```typescript
if (!Array.prototype.reduce) {
  Array.prototype.reduce = function<T, U>(
    this: T[],
    callback: (accumulator: U, currentValue: T, currentIndex: number, array: T[]) => U,
    initialValue?: U
  ): U {
    if (this == null) throw new TypeError('Array.prototype.reduce called on null or undefined');
    if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');

    const o = Object(this) as T[];
    const len = o.length >>> 0;
    let k = 0;
    let accumulator: U;

    if (arguments.length >= 2) {
      accumulator = initialValue!;
    } else {
      if (len === 0) throw new TypeError('Reduce of empty array with no initial value');
      accumulator = o[k++] as unknown as U;
    }

    while (k < len) {
      if (k in o) {
        accumulator = callback(accumulator, o[k], k, o);
      }
      k++;
    }
    return accumulator;
  };
}
```

#### `Promise.allSettled` Polyfill

```typescript
if (!Promise.allSettled) {
  Promise.allSettled = function <T>(
    promises: Iterable<Promise<T>>
  ): Promise<PromiseSettledResult<T>[]> {
    return Promise.all(
      Array.from(promises).map((p) =>
        Promise.resolve(p).then(
          (value): PromiseFulfilledResult<T> => ({ status: 'fulfilled', value }),
          (reason): PromiseRejectedResult => ({ status: 'rejected', reason })
        )
      )
    );
  };
}
```

### **F. Web API Polyfills (Beyond core-js)**

| API | Polyfill Package | Size (gzipped) | When Needed |
|-----|-----------------|----------------|-------------|
| `fetch` | `whatwg-fetch` | ~3 KB | IE11, old Safari |
| `IntersectionObserver` | `intersection-observer` | ~5 KB | IE11, Safari <12.1 |
| `ResizeObserver` | `resize-observer-polyfill` | ~3 KB | IE11, Safari <13 |
| `AbortController` | `abortcontroller-polyfill` | ~1 KB | IE11, Safari <12.1 |
| `CustomEvent` | Manual (small) | ~0.5 KB | IE11 |
| `Web Components` | `@webcomponents/webcomponentsjs` | ~15 KB | IE11, old Edge |
| `Intl.NumberFormat` | `@formatjs/intl-numberformat` | ~20 KB | IE11, partial Safari |
| `structuredClone` | `@ungap/structured-clone` | ~2 KB | Chrome <98, Safari <15.4 |

### **G. Anti-Patterns & Pitfalls**

1. **Importing all of core-js** — `import 'core-js'` adds ~40KB gzipped. Use `useBuiltIns: 'usage'` to include only what your code needs.

2. **Polyfilling in every bundle** — Modern browsers don't need polyfills. Use differential serving (`module`/`nomodule`) or polyfill.io to serve polyfills only to browsers that need them.

3. **Polyfilling syntax** — `async/await`, optional chaining `?.`, nullish coalescing `??` are syntax features. Polyfills can't help — you need a transpiler (Babel/SWC).

4. **Not testing polyfilled code in actual old browsers** — Polyfills may have edge case differences from native implementations. Test in BrowserStack/Sauce Labs with real IE11/old Safari.

5. **Polyfilling on the server** — Node.js versions ≥ 18 support nearly all modern APIs. Don't include browser polyfills in server bundles — configure Babel to target `node: 'current'` for server code.

6. **Using polyfill.io without integrity** — The polyfill.io CDN was compromised in 2024 (supply chain attack). Self-host polyfills or use a trusted CDN with SRI hashes.

7. **Not setting browserslist** — Without `.browserslistrc`, Babel/Autoprefixer targets ALL browsers including dead ones. Set explicit targets: `> 0.25%, not dead, not IE 11`.

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### Hruday's Experience at SAP
SAP UI5/Fiori historically supported IE11, requiring heavy polyfilling (core-js full, fetch, Intl, Custom Elements). SAP dropped IE11 support in 2023, enabling the team to remove ~40KB of polyfills and switch to `useBuiltIns: 'usage'`. This directly contributed to the Lighthouse score improvement. The migration involved: updating browserslist, regenerating Babel config, verifying no IE11-specific code paths remained, and validating differential serving.

### Google's Approach
Google Search: serves module/nomodule bundles. Modern bundle (~200KB) has zero polyfills. Legacy bundle (~300KB) includes core-js. ~95% of users get the modern bundle. Google explicitly advocates for the module/nomodule pattern via web.dev documentation.

### Scale Evolution

| Scale | Polyfill Strategy | Bundle Impact |
|-------|------------------|---------------|
| Prototype | No polyfills, modern browsers only | 0 KB overhead |
| Growth | `useBuiltIns: 'usage'` with browserslist | 5-10 KB |
| Enterprise | Module/nomodule differential serving | 0 KB for modern, 15-25 KB for legacy |
| FAANG | Per-browser polyfill service + module/nomodule + progressive enhancement | Minimal overhead for each user |

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "Polyfills bridge the gap between modern API specifications and older browser implementations. The key distinction is: syntax features (arrow functions, optional chaining) need transpilation via Babel, while runtime APIs (Promise, fetch, IntersectionObserver) need polyfills.
>
> For production, I use a three-layer strategy. First, `@babel/preset-env` with `useBuiltIns: 'usage'` and core-js 3 — this automatically injects only the polyfills my code actually uses, based on the browserslist targets. Second, differential serving: `<script type="module">` for modern browsers (no polyfills, ES2020+ syntax) and `<script nomodule>` for legacy browsers (transpiled + polyfilled). This means 90%+ of users download zero polyfill bytes.
>
> At SAP, when we dropped IE11 support, we removed ~40KB of polyfills from the bundle. Before that, we used the module/nomodule pattern so modern users weren't penalized. The Lighthouse improvement from 60 to 95 included this bundle size reduction.
>
> For interview polyfill questions, I can implement Promise, Array.prototype.includes, and other common polyfills from scratch — the pattern is always: feature-detect with `if (!API)`, then implement per the spec using `Object.defineProperty()` on the prototype."

**Likely Follow-up Questions:**

1. **"Implement Array.prototype.map polyfill"** → Feature detect, iterate with `for` loop, handle sparse arrays with `in` operator, support thisArg parameter.
2. **"What's the difference between polyfill and transpilation?"** → Polyfills add runtime APIs (Promise, fetch). Transpilation converts syntax (arrow functions → function). async/await needs both.
3. **"How does core-js `usage` mode work?"** → Babel's plugin-transform-runtime scans AST for API usage (e.g., `[].includes()`), resolves against browserslist, and injects `import 'core-js/modules/es.array.includes'` only when the target browsers need it.
4. **"What about the polyfill.io supply chain attack?"** → polyfill.io CDN was compromised in 2024, serving malicious code. Self-host polyfills or use Fastly/cdnjs with Subresource Integrity (SRI) hashes.

────────────────────────────────────
## 5. Code Example (TypeScript)
────────────────────────────────────

See Section 2.E for complete polyfill implementations of:
- `Array.prototype.includes`
- `Array.prototype.flat`
- `Object.assign`
- `Array.prototype.reduce`
- `Promise.allSettled`
- `Promise` (simplified but spec-compliant state machine)

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**Polyfill vs. Transpile:** "Polyfills add APIs (Promise, fetch). Transpilers convert syntax (arrow functions, ?.). async/await needs both."

**The production polyfill strategy:** "module/nomodule for differential serving + useBuiltIns: 'usage' for automatic, minimal polyfill injection."

**If you go blank:** "Feature detect, implement per spec, define on prototype. Use core-js with Babel for automatic polyfilling, and module/nomodule for differential serving so modern browsers pay zero polyfill tax."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ Polyfill strategy directly impacts bundle size. An unoptimized core-js import adds 40KB. Differential serving eliminates this overhead for 90%+ of users. At enterprise scale (SAP, Microsoft), backward compatibility is non-negotiable, making polyfill strategy a Staff-level architecture decision.

**How it works:**
→ Polyfills check `if (!NativeAPI)` and implement the spec-compliant version using `Object.defineProperty()` on prototypes or constructors. core-js provides 500+ polyfills. Babel's `useBuiltIns: 'usage'` injects only needed polyfills per file. `module/nomodule` pattern serves modern browsers unpolyfilled bundles.

**Company relevance:**
→ **Google:** Advocates module/nomodule via web.dev. Chrome DevTools shows polyfill bundle impact in Coverage tab. Google interviews may ask to implement polyfills from scratch (Promise.all, Array.prototype.map).
→ **Microsoft:** Edge's Chromium migration (2020) reduced polyfill needs dramatically. But enterprise customers on locked Edge versions still need polyfills.
→ **SAP (Hruday's current):** IE11 support until 2023 means Hruday has direct experience managing polyfill strategy, differential serving, and the bundle size impact of dropping legacy browser support.
