# Oracle — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Senior Frontend Engineer |
| **Level** | IC3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Oracle Cloud Infrastructure (OCI) Console |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Multi-Level Tree Table** (like OCI resource hierarchy)
- Lazy-loaded children (fetch on expand)
- Sortable columns
- Row selection with parent/child propagation
- Keyboard accessible (ArrowUp/Down to navigate, ArrowRight to expand, ArrowLeft to collapse)
- Virtualized for large datasets (1000+ rows visible)

### 💡 Tree Table Implementation

```javascript
class TreeTable {
  constructor(container, options = {}) {
    this.container = container;
    this.columns = options.columns; // [{ key, label, width, sortable }]
    this.fetchChildren = options.fetchChildren; // async (nodeId) => children[]
    this.rootData = options.data || [];
    
    // Internal state
    this.flatRows = [];       // Flattened visible rows for rendering
    this.expanded = new Set(); // Set of expanded node IDs
    this.selected = new Set(); // Set of selected node IDs
    this.sortKey = null;
    this.sortDir = 'asc';
    this.focusedIndex = 0;
    
    // Node map for O(1) lookup
    this.nodeMap = new Map(); // id → { data, children, depth, parent, loaded }
    
    this.initNodes(this.rootData, 0, null);
    this.flatten();
    this.render();
  }
  
  initNodes(items, depth, parentId) {
    for (const item of items) {
      this.nodeMap.set(item.id, {
        data: item,
        children: item.children ? item.children.map(c => c.id) : [],
        depth,
        parent: parentId,
        loaded: !!item.children, // true if children already provided
        hasChildren: item.hasChildren !== false
      });
      
      if (item.children) {
        this.initNodes(item.children, depth + 1, item.id);
      }
    }
  }
  
  flatten() {
    this.flatRows = [];
    const rootIds = this.rootData.map(r => r.id);
    
    const walk = (ids) => {
      for (const id of ids) {
        const node = this.nodeMap.get(id);
        if (!node) continue;
        
        this.flatRows.push(node);
        
        if (this.expanded.has(id) && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    
    walk(rootIds);
  }
  
  render() {
    this.container.innerHTML = '';
    
    // Header
    const headerRow = document.createElement('div');
    headerRow.className = 'tree-header';
    headerRow.setAttribute('role', 'row');
    
    // Checkbox header
    headerRow.innerHTML = `
      <div class="tree-cell checkbox-cell" role="columnheader">
        <input type="checkbox" class="select-all" aria-label="Select all">
      </div>
      ${this.columns.map(col => `
        <div class="tree-cell" role="columnheader" style="width:${col.width || 'auto'}"
             ${col.sortable ? 'tabindex="0"' : ''} data-key="${col.key}"
             aria-sort="${this.sortKey === col.key ? this.sortDir + 'ending' : 'none'}">
          ${col.label}
          ${col.sortable ? `<span class="sort-icon">${this.sortKey === col.key ? (this.sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>` : ''}
        </div>
      `).join('')}
    `;
    
    // Table body with role="treegrid"
    const body = document.createElement('div');
    body.className = 'tree-body';
    body.setAttribute('role', 'treegrid');
    body.setAttribute('aria-label', 'Resource hierarchy');
    
    // Render visible rows
    for (let i = 0; i < this.flatRows.length; i++) {
      const node = this.flatRows[i];
      const row = this.createRow(node, i);
      body.appendChild(row);
    }
    
    this.container.appendChild(headerRow);
    this.container.appendChild(body);
    
    this.attachListeners();
  }
  
  createRow(node, index) {
    const row = document.createElement('div');
    row.className = `tree-row ${this.selected.has(node.data.id) ? 'selected' : ''} ${index === this.focusedIndex ? 'focused' : ''}`;
    row.setAttribute('role', 'row');
    row.setAttribute('aria-level', node.depth + 1);
    row.setAttribute('aria-expanded', this.expanded.has(node.data.id) ? 'true' : node.hasChildren ? 'false' : undefined);
    row.setAttribute('aria-selected', this.selected.has(node.data.id));
    row.setAttribute('tabindex', index === this.focusedIndex ? '0' : '-1');
    row.dataset.id = node.data.id;
    row.dataset.index = index;
    
    const indent = node.depth * 24;
    const expandIcon = node.hasChildren
      ? (this.expanded.has(node.data.id) ? '▼' : '▶')
      : '&nbsp;&nbsp;';
    
    row.innerHTML = `
      <div class="tree-cell checkbox-cell">
        <input type="checkbox" ${this.selected.has(node.data.id) ? 'checked' : ''} 
               aria-label="Select ${this._sanitize(node.data[this.columns[0].key])}">
      </div>
      <div class="tree-cell" style="padding-left:${indent}px">
        <span class="expand-icon" data-id="${node.data.id}" 
              ${node.hasChildren ? 'role="button" tabindex="-1"' : ''}
              aria-label="${this.expanded.has(node.data.id) ? 'Collapse' : 'Expand'}">
          ${expandIcon}
        </span>
        ${this._sanitize(String(node.data[this.columns[0].key]))}
      </div>
      ${this.columns.slice(1).map(col => `
        <div class="tree-cell" style="width:${col.width || 'auto'}">
          ${this._sanitize(String(node.data[col.key] || ''))}
        </div>
      `).join('')}
    `;
    
    return row;
  }
  
  attachListeners() {
    // Expand/collapse
    this.container.addEventListener('click', async (e) => {
      const expandIcon = e.target.closest('.expand-icon');
      if (expandIcon) {
        const id = expandIcon.dataset.id;
        await this.toggleExpand(id);
        return;
      }
      
      // Row selection
      const checkbox = e.target.closest('input[type="checkbox"]');
      if (checkbox) {
        const row = checkbox.closest('.tree-row');
        if (row) {
          this.toggleSelect(row.dataset.id, checkbox.checked);
        } else if (checkbox.classList.contains('select-all')) {
          this.selectAll(checkbox.checked);
        }
        return;
      }
      
      // Sort
      const header = e.target.closest('[data-key]');
      if (header && header.closest('.tree-header')) {
        this.sort(header.dataset.key);
      }
    });
    
    // Keyboard navigation
    this.container.addEventListener('keydown', async (e) => {
      const row = e.target.closest('.tree-row');
      if (!row) return;
      
      const index = parseInt(row.dataset.index);
      const node = this.flatRows[index];
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.focusRow(Math.min(index + 1, this.flatRows.length - 1));
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          this.focusRow(Math.max(index - 1, 0));
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          if (node.hasChildren && !this.expanded.has(node.data.id)) {
            await this.toggleExpand(node.data.id);
          } else if (this.expanded.has(node.data.id)) {
            // Move to first child
            this.focusRow(index + 1);
          }
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          if (this.expanded.has(node.data.id)) {
            await this.toggleExpand(node.data.id);
          } else if (node.parent) {
            // Move to parent
            const parentIdx = this.flatRows.findIndex(r => r.data.id === node.parent);
            if (parentIdx >= 0) this.focusRow(parentIdx);
          }
          break;
          
        case ' ':
        case 'Enter':
          e.preventDefault();
          this.toggleSelect(node.data.id, !this.selected.has(node.data.id));
          break;
      }
    });
  }
  
  async toggleExpand(id) {
    const node = this.nodeMap.get(id);
    if (!node || !node.hasChildren) return;
    
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      // Lazy load children if not yet loaded
      if (!node.loaded) {
        try {
          const children = await this.fetchChildren(id);
          node.children = children.map(c => c.id);
          node.loaded = true;
          this.initNodes(children, node.depth + 1, id);
        } catch (err) {
          console.error('Failed to load children:', err);
          return;
        }
      }
      this.expanded.add(id);
    }
    
    this.flatten();
    this.render();
  }
  
  toggleSelect(id, checked) {
    if (checked) {
      this.selected.add(id);
    } else {
      this.selected.delete(id);
    }
    
    // Propagate to children
    const propagate = (nodeId, value) => {
      const node = this.nodeMap.get(nodeId);
      if (!node) return;
      
      if (value) this.selected.add(nodeId);
      else this.selected.delete(nodeId);
      
      for (const childId of node.children) {
        propagate(childId, value);
      }
    };
    propagate(id, checked);
    
    // Update parent: if all siblings selected, select parent
    const node = this.nodeMap.get(id);
    if (node && node.parent) {
      this.updateParentSelection(node.parent);
    }
    
    this.render();
  }
  
  updateParentSelection(parentId) {
    const parent = this.nodeMap.get(parentId);
    if (!parent) return;
    
    const allChildrenSelected = parent.children.every(cid => this.selected.has(cid));
    
    if (allChildrenSelected) {
      this.selected.add(parentId);
    } else {
      this.selected.delete(parentId);
    }
    
    if (parent.parent) {
      this.updateParentSelection(parent.parent);
    }
  }
  
  sort(key) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    
    // Sort siblings at each level
    const sortChildren = (ids) => {
      ids.sort((a, b) => {
        const nodeA = this.nodeMap.get(a);
        const nodeB = this.nodeMap.get(b);
        const valA = nodeA.data[key] ?? '';
        const valB = nodeB.data[key] ?? '';
        
        const cmp = typeof valA === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB));
        
        return this.sortDir === 'asc' ? cmp : -cmp;
      });
      
      for (const id of ids) {
        const node = this.nodeMap.get(id);
        if (node.children.length > 0) sortChildren(node.children);
      }
    };
    
    const rootIds = this.rootData.map(r => r.id);
    sortChildren(rootIds);
    
    this.flatten();
    this.render();
  }
  
  focusRow(index) {
    this.focusedIndex = index;
    this.render();
    const focusedRow = this.container.querySelector('.tree-row.focused');
    if (focusedRow) {
      focusedRow.focus();
      focusedRow.scrollIntoView({ block: 'nearest' });
    }
  }
  
  selectAll(checked) {
    if (checked) {
      for (const [id] of this.nodeMap) this.selected.add(id);
    } else {
      this.selected.clear();
    }
    this.render();
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Oracle FE = **Tree Table + Lazy Loading + Keyboard Nav + Selection Propagation**
- **Flatten on change**: maintain `flatRows[]` array from tree — simpler rendering, supports virtualization
- **Lazy children**: fetch on first expand, cache in `nodeMap`, set `loaded=true`
- **Selection propagation**: selecting parent → selects all children; all children selected → auto-selects parent
- **Keyboard**: `role="treegrid"`, arrow keys, `aria-level`, `aria-expanded` — standard WAI-ARIA TreeGrid pattern
- **Sorting**: sort siblings at each depth, recurse into children — preserves hierarchy while sorting within each level
- **nodeMap (id → node)**: O(1) access — critical for efficient expand/collapse/selection operations
- Oracle interviews: **enterprise components** — heavy on a11y, keyboard navigation, large datasets

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Tree Table, Lazy Load, A11y |
| Technical | Medium-Hard | JS Internals, Performance |
| HM | Medium | Culture Fit |
