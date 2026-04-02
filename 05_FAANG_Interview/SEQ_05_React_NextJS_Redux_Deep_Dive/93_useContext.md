# 93. useContext — Performance Pitfalls, Context Splitting
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`useContext` reads the current value of a React Context and subscribes the consuming component to updates. The critical performance characteristic: **every consumer re-renders whenever the context value changes** — even if the component only uses one field from a large context object. This makes monolithic context objects a performance trap. The solutions: split context by update frequency (static config context separate from dynamic state context), use the selector pattern with `useMemo` + memoized children, or adopt a state management library that handles subscription granularity. Context is ideal for infrequently changing values (theme, locale, auth user) and for passing `dispatch` functions (which are always stable). It's the wrong tool for high-frequency state that causes widespread re-renders.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### How Context Works Internally

When `Context.Provider` renders with a changed `value`, React walks the component tree from that Provider looking for consumers. When it finds a `useContext(ctx)` consumer:

1. React checks: did the context value change? (via `Object.is`)
2. If yes: **schedule a re-render on that consumer**, regardless of whether it actually uses the changed portion of the value
3. If no: skip that consumer

**This is fundamentally different from Redux selectors:**
- Redux: consumer re-renders only when the selected slice changes (`useSelector(state => state.user.name)` — only rerenders when `user.name` changes)
- Context: **all consumers re-render when the context value object reference changes**, even if only one field changed

```typescript
const AppContext = createContext<{
  user: User;
  theme: string;
  notifications: Notification[];
  settings: Settings;
} | null>(null);

// Problem: ANY change to user, theme, notifications, OR settings
// causes ALL consumers to re-render — even those that only use `theme`

function ThemeIcon() {
  const { theme } = useContext(AppContext)!;
  // This re-renders on every notification arrival
  // even though it only uses `theme` which never changes
  return <Icon name={`theme-${theme}`} />;
}
```

### The Context Object Reference Problem

```typescript
// ❌ Classic mistake: new context value object on every render
function AppProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [count, setCount] = useState(0);

  // This creates a NEW object on every render
  // Even if user and count didn't change
  const contextValue = { user, count, setUser, setCount };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
  // Every render of AppProvider creates new context value → all consumers re-render
}

// ✅ Memoize the context value
function AppProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [count, setCount] = useState(0);

  const contextValue = useMemo(() => ({
    user, count, setUser, setCount
  }), [user, count]);
  // Only creates a new object when user or count changes
  // setUser and setCount are stable (useState setters)

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
```

### Context Splitting — The Primary Solution

Split context by **update frequency** and **consumer needs**:

```typescript
// ❌ One big context — any change causes all consumers to re-render
const BigContext = createContext({
  user: null,          // changes rarely (login/logout)
  theme: 'light',      // changes rarely (user preference)
  notifications: [],   // changes frequently (every notification)
  currentPage: '',     // changes on navigation
  isLoading: false,    // changes on every API call start/end
});

// ✅ Split by update frequency
// Static config — never changes after mount
const ConfigContext = createContext({ apiBaseUrl: '', featureFlags: {} });

// Auth context — changes rarely (login/logout only)
const AuthContext = createContext<{
  user: User | null;
  login: (credentials: Credentials) => void;
  logout: () => void;
} | null>(null);

// Theme context — changes on user preference only
const ThemeContext = createContext<{ theme: 'light' | 'dark'; toggleTheme: () => void } | null>(null);

// Notification context — changes frequently
const NotificationContext = createContext<{
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  dismissNotification: (id: string) => void;
} | null>(null);

// Consumers now only subscribe to what they need:
function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext)!;
  // Only re-renders on theme change — NOT on notification changes ✓
  return <button onClick={toggleTheme}>{theme}</button>;
}

function NotificationBell() {
  const { notifications } = useContext(NotificationContext)!;
  // Re-renders on notification changes — appropriate ✓
  // Does NOT trigger ThemeToggle to re-render ✓
  return <span>{notifications.length}</span>;
}
```

### State vs Dispatch Context Splitting

A specific splitting pattern for `useReducer` + Context:

```typescript
// Split state and dispatch into separate contexts
// dispatch is ALWAYS stable (same reference) — only subscribe to it when you don't need state
const CartStateContext = createContext<CartState | null>(null);
const CartDispatchContext = createContext<React.Dispatch<CartAction> | null>(null);

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// Components that only dispatch (buttons, forms) use dispatch context
// → subscribe to dispatch (stable) → NEVER re-render on state changes
function AddToCartButton({ productId, price }: { productId: string; price: number }) {
  const dispatch = useContext(CartDispatchContext)!;
  // dispatch is stable → this component NEVER re-renders due to cart state changes
  return (
    <button onClick={() => dispatch({ type: 'ADD_ITEM', item: { id: productId, price, quantity: 1 } })}>
      Add to Cart
    </button>
  );
}

// Components that read state use state context
function CartItemCount() {
  const state = useContext(CartStateContext)!;
  // Re-renders on ANY cart state change — appropriate for this component
  return <span>{state.items.length}</span>;
}

// A component that needs BOTH uses both contexts
function CartSummary() {
  const state = useContext(CartStateContext)!;
  const dispatch = useContext(CartDispatchContext)!;
  return (
    <div>
      <span>Total: ${state.total}</span>
      <button onClick={() => dispatch({ type: 'CLEAR_CART' })}>Clear</button>
    </div>
  );
}
```

### Selector Pattern with `useMemo`

For cases where splitting isn't practical, add selector memoization:

```typescript
// Custom hook with memoized selector
function useCartItem(itemId: string) {
  const state = useContext(CartStateContext)!;

  // Memoize the specific item — only triggers child re-renders when this specific item changes
  const item = useMemo(
    () => state.items.find(i => i.id === itemId),
    [state.items, itemId]
  );

  return item;
}

// The consumer only re-renders when its specific item changes:
const CartItem = React.memo(function CartItem({ itemId }: { itemId: string }) {
  const item = useCartItem(itemId);  // derived memoized value
  if (!item) return null;
  return <li>{item.id}: qty {item.quantity}</li>;
  // Re-renders only when THIS item changes, not when other items change
  // (useMemo returns same reference when state.items changes but this item's values don't)
});
```

### When Context Is and Isn't Appropriate

**Context IS appropriate for:**
- Theme, locale, color scheme (rarely changes)
- Authentication state (user, permissions) — changes only on login/logout
- Feature flags (typically static per session)
- Stable `dispatch` functions (from `useReducer`)
- Router state (current route — changes per navigation)

**Context is NOT appropriate for:**
- High-frequency updates (WebSocket data, animation state, form field values)
- Large arrays that change frequently (use Redux, Zustand, or Jotai with subscriptions)
- State needed by only 2-3 components in a nearby subtree (prop drilling is fine at small scale)
- Server state (React Query/SWR handles caching, loading, error states better)

**The React Context / Redux boundary:**

| | Context | Redux / Zustand |
|---|---|---|
| Subscription granularity | Component-level (all or nothing) | Selector-level (only changed slice) |
| DevTools | No built-in | Time travel, logging |
| Middleware | None | Thunk, Saga, logging |
| Best for | Infrequent, tree-wide values | Frequent state, shared cross-tree |
| Complexity | Low | Medium-High |

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the app had a single `AppContext` containing user info, theme, permissions, notification list, and loading state. Every WebSocket notification arrival was updating the notifications array → new context value → ALL consumers re-rendering → 50+ components re-rendering per notification in a busy production environment. The fix: split into `AuthContext` (user + permissions), `ThemeContext`, and `NotificationContext`. Notifications now only re-render ~3 components (bell icon, notification panel, unread count badge). The rest of the app is unaffected.

At Oracle, a data table's row-selection context was causing the entire table to re-render on every row click because the entire selection `Set` object reference changed. Fix: dispatch context split + memoized row component that used `useCartItem`-style derived state to check its own selection status.

**At FAANG scale:**
- **Microsoft (Office Online):** Document context splits into: `DocumentMetaContext` (title, author, last saved — rarely changes), `CollaborationContext` (active collaborators — changes on join/leave), `TrackChangesContext` (change count — updates frequently); prevents document title re-rendering on every collaborator cursor move
- **Adobe (Express):** Design editor splits into `DesignTokenContext` (brand colors, typography — rarely changes), `SelectionContext` (selected elements — changes on click), `HistoryContext` (undo stack — changes on every action); context split reduced re-renders by 60% during complex design operations
- **Salesforce (Lightning App Builder):** Component library context split from page builder state context; component palette doesn't re-render on every drag/drop operation in the canvas
- **Cisco (Smart Account):** Authentication context (user, org, permissions) kept separate from UI state context; permission checks throughout the app don't re-render on UI state changes

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "useContext re-renders every consumer whenever the context value changes — not just when the specific field the consumer uses changes. This is the core performance characteristic that distinguishes Context from Redux selectors.
>
> The main consequence: a monolithic context object that's updated frequently is a performance anti-pattern. A notification arriving, updating a notifications array in AppContext, causes the theme toggle, the user avatar, every menu item, and every sidebar component to re-render — because they're all consumers of AppContext.
>
> The solutions, roughly in order of complexity. First: split context by update frequency — auth context (changes on login/logout only), theme context (changes on preference toggle), and notification context (changes on every notification). Consumers only subscribe to what they need. Second: stabilize the context value object with useMemo in the Provider — prevent re-renders caused by the Provider itself re-rendering with a new object reference. Third: for useReducer + Context, split into separate state and dispatch contexts — action-only components subscribe to the stable dispatch and never re-render on state changes.
>
> Context is the right tool for tree-wide infrequently changing values. For high-frequency state, Redux with selectors or Zustand with subscriptions provides the granular re-render control that Context cannot."

### Likely Follow-up Questions

1. **Can you implement a selector for Context?** → Not natively — Context doesn't have selector support. You can approximate it with `useMemo` inside the consuming component or custom hook: `const user = useMemo(() => context.user, [context.user])`. This prevents the component from re-rendering if the context changes but `context.user` reference remains the same. But it still re-renders the component first (to run the hook), then bails out of rendering the return value. Libraries like `use-context-selector` provide true selector support for Context.
2. **What's the difference between Context and prop drilling?** → There's no functional difference — both are mechanisms for passing data down the component tree. Context removes the need for intermediate components to know about and forward props they don't use. The choice is based on how many intermediate components would need to forward the data. For 2-3 levels, prop drilling is clearer. For 5+ levels, context is cleaner. But the performance characteristics are the same: context updates cause all consumers to re-render, regardless of depth.
3. **How does Context interact with `React.memo`?** → `React.memo` only prevents re-renders caused by PROP changes. A `React.memo`-wrapped component that is a context consumer WILL re-render when its context changes, regardless of `React.memo`. The optimization for memoization + context consumers is the selector pattern: memoize the derived value from context within the component, and memo-ize child components based on that derived value.
4. **What is the performance impact of deeply nested Providers?** → Minimal for static providers. Each Provider adds a constant overhead at context lookup time. Performance impact comes from value changes triggering consumer re-renders throughout the subtree — the traversal cost is proportional to the number of consumers, not the depth of nesting.

### Senior Signal

> "The sophisticated insight about Context is that it optimizes for developer ergonomics (no prop drilling) but produces the opposite performance trade-off from prop drilling. With prop drilling, only the specific components that receive the prop re-render when it changes. With Context, all consumers of a context re-render when any part of its value changes. So as a codebase grows and a Context object gains more fields and more consumers, the performance regression is gradual and invisible until suddenly you have a busy production app where every notification arrival triggers 50 re-renders across unrelated parts of the UI. The way to avoid this is to treat Context values as you treat API response payloads — design them with clear boundaries, keep them small and focused, split by update frequency, and think carefully about who needs to know about what."

---

## 💻 5. Code Example

```typescript
import React, { createContext, useContext, useState, useMemo, useReducer, memo, useCallback } from 'react';

// ========================
// 1. Anti-pattern: monolithic context
// ========================

// ❌ Bad: one context for everything
interface BadAppState {
  user: AuthUser | null;
  theme: string;
  notifications: Notification[];
  pageTitle: string;
  isMenuOpen: boolean;
}
// Any notification update rerenders ALL consumers of this context

// ========================
// 2. Split contexts: auth + theme + notifications
// ========================
const AuthContext = createContext<{
  user: AuthUser | null;
  login: (creds: Credentials) => void;
  logout: () => void;
} | null>(null);

const ThemeContext = createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
} | null>(null);

const NotificationContext = createContext<{
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  dismiss: (id: string) => void;
} | null>(null);

// ========================
// 3. Provider with memoized values
// ========================
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (creds: Credentials) => {
    const u = await authenticate(creds);
    setUser(u);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  // Memoize context value — only new object on user change
  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const toggleTheme = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), []);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ========================
// 4. State + Dispatch split (from useReducer)
// ========================
type NotifAction =
  | { type: 'ADD'; notification: Notification }
  | { type: 'DISMISS'; id: string };

function notifReducer(state: Notification[], action: NotifAction): Notification[] {
  switch (action.type) {
    case 'ADD': return [...state, action.notification];
    case 'DISMISS': return state.filter(n => n.id !== action.id);
    default: return state;
  }
}

const NotifStateCtx = createContext<Notification[]>([]);
const NotifDispatchCtx = createContext<React.Dispatch<NotifAction>>(() => {});

function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, dispatch] = useReducer(notifReducer, []);
  return (
    <NotifStateCtx.Provider value={notifications}>
      <NotifDispatchCtx.Provider value={dispatch}>
        {children}
      </NotifDispatchCtx.Provider>
    </NotifStateCtx.Provider>
  );
}

// ========================
// 5. Consumers — isolated re-renders
// ========================
// Re-renders ONLY on theme change — NOT on new notifications or user changes
const ThemeToggle = memo(function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext)!;
  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
});

// Re-renders ONLY on notifications change
const NotificationBell = memo(function NotificationBell() {
  const notifications = useContext(NotifStateCtx);
  const unread = notifications.filter(n => !n.read).length;
  return <span>🔔 {unread}</span>;
});

// Only subscribes to dispatch (stable) — NEVER re-renders on state changes
const DismissButton = memo(function DismissButton({ notifId }: { notifId: string }) {
  const dispatch = useContext(NotifDispatchCtx);
  return (
    <button onClick={() => dispatch({ type: 'DISMISS', id: notifId })}>✕</button>
    // This component never re-renders even if notifications change
    // because dispatch is the only context it subscribes to
  );
});

// ========================
// 6. Selector pattern for granular reads
// ========================
function useNotification(id: string) {
  const notifications = useContext(NotifStateCtx);
  // Memoized: only changes when this specific notification changes
  return useMemo(
    () => notifications.find(n => n.id === id),
    [notifications, id]
  );
}

const NotificationItem = memo(function NotificationItem({ id }: { id: string }) {
  const notification = useNotification(id);  // selector — only rerenders when THIS notif changes
  if (!notification) return null;
  return (
    <div className={notification.read ? 'read' : 'unread'}>
      {notification.message}
      <DismissButton notifId={id} />
    </div>
  );
});

// Type helpers
interface AuthUser { id: string; name: string; }
interface Credentials { email: string; password: string; }
interface Notification { id: string; message: string; read: boolean; }
declare function authenticate(creds: Credentials): Promise<AuthUser>;
```

---

## 🧠 6. Memory Aid

**Mental Model:** Context is a PA system in an office — when the context value changes, every speaker (consumer) in the building broadcasts the update, even the ones in rooms where nobody cares about the announcement. Split context = separate PA systems for HR announcements, fire alarms, and cafeteria menus, so the cafeteria PA doesn't blast through the HR office.

**If you go blank:** "All consumers re-render on ANY context value change. Fix: split by update frequency, stabilize value with useMemo in Provider, split state and dispatch contexts separately. Context = infrequent tree-wide values. Redux/Zustand = frequent/granular subscriptions."

**Mnemonic:** **SMSS** — **S**plit by frequency, **M**emoize context value, **S**tate/Dispatch split, **S**tart with context sparingly.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: Context's "all consumers re-render on value change" characteristic is the most commonly misunderstood source of React performance problems at scale; teams that reach for Context for all shared state end up with uncontrolled re-render cascades
→ Architecture: Choosing between Context, Redux, Zustand, and prop drilling is a key architectural decision — knowing Context's performance model is required to make the right choice for each layer of state
→ Debugging: When a component re-renders unexpectedly, "is it subscribed to a frequently-changing context?" is one of the first questions in React DevTools — understanding the Context re-render model makes these bugs immediately recognizable

**How it works (3 sentences):**
When a `Context.Provider` renders with a new `value` (detected via `Object.is` comparison), React traverses the subtree starting from the Provider and marks every component that calls `useContext(ctx)` with that context as needing a re-render — bypassing `React.memo` and all other bailout mechanisms; the consumer re-renders regardless of whether it uses the changed field or cares about the change. This is fundamentally different from subscription-based state management (Redux `useSelector`, Zustand `useStore`) which re-renders the consumer only when the selected slice of state changes, enabling selector-granularity optimization. The standard mitigation strategies — context splitting by update frequency, value stabilization with `useMemo` in the Provider, and state/dispatch separation — all work by reducing the frequency or scope of reference changes that cause re-renders, rather than by changing the fundamental "all-or-nothing" subscription model.

**Company relevance:**
- Microsoft: Teams left-rail (chat list, call controls, presence indicators) split into separate contexts; every message arrival updating `messages` context doesn't cause the presence indicator, call controls, or team list to re-render
- Adobe: Creative Cloud app shell splits navigation context from document context from collaboration context; tooltip hover state changes in the navigation panel don't cause the entire design canvas to re-render
- Salesforce: Lightning Framework context boundaries separate platform authentication (changes on session events), org metadata (changes on setup), and record data (changes on user interaction); contact record changes don't cascade to the org admin panel
- Cisco: Catalyst Center dashboard separates config context (rarely changes) from telemetry context (updates every 5 seconds); topology renders don't cascade to the always-updating metrics panel

---
✅ Topic 93/486 complete → Continuing to Topic 94: useTransition & useDeferredValue — Concurrent Features
