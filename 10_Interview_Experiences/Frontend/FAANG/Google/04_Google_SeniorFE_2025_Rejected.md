# Google — Senior Frontend Engineer Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | L5 Frontend Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + 1 Frontend + System Design + Googleyness)
- **Rejection Reason:** HC rejected — FE system design wasn't strong enough

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Implement a DOM-like Tree Traversal API**
   - `querySelector`, `querySelectorAll`, `closest`, `matches`

### 💡 Interview-Ready Answer

```javascript
class VirtualDOMNode {
  constructor(tag, attrs = {}, children = []) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
    this.parent = null;
    
    children.forEach(child => {
      if (child instanceof VirtualDOMNode) child.parent = this;
    });
  }
  
  get id() { return this.attrs.id || ''; }
  get classList() { return (this.attrs.class || '').split(/\s+/).filter(Boolean); }
  
  // Matches simple CSS selectors: tag, .class, #id, tag.class, tag#id
  matches(selector) {
    const parts = parseSelector(selector);
    
    if (parts.tag && parts.tag !== this.tag) return false;
    if (parts.id && parts.id !== this.id) return false;
    if (parts.classes.length > 0) {
      const nodeClasses = new Set(this.classList);
      if (!parts.classes.every(cls => nodeClasses.has(cls))) return false;
    }
    
    return true;
  }
  
  // Return first descendant matching selector (DFS pre-order)
  querySelector(selector) {
    for (const child of this.children) {
      if (!(child instanceof VirtualDOMNode)) continue;
      
      if (child.matches(selector)) return child;
      
      const found = child.querySelector(selector);
      if (found) return found;
    }
    
    return null;
  }
  
  // Return all descendants matching selector
  querySelectorAll(selector) {
    const results = [];
    
    function dfs(node) {
      for (const child of node.children) {
        if (!(child instanceof VirtualDOMNode)) continue;
        if (child.matches(selector)) results.push(child);
        dfs(child);
      }
    }
    
    dfs(this);
    return results;
  }
  
  // Return closest ancestor (including self) matching selector
  closest(selector) {
    let current = this;
    
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parent;
    }
    
    return null;
  }
  
  // Get element by ID (global search from root)
  getElementById(id) {
    return this.querySelector(`#${id}`);
  }
  
  // Get elements by class name
  getElementsByClassName(className) {
    return this.querySelectorAll(`.${className}`);
  }
  
  // Get elements by tag name
  getElementsByTagName(tag) {
    return this.querySelectorAll(tag);
  }
}

function parseSelector(selector) {
  const result = { tag: null, id: null, classes: [] };
  
  // Split selector into parts: div.active#main → tag=div, classes=[active], id=main
  let remaining = selector;
  
  // Extract ID
  const idMatch = remaining.match(/#([\w-]+)/);
  if (idMatch) {
    result.id = idMatch[1];
    remaining = remaining.replace(idMatch[0], '');
  }
  
  // Extract classes
  const classMatches = remaining.matchAll(/\.([\w-]+)/g);
  for (const match of classMatches) {
    result.classes.push(match[1]);
    remaining = remaining.replace(match[0], '');
  }
  
  // Remaining is tag name
  remaining = remaining.trim();
  if (remaining) result.tag = remaining;
  
  return result;
}

// Usage:
const root = new VirtualDOMNode('div', { id: 'root' }, [
  new VirtualDOMNode('header', { class: 'main-header' }, [
    new VirtualDOMNode('h1', {}, ['Title']),
    new VirtualDOMNode('nav', { class: 'nav active' }, [
      new VirtualDOMNode('a', { id: 'link1', class: 'link' }),
      new VirtualDOMNode('a', { id: 'link2', class: 'link active' }),
    ]),
  ]),
]);

root.querySelector('.link.active');  // → <a id="link2" class="link active">
root.querySelectorAll('.link');      // → [<a id="link1">, <a id="link2">]
```

---

## Round 2: Frontend Specific
**Duration:** 45 minutes

### Questions Asked
1. **Build an accessible Modal with focus trapping**
2. **Implement a keyboard-navigable Dropdown/Select**

### 💡 Accessible Modal with Focus Trap

```javascript
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      // Save previously focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus first focusable element in modal
      requestAnimationFrame(() => {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length) focusable[0].focus();
      });
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = '';
        // Restore focus to previous element
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen]);
  
  // Focus trap
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    
    if (e.key !== 'Tab') return;
    
    const focusable = getFocusableElements(modalRef.current);
    if (!focusable.length) return;
    
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey) {
      // Shift+Tab: if at first, wrap to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if at last, wrap to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  
  if (!isOpen) return null;
  
  return createPortal(
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleKeyDown}
        className="modal"
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="close-btn">
            ×
          </button>
        </div>
        
        <div className="modal-body">{children}</div>
      </div>
    </>,
    document.body
  );
}

function getFocusableElements(container) {
  const selectors = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
  ];
  
  return Array.from(container.querySelectorAll(selectors.join(', ')))
    .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

// Accessible Dropdown
function Dropdown({ options, value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef(null);
  const buttonRef = useRef(null);
  
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => Math.max(prev - 1, 0));
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex]);
          setIsOpen(false);
          buttonRef.current?.focus();
        } else {
          setIsOpen(true);
        }
        break;
        
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
        
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
        
      case 'End':
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
    }
  };
  
  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const option = listRef.current.children[highlightedIndex];
      option?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);
  
  const selectedLabel = options.find(o => o.value === value)?.label || 'Select...';
  const listboxId = useId();
  
  return (
    <div className="dropdown" onKeyDown={handleKeyDown}>
      <label id="dropdown-label">{label}</label>
      
      <button
        ref={buttonRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby="dropdown-label"
        aria-activedescendant={highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined}
        onClick={() => setIsOpen(prev => !prev)}
      >
        {selectedLabel}
        <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <ul ref={listRef} role="listbox" id={listboxId}>
          {options.map((option, idx) => (
            <li
              key={option.value}
              id={`option-${idx}`}
              role="option"
              aria-selected={option.value === value}
              className={`${idx === highlightedIndex ? 'highlighted' : ''} 
                          ${option.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(option); setIsOpen(false); }}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- Google L5 FE = **DOM API implementation + accessibility mastery** is expected
- **Virtual DOM querySelector** — DFS pre-order traversal, selector parsing with regex
- **Focus trapping** in modal: save previous focus, Tab/Shift+Tab wrap, restore on close
- **ARIA for modal**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Dropdown ARIA**: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"`
- **Keyboard navigation**: ArrowUp/Down, Enter/Space, Home/End, Escape — full WCAG compliance
- Google expects **deep accessibility knowledge** and **clean API design**
- HC rejection means: you passed all rounds but committee found gaps in write-up

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | DOM Tree Traversal, Selector Parsing |
| Frontend | Hard | Modal Focus Trap, Dropdown a11y, ARIA |
| System Design | Very Hard | Google Workspace App Frontend |
| Googleyness | Medium | Behavioral, Collaboration |
