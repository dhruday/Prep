# 287 – Enums vs Const Assertions vs Union Types

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

TypeScript offers three ways to define a set of named constants: **Enums** (compiled to runtime objects), **const assertions** (`as const` — zero runtime cost), and **union types** (purely compile-time). Modern TypeScript practice: **prefer union types for simple string sets** (`'loading' | 'error' | 'success'`), **const assertions for objects with grouped constants**, and **enums only when you need reverse mapping or numeric auto-increment**. The trend is moving away from enums toward `as const` for smaller bundle sizes.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Comparison

```typescript
// 1. ENUM — generates runtime JavaScript
enum Direction { Up = 'UP', Down = 'DOWN', Left = 'LEFT', Right = 'RIGHT' }
// Compiled JS: var Direction; Direction["Up"] = "UP"; ...

// 2. CONST ASSERTION — zero runtime cost
const DIRECTION = { Up: 'UP', Down: 'DOWN', Left: 'LEFT', Right: 'RIGHT' } as const;
type Direction = typeof DIRECTION[keyof typeof DIRECTION]; // 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

// 3. UNION TYPE — purely compile-time
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
```

### When to Use Each

| Scenario | Best Choice | Why |
|----------|------------|-----|
| Simple string alternatives | Union type | Zero runtime, simplest |
| Grouped related constants | `as const` object | Zero runtime, organized |
| Numeric auto-increment | Enum | Only option for `Up = 0, Down = 1` |
| Reverse mapping needed | Enum | `Direction[0] === 'Up'` |
| Cross-module API constants | `as const` object | Tree-shakeable |
| Quick prop constraint | Union type | `variant: 'primary' \| 'secondary'` |

### Bundle Size Impact

```typescript
// Enum: ~100 bytes of runtime JS per enum
enum Status { Loading, Error, Success }
// Compiles to:
// var Status;
// (function(Status) {
//   Status[Status["Loading"] = 0] = "Loading";
//   Status[Status["Error"] = 1] = "Error";
//   Status[Status["Success"] = 2] = "Success";
// })(Status || (Status = {}));

// const assertion: 0 bytes (erased at compile time when only used as type)
const STATUS = { Loading: 'LOADING', Error: 'ERROR', Success: 'SUCCESS' } as const;

// Union: 0 bytes (purely compile-time)
type Status = 'loading' | 'error' | 'success';
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, we migrated from enums to `as const` objects for our API status codes and Fiori theme constants. This reduced bundle size and improved tree-shaking. Union types were used for component props like button variants and sizes.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I prefer union types for simple string alternatives ('loading' | 'error' | 'success') — zero runtime cost, simplest syntax. For grouped constants, I use 'as const' objects — organized with zero bundle impact. I only use enums when I need numeric auto-increment or reverse mapping. The modern practice is moving away from enums because they generate runtime JavaScript, while the alternatives are compile-time only."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Modern approach: as const for constants, union types for props

// API endpoints as const
const API = {
  USERS: '/api/users',
  POSTS: '/api/posts',
  COMMENTS: '/api/comments',
} as const;
type ApiEndpoint = typeof API[keyof typeof API]; // '/api/users' | '/api/posts' | '/api/comments'

// HTTP methods as union
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Theme tokens as const
const COLORS = { primary: '#3b82f6', secondary: '#64748b', danger: '#ef4444', success: '#22c55e' } as const;
type Color = typeof COLORS[keyof typeof COLORS];

// Component prop: union type
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'; // simple union — not enum
  size: 'sm' | 'md' | 'lg';
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Union for props, as-const for grouped constants, enum only for numeric/reverse mapping."** Modern TS: avoid enums (runtime cost). Union types = zero cost, simplest. `as const` = zero cost, organized. Enum = has runtime cost, only when needed.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Shows understanding of TypeScript compilation and bundle size awareness.
**How:** Union types for simple alternatives, `as const` for grouped constants, enums only when reverse mapping needed.
**Companies:** Microsoft (TS depth), all four value bundle-conscious TypeScript usage.
