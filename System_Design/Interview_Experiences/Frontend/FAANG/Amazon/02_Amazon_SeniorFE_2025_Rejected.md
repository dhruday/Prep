# Amazon — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Front-End Engineer |
| **Level** | L6 (SDE-3) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Seattle, WA |
| **Source** | [Blind](https://www.teamblind.com/post/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Frontend Deep Dive + Bar Raiser)
- **Timeline:** 1 day (loop)
- **Rejection Reason:** Bar Raiser round — LP answers lacked quantifiable business impact at L6 level

---

## Round 1: Frontend Deep Dive + LP
**Duration:** 60 minutes

### Questions Asked
1. **LP (15 min):** "Tell me about a time you championed a technical standard across your org" (Insist on the Highest Standards)
2. **Build an accessible Data Table with sorting, pagination, and column resizing**

### 💡 Interview-Ready Answer — Accessible Data Table

```javascript
class DataTable {
  constructor(container, { columns, data, pageSize = 10 }) {
    this.container = container;
    this.columns = columns;
    this.allData = data;
    this.pageSize = pageSize;
    this.currentPage = 0;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.resizing = null;
    
    this.render();
  }
  
  get sortedData() {
    if (!this.sortColumn) return this.allData;
    
    const col = this.sortColumn;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    
    return [...this.allData].sort((a, b) => {
      const va = a[col], vb = b[col];
      if (va === vb) return 0;
      if (typeof va === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }
  
  get pageData() {
    const start = this.currentPage * this.pageSize;
    return this.sortedData.slice(start, start + this.pageSize);
  }
  
  get totalPages() {
    return Math.ceil(this.allData.length / this.pageSize);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="data-table-wrapper">
        <table role="grid" aria-label="Data Table" aria-rowcount="${this.allData.length}">
          <thead>
            <tr role="row">
              ${this.columns.map((col, i) => `
                <th role="columnheader" 
                    scope="col"
                    aria-sort="${this.getAriaSort(col.key)}"
                    style="width: ${col.width || 'auto'}; position: relative;"
                    data-key="${col.key}"
                    tabindex="0">
                  <div class="th-content">
                    <span class="th-label">${col.label}</span>
                    <span class="sort-indicator" aria-hidden="true">
                      ${this.getSortIcon(col.key)}
                    </span>
                  </div>
                  <div class="resize-handle" data-col-index="${i}" 
                       aria-hidden="true"></div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${this.pageData.map((row, rowIdx) => `
              <tr role="row" aria-rowindex="${this.currentPage * this.pageSize + rowIdx + 1}">
                ${this.columns.map(col => `
                  <td role="gridcell">${this.formatCell(row[col.key], col)}</td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <nav class="pagination" role="navigation" aria-label="Table pagination">
          <button id="prev-page" ${this.currentPage === 0 ? 'disabled' : ''}
                  aria-label="Previous page">
            ← Prev
          </button>
          <span class="page-info" aria-live="polite">
            Page ${this.currentPage + 1} of ${this.totalPages} 
            (${this.allData.length} rows)
          </span>
          <button id="next-page" ${this.currentPage >= this.totalPages - 1 ? 'disabled' : ''}
                  aria-label="Next page">
            Next →
          </button>
        </nav>
        
        <div id="table-status" role="status" aria-live="polite" class="sr-only"></div>
      </div>
    `;
    
    this.attachEvents();
  }
  
  getAriaSort(key) {
    if (this.sortColumn !== key) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }
  
  getSortIcon(key) {
    if (this.sortColumn !== key) return '⇕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }
  
  formatCell(value, col) {
    if (col.type === 'currency') return `$${Number(value).toLocaleString()}`;
    if (col.type === 'date') return new Date(value).toLocaleDateString();
    return value;
  }
  
  attachEvents() {
    // Sorting via click on header
    this.container.querySelectorAll('th[data-key]').forEach(th => {
      th.addEventListener('click', (e) => {
        if (e.target.classList.contains('resize-handle')) return;
        this.sort(th.dataset.key);
      });
      
      // Keyboard: Enter/Space to sort
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.sort(th.dataset.key);
        }
      });
    });
    
    // Column resizing via drag
    this.container.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const colIdx = parseInt(handle.dataset.colIndex);
        const th = this.container.querySelectorAll('th')[colIdx];
        const startX = e.clientX;
        const startWidth = th.offsetWidth;
        
        const onMouseMove = (e) => {
          const newWidth = Math.max(50, startWidth + (e.clientX - startX));
          th.style.width = `${newWidth}px`;
          this.columns[colIdx].width = `${newWidth}px`;
        };
        
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
    
    // Pagination
    this.container.querySelector('#prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.render();
      }
    });
    
    this.container.querySelector('#next-page')?.addEventListener('click', () => {
      if (this.currentPage < this.totalPages - 1) {
        this.currentPage++;
        this.render();
      }
    });
  }
  
  sort(key) {
    if (this.sortColumn === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = key;
      this.sortDirection = 'asc';
    }
    this.currentPage = 0;
    this.render();
    
    const status = this.container.querySelector('#table-status');
    status.textContent = `Table sorted by ${key} ${this.sortDirection}ending`;
  }
}

// CSS for resize handle
// .resize-handle { position: absolute; right: 0; top: 0; bottom: 0; 
//                  width: 5px; cursor: col-resize; }
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **LP (10 min):** "Tell me about a time you made a decision with incomplete data" (Bias for Action)
2. **Design Amazon's Product Search Frontend**
   - Autocomplete, search results, filters, faceted navigation, performance

### 💡 Interview-Ready Answer

```
Amazon Search Frontend Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Autocomplete Flow:                                           │
│  1. User types → debounce 150ms                              │
│  2. AbortController: cancel previous request                 │
│  3. GET /api/search/suggest?q=iph&cat=electronics            │
│  4. Server returns: prefix matches + category suggestions    │
│     + trending searches + past searches (personalized)       │
│  5. Render dropdown: categorized sections                    │
│  6. Keyboard: ArrowUp/Down to navigate, Enter to select      │
│  7. Cache recent queries in memoryCache (Map, max 100)       │
│                                                                │
│  Search Results Strategy:                                     │
│  - SSR for initial results (SEO + FCP)                       │
│  - Subsequent filter/sort changes: CSR (SPA navigation)      │
│  - URL encodes all state:                                    │
│    /s?k=laptop&cat=computers&priceMin=500&sort=price_asc     │
│  - Hydration: server renders → React hydrates → interactive  │
│                                                                │
│  Faceted Navigation (Left Panel):                             │
│  - Filters fetched with search results (server-computed)     │
│  - Each filter shows available count: "Laptops (2,456)"      │
│  - Selecting filter → URL update → new search request        │
│  - Multiple filters: ANDs within category, ORs across        │
│    e.g., (Dell OR HP) AND (RAM: 16GB) AND (Price: $500-$1000)│
│  - Price: range slider (custom component, not <input range>) │
│  - Star ratings: ≥ 4 stars, ≥ 3 stars (radio buttons)       │
│                                                                │
│  Infinite Scroll vs Pagination:                               │
│  - Amazon uses PAGINATION (not infinite scroll)              │
│  - Why: better for comparison shopping (return to page 3)    │
│  - URL has page number → shareable + back-button works       │
│  - Prefetch next page on idle (requestIdleCallback)          │
│                                                                │
│  Performance:                                                 │
│  - Product images: lazy load with LQIP placeholder           │
│  - Above-fold: 4 products + filters server-rendered          │
│  - Below-fold: client-rendered on scroll                     │
│  - JS bundle: split by route (search / product / checkout)   │
│  - Core Web Vitals targets:                                  │
│    LCP < 2s, INP < 200ms, CLS < 0.05                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 3: Coding + LP
**Duration:** 60 minutes

### Questions Asked
1. **LP (15 min):** "Tell me about your biggest failure" (Learn and Be Curious / Earn Trust)
2. **Implement a Virtual DOM Diff Algorithm** (simplified)

### 💡 Virtual DOM Diff

```javascript
function diff(oldVNode, newVNode) {
  const patches = [];
  
  walk(oldVNode, newVNode, patches, 0);
  return patches;
}

function walk(oldNode, newNode, patches, index) {
  if (!oldNode && newNode) {
    patches.push({ type: 'INSERT', index, node: newNode });
  } else if (oldNode && !newNode) {
    patches.push({ type: 'REMOVE', index });
  } else if (changed(oldNode, newNode)) {
    patches.push({ type: 'REPLACE', index, node: newNode });
  } else if (oldNode.type) {
    // Element node → diff props + children
    const propPatches = diffProps(oldNode.props, newNode.props);
    if (propPatches.length > 0) {
      patches.push({ type: 'PROPS', index, patches: propPatches });
    }
    
    // Diff children (keyed diffing for efficiency)
    diffChildren(oldNode.children || [], newNode.children || [], patches, index);
  }
}

function changed(a, b) {
  return typeof a !== typeof b ||
    (typeof a === 'string' && a !== b) ||
    a.type !== b.type;
}

function diffProps(oldProps = {}, newProps = {}) {
  const patches = [];
  
  // Changed + new props
  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      patches.push({ key, value: newProps[key] });
    }
  }
  
  // Removed props
  for (const key in oldProps) {
    if (!(key in newProps)) {
      patches.push({ key, value: undefined });
    }
  }
  
  return patches;
}

function diffChildren(oldChildren, newChildren, patches, parentIndex) {
  const max = Math.max(oldChildren.length, newChildren.length);
  for (let i = 0; i < max; i++) {
    walk(
      oldChildren[i],
      newChildren[i],
      patches,
      parentIndex * 1000 + i + 1 // Unique index for each child
    );
  }
}

// Apply patches to real DOM
function applyPatches(rootEl, patches) {
  for (const patch of patches) {
    const el = findElement(rootEl, patch.index);
    
    switch (patch.type) {
      case 'REPLACE':
        el.replaceWith(createElement(patch.node));
        break;
      case 'REMOVE':
        el.remove();
        break;
      case 'INSERT':
        el.parentNode.appendChild(createElement(patch.node));
        break;
      case 'PROPS':
        for (const { key, value } of patch.patches) {
          if (value === undefined) el.removeAttribute(key);
          else if (key.startsWith('on')) el[key.toLowerCase()] = value;
          else el.setAttribute(key, value);
        }
        break;
    }
  }
}
```

---

## 🎯 Key Takeaways
- Amazon L6 FE = **deep technical + strong LP** — both must be exceptional
- **Accessible Data Table** → aria-sort, role="grid", keyboard navigation, resize handles
- **Faceted search** → URL-driven state, AND within/OR across categories
- **Amazon uses pagination, not infinite scroll** — know the UX reasoning
- **Virtual DOM diff** is the key differentiator for senior FE — know the algorithm deeply
- **Rejection was on LP** at L6 — answers need org-wide quantified business impact ($$, users, %)
- At L6, Amazon expects you to talk about **hiring, mentoring, cross-org influence**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| FE Deep Dive | Hard | Data Table, a11y, Resize |
| System Design | Hard | Search, Faceted Nav, SSR |
| Coding + LP | Hard | Virtual DOM Diff |
| Bar Raiser | Very Hard | LP at L6 level |
