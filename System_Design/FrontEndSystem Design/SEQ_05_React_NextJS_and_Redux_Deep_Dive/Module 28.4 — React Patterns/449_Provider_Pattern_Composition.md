# 449 – Provider Pattern and Composition

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Provider Pattern**: Wrap app sections with Context.Provider to inject shared data (theme, auth, locale). **Composition** avoids "Provider hell" by structuring component trees to pass data through children/props instead of deep context nesting. Key principle: **prefer composition over context for local data**.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── PROVIDER HELL PROBLEM ────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <RouterProvider>
            <QueryProvider>
              <NotificationProvider>
                <ModalProvider>
                  <MainApp />
                </ModalProvider>
              </NotificationProvider>
            </QueryProvider>
          </RouterProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// ──── SOLUTION 1: Compose Providers utility ────
function composeProviders(...providers: React.FC<{ children: ReactNode }>[]) {
  return function ComposedProviders({ children }: { children: ReactNode }) {
    return providers.reduceRight(
      (acc, Provider) => <Provider>{acc}</Provider>,
      children,
    );
  };
}

const AppProviders = composeProviders(
  ThemeProvider,
  AuthProvider,
  I18nProvider,
  RouterProvider,
  QueryProvider,
);

function App() {
  return (
    <AppProviders>
      <MainApp />
    </AppProviders>
  );
}

// ──── SOLUTION 2: Composition over Context ────
// BAD: Deep prop drilling solved with Context
function Page() {
  return <Layout><Content /></Layout>;
}
function Layout({ children }) {
  return <Sidebar><Main>{children}</Main></Sidebar>;
}
// Each level passes user down... or uses Context

// GOOD: Composition — pass composed components
function Page() {
  const user = useUser();
  return (
    <Layout
      sidebar={<Sidebar user={user} />}
      content={<Content user={user} />}
      header={<Header user={user} />}
    />
  );
}

function Layout({ sidebar, content, header }: {
  sidebar: ReactNode;
  content: ReactNode;
  header: ReactNode;
}) {
  return (
    <div className="layout">
      <div className="header">{header}</div>
      <div className="sidebar">{sidebar}</div>
      <div className="main">{content}</div>
    </div>
  );
}

// ──── CUSTOM PROVIDER WITH HOOKS ────
interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const login = async (creds: Credentials) => {
    const user = await api.login(creds);
    setUser(user);
  };
  
  const logout = () => {
    setUser(null);
    api.logout();
  };
  
  const value = useMemo(
    () => ({ user, login, logout, isAuthenticated: !!user }),
    [user],
  );
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Type-safe hook
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

// ──── SPLIT CONTEXTS FOR PERFORMANCE ────
// Separate frequently-changing from stable values
const UserContext = createContext<User | null>(null);
const AuthActionsContext = createContext<{ login: Function; logout: Function } | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const actions = useMemo(() => ({
    login: async (c: Credentials) => setUser(await api.login(c)),
    logout: () => setUser(null),
  }), []);
  
  return (
    <AuthActionsContext.Provider value={actions}>
      <UserContext.Provider value={user}>
        {children}
      </UserContext.Provider>
    </AuthActionsContext.Provider>
  );
}
// Components using only actions won't re-render when user changes
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Provider pattern wraps tree with Context.Provider for shared state (auth, theme). Avoid Provider hell with composeProviders utility. Prefer composition — pass components as props (slots) to avoid deep nesting. Split contexts for performance: separate frequently-changing data from stable actions."*

## 4. 🧠 MEMORY AID
**"Provider = Context.Provider wrapping tree. composeProviders() fixes nesting hell. Composition = pass JSX as props (slots). Split contexts = stable actions + changing data."**
