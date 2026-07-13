---

# Phase 1: Foundation Fortification (Days 1–21)

> **Phase Goal:** Build an unshakeable foundation in JavaScript internals, browser mechanics, CSS architecture, and React internals. By Day 21, you can confidently handle any JS/browser/React question thrown at you in a Google or Meta interview.

> **Why Phase 1 first?** Every other topic — system design, performance, security — requires deep JS and browser knowledge as a prerequisite. Engineers who skip this and go straight to system design give shallow, memorized answers. Engineers who nail this phase can *derive* answers they've never seen before.

---

## Week 1 (Days 1–7): JavaScript Engine & Language Internals

### DAY 1 — The JavaScript Engine: V8, Execution Context, Call Stack

**Why it matters:** This is the most frequently asked topic at Google and Meta. Interviewers use V8 questions to separate engineers who have *used* JavaScript from engineers who *understand* it. Every subsequent topic (closures, async, memory) builds on this.

**Study Agenda (75 min)**

- How V8 works: parsing → AST → Ignition (bytecode) → TurboFan (JIT compilation)
- Execution Context: creation phase vs execution phase
- Call Stack mechanics, stack frames, stack overflow
- Global Execution Context vs Function Execution Context
- Lexical environment and variable environment
- How `var`, `let`, `const` behave differently in execution context creation

**Hands-on (10 min)**
Trace through this code manually on paper, predicting every step:
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

**Expected Outcome:** You can draw the call stack and execution context for any given code snippet. You can explain what happens before the first line of code runs.

**Deliverable before Day 2:** Write a 150-word explanation of V8's compilation pipeline as if explaining to an interviewer. No notes.

---

**📝 Day 1 Interview Practice Questions**

*Attempt all questions independently before checking answers.*

1. **(Medium | Google, Meta)** Explain the difference between the compilation and interpretation phases in V8. What is JIT compilation and why does it matter for performance?

2. **(Easy | All Companies)** What is an Execution Context? How many types exist in JavaScript, and what is created inside each one?

3. **(Medium | Google, Microsoft)** What is the Temporal Dead Zone (TDZ)? Write code that demonstrates it. How does it differ between `var`, `let`, and `const`?

4. **(Medium | Meta, Stripe)** What happens when the call stack overflows? Write code that causes a stack overflow. How would you rewrite it to avoid it?

5. **(Hard | Google)** Explain how V8's Ignition and TurboFan work together. What triggers deoptimization and how can a developer accidentally cause it?

6. **(Medium | Adobe, Salesforce)** What is the difference between `[[Scope]]` and the scope chain? How does JavaScript resolve variable lookups?

7. **(Easy | Microsoft, Cisco)** What is hoisting? Explain the difference in hoisting behavior between `var`, `let`, `const`, and function declarations.

8. **(Medium | Airbnb, Netflix)** Given a deeply recursive function that's causing a stack overflow on large inputs, how would you refactor it to be iterative? What's the tradeoff?

9. **(Hard | Google, Meta)** What is an "inline cache" in V8? How does it optimize property access? What breaks it?

10. **(Medium | Stripe, Uber)** Walk me through what happens — in precise sequence — from the moment `outer()` is called until `console.log` executes, referencing execution contexts and the call stack.

---

### DAY 2 — The Event Loop, Task Queue, Microtask Queue

**Why it matters:** This is asked in virtually every Big Tech frontend interview. Meta and Google use async/event loop questions as a proxy for understanding concurrency, which is fundamental to building performant UIs.

**Study Agenda (75 min)**

- JavaScript's single-threaded model
- Web APIs (setTimeout, fetch, DOM events) — they live outside the JS engine
- Task Queue (Macrotask queue): setTimeout, setInterval, I/O, UI rendering
- Microtask Queue: Promise callbacks, queueMicrotask, MutationObserver
- The Event Loop algorithm: step-by-step rules
- Why microtasks always drain before the next macrotask
- `requestAnimationFrame` — where does it fit in?
- How `async/await` maps to the microtask queue

**Hands-on (10 min)**
Without running it, predict the exact output and explain each line:
```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
Promise.resolve().then(() => {
  console.log('4');
  setTimeout(() => console.log('5'), 0);
});
console.log('6');
```

**Expected Outcome:** You can trace any async code's execution order with 100% accuracy. You can explain the event loop to a junior and to a staff engineer.

**Deliverable before Day 3:** Predict output of 3 async puzzles from your notes. Draw the event loop diagram from memory.

---

**📝 Day 2 Interview Practice Questions**

1. **(Medium | Google, Meta, Microsoft)** Explain the JavaScript Event Loop. What is the difference between the task queue and the microtask queue?

2. **(Hard | Google, Stripe)** What is the exact output of this code and why?
   ```javascript
   async function foo() {
     console.log('A');
     await Promise.resolve();
     console.log('B');
   }
   console.log('C');
   foo();
   console.log('D');
   ```

3. **(Medium | Meta, Airbnb)** Why does `setTimeout(fn, 0)` not guarantee immediate execution? What are the practical implications for UI developers?

4. **(Hard | Netflix, Uber)** How would you implement a task scheduler that processes jobs with different priorities, ensuring high-priority jobs don't starve the UI thread?

5. **(Medium | Adobe, Salesforce)** What is `queueMicrotask()`? When would you use it over `Promise.resolve().then()`?

6. **(Medium | Google, Microsoft)** Where does `requestAnimationFrame` fit in the event loop? Why is it better than `setTimeout(fn, 16)` for animations?

7. **(Hard | Meta, Google)** Explain the difference between `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`. When would you use each?

8. **(Medium | Stripe, Cisco)** What is "starvation" in the context of the event loop? How can an infinite chain of microtasks block UI rendering?

9. **(Medium | Airbnb, Netflix)** You have a function that processes a large array synchronously, causing UI jank. How would you fix this using the event loop?

10. **(Easy | All Companies)** Can a Promise be cancelled in JavaScript? How do you handle cleanup for a long-running async operation?

11. **(Hard | Google)** What is the relationship between `async/await` and the microtask queue at the bytecode level? How does `await` pause and resume a function?

12. **(Medium | Meta, Microsoft)** Explain how `MutationObserver` uses the microtask queue. How does this differ from `setTimeout`-based DOM polling?

---

### DAY 3 — Closures, Scope Chain, and Lexical Environment

**Why it matters:** Closures power module patterns, memoization, currying, React hooks state management, and more. Google and Meta interviewers use closures to test deep understanding — not just "a function remembering its outer scope."

**Study Agenda (75 min)**

- Lexical scoping: scope determined at write time, not run time
- Closure definition: a function + its lexical environment
- How closures create persistent references (not copies) to variables
- Classic closure bugs: closures in loops with `var` vs `let`
- Practical patterns: module pattern, factory functions, memoization
- Closures and memory: when they help (encapsulation) and hurt (memory leaks)
- How React's `useState` and `useEffect` leverage closures for stale closures

**Hands-on (15 min)**
Implement a working `memoize()` function using closures:
```javascript
function memoize(fn) {
  // Your implementation
}
```
Then implement a counter factory that creates isolated counters.

**Expected Outcome:** You can identify where closures are formed in any code, explain what they capture, and implement closure-based patterns from scratch.

---

**📝 Day 3 Interview Practice Questions**

1. **(Easy | All Companies)** What is a closure? Give a practical real-world example of where you've used closures in a production codebase.

2. **(Medium | Meta, Google)** What is the classic "closure in a loop" problem with `var`? Write both the broken version and the fixed version using both `let` and an IIFE.

3. **(Medium | Stripe, Netflix)** Implement a `once(fn)` function that ensures `fn` is called at most once, no matter how many times the returned function is invoked.

4. **(Hard | Google)** What is a "stale closure" in React? Write a code example that demonstrates the bug and explain how to fix it using `useRef` or functional updates.

5. **(Medium | Airbnb, Adobe)** Implement a `debounce(fn, delay)` function using closures. Then implement `throttle(fn, delay)`. What's the difference and when do you use each?

6. **(Hard | Meta, Microsoft)** Implement a currying function: `curry(fn)` such that `curry(add)(1)(2)(3)` works for any arity function.

7. **(Medium | All Companies)** How do closures cause memory leaks? Give a specific scenario and explain how to fix it.

8. **(Medium | Google, Stripe)** Explain the Module Pattern in JavaScript. How does it use closures to achieve encapsulation? How does ES Modules compare?

9. **(Hard | Meta, Netflix)** Implement a `memoize` function that handles functions with multiple arguments. What caching strategy would you use for complex argument types?

10. **(Medium | Cisco, Qualcomm)** What is the difference between a closure and a class in terms of encapsulating private state? When would you choose one over the other?

---

### DAY 4 — Prototypal Inheritance & `this` Binding

**Why it matters:** Prototypes are the backbone of JavaScript's object model. Every object, function, and class relies on them. Google interviewers specifically probe `this` binding because it reveals whether you truly understand how JS was designed.

**Study Agenda (75 min)**

- Prototype chain: `[[Prototype]]`, `__proto__`, `Object.getPrototypeOf()`
- `Object.create()`, `Object.assign()`, prototype-based inheritance
- The 4 rules of `this` binding: implicit, explicit, `new`, default/global
- Arrow functions and lexical `this` — why they're different
- `call()`, `apply()`, `bind()` — differences and use cases
- Class syntax as syntactic sugar over prototypes
- `instanceof` and `Object.prototype.toString`
- `hasOwnProperty` vs in operator

**Hands-on (10 min)**
Implement `Object.create()` from scratch. Then implement a simple inheritance chain using both prototype-based and class-based syntax.

**Expected Outcome:** You can trace the prototype chain for any object. You can predict the value of `this` in any context. You can implement inheritance without using `class`.

---

**📝 Day 4 Interview Practice Questions**

1. **(Medium | Google, Meta)** Explain the prototype chain. What is `[[Prototype]]` and how is it different from the `prototype` property on functions?

2. **(Medium | All Companies)** What are the 4 rules of `this` binding? Rank them by precedence. What happens in strict mode?

3. **(Easy | Microsoft, Adobe)** What is the difference between `call()`, `apply()`, and `bind()`? Give a practical example of each.

4. **(Hard | Google)** Implement `Function.prototype.bind` from scratch without using the native `bind`.

5. **(Medium | Meta, Stripe)** Why do arrow functions not have their own `this`? How does this make them both useful and limiting?

6. **(Hard | Google, Netflix)** What is the difference between classical inheritance and prototypal inheritance? What are the tradeoffs?

7. **(Medium | Airbnb, Uber)** What does `new` actually do step by step? Implement your own `new` operator as a function.

8. **(Medium | Adobe, Salesforce)** Explain `Object.create(null)`. When would you want an object with no prototype?

9. **(Hard | Meta, Microsoft)** What is "prototype pollution"? How can it be used as a security vulnerability? How do you defend against it?

10. **(Medium | Google, Stripe)** How does class-based `extends` work under the hood? What does `super()` actually do in the constructor?

11. **(Easy | All Companies)** What is the difference between `Object.assign()` and the spread operator for object copying? What are the limitations of each?

---

### DAY 5 — Asynchronous JavaScript Deep Dive: Promises & Async/Await

**Why it matters:** Async patterns are used in every real application and tested at every company. Stripe and Netflix especially probe error handling and chaining patterns. This builds directly on Day 2's event loop knowledge.

**Study Agenda (75 min)**

- Promise internals: states (pending/fulfilled/rejected), executor, microtask scheduling
- Promise chaining: `.then()`, `.catch()`, `.finally()` — return values matter
- Error propagation through chains
- `async/await` as syntactic sugar — how it compiles down
- Top-level await (ES2022)
- Common pitfalls: forgetting `await`, error swallowing, sequential vs parallel
- `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any`
- Implementing your own Promise from scratch (concept-level)
- Real patterns: retry logic, timeout wrappers, concurrent request limiting

**Hands-on (15 min)**
Implement:
1. A `fetchWithTimeout(url, ms)` function
2. A `retry(fn, times)` that retries a failing async function
3. A `parallelLimit(tasks, limit)` that runs tasks with max concurrency

**Expected Outcome:** You can write clean async code and explain every design decision. You can debug promise chains. You can implement utility functions around promises.

---

**📝 Day 5 Interview Practice Questions**

1. **(Medium | Meta, Stripe)** What are the three states of a Promise? Can a resolved promise ever become rejected?

2. **(Hard | Google, Stripe)** Implement `Promise.all()` from scratch using only the basic `Promise` constructor.

3. **(Medium | All Companies)** What is the difference between these two patterns? Which is better and why?
   ```javascript
   // Pattern A
   async function a() { await doA(); await doB(); }
   // Pattern B
   async function b() { await Promise.all([doA(), doB()]); }
   ```

4. **(Hard | Netflix, Airbnb)** Implement a function `concurrentLimit(tasks, limit)` that executes an array of async tasks with a maximum concurrency of `limit`.

5. **(Medium | Microsoft, Adobe)** How do you properly handle errors in a Promise chain? What happens if you throw inside a `.then()` callback?

6. **(Medium | Google, Meta)** Write a `fetchWithRetry(url, retries, delay)` function that retries failed requests with exponential backoff.

7. **(Hard | Stripe)** Implement your own basic `Promise` class from scratch, supporting `.then()`, `.catch()`, and chaining.

8. **(Medium | Uber, Salesforce)** What is the difference between `async/await` and returning a Promise manually? Are they functionally equivalent?

9. **(Easy | All Companies)** What happens if you don't `await` an async function? What if you `await` a non-Promise value?

10. **(Hard | Google, Meta)** Implement a rate limiter that allows at most N calls per second for an API function. Requests beyond the limit should be queued.

11. **(Medium | Netflix, Microsoft)** How would you implement request deduplication — if the same API call is made 5 times simultaneously, only one actual request is sent?

---

### DAY 6 — Memory Management, Garbage Collection, and WeakMap/WeakSet

**Why it matters:** Memory management separates senior engineers from those who just ship features. Netflix and Google probe this heavily for performance-critical roles. Understanding GC helps you design leak-free applications.

**Study Agenda (75 min)**

- JavaScript's memory model: heap vs stack
- Mark-and-sweep garbage collection algorithm
- Memory leak patterns: forgotten event listeners, global variables, closures retaining DOM nodes, timers
- WeakMap and WeakSet: weak references, no memory leak, non-enumerable
- Practical use cases for WeakMap: private class data, caching without leak
- Detached DOM nodes — a common interview trick
- Memory profiling in Chrome DevTools (conceptual understanding)
- Generational garbage collection in V8

**Hands-on (10 min)**
Identify all memory leaks in this code and fix them:
```javascript
function createApp() {
  const cache = {};
  const button = document.getElementById('btn');
  button.addEventListener('click', function() {
    const data = fetchData();
    cache[Date.now()] = data;
  });
}
```

**Expected Outcome:** You can identify memory leak patterns in code reviews. You know when to use WeakMap/WeakSet and can explain why.

---

**📝 Day 6 Interview Practice Questions**

1. **(Medium | Google, Netflix)** Explain JavaScript's garbage collection algorithm. What is "mark and sweep"?

2. **(Hard | Meta, Netflix)** List 5 common memory leak patterns in JavaScript web applications. For each, show how to detect and fix it.

3. **(Medium | Google, Stripe)** What is a "detached DOM node"? How can it cause a memory leak and how do you find it in DevTools?

4. **(Medium | All Companies)** What is the difference between `WeakMap`, `WeakSet`, `Map`, and `Set`? Why can't you iterate a WeakMap?

5. **(Hard | Meta, Adobe)** How would you use a WeakMap to implement truly private class fields (before `#` syntax)?

6. **(Medium | Google, Microsoft)** What is the difference between shallow and deep copying an object? When can each cause issues?

7. **(Medium | Netflix, Uber)** You notice your SPA is consuming more and more memory over time. Walk me through how you'd diagnose and fix the leak.

8. **(Hard | Google)** Explain V8's generational garbage collection. What are "new space" and "old space"? What triggers a major GC?

9. **(Easy | All Companies)** Why do event listeners cause memory leaks if not removed? Write an example and the correct cleanup pattern.

10. **(Medium | Stripe, Airbnb)** How does React handle memory management for component state and refs? What React patterns can cause memory leaks?

---

### DAY 7 — Week 1 Review + Revision + Coding Practice

**Why it matters:** Revision without practice creates knowledge that evaporates under interview pressure. Today locks in Week 1's concepts and introduces the coding-under-pressure mindset.

**Study Agenda (75 min)**

- **First 20 min:** Flash-review all of Week 1 without notes. Write down what you can recall about: V8, event loop, closures, prototypes, `this`, promises, memory. Check your notes for gaps.
- **Next 35 min:** Coding practice — implement from scratch:
  1. `debounce(fn, delay)`
  2. `throttle(fn, limit)` 
  3. `deepClone(obj)` (handle circular references)
  4. `EventEmitter` class (on, off, emit)
- **Final 20 min:** Self-assessment — rate your confidence 1–10 on each Day 1–6 topic

**Weekly Review Checkpoint**

- [ ] Can you explain the event loop without hesitation?
- [ ] Can you trace prototype chain for any object?
- [ ] Can you predict `this` value in 10 different contexts?
- [ ] Can you implement debounce and throttle from memory?
- [ ] Can you identify 5 memory leak patterns?
- [ ] Have you attempted all 60+ interview questions from Days 1–6?

**Expected Outcome:** Solidified Week 1 knowledge. Four utility functions implemented cleanly. Confidence score documented.

---

**📝 Day 7 Interview Practice Questions**

1. **(Hard | Google, Meta)** Implement `EventEmitter` from scratch with `on`, `off`, `emit`, and `once` methods.

2. **(Medium | All Companies)** Implement `deepClone(obj)` that correctly handles: nested objects, arrays, dates, and circular references.

3. **(Hard | Stripe, Airbnb)** Implement `pipe(fn1, fn2, fn3)` and `compose(fn1, fn2, fn3)` utility functions.

4. **(Medium | Google, Meta)** Without running it, predict the output of this entire program and explain every step:
   ```javascript
   function* gen() { yield 1; yield 2; yield 3; }
   const g = gen();
   console.log(g.next());
   console.log(g.next());
   ```

5. **(Hard | Netflix)** Implement a `PubSub` class that supports wildcard subscriptions like `events.on('user.*', fn)`.

6. **(Medium | Adobe, Microsoft)** What's the output and why?
   ```javascript
   const obj = { x: 1 };
   const proxy = new Proxy(obj, {
     get(target, key) { return key in target ? target[key] : 37; }
   });
   console.log(proxy.x, proxy.foo);
   ```

7. **(Medium | Stripe, Uber)** Implement a simple Observable/reactive system: an `Observable` class and `observe(obj)` function that logs every property change.

8. **(Hard | Google)** Implement a `LazyList` using generators that represents an infinite sequence and supports `map`, `filter`, and `take` operations.

9. **(Easy | All Companies)** What is the difference between `Symbol`, `Symbol.for()`, and `Symbol.iterator`? Give a practical use case for each.

10. **(Medium | Meta, Airbnb)** Implement a generic `retry` wrapper and a `timeout` wrapper. Then compose them so a function retries up to 3 times with a 2-second timeout each.

---

## Week 2 (Days 8–14): Browser Rendering, CSS Internals, DOM APIs

### DAY 8 — Browser Architecture & the Critical Rendering Path

**Why it matters:** Understanding how the browser actually renders a page is the foundation of all performance optimization. Google, Netflix, and Airbnb ask this directly. More importantly, it's the prerequisite for Days 9–14.

**Study Agenda (75 min)**

- Browser processes: Browser process, Renderer process, GPU process, Network process
- The Critical Rendering Path (CRP):
  1. HTML parsing → DOM construction
  2. CSS parsing → CSSOM construction
  3. DOM + CSSOM → Render Tree
  4. Layout (Reflow) — calculating geometry
  5. Paint — drawing pixels
  6. Composite — GPU layer composition
- What blocks rendering: parser-blocking scripts, render-blocking CSS
- `DOMContentLoaded` vs `load` event
- How `async` and `defer` scripts affect the CRP
- Preload, prefetch, preconnect hints

**Hands-on (10 min)**
Draw the full browser rendering pipeline from network request to pixels on screen. Include all 6 steps with what triggers each.

**Expected Outcome:** You can explain the critical rendering path in an interview in under 3 minutes with precision.

---

**📝 Day 8 Interview Practice Questions**

1. **(Medium | Google, Netflix)** Explain the Critical Rendering Path. What are the exact steps from receiving HTML bytes to pixels on screen?

2. **(Medium | All Companies)** What is the difference between `DOMContentLoaded` and the `load` event? When does each fire and when would you use each?

3. **(Hard | Google, Airbnb)** What is render-blocking? Which resources block rendering and why? How do you eliminate or minimize render blocking?

4. **(Medium | Meta, Netflix)** What is the difference between `async` and `defer` on a script tag? Draw a timeline for each.

5. **(Hard | Google)** Explain how the browser's compositor works. What is a compositing layer and when does the browser create one?

6. **(Medium | Stripe, Adobe)** What does `<link rel="preload">` do? How is it different from `<link rel="prefetch">` and `<link rel="preconnect">`?

7. **(Medium | Netflix, Uber)** What is "parser-blocking" vs "render-blocking"? Can you have one without the other?

8. **(Hard | Google, Meta)** Walk me through what happens in the browser when a user types a URL and presses Enter — from DNS lookup to first paint.

9. **(Medium | Microsoft, Salesforce)** How does the browser handle multiple stylesheets? At what point can it start rendering content?

10. **(Medium | Adobe, Cisco)** What is FOUC (Flash of Unstyled Content)? What causes it and how do you prevent it?

11. **(Hard | Google)** Explain how browser processes are isolated for security. What is "Site Isolation" and why was it introduced?

---

### DAY 9 — Layout, Paint, Composite: Reflow, Repaint, and Layers

**Why it matters:** This is the practical application of Day 8. Reflow/repaint is asked at almost every Big Tech interview in performance context. If you understand this, you can diagnose and fix any jank issue.

**Study Agenda (75 min)**

- Reflow (Layout): when does it happen, what triggers it
- The list of properties that trigger layout: width, height, top, left, margin, padding, etc.
- Repaint: what triggers paint without layout
- Composite-only properties: `transform`, `opacity` — why they're fast
- CSS containment: `contain: layout`, `content`, `strict`
- `will-change` property: use cases and pitfalls
- Forced Synchronous Layout (FSL) — the most common performance bug
- `requestAnimationFrame` for layout reads
- GPU layers: when the browser promotes to a layer

**Hands-on (10 min)**
Identify what each operation triggers (reflow/repaint/composite only):
- `element.style.width = '100px'`
- `element.style.opacity = '0.5'`
- `element.getBoundingClientRect()`
- `element.style.transform = 'translateX(100px)'`
- `element.style.backgroundColor = 'red'`

**Expected Outcome:** You can categorize any CSS/DOM operation by its rendering cost. You can fix Forced Synchronous Layout bugs.

---

**📝 Day 9 Interview Practice Questions**

1. **(Medium | Google, Netflix)** What is reflow (layout)? What triggers it? What is the performance cost?

2. **(Medium | All Companies)** What is the difference between reflow, repaint, and composite? Give one example of each.

3. **(Hard | Google, Airbnb)** What is Forced Synchronous Layout? Show a code example that causes it and how to fix it.

4. **(Medium | Netflix, Adobe)** Why are `transform` and `opacity` considered "cheap" to animate? What makes them different from animating `width` or `top`?

5. **(Hard | Google, Meta)** What is the CSS `will-change` property? When should you use it and what are its dangers?

6. **(Medium | Stripe, Uber)** What does `contain: layout` do? How does CSS containment help browser performance?

7. **(Hard | Netflix)** You have a list of 1000 items. User scrolls to a certain position and you need to update a progress bar. Write the most performant implementation.

8. **(Medium | Google)** What is "layout thrashing"? Write a function that reads and writes to the DOM in a way that causes thrashing, then fix it.

9. **(Medium | Meta, Microsoft)** When does the browser promote an element to its own compositor layer? What are the benefits and costs of layer promotion?

10. **(Hard | Google, Airbnb)** Your animation is janky on mobile. Walk me through how you'd use Chrome DevTools to diagnose the issue and what fixes you'd try.

---

### DAY 10 — CSS Architecture, Specificity, Cascade, and Modern CSS

**Why it matters:** Senior engineers are expected to design CSS systems, not just write rules. Companies like Airbnb, Adobe, and Meta specifically look for engineers who can architect scalable CSS.

**Study Agenda (75 min)**

- The CSS Cascade: importance, specificity, source order
- Specificity calculation: inline / ID / class / element
- `!important` — when it's justified and when it's a code smell
- CSS Custom Properties (variables): scope, inheritance, dynamic theming
- CSS Grid vs Flexbox — when to use which (be precise)
- Stacking context: what creates one, why z-index is confusing
- BEM, CSS Modules, CSS-in-JS, Atomic CSS — trade-offs
- CSS Containment and container queries
- Modern CSS: logical properties, `@layer`, `:is()`, `:where()`

**Hands-on (10 min)**
Design a CSS architecture decision for a large-scale design system. Write your reasoning: BEM vs CSS Modules vs CSS-in-JS vs Tailwind. What would you choose and why?

**Expected Outcome:** You can defend CSS architectural decisions. You can explain specificity without calculation tools. You know when every modern CSS feature is appropriate.

---

**📝 Day 10 Interview Practice Questions**

1. **(Medium | Adobe, Meta)** Explain the CSS cascade. In what order does the browser resolve conflicting styles?

2. **(Hard | Airbnb, Google)** Compare CSS-in-JS, CSS Modules, and utility-class approaches (Tailwind). When would you choose each at scale?

3. **(Medium | All Companies)** What creates a new stacking context in CSS? Why can't you always solve z-index issues by increasing the number?

4. **(Medium | Adobe, Salesforce)** What are CSS Custom Properties? How are they different from preprocessor variables (SASS)? What makes them more powerful?

5. **(Hard | Meta, Airbnb)** Design the CSS architecture for a component library used by 50+ teams. What decisions do you make and why?

6. **(Medium | Google, Microsoft)** What is the difference between CSS Grid and Flexbox? When should you use one vs the other?

7. **(Hard | Adobe)** What are CSS container queries? How do they solve a problem that media queries cannot?

8. **(Medium | Netflix, Stripe)** What is `@layer` in CSS? Why was it introduced and what problem does it solve?

9. **(Medium | Airbnb)** Explain the difference between `:is()`, `:where()`, and `:not()`. What's the specificity of each?

10. **(Hard | Meta, Google)** How would you implement a dark mode system that supports: system preference, user override, and per-component theming?

11. **(Medium | Adobe, Microsoft)** What are CSS logical properties and why were they introduced? Give an example of where they solve a real problem.

---

### DAY 11 — DOM APIs, Browser Storage, and Web APIs

**Why it matters:** DOM manipulation questions appear in UI/component coding rounds at Meta, Google, and Airbnb. Browser storage is fundamental to understanding offline-first and performance optimization.

**Study Agenda (75 min)**

- DOM traversal: `querySelector`, `querySelectorAll`, `closest()`, `matches()`
- DOM manipulation: `createElement`, `append`, `insertBefore`, `replaceWith`
- Event system: event object, event delegation, event capture vs bubble
- `addEventListener` options: `capture`, `once`, `passive`
- Browser storage: `localStorage`, `sessionStorage`, `IndexedDB`, cookies
- Storage limits, security differences (httpOnly, SameSite, Secure)
- `IntersectionObserver`, `ResizeObserver`, `MutationObserver`
- Custom Elements and Shadow DOM (Web Components)
- `postMessage` for cross-origin communication

**Hands-on (15 min)**
Implement:
1. Event delegation for a dynamic list (add/remove items, handle clicks)
2. A `lazyLoad` function using `IntersectionObserver`
3. A simple storage abstraction that falls back gracefully

**Expected Outcome:** You can implement any DOM manipulation task cleanly. You know when to use each Observer API. You can architect storage strategies.

---

**📝 Day 11 Interview Practice Questions**

1. **(Medium | Meta, Airbnb)** What is event delegation? Implement a click handler using delegation for a list where items are added dynamically.

2. **(Medium | All Companies)** What is the difference between event bubbling and event capturing? How do you control which phase your handler runs in?

3. **(Hard | Google, Meta)** Implement a virtual scrolling list using `IntersectionObserver` that only renders visible items in a list of 100,000 elements.

4. **(Medium | Netflix, Stripe)** Compare `localStorage`, `sessionStorage`, `IndexedDB`, and cookies. When would you use each?

5. **(Hard | Meta, Google)** Implement a custom `queryAll` function that accepts a CSS selector string plus an optional `:scope` context and returns matching elements.

6. **(Medium | Adobe, Microsoft)** What is the Shadow DOM? What problems do Web Components solve and what are their limitations?

7. **(Medium | Airbnb, Uber)** What is the `passive` option in `addEventListener`? How does it improve scroll performance?

8. **(Hard | Google)** Implement `dragAndDrop` functionality for a Kanban board using only native DOM events (no libraries).

9. **(Medium | Meta, Netflix)** When would you use `MutationObserver` vs a framework's built-in reactivity? What are the performance implications?

10. **(Hard | Stripe, Adobe)** Implement a `postMessage` communication channel between a parent page and an embedded iframe, including handshake and message validation.

11. **(Medium | All Companies)** What are the security differences between cookies and `localStorage`? How do `httpOnly`, `Secure`, and `SameSite` protect cookies?

---

### DAY 12 — Network Fundamentals: HTTP, HTTPS, HTTP/2, HTTP/3

**Why it matters:** Frontend engineers at senior level must understand the network layer deeply. Google, Stripe, and Netflix ask about HTTP/2, caching headers, and connection optimization. This knowledge directly improves system design answers.

**Study Agenda (75 min)**

- HTTP/1.1: request/response model, head-of-line blocking, connection limits
- HTTP/2: multiplexing, header compression (HPACK), server push, streams
- HTTP/3: QUIC protocol, UDP-based, improved reliability
- HTTPS: TLS handshake, certificate chains, HSTS
- HTTP caching: `Cache-Control`, `ETag`, `Last-Modified`, `Vary`
- Cache-Control directives: `max-age`, `no-store`, `no-cache`, `stale-while-revalidate`
- Service Workers and cache API for offline-first
- CORS: preflight, allowed headers, credentials
- Connection: `keep-alive`, connection pooling

**Hands-on (10 min)**
Design the optimal caching strategy for:
1. A static JS bundle (cache forever + versioned hash)
2. An API response for a user's profile (short TTL + ETag)
3. A news feed (stale-while-revalidate)

**Expected Outcome:** You can design HTTP caching strategies. You understand HTTP/2 advantages and when HTTP/3 matters. You can explain CORS completely.

---

**📝 Day 12 Interview Practice Questions**

1. **(Medium | Google, Stripe)** What are the key differences between HTTP/1.1, HTTP/2, and HTTP/3? What problem does each solve?

2. **(Hard | Netflix, Google)** What is head-of-line blocking? Does HTTP/2 eliminate it? Does HTTP/3?

3. **(Medium | All Companies)** Explain the CORS preflight request. When is it triggered? What does the server need to send back?

4. **(Hard | Stripe, Meta)** Design a comprehensive HTTP caching strategy for a web app with: static assets, API responses, and user-specific data.

5. **(Medium | Netflix, Airbnb)** What is `stale-while-revalidate`? When is it better than `max-age` alone?

6. **(Hard | Google)** How does TLS work at a high level? What is a certificate chain and how does the browser validate it?

7. **(Medium | Adobe, Microsoft)** What is HSTS (HTTP Strict Transport Security)? What problem does it solve and what are the risks of misconfiguring it?

8. **(Medium | Stripe, Uber)** How do Service Workers intercept network requests? Implement a basic offline-first caching strategy using the Cache API.

9. **(Hard | Google, Netflix)** What is HTTP/2 Server Push? Why has it been largely abandoned in practice?

10. **(Medium | Meta, Salesforce)** What is the `Vary` header in HTTP caching? Give a practical example of when you'd use it.

11. **(Hard | Stripe)** Walk me through the exact sequence of events when a browser makes a secure HTTPS request for the first time to a new origin.

---

### DAY 13 — Web Security: XSS, CSRF, CSP, and Frontend Security

**Why it matters:** Security is asked at every company but rarely prepared for. Engineers who can articulate security at depth stand out immediately. This topic appears in both dedicated security rounds and naturally in system design.

**Study Agenda (75 min)**

- XSS: reflected, stored, DOM-based XSS. How each works.
- XSS prevention: output encoding, DOMPurify, avoiding `innerHTML`
- CSRF: how it works, SameSite cookies, CSRF tokens
- Content Security Policy (CSP): directives, nonce-based, hash-based
- Subresource Integrity (SRI)
- Clickjacking: X-Frame-Options, `frame-ancestors` CSP directive
- HTTPS and mixed content
- Open redirect vulnerabilities
- `eval()` and `innerHTML` dangers
- React's XSS protections and `dangerouslySetInnerHTML`

**Hands-on (10 min)**
Write a Content Security Policy header for a SPA that:
- Uses a CDN for static assets
- Makes API calls to a different domain
- Has inline scripts (use nonce)
- Disallows frames

**Expected Outcome:** You can articulate every major web security vulnerability, how it's exploited, and how to defend against it. You can design a CSP policy.

---

**📝 Day 13 Interview Practice Questions**

1. **(Medium | Google, Meta)** What are the three types of XSS? Explain each with an example attack and its specific fix.

2. **(Hard | Stripe, Google)** Implement a function `sanitizeHTML(str)` that prevents XSS without using a library. What are the edge cases?

3. **(Medium | All Companies)** What is CSRF? How does `SameSite=Strict` prevent it? What are `SameSite=Lax` and `SameSite=None` for?

4. **(Hard | Meta, Adobe)** Design a comprehensive Content Security Policy for a React SPA. Explain each directive you include.

5. **(Medium | Stripe)** What is Subresource Integrity (SRI)? When would you use it and what does it protect against?

6. **(Medium | Google, Netflix)** What is clickjacking? How do you prevent it? What's the difference between `X-Frame-Options` and CSP `frame-ancestors`?

7. **(Hard | Meta, Google)** What is DOM-based XSS? How is it different from reflected XSS? Write a vulnerable code example and fix it.

8. **(Medium | All Companies)** Why is `dangerouslySetInnerHTML` in React dangerous? When might you legitimately need it and how do you use it safely?

9. **(Medium | Stripe, Airbnb)** What is an open redirect vulnerability? How can it appear in a frontend codebase?

10. **(Hard | Google)** Walk me through how a stored XSS attack would work on a social platform — from injection to exploitation. What multiple layers of defense would you implement?

---

### DAY 14 — Week 2 Review + CSS & DOM Coding Practice

**Why it matters:** Locks in the browser/CSS/network fundamentals before moving to React. These topics won't be forgotten because you'll apply them in system design and performance rounds later.

**Study Agenda (75 min)**

- **First 15 min:** Flash-review Days 8–13. Write the critical rendering path from memory.
- **Next 40 min:** Coding practice — DOM & CSS implementations:
  1. Build a `<Carousel>` component with vanilla JS (no frameworks)
  2. Implement `lazyLoadImages()` using IntersectionObserver
  3. Implement an `Accordion` component with accessibility support
- **Final 20 min:** Weekly checkpoint and confidence rating

**Weekly Review Checkpoint**

- [ ] Can you draw the full rendering pipeline from memory?
- [ ] Can you identify reflow triggers vs composite-only operations?
- [ ] Can you design a caching strategy for different resource types?
- [ ] Can you explain XSS, CSRF, and CSP clearly?
- [ ] Can you implement event delegation and IntersectionObserver?

---

**📝 Day 14 Interview Practice Questions**

1. **(Hard | Meta, Airbnb)** Implement an infinite scroll component in vanilla JavaScript. It should fetch more items when the user reaches the bottom, avoid redundant fetches, and handle errors gracefully.

2. **(Medium | Google, Adobe)** Implement a CSS-only tooltip that appears on hover and is correctly positioned above/below based on available viewport space.

3. **(Hard | Meta)** Implement a drag-and-drop sortable list using only native browser APIs (no libraries).

4. **(Medium | Netflix)** Implement an image carousel with:
   - Keyboard navigation
   - Touch swipe support
   - Accessible ARIA attributes

5. **(Hard | Stripe, Airbnb)** Design and implement a `ModalManager` that supports stacking multiple modals, focus trapping, and keyboard accessibility.

6. **(Medium | Adobe, Microsoft)** Implement a responsive grid layout that reflows from 3 columns to 2 to 1 using CSS Grid (no JavaScript required).

7. **(Hard | Google, Meta)** Implement a client-side router (`pushState`-based) from scratch that handles URL changes, back/forward navigation, and route parameter extraction.

8. **(Medium | All Companies)** Implement a color picker component that outputs a hex color code and is fully keyboard accessible.

9. **(Hard | Netflix, Airbnb)** Implement a virtualized list that renders only visible items, with smooth scroll behavior and correct scrollbar proportion.

10. **(Medium | Stripe)** Implement a form validation system using the Constraint Validation API with custom error messages and real-time feedback.

---

## Week 3 (Days 15–21): React Deep Dive, Hooks, Patterns, and Coding Fundamentals

### DAY 15 — React Internals: Fiber, Reconciliation, Virtual DOM

**Why it matters:** Meta created React and asks deep internals questions in every interview. Google, Airbnb, and Netflix also probe React at depth. Understanding Fiber is what separates a React user from a React expert.

**Study Agenda (75 min)**

- Virtual DOM: what it is, what it's not, why it was created
- Reconciliation: diffing algorithm, same-type rule, key prop importance
- React Fiber: the complete rewrite — work units, priority, interruptibility
- Concurrent Mode: time-slicing, `startTransition`, `useDeferredValue`
- Commit phase vs render phase — what can happen in each
- `shouldComponentUpdate`, `React.memo`, `PureComponent` — when they help
- Why you shouldn't mutate state directly
- Synthetic events and React's event delegation (root-level in React 17+)

**Hands-on (10 min)**
Explain why `key` matters in lists with a concrete example. Then write a scenario where using array index as key causes a bug.

**Expected Outcome:** You can explain React's rendering mechanism at a depth that satisfies a Meta interviewer. You can predict when re-renders happen.

---

**📝 Day 15 Interview Practice Questions**

1. **(Medium | Meta, Google)** What is the Virtual DOM and why was it created? What are its limitations?

2. **(Hard | Meta)** Explain React Fiber. Why was it a complete rewrite of the reconciler? What does "fiber" represent as a data structure?

3. **(Medium | All Companies)** How does React's reconciliation algorithm work? What is the "same-type" rule?

4. **(Hard | Meta, Airbnb)** What is React Concurrent Mode? What problems does it solve that weren't possible in the legacy mode?

5. **(Medium | Google, Microsoft)** What is the difference between the render phase and commit phase in React? What side effects are allowed in each?

6. **(Medium | All Companies)** Why is `key` important in React lists? What bugs occur when you use array index as key?

7. **(Hard | Meta, Netflix)** What is `startTransition`? How does it allow React to prioritize updates? Give a concrete use case.

8. **(Medium | Airbnb, Adobe)** What is `useDeferredValue`? How is it different from debouncing? When would you use it?

9. **(Hard | Meta)** How does React's synthetic event system work? Why did React move to root-level delegation in v17?

10. **(Medium | All Companies)** When does `React.memo` not prevent a re-render even though props haven't changed? Name 3 scenarios.

---

### DAY 16 — React Hooks Deep Dive: useState, useEffect, useRef, useContext

**Why it matters:** Hooks are the core of modern React and the most tested area at all companies. You need to go beyond "how to use" to "how they work and when they fail."

**Study Agenda (75 min)**

- `useState`: batching (React 18 automatic batching), functional updates, lazy initialization
- `useEffect`: dependency array rules, cleanup functions, common pitfalls
- `useLayoutEffect`: synchronous vs asynchronous, when to use it
- `useRef`: persisting values without re-renders, DOM ref, vs state
- `useContext`: when to use, performance implications, context splitting
- `useReducer`: when to prefer over useState
- `useCallback` and `useMemo`: memoization, referential equality, overuse pitfalls
- Rules of Hooks: why they exist (the linked list implementation)

**Hands-on (15 min)**
Implement:
1. `usePrevious(value)` custom hook
2. `useDebounce(value, delay)` custom hook
3. `useLocalStorage(key, initialValue)` custom hook

**Expected Outcome:** You can implement any hook correctly, explain why its rules exist, and debug common hook-related bugs.

---

**📝 Day 16 Interview Practice Questions**

1. **(Hard | Meta, Google)** Explain why Hooks must be called at the top level. What is the underlying data structure that enforces this rule?

2. **(Medium | All Companies)** What is the `useEffect` cleanup function? When does it run? Write a scenario where forgetting cleanup causes a memory leak.

3. **(Hard | Meta, Airbnb)** What is the difference between `useEffect` and `useLayoutEffect`? When would `useLayoutEffect` cause a visual flicker?

4. **(Medium | All Companies)** What is the difference between `useCallback` and `useMemo`? Give an example where each is necessary and an example where each is premature optimization.

5. **(Hard | Meta)** What is React 18's automatic batching? How did batching work before, and what changed?

6. **(Medium | Netflix, Stripe)** Implement a `useIntersectionObserver` custom hook that returns a ref and whether the element is in the viewport.

7. **(Hard | Google, Meta)** Explain why using a Context with a large value object can cause unnecessary re-renders. How do you fix this?

8. **(Medium | All Companies)** What is `useReducer`? When would you prefer it over multiple `useState` calls?

9. **(Hard | Airbnb, Adobe)** Implement a `useAsync(asyncFn, deps)` custom hook that manages loading, error, and data states.

10. **(Medium | Meta, Stripe)** What is the difference between `useRef` and a mutable variable outside the component? Why can't you just use a module-level variable?

11. **(Hard | Meta)** You have a component that re-renders 50 times per second due to a parent. How do you diagnose and fix this using React DevTools and the hooks available?

---

### DAY 17 — React Patterns: State Management, Performance Optimization

**Why it matters:** Senior engineers are expected to design React architectures, not just write components. State management design and performance optimization are major themes in Meta's and Airbnb's senior rounds.

**Study Agenda (75 min)**

- Lifting state vs colocating state — principles
- State management options: Context, Redux, Zustand, Jotai — trade-offs at scale
- Compound component pattern
- Render props pattern (and why hooks replaced them)
- Higher-Order Components (HOCs) — pros, cons, debugging pain
- Composition vs inheritance
- Performance: code splitting, lazy loading, `React.lazy` + `Suspense`
- React profiler: identifying expensive renders
- Why you shouldn't optimize prematurely (and when to start)

**Hands-on (10 min)**
Design the state management architecture for a large e-commerce app: cart, user, catalog, checkout. Which state goes where? Local component state vs global?

**Expected Outcome:** You can defend architectural decisions about state management. You can recognize and apply patterns at depth.

---

**📝 Day 17 Interview Practice Questions**

1. **(Hard | Meta, Airbnb)** Compare Redux, Context API, and Zustand for a large-scale React app with 100+ developers. What would you choose and why?

2. **(Medium | All Companies)** What is the Compound Component pattern? Implement a `<Accordion>` using this pattern.

3. **(Hard | Meta)** You have a React app that loads slowly due to a large initial bundle. Walk me through your entire code-splitting strategy.

4. **(Medium | Google, Netflix)** Implement a HOC `withLogging(Component)` that logs render duration for any component.

5. **(Hard | Airbnb, Stripe)** Design the state architecture for a collaborative document editor (like Notion). What state is local, what is global, what is server-synced?

6. **(Medium | Meta, Adobe)** When does `React.Suspense` catch a thrown Promise? How does it enable the concurrent data loading pattern?

7. **(Hard | Meta, Google)** Implement a generic `useStore` hook backed by Zustand-style atom pattern that avoids unnecessary re-renders.

8. **(Medium | All Companies)** What is the difference between `React.lazy` and dynamic `import()`? When would you split at the route level vs component level?

9. **(Medium | Netflix, Uber)** Implement a `<ErrorBoundary>` component that catches rendering errors and shows a fallback UI with a reset option.

10. **(Hard | Meta)** Design a multi-step checkout flow in React. How do you handle: step state, validation, navigation, and back/forward browser history?

---

### DAY 18 — TypeScript for Senior Engineers: Types, Generics, Utility Types

**Why it matters:** TypeScript is now mandatory at most Big Tech companies. Senior engineers are expected to architect type systems, not just add annotations. Stripe and Microsoft specifically probe TypeScript depth.

**Study Agenda (75 min)**

- Structural typing vs nominal typing
- Generic types: constraints, defaults, infer keyword
- Conditional types: `T extends U ? X : Y`
- Template literal types
- Utility types: `Partial`, `Required`, `Pick`, `Omit`, `ReturnType`, `Parameters`, `NonNullable`, `Extract`, `Exclude`
- Discriminated unions and exhaustive pattern matching
- Declaration merging and module augmentation
- `unknown` vs `any` vs `never`
- Type narrowing: `typeof`, `instanceof`, discriminant properties, user-defined type guards
- Mapped types and index signatures

**Hands-on (15 min)**
Implement these type utilities from scratch:
1. `DeepPartial<T>`
2. `DeepReadonly<T>`
3. `Awaited<T>` (extract promise type)
4. A `Result<T, E>` type for type-safe error handling

**Expected Outcome:** You can architect TypeScript type systems and implement complex utility types.

---

**📝 Day 18 Interview Practice Questions**

1. **(Medium | Microsoft, Stripe)** What is the difference between `any`, `unknown`, and `never` in TypeScript?

2. **(Hard | Stripe, Meta)** Implement a `DeepReadonly<T>` type that recursively makes all properties readonly.

3. **(Hard | Google, Microsoft)** Implement a typed `pick` function: `pick(obj, keys)` that returns a new object with only the selected keys, fully type-safe.

4. **(Medium | All Companies)** What is a discriminated union? Implement exhaustive pattern matching for a `Result` type using `never`.

5. **(Hard | Stripe)** Implement `Flatten<T>` that flattens a nested object type one level deep.

6. **(Medium | Microsoft, Adobe)** What is the `infer` keyword in TypeScript? Write a type that extracts the return type of an async function.

7. **(Hard | Stripe, Meta)** Design a type-safe API client where the request and response types are inferred from a route definition object.

8. **(Medium | Google, Netflix)** What is module augmentation in TypeScript? Give a practical example of when you'd use it.

9. **(Hard | Microsoft)** Implement a `Builder` pattern in TypeScript where calling `.build()` is only allowed after required fields have been set, enforced at the type level.

10. **(Medium | All Companies)** What is the difference between `interface` and `type` in TypeScript? When would you choose one over the other?

---

### DAY 19 — Coding Practice: Data Structures & Algorithms (Frontend Focus)

**Why it matters:** DSA is tested at Google, Meta, Microsoft, and Stripe in coding rounds. Frontend-focused companies like Airbnb test DOM manipulation variants. You need coding fluency *under pressure*.

**Study Agenda (75 min)**

- Most frequent DSA topics in frontend interviews:
  - Arrays and string manipulation
  - Hash maps (frequency counting, lookups)
  - Trees: DOM tree traversal patterns
  - Stacks and queues
  - Sliding window
  - Two pointers
- Frontend-specific coding problems:
  - Flatten nested objects/arrays
  - Implement `flatMap`, `reduce`, `groupBy`
  - Debounce and throttle implementation
  - Deep equal comparison
  - Parse and serialize query strings

**Hands-on (40 min — this is a coding-heavy day)**
Solve these without looking up:
1. `flattenObject({a: {b: {c: 1}}})` → `{'a.b.c': 1}`
2. `groupBy([{type:'a'}, {type:'b'}, {type:'a'}], 'type')`
3. Serialize/parse URL query strings
4. Deep equal comparison function

**Expected Outcome:** Fluency with common interview problem patterns. Clean, readable code under time pressure.

---

**📝 Day 19 Interview Practice Questions**

1. **(Medium | All Companies)** Implement `flattenArray([1, [2, [3, [4]]]])` to any depth without using `.flat()`.

2. **(Medium | Meta, Airbnb)** Implement `deepEqual(a, b)` that works for nested objects, arrays, and primitive values.

3. **(Hard | Google)** Implement a `LRU Cache` class with O(1) `get` and `put` operations.

4. **(Medium | Stripe, Airbnb)** Implement `parseQueryString('foo=1&bar=2&foo=3')` → `{foo: ['1','3'], bar: '2'}` and `stringifyQueryString` as the inverse.

5. **(Hard | Meta, Google)** Given a React component tree represented as a nested object, implement a function that finds all components by type name.

6. **(Medium | All Companies)** Implement `compose(f, g, h)(x)` where `h` runs first and `f` runs last.

7. **(Hard | Google, Microsoft)** Implement a `trie` data structure that supports `insert`, `search`, and `startsWith` (used in autocomplete).

8. **(Medium | Meta, Airbnb)** Implement `flattenObject` that converts `{a: {b: 1, c: {d: 2}}}` to `{'a.b': 1, 'a.c.d': 2}` and `unflattenObject` as the inverse.

9. **(Medium | Stripe)** Implement a function that batches function calls within a time window: `batch(fn, delay)` collects all calls within `delay` ms and invokes `fn` once with all arguments.

10. **(Hard | Google)** Implement an `Observable` class that supports `map`, `filter`, and `subscribe` methods with lazy evaluation.

---

### DAY 20 — Coding Practice: DOM Manipulation + Async Coding Problems

**Why it matters:** This is exactly what Meta's UI coding round looks like. Practice implementing real UI components in JavaScript without a framework. Companies check your ability to write clean, performant, accessible code.

**Study Agenda (75 min)**

- Implement real-world UI components from scratch
- Handle edge cases (empty state, error state, loading state)
- Write accessible HTML structure
- Use semantic HTML correctly
- Think aloud about trade-offs

**Hands-on (55 min — heavy coding day)**
Implement the following (30 min time limit each — pick 2):
1. **Autocomplete/Typeahead**: debounced input, cancellable requests, keyboard navigation, accessibility
2. **Infinite Scroll**: IntersectionObserver, throttled, handles error and empty state
3. **Multi-select dropdown**: filtering, keyboard nav, ARIA attributes

**Expected Outcome:** You can implement a complete UI component cleanly within 30 minutes, with states, accessibility, and error handling.

---

**📝 Day 20 Interview Practice Questions**

1. **(Hard | Meta, Airbnb)** Implement a fully accessible autocomplete component in vanilla JS. Include: debounced API calls, keyboard navigation (arrow keys, enter, escape), ARIA attributes, and loading/error states.

2. **(Hard | Google, Meta)** Implement a `<Transfer>` component (two lists with items you can move between them) using vanilla JS or React.

3. **(Medium | Stripe, Adobe)** Implement a `<ProgressBar>` that animates smoothly from 0% to 100% when given a Promise array. Each resolved promise increments progress.

4. **(Hard | Airbnb, Netflix)** Implement a virtual scroll list that can display 1 million items with smooth scrolling using only 20 actual DOM nodes.

5. **(Medium | All Companies)** Implement a multi-step form wizard with:
   - Step validation before proceeding
   - Back navigation that preserves data
   - Accessible step indicators

6. **(Hard | Meta)** Implement `<Spreadsheet>` — a basic editable grid with: click to edit, keyboard navigation between cells, and export to CSV.

7. **(Medium | Stripe, Airbnb)** Implement a star-rating component that is keyboard accessible and screen-reader compatible.

8. **(Hard | Google)** Implement a calendar month view component that correctly handles: month boundaries, today highlighting, selected date, and keyboard navigation.

9. **(Medium | Meta, Adobe)** Implement a `<Toast>` notification system that supports stacking multiple toasts, different types (info/error/success), and auto-dismiss with progress.

10. **(Hard | Airbnb, Netflix)** Implement a `<Masonry>` grid layout component in pure CSS that adjusts the number of columns based on container width (no JavaScript).

---

### DAY 21 — Week 3 Review + Full Phase 1 Checkpoint

**Why it matters:** This is your first major readiness assessment. Before moving to system design, you need to be confident in your foundation. Phase 2 will build everything on top of this.

**Study Agenda (75 min)**

- **First 25 min:** Full Phase 1 rapid review — go through all your notes from Days 1–20. No new learning today.
- **Next 30 min:** Mock coding session — solve 2 problems in 30 minutes total (one algorithmic, one DOM/React)
- **Final 20 min:** Self-assessment and gap identification

**Phase 1 Completion Checklist**

- [ ] JS Engine (V8, execution context, call stack)
- [ ] Event Loop (task queue, microtask queue, ordering)
- [ ] Closures (practical patterns, stale closures, memory)
- [ ] Prototypes and `this` (all binding rules)
- [ ] Async/Promises (all combinators, from scratch)
- [ ] Memory Management (GC, leaks, WeakMap)
- [ ] Critical Rendering Path (all 6 steps)
- [ ] Reflow/Repaint/Composite (triggers and fixes)
- [ ] CSS Architecture (cascade, specificity, modern CSS)
- [ ] DOM APIs (events, observers, storage)
- [ ] HTTP/Network (HTTP/2, caching, CORS)
- [ ] Security (XSS, CSRF, CSP)
- [ ] React Internals (Fiber, reconciliation)
- [ ] React Hooks (all core hooks, custom hooks)
- [ ] React Patterns (state management, performance)
- [ ] TypeScript (generics, utility types, complex types)
- [ ] Coding Fluency (can implement 4 utility functions from memory)

**Phase 1 Interview Readiness Score Target: 65%+**

---

**📝 Day 21 Interview Practice Questions (Comprehensive Mix)**

1. **(Hard | Google)** Walk me through what happens — with precise technical detail — from a user typing in a search box to seeing autocomplete suggestions. Cover: JS event handling, debouncing, async requests, DOM updates, and rendering.

2. **(Hard | Meta)** Implement a Redux-like `createStore(reducer, initialState)` from scratch with `getState`, `dispatch`, and `subscribe`.

3. **(Medium | All Companies)** You have a React app where a specific component is re-rendering 20x more than expected. Walk me through your entire debugging process.

4. **(Hard | Stripe)** Design a type-safe form builder in TypeScript where field definitions drive both the form schema and the validation rules.

5. **(Medium | Netflix, Airbnb)** A user reports that your web app is "slow." Walk me through the categories of problems you'd investigate and how you'd measure each.

6. **(Hard | Google, Meta)** Explain how React Concurrent Mode changes the mental model of React development. What can break when migrating from legacy mode?

7. **(Medium | Adobe, Microsoft)** Implement `groupBy(array, keyFn)` in TypeScript with full type inference — the return type should be inferred from the key function.

8. **(Hard | Meta, Airbnb)** Design and implement a client-side feature flag system that: reads from localStorage, can be overridden via URL params, and triggers re-renders when flags change.

9. **(Medium | All Companies)** What is the difference between controlled and uncontrolled components in React? When would you use each in a production application?

10. **(Hard | Google)** Explain memory pressure in a large React SPA. What patterns accumulate memory over time and how would you audit a production app for leaks?

