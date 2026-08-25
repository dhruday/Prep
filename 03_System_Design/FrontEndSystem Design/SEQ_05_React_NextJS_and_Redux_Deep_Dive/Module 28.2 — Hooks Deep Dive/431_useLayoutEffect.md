# 431 – useLayoutEffect — When You Need Synchronous Effects

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`useLayoutEffect` fires synchronously after DOM mutations but BEFORE the browser paints. Use it to measure DOM or prevent visual flicker. **Blocks painting** — keep it fast. `useEffect` runs after paint (non-blocking). 99% of the time, use `useEffect`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── useLayoutEffect — prevent flicker ────
function Tooltip({ anchorEl, text }: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!anchorEl || !tooltipRef.current) return;
    const anchorRect = anchorEl.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    setPosition({
      top: anchorRect.top - tooltipRect.height - 8,
      left: anchorRect.left + (anchorRect.width - tooltipRect.width) / 2,
    });
  }, [anchorEl]);
  // ✅ Position calculated BEFORE paint — no flicker

  return (
    <div ref={tooltipRef} style={{ position: 'fixed', ...position }}>
      {text}
    </div>
  );
}

// ──── useEffect would flicker ────
// If we used useEffect:
// 1. Component renders with position {0, 0}
// 2. Browser PAINTS tooltip at (0, 0) — FLASH!
// 3. useEffect runs, calculates correct position
// 4. Component re-renders at correct position
// User sees: tooltip jumps from (0,0) to correct position

// With useLayoutEffect:
// 1. Component renders with position {0, 0}
// 2. useLayoutEffect runs BEFORE paint, updates position
// 3. Browser paints tooltip at CORRECT position
// User sees: tooltip appears in correct position immediately

// ──── DOM MEASUREMENT ────
function AutoHeight({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  
  useLayoutEffect(() => {
    if (ref.current) {
      setHeight(ref.current.scrollHeight);
    }
  }, [children]);
  
  return (
    <div ref={ref} style={{ height, overflow: 'hidden', transition: 'height 0.3s' }}>
      {children}
    </div>
  );
}

// ──── WHEN TO USE EACH ────
// useEffect (default — 99% of cases):
// - Data fetching, subscriptions, analytics
// - Anything that doesn't need DOM measurements before paint

// useLayoutEffect (rare):
// - Measuring DOM elements (getBoundingClientRect)
// - Preventing visual flicker (tooltips, popovers, animations)
// - Synchronously mutating DOM before user sees it
// - Reading scroll position before paint
```

### Timeline
```
useLayoutEffect:                    useEffect:
Render → DOM update → Layout Effect → Paint → Effect
         ↑ blocks paint                       ↑ after paint
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useLayoutEffect runs synchronously between DOM mutation and paint — for measuring DOM or preventing positional flicker. useEffect runs after paint. I use useLayoutEffect for tooltips, popovers, and scroll restoration. It blocks painting, so keep it fast."*

## 4. 🧠 MEMORY AID
**"useLayoutEffect = before paint (sync, blocks). useEffect = after paint (async). Use Layout for: measure DOM, prevent flicker, scroll restore."**
