# 48. Mapped Types — keyof, in, as
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Mapped types transform existing types by iterating over their keys and applying a transformation to each property. `keyof T` gives you a union of all keys in T; `in` iterates those keys; `as` remaps the key to a new name. Together they're how TypeScript builds `Partial`, `Required`, `Readonly`, and `Record`. I use mapped types at SAP to derive form state types from entity types automatically — one source of truth, zero drift between the entity and its form representation.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Mapped types solve the "derive from, don't repeat" problem. If you have `User = { id: string; name: string; email: string }` and need `UpdateUser` where all fields are optional — you shouldn't repeat yourself. A mapped type transforms User into `{ id?: string; name?: string; email?: string }` automatically, so when User gets new fields, UpdateUser gets them too.

### How It Works Internally

**Basic syntax:**
```typescript
type MappedType<T> = {
  [K in keyof T]: T[K]
};
// This is functionally the identity transformation — same type as T
```

**`keyof T` — produces a union of all keys:**
```typescript
type User = { id: string; name: string; role: 'admin' | 'user' };
type UserKeys = keyof User; // 'id' | 'name' | 'role'
```

**`[K in keyof T]` — iterates each key:**
```typescript
// Rebuild Partial<T> from scratch
type Partial<T> = {
  [K in keyof T]?: T[K]   // ? = optional modifier
};

// Rebuild Required<T>
type Required<T> = {
  [K in keyof T]-?: T[K]  // -? = remove optional
};

// Rebuild Readonly<T>
type Readonly<T> = {
  readonly [K in keyof T]: T[K]  // readonly = add readonly
};

// Remove readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]  // -readonly = remove readonly
};
```

**`T[K]` — indexed access (lookup type):**
```typescript
type User = { id: string; name: string; age: number };
type NameType = User['name'];         // string
type IdOrName = User['id' | 'name'];  // string (union of their types)
type AllValues = User[keyof User];    // string | number
```

**`as` keyword — key remapping (TS 4.1+):**
```typescript
// Rename keys with a template literal
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

type UserGetters = Getters<User>;
// {
//   getId: () => string;
//   getName: () => string;
//   getAge: () => number;
// }
```

**Filter keys with `as` + `never`:**
```typescript
// Only map string keys (exclude symbol/number key types)
type StringKeysOnly<T> = {
  [K in keyof T as K extends string ? K : never]: T[K]
};

// Filter properties by value type — only keep function properties
type FunctionProps<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K]
};

type UserMethods = FunctionProps<{ id: string; greet: () => void; age: number }>;
// { greet: () => void }
```

**`Record<K, V>` — mapping a key union to a value type:**
```typescript
type Record<K extends keyof any, V> = {
  [P in K]: V
};

type StatusMap = Record<'idle' | 'loading' | 'error', string>;
// { idle: string; loading: string; error: string }
```

**Combining mapped types with conditional types:**
```typescript
// Deep Partial — recursively make all properties optional
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
};

// NullableProperties — make all properties nullable
type Nullable<T> = {
  [K in keyof T]: T[K] | null
};

// Make only specific keys optional (Pick + Partial combination)
type PartialPick<T, K extends keyof T> = 
  Omit<T, K> & Partial<Pick<T, K>>;
```

### Architecture & Component Boundaries

```
Mapped Type Patterns:
  ├── Modifier maps:  Partial, Required, Readonly, Mutable
  ├── Value transforms: Nullable<T>, NonNullable values
  ├── Key remaps: Getters<T>, Setters<T>, EventMap<T>
  ├── Key filters: FunctionProps<T>, StringKeys<T>
  ├── Record shapes: Record<K, V> for dictionaries/lookups
  └── Form state: FormValues<Entity>, FormErrors<Entity>
```

### Data Flow & Type Propagation

```
Entity type change propagates automatically through mapped types:

  User = { id: string; name: string; email: string }
  ↓ Add: phone?: string
  User = { id: string; name: string; email: string; phone?: string }
  
  FormValues<User> = Partial<User>
  → automatically includes phone?: string | undefined
  
  All derived types stay in sync — zero manual update needed
```

### Performance Implications

- Mapped types are computed at type-check time — zero runtime cost
- Deep recursive mapped types (like `DeepPartial`) can cause type-checker slowdowns at depth — add depth counters for production recursive types
- Very wide types (100+ keys) slow mapped type resolution — consider splitting into sub-types

### ⚠️ Anti-Patterns & Pitfalls

- **Forgetting `-readonly` — `Readonly` is viral** — if you map a type as Readonly and spread it into a mutable context, TypeScript will warn. Use `Mutable<T>` (`-readonly [K in keyof T]`) when you need to undo readonly.
- **Not using `as` for key filtering — `never` removes keys** — `[K in keyof T as K extends 'id' ? never : K]` removes `id` from the mapped type. Forgetting this means trying to express complex key filters without `as` results in ugly intersections.
- **`T[K]` type widening loss** — when iterating with `in keyof T`, `T[K]` preserves the exact type. But if you do `keyof T` separately and index — always use the same T and K from the same mapped type context to avoid type drift.
- **`Record<string, V>` losing key specificity** — use `Record<'a' | 'b', V>` when you know all keys; `Record<string, V>` is just `{ [k: string]: V }` — all TypeScript key-safety is lost.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP OData entities have strongly typed fields. Form components need the same fields but all optional (for partial edits). Rather than maintaining `SalesOrderForm` separately from `SalesOrder`, a mapped type `type FormValues<T> = { [K in keyof T]?: T[K] | string }` generated form types automatically — when the OData entity schema updated (new fields), the form type updated automatically. At Bosch, a `Record<EventType, EventHandler>` mapped type ensured every event in the WebSocket protocol had a registered handler — missing a handler was a compile error.

**At FAANG scale:**
- **Microsoft:** VS Code's theme tokens are typed as `Record<ThemeColorId, string>` — the `ThemeColorId` union is derived from the JSON schema, mapped types verify every token is registered.
- **Adobe:** React Spectrum's `StyleProps` are built with mapped types — CSS property names mapped to their value types for typed style props.
- **Salesforce:** Auto-generated LWC component prop types use mapped types to process the Apex schema into TypeScript shapes.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Mapped types let you transform a type by iterating over its keys. The three pieces are: `keyof T` to get all keys as a union, `in` to iterate, and `T[K]` to look up each property's type. Modifiers like `?`, `-?`, `readonly`, and `-readonly` let you add or remove optional/readonly. The `as` keyword for key remapping in TS 4.1 was the upgrade that made mapped types truly powerful — now you can filter out keys by mapping them to `never`, or rename them with template literals. The real value in production is derived types — `FormValues<Entity>`, `Partial<Config>` — that stay in sync with their source automatically."

### Likely Follow-up Questions
1. **What is `keyof T`?** → A union of all property key types of T — for `{ a: string; b: number }` it's `'a' | 'b'`
2. **What does `-?` do in a mapped type?** → Removes optional modifier — `[K in keyof T]-?: T[K]` is the implementation of `Required<T>`
3. **How do you filter keys in a mapped type?** → Use `as`: `[K in keyof T as K extends 'id' ? never : K]` — map to `never` removes that key
4. **What is `T[K]` called?** → Indexed access type (lookup type) — the type of property K in T

### How to Signal Senior Thinking
> "The most impactful mapped type pattern I've shipped is the 'derive form types from entity types' pattern — `FormValues<T>` makes all fields optional and accepts both the original type and string (for unvalidated input). When the entity changes, all forms update in the next compile check. It eliminated an entire class of 'form has a field the API doesn't know about' bugs. Combined with `as` key remapping to generate event handler maps from event type unions, mapped types become a zero-maintenance type synchronization layer."

---

## 💻 5. Code Example

```typescript
// Rebuilding TypeScript built-in utilities

type Partial<T>  = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Mutable<T>  = { -readonly [K in keyof T]: T[K] };
type Record<K extends keyof any, V> = { [P in K]: V };

// Key remapping with as + template literal
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void
};

// ─── SAP OData Form pattern ──────────────────────────────────────────

interface SalesOrder {
  id: string;
  orderNumber: string;
  amount: number;
  status: 'open' | 'closed' | 'cancelled';
  createdAt: Date;
}

// Form values: all optional, values or string (unvalidated input)
type FormValues<T> = {
  [K in keyof T]?: T[K] | string
};

type SalesOrderForm = FormValues<SalesOrder>;
// {
//   id?: string;
//   orderNumber?: string | string;
//   amount?: number | string;
//   status?: "open" | "closed" | "cancelled" | string;
//   createdAt?: Date | string;
// }

// Form errors: same keys, value is string error message or undefined
type FormErrors<T> = {
  [K in keyof T]?: string
};

// ─── Key filtering ───────────────────────────────────────────────────

// Remove specific keys (like Omit but via mapped type)
type OmitId<T> = {
  [K in keyof T as K extends 'id' | 'createdAt' ? never : K]: T[K]
};

type SalesOrderUpdate = OmitId<SalesOrder>;
// { orderNumber: string; amount: number; status: 'open' | 'closed' | 'cancelled' }

// Filter by value type — only function properties
type MethodsOf<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K]
};

// ─── Event handler map pattern ───────────────────────────────────────

type WsEvents = {
  'message': { payload: string };
  'connect': { sessionId: string };
  'disconnect': { code: number };
  'error': { message: string };
};

type EventHandlers<T> = {
  [K in keyof T]: (event: T[K]) => void
};

type WsHandlerMap = EventHandlers<WsEvents>;
// {
//   message: (event: { payload: string }) => void;
//   connect: (event: { sessionId: string }) => void;
//   ...
// }

// Usage — must implement ALL handlers (no missing keys)
const handlers: WsHandlerMap = {
  message:    (e) => console.log(e.payload),
  connect:    (e) => console.log('Connected:', e.sessionId),
  disconnect: (e) => console.log('Disconnected:', e.code),
  error:      (e) => console.error(e.message),
};
```

---

## 🧠 6. Memory Aid

**Mental Model:** Mapped type = for-loop over keys of a type. `keyof T` = key names. `T[K]` = value types. `as` = rename or filter.

**If you go blank:** "`[K in keyof T]: T[K]` copies a type. Add `?` for optional, `-?` for required, `readonly` for immutable, `-readonly` for mutable. `as never` removes a key. `as \`prefix${Capitalize<K>}\`` renames it."

**Mnemonic:** **MAP = Map-keys → Apply-modifiers → Produce-new-type**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Runtime zero cost — all type-level  
→ Performance: Prevents type drift between related types — no manual sync bugs that ship incorrect API calls  
→ Business: Auto-derived form types, error types, handler maps eliminate entire classes of boilerplate and drift — directly reduces bug count

**How it works (3 sentences):**
Mapped types iterate over a union of keys using `[K in Keys]: ValueType` syntax, creating a new type where each property's key comes from the iteration and each value type can be transformed. `keyof T` produces the union of T's keys; `T[K]` looks up the type of property K in T; modifiers `?`, `-?`, `readonly`, `-readonly` add or remove optionality and mutability. The `as` clause (TS 4.1+) remaps or filters keys — mapping a key to `never` removes it from the output type.

**Company relevance:**
- Microsoft: TypeScript team designed mapped types — interviews probe implementation of `Partial`, `Required`, `Readonly`, `Record` from scratch; expected at senior level
- Adobe: Design system token maps, style prop types, and component variant maps all use mapped types — Adobe TypeScript interviews test this directly  
- Salesforce: Schema-derived component types use mapped types extensively — `Record<ApiName, FieldMetadata>` is common in Salesforce TypeScript codebases
- Cisco: Network device configuration types use mapped types to derive validation rules from schema definitions

---
**✅ Topic 48/486 complete.**
**→ Continuing to Topic 49: Template Literal Types**
