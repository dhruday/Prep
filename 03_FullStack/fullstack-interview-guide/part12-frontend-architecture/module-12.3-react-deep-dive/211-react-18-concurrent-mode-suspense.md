# React 18 — Concurrent Mode, Automatic Batching, Suspense
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Concurrent Mode**: React 18's rendering model where renders are interruptible; React can pause a low-priority render to handle urgent user input, then resume or restart the render; enabled by default with `createRoot()` (replaces `ReactDOM.render()`)
- **Automatic Batching**: React 18 batches ALL state updates together regardless of where they happen — inside `setTimeout`, Promises, native event listeners, and React event handlers; previously (React 17), only React event handlers were batched; one render per batch of updates instead of one render per setState call; opt out with `flushSync()` if an immediate DOM update is required
- **`startTransition`**: marks a state update as non-urgent (a "transition"); React can interrupt the transition's render to handle urgent interactions; returns `[isPending, startTransition]`; use for: expensive list filtering, tab switching, route transitions where input responsiveness is more important than immediate result rendering
- **`useDeferredValue`**: wraps a value; React renders with the old value immediately (fast), then re-renders with the deferred new value when idle; similar to `startTransition` but for VALUES not SET calls; use when you can't control the setState that triggers the expensive render
- **`Suspense` for data fetching**: React suspends rendering a component subtree and shows a fallback (`<Suspense fallback={<Spinner/>}>`) while awaiting async resources; the component "throws" a Promise during render; when the Promise resolves, React retries the render; works with React Query, SWR, Next.js, Relay — not raw `useEffect`
- **`Suspense` + `lazy()`**: code splitting with `React.lazy(() => import('./Component'))` — shows fallback while the JS chunk downloads; most common Suspense use case in non-RSC apps

---

## 1. One-Line Definition
React 18's Concurrent Mode makes rendering interruptible through `createRoot`, automatic batching eliminates redundant renders across all async contexts, and Suspense provides a declarative loading state primitive that co-locates loading UI with the component that owns the async resource.

---

## 2. The Problem It Solves

### Before React 18 — Automatic Batching Gap

```javascript
// React 17 behavior in a setTimeout callback:
setTimeout(() => {
  setCount(c => c + 1);   // triggers render 1
  setFlag(f => !f);        // triggers render 2
  // Two separate renders! Both could have been one.
}, 1000);
```

In React 17, batching only worked inside React event handlers (onClick, onChange). `setTimeout`, `fetch().then()`, or native DOM event listeners triggered one render per `setState` call. A developer chaining two state updates after an API response got two consecutive renders — wasted work.

### Before React 18 — Blocking Renders

A search input with live filtering of 10,000 items. User types quickly. Each keystroke triggers a `setState`, which starts a synchronous render of the filtered list. Each render takes 40ms. Typing at 8 characters per second = 8 × 40ms = 320ms of pure render time per second, with each render blocking the input field's visual update. The input lags.

With `startTransition`: the input update is urgent (render immediately), the list refilter is non-urgent (React 18 can interrupt it for the next keystroke). The input never lags — the list may be briefly out of date with a `isPending` indicator.

---

## 3. How It Works Internally

### createRoot — Enabling Concurrent Features

```
React 17 legacy mode (ReactDOM.render):
  Blocking, synchronous renders
  No automatic batching in async contexts
  Renders cannot be interrupted
  
  ReactDOM.render(<App />, document.getElementById('root'));

React 18 concurrent mode (createRoot — ALL new apps should use this):
  Interruptible renders (Fiber's render phase can be paused/restarted)
  Automatic batching everywhere
  Concurrent features unlock: startTransition, useDeferredValue, Suspense for data
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
  
  createRoot does not change your component code — it changes how React
  schedules and commits renders. Components are unaware of whether they're
  in legacy or concurrent mode.
```

### Automatic Batching — How React 18 Collapses Multiple setState Calls

```
React 17 batching (only in React event handlers):
  onClick handler:
    setA(1) → batched
    setB(2) → batched
    → ONE render with A=1, B=2 ✓
    
  setTimeout callback:
    setA(1) → render (sync)
    setB(2) → render (sync)
    → TWO renders ✗ (redundant work)
    
  Promise.then:
    setA(1) → render
    setB(2) → render
    → TWO renders ✗

React 18 automatic batching (everywhere with createRoot):
  setTimeout:
    setA(1) → collected
    setB(2) → collected
    → ONE render with A=1, B=2 ✓ (React 18 batches by default)
    
  Event handler: same as before, one render ✓
  Promise.then: same as event handler now ✓
  
  Opt-out with flushSync:
    flushSync(() => setA(1)); // Immediate synchronous render NOW
    setB(2);                   // Another render
    // Two renders — only use when DOM must be measured between updates
```

### Transitions — Priority Scheduling

```
Two priority tiers in React 18:
  URGENT (default): typing, clicking, pressing — must render without delay
  TRANSITION (opt-in): state updates that produce large render work and can be delayed

Without startTransition:
  User types → setQuery(input.value) → setResults(filter(allItems, input.value))
  Both updates trigger ONE render (auto-batched) — but that one render has
  BOTH the input update AND the 40ms list filtering. Input feels laggy.

With startTransition:
  User types → setQuery(input.value)  ← URGENT render (fast, shows typed character)
             → startTransition(() => setResults(filtered)) ← TRANSITION (may be interrupted)
  
  React renders the urgent update first (setQuery) — instantly shows typed character
  Then starts the transition render (setResults)
  If user types another character BEFORE the transition render completes:
    React DISCARDS the in-progress transition render
    Starts fresh with the new query value
  
  Result: input is always responsive; list may briefly lag; isPending shows spinner

Internals: React assigns each update a "lane" (a bit in a bitmask)
  URGENT = SyncLane (highest priority)
  TRANSITION = TransitionLane (lower priority, interruptible)
  IDLE = IdleLane (lowest, for background work)
  React's scheduler processes lanes in priority order,
  using MessageChannel to yield between renders.
```

### Suspense — Declarative Loading States

```
How Suspense works in rendering:

Without Suspense (traditional loading state):
  function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      fetchUser(userId).then(setUser).finally(() => setLoading(false));
    }, [userId]);
    
    if (loading) return <Spinner />;
    return <Profile user={user} />;
  }
  Problem: loading state is INSIDE the component that needs data.
           Can't composably nest loading states for multiple async resources.
           Race conditions between rapid userId changes and useEffect.

With Suspense + data library (React Query / SWR / Next.js fetch):
  function UserProfile({ userId }) {
    // useSuspenseQuery: throws a Promise if data is loading → Suspense catches it
    const { data: user } = useSuspenseQuery(['user', userId], () => fetchUser(userId));
    // If data is loading, this line throws a Promise
    // React catches the throw → shows the nearest <Suspense fallback>
    // When Promise resolves → React retries rendering this component
    // Component only runs AFTER data is available — clean, no loading state needed
    return <Profile user={user} />;
  }
  
  function App() {
    return (
      <Suspense fallback={<Skeleton />}>
        <UserProfile userId="123" />
      </Suspense>
      // Skeleton shows while UserProfile is loading
      // When data ready: React renders UserProfile without the fallback
    );
  }

Nested Suspense for granular loading:
  <Suspense fallback={<PageSkeleton />}>      {/* Outermost: full page load */}
    <Header />
    <Suspense fallback={<ContentSkeleton />}> {/* Middle: content area */}
      <MainContent />
      <Suspense fallback={<SidebarSkeleton />}> {/* Inner: sidebar */}
        <Sidebar />
      </Suspense>
    </Suspense>
  </Suspense>
  
  React shows the nearest ancestor fallback for the component that suspends.
  Header and MainContent can render independently of Sidebar loading.
```

---

## 4. The Code

### Wrong Way — Missing React 18 Upgrade Patterns

```typescript
// ❌ WRONG — Legacy ReactDOM.render (no React 18 concurrent features)
import ReactDOM from 'react-dom';

// Opt out of ALL React 18 features:
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
// No automatic batching in setTimeout/Promises
// No concurrent mode
// No Suspense for data (Suspense for lazy() still works in legacy mode)

// ❌ WRONG — Not using startTransition for expensive renders
function SearchPage({ allProducts }: { allProducts: Product[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(allProducts);
  
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // Both updates in one batch — but the render must do BOTH
    // the query update AND the large filtering on every keystroke
    setResults(allProducts.filter(p => 
      p.name.toLowerCase().includes(e.target.value.toLowerCase())
    ));
    // Input lags because the filter dominates the render time
  };
}

// ❌ WRONG — Suspense boundary in the wrong place (too coarse)
function App() {
  return (
    // ❌ One giant Suspense boundary: if Header suspends for ANY reason,
    // the entire App goes to the spinner — user loses context completely
    <Suspense fallback={<FullPageSpinner />}>
      <Header />
      <MainContent />
      <Sidebar />
      <Footer />
    </Suspense>
  );
}

// ❌ WRONG — Using Suspense with useEffect-based fetching
function OldStyleData({ id }: { id: string }) {
  const [data, setData] = useState(null);
  
  // useEffect fetching does NOT integrate with Suspense
  // React has no way to know this component is loading
  // Suspense boundary above this component will NOT show its fallback
  useEffect(() => {
    fetch(`/api/data/${id}`).then(r => r.json()).then(setData);
  }, [id]);
  
  return data ? <DataView data={data} /> : <Spinner />; // manual loading state
}
```

> **Why this fails:** `ReactDOM.render` opts out of all React 18 features. Not using `startTransition` for heavy renders keeps input lag. Single coarse Suspense boundaries degrade gracefully poorly. `useEffect` fetching doesn't integrate with Suspense — the declarative loading model doesn't work.

### Right Way — React 18 Patterns in Production

```typescript
// ✅ RIGHT — React 18 entry point with createRoot
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    {/* StrictMode in React 18 double-invokes effects in development
        to help catch bugs — normal and expected */}
    <App />
  </React.StrictMode>
);

// ✅ RIGHT — startTransition for search-as-you-type with 10K+ items
function SearchPage({ allProducts }: { allProducts: Product[] }) {
  const [query, setQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(allProducts);
  const [isPending, startTransition] = useTransition();
  
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Urgent: update the input field immediately (user sees their typing)
    setQuery(value);
    
    // Non-urgent: expensive filter — can be interrupted by next keystroke
    startTransition(() => {
      // If the user types another character before this completes,
      // React discards this render and starts over with the latest value
      setFilteredProducts(
        allProducts.filter(p =>
          p.name.toLowerCase().includes(value.toLowerCase()) ||
          p.sku.includes(value)
        )
      );
    });
  };
  
  return (
    <div>
      <input value={query} onChange={handleInput} placeholder="Search products..." />
      {/* isPending: true while transition render is in-progress */}
      {isPending && <div className="search-indicator">Updating results...</div>}
      <ProductGrid 
        products={filteredProducts} 
        // Visually dim the results while filtering to signal staleness
        style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }} 
      />
    </div>
  );
}

// ✅ RIGHT — useDeferredValue for when you can't control the setState
// Example: results component receives data as a prop, can't use startTransition
// on the parent's setResults call
function ExpensiveResults({ data }: { data: DataItem[] }) {
  // deferredData: React renders with OLD data immediately (fast),
  // then schedules a background render with the new data
  const deferredData = useDeferredValue(data);
  
  // isStale: true when deferredData !== data (new data available but not rendered yet)
  const isStale = deferredData !== data;
  
  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      {/* Renders with old (deferred) data while new data is processing */}
      <DataGrid data={deferredData} />
    </div>
  );
}

// ✅ RIGHT — Suspense with React Query (recommended data fetching)
// React Query's useSuspenseQuery throws a Promise if data isn't ready
import { useSuspenseQuery } from '@tanstack/react-query';

function UserOrders({ userId }: { userId: string }) {
  // This throws a Promise if data is loading → nearest Suspense shows fallback
  // Component body only runs when data is available — no loading state needed here
  const { data: orders } = useSuspenseQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchUserOrders(userId),
  });
  
  return <OrderList orders={orders} />;
}

// ✅ RIGHT — Granular Suspense boundaries with fallbacks at multiple levels
function DashboardPage({ userId }: { userId: string }) {
  return (
    <div className="dashboard">
      {/* Header loads instantly, no Suspense needed */}
      <Header />
      
      <div className="dashboard-body">
        {/* Each section has its own Suspense — loads independently */}
        <Suspense fallback={<ProfileSkeleton />}>
          <UserProfileCard userId={userId} />
        </Suspense>
        
        <Suspense fallback={<OrdersSkeleton rows={5} />}>
          <RecentOrders userId={userId} />
        </Suspense>
        
        {/* Nested: outer covers both; inner covers just the chart */}
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsSummary userId={userId} />
          <Suspense fallback={<ChartSkeleton />}>
            {/* Chart data is large and slow — isolated fallback */}
            <RevenueChart userId={userId} />
          </Suspense>
        </Suspense>
      </div>
    </div>
  );
}

// ✅ RIGHT — React.lazy + Suspense for code splitting
// The AdminPanel JS chunk only downloads when an admin visits
const AdminPanel = React.lazy(() => import('./AdminPanel'));

function App() {
  const { isAdmin } = useAuth();
  
  return (
    <div>
      <Navigation />
      {isAdmin && (
        // Downloads ./AdminPanel.js only when isAdmin becomes true
        // Shows spinner while the chunk loads (typically <200ms on fast CDN)
        <Suspense fallback={<div>Loading admin panel...</div>}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}

// ✅ RIGHT — flushSync for the rare case where DOM must update synchronously
import { flushSync } from 'react-dom';

function ScrollToBottomChat({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const addMessage = (newMessage: Message) => {
    // Must update the DOM BEFORE scrolling (DOM must have new message to scroll to it)
    // flushSync forces a synchronous render — only use when DOM measurement follows
    flushSync(() => setMessages(prev => [...prev, newMessage]));
    
    // DOM is now updated (synchronously) — new message is in the DOM
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Without flushSync: setMessages would batch → DOM update deferred → 
    //                     scrollIntoView runs before new message is rendered → no scroll
  };
  
  return (
    <div>
      {messages.map(m => <ChatMessage key={m.id} message={m} />)}
      <div ref={bottomRef} />
    </div>
  );
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What changed in React 18 and how do you upgrade an existing app?"

**Hruday's answer:**
> The three key changes in React 18:
>
> First, automatic batching. React 17 only batched state updates inside React event handlers. In React 18, ALL state updates anywhere — `setTimeout`, Promises, native event listeners — are batched into a single render. This means fewer unnecessary renders with zero code changes.
>
> Second, concurrent features become available. `startTransition` lets you mark non-urgent updates so React can interrupt their renders when the user interacts. `useDeferredValue` defers a value's propagation to avoid blocking urgent updates. These are opt-in via the APIs — concurrent mode is enabled by `createRoot`, but the concurrent features only activate when you use those APIs.
>
> Third, Suspense for data fetching works with concurrent mode. Libraries like React Query 5 and SWR support `useSuspenseQuery` which integrates cleanly with `<Suspense>` fallbacks. In React 17, Suspense only worked for lazy code splitting.
>
> Migration: the only required change is replacing `ReactDOM.render()` with `createRoot().render()`. That's literally it for most apps. React 18 is backwards compatible — all existing components work without modification. The new features are additive. Potential breakage: React 18's Strict Mode double-invokes effects in development (to catch cleanup bugs) — components that don't clean up useEffect subscriptions may behave differently in dev. That's a feature, not a regression.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between `startTransition` and `useDeferredValue`? When would you use each?"

**Hruday's answer:**
> Both defer non-urgent rendering, but they apply at different points in the code.
>
> `startTransition` wraps a STATE SETTER call. Use it when you have control of the setState and want to mark that update as non-urgent: "this state update may cause an expensive render, yield to urgent inputs."
>
> `useDeferredValue` wraps a VALUE. Use it when you receive data as a PROP or from context and don't control the setState that produced it. It tells React: "give me the deferred version of this value — render immediately with the old value, rerender with the new value when idle."
>
> Concrete scenario: if I OWN the component that calls `setResults(filtered)`, I use `startTransition(() => setResults(...))`. If a parent component passes `results` as a prop and I can't change the parent's setState, I use `const deferredResults = useDeferredValue(results)` in my component and render with `deferredResults`.
>
> They're conceptually equivalent under the hood — both defer work to the transition lane in React's scheduler. The API difference is purely about where in the code you have control.

---

### Q3 — Practical
**Interviewer asks:** "Why doesn't Suspense work with `useEffect`-based data fetching?"

**Hruday's answer:**
> Suspense works by React catching a thrown Promise during the RENDER phase. When a component throws a Promise, React pauses that subtree, shows the nearest Suspense fallback, and when the Promise resolves, React retries rendering the component.
>
> `useEffect` runs AFTER the render phase — it's a post-commit effect. By the time `useEffect` runs, the component has already rendered (with `null` data or the `loading` state). React has no opportunity to catch anything during the effect.
>
> For Suspense integration, data fetching must happen during the RENDER phase itself — the data layer must be able to throw a Promise when the data isn't ready yet. This is what React Query's `useSuspenseQuery`, SWR's `useSWRSuspense`, and React server components' `fetch` do. They maintain a cache: first call = "not in cache, throw Promise"; second call (after Promise resolves) = "in cache, return data." React retries the render after the Promise resolves and the second call succeeds.
>
> This is why `data fetching should move to the framework/library layer` is the React team's recommendation for React 18+. The data libraries handle the throw-and-retry machinery. `useEffect` fetching can never integrate with Suspense without essentially reimplementing that machinery from scratch.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Concurrent Mode is automatically enabled by upgrading to React 18" | "Once I npm install react@18, I get concurrent mode" | Concurrent mode requires using `createRoot` (`react-dom/client`); if you upgraded React 18 but kept `ReactDOM.render()`, you're in legacy mode — NO automatic batching, NO transitions, NO concurrent features; `createRoot` is the migration gate; check with React DevTools — it shows "Concurrent" or "Legacy" rendering mode |
| "`startTransition` makes the render faster" | "`startTransition` speeds up the list filtering" | `startTransition` does NOT make the render faster; the filter still takes the same amount of CPU work; what it does: it PRIORITISES the input field update over the list update, so the input feels responsive even while the list render is pending; the total work is the same or slightly more (if the transition is interrupted and restarted, it rerenders from scratch) |
| "Suspense requires Next.js" | "Suspense only works in Next.js" | Suspense for lazy/code-splitting works in ANY React 16.6+ app; Suspense for data fetching works in ANY React 18 app that uses a compatible data library (React Query v5+, SWR, Relay); Next.js adds streaming SSR Suspense (server sends partial HTML, client streams component HTML as they load) — that's a Next.js feature, not core React; |
| "React.StrictMode double renders are bugs" | "In development, my useEffect runs twice — there's a bug" | React 18 Strict Mode intentionally double-mounts components in development to surface cleanup problems; if your useEffect runs twice, React is testing whether your cleanup works correctly; the second mount simulates what happens on fast-refresh or if React needs to re-mount for concurrent rendering; if double-invocation causes bugs, your cleanup is missing; this is a feature, not a bug |

---

## 7. Hruday's Real Experience Hook
> "The `startTransition` pattern became directly applicable at SAP when we built a procurement catalog search. The catalog had 15,000 SKUs loaded client-side, and the search filter was re-running on every keystroke across multiple attributes (name, SKU, category, description). On a MacBook it was fine. On the IT-standardised Windows laptops our procurement team used — real devices with constrained CPUs — the input lagged by 200-300ms per keystroke.
>
> Before React 18: we debounced at 300ms. This helped, but debouncing means the results intentionally lag 300ms even when the CPU has capacity (`startTransition` doesn't lag when the machine is fast — it only yields when the render would have blocked an urgent input).
>
> After migrating to React 18's `createRoot` and wrapping the filter setState in `startTransition`: the input became instantaneous on all devices. The `isPending` indicator showed a brief shimmer on slow machines during the filter computation. On fast machines, the transition completed before any visual feedback was needed — instant experience end-to-end. We removed the artificial 300ms debounce entirely.
>
> The migration was 3 lines of code: replace `ReactDOM.render()` with `createRoot().render()`, add `useTransition()` to the search component, wrap the filter setter in `startTransition`. Production validated: INP on the search field went from 320ms average to 18ms on the constrained hardware profile."

---

## 8. Scale Evolution

**Standard SPA, 2024+ →** Upgrade to `createRoot`. Add `startTransition` to any filter/sort/search that takes >30ms to render. Add `React.lazy` + `Suspense` for route-level code splitting with per-route fallback. These are table-stakes React 18 patterns.

**Data-heavy consumer app →** React Query 5 with `useSuspenseQuery` for all data fetching — eliminates manual loading/error state from every component; Suspense boundaries for parallel loading (multiple sections loading independently); `useDeferredValue` for live search results in product catalogs.

**Next.js / full-stack React 19+ →** Streaming SSR: `Suspense` boundaries stream HTML from the server incrementally; the above-the-fold content renders first, deferred sections arrive later (server-side; the browser renders each piece as it streams); `use()` hook replaces much of `useEffect` for data; Server Components compose with Suspense for zero-JS sections of the page.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Checkout forms with live validation (startTransition for expensive validation renders); payment method selector with dynamic options (Suspense for lazy-loading payment method components); real-time currency/EMI calculation updates (useDeferredValue for display) | startTransition for validation; Suspense for payment option chunking; React 18 createRoot migration story |
| Swiggy / Meesho | Search-as-you-type for restaurant/product discovery — core feature; live cart total calculation while browsing (useDeferredValue); lazy-loaded sections for below-the-fold content (React.lazy + Suspense); concurrent rendering for smooth 60fps scroll while filter updates | startTransition for search filter; code splitting with Suspense for menu sections; isPending loading states |
| Adobe / Microsoft | Concurrent rendering for document/canvas operations; Adobe's Firefly generative UI uses Suspense for async generations; Microsoft Fluent 2 components designed for React 18 concurrent mode; staff-level interviewers ask about React scheduler internals (lanes, MessageChannel yield) | Scheduler internals (lanes); Suspense data integration; streaming SSR for document views |
| SAP Labs | Direct experience: startTransition used for procurement catalog search performance fix (15K SKU filter); INP improvement from 320ms to 18ms; React 18 migration from createRoot; removed artificial debounce in favour of startTransition | Real startTransition production story; createRoot migration; Concurrent Mode enabling for existing app |

---

## 10. Related Topics — What to Study Next

- **Topic 209 — React Fiber and Reconciliation** — Concurrent Mode is Fiber's interruptibility exposed through a public API; `startTransition` works by assigning transition updates to a low-priority lane in the Fiber scheduler; every concurrent feature in React 18 is an application of the Fiber architecture described in Topic 209; understanding Fiber explains HOW concurrent mode achieves interruptibility
- **Topic 212 — React Server Components and Server Actions** — React 19/Next.js extends Suspense to the server layer; Server Components suspend on the server (not client) and stream HTML to the browser; `<Suspense>` boundaries control which parts of the server-rendered page stream first vs later; Concurrent Mode and Server Components together form the full stack React rendering model
- **Topic 210 — All React Hooks** — `useTransition`, `useDeferredValue`, and `useId` are React 18 additions to the hooks API; they build directly on the `useState`/`useReducer` mental model; understanding all hooks is a prerequisite for using the concurrent hooks correctly (especially avoiding misplacing transitions inside effects)
- **Topic 235 — Code Splitting and Lazy Loading** — `React.lazy() + Suspense` is the primary code splitting pattern in React apps; Topic 235 covers the full strategy: what to split, how to split, how to measure the impact (bundle analyser, Lighthouse waterfall), and how Suspense boundaries affect the loading waterfall in a Next.js app

---

*Part 12 · React 18 — Concurrent Mode, Automatic Batching, Suspense · Full Stack Interview Guide · Hruday D · 2026*
