# Implement curry, memoize, once, pipe
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **curry(fn)**: transforms `fn(a, b, c)` into `fn(a)(b)(c)`; a curried function remembers its accumulated arguments via closure; when accumulated args count reaches `fn.length`, call the original `fn`; handles partial application — `fn(a)(b)` returns a function still waiting for `c`
- **memoize(fn)**: wraps a function so it caches return values; first call with args X runs `fn(...X)` and stores result in a Map keyed by a serialised version of X; subsequent calls with same X return the cached result immediately; only useful for pure functions (same input always gives same output, no side effects); beware object key serialisation with `JSON.stringify`
- **once(fn)**: returns a wrapper that calls `fn` at most once; after the first call, the wrapper returns the SAME result for all subsequent calls (does NOT call `fn` again); track with a `called` flag and a `result` variable in closure; distinct from EventEmitter's `once` — that removes the listener; here the function exists but is a no-op
- **pipe(...fns)**: composes functions left-to-right; `pipe(f, g, h)(x)` = `h(g(f(x)))`; each function takes the output of the previous as input; `compose` is right-to-left (mathematical notation); pipe is intuitive for data transformations (left = first applied); built with `reduce` over the functions array
- **All four patterns rely on CLOSURE**: the inner function returned by curry/memoize/once/pipe captures variables from the outer function's scope; this is the mechanism that makes accumulation, caching, flagging, and chaining possible without global state
- **TypeScript types for curry** are complex (variadic generics); in interviews, it's fine to show the JavaScript logic clearly and describe the TypeScript generics conceptually rather than writing full recursive conditional types

---

## 1. One-Line Definition
Curry transforms a multi-argument function into a chain of single-argument functions; memoize caches results to avoid redundant computation; once ensures a function executes exactly once no matter how many times it's called; pipe composes functions left-to-right so data flows through a transformation pipeline.

---

## 2. The Problem It Solves

**curry**: enables partial application — fix some arguments now, pass the rest later; common in functional pipelines where some arguments come from configuration and others from runtime data

**memoize**: avoids re-running expensive pure computations (same arguments → same result → just look up the cached result); turns O(2^n) Fibonacci into O(n) at the call-site level; caches expensive selector calculations in Redux/React

**once**: ensures initialisation code runs exactly once regardless of how many times the initialiser function is called; common for SDK initialisation, database connection setup, event binding during app startup

**pipe**: makes data transformation pipelines readable; instead of `sanitise(validate(transform(parse(input))))` (read inside-out), write `pipe(parse, transform, validate, sanitise)(input)` (read left-to-right)

---

## 3. How It Works Internally

### Curry — Accumulating Arguments

```
Original: add(a, b, c) = a + b + c

curry(add) returns curriedAdd

curriedAdd(1)         → fn.length=3, accumulated=[1], 1 < 3 → return new curried fn
curriedAdd(1)(2)      → accumulated=[1,2], 2 < 3 → return new curried fn
curriedAdd(1)(2)(3)   → accumulated=[1,2,3], 3 === 3 → call add(1,2,3) → 6

Visualisation:
curry(add)
  └─ returns fn that waits for 3 total args
     when called with (1): returns fn that already has [1]
       when called with (2): returns fn that already has [1,2]
         when called with (3): accumulated === fn.length → call add(1,2,3) = 6
```

### Memoize — Cache Lookup

```
Original: expensiveCalc(n) = ...heavy computation...

memoize(expensiveCalc):
  cache = new Map()
  
  call(10):
    key = JSON.stringify([10]) = "[10]"
    cache.has("[10]")? → NO → run expensiveCalc(10) → result=42 → cache.set("[10]", 42)
    return 42
  
  call(10) again:
    key = "[10]"
    cache.has("[10]")? → YES → return cache.get("[10]") = 42 immediately
    (expensiveCalc never called again)
  
  call(20):
    key = "[20]"
    cache.has("[20]")? → NO → run expensiveCalc(20) → ...
```

---

## 4. The Code

### Wrong Way — Classic Bugs

```typescript
// ❌ WRONG 1: curry that doesn't handle partial application correctly

function curryWrong(fn: Function) {
    return function(...args: unknown[]) {
        // ❌ Checks only exact arg count — doesn't support calling with multiple args at once
        if (args.length >= fn.length) {
            return fn(...args);
        }
        // ❌ Only returns a function expecting ONE MORE argument
        //    curriedAdd(1, 2)(3) should work but this handles curriedAdd(1)(2)(3) only
        return function(nextArg: unknown) {
            return fn(...args, nextArg);  // ❌ doesn't append AND recurse; breaks for 3+ args
        };
    };
}
// curriedAdd(1)(2)(3) works accidentally
// curriedAdd(1, 2)(3) would try fn(1, 2) which has length 2 < 3 → still returns a function ✗
// Actually: fn(1, 2) → args=[1,2], fn.length=3, 2 < 3 → returns fn(nextArg) → fn(1, 2, 3) ✓
// But: curriedAdd(1)(2, 3) → args=[1], returns function(nextArg) → calls fn(1, 2) not fn(1, 2, 3) ❌
```

```typescript
// ❌ WRONG 2: memoize with wrong cache key for objects

function memoizeWrong<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => T {
    const cache = new Map<string, T>();
    return (...args: unknown[]) => {
        const key = String(args);  // ❌ String([{a:1}]) = "[object Object]"
                                    //    ALL objects produce the same key!
                                    //    memoize(fn)({a:1}) and memoize(fn)({b:2}) share a cache slot
        if (cache.has(key)) return cache.get(key)!;
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}
```

```typescript
// ❌ WRONG 3: once that calls fn again after the first call

function onceWrong<T>(fn: () => T): () => T {
    let called = false;
    return () => {
        if (!called) {
            called = true;
            return fn();          // ← first call: correct
        }
        return fn();              // ❌ subsequent calls STILL call fn! Once semantics violated
        // Missing: store and return the first result for subsequent calls
    };
}
```

### Right Way — All Four Utilities

```typescript
// ✅ CURRY — accumulate args via closure, call when count reaches fn.length

function curry<T extends (...args: unknown[]) => unknown>(fn: T): unknown {
    // ✅ Returns a function that accumulates args across calls
    function curried(...args: unknown[]): unknown {
        if (args.length >= fn.length) {
            // ✅ Have enough args — call the original function
            return fn(...args);
        }
        // ✅ Not enough yet — return a new function that merges accumulated + new args
        return (...moreArgs: unknown[]) => curried(...args, ...moreArgs);
    }
    return curried;
}

// Usage
const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add) as (a: number) => (b: number) => (c: number) => number;

curriedAdd(1)(2)(3);   // 6
curriedAdd(1, 2)(3);   // 6 — also works: [1,2] < 3 → new fn expecting more → fn(1,2,3)
curriedAdd(1)(2, 3);   // 6 — [1] < 3 → new fn → called with (2,3) → [1,2,3] >= 3 → fn(1,2,3)

// Practical use: partially applied event handlers
const logWithLevel = curry((level: string, message: string) => console.log(`[${level}] ${message}`));
const logError = logWithLevel('ERROR');   // ← partial application — level fixed
logError('Connection refused');           // "[ERROR] Connection refused"
logError('Timeout after 5000ms');        // "[ERROR] Timeout after 5000ms"
```

```typescript
// ✅ MEMOIZE — cache by JSON-serialised args (handles arrays + primitives)

function memoize<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => T {
    const cache = new Map<string, T>();
    
    return (...args: unknown[]): T => {
        // ✅ JSON.stringify handles arrays, nested objects, primitives correctly
        //    Limitation: undefined → "undefined" stripped; functions/symbols → inconsistent
        //    For interview: JSON.stringify is acceptable; for production: use a proper hash
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key)!;   // ✅ cache hit — return without re-running fn
        }
        
        const result = fn(...args);
        cache.set(key, result);       // ✅ cache miss — compute and store
        return result;
    };
}

// Usage: memoised Fibonacci
const fib = memoize((n: number): number => {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);  // ← fib itself is memoised, so sub-calls hit cache
});

fib(40);  // ~instant — each of 40 unique values computed once

// React usage: memoised selector (manual alternative to Reselect)
const getVisibleProducts = memoize(
    (products: Product[], filter: string) =>
        products.filter(p => p.category === filter)
);
// Same products + same filter → instant return from cache
// Different filter → recomputes
```

```typescript
// ✅ ONCE — call fn at most once; return same result for all subsequent calls

function once<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => T {
    let called = false;
    let result: T;
    
    return (...args: unknown[]): T => {
        if (!called) {
            called = true;
            result = fn(...args);  // ✅ run fn exactly once and store result
        }
        return result;             // ✅ all calls (including first) return stored result
    };
}

// Usage: one-time SDK initialisation
const initAnalytics = once((config: AnalyticsConfig) => {
    console.log('Analytics initialised with', config);
    return analyticsSDK.init(config);
});

initAnalytics({ apiKey: 'abc' });   // ← runs init
initAnalytics({ apiKey: 'abc' });   // ← no-op, returns same result
initAnalytics({ apiKey: 'xyz' });   // ← no-op, IGNORES new args (once is once)
```

```typescript
// ✅ PIPE — left-to-right function composition

// Unary pipe (each function takes exactly one argument)
function pipe<T>(...fns: Array<(x: T) => T>): (x: T) => T {
    return (x: T): T => fns.reduce((acc, fn) => fn(acc), x);
    //               ^ start with x, apply fns left-to-right: fn[0](x) → fn[1](result) → ...
}

// Usage: data transformation pipeline
const processUserInput = pipe(
    (s: string) => s.trim(),
    (s: string) => s.toLowerCase(),
    (s: string) => s.replace(/[^a-z0-9]/g, '-'),
    (s: string) => s.replace(/-+/g, '-')
);

processUserInput('  Hello, World! 2024  ');
// →  trim: 'Hello, World! 2024'
// →  lower: 'hello, world! 2024'
// →  replace special: 'hello--world--2024'
// →  collapse dashes: 'hello-world-2024' ✓

// Variadic compose (right-to-left — for math notation fan-out)
// compose(f, g, h)(x) = f(g(h(x)))
function compose<T>(...fns: Array<(x: T) => T>): (x: T) => T {
    return (x: T): T => [...fns].reverse().reduce((acc, fn) => fn(acc), x);
}
```

```typescript
// ✅ COMBINATION: curry + pipe for readable data transformation

const double = (n: number) => n * 2;
const addN = curry((n: number, x: number) => x + n) as (n: number) => (x: number) => number;
const clampMax = curry((max: number, x: number) => Math.min(max, x)) as (max: number) => (x: number) => number;

const processScore = pipe(
    double,
    addN(10),        // ← partial: add 10
    clampMax(100)    // ← partial: cap at 100
);

processScore(30);  // double=60, +10=70, clamp(100)=70 → 70
processScore(55);  // double=110, +10=120, clamp(100)=100 → 100
```

```java
// ✅ Java functional equivalents — using standard Java 8+ functional interfaces

import java.util.function.*;
import java.util.Map;
import java.util.HashMap;

public class FunctionalUtils {
    
    // ✅ Memoize using Function<T, R>
    public static <T, R> Function<T, R> memoize(Function<T, R> fn) {
        Map<T, R> cache = new HashMap<>();
        return t -> cache.computeIfAbsent(t, fn);  // ✅ compute only if absent
    }
    
    // ✅ Once using Supplier<T>
    public static <T> Supplier<T> once(Supplier<T> fn) {
        boolean[] called = {false};   // ← array trick: lambda needs effectively final
        Object[] result = {null};
        return () -> {
            if (!called[0]) {
                called[0] = true;
                result[0] = fn.get();
            }
            @SuppressWarnings("unchecked") T cast = (T) result[0];
            return cast;
        };
    }
    
    // ✅ Pipe using Function.andThen (built-in composition)
    @SafeVarargs
    public static <T> Function<T, T> pipe(Function<T, T>... fns) {
        Function<T, T> pipeline = Function.identity();
        for (Function<T, T> fn : fns) {
            pipeline = pipeline.andThen(fn);  // ← built-in left-to-right composition
        }
        return pipeline;
    }
}

// Usage in Spring Boot service
Function<String, String> processInput = FunctionalUtils.pipe(
    String::trim,
    String::toLowerCase,
    s -> s.replaceAll("[^a-z0-9]", "-")
);
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is currying and how is it different from partial application?"

**Hruday's answer:**
> Currying transforms a function of N arguments into a chain of N single-argument functions. `add(a, b, c)` becomes `add(a)(b)(c)`. Each call returns a new function waiting for the next argument.
>
> Partial application fixes some arguments upfront and returns a function waiting for the remaining arguments. `partialAdd = add.bind(null, 1)` produces a function equivalent to `(b, c) => 1 + b + c`. The remaining function can be called with multiple arguments at once.
>
> In practice: currying with my implementation ALSO enables partial application because the inner `curried` function accepts multiple args and spread-merges them. `curriedAdd(1, 2)(3)` works because after `[1, 2]` the total is still less than 3, so it returns a new function; calling that with `3` reaches total 3 and fires the original function.
>
> The key use case: create specialised functions from general ones by fixing parameters. A logging factory: `const logError = logWithLevel('ERROR')` — error level is fixed, message comes per call.

---

### Q2 — Deep Dive
**Interviewer asks:** "What are the limitations of `JSON.stringify(args)` as a memoization key?"

**Hruday's answer:**
> Three main limitations.
>
> First, non-JSON types. Functions and `Symbol` values are dropped by JSON.stringify — two different function arguments produce the same key (undefined). `undefined` values in objects are also dropped. For functions-as-arguments: if you're memoising a function that takes callbacks, the cache key doesn't distinguish between different callback functions.
>
> Second, circular references. `JSON.stringify` throws `TypeError: Converting circular structure to JSON`. If the function might receive objects with circular references, the stringify approach crashes.
>
> Third, key ordering differences. `JSON.stringify({b:1, a:2})` = `'{"b":1,"a":2}'` and `JSON.stringify({a:2, b:1})` = `'{"a":2,"b":1}'`. Two semantically identical objects with different insertion order produce different keys — cache miss when it should be a hit.
>
> For interview purposes, `JSON.stringify` is acceptable and the trade-offs are known. In production, use a proper serialisation hash (fast-stable-stringify for deterministic key ordering, or a WeakMap for object identity-based memoisation when object reference equality is sufficient).

---

### Q3 — Application
**Interviewer asks:** "Where would you use `pipe` vs `compose` and why does the order matter?"

**Hruday's answer:**
> `compose(f, g, h)(x)` = `f(g(h(x)))` — applies right to left. `h` first, then `g`, then `f`. This is the mathematical function composition notation.
>
> `pipe(f, g, h)(x)` = `h(g(f(x)))` — applies left to right. `f` first, then `g`, then `h`.
>
> I always prefer `pipe` for data transformation pipelines in code because it reads in the same direction as the transformation: "first do f, then g, then h" is exactly what `pipe(f, g, h)` communicates. `compose` requires reading right to left — counterintuitive.
>
> The only time I'd use `compose` is when replicating mathematical notation or when it's what your team's codebase already uses. In TypeScript/JavaScript codebases, `pipe` is the convention used by libraries like `fp-ts`, RxJS pipe operators, and Redux middleware.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| curry: not spreading accumulated args correctly | "I'll call `fn(args[0], newArg)` to append" | When accumulating arguments across multiple partial applications (`add(1)(2)(3)` or `add(1,2)(3)` or `add(1)(2,3)`), the inner `curried` function must SPREAD both the accumulated args and the new args: `(...args, ...moreArgs)` merged together; only then calling `curried(...merged)` handles cases like `curriedAdd(1,2)(...rest)` where `rest` is `[3]` — the spread ensures `fn(1, 2, 3)`, not `fn([1,2], [3])` |
| memoize: forgetting that it only works on PURE functions | "I'll memoize any slow function" | Memoization breaks if the function has side effects or depends on external mutable state: `memoize(() => Date.now())` always returns the same timestamp after the first call; `memoize(fetch('/api/data'))` always returns the first response even if the server's data has changed; the contract is strict: same inputs MUST always produce the same output; for impure functions (I/O, time-based, random), memoization produces incorrect stale results — use cache invalidation strategies (TTL) instead |
| pipe: pipe returns a function, not a value | "I'll call `pipe(parse, transform)(data)` and... wait, why is the result a function?" | `pipe(f, g, h)` returns a NEW FUNCTION: `(x) => h(g(f(x)))`; you still need to call it with the data: `pipe(f, g, h)(data)`; a common mistake in an interview is writing `const result = pipe(f, g, h, data)` expecting `data` to also be passed in; `pipe` only accepts functions, not the data; the data is passed separately to the returned function |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I led refactoring of a product data transformation pipeline that was a deeply nested chain of function calls:
>
> ```typescript
> const result = formatPrice(convertCurrency(applyDiscount(parseProductData(rawData))));
> ```
>
> Reading this required mentally parsing inside-out — deeply counterintuitive for the team. Plus, whenever a transformation step needed to be added or reordered (a common change as business rules evolved), the nested structure made insertion error-prone.
>
> I introduced `pipe` from our functional utility library:
>
> ```typescript
> const transformProduct = pipe(
>     parseProductData,
>     applyDiscount,
>     convertCurrency,
>     formatPrice
> );
> const result = transformProduct(rawData);
> ```
>
> Code review time for transformation changes dropped noticeably — reviewers could read the pipeline top-to-bottom and understand the flow immediately. The `memoize` wrapper around `transformProduct` for frequently accessed products (same product data used in 10+ UI components) eliminated redundant re-processing.
>
> Both utilities came from a single `utils/functional.ts` module. The interview value: knowing WHEN to reach for functional patterns, not just how to implement them."

---

## 8. Scale Evolution

**1,000 users →** In-process TypeScript utilities. Memoize with `Map<string, T>` in browser memory. Pipe as pure function composition. No distributed concerns.

**100,000 users →** Memoized selectors in Redux (Reselect library) with structural sharing — selected derived state is cached by input reference equality, not deep equality; the same pattern as `memoize` but optimised for React's re-render cycle and large normalised stores.

**10 million users →** Distributed memoization: cache results in Redis by a hash of the input (sorted, serialised) with a TTL; `pipe` translates to stream processing pipelines (Kafka Streams, Spring Cloud Stream); each `pipe` step becomes a stream processor that consumes one topic and produces another; the sequential transformation model is universal.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Pipe for payment processing validation pipeline (parse → validate → sanitise → format); memoize for currency conversion rates (same currency pair → cached exchange rate); once for SDK initialisation per page load | Functional pipeline in payment context; once for initialisation safety |
| Swiggy / Meesho | Memoised product search filters (frequent re-application of same filter config); pipe for data ETL in the reporting pipeline; curry for building partially applied database query builders | Selector memoisation in React; ETL pipe pattern |
| Adobe / Microsoft | All four utilities are common Microsoft SDE-II frontend questions — implement each in 10 minutes; curry is the hardest (recursive accumulation logic); clean TypeScript implementation expected; real-world use case justification | Curry recursive accumulation; all four basics; TypeScript type concepts |
| SAP Labs | Product transformation pipeline refactor (nested → pipe); memoize on `transformProduct` for multi-component reuse; `functional.ts` utility module establishing team patterns | Concrete code quality improvement story; team adoption of utility module |

---

## 10. Related Topics — What to Study Next

- **Topic 283 — Deep Clone and Deep Equal** — `memoize` uses JSON.stringify-based key generation; `deepEqual` is needed for a more robust memoize key comparison (when args contain objects that should be compared structurally, not by string serialisation); both topics together cover the full "utility function implementation" interview category
- **Topic 282 — Implement EventEmitter** — `once` in this topic (call fn at most once) and `once` in EventEmitter (fire handler at most once) share the same closure pattern: `let called = false; let result;`; understanding both variations shows full closure fluency
- **Topic 284 — Implement Promise.all / Promise.race** — `pipe` applied to async operations = Promise chaining; `memoize` applied to async functions = request deduplication; both topics together cover the full functional × async JavaScript skillset expected at senior frontend engineer level

---

*Part 17 · Implement curry, memoize, once, pipe · Full Stack Interview Guide · Hruday D · 2026*
