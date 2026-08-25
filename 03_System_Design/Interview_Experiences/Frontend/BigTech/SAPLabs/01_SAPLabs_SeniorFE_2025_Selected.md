# SAP Labs — Senior Frontend Engineer Interview Experience (2025) — #1

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior Frontend Developer |
| **Level** | T3 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 10 days

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Implement a Reusable Modal System** (stacked modals, focus trap, backdrop click)
2. **Array manipulation: Group Anagrams** (LeetCode 49)

### 💡 Group Anagrams

```javascript
function groupAnagrams(strs) {
  const map = new Map();
  
  for (const str of strs) {
    // Sort characters as key — O(k log k) per string
    const key = str.split('').sort().join('');
    
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }
  
  return Array.from(map.values());
}
// Time: O(n * k log k), Space: O(n * k)

// Optimized: Character frequency as key — O(k) per string
function groupAnagramsOptimal(strs) {
  const map = new Map();
  
  for (const str of strs) {
    const count = new Array(26).fill(0);
    for (const ch of str) count[ch.charCodeAt(0) - 97]++;
    const key = count.join('#'); // "1#0#0#...#0" format
    
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }
  
  return Array.from(map.values());
}
// Time: O(n * k), Space: O(n * k)
```

---

## Round 2: Frontend Deep Dive
**Duration:** 60 minutes

### Questions Asked
1. **Build a Reusable Modal System with Stacking, Focus Trap, Animations**
2. **Discussion: Web Components vs React Components — when to use which?**

### 💡 Modal System with Focus Trap

```jsx
// Modal Portal with stacking context
const ModalContext = createContext();

function ModalProvider({ children }) {
  const [modals, setModals] = useState([]);
  
  const openModal = useCallback((id, content, options = {}) => {
    setModals(prev => [...prev, { id, content, ...options }]);
  }, []);
  
  const closeModal = useCallback((id) => {
    setModals(prev => prev.filter(m => m.id !== id));
  }, []);
  
  const closeTopModal = useCallback(() => {
    setModals(prev => prev.slice(0, -1));
  }, []);
  
  return (
    <ModalContext.Provider value={{ openModal, closeModal, closeTopModal }}>
      {children}
      {/* Render all modals stacked */}
      {modals.map((modal, index) => (
        <ModalOverlay
          key={modal.id}
          modal={modal}
          isTopmost={index === modals.length - 1}
          zIndex={1000 + index * 10}
          onClose={() => closeModal(modal.id)}
        />
      ))}
    </ModalContext.Provider>
  );
}

function ModalOverlay({ modal, isTopmost, zIndex, onClose }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  
  // Focus trap
  useEffect(() => {
    if (!isTopmost) return;
    
    previousFocusRef.current = document.activeElement;
    
    const focusableSelector = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
      'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    const trapFocus = (e) => {
      if (e.key !== 'Tab') return;
      
      const focusable = modalRef.current.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', trapFocus);
    document.addEventListener('keydown', handleEscape);
    
    // Focus first focusable element
    const firstFocusable = modalRef.current?.querySelector(focusableSelector);
    firstFocusable?.focus();
    
    return () => {
      document.removeEventListener('keydown', trapFocus);
      document.removeEventListener('keydown', handleEscape);
      previousFocusRef.current?.focus(); // Restore focus
    };
  }, [isTopmost, onClose]);
  
  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && modal.closeOnBackdrop !== false) {
      onClose();
    }
  };
  
  return createPortal(
    <div
      className="modal-backdrop"
      style={{ zIndex }}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`modal-content modal-${modal.size || 'medium'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${modal.id}`}
        aria-describedby={modal.description ? `modal-desc-${modal.id}` : undefined}
      >
        <div className="modal-header">
          <h2 id={`modal-title-${modal.id}`}>{modal.title || 'Dialog'}</h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          {typeof modal.content === 'function' ? modal.content({ close: onClose }) : modal.content}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Usage:
function App() {
  const { openModal } = useContext(ModalContext);
  
  const handleOpenConfirmation = () => {
    openModal('confirm', ({ close }) => (
      <div>
        <p id="modal-desc-confirm">Are you sure you want to delete this item?</p>
        <button onClick={() => { handleDelete(); close(); }}>Confirm</button>
        <button onClick={close}>Cancel</button>
      </div>
    ), { title: 'Confirm Delete', size: 'small', closeOnBackdrop: false });
  };
}
```

**Web Components vs React Components Discussion Points:**
| Aspect | Web Components | React Components |
|--------|---------------|-----------------|
| **Encapsulation** | Shadow DOM (true isolation) | CSS Modules / Styled Components |
| **Framework agnostic** | ✅ Works everywhere | ❌ React only |
| **Ecosystem** | Smaller | Massive |
| **Performance** | Native browser APIs | Virtual DOM overhead |
| **When to use** | Design systems shared across frameworks, third-party widgets | App-specific UI, complex state |
| **SAP context** | UI5 Web Components | Fiori Elements |

---

## 🎯 Key Takeaways
- SAP Labs FE = **enterprise UI patterns** + Web Components + accessibility
- **Modal stacking**: z-index layering, focus trap only on topmost modal
- **Focus trap**: Tab/Shift+Tab cycle within modal focusable elements
- **Restore focus**: save `document.activeElement` before open, restore on close
- **Web Components** are important at SAP — UI5 is built on them
- **Group Anagrams**: character frequency key is O(n*k) vs sorting O(n*k log k)
- SAP values: **enterprise quality**, accessibility, internationalization
- Know **SAPUI5/OpenUI5** and **Fiori design language**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array Manipulation, Group Anagrams |
| Frontend Deep Dive | Hard | Modal System, Focus Trap, Web Components |
| System Design | Medium-Hard | ERP Dashboard, i18n |
| HM | Medium | Behavioral |
