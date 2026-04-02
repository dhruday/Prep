# 50. Discriminated Unions
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A discriminated union is a union of object types where each member has a common property — the discriminant — with a unique literal value. TypeScript uses that property to narrow the union to one specific member inside an `if` or `switch`. Combined with a `never` exhaustiveness check, it ensures every variant is handled — adding a new state variant causes compile errors in every switch that doesn't handle it. This is the pattern I reach for first when modeling any state machine or polymorphic API response.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Discriminated unions come from functional programming (ML, Haskell algebraic data types). They solve the "tagged union" problem: you have a value that can be one of several shapes, and you want the type system to verify you've handled all shapes.

Without discriminated unions, you write access guards manually and potentially miss new variants silently. With discriminated unions + exhaustiveness checking, the compiler enforces completeness.

### How It Works Internally

**Structure requirement — common literal property (discriminant):**
```typescript
type Circle   = { kind: 'circle';   radius: number };
type Rectangle = { kind: 'rectangle'; width: number; height: number };
type Triangle  = { kind: 'triangle';  base: number; height: number };

type Shape = Circle | Rectangle | Triangle;
```
The discriminant is `kind` — each member has `kind` as a unique literal. TypeScript narrows within `switch/if` based on this property.

**Switch narrowing:**
```typescript
function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':    return Math.PI * shape.radius ** 2;      // shape: Circle
    case 'rectangle': return shape.width * shape.height;       // shape: Rectangle
    case 'triangle':  return 0.5 * shape.base * shape.height; // shape: Triangle
    default:          return assertNever(shape);               // shape: never
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}
```
In the `default` branch, TypeScript infers `shape` as `never` (all variants handled). If you add `type Pentagon = { kind: 'pentagon'; sides: number[] }` to Shape without updating `area`, TypeScript errors at `assertNever(shape)` — Shape is no longer `never` because `Pentagon` is unhandled.

**If-else narrowing:**
```typescript
function describe(shape: Shape): string {
  if (shape.kind === 'circle') {
    return `Circle with radius ${shape.radius}`; // shape narrowed to Circle
  }
  // shape: Rectangle | Triangle here
  return `${shape.kind} shape`;
}
```

**Multiple discriminants:**
```typescript
type ApiResponse<T> =
  | { status: 'success'; data: T; etag: string }
  | { status: 'error';   code: number; message: string }
  | { status: 'loading' };

function render<T>(res: ApiResponse<T>): string {
  switch (res.status) {
    case 'success': return JSON.stringify(res.data);
    case 'error':   return `Error ${res.code}: ${res.message}`;
    case 'loading': return 'Loading...';
    default:        return assertNever(res);
  }
}
```

**Discriminated union state machine — Redux/Zustand pattern:**
```typescript
type Action =
  | { type: 'INCREMENT'; amount: number }
  | { type: 'DECREMENT'; amount: number }
  | { type: 'RESET' }
  | { type: 'SET'; value: number };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT': return state + action.amount;
    case 'DECREMENT': return state - action.amount;
    case 'RESET':     return 0;
    case 'SET':       return action.value;
    default:          return assertNever(action);
  }
}
```

**Discriminated union with type narrowing helper:**
```typescript
type NetworkRequest =
  | { state: 'idle' }
  | { state: 'pending'; url: string; startTime: number }
  | { state: 'fulfilled'; data: unknown; responseTime: number }
  | { state: 'rejected'; error: Error; retryCount: number };

// Type predicate using discriminant
function isPending(req: NetworkRequest): req is Extract<NetworkRequest, { state: 'pending' }> {
  return req.state === 'pending';
}
```

### Architecture & Component Boundaries

```
Discriminated Union Use Cases:
  ├── State machines: idle→loading→success→error
  ├── Redux actions: { type: 'ACTION_TYPE'; payload: T }
  ├── WebSocket messages: { kind: 'data' | 'ping' | 'error' | 'close' }
  ├── UI event variants: { type: 'click' | 'keyboard' | 'touch' }
  ├── API response envelopes: { status: 'success' | 'error' | 'loading' }
  └── Result/Either types: { ok: true; value: T } | { ok: false; error: E }
```

### Data Flow & Type Narrowing

```
TypeScript control flow analysis for discriminated unions:

  shape: Shape (Circle | Rectangle | Triangle)
    │
    ├─ case 'circle':    shape → Circle     (radius accessible)
    ├─ case 'rectangle': shape → Rectangle  (width, height accessible)
    ├─ case 'triangle':  shape → Triangle   (base, height accessible)
    └─ default:          shape → never      (all handled — assertNever works)

Without exhaustiveness check:
  default omitted → shape is still Circle | Rectangle | Triangle in default
  → any new variant silently falls through to undefined behavior
```

### Performance Implications

- Zero runtime overhead for types — the discriminant check is a single property access which is JIT-optimal
- V8 optimizes switch-on-string better than complex if-else chains — discriminant unions map naturally to this
- The discriminant field adds minimal memory overhead per object

### ⚠️ Anti-Patterns & Pitfalls

- **No exhaustiveness check — silently missing variants** — always add `default: assertNever(x)` in discriminated union switches. Without it, adding a new variant causes silent undefined behavior.
- **Discriminant is not a literal type** — using `status: string` as discriminant means TypeScript can't narrow it. Discriminants must be string/number/boolean literal types.
- **Discriminant collision** — two union members with the same discriminant value is a type error: TypeScript will merge them or error. Each discriminant value must be unique per union.
- **Using optional discriminant** — `kind?: 'circle'` as the discriminant breaks narrowing. The discriminant property must be required (non-optional) on every member.
- **Overly large unions** — unions with 20+ members slow TypeScript's narrowing. Consider splitting into sub-unions with a top-level category discriminant.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
At SAP, OData batch responses contain multiple success and error sub-responses. Typing this as `BatchItem = ODataSuccess | ODataError` with `ok: boolean` as discriminant meant every consumer of batch results needed to switch on `ok` before accessing `.value` vs `.errors`. The `assertNever` exhaustiveness check caught multiple cases during SAP Fiori refactors where a new batch item type was added to the API but handlers weren't updated. At Bosch, the WebSocket message handler was a massive discriminated union switch on `message.type` — exhaustiveness checking meant adding a new protocol message type immediately surfaced all unhandled locations.

**At FAANG scale:**
- **Microsoft:** Redux is the reference implementation of discriminated unions in React — TypeScript types for Redux actions are discriminated unions; Microsoft expects fluency with this pattern
- **Adobe:** React Spectrum component state (open/closed/loading, selection states) are modeled as discriminated unions — state machine patterns are first-class in Spectrum
- **Salesforce:** Apex response types in LWC use discriminated unions — `{ success: true; data: T } | { success: false; errors: AuraError[] }`
- **Cisco:** WebSocket and HTTP event streaming APIs use discriminated message types — exhaustiveness checking is the difference between safe and unsafe protocol handling

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "A discriminated union is a union where each member has a shared property with a unique literal value — the discriminant. TypeScript's control flow analysis narrows the union to the correct member inside each case. The pattern I always add is a `default: assertNever(x)` branch — `assertNever` takes `never` as its argument. When all variants are handled, TypeScript types the default as `never`, and `assertNever` compiles fine. When you add a new state and forget to handle it, TypeScript errors at `assertNever` because that variant leaks into the default. This turns missing cases from runtime bugs into compile errors — which is exactly what you want in a large codebase."

### Likely Follow-up Questions
1. **What makes a union "discriminated"?** → Each member has a shared property (`kind`, `type`, `status`) with a unique literal value — TypeScript uses it to narrow in switch/if
2. **What is `assertNever` and why use it?** → A function typed as `(x: never): never` — when placed in a switch default, TypeScript errors at compile time if any union variant reaches it (meaning it wasn't handled)
3. **Can a discriminated union have more than one discriminant?** → Yes — TypeScript can narrow on multiple conditions: `if (x.kind === 'a' && x.status === 'active')` — each combination narrows further
4. **What happens if two union members have the same discriminant value?** → TypeScript merges them into the intersection of their types — effectively creating an impossible-to-satisfy type

### How to Signal Senior Thinking
> "The most valuable property of discriminated unions is that they're exhaustively checkable — not just by TypeScript today, but by any team member in the future. The `assertNever` pattern is a contract: if you add a new variant, the compiler finds every switch that needs to be updated. This is especially powerful in event-driven systems where new message types are added incrementally — without exhaustiveness, new types silently fall into default/undefined behavior. With it, the compiler does the code review."

---

## 💻 5. Code Example

```typescript
// ─── assertNever — the exhaustiveness utility ────────────────────────
function assertNever(x: never): never {
  throw new Error(`Unhandled discriminated union member: ${JSON.stringify(x)}`);
}

// ─── Result/Either type — safe error handling  ───────────────────────
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return { ok: false, error: 'Division by zero' };
  return { ok: true, value: a / b };
}

const result = divide(10, 2);
if (result.ok) {
  console.log(result.value); // number — no 'error' property accessible
} else {
  console.error(result.error); // string — no 'value' property accessible
}

// ─── SAP OData fetch state machine ──────────────────────────────────
type FetchState<T> =
  | { phase: 'idle' }
  | { phase: 'loading'; startedAt: number }
  | { phase: 'success'; data: T; etag: string; loadedAt: number }
  | { phase: 'error';   errorCode: number; message: string; retries: number };

function renderSalesOrders(state: FetchState<SalesOrder[]>): React.ReactNode {
  switch (state.phase) {
    case 'idle':
      return <p>Select a date range to load orders.</p>;
    case 'loading':
      return <Spinner label={`Loading since ${state.startedAt}`} />;
    case 'success':
      return <OrderTable orders={state.data} etag={state.etag} />;
    case 'error':
      return (
        <ErrorPanel
          code={state.errorCode}
          message={state.message}
          retries={state.retries}
        />
      );
    default:
      return assertNever(state); // TypeScript errors here if new phase added without handling
  }
}

// ─── Redux reducer with discriminated action union ───────────────────
type CartAction =
  | { type: 'ADD_ITEM';    productId: string; qty: number; price: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QTY';  productId: string; qty: number }
  | { type: 'CLEAR_CART' };

type CartState = { items: CartItem[]; total: number };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, { id: action.productId, qty: action.qty }], total: state.total + action.price * action.qty };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.productId) };
    case 'UPDATE_QTY':
      return { ...state, items: state.items.map(i => i.id === action.productId ? { ...i, qty: action.qty } : i) };
    case 'CLEAR_CART':
      return { items: [], total: 0 };
    default:
      return assertNever(action); // ← If new action added without handler, compile error here
  }
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** Discriminated union = tagged type + exhaustiveness guarantee. The tag (discriminant) is a literal, the switch is the handler, `assertNever` is the guard.

**If you go blank:** "Union of objects with a shared literal field (`kind`, `type`, `status`). Switch on that field. TypeScript narrows per case. Add `default: assertNever(x)` — if TypeScript doesn't error, all variants are handled."

**Mnemonic:** **D-U-N = Discriminant → Union → `assertNever` = completeness enforcement**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Prevents runtime errors when new state variants are added and not handled — especially in state machines and event processors  
→ Performance: Single property lookup for discrimination is V8-optimal; switch-on-string is JIT-compiled efficiently  
→ Business: In a codebase touched by 10+ developers, TypeScript errors at unhandled variants is the difference between safe protocol changes and production incidents

**How it works (3 sentences):**
A discriminated union is a union of object types where each member has a shared property with a unique literal type value — the discriminant. TypeScript's control flow analysis tracks the discriminant's value in each branch of `switch`/`if` and narrows the union to the specific member whose discriminant matches. Adding `default: assertNever(x)` enforces exhaustiveness — TypeScript types `x` as `never` only if all members are handled; any unhandled member causes a compile error at the `assertNever` call.

**Company relevance:**
- Microsoft: Redux patterns are discriminated unions; TypeScript interviews at Microsoft explicitly test switch exhaustiveness and `assertNever` knowledge
- Adobe: React Spectrum state machines and component interaction states are discriminated unions — Spectrum's architecture docs describe this explicitly
- Salesforce: Apex record adapter responses use `success | error` discriminated shapes — expected pattern in LWC TypeScript code reviews
- Cisco: Network event message types in Webex SDK are discriminated unions — handling all message kinds correctly is protocol-critical

---
**✅ Topic 50/486 complete.**
**→ Continuing to Topic 51: Utility Types**
