# 253 – Performance-Aware Components

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Performance-Aware Components are built with rendering efficiency in mind from the start — using **memoization** (React.memo, useMemo, useCallback), **virtualization** for large lists, **code splitting** for heavy components, **avoiding unnecessary re-renders**, and **optimizing expensive computations**. In machine coding rounds, writing performant code unprompted shows that you think about production realities, not just making things work. Key principle: don't optimize prematurely, but know the patterns so you can apply them when the situation calls for it.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### React Re-render Rules

A component re-renders when:
1. Its state changes
2. Its parent re-renders (unless wrapped in React.memo)
3. Its context value changes
4. Its custom hook's state changes

### Optimization Techniques

```typescript
// 1. React.memo — skip re-render if props haven't changed
const ExpensiveList = React.memo(function ExpensiveList({ items }: { items: Item[] }) {
  return items.map(item => <ItemCard key={item.id} item={item} />);
});

// 2. useMemo — cache expensive computations
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// 3. useCallback — stable function references for memoized children
const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []); // stable reference — won't cause child re-renders

// 4. Lazy loading — code split heavy components
const RichEditor = React.lazy(() => import('./RichEditor'));
```

### The "Measure First" Principle

```typescript
// Use React DevTools Profiler to identify ACTUAL bottlenecks
// Don't memo everything — it has its own cost (comparison overhead)

// ❌ Over-optimization — memo on a simple component that renders in < 1ms
const Title = React.memo(({ text }: { text: string }) => <h1>{text}</h1>);

// ✅ Worth memoizing — component with expensive render or many children
const DataTable = React.memo(({ rows, columns, onSort }: DataTableProps) => {
  // renders 1000+ rows
});
```

### State Structure for Minimal Re-renders

```typescript
// ❌ Single state object — any change re-renders everything
const [state, setState] = useState({ search: '', filter: '', sort: '', page: 0 });

// ✅ Separate state — only affected components re-render
const [search, setSearch] = useState('');
const [filter, setFilter] = useState('');
const [sort, setSort] = useState('');
const [page, setPage] = useState(0);
```

### Anti-Patterns

- ❌ `useMemo`/`useCallback` everywhere — adds complexity with negligible benefit for simple components
- ❌ Anonymous functions in JSX for memoized children — breaks React.memo comparison
- ❌ Using index as key in dynamic lists — causes unnecessary DOM recreation
- ❌ Storing derived data in state — recalculates wrong, use useMemo

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I improved our application's Lighthouse performance score from 60 to 95. Key optimizations included: memoizing heavy OData response processing, lazy loading non-critical Fiori components, virtualizing long table views, and eliminating unnecessary change detection cycles in our Angular modules.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I write performance-aware code from the start using three principles: (1) separate state to minimize re-render scope, (2) memoize expensive computations with useMemo, not simple ones, (3) stabilize callbacks with useCallback when passing to memoized children. I lazy-load heavy components with React.lazy. For lists with 100+ items, I virtualize. I never optimize blindly — I profile first with React DevTools and focus on components that actually contribute to render time."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Performance-aware search + filter + list
function ProductSearch() {
  const [query, setQuery] = useState('');
  const [products] = useState<Product[]>(largeProductList);
  
  const filtered = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  const handleSelect = useCallback((id: string) => {
    navigate(`/products/${id}`);
  }, []);

  return (
    <>
      <SearchInput value={query} onChange={setQuery} />
      <ProductList items={filtered} onSelect={handleSelect} />
    </>
  );
}

const ProductList = React.memo(function ProductList({ items, onSelect }: { items: Product[]; onSelect: (id: string) => void }) {
  return <Virtuoso data={items} itemContent={(_, item) => <ProductCard key={item.id} product={item} onSelect={onSelect} />} />;
});
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Performance = Separate State + Memo Expensive + useCallback for Memoized Children + Lazy Load + Virtualize."** Don't memo everything — only components with expensive renders. Separate state variables to limit re-render scope. useCallback stabilizes handlers for React.memo children. Lazy load heavy components. Virtualize lists with 100+ items. Profile first, optimize second.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Shows production experience. Writing performant code unprompted signals senior-level thinking.
**How:** Separate state, useMemo for expensive computations, useCallback for memoized children, React.lazy for code splitting, virtualization for large lists. Profile with DevTools before optimizing.
**Companies:** All four evaluate — Microsoft/Adobe test deeply on React performance patterns.
