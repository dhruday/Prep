# 285 – Union & Intersection Types

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

**Union types** (`A | B`) mean "this value could be A **or** B" — TypeScript narrows the type through checks. **Intersection types** (`A & B`) mean "this value is A **and** B at the same time" — combines all properties. Unions model **alternatives** (loading | error | success), intersections model **combinations** (User & Admin). Understanding the difference is critical because they're used everywhere: discriminated unions for state, intersections for mixins.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Union Types (OR)

```typescript
// Simple union
type Status = 'loading' | 'error' | 'success';

// Discriminated union — narrowing via common property
type ApiResponse<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

function handle(response: ApiResponse<User>) {
  switch (response.status) {
    case 'loading': return <Spinner />;
    case 'error': return <Error msg={response.error} />;    // TS knows error exists
    case 'success': return <Profile user={response.data} />; // TS knows data exists
  }
}
```

### Intersection Types (AND)

```typescript
// Combine multiple types
type Timestamped = { createdAt: Date; updatedAt: Date };
type SoftDeletable = { deletedAt: Date | null; isActive: boolean };

type User = { id: string; name: string; email: string };
type AuditableUser = User & Timestamped & SoftDeletable;
// Has ALL properties from User + Timestamped + SoftDeletable

// Mixin pattern
type WithId<T> = T & { id: string };
type WithTimestamp<T> = T & { createdAt: Date; updatedAt: Date };

type TodoItem = WithId<WithTimestamp<{ text: string; done: boolean }>>;
```

### Key Behaviors

```typescript
// Union with objects: only common properties accessible WITHOUT narrowing
type Cat = { name: string; purr: () => void };
type Dog = { name: string; bark: () => void };
type Pet = Cat | Dog;

function greet(pet: Pet) {
  pet.name; // ✅ common property
  // pet.purr(); // ❌ Error — might be a Dog
  if ('purr' in pet) pet.purr(); // ✅ narrowed to Cat
}

// Intersection conflict: incompatible types become never
type A = { x: string } & { x: number }; // x is string & number = never
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, we used discriminated unions for OData response states (loading/error/success) and intersection types for combining base entity types with audit fields (timestamps, soft delete). This pattern eliminated entire categories of null reference errors.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Union types model alternatives — 'loading | error | success'. I use discriminated unions with a common discriminant property for type-safe narrowing in switch statements. Intersection types model combinations — combining User with Timestamps and AuditFields. The key: unions restrict (only common properties accessible), intersections expand (all properties available). At SAP, discriminated unions for API states eliminated null reference errors."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Real-world: Form field with validation states
type FormField<T> =
  | { status: 'pristine'; value: T }
  | { status: 'dirty'; value: T; isDirty: true }
  | { status: 'valid'; value: T; isDirty: true }
  | { status: 'invalid'; value: T; isDirty: true; errors: string[] };

function renderField(field: FormField<string>) {
  switch (field.status) {
    case 'pristine': return <Input value={field.value} />;
    case 'invalid': return <Input value={field.value} errors={field.errors} />;
    default: return <Input value={field.value} />;
  }
}

// Intersection: compose reusable type mixins
type WithPagination = { page: number; pageSize: number; total: number };
type WithSorting = { sortBy: string; sortOrder: 'asc' | 'desc' };
type WithFilters<F> = { filters: F };

type UserListParams = WithPagination & WithSorting & WithFilters<{ role?: string; active?: boolean }>;
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Union = OR (alternatives, narrow to access). Intersection = AND (combine all properties)."** Discriminated unions use a common property (status, type, kind) for type-safe narrowing. Intersections compose types like mixins. Watch out: conflicting properties in intersections become `never`.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Unions and intersections are fundamental to TypeScript's type system. Used everywhere in React, Angular, and API typing.
**How:** Unions for alternatives with discriminated narrowing, intersections for combining types. Compose with generics for reusable patterns.
**Companies:** Microsoft (deep TS questions), Adobe (strict TS usage), Cisco (Angular TS patterns), Salesforce (LWC typing).
