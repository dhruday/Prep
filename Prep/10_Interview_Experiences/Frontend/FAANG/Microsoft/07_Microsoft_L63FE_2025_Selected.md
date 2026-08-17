# Microsoft — L63 Frontend Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Frontend Engineer |
| **Level** | L63 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Teams |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 2 Onsite Coding + System Design)

---

## Round 2: Frontend Coding — Build An Accessible Tree View with Keyboard Navigation
**Duration:** 45 minutes

### Challenge: Build a file explorer tree view supporting: expand/collapse, keyboard navigation (arrow keys, Enter, Home, End), multi-select (Ctrl+Click), lazy loading for large directories, and ARIA tree pattern.

```javascript
/**
 * Accessible Tree View (WAI-ARIA Tree Pattern):
 * 
 * Keyboard Navigation (standard tree pattern):
 * - ArrowDown: next visible node
 * - ArrowUp: previous visible node
 * - ArrowRight: expand (if collapsed), or move to first child (if expanded)
 * - ArrowLeft: collapse (if expanded), or move to parent (if collapsed)
 * - Enter/Space: toggle select
 * - Home: first node
 * - End: last visible node
 * - * (asterisk): expand all siblings
 * - Ctrl+Click: toggle in multi-select
 * 
 * ARIA: role=tree, role=treeitem, aria-expanded, aria-selected, aria-level
 */
class AccessibleTreeView {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data; // [{ id, label, children?: [], isLazy?: boolean }]
    this.selectedIds = new Set();
    this.focusedId = null;
    this.expandedIds = new Set();
    this.multiSelect = options.multiSelect ?? false;
    this.onSelect = options.onSelect || (() => {});
    this.onLoadChildren = options.onLoadChildren || null; // async (nodeId) => children[]
    this.loadingIds = new Set();
    
    this.render();
    this.attachKeyboard();
  }
  
  // Get a flat list of all currently visible nodes (in DOM order)
  getVisibleNodes(nodes = this.data, depth = 0) {
    const result = [];
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (node.children && this.expandedIds.has(node.id)) {
        result.push(...this.getVisibleNodes(node.children, depth + 1));
      }
    }
    return result;
  }
  
  findNode(id, nodes = this.data) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNode(id, node.children);
        if (found) return found;
      }
    }
    return null;
  }
  
  findParent(id, nodes = this.data, parent = null) {
    for (const node of nodes) {
      if (node.id === id) return parent;
      if (node.children) {
        const found = this.findParent(id, node.children, node);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }
  
  hasChildren(node) {
    return (node.children && node.children.length > 0) || node.isLazy;
  }
  
  async toggleExpand(id) {
    const node = this.findNode(id);
    if (!node) return;
    
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      // Lazy loading
      if (node.isLazy && (!node.children || node.children.length === 0) && this.onLoadChildren) {
        this.loadingIds.add(id);
        this.render();
        const children = await this.onLoadChildren(id);
        node.children = children;
        node.isLazy = false;
        this.loadingIds.delete(id);
      }
      this.expandedIds.add(id);
    }
    
    this.render();
  }
  
  select(id, ctrlKey = false) {
    if (this.multiSelect && ctrlKey) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
      } else {
        this.selectedIds.add(id);
      }
    } else {
      this.selectedIds.clear();
      this.selectedIds.add(id);
    }
    
    this.focusedId = id;
    this.onSelect([...this.selectedIds]);
    this.render();
  }
  
  focus(id) {
    this.focusedId = id;
    this.render();
    
    // Focus the DOM element
    const el = this.container.querySelector(`[data-id="${id}"]`);
    if (el) el.focus();
  }
  
  render() {
    const renderNode = (node, depth) => {
      const isExpanded = this.expandedIds.has(node.id);
      const isSelected = this.selectedIds.has(node.id);
      const isLoading = this.loadingIds.has(node.id);
      const hasKids = this.hasChildren(node);
      
      const indent = depth * 20;
      const icon = hasKids ? (isLoading ? '⏳' : isExpanded ? '▾' : '▸') : ' ';
      const fileIcon = hasKids ? '📁' : '📄';
      
      let html = `
        <div class="tree-item ${isSelected ? 'selected' : ''} ${this.focusedId === node.id ? 'focused' : ''}"
             role="treeitem"
             tabindex="${this.focusedId === node.id ? '0' : '-1'}"
             data-id="${node.id}"
             aria-expanded="${hasKids ? isExpanded : undefined}"
             aria-selected="${isSelected}"
             aria-level="${depth + 1}"
             aria-setsize="${this.getSiblingCount(node.id)}"
             aria-posinset="${this.getSiblingPosition(node.id)}"
             style="padding-left:${indent}px; display:flex; align-items:center; padding-top:4px; padding-bottom:4px; cursor:pointer; user-select:none; outline:none; ${isSelected ? 'background:#0060c0; color:#fff;' : ''} ${this.focusedId === node.id && !isSelected ? 'outline:2px solid #0060c0; outline-offset:-2px;' : ''}">
          <span class="expand-icon" style="width:20px; text-align:center; flex-shrink:0">${icon}</span>
          <span style="margin-right:4px">${fileIcon}</span>
          <span class="node-label">${this.escapeHtml(node.label)}</span>
        </div>
      `;
      
      // Render children if expanded
      if (hasKids && isExpanded && node.children) {
        html += `<div role="group">`;
        for (const child of node.children) {
          html += renderNode(child, depth + 1);
        }
        html += `</div>`;
      }
      
      return html;
    };
    
    this.container.innerHTML = `
      <style>
        .tree-view { font-family: -apple-system, sans-serif; font-size: 13px; }
        .tree-item:hover { background: ${this.container.querySelector('.selected:hover') ? '#0050a0' : '#e8e8e8'}; }
        .tree-item.selected:hover { background: #0050a0; }
      </style>
      <div class="tree-view" role="tree" aria-label="File explorer" aria-multiselectable="${this.multiSelect}">
        ${this.data.map(node => renderNode(node, 0)).join('')}
      </div>
    `;
    
    // Attach click handlers
    this.container.querySelectorAll('.tree-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.id;
        const node = this.findNode(id);
        
        if (e.target.classList.contains('expand-icon') && this.hasChildren(node)) {
          this.toggleExpand(id);
        } else {
          if (this.hasChildren(node)) this.toggleExpand(id);
          this.select(id, e.ctrlKey || e.metaKey);
        }
      });
    });
    
    // Restore focus
    if (this.focusedId) {
      const el = this.container.querySelector(`[data-id="${this.focusedId}"]`);
      if (el) el.focus();
    }
  }
  
  attachKeyboard() {
    this.container.addEventListener('keydown', (e) => {
      const visible = this.getVisibleNodes();
      const currentIdx = visible.findIndex(n => n.id === this.focusedId);
      if (currentIdx === -1 && visible.length > 0) {
        this.focus(visible[0].id);
        return;
      }
      
      const current = visible[currentIdx];
      const node = this.findNode(current.id);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIdx < visible.length - 1) this.focus(visible[currentIdx + 1].id);
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          if (currentIdx > 0) this.focus(visible[currentIdx - 1].id);
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          if (this.hasChildren(node)) {
            if (!this.expandedIds.has(node.id)) {
              this.toggleExpand(node.id);
            } else if (node.children?.length > 0) {
              this.focus(node.children[0].id);
            }
          }
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          if (this.hasChildren(node) && this.expandedIds.has(node.id)) {
            this.toggleExpand(node.id);
          } else {
            const parent = this.findParent(node.id);
            if (parent) this.focus(parent.id);
          }
          break;
          
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.select(node.id, e.ctrlKey || e.metaKey);
          break;
          
        case 'Home':
          e.preventDefault();
          if (visible.length > 0) this.focus(visible[0].id);
          break;
          
        case 'End':
          e.preventDefault();
          if (visible.length > 0) this.focus(visible[visible.length - 1].id);
          break;
          
        case '*':
          e.preventDefault();
          // Expand all siblings
          const parent = this.findParent(node.id);
          const siblings = parent ? parent.children : this.data;
          for (const sibling of siblings) {
            if (this.hasChildren(sibling) && !this.expandedIds.has(sibling.id)) {
              this.expandedIds.add(sibling.id);
            }
          }
          this.render();
          break;
      }
    });
  }
  
  getSiblingCount(id) {
    const parent = this.findParent(id);
    return parent ? parent.children.length : this.data.length;
  }
  
  getSiblingPosition(id) {
    const parent = this.findParent(id);
    const siblings = parent ? parent.children : this.data;
    return siblings.findIndex(n => n.id === id) + 1;
  }
  
  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- Microsoft L63 FE = **Accessible tree view with keyboard navigation — WAI-ARIA tree pattern**
- **ARIA tree pattern**: `role="tree"` on container, `role="treeitem"` on each node, `role="group"` on children container
- **aria-expanded**: only on nodes with children — undefined for leaf nodes
- **Keyboard**: ArrowRight expands/enters, ArrowLeft collapses/goes-to-parent — mirrors Windows Explorer
- **Roving tabindex**: focused item gets `tabindex="0"`, all others `tabindex="-1"` — Tab moves focus OUT of tree, arrow keys move within
- **Lazy loading**: `isLazy` flag → fetch children on first expand, show spinner
- **`*` key**: expand all siblings — standard tree keyboard shortcut often missed by candidates
- **Performance**: `getVisibleNodes()` flattens only expanded subtrees — O(visible nodes) not O(all nodes)
- Microsoft FE = **enterprise UI patterns** — tree views, data grids, keyboard navigation are core

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Coding |
| FE Coding (this) | Very Hard | Tree View, ARIA, Keyboard |
| Coding 2 | Hard | Data Structures |
| System Design | Very Hard | Teams Architecture |
