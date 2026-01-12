# JavaScript Execution Model

## 1. High-Level Explanation (Frontend Interview Level)

The **JavaScript Execution Model** describes how JavaScript code runs in the browser: single-threaded execution with an execution context, call stack, and scope chain. Understanding this is fundamental for debugging, optimization, and avoiding common pitfalls.

### The Big Picture

```
JAVASCRIPT ENGINE (V8, SpiderMonkey, JavaScriptCore)
├─ EXECUTION CONTEXT (Global, Function, Eval)
│  ├─ Variable Environment (var, function declarations)
│  ├─ Lexical Environment (let, const, lexical scope)
│  └─ This Binding
│
├─ CALL STACK (LIFO - Last In First Out)
│  ├─ Global Execution Context (bottom)
│  ├─ Function 1 Context
│  ├─ Function 2 Context
│  └─ Current Function Context (top)
│
├─ HEAP (Memory for objects)
│  ├─ Objects
│  ├─ Arrays
│  └─ Closures
│
└─ EVENT LOOP (coordinates async operations)
   ├─ Call Stack
   ├─ Web APIs (setTimeout, fetch, DOM)
   ├─ Task Queue (callbacks)
   └─ Microtask Queue (promises)
```

### Why This Matters in Interviews

**Junior Engineer:**
```
"JavaScript runs code line by line"
```
→ Oversimplified

**Senior/Staff Engineer:**
```
"JavaScript has a sophisticated execution model:

1. **Single-threaded:** One call stack, synchronous execution
2. **Execution Context:** Each function creates new context with:
   - Variables (hoisting)
   - Scope chain (closures)
   - This binding
3. **Call Stack:** LIFO structure tracking function calls
4. **Event Loop:** Enables async via Web APIs + task queues

Understanding this helps me:
- Debug scope issues (closure bugs)
- Optimize recursion (avoid stack overflow)
- Handle async correctly (promises vs callbacks)
- Explain hoisting, TDZ, closures

Example: At [Company], we had a memory leak from accidental closures 
capturing large scopes. Understanding execution contexts helped identify 
and fix the issue, reducing memory by 80%."
```
→ Shows depth and practical experience

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Execution Context in Detail

#### Types of Execution Contexts

```
1. GLOBAL EXECUTION CONTEXT (GEC)
──────────────────────────────────
Created when script loads
Only one per JavaScript runtime

Components:
├─ Global Object (window in browser, global in Node.js)
├─ this → window (non-strict) or undefined (strict mode)
└─ Variable Environment (global variables, functions)

2. FUNCTION EXECUTION CONTEXT (FEC)
──────────────────────────────────
Created when function is invoked
One per function call (multiple if recursive)

Components:
├─ Arguments object (function parameters)
├─ this → depends on invocation (call, apply, bind, arrow)
├─ Variable Environment (local variables)
└─ Scope Chain (outer lexical environments)

3. EVAL EXECUTION CONTEXT (Rare)
──────────────────────────────────
Created when eval() is called
Generally avoided (security, performance issues)
```

---

#### Execution Context Phases

```
PHASE 1: CREATION PHASE
───────────────────────

1. Create Variable Environment
   - Scan for function declarations → Create & initialize
   - Scan for var declarations → Create, initialize as undefined
   - Scan for let/const → Create, but NOT initialize (TDZ)

2. Create Scope Chain
   - Link to outer lexical environment
   - Forms closure chain

3. Determine 'this' Binding
   - Global context: window (or undefined in strict)
   - Function context: depends on invocation


PHASE 2: EXECUTION PHASE
───────────────────────

1. Execute code line by line
2. Assign values to variables
3. Execute function calls
4. Evaluate expressions
```

---

#### Example: Execution Context Creation

```javascript
// CODE
function outer(x) {
  var a = 10;
  let b = 20;
  const c = 30;
  
  function inner() {
    console.log(a, b, c, x);
  }
  
  inner();
}

outer(100);
```

**Timeline:**

```
STEP 1: GLOBAL EXECUTION CONTEXT (Creation)
────────────────────────────────────────────
GlobalContext {
  VariableEnvironment: {
    outer: <function reference>  ✅ Function hoisted
  },
  LexicalEnvironment: {
    // (empty)
  },
  this: window,
  outer: null  // No outer scope (this is global)
}

Call Stack: [GlobalContext]


STEP 2: GLOBAL EXECUTION CONTEXT (Execution)
────────────────────────────────────────────
Execute: outer(100)
→ Create new Execution Context for outer()


STEP 3: OUTER() EXECUTION CONTEXT (Creation)
────────────────────────────────────────────
OuterContext {
  VariableEnvironment: {
    a: undefined,  ✅ var hoisted, initialized as undefined
    inner: <function reference>  ✅ Function hoisted
    arguments: { 0: 100, length: 1 }
  },
  LexicalEnvironment: {
    b: <uninitialized>,  ⚠️ TDZ (Temporal Dead Zone)
    c: <uninitialized>,  ⚠️ TDZ
    x: 100  ✅ Parameter
  },
  this: window (or undefined in strict mode),
  outer: GlobalContext  ✅ Scope chain
}

Call Stack: [GlobalContext, OuterContext]


STEP 4: OUTER() EXECUTION CONTEXT (Execution)
────────────────────────────────────────────
Execute line by line:

Line: var a = 10;
Action: Assign 10 to a
OuterContext.VariableEnvironment.a = 10  ✅

Line: let b = 20;
Action: Initialize b (exit TDZ), assign 20
OuterContext.LexicalEnvironment.b = 20  ✅

Line: const c = 30;
Action: Initialize c (exit TDZ), assign 30
OuterContext.LexicalEnvironment.c = 30  ✅

Line: function inner() { ... }
Action: Already hoisted (skip)

Line: inner();
Action: Invoke inner()
→ Create new Execution Context for inner()


STEP 5: INNER() EXECUTION CONTEXT (Creation)
────────────────────────────────────────────
InnerContext {
  VariableEnvironment: {
    arguments: { length: 0 }
  },
  LexicalEnvironment: {
    // (empty - no local variables)
  },
  this: window,
  outer: OuterContext  ✅ CLOSURE! Can access a, b, c, x
}

Call Stack: [GlobalContext, OuterContext, InnerContext]


STEP 6: INNER() EXECUTION CONTEXT (Execution)
────────────────────────────────────────────
Line: console.log(a, b, c, x);
Action: Look up variables in scope chain

1. Look in InnerContext.LexicalEnvironment → Not found
2. Look in InnerContext.outer (OuterContext) → Found!
   - a: 10 ✅
   - b: 20 ✅
   - c: 30 ✅
   - x: 100 ✅

Output: 10 20 30 100

Line: (end of function)
Action: Return undefined, pop from stack

Call Stack: [GlobalContext, OuterContext]


STEP 7: OUTER() COMPLETES
────────────────────────────
Return undefined, pop from stack

Call Stack: [GlobalContext]


STEP 8: GLOBAL COMPLETES
────────────────────────────
Script finished

Call Stack: []
```

---

### Hoisting Deep-Dive

#### Variable Hoisting (var vs let/const)

```javascript
// CODE
console.log(a); // ???
console.log(b); // ???
console.log(c); // ???

var a = 1;
let b = 2;
const c = 3;
```

**What actually happens:**

```javascript
// CREATION PHASE (Hoisting)
var a; // Declared and initialized as undefined
let b; // Declared but NOT initialized (TDZ)
const c; // Declared but NOT initialized (TDZ)

// EXECUTION PHASE
console.log(a); // undefined ✅ (hoisted, initialized)
console.log(b); // ReferenceError ❌ (TDZ)
console.log(c); // ReferenceError ❌ (TDZ)

a = 1; // Assign
b = 2; // Initialize and assign (exits TDZ)
c = 3; // Initialize and assign (exits TDZ)
```

**Memory representation:**

```
CREATION PHASE:
───────────────
VariableEnvironment: {
  a: undefined  ✅ Can access
}
LexicalEnvironment: {
  b: <uninitialized>  ⚠️ TDZ - Cannot access
  c: <uninitialized>  ⚠️ TDZ - Cannot access
}


AFTER EXECUTION:
───────────────
VariableEnvironment: {
  a: 1  ✅
}
LexicalEnvironment: {
  b: 2  ✅ (exited TDZ)
  c: 3  ✅ (exited TDZ)
}
```

---

#### Function Hoisting

```javascript
// FUNCTION DECLARATION (Hoisted completely)
console.log(foo()); // "Hello" ✅ Works!

function foo() {
  return "Hello";
}

// FUNCTION EXPRESSION (NOT hoisted as function)
console.log(bar()); // TypeError: bar is not a function ❌

var bar = function() {
  return "World";
};

// WHY?
// Creation phase:
var bar; // undefined (var hoisting)
// Execution phase:
console.log(bar()); // bar is undefined, not a function!
bar = function() { ... }; // Now it's a function
```

**What's hoisted:**

```javascript
// HOISTED (Creation Phase)
function declaration() { ... }  ✅ Full function
var variableName;  ✅ Variable (as undefined)
let/const variableName;  ✅ Variable (uninitialized, TDZ)
class ClassName;  ✅ Class (uninitialized, TDZ)

// NOT HOISTED (Stay in place)
function expression = function() { ... };  ❌
const arrow = () => { ... };  ❌
```

---

### Scope and Scope Chain

#### Lexical Scope (Static Scope)

```javascript
const global = "I'm global";

function outer() {
  const outerVar = "I'm in outer";
  
  function inner() {
    const innerVar = "I'm in inner";
    
    console.log(global);    // ✅ Can access
    console.log(outerVar);  // ✅ Can access
    console.log(innerVar);  // ✅ Can access
  }
  
  inner();
  console.log(innerVar);  // ❌ ReferenceError
}

outer();
console.log(outerVar);  // ❌ ReferenceError
```

**Scope Chain:**

```
innerContext → outerContext → globalContext
     ↓              ↓              ↓
  innerVar       outerVar        global
  (can see       (can see        (can see
   all 3)         outer +         only
                  global)         global)
```

**Visual Representation:**

```
┌─────────────────────────────────────────┐
│     GLOBAL SCOPE                         │
│  global: "I'm global"                    │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  OUTER SCOPE                       │  │
│  │  outerVar: "I'm in outer"          │  │
│  │                                    │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  INNER SCOPE                │  │  │
│  │  │  innerVar: "I'm in inner"   │  │  │
│  │  │                             │  │  │
│  │  │  Scope chain:               │  │  │
│  │  │  1. innerVar (own scope)    │  │  │
│  │  │  2. outerVar (outer scope)  │  │  │
│  │  │  3. global (global scope)   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

#### Closures (Lexical Environment Preservation)

```javascript
function createCounter() {
  let count = 0; // Private variable
  
  return function increment() {
    count++;
    return count;
  };
}

const counter1 = createCounter();
const counter2 = createCounter();

console.log(counter1()); // 1
console.log(counter1()); // 2
console.log(counter2()); // 1 (separate closure)
console.log(counter1()); // 3
```

**Memory Structure:**

```
AFTER createCounter() FIRST CALL:
──────────────────────────────────

Heap:
┌────────────────────────────────────┐
│  Closure #1                        │
│  ┌──────────────────────────────┐  │
│  │  LexicalEnvironment:         │  │
│  │    count: 0 → 1 → 2 → 3      │  │
│  │                              │  │
│  │  Function: increment         │  │
│  │    References:               │  │
│  │    - count (captured)        │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
         ↑
         │
    counter1 (reference)


AFTER createCounter() SECOND CALL:
──────────────────────────────────

Heap:
┌────────────────────────────────────┐
│  Closure #2 (SEPARATE!)            │
│  ┌──────────────────────────────┐  │
│  │  LexicalEnvironment:         │  │
│  │    count: 0 → 1              │  │
│  │                              │  │
│  │  Function: increment         │  │
│  │    References:               │  │
│  │    - count (captured)        │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
         ↑
         │
    counter2 (reference)

Result: Two independent closures, each with own 'count'
```

---

### Call Stack Deep-Dive

#### Stack Frames

```javascript
function first() {
  console.log("First");
  second();
  console.log("First again");
}

function second() {
  console.log("Second");
  third();
  console.log("Second again");
}

function third() {
  console.log("Third");
}

first();
```

**Call Stack Timeline:**

```
TIME 0ms: Global Execution
──────────────────────────
Call Stack:
┌──────────────────┐
│ Global Context   │ ← Bottom (always present)
└──────────────────┘


TIME 1ms: Invoke first()
──────────────────────────
Call Stack:
┌──────────────────┐
│ first()          │ ← Top (current)
├──────────────────┤
│ Global Context   │
└──────────────────┘

Output: "First"


TIME 2ms: Invoke second() from first()
──────────────────────────
Call Stack:
┌──────────────────┐
│ second()         │ ← Top
├──────────────────┤
│ first()          │
├──────────────────┤
│ Global Context   │
└──────────────────┘

Output: "Second"


TIME 3ms: Invoke third() from second()
──────────────────────────
Call Stack:
┌──────────────────┐
│ third()          │ ← Top
├──────────────────┤
│ second()         │
├──────────────────┤
│ first()          │
├──────────────────┤
│ Global Context   │
└──────────────────┘

Output: "Third"


TIME 4ms: third() completes, return to second()
──────────────────────────
Call Stack:
┌──────────────────┐
│ second()         │ ← Top (back here)
├──────────────────┤
│ first()          │
├──────────────────┤
│ Global Context   │
└──────────────────┘

Output: "Second again"


TIME 5ms: second() completes, return to first()
──────────────────────────
Call Stack:
┌──────────────────┐
│ first()          │ ← Top (back here)
├──────────────────┤
│ Global Context   │
└──────────────────┘

Output: "First again"


TIME 6ms: first() completes
──────────────────────────
Call Stack:
┌──────────────────┐
│ Global Context   │
└──────────────────┘

Done!


FINAL OUTPUT:
First
Second
Third
Second again
First again
```

---

#### Stack Overflow

```javascript
// ❌ INFINITE RECURSION (Stack Overflow)
function recursive() {
  recursive(); // No base case!
}

recursive();
// Uncaught RangeError: Maximum call stack size exceeded

// WHY?
// Call stack grows unbounded:
// [global, recursive, recursive, recursive, ... × 10,000]
// Eventually exceeds maximum stack size (typically ~10k-20k frames)
```

**Stack Growth:**

```
Frame 1:     [global, recursive]
Frame 2:     [global, recursive, recursive]
Frame 3:     [global, recursive, recursive, recursive]
...
Frame 10,000: [global, recursive × 10,000]
Frame 10,001: ❌ RangeError: Maximum call stack size exceeded
```

**Solution: Add base case**

```javascript
// ✅ PROPER RECURSION (With base case)
function factorial(n) {
  if (n <= 1) return 1; // Base case ✅
  return n * factorial(n - 1);
}

console.log(factorial(5)); // 120

// Call stack (max depth: 5):
// [global]
// [global, factorial(5)]
// [global, factorial(5), factorial(4)]
// [global, factorial(5), factorial(4), factorial(3)]
// [global, factorial(5), factorial(4), factorial(3), factorial(2)]
// [global, factorial(5), factorial(4), factorial(3), factorial(2), factorial(1)]
// → Returns 1, stack unwinds
```

---

### This Binding

#### This in Different Contexts

```javascript
// 1. GLOBAL CONTEXT
console.log(this); // window (browser) or global (Node.js)

// 2. FUNCTION CONTEXT (Non-strict mode)
function regularFunction() {
  console.log(this); // window (implicit binding)
}
regularFunction();

// 3. FUNCTION CONTEXT (Strict mode)
'use strict';
function strictFunction() {
  console.log(this); // undefined ✅
}
strictFunction();

// 4. METHOD CALL (Implicit binding)
const obj = {
  name: "Alice",
  greet: function() {
    console.log(this.name); // "Alice" (this = obj)
  }
};
obj.greet();

// 5. LOST CONTEXT (Common bug!)
const greetFunc = obj.greet;
greetFunc(); // undefined or error (this = window/undefined)

// 6. EXPLICIT BINDING (call, apply, bind)
greetFunc.call(obj); // "Alice" (this explicitly set to obj)
greetFunc.apply(obj); // "Alice" (same as call, different args)
const boundGreet = greetFunc.bind(obj);
boundGreet(); // "Alice" (permanently bound)

// 7. ARROW FUNCTION (Lexical this)
const obj2 = {
  name: "Bob",
  greet: function() {
    const inner = () => {
      console.log(this.name); // "Bob" (inherits from greet's this)
    };
    inner();
  }
};
obj2.greet();

// 8. CONSTRUCTOR (new binding)
function Person(name) {
  this.name = name; // this = new empty object
}
const person = new Person("Charlie");
console.log(person.name); // "Charlie"

// 9. EVENT LISTENER (this = element)
button.addEventListener('click', function() {
  console.log(this); // <button> element
});

// 10. EVENT LISTENER (Arrow function)
button.addEventListener('click', () => {
  console.log(this); // window (lexical, not button!)
});
```

---

## 3. Clear Real-World Examples

### Example 1: Temporal Dead Zone (TDZ) Bug

**Problem:** Accessing let/const before declaration

```javascript
// ❌ BUG: TDZ error
function initializeApp() {
  console.log(config); // ReferenceError: Cannot access 'config' before initialization
  
  let config = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
  };
  
  return config;
}

initializeApp();
```

**Why it fails:**

```
CREATION PHASE:
LexicalEnvironment: {
  config: <uninitialized> ⚠️ TDZ
}

EXECUTION PHASE:
Line: console.log(config)
Action: Look up 'config' in LexicalEnvironment
Result: Found, but in TDZ → ReferenceError ❌
```

**Fix: Use before declare (or use var)**

```javascript
// ✅ FIXED: Declare before use
function initializeApp() {
  let config = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
  };
  
  console.log(config); // ✅ Works
  
  return config;
}
```

---

### Example 2: Closure Memory Leak

**Problem:** Accidental large scope capture

```javascript
// ❌ MEMORY LEAK
function setupEventHandlers() {
  const hugeArray = new Array(1000000).fill('data'); // 8 MB
  const metadata = { count: hugeArray.length };
  
  document.getElementById('button').addEventListener('click', () => {
    // Only uses metadata, but closure captures ENTIRE scope!
    console.log('Count:', metadata.count);
    // hugeArray also captured → 8 MB leaked!
  });
}

setupEventHandlers();
// After this function runs, hugeArray should be GC'd
// But closure keeps it alive → Memory leak!
```

**Memory analysis:**

```
Closure's [[Scopes]]:
├─ setupEventHandlers scope
│  ├─ hugeArray: [1,000,000 items] ← 8 MB leaked! ❌
│  └─ metadata: { count: 1000000 }
└─ Global scope

Event listener → Closure → hugeArray
Result: 8 MB stays in memory as long as listener exists
```

**Fix: Limit closure scope**

```javascript
// ✅ FIXED: Extract only what's needed
function setupEventHandlers() {
  const hugeArray = new Array(1000000).fill('data'); // 8 MB
  const metadata = { count: hugeArray.length };
  
  // Extract primitive value (breaks reference to hugeArray)
  const count = metadata.count;
  
  document.getElementById('button').addEventListener('click', () => {
    console.log('Count:', count); // Only captures 'count' (8 bytes)
    // hugeArray NOT captured → Can be GC'd ✅
  });
}

setupEventHandlers();
// hugeArray is GC'd after function completes ✅
```

**After fix:**

```
Closure's [[Scopes]]:
├─ setupEventHandlers scope
│  └─ count: 1000000 ← Only 8 bytes ✅
└─ Global scope

Memory saved: 8 MB → 8 bytes (99.9999% reduction!)
```

---

### Example 3: Lost 'this' Context

**Problem:** Common React bug

```javascript
// ❌ BUG: Lost 'this' context
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  
  increment() {
    // 'this' is undefined when called from event handler!
    this.setState({ count: this.state.count + 1 });
    // TypeError: Cannot read property 'setState' of undefined
  }
  
  render() {
    return (
      <button onClick={this.increment}>
        Count: {this.state.count}
      </button>
    );
  }
}
```

**Why it fails:**

```
// When button clicked:
const handler = this.increment; // Extract method (loses 'this')
handler(); // Called as regular function, 'this' = undefined

// What's happening:
<button onClick={this.increment}> 
// Equivalent to:
button.addEventListener('click', this.increment);
// 'increment' called without context → 'this' = undefined
```

**Solutions:**

```javascript
// SOLUTION 1: Arrow function in render (creates new function each render)
render() {
  return (
    <button onClick={() => this.increment()}>
      Count: {this.state.count}
    </button>
  );
}

// SOLUTION 2: Bind in constructor (best performance)
constructor(props) {
  super(props);
  this.state = { count: 0 };
  this.increment = this.increment.bind(this); // ✅
}

// SOLUTION 3: Class field with arrow function (modern)
increment = () => {
  this.setState({ count: this.state.count + 1 });
}

// SOLUTION 4: Arrow function in JSX (concise)
render() {
  return (
    <button onClick={() => this.increment()}>
      Count: {this.state.count}
    </button>
  );
}
```

---

### Example 4: Hoisting Gotcha

**Problem:** var hoisting causing unexpected behavior

```javascript
// ❌ BUG: Unexpected behavior
var results = [];

for (var i = 0; i < 5; i++) {
  results.push(function() {
    console.log(i);
  });
}

results[0](); // 5 (expected 0) ❌
results[1](); // 5 (expected 1) ❌
results[2](); // 5 (expected 2) ❌
```

**Why?**

```
// What actually happens (hoisting):
var i; // Hoisted to top
var results = [];

for (i = 0; i < 5; i++) {
  results.push(function() {
    console.log(i); // Closure captures reference to 'i', not value
  });
}

// After loop: i = 5

// When calling:
results[0](); // Looks up 'i' → 5 (current value)
```

**Closure capture:**

```
All 5 functions share same closure:
┌──────────────────────────┐
│  Closure                 │
│  ├─ i: 5 (shared!)       │ ← All functions reference same 'i'
│  │                       │
│  ├─ Function 0 ─────────┤
│  ├─ Function 1 ─────────┤
│  ├─ Function 2 ─────────┤
│  ├─ Function 3 ─────────┤
│  └─ Function 4 ─────────┤
└──────────────────────────┘
```

**Solutions:**

```javascript
// SOLUTION 1: Use let (block scope)
for (let i = 0; i < 5; i++) {
  results.push(function() {
    console.log(i); // Each iteration has own 'i' ✅
  });
}

// SOLUTION 2: IIFE (capture value)
for (var i = 0; i < 5; i++) {
  results.push((function(j) {
    return function() {
      console.log(j); // Captures 'j' (copy of 'i')
    };
  })(i));
}

// SOLUTION 3: Array.from with arrow function
results = Array.from({ length: 5 }, (_, i) => () => console.log(i));

results[0](); // 0 ✅
results[1](); // 1 ✅
results[2](); // 2 ✅
```

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "Explain the JavaScript execution model and how closures work."

**Your Answer:**

> "JavaScript has a sophisticated execution model built on execution contexts, the call stack, and scope chains.
>
> **1. Execution Contexts**
>
> Every function creates an execution context with three key components:
> ```
> ExecutionContext {
>   VariableEnvironment: {
>     // var, function declarations (hoisted)
>   },
>   LexicalEnvironment: {
>     // let, const (TDZ until initialized)
>   },
>   ThisBinding: // Depends on invocation
> }
> ```
>
> **2. Two-Phase Process**
>
> **Creation Phase:**
> - Hoist function declarations (fully)
> - Hoist var declarations (initialize as undefined)
> - Create let/const (uninitialized - TDZ)
> - Establish scope chain
> - Determine 'this'
>
> **Execution Phase:**
> - Execute code line by line
> - Assign values to variables
> - Invoke functions (create new contexts)
>
> **3. Closures**
>
> A closure is a function that retains access to its outer lexical environment, even after the outer function has returned:
>
> ```javascript
> function createCounter() {
>   let count = 0; // Private variable
>   
>   return function increment() {
>     count++; // Accesses outer 'count' via closure
>     return count;
>   };
> }
>
> const counter = createCounter();
> counter(); // 1
> counter(); // 2
> // 'count' persists because increment() closes over it
> ```
>
> **Memory structure:**
> ```
> Heap:
> ┌────────────────────────────┐
> │ Closure                    │
> │ ├─ count: 2                │ ← Persists!
> │ └─ increment function      │
> └────────────────────────────┘
>          ↑
>     counter (reference)
> ```
>
> **4. Call Stack**
>
> JavaScript is single-threaded with a LIFO call stack:
> ```
> function a() { b(); }
> function b() { c(); }
> function c() { console.log('Hi'); }
> a();
>
> Stack: [global]
>     → [global, a]
>     → [global, a, b]
>     → [global, a, b, c] ← Top
>     → [global, a, b]    (c returns)
>     → [global, a]       (b returns)
>     → [global]          (a returns)
> ```
>
> **Real-World Example:**
>
> At [Company], we had a memory leak in our analytics dashboard. Every 5 seconds, we fetched data and updated charts. After 1 hour, the tab crashed (2 GB memory).
>
> **Root cause:**
> ```javascript
> // ❌ BUG
> function setupChart(data) {
>   const largeDataset = processData(data); // 10 MB
>   
>   setInterval(() => {
>     updateChart(); // Closure captures largeDataset ❌
>     // Even though updateChart() doesn't use largeDataset!
>   }, 5000);
> }
>
> // Every call to setupChart() creates closure with 10 MB
> // After 100 updates: 1 GB leaked
> ```
>
> **Solution:**
> ```javascript
> // ✅ FIXED
> function setupChart(data) {
>   const largeDataset = processData(data);
>   const chartConfig = extractConfig(largeDataset); // 1 KB
>   
>   setInterval(() => {
>     updateChart(chartConfig); // Only captures chartConfig ✅
>   }, 5000);
>   
>   // largeDataset can be GC'd after extractConfig()
> }
>
> // Memory: 1 KB per update (99.99% reduction)
> ```
>
> **Results:**
> - Memory stable at 50 MB (was growing to 2 GB) ✅
> - No more crashes ✅
> - Performance improved 40% (less GC pressure) ✅
>
> **Key Takeaway:**
> Understanding execution contexts and closures isn't just theory—it's essential for debugging scope issues, optimizing performance, and preventing memory leaks in production applications."

---

### Common Interview Mistakes

#### Mistake 1: Not Understanding Hoisting

```
❌ Bad Answer:
"Hoisting moves code to the top of the file"

→ Oversimplified and technically wrong
```

```
✅ Good Answer:
"Hoisting is the behavior during the Creation Phase where:

**Function declarations:**
- Fully hoisted (can call before declaration)
```javascript
foo(); // ✅ Works
function foo() { return 'hello'; }
```

**var declarations:**
- Hoisted, initialized as undefined
```javascript
console.log(x); // undefined (not ReferenceError)
var x = 10;
```

**let/const:**
- Hoisted, but NOT initialized (TDZ)
```javascript
console.log(y); // ReferenceError ❌
let y = 20;
```

**Why it matters:**
- Explains 'undefined' vs ReferenceError
- Helps debug scope issues
- Informs variable declaration choices (prefer const/let)
"
```

---

#### Mistake 2: Not Understanding Closures

```
❌ Bad Answer:
"A closure is when a function uses variables from outside"

→ Missing key insight about persistence
```

```
✅ Good Answer:
"A closure is a function that retains access to its lexical scope, even after the outer function has returned.

**Key insight:** The lexical environment is preserved in memory:

```javascript
function outer() {
  let count = 0;
  
  return function inner() {
    count++;
    return count;
  };
}

const fn = outer();
// outer() has returned, but 'count' is still alive!
fn(); // 1
fn(); // 2
```

**Why count persists:**
```
Heap:
┌──────────────────────┐
│ Closure              │
│ ├─ count: 2          │ ← Kept alive by inner()
│ └─ inner function    │
└──────────────────────┘
```

**Use cases:**
- Private variables (module pattern)
- Factory functions (create multiple instances)
- Event handlers (capture state)
- Partial application (currying)

**Pitfall:** Closures can cause memory leaks if they capture large scopes unintentionally."
```

---

#### Mistake 3: Confusing 'this' Binding

```
❌ Bad Answer:
"'this' refers to the function"

→ Fundamentally wrong
```

```
✅ Good Answer:
"'this' binding depends on HOW a function is called, not where it's defined:

**1. Global/Function context:**
```javascript
function fn() {
  console.log(this); // window (non-strict) or undefined (strict)
}
fn();
```

**2. Method call:**
```javascript
const obj = { name: 'Alice', greet() { console.log(this.name); } };
obj.greet(); // 'Alice' (this = obj)
```

**3. Lost context (common bug):**
```javascript
const greet = obj.greet;
greet(); // undefined (this = window/undefined)
```

**4. Explicit binding:**
```javascript
greet.call(obj); // 'Alice' (this = obj)
```

**5. Arrow functions (lexical this):**
```javascript
const obj2 = {
  greet: function() {
    setTimeout(() => {
      console.log(this.name); // 'Alice' (inherits from greet)
    }, 100);
  }
};
```

**6. new binding:**
```javascript
function Person(name) {
  this.name = name; // this = new empty object
}
const p = new Person('Bob'); // this = p
```

**Priority:** new > explicit (call/bind) > implicit (method) > default (global/undefined)
"
```

---

## 5. Code Examples

### Complete Example: Execution Context Visualizer

```javascript
/**
 * Execution context visualizer
 * Helps understand scope, closures, and call stack
 */

class ExecutionContextVisualizer {
  constructor() {
    this.callStack = [];
    this.globalContext = {
      type: 'Global',
      variables: {},
      functions: {},
    };
    this.callStack.push(this.globalContext);
  }
  
  /**
   * Simulate function call
   */
  callFunction(name, params = {}, code) {
    const functionContext = {
      type: 'Function',
      name,
      variables: { ...params },
      functions: {},
      outer: this.currentContext(),
    };
    
    this.callStack.push(functionContext);
    console.log(`\n📞 Calling ${name}()`);
    this.visualizeStack();
    
    // Execute code
    if (code) code(this);
    
    return this;
  }
  
  /**
   * Simulate function return
   */
  returnFromFunction() {
    const returned = this.callStack.pop();
    console.log(`\n↩️  Returning from ${returned.name || returned.type}()`);
    this.visualizeStack();
    return this;
  }
  
  /**
   * Declare variable
   */
  declareVariable(name, value) {
    const context = this.currentContext();
    context.variables[name] = value;
    console.log(`  📝 ${name} = ${JSON.stringify(value)}`);
    return this;
  }
  
  /**
   * Look up variable (walks scope chain)
   */
  lookupVariable(name) {
    let context = this.currentContext();
    
    console.log(`\n🔍 Looking up '${name}':`);
    
    while (context) {
      if (name in context.variables) {
        console.log(`  ✅ Found in ${context.name || context.type} scope: ${context.variables[name]}`);
        return context.variables[name];
      }
      
      console.log(`  ❌ Not in ${context.name || context.type} scope`);
      context = context.outer;
    }
    
    console.log(`  ❌ ReferenceError: ${name} is not defined`);
    return undefined;
  }
  
  /**
   * Get current context
   */
  currentContext() {
    return this.callStack[this.callStack.length - 1];
  }
  
  /**
   * Visualize call stack
   */
  visualizeStack() {
    console.log('\n📚 Call Stack:');
    
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      const context = this.callStack[i];
      const arrow = i === this.callStack.length - 1 ? '👉' : '  ';
      
      console.log(`${arrow} [${context.name || context.type}]`);
      
      if (Object.keys(context.variables).length > 0) {
        console.log(`   Variables: ${JSON.stringify(context.variables)}`);
      }
    }
  }
}

// Usage Example: Simulating nested function calls

console.log('=== SIMULATING EXECUTION ===\n');

const viz = new ExecutionContextVisualizer();

// Global scope
viz.declareVariable('globalVar', 'I am global');

// Call outer()
viz.callFunction('outer', { x: 100 }, (viz) => {
  viz.declareVariable('outerVar', 'I am in outer');
  
  // Call inner()
  viz.callFunction('inner', {}, (viz) => {
    viz.declareVariable('innerVar', 'I am in inner');
    
    // Look up variables (demonstrates scope chain)
    viz.lookupVariable('innerVar');  // Found in inner
    viz.lookupVariable('outerVar');  // Found in outer
    viz.lookupVariable('x');         // Found in outer (parameter)
    viz.lookupVariable('globalVar'); // Found in global
    viz.lookupVariable('unknown');   // Not found (ReferenceError)
  });
  
  viz.returnFromFunction(); // Return from inner
});

viz.returnFromFunction(); // Return from outer

/* Output:
=== SIMULATING EXECUTION ===

  📝 globalVar = "I am global"

📞 Calling outer()

📚 Call Stack:
👉 [outer]
   Variables: {"x":100}
   [Global]
   Variables: {"globalVar":"I am global"}

  📝 outerVar = "I am in outer"

📞 Calling inner()

📚 Call Stack:
👉 [inner]
   Variables: {}
   [outer]
   Variables: {"x":100,"outerVar":"I am in outer"}
   [Global]
   Variables: {"globalVar":"I am global"}

  📝 innerVar = "I am in inner"

🔍 Looking up 'innerVar':
  ✅ Found in inner scope: I am in inner

🔍 Looking up 'outerVar':
  ❌ Not in inner scope
  ✅ Found in outer scope: I am in outer

🔍 Looking up 'x':
  ❌ Not in inner scope
  ✅ Found in outer scope: 100

🔍 Looking up 'globalVar':
  ❌ Not in inner scope
  ❌ Not in outer scope
  ✅ Found in Global scope: I am global

🔍 Looking up 'unknown':
  ❌ Not in inner scope
  ❌ Not in outer scope
  ❌ Not in Global scope
  ❌ ReferenceError: unknown is not defined

↩️  Returning from inner()

📚 Call Stack:
👉 [outer]
   Variables: {"x":100,"outerVar":"I am in outer"}
   [Global]
   Variables: {"globalVar":"I am global"}

↩️  Returning from outer()

📚 Call Stack:
👉 [Global]
   Variables: {"globalVar":"I am global"}
*/
```

---

## 6. Why & How Summary

### Why Execution Model Matters

**Debugging:**
- Understand scope issues (ReferenceError vs undefined)
- Debug closure-related bugs
- Trace call stack in errors

**Performance:**
- Avoid stack overflow (recursion limits)
- Prevent memory leaks (large closure captures)
- Optimize variable access (scope chain lookups)

**Code Quality:**
- Write predictable code (understand hoisting)
- Proper 'this' handling (avoid context loss)
- Effective closures (module pattern, private variables)

**Business Impact:**
- Memory leaks → Tab crashes → Lost user work
- Stack overflow → Application errors → Poor UX
- Understanding execution → Better debugging → Faster fixes

---

### How to Optimize

**1. Avoid Large Closure Captures**
```javascript
// ❌ Bad: Captures huge array
function setup() {
  const hugeArray = new Array(1000000);
  return () => console.log(hugeArray.length);
}

// ✅ Good: Only captures length
function setup() {
  const hugeArray = new Array(1000000);
  const length = hugeArray.length;
  return () => console.log(length);
}
```

**2. Use Tail Call Optimization (where available)**
```javascript
// ❌ Not tail-call optimized
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1); // Multiply AFTER return
}

// ✅ Tail-call optimized (ES6 strict mode)
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc); // Return directly
}
```

**3. Prefer const/let over var**
```javascript
// ❌ var: Function scope, hoisted
for (var i = 0; i < 5; i++) { }
console.log(i); // 5 (leaked!)

// ✅ let: Block scope
for (let i = 0; i < 5; i++) { }
console.log(i); // ReferenceError (not leaked)
```

**4. Bind 'this' Correctly**
```javascript
// ❌ Lost context
class Component {
  handleClick() {
    this.setState({ ... }); // Error: 'this' is undefined
  }
  render() {
    return <button onClick={this.handleClick} />;
  }
}

// ✅ Bound context
class Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
  }
  // Or use arrow function:
  handleClick = () => {
    this.setState({ ... }); // Works!
  }
}
```

---

### Quick Reference

**Execution Context Components:**
- Variable Environment (var, function)
- Lexical Environment (let, const)
- This Binding
- Outer Environment (scope chain)

**Hoisting:**
- Function declarations: Fully hoisted
- var: Hoisted as undefined
- let/const: Hoisted in TDZ (uninitialized)

**This Binding Priority:**
1. new binding (constructor)
2. Explicit binding (call, apply, bind)
3. Implicit binding (method call)
4. Default binding (global/undefined)
5. Arrow functions (lexical, ignore all above)

**Common Pitfalls:**
- TDZ with let/const
- Lost 'this' context
- Accidental global variables
- Large closure captures
- Stack overflow (no base case)

---

**Next Topic:** Reflows vs Repaints

