# 47. Conditional Types — infer Keyword
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Conditional types let TypeScript choose between types based on a type-level condition: `T extends U ? X : Y`. The `infer` keyword goes further — it extracts a specific type from within a structural match, like capturing the return type of a function or the item type of an array. I use conditional types whenever building utility types or generic helpers that need to behave differently based on what they receive — they're the foundation of built-in utilities like `ReturnType`, `Awaited`, and `Parameters`.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Conditional types are TypeScript's type-level if-else. They enable **generic types that return different types based on what they receive**, not different values. Before conditional types (pre-TS 2.8), you could only overload functions for this behavior — now you can express it in the type system directly.

`infer` is the pattern-matching piece: it lets you declare a type variable inline during a conditional type check and bind it to whatever matched. Think of it as regex capture groups, but for types.

### How It Works Internally

**Basic conditional type:**
```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
type C = IsString<'hello'>; // true — 'hello' extends string
```

**Distributive conditional types — union distribution:**
When a conditional type has a type parameter (naked, not wrapped) in the conditional, it distributes over unions:
```typescript
type IsString<T> = T extends string ? true : false;

type D = IsString<string | number>;
// Distributes to: (string extends string ? true : false) | (number extends string ? true : false)
// = true | false
// = boolean
```

**To stop distribution — wrap in a tuple:**
```typescript
type IsStringExact<T> = [T] extends [string] ? true : false;
type E = IsStringExact<string | number>; // false — no distribution
```

**`infer` keyword — extract types:**
```typescript
// Extract the return type of a function
type ReturnType<T extends (...args: any) => any> = 
  T extends (...args: any) => infer R ? R : never;

function greet(name: string): string { return `Hello ${name}`; }
type GreetReturn = ReturnType<typeof greet>; // string

// Extract argument types
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

type GreetParams = Parameters<typeof greet>; // [name: string]
```

**Infer with array element type:**
```typescript
type ElementType<T> = T extends (infer E)[] ? E : never;

type A = ElementType<string[]>;      // string
type B = ElementType<number[]>;      // number
type C = ElementType<[string, number]>; // string | number (tuple flattened)
type D = ElementType<string>;        // never (not an array)
```

**Infer with Promise — unwrapping async types:**
```typescript
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
// Recursively unwraps nested Promises

type A = Awaited<Promise<string>>;           // string
type B = Awaited<Promise<Promise<number>>>; // number
type C = Awaited<string>;                    // string (not a Promise)
```
This is exactly how TypeScript's built-in `Awaited<T>` works (added in TS 4.5).

**Multiple `infer` in one condition:**
```typescript
type FunctionInfo<T> = T extends (first: infer F, ...rest: infer R) => infer Return
  ? { first: F; rest: R; return: Return }
  : never;

function add(a: number, b: number, c: string): boolean { return true; }
type Info = FunctionInfo<typeof add>;
// { first: number; rest: [b: number, c: string]; return: boolean }
```

**Conditional types with mapped types:**
```typescript
// Remove null/undefined from all properties
type NonNullableProperties<T> = {
  [K in keyof T]: T[K] extends null | undefined ? never : T[K]
};
```

**Filtering union members with conditional types:**
```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type A = NonNullable<string | null | undefined | number>;
// = string | number  (null and undefined filtered to never → removed)
```
`never` in a union is automatically removed — this is the "filter" pattern.

### Architecture & Component Boundaries

```
Conditional Types Role:
  ├── Built-in utilities: ReturnType, Parameters, Awaited, NonNullable
  ├── Custom type predicates: IsArray<T>, IsFunctionType<T>
  ├── Type transformers: DeepReadonly<T>, DeepPartial<T>
  ├── Narrowing helpers: ExtractByKind<Union, 'kind'>
  ├── API typing: UnwrapApiResponse<T>
  └── Discriminated union filtering: Extract<Union, { kind: 'foo' }>
```

### Data Flow & Type Resolution

```
TypeScript resolves conditional types lazily when T is a concrete type:
  T = string → string extends string ? true : false → true (resolved)
  T = generic → stays as IsString<T> (deferred, unresolved)

Deferred resolution matters:
  function isString<T>(x: T): IsString<T> — not resolved until T is known
  const result = isString('hello') — now T = string → result: true
```

### Performance Implications

- Recursive conditional types (like `DeepPartial`) can cause TypeScript to recurse deeply — TypeScript has a recursion depth limit; hitting it causes `Type instantiation is excessively deep` error
- Add `[L extends 0 ? 1 : 0]: never` depth counters to recursive types for production use
- Deeply nested conditional types significantly slow TypeScript's type checker on large files

### Scalability Considerations

- Use `Extract<T, U>` and `Exclude<T, U>` (built on conditional types) instead of manual filtering
- For recursive types, limit depth: `type DeepReadonly<T, D extends number[] = []> = D['length'] extends 5 ? T : ...`

### ⚠️ Anti-Patterns & Pitfalls

- **Forgetting distribution when union members are unexpected** — `IsString<string | number>` distributing to `boolean` surprises developers. Wrap in tuple `[T]` when you want the union treated as a whole.
- **Infinite recursive types** — `type Infinite<T> = T extends object ? Infinite<T> : T` loops forever. Always add a depth termination condition for recursive conditional types.
- **`infer` in wrong position** — `infer` only works in conditional type extends clauses, not in the true/false branches. `T extends (infer R) ? X : Y` is valid; `T extends string ? infer R : Y` is invalid.
- **Overusing conditional types when mapped types or generics suffice** — conditional types are powerful but complex; a simple mapped type is easier to reason about.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP OData responses are wrapped in a consistent envelope — `ODataResponse<EntitySet<T>>`. To get the actual entity type from the response, a conditional type `type UnwrapOData<T> = T extends ODataResponse<EntitySet<infer E>> ? E : never` extracted `E` automatically. This meant every component that called an OData service got the exact entity type inferred — no manual type assertion needed. At Bosch, the WebSocket message bus used `infer` to extract payload types: `type MessagePayload<T extends WsMessage> = T extends { payload: infer P } ? P : never`.

**At FAANG scale:**
- **Microsoft:** TypeScript language service uses conditional types for hover type display — the type shown on hover for `.then()` callbacks is derived via `Awaited<T>`.
- **Adobe:** React Spectrum uses `ComponentPropsWithRef<T extends ElementType>` which uses conditional types to correctly extract props for both DOM elements and React components.
- **Salesforce:** Platform type generation scripts use conditional types to convert OpenAPI nullable schemas to `T | null` exactly.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Conditional types are TypeScript's type-level if-else: `T extends U ? X : Y`. They evaluate to X or Y based on whether T is assignable to U. The `infer` keyword is what makes them powerful — it pattern-matches against a type and extracts a subtype from it. The clearest example is `ReturnType<T>`: `T extends (...args: any) => infer R ? R : never` — when T is a function, R is bound to its return type. The tricky behavior is distribution: conditional types distribute over unions by default, so `IsString<string | number>` evaluates both members separately and unions the results. You wrap in a tuple to prevent that."

### Likely Follow-up Questions
1. **What does `infer` do?** → It declares a type variable within a conditional type's extends clause that captures (binds) a matched type — like a capture group in regex for types
2. **What is distributive conditional type?** → When T is a naked type parameter in a conditional type, the condition distributes over each union member separately
3. **How would you implement `ReturnType` from scratch?** → `type RT<T> = T extends (...args: any[]) => infer R ? R : never`
4. **How do you prevent distribution in a conditional type?** → Wrap T in a tuple: `[T] extends [U] ? X : Y`

### How to Signal Senior Thinking
> "The `infer` pattern becomes particularly powerful combined with recursive conditional types. TypeScript's built-in `Awaited<T>` is a recursive conditional type — it keeps unwrapping until it hits a non-Promise. In production I watch for the recursion depth limit and add explicit depth counters to prevent `Type instantiation is excessively deep` errors, which appear in test files when generics are deeply nested."

---

## 💻 5. Code Example

```typescript
// Rebuilding TypeScript built-in utilities with conditional types + infer

// ReturnType — extract function return type
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never;

// Parameters — extract function argument types as tuple
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

// Awaited — recursively unwrap Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// ElementType — extract array element type
type ElementType<T extends any[]> = T extends (infer E)[] ? E : never;

// Flatten one level of nested array
type Flatten<T> = T extends Array<infer Item> ? Item : T;

// ─── SAP OData envelope unwrapper ───────────────────────────────────

type ODataEnvelope<T> = { value: T; '@odata.count'?: number };

type UnwrapOData<T> = T extends ODataEnvelope<infer U> ? U : T;

type SalesOrders = ODataEnvelope<SalesOrder[]>;
type Unwrapped = UnwrapOData<SalesOrders>; // SalesOrder[]

// ─── Filter union members (Exclude / Extract pattern) ────────────────

// Exclude — remove union members assignable to U
type Exclude<T, U> = T extends U ? never : T;
type A = Exclude<'a' | 'b' | 'c', 'a' | 'c'>; // 'b'

// Extract — keep only union members assignable to U
type Extract<T, U> = T extends U ? T : never;
type B = Extract<string | number | boolean, number | boolean>; // number | boolean

// ─── Discriminated union helper by kind ──────────────────────────────

type AppEvent =
  | { kind: 'user:login';  userId: string }
  | { kind: 'user:logout'; userId: string }
  | { kind: 'cart:add';    productId: string; qty: number }
  | { kind: 'error';       message: string };

type EventByKind<T extends AppEvent, K extends AppEvent['kind']> =
  Extract<T, { kind: K }>;

type LoginEvent = EventByKind<AppEvent, 'user:login'>;
// { kind: 'user:login'; userId: string }

// ─── Tuple head / tail with infer ────────────────────────────────────

type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;
type Tail<T extends any[]> = T extends [any, ...infer T] ? T : never;

type H = Head<[string, number, boolean]>; // string
type Ta = Tail<[string, number, boolean]>; // [number, boolean]
```

---

## 🧠 6. Memory Aid

**Mental Model:** Conditional type = type-level ternary. `infer` = type capture group. Distribution = union members evaluated individually.

**If you go blank:** "Conditional type: `T extends U ? X : Y`. `infer R` captures a matched type inside the extends clause. Distribution: conditions spread over union members by default. Stop with `[T] extends [U]`."

**Mnemonic:** **C = Conditional = Choose. I = Infer = Intercept-and-capture. D = Distributive = Divide-union.**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Zero runtime cost — purely type-level computation that prevents bugs without affecting performance  
→ Performance: Enables generic code that doesn't require `any` casts — `any` casts at data boundaries cause runtime exceptions  
→ Business: Built-in utilities (`ReturnType`, `Awaited`, `Parameters`) that every TypeScript developer uses are conditional types — deep understanding required at senior level

**How it works (3 sentences):**
Conditional types evaluate `T extends U ? X : Y` at the type level — if T is structurally assignable to U, the result is X, otherwise Y. The `infer` keyword binds a new type variable to the matched portion of U, enabling extraction of subtypes like return types, array element types, or Promise resolutions. When the left side of `extends` is a naked type parameter (not wrapped), the condition distributes over each union member independently and the results are unioned.

**Company relevance:**
- Microsoft: TypeScript team publishes conditional type patterns in official docs — interviewers expect fluency with `infer`, distribution, and how built-in utilities are implemented
- Adobe: React Spectrum's `ComponentPropsWithRef` and `ComponentPropsWithoutRef` use conditional types — understanding prop inheritance in component libraries requires this
- Salesforce: Apex integration TypeScript types are auto-generated using conditional types to map nullable API fields
- Cisco: Platform SDK uses `Awaited<T>` pervasively for async API types — expected to explain its implementation

---
**✅ Topic 47/486 complete.**
**→ Continuing to Topic 48: Mapped Types — keyof, in, as**
