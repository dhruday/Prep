# 434 – useId, useImperativeHandle, useSyncExternalStore

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Three specialized hooks: **useId** generates unique IDs stable across server/client (accessibility). **useImperativeHandle** customizes what parent sees via ref (expose imperative API). **useSyncExternalStore** correctly subscribes to external stores (Redux, Zustand) with concurrent rendering safety.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── useId — SSR-safe unique IDs ────
function FormField({ label }: { label: string }) {
  const id = useId(); // e.g., ":r1:" — stable across server and client
  
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={`${id}-help`} />
      <p id={`${id}-help`}>Help text</p>
    </div>
  );
}
// ✅ No hydration mismatch, no Math.random() flicker

// ──── useImperativeHandle — expose imperative API via ref ────
interface ModalHandle {
  open: () => void;
  close: () => void;
}

const Modal = forwardRef<ModalHandle, { children: React.ReactNode }>(
  function Modal({ children }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    
    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }), []);
    
    if (!isOpen) return null;
    return <div className="modal">{children}</div>;
  },
);

// Parent usage
function App() {
  const modalRef = useRef<ModalHandle>(null);
  return (
    <>
      <button onClick={() => modalRef.current?.open()}>Open Modal</button>
      <Modal ref={modalRef}><p>Modal content</p></Modal>
    </>
  );
}

// ──── useSyncExternalStore — subscribe to external stores ────
// Ensures consistent reads during concurrent rendering

// Example: window width store
function useWindowWidth() {
  return useSyncExternalStore(
    // subscribe
    (callback) => {
      window.addEventListener('resize', callback);
      return () => window.removeEventListener('resize', callback);
    },
    // getSnapshot (client)
    () => window.innerWidth,
    // getServerSnapshot (SSR)
    () => 1024, // default server value
  );
}

// Example: browser online status
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

// Redux uses useSyncExternalStore internally for useSelector
// Zustand also uses it under the hood
```

### Summary
| Hook | Purpose | When |
|---|---|---|
| `useId` | SSR-safe unique ID | Accessibility (htmlFor, aria-*) |
| `useImperativeHandle` | Expose imperative API | Modal.open(), Form.reset() |
| `useSyncExternalStore` | Subscribe to external store | Window events, Redux, Zustand |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"useId for SSR-safe accessibility IDs. useImperativeHandle to expose imperative methods via ref (modal.open()). useSyncExternalStore for concurrent-safe subscription to external stores — Redux and Zustand use it internally."*

## 4. 🧠 MEMORY AID
**"useId = unique ID (SSR-safe). useImperativeHandle = customize ref API. useSyncExternalStore = subscribe + getSnapshot (concurrent-safe)."**
