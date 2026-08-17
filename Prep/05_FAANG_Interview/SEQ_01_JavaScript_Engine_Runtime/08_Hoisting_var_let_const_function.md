# 8. Hoisting — var vs let vs const vs function declarations
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Hoisting is the JavaScript engine's behavior of processing variable and function declarations before executing any code — during the creation phase of the Execution Context. However, the word 'hoisting' is slightly misleading: declarations don't literally move up in source order. What actually happens is that during the creation phase, `var` declarations are registered on the Variable Object and initialized to `undefined`, while `function` declarations are fully stored (name + body). `let` and `const` declarations are also registered, but they are NOT initialized — they sit in a 'Temporal Dead Zone' from the start of the block scope until the declaration line is reached at runtime. Accessing a `let` or `const` before its declaration throws a `ReferenceError`; accessing a `var` before its declaration returns `undefined`. At SAP, misunderstanding TDZ caused a subtle bug during an Angular migration where a `const` defined inside an `if` block was referenced in an event handler attached before the block executed — the TDZ `ReferenceError` only appeared at runtime in production."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Hoisting is a consequence of how V8 (and all JS engines) compile and execute JavaScript in two passes:

```
Pass 1 — Creation Phase (before any code runs):
  Engine scans the scope for all declarations
  Allocates memory for each
  Initializes var → undefined, function → full definition
  Registers let/const → uninitialized (TDZ begins)

Pass 2 — Execution Phase (code runs line by line):
  Assignments happen: var/let/const get their values
  let/const TDZ ends at their declaration line
  Function expressions are not hoisted (they're assignments)
```

**Why does this exist?** JavaScript was originally designed to allow function declarations anywhere in a file and still be callable from anywhere else — enabling a more "declare anywhere, use anywhere" style. `var` hoisting was a side effect of this design. `let` and `const` (ES6) intentionally introduced TDZ to prevent the class of bugs that `var` hoisting enabled.

---

### How It Works Internally — Creation Phase

```
Source code:
  console.log(a);  // ?
  console.log(b);  // ?
  console.log(c);  // ?
  console.log(fn); // ?

  var a = 1;
  let b = 2;
  const c = 3;
  function fn() { return 42; }

Creation phase (what the engine sets up BEFORE execution):
  Variable Object / Lexical Environment bindings:
    a → initialized to undefined       (var hoisting)
    b → registered, UNINITIALIZED      (let — TDZ)  
    c → registered, UNINITIALIZED      (const — TDZ)
    fn → function fn() { return 42; } (full function hoisted)

Execution phase (code runs line by line):
  console.log(a)  → undefined   (var initialized to undefined in creation)
  console.log(b)  → ReferenceError: Cannot access 'b' before initialization (TDZ)
  console.log(c)  → ReferenceError: Cannot access 'c' before initialization (TDZ)
  console.log(fn) → function fn() { return 42; }  (fully hoisted)
```

---

### var Hoisting — Full Behavior

```typescript
// Behavior 1: Declaration hoisted, initialization is NOT
console.log(x); // undefined (NOT ReferenceError)
var x = 5;
console.log(x); // 5

// var is function-scoped (not block-scoped):
function example() {
  console.log(y); // undefined — var hoisted to function top
  if (true) {
    var y = 10;   // declaration hoists to function scope, NOT block scope
  }
  console.log(y); // 10 — y is accessible here (leaked out of if block)
}

// The classic loop bug (var + closure):
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints: 3, 3, 3
  // Reason: only ONE 'i' (var is function-scoped), by the time setTimeout fires,
  // the loop has completed and i === 3
}

// Fix with let (block-scoped — new binding per iteration):
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints: 0, 1, 2
}
```

---

### let & const — Temporal Dead Zone (TDZ)

```
Temporal Dead Zone (TDZ):
  The period between:
    START: the beginning of the block scope that contains the declaration
    END: the point where the declaration line is actually executed

  During TDZ:
    - The variable IS registered in the scope (engine knows it exists)
    - But it is UNINITIALIZED — accessing it throws ReferenceError
    - The error message: "Cannot access '[name]' before initialization"

  This is DIFFERENT from a variable that doesn't exist:
    console.log(undeclared); → ReferenceError: undeclared is not defined
    console.log(tdzVar);     → ReferenceError: Cannot access 'tdzVar' before initialization
    let tdzVar = 1;
```

```typescript
// TDZ Demo:
{
  // ← TDZ for 'b' begins here
  console.log(b); // ❌ ReferenceError: Cannot access 'b' before initialization
  let b = 2;      // ← TDZ ends here
  console.log(b); // ✅ 2
}

// TDZ with typeof (the only case where typeof doesn't save you):
typeof undeclared; // "undefined" — safe, no error (unregistered variable)
typeof tdzLet;     // ❌ ReferenceError — typeof does NOT bypass TDZ
let tdzLet = 1;

// const = same as let but binding cannot be reassigned after initialization:
const obj = { a: 1 };
obj.a = 2;         // ✅ allowed — mutating the object, not reassigning binding
obj = { a: 3 };   // ❌ TypeError: Assignment to constant variable
```

---

### Function Declarations vs Function Expressions

```typescript
// Function DECLARATION — fully hoisted (name + body):
greet(); // ✅ "Hello" — works before the declaration line
function greet() { console.log("Hello"); }

// Function EXPRESSION with var — name hoisted, body is NOT:
sayHi(); // ❌ TypeError: sayHi is not a function
         // (sayHi is undefined at this point — var hoisted to undefined)
var sayHi = function() { console.log("Hi"); };

// Function EXPRESSION with let/const — TDZ applies:
sayBye(); // ❌ ReferenceError: Cannot access 'sayBye' before initialization
const sayBye = () => console.log("Bye");

// Arrow functions — NEVER hoisted (they're expressions):
arrowFn(); // ❌ same as above
const arrowFn = () => {};

// Named function expression — name is NOT hoisted to outer scope:
var fn = function myFunc() {};
myFunc(); // ❌ ReferenceError: myFunc is not defined
          // myFunc only exists inside the function body itself
```

---

### Class Declarations — also TDZ!

```typescript
// Class declarations ARE hoisted but remain in TDZ (like let/const):
const instance = new MyClass(); // ❌ ReferenceError: Cannot access 'MyClass'
                                 // before initialization
class MyClass {
  greet() { return "hello"; }
}

// This is intentional — prevents calling a class before its body is evaluated
// (class body may contain expressions that need the outer scope to be ready)
```

---

### Architecture & Component Boundaries

**Where hoisting matters in real applications:**

```
Module level (top of file):
  var → hoisted to MODULE scope (or IIFE scope in bundled code)
  const/let → TDZ until declaration

Function scope:
  var inside function → hoisted to top of that function
  var in block (if/for/while) → hoists OUT of block to function top
  let/const in block → block-scoped, no escape

Event handlers & callbacks:
  // Classic Angular zone bug: var captured in callback before assignment
  var service; // undefined
  document.addEventListener('DOMContentLoaded', () => {
    service.init(); // ❌ TypeError: service is undefined
  });
  service = new MyService(); // too late — event may fire before this in async scenarios

  // const fix: TDZ would give a clear ReferenceError rather than silent undefined
```

---

### Data Flow & State Flow

```
Execution Context creation (Global or Function):

  Step 1 — Creation Phase:
  ┌─────────────────────────────────────────────────┐
  │  Variable Environment / Lexical Environment     │
  │  ┌────────┬──────────────────────────────────┐  │
  │  │ var x  │ undefined                        │  │
  │  │ let y  │ <uninitialized> (TDZ)            │  │
  │  │ const z│ <uninitialized> (TDZ)            │  │
  │  │ fn     │ function fn() { ... }           │  │
  │  └────────┴──────────────────────────────────┘  │
  └─────────────────────────────────────────────────┘

  Step 2 — Execution Phase (runs code line by line):
    Assignment: var x = 5  → x binding updated to 5
    TDZ end:   let y = 10  → y binding initialized to 10
    TDZ end:  const z = 15 → z binding initialized to 15 (sealed)
```

---

### Performance Implications

- `var` hoisting itself has no measurable runtime performance difference vs `let`/`const` — the difference is purely semantic/scoping
- `const` signals to both the engine and the programmer that the binding is immutable — modern V8 can apply certain optimizations when it knows a binding won't be reassigned
- The real performance story: `let`/`const` in block scope enables better dead code elimination and tree-shaking in bundlers (bundlers can prove const values are not reassigned)
- Closure over `var` in loops creates shared mutable state (the "loop bug") which can cause subtle state corruption bugs that are hard to trace — a correctness/maintainability issue, not a raw perf issue

---

### Scalability Considerations

| Scale | Relevant Concern |
|---|---|
| Single dev, small codebase | `var` bugs are annoying but fixable manually |
| Team of 10, large codebase | `var` loop bugs, implicit globals from undeclared `var` cause production incidents |
| Multiple teams, micro-frontends | Implicit global `var` leaks across module boundaries; `const`/`let` + strict mode prevents this |
| TypeScript strict mode | `noImplicitAny` catches undeclared variables; `const` enforcement via `prefer-const` lint rule |

**Rule of thumb for production code:**
1. Default to `const` — communicates immutability intent
2. Use `let` only when reassignment is needed
3. Never use `var` in modern code — no legitimate use case that `let`/`const` don't cover better

---

### Trade-offs

| `var` | `let` / `const` | Use When |
|---|---|---|
| Function-scoped | Block-scoped | `let`/`const`: always in modern code |
| Hoisted + initialized to `undefined` | Hoisted but TDZ (uninitialized) | `const`/`let`: prevents "undefined before use" bugs |
| Can be re-declared in same scope | Cannot be re-declared | `let`/`const`: catches duplicate declaration bugs at compile |
| Leaks out of blocks (if/for/while) | Contained within block | `let`/`const`: loop variables stay in loop |
| Works in < ES6 environments | Requires ES6+ (or transpiler) | `var`: legacy code only, never new code |

| Function Declaration | Function Expression (`const fn = () => {}`) | Use When |
|---|---|---|
| Fully hoisted (callable anywhere in scope) | Not hoisted (TDZ applies) | Declaration: utility functions in modules; Expression: callbacks, methods, conditional assignment |
| Creates named function (better stack traces) | May be anonymous (worse stack traces) | Named expressions for better debugging: `const fn = function fnName() {}` |
| Cannot be conditionally declared portably | Can be assigned conditionally | Expression: `const handler = condition ? fn1 : fn2` |

---

### ⚠️ Anti-Patterns & Pitfalls

- **`var` in loops with closures (the classic bug):** `for (var i = 0; i < 5; i++) { arr.push(() => i); }` — all closures capture the same `var i`. All functions return `5`. Fix: use `let` or wrap in IIFE. This exact bug appears in Angular `ngFor` event handler code written before ES6.

- **Relying on `undefined` from var hoisting instead of initializing:** `if (config) { var config = loadConfig(); }` — `config` is `undefined` (from hoisting) at the `if` check, not `ReferenceError`. The developer "gets lucky" and the code "works" in a buggy way. With `const`, the TDZ gives a clear `ReferenceError` forcing correct ordering.

- **Declaring `var` inside `try/catch` expecting block scope:** `try { var result = riskyOp(); } catch (e) { ... } console.log(result);` — `result` is accessible outside the `try` block (var leaks to function scope). This is almost never intentional. Use `let result;` before the `try` block if you need access after.

- **Function declaration inside blocks (non-strict mode):** `if (condition) { function handler() {} }` — behavior is inconsistent across browsers in non-strict mode. In strict mode, block-scoped function declarations work consistently. Always use `const handler = () => {}` inside blocks.

- **Assuming `typeof` saves you from TDZ:** Unlike undeclared variables (`typeof undeclared` → `"undefined"`), `typeof` on a TDZ variable throws `ReferenceError`. If the variable is declared somewhere in scope but before its declaration line, `typeof` does NOT provide a safe fallback.

---

## 🏭 3. Real-World Examples

**SAP Labs — Angular migration TDZ bug:**

During migration of legacy AngularJS controllers to Angular components, a pattern emerged where `const` service variables were declared inside lifecycle hooks but referenced in template event bindings that could fire (via change detection) before `ngOnInit` completed. The TDZ `ReferenceError` surfaced in production for users who triggered rapid interactions during page initialization. The lesson: with `var`, this would have silently called `undefined.method()` (TypeError), which is harder to diagnose than the explicit TDZ `ReferenceError`. Strict TypeScript (`strictPropertyInitialization: true`) combined with `const`/`let` caught most of these at compile time after the migration.

**Bosch WebSocket dashboard — `var` in event handler closures:**

Industrial monitoring dashboard registered WebSocket event handlers inside a `for (var i = 0; ...)` loop over sensor IDs. All closures captured the same `var i`. By the time the first WebSocket event arrived, `i` was at its final loop value — all events were attributed to the last sensor. Fix: switch to `for (const sensorId of sensorIds)` — `const` in a `for...of` creates a new binding per iteration.

**Microsoft TypeScript codebase convention:**

TypeScript's own codebase (`/src/compiler/`) enforces `const` for all bindings that are not reassigned. The `prefer-const` ESLint rule is mandatory in Microsoft's frontend codebases. TypeScript's compiler can leverage `const` bindings for narrowing and flow analysis that isn't possible with `let` or `var`. Example: `const result = maybeNull ?? "default"` — TypeScript narrows `result` as `string`, never `null`.

**Salesforce LWC — implicit globals from missing declarations:**

In non-strict pre-LWC JavaScript code (classic Aura components), assignment to an undeclared variable created an implicit global: `function init() { count = 0; }` — `count` becomes `window.count`. In multi-component pages this caused state cross-contamination between components. LWC enforces strict mode by default, so undeclared assignment throws `ReferenceError`. Combined with `const`-first convention, LWC eliminates this entire class of bugs.

**How it evolves with scale:**
- **Small scale (< 10K users, 1 dev):** `var` bugs are annoying but discoverable — one dev can trace their own code
- **Medium scale (100K users, 10 devs):** `var` loop bugs and implicit globals cause production incidents that take hours to debug; `let`/`const` + ESLint enforces correctness at commit time
- **Large scale (10M+ users, 100 devs, multiple teams):** `const`-first + TypeScript strict mode + automated lint gates in CI prevent entire categories of runtime bugs; TDZ enforcement makes initialization order explicit and verifiable

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Hoisting happens during the Creation Phase of Execution Context setup — before any code actually runs. `var` declarations are registered AND initialized to `undefined` in the Variable Object. Function declarations are stored in full — name and body — so they're callable anywhere in their scope. `let` and `const` are also registered during creation, but they're left UNINITIALIZED — this is the Temporal Dead Zone. Accessing them before their declaration line throws a `ReferenceError`, not the silent `undefined` you'd get with `var`.

> The practical consequence: `var` in a loop creates one shared binding — the classic `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100) }` prints `3, 3, 3` because all closures capture the same `var i`. Switch to `let` and you get `0, 1, 2` because `let` creates a new binding per iteration. I hit this exact bug at Bosch when setting up WebSocket handlers in a sensor loop — we fixed it by moving to `for...of` with `const`.

> In modern code, I treat `const` as the default, `let` for rebindable state, and `var` as a red flag in code review — there's no scenario in ES6+ code where `var` is preferable."

---

### Likely Follow-up Questions

1. **What is the Temporal Dead Zone?** → The TDZ is the period from the start of a block scope through the execution of the `let`/`const` declaration. During this window, the variable is registered but uninitialized — accessing it throws `ReferenceError: Cannot access 'x' before initialization`.

2. **Does `typeof` safe-guard against TDZ?** → No. `typeof undeclaredVar` returns `"undefined"` safely, but `typeof tdzVar` where `let tdzVar` is declared later in the same block still throws `ReferenceError`. TDZ pierces `typeof`.

3. **Why does `var` in a for loop with setTimeout print the wrong value?** → `var` is function-scoped — the loop creates ONE `i` binding that all closures share. By the time `setTimeout` fires, the loop has completed and `i === n`. `let` creates a new binding per iteration, so each closure captures its own `i`. IIFE was the pre-ES6 fix: `(function(i) { setTimeout(...) })(i)`.

4. **Are class declarations hoisted?** → Yes, but with TDZ — same as `let`/`const`. Class declarations are registered during the creation phase but remain uninitialized until the class declaration line executes. Attempting to use the class before that line throws `ReferenceError`.

5. **What's the difference between `function foo() {}` and `const foo = function() {}`?** → Function declaration: fully hoisted — callable before the declaration line. Function expression with `const`: subject to TDZ — calling before declaration throws `ReferenceError`. Stack traces: named function expressions (`const foo = function foo() {}`) give better names; anonymous arrows show as `<anonymous>` in stack traces.

---

### vs Alternatives

| `var` | `let` | `const` | Choose when |
|---|---|---|---|
| Function-scoped, initialized to `undefined` | Block-scoped, TDZ | Block-scoped, TDZ, no reassignment | `const`: always when value won't be reassigned |
| Survives `if`/`for`/`while` block exit | Contained to block | Contained to block | `let`: loop counters, state that changes |
| Implicit global on undeclared (non-strict) | No implicit global | No implicit global | Never use `var` in new code |

| Function Declaration | Arrow Function Expression | Use When |
|---|---|---|
| Fully hoisted, has own `this` | Not hoisted (TDZ), inherits `this` | Declaration: top-level utilities; Arrow: callbacks, methods |
| Named in stack traces | Anonymous unless named | Named expressions for debuggability |

---

### How to Signal Senior Thinking

> "The practical value of `const`-first isn't just about preventing reassignment — it's about communicating intent and enabling tooling. TypeScript can narrow types more aggressively on `const` bindings. Bundlers can inline `const` values and eliminate dead code more reliably. And ESLint's `prefer-const` rule catches accidental `let` declarations that are never reassigned. In my TypeScript Angular codebase at SAP, `prefer-const` in our lint pipeline caught ~15-20 cases per sprint where developers used `let` by habit when `const` was correct — over time it shifts team habits toward immutability-first thinking, which directly reduces state mutation bugs in complex RxJS pipelines."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: var vs let vs const hoisting comparison
// ============================================================

function hoistingDemo() {
  // var: hoisted + initialized to undefined
  console.log(varX);   // undefined (no error)
  var varX = 'hello';
  console.log(varX);   // 'hello'

  // let: hoisted but TDZ — ReferenceError before declaration
  try {
    console.log(letY);  // ❌ ReferenceError
  } catch (e) {
    console.log(e.message); // "Cannot access 'letY' before initialization"
  }
  let letY = 'world';
  console.log(letY);  // 'world'

  // function declaration: fully hoisted
  console.log(greet()); // 'Hi!' — works before declaration
  function greet() { return 'Hi!'; }

  // function expression: var hoisted to undefined (TypeError, not ReferenceError)
  try {
    console.log(sayHi()); // ❌ TypeError: sayHi is not a function
  } catch (e) {
    console.log(e.message); // "sayHi is not a function"
  }
  var sayHi = () => 'Hi there!';
}

// ============================================================
// DEMO 2: var block-scope escape (the real danger)
// ============================================================

function blockScopeDemo() {
  if (true) {
    var leaked = 'I escaped the block!';
    let contained = 'I stay in the block';
  }
  console.log(leaked);    // ✅ 'I escaped the block!' (var leaks)
  // console.log(contained); // ❌ ReferenceError
}

// ============================================================
// DEMO 3: The closure-in-loop bug and the fix
// ============================================================

// Bug (var):
const buggyHandlers: (() => number)[] = [];
for (var i = 0; i < 3; i++) {
  buggyHandlers.push(() => i); // all capture the SAME var i
}
console.log(buggyHandlers.map(fn => fn())); // [3, 3, 3] ❌

// Fix 1 — let (new binding per iteration):
const fixedHandlers: (() => number)[] = [];
for (let j = 0; j < 3; j++) {
  fixedHandlers.push(() => j); // each closure gets its own j
}
console.log(fixedHandlers.map(fn => fn())); // [0, 1, 2] ✅

// Fix 2 — const in for...of (Bosch WebSocket sensor pattern):
const sensorIds = ['temp', 'pressure', 'flow'];
const handlers = new Map<string, () => void>();

for (const sensorId of sensorIds) {     // const: new binding per iteration
  handlers.set(sensorId, () => {
    console.log(`Processing sensor: ${sensorId}`);
  });
}
handlers.get('temp')?.();     // "Processing sensor: temp" ✅
handlers.get('pressure')?.(); // "Processing sensor: pressure" ✅

// ============================================================
// DEMO 4: const — immutable binding, mutable value
// ============================================================

const config = { theme: 'light', lang: 'en' };
config.theme = 'dark';    // ✅ allowed — mutating the object
config.lang = 'de';       // ✅ allowed
// config = {};            // ❌ TypeError: Assignment to constant variable

// To prevent mutation of the object itself:
const frozenConfig = Object.freeze({ theme: 'light', lang: 'en' });
// frozenConfig.theme = 'dark'; // ❌ silently fails (or throws in strict mode)

// TypeScript equivalent — readonly:
type Config = Readonly<{ theme: string; lang: string }>;
const strictConfig: Config = { theme: 'light', lang: 'en' };
// strictConfig.theme = 'dark'; // ❌ TypeScript compile error ✅

// ============================================================
// DEMO 5: TDZ with class declarations
// ============================================================

try {
  const instance = new Service(); // ❌ ReferenceError: TDZ
} catch (e) {
  console.log(e.message); // "Cannot access 'Service' before initialization"
}

class Service {
  getData(): string { return 'data'; }
}
const service = new Service(); // ✅
```

**Interview vs Production difference:**
- **Interview:** Demo 1 + Demo 3 are most relevant — hoisting behavior + the loop bug. Examiners want to see you explain the creation phase and TDZ, then demonstrate the `var` loop bug and its `let` fix.
- **Production:** The most impactful practices are `const`-first, `prefer-const` ESLint rule in CI, TypeScript `strictPropertyInitialization: true`, and never using `var` in new code. The loop bug matters for interview; the ESLint-enforced const-first matters for codebase quality.

---

## 🧠 6. Memory Aid

**Mental Model:** Think of the JavaScript engine as a stage director who reads the entire script before the show starts (Creation Phase). For `var`, the director writes the character's name on the cast list as "TBD" — the character exists but has no lines yet (`undefined`). For function declarations, the director memorizes the entire role. For `let`/`const`, the character's dressing room is reserved but the door is locked (TDZ) until the character walks in at their exact scene cue.

**If you go blank:** *"Hoisting = two-pass execution. Creation phase: var → undefined, function declaration → full body, let/const → TDZ (uninitialized). Execution phase: assignments happen, TDZ ends at declaration line. Accessing let/const before their line = ReferenceError. Accessing var before its line = undefined. var leaks out of blocks; let/const don't."*

**Mnemonic:** **VFT** — **V**ar gets `undefined`, **F**unction declarations get full body, **T**emptoral Dead Zone for `let`/`const`. Or: **"Var is Undefined, Functions Fly, Let/Const are Locked"**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** The `var` loop closure bug (printing the same final value for all iterations) manifests in UI rendering bugs — wrong data in dynamically rendered list items, wrong sensor readings in dashboards, wrong tab content in tabbed UIs. `let` eliminates this class of bug entirely.
→ **Performance:** `const` enables more aggressive V8 optimizations and better bundler tree-shaking. TypeScript type narrowing is more precise on `const` bindings. These are marginal per-binding gains but compound across large codebases.
→ **Business:** The `prefer-const` ESLint rule + TypeScript `strictPropertyInitialization` prevents entire categories of production bugs. At SAP, enforcing `const`-first across 3 micro-frontend teams eliminated the class of "variable read before assignment" bugs that caused ~2-3 production incidents per quarter. Clear error messages (TDZ `ReferenceError` vs silent `undefined`) reduce mean-time-to-debug.

**How it works (3 sentences):**
During the Creation Phase of Execution Context setup, V8 scans all declarations: `var` bindings are registered AND initialized to `undefined`, function declarations are stored in full (name + body), and `let`/`const` bindings are registered but left uninitialized, creating the Temporal Dead Zone. During the subsequent Execution Phase as code runs line-by-line, `var`/`let`/`const` bindings receive their declared values when the assignment line is reached, ending the TDZ for `let`/`const`, while `var` is already accessible (as `undefined`) throughout the function scope including before the assignment. The critical behavioral differences are: `var` is function-scoped (not block-scoped), leaks out of `if`/`for`/`while` blocks, and creates only one shared binding in loops — all three characteristics cause production bugs that `let`/`const` with block scoping and per-iteration bindings prevent.

**Company relevance:**
- **Microsoft:** TypeScript (Microsoft's language) enforces `const`-first via `prefer-const` lint rules and stricter type narrowing on `const` bindings. TypeScript's `strictPropertyInitialization` surfaces TDZ-class bugs at compile time. Every TypeScript-heavy codebase at Microsoft relies on these semantics for correctness.
- **Adobe:** Adobe's Creative Cloud web apps use `const`-first policies enforced by ESLint. React's rules-of-hooks implicitly require understanding of `const`/closure semantics — hook dependencies are closures, and stale closures (often from `var`-like reassignment patterns) are the #1 source of subtle React bugs in Adobe's UI.
- **Salesforce:** LWC enforces strict mode automatically, making undeclared variable assignment a `ReferenceError` and forcing explicit `let`/`const` declarations. Salesforce's coding standards mandate `const` by default, reinforcing enterprise code quality.
- **Cisco:** Cisco's WebEx UI and DevNet developer tools are TypeScript-first codebases. The `var` loop-closure bug is a common interview question at Cisco's frontend interviews specifically because WebEx's event handling layer (participant events, meeting state) involves loop-registered event callbacks where closure semantics are critical.

---
✅ **Topic 8/486 complete.**
→ **Topics 9–21 (SEQ 1) are already complete. SEQ 1 is fully done.**
**Say GO to start SEQ 2: Browser & Web Platform Internals**
