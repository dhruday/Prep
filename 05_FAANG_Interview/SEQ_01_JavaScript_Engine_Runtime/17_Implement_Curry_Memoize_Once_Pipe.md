# 17. Implement curry, memoize, once, pipe
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Curry, memoize, once, and pipe are the four core functional programming utilities that appear in every senior JavaScript interview. Curry transforms a multi-argument function into a chain of single-argument functions — `fn(a, b, c)` becomes `fn(a)(b)(c)` — enabling partial application: fix some arguments now and supply the rest later. Memoize caches a function's return value keyed by its arguments — subsequent calls with the same input return the cached result in O(1) instead of recomputing. Once wraps a function so it executes exactly once and returns the same result on all subsequent calls. Pipe composes functions left to right — the output of each function becomes the input of the next. At SAP, I used memoize on our tile permission check function: it was called 200+ times per navigation event but the underlying permissions barely changed — memoization dropped CPU usage from 15% to under 1% per navigation. All four rely on closures for their state: a timer for debounce/throttle, a `Map` for memoize, a boolean flag for once, and a `reduce` for pipe."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

These four utilities come from functional programming (FP) and appear in libraries like Lodash, Ramda, and RxJS. They address universal patterns:

```
curry    → Partial application — define a function with some args now, rest later
memoize  → Avoid redundant computation — cache pure function results
once     → Initialization guard — a function that should only run once
pipe     → Data transformation pipeline — compose functions left to right
```

They're all "higher-order functions" — functions that take functions and return new functions — implemented via closures.

---

### How Each Works Internally

**Curry — collecting arguments until `fn.length` is reached:**

```
curry(fn):
  returns a new function curried
  
  curried(...args):
    if args.length >= fn.length:
      return fn(...args)         // got all args — call original
    else:
      return (...moreArgs) =>    // return new function collecting more args
        curried(...args, ...moreArgs)
```

Key detail: `fn.length` is the declared parameter count. Variadic functions (`...args`) have `fn.length === 0`. For those, curry needs a manual arity argument.

**Memoize — Map from serialized args to cached result:**

```
memoize(fn, keySerializer?):
  cache = new Map()
  
  memoized(...args):
    key = keySerializer ? keySerializer(args) : JSON.stringify(args)
    if cache.has(key):
      return cache.get(key)
    result = fn(...args)
    cache.set(key, result)
    return result
```

Key production concerns:
1. Cache key serialization — `JSON.stringify` fails for circular objects, functions, `undefined`
2. Cache growth — unbounded cache is a memory leak; production needs `maxSize` + LRU eviction
3. Only pure functions should be memoized — functions with side effects will give wrong results

**Once — flag + result storage:**

```
once(fn):
  called = false
  result = undefined
  
  wrapper(...args):
    if !called:
      called = true
      result = fn(...args)
    return result
```

Simple but powerful — used for singletons, lazy initialization, one-time setup.

**Pipe — left-to-right function composition:**

```
pipe(...fns):
  return (initialValue) =>
    fns.reduce((acc, fn) => fn(acc), initialValue)
```

`compose` is the same but right-to-left: `fns.reduceRight(...)`.
Pipe is more readable for data transformation chains (matches visual left-to-right reading order).

---

### Architecture & Component Boundaries

```
Where these live in a frontend codebase:

  curry:
    → Form validation (partial application of validators)
    → Event handler factories: const handleEvent = curry(processEvent)(contextId)
    → API call factories: const getUserById = curry(apiCall)('/users')

  memoize:
    → Expensive pure computations (permission checks, derived data)
    → Selector functions (Redux selectors = memoized transforms)
    → React useMemo / Vue computed are framework-level memoize implementations

  once:
    → App initialization (analytics init, SDK setup)
    → Lazy singleton creation
    → Click-once protection (prevent double submits — though debounce is better there)

  pipe:
    → Data transformation pipelines (parse → validate → transform → format)
    → Middleware chains (Express.js middleware is pipe)
    → Redux reducers can be composed with pipe
    → RxJS operators ARE a pipe concept: observable.pipe(map(), filter(), debounceTime())
```

---

### Data Flow

```typescript
// pipe data flow example:
const processUser = pipe(
  (user: RawUser) => validateUser(user),    // Step 1: validate
  (user: ValidUser) => normalizeUser(user), // Step 2: normalize
  (user: NormalUser) => enrichUser(user),   // Step 3: enrich
);
// Data flows: rawUser → validated → normalized → enriched
// Each function receives the output of the previous

// curry data flow example:
const multiply = (a: number) => (b: number) => a * b;
const double = multiply(2);  // partial application — a=2 fixed
const triple = multiply(3);  // partial application — a=3 fixed
[1, 2, 3].map(double); // [2, 4, 6]
[1, 2, 3].map(triple); // [3, 6, 9]
```

---

### Performance Implications

**Memoize performance:**
- Cache hit: O(1) — just a Map lookup + key serialization
- Cache miss: O(1) Map write + original function call
- Memory: O(n) where n = number of unique argument combinations called
- `JSON.stringify` for keys is O(k) where k = size of arguments — can be slow for large objects; custom key serializers with primitive keys are much faster

**Memoize anti-patterns that kill performance:**
- Memoizing functions that are called with many unique argument combinations → cache never hits, just adds overhead
- Memoizing functions that return mutable objects → callers mutate the cached result, corrupting it for future callers

**Curry performance:**
- Each call to the curried function creates a new closure → slight GC pressure in hot paths
- For performance-critical code, prefer direct calls over curried helpers
- In practice, curry is used for configuration/factory patterns, not tight loops

---

### Scalability Considerations

| Scale | Concern |
|---|---|
| Single component | Inline arrow functions are fine; memoize overkill |
| Feature with expensive selectors | `useMemo` / reselect memoization prevents wasted recomputes |
| App-wide permission checks (SAP) | Memoize with LRU cap prevents memory leak from unlimited unique inputs |
| Library / design system | Curry + pipe enable API composition without rewriting library internals |

---

### Trade-offs

| Memoize | `useMemo` / `useCallback` | `reselect` | Choose when |
|---|---|---|---|
| Generic, non-React | React hook, component-scoped | Redux selector memoization | Memoize: utility functions; useMemo: component render paths; reselect: store selectors |
| Persistent across renders | Reset on component unmount | Persistent in store scope | Match scope to use case |
| Manual cache management | React manages lifecycle | Redux state drives invalidation | |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Memoizing impure functions:** Functions with side effects (API calls, DOM mutations, random numbers, `Date.now()`) must NOT be memoized — the cache returns stale results and side effects don't re-run.

- **Using `JSON.stringify` as the memoize key for complex objects:** `JSON.stringify` is slow for large objects, fails on circular references, loses `undefined` values, and doesn't differentiate between different object types with the same serialized form. Use a custom key serializer or primitive identifiers.

- **Unbounded memoize cache:** Without a `maxSize`, the cache grows indefinitely as unique arguments accumulate. Provide an LRU-capped memoize in production.

- **Curry on variadic functions:** `curry(fn)` reads `fn.length` for arity. Functions with rest parameters (`...args`) have `fn.length === 0` — curry can't know how many args to collect. Pass explicit arity: `curry(fn, 3)`.

- **`once` for functions that should be retried on failure:** If `once`-wrapped function throws, `called` is set to `true` but `result` is undefined — subsequent calls return `undefined` silently without retrying. Add error handling: only set `called = true` after a successful result.

---

## 🏭 3. Real-World Examples

**SAP — memoized tile permission check:**

SAP Fiori Launchpad calls a permission check for each of 200+ tiles on every navigation event. The check is pure — same tileId + userId → same result. Without memoization: 200 checks × ~0.5ms each = 100ms CPU time per navigation. With memoization (Map keyed on `${tileId}:${userId}`): first navigation = 100ms (warm cache); subsequent navigations = < 1ms total (200 cache hits). Dropped CPU from 15% to < 1% on navigation — directly improved Interaction to Next Paint (INP) score.

**Lodash — the production reference:**

Lodash's `_.curry`, `_.memoize`, `_.once`, `_.flow` (pipe) are battle-tested implementations. `_.memoize` uses the first argument as the cache key by default but accepts a custom `resolver` function. `_.curry` handles placeholder `_` values for out-of-order partial application. Understanding their internals lets you use them correctly and build lightweight custom versions when Lodash is overkill.

**Microsoft — Redux Toolkit + reselect (memoized selectors):**

Redux Toolkit integrates `reselect` for memoized selectors. `createSelector(inputSelectors, resultFn)` is essentially `memoize(resultFn)` with Redux state slices as cache dependencies. Microsoft's M365 apps use RTK + reselect extensively — selectors for derived data (filtered lists, computed totals) memoize across thousands of state updates, ensuring components only re-render when their specific derived data changes.

**Adobe — pipe for data transformation:**

Adobe's Creative Cloud asset pipeline uses pipe-like transformations: raw asset → validate → normalize → enrich with metadata → format for display. Each step is a pure function; pipe composes them. When a new step needs to be added (e.g., DRM check), it's inserted into the pipe without touching other steps.

**Salesforce — once for LWC initialization:**

Salesforce LWC components use `once`-pattern for one-time setup (connecting to message channels, initializing analytics SDK). The LWC `connectedCallback` can fire multiple times in some scenarios — wrapping the initialization in `once` ensures the SDK is initialized exactly once regardless of lifecycle edge cases.

**How it evolves with scale:**
- **Small scale:** Arrow functions inline; memoize only where profiling shows hotspot
- **Medium scale (100K users):** Shared memoized selectors (reselect); curry for form validation composition
- **Large scale (10M+ users):** Memoize with bounded cache + serialized keys; pipe for transform middleware chains; curry for API client configuration across environments

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "I'll implement all four. Let me start with curry — it uses recursion and `fn.length` to detect when all arguments are collected. Then memoize — a Map from serialized args to cached results, with a maxSize for production use. Once is simple — a flag and stored result. Pipe is reduce left to right.

> The production additions that separate a 7-year answer from a junior answer: memoize needs a bounded cache (otherwise it's a memory leak), `JSON.stringify` is a bad default key serializer for objects (slow, fails on circular refs), and once should only set the `called` flag after a successful invocation to handle retry semantics.

> At SAP I used a memoized permission check that dropped navigation CPU from 15% to under 1% — the Map keyed on `tileId:userId` as a primitive string avoiding serialization overhead entirely."

---

### Likely Follow-up Questions

1. **What is the difference between curry and partial application?** → Partial application fixes some arguments of a function and returns a new function waiting for the rest — in one step. Curry always creates single-argument chains: `fn(a)(b)(c)`. Partial application: `fn(a, b)` → returns `(c) => fn(a, b, c)`. Curry is a special case of partial application.

2. **How would you implement memoize with LRU eviction?** → Use a `Map` for O(1) lookup and maintain a doubly linked list for access order. On cache hit, move to head. On cache miss, add to head; if over `maxSize`, evict the tail. The full LRU Cache implementation (Topic 21) is the answer.

3. **When should you NOT memoize a function?** → Never memoize impure functions (side effects, time-dependent, random). Avoid memoizing functions called with many unique argument combinations — the cache never hits. Avoid memoizing functions that return mutable objects — callers can mutate the cached result.

4. **What is the difference between `pipe` and `compose`?** → Both compose functions. Pipe is left-to-right: `pipe(f, g, h)(x)` = `h(g(f(x)))`. Compose is right-to-left: `compose(f, g, h)(x)` = `f(g(h(x)))`. Pipe matches reading order; compose matches mathematical function notation `(f∘g∘h)(x)`.

5. **How is `once` different from debounce or throttle?** → `once` fires exactly one time, ever — no timing involved. Debounce fires after a quiet period (delays execution). Throttle fires at most once per interval (rate limits). `once`: initialization guard; debounce: search input; throttle: scroll handlers.

---

### vs Alternatives

| Custom `memoize` | `useMemo` | `reselect` | Choose when |
|---|---|---|---|
| Generic, any JS | React render-scope only | Redux state only | Custom: utilities, services |
| Manual invalidation | Re-runs when deps change | Invalidated by new input refs | useMemo: component perf; reselect: store perf |

| Custom `pipe` | RxJS `.pipe()` | Lodash `_.flow` | Choose when |
|---|---|---|---|
| Simple, sync | Observable/async streams | Feature-rich | Custom pipe: simple transform chains |
| No async | Handles async naturally | Includes utilities | RxJS: reactive, event-driven pipelines |

---

### How to Signal Senior Thinking

> "The production gap is always in memoize. A naive memoize with `JSON.stringify` and no size limit will cause a memory leak in any long-running SPA. The correct production memoize: Map for O(1) lookup, a maxSize parameter defaulting to something sensible (256 entries), optional custom keySerializer for performance-sensitive paths, and a warning log when maxSize is hit. I also make memoize type-safe in TypeScript so the return type of the memoized function matches the original — the wrapper shouldn't widen the type to `unknown`."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: curry — collect args until fn.length satisfied
// ============================================================

function curry<T extends (...args: unknown[]) => unknown>(
  fn: T,
  arity: number = fn.length
): unknown {
  return function curried(...args: unknown[]): unknown {
    if (args.length >= arity) {
      return fn(...args);
    }
    return (...moreArgs: unknown[]) => curried(...args, ...moreArgs);
  };
}

// Usage:
const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);

curriedAdd(1)(2)(3);     // 6
curriedAdd(1, 2)(3);     // 6
curriedAdd(1)(2, 3);     // 6
curriedAdd(1, 2, 3);     // 6

// Partial application pattern:
const add10 = curriedAdd(10);
const add10and20 = curriedAdd(10, 20);
[5, 6, 7].map(n => add10and20(n)); // [35, 36, 37]

// ============================================================
// DEMO 2: memoize — Map cache with LRU eviction + custom keySerializer
// ============================================================

interface MemoizeOptions<TArgs extends unknown[]> {
  maxSize?: number;
  keySerializer?: (...args: TArgs) => string;
}

function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: MemoizeOptions<TArgs> = {}
): (...args: TArgs) => TReturn {
  const { maxSize = 256, keySerializer } = options;
  const cache = new Map<string, TReturn>();
  const keyOrder: string[] = []; // tracks insertion order for LRU eviction

  return function memoized(...args: TArgs): TReturn {
    const key = keySerializer
      ? keySerializer(...args)
      : JSON.stringify(args);

    if (cache.has(key)) {
      // Move to end (most recently used)
      const idx = keyOrder.indexOf(key);
      if (idx > -1) keyOrder.splice(idx, 1);
      keyOrder.push(key);
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    keyOrder.push(key);

    // Evict oldest if over maxSize
    if (cache.size > maxSize) {
      const lruKey = keyOrder.shift()!;
      cache.delete(lruKey);
    }

    return result;
  };
}

// Usage — SAP permission check pattern:
const checkPermission = (tileId: string, userId: string): boolean => {
  // Expensive: calls authorization service
  return true; // simplified
};

const memoizedPermission = memoize(checkPermission, {
  maxSize: 100,
  keySerializer: (tileId, userId) => `${tileId}:${userId}`, // fast primitive key
});

// First call: computes + caches
memoizedPermission('tile-001', 'user-123');
// Subsequent calls: O(1) cache hit
memoizedPermission('tile-001', 'user-123');

// ============================================================
// DEMO 3: once — execute exactly once
// ============================================================

function once<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn | undefined {
  let called = false;
  let result: TReturn | undefined;

  return function (...args: TArgs): TReturn | undefined {
    if (!called) {
      result = fn(...args);
      called = true; // only set AFTER successful execution
    }
    return result;
  };
}

// Usage — analytics initialization:
const initAnalytics = once(() => {
  console.log('Analytics SDK initialized'); // only prints once
  return { trackEvent: (name: string) => console.log(`Track: ${name}`) };
});

const analytics = initAnalytics(); // 'Analytics SDK initialized'
initAnalytics();                   // returns same result, no re-init
initAnalytics();                   // same

// ============================================================
// DEMO 4: pipe — left-to-right function composition
// ============================================================

// Simple typed pipe (up to N functions):
function pipe<A>(value: A): A;
function pipe<A, B>(value: A, fn1: (a: A) => B): B;
function pipe<A, B, C>(value: A, fn1: (a: A) => B, fn2: (b: B) => C): C;
function pipe<A, B, C, D>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D
): D;
function pipe(value: unknown, ...fns: Array<(x: unknown) => unknown>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

// Usage — data transformation pipeline:
interface RawUser { name: string; age: string; role: string; }
interface ValidUser { name: string; age: number; role: string; }
interface EnrichedUser { name: string; age: number; role: string; displayName: string; }

const parseAge = (user: RawUser): ValidUser => ({
  ...user,
  age: parseInt(user.age, 10),
});

const normalize = (user: ValidUser): ValidUser => ({
  ...user,
  name: user.name.trim().toLowerCase(),
});

const enrich = (user: ValidUser): EnrichedUser => ({
  ...user,
  displayName: `${user.name} (${user.role})`,
});

const processUser = (raw: RawUser): EnrichedUser =>
  pipe(raw, parseAge, normalize, enrich);

const result = processUser({ name: '  Hruday  ', age: '30', role: 'engineer' });
// { name: 'hruday', age: 30, role: 'engineer', displayName: 'hruday (engineer)' }

// ============================================================
// DEMO 5: Combining all four — real SAP usage pattern
// ============================================================

// Curried API factory:
const apiGet = curry(
  (baseUrl: string, endpoint: string, id: string): Promise<unknown> =>
    fetch(`${baseUrl}${endpoint}/${id}`).then(r => r.json())
);

const sapApi = apiGet('https://api.sap.example.com');
const getTile = sapApi('/tiles');
const getUser = sapApi('/users');

// Memoized selector (reselect-like):
const selectVisibleTiles = memoize(
  (tiles: string[], isAdmin: boolean) => tiles.filter(t => isAdmin || t !== 'admin-tile'),
  { maxSize: 50, keySerializer: (tiles, isAdmin) => `${tiles.join(',')}:${isAdmin}` }
);

// Once-initialized event bus:
const createEventBus = once(() => {
  console.log('Event bus created');
  return new Map<string, Set<() => void>>();
});
```

**Interview vs Production difference:**
- **Interview:** Demo 1 (curry) + Demo 3 (once) + basic pipe. Walk through the `fn.length` check in curry and the flag in once. These 3 = clean pass.
- **Production:** Demo 2 (memoize with LRU cap + custom keySerializer) is the most important production extension. The `keySerializer` option and `maxSize` guard are what separate a production-grade memoize from a toy implementation.

---

## 🧠 6. Memory Aid

**Mental Model:**
- `curry` = a sauce that gets richer as you add more (arguments) — not ready to serve until all ingredients in
- `memoize` = a notepad where you write down answers — same question? Check the notepad first
- `once` = a light switch that jams in the ON position after first flip — stays on forever
- `pipe` = an assembly line — raw material goes in one end, finished product comes out the other

**If you go blank:** *"curry: collect args until fn.length, then call fn. memoize: Map from serialized args to result; check before computing. once: called flag + result cache; set flag only on success. pipe: reduce(fns, (acc, fn) => fn(acc), initialValue)."*

**Mnemonic:** **CMOP** — **C**urry collects, **M**emoize maps, **O**nce only, **P**ipe passes through.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Memoize prevents expensive recomputation on every interaction — at SAP 200 permission checks → < 1ms on repeat navigation, directly improving INP. Once prevents duplicate SDK initialization that could fire duplicate analytics events. Pipe makes data transformations readable and maintainable.
→ **Performance:** Memoize is O(1) on cache hits vs O(n) or O(n log n) for recomputation. The constraint is the cache key strategy and size — unbounded caches become memory leaks at scale.
→ **Business:** These four are the primitives behind Lodash, Ramda, Reselect, and RxJS operators. Interviewers at Microsoft, Adobe, Salesforce, and Cisco use "implement memoize" as a signal for understanding of closures, higher-order functions, and cache design — all prerequisites for senior frontend work.

**How it works (3 sentences):**
`curry` uses a recursive inner function that compares `args.length` accumulated across calls against the original `fn.length`, calling `fn` once all arguments are collected, enabling partial application at any call site. `memoize` wraps a function in a closure that maintains a `Map` from serialized argument keys to cached return values, returning cached results on hits and caching new results on misses, with a `maxSize` LRU eviction strategy to prevent unbounded memory growth. `once` closes over a `called` boolean and a `result` variable, running the original function exactly once on first call and returning the same stored result on all subsequent calls, while `pipe` uses `Array.reduce` to thread an initial value through an ordered sequence of unary functions left-to-right.

**Company relevance:**
- **Microsoft:** Redux Toolkit's `createSelector` is `memoize` applied to Redux state. TypeScript enables typed curry overloads and typed pipe chains. Microsoft interviews frequently ask "implement memoize" as a proxy for closure + cache design skills.
- **Adobe:** Firefly's image transformation pipeline uses pipe-style composition. Creative Cloud's filter application chains are pipe semantics. Adobe's frontend team uses Ramda's FP utilities extensively — understanding their internals is expected at senior level.
- **Salesforce:** LWC uses `once` pattern for message channel subscription in `connectedCallback`. Salesforce's `@salesforce/apex` wire adapters use memoization concepts. Curry enables generic API client factories reused across LWC components.
- **Cisco:** WebEx's SDK uses pipe-style middleware for message processing: receive → decrypt → validate → parse → dispatch. Memoized lookups for participant data prevent redundant fetches in high-participant-count meetings.

---
✅ **Topic 17/486 complete.**
→ **Continuing to Topic 18: Implement Deep Clone & Deep Equal**
