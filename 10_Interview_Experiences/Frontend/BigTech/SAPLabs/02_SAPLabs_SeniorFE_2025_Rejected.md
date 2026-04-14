# SAP Labs — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | SAP Fiori |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + Director)
- **Rejection Reason:** Technical round — couldn't explain Web Components Shadow DOM encapsulation properly

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an Enterprise Data Table** (like SAP Fiori table)
   - Column sorting (asc/desc/none — 3-state toggle)
   - Column filtering (text, number range, date range, select)
   - Pagination with page size selector (10/25/50/100)
   - Row selection (single/multi with shift-click range)
   - Export selected rows to CSV

### 💡 Interview-Ready Answer

```jsx
function DataTable({ columns, data, selectionMode = 'multi' }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const lastSelectedRef = useRef(null);
  
  // 1. Filter
  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, filter]) => {
        if (!filter || filter.value === '' || filter.value === undefined) return true;
        const cellValue = row[key];
        
        switch (filter.type) {
          case 'text':
            return String(cellValue).toLowerCase().includes(filter.value.toLowerCase());
          case 'number':
            return cellValue >= (filter.min ?? -Infinity) && cellValue <= (filter.max ?? Infinity);
          case 'date':
            const d = new Date(cellValue);
            return (!filter.from || d >= new Date(filter.from)) && (!filter.to || d <= new Date(filter.to));
          case 'select':
            return filter.value.includes(cellValue);
          default:
            return true;
        }
      });
    });
  }, [data, filters]);
  
  // 2. Sort — 3-state toggle: asc → desc → none
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number') return (aVal - bVal) * multiplier;
      if (aVal instanceof Date) return (aVal.getTime() - bVal.getTime()) * multiplier;
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });
  }, [filteredData, sortConfig]);
  
  // 3. Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);
  
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null }; // Reset
    });
  };
  
  // Shift-click range selection
  const handleRowSelect = (rowId, e) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      
      if (selectionMode === 'single') {
        return new Set([rowId]);
      }
      
      if (e.shiftKey && lastSelectedRef.current !== null) {
        // Range select
        const allIds = paginatedData.map(r => r.id);
        const start = allIds.indexOf(lastSelectedRef.current);
        const end = allIds.indexOf(rowId);
        const [lo, hi] = [Math.min(start, end), Math.max(start, end)];
        for (let i = lo; i <= hi; i++) {
          next.add(allIds[i]);
        }
      } else {
        // Toggle single
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
      }
      
      lastSelectedRef.current = rowId;
      return next;
    });
  };
  
  // Select all on current page
  const handleSelectAll = () => {
    const pageIds = paginatedData.map(r => r.id);
    const allSelected = pageIds.every(id => selectedRows.has(id));
    
    setSelectedRows(prev => {
      const next = new Set(prev);
      pageIds.forEach(id => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };
  
  // CSV Export
  const exportCSV = () => {
    const selectedData = data.filter(r => selectedRows.has(r.id));
    const headers = columns.map(c => c.label).join(',');
    const rows = selectedData.map(row =>
      columns.map(col => {
        const val = String(row[col.key] ?? '');
        // Escape CSV special chars
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="data-table-container">
      {/* Toolbar */}
      <div className="toolbar" role="toolbar">
        <span>{selectedRows.size} of {filteredData.length} selected</span>
        <button onClick={exportCSV} disabled={selectedRows.size === 0}>
          Export CSV ({selectedRows.size})
        </button>
      </div>
      
      <table role="grid" aria-label="Data table">
        <thead>
          <tr>
            {selectionMode === 'multi' && (
              <th>
                <input type="checkbox"
                  checked={paginatedData.length > 0 && paginatedData.every(r => selectedRows.has(r.id))}
                  onChange={handleSelectAll}
                  aria-label="Select all rows on this page" />
              </th>
            )}
            {columns.map(col => (
              <th key={col.key}>
                <button className="sort-btn" onClick={() => handleSort(col.key)}
                  aria-sort={sortConfig.key === col.key
                    ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending')
                    : 'none'}>
                  {col.label}
                  {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </button>
                
                {/* Column filter */}
                {col.filterable && (
                  <ColumnFilter
                    type={col.filterType || 'text'}
                    value={filters[col.key]}
                    onChange={val => setFilters(prev => ({...prev, [col.key]: val}))}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(row => (
            <tr key={row.id}
              className={selectedRows.has(row.id) ? 'selected' : ''}
              onClick={(e) => handleRowSelect(row.id, e)}
              aria-selected={selectedRows.has(row.id)}>
              {selectionMode === 'multi' && (
                <td>
                  <input type="checkbox" checked={selectedRows.has(row.id)} readOnly
                    aria-label={`Select row ${row.id}`} />
                </td>
              )}
              {columns.map(col => (
                <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="pagination" role="navigation" aria-label="Table pagination">
        <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          aria-label="Rows per page">
          {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size} / page</option>)}
        </select>
        
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- SAP Fiori = **enterprise data tables + accessibility + design system** — tables are core
- **3-state sort toggle**: asc → desc → none — matches enterprise table UX expectations
- **Shift-click range selection**: track `lastSelectedRef` + compute range between clicks
- **CSV export**: properly escape commas/quotes, use Blob + createObjectURL + revoke
- **Pipeline: filter → sort → paginate** — order matters for performance and correctness
- **aria-sort**: ascending/descending/none on th elements — screen reader essential
- **useMemo for each pipeline stage**: avoid recalculating sort when only page changes
- SAP Fiori uses **UI5 Web Components** — know Shadow DOM, slot API, custom events

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | String, Array manipulation |
| Machine Coding | Hard | Data Table, Sort, Filter, CSV |
| Technical | Medium-Hard | Web Components, Shadow DOM |
| Director | Medium | Behavioral, SAP Fiori Knowledge |
