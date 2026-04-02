# 110. Portal Pattern
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

A React portal renders children into a different DOM node than their parent — outside the component's normal DOM hierarchy. `ReactDOM.createPortal(children, containerElement)` places the rendered output into any DOM node, typically `document.body` or a dedicated `#modal-root` element. The critical insight: React's synthetic event system and the component tree are independent of the DOM tree. Events from portal content still bubble through the React component tree (not the DOM tree), so `onClick` handlers on ancestor React components still fire from portal clicks. The primary use cases are modals, tooltips, popovers, and dropdowns — any UI that needs to "escape" a parent's `overflow: hidden` or stacking context to render above all other content.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Basic Portal

```typescript
import { createPortal } from 'react-dom';

// Renders into #modal-root (placed at end of <body>) instead of inside parent component
function Modal({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  // Don't render the portal if not open — no DOM node insertion
  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    modalRoot  // ← the target DOM node (outside React's normal mount point)
  );
}

// HTML:
// <body>
//   <div id="root">   ← React mounts here (parent with overflow:hidden, z-index, etc.)
//     <App />
//   </div>
//   <div id="modal-root"></div>  ← modal renders here, unaffected by #root's CSS
// </body>
```

### Event Bubbling Through React Tree (Not DOM Tree)

```typescript
// This is the most surprising behavior — events bubble through React hierarchy
// regardless of where in the DOM the portal content is

function Parent() {
  function handleClick() {
    // This DOES fire when the button inside the portal is clicked
    // Even though in the DOM, the portal is a sibling of #root, not inside Parent
    console.log('Parent click handler triggered by portal child!');
  }

  return (
    <div onClick={handleClick}>
      <p>Parent component</p>
      <PortalChild />  {/* ← renders into #modal-root DOM node */}
    </div>
  );
}

function PortalChild() {
  return createPortal(
    <button>Click me</button>,
    document.getElementById('modal-root')!
  );
}

// DOM structure:
// <div id="root">        ← Parent's div is here
//   <p>Parent component</p>
//   (nothing here — portal goes below)
// </div>
// <div id="modal-root">
//   <button>Click me</button>  ← in the DOM, sibling of #root
// </div>

// Click on button → React bubbles event through the REACT tree → Parent's onClick fires
// This is intentional and fundamental to the portal design
```

### The stacking Context Problem — Why Portals Exist

```typescript
// ❌ Without portals: modal clipped by overflow:hidden ancestor
// This is the real-world problem portals solve

// The product page has overflow:hidden for its card slider
function ProductCard({ product }: { product: Product }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: '200px' }}>
      <img src={product.image} />
      <p>{product.name}</p>
      <button onClick={() => setShowDetails(true)}>Details</button>

      {/* ❌ Modal rendered inside overflow:hidden → gets clipped! */}
      {showDetails && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: '#fff', padding: '20px' }}>
            <p>{product.description}</p>
            <button onClick={() => setShowDetails(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ With portal: modal escapes overflow:hidden parent
function ProductCardFixed({ product }: { product: Product }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: '200px' }}>
      <img src={product.image} />
      <p>{product.name}</p>
      <button onClick={() => setShowDetails(true)}>Details</button>

      {/* ✅ Portal renders into #modal-root — outside overflow:hidden parent */}
      {showDetails && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: '#fff', padding: '20px' }}>
            <p>{product.description}</p>
            <button onClick={() => setShowDetails(false)}>Close</button>
          </div>
        </div>,
        document.getElementById('modal-root')!
      )}
    </div>
  );
}
```

### Accessibility Requirements in Portals

```typescript
// Portals need full accessibility treatment — they're common failure points in audits
function AccessibleModal({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = useId();     // unique ID for aria-labelledby
  const descId = useId();      // unique ID for aria-describedby

  // Focus management: move focus INTO modal when it opens
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();  // move focus into dialog
    }
  }, [isOpen]);

  // Keyboard: close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop: clicks outside modal close it */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"               // required for screen readers
        aria-modal="true"           // tells screen reader modal is in focus
        aria-labelledby={titleId}   // screen reader announces title
        aria-describedby={descId}   // screen reader reads description
        tabIndex={-1}               // allows programmatic focus
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          padding: '24px',
          zIndex: 1000,
        }}
        // Stop backdrop click from propagating to parent
        onClick={e => e.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <div id={descId}>{children}</div>
        <button onClick={onClose} aria-label="Close dialog">×</button>
      </div>
    </>,
    document.getElementById('modal-root')!
  );
}

// Note: full focus trap (Tab/Shift+Tab cycle within modal) requires 
// a library like focus-trap-react for complete WCAG 2.1 compliance
```

### Portal in Next.js / SSR

```typescript
// ❌ Problem: document is not defined during SSR
function BadSSRPortal() {
  // Throws on server: document is not defined
  return createPortal(<div>Hello</div>, document.getElementById('modal-root')!);
}

// ✅ Solution 1: client-only render with useEffect + useState
function SSRSafePortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR: mounted=false → return null
  // Once hydrated on client: mounted=true → render portal
  if (!mounted) return null;

  const portalRoot = document.getElementById('modal-root');
  if (!portalRoot) return null;

  return createPortal(children, portalRoot);
}

// ✅ Solution 2: dynamic import with ssr:false (Next.js)
// const Modal = dynamic(() => import('./Modal'), { ssr: false });
// Entire Modal component replaces to null during SSR

// ✅ Solution 3: create container element dynamically (no ID needed)
function DynamicPortal({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    containerRef.current = container;
    setMounted(true);

    return () => {
      document.body.removeChild(container);  // cleanup on unmount
    };
  }, []);

  if (!mounted || !containerRef.current) return null;
  return createPortal(children, containerRef.current);
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Fiori, data tables use `overflow: auto` for horizontal scrolling. Action menus (dropdowns) triggered from table rows were clipping at the table boundary. Switching the dropdown menu to a portal (rendered at `document.body`) solved the clipping. The biggest challenge was accessibility — focus needed to move into the dropdown when opened and return to the triggering button when closed. A portal wrapper component was built with `useEffect` for focus management, `Escape` key handling, and `aria-expanded` on the trigger + `role="menu"` on the portaled dropdown.

**At FAANG scale:**
- **Microsoft:** Azure Portal's command bar dropdowns use portals to avoid clipping inside scrollable panels (blade containers)
- **Adobe:** Spectrum components library (Overlays package) uses portals for all overlay content (menus, dialogs, tooltips) via a dedicated `OverlayProvider` and `useOverlayPosition`
- **Salesforce:** Lightning base components use a portal-like mechanism for its modals (`lightning-modal`) to escape component shadow DOM stacking constraints
- **Cisco:** WebEx uses portals for participant overflow menus in the meeting grid — the grid uses `overflow: hidden` to clip cells, so action menus must portal to the app root

---

## 💬 4. Interview Execution

### Sample Answer

> "Portals let you render React content into a different DOM node — typically `document.body` or a dedicated `#modal-root` — escaping the CSS constraints of the component's normal DOM position. The main use cases are modals, tooltips, and dropdowns that need to render above everything, especially when an ancestor has `overflow: hidden` or a low `z-index` stacking context.
>
> The behavior that trips people up: even though a portal's content is elsewhere in the DOM, it still belongs to the React component tree. Events from portal content bubble through the React tree, not the DOM tree — so a parent component's `onClick` still fires when a user clicks inside a modal portal. This is intentional.
>
> The SSR gotcha: portals use `document`, which doesn't exist during server rendering. In Next.js, I handle this with a `mounted` state via `useEffect`, or `dynamic(() => import('./Modal'), { ssr: false })`.
>
> And for accessibility: every portal used as a modal needs `role='dialog'`, `aria-modal='true'`, `aria-labelledby`, programmatic focus management (focus moves into the modal on open, returns to trigger on close), and `Escape` key handling. Missing any of these is a WCAG failure."

---

## 💻 5. Code Example

```typescript
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useId } from 'react';

// ========================
// Production Modal using Portal
// — SSR-safe, accessible, keyboard-handled
// ========================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Save the element that opened the modal → return focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      // Focus the dialog itself (tabIndex=-1 required)
      requestAnimationFrame(() => dialogRef.current?.focus());
    } else {
      // Return focus to trigger element
      (triggerRef.current as HTMLElement | null)?.focus();
    }
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // SSR-safe: useEffect runs only on client
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isOpen || !isMounted) return null;

  const portalTarget = document.getElementById('modal-root') ?? document.body;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          zIndex: 1000,
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id={titleId} style={{ margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}
          >
            ×
          </button>
        </div>
        <div style={{ marginTop: '16px' }}>{children}</div>
      </div>
    </>,
    portalTarget
  );
}

// ========================
// Usage
// ========================
function ProductPage({ product }: { product: Product }) {
  const [showModal, setShowModal] = useState(false);

  return (
    // overflow: hidden won't clip the modal — it's portaled to #modal-root
    <div style={{ overflow: 'hidden', maxHeight: '300px' }}>
      <h1>{product.name}</h1>
      <button onClick={() => setShowModal(true)}>View Details</button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${product.name} — Details`}
      >
        <p>{product.description}</p>
        <p>Price: ${product.price}</p>
        <button onClick={() => setShowModal(false)}>Close</button>
      </Modal>
    </div>
  );
}

// HTML required in index.html:
// <div id="root"></div>
// <div id="modal-root"></div>  ← portal target

// Type stubs
interface Product { name: string; description: string; price: number }
```

---

## 🧠 6. Memory Aid

**Analogy:** Portals are like a **shipping address vs. a home address**. The entity (component) lives at one address (parent in React tree) but receives deliveries (renders output) at another address (portal target in DOM). Mail (events) is still routed through the home address (React tree), not the delivery address (DOM).

**Key facts:**
1. `createPortal(children, domNode)` — two arguments
2. Events bubble through React tree, NOT DOM tree
3. SSR: portal requires `document` → guard with `useEffect`/`isMounted`
4. Accessibility checkList: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus management, Escape key

**Mnemonic:** **DEAF** — **D**ifferent DOM node, **E**vents still bubble React-tree-wise, **A**ccessibility required, **F**ocus must be managed.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ CSS isolation: `overflow: hidden` and `z-index` stacking contexts are fundamental layout tools — portals are the only way to render truly above-everything content (modals, tooltips) from components that are embedded in complex layout structures
→ Event model insight: understanding that React events bubble through the React tree (not DOM tree) from portals is a concrete display of React internals knowledge — it comes up in senior interviews as a "trick question"
→ Accessibility is a common failure: modals are consistently cited in WCAG audits as the component type most commonly implemented inaccessibly — knowledge of the focus trap, aria attributes, and Escape handling is directly applicable

**How it works (2 sentences):**
`createPortal(children, domNode)` works by instructing React to render the virtual DOM subtree (`children`) into the physical DOM subtree rooted at `domNode`, which may sit completely outside the React application's main mount point — React maintains the component hierarchy for state, context propagation, and event bubbling, while the actual DOM nodes are inserted at the specified location, giving portal content freedom from the CSS constraints of its parent's DOM position.
React's synthetic event system always traces events through the React fiber tree (not the DOM tree), which is why an `onClick` on a parent React component fires when you click inside a modal portal — the portal's components are React children of the parent in the fiber tree, even though they're DOM siblings in the physical DOM.

---
✅ Topic 110/486 complete → Continuing to Topic 111: Redux Core — Store, Actions, Reducers, Middleware
