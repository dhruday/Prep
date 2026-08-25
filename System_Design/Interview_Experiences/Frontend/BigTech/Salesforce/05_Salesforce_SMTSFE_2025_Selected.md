# Salesforce — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Senior Member of Technical Staff (Frontend) |
| **Level** | SMTS / P3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/salesforce-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Recursive Tree View with CRUD Operations**
   - Render a nested tree structure (like a file explorer)
   - Expand/collapse nodes
   - Add, rename, delete nodes
   - Drag and drop to rearrange/move nodes
   - Keyboard navigation (arrow keys, enter to rename)
   - Lazy load children on expand

### 💡 Interview-Ready Answer

```javascript
class TreeView {
  constructor(container, data) {
    this.container = container;
    this.data = data; // [{id, name, children: [], isFolder}]
    this.expandedNodes = new Set();
    this.selectedNode = null;
    this.editingNode = null;
    this.draggedNode = null;
    this.onLazyLoad = null; // callback(nodeId) => Promise<children>

    this.container.setAttribute('role', 'tree');
    this.container.setAttribute('tabindex', '0');
    this.setupKeyboard();
    this.render();
  }

  // ============================
  // Find node by ID in tree
  // ============================
  findNode(nodes, id) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  findParent(nodes, targetId, parent = null) {
    for (const node of nodes) {
      if (node.id === targetId) return parent;
      if (node.children) {
        const found = this.findParent(node.children, targetId, node);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  // ============================
  // CRUD Operations
  // ============================
  addNode(parentId, nodeData) {
    const parent = this.findNode(this.data, parentId);
    if (!parent) return;
    if (!parent.children) parent.children = [];
    parent.children.push({
      id: nodeData.id || 'node-' + Date.now(),
      name: nodeData.name || 'New Item',
      isFolder: nodeData.isFolder || false,
      children: nodeData.isFolder ? [] : undefined,
    });
    this.expandedNodes.add(parentId);
    this.render();
  }

  renameNode(nodeId, newName) {
    const node = this.findNode(this.data, nodeId);
    if (node) {
      node.name = newName.trim() || node.name;
      this.editingNode = null;
      this.render();
    }
  }

  deleteNode(nodeId) {
    const parent = this.findParent(this.data, nodeId);
    if (parent) {
      parent.children = parent.children.filter(c => c.id !== nodeId);
    } else {
      this.data = this.data.filter(n => n.id !== nodeId);
    }
    if (this.selectedNode === nodeId) this.selectedNode = null;
    this.render();
  }

  moveNode(sourceId, targetId) {
    if (sourceId === targetId) return;
    const sourceNode = this.findNode(this.data, sourceId);
    if (!sourceNode) return;

    // Prevent moving a parent into its own child
    if (this.isDescendant(sourceId, targetId)) return;

    // Remove from old parent
    const oldParent = this.findParent(this.data, sourceId);
    if (oldParent) {
      oldParent.children = oldParent.children.filter(c => c.id !== sourceId);
    } else {
      this.data = this.data.filter(n => n.id !== sourceId);
    }

    // Add to new parent
    const target = this.findNode(this.data, targetId);
    if (target && target.isFolder) {
      if (!target.children) target.children = [];
      target.children.push(sourceNode);
      this.expandedNodes.add(targetId);
    }

    this.render();
  }

  isDescendant(ancestorId, nodeId) {
    const ancestor = this.findNode(this.data, ancestorId);
    if (!ancestor || !ancestor.children) return false;
    for (const child of ancestor.children) {
      if (child.id === nodeId) return true;
      if (this.isDescendant(child.id, nodeId)) return true;
    }
    return false;
  }

  // ============================
  // Toggle Expand/Collapse
  // ============================
  async toggleExpand(nodeId) {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);

      // Lazy load children if callback provided
      const node = this.findNode(this.data, nodeId);
      if (this.onLazyLoad && node.isFolder && (!node.children || node.children.length === 0)) {
        node._loading = true;
        this.render();
        try {
          node.children = await this.onLazyLoad(nodeId);
        } catch (e) {
          console.error('Failed to load children:', e);
          node.children = [];
        }
        node._loading = false;
      }
    }
    this.render();
  }

  // ============================
  // Keyboard Navigation
  // ============================
  setupKeyboard() {
    this.container.addEventListener('keydown', (e) => {
      if (this.editingNode) return; // Let input handle keys

      const allVisible = this.getVisibleNodes();
      const currentIdx = allVisible.findIndex(n => n.id === this.selectedNode);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIdx < allVisible.length - 1) {
            this.selectedNode = allVisible[currentIdx + 1].id;
            this.render();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIdx > 0) {
            this.selectedNode = allVisible[currentIdx - 1].id;
            this.render();
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (this.selectedNode) {
            const node = this.findNode(this.data, this.selectedNode);
            if (node && node.isFolder && !this.expandedNodes.has(node.id)) {
              this.toggleExpand(node.id);
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (this.selectedNode) {
            const node = this.findNode(this.data, this.selectedNode);
            if (node && node.isFolder && this.expandedNodes.has(node.id)) {
              this.expandedNodes.delete(node.id);
              this.render();
            } else {
              // Go to parent
              const parent = this.findParent(this.data, this.selectedNode);
              if (parent) {
                this.selectedNode = parent.id;
                this.render();
              }
            }
          }
          break;

        case 'Enter':
        case 'F2':
          e.preventDefault();
          if (this.selectedNode) {
            this.editingNode = this.selectedNode;
            this.render();
          }
          break;

        case 'Delete':
          e.preventDefault();
          if (this.selectedNode) this.deleteNode(this.selectedNode);
          break;
      }
    });
  }

  getVisibleNodes() {
    const visible = [];
    const traverse = (nodes) => {
      for (const node of nodes) {
        visible.push(node);
        if (node.isFolder && this.expandedNodes.has(node.id) && node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(this.data);
    return visible;
  }

  // ============================
  // Render
  // ============================
  render() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      font-family: -apple-system, monospace; font-size: 14px;
      padding: 8px; background: #1E1E1E; color: #D4D4D4;
      border-radius: 8px; min-height: 300px; outline: none;
      user-select: none;
    `;

    this.renderNodes(this.data, this.container, 0);
  }

  renderNodes(nodes, parent, depth) {
    nodes.forEach(node => {
      const row = document.createElement('div');
      const isExpanded = this.expandedNodes.has(node.id);
      const isSelected = this.selectedNode === node.id;
      const isEditing = this.editingNode === node.id;

      row.setAttribute('role', 'treeitem');
      row.setAttribute('aria-expanded', node.isFolder ? isExpanded : undefined);
      row.setAttribute('aria-selected', isSelected);

      row.style.cssText = `
        display: flex; align-items: center; gap: 4px;
        padding: 3px 4px 3px ${depth * 20 + 4}px;
        cursor: pointer; border-radius: 4px;
        background: ${isSelected ? '#094771' : 'transparent'};
      `;

      row.addEventListener('mouseenter', () => {
        if (!isSelected) row.style.background = '#2A2D2E';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = isSelected ? '#094771' : 'transparent';
      });

      // Expand arrow (for folders)
      if (node.isFolder) {
        const arrow = document.createElement('span');
        arrow.textContent = isExpanded ? '▾' : '▸';
        arrow.style.cssText = 'width: 16px; text-align: center; font-size: 12px;';
        arrow.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleExpand(node.id);
        });
        row.appendChild(arrow);
      } else {
        const spacer = document.createElement('span');
        spacer.style.width = '16px';
        row.appendChild(spacer);
      }

      // Icon
      const icon = document.createElement('span');
      icon.textContent = node.isFolder ? (isExpanded ? '📂' : '📁') : '📄';
      icon.style.cssText = 'font-size: 14px;';
      row.appendChild(icon);

      // Name (or edit input)
      if (isEditing) {
        const input = document.createElement('input');
        input.value = node.name;
        input.style.cssText = `
          background: #3C3C3C; color: #D4D4D4; border: 1px solid #007ACC;
          padding: 2px 4px; font-size: 13px; font-family: inherit;
          border-radius: 2px; outline: none; flex: 1;
        `;
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.renameNode(node.id, input.value);
          if (e.key === 'Escape') { this.editingNode = null; this.render(); }
          e.stopPropagation();
        });
        input.addEventListener('blur', () => this.renameNode(node.id, input.value));
        row.appendChild(input);
        requestAnimationFrame(() => { input.focus(); input.select(); });
      } else {
        const nameEl = document.createElement('span');
        nameEl.textContent = node._loading ? `${node.name} (loading...)` : node.name;
        nameEl.style.cssText = 'flex: 1; padding: 0 4px;';
        row.appendChild(nameEl);
      }

      // Click to select
      row.addEventListener('click', () => {
        this.selectedNode = node.id;
        this.render();
      });

      // Double-click to rename
      row.addEventListener('dblclick', () => {
        this.editingNode = node.id;
        this.render();
      });

      // Drag and drop
      row.draggable = true;
      row.addEventListener('dragstart', (e) => {
        this.draggedNode = node.id;
        e.dataTransfer.effectAllowed = 'move';
        row.style.opacity = '0.5';
      });
      row.addEventListener('dragend', () => {
        this.draggedNode = null;
        row.style.opacity = '1';
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (node.isFolder) row.style.borderBottom = '2px solid #007ACC';
      });
      row.addEventListener('dragleave', () => {
        row.style.borderBottom = 'none';
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.style.borderBottom = 'none';
        if (this.draggedNode && node.isFolder) {
          this.moveNode(this.draggedNode, node.id);
        }
      });

      parent.appendChild(row);

      // Render children
      if (node.isFolder && isExpanded && node.children) {
        this.renderNodes(node.children, parent, depth + 1);
      }
    });
  }
}

// Usage — File Explorer
const data = [
  {
    id: 'src', name: 'src', isFolder: true, children: [
      { id: 'app', name: 'App.js', isFolder: false },
      { id: 'index', name: 'index.js', isFolder: false },
      {
        id: 'components', name: 'components', isFolder: true, children: [
          { id: 'header', name: 'Header.jsx', isFolder: false },
          { id: 'footer', name: 'Footer.jsx', isFolder: false },
        ]
      },
    ]
  },
  { id: 'pkg', name: 'package.json', isFolder: false },
  { id: 'readme', name: 'README.md', isFolder: false },
];

const tree = new TreeView(document.getElementById('tree'), data);
```

## Round 2: JavaScript Deep Dive
**Duration:** 60 minutes

### Topics Discussed
- Shadow DOM and Web Components internals
- CSS containment and layout thrashing prevention
- MutationObserver for DOM change detection
- LWC (Lightning Web Components) architecture at Salesforce

## Round 3: Frontend Architecture
**Duration:** 60 minutes

### Questions Asked
1. **Design a Configurable Form Builder (Drag & Drop)**
   - Drag field types onto a canvas
   - Configure field properties (label, validation, conditional visibility)
   - Generate JSON schema and render preview

## Round 4: Hiring Manager
**Duration:** 30 minutes

## 🎯 Key Takeaways
- Salesforce machine coding rounds test **component architecture** skills — tree views, form builders, data grids
- Keyboard navigation and ARIA roles are non-negotiable at Salesforce
- **Lazy loading** children on expand shows scalability awareness
- Drag and drop for tree rearrangement is a common follow-up
- Salesforce uses LWC internally — familiarity with Web Components is a plus

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Tree View, DnD, Keyboard Nav, ARIA |
| JS Deep Dive | Medium-Hard | Shadow DOM, MutationObserver, LWC |
| Architecture | Hard | Form Builder, JSON Schema, DnD |
| Hiring Manager | Easy | Behavioral |
