# 102. React Compiler (React 19) — Auto-Memoisation
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The React Compiler (previously "React Forget") is a build-time compiler that automatically applies memoization optimizations to React components and hooks — eliminating the need for developers to manually write `useMemo`, `useCallback`, and `React.memo`. It analyses component code, understands which values are stable vs which change across renders, and automatically wraps the right values and callbacks with equivalent optimizations. Code that previously needed `useCallback(() => handleClick, [id])` is automatically inferred by the compiler as stable-when-`id`-hasn't-changed. The compiler ships with React 19 and is currently enabled as an opt-in in Next.js 15. Its basic rule: it only works on components and hooks that follow the rules of React (pure renders, no mutations of state/props) — code that violates these rules is skipped.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What the Compiler Does

Before compiler:
```typescript
// Developer must manually track what needs memoization
function ProductList({ products, onSelect, filter }: Props) {
  // Manually memoized — developer's responsibility
  const filteredProducts = useMemo(
    () => products.filter(p => p.category === filter),
    [products, filter]
  );

  // Manually memoized callback — prevents child re-renders
  const handleSelect = useCallback(
    (id: string) => onSelect(id),
    [onSelect]
  );

  return filteredProducts.map(p => (
    <ProductCard
      key={p.id}
      product={p}
      onSelect={handleSelect}  // stable reference — ProductCard won't re-render if onSelect identity doesn't change
    />
  ));
}

// ProductCard must be manually wrapped with React.memo
const ProductCard = React.memo(function ProductCard({ product, onSelect }: CardProps) {
  return <div onClick={() => onSelect(product.id)}>{product.name}</div>;
});
```

After compiler (what the code looks like in source — developer writes simpler code):
```typescript
// Developer writes this — no manual memoization needed
function ProductList({ products, onSelect, filter }: Props) {
  // No useMemo — compiler handles it
  const filteredProducts = products.filter(p => p.category === filter);

  // No useCallback
  const handleSelect = (id: string) => onSelect(id);

  return filteredProducts.map(p => (
    <ProductCard key={p.id} product={p} onSelect={handleSelect} />
  ));
}

// No React.memo
function ProductCard({ product, onSelect }: CardProps) {
  return <div onClick={() => onSelect(product.id)}>{product.name}</div>;
}

// The compiler outputs code equivalent to the manually memoized version
// What the compiler PRODUCES (simplified concept):
function ProductList({ products, onSelect, filter }: Props) {
  const $ = useMemoCache(3);   // compiler's internal memoization cache

  let filteredProducts;
  if ($[0] !== products || $[1] !== filter) {
    filteredProducts = products.filter(p => p.category === filter);
    $[0] = products; $[1] = filter; $[2] = filteredProducts;
  } else {
    filteredProducts = $[2];
  }
  // ↑ equivalent to useMemo(() => ..., [products, filter])

  // Similar caching for handleSelect, filtered JSX, etc.
}
```

### How the Compiler Determines What to Memoize

The compiler performs **static analysis** of the component:
1. Identifies all local variables, function definitions, and JSX
2. Traces which props and state values each depends on
3. Determines which values are "stable" (same reference across renders if deps unchanged)
4. Wraps computations in cache checks equivalent to `useMemo`/`useCallback`

```typescript
// The compiler understands React's rules:
// 1. State setter functions are stable — no caching needed
// 2. Props are new references each render — cache needed if passed to memoized children
// 3. Derived values depend on tracked inputs — cache when inputs haven't changed

function Example({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  // The compiler knows:
  // - userId: external (unstable prop — re-cache if changed)
  // - setCount: stable setter — no need to memoize
  // - fetchUserData: depends on userId — freeze when userId unchanged
  const fetchUserData = () => fetch(`/api/users/${userId}`);  // auto-memoized by compiler

  // count + 1: depends on count (state) — cached value
  const incrementedCount = count + 1;  // compiler checks: did count change?

  return (
    <div>
      <span>{incrementedCount}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <UserButton onClick={fetchUserData} />  {/* fetchUserData is stable unless userId changes */}
    </div>
  );
}
```

### What the Compiler CANNOT Do

```typescript
// 1. Components that mutate props or state directly
function BadComponent({ items }: { items: Item[] }) {
  items.push({ id: 'new' });   // ❌ mutates prop — compiler SKIPS this component entirely
  return <List items={items} />;
}

// 2. Components that violate purity (side effects in render)
function BadComponent() {
  const timestamp = Date.now();  // ❌ non-pure: different value on server vs client
  localStorage.setItem('ts', String(timestamp));  // ❌ side effect in render body
  return <div>{timestamp}</div>;
}

// 3. Effects are outside the compiler's scope
function Component() {
  const [data, setData] = useState(null);
  useEffect(() => {
    // ← compiler does not optimize inside useEffect
    fetchData().then(setData);
  }, []);  // deps must still be manually correct
  return <div>{data}</div>;
}
```

### eslint-plugin-react-compiler — Catch Violations Before Runtime

```json
// .eslintrc.json — React Compiler lint plugin
{
  "plugins": ["react-compiler"],
  "rules": {
    "react-compiler/react-compiler": "error"
  }
}
// Catches: mutations in render, unsafe conditional hooks, prop mutations
// Run before enabling the compiler to see which components violate rules
// These components are skipped by the compiler (not broken, just not optimized)
```

### Enabling in Next.js 15

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};
export default nextConfig;

// Or with options:
const nextConfig = {
  experimental: {
    reactCompiler: {
      compilationMode: 'annotation',   // only compile components marked with "use memo"
      // vs 'all' (default): compile all eligible components
    },
  },
};

// Opt-in per component with compilationMode: 'annotation'
'use memo';   // at top of file — opts this file into compiler optimization
export function ProductList() { ... }
```

### What You Can Remove After Enabling the Compiler

```typescript
// With React Compiler, these become unnecessary:
// ❌ Can remove: React.memo (compiler provides equivalent optimizations)
// ❌ Can remove: useMemo for stable derived values (compiler auto-memoizes)
// ❌ Can remove: useCallback for stable callback references (compiler auto-memoizes)

// HOWEVER:
// ✅ Keep: useMemo for EXPENSIVE computations with explicit intent
//    — compiler may not have enough info to determine if the computation is worth memoizing
// ✅ Keep: useCallback if used in useEffect deps (compiler may not infer the same identity)
// ✅ Keep: React.memo for third-party or library component boundaries

// The compiler is an optimization layer, not a correctness mechanism
// Your code should be correct without it; the compiler makes it more performant
```

### React Compiler's Non-Goals

Things the compiler does NOT do:
- Does not reduce number of re-renders from parent components passing new props — it only optimizes when dependencies haven't changed
- Does not fix performance problems from bad state structure or excessive context subscriptions
- Does not optimize `useEffect` dependencies — those remain manual
- Does not handle third-party store subscriptions (useSyncExternalStore) — those bypass React's prop/state model

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the codebase had ~200 `useCallback` and ~150 `useMemo` calls added incrementally over years, many either unnecessary or with incorrect deps arrays (causing stale closures or missed memoization). Enabling the React Compiler (in annotation mode first) on the component library would: (a) auto-memoize correctly, (b) allow removing the majority of manual useMemo/useCallback calls, and (c) reduce the risk of the stale-closure bugs introduced by manually specified deps arrays.

**At FAANG scale:**
- **Meta (Instagram, Facebook):** React Compiler was developed internally at Meta and deployed to instagram.com — they reported significant reductions in renders and frame budget improvement for interaction responsiveness
- **Microsoft:** Evaluating compiler for Office Online React components; the ability to remove manual memoization would reduce code complexity across large teams
- **Adobe:** React Spectrum and React Aria could remove manual `useCallback` wrappers throughout their hook compositions
- **Salesforce:** Large Lightning component codebase — compiler could reduce the memoization boilerplate that must currently be correctly maintained by many teams

---

## 💬 4. Interview Execution

### Sample Answer

> "The React Compiler automates what we currently do manually with `React.memo`, `useMemo`, and `useCallback`. It's a build-time Babel/SWC transform that analyses component code, determines what values are stable across renders, and inserts equivalent memoization at compile time. Developer experience: you write unsophisticated code without explicit memoization, the compiler outputs the optimized equivalent.
>
> The constraint is strict: the compiler only optimises components that follow React's rules perfectly — pure renders, no prop/state mutations. Any violation causes the compiler to skip that component (the component still works, it's just not compiler-optimised). The `react-compiler` ESLint plugin identifies violations before you enable it.
>
> What you can remove after enabling: most `useCallback` calls and `useMemo` calls for referential stability. What to keep: `useMemo` for genuinely expensive computations (the compiler occasionally can't infer how expensive something is), and there's some nuance around `useEffect` deps — the compiler doesn't change effect dependency management.
>
> It ships with React 19 and Next.js 15. I'd frame it as: it removes a class of performance bugs (missed optimizations, incorrect deps arrays) by making the intended behaviour the default."

### Likely Follow-ups

1. **Does the compiler make all existing `useMemo` calls obsolete?** → Mostly yes for referential stability use cases, but not always. For computationally expensive operations, you'd keep explicit `useMemo` as documentation of intent. Also, the compiler optimizes inside what it can statically analyze — dynamic patterns or third-party calls might not be optimized as expected. Testing before removing all manual memos is important.
2. **What is `useMemoCache`?** → It's an internal React 19 hook the compiler's output uses to store cached values — a slot-based cache internal to the component. Not intended for direct use by developers.
3. **The compiler vs `React.memo` — which should you prefer going forward?** → The compiler makes `React.memo` largely unnecessary for components you author. But `React.memo` remains useful at API boundaries (receiving components as props from external code), around third-party components, and in libraries/design systems that need to guarantee memoization regardless of the consuming app's compiler setup.
4. **What happens to apps with many violations?** → Progressive adoption: start with `compilationMode: 'annotation'` and add `'use memo'` to individual files as you fix violations. The `react-compiler` ESLint plugin shows exactly what needs fixing. Non-compiled components continue working normally.

---

## 💻 5. Code Example

```typescript
// ========================
// BEFORE compiler: developer must manually track everything
// ========================
interface Product { id: string; name: string; price: number; category: string; }
interface Props {
  products: Product[];
  category: string;
  currency: string;
  onProductSelect: (id: string) => void;
}

// Manual memoization everywhere — easy to get wrong
function ProductGridBefore({ products, category, currency, onProductSelect }: Props) {
  const filtered = useMemo(
    () => products.filter(p => p.category === category),
    [products, category]
  );

  const formatPrice = useCallback(
    (price: number) => `${currency} ${price.toFixed(2)}`,
    [currency]
  );

  const handleSelect = useCallback(
    (id: string) => onProductSelect(id),
    [onProductSelect]
  );

  return (
    <div>
      {filtered.map(p => (
        <MemoizedCard
          key={p.id}
          product={p}
          formatPrice={formatPrice}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

const MemoizedCard = React.memo(function ProductCard({
  product,
  formatPrice,
  onSelect,
}: {
  product: Product;
  formatPrice: (n: number) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div onClick={() => onSelect(product.id)}>
      <span>{product.name}</span>
      <span>{formatPrice(product.price)}</span>
    </div>
  );
});

// ========================
// AFTER compiler: developer writes simpler code
// The compiler handles memoization automatically at build time
// ========================

// No React.memo, no useMemo, no useCallback needed
function ProductGridAfter({ products, category, currency, onProductSelect }: Props) {
  const filtered = products.filter(p => p.category === category);
  // ↑ Compiler: "filtered depends on products + category; cache it"

  const formatPrice = (price: number) => `${currency} ${price.toFixed(2)}`;
  // ↑ Compiler: "formatPrice depends on currency; stable unless currency changes"

  const handleSelect = (id: string) => onProductSelect(id);
  // ↑ Compiler: "handleSelect depends on onProductSelect; stable unless it changes"

  return (
    <div>
      {filtered.map(p => (
        <ProductCardPlain
          key={p.id}
          product={p}
          formatPrice={formatPrice}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

// No React.memo — compiler makes it equivalent
function ProductCardPlain({
  product,
  formatPrice,
  onSelect,
}: {
  product: Product;
  formatPrice: (n: number) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div onClick={() => onSelect(product.id)}>
      <span>{product.name}</span>
      <span>{formatPrice(product.price)}</span>
    </div>
  );
}
// Compiler output (conceptual — what compiler generates internally):
// function ProductCardPlain({ product, formatPrice, onSelect }) {
//   const $ = useMemoCache(1);
//   if ($[0] !== product || ...) {
//     $[0] = product; $[1] = <output JSX>;
//   }
//   return $[1];
// }

// ========================
// Violations: what the compiler SKIPS
// ========================
// ❌ Mutation in render — compiler skips this component entirely
function ViolatingComponent({ items }: { items: Product[] }) {
  'use memo';   // opt-in for compiler — but violation causes skip
  const sorted = items;
  sorted.sort((a, b) => a.price - b.price);  // ❌ mutates the prop array in-place
  return <ul>{sorted.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}

// ✅ Correct: create a new array
function CorrectComponent({ items }: { items: Product[] }) {
  'use memo';
  const sorted = [...items].sort((a, b) => a.price - b.price);  // ✅ new array
  return <ul>{sorted.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}

declare const React: typeof import('react');
declare function useMemo<T>(fn: () => T, deps: unknown[]): T;
declare function useCallback<T extends Function>(fn: T, deps: unknown[]): T;
declare function useState<T>(init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void];
```

---

## 🧠 6. Memory Aid

**One liner:** "React Compiler = build-time `useMemo`/`useCallback`/`React.memo` everywhere, automatically, for free — if your code is pure."

**What it removes:** React.memo, useMemo (for referential stability), useCallback
**What it requires:** Pure renders, no mutations in render body
**What remains manual:** useEffect deps, expensive-computation useMemo (as documentation), third-party boundaries

**Mnemonic:** **PAMS** — **P**ure renders required, **A**utomatic memoization, **M**emo/useMemo/useCallback become optional, **S**kips violations silently.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Developer experience: eliminates the entire category of "forgot useMemo" and "incorrect deps array" bugs — a common source of subtle performance regressions
→ Codebase simplification: large codebases can remove hundreds of manual memoization annotations that add noise and maintenance burden
→ Correctness by default: the compiler's output is technically more correct than manual memoization — it never misses a dependency because it analyses all of them statically

**How it works (3 sentences):**
The React Compiler is a Babel/SWC transform that performs abstract syntax tree (AST) analysis on each React component and custom hook function body, building a dependency graph of every value and tracing which props, state, and local variables each depends on — then wrapping computations in compiler-generated `useMemoCache` checks that semantically match what developers would write with `useMemo` and `useCallback`, but without requiring developer annotation.
Components that mutate props or state, cause side effects in the render body, or otherwise violate React's rules of purity cause the compiler to bail out and leave that component unoptimised — the component works correctly, just without compiler-applied memoization.
The compiler does not change component semantics, cannot fix incorrect effect dependencies, and does not optimise across component boundaries (it cannot infer whether a parent's prop change is necessary or incidental), so architectural performance concerns (context subscriptions, unnecessary prop changes) must still be addressed by developers.

**Company relevance:**
- Meta: React Compiler was created at Meta and deployed to instagram.com before public release — Meta showed measurable interaction performance improvements
- Microsoft, Adobe, Salesforce, Cisco: Large React codebases with extensive manual memoization would benefit directly — reducing code complexity and eliminating a class of performance bugs

---
✅ Topic 102/486 complete → Continuing to Topic 103: Activity API & View Transitions
