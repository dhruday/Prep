# 51. Utility Types — Partial, Required, Pick, Omit, Record, ReturnType, Parameters
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

TypeScript's built-in utility types are pre-built generic type transformers that handle the most common type manipulation patterns. `Partial` makes all fields optional, `Required` makes all mandatory, `Pick` selects a subset of keys, `Omit` removes keys, `Record` creates a key-value map, `ReturnType` extracts a function's return type, and `Parameters` extracts its argument types. Knowing these prevents writing mapped or conditional types from scratch for common cases — and understanding their implementations makes you fluent in advanced TypeScript patterns.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### How Each Utility Type Works — With Implementations

**`Partial<T>` — all properties optional:**
```typescript
type Partial<T> = { [K in keyof T]?: T[K] };

interface User { id: string; name: string; email: string }
type UserUpdate = Partial<User>;
// { id?: string; name?: string; email?: string }
```
Use case: PATCH request bodies, form state, config with defaults.

**`Required<T>` — all properties required:**
```typescript
type Required<T> = { [K in keyof T]-?: T[K] };

type Config = { timeout?: number; retries?: number; baseUrl?: string };
type FullConfig = Required<Config>;
// { timeout: number; retries: number; baseUrl: string }
```
Use case: After providing defaults, assert that all fields are present.

**`Readonly<T>` — all properties immutable:**
```typescript
type Readonly<T> = { readonly [K in keyof T]: T[K] };

const config: Readonly<FullConfig> = { timeout: 5000, retries: 3, baseUrl: '/api' };
config.timeout = 1000; // ❌ compile error
```
Use case: Configuration objects, Redux state, immutable value objects.

**`Pick<T, K>` — select only specified keys:**
```typescript
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }  — email excluded
```
Use case: API response projections, view models, selecting fields for display.

**`Omit<T, K>` — exclude specified keys:**
```typescript
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type UserWithoutId = Omit<User, 'id'>;
// { name: string; email: string }
```
Use case: Create request bodies (no `id` for new entities), form types (remove computed fields).

**`Record<K, V>` — create a key-value map type:**
```typescript
type Record<K extends keyof any, V> = { [P in K]: V };

type StatusMessages = Record<'idle' | 'loading' | 'error' | 'success', string>;
// { idle: string; loading: string; error: string; success: string }

type UserCache = Record<string, User>;  // string → User lookup
```
Use case: Lookup tables, status message maps, normalization cache.

**`Exclude<T, U>` — remove union members:**
```typescript
type Exclude<T, U> = T extends U ? never : T;

type A = Exclude<'a' | 'b' | 'c', 'a' | 'c'>; // 'b'
type B = Exclude<string | number | null, null>;  // string | number
```

**`Extract<T, U>` — keep only matching union members:**
```typescript
type Extract<T, U> = T extends U ? T : never;

type C = Extract<string | number | boolean, number | boolean>; // number | boolean
```

**`NonNullable<T>` — remove null and undefined:**
```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type D = NonNullable<string | null | undefined>; // string
```

**`ReturnType<T>` — extract function return type:**
```typescript
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

function getCurrentUser(): Promise<User> { /* ... */ }
type UserResult = ReturnType<typeof getCurrentUser>; // Promise<User>

// Combine with Awaited to unwrap the Promise:
type ResolvedUser = Awaited<ReturnType<typeof getCurrentUser>>; // User
```

**`Parameters<T>` — extract function parameter types as tuple:**
```typescript
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

function createOrder(userId: string, amount: number, items: string[]): Order { /* ... */ }
type OrderArgs = Parameters<typeof createOrder>;
// [userId: string, amount: number, items: string[]]
```

**`ConstructorParameters<T>` & `InstanceType<T>`:**
```typescript
class UserService { constructor(public db: Database, public logger: Logger) {} }
type ServiceArgs = ConstructorParameters<typeof UserService>; // [Database, Logger]
type ServiceInstance = InstanceType<typeof UserService>;      // UserService
```

**`Awaited<T>` — recursively unwrap Promise:**
```typescript
type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

type A = Awaited<Promise<Promise<string>>>;    // string
type B = Awaited<ReturnType<typeof fetchUser>>; // User (if fetchUser returns Promise<User>)
```

**Composing utilities:**
```typescript
// Create type from entity, minus id/timestamps, all optional — for PATCH body
type PatchBody<T extends { id: string; createdAt: Date; updatedAt: Date }> =
  Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

type UserPatch = PatchBody<User>;
// { name?: string; email?: string; role?: string }  — no id, no dates

// Extract only the method names from an object
type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T];

type ServiceMethods = MethodKeys<UserService>; // union of all method names
```

### ⚠️ Anti-Patterns & Pitfalls

- **`Partial<T>` is flat — not deep** — `Partial<{ address: { city: string } }>` makes `address` optional but `city` is still required inside `address`. For deep partial, write a recursive `DeepPartial<T>`.
- **`Omit` with non-existent keys** — `Omit<User, 'nonExistentField'>` doesn't error — it silently returns the original type. Always verify omitted keys exist.
- **`Record<string, V>` vs `Record<'a' | 'b', V>`** — `Record<string, V>` is essentially `{ [k: string]: V }` — all key specificity is lost. Use literal union keys when you know all keys.
- **`ReturnType` on overloaded functions** — extracts only the last overload signature. For overloaded functions, type the return manually or use a specific overload.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP services use `PatchBody<SalesOrder>` (Omit + Partial composition) to type PATCH request bodies: all updatable fields optional, system fields excluded. `Record<OrderStatus, string>` maps each order status to its display label — compile error if a new status is added without a label. `Pick<SalesOrder, 'id' | 'orderNumber' | 'status'>` was the ListItem type, ensuring list components never accidentally accessed heavyweight fields. `ReturnType<typeof useSalesOrders>` let other components type the hook's return value without importing the full type definition.

**At FAANG scale:**
- **Microsoft:** TypeScript deep-dives use these utilities — Azure SDK uses `Partial<RequestOptions>` everywhere for optional config  
- **Adobe:** React Spectrum `ComponentProps` utilities extend `Pick` and `Omit` heavily for prop subset components
- **Salesforce:** Platform TypeScript generation emits `Partial<T>` for form adapters and `Record<string, FieldValue>` for generic record maps
- **Cisco:** API client SDKs use `Parameters<typeof fetchCall>` for middleware type passthrough

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "TypeScript's built-in utilities are all implemented with mapped types and conditional types. The ones I reach for daily: `Partial` for PATCH bodies and optional config, `Omit` to strip system fields like `id` and timestamps from create/update types, `Pick` for list view models where I only need a subset, `Record` for lookup maps where I need every key in a union to have a value, and `ReturnType` with `Awaited` together to type async hook return values without importing the resolved type. The trap with `Partial` is that it's shallow — for nested optional structures I write a recursive `DeepPartial` with a conditional type."

### Likely Follow-up Questions
1. **Implement `Partial<T>` from scratch:** → `type Partial<T> = { [K in keyof T]?: T[K] }`
2. **Difference between `Pick` and `Omit`?** → `Pick` keeps only specified keys; `Omit` removes specified keys; Pick is safer because it errors on non-existent keys in some versions
3. **What is `ReturnType` used for?** → Extracting a function's return type as a type — useful when the return type is complex or inferred, and you want to reference it without repeating it
4. **Compose: make only specific fields optional** → `Omit<T, K> & Partial<Pick<T, K>>` — the `PartialPick` pattern

### How to Signal Senior Thinking
> "`Awaited<ReturnType<typeof myAsyncFn>>` is the composed form I use most. If a function returns `Promise<User[]>`, `ReturnType` gets `Promise<User[]>`, and `Awaited` unwraps it to `User[]`. This lets me type the resolved value without importing the full type or repeating the return signature — especially important for custom hooks where the return type is inferred and complex."

---

## 💻 5. Code Example

```typescript
interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  amount: number;
  status: 'open' | 'closed' | 'cancelled';
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── API body types derived from entity ─────────────────────────────

// POST body — no server-assigned fields
type CreateOrderBody = Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

// PATCH body — all updatable fields optional, no system fields
type PatchOrderBody = Partial<Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>>;

// GET list item — lightweight projection
type OrderListItem = Pick<SalesOrder, 'id' | 'orderNumber' | 'amount' | 'status'>;

// ─── Record for lookup maps ──────────────────────────────────────────

const STATUS_LABELS: Record<SalesOrder['status'], string> = {
  open:      'Open',
  closed:    'Completed',
  cancelled: 'Cancelled',
  // TypeScript errors if any status key is missing
};

// ─── ReturnType + Awaited ────────────────────────────────────────────

async function fetchOrders(customerId: string): Promise<SalesOrder[]> {
  const res = await fetch(`/api/orders?customerId=${customerId}`);
  return res.json();
}

type FetchOrdersReturn  = ReturnType<typeof fetchOrders>;  // Promise<SalesOrder[]>
type ResolvedOrders     = Awaited<FetchOrdersReturn>;       // SalesOrder[]

// Using in a hook return type
function useOrders(customerId: string): { data: ResolvedOrders | null; loading: boolean } {
  const [data, setData] = React.useState<ResolvedOrders | null>(null);
  const [loading, setLoading] = React.useState(false);
  // ...
  return { data, loading };
}

// ─── Parameters for middleware / wrapping ────────────────────────────

type FetchArgs = Parameters<typeof fetchOrders>;
// [customerId: string]

// Higher-order function that wraps fetchOrders with retry logic
function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  retries = 3
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>) => {
    return fn(...args) as ReturnType<T>;
    // Full type inference: args and return type come from T
  };
}

const fetchOrdersWithRetry = withRetry(fetchOrders, 3);
// Type: (customerId: string) => Promise<SalesOrder[]>

// ─── Deep Partial — recursive utility ───────────────────────────────

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<any>
      ? T[K]
      : DeepPartial<T[K]>
    : T[K]
};

interface Config {
  api: { baseUrl: string; timeout: number };
  ui:  { theme: 'light' | 'dark'; density: 'compact' | 'normal' };
}

type PartialConfig = DeepPartial<Config>;
// { api?: { baseUrl?: string; timeout?: number }; ui?: { theme?: ...; density?: ... } }
```

---

## 🧠 6. Memory Aid

**Mental Model:** Utility types are the TypeScript stdlib for type manipulation. Map them to their implementation shapes: `Partial` = add `?`, `Required` = add `-?`, `Pick` = filter keys in, `Omit` = filter keys out, `Record` = key set → value type.

**If you go blank:** "Partial optional, Required mandatory, Pick select, Omit remove, Record map keys to value, ReturnType function's return, Parameters function's args, Awaited unwrap Promise."

**Mnemonic:** **P-R-P-O-R-R-P-A: "Pretty Reasonable People Omit Record-keeping, Returning Predictable Answers"**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Zero runtime impact — purely type computation  
→ Performance: Prevents accidental data overfetch (large entities) in list views — `Pick` enforces lightweight projections at compile time  
→ Business: API body types derived from entity types stay in sync automatically — no manual drift, fewer bad API calls in production

**How it works (3 sentences):**
Built-in utility types are standard library generic types shipped with TypeScript, all implemented using mapped types, conditional types, and indexed access types. They transform existing types — adding/removing modifiers (`Partial`/`Required`), selecting/excluding keys (`Pick`/`Omit`), creating key-value structures (`Record`), or extracting function signatures (`ReturnType`/`Parameters`). They compose freely: `Partial<Omit<T, K>>` strips system keys and makes remaining fields optional, which is the foundation of safe PATCH body typing.

**Company relevance:**
- Microsoft: TypeScript interviews at Microsoft directly ask candidates to implement `Partial`, `Required`, `Pick`, `Omit` from scratch — expected at senior level
- Adobe: Component prop flexibility via `Pick` and `Omit` is central to React Spectrum's API design — understanding these is required
- Salesforce: Auto-generated TypeScript types for Apex objects use `Partial<T>` for form adapters; interviewers expect correct use vs `Partial` for nested objects (DeepPartial)
- Cisco: SDK wrapper functions use `Parameters<T>` and `ReturnType<T>` for type-safe middleware chains — expected at staff level

---
**✅ Topic 51/486 complete.**
**→ Continuing to Topic 52: Typing Props, Children, Events, Refs in React**
