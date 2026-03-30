# 288 – Conditional Types — infer keyword

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Conditional types (`T extends U ? X : Y`) let you create types that **choose between two options based on a condition**. Combined with the `infer` keyword, they can **extract types from complex structures**. For example, `ReturnType<T>` uses `T extends (...args: any) => infer R ? R : never` to extract a function's return type. This is advanced TypeScript — knowing it signals deep type system fluency.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Basic Conditional Types

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<'hello'>; // true
type B = IsString<42>;      // false

// Distributive conditional types (with union inputs)
type ToArray<T> = T extends unknown ? T[] : never;
type C = ToArray<string | number>; // string[] | number[]
```

### The infer Keyword

```typescript
// Extract return type
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type D = MyReturnType<() => string>; // string
type E = MyReturnType<(x: number) => boolean>; // boolean

// Extract promise resolved type
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type F = Awaited<Promise<Promise<string>>>; // string (recursive!)

// Extract array element type
type ElementOf<T> = T extends (infer E)[] ? E : never;
type G = ElementOf<string[]>; // string

// Extract first argument type
type FirstArg<T> = T extends (arg: infer A, ...rest: any[]) => any ? A : never;
type H = FirstArg<(name: string, age: number) => void>; // string

// Extract props from React component
type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;
```

### Practical Use Cases

```typescript
// Make certain properties optional
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract event type from event handler
type EventType<T> = T extends (event: infer E) => void ? E : never;
type ClickHandler = (event: React.MouseEvent) => void;
type ClickEvent = EventType<ClickHandler>; // React.MouseEvent
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I used conditional types to build type-safe API response handlers: extracting the data type from generic OData response wrappers, ensuring compile-time safety for our service layer without manual type annotations.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Conditional types are TypeScript's ternary at the type level: `T extends U ? X : Y`. Combined with `infer`, they extract types from complex structures — like ReturnType extracting a function's return type. I use them for: extracting prop types from components, unwrapping Promises, and building type-safe utility types. The key to `infer` is it introduces a new type variable that TypeScript fills in from the matched pattern."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Real-world: type-safe API client
type ApiRoutes = {
  '/users': { GET: User[]; POST: User };
  '/users/:id': { GET: User; PUT: User; DELETE: void };
  '/posts': { GET: Post[]; POST: Post };
};

type RouteResponse<
  Path extends keyof ApiRoutes,
  Method extends keyof ApiRoutes[Path]
> = ApiRoutes[Path][Method];

// Usage
type UsersGetResponse = RouteResponse<'/users', 'GET'>; // User[]
type UserPostResponse = RouteResponse<'/users', 'POST'>; // User

// Extract route params from path
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type UserParams = ExtractParams<'/users/:id'>; // { id: string }
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Conditional = type ternary. infer = type pattern matching to extract."** `T extends Pattern<infer X> ? X : never` — infer introduces a variable that TS fills in. Common uses: ReturnType (infer R from function), Awaited (infer U from Promise), ElementOf (infer E from array).

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Advanced TS feature that signals deep type system fluency. Used in library/framework development.
**How:** `T extends U ? X : Y` for branching, `infer` for extracting types from patterns. Distributive over unions.
**Companies:** Microsoft (deep TS interview), Adobe (strict typing), Cisco/Salesforce (framework type patterns).
