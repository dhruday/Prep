# Amazon — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Front-End Engineer II |
| **Level** | L5 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Frontend Coding + 1 Frontend System Design + 1 Bar Raiser)
- **Timeline:** 2.5 weeks
- **Format:** Onsite at Hyderabad campus
- **Note:** Amazon FEE interviews include DSA but also heavy JavaScript/React machine coding

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Flatten Nested Array** (any depth)
2. **Implement a Throttle function**
3. **MCQ: DOM events, CSS specificity, accessibility**

### 💡 Interview-Ready Answer — Flatten Array

```javascript
// Recursive approach
function flatten(arr) {
    const result = [];
    for (const item of arr) {
        if (Array.isArray(item)) {
            result.push(...flatten(item));
        } else {
            result.push(item);
        }
    }
    return result;
}

// Iterative approach (avoids stack overflow for deeply nested)
function flattenIterative(arr) {
    const stack = [...arr];
    const result = [];
    while (stack.length) {
        const item = stack.pop();
        if (Array.isArray(item)) {
            stack.push(...item);
        } else {
            result.push(item);
        }
    }
    return result.reverse();
}

// With depth limit (like Array.prototype.flat)
function flattenDepth(arr, depth = 1) {
    if (depth === 0) return arr.slice();
    return arr.reduce((acc, item) => {
        if (Array.isArray(item)) {
            acc.push(...flattenDepth(item, depth - 1));
        } else {
            acc.push(item);
        }
        return acc;
    }, []);
}
```

### 💡 Interview-Ready Answer — Throttle

```javascript
function throttle(func, limit) {
    let inThrottle = false;
    let lastArgs = null;
    let lastThis = null;
    
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    func.apply(lastThis, lastArgs);
                    lastArgs = null;
                    lastThis = null;
                    inThrottle = true;
                    setTimeout(() => { inThrottle = false; }, limit);
                }
            }, limit);
        } else {
            lastArgs = args;
            lastThis = this;
        }
    };
}

// Difference from debounce:
// Debounce: fires ONCE after user stops (waits for silence)
// Throttle: fires at most once per interval (rate limiting)
```

---

## Round 2: Frontend Coding I — JavaScript
**Duration:** 60 minutes | **Interviewer:** FEE-2

### Questions Asked
1. **Build a Star Rating Component** (vanilla JS, no framework)
2. **Implement curry() function**

### 💡 Interview-Ready Answer — Star Rating Component

```javascript
class StarRating {
    constructor(container, { maxStars = 5, value = 0, onChange = () => {} } = {}) {
        this.container = container;
        this.maxStars = maxStars;
        this.value = value;
        this.onChange = onChange;
        this.hoverValue = 0;
        this.render();
        this.attachEvents();
    }
    
    render() {
        this.container.innerHTML = '';
        this.container.className = 'star-rating';
        this.container.setAttribute('role', 'radiogroup');
        this.container.setAttribute('aria-label', 'Star Rating');
        
        this.stars = [];
        for (let i = 1; i <= this.maxStars; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.dataset.value = i;
            star.setAttribute('role', 'radio');
            star.setAttribute('aria-checked', i <= this.value);
            star.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
            star.setAttribute('tabindex', '0');
            star.textContent = '★';
            this.stars.push(star);
            this.container.appendChild(star);
        }
        
        this.updateDisplay(this.value);
    }
    
    attachEvents() {
        this.container.addEventListener('click', (e) => {
            const star = e.target.closest('.star');
            if (!star) return;
            this.value = parseInt(star.dataset.value);
            this.updateDisplay(this.value);
            this.onChange(this.value);
        });
        
        this.container.addEventListener('mouseover', (e) => {
            const star = e.target.closest('.star');
            if (!star) return;
            this.hoverValue = parseInt(star.dataset.value);
            this.updateDisplay(this.hoverValue);
        });
        
        this.container.addEventListener('mouseleave', () => {
            this.hoverValue = 0;
            this.updateDisplay(this.value);
        });
        
        // Keyboard accessibility
        this.container.addEventListener('keydown', (e) => {
            const star = e.target.closest('.star');
            if (!star) return;
            
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.value = parseInt(star.dataset.value);
                this.updateDisplay(this.value);
                this.onChange(this.value);
            } else if (e.key === 'ArrowRight') {
                const next = star.nextElementSibling;
                if (next) next.focus();
            } else if (e.key === 'ArrowLeft') {
                const prev = star.previousElementSibling;
                if (prev) prev.focus();
            }
        });
    }
    
    updateDisplay(highlightValue) {
        this.stars.forEach((star, index) => {
            const filled = index < highlightValue;
            star.classList.toggle('filled', filled);
            star.style.color = filled ? '#FFD700' : '#CCC';
            star.setAttribute('aria-checked', index < this.value);
        });
    }
    
    getValue() { return this.value; }
    
    setValue(val) {
        this.value = Math.min(Math.max(val, 0), this.maxStars);
        this.updateDisplay(this.value);
    }
}

// Usage:
// const rating = new StarRating(document.getElementById('rating'), {
//     maxStars: 5, value: 3, onChange: (val) => console.log(`Rated: ${val}`)
// });
```

**What interviewers look for:**
1. **Event delegation** (single listener on container, not one per star)
2. **Accessibility** (ARIA roles, keyboard navigation)
3. **Hover state management** (separate hover vs selected state)
4. **Clean separation** of data (value) and presentation (updateDisplay)

### 💡 Interview-Ready Answer — Curry

```javascript
function curry(fn) {
    return function curried(...args) {
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        }
        return function (...moreArgs) {
            return curried.apply(this, args.concat(moreArgs));
        };
    };
}

// Usage:
// const add = curry((a, b, c) => a + b + c);
// add(1)(2)(3)      // 6
// add(1, 2)(3)      // 6
// add(1)(2, 3)      // 6
// add(1, 2, 3)      // 6

// Infinite curry (no fixed arity):
function infiniteCurry(fn, ...initialArgs) {
    return function inner(...args) {
        if (args.length === 0) {
            return initialArgs.reduce(fn);
        }
        return infiniteCurry(fn, ...initialArgs, ...args);
    };
}
// infiniteCurry((a,b) => a+b, 0)(1)(2)(3)() // 6
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes | **Interviewer:** Principal FEE

### Questions Asked
1. **Design a Global Modal Architecture for Amazon.com**
   - Multiple teams shipping features, all need modals
   - Handle stacking, backdrop, keyboard trap, mobile, a11y

### 💡 Interview-Ready Answer

```
Architecture:
┌────────────────────────────────────────────────────┐
│                  Application Root                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Page Content (z-index: 0)                    │   │
│  │  ┌────────────┐  ┌──────────────────────┐    │   │
│  │  │ Product    │  │ Cart Component       │    │   │
│  │  │ Component  │  │ triggers:            │    │   │
│  │  │ triggers:  │  │ useModal('cart')     │    │   │
│  │  │ useModal() │  │                      │    │   │
│  │  └────────────┘  └──────────────────────┘    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Modal Portal Layer (z-index: 1000)           │   │
│  │  ┌──────────────────────────────────────┐    │   │
│  │  │ ModalManager (singleton)              │    │   │
│  │  │  - Maintains stack of active modals   │    │   │
│  │  │  - Handles backdrop                   │    │   │
│  │  │  - Manages focus trap                 │    │   │
│  │  │  - Keyboard events (Escape)           │    │   │
│  │  │  - Scroll lock on body               │    │   │
│  │  └──────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

#### React Implementation
```jsx
// ModalContext — shared state for all modals
const ModalContext = createContext();

function ModalProvider({ children }) {
    const [stack, setStack] = useState([]); // array of modal configs
    
    const open = useCallback((modalConfig) => {
        setStack(prev => [...prev, { id: Date.now(), ...modalConfig }]);
        document.body.style.overflow = 'hidden'; // scroll lock
    }, []);
    
    const close = useCallback((id) => {
        setStack(prev => {
            const next = id 
                ? prev.filter(m => m.id !== id)
                : prev.slice(0, -1); // close topmost
            if (next.length === 0) document.body.style.overflow = '';
            return next;
        });
    }, []);
    
    const closeAll = useCallback(() => {
        setStack([]);
        document.body.style.overflow = '';
    }, []);
    
    return (
        <ModalContext.Provider value={{ stack, open, close, closeAll }}>
            {children}
            <ModalPortal />
        </ModalContext.Provider>
    );
}

// ModalPortal — renders all active modals into a portal
function ModalPortal() {
    const { stack, close } = useContext(ModalContext);
    
    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && stack.length > 0) {
                const topModal = stack[stack.length - 1];
                if (!topModal.preventClose) close();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [stack, close]);
    
    return createPortal(
        <>
            {stack.length > 0 && (
                <div className="modal-backdrop" onClick={() => close()} />
            )}
            {stack.map((modal, index) => (
                <FocusTrap key={modal.id} active={index === stack.length - 1}>
                    <div 
                        className="modal-container"
                        style={{ zIndex: 1000 + index }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`modal-title-${modal.id}`}
                    >
                        {modal.component}
                    </div>
                </FocusTrap>
            ))}
        </>,
        document.getElementById('modal-root')
    );
}

// FocusTrap — traps focus within modal for accessibility
function FocusTrap({ children, active }) {
    const ref = useRef();
    
    useEffect(() => {
        if (!active || !ref.current) return;
        
        const focusable = ref.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        first?.focus();
        
        const trap = (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        
        ref.current.addEventListener('keydown', trap);
        return () => ref.current?.removeEventListener('keydown', trap);
    }, [active]);
    
    return <div ref={ref}>{children}</div>;
}

// useModal hook — for any team to trigger modals
function useModal() {
    const { open, close } = useContext(ModalContext);
    return { openModal: open, closeModal: close };
}

// Usage by any team:
// const { openModal, closeModal } = useModal();
// openModal({
//     component: <AddToCartConfirmation onClose={closeModal} />,
//     preventClose: false
// });
```

#### Key Design Decisions
| Decision | Choice | Reason |
|----------|--------|--------|
| **Rendering** | React Portal | Renders outside component tree, avoids z-index issues |
| **State** | Context + Stack | Supports multiple stacked modals, LIFO close order |
| **Focus** | Custom FocusTrap | WCAG 2.1 compliance, keyboard navigation |
| **Scroll** | body overflow:hidden | Prevents background scroll on mobile |
| **Close** | Escape + backdrop click | Standard UX patterns |
| **Animation** | CSS transitions on mount/unmount | No JS animation library needed |

---

## Round 4: Bar Raiser + LP
**Duration:** 60 minutes | **Interviewer:** Principal Engineer (different org)

### Questions Asked
1. **LP: "Customer Obsession — tell me about a time you went above and beyond for users"**
2. **LP: "Ownership — describe a time you took ownership outside your defined role"**
3. **Coding: Implement a simple Virtual DOM diff algorithm**

### 💡 Interview-Ready Answer — Virtual DOM Diff (simplified)

```javascript
function diff(oldVNode, newVNode) {
    // Case 1: Remove old node
    if (!newVNode) {
        return { type: 'REMOVE' };
    }
    
    // Case 2: Add new node
    if (!oldVNode) {
        return { type: 'CREATE', newVNode };
    }
    
    // Case 3: Replace (different tag or text)
    if (typeof oldVNode !== typeof newVNode ||
        (typeof oldVNode === 'string' && oldVNode !== newVNode) ||
        oldVNode.tag !== newVNode.tag) {
        return { type: 'REPLACE', newVNode };
    }
    
    // Case 4: Update (same tag, diff props/children)
    if (oldVNode.tag) {
        const propPatches = diffProps(oldVNode.props, newVNode.props);
        const childPatches = diffChildren(oldVNode.children, newVNode.children);
        
        if (propPatches.length === 0 && childPatches.length === 0) return null;
        return { type: 'UPDATE', propPatches, childPatches };
    }
    
    return null;
}

function diffProps(oldProps = {}, newProps = {}) {
    const patches = [];
    
    // Changed or new props
    for (const [key, value] of Object.entries(newProps)) {
        if (oldProps[key] !== value) {
            patches.push({ type: 'SET_PROP', key, value });
        }
    }
    
    // Removed props
    for (const key of Object.keys(oldProps)) {
        if (!(key in newProps)) {
            patches.push({ type: 'REMOVE_PROP', key });
        }
    }
    
    return patches;
}

function diffChildren(oldChildren = [], newChildren = []) {
    const patches = [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);
    
    for (let i = 0; i < maxLen; i++) {
        patches.push(diff(oldChildren[i], newChildren[i]));
    }
    
    return patches;
}
```

---

## 🎯 Key Takeaways
- Amazon FEE interviews test **practical component building** — star rating, autocomplete, modal systems
- **Accessibility (a11y) is critical** — ARIA roles, keyboard navigation, focus trapping
- The **Modal Architecture** question is a real Amazon question — many teams need modals, how to standardize?
- **Curry, throttle, debounce** are JavaScript fundamentals tested at every level
- **Virtual DOM diff** understanding shows framework internals knowledge — essential for L5+
- Always add **event delegation** — it's a signal of DOM expertise

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array Manipulation, Closures |
| Round 2 | Medium | Component Design, Currying |
| Round 3 | Hard | Modal Architecture, Focus Trap, a11y |
| Round 4 | Hard | Virtual DOM, LP Stories |
