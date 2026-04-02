# Avoiding Over-Global State — State Co-location and Architecture Patterns
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Over-global state** is putting state in Redux/NgRx/Zustand that has only one consumer; it adds all the complexity of global state (boilerplate, synchronization, DevTools noise) with none of the benefits (sharing, persistence, audit trail); the result is a store with 40 slices where 24 are used by exactly one component
- **Co-location rule**: state should live as close as possible to the components that use it; start with `useState` inside the component; if a sibling needs it, lift to parent; if distant cousins need it, use Context or Zustand; if it needs audit-trail or complex async → Redux/NgRx; every step up the stack has a cost
- **Server state is not client state**: fetched data (products from API, user profile from `/api/me`) is NOT application state — it's a cache of server data; it should live in TanStack Query or RTK Query, NOT in a Redux slice; when this mistake is made, the developer ends up managing loading/error flags, cache TTL, and refetch logic manually inside Redux — reinventing the query library poorly
- **Form state is not application state**: form field values while the user types are transient draft state; they should stay in the form library (React Hook Form, Angular Reactive Forms) until the user submits; putting form state in Redux means every keystroke dispatches an action and potentially causes global re-renders
- **UI state is usually local state**: "is the dropdown open?", "which accordion panel is expanded?", "is the modal visible?" — these are ephemeral states that die when the component unmounts; they almost never need to be shared; they almost always belong in `useState` or a local signal
- ✅ **Hruday's anchor**: SAP Labs — 40-slice Redux store audit; 24 slices had only one consumer component; extracted to `useState`/RTK Query; removed 800 lines; improved cold-start load time by reducing initial Redux state computation

---

## 1. One-Line Definition
Over-global state is the antipattern of putting state in a global store when it belongs locally in a component, in a form library, or in a server-state cache — creating unnecessary complexity and boilerplate for state that has no need for global sharing.

---

## 2. The Problem It Solves

Global state management was designed to solve a specific problem: sharing state between components that don't have a direct parent-child relationship. When an engineer learns Redux first and local state second, they apply the global pattern to ALL state — not just state that needs sharing.

The symptoms of over-global state:

**Symptom 1 — Every feature has a Redux slice**: `modalSlice`, `formDraftSlice`, `userListSlice`, `selectedItemSlice`, `filterPanelSlice`... A code search for `.dispatch(` in every component interaction confirms that nothing is handled locally.

**Symptom 2 — Dismissing a modal requires an action**: `dispatch(closeModal())` → reducer sets `isOpen: false` → selector `useSelector(state => state.modal.isOpen)` → component re-renders. This is 4 steps and 3 files for what is `const [isOpen, setIsOpen] = useState(false)`.

**Symptom 3 — Form values appear in Redux DevTools**: typing in a search box dispatches 20 actions per second as each keystroke dispatches `updateSearchQuery`. Every action is recorded in DevTools. The store contains a representation of "what the user is typing RIGHT NOW" — state that is inherently transient.

**Symptom 4 — Cached server data in Redux**: products from an API are loaded via `createAsyncThunk`, stored in a `productsSlice`, and re-fetched via a manually invalidated flag. This reproduces a cache — TanStack Query or RTK Query — but worse, because there's no stale-while-revalidate, no request deduplication, and no cache TTL.

The cost: larger initial Redux state, slower DevTools, more boilerplate per feature, harder onboarding for new developers who must trace five files to understand why a button opens a modal.

---

## 3. How It Works Internally

### The State Classification Framework

```
For every piece of state, ask in order:

1. "Is this server data?" (fetched from an API)
   YES → TanStack Query / RTK Query (NOT Redux slices)
   NO  → continue

2. "Is this form input?" (values the user is typing)
   YES → React Hook Form / Angular Reactive Forms (NOT Redux)
   NO  → continue

3. "Is this URL-representable?" (filter, pagination, selected tab)
   YES → URL query params via router (NOT Redux)
   NO  → continue

4. "Does more than one component need this?"
   NO  → useState / signal in the component (or parent if shared with direct children)
   YES → continue (genuinely needs to be shared)

5. "Is the sharing between directly related components?" (parent → children)
   YES → props / Context API / NgRx Signals scoped to module
   NO  → continue (truly cross-cutting)

6. "Does it need time-travel debugging, complex async, DevTools tracing?"
   YES → Redux / NgRx
   MAYBE → Zustand / signal service (lighter option)

The goal: answer YES as early in the decision tree as possible.
Most state answers YES at step 1, 2, 3, or 4.
Redux/NgRx is the last resort, not the first tool.
```

---

## 4. The Code

### Wrong Way — Putting Everything in Redux

```typescript
// ❌ WRONG — Every state type in Redux:

// modalSlice.ts — Redux for a UI toggle (step 2 of decision tree should stop here)
const modalSlice = createSlice({
  name: 'modal',
  initialState: { isOpen: false, modalType: '' },
  reducers: {
    openModal: (state, action) => { state.isOpen = true; state.modalType = action.payload; },
    closeModal: (state) => { state.isOpen = false; },
  }
});
// ❌ Component must dispatch to open a confirmation modal
// ❌ DevTools shows an action every time a modal opens/closes
// ❌ 2 files, 10 lines for what is useState(false)

// searchSlice.ts — Redux for live search input (form state belongs in form library)
const searchSlice = createSlice({
  name: 'search',
  initialState: { query: '', results: [] },
  reducers: {
    setQuery: (state, action) => { state.query = action.payload; },
    // ❌ Dispatched 10x per second as user types → Redux DevTools cluttered
    setResults: (state, action) => { state.results = action.payload; },
  }
});

// productsSlice.ts — Redux for server data (TanStack Query should handle this)
const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], loading: false, error: null, lastFetched: null },
  // ❌ Manually tracking loading/error/cache — reinventing TanStack Query/RTK Query
  extraReducers: builder => {
    builder
      .addCase(fetchProducts.pending, state => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();  // ❌ Manual TTL tracking
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});
// ❌ No automatic background refetch, no stale-while-revalidate, no deduplication
// ❌ Manual "is cache expired?" checks before dispatching fetchProducts
// Reinventing the cache management that TanStack Query / RTK Query does automatically
```

> **Why this fails at scale:** Redux store bloats with 40 slices; DevTools becomes unusable noise; new developers take 2 days to understand a simple feature; performance degrades as every UI interaction dispatches actions and triggers global re-renders.

### Right Way — State at the Right Level

```typescript
// ✅ RIGHT — Each state type at the appropriate layer

// 1. UI-only toggle state: stays in component
const ConfirmationModal: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => {
  // ✅ Local state: modal visibility ONLY this component cares about
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Delete Item</button>
      {isOpen && (
        <Modal>
          <p>Are you sure?</p>
          <button onClick={() => { onConfirm(); setIsOpen(false); }}>Yes, Delete</button>
          <button onClick={() => setIsOpen(false)}>Cancel</button>
        </Modal>
      )}
    </>
  );
  // ✅ No Redux slice, no dispatch, no DevTools noise for a local UI toggle
};


// 2. Form state: stays in React Hook Form (not Redux)
const ProductSearchForm: React.FC = () => {
  // ✅ Form draft state belongs in the form library
  const { register, handleSubmit, watch } = useForm<{ query: string; category: string }>();
  const query = watch('query');  // ← React Hook Form watches for live preview, not Redux
  
  // ✅ Server-state (search results): belongs in TanStack Query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['products', 'search', query],
    queryFn: () => api.searchProducts(query),
    enabled: query.length > 2,  // ← Skip query until meaningful input
    debounce: 300,              // ← Or handle with debounce in the queryFn
  });
  
  return (
    <form>
      <input {...register('query')} placeholder="Search products..." />
      {isLoading && <Spinner />}
      <ResultsList results={searchResults} />
    </form>
  );
  // ✅ No Redux slice, no action per keystroke, no manual loading state
};


// 3. Server data: belongs in RTK Query / TanStack Query (not Redux slice)
// ✅ CORRECT — RTK Query for server data:
const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: builder => ({
    getProducts: builder.query<Product[], ProductFilters>({
      query: filters => ({ url: '/products', params: filters }),
      providesTags: ['Product'],
    }),
  }),
});

const ProductList = () => {
  const { data, isLoading, error } = useGetProductsQuery({ category: 'electronics' });
  // ✅ Loading, error, caching, deduplication, background refetch — all handled
  // ✅ No slice created, no manual cache TTL, no action dispatching
};


// 4. Genuinely-shared cross-component state: Redux/Zustand as appropriate

// ✅ Cart state — shared by: header badge, product listings, cart page, checkout
// Multiple independent route-level components need this → Redux/Zustand is justified
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[] },
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
  },
});
// ✅ Cart is shared by 6+ components across 3 routes — Redux is justified


// 5. Angular signal service for feature-scoped shared state (no NgRx needed)
// ✅ Filter state shared between the filter panel and the product grid — same feature
@Injectable()  // NOT providedIn: 'root' — feature-scoped
export class ProductFilterService {
  readonly category = signal<string>('all');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');
  readonly priceRange = signal<[number, number]>([0, 10000]);
  
  // Derived signal — no NgRx selector needed for this
  readonly hasActiveFilters = computed(() =>
    this.category() !== 'all' || this.sortOrder() !== 'asc'
  );
  
  setCategory(cat: string): void { this.category.set(cat); }
  resetFilters(): void {
    this.category.set('all');
    this.sortOrder.set('asc');
    this.priceRange.set([0, 10000]);
  }
}
// ✅ Shared between ProductFilterPanelComponent and ProductGridComponent
// ✅ Feature-scoped: provided in the ProductsModule, not globally
// ✅ No NgRx slice, no actions, no reducers for simple synchronous filter state


// ✅ Code review checklist — drop this in your PR template:
/*
STATE REVIEW CHECKLIST:

□ Is this fetched server data?
  YES → use RTK Query / TanStack Query endpoint
  NO  → continue

□ Is this form draft/input state?
  YES → use React Hook Form / Angular Reactive Forms
  NO  → continue

□ Is this consumed by more than one non-adjacent component?
  NO  → useState / signal in the component or direct parent
  YES → continue

□ Is this feature-scoped (same module)?
  YES → Zustand store / NgRx Signals store / signal service with feature DI scope
  NO  → Redux slice / NgRx feature state

□ Does this need DevTools time-travel or complex async Effects?
  YES → full Redux/NgRx slice + Effects
  NO  → Zustand / NgRx Signals is sufficient
*/
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the problem with putting all state in Redux?"

**Hruday's answer:**
> The core problem is applying global state complexity to state that isn't actually global. Redux is designed for state that must be shared across the application — and it adds real complexity to achieve that sharing: action types, reducers, selectors, DevTools configuration, and Provider setup. That complexity is worthwhile when the state genuinely needs to be shared globally.
>
> When you put a modal's `isOpen` flag in Redux, you're paying that cost for state that exactly one component needed. The result is boilerplate that dwarfs the actual goal — "show a modal when a button is clicked" — by 10:1. Multiply by 15 similar UI states and the store becomes noise.
>
> The second problem is performance and developer experience. Redux DevTools records every dispatched action. If form inputs are in Redux, every keystroke dispatches an action. Browsing DevTools becomes searching through hundreds of `setSearchQuery` actions to find the one meaningful state change. Components subscribed to global state re-render more often because global state changes more frequently than necessary.
>
> The third problem is onboarding time. When a new developer joins the team and needs to understand how a delete confirmation modal works, they search for "isOpen" and find three files across the codebase. If modal state were local, they'd find it in one component in 30 seconds.

---

### Q2 — SAP Experience
**Interviewer asks:** "Have you ever had to clean up an over-global state situation? What did you do?"

**Hruday's answer:**
> Yes, at SAP Labs. I inherited a codebase with a Redux store that had grown to 40 slices over two years of feature development. The store had slices for everything: modal visibility, active wizard step, search query, product filters, sorting order, notification badge count — alongside genuinely global state like cart, auth, and permissions.
>
> The first step was a state audit. I wrote a script that scanned all `useSelector` calls in the codebase and grouped them by the slice they accessed. The result was that 24 of the 40 slices were read only from one component. Everything in `localUISlice`, `filterSlice`, `modalSlice`, and `searchSlice` had single consumers.
>
> The migration was incremental. I converted one slice per PR — starting with the simplest ones. `modalSlice` became `useState(false)` in the component. `filterSlice` became a Zustand store shared between the filter panel and the product grid (two components that weren't parent-child). `serverDataSlice` (products, categories) became RTK Query endpoints.
>
> Over eight weeks, 24 slices were removed. With them went 800 lines of boilerplate — action type constants, action creators, reducer switch cases, selector functions that just returned `state.modal.isOpen`. Cold start time improved because the initial Redux state computation and store setup was smaller. DevTools became navigable again because the action log was clean — only meaningful state changes remained: cart updates, auth events, permission changes.
>
> The lesson: the migration was low-risk because each conversion was self-contained. Extracting a single-consumer slice to local state requires only touching one component and one slice file — there are no other consumers to update.

---

### Q3 — Architecture Angle
**Interviewer asks:** "What's the difference between lifting state up vs using Context vs Redux?"

**Hruday's answer:**
> These three patterns represent escalating levels of "reach" — how far state can travel — and they come with escalating complexity costs.
>
> Lifting state means moving state from a child component up to its parent. Both components are in the same component tree. The parent owns the state and passes it down via props. Cost: re-renders of the parent and any other children it renders when state changes. Best for: state shared between two or three sibling components with one common parent.
>
> Context API means creating a React Context with a Provider somewhere in the tree, and consuming it via `useContext` in any descendant. State can travel to any depth without prop drilling. Cost: every consumer re-renders when ANY value in the Context changes (unless you split contexts or memoize values carefully). Provider location in the tree determines the scope — a Context Provider inside a feature module means the state is feature-scoped. Best for: feature-scoped state shared across a subtree where you want TypeScript safety and don't want external libraries.
>
> Redux/Zustand means the state is module-level (or application-level with Provider). Any component in any part of the app can subscribe to or dispatch to it, regardless of tree position. Cost: external library, configuration, boilerplate (Redux) or less so (Zustand). Benefit: selector-based subscriptions so each component only re-renders for the specific slice it subscribes to; DevTools integration; persistence middleware. Best for: state that genuinely crosses the entire application — cart, auth, permissions, feature flags.
>
> The escalation principle: start at lifting. If lifting becomes awkward (more than 2-3 levels of prop threading), use Context. If Context becomes awkward (performance from unnecessary re-renders, needs DevTools, needs persistence), use Redux/Zustand.

---

### Q4 — Practical Code Review
**Interviewer asks:** "During code review you see a `useSelector(state => state.filters.searchQuery)` in a component. What questions do you ask?"

**Hruday's answer:**
> My first question: "Is `searchQuery` consumed by any other component in the app?" I'd search the codebase for other `useSelector` calls accessing `state.filters.searchQuery`. If it's only in this one component — and search filtering is typically local behavior — that's the signal it shouldn't be in Redux.
>
> Second question: "Does the search query need to persist across navigation?" If a user searches, navigates away to a product detail page, and clicks Back — should the search result be restored? If yes, the URL query params (`?q=shoes&category=athletics`) are the right place — not Redux, not because URL provides persistence across navigation and is the more appropriate semantic for navigation-based state.
>
> Third question: "Is form state being stored here?" If the component has an `<input>` that dispatches `setSearchQuery` on every keystroke, that's form draft state and it should be in `useForm` or local `useState` with a debounce, not dispatched to Redux 10 times per second.
>
> Fourth question: "What would break if this were local `useState`?" If the honest answer is "nothing" — no other component needs it, no navigation persistence required — then the extraction to local state is just removing unnecessary complexity.
>
> The code review comment I'd leave: "This appears to be consumed only here. Can we try extracting to `useState` and see if anything breaks? If we discover other consumers or need to persist across navigation, we can re-evaluate."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Global state is always better than local" | "Put everything in Redux so you can debug it with DevTools" | DevTools work best when the action log contains meaningful events; flooding it with UI micro-state (`modalOpen`, `tabIndex`, `inputValue`) makes the real events invisible; local state bugs are debugged with React DevTools and component inspection — effective for local state, no Redux overhead required; Redux DevTools is valuable for cross-component state changes that are hard to trace visually |
| "Context API scales to any usage" | "I can use Context instead of Redux for large apps" | Context has a critical limitation: every consumer re-renders when THE ENTIRE context value changes; with a large context object updated frequently, this causes widespread unnecessary re-renders; solutions (memo, multiple contexts, useMemo on the value) add back the complexity you were trying to avoid; Redux's selector model (`useSelector(specific => specific.slice)`) re-renders only the subscribing component when its specific slice changes — this is the scaling advantage Context lacks |
| "Form state can go in Redux for undo/redo" | "We put form state in Redux so users can undo typing" | Undo/redo for form fields should be implemented in the form library or with a local history stack; putting form draft state in Redux to enable undo means every keystroke creates a new Redux state entry and a new DevTools action; the correct approach: use a local `formHistory` array in component state or a form library with undo support; commit the FINAL form value to Redux only on submit |
| "Removing from Redux means losing DevTools" | "If I move state out of Redux I lose the ability to trace changes" | Redux DevTools shows dispatched actions not state directly; local `useState` changes are visible in React DevTools component inspector (click the component, see its hooks and current values); browser debugger breakpoints on state setter calls work too; the tracing you lose is the action-by-action replay — which for local UI state you never needed; the debugging scenario for "is this modal open?" is just inspecting the component's local state in React DevTools, not replaying action history |

---

## 7. Hruday's Real Experience Hook
> "The SAP state audit was one of the most impactful architectural improvements I made without changing a single feature's behavior. The product worked identically before and after. The only thing that changed was WHERE state lived.
>
> The most common pattern I found in those 24 single-consumer slices was 'Redux as a communication bus between child and sibling components.' An engineer would notice that two components needed the same data but weren't parent-child, and immediately reach for Redux — the known tool for sharing state. The correct tool — lifting state, Context, or a scoped Zustand store — wasn't considered because the team's mental model was 'Redux for sharing'.
>
> After the audit and migration, I wrote a one-page state classification guide that went into the team's onboarding docs. The rule hierarchy: server data → RTK Query; form draft → React Hook Form; URL-appropriate state → router; component-only UI → useState; feature-scoped sharing → scoped Zustand store; cross-app sharing → Redux. The guide reduced the number of new Redux slices created per quarter from ~6 to ~1.
>
> The unexpected benefit was code review velocity. PRs were reviewed 30% faster because reviewers weren't navigating three extra files to understand a modal. The cognitive load reduction from having less in Redux was real and measured by our team's sprint velocity."

---

## 8. Scale Evolution

**Individual developer / solo project →** start with `useState` for everything; extract to Context when you've proven two components need the same state; add Zustand only after Context causes performance friction; never add Redux unless state is so complex that the conventions help more than the overhead costs.

**Small team (2-5 developers) →** establish the classification framework in the first sprint; write the decision checklist as a comment template in PR descriptions; use Zustand for cross-component client state; TanStack Query for server state; agree that Redux is only added when genuinely needed; saves weeks of refactoring later.

**Medium team (5-15 developers) →** the classification framework becomes a code review checklist; linting rule to flag `useSelector` calls that could be local state (possible via custom ESLint plugin checking selector usage count); Storybook stories help — they force engineers to think about what state a component actually requires to be independently rendered, surfacing over-dependency on global state.

**Large enterprise (SAP scale) →** formal state audit every 6 months, similar to the one described; usage tracking scripts that report selector call frequency by slice; architecture review board approval for any new Redux/NgRx slice (slows down accidental global state creation); feature-level state encapsulation enforced by monorepo package boundaries (a feature package cannot directly access another feature's store slice — must go through defined public APIs).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment SDK components are embedded context — state must be tightly scoped; over-global state in payment flows is a security risk (sensitive data in Redux DevTools visible to browser extensions in dev builds); co-location enforces minimal state exposure; correct use of local state for transient payment selection UX | security implication of Redux DevTools + sensitive state; state co-location for embedded SDK; minimal state footprint |
| Swiggy / Meesho | Rapid feature development means engineers default to Redux out of habit; state audit patterns prevent technical debt accumulation; search input state local causes 100x fewer re-renders than dispatching every keystroke; menu filter state scoped to menu page prevents pollution of global store | performance argument for local vs global; team-scale state hygiene; code review checklist for state placement |
| Adobe / Microsoft | Complex document editors require careful state co-location; toolbar state (which tool is selected, active color) is component-local; canvas data is global; UI panels are local; the classification prevents the canvas data store from becoming entangled with toolbar UI state; Microsoft interview specifically tests state design for complex multi-panel editors | Complex state hierarchy design for editors; isolation of UI state from data state; scaling team conventions |
| SAP Labs | Direct experience: 40-slice audit, 24 single-consumer slices removed, 800 lines deleted, DevTools usable, cold-start time improved; state classification guide written for team onboarding; metrics on PR review velocity; quarterly audit process established | SAP production story with measurable outcomes; process for preventing over-global state at scale; teachable framework for team alignment |

---

## 10. Related Topics — What to Study Next

- **Topic 224 — Local vs Global State** — the decision framework topic; this topic (230) is about the PATTERNS that enforce the decision framework in practice; read 224 for the "what goes where" principle, then 230 for the "how to prevent violations in a team" practice; together they cover both the philosophy and the implementation
- **Topic 225 — Redux Toolkit** — needed to understand what "appropriate Redux usage" looks like; to recognize over-global state, you must understand what Redux is actually designed for; knowing RTK well makes you authoritative when explaining why a given slice SHOULD stay in Redux vs be extracted
- **Topic 227 — TanStack Query** — the canonical solution for the most common form of over-global state: server data in Redux; knowing TanStack Query lets you confidently replace `createAsyncThunk` + loading/error state slices with a proper server-state cache; this is the highest-ROI substitution in over-global state remediation
- **Topic 231 — URL as State** — the second most common form of over-global state: filter/pagination state that belongs in the URL; understanding URL state as a valid state location rounds out the classification framework; "is this filter state?" → URL; "is this form draft?" → form library; "is this server data?" → query library; these three questions resolve the majority of over-global state cases before Redux comes into consideration

---

*Part 13 · Avoiding Over-Global State — State Co-location and Architecture Patterns · Full Stack Interview Guide · Hruday D · 2026*
