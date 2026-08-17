# Local vs Global State — When to Go Global
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Local state**: state owned by a single component — lives in `useState`, `useReducer`, or a component-scoped service; destroyed when the component unmounts; no other component can read or write it directly; the default choice — always start here
- **Global state**: state lifted out of components into a shared store (Redux, NgRx, Zustand, BehaviorSubject service); any component in the app can read it; persists across route changes (until the store is reset); the overhead is real — choose it only when the problem genuinely requires it
- **The decision rule**: ask "do two or more components that are NOT parent-child need to share this value?" If yes, global. If no, local. If you're unsure, keep it local and lift later.
- **Four reasons to go global**: (1) shared state between distant components (navbar cart count + checkout page), (2) state that must survive route navigation (user session, filters), (3) server data needed by multiple views simultaneously, (4) complex state transitions that need audit history or time-travel debugging
- **The over-globalisation trap**: putting EVERYTHING in Redux because "it's the project standard" — local mutation is fine and faster; global state for every form field is the most common over-engineering mistake in Angular/React teams
- **Server state is not UI state**: data fetched from an API is not really "your" state — it's a cache of the server's state; React Query / TanStack Query / RTK Query exist specifically to manage this cache; mixing server data into Redux/NgRx creates double-maintenance burdens
- ✅ **Hruday's anchor**: SAP Labs — Redux store audit found 60% of slices were holding data only one component used; extracted to local state and removed 800 lines of boilerplate

---

## 1. One-Line Definition
Local state is private to one component (fast, simple, auto-cleaned), global state is shared across the app (powerful, persistent, but costly to maintain) — and the discipline of choosing correctly determines whether your state management is an asset or a liability.

---

## 2. The Problem It Solves

A team builds a React e-commerce app. Every state decision defaults to Redux because "that's the architecture." The product page puts `currentProductImages` into Redux. The form page puts `inputValue` into Redux. The modal puts `isVisible` into Redux. After six months the Redux store has 40 slices. Opening Redux DevTools shows 200 dispatched actions for each page load. Every form keystroke dispatches an action. Debugging is noise. Performance degrades from unnecessary re-renders across the global state graph.

The problem is not Redux — Redux is the right tool for the right state. The problem is state placement. When every state decision is "put it in Redux," the genuine signal of "this state is complex and shared" is lost in noise.

Conversely, a team that keeps everything local runs into a different wall: a shopping cart implemented as local state in a CartPage component. The user navigates to Checkout. The CartPage unmounts. The cart is empty. The Checkout page starts fresh. Cart data had to be global state because it needed to survive navigation.

The real skill is knowing which state lives where — and the rule is simpler than most tutorials make it.

---

## 3. How It Works Internally

### The Decision Tree

```
NEW STATE DECISION:

Is this state only used by THIS component and its direct children?
  YES → useState / useReducer (React) or component property (Angular)
  NO  → continue...

Does this state need to survive when this component unmounts?
  (e.g., search filters that must persist when user navigates away and back)
  YES → global store
  NO  → continue...

Do two or more DISTANT components (non parent-child) need to read/write this state?
  YES → global store
  NO  → continue...

Is this state actually server data (API responses, fetched lists)?
  YES → React Query / RTK Query / SWR (NOT Redux or NgRx)
  NO  → continue...

Is this state shared between siblings that share a common parent?
  YES → lift state to their closest common ancestor (prop drilling if close,
        Context if too deep)
  NO  → keep it local

RULE OF THUMB:
  Start local. Lift when needed. Go global only when lifting breaks.
```

### State Types — What Lives Where

```
STATE CATEGORY        | WHERE IT LIVES           | EXAMPLE
----------------------|--------------------------|---------------------------
UI state (local)      | useState / component var | modal open, tab selected
                      |                          | form field value, hover state
Form state (local)    | useForm / reactive form  | input values, validation
                      |                          | (keep local until submit)
Server state (cache)  | React Query / RTK Query  | product list, user profile
                      |                          | orders, search results
Shared UI state       | Context / lightweight    | theme, locale, sidebar open
                      | store (Zustand / signal)  |
Complex shared state  | Redux / NgRx             | user auth, cart, permissions
                      |                          | multi-step wizard state
URL state             | Router query params      | page number, sort order, id
                      |                          | filter values (bookmarkable)

"Server state in Redux" anti-pattern:
  Redux slice: productListSlice
    loading: boolean
    error: string | null
    data: Product[]
    lastFetched: number
  → You're reinventing React Query.
  → Cache invalidation, background updates, deduplication — all manual.
  → Use React Query: productQuery = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  → Automatic caching, refetch on focus, deduplication, loading/error states — built in.
```

---

## 4. The Code

### Wrong Way — Everything in Global Store

```typescript
// ❌ WRONG — all state dumped into Redux regardless of scope

// Redux slice for modal that's only used in ONE component:
const modalSlice = createSlice({
  name: 'modal',
  initialState: { isOpen: false, title: '' },
  reducers: {
    openModal: (state, action: PayloadAction<string>) => {
      state.isOpen = true;
      state.title = action.payload;
    },
    closeModal: (state) => {
      state.isOpen = false;
    }
  }
});
// ❌ This state is used only by ProductModal.tsx.
// It doesn't need to persist. No other component cares about it.
// Every open/close dispatches to a global store, triggers re-renders across
// any component that connects to this slice, shows up as noise in DevTools,
// adds reducer + action + selector boilerplate for zero benefit.

// Redux slice for server data (reinventing React Query):
const productsSlice = createSlice({
  name: 'products',
  initialState: {
    data: [] as Product[],
    loading: false,
    error: null as string | null,
    lastFetched: 0
  },
  reducers: { /* ... */ },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, state => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.lastFetched = Date.now();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed';
      });
  }
});
// ❌ You've written cache management by hand.
// Now you need to handle: stale data, background refetch, deduplication,
// parallel requests, retries, pagination cursor management — all manually.
// React Query / RTK Query does ALL of this in 2 lines.

// ❌ Form state in global store (extreme anti-pattern):
const checkoutFormSlice = createSlice({
  name: 'checkoutForm',
  initialState: { name: '', cardNumber: '', expiry: '', cvv: '' },
  reducers: {
    updateField: (state, action: PayloadAction<{ field: string; value: string }>) => {
      (state as any)[action.payload.field] = action.payload.value;
    }
  }
});
// ❌ Every keystroke dispatches to global store.
// Card number and CVV are now in Redux DevTools — visible to any extension
// that reads Redux state. This is a SECURITY ISSUE for sensitive form fields.
// Forms are inherently local (draft state before submit).
```

> **Why this fails in production:** global state for local concerns creates noise in DevTools, unnecessary re-renders in unrelated components, boilerplate tax for zero sharing benefit, and potential security issues (sensitive fields in observable global state).

### Right Way — Correct State Placement per Category

```typescript
// ✅ RIGHT — React: state at the right level

// 1. LOCAL UI STATE — modal visibility (used by one component only)
const ProductModal: React.FC<{ productId: string }> = ({ productId }) => {
  // ✅ Local useState — no other component cares about this modal being open
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>View Product</button>
      {isOpen && (
        <Modal onClose={() => setIsOpen(false)} title="Product Details">
          <TabBar tabs={['details', 'reviews']} active={activeTab} onChange={setActiveTab} />
          {activeTab === 'details' && <ProductDetails id={productId} />}
          {activeTab === 'reviews' && <ProductReviews id={productId} />}
        </Modal>
      )}
    </>
  );
};
// Destroyed when ProductModal unmounts. Zero global impact. Zero boilerplate.

// 2. SERVER STATE — use React Query (not Redux)
const ProductList: React.FC = () => {
  // ✅ React Query handles: loading state, error state, caching, deduplication,
  // background refetch, retry, stale time — all in one hook
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
    staleTime: 5 * 60 * 1000,  // 5 min: don't refetch if data was fetched < 5 min ago
  });
  
  if (isLoading) return <ProductSkeleton />;
  if (error) return <ErrorBanner />;
  return <>{products?.map(p => <ProductCard key={p.id} product={p} />)}</>;
};
// No Redux slice needed. No hand-written loading/error boolean. No manual cache.

// 3. GLOBAL SHARED STATE — cart survives navigation, multiple components read it
// This is the CORRECT use case for global state
// (see Topic 225 for Redux Toolkit implementation details)
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[], total: 0 },
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
      state.total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }
  }
});
// ✅ Correct use: NavBar reads cart.items.length, CartPage reads all items,
// CheckoutPage reads total. Survives any navigation. Three distant components, one truth.

// 4. FORM STATE — local until submit
const CheckoutFormComponent: React.FC = () => {
  // ✅ React Hook Form keeps form state local to the component
  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutData>();
  const dispatch = useAppDispatch();
  
  const onSubmit = (data: CheckoutData) => {
    // ✅ Only dispatch to global store AFTER form submission — submit the result, not the draft
    dispatch(submitOrder(data));
    // The form values themselves never enter the global Redux store.
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: true })} />
      {/* ✅ Sensitive fields stay in React Hook Form's local state — NOT in Redux DevTools */}
      <input {...register('cardNumber')} type="text" />
      <button type="submit">Place Order</button>
    </form>
  );
};
```

```typescript
// ✅ RIGHT — Angular: same principles with NgRx vs services vs signals

// LOCAL — component-scoped (Angular)
@Component({ ... })
export class FilterPanelComponent {
  // ✅ Local to this component — no NgRx, no service
  isExpanded = signal(false);
  selectedCategories = signal<string[]>([]);
  
  toggle() { this.isExpanded.update(v => !v); }
}

// GLOBAL SHARED STATE — NgRx (correct use: auth state used by guards + navbar + profile)
// (Full NgRx details in Topic 226)

// SERVER STATE — Angular: use toSignal + HTTP + shareReplay, or a query library
// Not in NgRx store — NgRx is for client-owned shared state, not remote data cache
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you decide whether to put state in a component or a global store?"

**Hruday's answer:**
> My first question is always: "does more than one component — and not just a parent-child pair — need to read or write this value?" If the answer is yes, and if those components can't easily share a nearest common ancestor without passing props through unrelated components, then global state earns its place.
>
> The second question is: "does this state need to survive when the component using it unmounts?" For cart contents, user authentication, and multi-step wizard progress, the answer is yes — those belong in a global store. For a form's draft values, a modal's open/closed status, or a tab's active index, the answer is no — those stay in local `useState` or local component properties.
>
> The third question is specifically about server data: "is this actually a cache of an API response?" If yes, it doesn't belong in Redux at all. It belongs in React Query or RTK Query, which handles caching, background updates, and stale data automatically. Putting API responses in Redux is reinventing a data cache by hand.
>
> My default is always local state. I lift to global only when the local model breaks down. That discipline keeps the global store focussed and the DevTools readable.

---

### Q2 — SAP Experience
**Interviewer asks:** "Have you seen over-use of global state in a production codebase? What did you do?"

**Hruday's answer:**
> At SAP Labs, we ran a store audit after noticing that the Redux DevTools timeline was almost unreadable — hundreds of actions per page load, many of which looked like form input events. We used a script to find every `useSelector` call in the codebase and trace what data each component actually needed.
>
> The finding: roughly 60% of Redux slices were read exclusively by a single component. Some were server data that could be moved to RTK Query. Several were UI state like modal visibility and accordion expansion. None of these needed to be in the global store.
>
> We refactored over two sprints. Server data moved to RTK Query — which immediately gave us free features like background refetch and request deduplication. Local UI state moved back into `useState`. We removed about 800 lines of slice code, action creators, and selectors. The Redux store shrunk from 40 slices to 14 slices that were genuinely shared state — auth, user profile, cart, permissions, feature flags.
>
> The DevTools timeline became readable. Debugging state issues became faster. And the app's initial render improved measurably because fewer selector subscriptions meant less re-render work.

---

### Q3 — Deep Dive
**Interviewer asks:** "What is 'server state' and why doesn't it belong in Redux?"

**Hruday's answer:**
> Server state is data that lives on the server and that your frontend caches locally. It's not owned by the frontend — the server owns it. Your app just holds a temporary copy. Products in a catalogue, a user's order history, search results — all of these are server state.
>
> This has specific implications that Redux is not designed for. Server state goes stale — the product availability you fetched 10 minutes ago might be wrong now. Server state can be out of sync across tabs. Server state needs retry on network failure. Multiple components asking for the same data should share one request (deduplication). These are all cache management concerns.
>
> Redux doesn't know when your data is stale. It doesn't refetch when the user focuses the window. It doesn't deduplicate parallel requests for the same product. You'd have to build all of that yourself — and teams often do, poorly.
>
> React Query (or RTK Query for Redux-oriented teams) is built specifically for this problem. It stores data in a smart cache keyed by your query key, handles stale time, retries, deduplication, pagination, and background refresh. The result: less code, more correct behaviour, and a clear separation between "server's data I'm caching" (React Query) and "my app's own state" (Redux). The two-library approach is not overhead — it's the right tool for each job.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the state architecture for a checkout flow in an e-commerce app."

**Hruday's answer:**
> A checkout flow has three categories of state, each with a different home.
>
> First: cart contents — global Redux/NgRx slice. The cart must survive navigation (user browses more products mid-checkout), is written by the product listing page and read by the checkout summary, header badge, and payment page. This is textbook global state. It persists in localStorage to survive page refresh via a rehydration middleware.
>
> Second: the checkout form itself — local React Hook Form state. Name, address, card details stay in-component until the user hits Submit. Sensitive fields absolutely must NOT touch the Redux store — Redux DevTools extensions can read store state, and card numbers in DevTools is a security violation. Submit action dispatches only the sanitised, validated data — not the form draft.
>
> Third: order status after submission — React Query mutation, not Redux. The submit action triggers a React Query `useMutation`. While the mutation is in-flight, React Query provides loading state. On success, it returns the order ID for redirect. On error, it provides retry capability. The order result doesn't need to live in Redux because only the confirmation page needs it, and it can be fetched fresh, or passed via routing state.
>
> The pattern: Redux for cart (shared, persistent), React Hook Form for form draft (local, sensitive), React Query for server interactions (HTTP, not owned).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just use Redux for everything, it's consistent" | "We standardised on Redux so all state goes there" | Consistency in tooling is good; consistency in ignoring the right tool for the job is over-engineering; local `useState` for a modal visibility flag is objectively the correct answer; adding it to Redux for "consistency" creates boilerplate, DevTools noise, and potential re-render overhead while adding zero value; standardise on the decision framework, not on "always Redux" |
| "Server state fetching belongs in Redux Thunks" | "I use createAsyncThunk to fetch and store API data in Redux" | `createAsyncThunk` is valid for some complex mutation flows, but for READ operations (fetching lists, details), RTK Query or React Query is the right tool; they handle caching, deduplication, refetch-on-focus, stale time, and background updates — all things you'd write manually with thunks; RTK Query is even part of the Redux Toolkit package, so it's not "leaving Redux" — it's using the right Redux tool for the right job |
| "Context API is global state" | "I use React Context instead of Redux for global state" | Context is NOT a state manager — it's a dependency injection mechanism; every time a Context value changes, ALL consumers re-render (no selector-based subscription); for state that changes frequently (cart total, real-time data), Context causes performance problems at scale; Context is correct for state that rarely changes — theme, locale, auth user object; for frequently-updating state, use a proper state manager (Zustand, Redux) and inject it via Context only if needed |
| "Component state is too simple for complex apps" | "Complex apps need global state" | Complexity of the app doesn't determine where state should live — complexity of the SHARING PATTERN does; a large app can have mostly local state if its features are independent; a small app with bidirectional cross-component communication may need a store immediately; "the app is complex therefore Redux" is the wrong reasoning — "this specific state is shared by N distant components" is the right reasoning |

---

## 7. Hruday's Real Experience Hook
> "The SAP Labs store audit was a turning point in how our team thought about state. Before the audit, we had a culture of 'when in doubt, Redux it' — it felt safer, more testable, more 'senior' somehow. After seeing that 60% of our slices were single-consumer state, the sentiment shifted. We started asking 'does this NEED to be global?' at code review, and the default answer became no.
>
> The Redux Toolkit RTK Query migration for server data was the most impactful single change. Removing 20-odd async thunks and replacing them with RTK Query endpoint definitions gave us background refetch, request deduplication, and cache invalidation for free — things we had poorly implemented by hand. The codebase got smaller and more correct simultaneously.
>
> I now think of 'local by default, global when proven necessary' as a state architecture principle, not a simplification."

---

## 8. Scale Evolution

**Small app (1–5 developers) →** `useState` for nearly everything; lift to props for parent-child sharing; React Context for theme/auth; React Query for server data; skip Redux entirely unless cart or complex multi-page wizards emerge.

**Medium app (10+ developers, 20+ pages) →** Redux Toolkit for genuinely shared client state (auth, cart, feature flags); RTK Query or React Query for all server data; forms stay local with React Hook Form; clear rule in team playbook: write a one-line justification for any new global slice.

**Large app (SAP/Adobe scale, 50+ developers) →** Redux or NgRx with domain-split store modules; per-team slice ownership; strict code review filter for new slices; server state entirely in React Query / RTK Query / TanStack Query; URL state for shareable filter/sort/page state; state audit tooling (custom linting rules to detect single-consumer slices).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment checkout state (cart → payment method → confirmation) must be architecturally clean — sensitive card data must NOT be in global Redux; auth state global; server state (transaction history, payment methods) in a query cache not in Redux; correct state placement is a security and correctness concern, not just a style preference | RTK Query vs Redux Thunk for server data; security implication of sensitive form fields in Redux DevTools |
| Swiggy / Meesho | Cart/order shared state (navbar badge + cart page + checkout + confirmation all read cart); delivery address state (global, persists across sessions via localStorage sync); product search results in React Query (stale-while-revalidate for speed) | Cart as global state with localStorage persistence; React Query for product/restaurant data; form state kept local |
| Adobe / Microsoft | Complex creative tool state — tool selection, canvas state, layer selection (may be global); document content (server state via query cache with optimistic updates); preferences (global, persisted); Adobe interviewed for Redux architectural depth; "explain your state model" is a real interview question at this level | Architectural reasoning beyond "use Redux"; server vs client state distinction; Context performance trap awareness |
| SAP Labs | Direct experience: 40-slice audit, 60% local-only, extracted to `useState`/RTK Query; Redux reserved for auth + cart + permissions + feature flags; SAP Fiori component library uses Angular NgRx + signals as parallel strategies; senior architects expect state placement justification in design reviews | Real store audit story with numbers; RTK Query migration impact; team-wide state discipline pattern |

---

## 10. Related Topics — What to Study Next

- **Topic 225 — Redux Toolkit** — once you've identified state as genuinely global, RTK's `createSlice` and `createAsyncThunk` are the correct implementation tools; RTK Query (part of RTK) handles server state; understanding the local-vs-global decision first makes RTK usage intentional rather than habitual
- **Topic 227 — TanStack Query / React Query** — the dedicated server state solution; directly addresses the "don't put API responses in Redux" rule from this topic; knowing both RTK and React Query positions you to choose the right caching layer for every data type
- **Topic 231 — URL as State** — URL query params (`?page=2&sort=price&filter=electronics`) are a form of global state that's also bookmarkable and shareable; before reaching for Redux for filter/sort/pagination state, consider whether the URL is a better home; URL state is zero-persistence-overhead and naturally synced to the browser history
- **Topic 229 — State Normalization** — once you've accepted that some state belongs in a global store, normalizing it (flat keyed objects instead of nested arrays) prevents a class of update bugs and selector performance problems; this topic answers "how should global state be structured once you've decided it's global"

---

*Part 13 · Local vs Global State — When to Go Global · Full Stack Interview Guide · Hruday D · 2026*
