# 46. Enums vs Const Assertions vs Union Types
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

TypeScript gives three ways to represent a fixed set of named values: `enum`, `as const`, and literal union types. `enum` generates runtime JavaScript and has subtle pitfalls; `as const` freezes an object's types to their literal values with no runtime cost; literal unions are the simplest and most tree-shakeable. In my experience at SAP, I migrated all `enum` usage to `as const` objects or literal unions — it removed 2–3KB from bundle sizes and eliminated a class of subtle enum initialization bugs.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

TypeScript was designed to model the patterns JavaScript developers already use. Before TypeScript, developers used `const Status = { IDLE: 'idle', LOADING: 'loading' }` or string constants. TypeScript's `enum` was added to give a Java/C#-style enumeration, but it generates JavaScript code — making it the only TypeScript construct (besides decorators) that isn't purely erased.

`as const` is the zero-cost alternative: freeze an existing value's type to its literal form. Literal union types (`'a' | 'b'`) are the lightest option.

### How It Works Internally

**TypeScript `enum` — numeric (default):**
```typescript
enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right  // 3
}

// Compiled to JavaScript:
var Direction;
(function (Direction) {
  Direction[Direction["Up"] = 0] = "Up";
  Direction[Direction["Down"] = 1] = "Down";
  Direction[Direction["Left"] = 2] = "Left";
  Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));
```
This generates an IIFE and a bidirectional mapping object at runtime — real JavaScript code.

**String `enum` — more predictable:**
```typescript
enum Status {
  Idle    = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error   = 'error',
}
// Compiled: no reverse mapping (string enums only map name → value)
// But still generates runtime JS
```

**`const enum` — inlined at compile time:**
```typescript
const enum Color {
  Red   = 'red',
  Blue  = 'blue',
}
const c: Color = Color.Red;
// Compiled to:
const c = 'red'; // enum fully inlined, no runtime object
```
**Caveat:** `const enum` breaks with `isolatedModules: true` (required by Vite/esbuild) because each file is compiled independently — the inlining can't happen across files.

**`as const` — object freezing:**
```typescript
const Status = {
  Idle:    'idle',
  Loading: 'loading',
  Success: 'success',
  Error:   'error',
} as const;

// Type of Status: { readonly Idle: 'idle'; readonly Loading: 'loading'; ... }
// Not broadened to string — stays as literal types

type StatusKey   = keyof typeof Status;   // 'Idle' | 'Loading' | 'Success' | 'Error'
type StatusValue = typeof Status[StatusKey]; // 'idle' | 'loading' | 'success' | 'error'
```
Zero runtime cost beyond the object literal itself. Tree-shakeable. Works with `isolatedModules`.

**Literal union types — simplest:**
```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';
// Fully erased at runtime. No JS generated at all.
// Cannot iterate values at runtime.
```

### Key Comparison Table

| | `enum` | `const enum` | `as const` | Literal Union |
|---|---|---|---|---|
| Generates JS | ✅ Yes (IIFE) | ❌ (inlined) | ❌ | ❌ |
| Tree-shakeable | ❌ | ✅ | ✅ | ✅ (nothing to shake) |
| Works with `isolatedModules` | ✅ | ❌ | ✅ | ✅ |
| Iterable at runtime | ✅ `Object.values(Direction)` | ❌ | ✅ `Object.values(Status)` | ❌ |
| Reverse mapping | ✅ (numeric only) | ✅ (numeric only) | ❌ | ❌ |
| Nominal typing | ✅ | ✅ | ❌ | ❌ |
| Can be used as value | ✅ | ❌ (no runtime object) | ✅ | ❌ |

### `as const` with arrays:
```typescript
const ALLOWED_ROLES = ['admin', 'editor', 'viewer'] as const;
// Type: readonly ['admin', 'editor', 'viewer'] — tuple, not string[]

type Role = typeof ALLOWED_ROLES[number]; // 'admin' | 'editor' | 'viewer'
// Derive the union from the array — single source of truth
```

### Nominal typing with `enum` — the one valid use case:
```typescript
enum UserId { _ = '' }
enum ProductId { _ = '' }

function getUser(id: UserId): User { /* ... */ }

const productId = '123' as unknown as ProductId;
getUser(productId); // ❌ compile error — ProductId is not UserId
```
Enums create nominal types — distinct from each other even if the underlying value is the same. Useful for ID branding. But branded types with `as const` achieve the same with less complexity.

### ⚠️ Anti-Patterns & Pitfalls

- **Using numeric enums with logic** — `Direction.Up === 0` is true, but `Direction[0] === 'Up'` is also true (reverse mapping). Equality checks on numeric enums are fragile — always use string enums or switch to `as const`.
- **`const enum` with `isolatedModules`** — Vite/esbuild use `isolatedModules` mode. `const enum` will throw `TS2748: Cannot access ambient const enums when the '--isolatedModules' flag is provided`. Never use `const enum` in Vite projects.
- **Using `enum` values in runtime config without import** — if an enum is declared in file A and used in file B with `esbuild` transpile-only, the IIFE might not run before it's accessed. Prefer `as const`.
- **Not deriving the type from `as const`** — defining `as const Status` but then separately writing `type Status = string` creates a drift. Always use `typeof Status[keyof typeof Status]` to derive the type.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP UI5 TypeScript bindings used numeric enums originally — `ValueState.Error === 3` worked in tests but broke in internationalization code that tried to iterate values. Migrated to `as const` objects: `const ValueState = { None: 'None', Success: 'Success', Error: 'Error' } as const` — the runtime object was needed to map to CSS class names, `as const` preserved it while giving literal types. Bundle savings from removing IIFE wrappers added up across a library with 40+ enum declarations.

**At FAANG scale:**
- **Microsoft:** VS Code source uses string enums extensively for telemetry event names — the nominal typing prevents mixing event categories. TypeScript team has explicitly stated string enums over numeric.
- **Adobe:** Spectrum design tokens system uses `as const` — token names are literal types for autocomplete and zero generated overhead.
- **Salesforce:** LWC framework events use string literal unions for event names — no runtime overhead, fully tree-shakeable.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "TypeScript enum generates a JavaScript IIFE at runtime — it's the only TypeScript construct that isn't purely erased. That makes it problematic with modern bundlers: `const enum` breaks under `isolatedModules` which Vite requires; regular `enum` can't be tree-shaken. My default is `as const` when I need a runtime iterable object with literal types, or a plain literal union when I just need type narrowing. The one place enum still makes sense is nominal typing — using enum to brand IDs so `UserId` and `ProductId` can't be mixed. But even that I now handle with branded types using `as const`."

### Likely Follow-up Questions
1. **What's the difference between `enum` and `const enum`?** → `enum` generates an IIFE object at runtime; `const enum` is inlined to literal values at compile time — no runtime object. `const enum` doesn't work with `isolatedModules`.
2. **Why avoid `enum` in modern TypeScript?** → Generates runtime JS (bundle overhead), can't tree-shake, numeric enums have reverse mapping footguns, `const enum` breaks with Vite/esbuild `isolatedModules`.
3. **How do you get all values of an `as const` object as a union?** → `type Value = typeof MyConst[keyof typeof MyConst]`
4. **What does `as const` do to an array?** → Widens from `string[]` to a readonly tuple of literal types — `['a', 'b'] as const` → `readonly ['a', 'b']`

### How to Signal Senior Thinking
> "The key insight is that `as const` is purely additive — it takes a value you'd write anyway and tells TypeScript to preserve the literal types instead of widening to `string`. It has zero overhead beyond the object literal. In a design system with hundreds of tokens, that matters. And because Vite requires `isolatedModules`, `const enum` is effectively dead in the modern React ecosystem — teams that don't know this ship type errors in production builds."

---

## 💻 5. Code Example

```typescript
// ❌ Avoid: Regular enum — generates runtime JS
enum OldStatus {
  Idle    = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error   = 'error',
}

// ✅ Prefer: as const — zero overhead, same functionality
const Status = {
  Idle:    'idle',
  Loading: 'loading',
  Success: 'success',
  Error:   'error',
} as const;

// Derive union type — single source of truth
type Status = typeof Status[keyof typeof Status];
// Type: 'idle' | 'loading' | 'success' | 'error'

// Usage identical to enum — but runtime iterable too
const allStatuses = Object.values(Status); // ['idle', 'loading', 'success', 'error']

function handleStatus(s: Status) {
  switch (s) {
    case Status.Idle:    return 'Waiting';
    case Status.Loading: return 'Fetching...';
    case Status.Success: return 'Done';
    case Status.Error:   return 'Failed';
    // exhaustiveness still works — TypeScript narrows via discriminant
  }
}

// Array as const — derive union from array (single source of truth)
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
type HttpMethod = typeof HTTP_METHODS[number];
// 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

function validateMethod(method: string): method is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(method);
}

// Branded types with as const (replaces nominal enum use case)
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId    = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;

function toUserId(id: string): UserId    { return id as UserId; }
function toProductId(id: string): ProductId { return id as ProductId; }

function getUser(id: UserId): Promise<User> { /* ... */ }

const pid = toProductId('123');
getUser(pid); // ❌ compile error — ProductId is not UserId
```

---

## 🧠 6. Memory Aid

**Mental Model:** `enum` = Java-style, has runtime weight. `as const` = freeze literal types, runtime object preserved. Literal union = type-only, nothing at runtime.

**If you go blank:** "Prefer `as const` over `enum` in modern TypeScript. `const enum` breaks with `isolatedModules` (Vite). Literal unions when you don't need a runtime object. Derive union type from `as const` with `typeof X[keyof typeof X]`."

**Mnemonic:** **"Enum Emits, as Const = Clean, Union = Ultra-light"**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Wrong `enum` choice causes Vite build failures or runtime lookup errors — directly breaks the app
→ Performance: `enum` IIFEs can't be tree-shaken — `as const` is zero-extra-cost
→ Business: Bundle size savings (2–3KB per module in large codebases) translate to real load time differences

**How it works (3 sentences):**
TypeScript `enum` compiles to a JavaScript IIFE creating a runtime object with bidirectional name/value mapping — it's real code, not a type. `as const` tells TypeScript to narrow object/array values to their literal types instead of widening to `string`/`number`, with no extra JavaScript emitted. Literal union types (`'a' | 'b'`) are entirely erased and produce no JavaScript output at all.

**Company relevance:**
- Microsoft: TypeScript team guidance explicitly recommends string enums over numeric; VS Code uses string enums throughout — expect questions about the difference
- Adobe: Design token systems are `as const` objects — no enum overhead in the design library
- Salesforce: LWC style guide requires literal unions for event names — `enum` prohibited in LWC platform code
- Cisco: TypeScript SDK generation tools emit `as const` not `enum` — modern toolchain requirement

---
**✅ Topic 46/486 complete.**
**→ Continuing to Topic 47: Conditional Types — infer keyword**
