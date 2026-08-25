# Apple — Senior Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Senior Frontend Engineer |
| **Level** | ICT4 |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected (Final round) |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | iCloud Web |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (Phone Screen + 5 Onsite)

---

## Round 1: FE Coding — Build a File Manager with Drag-and-Drop
**Duration:** 60 minutes

### Challenge: iCloud Drive-like file manager
- Tree view of folders
- File/folder icons with names
- Drag files between folders
- Context menu (right-click): rename, delete, new folder
- Keyboard navigation: arrow keys, Enter to open, Delete to remove
- Breadcrumb navigation

```javascript
/**
 * iCloud-style File Manager:
 * - Tree view with expand/collapse
 * - Grid/List view toggle
 * - Drag & drop files between folders
 * - Context menu for operations
 * - Keyboard navigation (a11y)
 * - Breadcrumb path navigation
 */
class FileManager {
  constructor(container) {
    this.container = container;
    this.root = {
      id: 'root', name: 'iCloud Drive', type: 'folder', children: [],
      expanded: true
    };
    this.currentFolder = this.root;
    this.selectedItems = new Set(); // Selected file/folder IDs
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.clipboard = null;  // { action: 'copy'|'cut', items: [...] }
    this.nextId = 1;
    this.contextMenu = null;
    
    this.render();
    this.setupKeyboard();
  }
  
  // Navigate into a folder
  openFolder(folderId) {
    const folder = this.findNode(this.root, folderId);
    if (folder && folder.type === 'folder') {
      this.currentFolder = folder;
      this.selectedItems.clear();
      this.render();
    }
  }
  
  // Get breadcrumb path from root to current folder
  getBreadcrumbs() {
    const path = [];
    const findPath = (node, target, current = []) => {
      current.push(node);
      if (node.id === target.id) {
        path.push(...current);
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (findPath(child, target, [...current])) return true;
        }
      }
      return false;
    };
    findPath(this.root, this.currentFolder);
    return path;
  }
  
  findNode(root, id) {
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }
  
  findParent(root, targetId) {
    if (root.children) {
      for (const child of root.children) {
        if (child.id === targetId) return root;
        const found = this.findParent(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }
  
  createFolder(name = 'New Folder') {
    const folder = {
      id: `folder_${this.nextId++}`,
      name, type: 'folder', children: [], expanded: false
    };
    this.currentFolder.children.push(folder);
    this.render();
    return folder;
  }
  
  createFile(name = 'Untitled.txt') {
    const file = {
      id: `file_${this.nextId++}`,
      name, type: 'file',
      size: Math.floor(Math.random() * 10000) + 100, // bytes
      modified: new Date()
    };
    this.currentFolder.children.push(file);
    this.render();
    return file;
  }
  
  deleteItems(ids) {
    for (const id of ids) {
      const parent = this.findParent(this.root, id);
      if (parent) {
        parent.children = parent.children.filter(c => c.id !== id);
      }
    }
    this.selectedItems.clear();
    this.render();
  }
  
  moveItem(itemId, targetFolderId) {
    if (itemId === targetFolderId) return;
    
    const item = this.findNode(this.root, itemId);
    const targetFolder = this.findNode(this.root, targetFolderId);
    
    if (!item || !targetFolder || targetFolder.type !== 'folder') return;
    
    // Prevent moving folder into its own subtree
    if (item.type === 'folder' && this.isDescendant(item, targetFolderId)) return;
    
    const parent = this.findParent(this.root, itemId);
    if (parent) {
      parent.children = parent.children.filter(c => c.id !== itemId);
      targetFolder.children.push(item);
      this.render();
    }
  }
  
  isDescendant(folder, targetId) {
    if (folder.id === targetId) return true;
    if (folder.children) {
      return folder.children.some(c => this.isDescendant(c, targetId));
    }
    return false;
  }
  
  renameItem(id, newName) {
    const item = this.findNode(this.root, id);
    if (item) {
      item.name = newName;
      this.render();
    }
  }
  
  render() {
    const breadcrumbs = this.getBreadcrumbs();
    const items = this.currentFolder.children || [];
    
    // Sort: folders first, then alphabetical
    const sorted = [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    
    this.container.innerHTML = `
      <div class="file-manager">
        <!-- Toolbar -->
        <div class="fm-toolbar">
          <nav class="breadcrumbs" aria-label="File path">
            ${breadcrumbs.map((b, i) => `
              <span class="crumb" data-id="${b.id}" 
                    ${i < breadcrumbs.length - 1 ? 'tabindex="0" role="link"' : 'aria-current="page"'}>
                ${this.sanitize(b.name)}
              </span>
              ${i < breadcrumbs.length - 1 ? '<span class="sep">/</span>' : ''}
            `).join('')}
          </nav>
          <div class="fm-actions">
            <button id="btn-new-folder" title="New Folder">📁+</button>
            <button id="btn-view-toggle" title="Toggle view">${this.viewMode === 'grid' ? '≡' : '⊞'}</button>
          </div>
        </div>
        
        <!-- File Grid/List -->
        <div class="fm-content ${this.viewMode}" role="grid" aria-label="File list"
             tabindex="0">
          ${sorted.length === 0 
            ? '<div class="empty-folder">This folder is empty</div>'
            : sorted.map(item => `
              <div class="fm-item ${this.selectedItems.has(item.id) ? 'selected' : ''}"
                   data-id="${item.id}" data-type="${item.type}"
                   draggable="true" tabindex="0"
                   role="gridcell" aria-selected="${this.selectedItems.has(item.id)}">
                <span class="fm-icon">${item.type === 'folder' ? '📁' : this.getFileIcon(item.name)}</span>
                <span class="fm-name">${this.sanitize(item.name)}</span>
                ${this.viewMode === 'list' ? `
                  <span class="fm-size">${item.type === 'file' ? this.formatSize(item.size) : '--'}</span>
                  <span class="fm-date">${item.modified ? new Date(item.modified).toLocaleDateString() : '--'}</span>
                ` : ''}
              </div>
            `).join('')}
        </div>
        
        <!-- Status bar -->
        <div class="fm-status">
          ${sorted.length} items
          ${this.selectedItems.size > 0 ? ` • ${this.selectedItems.size} selected` : ''}
        </div>
      </div>
      
      <!-- Context Menu (hidden) -->
      <div class="context-menu" hidden role="menu" aria-label="File actions">
        <button class="ctx-item" data-action="open" role="menuitem">Open</button>
        <button class="ctx-item" data-action="rename" role="menuitem">Rename</button>
        <button class="ctx-item" data-action="copy" role="menuitem">Copy</button>
        <button class="ctx-item" data-action="cut" role="menuitem">Cut</button>
        <button class="ctx-item" data-action="paste" role="menuitem" 
                ${!this.clipboard ? 'disabled' : ''}>Paste</button>
        <hr>
        <button class="ctx-item" data-action="delete" role="menuitem" style="color:red">Delete</button>
      </div>
    `;
    
    this.attachListeners();
  }
  
  getFileIcon(name) {
    const ext = name.split('.').pop()?.toLowerCase();
    const icons = {
      pdf: '📕', doc: '📘', docx: '📘', txt: '📄', 
      jpg: '🖼️', png: '🖼️', gif: '🖼️',
      mp3: '🎵', mp4: '🎬', zip: '📦',
      js: '📜', ts: '📜', py: '🐍', java: '☕'
    };
    return icons[ext] || '📄';
  }
  
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  attachListeners() {
    // Double-click to open folder / file
    this.container.querySelectorAll('.fm-item').forEach(el => {
      el.addEventListener('dblclick', () => {
        if (el.dataset.type === 'folder') {
          this.openFolder(el.dataset.id);
        }
      });
      
      // Single click to select (with Cmd/Ctrl for multi-select)
      el.addEventListener('click', (e) => {
        const id = el.dataset.id;
        if (e.metaKey || e.ctrlKey) {
          if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
          } else {
            this.selectedItems.add(id);
          }
        } else {
          this.selectedItems.clear();
          this.selectedItems.add(id);
        }
        this.render();
      });
      
      // Context menu
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!this.selectedItems.has(el.dataset.id)) {
          this.selectedItems.clear();
          this.selectedItems.add(el.dataset.id);
        }
        this.showContextMenu(e.clientX, e.clientY);
        this.render();
      });
      
      // Drag start
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('item-id', el.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      
      // Drop on folder
      if (el.dataset.type === 'folder') {
        el.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          el.classList.add('drop-target');
        });
        el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          el.classList.remove('drop-target');
          const itemId = e.dataTransfer.getData('item-id');
          if (itemId) this.moveItem(itemId, el.dataset.id);
        });
      }
    });
    
    // Breadcrumb navigation
    this.container.querySelectorAll('.crumb[data-id]').forEach(crumb => {
      crumb.addEventListener('click', () => this.openFolder(crumb.dataset.id));
    });
    
    // New folder
    this.container.querySelector('#btn-new-folder')?.addEventListener('click', () => {
      this.createFolder();
    });
    
    // View toggle
    this.container.querySelector('#btn-view-toggle')?.addEventListener('click', () => {
      this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
      this.render();
    });
    
    // Context menu actions
    this.container.querySelectorAll('.ctx-item').forEach(btn => {
      btn.addEventListener('click', () => this.handleContextAction(btn.dataset.action));
    });
    
    // Close context menu on outside click
    document.addEventListener('click', () => {
      this.container.querySelector('.context-menu').hidden = true;
    });
  }
  
  showContextMenu(x, y) {
    const menu = this.container.querySelector('.context-menu');
    menu.hidden = false;
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }
  
  handleContextAction(action) {
    const ids = [...this.selectedItems];
    switch (action) {
      case 'open':
        if (ids.length === 1) this.openFolder(ids[0]);
        break;
      case 'rename':
        if (ids.length === 1) {
          const newName = prompt('Enter new name:');
          if (newName) this.renameItem(ids[0], newName);
        }
        break;
      case 'copy':
        this.clipboard = { action: 'copy', items: ids };
        break;
      case 'cut':
        this.clipboard = { action: 'cut', items: ids };
        break;
      case 'paste':
        if (this.clipboard) {
          for (const id of this.clipboard.items) {
            this.moveItem(id, this.currentFolder.id);
          }
          if (this.clipboard.action === 'cut') this.clipboard = null;
        }
        break;
      case 'delete':
        this.deleteItems(ids);
        break;
    }
  }
  
  setupKeyboard() {
    this.container.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (this.selectedItems.size > 0) {
            this.deleteItems([...this.selectedItems]);
          }
          break;
        case 'Enter':
          if (this.selectedItems.size === 1) {
            this.openFolder([...this.selectedItems][0]);
          }
          break;
        case 'Escape':
          this.selectedItems.clear();
          this.render();
          break;
      }
    });
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Apple FE ICT4 = **File manager with tree, drag-drop, context menu, keyboard navigation**
- **Tree traversal**: `findNode(root, id)` recursive search — used for rename, move, delete
- **Prevent cycle on move**: `isDescendant(folder, targetId)` — can't move folder into its own subtree
- **Breadcrumb path**: DFS from root to current folder — collect all ancestors in path
- **Context menu**: `contextmenu` event → `e.preventDefault()` → position fixed at cursor
- **Multi-select**: Cmd/Ctrl + click → toggle in Set — single click clears and adds
- **Drag-drop between folders**: `dragstart` with item-id → `drop` on folder → `moveItem(id, folderId)`
- Apple FE = **polished native-feeling UI** — keyboard nav, proper focus management, context menus, file metaphors

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | JS/DOM |
| File Manager | Very Hard | Tree, Drag-Drop, Context Menu |
| Technical 2 | Hard | Performance, Accessibility |
| System Design | Very Hard | iCloud Architecture |
| Domain | Hard | Apple platform knowledge |
| Behavioral | Medium | Apple values |
