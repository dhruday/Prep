# Oracle — Senior Software Engineer Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Senior Software Engineer (FE) |
| **Level** | IC3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Frontend Coding — Tree View Explorer with Context Menu

### Problem
Build a file/folder tree view component (like VS Code sidebar) with:
1. Hierarchical tree rendering with expand/collapse toggles
2. Right-click context menu (New File, New Folder, Rename, Delete)
3. Inline editing for rename
4. Drag-and-drop to move items between folders
5. Search/filter that highlights matching nodes
6. Keyboard navigation (Up/Down arrows, Enter to expand, Delete to remove)

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Tree View Explorer</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', -apple-system, sans-serif; background: #1e1e1e; color: #ccc; }

.explorer { width: 320px; height: 100vh; background: #252526; display: flex; flex-direction: column; border-right: 1px solid #3c3c3c; }

.explorer-header { padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; display: flex; justify-content: space-between; align-items: center; }
.search-box { width: 100%; padding: 6px 10px; margin: 0 14px 8px; background: #3c3c3c; border: 1px solid #3c3c3c; border-radius: 4px; color: #ccc; font-size: 13px; outline: none; }
.search-box:focus { border-color: #007acc; }

.tree-container { flex: 1; overflow-y: auto; padding: 4px 0; }

.tree-node { user-select: none; }
.tree-item { display: flex; align-items: center; padding: 2px 6px 2px 0; cursor: pointer; font-size: 13px; white-space: nowrap; position: relative; }
.tree-item:hover { background: #2a2d2e; }
.tree-item.selected { background: #094771; }
.tree-item.drag-over { border-top: 2px solid #007acc; }
.tree-item .indent { display: inline-block; }
.tree-item .toggle { width: 16px; font-size: 10px; text-align: center; cursor: pointer; color: #999; flex-shrink: 0; }
.tree-item .icon { margin: 0 4px; font-size: 14px; }
.tree-item .name { flex: 1; }
.tree-item .name mark { background: #623c14; color: #ccc; padding: 0 1px; border-radius: 2px; }
.tree-item .edit-input { background: #3c3c3c; border: 1px solid #007acc; color: #ccc; padding: 1px 4px; font-size: 13px; font-family: inherit; outline: none; width: 100%; }

/* Context menu */
.context-menu { position: fixed; background: #3c3c3c; border: 1px solid #555; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); padding: 4px 0; z-index: 1000; min-width: 180px; display: none; }
.context-menu.open { display: block; }
.context-item { padding: 6px 16px; font-size: 13px; cursor: pointer; display: flex; justify-content: space-between; color: #ccc; }
.context-item:hover { background: #094771; }
.context-item .shortcut { color: #888; font-size: 11px; }
.context-sep { border-top: 1px solid #555; margin: 4px 0; }
</style>
</head>
<body>
<div class="explorer">
  <div class="explorer-header">Explorer</div>
  <input type="text" class="search-box" id="searchBox" placeholder="Search files...">
  <div class="tree-container" id="treeContainer"></div>
</div>

<div class="context-menu" id="contextMenu"></div>

<script>
// ============================================================
// DATA MODEL
// ============================================================
let tree = [
  { id: 1, name: 'src', type: 'folder', expanded: true, children: [
    { id: 2, name: 'components', type: 'folder', expanded: false, children: [
      { id: 3, name: 'Button.tsx', type: 'file', children: [] },
      { id: 4, name: 'Modal.tsx', type: 'file', children: [] },
      { id: 5, name: 'Table.tsx', type: 'file', children: [] }
    ]},
    { id: 6, name: 'hooks', type: 'folder', expanded: false, children: [
      { id: 7, name: 'useAuth.ts', type: 'file', children: [] },
      { id: 8, name: 'useFetch.ts', type: 'file', children: [] }
    ]},
    { id: 9, name: 'App.tsx', type: 'file', children: [] },
    { id: 10, name: 'index.ts', type: 'file', children: [] }
  ]},
  { id: 11, name: 'public', type: 'folder', expanded: false, children: [
    { id: 12, name: 'index.html', type: 'file', children: [] },
    { id: 13, name: 'favicon.ico', type: 'file', children: [] }
  ]},
  { id: 14, name: 'package.json', type: 'file', children: [] },
  { id: 15, name: 'tsconfig.json', type: 'file', children: [] },
  { id: 16, name: 'README.md', type: 'file', children: [] }
];

let nextId = 20;
let selectedId = null;
let editingId = null;
let searchQuery = '';
let draggedId = null;

// ============================================================
// ICONS
// ============================================================
function getIcon(node) {
  if (node.type === 'folder') return node.expanded ? '📂' : '📁';
  const ext = node.name.split('.').pop();
  const icons = { ts: '🟦', tsx: '⚛️', js: '🟨', json: '📋', html: '🌐', md: '📄', ico: '🎨' };
  return icons[ext] || '📄';
}

// ============================================================
// SEARCH MATCHING
// ============================================================
function nodeMatches(node, query) {
  if (!query) return true;
  if (node.name.toLowerCase().includes(query.toLowerCase())) return true;
  return node.children && node.children.some(c => nodeMatches(c, query));
}

function highlightName(name, query) {
  if (!query) return escHtml(name);
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escHtml(name);
  return escHtml(name.substring(0, idx)) +
    '<mark>' + escHtml(name.substring(idx, idx + query.length)) + '</mark>' +
    escHtml(name.substring(idx + query.length));
}

// ============================================================
// RENDER
// ============================================================
const treeContainer = document.getElementById('treeContainer');

function render() {
  treeContainer.innerHTML = '';
  tree.forEach(node => renderNode(node, 0, treeContainer));
}

function renderNode(node, depth, container) {
  if (searchQuery && !nodeMatches(node, searchQuery)) return;

  const div = document.createElement('div');
  div.className = 'tree-node';

  const item = document.createElement('div');
  item.className = 'tree-item' + (selectedId === node.id ? ' selected' : '');
  item.setAttribute('data-id', node.id);
  item.draggable = true;
  item.tabIndex = 0;

  // Indent
  const indent = document.createElement('span');
  indent.className = 'indent';
  indent.style.width = (depth * 16 + 4) + 'px';
  item.appendChild(indent);

  // Toggle
  const toggle = document.createElement('span');
  toggle.className = 'toggle';
  if (node.type === 'folder') {
    toggle.textContent = node.expanded ? '▾' : '▸';
    toggle.addEventListener('click', (e) => { e.stopPropagation(); node.expanded = !node.expanded; render(); });
  }
  item.appendChild(toggle);

  // Icon
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = getIcon(node);
  item.appendChild(icon);

  // Name (or edit input)
  if (editingId === node.id) {
    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = node.name;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { node.name = input.value.trim() || node.name; editingId = null; render(); }
      if (e.key === 'Escape') { editingId = null; render(); }
    });
    input.addEventListener('blur', () => { node.name = input.value.trim() || node.name; editingId = null; render(); });
    item.appendChild(input);
    setTimeout(() => { input.focus(); input.select(); }, 0);
  } else {
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.innerHTML = highlightName(node.name, searchQuery);
    item.appendChild(nameSpan);
  }

  // Click select
  item.addEventListener('click', () => {
    selectedId = node.id;
    if (node.type === 'folder') node.expanded = !node.expanded;
    render();
  });

  // Context menu
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    selectedId = node.id;
    showContextMenu(e.clientX, e.clientY, node);
    render();
  });

  // Drag
  item.addEventListener('dragstart', (e) => {
    draggedId = node.id;
    e.dataTransfer.effectAllowed = 'move';
  });
  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (node.type === 'folder' && draggedId !== node.id) item.classList.add('drag-over');
  });
  item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
  item.addEventListener('drop', (e) => {
    e.preventDefault();
    item.classList.remove('drag-over');
    if (node.type === 'folder' && draggedId && draggedId !== node.id) {
      moveNode(draggedId, node.id);
    }
    draggedId = null;
  });

  // Keyboard
  item.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusNextItem(item, 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusNextItem(item, -1); }
    if (e.key === 'Enter' && node.type === 'folder') { node.expanded = !node.expanded; render(); }
    if (e.key === 'Delete') { deleteNode(node.id); render(); }
    if (e.key === 'F2') { editingId = node.id; render(); }
  });

  div.appendChild(item);

  // Children
  if (node.type === 'folder' && node.expanded && node.children) {
    node.children.forEach(child => renderNode(child, depth + 1, div));
  }

  container.appendChild(div);
}

// ============================================================
// TREE OPERATIONS
// ============================================================
function findNode(id, nodes = tree) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const found = findNode(id, n.children); if (found) return found; }
  }
  return null;
}

function findParent(id, nodes = tree, parent = null) {
  for (const n of nodes) {
    if (n.id === id) return { parent, siblings: nodes };
    if (n.children) { const found = findParent(id, n.children, n); if (found) return found; }
  }
  return null;
}

function deleteNode(id) {
  const info = findParent(id);
  if (info) {
    const idx = info.siblings.findIndex(n => n.id === id);
    if (idx !== -1) info.siblings.splice(idx, 1);
  }
}

function moveNode(sourceId, targetFolderId) {
  const info = findParent(sourceId);
  if (!info) return;
  const idx = info.siblings.findIndex(n => n.id === sourceId);
  if (idx === -1) return;
  const [node] = info.siblings.splice(idx, 1);
  const target = findNode(targetFolderId);
  if (target && target.type === 'folder') {
    target.children.push(node);
    target.expanded = true;
    render();
  }
}

function addChild(parentId, type) {
  const parent = findNode(parentId);
  if (!parent || parent.type !== 'folder') return;
  const name = type === 'folder' ? 'new-folder' : 'untitled.ts';
  const newNode = { id: nextId++, name, type, children: type === 'folder' ? [] : [], expanded: false };
  parent.children.push(newNode);
  parent.expanded = true;
  editingId = newNode.id;
  selectedId = newNode.id;
  render();
}

// ============================================================
// CONTEXT MENU
// ============================================================
const contextMenu = document.getElementById('contextMenu');

function showContextMenu(x, y, node) {
  contextMenu.innerHTML = '';
  const items = [];

  if (node.type === 'folder') {
    items.push({ label: 'New File', shortcut: '', action: () => addChild(node.id, 'file') });
    items.push({ label: 'New Folder', shortcut: '', action: () => addChild(node.id, 'folder') });
    items.push({ sep: true });
  }
  items.push({ label: 'Rename', shortcut: 'F2', action: () => { editingId = node.id; render(); } });
  items.push({ label: 'Delete', shortcut: 'Del', action: () => { deleteNode(node.id); render(); } });

  items.forEach(item => {
    if (item.sep) {
      const sep = document.createElement('div');
      sep.className = 'context-sep';
      contextMenu.appendChild(sep);
      return;
    }
    const el = document.createElement('div');
    el.className = 'context-item';
    el.innerHTML = `<span>${item.label}</span><span class="shortcut">${item.shortcut}</span>`;
    el.addEventListener('click', () => {
      contextMenu.classList.remove('open');
      item.action();
    });
    contextMenu.appendChild(el);
  });

  // Position ensuring it stays within viewport
  contextMenu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  contextMenu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
  contextMenu.classList.add('open');
}

document.addEventListener('click', () => contextMenu.classList.remove('open'));
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('.tree-item')) contextMenu.classList.remove('open');
});

// ============================================================
// KEYBOARD NAV HELPER
// ============================================================
function focusNextItem(current, direction) {
  const items = [...treeContainer.querySelectorAll('.tree-item')];
  const idx = items.indexOf(current);
  const next = items[idx + direction];
  if (next) { next.focus(); selectedId = parseInt(next.getAttribute('data-id')); render(); }
}

// ============================================================
// SEARCH
// ============================================================
document.getElementById('searchBox').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  // Auto-expand all folders when searching
  if (searchQuery) expandAll(tree);
  render();
});

function expandAll(nodes) {
  nodes.forEach(n => { if (n.type === 'folder') { n.expanded = true; if (n.children) expandAll(n.children); } });
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// Initial render
render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Oracle FE interviews test **tree component** expertise — common in enterprise UIs
- Recursive rendering: `renderNode` calls itself for children with increasing depth
- **Context menu**: positioned at cursor coordinates, bounded within viewport
- Inline rename: swap name span with input, commit on Enter/blur, cancel on Escape
- Tree operations (find, findParent, delete, move) use DFS on recursive data structure
- Search filter: `nodeMatches` cascades — a folder matches if any descendant matches
- `<mark>` tag for search highlighting — browser-native highlight element
- `tabIndex=0` makes tree items focusable for keyboard navigation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Trees |
| Technical 1 | Medium | DOM, Recursion |
| Technical 2 | Hard | Tree View, Context Menu, DnD, Keyboard A11y |
| Manager | Medium | Leadership, Java/Cloud Knowledge |
