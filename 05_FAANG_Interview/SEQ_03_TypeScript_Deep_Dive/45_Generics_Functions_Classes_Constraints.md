# 45. Generics — Functions, Classes, Constraints
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Generics let you write type-safe code that works with multiple types without losing type information. Instead of using `any` — which throws type safety away — a generic parameter `<T>` is a type variable that TypeScript infers or is explicitly provided, preserving the actual type throughout the function or class. I use generics for every reusable hook, utility function, and data-fetching layer at SAP — the alternative was casting to `any` and losing all inference downstream.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Generics are parametric polymorphism — the same function/class/type works correctly across different types while the type system tracks the specific type being used. Without generics, you choose between `any` (no type safety) or overloads (brittle repetition). Generics give you both reusability and safety.

### How It Works Internally

**Generic function — basic inference:**
```typescript
// Without generics — loses type
function identity(x: any): any { return x; }
const result = identity(42);  // result: any — type is lost

// With generics — preserves type
function identity<T>(x: T): T { return x; }
const result = identity(42);  // result: number — TypeScript inferred T = number
const str    = identity('hi'); // result: string — TypeScript inferred T = string
```

**Multiple type parameters:**
```typescript
function pair<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}
const p = pair('id', 42); // [string, number] — both inferred
```

**Generic constraints with `extends`:**
```typescript
// Constrain T to objects that have a .length property
function logLength<T extends { length: number }>(item: T): T {
  console.log(item.length);
  return item;
}
logLength('hello');   // ✅ string has .length
logLength([1, 2, 3]); // ✅ array has .length
logLength(42);        // ❌ number has no .length — compile error
```

**`keyof` constraint — safe property access:**
```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Hruday', role: 'admin' };
const name = getProperty(user, 'name'); // string — T[K] inferred as string
const id   = getProperty(user, 'id');   // number
getProperty(user, 'email');             // ❌ compile error — 'email' not in keyof T
```

**Default type parameters (TS 2.3+):**
```typescript
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

const raw: ApiResponse = { data: {}, status: 200 }; // T defaults to unknown
const typed: ApiResponse<User> = { data: user, status: 200 }; // T = User
```

**Generic classes:**
```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  isEmpty(): boolean { return this.items.length === 0; }
}

const numStack = new Stack<number>();
numStack.push(1);
numStack.push('hello'); // ❌ compile error — only number allowed

const strStack = new Stack<string>(); // T = string
```

**Generic interfaces and type aliases:**
```typescript
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// Concrete implementation
class UserRepository implements Repository<User> {
  async findById(id: string) { /* ... */ }
  // ... TypeScript enforces all methods match the generic signature
}
```

**Conditional type with generics:**
```typescript
// Return type changes based on type parameter
type Unwrapped<T> = T extends Promise<infer U> ? U : T;

type A = Unwrapped<Promise<string>>; // string
type B = Unwrapped<number>;          // number (not a Promise, returns as-is)
```

### Architecture & Component Boundaries

```
Generic Usage Patterns:
  ├── Utility functions: identity, pick, omit, groupBy, mapValues
  ├── Data structures: Stack<T>, Queue<T>, EventBus<EventMap>
  ├── Repository pattern: Repository<T extends Entity>
  ├── Custom hooks: useFetch<T>(url: string): FetchState<T>
  ├── Context factories: createTypedContext<T>()
  └── HOC wrappers: withLoading<P extends OwnProps>(Component: React.ComponentType<P>)
```

### Data Flow & Type Inference

```
Call site type flow:
  const result = fetchUser(id)
                     ┌─────────┐
  fetchUser<User>(id) → T inferred as User
  Return type: Promise<User>   ← T[K] propagates throughout
                     └─────────┘
TypeScript walks the call, infers T = User from argument type,
substitutes T everywhere, returns fully concrete type.
```

### Performance Implications

- Zero runtime cost — generics are erased at compile time
- Complex generic constraints (nested conditionals, recursive generics) significantly slow TypeScript's type checker — keep constraint depth shallow
- Recursive generic types (e.g., deeply nested `DeepPartial<T>`) should have a depth cap to prevent infinite type recursion

### Scalability Considerations

- **Repository pattern with generics** scales across all entity types — write `Repository<T>` once, implement for `User`, `Product`, `Order` etc.
- **Generic event bus** — `EventEmitter<EventMap>` where `EventMap = { 'user:login': { userId: string }, 'cart:add': { productId: string } }` gives fully typed event names and payloads
- **Generic result types** — `Result<T, E>` pattern used in Rust/functional TS; at scale prevents uncaught exceptions flowing up

### Trade-offs

| Approach | Type Safety | Reusability | Complexity |
|---|---|---|---|
| `any` | ❌ None | ✅ Max | Low |
| Overloads | ✅ High | ❌ Repetitive | Medium |
| Generics | ✅ High | ✅ Max | Medium |
| Conditional generics | ✅✅ Max | ✅ Max | High |

### ⚠️ Anti-Patterns & Pitfalls

- **Unnecessary generic (generic that adds nothing)** — `function wrap<T>(x: T): { value: T }` is useful; `function log<T>(x: T): void { console.log(x); }` — `T` adds nothing; just use `unknown` or `any`.
- **Over-constraining with `extends any`** — `T extends any` is identical to no constraint but misleading. Constrain to what you actually need.
- **Not constraining when you should** — accessing `x.id` without `T extends { id: string }` causes a compile error. Add the constraint — don't cast to `any`.
- **Generic classes with unintended shared state** — `class Logger<T>` that stores a cache internally but `T` only affects methods — the generic is misleading. Keep generics on the behavior that actually changes with `T`.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
Every OData service at SAP is generic — `ODataService<T extends ODataEntity>` with methods like `getList(): Promise<T[]>` and `getById(id: string): Promise<T>`. Building this once and implementing it for `SalesOrder`, `BusinessPartner`, `Product` etc. means the IDE gives full intellisense for every entity's fields. At Bosch, the WebSocket message handler was `MessageHandler<T extends WsMessage>` — typed payloads meant no runtime `JSON.parse` surprises.

**At FAANG scale:**
- **Microsoft:** TypeScript's own compiler is heavily generic — `NodeArray<T extends Node>`, `Map<K, V>`. TypeScript interviews often probe deep generic constraints knowledge.
- **Adobe:** React Spectrum's `useListData<T>()`, `useAsyncList<T>()` — generics preserve the item type through all list operations.
- **Salesforce:** LWC platform uses generic adapters — `@wire(getRecord, { recordId }) record: Record<RecordFields>`.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Generics are TypeScript's way of writing code that's reusable across types without losing type information. The key is that `<T>` is inferred from usage — I don't usually need to specify it explicitly. The patterns I reach for most: constraining with `extends` when I need a property to exist on T, `keyof T` for safe property access, and default type parameters for optional specialization. In production I use generics for the entire data layer — `Repository<T>`, `useFetch<T>`, `createContext<T>` — so type safety flows from API response all the way to the component rendering it."

### Likely Follow-up Questions
1. **What is a generic constraint?** → `<T extends SomeType>` limits T to types assignable to SomeType — you can then safely use SomeType's members on T
2. **Difference between `T extends object` and `T extends {}`?** → `object` excludes primitives; `{}` is effectively every non-null/undefined type — `{}` is almost always wrong as a constraint
3. **What is `keyof T`?** → A union of all property keys of T — `keyof { id: string; name: string }` → `'id' | 'name'`
4. **Can you make a generic with a default?** → Yes: `<T = string>` — T defaults to string when not specified

### How to Signal Senior Thinking
> "The most powerful generic pattern I've used is the repository pattern with generic constraints — `T extends { id: string }` so I can implement `findById` generically. The next level is combining generics with conditional types to derive return types from parameters — `function parse<T>(json: string): T` is useful, but `function parse<T extends ZodSchema>(schema: T, json: string): z.infer<T>` is production-grade because the return type is precisely what the schema declares."

---

## 💻 5. Code Example

```typescript
// Generic useFetch hook — SAP OData service pattern
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = React.useState<FetchState<T>>({ status: 'idle' });

  React.useEffect(() => {
    setState({ status: 'loading' });
    fetch(url)
      .then(res => res.json())
      .then((data: T) => setState({ status: 'success', data }))
      .catch((error: Error) => setState({ status: 'error', error }));
  }, [url]);

  return state;
}

// Usage — T inferred from explicit type parameter
const state = useFetch<SalesOrder[]>('/api/sales-orders');
if (state.status === 'success') {
  state.data; // SalesOrder[] — full intellisense
}

// Generic repository with keyof constraint
interface Entity { id: string }

class InMemoryRepository<T extends Entity> {
  private store = new Map<string, T>();

  save(entity: T): T {
    this.store.set(entity.id, entity);
    return entity;
  }

  findById(id: string): T | undefined {
    return this.store.get(id);
  }

  // T[K] — return type inferred from the key accessed
  pluck<K extends keyof T>(id: string, key: K): T[K] | undefined {
    return this.store.get(id)?.[key];
  }
}

const userRepo = new InMemoryRepository<User>();
userRepo.save({ id: '1', name: 'Hruday', role: 'admin' });
const name = userRepo.pluck('1', 'name');   // string | undefined
const role = userRepo.pluck('1', 'role');   // string | undefined
userRepo.pluck('1', 'email');               // ❌ compile error — 'email' not in keyof User

// Generic with conditional return type
function parseOrDefault<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

const config = parseOrDefault('{}', { theme: 'dark', lang: 'en' });
// config: { theme: string; lang: string } — inferred from fallback
```

---

## 🧠 6. Memory Aid

**Mental Model:** Generic `<T>` is a type variable — like a parameter for types. TypeScript infers it from usage. Constraints with `extends` say "T must be at least this."

**If you go blank:** "Generics are reusable types that preserve type information. `<T>` is inferred. `T extends X` constrains T. `keyof T` gives all property keys. Return type `T[K]` is the type of property K on T."

**Mnemonic:** **T = Type variable. K = Key. V = Value. Think of Map<K, V> — the classic generic.**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: No impact on runtime — all compile-time  
→ Performance: Prevents `as any` casts proliferating through the codebase — which cause runtime errors that crash UX  
→ Business: Generic data layers mean one implementation serves all entity types — faster development, fewer bugs, consistent patterns

**How it works (3 sentences):**
Generics introduce type parameters (`<T>`) that TypeScript infers from call-site usage or explicit annotation, substituting T with the concrete type throughout the function/class body. Constraints (`T extends SomeType`) limit what T can be and unlock type-specific operations within the generic. At compile time, generics are fully erased — they produce zero runtime overhead.

**Company relevance:**
- Microsoft: TypeScript compiler codebase is a masterclass in generics — Microsoft interviewers probe constraints, inference, and conditional types
- Adobe: React Spectrum hooks (useListData, useAsyncList, useMenuTriggerState) are all generic — understanding generic hook return types is expected
- Salesforce: Platform-level adapter generics in LWC — `@wire` decorator typing requires understanding how generics flow through decorators
- Cisco: Network API SDKs in TypeScript use generic response types — `ApiResponse<T>` patterns are first-class

---
**✅ Topic 45/486 complete.**
**→ Continuing to Topic 46: Enums vs Const Assertions vs Union Types**
