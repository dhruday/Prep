# 284 – Types vs Interfaces — When to Use Which

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Both `type` and `interface` define object shapes in TypeScript, but they differ in key ways: **Interfaces** are extendable (declaration merging, `extends`), best for **object shapes and class contracts**. **Types** are more flexible — they support unions, intersections, mapped types, and conditional types. Rule of thumb: **use `interface` for public API shapes** (props, services) and **`type` for unions, computed types, and complex type manipulation**. In practice, consistency within a codebase matters more than the specific choice.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Key Differences

```typescript
// 1. Declaration merging (interface only)
interface User { name: string; }
interface User { email: string; } // merges — User has both name and email
// type User = { name: string; }
// type User = { email: string; } // ❌ Error: duplicate identifier

// 2. Unions (type only)
type Status = 'loading' | 'success' | 'error'; // ✅
// interface Status = 'loading' | 'success' | 'error'; // ❌ Not possible

// 3. Intersection vs extends
type Admin = User & { role: 'admin' }; // intersection
interface Admin extends User { role: 'admin'; } // extends

// 4. Computed/mapped types (type only)
type Readonly<T> = { readonly [K in keyof T]: T[K] }; // ✅
type Nullable<T> = { [K in keyof T]: T[K] | null }; // ✅

// 5. Conditional types (type only)
type IsString<T> = T extends string ? true : false; // ✅
```

### Decision Guide

| Use Case | Recommendation |
|----------|----------------|
| React component props | `interface` — extendable, clear contract |
| Union types (`'a' \| 'b'`) | `type` — interfaces can't do unions |
| Object shapes for APIs | `interface` — declaration merging for module augmentation |
| Mapped/conditional types | `type` — only option |
| Class contracts | `interface` — `implements` keyword |
| Function signatures | `type` — cleaner syntax for complex signatures |

### Performance Consideration

Interfaces slightly better for TypeScript compiler performance because they're named and cached. Types with complex intersections are lazily evaluated.

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our coding standard was: `interface` for component props and service contracts, `type` for union types and utility types. This gave us consistent patterns while using each construct where it excels.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I use interfaces for object shapes — React props, API contracts, class implementations — because they support declaration merging and extends. I use types for unions, intersections, mapped types, and conditional types, which interfaces can't express. The key difference: interfaces are extendable (declaration merging), types are more expressive (unions, mapped types). Consistency within the codebase matters most."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Interface: component props (extendable contract)
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick: () => void;
  children: React.ReactNode;
}

interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

// Type: unions and computed types
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

// Type: function signatures
type EventHandler<T = void> = T extends void ? () => void : (payload: T) => void;
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Interface = object shapes + extends + declaration merging. Type = unions + mapped + conditional."** Props? Interface. Union? Type. Class contract? Interface. Utility type? Type. When in doubt, interface for objects, type for everything else.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Frequently asked in TypeScript interviews; shows understanding of the type system.
**How:** Interface for extensible object shapes, type for unions/mapped/conditional. Consistency within codebase.
**Companies:** **Microsoft** (TypeScript creators — deep questions), **Cisco** (Angular/TS heavy), Adobe, Salesforce.
