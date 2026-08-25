# 423 – Concurrent Mode and Suspense Internals

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Concurrent Mode** lets React prepare multiple UI states simultaneously without blocking the main thread. **Suspense** coordinates loading states — components throw Promises when data isn't ready, Suspense catches them and shows fallback UI. Together, they enable smooth transitions between loading and loaded states.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── SUSPENSE BASICS ────
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userId="123" />
    </Suspense>
  );
}

// UserProfile "suspends" while data loads
function UserProfile({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // throws Promise if not ready
  return <h1>{user.name}</h1>;
}

// ──── HOW SUSPENSE WORKS INTERNALLY ────
// 1. React renders UserProfile
// 2. use(fetchUser) throws a Promise (data not ready)
// 3. React catches the thrown Promise
// 4. Shows <Spinner /> (the fallback)
// 5. When Promise resolves, React re-renders UserProfile
// 6. use(fetchUser) returns data, component renders normally
// 7. <Spinner /> replaced with <UserProfile />

// ──── NESTED SUSPENSE BOUNDARIES ────
function Dashboard() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Header />
      <Suspense fallback={<ChartSkeleton />}>
        <Charts />  {/* independent loading */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <DataTable />  {/* independent loading */}
      </Suspense>
    </Suspense>
  );
}
// Charts and DataTable load independently — nearest boundary catches each

// ──── CONCURRENT FEATURES ────

// useTransition — mark update as non-urgent
function SearchApp() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);           // urgent: update input
    startTransition(() => {
      setResults(filterLargeList(e.target.value)); // non-urgent: filter
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <Results data={results} />
    </>
  );
}

// useDeferredValue — defer re-render of expensive content
function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery lags behind query — won't block input

  return (
    <div style={{ opacity: query !== deferredQuery ? 0.7 : 1 }}>
      <ExpensiveList filter={deferredQuery} />
    </div>
  );
}

// ──── SuspenseList (experimental) ────
<SuspenseList revealOrder="forwards">
  <Suspense fallback={<Skeleton />}><Section1 /></Suspense>
  <Suspense fallback={<Skeleton />}><Section2 /></Suspense>
  <Suspense fallback={<Skeleton />}><Section3 /></Suspense>
</SuspenseList>
// Sections reveal in order, even if Section3 loads first
```

### Concurrent Mode Mental Model
```
Traditional (blocking):
  Click → [===RENDER===] → [=PAINT=] → responsive again
  
Concurrent (interruptible):
  Click → [=REN|interrupt|=RE|yield|NDER=] → [=PAINT=]
  ↑ Yields to browser every 5ms, stays responsive
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Concurrent Mode lets React interrupt rendering to keep the UI responsive. Suspense coordinates loading states — components throw Promises, Suspense catches them and shows fallbacks. useTransition marks updates as non-urgent. useDeferredValue lets expensive renders lag behind. These enable smooth UX during data loading and heavy computation."*

## 4. 🧠 MEMORY AID
**"Concurrent = interruptible rendering. Suspense = throw Promise → show fallback → resolve → show content. useTransition = non-urgent updates. useDeferredValue = lagging value."**
