# 65. Prop Drilling vs Context

## 1. High-Level Explanation (Frontend Interview Level)

**Prop drilling** is the pattern of passing data through multiple intermediate component layers via props, even when those intermediate components don't use the data themselves — they serve only as conduits to pass props to deeper components. **React Context** solves prop drilling by providing a way to share values across the component tree without explicit prop passing at every level: a `Provider` wraps a subtree and any component inside it can read the value via `useContext`, regardless of tree depth. The architectural question is not "Context vs prop drilling" in isolation, but "Context vs prop drilling vs global state vs component composition" — all four are valid tools, and choosing the wrong one creates either unnecessary coupling (global state for local data) or performance problems (Context for frequently-updated values).

**Key Principle:** Context is not a state management solution — it is a **dependency injection mechanism**. It solves "how to make a value available to a deep component" but it does not solve "how to manage complex state changes efficiently."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Prop Drilling Spectrum

```
Level 1-2: No problem — explicitly passing props is often preferable
  <ParentComponent theme={theme}>
    <ChildComponent theme={theme} />  ← visible, explicit, easy to trace
  </ParentComponent>

Level 3-4: With TypeScript interfaces, prop drilling is manageable
  Props bubble through interfaces → all layered components carry the prop in their types

Level 5+: Anti-pattern territory
  <A theme={theme}>        ← A doesn't need theme
    <B theme={theme}>      ← B doesn't need theme
      <C theme={theme}>    ← C doesn't need theme
        <D theme={theme} /> ← D finally uses theme
      </C>
    </B>
  </A>
  
  Problems:
  - A, B, C have bloated props interfaces
  - Changing the shape of `theme` requires updating A, B, C even though they don't use it
  - Moving D requires passing theme through whatever new parent chain it ends up in
```

### When to Use Each Approach

| Situation | Solution |
|---|---|
| Data used by a direct child (1 level) | Props |
| Data used by a grandchild (2 levels) with clear ownership | Props |
| Data used by many consumers in a single subtree (theme, locale, modal context) | Context |
| Data used across unrelated subtrees (auth, cart, notifications) | Global state (Zustand/Redux) |
| Intermediate components being "burdened" with passing irrelevant props | Context or component composition |

### Component Composition — The Underused Alternative to Prop Drilling

The most underutilised React pattern for avoiding prop drilling is **component composition** — instead of drilling a prop through intermediaries, pass the component that needs the prop as `children`:

```typescript
// ❌ Prop drilling: App → Layout → Sidebar → UserProfile all receive `user`
function App() {
  const user = useCurrentUser();
  return <Layout user={user} />;  // Layout doesn't use user directly
}
function Layout({ user }) {
  return <Sidebar user={user} />;  // Sidebar doesn't use user directly
}
function Sidebar({ user }) {
  return <UserProfile user={user} />;  // ← UserProfile finally uses user
}

// ✅ Composition: pass the component that needs `user` as children
function App() {
  const user = useCurrentUser();
  return (
    <Layout>
      <Sidebar>
        <UserProfile user={user} />  {/* user stays in App, passed directly */}
      </Sidebar>
    </Layout>
  );
}
function Layout({ children }) { return <div>{children}</div>; }  // no user prop
function Sidebar({ children }) { return <nav>{children}</nav>; }  // no user prop
```

This pattern eliminates prop drilling entirely for many common cases without introducing Context's re-render implications.

### React Context — Implementation and Performance

```typescript
// Context implementation with performance-conscious design

// 1. Create typed context
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// 2. Custom hook with guard
function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

// 3. Provider with memoisation to prevent child re-renders from parent re-renders
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // ⚠️ CRITICAL: memoize the context value
  // Without memo: every re-render of ThemeProvider creates a new object reference
  // → ALL consumers re-render even when theme value hasn't changed
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme: () => setTheme((t) => t === 'light' ? 'dark' : 'light') }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

### The Context Re-Render Problem

**The single biggest Context mistake:** Every consumer of a Context re-renders when ANY value the Provider provides changes — even if the consumer only uses a stable portion of that value.

```typescript
// ❌ Single large context — ALL consumers re-render on ANY change
const AppContext = createContext({ user, theme, notifications, cart });
// If notifications change, user profile AND theme selector AND cart count ALL re-render

// ✅ Split contexts by update frequency
const UserContext = createContext<User | null>(null);           // changes: login/logout
const ThemeContext = createContext<ThemeValue>(defaultTheme);   // changes: theme toggle  
const NotificationContext = createContext<Notification[]>([]);  // changes: frequently
const CartContext = createContext<CartState>(emptyCart);        // changes: on add/remove

// Each consumer only re-renders when their specific context changes
```

### Context Splitting Strategy

```typescript
// Pattern: Split stable values from unstable values in the same domain

// AuthContext: split into two
const AuthUserContext = createContext<User | null>(null);   // stable after login
const AuthActionsContext = createContext<AuthActions>(defaultActions); // stable functions

function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Actions are stable references (useCallback) — never change
  const actions = useMemo(() => ({
    login: async (creds: LoginCredentials) => { /* ... */ setUser(result); },
    logout: () => setUser(null),
  }), []); // empty deps — login/logout functions are stable

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthUserContext.Provider value={user}>
        {children}
      </AuthUserContext.Provider>
    </AuthActionsContext.Provider>
  );
}

// LoginButton only needs actions — NEVER re-renders when user object changes
function LoginButton() {
  const { login } = useContext(AuthActionsContext);  // never re-renders
  return <button onClick={() => login(creds)}>Login</button>;
}

// UserAvatar only needs user — re-renders when user changes
function UserAvatar() {
  const user = useContext(AuthUserContext);
  return user ? <img src={user.avatar} alt={user.name} /> : null;
}
```

### Trade-offs Summary

| Dimension | Prop Drilling | Context | Global State (Zustand) |
|---|---|---|---|
| Coupling | High (intermediaries carry props) | Medium (consumers couple to Context shape) | Low (components subscribe independently) |
| Re-renders | Targeted — only explicit children | ALL context consumers on any change | Selective per subscription |
| Debugging | Easy — follow the prop trail | Moderate — trace Context Provider | Harder without DevTools |
| Best for | 1-2 levels, explicit composition | Theme / locale / design-system values | Cross-subtree frequently-changing state |
| Server-side rendering | Native | Native | Requires hydration strategy |

---

## 3. Real-World Examples

**React Router (Context internally):** React Router uses Context internally — `RouterContext` provides `location`, `history`, and match data to all `<Link>` and `useNavigate` consumers without prop drilling through every component in the tree.

**Radix UI Themes:** Radix UI's `<Theme>` component uses Context to provide theme tokens and appearance settings to all primitive components in the subtree — exact use case where Context excels (stable, rarely-changing values consumed by many leaves).

**At Hruday's level:** In the SAP BI Launchpad, the authentication context (current SAP user, tenant, feature flags) was provided via a shell-level Context. Each widget consumed only the slice it needed. The analytics widgets consumed `tenantId` and `userId`; filter panels consumed `userPermissions`; the theme used throughout was provided by SAP UI5's theming Context equivalent — the `sap.ui.core.theming.Theming` API.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Prop drilling becomes a problem past 2-3 levels when intermediate components carry props they don't use — every change to the prop's shape requires updating all intermediate types, and refactoring is painful. Context solves the access problem but introduces the re-render problem: every consumer re-renders when any value in the Context changes. The fix is splitting one large context into multiple contexts by update frequency — stable values like auth actions and theme in one provider, frequently-updated values like notification count in another. Before reaching for Context, I first check whether component composition solves the problem — passing the component that needs the data as `children` instead of passing data as props through intermediaries. That often eliminates the drilling entirely without any Context overhead. Context is genuinely the right tool when you have stable, shared values that many components in a subtree need — theme, locale, design system tokens, authenticated user."

**Likely Follow-up Questions:**
1. Does Context replace Redux? → No. Context is dependency injection (solving access); Redux is state management (solving mutation patterns, time-travel, middleware). For frequently-updating state, Redux or Zustand avoid Context's re-render problem.
2. What is `useContextSelector` and when is it useful? → `use-context-selector` library provides a hook that re-renders only when the component's specific selector result changes (like Redux `useSelector`), solving the "all consumers re-render" problem of native Context
3. How does Angular solve the same problem? → Angular's Dependency Injection system is the framework-level equivalent: services are injected at the module/component level hierarchy, consumers declare them in their constructor, and the injector tree manages sharing — same concept as React Context Provider hierarchy

---

## 5. Code Example

```typescript
// Locale context — classic correct Context use case
type Locale = 'en' | 'de' | 'ja' | 'ar';
interface LocaleContextValue {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be inside LocaleProvider');
  return ctx;
}

export function LocaleProvider({ children, defaultLocale = 'en' }: LocaleProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const translations = useTranslations(locale); // loads locale JSON

  const value = useMemo(() => ({
    locale,
    t: (key: string) => translations[key] ?? key,
    setLocale,
  }), [locale, translations]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// Usage anywhere in tree — zero prop drilling
function WelcomeMessage() {
  const { t } = useLocale();
  return <p>{t('welcome.message')}</p>;
}
```

---

## 6. Memory Aid

**Mental Model:** Prop drilling is handing a package through a relay race — every runner (component) must hold the package even though they don't need it. Context is a **locker room** — you put the package in the locker (Provider), and anyone with the key (useContext) can access it directly without the relay.

**Context re-render rule:** If a value in the Context changes, ALL consumers re-render unless you split contexts or use `useContextSelector`.

**Decision tree:** 1-2 levels → props. 3+ levels, static value → Context. 3+ levels, dynamic/frequently-updated → Zustand/Redux. Within a single subtree → try composition first.

---

## 7. Why & How Summary

**Why it matters:** Prop drilling at scale creates tight coupling between intermediate components and data they don't use — refactoring is painful, TypeScript interfaces are bloated, and component reuse is difficult. Context solves the access problem cleanly for appropriate use cases.

**How it works:** React Context uses a Provider component to register a value in a React internal Context registry. Consumers call `useContext(MyContext)`, which reads the nearest `Provider` ancestor's current value. When the Provider's value reference changes, React queues re-renders for all subscribing consumers — which is why memoising the Provider's value object with `useMemo` is critical.

**Company relevance:**
- Microsoft: Large React apps like Azure Portal with many deeply nested feature panels benefit from carefully structured Context hierarchies for auth and permission data
- Adobe: Creative workspace UI with panels consuming the same document state uses Context with careful splitting to avoid inter-panel coupling
- Salesforce: LWC uses property binding (equivalent to props) and Lightning Message Service (equivalent to global Context/events) for cross-component communication
- Cisco: Angular's DI system is architecturally equivalent; understanding React Context maps directly to Angular service injection hierarchy understanding
