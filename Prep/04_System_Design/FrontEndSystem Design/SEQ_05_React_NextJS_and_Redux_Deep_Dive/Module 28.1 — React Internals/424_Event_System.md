# 424 – Event System — Synthetic Events, Event Delegation

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React wraps native DOM events in **SyntheticEvents** — cross-browser compatible, pooled (pre-React 17), and normalized. Since React 17, events attach to the **root DOM node** (not document) using event delegation. This enables concurrent rendering and better micro-frontend compatibility.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── SYNTHETIC EVENT ────
function Button() {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // e is a SyntheticEvent wrapper, not native Event
    e.preventDefault();           // works cross-browser
    e.stopPropagation();         // stops React event propagation
    console.log(e.type);         // 'click'
    console.log(e.nativeEvent);  // underlying native DOM event
    console.log(e.target);       // DOM element
    console.log(e.currentTarget); // element with handler
  }
  
  return <button onClick={handleClick}>Click me</button>;
}

// ──── EVENT DELEGATION ────
// React 16: All events delegated to document
// React 17+: Events delegated to React root container
// <div id="root"> ← events attached here
//   <App />
// </div>

// Why change? Multiple React roots and micro-frontends work better
// No more e.stopPropagation() conflicts between React trees

// ──── EVENT POOLING (removed in React 17) ────
// React 16: SyntheticEvents were pooled (reused for performance)
function OldReact16Handler(e: React.MouseEvent) {
  // e.persist(); // was needed to access event async
  // setTimeout(() => console.log(e.type), 100); // would fail without persist

  // React 17+: no pooling, events work normally in async
}

// ──── CAPTURE vs BUBBLE ────
function EventPhases() {
  return (
    <div
      onClick={() => console.log('bubble: div')}
      onClickCapture={() => console.log('capture: div')}
    >
      <button
        onClick={() => console.log('bubble: button')}
        onClickCapture={() => console.log('capture: button')}
      >
        Click
      </button>
    </div>
  );
  // Output: capture: div, capture: button, bubble: button, bubble: div
}

// ──── COMMON PATTERNS ────

// Event delegation for dynamic lists
function TodoList({ items }: { items: Todo[] }) {
  const handleAction = (e: React.MouseEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    const itemId = target.closest('[data-id]')?.getAttribute('data-id');
    if (!itemId) return;
    
    if (target.matches('.delete-btn')) deleteTodo(itemId);
    if (target.matches('.toggle-btn')) toggleTodo(itemId);
  };
  
  return (
    <ul onClick={handleAction}>
      {items.map(item => (
        <li key={item.id} data-id={item.id}>
          {item.text}
          <button className="toggle-btn">Toggle</button>
          <button className="delete-btn">Delete</button>
        </li>
      ))}
    </ul>
  );
}

// Preventing form submission
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  // Process formData
};
```

### React 16 vs 17+ Event System
| Feature | React 16 | React 17+ |
|---|---|---|
| Delegation target | `document` | React root container |
| Event pooling | SyntheticEvent pooled | No pooling |
| Multiple roots | Conflicts | Works cleanly |
| `e.persist()` | Needed for async | Not needed |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React wraps native events in SyntheticEvents for cross-browser consistency. Since React 17, events delegate to the root container (not document) — critical for micro-frontends. Pooling was removed in 17. I use event delegation patterns for dynamic lists — single handler on parent, data-id attributes for targeting."*

## 4. 🧠 MEMORY AID
**"SyntheticEvent wraps native event. React 17: delegate to root (not document), no pooling, no e.persist(). onClickCapture for capture phase."**
