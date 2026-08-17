# 292 – Utility Types — Partial, Required, Pick, Omit, Record, ReturnType

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

TypeScript's built-in utility types transform existing types without rewriting them. The essential ones: **Partial<T>** (all optional), **Required<T>** (all required), **Pick<T, K>** (select keys), **Omit<T, K>** (exclude keys), **Record<K, V>** (create object type from keys), **ReturnType<T>** (extract function return type). Knowing these shows you can work with types fluently instead of defining redundant interfaces. They're all implemented using mapped types and conditional types internally.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### All Essential Utility Types

```typescript
interface User { id: string; name: string; email: string; age: number; }

// Partial<T> — all properties optional
type UserUpdate = Partial<User>; // { id?: string; name?: string; email?: string; age?: number; }

// Required<T> — all properties required
type StrictUser = Required<Partial<User>>; // back to all required

// Pick<T, K> — select specific keys
type UserPreview = Pick<User, 'id' | 'name'>; // { id: string; name: string; }

// Omit<T, K> — exclude specific keys
type CreateUser = Omit<User, 'id'>; // { name: string; email: string; age: number; }

// Record<K, V> — create object type from key union
type UserRoles = Record<'admin' | 'user' | 'guest', string[]>;
// { admin: string[]; user: string[]; guest: string[]; }

// ReturnType<T> — extract function return type
function getUser() { return { id: '1', name: 'Hruday' }; }
type UserResult = ReturnType<typeof getUser>; // { id: string; name: string; }

// Parameters<T> — extract function parameter types
type GetUserParams = Parameters<typeof getUser>; // []

// Readonly<T> — all readonly
type FrozenUser = Readonly<User>;

// NonNullable<T> — remove null and undefined
type SafeString = NonNullable<string | null | undefined>; // string

// Extract<T, U> — extract union members assignable to U
type StringOrNumber = Extract<string | number | boolean, string | number>; // string | number

// Exclude<T, U> — exclude union members assignable to U
type OnlyBoolean = Exclude<string | number | boolean, string | number>; // boolean
```

### Combining Utility Types

```typescript
// API CRUD types from a single source of truth
interface User { id: string; name: string; email: string; createdAt: Date; updatedAt: Date; }

type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
type UserResponse = Readonly<User>;
type UserListItem = Pick<User, 'id' | 'name' | 'email'>;
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I derived all CRUD types from a single entity interface: `CreateDto = Omit<Entity, 'id' | 'timestamps'>`, `UpdateDto = Partial<CreateDto>`, `ListItem = Pick<Entity, display_fields>`. This single-source-of-truth approach eliminated type drift across our service layer.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I use utility types to derive types from a single source of truth. From one User interface: CreateUser = Omit<User, 'id'>, UpdateUser = Partial<Omit<User, 'id'>>, UserPreview = Pick<User, 'id' | 'name'>. This eliminates type drift — when the base type changes, all derived types update automatically. I know how they're implemented: Partial uses mapped types with `?` modifier, Pick iterates over selected keys, ReturnType uses conditional types with `infer`."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Single source of truth for all API types
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

// Derive all CRUD types
type CreateProductDto = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateProductDto = Partial<CreateProductDto>;
type ProductListItem = Pick<Product, 'id' | 'name' | 'price' | 'category'>;
type ProductResponse = Readonly<Product>;

// API client with derived types
interface ProductApi {
  list(): Promise<ProductListItem[]>;
  get(id: string): Promise<ProductResponse>;
  create(data: CreateProductDto): Promise<ProductResponse>;
  update(id: string, data: UpdateProductDto): Promise<ProductResponse>;
  delete(id: string): Promise<void>;
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"One interface → derive all: Omit for Create, Partial+Omit for Update, Pick for List, Readonly for Response."** Partial = all optional. Required = all required. Pick = select keys. Omit = exclude keys. Record = keys → values. ReturnType = function → return type. All built on mapped types + conditional types.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Utility types eliminate redundancy and prevent type drift. Essential knowledge for any TypeScript codebase.
**How:** Derive CRUD types from single interface. Chain utilities: `Partial<Omit<T, 'id'>>`. Know implementations.
**Companies:** All four test utility type fluency. Microsoft goes deep into implementation details.
