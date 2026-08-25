# Adobe — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | MTS-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Adobe Experience Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Implement a Custom Select Dropdown** (accessible, searchable, multi-select)
2. **CSS: Implement a responsive dashboard layout** (sidebar, header, content, footer)

### 💡 Custom Select Dropdown

```jsx
function CustomSelect({ options, value, onChange, multiple = false, searchable = true, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const id = useId();
  
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  
  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelect = (optionValue) => {
    if (multiple) {
      const newValue = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
    setQuery('');
  };
  
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Backspace':
        if (!query && multiple && selectedValues.length > 0) {
          onChange(selectedValues.slice(0, -1));
        }
        break;
    }
  };
  
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (multiple) return `${selectedValues.length} selected`;
    return options.find(o => o.value === selectedValues[0])?.label || placeholder;
  };
  
  return (
    <div ref={containerRef} className="custom-select" onKeyDown={handleKeyDown}>
      <div
        className={`select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => { setIsOpen(!isOpen); searchRef.current?.focus(); }}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-haspopup="listbox"
        tabIndex={0}
      >
        {/* Selected chips (multi) */}
        {multiple && selectedValues.length > 0 && (
          <div className="selected-chips">
            {selectedValues.map(v => {
              const opt = options.find(o => o.value === v);
              return (
                <span key={v} className="chip">
                  {opt?.label}
                  <button onClick={(e) => { e.stopPropagation(); handleSelect(v); }}
                    aria-label={`Remove ${opt?.label}`} tabIndex={-1}>✕</button>
                </span>
              );
            })}
          </div>
        )}
        
        {searchable ? (
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setIsOpen(true); setHighlightedIndex(0); }}
            placeholder={selectedValues.length === 0 ? placeholder : ''}
            className="search-input"
            aria-label="Search options"
          />
        ) : (
          <span className="display-text">{getDisplayText()}</span>
        )}
        
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▾</span>
      </div>
      
      {isOpen && (
        <ul id={`${id}-listbox`} role="listbox" aria-multiselectable={multiple}
            className="options-list">
          {filteredOptions.length === 0 ? (
            <li className="no-results" role="option" aria-disabled="true">No results found</li>
          ) : (
            filteredOptions.map((opt, index) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`option ${isSelected ? 'selected' : ''} ${index === highlightedIndex ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {multiple && (
                    <span className={`checkbox ${isSelected ? 'checked' : ''}`} aria-hidden="true" />
                  )}
                  {opt.label}
                  {opt.description && <span className="opt-desc">{opt.description}</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
```

---

## Round 2: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Adobe Experience Cloud Dashboard**
   - Widget system: charts, metrics, recent activity
   - Drag-and-drop widget rearrangement
   - Responsive grid layout (auto-resize widgets)
   - State persistence (Save layout to server)

### 💡 Key Points

```
Adobe Experience Cloud Dashboard Architecture:
- Widget Registry: Each widget is a lazy-loaded micro-frontend
  const widgets = { 'chart': lazy(() => import('./ChartWidget')),
                    'metrics': lazy(() => import('./MetricsWidget')) }

- Grid Layout: CSS Grid with named areas
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  Each widget has: span (1x1, 2x1, 1x2, 2x2)

- State Management:
  Layout = { id, widgets: [{ widgetId, type, position: {x, y, w, h}, config }] }
  Save to server on change (debounced 2s)
  Load from server on mount
  Fallback: localStorage for offline

- Performance:
  React.lazy for code splitting (each widget is separate chunk)
  IntersectionObserver: only render widgets in viewport
  Web Workers for heavy data processing (chart aggregations)
  requestIdleCallback for non-critical updates

- Drag and Drop:
  Use react-grid-layout or custom implementation
  Collision detection: prevent widgets from overlapping
  Snap to grid: round position to nearest grid cell
```

---

## 🎯 Key Takeaways
- Adobe FE = **custom components + design system + dashboard patterns**
- **Custom Select**: searchable + multi-select + keyboard accessible — common interview question
- **ARIA combobox pattern**: role="combobox", aria-expanded, aria-controls on trigger
- **Outside click handler**: mousedown listener + `contains()` check
- **Backspace to remove last chip**: standard multi-select UX
- **Dashboard widget system**: lazy-loaded micro-frontends + persistent grid layout
- Adobe values: **creativity + enterprise quality** — know Adobe Design System (Spectrum)
- Know **Adobe Experience Platform** (AEP): customer data platform, real-time profiles

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | Custom Select, Dashboard CSS |
| Frontend Technical | Hard | Component Design, Accessibility |
| System Design | Hard | Dashboard, Micro-Frontends, Grid |
| HM | Medium | Behavioral, Adobe Values |
