# Day 1 — V8 Engine, Execution Context, Call Stack

> **Target Roles:** Google Senior/Staff, Meta, Microsoft, Stripe, Netflix, Airbnb, Uber, Adobe, Cisco, Qualcomm, Salesforce  
> **Difficulty:** Foundation — but probed at Staff level at Google/Meta  
> **Interview Frequency:** Very High

---

## Quick Reference (Interview Answer Starters)

| Topic | One-Liner |
|---|---|
| V8 Pipeline | "V8 parses JS into an AST, Ignition compiles that to bytecode, and TurboFan JIT-compiles hot paths to optimized machine code — all at runtime." |
| Execution Context | "An Execution Context is the environment V8 creates to track scope, variables, and `this` each time code is evaluated — it has a creation phase and an execution phase." |
| Call Stack | "The call stack is a LIFO data structure that tracks active execution contexts; each function call pushes a frame, each return pops it." |
| TDZ | "The Temporal Dead Zone is the period between when `let`/`const` bindings are created in memory and when the declaration line is actually reached — accessing them in this window throws a ReferenceError." |
| Hoisting | "All declarations are processed before execution: `var` is initialized to `undefined`, function declarations are fully hoisted, but `let`/`const` are hoisted without initialization, creating the TDZ." |
| Scope Chain | "The scope chain is a linked list of Lexical Environments, frozen at function *definition* time via `[[Scope]]`, that JS walks to resolve free variable lookups." |
| Inline Cache | "An Inline Cache is V8's mechanism to short-circuit property lookups by caching the hidden class of an object at a call site; polymorphic access (multiple shapes) degrades or destroys this optimization." |
| Deoptimization | "TurboFan deoptimizes a function when its runtime assumptions are violated — e.g., a variable's type changes — and Ignition re-executes it until it's hot enough to re-JIT." |

---

## Deep Dive Notes

### Topic 1: How V8 Works

#### 1.1 The Full Pipeline

```
Source Text
    │
    ▼
[Scanner / Tokenizer]   — breaks text into tokens (identifiers, literals, operators)
    │
    ▼
[Parser]                — builds AST; also does early syntax error detection
    │
    ▼
[AST]                   — tree representation of program structure
    │
    ▼
[Ignition]              — AST → bytecode (register-based VM)
    │                     runs immediately; collects type feedback
    │  (hot path detected)
    ▼
[TurboFan]              — type-specialized machine code (JIT)
    │
    ▼
[Optimized Machine Code]

    ⚠️  If runtime assumptions break:
    Optimized Code → DEOPTIMIZATION → back to Ignition bytecode
```

**Why this matters for interviews:** Saying "JavaScript is interpreted" is wrong. It's a mix: interpreted by Ignition first, JIT-compiled by TurboFan for hot code. This is the key distinction that separates informed candidates from the rest.

#### 1.2 Ignition (Bytecode Interpreter)

- Ignition is a **register-based** bytecode interpreter (not stack-based like older V8).
- It generates compact bytecode from the AST — typically 25-50% smaller than machine code.
- It executes immediately, collecting **type feedback** at each call site into **Feedback Vectors**.
- Lazy compilation: V8 only parses and compiles functions when they're first called (pre-parsing skips the full AST for functions not yet needed).

#### 1.3 TurboFan (JIT Compiler)

- TurboFan kicks in when a function becomes "hot" — executed enough times that the JIT overhead is worth it (typically after ~1000–2000 invocations based on invocation counters).
- It uses the **type feedback** Ignition collected to make **speculative optimizations**:
  - If a variable has always been a `number`, TurboFan emits machine code that assumes it's always a `number` — skipping type checks entirely.
  - If a property has always been accessed on objects of the same **hidden class**, TurboFan inlines the memory offset directly.
- The output is architecture-specific machine code (x64, ARM64, etc.).

#### 1.4 Deoptimization

**Deoptimization** occurs when TurboFan's speculative assumptions are violated at runtime.

**Common developer-triggered causes:**

| Cause | Example | Why it Deoptimizes |
|---|---|---|
| Type polymorphism | `x` is sometimes `int`, sometimes `float` | TurboFan compiled for one numeric representation |
| Hidden class change | Adding property after construction | Object's shape no longer matches the compiled offset |
| `arguments` object | Using `arguments` in a hot function | Prevents certain array optimizations |
| `try/catch` in hot path | Wrapping tight loop in try/catch | Older V8 couldn't JIT across exception handlers (improved in recent V8) |
| `eval()` | `eval` inside a function | Prevents static scope analysis |
| Megamorphic call sites | >4 different hidden classes at one call site | IC goes megamorphic, TurboFan can't inline |

```javascript
// DEOPT TRIGGER: type change
function add(a, b) { return a + b; }

// Train TurboFan with integers
for (let i = 0; i < 10000; i++) add(i, i);

// Now violate: float input → deoptimization
add(1.1, 2.2);  // TurboFan deoptimizes, falls back to Ignition
```

**Performance consequence:** Deoptimization is relatively cheap (a few microseconds), but if it happens in a tight loop, the cumulative cost can be significant. The real cost is re-JITting the function afterward.

#### 1.5 Inline Caches (ICs)

An **Inline Cache** is a call-site-level optimization. When V8 executes a property access like `obj.x`, it:
1. Checks `obj`'s **hidden class** (also called "map" internally).
2. If the hidden class matches the cached one, it reads `x` directly from the cached memory offset — O(1), no hash lookup.
3. If it doesn't match, it falls back to a full lookup and updates the cache.

**IC States:**

| State | Description | Performance |
|---|---|---|
| **Uninitialized** | Never executed | — |
| **Monomorphic** | One hidden class seen | 🟢 Fastest — direct offset |
| **Polymorphic** | 2–4 hidden classes | 🟡 Slight overhead — linear check |
| **Megamorphic** | 5+ hidden classes | 🔴 No cache — global hash table lookup |

```javascript
// MONOMORPHIC — fast
function getX(obj) { return obj.x; }
const a = { x: 1 };
const b = { x: 2 };
getX(a); getX(b); // same hidden class → monomorphic IC

// POLYMORPHIC → MEGAMORPHIC — slow
function getX(obj) { return obj.x; }
getX({ x: 1 });
getX({ x: 1, y: 2 });       // different shape
getX({ x: 1, y: 2, z: 3 }); // different shape again
getX({ a: 1, x: 4 });       // 4th shape → polymorphic
getX({ b: 1, x: 5 });       // 5th shape → MEGAMORPHIC
```

**Hidden classes and object construction order:**

```javascript
// SAME hidden class — both objects created identically
function Point(x, y) { this.x = x; this.y = y; }
const p1 = new Point(1, 2);
const p2 = new Point(3, 4); // ✅ same hidden class

// DIFFERENT hidden class — property insertion order differs
const q1 = {}; q1.x = 1; q1.y = 2;
const q2 = {}; q2.y = 2; q2.x = 1; // ❌ different hidden class!
```

---

### Topic 2: Execution Context

#### 2.1 What Is an Execution Context?

An **Execution Context (EC)** is a specification mechanism — a conceptual record V8 maintains whenever it needs to evaluate JavaScript code. It contains everything needed to execute that code: where variables live, what `this` is, and a reference to the outer scope.

Think of it as the "runtime environment" for a piece of code.

#### 2.2 Three Types

| Type | Created When | `this` Binding |
|---|---|---|
| **Global EC** | Script first loads | `window` (browser) / `global` (Node) / `{}` (module) |
| **Function EC** | Every function call | Depends on call-site (dynamic binding) |
| **Eval EC** | `eval()` executes | Inherits caller's `this` |

For interviews: mention that **Module EC** is also a thing in ES Modules (its `this` is `undefined` at top level).

#### 2.3 Two Phases

**Phase 1 — Creation Phase** (before any code runs):

1. **Variable Environment** created:
   - Scans for `var` declarations → allocates bindings, initializes to `undefined`
   - Scans for function declarations → allocates bindings, stores full function object
2. **Lexical Environment** created:
   - Scans for `let`/`const` declarations → allocates bindings, leaves **uninitialized** (TDZ begins)
   - Creates `arguments` object (for non-arrow functions)
3. **`this` binding** determined (based on how the function was called)
4. **Outer Environment Reference** set (pointer to enclosing Lexical Environment)

**Phase 2 — Execution Phase** (code runs line by line):

- Variables are assigned actual values as their assignment statements are reached
- `let`/`const` bindings become initialized when their declaration line is reached (TDZ ends)
- Functions are called, pushing new ECs

#### 2.4 Variable Environment vs Lexical Environment

In the ES spec these are actually two separate records within an EC:

- **Variable Environment**: stores `var` bindings and function declarations. Historically stays stable.
- **Lexical Environment**: stores `let`/`const` bindings and the `arguments` object. Can change (e.g., inside blocks — each block creates a new Lexical Environment).

In practice, at function scope they overlap, but the distinction matters for **block scoping**: `let`/`const` inside `{ }` create a new inner Lexical Environment, while `var` always goes to the Variable Environment of the containing function.

---

### Topic 3: Call Stack

#### 3.1 What the Call Stack Is

The call stack is a **LIFO (Last In, First Out)** runtime data structure that tracks active Execution Contexts. It has a fixed maximum size (configurable in Node, ~10,000–15,000 frames in V8 by default, varies by platform and available stack memory).

Each entry on the call stack is called a **stack frame**.

#### 3.2 Stack Frame Contents

A stack frame contains:
- Reference to the current Execution Context (variable bindings, `this`)
- **Return address** — where to return to after this function completes
- **Arguments** passed to the function
- Local variable storage (on the actual memory stack)

#### 3.3 Stack Overflow

A stack overflow occurs when the call stack exceeds its maximum depth. V8 throws:

```
RangeError: Maximum call stack size exceeded
```

**Common causes:**
- Infinite recursion (missing or unreachable base case)
- Mutual recursion between two functions with no termination
- Accidentally passing wrong arguments that skip the base case

#### 3.4 Reading a Call Stack in Chrome DevTools

In DevTools → Sources → Breakpoint:
- **Bottom** of the Call Stack panel = oldest frame (usually `(anonymous)` for the global script)
- **Top** of the panel = current frame
- Click any frame to inspect its local variables and `this`
- Grayed-out frames are V8 internals or browser APIs

---

### Topic 4: Scope Chain & Lexical Environment

#### 4.1 `[[Scope]]` — The Hidden Property

Every function has an internal `[[Scope]]` slot set **at the moment the function is defined** (not when it's called). This slot holds a reference to the Lexical Environment that was active when the function was created.

This is the foundation of **closures** — a function carries its birth environment with it.

#### 4.2 How the Scope Chain Is Built

When a function EC is created during the Execution Phase, its Lexical Environment's **outer reference** is set from the function's `[[Scope]]`. This creates a chain:

```
inner EC's Lexical Env
    │ outer reference
    ▼
outer EC's Lexical Env
    │ outer reference
    ▼
Global Lexical Env
    │ outer reference
    ▼
null
```

#### 4.3 Variable Lookup Algorithm

1. Search current EC's Lexical Environment.
2. If not found, follow `outer` reference to the enclosing environment.
3. Repeat until found or `null` is reached.
4. If `null` reached without finding the variable: `ReferenceError` (strict mode) or implicit global (sloppy mode for assignments).

#### 4.4 Scope Chain vs Prototype Chain

| | Scope Chain | Prototype Chain |
|---|---|---|
| **What it resolves** | Variable/identifier lookups | Property lookups on objects |
| **Built at** | Function definition time | Object creation time |
| **Linked via** | `outer` environment reference / `[[Scope]]` | `[[Prototype]]` / `__proto__` |
| **Terminates at** | `null` (global scope exhausted) | `null` (`Object.prototype.__proto__`) |
| **ReferenceError if not found?** | Yes (in strict mode) | No — returns `undefined` |

---

### Topic 5: Hoisting Deep Dive

#### 5.1 What Hoisting Actually Is

"Hoisting" is a mental model for what happens during the **Creation Phase**: declarations are processed before execution begins. The code doesn't physically move. V8 scans the scope for declarations first, sets up bindings, then runs the code.

#### 5.2 `var` Hoisting

- Declaration is processed in the Creation Phase.
- Binding is **initialized to `undefined`** immediately.
- Assignment happens when the assignment line is reached in the Execution Phase.

```javascript
console.log(x); // undefined — NOT ReferenceError
var x = 5;
console.log(x); // 5
```

#### 5.3 `let` / `const` Hoisting (TDZ)

- Declarations ARE processed in the Creation Phase (they ARE hoisted).
- Bindings are created but left **uninitialized** — this is the **Temporal Dead Zone**.
- Accessing a TDZ binding throws `ReferenceError`.
- The TDZ ends when execution reaches the declaration line.

```javascript
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 5;
```

#### 5.4 Function Declaration Hoisting

Function **declarations** are fully hoisted — both the binding and the function object.

```javascript
greet(); // "Hello" — works before declaration
function greet() { console.log("Hello"); }
```

#### 5.5 Function Expression Hoisting

Function **expressions** follow the rules of their assignment target (`var` vs `let`/`const`):

```javascript
fn(); // TypeError: fn is not a function
var fn = function() { console.log("Hi"); };
// fn is hoisted as undefined; calling undefined() → TypeError

fn2(); // ReferenceError: Cannot access 'fn2' before initialization
let fn2 = function() { console.log("Hi"); };
```

---

## Visual Diagrams (ASCII)

### Diagram 1: V8 Compilation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         V8 COMPILATION PIPELINE                         │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  Source Code │  "function add(a,b) { return a + b; }"
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Scanner    │  Tokenizes: [function][add][(][a][,][b][)][{]...
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │    Parser    │  Syntax checking, builds tree
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │         AST (Abstract Syntax Tree)   │
  │  FunctionDeclaration                 │
  │    ├─ id: "add"                      │
  │    ├─ params: [a, b]                 │
  │    └─ body: ReturnStatement          │
  │              └─ BinaryExpr (+)       │
  │                   ├─ Identifier(a)   │
  │                   └─ Identifier(b)   │
  └──────┬───────────────────────────────┘
         │
         ▼
  ┌──────────────┐    Executes immediately
  │   IGNITION   │◄── Collects type feedback
  │  (Bytecode)  │    "a and b have always been integers"
  └──────┬───────┘
         │ function becomes HOT (~1000+ calls)
         │ type feedback collected
         ▼
  ┌──────────────┐    Speculative optimization
  │  TURBOFAN    │    Emits optimized machine code
  │  (JIT/Opt)   │    assuming types stay consistent
  └──────┬───────┘
         │
         ▼
  ┌──────────────────┐
  │  Machine Code    │  Direct CPU instructions (x64/ARM64)
  │  (Optimized)     │
  └──────┬───────────┘
         │  ⚠️  if type changes at runtime:
         ▼
  ┌──────────────┐
  │DEOPTIMIZATION│  Back to Ignition bytecode
  └──────────────┘
```

### Diagram 2: Call Stack — 3 Levels of Nesting

```
  outer() called → inner() called → console.log() called
  
  ┌─────────────────────────────────┐
  │         CALL STACK              │
  │  ┌───────────────────────────┐  │
  │  │  console.log(x, y, z)    │  │◄── TOP (currently executing)
  │  │  [Frame 3]                │  │
  │  │  this: undefined(strict)  │  │
  │  ├───────────────────────────┤  │
  │  │  inner()                  │  │
  │  │  [Frame 2]                │  │
  │  │  z = 3                    │  │
  │  │  return addr → outer:L5   │  │
  │  ├───────────────────────────┤  │
  │  │  outer()                  │  │
  │  │  [Frame 1]                │  │
  │  │  y = 2                    │  │
  │  │  return addr → global:L9  │  │
  │  ├───────────────────────────┤  │
  │  │  Global EC                │  │
  │  │  [Frame 0]                │  │◄── BOTTOM
  │  │  x = 1                    │  │
  │  └───────────────────────────┘  │
  └─────────────────────────────────┘
  
  Execution flow:
  console.log returns → Frame 3 popped
  inner returns      → Frame 2 popped
  outer returns      → Frame 1 popped
  Script ends        → Frame 0 removed
```

### Diagram 3: Execution Context — Creation Phase vs Execution Phase

```
  var x = 1;
  let y = 2;
  function greet() { ... }

  ════════════════════════════════════════════════════════════
  CREATION PHASE (before any code runs)
  ════════════════════════════════════════════════════════════

  Global Execution Context
  ┌─────────────────────────────────────────────────────┐
  │  Variable Environment                                │
  │    x: undefined       ← var, initialized to undef   │
  │    greet: fn(){}      ← function decl, FULLY hoisted│
  │                                                      │
  │  Lexical Environment                                 │
  │    y: <uninitialized> ← let/const, TDZ begins!      │
  │                                                      │
  │  this: window / global                               │
  │  outer: null                                         │
  └─────────────────────────────────────────────────────┘

  ════════════════════════════════════════════════════════════
  EXECUTION PHASE (code runs line by line)
  ════════════════════════════════════════════════════════════

  Line 1: var x = 1;
  ┌─────────────────────────────────────────────────────┐
  │  x: 1          ← assigned                           │
  │  y: <uninit>   ← TDZ still active                   │
  │  greet: fn(){} ← already fully available            │
  └─────────────────────────────────────────────────────┘

  Line 2: let y = 2;
  ┌─────────────────────────────────────────────────────┐
  │  x: 1                                               │
  │  y: 2          ← TDZ ENDS, binding initialized      │
  │  greet: fn(){}                                       │
  └─────────────────────────────────────────────────────┘
```

### Diagram 4: Scope Chain Variable Lookup

```
  var global_x = 'global';

  function outer() {
    var outer_y = 'outer';

    function inner() {
      var inner_z = 'inner';
      console.log(global_x); // lookup: inner → outer → global ✓
    }
  }

  ┌─────────────────────────┐
  │  inner EC               │
  │  inner_z: 'inner'       │
  │  outer ─────────────────┼──────────────────────────┐
  └─────────────────────────┘                          │
                                                        ▼
                               ┌─────────────────────────────┐
                               │  outer EC                    │
                               │  outer_y: 'outer'            │
                               │  outer ───────────────────────┼──────┐
                               └─────────────────────────────┘      │
                                                                      ▼
                                              ┌─────────────────────────────┐
                                              │  Global EC                   │
                                              │  global_x: 'global'  ✓ found│
                                              │  outer: null                 │
                                              └─────────────────────────────┘

  Lookup for `global_x`:
  Step 1: Search inner EC → not found
  Step 2: Follow outer ref → search outer EC → not found
  Step 3: Follow outer ref → search Global EC → FOUND ✓
```

---

## Code Examples

### Example 1: Execution Context Creation — Step-by-Step Trace

```javascript
var a = 10;
let b = 20;

function multiply(x, y) {
  var result = x * y;
  return result;
}

var product = multiply(a, b);
console.log(product); // 200
```

**Step-by-step trace:**

```
CREATION PHASE — Global EC:
  Variable Env:  a = undefined, product = undefined
  Function Decl: multiply = <function object>
  Lexical Env:   b = <uninitialized>  ← TDZ
  this: window

EXECUTION PHASE — Global EC:
  Line 1: a = 10
  Line 2: b = 20  ← TDZ ends for b

  Line 8: multiply(a, b) called
    → PUSH new Function EC for multiply
      CREATION PHASE — multiply EC:
        Variable Env: result = undefined
        Lexical Env:  (no let/const)
        Arguments:    { 0: 10, 1: 20 }
        this: window (sloppy mode call)
        outer: → Global Lexical Env (from multiply's [[Scope]])

      EXECUTION PHASE — multiply EC:
        Line: result = 10 * 20 = 200
        Line: return 200
    → POP multiply EC

  Back in Global EC:
  Line 8: product = 200
  Line 9: console.log(200) → "200"
```

### Example 2: TDZ in Action

```javascript
// ❌ ReferenceError — accessing let before initialization
function demo() {
  console.log(x); // ReferenceError: Cannot access 'x' before initialization
  let x = 5;
  console.log(x); // never reached
}
demo();

// ✅ undefined — var is initialized to undefined in creation phase
function demo2() {
  console.log(y); // undefined — NOT an error
  var y = 5;
  console.log(y); // 5
}
demo2();

// ❌ TDZ applies to the WHOLE BLOCK, even if outer scope has the same name
let z = 'outer';
{
  console.log(z); // ReferenceError — inner z is in TDZ, shadows outer z
  let z = 'inner';
}
```

### Example 3: Hoisting Surprises

```javascript
// === var hoisting ===
console.log(a); // undefined
var a = 1;
console.log(a); // 1

// === function declaration — FULLY hoisted ===
greet(); // "Hello!" — works before declaration
function greet() { console.log("Hello!"); }

// === function expression with var — PARTIALLY hoisted ===
try {
  sayHi(); // TypeError: sayHi is not a function
} catch(e) { console.log(e.message); }
var sayHi = function() { console.log("Hi!"); };

// === function expression with let — TDZ ===
try {
  sayBye(); // ReferenceError: Cannot access 'sayBye' before initialization
} catch(e) { console.log(e.message); }
let sayBye = function() { console.log("Bye!"); };

// === TRICKY: var inside block — hoisted to function scope ===
function test() {
  if (true) {
    var blockVar = "I'm hoisted to function scope";
    let blockLet = "I'm block-scoped";
  }
  console.log(blockVar); // "I'm hoisted to function scope"
  console.log(blockLet); // ReferenceError
}
test();
```

### Example 4: Stack Overflow + Iterative Fix

```javascript
// ❌ STACK OVERFLOW — recursive factorial
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
// factorial(100000) → RangeError: Maximum call stack size exceeded

// ✅ ITERATIVE FIX — O(1) stack space
function factorialIterative(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
factorialIterative(100000); // Works — single stack frame

// ✅ TRAMPOLINE — keeps recursive style, avoids stack growth
function trampoline(fn) {
  return function(...args) {
    let result = fn(...args);
    while (typeof result === 'function') {
      result = result();
    }
    return result;
  };
}

function factorialTrampoline(n, acc = 1) {
  if (n <= 1) return acc;
  return () => factorialTrampoline(n - 1, n * acc); // returns thunk, not recursive call
}

const safeFactorial = trampoline(factorialTrampoline);
safeFactorial(100000); // Works — thunks evaluated in a loop
```

### Example 5: Scope Chain Variable Lookup

```javascript
var level1 = 'global';

function outer() {
  var level2 = 'outer';

  function middle() {
    var level3 = 'middle';

    function inner() {
      // Each lookup walks the chain:
      console.log(level3); // found in inner's outer → middle EC
      console.log(level2); // found in middle's outer → outer EC
      console.log(level1); // found in outer's outer → global EC
      console.log(level4); // ReferenceError — not found anywhere
    }
    inner();
  }
  middle();
}
outer();

// Demonstrating [[Scope]] is set at DEFINITION time:
function makeCounter() {
  let count = 0;
  return function increment() {
    count++; // captured from makeCounter's env at DEFINITION time
    return count;
  };
}
const counter = makeCounter();
counter(); // 1
counter(); // 2
// makeCounter has long returned, but increment still has access to count
// because [[Scope]] was set when increment was defined inside makeCounter
```

### Example 6: Inline Cache Breaking (Polymorphic Access)

```javascript
// ✅ MONOMORPHIC — fast IC
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function sumCoords(point) {
  return point.x + point.y; // IC sees same hidden class every call
}

const points = Array.from({ length: 10000 }, (_, i) => new Point(i, i));
points.forEach(p => sumCoords(p)); // stays monomorphic → fast

// ❌ POLYMORPHIC → MEGAMORPHIC — IC breaks
function getX(obj) {
  return obj.x;
}

// Each object has a different shape (hidden class):
getX({ x: 1 });                     // shape A
getX({ x: 1, y: 2 });               // shape B
getX({ x: 1, y: 2, z: 3 });        // shape C
getX({ name: 'a', x: 4 });         // shape D
getX({ meta: {}, x: 5 });          // shape E → MEGAMORPHIC

// ❌ Also breaks IC: adding properties after construction
const obj1 = {};
const obj2 = {};
obj1.x = 1;       // shape: {x}
obj2.x = 1;
obj2.y = 2;       // shape: {x, y} — different from obj1!
// obj1 and obj2 have different hidden classes even though they look similar

// ✅ FIX: Always initialize all properties in the constructor in the same order
class FixedShape {
  constructor(x, y) {
    this.x = x;
    this.y = y; // consistent shape — monomorphic IC
  }
}
```

---

## Common Interview Traps

### Trap 1: "JavaScript is interpreted"

**What most engineers say:** "JavaScript is an interpreted language."

**Why it's wrong:** This was true for early JS engines. Modern V8 uses a multi-tier compilation strategy — Ignition compiles to bytecode (not purely interpreted), and TurboFan JIT-compiles hot paths to native machine code. It's a **JIT-compiled language** with an interpreter as the first tier.

**What to say instead:** "JavaScript is JIT-compiled — V8 interprets bytecode via Ignition initially and compiles hot paths to optimized machine code via TurboFan."

---

### Trap 2: "let/const are not hoisted"

**What most engineers say:** "`let` and `const` are not hoisted."

**Why it's wrong:** They ARE hoisted — V8 processes their declarations in the creation phase. The distinction is they're not *initialized*. The TDZ is proof of hoisting: if they weren't hoisted, the inner block example below would print `'outer'` instead of throwing.

```javascript
let x = 'outer';
{
  console.log(x); // ReferenceError — if let weren't hoisted, this would log 'outer'
  let x = 'inner';
}
```

**What to say:** "Both `var` and `let`/`const` are hoisted, but `var` is initialized to `undefined` while `let`/`const` are left uninitialized — entering the TDZ."

---

### Trap 3: Confusing the scope chain with the call stack

**What most engineers say:** "The scope chain is determined by where the function is called."

**Why it's wrong:** The scope chain is determined by where the function is **defined** (lexical scoping), captured via `[[Scope]]`. The call stack tracks runtime execution; the scope chain tracks variable resolution.

```javascript
var x = 'global';
function getX() { return x; } // [[Scope]] set here — captures global env

function run() {
  var x = 'local'; // doesn't matter — getX's [[Scope]] doesn't include run's env
  return getX();   // logs 'global', not 'local'
}
run(); // 'global'
```

---

### Trap 4: Thinking `var` inside a block is block-scoped

**What most engineers expect:**

```javascript
if (true) { var x = 5; }
console.log(x); // Most expect ReferenceError
```

**What actually happens:** `x` is function-scoped (or global-scoped if at top level). `var` ignores block boundaries. Only `let`/`const` and function declarations (in strict mode) are block-scoped.

---

### Trap 5: Confusing `TypeError` vs `ReferenceError` for function expressions

```javascript
fn();           // TypeError: fn is not a function   (var fn = ...)
let fn2 = ...;
fn2();          // ReferenceError (TDZ)
```

Interviewers at Google/Stripe specifically ask what *kind* of error is thrown. `TypeError` means "you tried to call something that exists but isn't a function." `ReferenceError` means "the identifier doesn't exist or is in TDZ."

---

## 10/10 Answer Templates

### Q: "How does V8 work?"

> "V8 starts by tokenizing and parsing JavaScript source into an Abstract Syntax Tree. From there, Ignition — V8's bytecode interpreter — compiles the AST into compact bytecode and begins executing it immediately. This gets the code running fast with minimal startup overhead.
>
> While Ignition runs, it collects type feedback at each call site — tracking what types of values variables actually hold at runtime. When a function becomes 'hot,' meaning it's been called enough times that the JIT overhead pays off, TurboFan kicks in. TurboFan uses that type feedback to make speculative assumptions — for example, if `x` has always been an integer, it compiles native machine code that skips type checks entirely.
>
> The result is highly optimized native code that runs orders of magnitude faster than bytecode. The risk is deoptimization: if a runtime assumption is violated — say, `x` suddenly gets a string — V8 detects this, throws away the optimized code, and falls back to Ignition. Well-written JS code keeps types consistent to stay in the optimized path."

---

### Q: "What is an Execution Context?"

> "An Execution Context is the runtime environment V8 creates every time it needs to execute code — once for the global script, once per function call, and once for any eval. Each EC goes through two phases.
>
> In the creation phase, V8 scans the scope for all declarations before running a single line. `var` declarations and function declarations are registered immediately — `var` gets initialized to `undefined`, function declarations get the full function object. `let` and `const` are also registered but left uninitialized, creating the Temporal Dead Zone. The EC also sets `this` and stores a reference to the outer Lexical Environment for scope chain resolution.
>
> In the execution phase, code runs line by line, assignments happen, and `let`/`const` bindings become initialized when their declaration line is reached. Stacking these ECs onto the call stack is how V8 tracks the current execution position — when a function returns, its EC is popped off the stack."

---

### Q: "What is the Temporal Dead Zone?"

> "The TDZ is the time window between when a `let` or `const` binding is created in memory — during the creation phase — and when execution reaches its declaration line. During this window, the binding exists but is uninitialized, and any read or write throws a `ReferenceError`.
>
> People often think `let` and `const` aren't hoisted, but that's incorrect — they are hoisted. The evidence is this: if you shadow an outer `let` with an inner `let` inside a block, accessing the variable before the inner declaration throws, even though the outer variable is in scope. If `let` weren't hoisted, it would resolve to the outer one. The TDZ is the spec's way of enforcing that you can't use a binding before it's initialized.
>
> The key difference from `var`: `var` is hoisted AND initialized to `undefined`, so accessing it before assignment silently returns `undefined` — a common source of bugs. TDZ turns that silent failure into an explicit error, which is strictly safer behavior."

---

### Q: "What happens when the call stack overflows?"

> "When the call stack exceeds V8's maximum depth — typically around 10,000–15,000 frames, though this varies by environment and available memory — V8 throws a `RangeError: Maximum call stack size exceeded`. At that point, execution stops; there's no way to catch your way to a healthy stack because you're already out of space.
>
> The most common cause is unbounded recursion — either infinite recursion with no base case, or a base case that's never reached due to a logic error.
>
> The standard fix is converting the recursion to iteration using an explicit stack data structure on the heap — which doesn't have the same size constraints. You maintain a stack as a JavaScript array, push/pop manually, and avoid adding frames to the call stack. For recursive algorithms like tree traversal or DFS, this is often cleaner anyway.
>
> A more elegant but less common approach is a **trampoline**: you rewrite the recursive function to return thunks — zero-argument functions — instead of calling itself recursively. A trampoline wrapper then drives execution in a while loop, calling each thunk until a non-function value is returned. This preserves the recursive style while executing in O(1) stack space."

---

## Interview Questions (with Answers)

### Q1 ⭐ (Medium | Google, Meta) — V8 Compilation vs Interpretation, JIT

**Q:** Explain the difference between the compilation and interpretation phases in V8. What is JIT compilation and why does it matter for performance?

**A:**

V8's execution pipeline has multiple tiers, and the line between compilation and interpretation is intentionally blurred.

**Interpretation tier (Ignition):** When V8 first encounters a function, Ignition compiles its AST to bytecode — a compact, platform-independent instruction set. Ignition then *interprets* this bytecode by dispatching each instruction to a corresponding C++ handler. This is technically compilation (source → bytecode) followed by interpretation (bytecode → execution). The benefit: fast startup, low memory, no JIT overhead for code that runs once.

**JIT compilation tier (TurboFan):** JIT (Just-In-Time) means compiling to native machine code *while the program is running*, based on runtime observations. TurboFan collects type feedback from Ignition (e.g., "this function's argument has always been a Smi — small integer") and uses it to emit x64/ARM64 instructions optimized for those specific types. The result: machine code that runs at speeds comparable to statically compiled languages like C++.

**Why JIT matters for performance:**
- Static type checks are eliminated (if types are proven stable)
- Property access can be a direct memory offset read instead of a hash lookup
- Function calls can be inlined, eliminating call overhead
- Numeric operations can use raw CPU arithmetic instead of boxed value operations

**The tradeoff:** JIT compilation has upfront cost (time to compile + memory for code cache). V8 mitigates this through tiered execution — only hot code pays the JIT cost. This is why microbenchmarks warming up a function before measuring show wildly different results than cold-start measurements.

---

### Q2 ⭐ (Easy | All Companies) — Execution Contexts

**Q:** What is an Execution Context? How many types exist in JavaScript, and what is created inside each one?

**A:**

An **Execution Context** is a specification record V8 maintains that encapsulates everything needed to execute a unit of JavaScript code: the variable bindings, `this`, a reference to the outer scope, and the current position of execution.

**Three primary types:**

1. **Global EC** — Created once when the script loads. Contains global variable bindings, function declarations, and the global `this` (`window` in browsers, `global` in Node, `undefined` at module top-level in strict ES modules).

2. **Function EC** — Created every time a function is called. Contains: the function's local variable bindings, `arguments` object (for non-arrow functions), a `this` binding determined by the call site, and an outer environment reference set from the function's `[[Scope]]`.

3. **Eval EC** — Created when `eval()` is called. Inherits the calling context's `this` and has access to the calling scope. (Rarely relevant in modern code; `eval` is widely discouraged.)

**Inside each EC, two environments are created:**
- **Variable Environment:** Stores `var` bindings and function declarations
- **Lexical Environment:** Stores `let`/`const` bindings; creates a new inner Lexical Environment for each block scope

Both environments contain an **outer reference** — a pointer to the enclosing environment — forming the scope chain.

---

### Q3 ⭐ (Medium | Google, Microsoft) — TDZ

**Q:** What is the Temporal Dead Zone (TDZ)? Write code that demonstrates it. How does it differ between var, let, and const?

**A:**

The TDZ is the binding's state from when its identifier is registered in the Lexical Environment (creation phase) until its declaration statement is reached during execution. In this state, any access throws `ReferenceError`.

```javascript
// TDZ demonstration
{
  // TDZ for `a` begins here — `a` exists in memory but uninitialized

  try {
    console.log(a); // ReferenceError: Cannot access 'a' before initialization
  } catch (e) {
    console.log(e.constructor.name + ': ' + e.message);
  }

  let a = 5; // TDZ ends here — `a` is now initialized to 5
  console.log(a); // 5
}

// Proof that let IS hoisted (not just "not hoisted"):
let outer = 'outer';
{
  try {
    console.log(outer); // ReferenceError — not 'outer' — because inner `outer` is in TDZ
  } catch (e) { console.log('TDZ shadow:', e.message); }
  let outer = 'inner'; // inner binding hoisted, shadowing outer one from block start
}
```

**Comparison:**

| | `var` | `let` | `const` |
|---|---|---|---|
| Hoisted? | ✅ Yes | ✅ Yes | ✅ Yes |
| Initialized in creation phase? | ✅ `undefined` | ❌ No (TDZ) | ❌ No (TDZ) |
| TDZ? | ❌ None | ✅ Yes | ✅ Yes |
| Reassignable? | ✅ Yes | ✅ Yes | ❌ No |
| Error if accessed before declaration | None (`undefined`) | `ReferenceError` | `ReferenceError` |

`const` additionally requires an initializer in its declaration — `const x;` is a `SyntaxError`.

---

### Q4 ⭐ (Medium | Meta, Stripe) — Stack Overflow

**Q:** What happens when the call stack overflows? Write code that causes it. How would you rewrite it to avoid it?

**A:**

When V8's call stack exceeds its maximum depth, it throws `RangeError: Maximum call stack size exceeded`. This is unrecoverable in the normal sense — you can catch it with `try/catch`, but the stack is already at capacity.

```javascript
// ❌ Causes stack overflow
function sum(n) {
  if (n === 0) return 0;
  return n + sum(n - 1); // each call adds a frame
}
sum(100000); // RangeError

// ✅ Iterative — O(1) stack space
function sumIterative(n) {
  let total = 0;
  for (let i = n; i > 0; i--) total += i;
  return total;
}
sumIterative(100000); // 5000050000

// ✅ Trampoline — preserves recursive style
function trampoline(fn) {
  return (...args) => {
    let result = fn(...args);
    while (typeof result === 'function') result = result();
    return result;
  };
}
function sumTrampolined(n, acc = 0) {
  if (n === 0) return acc;
  return () => sumTrampolined(n - 1, acc + n); // thunk instead of recursive call
}
trampoline(sumTrampolined)(100000); // 5000050000
```

**Tradeoffs:**

| Approach | Stack Space | Code Clarity | Performance |
|---|---|---|---|
| Recursion | O(n) — overflows | Highest | Fastest until overflow |
| Iteration | O(1) | Good | Fastest overall |
| Trampoline | O(1) | Moderate | Slight overhead (closure allocation per step) |

Iterative is almost always the right production choice. Trampolines are useful when recursion structure is important to preserve (e.g., mutually recursive functions).

---

### Q5 ⭐⭐ (Hard | Google) — Ignition + TurboFan + Deoptimization

**Q:** Explain how Ignition and TurboFan work together. What triggers deoptimization and how can a developer accidentally cause it?

**A:**

Ignition and TurboFan form a **tiered execution system** with feedback-driven optimization.

**Ignition's role:** Beyond just interpreting, Ignition is the data collection layer. It maintains **Feedback Vectors** — per-function, per-call-site data structures that record what types of values appeared at each operation. For example: "at call site 3, the left operand of `+` has always been a Smi (31-bit integer) and the right has always been a Smi."

**TurboFan's role:** When V8's profiler marks a function as hot (based on invocation counters), TurboFan receives the function's bytecode and its Feedback Vector. It builds a graph-based IR (intermediate representation), applies type-specialized optimizations, and emits native machine code. These optimizations are *speculative* — they assume the type patterns observed will continue.

**What triggers deoptimization:**

1. **Type change at an operation:**
   ```javascript
   function calc(x) { return x + 1; }
   for (let i = 0; i < 10000; i++) calc(i);  // trained as integer addition
   calc(0.5); // TurboFan deoptimizes — float addition has different machine representation
   ```

2. **Hidden class change on an object:**
   ```javascript
   function process(obj) { return obj.value; }
   const objects = Array.from({length: 1000}, () => ({ value: 1 }));
   objects.forEach(process); // trained on shape {value}
   const rogue = { value: 1, extra: 2 }; // different shape!
   process(rogue); // deoptimizes
   ```

3. **`arguments` object in strict hot function:**
   Using the `arguments` object prevents certain optimizations. Use rest parameters (`...args`) instead.

4. **Deleting properties:**
   `delete obj.x` changes the object's hidden class, breaking ICs and potentially triggering deoptimization in any function that operates on that object.

5. **Type-unstable array elements:**
   V8 tracks "element kinds" for arrays (`PACKED_SMI_ELEMENTS`, `PACKED_DOUBLE_ELEMENTS`, `PACKED_ELEMENTS`). Mixing types or using `delete` on array elements downgrades the element kind and can deoptimize.
   ```javascript
   const arr = [1, 2, 3]; // PACKED_SMI_ELEMENTS — fast
   arr.push(0.5);          // upgrades to PACKED_DOUBLE_ELEMENTS
   arr.push('string');     // upgrades to PACKED_ELEMENTS — slowest
   ```

**Developer best practices to avoid deoptimization:**
- Keep function signatures type-stable
- Always initialize object properties in constructors, in the same order
- Don't `delete` properties — instead set to `null`/`undefined`
- Don't mix types in arrays
- Avoid using `arguments`; use rest parameters
- Don't reuse variables for different types

---

### Q6 ⭐ (Medium | Adobe, Salesforce) — Scope Chain vs `[[Scope]]`

**Q:** What is the difference between `[[Scope]]` and the scope chain? How does JavaScript resolve variable lookups?

**A:**

**`[[Scope]]`** is an internal slot on every function object. It holds a reference to the Lexical Environment that was active when the function was **defined**. This is set once, at definition time, and never changes. It's the mechanism that enables closures.

**The scope chain** is the runtime structure built when a Function EC is created. V8 creates a new Lexical Environment for the function and sets its `outer` reference to the environment stored in the function's `[[Scope]]`. The resulting linked list of environments — from the function's own env through all enclosing envs to the global env — is the scope chain.

```javascript
const x = 'global';

function outer() {
  const x = 'outer';

  function inner() {
    // inner's [[Scope]] = outer's Lexical Environment (set when inner was defined)
    // inner's scope chain: inner-env → outer-env → global-env
    console.log(x); // 'outer' — found in outer-env before global-env
  }

  return inner;
}

const fn = outer(); // outer() returns inner
// outer's execution context is gone, but inner's [[Scope]] still references outer's env
fn(); // 'outer' — closure keeps outer's env alive
```

**Variable lookup algorithm:**
1. Check current EC's Lexical Environment
2. If not found, follow `outer` reference
3. Repeat until found or null
4. Not found at null: `ReferenceError` (strict) or implicit global creation (sloppy, assignment only)

**Key distinction from prototype chain:**
- Scope chain: resolves **identifiers** (variable names) — follows `outer` env references
- Prototype chain: resolves **object properties** — follows `[[Prototype]]` links
- Scope chain lookup failure: `ReferenceError`
- Prototype chain lookup failure: `undefined` (no error)

---

### Q7 ⭐ (Easy | Microsoft, Cisco) — Hoisting

**Q:** What is hoisting? Explain the difference in hoisting behavior between var, let, const, and function declarations.

**A:**

Hoisting is what happens during the **Creation Phase** of an Execution Context: V8 scans the entire scope for declarations before executing any code, and registers those bindings in the Variable/Lexical Environment.

| Declaration | Hoisted? | Initial Value | Accessible Before Declaration? |
|---|---|---|---|
| `var x` | ✅ Yes | `undefined` | ✅ Yes — returns `undefined` |
| `let x` | ✅ Yes | Uninitialized | ❌ TDZ — ReferenceError |
| `const x` | ✅ Yes | Uninitialized | ❌ TDZ — ReferenceError |
| `function f() {}` | ✅ Yes | Full function | ✅ Yes — fully callable |
| `var f = function() {}` | Partial | `undefined` (from var) | ❌ TypeError (calling undefined) |
| `let f = function() {}` | Partial | Uninitialized | ❌ ReferenceError (TDZ) |

```javascript
// Function declaration — fully hoisted
console.log(typeof greet); // "function"
greet(); // "Hello"
function greet() { console.log("Hello"); }

// var — hoisted, initialized to undefined
console.log(x); // undefined
var x = 5;
console.log(x); // 5

// let — hoisted but TDZ
console.log(y); // ReferenceError
let y = 5;

// var function expression — hoisted as undefined
console.log(fn); // undefined
try { fn(); } catch(e) { console.log(e.constructor.name); } // TypeError
var fn = function() {};

// Tricky: multiple var declarations — only one binding, last wins
var z = 1;
var z = 2; // not an error — same binding, overwritten
console.log(z); // 2
```

---

### Q8 ⭐ (Medium | Airbnb, Netflix) — Refactoring Recursive to Iterative

**Q:** Given a deeply recursive function causing stack overflow on large inputs, how would you refactor it to be iterative? What's the tradeoff?

**A:**

The core technique is **explicit stack with heap allocation**: instead of relying on the call stack (limited by V8's memory region for the stack), we maintain our own stack as a JavaScript array on the heap (much larger, limited by available RAM).

```javascript
// RECURSIVE: tree traversal — overflows on deep trees
function sumTree(node) {
  if (!node) return 0;
  return node.value + sumTree(node.left) + sumTree(node.right);
}

// ITERATIVE: explicit stack
function sumTreeIterative(root) {
  if (!root) return 0;
  const stack = [root];
  let total = 0;

  while (stack.length > 0) {
    const node = stack.pop();
    total += node.value;
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
  return total;
}
```

**For a recursive algorithm generally:**
1. Identify what the recursive call passes to the next level (this becomes your stack frame object)
2. Identify the base case (this becomes your loop's exit condition)
3. Identify what accumulates across calls (this becomes an explicit accumulator variable)

**Tradeoffs:**

| Factor | Recursive | Iterative |
|---|---|---|
| Readability | Often clearer (mirrors the problem structure) | More verbose but explicit |
| Stack safety | ❌ Limited by call stack depth | ✅ Only limited by heap memory |
| Performance | Small overhead per frame (function call + frame setup) | Lower overhead per iteration |
| Debugging | Call stack gives you the recursion path for free | Must manually track state |
| Tail-call optimization | ✅ Possible (ES6 spec; V8 has partial support) | N/A |

For production code handling user-supplied data (which could be arbitrarily deep), iterative is safer. For algorithms with bounded depth (e.g., traversing a balanced BST of 1M nodes — depth ~20), recursion is fine.

---

### Q9 ⭐⭐ (Hard | Google, Meta) — Inline Caches

**Q:** What is an "inline cache" in V8? How does it optimize property access? What breaks it?

**A:**

An **Inline Cache** is a per-call-site optimization mechanism. When V8 first executes a property access like `obj.name`, it must perform a full lookup: find `obj`'s **hidden class** (internal shape descriptor), check if `name` is at a known offset in that class, and return the value. This is expensive.

V8 solves this by caching the result at the call site itself. After the first execution, the call site records:
- The hidden class it saw (`Map: #Point`)
- The property offset (`name` is at offset 8)

On subsequent executions, V8 checks: "is this object's hidden class still `#Point`?" If yes, it directly reads from offset 8 — skipping the lookup entirely.

**Hidden classes (Maps):**

V8 assigns every object a hidden class based on its property layout. Objects with the same properties added in the same order share a hidden class.

```javascript
// Same hidden class
const a = { x: 1, y: 2 }; // Map: {x, y}
const b = { x: 3, y: 4 }; // Map: {x, y} — same!

// Different hidden class
const c = { y: 2, x: 1 }; // Map: {y, x} — order differs!
```

**IC States and what breaks them:**

```javascript
function readX(obj) { return obj.x; } // one call site

// MONOMORPHIC (fast): all calls see the same shape
readX({ x: 1 });
readX({ x: 2 }); // same shape → IC stays monomorphic

// POLYMORPHIC (slightly slower): 2–4 shapes seen
readX({ x: 1, y: 2 }); // 2nd shape
readX({ x: 1, y: 2, z: 3 }); // 3rd shape

// MEGAMORPHIC (slow): 5+ shapes → IC gives up
// Falls back to global property lookup cache
readX({ a: 1, x: 5 });
readX({ b: 1, x: 6 });
// Now megamorphic — every call is a full lookup
```

**What breaks ICs in practice:**
1. Creating objects with properties in different orders
2. Adding properties dynamically after construction
3. Deleting properties (`delete obj.x` changes the hidden class)
4. Mixing class instances with plain object literals at the same call site
5. Objects with different numbers of properties at the same call site

**Real-world impact:** A megamorphic property access in a tight inner loop can be 5–10× slower than a monomorphic one. In rendering engines, game loops, or data processing pipelines, this is measurable.

---

### Q10 ⭐ (Medium | Stripe, Uber) — Full Execution Trace

**Q:** Walk me through what happens — in precise sequence — from when `outer()` is called until `console.log` executes.

```javascript
var x = 1;
function outer() {
  var y = 2;
  function inner() {
    var z = 3;
    console.log(x, y, z);
  }
  inner();
}
outer();
```

**A:**

**Before `outer()` is called — Global EC Setup:**

*Creation Phase (Global):*
- `x` → Variable Env, initialized to `undefined`
- `outer` → Variable Env (function declaration), initialized to the full `outer` function object; `outer`'s `[[Scope]]` is set to the Global Lexical Environment
- `this` → `window` (or `global`)

*Execution Phase (Global):*
- Line 1: `x = 1` → Global Variable Env: `x = 1`
- Lines 2–9: Function declaration already processed; no action
- Line 10: `outer()` called → push Function EC for `outer`

---

**Function EC for `outer()` created:**

*Creation Phase (outer EC):*
- `y` → Variable Env: `undefined`
- `inner` → Variable Env: full `inner` function object; `inner`'s `[[Scope]]` = `outer`'s current Lexical Environment
- `this` → `window` (sloppy mode, non-method call)
- `outer` reference → Global Lexical Env (from `outer`'s `[[Scope]]`)

*Execution Phase (outer EC):*
- Line 3: `y = 2` → outer EC Variable Env: `y = 2`
- Lines 4–8: Function declaration already processed
- Line 9: `inner()` called → push Function EC for `inner`

---

**Function EC for `inner()` created:**

*Creation Phase (inner EC):*
- `z` → Variable Env: `undefined`
- `this` → `window`
- `outer` reference → `outer`'s Lexical Env (from `inner`'s `[[Scope]]`)

*Execution Phase (inner EC):*
- Line 6: `z = 3` → inner EC Variable Env: `z = 3`
- Line 7: `console.log(x, y, z)` — variable lookup:
  - `x`: not in inner EC → follow outer ref → not in outer EC → follow outer ref → found in Global EC: `1`
  - `y`: not in inner EC → follow outer ref → found in outer EC: `2`
  - `z`: found in inner EC: `3`
  - Output: `1 2 3`

---

**Unwinding:**
- `console.log` returns → console.log frame popped
- `inner` returns → inner EC popped → back in outer EC
- `outer` returns → outer EC popped → back in Global EC
- Script ends

**Call stack at peak:**

```
[console.log EC]  ← top
[inner EC]
[outer EC]
[Global EC]       ← bottom
```

---

## Hands-On Exercise: Complete Step-by-Step Trace

```javascript
var x = 1;
function outer() {
  var y = 2;
  function inner() {
    var z = 3;
    console.log(x, y, z);
  }
  inner();
}
outer();
```

```
STEP 1: Script begins evaluation
  → Global EC enters CREATION PHASE
  → Call Stack: [Global EC]

STEP 2: Creation Phase — Global EC
  → Scan for declarations:
    - var x          → Variable Env: x = undefined
    - function outer → Variable Env: outer = <fn>, outer.[[Scope]] = GlobalLexEnv
  → this = window
  → outer reference = null

STEP 3: Global EC enters EXECUTION PHASE

STEP 4: Line 1 — var x = 1
  → Global Variable Env: x = 1
  → State: { x: 1, outer: <fn> }

STEP 5: Lines 2-9 — function outer declaration
  → Already processed in creation phase; no action

STEP 6: Line 10 — outer() called
  → New Function EC for outer pushed onto stack
  → Call Stack: [Global EC, outer EC]
  → outer EC enters CREATION PHASE

STEP 7: Creation Phase — outer EC
  → Scan for declarations inside outer():
    - var y          → Variable Env: y = undefined
    - function inner → Variable Env: inner = <fn>, inner.[[Scope]] = outer's LexEnv
  → this = window
  → outer reference = GlobalLexEnv (from outer.[[Scope]])

STEP 8: outer EC enters EXECUTION PHASE

STEP 9: Line 3 — var y = 2
  → outer EC Variable Env: y = 2
  → State: { y: 2, inner: <fn> }

STEP 10: Lines 4-8 — function inner declaration
  → Already processed in creation phase; no action

STEP 11: Line 9 — inner() called
  → New Function EC for inner pushed onto stack
  → Call Stack: [Global EC, outer EC, inner EC]
  → inner EC enters CREATION PHASE

STEP 12: Creation Phase — inner EC
  → Scan for declarations inside inner():
    - var z → Variable Env: z = undefined
  → this = window
  → outer reference = outer's LexEnv (from inner.[[Scope]])

STEP 13: inner EC enters EXECUTION PHASE

STEP 14: Line 6 — var z = 3
  → inner EC Variable Env: z = 3
  → State: { z: 3 }

STEP 15: Line 7 — console.log(x, y, z) — SCOPE CHAIN LOOKUPS
  → Looking up 'x':
     - inner EC Variable Env → not found
     - Follow outer ref → outer EC Variable Env → not found
     - Follow outer ref → Global EC Variable Env → FOUND: x = 1 ✓
  → Looking up 'y':
     - inner EC Variable Env → not found
     - Follow outer ref → outer EC Variable Env → FOUND: y = 2 ✓
  → Looking up 'z':
     - inner EC Variable Env → FOUND: z = 3 ✓
  → console.log(1, 2, 3) called
  → Output: "1 2 3"

STEP 16: console.log returns
  → console.log frame popped (browser/Node internal)

STEP 17: inner() returns (undefined)
  → inner EC popped
  → Call Stack: [Global EC, outer EC]

STEP 18: outer() returns (undefined)
  → outer EC popped
  → Call Stack: [Global EC]

STEP 19: Script finishes
  → Global EC removed
  → Call Stack: []
```

---

## Day 1 Deliverable

### 150-Word Verbal Explanation of V8's Compilation Pipeline

> "When you run JavaScript in Chrome or Node, V8 starts by parsing your source code into what's called an Abstract Syntax Tree — basically a structured representation of what your code means. From that tree, a component called Ignition compiles it to bytecode, which is a compact intermediate format that V8 can start executing immediately. This gets your code running fast.
>
> While Ignition runs your code, it watches what's happening — what types your variables actually hold, what shapes your objects have — and collects that information in what are called Feedback Vectors. When a function gets called enough times that it's clearly important to your program, a second component called TurboFan takes over. TurboFan uses that type information to make smart assumptions — if a variable has always been an integer, it compiles machine code that assumes it always will be, skipping expensive type checks entirely.
>
> The risk is what's called deoptimization — if those assumptions turn out to be wrong, V8 throws away the optimized code and falls back to Ignition. That's why keeping your types consistent matters for performance."

---

## Self-Assessment Checklist

After studying these notes, I should be able to:

- [ ] Explain the V8 pipeline without notes in under 2 minutes
- [ ] Draw the call stack for any given code snippet
- [ ] Explain TDZ with a code example
- [ ] Predict hoisting behavior for var, let, const, function declarations
- [ ] Explain what breaks V8's inline cache optimization
- [ ] Trace execution context creation phase vs execution phase
- [ ] Fix a stack overflow by converting recursion to iteration
- [ ] Answer all 10 interview questions without referencing notes

---

## GitHub README Entry

```markdown
## Day 1 — V8 Engine, Execution Context, Call Stack

**Topics:** V8 pipeline, JIT compilation, Ignition, TurboFan, deoptimization, inline caches,
execution context, creation phase, execution phase, call stack, hoisting, TDZ, scope chain, [[Scope]]

**Difficulty:** Foundation (but probed at Staff level at Google/Meta)

**Key insight:** JavaScript is NOT interpreted — V8 interprets bytecode via Ignition as the first tier,
then JIT-compiles hot paths to native machine code via TurboFan; understanding the two-phase execution
context model (creation → execution) unlocks TDZ, hoisting, and closure behavior simultaneously.

**Interview frequency:** Very High — asked at Google, Meta, Microsoft, Stripe, Netflix, Airbnb

**Status:**
- [ ] Notes complete
- [ ] Questions answered
- [ ] Confident to explain without notes
```
