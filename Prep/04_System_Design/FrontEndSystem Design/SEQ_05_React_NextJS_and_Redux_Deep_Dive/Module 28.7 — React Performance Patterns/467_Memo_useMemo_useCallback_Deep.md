# 467 – React.memo, useMemo, useCallback Deep Patterns

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**React.memo**: skip re-render if props unchanged. **useMemo**: cache computed value. **useCallback**: cache function reference. Together they prevent unnecessary renders in child components. **Key insight**: memoization only helps when a component actually re-renders with the same data — don't memoize everything blindly.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── React.memo — skip re-render ────
interface ItemProps {
  item: { id: string; name: string; price: number };
  onSelect: (id: string) => void;
}

const ExpensiveItem = React.memo(function ExpensiveItem({ item, onSelect }: ItemProps) {
  console.log('Rendering item:', item.id); // only when props change
  return (
    <div onClick={() => onSelect(item.id)}>
      {item.name} — ${item.price}
    </div>
  );
});

// Custom comparison function
const DeepComparedItem = React.memo(
  function Item({ data }: { data: ComplexObject }) {
    return <div>{data.nested.value}</div>;
  },
  (prevProps, nextProps) => {
    // Return true to SKIP re-render (shallow equal by default)
    return prevProps.data.id === nextProps.data.id
        && prevProps.data.version === nextProps.data.version;
  },
);

// ──── useMemo — cache computed values ────
function ProductList({ products, category, sortBy }: Props) {
  // Only recomputes when products, category, or sortBy change
  const filteredAndSorted = useMemo(() => {
    console.log('Computing filtered list...'); // expensive
    return products
      .filter(p => p.category === category)
      .sort((a, b) => a[sortBy] - b[sortBy]);
  }, [products, category, sortBy]);
  
  return <ul>{filteredAndSorted.map(p => <ProductCard key={p.id} product={p} />)}</ul>;
}

// ──── useCallback — stable function references ────
function ParentList({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  
  // Without useCallback: new function every render → all children re-render
  // With useCallback: stable reference → React.memo works
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []); // no deps — setSelected is stable
  
  return (
    <ul>
      {items.map(item => (
        <ExpensiveItem
          key={item.id}
          item={item}
          onSelect={handleSelect} // stable reference
        />
      ))}
    </ul>
  );
}

// ──── WHEN NOT TO MEMOIZE ────
// ❌ Primitive props (strings, numbers) — cheap comparison anyway
// ❌ Components that always re-render with different props
// ❌ Very simple/cheap components — memo overhead > render cost
// ❌ Root-level components — always re-render

function SimpleLabel({ text }: { text: string }) {
  return <span>{text}</span>; // DON'T memo — cheaper to re-render
}

// ──── PATTERN: Stable context value ────
function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Without useMemo: new object every render → all consumers re-render
  const value = useMemo(
    () => ({ user, setUser }),
    [user], // only recompute when user changes
  );
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ──── PATTERN: Memoized list rendering ────
function Dashboard() {
  const [search, setSearch] = useState('');
  const [data] = useState(largeDataSet);
  
  // Expensive filter only runs when data or search changes
  const filtered = useMemo(
    () => data.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search],
  );
  
  // Stable callback for child
  const handleItemClick = useCallback((id: string) => {
    navigateToItem(id);
  }, []);
  
  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.map(item => (
        <MemoizedItem key={item.id} item={item} onClick={handleItemClick} />
      ))}
    </div>
  );
}
```

### Decision Tree
```
Should I memoize?
├── Is child re-rendering with same props? → YES → React.memo
├── Is computation expensive (filter, sort, transform)? → YES → useMemo
├── Is function passed to memoized child? → YES → useCallback
├── Is it a simple/cheap component? → NO → skip memo
└── Will React Compiler handle it? → YES → skip manual memo
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React.memo skips child re-render if props unchanged. useMemo caches expensive computations. useCallback caches function references for memo'd children. Only memoize when: parent re-renders frequently, child is expensive, props are referentially unstable. React Compiler will make manual memoization unnecessary."*

## 4. 🧠 MEMORY AID
**"memo = skip render. useMemo = cache value. useCallback = cache function. Only when expensive + frequent re-renders. React Compiler = auto."**
