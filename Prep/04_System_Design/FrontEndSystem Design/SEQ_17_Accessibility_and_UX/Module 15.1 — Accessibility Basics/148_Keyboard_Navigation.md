# 148. Keyboard Navigation

## 1. High-Level Explanation (Frontend Interview Level)

**Keyboard Navigation** is the ability to operate all website functionality using only a keyboard (no mouse)—essential for users with motor disabilities, power users, and accessibility compliance—requiring proper tab order, focus management, keyboard shortcuts, and focus indicators.

- **What**: Tab to navigate, Enter/Space to activate, Arrow keys for custom widgets, Escape to cancel, focus indicators visible
- **Why**: Required for screen reader users, motor disabilities (cannot use mouse), power users (faster), WCAG 2.1.1 (Level A)
- **When**: All interactive elements must be keyboard accessible from day 1
- **Role**: Primary navigation method for 10-15% of users

**Key Principle**: "Keyboard first"—if it works with keyboard, it'll work with assistive tech. If not, it's inaccessible.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Keyboard Navigation Fundamentals

**1. Standard Keys**:
```typescript
const keyboardControls = {
  navigation: {
    'Tab': 'Move focus forward',
    'Shift+Tab': 'Move focus backward',
    'Arrow keys': 'Navigate within component (grids, menus, tabs)',
    'Home': 'Move to first item',
    'End': 'Move to last item',
    'Page Up': 'Scroll up one page',
    'Page Down': 'Scroll down one page'
  },
  
  activation: {
    'Enter': 'Activate button, link, submit form',
    'Space': 'Activate button, checkbox (not link!)',
    'Escape': 'Close dialog, cancel, clear selection'
  },
  
  selection: {
    'Shift+Arrow': 'Extend selection (in lists)',
    'Ctrl+A': 'Select all',
    'Ctrl+Arrow': 'Move without selecting'
  },
  
  application: {
    'Alt+Arrow': 'Browser history',
    'Ctrl+F': 'Find in page',
    'Ctrl+L': 'Focus address bar',
    '/': 'Common pattern for search focus'
  }
};
```

**2. Tab Order (Tabindex)**:
```html
<!-- Natural tab order (follows DOM order) -->
<button>First</button>
<a href="#">Second</a>
<input type="text" />  <!-- Third -->

<!-- tabindex values -->
<!-- tabindex="0": Included in natural tab order -->
<div tabindex="0" role="button">Focusable div</div>

<!-- tabindex="-1": Programmatically focusable (not in tab order) -->
<div tabindex="-1" id="error-message">
  Error: Please fix...
</div>
<script>
  // Focus error message when validation fails
  document.getElementById('error-message').focus();
</script>

<!-- ❌ tabindex="1+" : AVOID! Disrupts natural order -->
<button tabindex="5">Out of order (bad!)</button>
<button tabindex="1">Don't use positive tabindex</button>
<!-- Tab order: 1 → 5 → (then natural order) = confusing -->

<!-- ✅ BEST: No tabindex (natural order) or 0/-1 only -->
```

**3. Focus Management**:
```typescript
// Managing focus in React
function FocusManagement() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus element programmatically
  const focusInput = () => {
    inputRef.current?.focus();
  };
  
  // Focus trap for modals
  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };
  
  return (
    <div>
      <button ref={buttonRef} onClick={focusInput}>
        Focus input
      </button>
      <input ref={inputRef} type="text" />
    </div>
  );
}
```

### Focus Indicators

**1. Visible Focus**:
```css
/* ❌ NEVER do this (WCAG violation) */
* {
  outline: none;
}

/* ❌ BAD: No focus indicator */
button:focus {
  outline: none;
}

/* ✅ GOOD: Enhanced focus indicator (WCAG 2.4.7 AA) */
button:focus {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}

/* ✅ BETTER: Focus-visible (only keyboard focus, not mouse) */
button:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}

button:focus:not(:focus-visible) {
  outline: none; /* Hide outline for mouse clicks */
}

/* ✅ BEST: High contrast + animation */
@keyframes focus-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5); }
  50% { box-shadow: 0 0 0 5px rgba(0, 102, 204, 0.3); }
}

button:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
  animation: focus-pulse 1.5s ease-in-out;
}
```

**2. Custom Focus Styles**:
```tsx
// Focus ring component (custom styled)
function FocusRing({ children, className }: Props) {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div 
      className={`focus-ring ${isFocused ? 'focused' : ''} ${className}`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {children}
    </div>
  );
}

// CSS
.focus-ring.focused {
  position: relative;
}

.focus-ring.focused::after {
  content: '';
  position: absolute;
  inset: -3px;
  border: 3px solid #0066cc;
  border-radius: 6px;
  pointer-events: none;
}
```

### Keyboard Patterns for Custom Widgets

**1. Menu/Dropdown**:
```tsx
function KeyboardAccessibleMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const items = ['Profile', 'Settings', 'Logout'];
  
  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(items.length - 1);
        break;
    }
  };
  
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % items.length);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => 
          prev === 0 ? items.length - 1 : prev - 1
        );
        break;
        
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
        
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleSelect(items[focusedIndex]);
        break;
        
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
        
      // Type-ahead: Jump to item starting with typed letter
      default:
        if (e.key.length === 1) {
          const index = items.findIndex(item => 
            item.toLowerCase().startsWith(e.key.toLowerCase())
          );
          if (index !== -1) {
            setFocusedIndex(index);
          }
        }
    }
  };
  
  const handleSelect = (item: string) => {
    console.log('Selected:', item);
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  
  return (
    <div className="menu">
      <button
        ref={buttonRef}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
      >
        Menu
      </button>
      
      {isOpen && (
        <ul
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          tabIndex={-1}
        >
          {items.map((item, index) => (
            <li
              key={item}
              role="menuitem"
              tabIndex={-1}
              className={index === focusedIndex ? 'focused' : ''}
              onClick={() => handleSelect(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**2. Grid/Table Navigation**:
```tsx
function KeyboardAccessibleGrid({ data }: { data: string[][] }) {
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const { row, col } = focusedCell;
    
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (col < data[row].length - 1) {
          setFocusedCell({ row, col: col + 1 });
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (col > 0) {
          setFocusedCell({ row, col: col - 1 });
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (row < data.length - 1) {
          setFocusedCell({ row: row + 1, col });
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (row > 0) {
          setFocusedCell({ row: row - 1, col });
        }
        break;
        
      case 'Home':
        e.preventDefault();
        if (e.ctrlKey) {
          setFocusedCell({ row: 0, col: 0 });
        } else {
          setFocusedCell({ row, col: 0 });
        }
        break;
        
      case 'End':
        e.preventDefault();
        if (e.ctrlKey) {
          setFocusedCell({ 
            row: data.length - 1, 
            col: data[data.length - 1].length - 1 
          });
        } else {
          setFocusedCell({ row, col: data[row].length - 1 });
        }
        break;
    }
  };
  
  useEffect(() => {
    const cell = document.querySelector(
      `[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`
    ) as HTMLElement;
    cell?.focus();
  }, [focusedCell]);
  
  return (
    <table role="grid" onKeyDown={handleKeyDown}>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex} role="row">
            {row.map((cell, colIndex) => (
              <td
                key={colIndex}
                role="gridcell"
                tabIndex={
                  rowIndex === focusedCell.row && colIndex === focusedCell.col 
                    ? 0 
                    : -1
                }
                data-row={rowIndex}
                data-col={colIndex}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Skip Links

**1. Bypass Repetitive Content**:
```tsx
function PageWithSkipLinks() {
  return (
    <>
      {/* Skip links (first focusable elements) */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#nav" className="skip-link">
        Skip to navigation
      </a>
      
      {/* Header with navigation (repetitive) */}
      <header>
        <nav id="nav">
          {/* 20+ navigation links */}
          <a href="/">Home</a>
          <a href="/about">About</a>
          {/* ... */}
        </nav>
      </header>
      
      {/* Main content */}
      <main id="main-content" tabIndex={-1}>
        <h1>Page Title</h1>
        <p>Content starts here...</p>
      </main>
    </>
  );
}

// CSS: Show skip links on focus
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Keyboard Shortcuts

**1. Global Shortcuts**:
```tsx
function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Gmail-style shortcuts (no modifier keys)
      if (e.target instanceof HTMLInputElement) return; // Skip if in input
      
      switch (e.key) {
        case '/':
          e.preventDefault();
          // Focus search
          document.getElementById('search')?.focus();
          break;
          
        case 'c':
          e.preventDefault();
          // Compose new email
          openComposer();
          break;
          
        case '?':
          e.preventDefault();
          // Show keyboard shortcuts help
          showShortcutsHelp();
          break;
      }
      
      // With modifiers
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            // Save
            handleSave();
            break;
            
          case 'k':
            e.preventDefault();
            // Open command palette
            openCommandPalette();
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return <div>Content...</div>;
}

// Keyboard shortcuts help (triggered by "?")
function ShortcutsHelp() {
  return (
    <dialog open>
      <h2>Keyboard Shortcuts</h2>
      <dl>
        <dt><kbd>/</kbd></dt>
        <dd>Focus search</dd>
        
        <dt><kbd>c</kbd></dt>
        <dd>Compose</dd>
        
        <dt><kbd>Ctrl</kbd>+<kbd>S</kbd></dt>
        <dd>Save</dd>
        
        <dt><kbd>Esc</kbd></dt>
        <dd>Close dialog</dd>
      </dl>
    </dialog>
  );
}
```

### What NOT to Do

- ❌ **Remove outline** (`outline: none`) without custom focus style
- ❌ **Positive tabindex** (tabindex="1+") disrupts natural order
- ❌ **Keyboard traps** (no way to escape with keyboard)
- ❌ **Hidden focusable elements** (aria-hidden + focusable)
- ❌ **Complex shortcuts without help** (Ctrl+Shift+Alt+X)

---

## 3. Clear Real-World Examples

### Example 1: GitHub Keyboard Navigation

```typescript
// GitHub's global keyboard shortcuts
const githubShortcuts = {
  navigation: {
    'g c': 'Go to Code',
    'g i': 'Go to Issues',
    'g p': 'Go to Pull requests',
    '/': 'Focus search',
    's': 'Focus search (anywhere)',
    '?': 'Show keyboard shortcuts help'
  },
  
  actions: {
    'c': 'Create issue',
    '.': 'Open in github.dev (web editor)',
    'b': 'Open blame view',
    'l': 'Jump to line',
    't': 'Activate file finder'
  },
  
  code_review: {
    'j': 'Next comment',
    'k': 'Previous comment',
    'e': 'Expand/collapse comment',
    'r': 'Reply to comment'
  }
};

// Implementation
document.addEventListener('keydown', (e) => {
  if (e.key === '?') {
    showShortcutsModal();
  }
});
```

### Example 2: Slack Focus Management

```tsx
// Slack's channel switcher (Ctrl+K)
function ChannelSwitcher({ isOpen, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Focus input when opened
      inputRef.current?.focus();
    }
  }, [isOpen]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    
    // Arrow keys navigate results (handled by list component)
  };
  
  return (
    <dialog open={isOpen} onKeyDown={handleKeyDown}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Jump to..."
        aria-label="Search channels"
      />
      <ChannelResults />
    </dialog>
  );
}

// Trigger with Ctrl+K
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setChannelSwitcherOpen(true);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Example 3: Gmail Keyboard Shortcuts

```typescript
// Gmail's single-key shortcuts (no modifiers)
const gmailShortcuts = {
  'c': 'Compose',
  'r': 'Reply',
  'a': 'Reply all',
  'f': 'Forward',
  'j': 'Newer conversation',
  'k': 'Older conversation',
  'x': 'Select conversation',
  '#': 'Delete',
  'e': 'Archive',
  's': 'Star',
  'gi': 'Go to Inbox',
  'gs': 'Go to Starred',
  'gt': 'Go to Sent'
};

// Enable shortcuts (opt-in)
function SettingsPanel() {
  const [shortcutsEnabled, setShortcutsEnabled] = useState(false);
  
  return (
    <label>
      <input
        type="checkbox"
        checked={shortcutsEnabled}
        onChange={(e) => setShortcutsEnabled(e.target.checked)}
      />
      Enable keyboard shortcuts
    </label>
  );
}
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How do you ensure full keyboard accessibility?"

**Answer**:

"I ensure **all functionality accessible via keyboard**:

**1. Native Elements First**

Use semantic HTML (automatic keyboard support):
```html
<button>  <!-- Tab, Enter, Space -->
<a href>  <!-- Tab, Enter -->
<input>   <!-- Tab, typing, arrows for select -->
```

**2. Tab Order**

Natural DOM order (no positive tabindex):
```html
<!-- ✅ GOOD: Natural order -->
<button>First</button>
<button>Second</button>
<button>Third</button>

<!-- ❌ BAD: Positive tabindex -->
<button tabindex="2">Out of order</button>
```

Use tabindex only:
- **0**: Include in tab order
- **-1**: Programmatically focusable (not in tab order)

**3. Focus Indicators (WCAG 2.4.7)**

Always visible on keyboard focus:
```css
/* ❌ NEVER */
* { outline: none; }

/* ✅ GOOD */
button:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}
```

**:focus-visible** shows outline for keyboard, hides for mouse clicks.

**4. Custom Widget Keyboard Patterns**

For components without native equivalents:

**Tabs**:
- Arrow keys move between tabs
- Tab moves to panel content
- Home/End jump to first/last

**Dropdown/Menu**:
- Enter/Space/ArrowDown open
- Arrow keys navigate items
- Enter/Space select
- Escape close

**Dialog**:
- Focus first element on open
- Trap focus within (Tab cycles inside)
- Escape to close
- Restore focus on close

**5. Focus Management**

```tsx
// Modal: trap focus, restore on close
useEffect(() => {
  if (isOpen) {
    previousFocus.current = document.activeElement;
    firstElement.focus();
    
    // Trap focus
    document.addEventListener('keydown', trapFocus);
    
    return () => {
      document.removeEventListener('keydown', trapFocus);
      previousFocus.current?.focus(); // Restore
    };
  }
}, [isOpen]);
```

**6. Skip Links (WCAG 2.4.1)**

Bypass repetitive navigation:
```html
<a href="#main" class="skip-link">Skip to main content</a>
<!-- (20+ nav links) -->
<main id="main" tabindex="-1">Content</main>
```

CSS: Show on focus only:
```css
.skip-link {
  position: absolute;
  top: -40px; /* Hidden by default */
}

.skip-link:focus {
  top: 0; /* Visible on focus */
}
```

**7. Keyboard Shortcuts**

Optional (document with **?** help):
```typescript
// Single-key (like Gmail)
'c' → Compose
'/' → Focus search
'?' → Show help

// With modifiers (like GitHub)
Ctrl+K → Command palette
Ctrl+S → Save
```

Disable in text inputs:
```typescript
if (e.target instanceof HTMLInputElement) return;
```

**8. Testing Checklist**

- [ ] Tab through all interactive elements
- [ ] No keyboard traps
- [ ] Focus indicators visible
- [ ] Enter/Space activate buttons
- [ ] Escape closes dialogs
- [ ] Arrow keys work in custom widgets
- [ ] Skip links present
- [ ] Shortcut help available

**9. Real-World Examples**

**GitHub**:
- Press **?** for shortcuts help
- **t** for file finder
- **.** for web editor
- Full keyboard navigation

**Gmail**:
- Single-key shortcuts (opt-in)
- **c** compose, **r** reply
- **j/k** navigate conversations
- Keyboard > mouse for power users

**Slack**:
- **Ctrl+K** channel switcher
- Arrow keys navigate
- **Alt+↑/↓** switch channels
- **Esc** close modals

**10. Trade-offs**

Some dev complexity (keyboard handlers), but:
- 10-15% users rely on keyboard
- WCAG Level A requirement
- Power users love shortcuts
- Better overall UX

Cost of retrofitting >> building accessible from start."

---

## 6. Why & How Summary

### Why It Matters

**Accessibility**: Required for motor disabilities, screen reader users (10-15% of users)  
**Compliance**: WCAG 2.1.1 Level A (all functionality keyboard accessible)  
**Power Users**: Keyboard shortcuts faster than mouse

### How It Works

**1. Tab Order**: Natural DOM order, tabindex 0/-1 only  
**2. Focus Indicators**: :focus-visible (WCAG 2.4.7 AA), never outline: none  
**3. Keyboard Patterns**: Enter/Space activate, Arrow keys navigate, Escape cancel  
**4. Focus Management**: Trap focus in modals, restore on close  
**5. Skip Links**: Bypass navigation (WCAG 2.4.1 A)

**FAANG**: Semantic HTML first, custom keyboard handlers for complex widgets, focus trap in modals, skip links, keyboard shortcuts (?, Ctrl+K), comprehensive testing (Tab through entire flow)
