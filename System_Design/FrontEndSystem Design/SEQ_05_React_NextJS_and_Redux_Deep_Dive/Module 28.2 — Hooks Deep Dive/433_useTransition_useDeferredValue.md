# 433 – useTransition and useDeferredValue

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`useTransition` marks state updates as non-urgent — they can be interrupted by urgent updates. `useDeferredValue` creates a deferred copy of a value that lags behind. Both keep UI responsive during expensive renders. Added in React 18 for concurrent rendering.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── useTransition ────
function SearchApp() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);             // ⚡ Urgent: update input immediately
    
    startTransition(() => {
      setResults(filterItems(value)); // 🐢 Non-urgent: can be interrupted
    });
  }

  return (
    <div>
      <input value={query} onChange={handleSearch} />
      {isPending && <Spinner />}
      <ItemList items={results} />
    </div>
  );
}

// ──── useDeferredValue ────
function FilteredList({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  
  // Expensive render uses deferred (lagging) value
  const filteredItems = useMemo(
    () => items.filter(item => item.name.includes(deferredQuery)),
    [deferredQuery],
  );

  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      {filteredItems.map(item => <ListItem key={item.id} item={item} />)}
    </div>
  );
}

// ──── WHEN TO USE EACH ────
// useTransition: you CONTROL the state update
//   → wrap setState in startTransition
//   → provides isPending for loading indicator

// useDeferredValue: you DON'T control the state update (prop from parent)
//   → wraps a VALUE, not an update
//   → returns a lagging copy
//   → compare current vs deferred for staleness

// ──── REAL-WORLD: AUTOCOMPLETE ────
function Autocomplete() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  async function handleInput(value: string) {
    setQuery(value); // immediate
    
    startTransition(async () => {
      const results = await searchAPI(value);
      setSuggestions(results); // deferred
    });
  }

  return (
    <div>
      <input value={query} onChange={e => handleInput(e.target.value)} />
      {isPending ? <SmallSpinner /> : (
        <ul>{suggestions.map(s => <li key={s}>{s}</li>)}</ul>
      )}
    </div>
  );
}
```

### Comparison
| Feature | useTransition | useDeferredValue |
|---|---|---|
| **Controls** | State update | Value |
| **You own** | The setter | A prop/value |
| **Loading indicator** | `isPending` | Compare current vs deferred |
| **Use when** | You trigger the update | Parent triggers the update |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useTransition wraps setState to make it non-urgent — keeps input responsive while heavy renders happen in background. useDeferredValue is the same concept but for values you don't control (props). Both leverage React 18's concurrent scheduler."*

## 4. 🧠 MEMORY AID
**"useTransition = 'this setState is non-urgent' + isPending. useDeferredValue = 'this value can lag behind'. Transition = you own setter. Deferred = you receive prop."**
