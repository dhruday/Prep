# 06 — JavaScript, Browser & TypeScript Internals

> **Phase E** of the FAANG Interview Master Guide
> Covers: SEQ 1 (JS Engine & Runtime, topics 1-21), SEQ 2 (Browser & Web Platform, topics 22-42), SEQ 3 (TypeScript Deep Dive, topics 43-58)
> **58 topics** | Tested heavily at Adobe, Microsoft, Cisco

---

## Table of Contents

### Part A — JavaScript Engine & Runtime (SEQ 1)
- [1. JavaScript Execution Model](#1-javascript-execution-model)
- [2. Event Loop — Microtasks vs Macrotasks](#2-event-loop--microtasks-vs-macrotasks)
- [3. Main Thread vs Worker Threads](#3-main-thread-vs-worker-threads)
- [4. Call Stack, Task Queue, Microtask Queue Interaction](#4-call-stack-task-queue-microtask-queue-interaction)
- [5. Closures — Scope Chain & Lexical Environment](#5-closures--scope-chain--lexical-environment)
- [6. Prototypal Inheritance](#6-prototypal-inheritance)
- [7. this Keyword — All 4 Contexts](#7-this-keyword--all-4-contexts)
- [8. Hoisting — var vs let vs const](#8-hoisting--var-vs-let-vs-const)
- [9. Garbage Collection & Memory Leaks](#9-garbage-collection--memory-leaks)
- [10. Promises Internals](#10-promises-internals)
- [11. async/await Internals](#11-asyncawait-internals)
- [12. Promise Combinators](#12-promise-combinators)
- [13. Generators and Iterators](#13-generators-and-iterators)
- [14. AbortController & Request Cancellation](#14-abortcontroller--request-cancellation)
- [15. Implement debounce](#15-implement-debounce)
- [16. Implement throttle](#16-implement-throttle)
- [17. Implement curry, memoize, once, pipe](#17-implement-curry-memoize-once-pipe)
- [18. Implement Deep Clone & Deep Equal](#18-implement-deep-clone--deep-equal)
- [19. Implement Promise.all / Promise.race](#19-implement-promiseall--promiserace)
- [20. Implement EventEmitter / Pub-Sub](#20-implement-eventemitter--pub-sub)
- [21. Implement LRU Cache](#21-implement-lru-cache)

### Part B — Browser & Web Platform Internals (SEQ 2)
- [22. How the Browser Works](#22-how-the-browser-works)
- [23. Browser Process Architecture](#23-browser-process-architecture)
- [24. Critical Rendering Path](#24-critical-rendering-path)
- [25. HTML Parsing, CSSOM, Render Tree](#25-html-parsing-cssom-render-tree)
- [26. Reflows vs Repaints](#26-reflows-vs-repaints)
- [27. GPU vs CPU Rendering](#27-gpu-vs-cpu-rendering)
- [28. Compositing Layers & will-change](#28-compositing-layers--will-change)
- [29. Browser Resource Prioritization](#29-browser-resource-prioritization)
- [30. Avoiding Layout Thrashing](#30-avoiding-layout-thrashing)
- [31. Memory Management in Browser](#31-memory-management-in-browser)
- [32. Browser Storage Options](#32-browser-storage-options)
- [33. Storage Quotas & Eviction Policies](#33-storage-quotas--eviction-policies)
- [34. Origin Private File System (OPFS)](#34-origin-private-file-system-opfs)
- [35. Network Stack Basics](#35-network-stack-basics)
- [36. HTTP/1.1 vs HTTP/2 vs HTTP/3](#36-http11-vs-http2-vs-http3)
- [37. Connection Reuse & Head-of-Line Blocking](#37-connection-reuse--head-of-line-blocking)
- [38. DNS Prefetch, Preconnect, Early Hints](#38-dns-prefetch-preconnect-early-hints)
- [39. QUIC Protocol Basics](#39-quic-protocol-basics)
- [40. Web Workers](#40-web-workers)
- [41. Service Workers](#41-service-workers)
- [42. Worklets](#42-worklets)

### Part C — TypeScript Deep Dive (SEQ 3)
- [43. Types vs Interfaces](#43-types-vs-interfaces)
- [44. Union & Intersection Types](#44-union--intersection-types)
- [45. Generics](#45-generics)
- [46. Enums vs Const Assertions vs Union Types](#46-enums-vs-const-assertions-vs-union-types)
- [47. Conditional Types & infer](#47-conditional-types--infer)
- [48. Mapped Types](#48-mapped-types)
- [49. Template Literal Types](#49-template-literal-types)
- [50. Discriminated Unions](#50-discriminated-unions)
- [51. Utility Types](#51-utility-types)
- [52. Typing Props, Children, Events, Refs](#52-typing-props-children-events-refs)
- [53. Typing Custom Hooks](#53-typing-custom-hooks)
- [54. Typing Context with Generic Providers](#54-typing-context-with-generic-providers)
- [55. Typing HOCs and Render Props](#55-typing-hocs-and-render-props)
- [56. tsconfig Deep Dive](#56-tsconfig-deep-dive)
- [57. Declaration Files (.d.ts)](#57-declaration-files-dts)
- [58. TypeScript with Vite vs Webpack](#58-typescript-with-vite-vs-webpack)

---
---

# Part A — JavaScript Engine & Runtime

## 1. JavaScript Execution Model

### Q: Explain how JavaScript executes code from the moment a script is loaded.

**Answer (Interview-Ready):**
- JS is **single-threaded** with a **synchronous execution model** — one line at a time on the call stack
- When a script loads, the engine creates a **Global Execution Context (GEC)** with two phases:
  - **Creation phase**: Allocates memory for variables (`undefined` for `var`, uninitialized for `let/const`) and stores function declarations fully (hoisting)
  - **Execution phase**: Runs code line-by-line, assigns values, invokes functions
- Each function call creates a new **Function Execution Context** pushed onto the **call stack**
- When a function returns, its context is popped off the stack
- The **Lexical Environment** tracks variable bindings and a reference to the outer (parent) environment — this is how scope chains work

**Follow-ups:**
- "What happens with nested function calls?" → Each creates its own execution context. They stack up. If recursion goes too deep → **stack overflow** (browser typically limits ~10K-15K frames)
- "How does `eval()` affect this?" → `eval()` creates a new execution context at runtime, which is why it breaks optimizations and should be avoided
- "Difference between execution context and scope?" → Execution context is the runtime container (this, variables, outer ref). Scope is the accessibility rules determined at write-time (lexical scoping)

🔥 **Most Asked**: Creation vs execution phase, hoisting mechanism, call stack behavior
⚠️ **Common Mistakes**: Saying JS is "asynchronous by nature" — it's single-threaded synchronous with async APIs
🧠 **Strategy**: Draw the call stack with push/pop for a simple example. Interviewers love visual walkthroughs

---

## 2. Event Loop — Microtasks vs Macrotasks

### Q: Explain the event loop. What's the difference between microtasks and macrotasks?

**Answer (Interview-Ready):**
- The **event loop** is the mechanism that allows JS to handle async operations despite being single-threaded
- It continuously checks: (1) Is the call stack empty? (2) Are there microtasks? Process ALL of them. (3) Are there macrotasks? Process ONE, then back to step 1

**Microtasks** (higher priority, processed first):
- `Promise.then/catch/finally` callbacks
- `queueMicrotask()`
- `MutationObserver`
- Process ALL microtasks before ANY macrotask

**Macrotasks** (lower priority):
- `setTimeout`, `setInterval`
- `requestAnimationFrame` (special — runs before paint)
- I/O callbacks, UI rendering events
- Process ONE macrotask per loop iteration

**Classic interview example:**
```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
```
Why: Synchronous (1, 4) → microtask (3) → macrotask (2)

**Follow-ups:**
- "What if a microtask enqueues another microtask?" → It's processed in the SAME microtask cycle. This can starve macrotasks — an infinite microtask loop blocks the UI forever
- "Where does `requestAnimationFrame` fit?" → It runs before the browser paints, after microtasks, but it's not exactly a macrotask. It's a special rendering callback
- "How does `queueMicrotask` differ from `Promise.resolve().then()`?" → Functionally identical priority, but `queueMicrotask` is semantically clearer and avoids creating a throwaway Promise object

🔥 **Most Asked**: Output prediction questions, microtask vs macrotask priority
⚠️ **Common Mistakes**: Saying setTimeout(fn, 0) runs immediately; not knowing microtasks drain completely before macrotasks
🧠 **Strategy**: Always walk through: sync first → drain microtask queue → one macrotask → repeat

---

## 3. Main Thread vs Worker Threads

### Q: What runs on the main thread? When should you offload to a worker?

**Answer (Interview-Ready):**
- The **main thread** handles: JS execution, DOM manipulation, style calculation, layout, paint, compositing, user input events
- Everything competes for the same thread — a long JS task blocks rendering and input → UI feels frozen
- **Target**: Keep main thread tasks under **50ms** (RAIL model). Anything longer is a "long task"

**When to offload to Web Workers:**
- CPU-intensive computation (image processing, data parsing, sorting large arrays, crypto)
- Large JSON parsing (`JSON.parse` of 10MB+ payload)
- Complex search/filter on large datasets
- Any operation that takes >50ms consistently

**Worker limitations:**
- No DOM access (can't touch `document`, `window.location`, etc.)
- Communication via `postMessage` — data is **structured-cloned** (copied, not shared). For large data, use `Transferable` objects (zero-copy transfer of ArrayBuffers)
- Separate memory space — not shared by default (SharedArrayBuffer exists but has security restrictions)

**Follow-ups:**
- "How to know if the main thread is blocked?" → Performance API: `PerformanceObserver` with `longtask` entry type. Chrome DevTools Performance tab shows long tasks in red
- "What about SharedArrayBuffer?" → Allows shared memory between main thread and workers. Requires `Cross-Origin-Isolation` headers (`COOP` + `COEP`). Used for high-performance scenarios like Wasm
- "Difference between Web Worker and Service Worker?" → Web Worker: background computation, tied to page lifecycle. Service Worker: proxy between browser and network, survives page close, handles push/cache/fetch

🔥 **Most Asked**: When to use workers, 50ms budget, postMessage overhead
⚠️ **Common Mistakes**: Overusing workers for simple tasks (postMessage overhead > computation time); trying to access DOM from worker
🧠 **Strategy**: Give a concrete example: "Parsing a 5MB CSV in the main thread blocks UI for 200ms. Move to Web Worker, postMessage the result back"

---

## 4. Call Stack, Task Queue, Microtask Queue Interaction

### Q: Walk through exactly what happens when this code runs — trace the call stack, task queue, and microtask queue.

```javascript
function main() {
  console.log('A');
  setTimeout(() => console.log('B'), 0);
  Promise.resolve().then(() => {
    console.log('C');
    setTimeout(() => console.log('D'), 0);
  });
  console.log('E');
}
main();
```

**Answer (Interview-Ready):**

| Step | Call Stack | Microtask Queue | Task Queue | Console |
|------|-----------|-----------------|------------|---------|
| 1 | `main()` | — | — | A |
| 2 | `main()` | — | `() => log('B')` | A |
| 3 | `main()` | `() => log('C')...` | `() => log('B')` | A |
| 4 | `main()` | `() => log('C')...` | `() => log('B')` | A, E |
| 5 | *(empty)* | `() => log('C')...` | `() => log('B')` | A, E |
| 6 | microtask cb | — | `() => log('B')`, `() => log('D')` | A, E, C |
| 7 | task cb | — | `() => log('D')` | A, E, C, B |
| 8 | task cb | — | — | A, E, C, B, D |

**Output**: A, E, C, B, D

**Key rules demonstrated:**
1. **Sync code runs first** (A, E while `main()` is on the stack)
2. **Microtasks drain before macrotasks** (C before B, even though setTimeout was registered first)
3. **setTimeout inside a microtask** goes to the task queue (D runs after B)
4. **Call stack must be empty** before event loop processes any queue

**Follow-ups:**
- "What if there were nested `.then()` chains?" → Each `.then()` callback, when resolved, enqueues the next `.then()` as a new microtask. They run in order within the same microtask cycle
- "Can microtasks starve macrotasks?" → Yes. `while(true) queueMicrotask(fn)` would never let setTimeout callbacks run
- "How does `requestAnimationFrame` fit in this model?" → After microtasks, before paint. So order is: sync → microtasks → rAF → paint → macrotask

🔥 **Most Asked**: Output prediction with mixed setTimeout/Promise code
⚠️ **Common Mistakes**: Thinking setTimeout(0) means "run immediately"; forgetting microtasks drain completely
🧠 **Strategy**: Use a table like above. Interviewers universally appreciate this structured walkthrough

---

## 5. Closures — Scope Chain & Lexical Environment

### Q: What is a closure? How does the scope chain work?

**Answer (Interview-Ready):**
- A **closure** is a function that retains access to its **lexical scope** (where it was defined), even when executed outside that scope
- Every function creates a **Lexical Environment** containing: (1) local variables, (2) reference to the **outer environment** (parent scope)
- The **scope chain** is the chain of these outer references: current scope → parent → grandparent → ... → global

```javascript
function createCounter() {
  let count = 0;                    // captured by closure
  return {
    increment: () => ++count,
    getCount: () => count,
  };
}
const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
// createCounter's execution context is gone from the stack,
// but `count` lives because the returned functions close over it
```

**Common interview trap — loop + var:**
```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3 — because `var` is function-scoped, all closures share the same `i`

// Fix 1: let (block-scoped — each iteration gets its own `i`)
for (let i = 0; i < 3; i++) { ... }

// Fix 2: IIFE (creates a new scope per iteration)
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i);
}
```

**Follow-ups:**
- "Do closures cause memory leaks?" → Yes, if the closed-over variables hold large objects and the closure lives long (e.g., event listeners never removed). The GC can't collect variables referenced by a live closure
- "What's the difference between closure and scope?" → Scope is the current visibility of variables (determined at write time). Closure is the mechanism that preserves scope access after the function exits
- "How do closures work under the hood?" → V8 creates a "Context" object for variables that are closed over. This Context is stored on the heap (not the stack frame), so it survives after the function returns

🔥 **Most Asked**: Loop + closure trap, practical use cases (module pattern, currying, memoization)
⚠️ **Common Mistakes**: Confusing closure with simply defining a function inside another; not knowing var/let difference in loops
🧠 **Strategy**: Always give the loop example — it's expected. Then show a practical example (counter, memoize)

---

## 6. Prototypal Inheritance

### Q: Explain prototypal inheritance. How does the prototype chain work?

**Answer (Interview-Ready):**
- Every JS object has an internal `[[Prototype]]` link (accessible via `__proto__` or `Object.getPrototypeOf()`)
- When you access a property on an object, JS looks: (1) own properties → (2) prototype → (3) prototype's prototype → ... → `null`
- This chain of lookups is the **prototype chain**

```javascript
const animal = { eats: true };
const rabbit = Object.create(animal); // rabbit.__proto__ === animal
rabbit.jumps = true;

rabbit.eats;   // true — found on prototype
rabbit.jumps;  // true — own property
rabbit.flies;  // undefined — not found anywhere in chain
```

**`class` is syntactic sugar over prototypes:**
```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} speaks`; }
}
class Dog extends Animal {
  bark() { return 'Woof'; }
}
// Dog.prototype.__proto__ === Animal.prototype
// new Dog('Rex').__proto__ === Dog.prototype
```

**Key distinctions:**
- **Own property** vs **inherited property**: `obj.hasOwnProperty('key')` checks only own
- **Property shadowing**: If you set `rabbit.eats = false`, it creates an own property; doesn't modify the prototype
- **`Object.create(null)`**: Creates an object with NO prototype — no `toString`, `hasOwnProperty`, nothing. Used for pure dictionaries

**Follow-ups:**
- "How is this different from classical inheritance (Java)?" → JS doesn't copy parent properties to child. It links via prototype chain — properties are resolved at runtime via delegation. Classical copies at compile time
- "What's the performance impact of long prototype chains?" → Each property lookup walks the chain. Very long chains are slower. In practice, chains are 2-3 levels deep and engines optimize with inline caches
- "What's `Object.create()` vs `new`?" → `Object.create(proto)` creates object with `proto` as its prototype — no constructor call. `new Ctor()` creates object, sets prototype to `Ctor.prototype`, calls constructor

🔥 **Most Asked**: Prototype chain walkthrough, class vs prototype equivalence, Object.create
⚠️ **Common Mistakes**: Saying JS has "classical inheritance"; confusing `__proto__` with `prototype` property
🧠 **Strategy**: Draw the chain: `instance → Constructor.prototype → Object.prototype → null`

---

## 7. this Keyword — All 4 Contexts

### Q: Explain the `this` keyword in JavaScript. What are the rules for its value?

**Answer (Interview-Ready):**
`this` is determined by **how a function is called**, not where it's defined. Four rules (in priority order):

| Rule | Example | `this` value |
|------|---------|-------------|
| **1. `new` binding** | `new Foo()` | The newly created object |
| **2. Explicit binding** | `fn.call(obj)`, `fn.apply(obj)`, `fn.bind(obj)` | `obj` |
| **3. Implicit binding** | `obj.fn()` | `obj` (the object before the dot) |
| **4. Default binding** | `fn()` | `window` (non-strict) / `undefined` (strict mode) |

**Arrow functions are the exception:**
- Arrow functions have NO own `this` — they inherit `this` from their lexical enclosing scope
- `call/apply/bind` do NOT override an arrow function's `this`
- This is why arrow functions are preferred for callbacks and event handlers

```javascript
const obj = {
  name: 'Alice',
  greet: function() { console.log(this.name); },      // 'Alice' — implicit binding
  greetArrow: () => { console.log(this.name); },       // undefined — arrow inherits outer (global) this
  greetDelayed: function() {
    setTimeout(() => console.log(this.name), 100);      // 'Alice' — arrow captures this from greetDelayed
  }
};
```

**Classic interview trap:**
```javascript
const greet = obj.greet;
greet(); // undefined — default binding (lost implicit binding when extracted)
```

**Follow-ups:**
- "How does `bind` work internally?" → Returns a new function with `this` permanently set. Roughly: `function bind(fn, ctx) { return (...args) => fn.apply(ctx, args); }`
- "Can you change `this` of an arrow function?" → No. Arrow functions capture `this` at creation time. `call/apply/bind` are ignored for `this` (though `call/apply` still pass args)
- "What about `this` in a class?" → Methods defined with `function` follow implicit binding rules. Arrow function class fields capture the instance: `handleClick = () => { this.name }` — `this` is always the instance

🔥 **Most Asked**: Priority order of the 4 rules, arrow function behavior, lost binding trap
⚠️ **Common Mistakes**: Thinking `this` is determined by where the function is written; forgetting arrow functions have no own `this`
🧠 **Strategy**: State the 4 rules in order. Give the "extracted method" trap. Mention arrow functions. This covers 90% of interview questions

---

## 8. Hoisting — var vs let vs const

### Q: Explain hoisting. What's the difference between var, let, and const?

**Answer (Interview-Ready):**
**Hoisting** = during the creation phase, the engine allocates memory for declarations before executing code.

| Declaration | Hoisted? | Initialized to | TDZ? | Scope |
|-------------|----------|----------------|------|-------|
| `var` | Yes | `undefined` | No | Function |
| `let` | Yes (but TDZ) | Not initialized | Yes | Block |
| `const` | Yes (but TDZ) | Not initialized | Yes | Block |
| `function declaration` | Yes | Full function body | No | Block (strict) / Function |
| `function expression` | Only the variable | `undefined` (var) or TDZ (let/const) | Depends on var/let/const | Depends |

**Temporal Dead Zone (TDZ):**
```javascript
console.log(a); // undefined — var is hoisted and initialized
console.log(b); // ReferenceError — let is hoisted but in TDZ
var a = 1;
let b = 2;
```
TDZ = the zone from the start of the block to the `let/const` declaration. The variable exists but is not accessible.

**Function hoisting:**
```javascript
sayHi();        // Works! — function declarations are fully hoisted
function sayHi() { console.log('Hi'); }

sayBye();       // TypeError: sayBye is not a function
var sayBye = function() { console.log('Bye'); }; // only `var sayBye = undefined` is hoisted
```

**Follow-ups:**
- "Why does TDZ exist?" → To catch programming errors. Using a variable before declaration is almost always a bug. `var`'s silent `undefined` hid this
- "Is `const` truly constant?" → The binding is constant (can't reassign), but the value is mutable: `const arr = [1]; arr.push(2); // works`. For deep immutability, use `Object.freeze()` (shallow only)
- "What about `class` hoisting?" → Classes are hoisted but in the TDZ, like `let`. You cannot use a class before its declaration

🔥 **Most Asked**: var/let/const table comparison, TDZ explanation, function declaration vs expression hoisting
⚠️ **Common Mistakes**: Saying "let and const are not hoisted" — they ARE hoisted, just in the TDZ
🧠 **Strategy**: Draw the table. It's the fastest way to show you know all the nuances

---

## 9. Garbage Collection & Memory Leaks

### Q: How does garbage collection work in JavaScript? What causes memory leaks?

**Answer (Interview-Ready):**
- V8 (Chrome/Node) uses **generational garbage collection** with a **mark-and-sweep** algorithm
- **Mark phase**: Start from GC roots (global object, call stack, active closures). Traverse all reachable objects. Mark them as "alive"
- **Sweep phase**: Any object NOT marked is garbage — free its memory
- **Generational hypothesis**: Most objects die young. V8 uses:
  - **Young generation** (Scavenger): Small, fast, garbage-collected frequently. New objects go here
  - **Old generation** (Mark-Sweep-Compact): Objects that survive 2+ young GC cycles are promoted here. Collected less frequently

**Common memory leak patterns:**

| Pattern | Example | Fix |
|---------|---------|-----|
| **Forgotten event listeners** | `element.addEventListener(...)` without cleanup | `removeEventListener` or AbortController |
| **Detached DOM nodes** | Variable holds reference to removed DOM element | Nullify references after removal |
| **Closures holding large objects** | Closure captures a 10MB array unnecessarily | Restructure to avoid capturing |
| **Global variables** | `window.data = hugeArray` | Avoid globals; use scoped variables |
| **Timers** | `setInterval` never cleared | `clearInterval` in cleanup |
| **Forgotten Maps/Sets** | `Map.set(key, value)` where key is an object | Use `WeakMap` / `WeakSet` |

**WeakMap / WeakSet:**
- Hold **weak references** — if the key object has no other references, the GC can collect it
- Perfect for caching metadata about DOM elements or objects without preventing their GC

**Follow-ups:**
- "How do you detect memory leaks?" → Chrome DevTools → Memory tab → take Heap Snapshots → compare (3-snapshot technique). Look for growing retained size. Performance Monitor shows JS heap size over time
- "What's the difference between shallow size and retained size?" → Shallow = object's own memory. Retained = memory that would be freed if this object were GC'd (including things only it references)
- "How does React cause memory leaks?" → `useEffect` without cleanup: subscriptions, intervals, event listeners. Setting state on unmounted components (fixed in React 18's automatic batching)

🔥 **Most Asked**: Mark-and-sweep, common leak patterns, WeakMap use case, how to detect leaks
⚠️ **Common Mistakes**: Saying "JS doesn't have memory leaks because it has GC"; not knowing WeakMap
🧠 **Strategy**: List 3 concrete leak patterns with fixes. This is what interviewers want — practical knowledge

---

## 10. Promises Internals

### Q: How do Promises work internally? Walk through the microtask queue integration.

**Answer (Interview-Ready):**
- A Promise is a state machine with three states: **pending** → **fulfilled** (with value) or **rejected** (with reason)
- State transitions are **one-way and irreversible** — once settled, a Promise never changes state
- Internally, a Promise stores:
  - `state`: pending | fulfilled | rejected
  - `value`: the resolved value or rejection reason
  - `callbacks[]`: array of `{onFulfilled, onRejected}` handlers registered via `.then()`

**Resolution flow:**
1. `.then(onFulfilled, onRejected)` registers callbacks. Returns a NEW Promise (chaining)
2. When `resolve(value)` is called, state transitions to `fulfilled`
3. Each registered `onFulfilled` callback is **enqueued as a microtask** (not called synchronously!)
4. Event loop processes microtask → runs callback → resolves/rejects the chained Promise

```javascript
const p = new Promise(resolve => {
  console.log('1');     // sync — runs immediately inside executor
  resolve('done');
  console.log('2');     // sync — still runs! resolve doesn't return
});
p.then(val => console.log('3', val)); // microtask
console.log('4');
// Output: 1, 2, 4, 3 done
```

**Key insight**: The executor function (`resolve => {...}`) runs **synchronously**. Only `.then()` callbacks are async (microtasks).

**Follow-ups:**
- "What happens if you resolve a Promise with another Promise?" → It "unwraps" — the outer Promise adopts the state of the inner Promise. `resolve(Promise.resolve(42))` eventually fulfills with `42`, not with a Promise object
- "What happens to errors in `.then()`?" → If `onFulfilled` throws, the returned Promise is rejected with that error. This is how error propagation through chains works
- "Why are Promise callbacks microtasks and not macrotasks?" → Promises need higher priority than I/O callbacks to ensure consistent ordering. If they were macrotasks, a setTimeout could run between a resolve and its .then handler

🔥 **Most Asked**: Promise state machine, why .then is async (microtask), executor is synchronous
⚠️ **Common Mistakes**: Thinking the executor is async; not knowing Promises use microtask queue
🧠 **Strategy**: Show the "1, 2, 4, 3" example. It tests both executor behavior and microtask scheduling

---

## 11. async/await Internals

### Q: How does async/await work under the hood? What does it compile to?

**Answer (Interview-Ready):**
- `async/await` is syntactic sugar over Promises and generators
- An `async` function always returns a Promise
- `await` pauses the function execution, enqueues the rest as a microtask, and returns control to the caller

**What happens at `await`:**
```javascript
async function fetchData() {
  console.log('A');
  const data = await fetch('/api');  // pauses here
  console.log('B', data);           // becomes a .then() callback
}
fetchData();
console.log('C');
// Output: A, C, B {data}
```

**Desugared equivalent:**
```javascript
function fetchData() {
  console.log('A');
  return fetch('/api').then(data => {
    console.log('B', data);
  });
}
```

- At `await`, the function's execution context is saved (like a generator's `yield`)
- The remaining code after `await` is wrapped in `.then()` and scheduled as a microtask
- Control returns to the caller — this is why `C` prints before `B`

**Error handling:**
```javascript
async function getData() {
  try {
    const res = await fetch('/api');
    const data = await res.json();
  } catch (err) {
    // catches both network errors AND JSON parse errors
  }
}
```
`try/catch` in async functions catches rejected Promises — unlike `.then().catch()` chains, it reads like synchronous code.

**Follow-ups:**
- "What happens with multiple awaits in sequence?" → They run sequentially (one after another). Each await pauses. For parallel: `const [a, b] = await Promise.all([fetchA(), fetchB()])`
- "What about top-level await?" → Supported in ES modules. The module's evaluation waits for the await. Importers of that module also wait. Use cautiously — can delay module graph initialization
- "Does await always yield to the event loop?" → Yes, even `await Promise.resolve()` yields once (enqueues continuation as microtask). This is used as a "zero-cost yield" trick

🔥 **Most Asked**: What await compiles to, sequential vs parallel awaits, error handling with try/catch
⚠️ **Common Mistakes**: Using sequential awaits when parallel is possible; forgetting async functions always return a Promise
🧠 **Strategy**: Show the desugared .then() version side by side. Then the parallel pattern with Promise.all

---

## 12. Promise Combinators

### Q: Explain Promise.all, Promise.race, Promise.allSettled, and Promise.any. When to use each?

**Answer (Interview-Ready):**

| Combinator | Resolves when | Rejects when | Use case |
|------------|--------------|--------------|----------|
| `Promise.all([])` | ALL fulfill | ANY one rejects (fail-fast) | Parallel fetches where all are needed |
| `Promise.race([])` | FIRST settles (fulfill or reject) | FIRST settles | Timeout pattern, fastest response |
| `Promise.allSettled([])` | ALL settle (regardless of outcome) | Never rejects | Dashboard: show success + failures |
| `Promise.any([])` | FIRST fulfills | ALL reject (AggregateError) | Fastest successful response |

**Practical examples:**
```javascript
// Promise.all — fetch user + posts + comments in parallel
const [user, posts, comments] = await Promise.all([
  fetchUser(id), fetchPosts(id), fetchComments(id)
]);
// If any fails, entire Promise.all rejects

// Promise.race — timeout pattern
const data = await Promise.race([
  fetch('/api/data'),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
]);

// Promise.allSettled — partial failure tolerance
const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()]);
results.forEach(r => {
  if (r.status === 'fulfilled') showData(r.value);
  else logError(r.reason);
});

// Promise.any — fastest mirror/CDN
const fastest = await Promise.any([
  fetch('https://cdn1.example.com/data'),
  fetch('https://cdn2.example.com/data'),
]);
```

**Follow-ups:**
- "What's AggregateError?" → Thrown by `Promise.any` when ALL promises reject. Contains `.errors` array with each rejection reason
- "What does `Promise.all([])` return?" → Immediately resolves with `[]`. Empty array = nothing to wait for
- "How would you implement a concurrency limiter?" → Process N promises at a time: `Promise.all` on a batch of N, then next batch. Or use a pool pattern with a semaphore

🔥 **Most Asked**: Difference table, timeout pattern with race, when to use allSettled vs all
⚠️ **Common Mistakes**: Using Promise.all when partial failures are acceptable; confusing race (first settled) with any (first fulfilled)
🧠 **Strategy**: Draw the table. Give one real-world example per combinator

---

## 13. Generators and Iterators

### Q: What are generators? How do they relate to iterators and async iteration?

**Answer (Interview-Ready):**
- A **generator** is a function that can pause (`yield`) and resume execution. Defined with `function*`
- Calling a generator returns an **iterator** object with `.next()`, `.return()`, `.throw()`
- Each `.next()` call runs until the next `yield`, returns `{value, done}`

```javascript
function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;                   // pauses here, returns i
  }
}
const gen = range(1, 3);
gen.next(); // {value: 1, done: false}
gen.next(); // {value: 2, done: false}
gen.next(); // {value: 3, done: false}
gen.next(); // {value: undefined, done: true}

// Works with for...of
for (const n of range(1, 3)) console.log(n); // 1, 2, 3
```

**Iterators & the Iterator Protocol:**
- Any object with a `[Symbol.iterator]()` method returning `{next()}` is iterable
- Arrays, Maps, Sets, Strings are built-in iterables
- Generators automatically satisfy this protocol

**Async generators (for async iteration):**
```javascript
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page}`);
    const data = await res.json();
    if (data.length === 0) return;
    yield data;
    page++;
  }
}
for await (const page of fetchPages('/api/items')) {
  renderItems(page);
}
```

**Follow-ups:**
- "How were generators used before async/await?" → Libraries like `co` used generators to write async code: `yield` a Promise, the runner would `.next()` when it resolved. `async/await` replaced this pattern
- "What's a practical use case today?" → Lazy infinite sequences, paginated data fetching (async generators), state machines (Redux-Saga uses generators extensively)
- "What does `yield*` do?" → Delegates to another generator or iterable: `yield* [1, 2, 3]` yields each element

🔥 **Most Asked**: Basic generator syntax, lazy evaluation, async generators for pagination
⚠️ **Common Mistakes**: Confusing generator function (`function*`) with its return value (iterator); not knowing `for await...of`
🧠 **Strategy**: Show the pagination example with async generators — it's practical and impressive

---

## 14. AbortController & Request Cancellation

### Q: How do you cancel in-flight HTTP requests? Explain AbortController.

**Answer (Interview-Ready):**
- `AbortController` provides a signal to cancel async operations (fetch, event listeners, streams)
- Create a controller → pass `signal` to fetch → call `abort()` to cancel

```javascript
const controller = new AbortController();

fetch('/api/data', { signal: controller.signal })
  .then(res => res.json())
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('Request was cancelled');
    }
  });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

**Real-world pattern — search autocomplete:**
```javascript
let currentController = null;

async function search(query) {
  // Cancel previous request
  if (currentController) currentController.abort();
  currentController = new AbortController();

  try {
    const res = await fetch(`/api/search?q=${query}`, {
      signal: currentController.signal
    });
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') return null; // expected, not an error
    throw err;
  }
}
```

**React integration:**
```javascript
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(err => { if (err.name !== 'AbortError') setError(err); });

  return () => controller.abort(); // cleanup on unmount or dependency change
}, [id]);
```

**Follow-ups:**
- "Can AbortController cancel anything besides fetch?" → Yes. `addEventListener` accepts a signal: `el.addEventListener('click', fn, { signal })`. Also used with streams, and custom async operations can check `signal.aborted`
- "What about cancelling multiple requests?" → One signal can be passed to multiple fetches. Calling `abort()` cancels all of them
- "What's `AbortSignal.timeout(5000)`?" → Static method (newer API) that creates a signal that auto-aborts after 5s. No need for `setTimeout` wrapper

🔥 **Most Asked**: Autocomplete cancellation pattern, React useEffect cleanup, abort + fetch
⚠️ **Common Mistakes**: Not handling AbortError (treating it as a real error); not aborting on component unmount
🧠 **Strategy**: Show the React useEffect pattern — it demonstrates real-world usage and cleanup discipline

---

## 15. Implement debounce

### Q: Implement a debounce function with leading and trailing options.

**Answer (Interview-Ready):**

**Basic debounce (trailing):**
```javascript
function debounce(fn, delay) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}
// Usage: const debouncedSearch = debounce(search, 300);
```

**With leading + trailing + cancel:**
```javascript
function debounce(fn, delay, { leading = false, trailing = true } = {}) {
  let timerId;
  let lastArgs;

  function debounced(...args) {
    lastArgs = args;
    const callNow = leading && !timerId;

    clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      if (trailing && lastArgs) fn.apply(this, lastArgs);
      lastArgs = null;
    }, delay);

    if (callNow) fn.apply(this, args);
  }

  debounced.cancel = () => {
    clearTimeout(timerId);
    timerId = null;
    lastArgs = null;
  };

  return debounced;
}
```

**How it works:**
- **Trailing** (default): Wait for `delay` ms of inactivity, then call. Every new invocation resets the timer
- **Leading**: Call immediately on first invocation. Ignore subsequent calls within `delay`. After silence, next call triggers again
- **Both**: Call on first invocation AND after `delay` of silence

**Use cases:**
- Search input: trailing (wait until user stops typing)
- Button click: leading (fire immediately, ignore rapid clicks)
- Window resize: trailing (recalculate layout after resizing stops)

**Follow-ups:**
- "Difference between debounce and throttle?" → Debounce fires AFTER a pause. Throttle fires AT MOST once per interval. Debounce: search input. Throttle: scroll handler
- "Why `fn.apply(this, args)` instead of `fn(...args)`?" → Preserves the calling context. If debounced function is a method on an object, `this` should still point to that object
- "How would you test this?" → Use fake timers (`jest.useFakeTimers()`). Call debounced function, advance time, assert calls

🔥 **Most Asked**: Basic trailing implementation, leading vs trailing difference, cancel method
⚠️ **Common Mistakes**: Not preserving `this` context; forgetting to clearTimeout on each call
🧠 **Strategy**: Write the basic 5-line version first. Then add leading/cancel as follow-up

---

## 16. Implement throttle

### Q: Implement a throttle function.

**Answer (Interview-Ready):**

**Basic throttle (leading + trailing):**
```javascript
function throttle(fn, interval) {
  let lastTime = 0;
  let timerId;

  return function (...args) {
    const now = Date.now();

    if (now - lastTime >= interval) {
      // Enough time passed — call immediately (leading)
      lastTime = now;
      fn.apply(this, args);
    } else {
      // Within interval — schedule trailing call
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        lastTime = Date.now();
        fn.apply(this, args);
      }, interval - (now - lastTime));
    }
  };
}
```

**Simpler version (leading only, no trailing):**
```javascript
function throttle(fn, interval) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

**Using requestAnimationFrame (for scroll/resize):**
```javascript
function rafThrottle(fn) {
  let ticking = false;
  return function (...args) {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        ticking = false;
      });
    }
  };
}
```

**Use cases:**
- Scroll event handlers (recalculate position at most every 100ms)
- API rate limiting (send analytics at most every 1s)
- Game loop input handling (process at fixed intervals)

**Follow-ups:**
- "When to use rAF-based throttle?" → When the work is visual (scroll animations, parallax). rAF syncs with the display refresh rate (16ms for 60fps), so you never do work that won't be painted
- "How does lodash throttle differ?" → Lodash supports `{leading: true/false, trailing: true/false}` options, plus a `cancel()` method. Their implementation handles edge cases like maxWait

🔥 **Most Asked**: Basic implementation, difference from debounce, rAF-based throttle
⚠️ **Common Mistakes**: Not handling trailing call; using Date comparison without clearing timer
🧠 **Strategy**: Write the simple leading-only version (5 lines). Mention trailing + rAF as enhancements

---

## 17. Implement curry, memoize, once, pipe

### Q: Implement these core utility functions from scratch.

**Answer (Interview-Ready):**

**curry** — transforms `f(a, b, c)` into `f(a)(b)(c)`:
```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
}
// Usage:
const add = curry((a, b, c) => a + b + c);
add(1)(2)(3);    // 6
add(1, 2)(3);    // 6
add(1)(2, 3);    // 6
```

**memoize** — caches results by arguments:
```javascript
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
// Usage: const memoFib = memoize(fib);
```
*Limitation*: `JSON.stringify` doesn't handle functions, circular refs, or Map/Set as args. For prod, use a proper key serializer.

**once** — only executes function once:
```javascript
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
// Usage: const initialize = once(setup); initialize(); initialize(); // setup runs once
```

**pipe** — composes functions left-to-right:
```javascript
function pipe(...fns) {
  return (input) => fns.reduce((acc, fn) => fn(acc), input);
}
// Usage:
const process = pipe(
  str => str.trim(),
  str => str.toLowerCase(),
  str => str.split(' ')
);
process('  Hello World  '); // ['hello', 'world']
```

**compose** (right-to-left, opposite of pipe):
```javascript
const compose = (...fns) => (input) => fns.reduceRight((acc, fn) => fn(acc), input);
```

**Follow-ups:**
- "How would you memoize with a max cache size?" → Use a Map + LRU eviction. When cache exceeds limit, delete the oldest (first) entry: `cache.delete(cache.keys().next().value)`
- "How does curry handle variadic functions?" → `fn.length` returns the number of declared parameters. If `fn` uses `...rest`, length is 0. Curry won't work well — need a different approach (explicit arity parameter)
- "What about async memoize?" → Cache the Promise itself, not the resolved value. This prevents duplicate in-flight requests for the same args

🔥 **Most Asked**: curry and memoize are by far the most common. once and pipe are secondary
⚠️ **Common Mistakes**: Memoize key using args.toString() (fails for objects); curry not handling partial application
🧠 **Strategy**: Write memoize first (most asked), then curry. Show the clean 5-line versions

---

## 18. Implement Deep Clone & Deep Equal

### Q: Implement deepClone and deepEqual functions.

**Answer (Interview-Ready):**

**deepClone:**
```javascript
function deepClone(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (seen.has(obj)) return seen.get(obj);  // handle circular refs

  const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  seen.set(obj, clone);

  for (const key of Reflect.ownKeys(obj)) {
    clone[key] = deepClone(obj[key], seen);
  }
  return clone;
}
```

**Quick alternative (with limitations):**
```javascript
// structuredClone — built-in (modern browsers + Node 17+)
const clone = structuredClone(original);
// Handles: Date, RegExp, Map, Set, ArrayBuffer, circular refs
// Does NOT handle: Functions, DOM nodes, Symbols

// JSON trick (simplest but most limited)
const clone = JSON.parse(JSON.stringify(original));
// Loses: undefined, functions, Date (→ string), Map, Set, circular refs (throws)
```

**deepEqual:**
```javascript
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => deepEqual(a[key], b[key]));
}
```

**Edge cases to handle:**
- Circular references → WeakMap tracking for clone; WeakSet for equal
- `Date`, `RegExp`, `Map`, `Set` instances → type-specific comparison/cloning
- `Symbol` keys → use `Reflect.ownKeys()` instead of `Object.keys()`
- `-0 === 0` is `true` but they're different → use `Object.is()` if strict equality needed
- `NaN !== NaN` is `true` → `Object.is(NaN, NaN)` is `true`

**Follow-ups:**
- "Why use `structuredClone` over manual?" → Native, handles all types, handles circular refs. Only use manual if you need browser support before 2022 or need to clone functions
- "How does React's shallow comparison differ?" → React's `shallowEqual` compares top-level properties with `Object.is()`. It doesn't recurse. This is why you need immutable updates — changing a nested property doesn't change the reference
- "Performance of deepClone on large objects?" → O(n) where n = total properties across all levels. For very large objects, consider structural sharing (immutable.js) instead of full cloning

🔥 **Most Asked**: deepClone with circular ref handling, structuredClone awareness, deepEqual
⚠️ **Common Mistakes**: Using JSON.parse/stringify as the "answer" (misses too many types); not handling circular references
🧠 **Strategy**: Show the recursive solution with WeakMap first. Then mention structuredClone as the modern alternative

---

## 19. Implement Promise.all / Promise.race

### Q: Implement Promise.all and Promise.race from scratch.

**Answer (Interview-Ready):**

**Promise.all:**
```javascript
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;
    const items = Array.from(promises);

    if (items.length === 0) return resolve([]);

    items.forEach((promise, index) => {
      Promise.resolve(promise).then(value => {
        results[index] = value;   // preserve order
        completed++;
        if (completed === items.length) resolve(results);
      }, reject);                 // first rejection rejects the whole thing
    });
  });
}
```

**Key details:**
- `Promise.resolve(promise)` wraps non-Promise values (handles `Promise.all([1, 2, 3])`)
- `results[index] = value` preserves input order (not completion order)
- First rejection immediately rejects — other promises keep running but results are ignored

**Promise.race:**
```javascript
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    const items = Array.from(promises);
    if (items.length === 0) return; // never settles (per spec)

    items.forEach(promise => {
      Promise.resolve(promise).then(resolve, reject);
    });
  });
}
```
First promise to settle (fulfill OR reject) wins. Others are ignored.

**Bonus — Promise.allSettled:**
```javascript
function promiseAllSettled(promises) {
  return Promise.all(
    Array.from(promises).map(p =>
      Promise.resolve(p).then(
        value => ({ status: 'fulfilled', value }),
        reason => ({ status: 'rejected', reason })
      )
    )
  );
}
```

**Follow-ups:**
- "What if the array contains non-Promise values?" → `Promise.resolve(value)` wraps them. `Promise.all([1, 2, 3])` resolves with `[1, 2, 3]`
- "What about Promise.race with an empty array?" → It returns a forever-pending Promise (never settles). This is per spec
- "How would you add concurrency control?" → Process in batches: take first N, when one completes, start the next from queue. Like a semaphore pattern

🔥 **Most Asked**: Promise.all is the #1 most asked implementation question
⚠️ **Common Mistakes**: Not handling non-Promise values; using completion order instead of input order; not handling empty array
🧠 **Strategy**: Write Promise.all first (5 min). It covers: Promise creation, resolve/reject, forEach, index tracking

---

## 20. Implement EventEmitter / Pub-Sub

### Q: Implement an EventEmitter class with on, off, emit, and once.

**Answer (Interview-Ready):**

```javascript
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(listener);
    return this; // for chaining
  }

  off(event, listener) {
    const listeners = this.events.get(event);
    if (!listeners) return this;
    this.events.set(event, listeners.filter(l => l !== listener && l._original !== listener));
    return this;
  }

  emit(event, ...args) {
    const listeners = this.events.get(event);
    if (!listeners) return false;
    listeners.forEach(listener => listener(...args));
    return true;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    wrapper._original = listener; // so off() can match either
    this.on(event, wrapper);
    return this;
  }
}
```

**Usage:**
```javascript
const emitter = new EventEmitter();
const handler = (name) => console.log(`Hello ${name}`);
emitter.on('greet', handler);
emitter.emit('greet', 'Alice');  // "Hello Alice"
emitter.off('greet', handler);
emitter.emit('greet', 'Bob');    // nothing — handler removed

emitter.once('init', () => console.log('Initialized'));
emitter.emit('init'); // "Initialized"
emitter.emit('init'); // nothing — removed after first call
```

**Follow-ups:**
- "How would you add wildcard events?" → Add a special `*` event. In `emit`, also call listeners registered on `*`: `this.events.get('*')?.forEach(l => l(event, ...args))`
- "How to prevent memory leaks?" → Add `maxListeners` limit (Node.js default is 10). Warn when exceeded. Provide `removeAllListeners(event?)` method
- "How does Node.js EventEmitter differ?" → Synchronous emission, `error` event throws if no handler, `prependListener`, `listenerCount`, `eventNames()`

🔥 **Most Asked**: Core on/off/emit/once implementation
⚠️ **Common Mistakes**: Not handling `once` properly with `off`; emitting synchronously is correct (not async)
🧠 **Strategy**: Write the class in under 5 minutes. The `once` implementation with wrapper is the tricky part — show it cleanly

---

## 21. Implement LRU Cache

### Q: Implement an LRU (Least Recently Used) cache with O(1) get and put.

**Answer (Interview-Ready):**

**Using Map (preserves insertion order):**
```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const value = this.cache.get(key);
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key); // remove old position
    } else if (this.cache.size >= this.capacity) {
      // Evict least recently used (first item in Map)
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value);
  }
}
```

**Why this works:** JS `Map` maintains insertion order. `delete` + `set` moves an entry to the end. The first entry (`keys().next().value`) is always the oldest/LRU.

**Classic approach (Doubly Linked List + HashMap):**
```javascript
class Node {
  constructor(key, value) {
    this.key = key; this.value = value;
    this.prev = null; this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new Node(0, 0);  // dummy head
    this.tail = new Node(0, 0);  // dummy tail
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToEnd(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);
    this._addToEnd(node);
    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this._remove(this.map.get(key));
    } else if (this.map.size >= this.capacity) {
      const lru = this.head.next;
      this._remove(lru);
      this.map.delete(lru.key);
    }
    const node = new Node(key, value);
    this._addToEnd(node);
    this.map.set(key, node);
  }
}
```

**Follow-ups:**
- "Why not just use an array?" → Array operations (shift, splice) are O(n). DLL gives O(1) remove + insert. Map gives O(1) lookup. Total: O(1) for both get and put
- "When to use Map version vs DLL version?" → Map version is fine for interviews (simpler, still O(1) amortized). DLL version is the "textbook" answer and works in languages without ordered maps
- "How would you add TTL (time-to-live)?" → Store `{value, expiry}` in nodes. On `get`, check if `Date.now() > expiry` → treat as miss, delete

🔥 **Most Asked**: Map-based implementation, O(1) complexity justification
⚠️ **Common Mistakes**: Using arrays (O(n) eviction); for DLL version: forgetting dummy head/tail nodes
🧠 **Strategy**: Use the Map version for a quick answer. If interviewer asks for "without using Map", switch to DLL + HashMap

---
---

# Part B — Browser & Web Platform Internals

## 22. How the Browser Works

### Q: Walk through what happens from the moment you type a URL to when the page is fully interactive.

**Answer (Interview-Ready):**

1. **URL parsing** → Browser identifies protocol, domain, path
2. **DNS resolution** → Domain → IP address (check cache: browser → OS → router → ISP → recursive resolver)
3. **TCP connection** → Three-way handshake (SYN → SYN-ACK → ACK). For HTTPS: TLS handshake (adds 1-2 RTTs)
4. **HTTP request** → Browser sends GET request with headers (Accept, Cookie, User-Agent)
5. **Server response** → HTML document streams back (chunked transfer encoding)
6. **HTML parsing** → Tokenizer → DOM tree construction (incremental)
7. **Subresource discovery** → Parser encounters `<link>`, `<script>`, `<img>` → fire parallel requests
8. **CSSOM construction** → Parse CSS → CSSOM tree (render-blocking)
9. **JavaScript execution** → Parse & execute (parser-blocking unless `async`/`defer`)
10. **Render tree** → DOM + CSSOM = Render tree (only visible elements)
11. **Layout** → Calculate exact position and size of each element
12. **Paint** → Convert layout to actual pixels (draw text, colors, images, borders)
13. **Compositing** → Layers composited by GPU into final image on screen
14. **Interactive** → Page fires `DOMContentLoaded` (DOM ready) → `load` (all resources) → becomes interactive

**Key performance milestones:**
- **FP (First Paint)**: Something appears on screen
- **FCP (First Contentful Paint)**: Real content visible
- **LCP (Largest Contentful Paint)**: Main content visible
- **TTI (Time to Interactive)**: Page responds to user input

**Follow-ups:**
- "What blocks rendering?" → CSS is render-blocking (can't paint without styles). Synchronous JS is parser-blocking (stops DOM construction). Both delay FCP
- "What's the difference between DOMContentLoaded and load?" → DCL fires when HTML is parsed and DOM is built (no waiting for images/fonts). `load` fires when ALL resources (images, styles, iframes) are complete
- "How does HTTP/2 change this?" → Multiplexing: multiple resources over one TCP connection in parallel. Header compression. Server push (send resources before browser requests them)

🔥 **Most Asked**: The end-to-end flow (must be able to recite), render-blocking vs parser-blocking
⚠️ **Common Mistakes**: Skipping DNS/TCP in the explanation; not distinguishing render-blocking CSS from parser-blocking JS
🧠 **Strategy**: This is THE most asked browser question. Practice saying the flow in 60 seconds. Hit all 13 steps

---

## 23. Browser Process Architecture

### Q: Describe Chrome's multi-process architecture. Why multiple processes?

**Answer (Interview-Ready):**

Chrome uses a **multi-process architecture** for security and stability:

| Process | Responsibility |
|---------|---------------|
| **Browser process** | UI (address bar, tabs, bookmarks), network requests, file access, process management |
| **Renderer process** | One per tab/site. HTML parsing, DOM, CSS, JS execution, compositing. Runs in a **sandbox** |
| **GPU process** | Handles GPU-accelerated rendering for all tabs. Composites layers into final frame |
| **Network process** | Handles all network requests. Shared across tabs |
| **Plugin process** | Runs browser plugins (Flash, legacy — now mostly deprecated) |
| **Utility processes** | Audio, video decoding, etc. |

**Why multi-process?**
- **Isolation**: One tab crashing doesn't kill others. Each renderer is sandboxed — can't access file system or other tabs
- **Security**: Site Isolation (post-Spectre) puts each cross-origin iframe in its own renderer process. Prevents Spectre-style side-channel attacks
- **Performance**: Each renderer can use its own CPU core. GC in one tab doesn't freeze another

**Inside the Renderer Process:**
- **Main thread**: Runs JS, DOM operations, style calculation, layout
- **Compositor thread**: Composites layers, handles smooth scrolling (even if main thread is busy)
- **Raster threads**: Convert paint records to bitmaps (GPU-accelerated)
- **Worker threads**: Web Workers, Service Workers

**Follow-ups:**
- "What's Site Isolation?" → Each cross-origin domain gets its own renderer process. An iframe from evil.com can't read memory from the parent page's process. This prevents Spectre/Meltdown attacks
- "Does each tab always get its own process?" → Not always. Chrome may consolidate tabs from the same site into one process under memory pressure. There's a per-process limit (~100 on desktop)
- "How does the compositor thread help performance?" → Smooth scrolling and CSS animations (transform, opacity) can run on the compositor without involving the main thread. This is why transform animations are faster than left/top

🔥 **Most Asked**: Multi-process breakdown, why a tab crash doesn't kill the browser, Site Isolation
⚠️ **Common Mistakes**: Saying "each tab is a process" (it's per-site, not strictly per-tab); not knowing compositor thread
🧠 **Strategy**: Draw the process diagram. Mention Spectre/Site Isolation — shows security awareness

---

## 24. Critical Rendering Path

### Q: What is the Critical Rendering Path? How do you optimize it?

**Answer (Interview-Ready):**

The **CRP** is the sequence of steps the browser takes to convert HTML, CSS, and JS into pixels:

```
HTML → DOM → CSSOM → Render Tree → Layout → Paint → Composite
```

**Bottlenecks:**
- **CSS is render-blocking**: Browser won't paint until CSSOM is complete. A large CSS file delays First Paint
- **JS is parser-blocking**: A `<script>` tag stops HTML parsing until the script downloads and executes
- **Fonts** can block text rendering (FOUT/FOIT)

**Optimization strategies:**

| Strategy | What it does |
|----------|-------------|
| **Inline critical CSS** | Put above-fold CSS in `<style>` block in `<head>`. Load rest asynchronously |
| **async / defer scripts** | `async`: download parallel, execute when ready (order not guaranteed). `defer`: download parallel, execute after DOM parse (order preserved) |
| **Preload key resources** | `<link rel="preload" href="font.woff2" as="font">` — start download early |
| **Minimize critical resources** | Fewer CSS/JS files blocks → faster CRP |
| **Reduce critical bytes** | Minify, compress (gzip/brotli), tree-shake |
| **Font display** | `font-display: swap` — show system font immediately, swap when custom font loads |

**async vs defer:**
```html
<script src="analytics.js" async></script>   <!-- Non-critical. Fire whenever ready -->
<script src="app.js" defer></script>          <!-- Critical but don't block parser. Runs after DOM ready, in order -->
```

**Follow-ups:**
- "How do you measure CRP?" → Lighthouse, WebPageTest, Chrome DevTools Performance tab. Look at: number of critical resources, critical bytes, and critical path length (round trips)
- "What's the difference between preload, prefetch, and preconnect?" → `preload`: critical resource for THIS page (high priority). `prefetch`: resource for NEXT page (low priority). `preconnect`: establish connection to a domain early (DNS + TCP + TLS)
- "Can CSS ever NOT be render-blocking?" → Yes. Media queries: `<link rel="stylesheet" href="print.css" media="print">` — browser still downloads it but doesn't block rendering for screen

🔥 **Most Asked**: CRP steps, async vs defer, CSS render-blocking, optimization strategies
⚠️ **Common Mistakes**: Using async when order matters; not inlining critical CSS; not preloading fonts
🧠 **Strategy**: Recite the pipeline. Then give 3 concrete optimizations with `<link>` and `<script>` tag examples

---

## 25. HTML Parsing, CSSOM, Render Tree

### Q: How does the browser build the DOM, CSSOM, and Render Tree?

**Answer (Interview-Ready):**

**DOM Construction:**
1. **Bytes** → **Characters** (decode UTF-8)
2. **Characters** → **Tokens** (tokenizer: `<div>`, `class="foo"`, `</div>`)
3. **Tokens** → **Nodes** (each token becomes a DOM node)
4. **Nodes** → **DOM Tree** (parent-child relationships from nesting)

HTML parsing is **incremental** — browser renders as chunks arrive (doesn't wait for full HTML).

**CSSOM Construction:**
1. Parse all CSS (inline, `<style>`, external `<link>`)
2. Build a tree structure mirroring CSS specificity and cascade rules
3. CSSOM is NOT incremental — must be fully built before rendering (render-blocking)
4. Why? → CSS rules can override each other. Can't know final styles until all CSS is parsed

**Render Tree:**
- Combine DOM + CSSOM → Render Tree
- Only **visible elements** are in the render tree
- `display: none` → NOT in render tree (removed entirely)
- `visibility: hidden` → IN render tree (takes space, just invisible)
- `opacity: 0` → IN render tree (takes space, painted transparent)

**Follow-ups:**
- "Why is CSS render-blocking but HTML isn't?" → HTML can be rendered incrementally (show what you have so far). But without styles, you'd get FOUC (Flash of Unstyled Content). So browser waits for CSS to avoid repainting everything
- "What happens when JS modifies the DOM during parsing?" → `document.write()` can insert HTML into the stream. The parser must stop, execute JS, then continue. This is why `document.write` is terrible for performance
- "What about Shadow DOM?" → Shadow DOM creates its own mini DOM tree and scoped styles, isolated from the main document. Render tree includes shadow DOM elements but they're styled independently

🔥 **Most Asked**: DOM construction pipeline, why CSSOM is render-blocking, display:none vs visibility:hidden
⚠️ **Common Mistakes**: Saying DOM construction waits for all HTML; confusing render-blocking (CSS) with parser-blocking (JS)
🧠 **Strategy**: Draw the three trees side by side: DOM + CSSOM → Render Tree. Mention what's excluded from render tree

---

## 26. Reflows vs Repaints

### Q: What's the difference between reflow and repaint? Which is more expensive?

**Answer (Interview-Ready):**

| | Reflow (Layout) | Repaint |
|---|---|---|
| **Triggered by** | Geometry changes: width, height, margin, padding, position, font-size, adding/removing elements | Visual changes: color, background, box-shadow, visibility, outline |
| **What happens** | Recalculates position + size of affected elements AND their children/siblings | Redraws pixels for affected elements (no position recalculation) |
| **Cost** | **Expensive** — can cascade through entire layout tree | **Moderate** — limited to the affected layer |
| **Example** | `el.style.width = '200px'` | `el.style.color = 'red'` |

**Reflow triggers (force synchronous layout):**
```javascript
// BAD — forces layout calculation between each write
elements.forEach(el => {
  const height = el.offsetHeight;    // READ — forces layout
  el.style.height = height + 10 + 'px'; // WRITE — invalidates layout
});

// GOOD — batch reads then batch writes
const heights = elements.map(el => el.offsetHeight); // all reads first
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px'; // all writes after
});
```

**Properties that trigger reflow when read:**
`offsetWidth`, `offsetHeight`, `offsetTop`, `clientWidth`, `scrollTop`, `getComputedStyle()`, `getBoundingClientRect()`

**How to minimize reflows:**
- Batch DOM reads and writes (never interleave)
- Use `transform` instead of `top/left` for animations (GPU, no reflow)
- Use `will-change: transform` to promote to compositor layer
- Add/remove classes instead of changing individual styles
- Use `documentFragment` for batch DOM insertions
- Use CSS `contain: layout` to isolate reflow scope

**Follow-ups:**
- "What's the most expensive reflow trigger?" → Inserting an element at the top of a long list — every element below must recalculate its position
- "How does CSS `contain` help?" → `contain: layout` tells the browser that changes inside this element won't affect outside layout. Browser can skip recalculating siblings
- "What about reflow in flexbox vs grid?" → Both can cascade, but CSS Grid with fixed tracks avoids many reflows because track sizes don't depend on content

🔥 **Most Asked**: Reflow vs repaint distinction, forced synchronous layout, optimization techniques
⚠️ **Common Mistakes**: Interleaving DOM reads and writes; using top/left for animations; not knowing which properties trigger reflow
🧠 **Strategy**: Give the read-write batching example. It's the most practical and demonstrates senior-level awareness

---

## 27. GPU vs CPU Rendering

### Q: What's the difference between GPU and CPU rendering in the browser? When does the GPU get involved?

**Answer (Interview-Ready):**

- **CPU rendering (software)**: Main thread handles layout + paint. Rasterizes to bitmaps using the CPU. Suitable for text, basic shapes, most static content
- **GPU rendering (hardware-accelerated)**: Certain elements are promoted to their own **compositor layer** and rendered by the GPU. GPU excels at: transforms, opacity, texture mapping, compositing layers

**What triggers GPU compositing?**
- `transform: translate/rotate/scale` (3D or 2D)
- `opacity` animations
- `will-change: transform/opacity`
- `position: fixed` or `position: sticky`
- `<video>`, `<canvas>`, WebGL content
- CSS filters (`blur`, `brightness`)
- Elements overlapping a composited layer

**Why GPU is faster for animations:**
```css
/* BAD — CPU reflow every frame */
.box { transition: left 0.3s; }  /* triggers layout → paint → composite */

/* GOOD — GPU composite only */
.box { transition: transform 0.3s; }  /* only composite step, skips layout+paint */
```
`transform` and `opacity` changes skip layout and paint entirely — the compositor thread handles them without touching the main thread.

**Trade-offs:**
- GPU layers consume **VRAM** — each layer is a bitmap in GPU memory. Too many layers = memory bloat, especially on mobile
- Layer promotion is "free" during animation but has setup cost (paint to texture, upload to GPU)
- `will-change` should be added before animation starts and removed after, not left permanently

**Follow-ups:**
- "How many layers is too many?" → No fixed number. On mobile, >50 promoted layers can cause memory issues. Use DevTools Layers panel to inspect
- "What's the difference between `will-change` and `translateZ(0)` hack?" → Both promote to GPU layer. `will-change` is the proper API and lets the browser optimize ahead of time. `translateZ(0)` is a hack that may have side effects (changing stacking context). Use `will-change`
- "Can you force an element to its own layer?" → `will-change: transform` or `transform: translateZ(0)`. But don't force layers unnecessarily — let the browser decide for static elements

🔥 **Most Asked**: CSS properties that bypass layout, GPU layer promotion, will-change usage
⚠️ **Common Mistakes**: Over-promoting with will-change on everything; using top/left for animations; not understanding VRAM cost
🧠 **Strategy**: Show the "left vs transform" comparison. Then explain the compositing pipeline: Layout → Paint → Composite (and how GPU skips the first two)

---

## 28. Compositing Layers & will-change

### Q: What are compositing layers? How do you manage them for performance?

**Answer (Interview-Ready):**

After layout and paint, the browser creates **layers** and composites them:

1. **Paint** → Browser records paint instructions per layer
2. **Rasterize** → Convert paint instructions to bitmaps (tiles on GPU)
3. **Composite** → GPU stacks layers in correct order, applying transforms and opacity

**Default**: Most elements are on the same layer. Only certain triggers create separate layers.

**Layer-creating properties:**
- `transform: translateZ(0)` / any 3D transform
- `will-change: transform | opacity | scroll-position`
- `position: fixed / sticky`
- `<video>`, `<canvas>`, `<iframe>`
- CSS `filter`, `backdrop-filter`
- Elements overlapping another composited layer ("implicit layer promotion")

**`will-change` best practices:**
```css
/* GOOD — apply before animation, remove after */
.card:hover { will-change: transform; }
.card.animating { will-change: transform; }

/* BAD — always on = wasted VRAM */
* { will-change: transform; } /* Do NOT do this */
```

- `will-change` is a hint: "I'm about to animate this." Browser pre-promotes to GPU layer
- Apply it on the parent for elements that will animate, or dynamically add/remove it via JS

**How to debug layers:**
- Chrome DevTools → Rendering → Show layer borders (orange = composited layer)
- DevTools → Layers panel → see all layers, their sizes, VRAM usage, and why each was promoted

**Follow-ups:**
- "What's implicit layer promotion?" → If element A is composited (positioned above in z-order) and element B overlaps A, the browser must composite B too — otherwise B would be hidden behind A incorrectly. This is "layer explosion"
- "How to prevent layer explosion?" → Use `z-index` to control stacking order. Ensure composited elements are on top. Reduce overlap with composited layers
- "When should you NOT use a separate layer?" → For static elements. Layers cost VRAM (bitmap of the element at its full dimensions). A 500×500 element at 2x DPI = 4MB VRAM per layer

🔥 **Most Asked**: What creates layers, will-change usage, layer debugging
⚠️ **Common Mistakes**: `will-change` on everything; not knowing about implicit promotion (layer explosion)
🧠 **Strategy**: Mention the DevTools Layers panel — shows you actually use these tools

---

## 29. Browser Resource Prioritization

### Q: How does the browser prioritize fetching resources? How can you influence it?

**Answer (Interview-Ready):**

**Default priority order** (Chrome):

| Resource | Priority |
|----------|----------|
| HTML document | Highest |
| CSS in `<head>` | Highest |
| Preloaded fonts | Highest |
| `<script>` (blocking, in `<head>`) | High |
| `<img>` in viewport (LCP candidate) | High |
| `<script async>` | Low |
| `<img>` below fold | Low |
| `<script defer>` | Low |
| Prefetched resources | Lowest |

**Developer controls:**

| Hint | Purpose | Example |
|------|---------|---------|
| `<link rel="preload">` | Fetch this NOW, I need it on this page | `<link rel="preload" href="hero.webp" as="image">` |
| `<link rel="prefetch">` | Fetch this for the NEXT page (idle time) | `<link rel="prefetch" href="/next-page.js">` |
| `<link rel="preconnect">` | Open connection early (DNS + TCP + TLS) | `<link rel="preconnect" href="https://api.example.com">` |
| `<link rel="dns-prefetch">` | DNS lookup only (lighter than preconnect) | `<link rel="dns-prefetch" href="https://cdn.example.com">` |
| `fetchpriority="high/low"` | Override default priority | `<img src="hero.webp" fetchpriority="high">` |

**`fetchpriority` attribute (new, powerful):**
```html
<img src="hero.webp" fetchpriority="high" />  <!-- LCP image — boost priority -->
<img src="carousel-3.webp" fetchpriority="low" />  <!-- below fold — lower priority -->
<script src="analytics.js" fetchpriority="low"></script>  <!-- non-critical JS -->
```

**Follow-ups:**
- "How does HTTP/2 affect prioritization?" → HTTP/2 multiplexes requests but still respects priorities. Browser sends priority hints to server. Server can use these to order response delivery
- "What about preloading too much?" → Preloading everything defeats the purpose. Browser bandwidth is limited. Preload only LCP image, critical font, and above-fold hero resources (3-5 max)
- "How does Chrome decide LCP image priority?" → Chrome auto-boosts the largest visible image. But it can't know which is largest before layout. Using `fetchpriority="high"` helps Chrome start the fetch before layout

🔥 **Most Asked**: preload vs prefetch vs preconnect, fetchpriority, resource priority table
⚠️ **Common Mistakes**: Preloading everything; using prefetch when preload is needed; not preconnecting to API domains
🧠 **Strategy**: Show the hints table. Give one concrete example for each. Mention `fetchpriority` — it's newer and shows you stay current

---

## 30. Avoiding Layout Thrashing

### Q: What is layout thrashing? How do you prevent it?

**Answer (Interview-Ready):**

**Layout thrashing** = forcing the browser to perform synchronous layout calculations repeatedly by interleaving DOM reads and writes.

```javascript
// BAD — Layout thrashing (N forced layouts)
const items = document.querySelectorAll('.item');
items.forEach(item => {
  const width = item.offsetWidth;           // READ → forces layout
  item.style.width = (width * 1.1) + 'px';  // WRITE → invalidates layout
  // Next iteration's READ forces layout AGAIN
});

// GOOD — Batch reads, then batch writes (1 forced layout)
const widths = [...items].map(item => item.offsetWidth); // ALL reads
items.forEach((item, i) => {
  item.style.width = (widths[i] * 1.1) + 'px';           // ALL writes
});
```

**Why it happens:** When you read a layout property (offsetWidth, getBoundingClientRect), the browser must ensure layout is up-to-date. If there are pending style changes, it performs a **forced synchronous layout** to give you an accurate answer.

**Properties that trigger forced layout:**
`offsetWidth/Height`, `offsetTop/Left`, `clientWidth/Height`, `scrollTop/Left`, `getComputedStyle()`, `getBoundingClientRect()`, `innerText` (needs layout to compute text)

**Prevention strategies:**
1. **Read-write batching**: All reads first, then all writes
2. **FastDOM library**: Queues reads and writes into separate batches using rAF
3. **CSS `contain: layout`**: Isolates layout scope — changes inside don't affect outside elements
4. **Virtual DOM (React)**: Batches DOM mutations, applies in single pass — inherently avoids thrashing
5. **`requestAnimationFrame`**: Schedule DOM writes in rAF callbacks — batched before next paint

**Follow-ups:**
- "How does React avoid layout thrashing?" → React batches state updates → computes diffs → applies all DOM mutations in one synchronous pass. No interleaved reads between writes
- "How to detect layout thrashing?" → Chrome DevTools Performance tab: purple "Layout" bars that are too frequent. "Forced reflow" warnings in console. Performance Observer for long tasks
- "What's the performance impact?" → Each forced layout is ~1-10ms. In a loop of 1000 elements, that's 1-10 seconds of layout work. Batching reduces it to a single ~5ms layout pass

🔥 **Most Asked**: Read-write batching, what triggers forced layout, how to detect
⚠️ **Common Mistakes**: Not knowing which properties force layout; interleaving reads and writes in loops
🧠 **Strategy**: Always show the before/after code example. It's the clearest way to demonstrate the problem and solution

---

## 31. Memory Management in Browser

### Q: How does memory management work in the browser? How do you diagnose memory issues?

**Answer (Interview-Ready):**

**Browser memory spaces:**
- **JS Heap**: Objects, closures, strings, arrays — managed by V8's GC
- **DOM Memory**: DOM nodes (held by renderer process, referenced from JS heap)
- **WebAssembly Memory**: Linear memory for Wasm modules
- **GPU Memory (VRAM)**: Textures, compositor layers, canvas backings

**Memory lifecycle:** Allocate → Use → Release (GC)

**Common memory issues in web apps:**
1. **Memory leak** — memory grows over time without release. Detached DOM trees, orphaned event listeners, closures, forgotten timers
2. **Memory bloat** — app uses more memory than necessary. Loading entire dataset client-side, unoptimized images, too many compositor layers
3. **GC jank** — major GC pauses (>16ms) cause visible frame drops. More frequent in apps that churn many short-lived objects

**Diagnosis tools (Chrome DevTools Memory tab):**
| Tool | What it shows |
|------|--------------|
| **Heap Snapshot** | All objects in memory at a point in time. Compare snapshots to find leaks |
| **Allocation Timeline** | When objects are allocated. Blue bars = still alive. Gray = GC'd. Persistent blues = leaks |
| **Allocation Sampling** | Which functions are allocating memory (CPU profiling for memory) |

**3-Snapshot technique for leak detection:**
1. Take snapshot S1 (baseline)
2. Perform the suspected leaky action (navigate, open modal, etc.)
3. Take snapshot S2
4. Undo the action (go back, close modal)
5. Force GC (DevTools → Collect Garbage button)
6. Take snapshot S3
7. Compare S1 and S3 — anything in S3 not in S1 is a leak

**Follow-ups:**
- "What's a detached DOM tree?" → DOM nodes removed from the document but still referenced in JS (e.g., a variable holds a reference to a deleted element). The entire subtree stays in memory
- "How does React cause memory issues?" → Unmounted components with active subscriptions, setInterval without cleanup, large state objects never released
- "What's the memory limit?" → V8 default: ~1.5GB on 64-bit, ~512MB on 32-bit. Chrome tabs can use more via ArrayBuffer/WebAssembly. Mobile is much more constrained (~300-500MB before tab is killed)

🔥 **Most Asked**: 3-snapshot technique, detached DOM trees, GC mechanism
⚠️ **Common Mistakes**: Not forcing GC before comparing snapshots; confusing shallow vs retained size
🧠 **Strategy**: Describe the 3-snapshot technique step by step. It shows you actually debug memory issues

---

## 32. Browser Storage Options

### Q: Compare all browser storage options. When to use each?

**Answer (Interview-Ready):**

| Storage | Capacity | Persistence | Sync/Async | Accessible from | Use case |
|---------|----------|-------------|------------|----------------|----------|
| **Cookies** | ~4KB per cookie | Configurable expiry | Sync | Server + Client | Auth tokens, session tracking |
| **localStorage** | ~5-10MB | Permanent (until cleared) | Sync | Same origin | User preferences, theme |
| **sessionStorage** | ~5-10MB | Tab session | Sync | Same origin, same tab | Form state, wizard progress |
| **IndexedDB** | 50MB-unlimited | Permanent | Async | Same origin | Large structured data, offline cache |
| **Cache API** | Quota-based | Permanent | Async | Same origin (Service Worker) | HTTP response caching, offline assets |
| **OPFS** | Quota-based | Permanent | Async | Same origin | File-level access, high-perf I/O |

**Key distinctions:**
- **Cookies** are sent with every HTTP request (performance overhead). Use `HttpOnly` for security, `SameSite` for CSRF protection, `Secure` for HTTPS-only
- **localStorage** is synchronous and blocks the main thread. Fine for small reads, problematic for large data
- **IndexedDB** is transactional, supports indexes, stores structured data (objects, Blobs, ArrayBuffers). Use Dexie.js for a nicer API
- **Cache API** stores Request/Response pairs. Designed for Service Workers but usable from main thread

**Follow-ups:**
- "What happens when storage is full?" → Depends on browser. Usually throws a QuotaExceededError. IndexedDB: browser may ask user permission or evict LRU origins in "best-effort" mode
- "What about third-party cookie deprecation?" → Chrome is phasing out third-party cookies. Use first-party cookies, server-side tracking, or Privacy Sandbox APIs (Topics, Attribution Reporting)
- "localStorage vs sessionStorage for auth tokens?" → Neither! Tokens should be in HttpOnly cookies (JS can't access them, preventing XSS theft). If you must use client storage, use short-lived tokens + refresh tokens

🔥 **Most Asked**: Comparison table, cookie security flags, when to use IndexedDB vs localStorage
⚠️ **Common Mistakes**: Storing auth tokens in localStorage (XSS risk); using localStorage for large data (sync, blocks)
🧠 **Strategy**: Draw the comparison table from memory. It's the expected answer format

---

## 33. Storage Quotas & Eviction Policies

### Q: How much storage can a web app use? What happens when the quota is exceeded?

**Answer (Interview-Ready):**

**Storage quota (modern browsers):**
- **Per-origin quota**: Typically up to 80% of total disk space (shared across all storage APIs)
- **Breakdown**: IndexedDB + Cache API + OPFS share the origin's quota. localStorage has its own ~5-10MB limit
- **Check available**: `navigator.storage.estimate()` returns `{usage, quota}` in bytes

**Persistence modes:**
- **Best effort (default)**: Browser can evict storage under disk pressure. LRU by origin — least recently used origins are evicted first
- **Persistent**: `navigator.storage.persist()` asks for permission to keep data permanently. Browser won't auto-evict. Granted automatically if site is bookmarked, has push notifications, or is added to home screen

**Eviction order (when disk is full):**
1. Cache API entries (least recently used first)
2. IndexedDB databases (least recently used origin first)
3. The entire origin's data is evicted as a unit (not partial)

**Follow-ups:**
- "How to handle QuotaExceededError?" → Catch the error. Evict old data (delete old cache entries, compact IndexedDB). Show user message if persistent storage was expected
- "How does this work on mobile?" → Much more aggressive eviction. iOS Safari: 7-day cap on storage for sites not added to home screen (Intelligent Tracking Prevention). Android: more generous but still evicts under memory pressure
- "Can you exceed the quota?" → No. Writes fail with QuotaExceededError. Always check available space before large writes

🔥 **Most Asked**: How much storage available, persist() API, eviction behavior
⚠️ **Common Mistakes**: Assuming unlimited storage; not handling quota errors; not requesting persistent storage for important data
🧠 **Strategy**: Mention `navigator.storage.estimate()` and `persist()` — shows practical knowledge of the APIs

---

## 34. Origin Private File System (OPFS)

### Q: What is OPFS? How does it differ from other storage options?

**Answer (Interview-Ready):**

OPFS (Origin Private File System) is a **file-system-like API** scoped to the origin, offering high-performance I/O:

- **Not visible** to the user (unlike downloads folder). Private to the origin
- **File-based access**: Create, read, write, delete files and directories
- **High performance**: Supports synchronous access from Web Workers via `createSyncAccessHandle()`, which enables SQLite-in-the-browser performance
- **Large storage**: Shares origin quota (can be hundreds of MB to GB)

```javascript
// Get OPFS root
const root = await navigator.storage.getDirectory();

// Create a file
const fileHandle = await root.getFileHandle('data.json', { create: true });

// Write
const writable = await fileHandle.createWritable();
await writable.write(JSON.stringify(myData));
await writable.close();

// Read
const file = await fileHandle.getFile();
const contents = await file.text();
```

**Sync access (in Web Worker only — very fast):**
```javascript
// Inside a Web Worker
const root = await navigator.storage.getDirectory();
const handle = await root.getFileHandle('db.sqlite3', { create: true });
const accessHandle = await handle.createSyncAccessHandle();
// Read/write with ArrayBuffer — no async overhead
accessHandle.write(buffer);
accessHandle.flush();
accessHandle.close();
```

**Use cases:**
- Running SQLite in the browser (sql.js + OPFS for persistence)
- Large file processing (video, images) without downloading to user's filesystem
- Offline-first apps that need file-level storage with Worker-based performance

**Follow-ups:**
- "How is OPFS different from the File System Access API?" → FSAA accesses the user's real file system (via picker). OPFS is a sandboxed, origin-private filesystem — no user interaction needed, no access to real files
- "Browser support?" → Chrome 86+, Firefox 111+, Safari 15.2+. Good modern support

🔥 **Most Asked**: What OPFS is, why it's faster, SQLite-in-browser use case
⚠️ **Common Mistakes**: Confusing OPFS with the File System Access API; not knowing about sync access handles
🧠 **Strategy**: Mention "SQLite in the browser" — it's the killer use case and shows you understand why OPFS matters

---

## 35. Network Stack Basics

### Q: How does a browser's network stack work? What happens during an HTTP request?

**Answer (Interview-Ready):**

**Browser network request lifecycle:**
1. **URL parsing** → Scheme, host, port, path, query
2. **Cache check** → Check HTTP cache (memory cache → disk cache → Service Worker cache)
3. **DNS resolution** → Domain → IP (check: browser cache → OS cache → DNS recursive resolver)
4. **Connection** → TCP handshake (3-way). For HTTPS: TLS handshake (certificate exchange, key agreement)
5. **Request** → Send HTTP request (method, headers, body)
6. **Response** → Receive headers, then body (possibly chunked/streamed)
7. **Cache storage** → Based on `Cache-Control`, `ETag`, `Last-Modified` headers

**Connection pooling:**
- Browser reuses TCP connections for the same origin (keep-alive)
- HTTP/1.1: max 6 connections per host (Chrome). Each handles one request at a time
- HTTP/2: single connection per host, multiplexed streams (100+ concurrent requests)

**Caching headers:**
| Header | Purpose |
|--------|---------|
| `Cache-Control: max-age=3600` | Cache for 1 hour, don't revalidate |
| `Cache-Control: no-cache` | Always revalidate with server before using cached version |
| `Cache-Control: no-store` | Don't cache at all (sensitive data) |
| `ETag` | Server-generated hash. Client sends `If-None-Match` → 304 Not Modified |
| `Last-Modified` | Timestamp. Client sends `If-Modified-Since` → 304 Not Modified |

**Follow-ups:**
- "What's the difference between memory cache and disk cache?" → Memory: super fast, limited size, cleared on tab close. Disk: slower, larger, persists across sessions. Small/frequent resources → memory. Large/infrequent → disk
- "How does the Service Worker intercept?" → SW registers a `fetch` event listener. All network requests pass through it first. SW can: serve from cache, fetch from network, or return a custom response
- "What's a preflight request?" → CORS check. For cross-origin requests with custom headers or non-simple methods, browser sends OPTIONS request first. Server responds with allowed origins/methods

🔥 **Most Asked**: Caching headers, connection pooling limits, HTTP cache behavior (304, ETag)
⚠️ **Common Mistakes**: Confusing no-cache (revalidate) with no-store (don't cache); not knowing HTTP/1.1 connection limits
🧠 **Strategy**: The caching headers table is your go-to. Memorize it — it comes up in every performance discussion

---

## 36. HTTP/1.1 vs HTTP/2 vs HTTP/3

### Q: Compare HTTP/1.1, HTTP/2, and HTTP/3. What problems does each solve?

**Answer (Interview-Ready):**

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| **Transport** | TCP | TCP | **QUIC** (over UDP) |
| **Multiplexing** | No (one req per connection) | Yes (streams over one connection) | Yes (streams over QUIC) |
| **Head-of-line blocking** | Both HTTP and TCP level | HTTP solved, **TCP still blocking** | Fully solved (UDP-based) |
| **Header compression** | None | HPACK | QPACK |
| **Server Push** | No | Yes (but rarely used) | Deprecated |
| **Connection setup** | TCP (1 RTT) + TLS (2 RTT) = 3 RTT | Same as 1.1 (TCP+TLS) | **0-RTT** (QUIC combines transport+crypto) |
| **Max connections/host** | 6 (browser limit) | 1 (multiplexed) | 1 (multiplexed) |

**Key problems solved:**
- **HTTP/2** solved HTTP-level head-of-line blocking with multiplexing. But TCP still blocks — if one packet is lost, ALL streams wait for retransmission
- **HTTP/3** solved TCP-level head-of-line blocking by using QUIC (UDP-based). Lost stream A packet doesn't block stream B. Also: connection migration (switch WiFi to cellular without reconnecting)

**Practical impact for frontend:**
- **HTTP/1.1**: Developers bundled files (concatenation) and used domain sharding (assets1.cdn.com, assets2.cdn.com) to work around the 6 connection limit
- **HTTP/2**: No need for bundling or domain sharding. Many small files are fine. Single connection handles all. But still bundle for other reasons (tree-shaking, module graph)
- **HTTP/3**: Better mobile performance (connection migration, faster setup). Becoming default on major CDNs (Cloudflare, Google)

**Follow-ups:**
- "Should we still bundle assets with HTTP/2?" → Yes, but for different reasons. HTTP/2 removes the connection limit argument, but bundling still helps: compression is better on larger files, fewer cache entries, tree-shaking eliminates dead code
- "How is HTTP/3 adopted?" → CDNs like Cloudflare auto-enable it. Browser negotiates: tries HTTP/3, falls back to HTTP/2. `Alt-Svc` header tells browser that HTTP/3 is available
- "What's 0-RTT?" → On repeat connections, QUIC can send data with the first packet (using cached session keys). Reduces latency by 1 RTT. Risk: replay attacks (mitigated by server-side idempotency checks)

🔥 **Most Asked**: HTTP/2 multiplexing, head-of-line blocking problem, why HTTP/3 uses UDP
⚠️ **Common Mistakes**: Saying HTTP/2 removes need for bundling; not knowing TCP-level HOL blocking in HTTP/2
🧠 **Strategy**: Draw the HOL blocking diagram: HTTP/1.1 (both levels) → HTTP/2 (TCP level only) → HTTP/3 (none)

---

## 37. Connection Reuse & Head-of-Line Blocking

### Q: Explain head-of-line blocking. How does it manifest in HTTP/1.1 vs HTTP/2?

**Answer (Interview-Ready):**

**Head-of-Line (HOL) Blocking** = a single slow/lost request blocks all subsequent requests on the same channel.

**HTTP/1.1 HOL blocking:**
- One request-response at a time per TCP connection
- Request B can't start until Request A's response is fully received
- Workaround: browsers open 6 parallel connections per host. But each connection still has HOL blocking

**HTTP/2 HOL blocking (TCP level):**
- HTTP/2 multiplexes multiple streams on one TCP connection
- HTTP-level HOL blocking is solved — streams are independent at the HTTP layer
- BUT: TCP treats the connection as a single byte stream. If packet #3 is lost, TCP blocks ALL streams until packet #3 is retransmitted — even if those streams didn't need that packet
- Under packet loss, HTTP/2 can actually be SLOWER than HTTP/1.1 (which has 6 independent TCP connections)

**HTTP/3 solves it:**
- QUIC uses UDP. Each stream is independently managed
- Lost packet in stream A only blocks stream A. Stream B continues unblocked
- Under packet loss conditions, HTTP/3 is clearly faster than HTTP/2

**Connection Reuse:**
- **TCP keep-alive**: Reuse an established TCP connection for multiple requests (avoid handshake overhead)
- **HTTP/1.1**: `Connection: keep-alive` is default. Max 6 persistent connections per host
- **HTTP/2**: One TCP connection per host, reused for all requests via multiplexing
- **HTTP/3**: QUIC connections persist and even survive network changes (IP changes)

**Follow-ups:**
- "What's QUIC's connection migration?" → QUIC identifies connections by a Connection ID, not by IP+port. When your phone switches from WiFi to cellular (IP changes), the QUIC connection continues seamlessly using the same Connection ID
- "How does pipelining differ from multiplexing?" → HTTP/1.1 pipelining sends multiple requests without waiting, but responses MUST come back in order (HOL blocking!). HTTP/2 multiplexing has no ordering requirement

🔥 **Most Asked**: HOL blocking at HTTP vs TCP level, why HTTP/3 uses UDP, connection reuse strategy
⚠️ **Common Mistakes**: Saying HTTP/2 has no HOL blocking (it has TCP-level); confusing pipelining with multiplexing
🧠 **Strategy**: Explain the three levels of HOL blocking progression: HTTP/1.1 → HTTP/2 → HTTP/3. It's a clear narrative

---

## 38. DNS Prefetch, Preconnect, Early Hints

### Q: Explain resource hints: dns-prefetch, preconnect, and Early Hints (103).

**Answer (Interview-Ready):**

**dns-prefetch** — DNS resolution only:
```html
<link rel="dns-prefetch" href="https://cdn.example.com">
```
- Resolves domain → IP address ahead of time (~20-120ms saved)
- Lightweight. Safe to use broadly. No connection overhead
- Use for: Third-party domains you'll request later (analytics, fonts, CDNs)

**preconnect** — DNS + TCP + TLS:
```html
<link rel="preconnect" href="https://api.example.com">
```
- Establishes full connection: DNS + TCP handshake + TLS handshake (~100-300ms saved)
- More expensive than dns-prefetch (holds connection open). Limit to 2-4 origins
- Use for: Origins you'll definitely fetch from in the next few seconds (API, font CDN)

**Early Hints (HTTP 103):**
- Server sends a 103 response BEFORE the final 200 response
- Contains `Link` headers with preload/preconnect hints
- Browser starts fetching hinted resources while server is still generating the full response
```
HTTP/1.1 103 Early Hints
Link: </style.css>; rel=preload; as=style
Link: </app.js>; rel=preload; as=script

HTTP/1.1 200 OK
<html>...
```
- Saves the time between first byte of response and HTML parsing discovering the resources

**Comparison:**
| Hint | Cost | Savings | When |
|------|------|---------|------|
| dns-prefetch | Very low | ~50ms | Future page navigations |
| preconnect | Medium (holds connection) | ~200ms | Current page, imminent requests |
| preload | High (full download) | ~500ms+ | Current page, critical resources |
| Early Hints (103) | None (server-side) | ~200ms | Before HTML arrives |

**Follow-ups:**
- "Can preconnect hurt performance?" → Yes. Idle connections consume resources (browser and server). If you preconnect to an origin you don't fetch from within 10s, it's wasted. Max 4-6 preconnects
- "How does `preload` differ from `preconnect`?" → preconnect opens the connection. preload actually downloads the resource. preload implies preconnect. Use preload for specific resources, preconnect for origins
- "What are Speculation Rules?" → Newer API. `<script type="speculationrules">` tells browser to prefetch or even prerender entire pages. More powerful than `<link rel=prefetch>` — can prerender the entire page in a hidden tab

🔥 **Most Asked**: dns-prefetch vs preconnect distinction, when to use each, Early Hints concept
⚠️ **Common Mistakes**: Overusing preconnect; using dns-prefetch when preconnect is appropriate; not knowing Early Hints
🧠 **Strategy**: Give the practical placement: dns-prefetch for third-party domains, preconnect for your API/CDN, Early Hints for server-side optimization

---

## 39. QUIC Protocol Basics

### Q: What is QUIC? Why is HTTP/3 built on it?

**Answer (Interview-Ready):**

**QUIC** = a transport protocol built on top of UDP by Google, now standardized as the transport for HTTP/3.

**Why not TCP?**
- TCP is baked into OS kernels and middleboxes (routers, firewalls). Changing TCP is practically impossible
- TCP has inherent issues: HOL blocking, slow connection setup, no encryption by default, can't survive IP changes
- QUIC runs in user-space over UDP, so it can evolve without OS/middlebox cooperation

**Key QUIC features:**

| Feature | Benefit |
|---------|---------|
| **0-RTT connection setup** | Combines crypto + transport setup. Returning clients send data immediately |
| **Independent streams** | Lost packet in stream A doesn't block stream B (no TCP HOL) |
| **TLS 1.3 built-in** | Always encrypted. No unencrypted QUIC. Faster handshake (~0-1 RTT) |
| **Connection migration** | Uses Connection ID (not IP:port). Survives WiFi→cellular switch |
| **Improved congestion control** | Each stream has independent flow control. Better bandwidth utilization |
| **Forward error correction** | Can recover lost packets without retransmission (in some implementations) |

**Practical impact:**
- Mobile users: Better performance when switching networks (train, walking between WiFi zones)
- High-latency users: 0-RTT saves 100-300ms on connection setup
- Lossy networks: Independent stream recovery means one lost packet doesn't freeze everything

**Follow-ups:**
- "Why UDP and not a new protocol?" → Middleboxes (NATs, firewalls) would block unknown protocols. UDP passes through existing infrastructure
- "Downsides of QUIC?" → More CPU-intensive than TCP (encryption in user-space, not hardware-offloaded). Some firewalls block UDP. Fallback to HTTP/2 needed
- "How to enable HTTP/3?" → Server-side: configure Nginx/Caddy/Cloudflare for QUIC. Browser auto-negotiates via `Alt-Svc` header. No frontend code changes needed

🔥 **Most Asked**: Why UDP over TCP, 0-RTT, connection migration, stream independence
⚠️ **Common Mistakes**: Saying QUIC is "just UDP"; not knowing QUIC has built-in TLS; confusing QUIC with HTTP/3 (QUIC is transport, HTTP/3 is the application protocol on QUIC)
🧠 **Strategy**: Frame it as solving TCP's three problems: HOL blocking, slow setup, no migration

---

## 40. Web Workers

### Q: What are Web Workers? How do you communicate with them?

**Answer (Interview-Ready):**

Web Workers run JavaScript **in a separate thread**, enabling CPU-intensive tasks without blocking the UI.

**Creating a worker:**
```javascript
// main.js
const worker = new Worker('worker.js');

worker.postMessage({ type: 'sort', data: hugeArray });

worker.onmessage = (event) => {
  console.log('Sorted:', event.data);
};

worker.onerror = (event) => {
  console.error('Worker error:', event.message);
};

// worker.js
self.onmessage = (event) => {
  const { type, data } = event.data;
  if (type === 'sort') {
    const sorted = data.sort((a, b) => a - b);
    self.postMessage(sorted);
  }
};
```

**Communication:**
- `postMessage` / `onmessage` — data is **structured clone** (deep copied). Safe but expensive for large data
- **Transferable objects**: Zero-copy transfer of ArrayBuffers: `worker.postMessage(buffer, [buffer])`. Buffer becomes unusable in sender
- **SharedArrayBuffer**: Shared memory (no copy, no transfer). Requires cross-origin isolation headers. Use `Atomics` for synchronization

**Worker limitations:**
- No DOM access (`document`, `window.location`, DOM APIs are undefined)
- No direct UI manipulation
- Separate global scope (`self` instead of `window`)
- CAN use: `fetch`, `IndexedDB`, `WebSocket`, `setTimeout`, `importScripts()`

**Types of workers:**
| Type | Lifecycle | Scope | Use case |
|------|-----------|-------|----------|
| **Dedicated Worker** | Tied to one page | Single page | Heavy computation |
| **Shared Worker** | Shared across tabs (same origin) | Multiple pages | Shared state, single WebSocket |
| **Service Worker** | Independent of pages | Origin-wide, runs in background | Offline, caching, push notifications |

**Follow-ups:**
- "What about `Comlink`?" → Library that wraps postMessage in a Promise-based RPC interface. Makes workers feel like calling async functions: `const result = await workerProxy.sort(data)`
- "When is postMessage overhead a problem?" → When transferring large amounts of data (>1MB) frequently. Use Transferable objects or SharedArrayBuffer instead
- "Can workers create workers?" → Yes, a worker can create sub-workers (nested workers). Useful for thread pools

🔥 **Most Asked**: When to use workers, communication methods, structured clone vs transferable
⚠️ **Common Mistakes**: Overusing workers for simple operations (postMessage overhead > compute time); trying DOM access from worker
🧠 **Strategy**: Give a concrete example: "Sort 1M records" or "Parse 10MB JSON" — then show the postMessage pattern

---

## 41. Service Workers

### Q: Explain Service Workers — lifecycle, caching, and common patterns.

**Answer (Interview-Ready):**

Service Worker = a **proxy** between the browser and the network. Runs in background, intercepts requests, enables offline.

**Lifecycle:**
1. **Register**: `navigator.serviceWorker.register('/sw.js')` — browser downloads and parses
2. **Install**: `install` event fires. Precache critical assets. If precaching fails → install fails
3. **Wait**: New SW waits until old SW's pages are all closed (unless `skipWaiting()`)
4. **Activate**: `activate` event fires. Clean up old caches. Then SW controls all pages
5. **Fetch**: `fetch` event intercepts every network request. SW decides how to respond

```javascript
// sw.js
const CACHE_NAME = 'v1';
const ASSETS = ['/', '/app.js', '/styles.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```

**Caching strategies:**
| Strategy | Behavior | Use case |
|----------|----------|----------|
| **Cache First** | Check cache → fallback to network | Static assets (CSS, JS, images) |
| **Network First** | Try network → fallback to cache | API responses, dynamic content |
| **Stale While Revalidate** | Serve cached immediately + fetch new in background | Content that can be slightly stale |
| **Network Only** | Always fetch from network | Analytics, non-cacheable requests |
| **Cache Only** | Always serve from cache | Precached assets in offline mode |

**Follow-ups:**
- "How do you update a Service Worker?" → Change any byte in sw.js → browser detects change → installs new SW → waits → activates when old SW's pages close. Show user "Update available" toast
- "What about `skipWaiting` and `clients.claim`?" → `skipWaiting()`: new SW activates immediately (don't wait for old pages to close). `clients.claim()`: new SW takes control of existing pages without reload. Use carefully — can cause version mismatch
- "Background Sync?" → Register sync event when offline. When connectivity returns, SW fires sync event. Queue failed requests and replay them

🔥 **Most Asked**: Service Worker lifecycle, caching strategies table, update mechanism
⚠️ **Common Mistakes**: Not versioning caches; not cleaning up old caches in activate; using skipWaiting without understanding version mismatch risk
🧠 **Strategy**: The 5 caching strategies table is the expected answer. Memorize it with one use case each

---

## 42. Worklets

### Q: What are Worklets? How do they differ from Workers?

**Answer (Interview-Ready):**

**Worklets** = lightweight, special-purpose scripts that hook into the browser's rendering pipeline. Unlike Workers (general computation), Worklets extend specific browser subsystems.

| Worklet | Purpose | Use case |
|---------|---------|----------|
| **Paint Worklet** | Custom CSS painting (Houdini) | Custom backgrounds, borders, decorations without images |
| **Animation Worklet** | Off-main-thread animations | Scroll-linked animations, complex animation timelines |
| **Layout Worklet** | Custom CSS layout algorithms | Masonry layout, circular layout (experimental) |
| **Audio Worklet** | Custom audio processing | Real-time audio effects, synthesizers |

**Paint Worklet example:**
```javascript
// my-paint.js
class CheckerboardPainter {
  paint(ctx, size, properties) {
    const tileSize = 32;
    for (let y = 0; y < size.height; y += tileSize) {
      for (let x = 0; x < size.width; x += tileSize) {
        ctx.fillStyle = (x + y) % (tileSize * 2) === 0 ? '#eee' : '#fff';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }
}
registerPaint('checkerboard', CheckerboardPainter);

// main.js
CSS.paintWorklet.addModule('my-paint.js');
```
```css
.element { background-image: paint(checkerboard); }
```

**Workers vs Worklets:**
| | Workers | Worklets |
|---|---------|---------|
| **Thread** | Own dedicated thread | May share thread, runs on render pipeline |
| **Lifecycle** | Long-lived | Called per frame/need |
| **DOM access** | No | No |
| **Communication** | postMessage | Properties/CSS variables |
| **Purpose** | General computation | Extend rendering pipeline |
| **Weight** | Heavier (full JS environment) | Lighter (restricted API surface) |

**Follow-ups:**
- "What's CSS Houdini?" → A set of APIs that expose the browser's CSS engine to developers. Paint Worklet, Typed OM, Properties & Values API, Layout Worklet. Lets you create custom CSS features without polyfills
- "Is Animation Worklet production-ready?" → Limited browser support. Scroll-driven animations now have CSS-native support (`animation-timeline: scroll()`) which is more practical
- "Audio Worklet vs ScriptProcessorNode?" → Audio Worklet replaced the deprecated ScriptProcessorNode. Runs on a dedicated audio rendering thread — no main-thread jank. Required for modern Web Audio

🔥 **Most Asked**: Paint Worklet (most practical), Workers vs Worklets comparison, Houdini overview
⚠️ **Common Mistakes**: Confusing Worklets with Workers; thinking Worklets are widely supported (Layout Worklet is experimental)
🧠 **Strategy**: Know Paint Worklet well (most mature). For others, explain the concept and note browser support status

---
---

# Part C — TypeScript Deep Dive

## 43. Types vs Interfaces

### Q: When should you use `type` vs `interface` in TypeScript?

**Answer (Interview-Ready):**

| Feature | `interface` | `type` |
|---------|------------|--------|
| Object shapes | ✅ | ✅ |
| Extend/inherit | `extends` | `&` (intersection) |
| Declaration merging | ✅ (auto-merges) | ❌ |
| Union types | ❌ | ✅ `type A = B \| C` |
| Primitive aliases | ❌ | ✅ `type ID = string` |
| Tuple types | ❌ | ✅ `type Pair = [string, number]` |
| Mapped types | ❌ | ✅ |
| `implements` (class) | ✅ | ✅ |
| Performance | Slightly faster (cached) | Eager evaluation on complex types |

**When to use `interface`:**
- Object shapes and class contracts: `interface UserService { getUser(id: string): User }`
- Library APIs (declaration merging lets consumers extend): `interface Window { myApp: App }`
- When you need `extends` chains

**When to use `type`:**
- Unions: `type Result = Success | Error`
- Primitives: `type ID = string | number`
- Tuples: `type Coordinate = [number, number]`
- Computed/mapped types: `type Readonly<T> = { readonly [K in keyof T]: T[K] }`
- Complex type compositions

**Practical guideline:** Use `interface` for public API contracts and extendable shapes. Use `type` for everything else (unions, tuples, utility types).

**Follow-ups:**
- "What's declaration merging?" → Two `interface User` declarations in the same scope automatically merge their properties. This is how you extend `Window`, `Express.Request`, etc.
- "Performance difference?" → For simple types, negligible. For complex recursive types, interfaces can be faster because TS caches their shape. Types are re-evaluated each time
- "Can you use both together?" → Yes. `type UserOrAdmin = User | Admin` where both are interfaces. Or `interface Foo extends Bar` where `Bar` is a type alias for an object shape

🔥 **Most Asked**: The comparison table, when to pick one over the other, declaration merging
⚠️ **Common Mistakes**: Using `type` for everything (miss declaration merging); using `interface` for unions (can't)
🧠 **Strategy**: "I use interface for contracts and type for composition" — this is the senior answer

---

## 44. Union & Intersection Types

### Q: Explain union and intersection types. How do they work with type narrowing?

**Answer (Interview-Ready):**

**Union** (`|`): Type can be A OR B
```typescript
type Result = Success | Error;
type ID = string | number;

function processId(id: ID) {
  // id is string | number here — can only use common methods
  if (typeof id === 'string') {
    id.toUpperCase(); // narrowed to string
  } else {
    id.toFixed(2);    // narrowed to number
  }
}
```

**Intersection** (`&`): Type must be A AND B (combines all properties)
```typescript
type WithTimestamp = { createdAt: Date; updatedAt: Date };
type User = { name: string; email: string };
type TimestampedUser = User & WithTimestamp;
// Has: name, email, createdAt, updatedAt — ALL properties

// Practical: mixin pattern
type Loggable = { log: () => void };
type Serializable = { serialize: () => string };
type LoggableUser = User & Loggable & Serializable;
```

**Type narrowing techniques:**
```typescript
// typeof
if (typeof x === 'string') { /* x is string */ }

// instanceof
if (x instanceof Date) { /* x is Date */ }

// in operator
if ('email' in user) { /* user has email property */ }

// Discriminated union (best for complex types)
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };

function area(shape: Shape) {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'square': return shape.side ** 2;
  }
}

// Custom type guard
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'email' in obj;
}
```

**Follow-ups:**
- "What happens with conflicting intersection properties?" → If types have the same property with different types, the result is the intersection of those property types. `{ a: string } & { a: number }` → `a: never` (can't be both string and number)
- "Never type in exhaustive checks?" → In a switch on discriminated unions, the `default` case narrows to `never`. If you add a new variant and forget to handle it, TS catches it at compile time

🔥 **Most Asked**: Union narrowing, discriminated unions with switch, intersection for mixins
⚠️ **Common Mistakes**: Forgetting to narrow unions before using type-specific methods; conflicting intersection properties
🧠 **Strategy**: Show discriminated unions — they demonstrate advanced TS knowledge and practical design

---

## 45. Generics

### Q: Explain TypeScript generics. Show practical examples with constraints.

**Answer (Interview-Ready):**

Generics = **type parameters** that let you write reusable, type-safe code.

**Basic:**
```typescript
function identity<T>(arg: T): T { return arg; }
identity<string>('hello'); // explicit
identity(42);              // inferred as number
```

**Constraints** (`extends`):
```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
getProperty({ name: 'Alice', age: 30 }, 'name'); // string
getProperty({ name: 'Alice', age: 30 }, 'foo');  // Error: 'foo' not in 'name' | 'age'
```

**Generic interfaces and classes:**
```typescript
interface Repository<T> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}

class UserRepo implements Repository<User> {
  async findById(id: string): Promise<User> { /* ... */ }
  // ...
}
```

**Generic utility patterns:**
```typescript
// Make all properties optional at one level
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// API response wrapper
type ApiResponse<T> = {
  data: T;
  status: number;
  error?: string;
};

// Function that infers return type
function createState<T>(initial: T) {
  let state = initial;
  return {
    get: (): T => state,
    set: (value: T) => { state = value; },
  };
}
const counter = createState(0);  // T inferred as number
counter.set('hello');             // Error: string not assignable to number
```

**Follow-ups:**
- "What's the difference between `<T extends object>` and `<T extends {}>`?" → `extends object` excludes primitives. `extends {}` includes everything except `null` and `undefined`. Use `extends object` when you want only object types
- "Generic defaults?" → `function fetch<T = unknown>(url: string): Promise<T>` — T defaults to `unknown` if not specified
- "How do generics work at runtime?" → They don't. Generics are erased at compilation. Runtime code doesn't know about T. This is why you can't do `new T()` or `typeof T`

🔥 **Most Asked**: Constrained generics (`extends keyof`), generic React components, utility type creation
⚠️ **Common Mistakes**: Overusing generics where a simple union suffices; forgetting generics are erased at runtime
🧠 **Strategy**: Show the `getProperty<T, K extends keyof T>` pattern — it's the most commonly asked generic question

---

## 46. Enums vs Const Assertions vs Union Types

### Q: Compare enums, const assertions, and union types. Which should you use?

**Answer (Interview-Ready):**

```typescript
// 1. Enum
enum Direction { Up = 'UP', Down = 'DOWN', Left = 'LEFT', Right = 'RIGHT' }

// 2. Const assertion
const Direction = { Up: 'UP', Down: 'DOWN', Left: 'LEFT', Right: 'RIGHT' } as const;
type Direction = typeof Direction[keyof typeof Direction]; // 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

// 3. Union type
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
```

| Feature | Enum | Const Assertion | Union |
|---------|------|----------------|-------|
| Runtime code | Yes (compiles to object) | Yes (plain object) | No (type only) |
| Bundle size | Adds ~200 bytes per enum | Plain object | Zero |
| Reverse mapping | Numeric enums only | No | No |
| Iteration | `Object.values(Direction)` | `Object.values(Direction)` | Not possible |
| Tree-shaking | ❌ (not tree-shakeable) | ✅ | N/A |
| Type safety | Good | Excellent (literal types) | Excellent |

**Recommendation:**
- **Union types** for simple string/number sets (most cases): `type Status = 'active' | 'inactive'`
- **`as const` objects** when you need runtime values AND type safety: `const HTTP_METHODS = ['GET', 'POST'] as const`
- **Enums** only when you need: namespace grouping, numeric auto-increment, or reverse mapping (rare)
- **`const enum`** was an option (inlined at compile time, zero runtime) but is incompatible with `--isolatedModules` (required by most modern tools)

**Follow-ups:**
- "Why are enums not tree-shakeable?" → TypeScript compiles enums to IIFEs (immediately invoked function expressions). Bundlers can't statically determine if the IIFE has side effects, so they keep it
- "What about `const enum`?" → Inlined at compile time (no runtime object). But breaks with `--isolatedModules` (Vite, esbuild) and doesn't work across library boundaries. Avoid in modern projects
- "How does `as const` work?" → Tells TS to infer the narrowest possible type. `['a', 'b']` → `string[]`. `['a', 'b'] as const` → `readonly ['a', 'b']` (tuple of literals)

🔥 **Most Asked**: Enum vs union vs const assertion comparison, why to avoid enums in modern TS
⚠️ **Common Mistakes**: Using enums everywhere by default; not knowing about `as const`; using `const enum` with modern bundlers
🧠 **Strategy**: Say "I prefer union types for simple cases, `as const` objects when I need runtime values." This is the current best practice

---

## 47. Conditional Types & infer

### Q: Explain conditional types and the `infer` keyword.

**Answer (Interview-Ready):**

**Conditional types** = type-level if/else:
```typescript
type IsString<T> = T extends string ? 'yes' : 'no';
type A = IsString<string>;  // 'yes'
type B = IsString<number>;  // 'no'
```

**`infer`** = extract a type from within another type:
```typescript
// Extract return type of a function
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type A = ReturnType<() => string>;          // string
type B = ReturnType<(x: number) => boolean>; // boolean

// Extract element type from array
type ElementOf<T> = T extends (infer E)[] ? E : never;
type C = ElementOf<string[]>;  // string
type D = ElementOf<number[]>;  // number

// Extract Promise value
type Awaited<T> = T extends Promise<infer V> ? Awaited<V> : T;
type E = Awaited<Promise<Promise<string>>>;  // string (recursive unwrap!)
```

**Distributive conditional types:**
```typescript
type ToArray<T> = T extends any ? T[] : never;
type F = ToArray<string | number>; // string[] | number[] (distributed!)
// NOT (string | number)[] — distributes over union members

// To prevent distribution, wrap in tuple:
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type G = ToArrayNonDist<string | number>; // (string | number)[]
```

**Practical example — extract route params:**
```typescript
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type Params = ExtractParams<'/users/:userId/posts/:postId'>;
// { userId: string } & { postId: string }
```

**Follow-ups:**
- "When does `infer` position matter?" → In co-variant position (return types): infer picks the union. In contra-variant position (parameter types): infer picks the intersection
- "Can conditional types be recursive?" → Yes. `Awaited<T>` example above unwraps nested Promises recursively. TS has a depth limit (~100 levels)
- "What's `never` in conditional types?" → `never` is the empty type. `T extends never` is always false. It's used to filter out unwanted union members: `type NonNullable<T> = T extends null | undefined ? never : T`

🔥 **Most Asked**: ReturnType implementation with infer, distributive behavior, practical infer examples
⚠️ **Common Mistakes**: Not understanding distributive behavior over unions; using `infer` outside conditional types (it only works inside)
🧠 **Strategy**: Show `ReturnType<T>` implementation — it's the canonical conditional type + infer example

---

## 48. Mapped Types

### Q: Explain mapped types. Show practical examples with `keyof`, `in`, and `as`.

**Answer (Interview-Ready):**

Mapped types = transform properties of an existing type:

```typescript
// Basic: make all properties optional
type MyPartial<T> = { [K in keyof T]?: T[K] };

// Make all properties readonly
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

// Make all properties required
type MyRequired<T> = { [K in keyof T]-?: T[K] };  // -? removes optionality
```

**Key remapping with `as`:**
```typescript
// Prefix all keys with 'get'
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type User = { name: string; age: number };
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }

// Filter keys by value type
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
type StringProps = OnlyStrings<{ name: string; age: number; email: string }>;
// { name: string; email: string }
```

**Common patterns:**
```typescript
// Record — create object type from keys and value type
type Record<K extends keyof any, V> = { [P in K]: V };
type UserMap = Record<string, User>;

// Pick
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

// Omit
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// DeepReadonly (recursive)
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

**Follow-ups:**
- "What's `keyof any`?" → `string | number | symbol` — all valid property key types. Used in `Record<K extends keyof any, V>` to allow any valid key
- "How are mapped types different from index signatures?" → Index signature: `{ [key: string]: number }` — any string key, all same type. Mapped type: `{ [K in 'a' | 'b']: ... }` — specific keys, individual types. Much more precise
- "Can you add new properties in a mapped type?" → Not directly. Use intersection: `type Extended<T> = { [K in keyof T]: T[K] } & { newProp: string }`

🔥 **Most Asked**: Implement Partial/Readonly, key remapping with `as`, filtering keys
⚠️ **Common Mistakes**: Confusing mapped types with index signatures; not knowing `-?` (remove optionality) and `-readonly` (remove readonly)
🧠 **Strategy**: Implement `Partial<T>` on the spot — it's 1 line and shows you understand mapped types

---

## 49. Template Literal Types

### Q: What are template literal types? Show practical use cases.

**Answer (Interview-Ready):**

Template literal types = string manipulation at the type level:

```typescript
type Greeting = `Hello, ${string}`;
type A = 'Hello, World' extends Greeting ? true : false; // true

// Event handler names
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`;
// 'onClick' | 'onFocus' | 'onBlur'

// CSS unit types
type CSSUnit = 'px' | 'em' | 'rem' | '%';
type CSSValue = `${number}${CSSUnit}`;
const width: CSSValue = '100px';  // ✅
const bad: CSSValue = '100vw';    // ❌ Error
```

**String manipulation utility types:**
```typescript
Uppercase<'hello'>    // 'HELLO'
Lowercase<'HELLO'>    // 'hello'
Capitalize<'hello'>   // 'Hello'
Uncapitalize<'Hello'> // 'hello'
```

**Advanced: Dot-notation path types:**
```typescript
type PathKeys<T, Prefix extends string = ''> =
  T extends object
    ? { [K in keyof T & string]:
        | `${Prefix}${K}`
        | PathKeys<T[K], `${Prefix}${K}.`>
      }[keyof T & string]
    : never;

type User = { name: string; address: { city: string; zip: string } };
type UserPaths = PathKeys<User>;
// 'name' | 'address' | 'address.city' | 'address.zip'
```

**Practical: Type-safe routing:**
```typescript
type Route = '/users/:id' | '/posts/:postId/comments/:commentId';

type ExtractParam<S extends string> =
  S extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParam<Rest>
    : S extends `${string}:${infer Param}`
      ? Param
      : never;

type UserRouteParams = ExtractParam<'/users/:id'>; // 'id'
type CommentParams = ExtractParam<'/posts/:postId/comments/:commentId'>;
// 'postId' | 'commentId'
```

**Follow-ups:**
- "Performance concerns?" → Very complex template literal types (deeply recursive, many union members) can slow down the TS compiler. Keep depth reasonable
- "Real-world library usage?" → Express route types, Tailwind CSS class names, GraphQL query types, i18n translation key checking
- "Combine with mapped types?" → Yes! The `Getters<T>` example (mapped type + template literal + Capitalize) is a perfect combo

🔥 **Most Asked**: Event handler name generation, CSS value types, route parameter extraction
⚠️ **Common Mistakes**: Over-engineering types that the compiler struggles with; not knowing the 4 string utility types
🧠 **Strategy**: Show the `on${Capitalize<EventName>}` pattern — it's clean, practical, and memorable

---

## 50. Discriminated Unions

### Q: What are discriminated unions? Why are they important in TypeScript?

**Answer (Interview-Ready):**

A **discriminated union** = a union of types that share a common literal property (the "discriminant") used for narrowing:

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':    return Math.PI * shape.radius ** 2;
    case 'rectangle': return shape.width * shape.height;
    case 'triangle':  return 0.5 * shape.base * shape.height;
  }
}
```

**Why they're powerful:**
1. **Exhaustive checking**: If you add a new `kind`, TypeScript forces you to handle it in all switches:
```typescript
function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':    return Math.PI * shape.radius ** 2;
    case 'rectangle': return shape.width * shape.height;
    // Missing 'triangle' → TypeScript error if you use exhaustive check:
    default: const _exhaustive: never = shape; // Error: Type 'triangle' not assignable to 'never'
  }
}
```

2. **Type narrowing**: Inside each `case`, TS knows the exact type — you get full autocomplete and type safety

**Real-world patterns:**
```typescript
// API response
type Response<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
  | { status: 'loading' };

// Redux actions
type Action =
  | { type: 'ADD_TODO'; payload: { text: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: number } }
  | { type: 'DELETE_TODO'; payload: { id: number } };

// State machine
type AuthState =
  | { status: 'idle' }
  | { status: 'authenticating'; credentials: Credentials }
  | { status: 'authenticated'; user: User; token: string }
  | { status: 'error'; error: string; retryCount: number };
```

**Follow-ups:**
- "Can the discriminant be something other than a string literal?" → Yes. Number literals, boolean literals, or even `null`/`undefined`. But string literals are most common and readable
- "How does this compare to class hierarchies?" → Discriminated unions are more flexible (no class overhead), work with plain objects, and are composable. Use classes when you need methods on instances, unions when you just need data
- "What about nested discriminated unions?" → Fully supported. Each level can have its own discriminant. TS narrows at each level

🔥 **Most Asked**: Shape example, exhaustive checking with `never`, API response typing
⚠️ **Common Mistakes**: Forgetting the exhaustive check (default → never); using strings without literal types as discriminant
🧠 **Strategy**: Show the `never` exhaustive check pattern. It's the "wow" moment in TS interviews

---

## 51. Utility Types

### Q: Explain TypeScript's built-in utility types. When to use each?

**Answer (Interview-Ready):**

| Utility | What it does | Example |
|---------|-------------|---------|
| `Partial<T>` | All properties optional | `Partial<User>` → `{ name?: string; age?: number }` |
| `Required<T>` | All properties required | Opposite of Partial |
| `Readonly<T>` | All properties readonly | Prevents mutation |
| `Pick<T, K>` | Select specific properties | `Pick<User, 'name' \| 'email'>` |
| `Omit<T, K>` | Remove specific properties | `Omit<User, 'password'>` |
| `Record<K, V>` | Create object type | `Record<string, User>` |
| `Exclude<T, U>` | Remove types from union | `Exclude<'a' \| 'b' \| 'c', 'a'>` → `'b' \| 'c'` |
| `Extract<T, U>` | Keep types in union | `Extract<'a' \| 'b' \| 'c', 'a' \| 'b'>` → `'a' \| 'b'` |
| `NonNullable<T>` | Remove null/undefined | `NonNullable<string \| null>` → `string` |
| `ReturnType<T>` | Get function return type | `ReturnType<typeof fetch>` → `Promise<Response>` |
| `Parameters<T>` | Get function param types as tuple | `Parameters<typeof fn>` → `[string, number]` |
| `InstanceType<T>` | Get class instance type | `InstanceType<typeof MyClass>` → `MyClass` |
| `Awaited<T>` | Unwrap Promise type | `Awaited<Promise<string>>` → `string` |

**Practical combinations:**
```typescript
// Update DTO: only selected fields, all optional
type UpdateUserDTO = Partial<Pick<User, 'name' | 'email' | 'avatar'>>;

// Create DTO: all fields except auto-generated
type CreateUserDTO = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// API handlers map
type Handlers = Record<string, (...args: any[]) => Promise<any>>;

// Extract resolved type from async function
type Data = Awaited<ReturnType<typeof fetchUsers>>; // User[]
```

**Follow-ups:**
- "How do you implement `Partial<T>`?" → `type Partial<T> = { [K in keyof T]?: T[K] }` — mapped type with optional modifier
- "What's the difference between `Exclude` and `Omit`?" → `Exclude` works on union types (removes members). `Omit` works on object types (removes properties). Common confusion
- "How to make a deeply partial type?" → `type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }` — recursive mapped type

🔥 **Most Asked**: Partial, Pick, Omit, Record — these 4 appear in every TS interview
⚠️ **Common Mistakes**: Confusing Exclude (unions) with Omit (objects); not knowing ReturnType/Parameters
🧠 **Strategy**: Know the top 6 (Partial, Required, Pick, Omit, Record, ReturnType) cold. Implement Partial on the spot

---

## 52. Typing Props, Children, Events, Refs

### Q: How do you properly type React component props, children, events, and refs?

**Answer (Interview-Ready):**

**Props:**
```typescript
// Interface for props
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button: React.FC<ButtonProps> = ({ label, variant = 'primary', onClick }) => (
  <button className={variant} onClick={onClick}>{label}</button>
);

// Extending HTML element props
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
// Now InputProps has label, error, AND all native <input> attributes (type, placeholder, etc.)
```

**Children:**
```typescript
// Explicit children typing (preferred over React.FC)
interface CardProps {
  title: string;
  children: React.ReactNode;  // Accepts anything renderable: string, number, JSX, arrays, null
}

// Render prop pattern
interface DataFetcherProps<T> {
  url: string;
  children: (data: T, loading: boolean) => React.ReactNode;
}
```

**Events:**
```typescript
// Common event types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {};
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { e.target.value };
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault() };
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { e.key };
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {};
```

**Refs:**
```typescript
// useRef with DOM element
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current is HTMLInputElement | null

// useRef as mutable container (no null)
const countRef = useRef<number>(0);
// countRef.current is number (no null — initial value provided)

// forwardRef with typing
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));
```

**Follow-ups:**
- "`React.FC` — use it or not?" → Modern recommendation: avoid `React.FC`. It used to add implicit `children` typing (removed in React 18 types). Just type the function directly: `function Button(props: ButtonProps) { ... }`
- "How to type `useImperativeHandle`?" → Define a ref interface: `interface InputRef { focus: () => void; clear: () => void }`. Use: `forwardRef<InputRef, Props>(...)`
- "How to type event handlers for custom components?" → Accept the handler type as a prop: `onItemSelect: (item: Item) => void`. Don't use React event types for custom logic events

🔥 **Most Asked**: Event typing (ChangeEvent, MouseEvent), children typing, forwardRef
⚠️ **Common Mistakes**: Using `any` for events; typing children as `JSX.Element` instead of `ReactNode`; forgetting `null` in useRef
🧠 **Strategy**: Know the 5 common event types (Mouse, Change, Form, Keyboard, Focus) from memory

---

## 53. Typing Custom Hooks

### Q: How do you properly type custom React hooks?

**Answer (Interview-Ready):**

```typescript
// Simple hook with return type inference
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle] as const;
  // Returns: readonly [boolean, () => void]
  // Without `as const`: (boolean | (() => void))[] — WRONG, loses positional types
}

// Generic hook
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(res => res.json() as Promise<T>)
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}
// Usage: const { data } = useFetch<User[]>('/api/users');

// Hook with discriminated union return
function useAsync<T>(asyncFn: () => Promise<T>) {
  type State =
    | { status: 'idle'; data: null; error: null }
    | { status: 'loading'; data: null; error: null }
    | { status: 'success'; data: T; error: null }
    | { status: 'error'; data: null; error: Error };
  // ...
}
```

**`as const` for tuple returns:**
```typescript
// Without: [boolean, () => void] inferred as (boolean | (() => void))[]
// With `as const`: readonly [boolean, () => void] — correct positional types

// Alternative: explicit return type
function useToggle(initial: boolean): [boolean, () => void] { ... }
```

**Follow-ups:**
- "Why `as const` on the return?" → Without it, TS infers an array type `(boolean | () => void)[]` instead of a tuple. Consumers can't destructure `[value, toggle]` with correct types
- "How to type a hook that returns different types based on options?" → Function overloads or conditional return types: `function useData(opts: { suspense: true }): Data` vs `function useData(opts: { suspense: false }): { data: Data | null; loading: boolean }`
- "How to share hook types across components?" → Export the hook's return type: `export type UseFetchReturn<T> = ReturnType<typeof useFetch<T>>`

🔥 **Most Asked**: Generic hooks, `as const` for tuples, discriminated union state
⚠️ **Common Mistakes**: Forgetting `as const` on tuple returns; not using AbortController in fetch hooks; typing state as `any`
🧠 **Strategy**: Show `useFetch<T>` — it covers generics, state typing, cleanup, and is practical

---

## 54. Typing Context with Generic Providers

### Q: How do you create a type-safe React Context with generics?

**Answer (Interview-Ready):**

**Problem:** `createContext` needs a default value, which often leads to `null` or `undefined` that every consumer must handle.

**Pattern 1: Non-null assertion with custom hook:**
```typescript
interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context; // Non-null, consumers don't need to check
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const login = async (creds: Credentials) => { /* ... */ };
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Pattern 2: Generic context factory:**
```typescript
function createSafeContext<T>(displayName: string) {
  const Context = createContext<T | null>(null);
  Context.displayName = displayName;

  function useContext_() {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`${displayName} context missing`);
    return ctx;
  }

  return [Context.Provider, useContext_] as const;
}

// Usage:
const [ThemeProvider, useTheme] = createSafeContext<ThemeContextType>('Theme');
```

**Pattern 3: with generic state:**
```typescript
function createStateContext<T>(initialState: T) {
  const Context = createContext<[T, React.Dispatch<React.SetStateAction<T>>] | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const state = useState<T>(initialState);
    return <Context.Provider value={state}>{children}</Context.Provider>;
  }

  function useStateContext() {
    const ctx = useContext(Context);
    if (!ctx) throw new Error('Missing provider');
    return ctx;
  }

  return { Provider, useStateContext };
}

const { Provider: CountProvider, useStateContext: useCount } = createStateContext(0);
```

**Follow-ups:**
- "Why not just set a default value?" → Default values are only used when no Provider wraps the consumer. This usually indicates a bug. Throwing an error catches it at runtime instead of silently using defaults
- "Performance concern with Context?" → Every state change re-renders ALL consumers. Split contexts (separate state from dispatch). Use `useMemo` on the value object. Consider Zustand/Jotai for fine-grained subscriptions
- "What about multiple contexts?" → Compose providers: create a `Providers` component that nests them. Or use a utility: `compose(AuthProvider, ThemeProvider, QueryProvider)`

🔥 **Most Asked**: Non-null context pattern, custom hook wrapper, generic context factory
⚠️ **Common Mistakes**: Passing `undefined` as default and not handling it; creating new objects in Provider value on every render (causes re-renders)
🧠 **Strategy**: Show Pattern 1 (most common). Then Pattern 2 if interviewer asks for reusability

---

## 55. Typing HOCs and Render Props

### Q: How do you type Higher-Order Components and Render Props in TypeScript?

**Answer (Interview-Ready):**

**Higher-Order Component (HOC):**
```typescript
// HOC that injects a `theme` prop
interface WithThemeProps {
  theme: Theme;
}

function withTheme<P extends WithThemeProps>(
  WrappedComponent: React.ComponentType<P>
) {
  const ComponentWithTheme = (props: Omit<P, keyof WithThemeProps>) => {
    const theme = useTheme();
    return <WrappedComponent {...(props as P)} theme={theme} />;
  };
  ComponentWithTheme.displayName = `withTheme(${WrappedComponent.displayName || WrappedComponent.name})`;
  return ComponentWithTheme;
}

// Usage:
interface MyComponentProps extends WithThemeProps { title: string; }
const MyComponent = ({ title, theme }: MyComponentProps) => <div>{title}</div>;
const Themed = withTheme(MyComponent);
// <Themed title="Hello" /> — theme is injected, not required from consumer
```

**Key typing trick:** `Omit<P, keyof WithThemeProps>` removes injected props from the consumer-facing API.

**Render Props:**
```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (renderProps: { data: T | null; loading: boolean; error: Error | null }) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const { data, loading, error } = useFetch<T>(url);
  return <>{children({ data, loading, error })}</>;
}

// Usage:
<DataFetcher<User[]> url="/api/users">
  {({ data, loading }) => loading ? <Spinner /> : <UserList users={data!} />}
</DataFetcher>
```

**Modern alternative — custom hooks replace both patterns:**
```typescript
// Instead of HOC or render props, just use a hook:
function MyComponent({ title }: { title: string }) {
  const theme = useTheme();
  const { data, loading } = useFetch<User[]>('/api/users');
  // ...
}
```

**Follow-ups:**
- "Are HOCs still relevant?" → Less common since hooks. Still used for cross-cutting concerns in class components, or when you need to intercept component rendering (error boundaries, analytics wrappers)
- "Why is typing HOCs hard?" → Generic forwarding: the HOC must preserve the wrapped component's prop types while removing injected props. The `Omit<P, keyof InjectedProps>` pattern solves this but is verbose
- "How to type forwardRef with HOC?" → Use `React.forwardRef` inside the HOC and accept `React.Ref<HTMLElement>` as a prop. It's complex — one more reason hooks are preferred

🔥 **Most Asked**: HOC prop typing with Omit, render props typing, hooks as modern replacement
⚠️ **Common Mistakes**: Not removing injected props from consumer API; losing displayName; not forwarding refs
🧠 **Strategy**: Show the HOC pattern, then say "In modern React I'd use a custom hook instead" — shows pragmatic thinking

---

## 56. tsconfig Deep Dive

### Q: Explain the most important tsconfig.json options. What should a strict config look like?

**Answer (Interview-Ready):**

**Critical options:**

```jsonc
{
  "compilerOptions": {
    // Strictness (ALWAYS enable all of these)
    "strict": true,                    // Enables ALL strict checks below:
    // "strictNullChecks": true,       // null/undefined must be handled
    // "strictFunctionTypes": true,    // No bivariant function param checking
    // "noImplicitAny": true,          // No implicit any types
    // "strictPropertyInitialization": true, // Class properties must be initialized

    // Module resolution
    "moduleResolution": "bundler",     // Modern: follows Vite/Webpack rules
    // "moduleResolution": "node16",   // For Node.js projects
    "module": "ESNext",                // Output ES modules
    "target": "ES2022",               // Modern JS output

    // Path aliases
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],                  // import from '@/components/Button'
      "@utils/*": ["./utils/*"]
    },

    // Quality
    "noUnusedLocals": true,            // Error on unused variables
    "noUnusedParameters": true,        // Error on unused parameters
    "noUncheckedIndexedAccess": true,  // Array[0] returns T | undefined (catches bugs!)
    "forceConsistentCasingInFileNames": true,

    // Output
    "declaration": true,               // Generate .d.ts files (for libraries)
    "sourceMap": true,                  // For debugging
    "isolatedModules": true,           // Required by Vite/esbuild (no cross-file type analysis)
    "skipLibCheck": true               // Skip checking node_modules .d.ts (faster)
  }
}
```

**Key options explained:**
- `strict: true` enables 7 strict flags at once. Always use this
- `noUncheckedIndexedAccess`: Makes `array[0]` return `T | undefined` instead of `T`. Catches real bugs
- `isolatedModules`: Required for Vite, esbuild, SWC. Each file must be compilable independently. Prevents: `const enum` cross-file inlining, `export =` syntax
- `moduleResolution: "bundler"`: Newest mode (TS 5.0+). Understands package.json `exports`, doesn't require file extensions in imports

**Follow-ups:**
- "What does `strict: true` actually enable?" → strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitAny, noImplicitThis, alwaysStrict
- "`skipLibCheck` — doesn't this hide errors?" → It skips checking node_modules .d.ts files. Saves 30-50% compilation time. Library types are already checked by library authors. Recommended by TS team
- "Path aliases and bundler — do they conflict?" → TS resolves aliases for type checking but doesn't transform imports. You must also configure Vite/Webpack to resolve the same aliases at build time

🔥 **Most Asked**: strict mode flags, moduleResolution options, path aliases, isolatedModules
⚠️ **Common Mistakes**: Not enabling strict; using `moduleResolution: "node"` (legacy) with modern bundlers; forgetting to configure path aliases in bundler too
🧠 **Strategy**: Say "I always start with strict: true and isolatedModules: true." Then discuss noUncheckedIndexedAccess as a bonus strictness flag

---

## 57. Declaration Files (.d.ts)

### Q: What are declaration files? When do you write them?

**Answer (Interview-Ready):**

**Declaration files** (`.d.ts`) describe the types of JavaScript code without containing implementation. They're the bridge between JS and TS.

**When you encounter them:**
- `node_modules/@types/react/index.d.ts` — Types for React (from DefinitelyTyped)
- Generated by `tsc --declaration` when publishing a TS library
- Manual `.d.ts` files for untyped JS libraries or global variables

**Writing a declaration file for a JS library:**
```typescript
// types/analytics.d.ts
declare module 'analytics-sdk' {
  interface AnalyticsConfig {
    apiKey: string;
    debug?: boolean;
  }

  interface Analytics {
    init(config: AnalyticsConfig): void;
    track(event: string, properties?: Record<string, unknown>): void;
    identify(userId: string, traits?: Record<string, unknown>): void;
  }

  const analytics: Analytics;
  export default analytics;
}
```

**Augmenting existing types (declaration merging):**
```typescript
// types/global.d.ts
declare global {
  interface Window {
    __APP_CONFIG__: { apiUrl: string; version: string };
  }
}

// types/express.d.ts — extend Express Request
declare module 'express' {
  interface Request {
    user?: { id: string; role: string };
  }
}
```

**Ambient declarations (globals):**
```typescript
// types/env.d.ts
declare const __DEV__: boolean;
declare const __VERSION__: string;

// Vite env variables
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}
```

**Follow-ups:**
- "Where do `@types/*` packages come from?" → DefinitelyTyped — a community-maintained repo. `npm install @types/lodash` installs type declarations for lodash. TS auto-discovers them in `node_modules/@types/`
- "What if there are no types for a library?" → (1) Write a minimal `.d.ts` file. (2) Use `declare module 'library-name'` to type as `any`. (3) Contribute types to DefinitelyTyped
- "`declare` vs regular code?" → `declare` tells TS "this exists at runtime, trust me." No code is emitted. Used for ambient declarations (globals, non-TS modules)

🔥 **Most Asked**: Writing .d.ts for untyped libraries, augmenting Window/Express types, @types packages
⚠️ **Common Mistakes**: Forgetting `export {}` to make a file a module (needed for `declare global`); not configuring typeRoots in tsconfig
🧠 **Strategy**: Show the Window augmentation and Express Request extension — both are common real-world needs

---

## 58. TypeScript with Vite vs Webpack

### Q: How does TypeScript work with Vite vs Webpack? What are the differences?

**Answer (Interview-Ready):**

| Aspect | Vite + TS | Webpack + TS |
|--------|----------|-------------|
| **Type checking** | NOT done by Vite. Use `tsc --noEmit` or `vue-tsc` separately | `ts-loader` or `fork-ts-checker-webpack-plugin` |
| **Transpilation** | esbuild (20-30x faster than tsc) | `ts-loader` (tsc) or `babel-loader` + `@babel/preset-typescript` |
| **Dev mode** | Native ESM. No bundling in dev. Files served on demand | Bundles everything for dev server |
| **`isolatedModules`** | **Required** (esbuild compiles file-by-file) | Optional (ts-loader can do cross-file analysis) |
| **HMR speed** | ~50ms (only transpile changed file) | ~500ms-2s (re-bundle affected modules) |
| **Build** | Rollup (production bundle) | Webpack (production bundle) |

**Vite approach:**
```
Dev: Browser requests file → Vite intercepts → esbuild transpiles TS→JS → serves
Build: Rollup bundles all files → esbuild/SWC transpiles → production output

Type checking: Separate process — `tsc --noEmit --watch` or IDE (VS Code)
```

**Webpack approach:**
```
Dev: Webpack bundles ALL files → ts-loader compiles → serve bundle
Build: Same pipeline, with optimizations (minification, tree-shaking)

Type checking: ts-loader does it during compilation (slower) or fork-ts-checker-webpack-plugin (parallel)
```

**Why Vite is faster:**
1. **No bundling in dev** — serves ESM directly. Only transforms the requested file
2. **esbuild** is written in Go — 20-30x faster than tsc (TypeScript compiler) or Babel
3. **On-demand compilation** — only compiles files when browser requests them, not the entire project

**Key config differences:**
```typescript
// vite.config.ts — minimal, TS works out of the box
import { defineConfig } from 'vite';
export default defineConfig({
  // TS just works. No loader config needed.
});

// webpack.config.js — must configure TS loader
module.exports = {
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/,
    }],
  },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
};
```

**Follow-ups:**
- "Can Vite do type checking?" → Not natively. Options: (1) `vite-plugin-checker` for in-browser type errors, (2) `tsc --noEmit` in CI, (3) rely on IDE. This is intentional — separating transpilation from type checking is faster
- "What about SWC?" → Rust-based JS compiler (#1 in speed). Webpack uses it via `swc-loader`. Vite can use it via `@vitejs/plugin-react-swc`. Even faster than esbuild for some workloads
- "Should new projects use Vite or Webpack?" → Vite for almost all new projects. Webpack for: legacy projects, complex build customization, Module Federation (Vite support is experimental). Turbopack (Webpack successor) is emerging

🔥 **Most Asked**: Why Vite is faster, isolatedModules requirement, type checking strategy with Vite
⚠️ **Common Mistakes**: Expecting Vite to do type checking; not enabling isolatedModules; using ts-loader without fork-ts-checker (slow)
🧠 **Strategy**: Explain the key insight: "Vite separates transpilation (fast, esbuild) from type checking (separate tsc). This is why dev mode is near-instant"

---
---

> **End of Part 06 — JavaScript, Browser & TypeScript Internals**
> 58 topics covering JS execution model, browser rendering, network, and TypeScript type system
> Next: [02 — Architecture, Databases & Infrastructure](02_Architecture_Databases.md)

<!-- END_OF_CONTENT -->
