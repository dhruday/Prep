# 435 – Rules of Hooks — Why Order Matters

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Two rules: (1) Only call hooks at the **top level** — never inside loops, conditions, or nested functions. (2) Only call hooks from **React functions** (components or custom hooks). React tracks hooks by call ORDER — changing order between renders breaks state mapping.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── WHY ORDER MATTERS ────
// React stores hooks in an array, indexed by call order
// Render 1: [useState(0), useEffect(fn), useState('')]
// Render 2: [useState(0), useEffect(fn), useState('')]
// Index 0 = count, Index 1 = effect, Index 2 = name
// If order changes, React maps wrong state to wrong hook!

// ──── RULE 1: TOP LEVEL ONLY ────
// ❌ Conditional hook — breaks if condition changes
function Bad({ show }: { show: boolean }) {
  if (show) {
    const [count, setCount] = useState(0); // sometimes hook 0, sometimes skip
  }
  const [name, setName] = useState(''); // wrong index when show changes!
}

// ✅ Always call, conditionally USE
function Good({ show }: { show: boolean }) {
  const [count, setCount] = useState(0); // always hook 0
  const [name, setName] = useState('');   // always hook 1
  
  // Conditionally use the value, not the hook
  return show ? <span>{count}</span> : <span>{name}</span>;
}

// ❌ Hook in loop
function Bad2({ items }: { items: string[] }) {
  items.forEach(item => {
    useEffect(() => { /* ... */ }, [item]); // WRONG!
  });
}

// ✅ Extract to child component
function Item({ item }: { item: string }) {
  useEffect(() => { /* ... */ }, [item]); // Each Item instance has stable hooks
}
function Good2({ items }: { items: string[] }) {
  return <>{items.map(item => <Item key={item} item={item} />)}</>;
}

// ──── RULE 2: REACT FUNCTIONS ONLY ────
// ❌ Regular function
function helperFunction() {
  const [x, setX] = useState(0); // NOT a component or custom hook
}

// ✅ Custom hook (starts with "use")
function useHelper() {
  const [x, setX] = useState(0); // ✅ custom hook
  return x;
}

// ✅ Component
function MyComponent() {
  const [x, setX] = useState(0); // ✅ React component
  return <div>{x}</div>;
}

// ──── ESLINT PLUGIN ────
// npm install eslint-plugin-react-hooks
// rules: { "react-hooks/rules-of-hooks": "error",
//          "react-hooks/exhaustive-deps": "warn" }
```

### Internal Hook Array (Simplified)
```
Component renders:
  hooks = []
  useState(0)    → hooks[0] = { state: 0 }
  useEffect(fn)  → hooks[1] = { effect: fn }
  useState('')   → hooks[2] = { state: '' }

Next render:
  cursor = 0
  useState(0)    → hooks[0].state (returns 0, cursor++)
  useEffect(fn)  → hooks[1].effect (cursor++)
  useState('')   → hooks[2].state (returns '', cursor++)
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React tracks hooks by call order in an internal array. Conditional or looped hooks break this mapping — state gets assigned to wrong variables. Always call hooks at the top level, in the same order every render. eslint-plugin-react-hooks enforces this automatically."*

## 4. 🧠 MEMORY AID
**"Hooks = array indexed by call order. Same order every render. No conditions, no loops, no nested functions. eslint-plugin-react-hooks catches violations."**
