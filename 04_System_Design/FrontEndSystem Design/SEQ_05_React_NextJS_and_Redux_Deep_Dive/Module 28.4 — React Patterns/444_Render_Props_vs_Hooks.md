# 444 – Render Props vs Hooks

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Render Props**: Component receives a function prop that returns JSX — shares logic via callback. **Custom Hooks**: Extract logic into a function (`useXxx`) — cleaner, no wrapper hell. Hooks replaced most render prop use cases but render props still useful for **component-level** inversion of control.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── RENDER PROPS PATTERN ────
interface MousePosition { x: number; y: number; }

// Render prop component
function MouseTracker({ render }: { render: (pos: MousePosition) => JSX.Element }) {
  const [pos, setPos] = useState<MousePosition>({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);
  
  return render(pos); // caller decides what to render
}

// Usage (render prop)
function App() {
  return (
    <MouseTracker
      render={({ x, y }) => <div>Mouse: {x}, {y}</div>}
    />
  );
}

// Also works with children-as-function
function MouseTracker2({ children }: { children: (pos: MousePosition) => JSX.Element }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  // ... same logic
  return children(pos);
}

// <MouseTracker2>{({ x, y }) => <span>{x},{y}</span>}</MouseTracker2>

// ──── SAME LOGIC AS CUSTOM HOOK ────
function useMousePosition(): MousePosition {
  const [pos, setPos] = useState<MousePosition>({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);
  
  return pos;
}

// Usage (hook — much cleaner!)
function App() {
  const { x, y } = useMousePosition();
  return <div>Mouse: {x}, {y}</div>;
}

// ──── WHEN RENDER PROPS STILL WIN ────
// 1. Inversion of control for rendering
function DataList<T>({ 
  items, 
  renderItem, 
  renderEmpty 
}: { 
  items: T[]; 
  renderItem: (item: T, index: number) => JSX.Element; 
  renderEmpty: () => JSX.Element;
}) {
  if (items.length === 0) return renderEmpty();
  return <ul>{items.map((item, i) => renderItem(item, i))}</ul>;
}

// <DataList items={users} renderItem={u => <UserCard user={u} />} renderEmpty={() => <Empty />} />

// 2. Libraries: React Query, Formik, Downshift use render props + hooks
// 3. Animation libraries often use render props for motion values
```

### Comparison
| Feature | Render Props | Custom Hooks |
|---|---|---|
| Wrapper nesting | Yes (wrapper hell) | No |
| Conditional logic | Harder | Easy (hooks at top) |
| Reuse | Component-level | Function-level |
| Testing | Render + assert | Unit test hook |
| Best for | Rendering control | Stateful logic reuse |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Hooks replaced most render prop use cases — cleaner, no wrapper hell, composable. Render props still valuable for rendering inversion of control (DataList.renderItem, animation). Hooks for logic reuse, render props for render customization."*

## 4. 🧠 MEMORY AID
**"Hooks = logic reuse (no wrappers). Render Props = render customization (caller decides JSX). Both share logic — hooks won for most cases."**
