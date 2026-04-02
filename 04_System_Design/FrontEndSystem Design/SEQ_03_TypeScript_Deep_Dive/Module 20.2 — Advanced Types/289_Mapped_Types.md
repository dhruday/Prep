# 289 – Mapped Types — keyof, in, as

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Mapped types transform existing types by iterating over their keys and generating new types. The syntax `{ [K in keyof T]: ... }` loops over every key in T and produces a new type. This is how TypeScript's built-in utilities work: `Partial<T>` makes all properties optional, `Readonly<T>` makes them readonly, `Record<K, V>` creates a type with keys K and values V. The `as` clause enables key remapping — renaming, filtering, or transforming keys during mapping.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Core Syntax

```typescript
// Basic mapped type
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] }; // -? removes optionality

// keyof extracts keys as a union
type UserKeys = keyof User; // 'id' | 'name' | 'email'

// Record: create type from key union
type Permissions = Record<'read' | 'write' | 'delete', boolean>;
// { read: boolean; write: boolean; delete: boolean }
```

### Key Remapping with `as`

```typescript
// Rename keys
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// Filter keys
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
type StringFields = OnlyStrings<{ name: string; age: number; email: string }>;
// { name: string; email: string }

// Prefix keys
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}_${string & K}`]: T[K];
};
```

### Built-in Utility Types (all mapped types)

```typescript
// Pick: select specific keys
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

// Omit: exclude specific keys
type Omit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };

// Partial: all optional
// Required: all required
// Readonly: all readonly
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I created mapped types for our form system: `FormErrors<T>` mapped every field of a form model to `string | undefined`, ensuring error messages were type-safe for every form field. Also used `Partial<T>` extensively for PATCH operation types.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Mapped types iterate over keys to transform types. `{ [K in keyof T]: T[K] }` is the base pattern. I use them for: Partial (make optional), Readonly, Pick/Omit, and custom transforms like FormErrors or API response reshaping. The `as` clause enables key remapping — I can rename keys (`getX`), filter keys (only strings), or prefix keys. All built-in utility types (Partial, Required, Pick, Omit, Record) are mapped types."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Type-safe form errors
interface UserForm { name: string; email: string; age: number; }
type FormErrors<T> = { [K in keyof T]?: string };
const errors: FormErrors<UserForm> = { name: 'Required', email: 'Invalid format' };

// Event handlers from state shape
type StateHandlers<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
type UserHandlers = StateHandlers<{ name: string; age: number }>;
// { setName: (value: string) => void; setAge: (value: number) => void }

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Mapped = `[K in keyof T]` iterates keys. `as` remaps keys. `-?` removes optional."** Partial adds `?`, Required removes with `-?`, Readonly adds `readonly`. Key remapping: `as \`get\${Capitalize<K>}\`` renames, `as T[K] extends string ? K : never` filters.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Mapped types are the building blocks of TypeScript's type system. Understanding them explains all utility types.
**How:** `[K in keyof T]` iteration, modifiers (`?`, `readonly`, `-`), `as` for key remapping.
**Companies:** Microsoft (deep TS), all four test utility types understanding.
