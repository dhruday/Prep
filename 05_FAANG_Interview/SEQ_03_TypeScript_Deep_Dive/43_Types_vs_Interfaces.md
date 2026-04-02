# 43. Types vs Interfaces — When to Use Which
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

I use `interface` for object shapes that describe data structures and public API contracts, and `type` for everything else — unions, intersections, mapped types, conditional types, and primitives. The practical rule: if it needs declaration merging (e.g., augmenting a third-party library) or expresses a class contract, use `interface`. If it needs a union or computed type expression, use `type`. In practice they're interchangeable for most object shapes, and the codebase convention matters more than the technical difference.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

TypeScript has two primary mechanisms for naming types: `interface` and `type alias`. They overlap significantly for object shapes but have distinct capabilities:

- **`interface`** — describes the shape of an object. Supports declaration merging. Can be implemented by classes. Cannot express unions, intersections inline, or computed types.
- **`type`** — a named alias for any type expression. Can represent unions, intersections, primitives, tuples, mapped types, conditional types, template literal types. Cannot be merged.

### How It Works Internally

**Declaration Merging (interfaces only):**
```typescript
interface Window {
  myCustomProp: string;
}
// Both declarations merge — TypeScript treats them as one interface
interface Window {
  anotherProp: number;
}
// Your code: window.myCustomProp — valid!
// This is how @types/* packages augment built-in types
```

**Type aliases cannot merge:**
```typescript
type User = { name: string };
type User = { age: number }; // ❌ Error: Duplicate identifier 'User'
```

**Extending:**
```typescript
// Interface extends interface:
interface Animal { name: string }
interface Dog extends Animal { breed: string }

// Interface extends type:
type HasId = { id: number };
interface Entity extends HasId { createdAt: Date } // ✅ works

// Type intersection (equivalent to extends for objects):
type Dog = Animal & { breed: string };
```

**Classes — only interface can be `implements`ed:**
```typescript
interface Serializable {
  serialize(): string;
}
class User implements Serializable { // ✅
  serialize() { return JSON.stringify(this); }
}

type Serializable2 = { serialize(): string };
class User2 implements Serializable2 { } // ✅ also works — type works here too
```

**Computed/Conditional types — only `type` can do this:**
```typescript
type IsString<T> = T extends string ? 'yes' : 'no';      // ✅ type only
type Keys = keyof { a: 1; b: 2 };                        // ✅ type only  
type Tuple = [string, number];                            // ✅ type only
type StringOrNumber = string | number;                    // ✅ type only
interface Nope = string | number; // ❌ interface cannot be a union
```

### Architecture & Component Boundaries

```
When to use each:

interface                              type
──────────────────────────────────     ──────────────────────────────────
Public API contracts (libraries)       Union types: A | B | C
Class contracts (implements)           Intersection types: A & B
Declaration merging needed             Conditional types
Object shapes in most app code*        Mapped types
React component props (convention)     Template literal types
                                       Primitive aliases
                                       Tuples
                                       Re-exports / complex compositions

*Either works — pick one and be consistent
```

### Data Flow & State Flow

There is no runtime difference. Both `interface` and `type` are erased at compile time — they generate zero JavaScript bytes. The choice is purely a compile-time type-checking concern.

### Performance Implications

- **Compile time:** Interfaces compile slightly faster than complex type aliases for simple object shapes because TypeScript caches interface identity more aggressively. For most codebases this is unmeasurable.
- **Error messages:** Interface errors tend to show cleaner property-level messages; complex type alias errors can show expanded type representations that are harder to read.
- **Bundle size:** Zero — both are fully erased at build time.

### Scalability Considerations

- **< 10K users (small team):** Agree on one convention — most teams use `interface` for object shapes, `type` for everything else.
- **100K users (large team):** ESLint rule `@typescript-eslint/consistent-type-definitions` enforces the convention project-wide.
- **Library/Design System scale:** Always use `interface` for exported types that consumers may want to augment via declaration merging. `type User = {...}` in a library cannot be augmented by consumers; `interface User {...}` can.

### Trade-offs

| `interface` | `type` | When to Choose |
|---|---|---|
| Supports declaration merging | No merging | `interface` for library public APIs |
| Cleaner class contract | Cannot be directly `implements`ed* | `interface` for class contracts |
| Cannot express unions | Can express any type | `type` for unions, conditionals, mapped types |
| Familiar OOP look | More expressive | Team preference for objects |

*`type` works with `implements` but convention prefers `interface`

### ⚠️ Anti-Patterns & Pitfalls

- **Using `type` for everything without thinking** — misses declaration merging when building shared libraries. If you publish an npm package and use `type User = {}`, consumers cannot augment it to add custom fields. Use `interface` for exported shapes in libraries.
- **Using `interface` for union types** — `interface Status = 'loading' | 'done'` is a compile error. Reach for `type` when defining unions.
- **Inconsistent mixing in the same codebase** — half the team writes `interface`, half writes `type` for the same use cases. Agree and enforce via ESLint. The specific choice matters less than consistency.
- **Re-declaring the same interface accidentally** — declaration merging is a feature but also a trap. If you accidentally define `interface Config` twice with conflicting properties, TypeScript merges them — sometimes silently widening a type rather than erroring.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
In SAP UI5 TypeScript migrations, `interface` is used for OData entity shapes that multiple modules consume — they can be extended via declaration merging when a new module adds fields. `type` is used for union discriminators like `type TileState = 'loading' | 'ready' | 'error'` and for mapped types that derive form validation shapes from entity shapes.

**At FAANG scale:**
- **Microsoft:** TypeScript itself is authored at Microsoft — their codebase convention is `interface` for public API shapes, `type` for utility types. The `@types/node` package uses declaration merging extensibly.
- **Adobe:** React Spectrum uses `interface` for component prop types so external consumers can augment props for custom overlays. Utility types like `DimensionValue` that map to CSS values are `type` aliases of unions.

**How it evolves with scale:**
- Small scale: Any consistent choice works. Document it in CONTRIBUTING.md.
- Medium scale: ESLint `@typescript-eslint/consistent-type-definitions` rule enforced in CI.
- Large scale (library): Always `interface` for exported shapes, strictly `type` for computed/union types. Enables module augmentation for third-party consumers.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "In practice, for object shapes, both work and I pick based on team convention. The real differences that matter at senior level: interfaces support declaration merging — which is why @types packages use them to augment built-in globals. Types can express unions, intersections, conditional types, and mapped types — which interfaces can't. My rule of thumb: interface for object shapes in application code and library public APIs, type for everything else. Consistent enforcement via ESLint matters more than which one you pick."

### Likely Follow-up Questions
1. **Can an interface extend a type?** → Yes — `interface Foo extends SomeType {}` works as long as `SomeType` resolves to an object shape
2. **What is declaration merging and when is it useful?** → Multiple `interface` declarations with the same name are merged — used to augment third-party types (e.g., adding fields to `Express.Request`)
3. **Which compiles faster?** → Interfaces are slightly faster due to identity caching in the TypeScript compiler, but the difference is negligible in application code
4. **Does the choice affect runtime behaviour?** → No — both are fully erased at compile time, zero runtime impact

### vs Alternatives
| `interface` | `type` | Choose when |
|---|---|---|
| Mergeable | Not mergeable | Library exports → `interface` |
| Cannot do unions | Union/conditional types | Non-object shapes → `type` |
| Class `implements` convention | Works but unusual | Class contracts → `interface` |

### How to Signal Senior Thinking
> "The distinction that matters at scale is declaration merging. When building a shared design system or library, `interface` lets consumers extend exported types via module augmentation — `type` aliases lock them out. I enforce this via `@typescript-eslint/consistent-type-definitions` so it's codified, not tribal knowledge."

---

## 💻 5. Code Example

```typescript
// When interface wins: library-exported shape that consumers may augment
// file: @company/design-system/src/types.ts

export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// Consumer code: module augmentation (only works with interface, not type)
declare module '@company/design-system' {
  interface ButtonProps {
    analytics?: { eventName: string }; // custom field added by consumer
  }
}

// When type wins: union, mapped type, conditional type
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonVariant = ButtonProps['variant']; // indexed access — type only

type RequiredProps<T> = { [K in keyof T]-?: T[K] }; // mapped type — type only

type IsClickable<T> = T extends { onClick: Function } ? true : false; // conditional

// SAP pattern: OData entity shape as interface (augmentable)
interface ODataEntity {
  '@odata.etag': string;
  ID: string;
}
interface SalesOrder extends ODataEntity {
  Amount: number;
  Currency: string;
}

// Union discriminator as type
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: SalesOrder[] }
  | { status: 'error'; error: string };
```

**Interview vs Production difference:**
In an interview, just demonstrate knowing both and when to choose. In production, add the ESLint rule and document convention in the project README to prevent drift.

---

## 🧠 6. Memory Aid

**Mental Model:** `interface` = object blueprint that can be extended by others. `type` = mathematical type expression — unions, intersections, computed shapes.

**If you go blank:** "Use `interface` for object shapes and public contracts. Use `type` for unions, intersections, and computed types. The key technical difference is declaration merging — only `interface` supports it."

**Mnemonic:** **MUCO = Merging → Use interface; Computed/Union → type**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Zero runtime impact — purely a developer experience and maintainability concern
→ Performance: Type checking speed marginally favours interfaces for large object shapes
→ Business: Correct choice enables library consumers to extend types via module augmentation — wrong choice forces breaking changes

**How it works (3 sentences):**
Both `interface` and `type` describe type shapes and are fully erased at compile time with zero runtime footprint. Interfaces are open — multiple declarations with the same name merge, enabling library augmentation — while type aliases are closed and more expressive, supporting unions, conditional types, and mapped types. The practical rule: `interface` for object shapes in library public APIs and class contracts, `type` for all computed type expressions.

**Company relevance:**
- Microsoft: TypeScript team's own convention — interfaces for exported library types; follow it when contributing to MSFT open source
- Adobe: React Spectrum design system uses `interface` for component props to support consumer module augmentation
- Salesforce: LWC and Salesforce platform TypeScript — `interface` for wire adapters and component contracts that partners may extend
- Cisco: Enterprise TypeScript codebases enforce convention via ESLint; knowing the rule and why is the differentiator

---
**✅ Topic 43/486 complete.**
**→ Continuing to Topic 44: Union & Intersection Types**
