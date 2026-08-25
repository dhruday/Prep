# 322 – Implement curry / memoize / once / pipe

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Fundamental utility functions in functional programming: **curry** (partial application), **memoize** (cache results), **once** (run only first time), **pipe/compose** (chain functions). These are among the most asked frontend machine coding questions.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── CURRY ────
// Transforms f(a,b,c) into f(a)(b)(c)
function curry(fn: Function): Function {
  return function curried(this: unknown, ...args: unknown[]): unknown {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...nextArgs: unknown[]) => curried.apply(this, [...args, ...nextArgs]);
  };
}
// Usage: const add = curry((a, b, c) => a + b + c); add(1)(2)(3) → 6; add(1, 2)(3) → 6

// ──── MEMOIZE ────
function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return function (this: unknown, ...args: unknown[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn.apply(this, args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  } as T;
}
// Usage: const memoFib = memoize((n) => n <= 1 ? n : memoFib(n-1) + memoFib(n-2));

// ──── MEMOIZE WITH MAX SIZE (LRU-like) ────
function memoizeWithLimit<T extends (...args: unknown[]) => unknown>(fn: T, maxSize = 100): T {
  const cache = new Map<string, ReturnType<T>>();
  return function (this: unknown, ...args: unknown[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const val = cache.get(key)!;
      cache.delete(key);
      cache.set(key, val); // move to end (most recent)
      return val;
    }
    const result = fn.apply(this, args) as ReturnType<T>;
    cache.set(key, result);
    if (cache.size > maxSize) cache.delete(cache.keys().next().value);
    return result;
  } as T;
}

// ──── ONCE ────
function once<T extends (...args: unknown[]) => unknown>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;
  return function (this: unknown, ...args: unknown[]) {
    if (!called) { called = true; result = fn.apply(this, args) as ReturnType<T>; }
    return result;
  } as T;
}
// Usage: const init = once(() => { console.log('initialized'); return true; });

// ──── PIPE ────
function pipe(...fns: Function[]): Function {
  return (input: unknown) => fns.reduce((acc, fn) => fn(acc), input);
}
// Usage: const transform = pipe(trim, toLowerCase, encodeURI);

// ──── COMPOSE (right-to-left pipe) ────
function compose(...fns: Function[]): Function {
  return (input: unknown) => fns.reduceRight((acc, fn) => fn(acc), input);
}

// ──── DEBOUNCE ────
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout>;
  const debounced = function (this: unknown, ...args: unknown[]) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  } as T & { cancel: () => void };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

// ──── THROTTLE ────
function throttle<T extends (...args: unknown[]) => void>(fn: T, interval: number): T {
  let lastTime = 0;
  return function (this: unknown, ...args: unknown[]) {
    const now = Date.now();
    if (now - lastTime >= interval) { lastTime = now; fn.apply(this, args); }
  } as T;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"curry: return nested functions until all args collected. memoize: cache with JSON.stringify key. once: boolean flag, cache result. pipe: reduce left-to-right. These test closure understanding and functional programming knowledge."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Real usage: data transformation pipeline
const processUser = pipe(
  (user: any) => ({ ...user, name: user.name.trim() }),
  (user: any) => ({ ...user, email: user.email.toLowerCase() }),
  (user: any) => ({ ...user, age: Number(user.age) })
);
```

## 5. 🧠 MEMORY AID
**"curry = collect args via closures. memoize = Map cache with serialized key. once = flag + cached result. pipe = reduce(acc, fn) left-to-right."**

## 6. 🎯 COMPLEXITY
curry/once: O(1) per call | memoize: O(1) cache hit, O(args) key creation | pipe: O(n) n = functions
