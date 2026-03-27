# Implement Deep Clone and Deep Equal
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Deep clone** = create a new object that is structurally identical to the original, with NO shared references; modifying the clone never affects the original; shallow clone copies top-level properties but shares nested objects — modifying a nested object in the clone ALSO modifies the original
- **Deep clone algorithm**: recursive DFS; primitive → return value directly; array → map each element recursively; plain object → copy each property recursively; handle cycles with a `WeakMap<original, clone>` to avoid infinite recursion
- **`JSON.parse(JSON.stringify(obj))`**: works for JSON-safe data; silently DROPS: `undefined`, functions, `Symbol`, circular references (throws TypeError); converts `Date` to string; loses `Infinity` / `NaN` → `null`; use `structuredClone()` in modern browsers/Node 17+ for a correct built-in version
- **Deep equal** = compare two values structurally; true if same type, same keys, and all nested values are deeply equal; false if any pair of corresponding values differs; handle: primitive equality with `===`; NaN equality (`Number.isNaN(a) && Number.isNaN(b)`); array length then element-by-element; object keys then value-by-value
- **Cycle handling in deep equal**: use a `WeakMap` of `(objA, objB)` pairs already being compared; if you encounter the same pair again, return `true` (treat cyclic structures as equal if they have the same shape)
- **Do not use `JSON.stringify(a) === JSON.stringify(b)` for deep equal**: property enumeration order in objects is not guaranteed (though V8 does sort numeric keys), and it fails for all non-JSON types

---

## 1. One-Line Definition
Deep clone creates a fully independent copy of an object graph with no shared references; deep equal checks whether two object graphs are structurally identical with the same values at every level; both require recursive traversal and cycle detection for robust implementations.

---

## 2. The Problem It Solves

**Shallow clone problems:**
```javascript
const original = { a: 1, nested: { b: 2 } };
const shallow = { ...original };
shallow.nested.b = 99;
console.log(original.nested.b);  // 99 — original was mutated!
```

In React, state mutation (not replacing with a new reference) breaks React's change detection — `prevState === nextState` would be true even though values changed, preventing re-renders.

**Reference equality problems:**
```javascript
const a = { x: [1, 2, 3] };
const b = { x: [1, 2, 3] };
console.log(a === b);             // false — different objects
console.log(a.x === b.x);        // false — different arrays
// We need deepEqual(a, b) === true
```

In testing, assertion libraries use deep equal. In Redux with `createSelector` (Reselect), output memoisation uses deep equal to determine if state changed. In React, `React.memo` uses shallow equal by default; providing your own deep equal comparator enables finer-grained re-render skipping.

---

## 3. How It Works Internally

### Deep Clone — Recursive DFS

```
Input:  { name: "Hruday", scores: [1, 2, 3], address: { city: "Bengaluru" } }

deepClone starts: input is object (not primitive)
  Clone each key:
    "name"    → "Hruday" (primitive) → copy directly
    "scores"  → [1, 2, 3] (array)    → recurse:
                  map over elements:
                    1 → 1 (primitive)
                    2 → 2 (primitive)
                    3 → 3 (primitive)
                  returns NEW array [1, 2, 3]
    "address" → { city: "Bengaluru" } (object) → recurse:
                  Clone each key:
                    "city" → "Bengaluru" (primitive) → copy directly
                  returns NEW object { city: "Bengaluru" }
  returns NEW object { name: "Hruday", scores: [new array], address: [new object] }

Result: completely new object tree with NO shared references to original
```

### Cycle Detection

```
Input: const a = {}; a.self = a;  (circular reference: a.self === a)

Without cycle detection:
  deepClone(a) → a is object → clone: { self: deepClone(a.self) }
               → a.self is a → deepClone(a) again → infinite recursion → stack overflow

With WeakMap<original, clone>:
  deepClone(a):
    Check WeakMap(a) → not there → proceed
    Create cloneA = {}
    WeakMap.set(a, cloneA)  ← record "I'm already cloning a, it maps to cloneA"
    Clone key "self":
      deepClone(a.self) = deepClone(a)
        Check WeakMap(a) → FOUND → return cloneA  ← return the existing clone
    cloneA.self = cloneA   ← the clone is self-referential, just like the original
  Return cloneA ✓
```

---

## 4. The Code

### Wrong Way — Common Failures

```typescript
// ❌ WRONG 1: JSON.parse/stringify drops data silently

const original = {
    name: "Hruday",
    fn: () => "hello",       // ← function
    sym: Symbol("id"),       // ← symbol
    undef: undefined,        // ← undefined
    date: new Date(),        // ← Date object
    inf: Infinity,           // ← Infinity
    nan: NaN                 // ← NaN
};

const clone = JSON.parse(JSON.stringify(original));
// Result:
// {
//   name: "Hruday",         ← preserved
//   fn: ← GONE (functions are dropped by JSON.stringify)
//   sym: ← GONE (symbols are dropped)
//   undef: ← GONE (undefined is dropped)
//   date: "2024-01-15T...", ← STRING, not Date object
//   inf: null,              ← Infinity becomes null
//   nan: null               ← NaN becomes null
// }

// ❌ WRONG 2: Using deepClone result and expecting original to be safe
//    (shallow clone mistake disguised as deep clone)

function shallowClone<T>(obj: T): T {
    return { ...obj };  // ← ❌ only clones top level — nested objects still shared
}

const obj = { meta: { version: 1 } };
const clone2 = shallowClone(obj);
clone2.meta.version = 99;
console.log(obj.meta.version);  // 99 — original mutated ❌
```

```typescript
// ❌ WRONG 3: Deep clone without cycle detection — stack overflow

function deepCloneNoCycleCheck(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(deepCloneNoCycleCheck);
    
    const cloned: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
        cloned[key] = deepCloneNoCycleCheck((value as Record<string, unknown>)[key]);
    }
    return cloned;  // ❌ circular references → infinite recursion → RangeError: Maximum call stack size exceeded
}
```

### Right Way — Robust Implementations

```typescript
// ✅ DEEP CLONE — handles primitives, arrays, plain objects, Date, cycles

function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
    // ✅ Primitives and null: return as-is
    if (value === null || typeof value !== 'object') return value;
    
    // ✅ Cycle detection: if we've already started cloning this object, return the in-progress clone
    if (seen.has(value as object)) return seen.get(value as object) as T;
    
    // ✅ Handle Date: create a new Date with the same timestamp
    if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
    
    // ✅ Handle Array: create new array, clone each element
    if (Array.isArray(value)) {
        const clonedArray: unknown[] = [];
        seen.set(value, clonedArray);  // ← register BEFORE recursing (so cycles can resolve)
        for (const item of value) {
            clonedArray.push(deepClone(item, seen));
        }
        return clonedArray as unknown as T;
    }
    
    // ✅ Handle plain object: clone own enumerable keys
    const clonedObj: Record<string, unknown> = {};
    seen.set(value, clonedObj);  // ← register BEFORE recursing
    for (const key of Object.keys(value as object)) {
        clonedObj[key] = deepClone((value as Record<string, unknown>)[key], seen);
    }
    return clonedObj as unknown as T;
}
```

```typescript
// ✅ DEEP EQUAL — handles primitives, arrays, objects, NaN, null

function deepEqual(a: unknown, b: unknown): boolean {
    // ✅ Primitive equality (includes NaN !== NaN by standard ===)
    if (a === b) return true;
    
    // ✅ Handle NaN — NaN is the ONLY value not equal to itself
    if (typeof a === 'number' && typeof b === 'number') {
        if (Number.isNaN(a) && Number.isNaN(b)) return true;
    }
    
    // ✅ If either is null or a primitive (and not === b at this point), not equal
    if (a === null || b === null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    
    // ✅ Both are non-null objects — compare arrays and plain objects
    
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray !== bIsArray) return false;  // ← one array, one object → not equal
    
    if (aIsArray) {
        const arrA = a as unknown[];
        const arrB = b as unknown[];
        if (arrA.length !== arrB.length) return false;
        for (let i = 0; i < arrA.length; i++) {
            if (!deepEqual(arrA[i], arrB[i])) return false;
        }
        return true;
    }
    
    // ✅ Plain object comparison
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
        // ✅ Check key exists in B AND value matches
        if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
        if (!deepEqual(objA[key], objB[key])) return false;
    }
    return true;
}
```

```java
// ✅ Java Deep Clone — recursive with IdentityHashMap for cycle detection

import java.util.IdentityHashMap;
import java.util.Map;
import java.lang.reflect.Array;

public class DeepCloneUtil {
    
    @SuppressWarnings("unchecked")
    public static <T> T deepClone(T original) {
        return (T) clone(original, new IdentityHashMap<>());
    }
    
    // ✅ IdentityHashMap uses == (reference) not .equals() for keys
    //    This correctly identifies the same object instance (not just equal objects)
    private static Object clone(Object original, Map<Object, Object> seen) {
        if (original == null) return null;
        
        // ✅ Primitive wrappers and immutable types — safe to return as-is
        Class<?> cls = original.getClass();
        if (cls.isPrimitive() || original instanceof Number
                || original instanceof String || original instanceof Boolean
                || original instanceof Character) {
            return original;
        }
        
        // ✅ Cycle detection
        if (seen.containsKey(original)) return seen.get(original);
        
        // ✅ Array handling
        if (cls.isArray()) {
            int len = Array.getLength(original);
            Object clonedArray = Array.newInstance(cls.getComponentType(), len);
            seen.put(original, clonedArray);
            for (int i = 0; i < len; i++) {
                Array.set(clonedArray, i, clone(Array.get(original, i), seen));
            }
            return clonedArray;
        }
        
        // ✅ For POJOs: clone via serialisation (requires Serializable)
        //    In practice, use a mapping library (MapStruct) or Cloneable pattern
        //    For interviews: show the recursive field-by-field approach concept
        //    java.util.List/Map: use copy constructors then deep clone each element
        
        // For interview purposes, return original (acknowledge limitation)
        return original;  // ← in a real implementation, handle specific collection types
    }
}
```

```typescript
// ✅ PRACTICAL: Custom deep equal for React.memo comparison

const MyExpensiveComponent = React.memo(
    function MyExpensiveComponent({ data }: { data: ComplexData }) {
        // ... expensive rendering
        return <div>{/* ... */}</div>;
    },
    // ✅ Custom comparison: re-render only if data actually changed deeply
    (prevProps, nextProps) => deepEqual(prevProps.data, nextProps.data)
    // Return true = same → DON'T re-render
    // Return false = different → DO re-render
);

// ✅ PRACTICAL: Undo/redo with deep clone
function useUndoableState<T>(initial: T) {
    const [history, setHistory] = React.useState<T[]>([initial]);
    const [index, setIndex] = React.useState(0);
    
    const setState = (newState: T) => {
        // ✅ Deep clone to ensure each history entry is independent
        const cloned = deepClone(newState);
        setHistory(prev => [...prev.slice(0, index + 1), cloned]);
        setIndex(prev => prev + 1);
    };
    
    const undo = () => setIndex(prev => Math.max(0, prev - 1));
    const redo = () => setIndex(prev => Math.min(history.length - 1, prev + 1));
    
    return [deepClone(history[index]), setState, undo, redo] as const;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between shallow and deep copy?"

**Hruday's answer:**
> A shallow copy creates a new top-level object and copies all top-level properties. But if any property's value is itself an object or array, the shallow copy holds a REFERENCE to the same nested object — not a new copy of it.
>
> A deep copy creates a new object AND recursively creates new copies of every nested object and array. After a deep copy, the original and the copy share no references — modifying any nested value in one does not affect the other.
>
> The practical impact: in React, state updates must not mutate the existing state. Using `setState({ ...prevState, nested: prevState.nested })` produces a shallow copy. If you then modify `newState.nested.value`, you're mutating the `prevState.nested` object because they're the same reference. React's change detection fails because `prevState.nested === newState.nested` is `true`. A deep copy eliminates this problem.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle circular references in a deep clone?"

**Hruday's answer:**
> Without cycle detection, a circular reference causes infinite recursion: cloning object A encounters property `a.self = a`, recursively clones `a.self`, encounters `a.self.self = a` again, and so on until the call stack overflows.
>
> I use a `WeakMap<original, clone>` as a "seen" registry. Before cloning any object, I check: is this exact object reference already being cloned? If yes, return the in-progress clone instead of recursing. If no, create the clone object, immediately register `seen.set(original, clone)` BEFORE recursing into properties, then clone each property.
>
> The critical timing: I register the mapping before recursing. This means if a cycle is encountered two levels deep, the second encounter finds the already-registered entry and returns the partially constructed clone. After all properties are cloned, the clone is fully assembled. The result is a clone that mirrors the cyclic structure with all new objects.
>
> I use `WeakMap` specifically because it doesn't prevent garbage collection of its keys — if the original objects are eligible for GC, the WeakMap doesn't hold on to them. `Map` with object keys would keep originals alive.

---

### Q3 — Application
**Interviewer asks:** "Why shouldn't you use `JSON.stringify(a) === JSON.stringify(b)` for deep equality?"

**Hruday's answer:**
> Two problems.
>
> First, correctness: `JSON.stringify` drops `undefined`, functions, and `Symbol`-keyed properties. If `a = { x: 1, fn: undefined }` and `b = { x: 1 }`, stringify makes both `'{"x":1}'` — they appear equal even though `a` has an extra `undefined` property. Also, `Date` objects become strings, `NaN` and `Infinity` become `null` — the comparison works on a lossy transformation of the original objects.
>
> Second, key ordering: `JSON.stringify({ b: 2, a: 1 })` = `'{"b":2,"a":1}'` while `JSON.stringify({ a: 1, b: 2 })` = `'{"a":1,"b":2}'`. These are two objects with identical properties and values but different key insertion order. Structured equality should call both equal, but stringify comparison says they're different.
>
> The correct deep equal recursively compares each key and value without serialisation loss.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Using `JSON.parse(JSON.stringify(obj))` as deep clone | "This is the simplest deep clone" | It works for JSON-safe POJOs with no functions, Dates, undefined, circular references, Symbols, NaN, or Infinity — which is a surprisingly restrictive subset of real application data; Dates silently become strings (a bug that's hard to detect); circular references throw a TypeError at runtime; in production TypeScript code, use `structuredClone(obj)` (available in browsers and Node 17+) which handles Dates, ArrayBuffers, and cycles correctly; write the recursive implementation for interviews to show you understand the mechanics |
| Not registering the clone in the seen map BEFORE recursing | "I'll clone the object, then register it in the map" | If you register AFTER cloning all properties, any cycle encountered during recursion won't find the in-progress clone in the map → infinite recursion before the registration ever happens; the seen map must be populated with the new (empty) clone object IMMEDIATELY after creation but BEFORE property cloning begins; this allows nested circular references to resolve by returning the partially-built clone |
| Checking key presence with `in` operator in deep equal | "I'll use `key in objB` to check if a key exists" | The `in` operator checks the prototype chain, not just own properties; `'toString' in {}` is `true` because `toString` is inherited from `Object.prototype`; use `Object.prototype.hasOwnProperty.call(objB, key)` or `Object.hasOwn(objB, key)` (ES2022) to check ONLY own properties; otherwise deepEqual would consider `{}` equal to an object that explicitly has `toString` as an own property |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a form state management system where submitting a draft saved the form's current state to a 'history' array for undo functionality. The first implementation used the spread operator: `history.push({ ...formState })`.
>
> The bug: form had nested arrays (dynamic line items). After push, the history entry and the live form both held references to the SAME line items array. When the user added a new line item to the live form, the previously saved history entry also changed — so undo was broken for forms with line items.
>
> We replaced `{ ...formState }` with `deepClone(formState)`. Each history entry became fully independent. The undo feature worked correctly. We also added a `deepEqual(currentState, lastHistoryEntry)` check before pushing — no duplicate history entries when the form was blurred without changes (a very common user action), reducing memory usage by ~40% in forms with frequent field interactions.
>
> Both deep clone and deep equal served real product requirements — not just interview exercises."

---

## 8. Scale Evolution

**1,000 users →** Custom `deepClone` / `deepEqual` in TypeScript, called on user-facing state objects. Objects are small (form data, filter state, UI config). Performance is not a concern.

**100,000 users →** Large normalised state trees in Redux (10,000+ entities). `deepEqual` on full state is O(n) in state size — too slow for every action. Solution: use Immer.js for structural sharing (change only mutated nodes, share unchanged nodes) and `===` reference checks at the reducer level. `deepEqual` is reserved for selector memoisation on derived data.

**10 million users →** Serialisation in distributed systems — cloning objects for message passing (deep clone into serialised form for Kafka/Redis); deep equal for change detection in CQRS event sourcing (compare old vs new aggregate state to determine which domain events to emit). At this scale, deep clone = serialisation + deserialisation; deep equal = hash comparison (hash the canonical JSON representation, compare hashes O(1) for large objects).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment form state cloning for multi-step checkout (deep clone each step's state independently); deep equal for detecting if payment details changed before re-validating | State isolation rationale; performance cost of deepEqual |
| Swiggy / Meesho | Cart state cloning for compare-cart feature; deep equal in jest tests for snapshot testing complex order objects; menu config deep clone to avoid modifying server response objects | Test assertion use case; Immer/structural sharing awareness |
| Adobe / Microsoft | React.memo with custom deep equal comparator; `useState` immutability rules; Immer in state management — Microsoft rounds commonly probe shallow vs deep copy semantics in React context | React.memo custom comparator; structuredClone awareness; WeakMap cycle detection |
| SAP Labs | Form history undo (spread clone bug → deepClone fix); deepEqual check before history push → 40% memory reduction; nested array mutation bug caught in production | Production undo story; concrete memory saving; spread vs deep clone trap |

---

## 10. Related Topics — What to Study Next

- **Topic 275 — Recursion and Memoization** — deep clone and deep equal are recursive algorithms; the "base case: primitive → return directly; recursive case: object → recurse into each property" pattern is classic recursion; memoisation with WeakMap for cycle detection parallels the memoisation pattern in DP
- **Topic 284 — Implement Promise.all / Promise.race** — async coordination patterns; Promise.all collects results from N async operations (like deepClone collecting results from N recursive calls); both use a counter or accumulator with a completion condition
- **Topic 285 — Implement curry, memoize, once, pipe** — `memoize` uses deep equal (or string serialisation of args) to determine cache hits; understanding deep equal is a prerequisite for writing a robust memoize function; plus `once` (also in EventEmitter topic) and `curry` complete the "fundamental JS utility functions" set

---

*Part 17 · Implement Deep Clone and Deep Equal · Full Stack Interview Guide · Hruday D · 2026*
