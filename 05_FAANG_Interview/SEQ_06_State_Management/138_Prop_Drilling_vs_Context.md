# 138. Prop Drilling vs Context
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Prop drilling is passing data through multiple intermediary components that don't use it themselves — just passing it down to deeper children. It creates coupling: renaming a prop requires changes in every intermediary. Context solves this by broadcasting a value to any descendant that subscribes, skipping intermediaries. The performance trap: every time Context value changes, ALL consumers re-render — even those that only care about part of it. The correct tool selection is: props for 1–2 levels deep, Context for low-frequency read-heavy data (theme, locale, auth user), and a global store (Zustand) for frequently mutating state that many components need. Context is not a replacement for a state manager — it's a dependency injection mechanism.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Prop Drilling Problem

```typescript
// USER data needed deep in the tree — passed through components that don't use it

// Top level: user data lives here
function App() {
  const [user, setUser] = useState<User>({ name: 'Hruday', role: 'admin' });
  return <Layout user={user} />;
}

// Layout: doesn't use user — just passes it down
function Layout({ user }: { user: User }) {
  return (
    <div>
      <Sidebar user={user} />  {/* doesn't use user */}
      <Main user={user} />
    </div>
  );
}

// Main: doesn't use user — just passes down
function Main({ user }: { user: User }) {
  return <Dashboard user={user} />;
}

// Dashboard: doesn't use user — passes to child
function Dashboard({ user }: { user: User }) {
  return <Header user={user} />;
}

// Header: FINALLY uses it
function Header({ user }: { user: User }) {
  return <h1>Welcome, {user.name}</h1>;
}

// PROBLEMS with prop drilling:
// 1. Layout, Main, Dashboard have a prop they don't use — dead weight
// 2. If user object shape changes, must update all 5 components
// 3. Adding a third layer means threading through even more files
// 4. Every ancestor re-renders when user changes (even those that only pass it)
```

### Context — Dependency Injection for React

```typescript
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// 1. Create context with a type-safe default (or null for mandatory provision)
interface UserContextValue {
  user: User;
  updateUser: (updates: Partial<User>) => void;
}

// null default + undefined check pattern — forces consumers to be inside a Provider
const UserContext = createContext<UserContextValue | null>(null);

// 2. Custom hook — encapsulates context access + null-check
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}

// 3. Provider — wraps the tree that needs access
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>({ name: 'Hruday', role: 'admin' });

  const value = useMemo(
    () => ({
      user,
      updateUser: (updates: Partial<User>) => setUser(prev => ({ ...prev, ...updates })),
    }),
    [user]  // CRITICAL: memoize value object — new object reference every render = all consumers re-render
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// 4. Consumer — zero prop drilling, no intermediaries involved
function Header() {
  const { user } = useUser();  // directly accesses context
  return <h1>Welcome, {user.name}</h1>;
}

// App root — no user prop drilling needed anywhere
function App() {
  return (
    <UserProvider>
      <Layout />
    </UserProvider>
  );
}
// Layout, Main, Dashboard no longer need user prop at all
```

### The Context Re-render Problem

```typescript
// THE FUNDAMENTAL PROBLEM:
// Context does NOT have selector support — every consumer re-renders when ANY part of the
// context value changes, even if the consumer only reads a part that didn't change.

// Example: ThemeContext has { theme: 'dark', fontSize: 16 }
// A button that only uses 'theme' still re-renders when fontSize changes.

// ❌ ANTI-PATTERN: one large context = many unnecessary re-renders
interface AppContextValue {
  user: User;           // changes on login/logout (infrequent)
  theme: 'dark' | 'light';   // changes on toggle (occasional)
  cartItems: CartItem[];      // changes often on every add/remove
  notifications: Notification[]; // changes frequently
}
const AppContext = createContext<AppContextValue | null>(null);
// A component consuming only `theme` re-renders every time cartItems changes!

// ✅ SOLUTION 1: Context splitting — separate contexts for separate concerns
const AuthContext  = createContext<AuthValue | null>(null);    // changes: infrequent
const ThemeContext = createContext<ThemeValue | null>(null);   // changes: occasional
// DON'T put cartItems or notifications in Context — use Zustand for those

// Components subscribe to the exact context they need
function Avatar() {
  const { user } = useAuth();  // re-renders only on auth change
  return <img src={user.avatar} alt={user.name} />;
}

function ThemeIcon() {
  const { theme, toggle } = useTheme();  // re-renders only on theme change
  return <button onClick={toggle}>{theme === 'dark' ? '☀️' : '🌙'}</button>;
}
```

### Context with Selectors — Advanced Pattern

```typescript
// For when you need Context but want selector-like behavior
// (avoids adding Zustand for truly simple cases)

// Pattern: split into a "state" context and a "dispatch" context
// State consumers re-render on state change; dispatch consumers never re-render

interface ThemeState { theme: 'dark' | 'light'; fontSize: 'sm' | 'md' | 'lg'; }
type ThemeAction = { type: 'toggle' } | { type: 'setFontSize'; size: ThemeState['fontSize'] };

const ThemeStateContext  = createContext<ThemeState | null>(null);
const ThemeDispatchContext = createContext<React.Dispatch<ThemeAction> | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    (s: ThemeState, a: ThemeAction): ThemeState => {
      switch (a.type) {
        case 'toggle': return { ...s, theme: s.theme === 'dark' ? 'light' : 'dark' };
        case 'setFontSize': return { ...s, fontSize: a.size };
        default: return s;
      }
    },
    { theme: 'light', fontSize: 'md' }
  );

  return (
    <ThemeStateContext.Provider value={state}>
      <ThemeDispatchContext.Provider value={dispatch}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeStateContext.Provider>
  );
}

// ThemeToggle ONLY reads dispatch — never re-renders on theme state changes
function ThemeToggle() {
  const dispatch = useContext(ThemeDispatchContext)!;
  return <button onClick={() => dispatch({ type: 'toggle' })}>Toggle theme</button>;
}

// ThemedText reads both — re-renders when theme or fontSize changes
function ThemedText({ text }: { text: string }) {
  const { theme, fontSize } = useContext(ThemeStateContext)!;
  return <p data-theme={theme} data-size={fontSize}>{text}</p>;
}
```

### When to Use Each Pattern

```typescript
// Decision tree:
//
// 1 level deep       → just pass the prop directly
//
// 2 levels deep      → pass as prop; consider if it will grow
//
// 3+ levels deep     → ask: does each intermediary need to know about this?
//   → If YES (intermediaries need it too): legitimate prop passing, not drilling
//   → If NO (pure pass-through):
//       Changes rarely (theme, locale, user) → Context
//       Changes often + many consumers       → Zustand / global store
//
// Composition pattern (often underused — avoids drilling without Context)

// ❌ Drilling editMode 3 levels for no reason
function Page() {
  const [editMode, setEditMode] = useState(false);
  return <Section editMode={editMode} setEditMode={setEditMode} />;
}
function Section({ editMode, setEditMode }) {
  return <Card editMode={editMode} setEditMode={setEditMode} />;
}
function Card({ editMode, setEditMode }) {
  return <button onClick={() => setEditMode(!editMode)}>{editMode ? 'Save' : 'Edit'}</button>;
}

// ✅ Composition: pass the component itself, not data about it
function Page() {
  const [editMode, setEditMode] = useState(false);
  const editButton = <button onClick={() => setEditMode(!editMode)}>{editMode ? 'Save' : 'Edit'}</button>;
  return <Section footer={editButton} />;  // Section just renders what it's given
}
function Section({ footer }: { footer: ReactNode }) {
  return <Card footer={footer} />;
}
function Card({ footer }: { footer: ReactNode }) {
  return <div>{footer}</div>;  // Children/slots pattern — no data knowledge needed
}
```

### Architecture & Component Boundaries

```typescript
// Context composition — how enterprise apps structure multiple contexts:

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>          {/* user identity — rarely changes */}
        <ThemeProvider>       {/* theme preferences — changes on toggle */}
          <I18nProvider>      {/* locale/translations — rarely changes */}
            <ToastProvider>   {/* notifications — changes are ephemeral */}
              {children}
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Note: CartProvider is NOT here — cart changes frequently
// Cart state lives in Zustand instead → no Provider needed, selector-based subscriptions
```

### Performance Implications

```typescript
// Context re-render cost:
// Value object reference check: context consumers re-render if value reference is new
// Pure consumer bailout: React.memo does NOT prevent Context re-renders
// (React.memo only bails out on props — Context bypasses prop comparison)

// Proof:
const ThemeContext = createContext({ theme: 'light' });

// React.memo does NOT help here — context bypasses memo
const MemoizedButton = React.memo(function Button() {
  const { theme } = useContext(ThemeContext);  // unstoppable re-render
  return <button>{theme}</button>;
});

// The ONLY ways to prevent unnecessary Context re-renders:
// 1. useMemo on the value object in the Provider
// 2. Split into multiple contexts
// 3. State/Dispatch split pattern
// 4. Replace with Zustand (selector-based)
```

### Trade-offs

| Props | Context | Zustand / Global Store |
|---|---|---|
| Explicit, traceable data flow | Zero pass-through boilerplate | Selector-based fine re-renders |
| No setup required | Re-renders ALL consumers on change | Setup required (create store) |
| Coupling at every level | No intermediary coupling | No component coupling |
| Good for: leaf component data | Good for: theme, locale, user | Good for: cart, notifications |

### ⚠️ Anti-Patterns & Pitfalls

- **Forgetting `useMemo` on Context value** — `value={{ user, updateUser }}` creates a new object every render → ALL consumers re-render on every parent render, even if user didn't change
- **Putting frequently mutating state in Context** — notifications, cart items, real-time data in Context causes excessive re-renders; use Zustand for those
- **Using Context as a substitute for Zustand** — Context has no selector support, no devtools integration, no middleware; it's dependency injection, not a state manager
- **Not providing a fallback/error** — `useContext(SomeContext)` returns `undefined` if used outside Provider; always add a null check or throw in the custom hook

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, the application had a `ThemeContext` and `UserContext` (properly split), both used across 40+ modules. A performance audit found a pattern where the UserContext value object was recreated on every parent render (missing `useMemo`), causing ALL 40 modules to re-render on unrelated state changes. Adding `useMemo` to the UserContext provider collapsed a 280ms re-render chain to 18ms. Cart and product filter state — which changed frequently — was moved to a Zustand store, further eliminating unnecessary Context re-renders.

**At FAANG scale:**
- **Microsoft:** Azure Portal uses context for tenant/subscription selection (rarely changes, read by every panel) and theme; component state and server data live in Redux/React Query
- **Adobe:** Express uses a ThemeContext for the UI shell; canvas-specific state (selected layers, tool state) is component-local with Zustand for cross-tool communication
- **Salesforce:** Record page providers inject the record data via context to a fixed tree of components — the record is page-scoped, not app-global, so a Provider wrapping the record view is the right scope
- **Cisco:** The device inspection panel uses a `DeviceContext` scoped to the inspection panel subtree — not global, just an alternative to prop drilling within that bounded section of the UI

---

## 💬 4. Interview Execution

### Sample Answer

> "Prop drilling happens when data passes through components that don't use it — they're just conduits. The harm is coupling: every intermediary must know the data's shape, and a rename forces changes in every layer. Context solves this by broadcasting a value to any descendant, skipping intermediaries entirely.
>
> The important nuance is Context's re-render behavior: when the context value changes, every consumer re-renders — React.memo doesn't help because Context bypasses prop comparison. This makes Context correct for low-frequency state like theme, locale, and user identity, but wrong for frequently-changing state like cart items or notifications. For those, I use Zustand: selector-based, so a component refreshes only when its exact slice changes.
>
> At SAP, missing `useMemo` on a UserContext value caused 40 components to re-render on every keystroke in a search input. The fix was a single `useMemo` wrapping the context value. For frequently-changing state, I moved it to Zustand — zero Provider needed, and each component subscribes to exactly the fields it reads."

### Likely Follow-up Questions
1. "Why doesn't `React.memo` help with Context?" → Context bypasses Props — memo compares props; context subscriptions are separate
2. "How do you prevent Context re-renders?" → `useMemo` on value object; context splitting; state/dispatch split; switch to Zustand
3. "When would you pick Context over Zustand?" → Low-frequency, read-heavy, scoped to a subtree (not global), no fine-grained subscription needed
4. "What's the composition pattern alternative to prop drilling?" → Pass components (children/slots) instead of data — avoids needing to pass down the data at all
5. "Is Context slow?" → Only if abused — single large context with frequent updates; split contexts + `useMemo` make it fast for the right use cases

### vs Alternatives

| Context | Props | Zustand |
|---|---|---|
| Skips intermediaries | Explicit clear flow | Selector prevents blast radius |
| Re-renders all consumers | Re-renders prop receivers | Only subscribed slice re-renders |
| No selector support | N/A | Full selector support |

---

## 💻 5. Code Example

```typescript
// Complete implementation: split contexts + memoized values + custom hooks

// ---- Theme Context (state + dispatch split) ----
type Theme = 'light' | 'dark' | 'system';
const ThemeStateCtx = createContext<Theme | null>(null);
const ThemeDispatchCtx = createContext<((t: Theme) => void) | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Lazy init from localStorage
    return (localStorage.getItem('theme') as Theme) ?? 'system';
  });

  const handleSetTheme = useCallback((t: Theme) => {
    setTheme(t);
    localStorage.setItem('theme', t);
  }, []);

  return (
    <ThemeStateCtx.Provider value={theme}>
      <ThemeDispatchCtx.Provider value={handleSetTheme}>
        {children}
      </ThemeDispatchCtx.Provider>
    </ThemeStateCtx.Provider>
  );
}

// Typed custom hooks — clean API, null-safety built in
export function useTheme() {
  const ctx = useContext(ThemeStateCtx);
  if (ctx === null) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

export function useSetTheme() {
  const ctx = useContext(ThemeDispatchCtx);
  if (ctx === null) throw new Error('useSetTheme must be inside ThemeProvider');
  return ctx;
}

// ---- ThemeToggle: only reads dispatch — NEVER re-renders on theme change ----
function ThemeToggle() {
  const setTheme = useSetTheme();  // dispatch context — stable reference
  return (
    <select onChange={e => setTheme(e.target.value as Theme)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}

// ---- ThemeBody: reads state — re-renders on theme change ----
function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <div data-theme={theme}>{children}</div>;
}

// ---- Auth Context (stable user + memoized methods) ----
interface AuthValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (creds: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // useCallback ensures login/logout are stable references across renders
  const login = useCallback(async (creds: { email: string; password: string }) => {
    const u = await api.auth.login(creds);
    setUser(u);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  // useMemo: value object only changes when user changes
  const value = useMemo<AuthValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
```

---

## 🧠 6. Memory Aid

**Prop drilling vs Context vs Store — RFM rule:**
- **R**arely changes + read by many descendants → **Context** (theme, locale, user)
- **F**requently changes + many consumers → **Store** (Zustand/Redux) — selector matters
- **M**inimal / 1-2 levels → **Props** — no abstraction needed

**Context re-render prevention checklist:**
1. `useMemo` on the value object in Provider ← most forgotten
2. Split state and dispatch into separate Contexts
3. Split large contexts into domain contexts
4. Replace with Zustand if still problematic

**Memory device:** "Context is an injection needle, not a state container."

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The `useMemo` on Context value is the single most commonly missed optimization in React apps — without it, the Provider re-renders cause ALL consumers to re-render on every parent render cycle, completely negating the benefit of using Context; flagging this in an interview shows you understand how Context works at the diffing level, not just the API level
→ React.memo + Context is a common interview trick question — people assume memo will bail out, but Context subscriptions are not props; memo protects against parent re-renders via props, not context changes; showing you know this distinction demonstrates deep React knowledge
→ The composition pattern (passing components instead of data) is an elegant but underused alternative to both prop drilling and Context — it eliminates the need to pass data through intermediaries by passing the rendered component itself; demonstrating this pattern shows breadth of React thinking beyond the useState/Context/Redux trilogy

**How it works (2 sentences):**
React Context works by maintaining a "context stack" during the React tree traversal — when `useContext(SomeContext)` is called during a component's render, React walks up the fiber tree from that component's position to find the nearest `SomeContext.Provider` and retrieves its current value; when the Provider's value prop changes (by reference), React marks all fiber nodes that called `useContext(SomeContext)` as needing re-render, without any way to filter by which part of the value changed.
The `useMemo` wrapping the context value object is therefore critical: without it, every parent render creates a new object reference (even if the data inside is identical), React's reference check sees a new value, and all consumers re-render unnecessarily — `useMemo` ensures the value reference is stable as long as the dependency array values haven't changed.

---
✅ Topic 138/486 complete → Continuing to Topic 139: Derived State vs Computed State
