# 54. Typing Context with Generic Providers
**Phase:** Foundations | **Sequence:** SEQ 3 — TypeScript Deep Dive | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React Context with TypeScript has one common pitfall: `createContext()` requires an initial value, but the real value only exists inside the Provider. The solution is to create context with `null` as the default and write a typed `use` hook that throws if called outside the Provider. For multi-use patterns, a generic context factory function creates typed context/provider/hook triads from any value type without repeating the null-check boilerplate. This is the production pattern used in React-based design systems.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Default Value Problem

```typescript
// ❌ Problem: createContext with wrong default type
const UserContext = React.createContext<User | null>(null);

function useUser() {
  const user = React.useContext(UserContext);
  // user: User | null — caller must null-check everywhere
  return user?.name; // always undefined outside Provider
}
```

**The correct pattern — throw outside Provider:**
```typescript
interface UserContextValue {
  user: User;
  updateUser: (patch: Partial<User>) => void;
}

// null initial value — intentional, caught by use hook
const UserContext = React.createContext<UserContextValue | null>(null);

// Custom hook with null-guard
function useUser(): UserContextValue {
  const ctx = React.useContext(UserContext);
  if (ctx === null) {
    throw new Error('useUser must be used inside <UserProvider>');
  }
  return ctx; // UserContextValue — null eliminated
}

// Provider
interface UserProviderProps {
  initialUser: User;
  children: React.ReactNode;
}

function UserProvider({ initialUser, children }: UserProviderProps) {
  const [user, setUser] = React.useState<User>(initialUser);

  const updateUser = React.useCallback((patch: Partial<User>) => {
    setUser(prev => ({ ...prev, ...patch }));
  }, []);

  const value: UserContextValue = React.useMemo(
    () => ({ user, updateUser }),
    [user, updateUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

### Generic Context Factory

For projects with multiple contexts (theme, auth, cart, notifications), writing the null-check pattern repeatedly is tedious. A factory creates the triad automatically:

```typescript
function createTypedContext<T>() {
  const Context = React.createContext<T | null>(null);

  function useContext(): T {
    const ctx = React.useContext(Context);
    if (ctx === null) {
      throw new Error(
        `useContext called outside its Provider. Wrap the component tree with the appropriate Provider.`
      );
    }
    return ctx;
  }

  return [Context, useContext] as const;
  // readonly [React.Context<T | null>, () => T]
}

// Usage — create multiple contexts with same pattern
const [ThemeContext, useTheme]   = createTypedContext<ThemeContextValue>();
const [AuthContext,  useAuth]    = createTypedContext<AuthContextValue>();
const [CartContext,  useCart]    = createTypedContext<CartContextValue>();
```

### Advanced: Context with Generic Value Type

For truly generic providers (like a selected item provider for lists):

```typescript
interface SelectionContextValue<T> {
  selected: T | null;
  select:   (item: T) => void;
  clear:    () => void;
}

// Can't use createContext<SelectionContextValue<T>> directly without T being known
// Solution: factory function with concrete type

function createSelectionContext<T>() {
  const Context = React.createContext<SelectionContextValue<T> | null>(null);

  function useSelection(): SelectionContextValue<T> {
    const ctx = React.useContext(Context);
    if (!ctx) throw new Error('useSelection must be inside SelectionProvider');
    return ctx;
  }

  function SelectionProvider({ children }: { children: React.ReactNode }) {
    const [selected, setSelected] = React.useState<T | null>(null);

    const value: SelectionContextValue<T> = React.useMemo(
      () => ({
        selected,
        select: setSelected,
        clear:  () => setSelected(null),
      }),
      [selected]
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  return { SelectionProvider, useSelection } as const;
}

// Create typed selection context for a specific entity
const { SelectionProvider: OrderSelectionProvider, useSelection: useOrderSelection } =
  createSelectionContext<SalesOrder>();

// Usage
function OrderList() {
  const { selected, select } = useOrderSelection();
  // selected: SalesOrder | null — fully typed
  return <div>{selected?.orderNumber}</div>;
}
```

### Context Performance — Preventing Re-renders

**Problem:** Every context value change re-renders ALL consumers — even if they only use a part of the context.

**Solution 1 — Split context by update frequency:**
```typescript
// Separate stable actions from frequently changing state
const UserStateContext   = React.createContext<User | null>(null);
const UserActionsContext = React.createContext<UserActions | null>(null);

// Components that only dispatch don't re-render when state changes
function UserAvatar() {
  const user = useUserState();    // re-renders when user changes
  return <img src={user.avatar} />;
}

function UserMenu() {
  const { logout } = useUserActions(); // never re-renders from state changes
  return <button onClick={logout}>Logout</button>;
}
```

**Solution 2 — `useMemo` on context value:**
```typescript
const value = React.useMemo(
  () => ({ user, updateUser }),
  [user, updateUser] // only recreates when user or updateUser changes
);
```

### ⚠️ Anti-Patterns & Pitfalls

- **`createContext<T>(undefined as any)`** — using `as any` to avoid providing an initial value bypasses type safety. Use `null` with a guarded custom hook instead.
- **Putting everything in one large context** — any change to any part triggers all consumer re-renders. Split by domain and update frequency.
- **Using context for server state** — Context is for UI state (theme, auth user, selection). Server data belongs in React Query / SWR / RTK Query — not context.
- **Forgetting `useMemo` on context value** — providers that compute the value object inline `value={{ user, updateUser }}` create a new object reference every render, causing all consumers to re-render even when nothing changed.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
At SAP Labs, micro frontends needed a shared authentication context across shell and child apps. A generic `createTypedContext<AuthContextValue>()` factory created the auth provider and hook; micro frontends imported the hook and got the fully typed user object without null-checking. The generic selection context factory was used for SAP Fiori object pages — `createSelectionContext<BusinessPartner>()` gave the selection panel and detail panel typed access to the selected item without prop drilling. At Bosch, the WebSocket state was split into two contexts — `WsConnectionContext` (connection state, rarely changes) and `WsMessageContext` (latest message, changes frequently) — preventing the connection state consumers from re-rendering on every message.

**At FAANG scale:**
- **Microsoft:** Fluent UI v9 uses typed context for theme injection — `ThemeContext` with the factory pattern; interviewers expect knowledge of split context for performance
- **Adobe:** React Spectrum uses provider + context for locale, theme, and interaction modality — generic typed context is standard Adobe architecture
- **Salesforce:** LWC-to-React bridge uses typed context to inject platform capabilities (navigation, notifications) — context factory patterns are expected in platform engineering
- **Cisco:** Webex meetings SDK React provider wraps meeting state and actions in split contexts — state vs action split is explicitly used for performance

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "The pattern I use for all React contexts: create with `null` initial value, write a custom `use` hook that throws if the value is null — that eliminates the null-check from every consumer. For projects with many contexts, a generic `createTypedContext<T>()` factory generates the context, the hook, and optionally the Provider, all in one call. For generic value types — like a selection context that works with any entity type — I write a `createSelectionContext<T>()` factory that closes over T and returns a typed Provider and hook pair. The performance angle: always memoize the context value with `useMemo`, and split high-frequency state from stable actions into separate contexts so action consumers don't re-render on state changes."

### Likely Follow-up Questions
1. **Why use `null` as the default for `createContext`?** → Because the real value only exists inside the Provider — `null` allows detecting "outside Provider" at runtime; `undefined` would silently use wrong values
2. **Why wrap the context value in `useMemo`?** → Prevents recreating the value object every render — without it, all consumers re-render even when nothing actually changed
3. **When would you split a context into two?** → When part of the context changes frequently (state) and part is stable (actions) — consumers of actions shouldn't re-render on every state change
4. **What happens if you call a context hook outside its Provider?** → With the null-guard pattern, it throws a meaningful error immediately. Without it, the component silently gets `undefined` and fails unpredictably.

### How to Signal Senior Thinking
> "The factory pattern for typed contexts solves a real scalability problem. In micro frontend architectures at SAP, we had 8 different shared contexts — each with the same null-guard boilerplate. The factory abstractor reduced that to a one-liner per context. The type parameter flows through the factory: `createTypedContext<AuthContextValue>()` returns a hook typed as `() => AuthContextValue` — no null in the return type, no need to null-check at call sites. That's the difference between library-quality context patterns and application-level patterns."

---

## 💻 5. Code Example

```typescript
// ─── Generic context factory ──────────────────────────────────────────

function createTypedContext<T>(name: string) {
  const Context = React.createContext<T | null>(null);
  Context.displayName = name; // React DevTools label

  function useCtx(): T {
    const value = React.useContext(Context);
    if (value === null) {
      throw new Error(`\`${name}\` context hook called outside its Provider. ` +
        `Ensure the component is wrapped in <${name}Provider>.`);
    }
    return value;
  }

  return [Context, useCtx] as const;
}

// ─── Auth context — split state + actions ────────────────────────────

interface AuthState {
  user:   User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

interface AuthActions {
  login:  (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const [AuthStateContext,   useAuthState]   = createTypedContext<AuthState>('AuthState');
const [AuthActionsContext, useAuthActions] = createTypedContext<AuthActions>('AuthActions');

interface AuthProviderProps { children: React.ReactNode }

function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    status: 'loading',
  });

  // Stable actions — don't change when state changes
  const actions: AuthActions = React.useMemo(() => ({
    login: async (credentials) => {
      const user = await authService.login(credentials);
      setState({ user, status: 'authenticated' });
    },
    logout: async () => {
      await authService.logout();
      setState({ user: null, status: 'unauthenticated' });
    },
  }), []); // ← empty deps: actions never change

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthStateContext.Provider value={state}>
        {children}
      </AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  );
}

// ─── Generic selection context factory ───────────────────────────────

function createSelectionContext<T>() {
  const [Context, useCtx] = createTypedContext<{
    selected: T | null;
    select:   (item: T) => void;
    clear:    () => void;
  }>('Selection');

  function SelectionProvider({ children }: { children: React.ReactNode }) {
    const [selected, setSelected] = React.useState<T | null>(null);
    const value = React.useMemo(() => ({
      selected,
      select: setSelected,
      clear:  () => setSelected(null),
    }), [selected]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  return { SelectionProvider, useSelection: useCtx } as const;
}

// Create entity-specific selection context
const { SelectionProvider: OrderSelectionProvider, useSelection: useOrderSelection } =
  createSelectionContext<SalesOrder>();

// Consumer — selected is SalesOrder | null
function OrderDetail() {
  const { selected, clear } = useOrderSelection();
  if (!selected) return <p>No order selected</p>;
  return (
    <div>
      <h2>{selected.orderNumber}</h2>
      <button onClick={clear}>Close</button>
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** Context = ambient state. Null default + guarded hook = safe required context. Factory = reusable typed pattern. Split = state from actions for performance.

**If you go blank:** "createContext(null). Custom hook: if null throw error. useMemo on provider value. Split state and actions into separate contexts for performance. Factory function for multiple contexts."

**Mnemonic:** **NGMS = Null-default, Guard-hook, Memo-value, Split-state-actions**

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Context is the dependency injection for React — incorrect typing means null values surface as runtime errors, not compile errors  
→ Performance: Unsplit context with no `useMemo` causes whole component trees to re-render on any state change — directly impacts user-perceived performance  
→ Business: In micro-frontend and design system architectures, typed context is the cross-boundary communication layer — correctness matters at every consumer

**How it works (3 sentences):**
`createContext<T | null>(null)` creates a context whose real value is provided by the Provider — using `null` as default makes it detectable when consumed outside a Provider. A custom `use` hook with an `if (ctx === null) throw` guard eliminates `T | null` from all consumer types, giving callers `T` directly. Wrapping the context value in `useMemo` prevents reference identity changes on every render, which would otherwise trigger re-renders in all consumers even when no actual value changed.

**Company relevance:**
- Microsoft: Fluent UI uses context factories for theme and locale — typed context patterns are architectural standards in Microsoft's React codebases
- Adobe: React Spectrum's provider tree (locale, theme, interaction modality) is layered typed contexts — Adobe interviewers test context performance and split patterns
- Salesforce: Platform capability injection via context is the LWC-React bridge pattern — typed context with null guard is required
- Cisco: Meeting state provider in Webex React SDK uses split contexts — state and actions separated to avoid re-renders on every data update

---
**✅ Topic 54/486 complete.**
**→ Continuing to Topic 55: Typing HOCs and Render Props**
