# 448 – Portal Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**React Portals** render children into a DOM node **outside** the parent component's DOM hierarchy while keeping them **inside** the React tree (events bubble through React tree, not DOM tree). Used for modals, tooltips, toasts, dropdowns — elements that need to break out of `overflow: hidden` or `z-index` stacking contexts.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
import { createPortal } from 'react-dom';

// ──── BASIC PORTAL ────
function Modal({ isOpen, onClose, children }: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()} // prevent close on content click
      >
        <button onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root')! // renders here in DOM
  );
}

// index.html: <div id="root"></div><div id="modal-root"></div>

// ──── USAGE ────
function App() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <div style={{ overflow: 'hidden' }}> {/* portal escapes this! */}
      <button onClick={() => setShowModal(true)}>Open Modal</button>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h2>Modal Title</h2>
        <p>This renders outside the parent DOM but inside React tree</p>
      </Modal>
    </div>
  );
}

// ──── KEY INSIGHT: Events bubble through React tree ────
function Parent() {
  // This onClick catches events from the Portal!
  return (
    <div onClick={() => console.log('Caught from portal!')}>
      <Child />
    </div>
  );
}

function Child() {
  return createPortal(
    <button>Click me</button>, // click bubbles to Parent in React tree
    document.getElementById('portal-root')!,
  );
}

// ──── TOOLTIP PORTAL ────
function Tooltip({ target, text }: { target: HTMLElement; text: string }) {
  const rect = target.getBoundingClientRect();
  
  return createPortal(
    <div
      className="tooltip"
      style={{
        position: 'fixed',
        top: rect.top - 30,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      }}
    >
      {text}
    </div>,
    document.body,
  );
}

// ──── TOAST NOTIFICATION PORTAL ────
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return createPortal(
    <div className="toast-container" style={{ position: 'fixed', top: 16, right: 16 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}
```

### Portal Use Cases
| Use Case | Why Portal? |
|---|---|
| Modals | Escape overflow/z-index |
| Tooltips | Position relative to viewport |
| Toasts | Fixed position notifications |
| Dropdowns | Escape scrollable containers |
| Fullscreen overlays | Above all content |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"createPortal renders outside parent DOM but inside React tree — events still bubble through React hierarchy. Use for modals, tooltips, toasts — elements that need to escape overflow:hidden or z-index stacking. Render to a separate DOM node (document.body or dedicated root)."*

## 4. 🧠 MEMORY AID
**"Portal = DOM says 'outside', React says 'inside'. createPortal(jsx, domNode). Events bubble through React tree, not DOM tree."**
