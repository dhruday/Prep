# 429 – useRef — DOM Access, Instance Variables, Closure Escape

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
`useRef` creates a mutable `.current` container that persists across renders WITHOUT triggering re-renders. Three uses: (1) DOM element access, (2) instance variables (timers, previous values), (3) escaping stale closures. Changing `.current` does NOT cause re-render.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── 1. DOM ACCESS ────
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const focusInput = () => inputRef.current?.focus();
  
  return (
    <>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus</button>
    </>
  );
}

// ──── 2. INSTANCE VARIABLE (timer, intervals) ────
function Timer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const start = () => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
  };
  
  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  
  useEffect(() => () => stop(), []); // cleanup on unmount
  
  return <div>{seconds}s <button onClick={start}>Start</button><button onClick={stop}>Stop</button></div>;
}

// ──── 3. PREVIOUS VALUE ────
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; });
  return ref.current; // returns previous value (before effect runs)
}

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);
  return <div>Now: {count}, Before: {prevCount}</div>;
}

// ──── 4. ESCAPE STALE CLOSURE ────
function Chat({ onSend }: { onSend: (msg: string) => void }) {
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend; // always latest
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onSendRef.current('message'); // always latest onSend
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // no need for onSend in deps!
}

// ──── CALLBACK REF (dynamic ref assignment) ────
function MeasureDiv() {
  const [height, setHeight] = useState(0);
  
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setHeight(node.getBoundingClientRect().height);
    }
  }, []);
  
  return <div ref={measuredRef}>Content with height: {height}</div>;
}
```

### useRef vs useState
| Feature | useRef | useState |
|---|---|---|
| Triggers re-render | No | Yes |
| Persists across renders | Yes | Yes |
| Mutable | Yes (.current) | No (use setter) |
| Readable in render | Yes (but stale risk) | Yes (current value) |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useRef for three things: DOM access, instance variables (timers, IDs), and escaping stale closures. Key: changing .current does NOT trigger re-render. I use the ref-latest pattern for event handlers to avoid dependency array issues."*

## 4. 🧠 MEMORY AID
**"useRef = mutable box, no re-render. DOM: ref={inputRef}. Timer: intervalRef.current. Stale closure escape: fnRef.current = latestFn."**
