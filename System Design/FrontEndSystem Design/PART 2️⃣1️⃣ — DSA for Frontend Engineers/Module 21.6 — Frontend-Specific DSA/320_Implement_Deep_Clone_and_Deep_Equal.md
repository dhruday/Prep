# 320 – Implement Deep Clone and Deep Equal

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Deep Clone** creates a completely independent copy of an object (no shared references). **Deep Equal** compares two values by structure, not reference. Both require recursive traversal handling: primitives, objects, arrays, Date, RegExp, Map, Set, and circular references.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── DEEP CLONE ────
function deepClone<T>(obj: T, seen = new WeakMap()): T {
  // Primitives and null
  if (obj === null || typeof obj !== 'object') return obj;

  // Circular reference detection
  if (seen.has(obj as object)) return seen.get(obj as object);

  // Handle special types
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as T;
  if (obj instanceof Map) {
    const map = new Map();
    seen.set(obj as object, map);
    obj.forEach((v, k) => map.set(deepClone(k, seen), deepClone(v, seen)));
    return map as T;
  }
  if (obj instanceof Set) {
    const set = new Set();
    seen.set(obj as object, set);
    obj.forEach(v => set.add(deepClone(v, seen)));
    return set as T;
  }

  // Arrays and plain objects
  const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  seen.set(obj as object, clone);
  for (const key of Reflect.ownKeys(obj as object)) {
    (clone as Record<string | symbol, unknown>)[key] = deepClone(
      (obj as Record<string | symbol, unknown>)[key], seen
    );
  }
  return clone;
}

// ──── DEEP EQUAL ────
function deepEqual(a: unknown, b: unknown, seen = new WeakMap()): boolean {
  // Same reference or both primitives
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  // Circular reference
  if (seen.has(a as object)) return seen.get(a as object) === b;
  seen.set(a as object, b);

  // Type mismatch
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  // Date
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  // RegExp
  if (a instanceof RegExp && b instanceof RegExp) return a.source === b.source && a.flags === b.flags;

  // Map
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) { if (!b.has(key) || !deepEqual(val, b.get(key), seen)) return false; }
    return true;
  }

  // Set
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) { if (!b.has(val)) return false; }
    return true;
  }

  // Objects/Arrays
  const keysA = Reflect.ownKeys(a as object);
  const keysB = Reflect.ownKeys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key =>
    deepEqual(
      (a as Record<string | symbol, unknown>)[key],
      (b as Record<string | symbol, unknown>)[key],
      seen
    )
  );
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Deep clone: recursively copy, handling primitives as base case, objects/arrays recursively, special types (Date, Map, Set) via constructors, circular refs via WeakMap. Deep equal: same structure — compare recursively, handle type mismatches, circular refs. Both use WeakMap for cycle detection."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Immutable state updates
const prevState = { user: { name: 'Hruday', settings: { theme: 'dark' } } };
const newState = deepClone(prevState);
newState.user.settings.theme = 'light';
console.log(deepEqual(prevState, newState)); // false — independent copies
```

## 5. 🧠 MEMORY AID
**"Deep clone: recursive copy + WeakMap for cycles + special type handlers. Deep equal: recursive compare + same key count + same prototype."**

## 6. 🎯 COMPLEXITY
Time: O(n) where n = total properties | Space: O(n) for clone, O(depth) for equal
