# 89. useRef — DOM Refs vs Mutable Values, forwardRef
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`useRef` returns a mutable container object `{ current: value }` that persists across renders but whose mutations do NOT trigger re-renders. It has two primary use cases: holding a reference to a DOM node (attached via the `ref` prop), and storing any mutable value that needs to survive renders without causing them (timers, previous values, stable callbacks). The critical distinction: `useRef` vs `useState` — both persist across renders, but `setState` triggers re-render, `ref.current = newValue` does not. `forwardRef` is the mechanism for passing a ref through a component to a DOM element inside it — required whenever a parent component needs to control focus, scroll, animation, or measurement on a DOM node inside a child component, especially in component libraries.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### `useRef` Internals

A `useRef(initialValue)` call creates:

```typescript
// Pseudocode of useRef implementation
function useRef<T>(initialValue: T): RefObject<T> {
  // Uses useReducer internally to persist across renders
  // The "state" is the ref object itself — changing .current doesn't notify React
  const [ref] = useState(() => ({ current: initialValue }));
  return ref;
}
// Result: same object reference on every render
// { current: initialValue } → modifying .current has no effect on React's lifecycle
```

The ref object identity is stable — `ref === ref` across renders. Its `.current` property is mutable and can hold anything (DOM nodes, callbacks, timers, previous values, WebSocket instances).

### Use Case 1: DOM Refs

The `ref` prop on a JSX element attaches the DOM node to `ref.current` after commit:

```typescript
function AutoFocus() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // inputRef.current is null before mount
    // After commit: inputRef.current = the actual <input> DOM node
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} type="text" />;
}
```

**Lifecycle of a DOM ref:**
1. Before mount: `ref.current = null` (initial value)
2. After commit (DOM node created): `ref.current = domNode`
3. After unmount (DOM node removed): `ref.current = null` (set to null by React)
4. If the `ref` prop moves to a different element: React sets `ref.current = null` (detaches old), then `ref.current = newDomNode` (attaches new)

**Common DOM ref operations:**
```typescript
// Focus management
inputRef.current?.focus();
inputRef.current?.blur();

// Scroll control
listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
listRef.current?.scrollIntoView({ block: 'nearest' });

// DOM measurements
const rect = elementRef.current?.getBoundingClientRect();
const { height, width } = elementRef.current ?? { height: 0, width: 0 };

// Media control
videoRef.current?.play();
videoRef.current?.pause();

// Canvas operations
const ctx = canvasRef.current?.getContext('2d');
```

### Use Case 2: Mutable Values Without Re-rendering

Any value that needs to persist across renders but should NOT trigger re-rendering belongs in a ref:

```typescript
// ✅ Timer IDs — no re-render needed, just store for cleanup
function usePolling(callback: () => void, interval: number) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;  // always up to date, no stale closure

  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), interval);
    return () => clearInterval(id);
  }, [interval]);  // callback NOT in deps — it's accessed via ref
}

// ✅ Previous value tracking
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;  // update AFTER render (useEffect runs after commit)
    // So during render: ref.current is the PREVIOUS value
  });
  return ref.current;
}

// ✅ Stable callback refs — avoids adding callback to useEffect deps
function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (e: WindowEventMap[K]) => handlerRef.current(e);
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  }, [event]);  // handler not needed in deps — accessed via stable ref
}

// ✅ WebSocket/connection instances
function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    wsRef.current = new WebSocket(url);
    wsRef.current.onopen = () => setStatus('open');
    wsRef.current.onclose = () => setStatus('closed');
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [url]);

  const send = useCallback((data: string) => {
    wsRef.current?.send(data);  // always accesses current WebSocket instance
  }, []);

  return { status, send };
}
```

### `forwardRef` — Passing Refs Through Components

By default, the `ref` prop is NOT forwarded — it's handled by React internally and doesn't reach your component's props:

```typescript
// ❌ This doesn't work — ref is not in props
function CustomInput(props) {
  return <input {...props} />;
}
const ref = useRef<HTMLInputElement>(null);
<CustomInput ref={ref} />  // ref.current is NEVER set to the <input> DOM node
```

`forwardRef` explicitly passes the ref from parent to an inner DOM element:

```typescript
// ✅ forwardRef makes ref accessible inside the component
import { forwardRef, useRef, useImperativeHandle } from 'react';

const CustomInput = forwardRef<HTMLInputElement, InputProps>(
  function CustomInput({ label, ...props }, ref) {
    // 'ref' is now the forwarded ref from the parent
    // Attach it to the DOM element you want to expose
    return (
      <div className="input-wrapper">
        <label>{label}</label>
        <input ref={ref} {...props} />
      </div>
    );
  }
);

// Usage
function Form() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();  // focuses the <input> inside CustomInput
  }, []);

  return <CustomInput ref={inputRef} label="Email" type="email" />;
}
```

### `useImperativeHandle` — Exposing a Custom API via Ref

Instead of exposing the raw DOM node, expose a controlled API:

```typescript
interface DialogHandle {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

const Dialog = forwardRef<DialogHandle, DialogProps>(
  function Dialog({ children, title }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const dialogDOMRef = useRef<HTMLDialogElement>(null);

    // Expose a controlled API — parent cannot call dialogDOMRef's methods directly
    useImperativeHandle(ref, () => ({
      open: () => {
        setIsOpen(true);
        dialogDOMRef.current?.showModal();
      },
      close: () => {
        setIsOpen(false);
        dialogDOMRef.current?.close();
      },
      isOpen: () => isOpen,
    }), [isOpen]);

    return (
      <dialog ref={dialogDOMRef}>
        <h2>{title}</h2>
        {children}
      </dialog>
    );
  }
);

// Usage: parent controls dialog via handle
function App() {
  const dialogRef = useRef<DialogHandle>(null);

  return (
    <>
      <button onClick={() => dialogRef.current?.open()}>Open Dialog</button>
      <Dialog ref={dialogRef} title="Confirm Action">
        <p>Are you sure?</p>
        <button onClick={() => dialogRef.current?.close()}>Cancel</button>
      </Dialog>
    </>
  );
}
```

### Callback Refs — Dynamic Ref Attachment

A callback ref fires when the ref is attached to or removed from a DOM node:

```typescript
// Callback ref: called with DOM node on attach, called with null on detach
function MeasuredBox() {
  const [height, setHeight] = useState(0);

  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      // node is the DOM element after mount
      setHeight(node.getBoundingClientRect().height);
    }
    // node === null when element unmounts
  }, []);  // [] — stable callback ref

  return (
    <div ref={measuredRef}>
      <p>This box is {height}px tall</p>
    </div>
  );
}
```

Callback refs fire synchronously during the commit phase — they set ref values before `useLayoutEffect` and `useEffect` run.

### When NOT to Use `useRef`

| Scenario | Better tool |
|---|---|
| Value that should cause re-render when changed | `useState` |
| Derived value from state/props | Just compute it in render (no hook needed) |
| Shared mutable state across components | Context or external store |
| Expensive computation that shouldn't re-run | `useMemo` |
| Stabilising a callback reference | `useCallback` |

**Anti-pattern: using `useRef` to avoid re-renders when you actually need them:**

```typescript
// ❌ WRONG: Using ref to "optimise" — component never updates display
function Counter() {
  const countRef = useRef(0);
  return (
    <div>
      <button onClick={() => { countRef.current++; }}>Increment</button>
      <span>{countRef.current}</span>  {/* NEVER updates — no re-render triggered */}
    </div>
  );
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a complex table had a "jump to row" feature. The requirement: scroll to a specific row when a keyboard shortcut was pressed. Solution: use `useRef` on the table container, and `forwardRef` on the `<TableRow>` component to also hold row refs. The keyboard handler read `rowRefs.current[targetRow]?.scrollIntoView({ behavior: 'smooth' })` — no `useState` needed for the scroll action, no re-renders triggered.

At Oracle, a date picker component in a form library needed `autoFocus` to work correctly after the calendar dropdown opened. Since the calendar was its own `<CalendarPanel>` component, `forwardRef` was used to expose the first focusable date cell. On open, the parent called `calendarRef.current?.focus()` — clean, correct focus management without exposing internal DOM structure.

**At FAANG scale:**
- **Microsoft (Monaco Editor):** VS Code's editor is an imperative library — React uses `useRef` to hold the editor instance and `useImperativeHandle`-style wrapper to expose `getValue()`, `setValue()`, `setPosition()`, and `focus()` without re-rendering
- **Adobe (XD Canvas):** The design canvas is a `<canvas>` element — `useRef` holds the canvas DOM node; `useLayoutEffect` uses it to initialize the rendering engine after each mount; no state involved — the canvas's visual state is entirely imperative
- **Salesforce (Quip Editor):** Collaborative rich text editor wrapped in React — `forwardRef` exposes `focus()`, `getSelection()`, `replaceText()` commands via `useImperativeHandle`; integration with Salesforce's shortcut system requires imperative focus control
- **Cisco (Network Diagram):** Cytoscape.js graph library — `useRef` holds the Cytoscape instance; event handlers (node click, pan, zoom) are attached imperatively to the Cytoscape instance rather than as React props

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "useRef returns a stable object whose `.current` property is mutable and persists across renders without triggering re-renders. It has two main use cases.
>
> The first is DOM access: attaching the ref to a JSX element via the `ref` prop makes React set `.current` to the DOM node after commit. That node is then available in effects and event handlers for focus, scroll, measurement, or media control.
>
> The second is mutable persistence: anything that needs to survive renders but shouldn't cause them — timer IDs, WebSocket instances, previous values, stable callback wrappers — belongs in a ref.
>
> forwardRef lets you pass a ref from a parent component through to an inner DOM node inside a child component. This is required for component libraries — text inputs, dialogs, modals — where the parent needs imperative access to the DOM element inside the child. useImperativeHandle extends this by letting the component expose a clean API (open, close, focus, scroll) instead of the raw DOM node.
>
> The rule: if mutation should cause re-render, use useState. If it should persist without causing re-render, use useRef."

### Likely Follow-up Questions

1. **Why does reading `ref.current` inside render cause issues?** → Reading during render is technically allowed but semantically incorrect. `ref.current` can be mutated asynchronously (effects, events), so its value during render is unpredictable and can lead to inconsistent UI. If you want a reactive value that drives render output, use `useState`. `ref.current` should only be read in effects, event handlers, and imperative code.
2. **What is the difference between `createRef` and `useRef`?** → `createRef` creates a new ref object on every render — it's for class components where you store the ref on `this`. In function components, `createRef` in the function body creates a new ref object on every render — the previous one is thrown away. `useRef` returns the same object on every render, persisting it on the fiber. Always use `useRef` in function components.
3. **Can `forwardRef` forward to multiple DOM nodes?** → Not directly — a `forwardRef` exposes a single ref. To expose multiple: use `useImperativeHandle` and expose an object containing multiple refs, or use a callback ref that gives the parent a structured handle: `{ inputRef: ..., buttonRef: ... }`.
4. **Does the order of DOM ref attachment matter?** → Yes — React sets the ref during the commit (mutation) sub-phase, before `useLayoutEffect` runs. So in `useLayoutEffect`, `ref.current` is guaranteed to be the current DOM node. In `useEffect` (after paint), it's also available. The ref is set to `null` when the element unmounts — always guard with optional chaining: `ref.current?.method()`.

### Senior Signal

> "The most sophisticated use of refs I've applied is the 'stable callback ref' pattern: storing a prop function in a ref (`callbackRef.current = prop`) and using the ref in a useEffect rather than the prop directly. This lets you have an effect with `[]` deps that always calls the latest version of a callback without re-running the effect on every callback change. This is important for WebSocket handlers — you don't want to reconnect the WebSocket every time the parent re-creates the onMessage function. The ref holds the current callback, the effect stays mounted, the WebSocket stays connected."

---

## 💻 5. Code Example

```typescript
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';

// ========================
// 1. DOM ref: focus, scroll, measurement
// ========================
function CommandPalette() {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();  // auto-focus on mount
  }, []);

  const scrollToTop = () => listRef.current?.scroll({ top: 0, behavior: 'smooth' });

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Search commands..." />
      <button onClick={scrollToTop}>↑ Top</button>
      <ul ref={listRef} style={{ height: '300px', overflowY: 'auto' }}>
        {Array.from({ length: 100 }, (_, i) => (
          <li key={i}>Command {i}</li>
        ))}
      </ul>
    </div>
  );
}

// ========================
// 2. Mutable value ref: stable callback pattern  
// ========================
function useInterval(callback: () => void, delay: number | null) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;  // always points to latest callback

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
    // delay is the only dep — callback is accessed via ref, always fresh
  }, [delay]);
}

// ========================
// 3. forwardRef: exposing a DOM element
// ========================
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, ...inputProps }, ref) {
    return (
      <div className={`field ${error ? 'field--error' : ''}`}>
        <label>{label}</label>
        <input ref={ref} {...inputProps} aria-invalid={!!error} />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);
TextField.displayName = 'TextField';  // important: forwardRef components need displayName for devtools

// ========================
// 4. useImperativeHandle: custom API
// ========================
interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, { src: string }>(
  function VideoPlayer({ src }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Expose controlled API — NOT the raw <video> DOM node
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seekTo: (seconds) => {
        if (videoRef.current) videoRef.current.currentTime = seconds;
      },
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    }), []);  // [] — the API doesn't depend on any state/props

    return <video ref={videoRef} src={src} controls />;
  }
);

// ========================
// 5. usePrevious custom hook
// ========================
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
    // After render: update ref to current value
    // So during render: ref.current is PREVIOUS cycle's value
  });

  return ref.current;
}

function PriceDisplay({ price }: { price: number }) {
  const prevPrice = usePrevious(price);
  const trend = prevPrice === undefined ? 'neutral'
    : price > prevPrice ? 'up'
    : price < prevPrice ? 'down'
    : 'neutral';

  return (
    <span className={`price price--${trend}`}>
      ${price.toFixed(2)} {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''}
    </span>
  );
}

// ========================
// 6. Callback ref: measurement on dynamic content
// ========================
function AutoheightTextarea({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const textareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    if (node) {
      // Fires synchronously after DOM attaches — correct time to measure
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    }
  }, []);  // [] — stable callback

  // For dynamic resize on value change, need useEffect too
  const [ref, setRef] = useState<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (ref) {
      ref.style.height = 'auto';
      ref.style.height = `${ref.scrollHeight}px`;
    }
  }, [value, ref]);

  return (
    <textarea
      ref={setRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  );
}
```

---

## 🧠 6. Memory Aid

**Mental Model:** A ref is a sticky note on the wall — it always points to the same spot, you can write on it as much as you want, but the room (the component's render) doesn't "notice" you changed what's written. A DOM ref is a sticky note that React fills in with the physical address of a DOM element after it moves in, then erases when it moves out.

**If you go blank:** "useRef = stable object, .current is mutable, no re-render on change. DOM ref: attach via ref prop → .current = DOM node after commit. forwardRef: pass ref into child component. useImperativeHandle: expose custom API instead of raw DOM node."

**Mnemonic:** **DIMS** — **D**OM refs (access DOM nodes), **I**mperative handle (custom API), **M**utable value storage (no re-render), **S**table across renders.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Correctness: `forwardRef` is required for any component library building reusable inputs, dialogs, or containers — without it, parent components can't perform focus management, accessibility, or animation coordination
→ Performance: Using refs for mutable values (timer IDs, WebSocket instances, stable callbacks) avoids unnecessary re-renders that `useState` would cause; the stable callback ref pattern allows effect deps to stay minimal without losing access to the latest prop values
→ Integration: DOM refs and `useImperativeHandle` are the primary bridge between React's declarative world and imperative libraries (maps, editors, charting libraries, animation engines) — understanding when to reach for them vs fighting against React is a senior-level judgment

**How it works (3 sentences):**
`useRef` is implemented as `useState` with an identity reducer — the ref object `{ current: initialValue }` is stored on the fiber's `memoizedState` and the same object reference is returned on every render, but mutations to `.current` bypass React's state update mechanism entirely and never schedule a re-render. When the `ref` prop is set on a JSX element, React adds a `Ref` flag to the fiber, and during the commit's mutation sub-phase, React sets `ref.current = domNode` when the element mounts and `ref.current = null` when it unmounts. `forwardRef` wraps a component and passes a second argument (the forwarded ref) alongside `props` to the component function, enabling parent components to attach their ref to DOM elements inside the child; `useImperativeHandle` extends this by replacing what `ref.current` points to with a controlled API object rather than the raw DOM node.

**Company relevance:**
- Microsoft: Monaco Editor integration in Azure DevOps — `useRef` for editor instance, `useImperativeHandle` exposing `setCode()`, `getCode()`, `lint()` commands used by CI/CD pipeline configuration UI without exposing Monaco's full DOM API
- Adobe: Lightroom crop overlay — canvas `useRef` for direct pixel manipulation; `forwardRef` on the CropOverlay component exposes `reset()` and `applyAspectRatio()` to the toolbar; changing crop aspect ratio via keyboard shortcut uses the imperative handle
- Salesforce: Inline formula editor — `forwardRef` + `useImperativeHandle` in their formula input component exposes `insertFunction()`, `setCursorPosition()` for their drag-and-drop formula builder without leaking the underlying contenteditable DOM state
- Cisco: Real-time throughput graph using Chart.js — `useRef` holds Chart.js instance; `useEffect` adds new data points imperatively via `chart.data.datasets[0].data.push(newPoint); chart.update('none')` without any React state changes — pure imperative updates for 60fps graph updates

---
✅ Topic 89/486 complete → Continuing to Topic 90: useMemo — When It Helps vs When It Hurts
