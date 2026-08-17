# 441 – React Compiler (React Forget)

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**React Compiler** (formerly React Forget) is a build-time compiler that **automatically memoizes** components and values. Eliminates the need for manual `React.memo`, `useMemo`, `useCallback`. Understands React's rules (pure rendering, hooks rules) and inserts memoization where needed.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── BEFORE React Compiler (manual memoization) ────
const ExpensiveList = React.memo(function ExpensiveList({ items, filter }) {
  const filtered = useMemo(
    () => items.filter(i => i.status === filter),
    [items, filter],
  );
  
  const handleClick = useCallback(
    (id: string) => { selectItem(id); },
    [selectItem],
  );
  
  return filtered.map(item => (
    <Item key={item.id} item={item} onClick={handleClick} />
  ));
});

// ──── AFTER React Compiler (automatic!) ────
// Just write natural code — compiler handles memoization
function ExpensiveList({ items, filter }) {
  const filtered = items.filter(i => i.status === filter);
  // Compiler auto-memoizes: caches `filtered` based on `items` + `filter`
  
  const handleClick = (id: string) => { selectItem(id); };
  // Compiler auto-memoizes: stable reference when `selectItem` doesn't change
  
  return filtered.map(item => (
    <Item key={item.id} item={item} onClick={handleClick} />
  ));
}
// Component itself is auto-memoized (like React.memo)

// ──── HOW IT WORKS ────
// 1. Babel plugin analyzes component at build time
// 2. Tracks all variable dependencies (like a smart useMemo)
// 3. Inserts cache checks: if deps unchanged → return cached value
// 4. Wraps component in memo-like wrapper automatically

// ──── COMPILED OUTPUT (simplified) ────
function ExpensiveList({ items, filter }) {
  const $ = useMemoCache(4); // compiler-generated cache
  
  let filtered;
  if ($[0] !== items || $[1] !== filter) {
    filtered = items.filter(i => i.status === filter);
    $[0] = items;
    $[1] = filter;
    $[2] = filtered;
  } else {
    filtered = $[2];
  }
  
  // ... similar caching for JSX output
}

// ──── RULES THE COMPILER ENFORCES ────
// 1. Components must be pure (same props → same output)
// 2. Hooks Rules (no conditional hooks, top-level only)
// 3. No mutation of props/state during render
// 4. Values referenced in JSX must be immutable

// ──── ESCAPE HATCH ────
// 'use no memo' directive to opt out
function LegacyComponent() {
  'use no memo';
  // Compiler skips this component
}

// ──── SETUP (Next.js) ────
// next.config.js
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};
```

### Impact
| Metric | Before | After Compiler |
|---|---|---|
| Manual memo code | Everywhere | Zero |
| Bundle size | +useMemo/useCallback overhead | Compiler-inserted (smaller) |
| Developer mistakes | Missed deps, over-memoization | Correct by default |
| Performance | Manual optimization | Automatic optimization |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React Compiler auto-memoizes at build time — no more useMemo/useCallback/React.memo. It analyzes dependencies via a Babel plugin and inserts cache checks. Rules: pure components, no mutation during render, standard hooks rules. 'use no memo' to opt out."*

## 4. 🧠 MEMORY AID
**"React Compiler = auto useMemo + useCallback + React.memo at build. Write natural code → compiler memoizes. 'use no memo' to opt out."**
