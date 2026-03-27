# Avoiding Unnecessary Re-renders
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **React re-renders by default when**: parent re-renders (propagates to all children); `useState` setter is called (even with the same value — bail-out happens after the render attempt); `Context` value object changes (every consumer re-renders even if it only reads one field); `useReducer` dispatch (always triggers)
- **Root cause 1 — Parent re-renders children**: the fix is `React.memo` on pure child components + stable prop references (`useMemo` for objects, `useCallback` for functions); without stable references, `React.memo`'s shallow comparison fails every time
- **Root cause 2 — Context thrashing**: one large Context with many fields; any field change triggers ALL consumers; the fix is split Context into smaller domain-specific contexts (UserContext, CartContext, ThemeContext), or use Zustand/Redux which have built-in selector-based subscriptions
- **Root cause 3 — State too high up**: state lifted so high that unrelated components re-render on every change; the fix is "state collocation" — move state as close as possible to the components that use it; a tooltip's `isOpen` state should live in the Tooltip component, not in the global app state
- **Angular**: `ChangeDetectionStrategy.OnPush` is the primary tool; `async` pipe automatically handles `markForCheck()`; Angular 16+ Signals for fine-grained updates that bypass CD entirely
- ✅ **Hruday's anchor**: SAP Labs — one large `AppContext` caused the entire app to re-render on ANY state change (notifications, sidebar state, user data, cart, etc.); split into 4 domain contexts; the product catalog header stopped re-rendering on cart changes; measured with React DevTools Profiler — catalog page wasted render count per user interaction dropped from 38 to 0

---

## 1. One-Line Definition
Avoiding unnecessary re-renders means identifying and eliminating cases where a component re-executes its render function (React) or Angular template check when nothing affecting its visual output has actually changed — reducing wasted CPU cycles and keeping interactions fast.

---

## 2. The Problem It Solves

In React, every component re-renders by default whenever its parent re-renders. At the top of a large React tree, a simple `setState` call triggers a cascade:

- AppContext value changes (any field) → ALL consumers re-render
- Parent component re-renders → ALL children re-render
- Global Redux action dispatched → ALL useSelector consumers check (even if their slice didn't change)

In a complex SPA with 100+ components, a single user interaction can cause 60+ component re-renders — most of which produce identically the same output they produced the last time. React's virtual DOM diffing prevents the DOM from updating unnecessarily, but the JavaScript execution (calling render functions, calling hooks, creating React element objects) still happens for every component.

This wasted work shows up as:
- Long tasks on the main thread (INP suffers when interactions feel delayed)
- Dropped animation frames during transitions
- Sluggish type-ahead search where keystrokes trigger heavy re-render cascades

The three root causes:

1. **Unstable prop references**: parent creates new `{}` or `[]` or `() => {}` on every render, passed to a child — even with `React.memo`, the child re-renders every time because reference equality fails.

2. **Overly broad Context**: one Context that contains user identity, preferences, cart state, UI state, and notification state. Any write to ANY field triggers re-renders in components that only care about one field.

3. **Misplaced state**: state that changes frequently (tooltip, accordion, dropdown, search input) living in a parent component that owns many unrelated children — every state change re-renders all those children.

---

## 3. How It Works Internally

### React's Re-render Decision Tree

```
Component A renders. Does any of its children re-render?

1. Was this component wrapped in React.memo?
   NO → ALWAYS re-render when parent re-renders
   YES → Check each prop with ===:
         Any prop changed? → Re-render
         All props same?   → SKIP re-render ✅

2. Is a prop a function, object, or array?
   Created inline in parent render body → New reference every render
   → === fails → React.memo re-renders anyway (memo was useless)
   
   Created with useMemo/useCallback + stable deps → Same reference
   → === passes → React.memo skips ✅

3. Does this component call useContext(SomeContext)?
   Context value changed → ALWAYS re-render (React.memo cannot prevent context re-renders)
   Context value unchanged → No re-render
   ← Context is immune to React.memo; the only fix is context splitting or useSyncExternalStore

4. Does this component call useSelector(selector)?
   Redux/Zustand: selector returns different value → re-render
   Redux/Zustand: selector returns same value (===) → SKIP ✅
   ← This is why fine-grained selectors are important
```

### Context Re-render Problem

```
Large AppContext with many fields:

const AppContext = createContext({
  user: { name, email, role },
  cart: { items[], total },
  theme: 'dark',
  notifications: [],
  sidebarOpen: boolean,
});

Consumer components:
  <Header>         uses user.name → re-renders on ANY context change
  <CartBadge>      uses cart.items.length → re-renders on ANY context change
  <ThemeToggle>    uses theme → re-renders on ANY context change
  <NotifBell>      uses notifications → re-renders on ANY context change
  <ProductGrid>    uses nothing from context → BUT re-renders on ANY context change!
                   ← ProductGrid calls useContext(AppContext) for the user.role check
                      User opens the sidebar (sidebarOpen: true)
                      → AppContext value changes
                      → ALL consumers re-render (including ProductGrid!)
                      → 200 ProductCards re-render
                      → 600ms freeze when the sidebar slides open

Solution: split by domain:
  UserContext      → Header (for user.name)
  CartContext      → CartBadge (for cart count)
  ThemeContext     → ThemeToggle
  UIContext        → Sidebar only (sidebarOpen)
  
  ProductGrid calls useContext(UserContext) only
  → Sidebar opening only updates UIContext
  → ProductGrid not subscribed to UIContext → NOT re-rendered ✅
```

---

## 4. The Code

### Wrong Way — Context Thrashing and Unstable References

```tsx
// ❌ WRONG — One large context causing full-tree re-renders

// types.ts
interface AppState {
  user: User | null;
  cart: Cart;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
}

// AppContext.tsx
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ❌ Every dispatch creates a new { state, dispatch } object
  // → AppContext value reference changes on EVERY action
  // → ALL consumers re-render on EVERY action (even unrelated ones)
  const value = { state, dispatch };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ProductGrid.tsx — unrelated to cart, but...
const ProductGrid = () => {
  // ❌ Subscribes to ALL of AppState to get user.role
  // When cart changes (user adds item), ProductGrid re-renders
  const { state: { user }, dispatch } = useContext(AppContext)!;
  
  // ❌ Inline callback: new function every render, passed to memoized child
  const handleAddToCart = (productId: string) => {
    dispatch({ type: 'ADD_TO_CART', payload: productId });  // ← new fn each render
  };

  return (
    <div>
      {products.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          onAddToCart={handleAddToCart}  // ← memo bypassed: new reference every render
        />
      ))}
    </div>
  );
};
```

### Right Way — Split Context + Stable References + Collocated State

```tsx
// ✅ RIGHT — Domain-split contexts: each component subscribes only to what it needs

// contexts/UserContext.tsx
interface UserContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
}
const UserContext = createContext<UserContextValue | null>(null);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // ✅ useMemo: value object only changes when user changes (not on every render)
  const value = useMemo(() => ({ user, setUser }), [user]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be inside UserProvider');
  return ctx;
};
```

```tsx
// contexts/CartContext.tsx
interface CartContextValue {
  items: CartItem[];
  addItem: (productId: string) => void;
  removeItem: (itemId: string) => void;
  total: number;
}
const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  
  // ✅ useCallback: stable function references — won't cause re-renders in consumers
  const addItem = useCallback((productId: string) => {
    setItems(prev => [...prev, createCartItem(productId)]);
  }, []);
  
  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);
  
  // ✅ useMemo: total only recalculates when items change
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  // ✅ Context value only changes when items or callbacks change
  const value = useMemo(
    () => ({ items, addItem, removeItem, total }),
    [items, addItem, removeItem, total]
  );
  
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
```

```tsx
// ProductGrid.tsx — after context split
const ProductGrid: React.FC = () => {
  const products = useSelector(selectAllProducts);  // Fine-grained selector
  const { user } = useUser();                       // Only subscribes to UserContext
  // ✅ Does NOT subscribe to CartContext — won't re-render when cart changes
  
  return (
    <div className="grid">
      {products.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          isAdminView={user?.role === 'admin'}
          // ✅ No onAddToCart passed here — ProductCard reads CartContext directly
        />
      ))}
    </div>
  );
};

// ProductCard.tsx — subscribes to cart only for its own add button
const ProductCard = React.memo(({
  product,
  isAdminView,
}: {
  product: Product;
  isAdminView: boolean;
}) => {
  // ✅ CartContext read inside the leaf component — when cart changes,
  // only ProductCard re-renders (not ProductGrid), and React.memo prevents
  // re-render if addItem reference is stable (it is, we used useCallback)
  const { addItem } = useContext(CartContext)!;

  return (
    <article>
      <h3>{product.name}</h3>
      {isAdminView && <span>Admin: {product.sku}</span>}
      <button onClick={() => addItem(product.id)}>Add to Cart</button>
    </article>
  );
});
ProductCard.displayName = 'ProductCard';
```

### State Collocation

```tsx
// ❌ WRONG — State too high up: tooltip state in App causes global re-renders

const App = () => {
  // ❌ Tooltip state at app level: every tooltip open/close re-renders the ENTIRE app
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  
  return (
    <div>
      <Header />              {/* Re-renders on every tooltip change */}
      <ProductCatalog />      {/* Re-renders on every tooltip change (200 cards!) */}
      <Sidebar />             {/* Re-renders on every tooltip change */}
      <InfoButton
        onHover={(content) => {
          setTooltipVisible(true);
          setTooltipContent(content);
        }}
      />
      {tooltipVisible && <Tooltip>{tooltipContent}</Tooltip>}
    </div>
  );
};

// ✅ RIGHT — State collocated in the component that owns it
const InfoButtonWithTooltip = () => {
  // ✅ Tooltip state lives here: only this component and its children re-render
  // ProductCatalog, Header, Sidebar ARE NOT in the subtree → NOT affected
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState('');
  
  return (
    <div
      onMouseEnter={() => { setVisible(true); setContent('Click for more info'); }}
      onMouseLeave={() => setVisible(false)}
    >
      <InfoIcon />
      {visible && <Tooltip>{content}</Tooltip>}
    </div>
  );
};

// App: no tooltip state here
const App = () => (
  <div>
    <Header />
    <ProductCatalog />     {/* NOT affected by tooltip anymore */}
    <Sidebar />
    <InfoButtonWithTooltip />  {/* Contains its own tooltip state */}
  </div>
);
```

```tsx
// ✅ RIGHT — Redux with createSelector for fine-grained subscriptions

import { createSelector } from '@reduxjs/toolkit';

// ❌ WRONG: selector returns a new object every call → re-renders even if data unchanged
const selectCartDataBad = (state: RootState) => ({
  count: state.cart.items.length,
  total: state.cart.total,
});
// ← `useSelector(selectCartDataBad)` re-renders on EVERY Redux action
//   because `{} !== {}` (new object reference each time)

// ✅ RIGHT: createSelector memoizes the result — returns same reference if inputs unchanged
const selectCartCount = (state: RootState) => state.cart.items.length;
const selectCartTotal = (state: RootState) => state.cart.total;

const selectCartSummary = createSelector(
  [selectCartCount, selectCartTotal],
  (count, total) => ({ count, total })
  // ← New object created ONLY when count or total actually changes
);

// Component using the memoized selector:
const CartBadge = () => {
  // ✅ Only re-renders when count or total changes — not on every Redux action
  const { count, total } = useSelector(selectCartSummary);
  return <span>{count} items · ₹{total.toLocaleString('en-IN')}</span>;
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What causes unnecessary re-renders in React and how do you prevent them?"

**Hruday's answer:**
> There are three main causes, each with a specific fix.
>
> The first is parent re-renders propagating to children. By default, when a parent re-renders, ALL its children re-render — even ones whose props haven't changed. The fix is `React.memo` on the child component, which performs a shallow prop comparison before deciding to re-render. But `React.memo` only works if props are actually stable — if the parent is creating new function or object references on every render, the shallow comparison always fails. `useCallback` and `useMemo` in the parent stabilize those references.
>
> The second cause is broad Context subscriptions. Any component that calls `useContext(SomeContext)` will re-render every time that context's value reference changes. If one large context contains unrelated pieces of state — user profile, cart, UI state, preferences — a cart update triggers re-renders in components that only care about user profile. The fix is splitting into domain-specific contexts so each component subscribes only to the data it actually needs.
>
> The third cause is state being too high up in the tree. If a tooltip's `isVisible` state lives in a grandparent component, every tooltip toggle re-renders the entire subtree — including expensive sibling components. The fix is state collocation: move state as close as possible to the components that use it.
>
> The profiling tool: React DevTools Profiler shows which components re-rendered, for how long, and WHY (the "Why did this render?" tooltip). Always profile before optimizing — guessing which components are wasting renders leads to adding unnecessary `React.memo` where it has no effect.

---

### Q2 — SAP Experience Deep Dive
**Interviewer asks:** "You mentioned splitting a large context into four. Walk me through how you identified the problem and fixed it."

**Hruday's answer:**
> At SAP, the Context split came from a performance investigation triggered by a UX report. Users noticed that clicking the notification bell (which just opened a notification dropdown) caused a 400ms freeze before the dropdown appeared. This shouldn't happen — opening a dropdown should be instantaneous.
>
> I opened React DevTools Profiler and recorded the notification bell interaction. The flame chart was revealing: 38 components were re-rendering. Nearly all of them were unrelated to notifications — including the entire ProductGrid with its 200+ cards, the Header, the Sidebar navigation, and the cart badge.
>
> The root cause: there was a single `AppContext` with about 12 fields: user data, cart state, theme, sidebar state, search state, notification state, and several more. When the notification bell was clicked, the reducer dispatched an action that updated `state.notifications` and `state.notificationDropdownOpen`. The entire `AppContext` value reference changed. Every component calling `useContext(AppContext)` re-rendered — all 38 of them.
>
> The fix was splitting into four contexts: `UserContext` (user identity, roles), `CartContext` (cart items, totals), `UIContext` (sidebar state, modal state, dropdown state), and `NotificationsContext`. The `ProductGrid` now uses only `UserContext` (to determine admin vs regular view). Opening the notification dropdown updates `NotificationsContext` and `UIContext` — only the `NotificationBell`, `NotificationDropdown`, and `Sidebar` components subscribe to those. The ProductGrid and its 200 cards are completely unaffected.
>
> After the split: React DevTools Profiler showed 4 components re-rendering on notification bell click (down from 38). The freeze disappeared — the interaction became instant.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "How do you decide when Context is the right solution versus Zustand or Redux?"

**Hruday's answer:**
> The decision comes down to update frequency and access patterns.
>
> Context is good for: stable or slowly-changing values that many components need to read but rarely write — user identity, theme, locale/i18n strings, feature flags. These change once on login and stay stable for the session. Context has low overhead when the value barely changes.
>
> Context is bad for: high-frequency updates (real-time data, filter states, form values) where the value changes on every keystroke or WebSocket message. Each update triggers re-renders in ALL consumers. Even with context splitting, if dozens of components subscribe to the same context and the value changes frequently, you have a performance problem.
>
> Zustand or Redux solve this with selector-based subscriptions. A component subscribes to a specific derived value (`useSelector(state => state.cart.items.length)`). If the selector returns the same value as before, the component doesn't re-render — even if other parts of the same store changed. This is fine-grained reactivity without context's "all-or-nothing" trigger behavior.
>
> My rule: use Context for stable, broadly-needed values (user, theme) and Zustand/Redux for dynamic application state (cart, filters, UI state). For Angular, the same principle applies: service-based state with RxJS subjects is the Context equivalent; NgRx or Akita is the Redux equivalent with selector memoization.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the state management architecture for a complex dashboard that has user settings, real-time data, a shopping cart, and UI state."

**Hruday's answer:**
> I'd separate the four concerns using their natural update frequency patterns.
>
> User settings (name, preferences, role) — update once at login, stable for session. Use Context with a `UserContext` provider. All components needing user data subscribe to this one stable context. No performance concern because it never changes during normal use.
>
> Real-time data (WebSocket prices, status updates) — update many times per second. Use Zustand or a service with RxJS BehaviorSubjects. Components subscribe to only the specific data slice they display: `useStore(state => state.machineStatus[currentMachineId])`. When other machines update, this component is unaffected. Zustand is great here because it doesn't require Redux boilerplate and its selector subscriptions are efficient.
>
> Shopping cart (items, quantities, totals) — updates on user actions (adding/removing), occasional. CartContext works fine here — the split into its own context means cart updates don't affect user settings consumers or real-time data consumers. Alternatively, Zustand for the cart if cart interactions are complex.
>
> UI state (sidebar open, modal visibility, active tab, dropdown state) — updates frequently but is local. This is the key insight: most UI state should NOT be global at all. A sidebar's open state should live in the Sidebar component. A modal's open state should live in the component that triggers it. Only "page-level" UI state (active tab, current filter view) needs to be shared.
>
> Architecture: `UserContext` provider at the app level; `CartContext` provider at the cart-aware section; Zustand store for real-time data with fine-grained selectors; UI state collocated in the components that own each UI element.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Context.memo prevents context re-renders" | "I wrap context consumers in React.memo to prevent context re-renders" | `React.memo` prevents re-renders caused by PARENT RE-RENDERS but CANNOT prevent re-renders caused by Context value changes; when a Context value updates, React re-renders all consumers regardless of `React.memo`; the ONLY ways to prevent unnecessary context consumer re-renders are: split the context into smaller pieces (each component subscribes to only relevant context), use `useSyncExternalStore` with equality checking, or switch from Context to Zustand/Redux which support fine-grained selectors |
| "All state in global store is best" | "I put everything in Redux to have a single source of truth" | Global Redux state for local UI state (tooltip visibility, accordion expanded state, form draft values) is over-engineering and hurts performance; every dispatch checks ALL Redux subscribers; a "tooltip open" action in Redux dispatches to every connected component; local state (`useState`) for local UI is zero-overhead — it only re-renders the component that owns it and its children; the principle: "use the most local state management approach that works" — `useState` for component state, Context for stable cross-component data, Redux/Zustand for dynamic shared data with frequent updates |
| "Bailout on same state prevents render" | "React bails out automatically if you call setState with the same value" | React's state bail-out only applies in specific conditions: it bails out if the new state is the SAME PRIMITIVE VALUE (number, string, boolean) using `Object.is` comparison; for objects and arrays, React bails out only if it's the SAME REFERENCE; calling `setUser({...user})` creates a new object reference → re-render happens even if all fields are identical; so `setUser(prev => { prev.name = 'new'; return prev; })` (mutate and return same reference) → bails out but the view doesn't update (bug!); `setUser({...user, name: 'new'})` → re-renders correctly; the solution is to use immutable update patterns and not rely on bail-out for performance |

---

## 7. Hruday's Real Experience Hook
> "The 38-to-4 component re-render reduction on the notification bell click was one of those profiling results you save a screenshot of. Before the context split, the React DevTools flame chart for the notification bell click looked like the entire page lit up — header, sidebar, product grid, cart, analytics widgets, all rendered simultaneously. After the split, it was a clean 4-component flame chart: just the notification bell, the notification context provider, the notification count badge, and the dropdown.
>
> The deeper lesson was about coupling. We had built a large AppContext thinking it was convenient — one import gives you everything. What it actually did was couple every component to every piece of state. When notifications changed, even though Product Grid had nothing to do with notifications, it was re-rendered because it touched the same context.
>
> Context splitting is fundamentally a decoupling exercise disguised as a performance optimization. The performance improvement is the reward for getting the architecture right. Once the contexts were split, adding new state to `NotificationsContext` couldn't accidentally break the performance of `ProductGrid`. That isolation made future development faster too — not just the runtime performance."

---

## 8. Scale Evolution

**Small app (< 20 components) →** Simple `useState` and `useContext`; don't over-optimize; React's default behavior is fast enough at this scale; profile only if you feel it's slow.

**Medium app (50-150 components) →** Split Context by domain if components are subscribing to state they don't use; `React.memo` on list items; `useMemo`/`useCallback` on props that are objects/functions passed to memoized children; React DevTools Profiler in development.

**Large app (SAP scale, 200+ components) →** Context for stable values only; Zustand/Redux with `createSelector` for dynamic state; aggressive state collocation audit (move local state down the tree); profile each major user flow before optimization; baseline linting rules (no inline object/array/function props to `React.memo` children); `React.lazy` + deferred rendering for complex components that don't need immediate render.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment dashboard with real-time transaction stream AND static merchant settings AND dynamic filter/search; separating stable user context from dynamic transaction state is critical for performance; filter interactions must be instant | Context splitting pattern; Redux selector memoization; state collocation for payment form UI |
| Swiggy / Meesho | Consumer app with cart, catalog, user profile, search, promotions — each has different update frequencies; cart updates should not re-render the catalog; search state changes should not re-render the cart | Cart vs catalog context separation; Zustand for high-frequency search state; React.memo for catalog items |
| Adobe / Microsoft | Complex creative tools with canvas state, UI layer state, user preferences, collaboration state — each dramatically different update frequencies; Microsoft Teams optimizes extensively for exactly this problem | Fine-grained state partitioning; useSyncExternalStore for external store subscriptions; react-redux selector optimization |
| SAP Labs | Direct experience: 38 → 4 re-renders on notification bell; AppContext split into 4 domain contexts; measured with React DevTools Profiler; HeaderComponent / ProductGrid / CartBadge all decoupled; taught team the context split pattern; documented as architectural guideline | Specific context split story with before/after metrics; profiling workflow; team knowledge transfer |

---

## 10. Related Topics — What to Study Next

- **Topic 239 — Memoization (React.memo, useMemo, useCallback)** — the component-level complement to Context splitting; once Context is split so each component subscribes only to relevant state, React.memo + stable refs ensure those components don't waste renders from their parent's unrelated state changes
- **Topic 240 — Angular OnPush + trackBy** — the Angular equivalent of this topic; OnPush is the primary tool for Angular; the same principle applies: "check only when relevant input changes" — avoid default CD that checks on every event
- **Topic 243 — Main Thread Scheduling and Long Tasks** — once you've eliminated wasted renders, the remaining renders that MUST happen should be scheduled efficiently; `useTransition` and `useDeferredValue` in React deprioritize heavy renders so the main thread stays free for user interactions
- **Topic 245 — Database Index Strategy** — the backend analog: just as unnecessary re-renders are wasted frontend CPU cycles, full table scans are wasted backend CPU cycles; both come from missing optimization layers (memoization vs index)

---

*Part 14 · Avoiding Unnecessary Re-renders · Full Stack Interview Guide · Hruday D · 2026*
