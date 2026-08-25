# Oracle — Senior Frontend Engineer Interview Experience (2025) — #1

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | IC3 Frontend Engineer |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Online Assessment + 2 Technical + HM)
- **Timeline:** 2 weeks

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Implement a fully accessible Data Grid component** (sortable columns, resizable, keyboard nav)
2. **Flatten a deeply nested JSON to dot-notation keys and back**

### 💡 Flatten / Unflatten Object

```javascript
// Flatten: { a: { b: { c: 1 } } } → { 'a.b.c': 1 }
function flatten(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      flatten(value, newKey, result);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          flatten(item, `${newKey}[${index}]`, result);
        } else {
          result[`${newKey}[${index}]`] = item;
        }
      });
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

// Unflatten: { 'a.b.c': 1 } → { a: { b: { c: 1 } } }
function unflatten(obj) {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(/\.|\[|\]/).filter(Boolean);
    let current = result;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isArrayIndex = /^\d+$/.test(parts[i + 1]);
      const isLast = i === parts.length - 1;
      
      if (isLast) {
        current[part] = value;
      } else {
        if (!current[part]) {
          current[part] = isArrayIndex ? [] : {};
        }
        current = current[part];
      }
    }
  }
  
  return result;
}

// Tests
console.log(flatten({ a: { b: 1 }, c: [2, 3], d: { e: { f: 4 } } }));
// { 'a.b': 1, 'c[0]': 2, 'c[1]': 3, 'd.e.f': 4 }
```

---

## Round 2: Frontend Deep Dive
**Duration:** 60 minutes

### Questions Asked
1. **Build an Accessible Data Grid with Keyboard Navigation**
   - Arrow keys to navigate cells, Enter to edit, Escape to cancel
   - Column sorting (asc/desc/none cycle), column resize by drag
   - Screen reader support with ARIA grid role

### 💡 Accessible Data Grid

```jsx
function DataGrid({ columns, data, onSort }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [editingCell, setEditingCell] = useState(null); // { row, col }
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  const gridRef = useRef(null);
  
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);
  
  const handleSort = (columnKey) => {
    setSortConfig(prev => {
      if (prev.key !== columnKey) return { key: columnKey, direction: 'asc' };
      if (prev.direction === 'asc') return { key: columnKey, direction: 'desc' };
      return { key: null, direction: null }; // Cycle: asc → desc → none
    });
  };
  
  // Keyboard navigation (ARIA grid pattern)
  const handleKeyDown = (e) => {
    const { row, col } = focusedCell;
    const maxRow = sortedData.length - 1;
    const maxCol = columns.length - 1;
    
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocusedCell({ row, col: Math.min(col + 1, maxCol) });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedCell({ row, col: Math.max(col - 1, 0) });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedCell({ row: Math.min(row + 1, maxRow), col });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedCell({ row: Math.max(row - 1, 0), col });
        break;
      case 'Enter':
        if (editingCell) {
          commitEdit();
        } else if (row === 0) {
          handleSort(columns[col].key); // Sort if on header
        } else {
          setEditingCell({ row, col }); // Start editing
        }
        break;
      case 'Escape':
        if (editingCell) {
          setEditingCell(null); // Cancel edit
        }
        break;
      case 'Home':
        e.preventDefault();
        e.ctrlKey ? setFocusedCell({ row: 0, col: 0 }) : setFocusedCell({ row, col: 0 });
        break;
      case 'End':
        e.preventDefault();
        e.ctrlKey ? setFocusedCell({ row: maxRow, col: maxCol }) : setFocusedCell({ row, col: maxCol });
        break;
    }
  };
  
  useEffect(() => {
    const cell = gridRef.current?.querySelector(`[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`);
    cell?.focus();
  }, [focusedCell]);
  
  const getSortAriaLabel = (column) => {
    if (sortConfig.key !== column.key) return `${column.label}, sortable`;
    return `${column.label}, sorted ${sortConfig.direction === 'asc' ? 'ascending' : 'descending'}`;
  };
  
  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Data grid"
      aria-rowcount={sortedData.length + 1}
      aria-colcount={columns.length}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div role="row" aria-rowindex={1}>
        {columns.map((col, colIdx) => (
          <div
            key={col.key}
            role="columnheader"
            aria-sort={sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            aria-label={getSortAriaLabel(col)}
            aria-colindex={colIdx + 1}
            data-row={0}
            data-col={colIdx}
            tabIndex={focusedCell.row === 0 && focusedCell.col === colIdx ? 0 : -1}
            onClick={() => handleSort(col.key)}
          >
            {col.label}
            {sortConfig.key === col.key && (
              <span aria-hidden="true">{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>
            )}
          </div>
        ))}
      </div>
      
      {/* Body */}
      {sortedData.map((row, rowIdx) => (
        <div key={rowIdx} role="row" aria-rowindex={rowIdx + 2}>
          {columns.map((col, colIdx) => {
            const isEditing = editingCell?.row === rowIdx + 1 && editingCell?.col === colIdx;
            const isFocused = focusedCell.row === rowIdx + 1 && focusedCell.col === colIdx;
            
            return (
              <div
                key={col.key}
                role="gridcell"
                aria-colindex={colIdx + 1}
                data-row={rowIdx + 1}
                data-col={colIdx}
                tabIndex={isFocused ? 0 : -1}
              >
                {isEditing ? (
                  <input
                    defaultValue={row[col.key]}
                    onBlur={(e) => { commitEdit(rowIdx, colIdx, e.target.value); }}
                    autoFocus
                    aria-label={`Edit ${col.label}`}
                  />
                ) : (
                  row[col.key]
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

**ARIA Grid Pattern Key Points:**
- `role="grid"` on container, `role="row"` on rows, `role="gridcell"` on cells
- **Roving tabindex**: only focused cell has `tabIndex={0}`, all others `-1`
- `aria-sort` on column headers: `ascending`, `descending`, or `none`
- Arrow keys navigate; Enter edits; Escape cancels — matches ARIA grid spec
- Ctrl+Home/End: jump to first/last cell

---

## 🎯 Key Takeaways
- Oracle FE = **accessibility-first** — ARIA grid pattern is essential
- **Roving tabindex** pattern: one focusable cell at a time, move focus with arrows
- **Sort cycle**: none → asc → desc → none (with aria-sort attribute)
- **Flatten/Unflatten**: handle arrays with bracket notation `a[0].b`
- Oracle values **enterprise UI patterns** — data grids, forms, dashboards
- Know **WCAG 2.1 AA** requirements: keyboard nav, screen reader, focus management
- Oracle JET / OJET (Oracle's component framework) — good to mention familiarity

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Object Manipulation, Recursion |
| Frontend Deep Dive | Hard | ARIA Grid, Keyboard Nav, a11y |
| System Design | Medium | Data-heavy UI, Virtual Scrolling |
| HM | Medium | Behavioral, Career Growth |
