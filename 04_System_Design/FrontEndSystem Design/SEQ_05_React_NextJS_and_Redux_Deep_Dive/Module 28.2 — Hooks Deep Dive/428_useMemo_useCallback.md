# 428 – useMemo and useCallback — When to Memoize

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`useMemo` caches computed values between renders. `useCallback` caches function references. Both take a dependency array. **Don't memoize everything** — memoization has overhead (comparison cost + memory). Memoize only when: passing to `memo()` children, expensive computations, or stable references needed.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── useMemo — cache computed value ────
function ProductList({ products, filter }: Props) {
  // ✅ Expensive computation — memoize
  const filtered = useMemo(() =>
    products.filter(p => p.category === filter).sort((a, b) => a.price - b.price),
    [products, filter],
  );
  
  return <ul>{filtered.map(p => <ProductItem key={p.id} product={p} />)}</ul>;
}

// ──── useCallback — cache function reference ────
function Parent() {
  const [count, setCount] = useState(0);
  
  // ✅ Memoize because Child is wrapped in memo()
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []); // stable reference — [] because updater function
  
  return (
    <>
      <p>{count}</p>
      <MemoizedChild onClick={handleClick} />
    </>
  );
}

const MemoizedChild = memo(function Child({ onClick }: { onClick: () => void }) {
  console.log('Child rendered');
  return <button onClick={onClick}>Click</button>;
});

// ──── WHEN TO MEMOIZE ────
// ✅ Memoize:
// 1. Expensive computation (sorting, filtering large arrays)
// 2. Referential equality for memo() children props
// 3. Dependency of useEffect (to prevent unnecessary re-runs)
// 4. Context value objects

// ❌ Don't memoize:
// 1. Simple calculations (a + b, string concat)
// 2. Functions not passed to memoized children
// 3. Primitive values (already referentially stable)
// 4. Everything "just in case"

// ──── CONTEXT VALUE MEMOIZATION ────
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // ✅ Memoize context value to prevent all consumers re-rendering
  const value = useMemo(() => ({
    user,
    login: (creds: Credentials) => { /* ... */ },
    logout: () => setUser(null),
  }), [user]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ──── useCallback is useMemo for functions ────
// These are equivalent:
const handleClick = useCallback(() => doSomething(a, b), [a, b]);
const handleClick = useMemo(() => () => doSomething(a, b), [a, b]);
```

### Decision Flowchart
```
Is it an expensive computation (>1ms)?
├── Yes → useMemo
└── No → Is it passed to a memo() child?
    ├── Yes, it's a value → useMemo
    ├── Yes, it's a function → useCallback
    └── No → Don't memoize
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useMemo for expensive computed values, useCallback for stable function refs passed to memo children. Don't memoize everything — the comparison cost can exceed the re-compute cost. I memoize for: expensive computations, memo() child props, context values, and useEffect dependencies."*

## 4. 🧠 MEMORY AID
**"useMemo = cache value. useCallback = cache function. Only when: expensive, memo() child, context value, or effect dep. Profile first, memoize second."**
