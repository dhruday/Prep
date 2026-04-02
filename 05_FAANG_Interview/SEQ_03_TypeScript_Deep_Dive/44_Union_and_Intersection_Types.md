# 44. Union & Intersection Types
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Union types (`A | B`) mean a value can be one of several types — the type system enforces that you handle all possibilities. Intersection types (`A & B`) combine types — a value must satisfy all of them simultaneously. Unions model alternatives; intersections model combinations. I use unions constantly for state machines and API response shapes at SAP, and intersections when composing reusable mixins or extending component props with HOC-injected props.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**Union (`A | B`):** The value is of type A **or** type B. TypeScript tracks both possibilities and forces you to narrow before accessing type-specific members.

**Intersection (`A & B`):** The value must satisfy **both** A and B simultaneously — it has all properties of A and all properties of B.

These are direct translations of set theory:
- Union = A ∪ B (all values in A plus all values in B)
- Intersection = A ∩ B (only values that are in both A AND B)

### How It Works Internally

**Union type narrowing — TypeScript's control flow analysis:**
```typescript
type StringOrNumber = string | number;

function process(value: StringOrNumber) {
  // TypeScript tracks type at each branch:
  if (typeof value === 'string') {
    value.toUpperCase(); // ✅ string here
  } else {
    value.toFixed(2);   // ✅ number here
  }
}
```

**Union with objects — requires narrowing by a shared discriminant:**
```typescript
type Circle  = { kind: 'circle';  radius: number };
type Square  = { kind: 'square';  side: number };
type Shape = Circle | Square;

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'square': return shape.side ** 2;
  }
}
```
TypeScript narrows `shape` per case — `shape.radius` is only accessible in the `'circle'` branch.

**Union with `never` for exhaustiveness:**
```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'square': return shape.side ** 2;
    default: return assertNever(shape); // ✅ TypeScript errors if a new Shape variant is added
  }
}
```

**Intersection types — property merging:**
```typescript
type HasId      = { id: string };
type HasTimestamps = { createdAt: Date; updatedAt: Date };

type Entity = HasId & HasTimestamps;
// Entity = { id: string; createdAt: Date; updatedAt: Date }

const user: Entity = { id: '1', createdAt: new Date(), updatedAt: new Date() }; // ✅
```

**Intersection with conflicting primitive properties — becomes `never`:**
```typescript
type A = { value: string };
type B = { value: number };
type AB = A & B;
// AB.value = string & number = never
// AB is effectively impossible to instantiate
const x: AB = { value: ??? }; // ❌ no value can be both string and number
```

**Union of primitive literals — string enum alternative:**
```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
```

**Narrowing techniques:**
```typescript
// typeof — for primitives
if (typeof x === 'string') { ... }

// instanceof — for class instances
if (error instanceof TypeError) { ... }

// in — for property checks on objects
if ('radius' in shape) { ... }

// Type predicate (user-defined guard)
function isCircle(s: Shape): s is Circle {
  return s.kind === 'circle';
}

// Discriminant property (most reliable for object unions)
if (shape.kind === 'circle') { ... }
```

### Architecture & Component Boundaries

```
Union Types:
  ├── API response: Success | Error responses
  ├── State machines: 'idle' | 'loading' | 'success' | 'error'
  ├── Event types: MouseEvent | KeyboardEvent | TouchEvent
  └── Component prop variants: ButtonProps with variant union

Intersection Types:
  ├── Composed entity types: BaseEntity & UserFields
  ├── HOC-injected props: OwnProps & InjectedProps
  ├── Mixin patterns: WithTheme & WithRouter & OwnProps
  └── Builder patterns: RequiredPart & OptionalPart
```

### Data Flow & State Flow

**Union type narrows as control flow progresses:**
```
Function entry: value: string | number
  → if (typeof value === 'string'): value is narrowed to string
  → else branch: value is narrowed to number  
  → after if block: value is back to string | number (TypeScript widens)
```

**Intersection type is additive — never narrows:**
```
Type A & B: always has all properties of A and B
No narrowing possible — intersection is the fixed combined type
```

### Performance Implications

- Both are compile-time only — zero runtime cost
- Complex union types with many members can slow TypeScript's inference engine — unions of 50+ literal strings are noticeably slow; use `string` with runtime validation instead
- Intersection of large object types increases type-checking time proportionally to combined property count

### Scalability Considerations

- **Small team:** Use literal union types for all string enums — more readable than TypeScript `enum` and tree-shakeable.
- **Large team:** Discriminated unions with exhaustiveness checking are essential — prevents runtime errors when adding new variants breaks unhandled switch cases.
- **Library scale:** Intersection types for composable API design — `type CompleteOptions = BaseOptions & PaginationOptions & FilterOptions` lets consumers build up option types incrementally.

### Trade-offs

| Union | Intersection | When to Choose |
|---|---|---|
| One of several types | All types combined | Union for alternatives; Intersection for combinations |
| Requires narrowing to access members | All members immediately available | Union forces explicit handling |
| Models state/variants well | Models composition/mixins well | Context-dependent |

### ⚠️ Anti-Patterns & Pitfalls

- **Not handling all union variants** — using `if` without `else` or `switch` without default means you silently miss new variants. Always use exhaustiveness checking with `never` for discriminated unions.
- **Intersection with conflicting primitive types → `never`** — `{ count: string } & { count: number }` produces `never` for `count`. TypeScript won't error on the intersection declaration but will error on any use. Validate shape compatibility before intersecting.
- **Overly wide unions defeating type safety** — `type ID = string | number | null | undefined` is a union so wide it effectively bypasses type checking. Narrow the union to what your system actually handles.
- **Using union for flags (should be object)** — `type Config = 'darkMode' | 'compactLayout' | 'rtl'` — if multiple flags can be active simultaneously, this is wrong. Use `{ darkMode: boolean; compactLayout: boolean; rtl: boolean }` instead.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
OData operations return different response shapes depending on success or error state. A discriminated union models this: `type ODataResponse<T> = { success: true; value: T } | { success: false; error: ODataError }`. Every consumer must narrow before accessing `.value` — TypeScript enforces the error case is handled. At Bosch, WebSocket message unions typed as `type WsMessage = PingMessage | DataMessage | ErrorMessage | CloseMessage` with a `type` discriminant made the message router exhaustive — adding a new message type caused compile errors everywhere it wasn't handled.

**At FAANG scale:**
- **Microsoft:** Azure SDK TypeScript uses intersection types for request options — `type RequestOptions = BaseOptions & RetryOptions & LoggingOptions`. Each concern is separately typed and composed.
- **Adobe:** React Spectrum component props use union types for size variants (`'small' | 'medium' | 'large'`) and intersection for HOC-composed props (accessibility props & own props merged).

**How it evolves with scale:**
- Small scale: Simple union literals for variants, intersections for plain object merging.
- Medium scale: Discriminated unions with exhaustiveness checking across all state machines.
- Large scale: Type-safe event bus: `type AppEvent = UserEvent | ProductEvent | CartEvent` — all event handlers switch on discriminant, exhaustiveness enforced.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Union types model alternatives — the value is one of several possibilities and TypeScript forces you to narrow before access. Intersection types model composition — the value must satisfy all combined types simultaneously. The pattern I reach for most is discriminated unions for state machines and API responses: a `status` discriminant field, a switch statement, and a `never` exhaustiveness check so adding a new variant immediately surfaces all unhandled cases at compile time. Intersections I use for composable option types and HOC prop merging. The one trap with intersections: conflicting primitive properties on the same key produce `never` — the type becomes impossible to instantiate, which TypeScript doesn't always warn about at the intersection declaration site."

### Likely Follow-up Questions
1. **What is type narrowing and how does TypeScript do it?** → Control flow analysis — TypeScript tracks the type at each branch of `if`/`switch`/`instanceof`/`typeof` checks and narrows the type in each branch
2. **What is a discriminated union?** → Union of object types where each member has a common literal property (`kind`, `type`, `status`) — TypeScript uses that property to narrow the union in switch/if statements
3. **What happens when you intersect `string & number`?** → Results in `never` — no value can be both; this is set-theory intersection of disjoint sets
4. **How do you make a switch exhaustive?** → Add a `default: return assertNever(x)` case where `assertNever` takes `never` — TypeScript errors if any variant reaches the default

### vs Alternatives
| Union of literals | TypeScript `enum` | Object const map |
|---|---|---|
| Tree-shakeable | Generates JS (not erased) | Object at runtime |
| Literal type inference | Nominal-ish type | Value lookup possible |
| Preferred for most uses | Avoid for string enums | Use when runtime value needed |

### How to Signal Senior Thinking
> "The exhaustiveness check pattern with `never` is what separates a defensively typed codebase from one that silently mishandles new variants. I always add a `default: assertNever(x)` in discriminated union switches — it means the compiler, not the developer, finds every unhandled case when the union grows."

---

## 💻 5. Code Example

```typescript
// Discriminated union with exhaustiveness — SAP OData response pattern
type ODataSuccess<T> = { ok: true; value: T; etag: string };
type ODataError    = { ok: false; code: number; message: string };
type ODataResult<T> = ODataSuccess<T> | ODataError;

function handleResult<T>(result: ODataResult<T>): T {
  if (result.ok) {
    return result.value; // ✅ narrowed to ODataSuccess<T>
  }
  throw new Error(`[${result.code}] ${result.message}`); // ✅ narrowed to ODataError
}

// Discriminated union state machine with exhaustiveness check
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function renderState<T>(state: FetchState<T>): string {
  switch (state.status) {
    case 'idle':    return 'Waiting...';
    case 'loading': return 'Loading...';
    case 'success': return `Done: ${JSON.stringify(state.data)}`;
    case 'error':   return `Error: ${state.error.message}`;
    default:        return assertNever(state); // TypeScript errors if new status added
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(x)}`);
}

// Intersection: composing reusable type fragments
type WithId        = { id: string };
type WithTimestamps = { createdAt: Date; updatedAt: Date };
type WithSoftDelete = { deletedAt: Date | null };

type Entity = WithId & WithTimestamps;
type SoftDeletableEntity = Entity & WithSoftDelete;

// Intersection for HOC prop composition
type OwnButtonProps    = { label: string; onClick: () => void };
type WithLoadingProps  = { isLoading?: boolean };
type ButtonWithLoading = OwnButtonProps & WithLoadingProps;
```

**Interview vs Production difference:**
In an interview, focus on the discriminated union + `assertNever` pattern — that's the show-stopper. In production, also: use Zod or io-ts to validate API responses match your union types at the boundary (TypeScript doesn't validate at runtime), and document why each union variant exists.

---

## 🧠 6. Memory Aid

**Mental Model:** Union = OR (either). Intersection = AND (both). Narrowing converts a union's OR into a definite type at each code path.

**If you go blank:** "Union is A or B — you must narrow to access type-specific members. Intersection is A and B — you get all members of both. Use `never` in the default branch of a switch to make union handling exhaustive."

**Mnemonic:** **U = Union = Either/Or; I = Intersection = Both/And**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Zero runtime impact — purely type safety that prevents production bugs
→ Performance: Exhaustiveness checking catches missing cases at compile time — prevents "undefined is not a function" at runtime
→ Business: Discriminated unions model business state machines precisely — loading/success/error handling is forced, never optional

**How it works (3 sentences):**
Union types (`A | B`) allow a value to be one of several types and require narrowing via control flow analysis before accessing type-specific members. Intersection types (`A & B`) require a value to satisfy all combined types simultaneously, merging all properties into one combined type. TypeScript's control flow analysis tracks the type at each branch, narrowing unions to the specific member type within each condition.

**Company relevance:**
- Microsoft: Azure SDK and TypeScript language server use discriminated unions extensively — interviewers expect deep narrowing knowledge
- Adobe: Component prop polymorphism via unions (`size: 'sm' | 'md' | 'lg'`) and HOC composition via intersections are core React Spectrum patterns
- Salesforce: LWC event typing uses union types; exhaustiveness checking is expected in platform-level TypeScript code
- Cisco: API response modeling — success/error union with exhaustive handling is the first thing reviewed in Cisco TS code reviews

---
**✅ Topic 44/486 complete.**
**→ Continuing to Topic 45: Generics — Functions, Classes, Constraints**
