# 147. ARIA (Accessible Rich Internet Applications)

## 1. High-Level Explanation (Frontend Interview Level)

**ARIA** (Accessible Rich Internet Applications) is a W3C specification providing HTML attributes (roles, states, properties) that enable custom interactive components to be accessible to assistive technologies—bridging the gap between modern JavaScript UIs and screen reader compatibility.

- **What**: HTML attributes (role, aria-*) that communicate component behavior, state, and relationships to assistive technologies
- **Why**: Semantic HTML covers basic elements; ARIA enables complex widgets (tabs, modals, autocomplete) to be accessible
- **When**: Use for custom components when no semantic HTML equivalent exists; avoid overriding native semantics
- **Role**: Makes dynamic SPAs accessible to screen readers

**Key Principle**: "First Rule of ARIA: Don't use ARIA"—use semantic HTML first, ARIA only when necessary.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### ARIA Fundamentals

**1. Five Rules of ARIA**:
```typescript
const ariaRules = {
  rule1: "Don't use ARIA if semantic HTML exists",
  // ❌ <div role="button">
  // ✅ <button>
  
  rule2: "Don't change native semantics unless absolutely necessary",
  // ❌ <button role="heading">
  // ✅ <button> (keep button role)
  
  rule3: "All interactive ARIA controls must be keyboard accessible",
  // Must handle Tab, Enter, Space, Arrow keys, Escape
  
  rule4: "Don't use role='presentation' or aria-hidden on focusable elements",
  // ❌ <button aria-hidden="true">Click</button>
  // (Button focusable but hidden from screen reader = confusion)
  
  rule5: "All interactive elements must have an accessible name",
  // Via: aria-label, aria-labelledby, <label>, title, or text content
};
```

**2. ARIA Categories**:
```typescript
interface ARIAAttributes {
  // Roles: What is this element?
  roles: {
    widget: ['button', 'checkbox', 'tab', 'tabpanel', 'dialog', 'tooltip'],
    composite: ['combobox', 'menu', 'menubar', 'listbox', 'tree', 'grid'],
    document: ['article', 'banner', 'main', 'navigation', 'region', 'search'],
    landmark: ['banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'region', 'search']
  };
  
  // States: Current condition (changes frequently)
  states: {
    'aria-checked': 'true | false | mixed',
    'aria-disabled': 'true | false',
    'aria-expanded': 'true | false',
    'aria-hidden': 'true | false',
    'aria-invalid': 'true | false',
    'aria-pressed': 'true | false',
    'aria-selected': 'true | false'
  };
  
  // Properties: Characteristics (rarely change)
  properties: {
    'aria-label': 'string',           // Accessible name
    'aria-labelledby': 'id-ref',      // Points to label element
    'aria-describedby': 'id-ref',     // Points to description
    'aria-haspopup': 'true | menu | listbox | tree | grid | dialog',
    'aria-controls': 'id-ref',        // Element this controls
    'aria-owns': 'id-ref',            // Child elements (not in DOM tree)
    'aria-live': 'off | polite | assertive',  // Announce changes
    'aria-atomic': 'true | false',    // Announce entire region or just changes
    'aria-relevant': 'additions | removals | text | all'
  };
}
```

### Common ARIA Patterns

**1. Tab Component**:
```tsx
function AccessibleTabs({ tabs }: { tabs: Tab[] }) {
  const [activeTab, setActiveTab] = useState(0);
  
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;
    
    switch (e.key) {
      case 'ArrowRight':
        newIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    setActiveTab(newIndex);
    
    // Focus new tab
    const tabButton = document.getElementById(`tab-${newIndex}`);
    tabButton?.focus();
  };
  
  return (
    <div className="tabs">
      {/* Tab list */}
      <div role="tablist" aria-label="Content sections">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${index}`}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab panels */}
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          id={`tabpanel-${index}`}
          role="tabpanel"
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// Screen reader announces:
// "Content sections, tab list, 3 items"
// "Overview, tab, 1 of 3, selected"
// (Arrow keys move between tabs)
// "Overview panel, tab panel"
```

**2. Combobox (Autocomplete)**:
```tsx
function AccessibleCombobox({ options, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(value.toLowerCase())
  );
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex(prev => 
            Math.min(prev + 1, filteredOptions.length - 1)
          );
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
        
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          onSelect(filteredOptions[activeIndex]);
          setValue(filteredOptions[activeIndex].label);
          setIsOpen(false);
        }
        break;
        
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };
  
  return (
    <div className="combobox">
      <label id="combobox-label" htmlFor="combobox-input">
        Search
      </label>
      
      <input
        ref={inputRef}
        id="combobox-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="listbox"
        aria-activedescendant={
          activeIndex >= 0 ? `option-${activeIndex}` : undefined
        }
        aria-labelledby="combobox-label"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <ul
          id="listbox"
          role="listbox"
          aria-labelledby="combobox-label"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option.id}
              id={`option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => {
                onSelect(option);
                setValue(option.label);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      
      {/* Screen reader announcement for result count */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOpen && `${filteredOptions.length} results available`}
      </div>
    </div>
  );
}

// Screen reader experience:
// (User types "a")
// "A, 5 results available"
// (Press ArrowDown)
// "Apple, 1 of 5"
// (Press Enter)
// "Apple selected"
```

**3. Accordion**:
```tsx
function AccessibleAccordion({ sections }: { sections: Section[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const toggleSection = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  return (
    <div className="accordion">
      {sections.map((section) => {
        const isExpanded = expandedIds.has(section.id);
        
        return (
          <div key={section.id} className="accordion-item">
            <h3>
              <button
                id={`accordion-header-${section.id}`}
                aria-expanded={isExpanded}
                aria-controls={`accordion-panel-${section.id}`}
                onClick={() => toggleSection(section.id)}
              >
                <span>{section.title}</span>
                <span aria-hidden="true">
                  {isExpanded ? '−' : '+'}
                </span>
              </button>
            </h3>
            
            <div
              id={`accordion-panel-${section.id}`}
              role="region"
              aria-labelledby={`accordion-header-${section.id}`}
              hidden={!isExpanded}
            >
              {section.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Screen reader announces:
// "Section 1, button, collapsed"
// (Click)
// "Section 1, button, expanded"
// "Section 1 panel, region"
```

**4. Dialog (Modal)**:
```tsx
function AccessibleDialog({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children 
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus management (from previous example)
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      ref={dialogRef}
      className="dialog"
    >
      <h2 id="dialog-title">{title}</h2>
      
      <div id="dialog-description" className="dialog-description">
        {description}
      </div>
      
      <div className="dialog-content">
        {children}
      </div>
      
      <button 
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="Close dialog"
      >
        ×
      </button>
    </div>
  );
}

// Screen reader announces on open:
// "Dialog: Delete confirmation"
// "Are you sure you want to delete this item? This cannot be undone."
// "Close dialog, button"
```

### Live Regions

**1. Announcements**:
```tsx
// Polite announcements (wait for user idle)
function PoliteAnnouncement({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Usage
<PoliteAnnouncement message="5 items added to cart" />

// Assertive announcements (interrupt immediately)
function AssertiveAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Usage (errors only!)
<AssertiveAlert message="Payment failed. Please try again." />
```

**2. Loading States**:
```tsx
function LoadingButton({ isLoading, children, ...props }: Props) {
  return (
    <button
      {...props}
      aria-busy={isLoading}
      aria-live="polite"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Screen reader announces:
// (Click button)
// "Loading, button, busy"
// (After load)
// "Submit, button"
```

### ARIA Landmarks

**1. Page Structure**:
```html
<!-- Landmarks for navigation -->
<body>
  <!-- Banner landmark -->
  <header role="banner">
    <nav aria-label="Main navigation">
      <!-- Navigation links -->
    </nav>
  </header>
  
  <!-- Main landmark -->
  <main role="main">
    <h1>Page Title</h1>
    
    <!-- Search landmark -->
    <div role="search">
      <label for="search">Search</label>
      <input type="search" id="search" />
    </div>
    
    <!-- Article content -->
    <article>
      <!-- ... -->
    </article>
  </main>
  
  <!-- Complementary landmark -->
  <aside role="complementary" aria-label="Related articles">
    <!-- Sidebar content -->
  </aside>
  
  <!-- Contentinfo landmark -->
  <footer role="contentinfo">
    <!-- Footer content -->
  </footer>
</body>

<!-- Screen reader users can jump between landmarks:
   - Press D to cycle through landmarks
   - Press H to cycle through headings
   - Press T to cycle through tables
   - Press F to cycle through forms
-->
```

**2. Multiple Landmarks**:
```html
<!-- When multiple landmarks of same type, label them -->
<nav aria-label="Main navigation">
  <!-- Primary nav -->
</nav>

<nav aria-label="Footer navigation">
  <!-- Footer nav -->
</nav>

<aside aria-label="Latest news">
  <!-- News sidebar -->
</aside>

<aside aria-label="Related articles">
  <!-- Related sidebar -->
</aside>
```

### Common Mistakes

**1. Redundant ARIA**:
```html
<!-- ❌ BAD: Redundant role -->
<button role="button">Click</button>
<!-- Button already has button role! -->

<!-- ✅ GOOD: Let native semantics work -->
<button>Click</button>

<!-- ❌ BAD: Overriding native semantics -->
<h1 role="button">Not a heading anymore!</h1>

<!-- ✅ GOOD: Use correct element -->
<button>
  <h1>Heading inside button (if really needed)</h1>
</button>
```

**2. Incorrect aria-hidden**:
```html
<!-- ❌ BAD: Focusable but hidden -->
<button aria-hidden="true">Click</button>
<!-- Keyboard users can focus, but screen reader says nothing! -->

<!-- ✅ GOOD: Hide decorative icon -->
<button>
  <span aria-hidden="true">★</span>
  Favorite
</button>
```

**3. Missing accessible names**:
```html
<!-- ❌ BAD: No accessible name -->
<button>
  <svg>...</svg>
</button>
<!-- Screen reader: "button" (what does it do?) -->

<!-- ✅ GOOD: Accessible name -->
<button aria-label="Close dialog">
  <svg>...</svg>
</button>
<!-- Screen reader: "Close dialog, button" -->
```

### What NOT to Do

- ❌ **Use ARIA when semantic HTML exists** - `<div role="button">` → `<button>`
- ❌ **aria-label on non-interactive elements** - Divs, spans (screen readers ignore)
- ❌ **aria-hidden on focusable elements** - Creates keyboard trap
- ❌ **Forget keyboard support** - ARIA without keyboard = inaccessible
- ❌ **aria-live="assertive" everywhere** - Reserve for critical errors only

---

## 3. Clear Real-World Examples

### Example 1: Material-UI Tab Component

```tsx
// MUI's Tab component (simplified)
function Tab({ label, selected, controls, onClick }: TabProps) {
  return (
    <button
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      tabIndex={selected ? 0 : -1}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TabPanel({ id, labelledBy, children, hidden }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={labelledBy}
      hidden={hidden}
    >
      {children}
    </div>
  );
}

// Usage
<Tabs value={activeTab}>
  <Tab label="Overview" />
  <Tab label="Details" />
</Tabs>
<TabPanel value={0}>Overview content</TabPanel>
<TabPanel value={1}>Details content</TabPanel>
```

### Example 2: Downshift (Accessible Combobox)

```tsx
import { useCombobox } from 'downshift';

function ComboboxExample({ items }: Props) {
  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    items,
    onInputValueChange: ({ inputValue }) => {
      // Filter items
    }
  });
  
  return (
    <div>
      <input {...getInputProps()} />
      <ul {...getMenuProps()}>
        {isOpen &&
          items.map((item, index) => (
            <li
              {...getItemProps({ item, index })}
              style={{
                backgroundColor: highlightedIndex === index ? 'lightgray' : 'white'
              }}
            >
              {item}
            </li>
          ))}
      </ul>
    </div>
  );
}

// Downshift automatically handles:
// - role="combobox"
// - aria-expanded
// - aria-activedescendant
// - Keyboard navigation
```

### Example 3: React Aria (Adobe)

```tsx
import { useButton, useDialog, useOverlay } from 'react-aria';

function Button(props) {
  const ref = useRef();
  const { buttonProps } = useButton(props, ref);
  
  return <button {...buttonProps} ref={ref}>{props.children}</button>;
}

function Dialog({ title, children, ...props }) {
  const ref = useRef();
  const { overlayProps } = useOverlay(props, ref);
  const { dialogProps, titleProps } = useDialog(props, ref);
  
  return (
    <div {...overlayProps}>
      <div {...dialogProps} ref={ref}>
        <h3 {...titleProps}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// React Aria handles all ARIA attributes + keyboard interactions
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "When and how would you use ARIA?"

**Answer**:

"ARIA fills gaps when **semantic HTML is insufficient**:

**1. First Rule: Don't Use ARIA**

Use semantic HTML first:
```html
<!-- ❌ BAD -->
<div role="button" tabindex="0" onclick="...">

<!-- ✅ GOOD -->
<button onclick="...">
```

Native elements have built-in accessibility.

**2. When ARIA is Needed**

For custom widgets without HTML equivalents:
- **Tabs**: role="tab", role="tabpanel"
- **Combobox**: role="combobox", aria-expanded, aria-activedescendant
- **Tree view**: role="tree", role="treeitem"
- **Custom dialogs**: role="dialog", aria-modal="true"

**3. Three Components: Roles, States, Properties**

**Roles** (what is this?):
```html
<div role="button">      <!-- Widget role -->
<div role="navigation">  <!-- Landmark role -->
```

**States** (current condition, changes frequently):
```html
<button aria-pressed="true">    <!-- Toggle button -->
<button aria-expanded="false">  <!-- Collapsed dropdown -->
```

**Properties** (characteristics, rarely change):
```html
<button aria-label="Close">           <!-- Accessible name -->
<input aria-describedby="hint">       <!-- Help text -->
<div aria-live="polite">              <!-- Announce updates -->
```

**4. Tab Component Example**

```tsx
// Tabs need ARIA (no native HTML equivalent)
<div role="tablist">
  <button 
    role="tab" 
    aria-selected="true"
    aria-controls="panel-1"
  >
    Tab 1
  </button>
</div>

<div 
  id="panel-1"
  role="tabpanel"
  aria-labelledby="tab-1"
>
  Content
</div>
```

Plus keyboard support:
- Arrow keys move between tabs
- Home/End jump to first/last
- Tab moves to panel content

**5. Live Regions (Dynamic Content)**

For content that changes:
```html
<!-- Polite: wait for user idle -->
<div aria-live="polite">
  5 items in cart
</div>

<!-- Assertive: interrupt immediately (errors only) -->
<div aria-live="assertive" role="alert">
  Payment failed
</div>
```

**6. Landmarks for Navigation**

```html
<header role="banner">       <!-- Site header -->
<nav role="navigation">      <!-- Navigation -->
<main role="main">           <!-- Main content -->
<aside role="complementary"> <!-- Sidebar -->
<footer role="contentinfo">  <!-- Site footer -->
```

Screen reader users press D to jump between landmarks.

**7. Common Mistakes**

❌ **Redundant ARIA**:
```html
<button role="button">  <!-- Button already has button role -->
```

❌ **aria-hidden on focusable**:
```html
<button aria-hidden="true">Click</button>
<!-- Can focus but hidden = broken -->
```

❌ **No keyboard support**:
```html
<div role="button">  <!-- Must handle Enter/Space keys -->
```

**8. Testing**

- **Automated**: axe, eslint-plugin-jsx-a11y (catch syntax errors)
- **Manual**: Screen reader testing (NVDA, VoiceOver)
- **Keyboard**: Tab through, ensure all functionality works

**9. Libraries**

For complex widgets, use battle-tested libraries:
- **React Aria** (Adobe): Hooks for accessible components
- **Reach UI**: Accessible component library
- **Downshift**: Accessible combobox/select
- **Radix UI**: Unstyled accessible components

Don't reinvent ARIA patterns (easy to get wrong).

**10. Real-World**

**GitHub**: Keyboard shortcuts (? shows help), skip links, ARIA for custom widgets (file tree, code review comments).

**Airbnb**: Filter panel (date picker, dropdown) with full ARIA support—complex UI accessible via keyboard + screen reader.

**Trade-off**: Some dev complexity, but libraries handle most. Benefits: legal compliance, 15% more users, better UX for all."

---

## 6. Why & How Summary

### Why It Matters

**Custom Widgets**: Semantic HTML insufficient for tabs, combobox, tree  
**Dynamic Content**: Live regions announce changes to screen readers  
**Complex UIs**: SPAs need ARIA for accessibility

### How It Works

**1. Roles**: Define element type (button, tab, dialog, navigation)  
**2. States**: Communicate current condition (expanded, selected, checked)  
**3. Properties**: Provide context (label, describedby, live regions)  
**4. Keyboard**: ARIA without keyboard = still inaccessible  
**5. Testing**: Automated (axe) + manual (screen reader)

**FAANG**: Semantic HTML first, ARIA for custom widgets, live regions for dynamic content, keyboard support mandatory, use libraries (React Aria, Reach UI), extensive testing
