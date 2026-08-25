# 295 – Typing Context with Generic Providers

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

React Context with TypeScript requires careful typing to avoid the `undefined` default value problem. The standard pattern: create context with `null` as default, create a typed provider component, and create a `useContext` wrapper hook that throws if used outside the provider. Generic providers enable reusable context patterns — a single `createSafeContext<T>()` factory that generates typed context + provider + hook for any data shape.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The Problem with Default undefined

```typescript
// ❌ Problem: defaulting to undefined forces null checks everywhere
const ThemeContext = React.createContext<Theme | undefined>(undefined);

function useTheme() {
  const theme = useContext(ThemeContext);
  // theme is Theme | undefined — must check every time
  if (!theme) throw new Error('useTheme must be used within ThemeProvider');
  return theme; // now Theme, but this check is repeated everywhere
}
```

### The Safe Context Pattern

```typescript
// ✅ Factory function — creates typed, safe context
function createSafeContext<T>(displayName: string) {
  const Context = React.createContext<T | null>(null);
  Context.displayName = displayName;

  function useContext_() {
    const value = React.useContext(Context);
    if (value === null) {
      throw new Error(`use${displayName} must be used within ${displayName}Provider`);
    }
    return value;
  }

  return [Context.Provider, useContext_] as const;
}

// Usage
interface AuthContext { user: User; login: (creds: Credentials) => Promise<void>; logout: () => void; }
const [AuthProvider, useAuth] = createSafeContext<AuthContext>('Auth');
// AuthProvider is typed: React.Provider<AuthContext | null>
// useAuth returns AuthContext (never null — throws before returning)
```

### Generic Context for Reusable Patterns

```typescript
// Generic list context
interface ListContext<T> {
  items: T[];
  selectedId: string | null;
  select: (id: string) => void;
  add: (item: T) => void;
  remove: (id: string) => void;
}

function createListContext<T extends { id: string }>() {
  const [Provider, useList] = createSafeContext<ListContext<T>>('List');
  
  function ListProvider({ children, initial = [] }: { children: React.ReactNode; initial?: T[] }) {
    const [items, setItems] = useState<T[]>(initial);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    
    const value: ListContext<T> = {
      items, selectedId,
      select: setSelectedId,
      add: (item) => setItems(prev => [...prev, item]),
      remove: (id) => setItems(prev => prev.filter(i => i.id !== id)),
    };
    
    return <Provider value={value}>{children}</Provider>;
  }
  
  return { ListProvider, useList };
}

// Usage — fully typed for any entity
const { ListProvider: TodoProvider, useList: useTodos } = createListContext<Todo>();
const { ListProvider: UserProvider, useList: useUsers } = createListContext<User>();
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I created a `createSafeContext` factory for our React components. This standardized context usage across the team, eliminated null check repetition, and provided clear error messages when hooks were used outside their providers.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I use a createSafeContext factory that generates typed Provider + hook pairs. The hook throws a meaningful error if used outside the provider, so consumers never deal with undefined. For reusable patterns, I use generic context: createListContext<T>() generates fully-typed listing/selection context for any entity type. This eliminates repeated null checks and provides clear error messages."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Complete safe context pattern
function createSafeContext<T>(name: string): readonly [React.Provider<T | null>, () => T] {
  const Ctx = React.createContext<T | null>(null);
  Ctx.displayName = name;
  const useCtx = (): T => {
    const val = React.useContext(Ctx);
    if (val === null) throw new Error(`use${name} must be within ${name}Provider`);
    return val;
  };
  return [Ctx.Provider, useCtx] as const;
}

// Theme context
interface ThemeValue { mode: 'light' | 'dark'; toggle: () => void; colors: Record<string, string>; }
const [ThemeProvider, useTheme] = createSafeContext<ThemeValue>('Theme');

function ThemeRoot({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const colors = mode === 'light' ? lightColors : darkColors;
  return <ThemeProvider value={{ mode, toggle: () => setMode(m => m === 'light' ? 'dark' : 'light'), colors }}>{children}</ThemeProvider>;
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"createSafeContext<T> = Context(null) + hook that throws if null."** Factory returns [Provider, useHook]. Consumer never sees undefined. Generic version enables reusable patterns. Always give Context a displayName for DevTools.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Context is the most common React state sharing mechanism. Safe typing prevents the #1 context bug (undefined access).
**How:** createSafeContext factory, generic context for reusable patterns, throw on null for safety.
**Companies:** All four use React Context. Microsoft and Adobe test context typing patterns.
