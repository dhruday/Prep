# Salesforce — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | MTS-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/salesforce-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Technical + LWC Deep Dive + System Design + HM)
- **Rejection Reason:** LWC deep dive — couldn't explain Lightning Locker Service security model

---

## Round 1: Frontend Technical
**Duration:** 60 minutes

### Questions Asked
1. **Build a Multi-Select Combobox (with type-ahead search, chips, keyboard accessible)**
2. **Explain Shadow DOM and its implications on CSS/events**

### 💡 Multi-Select Combobox

```jsx
function MultiSelectCombobox({ options, value = [], onChange, placeholder = 'Search...' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const comboboxId = useId();
  
  const filtered = useMemo(() => {
    if (!query) return options.filter(o => !value.includes(o.value));
    return options.filter(o =>
      !value.includes(o.value) &&
      o.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, value, query]);
  
  const selectOption = (optionValue) => {
    onChange([...value, optionValue]);
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  };
  
  const removeOption = (optionValue) => {
    onChange(value.filter(v => v !== optionValue));
    inputRef.current?.focus();
  };
  
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          selectOption(filtered[activeIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Backspace':
        if (!query && value.length > 0) {
          // Remove last chip
          removeOption(value[value.length - 1]);
        }
        break;
    }
  };
  
  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);
  
  const selectedOptions = value.map(v => options.find(o => o.value === v)).filter(Boolean);
  
  return (
    <div className="combobox-container">
      <div
        className={`combobox-input-wrapper ${isOpen ? 'open' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected chips */}
        {selectedOptions.map(opt => (
          <span key={opt.value} className="chip" role="option" aria-selected="true">
            {opt.label}
            <button
              onClick={(e) => { e.stopPropagation(); removeOption(opt.value); }}
              aria-label={`Remove ${opt.label}`}
              tabIndex={-1}
            >
              ✕
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${comboboxId}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${comboboxId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-label={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); setActiveIndex(-1); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
      
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={`${comboboxId}-listbox`}
          role="listbox"
          aria-multiselectable="true"
          className="combobox-listbox"
        >
          {filtered.map((option, index) => (
            <li
              key={option.value}
              id={`${comboboxId}-option-${index}`}
              role="option"
              aria-selected={false}
              className={`combobox-option ${index === activeIndex ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); selectOption(option.value); }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.label}
              {option.description && <span className="option-desc">{option.description}</span>}
            </li>
          ))}
        </ul>
      )}
      
      {isOpen && filtered.length === 0 && (
        <div className="no-results" role="status">No matching options</div>
      )}
    </div>
  );
}
```

**Shadow DOM Discussion Points:**
```
Shadow DOM:
1. Encapsulation: styles inside shadow DOM don't leak out, external styles don't leak in
2. CSS: ::part() for styling exposed parts, :host for styling the host element
3. Events: events retarget — event.target changes to host element when crossing shadow boundary
4. Slotting: <slot> for content projection (like React children but declarative)
5. Modes:
   - open: shadowRoot accessible via element.shadowRoot
   - closed: shadowRoot returns null (true encapsulation)
6. Composed events: some events (click) cross boundary, custom events need {composed: true}
7. CSS Custom Properties (--vars) DO pierce shadow DOM — the styling escape hatch

Salesforce LWC Context:
- Lightning Web Components use Shadow DOM (open mode in dev, Lightning Locker in prod)
- Lightning Locker Service: security layer that wraps Shadow DOM
  - Prevents cross-namespace DOM access
  - Restricts eval(), innerHTML with scripts, window/document access
  - Each component gets its own secure wrapper
- LWC vs Aura: LWC is standards-based (web components), Aura is proprietary
```

---

## 🎯 Key Takeaways
- Salesforce FE = **LWC + Shadow DOM + accessibility** are core
- **Multi-Select Combobox**: ARIA combobox pattern with multiselectable, chips, type-ahead
- **Backspace on empty input**: removes last chip — standard UX pattern
- **aria-activedescendant**: no actual focus movement, just visual highlight
- **Shadow DOM**: CSS encapsulation, event retargeting, CSS custom properties pierce boundary
- **Lightning Locker Service**: security sandbox preventing cross-namespace DOM access — MUST KNOW for Salesforce
- Rejection: couldn't explain **how Locker Service prevents XSS across component namespaces**
- Know **Salesforce app builder** architecture: Lightning Pages, App Exchange, ISV components

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Technical | Hard | Combobox, ARIA, Shadow DOM |
| LWC Deep Dive | Very Hard | Lightning Locker, Web Components |
| System Design | Hard | Multi-Tenant UI, App Builder |
| HM | Medium | Behavioral, Ohana Culture |
