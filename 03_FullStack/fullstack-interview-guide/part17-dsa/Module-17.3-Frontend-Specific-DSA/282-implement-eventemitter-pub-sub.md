# Implement EventEmitter / Pub-Sub
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Core data structure**: `Map<eventName, Set<listener>>` or `Map<eventName, listener[]>`; Map gives O(1) lookup by event name; Set/array holds all registered callbacks for that event; Set prevents duplicates; array preserves registration order
- **Four methods**: `on(event, handler)` — register; `off(event, handler)` — unregister; `emit(event, ...args)` — call all handlers; `once(event, handler)` — register a handler that auto-removes itself after first call
- **`once` implementation**: wrap the real handler in a wrapper that calls `off(event, wrapper)` then `handler(...args)`; register `wrapper` with `on(event, wrapper)`; the handler is removed BEFORE calling it (avoids re-entrancy issues if the handler itself emits the same event)
- **Emit order**: handlers are called in the ORDER they were registered; this means registration order matters, and changing the underlying collection from array to Set changes this guarantee slightly (Set preserves insertion order in modern JS/Java so it's fine, but HashMap in Java does NOT — use `LinkedHashMap` if deterministic order matters)
- **Memory leak trap**: `on` without `off` = handler accumulates indefinitely; `once` removes itself automatically; always pair long-lived emitters with cleanup in component unmount (`useEffect` cleanup in React, `ngOnDestroy` in Angular)
- **Node.js EventEmitter warning**: > 10 listeners on the same event → MaxListenersExceededWarning; default limit is 10; in tests and React component trees this warning fires if `on` is called without matching `off` across renders

---

## 1. One-Line Definition
An EventEmitter is a publish-subscribe mechanism where event producers call `emit(eventName, data)` and consumers call `on(eventName, handler)` to subscribe; the emitter holds a registry mapping event names to arrays of handler functions and invokes them all when an event fires.

---

## 2. The Problem It Solves

Direct function calls between tightly coupled components create rigid dependencies: component A must know that B exists and must call B's method directly. When A fires an event and B, C, and D all need to react independently, direct calling requires A to know about all three.

EventEmitter decouples producers from consumers. A emits `'userLoggedIn'` without knowing which components listen. B signs up for `'userLoggedIn'` to update the nav bar. C signs up to start the analytics session. D signs up to load user preferences. None of them know about each other. A doesn't know about any of them.

Real applications:
- Node.js core: HTTP request/response lifecycle, file stream events, process events
- React component communication without prop drilling
- Angular `EventEmitter` in `@Output()` for parent-child component communication
- Redux middleware (action dispatching = pub/sub)
- WebSocket message routing to multiple registered handlers

---

## 3. How It Works Internally

### Registration and Emission Flow

```
Registry state after on('click', handlerA) and on('click', handlerB):
{
  'click': [handlerA, handlerB]
}

emit('click', { x: 100, y: 200 }):
  Lookup 'click' → [handlerA, handlerB]
  Call handlerA({ x: 100, y: 200 })
  Call handlerB({ x: 100, y: 200 })
  Return (synchronously ordered)

off('click', handlerA):
  Filter out handlerA from registry
  Registry: { 'click': [handlerB] }

once('click', handlerC):
  wrapperC = (...args) => { off('click', wrapperC); handlerC(...args); }
  on('click', wrapperC)
  Registry: { 'click': [handlerB, wrapperC] }

emit('click', { x: 50, y: 80 }):
  Call handlerB({ x: 50, y: 80 })
  Call wrapperC({ x: 50, y: 80 }):
    → off('click', wrapperC)  ← removes itself first
    → handlerC({ x: 50, y: 80 })  ← then calls the real handler
  Registry: { 'click': [handlerB] }  ← wrapperC gone after one use
```

---

## 4. The Code

### Wrong Way — Classic Bugs

```typescript
// ❌ WRONG 1: Using an object (not Map) as the registry — event name collisions

class EventEmitterWrong {
    private events: { [key: string]: Function[] } = {};
    //                              ↑ plain object — event names can collide with
    //                                built-in Object properties like 'constructor', 'toString'
    //                                emit('toString', ...) would find Object.prototype.toString
    //                                instead of an empty array
    
    on(event: string, handler: Function) {
        // ❌ 'constructor' is always truthy (exists on Object.prototype)
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(handler);
    }
    
    emit(event: string, ...args: unknown[]) {
        // ❌ On 'constructor', this.events['constructor'] is the constructor function
        //    calling it as an array causes TypeError: this.events[event].forEach is not a function
        (this.events[event] || []).forEach(fn => fn(...args));
    }
}
// Use: new Map<string, Function[]>() instead of a plain object
```

```typescript
// ❌ WRONG 2: off() modifies the array while emitting — skipped handlers

class EventEmitterWrong2 {
    private events = new Map<string, Function[]>();
    
    emit(event: string, ...args: unknown[]) {
        const handlers = this.events.get(event) ?? [];
        
        // ❌ Using the LIVE array during iteration
        // If handler at index 1 calls off() and removes index 1 from the array:
        //   handlers becomes [h0, h2]
        //   The loop's next index is 2 (was going to be h2)
        //   but now index 2 doesn't exist (array shrunk) → h2 is SKIPPED
        for (let i = 0; i < handlers.length; i++) {
            handlers[i](...args);   // ← handler might call off() internally → array mutation
        }
    }
    
    // ✅ Fix: emit on a SNAPSHOT copy of the array
    // const snapshot = [...(this.events.get(event) ?? [])];
    // snapshot.forEach(fn => fn(...args));
}
```

```typescript
// ❌ WRONG 3: once() wraps the handler but off() compares by reference — never removes

class EventEmitterWrong3 {
    on(event: string, handler: Function) { /* ... */ }
    off(event: string, handler: Function) { /* filter by reference */ }
    
    once(event: string, handler: Function) {
        // ❌ The wrapper is created inline but never stored
        // off(event, wrapper) inside the wrapper → looks for 'wrapper' reference
        // But 'wrapper' is a new function created at call time; off() will never match
        // because each call creates a new function reference
        this.on(event, (...args: unknown[]) => {
            this.off(event, /* ??? — which wrapper reference? */);
            handler(...args);
        });
        // The once handler is NEVER removed — memory leak on repeat events
    }
}
```

### Right Way — Full Implementation

```typescript
// ✅ EVENTMITTER with on, off, emit, once — complete TypeScript implementation

type Handler = (...args: unknown[]) => void;

class EventEmitter {
    // ✅ Use Map (not plain object) — prevents prototype property collisions
    private events: Map<string, Handler[]> = new Map();
    
    // ✅ Register a persistent listener
    on(event: string, handler: Handler): this {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(handler);
        return this;  // ← allows chaining: emitter.on('a', h1).on('b', h2)
    }
    
    // ✅ Remove a specific listener — must match the exact function reference
    off(event: string, handler: Handler): this {
        const handlers = this.events.get(event);
        if (!handlers) return this;
        
        // ✅ Filter creates a new array — safe even if called during emit
        const filtered = handlers.filter(h => h !== handler);
        if (filtered.length === 0) {
            this.events.delete(event);  // ← clean up empty arrays
        } else {
            this.events.set(event, filtered);
        }
        return this;
    }
    
    // ✅ Emit: call ALL handlers with provided arguments
    emit(event: string, ...args: unknown[]): this {
        const handlers = this.events.get(event);
        if (!handlers) return this;
        
        // ✅ SNAPSHOT the array before iterating
        //    Handlers may call on() or off() during emit — avoid mutation during iteration
        const snapshot = [...handlers];
        snapshot.forEach(handler => handler(...args));
        return this;
    }
    
    // ✅ Register a handler that fires only ONCE then auto-removes itself
    once(event: string, handler: Handler): this {
        // ✅ Store wrapper reference so off() can find and remove it later
        const wrapper: Handler = (...args: unknown[]) => {
            this.off(event, wrapper);  // ← remove BEFORE calling (re-entrancy safe)
            handler(...args);
        };
        
        // ✅ Store original on wrapper for external off() calls
        //    (problem: user calls emitter.off('click', originalHandler) — needs to find wrapper)
        //    Solution A: keep a mapping from original → wrapper (complex)
        //    Solution B: attach the original as a property on the wrapper (simpler)
        (wrapper as any).__original = handler;
        
        return this.on(event, wrapper);
    }
    
    // ✅ Support off() with the original handler even for once() registrations
    offOnceSafe(event: string, handler: Handler): this {
        const handlers = this.events.get(event);
        if (!handlers) return this;
        
        const filtered = handlers.filter(
            h => h !== handler && (h as any).__original !== handler
        );
        if (filtered.length === 0) {
            this.events.delete(event);
        } else {
            this.events.set(event, filtered);
        }
        return this;
    }
    
    // ✅ Utility: remove ALL listeners for an event (cleanup on component unmount)
    removeAllListeners(event?: string): this {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }
    
    // ✅ Utility: get number of listeners (matches Node.js API)
    listenerCount(event: string): number {
        return this.events.get(event)?.length ?? 0;
    }
}
```

```typescript
// ✅ PRACTICAL USAGE: Event bus pattern in a React/TypeScript app

// Shared event bus singleton
const eventBus = new EventEmitter();

// Component A: product added to cart
function addToCart(product: Product) {
    eventBus.emit('cart:add', { product, timestamp: Date.now() });
}

// Component B: cart badge counter — subscribes and updates
function CartBadge() {
    const [count, setCount] = React.useState(0);
    
    React.useEffect(() => {
        const handler = (data: unknown) => setCount(c => c + 1);
        eventBus.on('cart:add', handler);
        
        // ✅ CRITICAL: unsubscribe on unmount to prevent memory leak
        return () => eventBus.off('cart:add', handler);
    }, []);  // ← empty dep array: subscribe once on mount
    
    return <span>{count}</span>;
}

// Component C: analytics — listen once per session start
eventBus.once('session:start', (data) => {
    analyticsService.startSession(data);
    // ← automatically removed after first session:start event
});
```

```java
// ✅ Java EventEmitter equivalent — used in Spring Boot event systems

// Spring's ApplicationEventPublisher + @EventListener IS the pub/sub pattern:

// Publisher
@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;
    
    public void placeOrder(Order order) {
        // business logic...
        publisher.publishEvent(new OrderPlacedEvent(this, order));  // emit
    }
}

// Subscriber — any bean can subscribe to any event type
@Component
public class NotificationService {
    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        Order order = event.getOrder();
        sendConfirmationEmail(order);
    }
}

// ✅ Spring's type-based routing = the EventEmitter pattern with event type as the "event name"
// No manual on()/off() needed — Spring manages the registry
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the difference between `on` and `once`."

**Hruday's answer:**
> `on` registers a persistent listener — once registered, the handler fires EVERY TIME the event is emitted, until explicitly removed with `off`.
>
> `once` registers a one-shot listener — the handler fires exactly the FIRST TIME the event is emitted after registration, then automatically deregisters itself. If the event is emitted again, the handler does NOT fire.
>
> Internally, `once` wraps the real handler in a wrapper function. The wrapper first calls `off(event, wrapper)` to remove itself, then calls the real handler. The key is removing BEFORE calling — if the handler itself triggers the same event (re-entrancy), and we removed AFTER calling, the handler could fire a second time before removal.
>
> Common uses for `once`: initialisation events (fire on first load, ignore subsequent), one-time tutorial prompts, session-start tracking.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why does emitting on a snapshot instead of the live array matter? Give a concrete scenario."

**Hruday's answer:**
> Consider an `'click'` event with three handlers: `[hA, hB, hC]`. Handler `hA` is a `once` wrapper. When `emit('click')` starts iterating:
>
> - Call `hA` → hA calls `off('click', hA)` → the handlers array becomes `[hB, hC]`
> - Now the iterator's index is 1. Index 1 in the mutated array is `hB`. Handler at index 0 is effectively gone, index 1 is `hB`, index 2 is `hC`.
>
> Wait, does `hB` get skipped? That depends on the exact iteration. With a `for` loop over the live array index by index: index 0 called hA, index 1 should call hB, but the array was mutated from 3 to 2 elements. If the loop checks `i < handlers.length` after mutation, it still runs i=1 (hB) and i=2 would be out of bounds... actually hB is fine here. But consider if hA removes BOTH itself AND hB: the array becomes `[hC]`, and index 1 is now out of bounds — `hC` is SKIPPED.
>
> The snapshot approach eliminates all of these cases: `const snapshot = [...handlers]` captures the state at the moment `emit` was called. Mutations to the live `handlers` array during emission don't affect the snapshot iteration. All handlers registered before the emit call fire exactly once.

---

### Q3 — Application
**Interviewer asks:** "How does Angular's `@Output()` and `EventEmitter` relate to what you described?"

**Hruday's answer:**
> Angular's `@Output()` decorator marks a component's property as an event that parent components can listen to. The property's type is `EventEmitter<T>` from `@angular/core`.
>
> Internally, Angular's `EventEmitter` extends RxJS `Subject`, which is itself an observable + observer combination — a form of pub/sub. `emit(value)` calls `next(value)` on the Subject, which triggers all subscribed observers (listeners).
>
> From the parent template's perspective: `(childEvent)="parentHandler($event)"` is syntactic sugar for `child.childEvent.subscribe(event => parentHandler(event))` — which is Angular's version of our `on('childEvent', handler)`.
>
> The same conceptual model applies: producer calls emit, consumers register handlers, unsubscription happens on component destruction (Angular handles this via the component lifecycle hooks for template bindings, but programmatic subscriptions need manual `unsubscribe()` to avoid memory leaks — the same problem as forgetting `off()` in a custom EventEmitter).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Forgetting to clean up listeners in React | "I'll add the listener in useEffect" | Adding a listener in `useEffect` without returning a cleanup function that calls `off()` means every time the component re-renders with a new reference to the handler, a new listener is added but the old one is never removed; after 50 renders, there are 50 copies of the same handler firing for each event; the correct pattern is `useEffect(() => { emitter.on(e, h); return () => emitter.off(e, h); }, [])` — the return value of useEffect is the cleanup function |
| Using `off()` with an anonymous function | "I'll write `emitter.off('click', () => doSomething())`" | `off()` compares handler references with `===`; an arrow function expression creates a NEW function object every time it appears; `() => doSomething()` in the `off` call is a DIFFERENT object than the `() => doSomething()` in the original `on` call — they look identical in source but are different references at runtime; always store the handler in a variable: `const handler = () => doSomething(); emitter.on('x', handler); emitter.off('x', handler);` |
| Using plain object `{}` as event registry | "I'll use an object keyed by event name — simpler than Map" | A plain object inherits from `Object.prototype`; event names like `'constructor'`, `'toString'`, `'hasOwnProperty'` collide with inherited properties; `eventRegistry['constructor']` is the Object constructor function, not an empty array; `eventRegistry['toString'].push(handler)` throws TypeError; use `new Map<string, Handler[]>()` — it has no inherited properties and O(1) lookup |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, our frontend platform used a custom EventEmitter as the backbone for cross-widget communication — multiple micro-frontend widgets running in the same shell had no direct component reference to each other.
>
> The bug that bit us: a widget registered with `on('themeChange', handler)` in its initialisation but never called `off` when the widget was unmounted and remounted (during a layout change). After five layout cycles, there were five copies of the same handler firing for every `themeChange` event. The theme applied five times per change, each time slightly incrementing sizes due to floating-point accumulation in the styles.
>
> The fix was a strict rule: every `on` call must have a corresponding `off` in the teardown. We added a `listenerCount` assertion in our test suite — any widget test that mounted and unmounted without reducing the listener count from its baseline was flagged.
>
> This translates directly to React's `useEffect` cleanup pattern and Angular's `OnDestroy` hook — the fundamental rule never changes."

---

## 8. Scale Evolution

**1,000 users →** In-process EventEmitter, synchronous dispatch, all in one JS/JVM process. Node.js `EventEmitter` is the standard implementation. No distributed concerns.

**100,000 users →** Cross-process pub/sub: Redis Pub/Sub or Kafka topics. The pub/sub concept is identical — emitter = producer, subscriber = consumer group; the network replaces the in-memory registry. Redis Pub/Sub is fire-and-forget (no persistence); Kafka persists events for replay.

**10 million users →** Large-scale event streaming (Kafka, AWS SNS/SQS). Event names = Kafka topics. `on('topic', handler)` = consumer group subscription. `emit('topic', data)` = `kafkaProducer.send(new ProducerRecord('topic', data))`. `once` semantics = consume with manual offset commit, commit after first message.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment SDK events (`on('paymentSuccess', handler)`, `on('paymentFailure', handler)`) — public JavaScript SDK API is an EventEmitter; correct `off` cleanup prevents memory leaks in merchant integrations | SDK API design; cleanup discipline; once vs on choice |
| Swiggy / Meesho | Cart update events driving multiple UI components (item count badge, total price, checkout button state); EventEmitter bus used in micro-frontend shells | Cross-component event bus pattern; memory leak in SPA |
| Adobe / Microsoft | Node.js EventEmitter internals expected at senior level; Angular `@Output()` / EventEmitter class knowledge for frontend rounds; custom EventEmitter implementation is a common Microsoft SDE-II coding problem | Custom impl from scratch; once implementation; snapshot emit explanation |
| SAP Labs | Micro-frontend cross-widget EventEmitter (themed Shell bug → 5x handlers → floating-point style accumulation); strict on/off lifecycle rule; listener count test assertion | Production memory leak story; test-driven listener tracking fix |

---

## 10. Related Topics — What to Study Next

- **Topic 284 — Implement Promise.all / Promise.race** — Promise.all is a coordination mechanism: wait for N async events then fire a combined result; it uses a counter (like `emit` counting remaining handlers) and resolves when count reaches 0; similar event-driven thinking, different synchronisation goal
- **Topic 282 — Implement EventEmitter** ← you are here; the next related topic is **Topic 283 — Deep Clone and Deep Equal** — the `on` handler registration stores function references; understanding reference equality (which `off` depends on) requires understanding how JavaScript and Java compare objects and functions
- **Topic 205 — RxJS Observables / Angular** — RxJS `Subject` and `BehaviorSubject` are advanced EventEmitter implementations with composable operators; understanding the basic EventEmitter is the prerequisite for making sense of RxJS; `Subject.next(value)` = `emit(event, value)`, `Subject.subscribe(handler)` = `on(event, handler)`, `subscription.unsubscribe()` = `off(event, handler)`

---

*Part 17 · Implement EventEmitter / Pub-Sub · Full Stack Interview Guide · Hruday D · 2026*
