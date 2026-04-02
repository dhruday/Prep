# 430 – useContext — Provider Pattern and Performance

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`useContext` reads context from the nearest Provider above in the tree. Avoids prop drilling. **Performance pitfall**: ALL consumers re-render when context value changes — even if they only read a part of it. Solutions: split contexts, memoize value, use external state managers for high-frequency updates.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── BASIC CONTEXT ────
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be within ThemeProvider');
  return context;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // ✅ Memoize to prevent unnecessary re-renders
  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light'),
  }), [theme]);
  
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ──── PERFORMANCE PROBLEM ────
const AppContext = createContext({ user: null, theme: 'light', locale: 'en' });

// ❌ Every consumer re-renders when ANY value changes
function Header() {
  const { user } = useContext(AppContext); // re-renders when theme changes too!
  return <h1>{user?.name}</h1>;
}

// ──── SOLUTION: SPLIT CONTEXTS ────
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<'light' | 'dark'>('light');
const LocaleContext = createContext<string>('en');

// ✅ Header only re-renders when user changes
function Header() {
  const user = useContext(UserContext);
  return <h1>{user?.name}</h1>;
}

// ──── SOLUTION: useContextSelector (from use-context-selector) ────
import { createContext, useContextSelector } from 'use-context-selector';

const AppCtx = createContext({ user: null, count: 0 });

function UserDisplay() {
  // ✅ Only re-renders when user changes
  const user = useContextSelector(AppCtx, v => v.user);
  return <span>{user?.name}</span>;
}

// ──── CONTEXT + REDUCER PATTERN ────
const TodoContext = createContext<{
  state: TodoState;
  dispatch: React.Dispatch<TodoAction>;
} | null>(null);

function TodoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  // dispatch is stable — no useMemo needed for it
  const value = useMemo(() => ({ state, dispatch }), [state]);
  
  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}
```

### Context Performance Rules
| Rule | Why |
|---|---|
| Memoize Provider value | Prevent re-renders on parent re-render |
| Split contexts by update frequency | Isolate re-render blast radius |
| Don't put rapidly changing state in context | All consumers re-render |
| Use external stores for high-frequency | Zustand, Jotai, Redux |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useContext avoids prop drilling but ALL consumers re-render on any context change. I split contexts by update frequency, memoize Provider values, and use external stores (Zustand) for high-frequency state. Context + useReducer for medium-complexity state; Redux/Zustand for complex shared state."*

## 4. 🧠 MEMORY AID
**"useContext re-renders ALL consumers. Fix: split context, memoize value, use external store for high-frequency. dispatch is stable — doesn't need memo."**
