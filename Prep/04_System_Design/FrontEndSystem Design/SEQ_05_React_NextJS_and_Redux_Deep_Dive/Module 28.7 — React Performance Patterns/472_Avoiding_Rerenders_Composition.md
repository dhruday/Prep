# 472 – Avoiding Re-renders — Composition Patterns

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Most re-render issues come from **parent state changes** forcing child re-renders. Solutions **without memo**: move state down, lift content up (children pattern), split components. These **composition patterns** are more effective than sprinkling React.memo everywhere.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── PROBLEM: Parent state → all children re-render ────
// ❌ BAD: Entire App re-renders when scroll position changes
function App() {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);
  
  return (
    <div>
      <ScrollIndicator position={scrollY} /> {/* needs scrollY */}
      <HeavyNavbar />        {/* re-renders on every scroll! ❌ */}
      <ExpensiveContent />   {/* re-renders on every scroll! ❌ */}
      <HeavyFooter />        {/* re-renders on every scroll! ❌ */}
    </div>
  );
}

// ──── FIX 1: Move State Down ────
// ✅ Only ScrollIndicator re-renders
function App() {
  return (
    <div>
      <ScrollSection />      {/* state is inside here */}
      <HeavyNavbar />        {/* never re-renders ✅ */}
      <ExpensiveContent />   {/* never re-renders ✅ */}
    </div>
  );
}

function ScrollSection() {
  const [scrollY, setScrollY] = useState(0);
  // scroll logic here — only this component re-renders
  return <ScrollIndicator position={scrollY} />;
}

// ──── FIX 2: Children Pattern (Lift Content Up) ────
// ✅ Children are created by parent, not re-created by stateful component
function ScrollWrapper({ children }: { children: React.ReactNode }) {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);
  
  return (
    <div style={{ transform: `translateY(${scrollY * 0.5}px)` }}>
      {children} {/* children reference doesn't change! */}
    </div>
  );
}

function App() {
  return (
    <ScrollWrapper>
      <HeavyNavbar />        {/* created here, not inside ScrollWrapper */}
      <ExpensiveContent />   {/* same reference → no re-render ✅ */}
    </ScrollWrapper>
  );
}

// ──── FIX 3: Component as Prop (Slots) ────
function ColorPicker({ header, content }: {
  header: React.ReactNode;
  content: React.ReactNode;
}) {
  const [color, setColor] = useState('#000');
  
  return (
    <div style={{ backgroundColor: color }}>
      {header}   {/* doesn't re-render when color changes */}
      {content}  {/* doesn't re-render when color changes */}
      <input type="color" value={color} onChange={e => setColor(e.target.value)} />
    </div>
  );
}

function App() {
  return (
    <ColorPicker
      header={<HeavyHeader />}   {/* created in App, stable reference */}
      content={<HeavyContent />}
    />
  );
}

// ──── FIX 4: Split Context — Separate Changing from Stable ────
// ❌ BAD: One context with everything
const AppContext = createContext({ theme: 'dark', user: null, setTheme: () => {} });
// Every consumer re-renders when ANY value changes

// ✅ GOOD: Split into separate contexts
const ThemeContext = createContext('dark');
const UserContext = createContext<User | null>(null);
const ThemeActionsContext = createContext({ setTheme: () => {} });
// Components using only user don't re-render on theme change

// ──── FIX 5: useMemo for JSX (rare case) ────
function Parent() {
  const [count, setCount] = useState(0);
  
  // Memoize expensive JSX subtree
  const expensiveTree = useMemo(() => <ExpensiveTree data={stableData} />, [stableData]);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      {expensiveTree} {/* doesn't re-render on count change */}
    </div>
  );
}
```

### Pattern Priority
```
1. Move state down (cheapest, simplest)
2. Children/slots pattern (no memo needed)
3. Split contexts (prevent cascade)
4. Component composition (render prop/HOC)
5. React.memo + useMemo/useCallback (last resort)
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Before React.memo, use composition: (1) Move state down — isolate state to the component that needs it. (2) Children pattern — pass heavy components as children (stable reference). (3) Split contexts — separate changing data from stable actions. These patterns avoid re-renders structurally, without memoization overhead."*

## 4. 🧠 MEMORY AID
**"Composition > Memoization. Move state DOWN. Lift content UP (children). Split contexts. React.memo = last resort."**
