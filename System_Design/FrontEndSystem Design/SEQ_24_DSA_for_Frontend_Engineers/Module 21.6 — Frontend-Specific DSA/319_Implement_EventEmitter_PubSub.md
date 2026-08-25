# 319 – Implement EventEmitter / PubSub

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
EventEmitter (PubSub) decouples publishers from subscribers. Core API: `on(event, callback)`, `off(event, callback)`, `emit(event, ...args)`, `once(event, callback)`. Data structure: `Map<string, Set<Function>>`. This is one of the most frequently asked frontend machine coding questions.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
type Listener = (...args: unknown[]) => void;

class EventEmitter {
  private events = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): () => void {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(listener);
    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener): void {
    this.events.get(event)?.delete(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.events.get(event) || []) {
      listener(...args);
    }
  }

  once(event: string, listener: Listener): () => void {
    const wrapper: Listener = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  removeAllListeners(event?: string): void {
    if (event) this.events.delete(event);
    else this.events.clear();
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }
}

// ──── TYPED EVENT EMITTER (TypeScript) ────
interface EventMap {
  'user:login': [userId: string];
  'user:logout': [];
  'data:update': [data: Record<string, unknown>];
}

class TypedEventEmitter<T extends Record<string, unknown[]>> {
  private events = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): () => void {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(listener);
    return () => this.events.get(event)?.delete(listener);
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    for (const listener of this.events.get(event) || []) {
      (listener as (...a: T[K]) => void)(...args);
    }
  }
}

// Usage:
// const emitter = new TypedEventEmitter<EventMap>();
// emitter.on('user:login', (userId) => { /* userId is string */ });
// emitter.emit('user:login', 'user123'); // type-safe
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"EventEmitter stores Map<event, Set<listeners>>. on() adds, off() removes, emit() iterates and calls. once() wraps listener to self-remove after first call. I return an unsubscribe function from on() for cleaner API. The typed version uses generics for type-safe events."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Real usage: Cross-component communication
const bus = new EventEmitter();
// Component A
bus.emit('cart:updated', { items: 3 });
// Component B
bus.on('cart:updated', (data) => console.log('Cart:', data));
```

## 5. 🧠 MEMORY AID
**"EventEmitter = Map<event, Set<fn>>. on = add. off = delete. emit = iterate & call. once = wrapper that self-removes."**

## 6. 🎯 COMPLEXITY
on/off/once: O(1) | emit: O(n) where n = listeners for that event
