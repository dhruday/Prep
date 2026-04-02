# 18. Implement Deep Clone & Deep Equal
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Deep clone creates a structurally independent copy of a value — nested objects and arrays are copied, not shared by reference. Deep equal checks if two values have structurally identical content without requiring the same reference. The naive approach — `JSON.parse(JSON.stringify(x))` — breaks on dates (converted to strings), `undefined` values (dropped), functions (dropped), `Map`/`Set` (converted to `{}`), `NaN` (to `null`), `Infinity` (to `null`), and circular references (throws). The production implementation uses a `WeakMap` to track already-seen objects (handling circular references), dispatches on the value's type (Date, RegExp, Map, Set, Array, plain Object), preserves object prototypes via `Object.create(Object.getPrototypeOf(original))`, and uses `Reflect.ownKeys` to include non-enumerable and symbol-keyed properties. For deep equal, the key insight is using `Object.is` instead of `===` so that `NaN === NaN` is `true` and `+0 !== -0` is correctly `false`. At SAP, we used deep equal for Redux change detection in our Fiori dashboard — comparing 400-key state objects to decide whether to re-render complex charts."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

```
Shallow clone:
  const b = { ...a };  or  Object.assign({}, a)
  Top-level keys copied, nested objects still shared by reference:
    b.nested.x = 1;  // mutates a.nested.x too — shared reference

Deep clone:
  Entire tree copied — all nested structures are new objects:
    b.nested.x = 1;  // only b is affected, a is unmodified

Deep equal:
  Are two values structurally identical?
  a === b → only true if same reference (or same primitive)
  deepEqual(a, b) → true if same shape AND values at every level
```

**Where this matters:**
- Redux state immutability checks (deep equal to skip unnecessary re-renders)
- Unit test assertions: `expect(result).toEqual(expected)` — Jest's `toEqual` IS deep equal
- Configuration comparison (has config changed since last load?)
- Undo/redo history: storing deep clones of state snapshots
- Web Worker message passing: structuredClone (built-in deep clone)

---

### Why `JSON.parse(JSON.stringify(x))` Fails

```typescript
// 7 failure modes of JSON roundtrip clone:

const original = {
  date: new Date(),          // 1. Date → string (loses Date type)
  undef: undefined,          // 2. undefined values → dropped entirely
  fn: () => {},              // 3. functions → dropped
  map: new Map([['a', 1]]),  // 4. Map → {} (empty object)
  set: new Set([1, 2, 3]),   // 5. Set → {} (empty object)
  nan: NaN,                  // 6. NaN → null
  inf: Infinity,             // 7. Infinity → null
};

// Circular reference:
const circular: Record<string, unknown> = {};
circular.self = circular;   // 8. JSON.stringify throws TypeError

const clone = JSON.parse(JSON.stringify(original));
// clone.date is "2024-01-01T00:00:00.000Z" (string — not a Date)
// clone.undef is undefined (the key is gone)
// clone.fn is undefined (gone)
// clone.map is {}
// clone.set is {}
// clone.nan is null
// clone.inf is null
```

---

### Modern Built-in: `structuredClone()`

```typescript
// Available in all modern browsers (Chrome 98+, Firefox 94+, Node 17+):
const clone = structuredClone(value);

// Handles: arrays, objects, Date, RegExp, Map, Set, ArrayBuffer, circular refs
// Does NOT handle: functions, DOM nodes, class instances with methods
// Does NOT preserve: prototype chain (class instances become plain objects)

structuredClone(new Date('2024-01-01')); // ✅ clones as Date
structuredClone(new Map([['a', 1]]));    // ✅ clones as Map
structuredClone(() => {});               // ❌ DataCloneError — functions not cloneable
structuredClone(document.createElement('div')); // ❌ DataCloneError

class MyClass { method() {} }
const inst = new MyClass();
const clone2 = structuredClone(inst);
Object.getPrototypeOf(clone2) === MyClass.prototype; // false — plain object
```

**`structuredClone` vs custom `deepClone`:**
- Prefer `structuredClone` for plain data (API responses, state snapshots)
- Use custom `deepClone` when you need to handle functions, preserve class instances, or target environments without `structuredClone`

---

### How Deep Clone Works Internally

```
deepClone(value, seen = new WeakMap()):

1. Primitives (string, number, boolean, null, undefined, symbol, bigint):
   Return value as-is — no cloning needed

2. Circular reference check:
   if seen.has(value) → return seen.get(value)  // return already-cloned version

3. Type dispatch:
   Date    → new Date(value.getTime())
   RegExp  → new RegExp(value.source, value.flags)
   Map     → new Map(entries cloned recursively)
   Set     → new Set(values cloned recursively)
   Array   → new Array, then clone each index
   Object  → Object.create(Object.getPrototypeOf(value))
              copy all own properties (enumerable + non-enumerable + symbol keys)
              via Reflect.ownKeys()

4. Register in seen BEFORE recursing into children:
   seen.set(original, clone)  // ← CRITICAL: must be done before recursion
   // If a child references the original, seen.has(original) → returns clone in progress
```

**Why `WeakMap` not `Map`?**
`WeakMap` holds weak references — when the original object is garbage collected, the `WeakMap` entry is automatically removed. This prevents the `seen` map itself from being a memory leak.

---

### How Deep Equal Works Internally

```
deepEqual(a, b):

1. Object.is(a, b) → true (handles ===, NaN, +0/-0)
2. If types differ → false: typeof a !== typeof b
3. null check: if either is null → false (covered by step 1 if both null)
4. Non-object types already handled by step 1
5. Check prototypes match: Object.getPrototypeOf(a) !== Object.getPrototypeOf(b) → false
6. Get own keys: Reflect.ownKeys(a), Reflect.ownKeys(b)
7. Key count check: if counts differ → false (early exit)
8. For each key in a: deepEqual(a[key], b[key]) — recursive

Special cases:
  Map: compare size, then each entry
  Set: compare size, then check b has every value of a
  Date: compare getTime()
  RegExp: compare source + flags
  Array: compare length, then each index
```

**Why `Object.is` instead of `===`?**
```typescript
NaN === NaN   // false (JavaScript quirk)
Object.is(NaN, NaN)  // true ✅ — correct semantic equality

+0 === -0    // true (loses sign distinction)
Object.is(+0, -0)   // false ✅ — preserves sign distinction
```

---

### Architecture & Component Boundaries

```
Deep clone usage in frontend:

  Redux reducers:
    state = { ...state, user: deepClone(newUser) }
    // Ensures nested user object is not shared with previous state
    // Immer does this internally via Proxy — you never call deepClone manually

  React useReducer / useState:
    Must not mutate existing state — deep clone enables safe mutation of the copy

  Undo/Redo stack:
    history.push(deepClone(currentState))
    // Snapshot in time — later mutations don't affect history

  Web Worker messages:
    postMessage(deepClone(data)) or structuredClone(data)
    // Both sides get independent copies
    
Deep equal usage:

  shouldComponentUpdate / React.memo comparator:
    return !deepEqual(prevProps, nextProps)
    
  Redux state comparison:
    Reselect uses reference equality by default — deepEqual for complex objects

  Test assertions:
    expect(actual).toEqual(expected) — Jest's implementation of deepEqual
```

---

### Performance Implications

**Deep clone cost:**
- O(n) time and space where n = total number of nodes in the object tree
- Avoid deep cloning large objects on every render — clone once when the data is received, then use immutable patterns (spread operators, Immer) for incremental updates

**Deep equal cost:**
- O(n) worst case (must traverse full structure)
- O(1) best case (same reference → `Object.is` short-circuits immediately)
- Key optimization: check reference equality first, then check key count (short-circuit on size mismatch), then recurse
- In practice, Redux state comparison with Reselect is reference equality first — deep equal is the fallback

**Immer over manual deep clone:**
```
Immer's produce() uses ES6 Proxy to track mutations:
  - Only clones objects along the mutation path (structural sharing)
  - 95% of tree is shared, not deep-cloned
  - O(changed path depth) vs O(full tree size) for deepClone
```

---

### Trade-offs

| `deepClone` (custom) | `structuredClone` | `JSON.parse/stringify` | `immer` | Choose when |
|---|---|---|---|---|
| Handles functions, classes | No functions/DOM | No functions, NaN, Date | No custom types | Custom: need function/class support |
| Full control | Browser-native, fast | Simple | Easiest API | structuredClone: plain JSON-like data |
| More code | Fewer lines | 1 line | Production state mgmt | JSON: quick prototyping only |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Not registering the clone in `seen` before recursing:** If a circular structure has `a.child.parent = a`, recursing into `a.child` will call `deepClone(a.child)`, which calls `deepClone(a.child.parent)` = `deepClone(a)` again — infinite recursion. Register `seen.set(original, clone)` BEFORE recursing into children.

- **Using `JSON.parse(JSON.stringify)` for state management:** Silently drops `undefined` properties, corrupts Dates, and throws on circular refs. If your state ever contains these types (and Redux state often contains Dates), you get subtle bugs that only surface in edge cases.

- **Deep equal comparison of objects with function values:** Functions are compared by reference equality — two `() => {}` literals are never deep equal even if their code is identical. Be careful deep-equaling component props that include handler functions.

- **Not handling Symbol-keyed properties:** `Object.keys()` and `for...in` miss symbol-keyed properties. Use `Reflect.ownKeys(obj)` to include them.

- **Deep cloning class instances without preserving prototype:** `Object.create(Object.getPrototypeOf(original))` preserves the prototype chain so `instanceof` still works on the clone. Forgetting this turns class instances into plain objects.

---

## 🏭 3. Real-World Examples

**SAP Fiori — Redux deep equal change detection:**

SAP Fiori Launchpad's dashboard had a chart component that subscribed to a 400-key analytics state object. The component was re-rendering on every state update because object reference always changed (even when data was identical). Implementing deep equal as the `areEqual` comparator for `React.memo` reduced re-renders from 50+ to 2-3 per page interaction — the chart only re-rendered when the relevant slice of analytics data actually changed.

**Redux — shallowEqual vs deepEqual:**

Redux's `connect` uses `shallowEqual` (only one level deep) as the mapStateToProps comparator by default. For deeply nested derived data, `shallowEqual` causes false "no change" responses when nested objects change. Custom deep equal selectors (via reselect) prevent both over-rendering and under-rendering. Understanding when to use shallow vs deep comparison is a senior signal.

**Microsoft Azure DevOps — configuration deep clone:**

Azure DevOps UI stores pipeline configuration as deeply nested objects. When the user edits a configuration, the UI creates a deep clone of the current config, applies mutations to the clone, then diffs the clone against original to generate a "pending changes" view. `structuredClone` is used for this as it handles the full JSON-like config structure efficiently.

**Adobe Photoshop Web / Firefly — undo history:**

Adobe's browser-based design tools maintain an undo stack as an array of deep-cloned state snapshots. Each user action: `undoStack.push(deepClone(canvas.state))`. Undo: `canvas.state = deepClone(undoStack.pop())`. The clone in then-direction prevents future mutations from corrupting history; the clone in the now-direction prevents history from being mutated by ongoing operations.

**How it evolves with scale:**
- **Small scale:** `JSON.parse/stringify` fine for simple config objects without Date/undefined
- **Medium scale:** `structuredClone` for any data with Map/Set/Date
- **Large scale (SAP, Adobe):** Custom `deepClone` with WeakMap + type dispatch for class instances + Immer for state management to avoid full deep clone costs on every state update

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "I'll implement both. Deep clone handles primitives directly, uses a WeakMap to detect circular references, and dispatches on type for Date, RegExp, Map, Set, Array, and plain objects. For plain objects, I preserve the prototype with `Object.create(Object.getPrototypeOf(source))` and copy all own keys including non-enumerable and symbol keys via `Reflect.ownKeys`. Deep equal uses `Object.is` instead of `===` so that `NaN` equals `NaN`, checks prototype identity, then recursively compares each key.

> The production note: for real application state management, I'd use Immer — it uses Proxy to structurally share unchanged subtrees, so you only clone the path you're mutating. For serializable data like API responses, `structuredClone()` is the right built-in. Custom `deepClone` is for when you need to handle class instances or functions."

---

### Likely Follow-up Questions

1. **Why `WeakMap` over `Map` for the `seen` registry?** → `Map` holds strong references — if the object being cloned goes out of scope, the Map entry keeps it alive (memory leak). `WeakMap` holds weak references — the entries are automatically garbage collected when the key objects are no longer reachable elsewhere.

2. **How does `Object.is` differ from `===`?** → Two differences: `Object.is(NaN, NaN)` is `true` (while `NaN === NaN` is `false`), and `Object.is(+0, -0)` is `false` (while `+0 === -0` is `true`). For deep equal, `Object.is` is the semantically correct base case.

3. **How do you handle circular references in deep clone?** → Before recursing into an object's children, register the clone in a `WeakMap` keyed by the original: `seen.set(original, clone)`. When recursing into a child, check `if (seen.has(child)) return seen.get(child)` — this returns the in-progress clone rather than infinitely recursing.

4. **What is structural sharing in Immer?** → Immer wraps the state in a Proxy that intercepts writes. When you mutate `draft.user.name`, Immer only clones the path from root to the mutated node (`root → user`). All unmodified subtrees keep their original references. This is O(depth of mutation) vs O(full state size) for a full deep clone.

5. **How does Jest's `toEqual` implement deep equal?** → Jest uses a custom deep equality algorithm (via `@jest/expect-utils`) that handles special cases: `NaN`, `undefined` properties, class instances, asymmetric matchers, and circular references. The algorithm is essentially the deepEqual pattern with Jest-specific extensions for matchers like `expect.any(String)`.

---

### vs Alternatives

| Custom `deepClone` | `structuredClone` | `JSON.parse/stringify` | `immer` | Choose when |
|---|---|---|---|---|
| Handles all types | No functions/DOM | Corrupts Dates, NaN, undefined | State management only | Custom: need class/function support |
| Preserves prototypes | Loses prototype | Loses prototype | Proxy-based mutation | structuredClone: plain JSON-like data |
| Handles circular refs | Handles circular refs | Throws on circular | Handles circular | JSON: never in production state |

---

### How to Signal Senior Thinking

> "The real question in a production context isn't 'deepClone or structuredClone' — it's 'why are you deep cloning at all?' If you're deep cloning state on every update, you're spending O(n) time on every state mutation. Immer eliminates that with structural sharing — only the mutated path is copied. In large state trees (SAP Fiori with 400+ keys per state object), the difference between a full deepClone and an Immer produce is the difference between O(400) and O(depth of change), which is typically O(2-4). That's why Redux Toolkit ships with Immer built in."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: Production deepClone — WeakMap + type dispatch
// ============================================================

function deepClone<T>(value: T, seen = new WeakMap()): T {
  // Primitives — return as-is
  if (value === null || typeof value !== 'object' && typeof value !== 'function') {
    return value;
  }

  // Circular reference detected — return already-cloned version
  if (seen.has(value as object)) {
    return seen.get(value as object) as T;
  }

  // Date
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  // RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  // Map
  if (value instanceof Map) {
    const clonedMap = new Map();
    seen.set(value as object, clonedMap);
    for (const [k, v] of value) {
      clonedMap.set(deepClone(k, seen), deepClone(v, seen));
    }
    return clonedMap as unknown as T;
  }

  // Set
  if (value instanceof Set) {
    const clonedSet = new Set();
    seen.set(value as object, clonedSet);
    for (const item of value) {
      clonedSet.add(deepClone(item, seen));
    }
    return clonedSet as unknown as T;
  }

  // Array
  if (Array.isArray(value)) {
    const clonedArray: unknown[] = [];
    seen.set(value as object, clonedArray); // register BEFORE recursing
    for (let i = 0; i < value.length; i++) {
      clonedArray[i] = deepClone(value[i], seen);
    }
    return clonedArray as unknown as T;
  }

  // Plain object or class instance — preserve prototype
  const proto = Object.getPrototypeOf(value);
  const clonedObj = Object.create(proto) as Record<string | symbol, unknown>;
  seen.set(value as object, clonedObj); // register BEFORE recursing into children

  for (const key of Reflect.ownKeys(value as object)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if ('value' in descriptor) {
      clonedObj[key as string] = deepClone(descriptor.value as T, seen);
    } else {
      // Preserve getters/setters
      Object.defineProperty(clonedObj, key, descriptor);
    }
  }

  return clonedObj as unknown as T;
}

// ============================================================
// DEMO 2: deepClone test cases
// ============================================================

// Circular reference:
interface Circular { name: string; self?: Circular }
const obj: Circular = { name: 'root' };
obj.self = obj;
const clone = deepClone(obj);
console.log(clone !== obj);              // true — different reference
console.log(clone.self === clone);       // true — circular ref preserved correctly
console.log(clone.self !== obj.self);    // true — not the original

// Class instance:
class User {
  constructor(public name: string, public age: number) {}
  greet() { return `Hi, I'm ${this.name}`; }
}
const user = new User('Hruday', 30);
const clonedUser = deepClone(user);
console.log(clonedUser instanceof User); // true — prototype preserved ✅
console.log(clonedUser.greet());         // "Hi, I'm Hruday" ✅

// ============================================================
// DEMO 3: Production deepEqual — Object.is + recursive
// ============================================================

function deepEqual(a: unknown, b: unknown): boolean {
  // Step 1: Object.is handles primitives, same ref, NaN, +0/-0
  if (Object.is(a, b)) return true;

  // Step 2: Both must be objects (non-null)
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;

  // Step 3: Same prototype
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  // Step 4: Special types
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !deepEqual(v, b.get(k))) return false;
    }
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) {
      if (!b.has(v)) return false; // Note: Set deep equality of object values is complex
    }
    return true;
  }

  // Step 5: Object / Array — compare own keys
  const keysA = Reflect.ownKeys(a as object);
  const keysB = Reflect.ownKeys(b as object);

  if (keysA.length !== keysB.length) return false; // early exit on size mismatch

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(
      (a as Record<string | symbol, unknown>)[key as string],
      (b as Record<string | symbol, unknown>)[key as string]
    )) return false;
  }

  return true;
}

// ============================================================
// DEMO 4: deepEqual edge cases
// ============================================================

console.log(deepEqual(NaN, NaN));        // true ✅ (Object.is handles)
console.log(deepEqual(+0, -0));          // false ✅ (Object.is handles)
console.log(deepEqual([1, [2, 3]], [1, [2, 3]]));  // true ✅
console.log(deepEqual({ a: 1 }, { a: 2 }));        // false ✅
console.log(deepEqual(new Date('2024'), new Date('2024'))); // true ✅
console.log(deepEqual(new Map([['a',1]]), new Map([['a',1]])));  // true ✅

// SAP dashboard usage — memo comparator:
const MemoChart = React.memo(
  ({ data }: { data: Record<string, number[]> }) => <div>{/* chart */}</div>,
  (prev, next) => deepEqual(prev.data, next.data) // custom comparator
);
```

**Interview vs Production difference:**
- **Interview:** Demo 3 (`deepEqual`) with the `Object.is` base case + recursive key comparison. Also explain the circular reference handling in `deepClone` (the WeakMap pattern). These two are the core interview demonstrations.
- **Production:** Demo 1 (full `deepClone` with Reflect.ownKeys, prototype preservation, getter/setter handling). In real state management, prefer `immer` + `structuredClone` over calling custom `deepClone` on every update.

---

## 🧠 6. Memory Aid

**Mental Model:** Deep clone is like photocopying a multi-layer cake — every layer and filling gets its own copy, not just the top. The `WeakMap` is a sticky note tracker that prevents you from photocopying the same layer twice if the cake has a self-referential decoration.

Deep equal is like checking two cakes are identical recipes — you have to taste every layer and compare every ingredient, not just look at them from across the room.

**If you go blank:** *"deepClone: WeakMap for circular refs; register before recursing. Dispatch on type: Date/RegExp/Map/Set/Array/Object. Preserve prototype with Object.create(proto). Use Reflect.ownKeys for symbols + non-enumerable. deepEqual: Object.is base case (handles NaN + +0/-0). Check prototype. Check key count. Recurse on each key."*

**Mnemonic:** **WRIST** for deepClone — **W**eakMap (circular), **R**egister before recursing, **I**nstance dispatch (Date/RegExp/Map...), **S**tructure copy (Object.create(proto)), **T**raverse with Reflect.ownKeys. And **OIS** for deepEqual — **O**bject.is first, **I**dentical prototype, **S**ame keys + recursive.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Deep equal as a React.memo comparator for complex props prevents unnecessary re-renders — at SAP, implementing deep equal comparators for chart data reduced unnecessary chart re-renders by 80%, directly improving scroll and interaction smoothness.
→ **Performance:** Deep clone's O(n) cost must be managed: prefer `structuredClone` for plain data, Immer for state management (structural sharing), custom `deepClone` only when neither is sufficient. `JSON.parse/stringify` is a trap — it's fast but silently corrupts data.
→ **Business:** Jest's `toEqual`, Vitest's `toEqual`, and lodash's `_.isEqual` are all `deepEqual` implementations. Immer (powering Redux Toolkit) and structuredClone power modern state management. Understanding their internals enables correct use, correct debugging, and correct performance tuning.

**How it works (3 sentences):**
`deepClone` handles primitives by returning them directly, uses a `WeakMap` to detect and correctly reconnect circular references (registering each clone before recursing into its children to prevent infinite recursion), and dispatches on the runtime type to appropriately clone `Date`, `RegExp`, `Map`, `Set`, `Array`, or plain object values — preserving prototypes via `Object.create(Object.getPrototypeOf(original))` and copying all own keys (including non-enumerable and symbol-keyed) via `Reflect.ownKeys`. `deepEqual` uses `Object.is` as the base case (which correctly returns `true` for `NaN === NaN` and `false` for `+0 === -0` unlike `===`), then for object types checks prototype identity, key count (for early exit), and recursively calls `deepEqual` on each own key. In production, prefer `structuredClone` for plain JSON-like data, `Immer` for state management (structural sharing avoids full O(n) clones), and custom implementations only for class instances with methods or when function values must be handled.

**Company relevance:**
- **Microsoft:** TypeScript's compiler source code uses deep comparison utilities extensively for AST node comparison. Azure DevOps uses deep clone/equal for configuration diff views. Redux Toolkit (shipped with Immer) is standard in Microsoft's React frontends.
- **Adobe:** Photoshop Web, Illustrator Web, and Firefly all maintain undo history via deep clone state snapshots. Adobe's React component library uses deep equal in change detection for complex canvas state.
- **Salesforce:** LWC's change detection uses shallow comparison by default — deep equal is used explicitly for complex object props. Salesforce's Apex data comparison uses deep equality in cache invalidation logic.
- **Cisco:** WebEx's state snapshots for meeting continuation use `structuredClone` for the serializable portions and custom clone for class-based SDK objects. Deep equal is used in participant list change detection to avoid re-rendering the participant panel on unrelated state updates.

---
✅ **Topic 18/486 complete.**
→ **Continuing to Topic 19: Implement Promise.all / Promise.race from Scratch**
