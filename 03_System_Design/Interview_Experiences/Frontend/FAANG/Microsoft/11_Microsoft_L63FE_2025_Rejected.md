# Microsoft — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Frontend Engineer |
| **Level** | L63 |
| **YOE** | 7 years |
| **Date** | May 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 3 Technical + AA)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Kanban Board with Drag-and-Drop

### Problem
Build a Kanban board (like Azure DevOps):
1. Columns: To Do, In Progress, Review, Done
2. Cards with title, assignee, priority badge, labels
3. Drag-and-drop cards between columns
4. Add new card with form
5. Swimlanes by priority (Critical, High, Medium, Low)
6. Search/filter cards by title or assignee
7. Column WIP (Work-In-Progress) limits with visual warning

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Kanban Board</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', -apple-system, sans-serif; background: #f5f5f5; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }

.header { padding: 10px 16px; background: #0078d4; color: #fff; display: flex; align-items: center; gap: 12px; }
.header h1 { font-size: 16px; font-weight: 600; }
.search-box { padding: 6px 10px; border: none; border-radius: 4px; font-size: 12px; width: 220px; }
.add-btn { padding: 6px 14px; background: #fff; color: #0078d4; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; }

.board { display: flex; gap: 12px; padding: 16px; flex: 1; overflow-x: auto; }

.column { min-width: 270px; max-width: 270px; background: #ededed; border-radius: 4px; display: flex; flex-direction: column; }
.col-header { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid; }
.col-title { font-size: 13px; font-weight: 600; color: #333; }
.col-count { font-size: 11px; color: #666; padding: 2px 6px; background: #ddd; border-radius: 10px; }
.wip-warning { color: #d83b01; font-weight: 700; }
.wip-limit { font-size: 10px; color: #999; }

.col-body { flex: 1; padding: 8px; overflow-y: auto; min-height: 60px; }
.col-body.drag-over { background: #deecf9; border: 2px dashed #0078d4; }

/* Cards */
.card { background: #fff; border-radius: 4px; padding: 10px 12px; margin-bottom: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.1); cursor: grab; border-left: 3px solid; transition: transform 0.1s, box-shadow 0.1s; }
.card:active { cursor: grabbing; }
.card.dragging { opacity: 0.5; transform: rotate(2deg); }
.card:hover { box-shadow: 0 2px 6px rgba(0,0,0,.15); }

.card-title { font-size: 13px; font-weight: 600; color: #333; margin-bottom: 4px; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }
.card-assignee { font-size: 11px; color: #666; }
.priority-badge { padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
.priority-critical { background: #fde7e9; color: #d13438; border-color: #d13438; }
.priority-high { background: #fed9cc; color: #d83b01; border-color: #d83b01; }
.priority-medium { background: #fff4ce; color: #986f0b; border-color: #986f0b; }
.priority-low { background: #dff6dd; color: #107c10; border-color: #107c10; }

.card-labels { display: flex; gap: 4px; margin-top: 4px; }
.label-tag { padding: 1px 6px; border-radius: 2px; font-size: 9px; font-weight: 600; }

/* Swimlanes */
.swimlane-header { padding: 6px 8px; font-size: 11px; font-weight: 600; color: #666; background: #e0e0e0; border-radius: 3px; margin-bottom: 4px; cursor: pointer; display: flex; justify-content: space-between; }
.swimlane-header:hover { background: #d5d5d5; }

/* Add Card Modal */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 100; align-items: center; justify-content: center; }
.modal-overlay.visible { display: flex; }
.modal { background: #fff; border-radius: 4px; padding: 20px; width: 380px; box-shadow: 0 4px 20px rgba(0,0,0,.2); }
.modal h3 { font-size: 16px; margin-bottom: 12px; }
.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 12px; color: #666; margin-bottom: 3px; font-weight: 600; }
.form-group input, .form-group select { width: 100%; padding: 6px 8px; border: 1px solid #c8c8c8; border-radius: 3px; font-size: 13px; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
.form-actions button { padding: 6px 16px; border-radius: 3px; font-size: 13px; cursor: pointer; }
.btn-save { background: #0078d4; color: #fff; border: none; }
.btn-cancel { background: #fff; border: 1px solid #c8c8c8; color: #333; }
</style>
</head>
<body>

<div class="header">
  <h1>📋 Kanban Board</h1>
  <input class="search-box" id="searchBox" placeholder="Search cards...">
  <button class="add-btn" id="addBtn">+ New Item</button>
</div>

<div class="board" id="board"></div>

<div class="modal-overlay" id="modalOverlay">
  <div class="modal">
    <h3>New Work Item</h3>
    <div class="form-group"><label>Title</label><input id="fTitle"></div>
    <div class="form-group"><label>Assignee</label><input id="fAssignee" placeholder="Name"></div>
    <div class="form-group"><label>Priority</label><select id="fPriority"><option>Critical</option><option>High</option><option selected>Medium</option><option>Low</option></select></div>
    <div class="form-group"><label>Column</label><select id="fColumn"><option>todo</option><option>inprogress</option><option>review</option><option>done</option></select></div>
    <div class="form-actions">
      <button class="btn-cancel" id="cancelModal">Cancel</button>
      <button class="btn-save" id="saveCard">Save</button>
    </div>
  </div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#0078d4', wipLimit: 10 },
  { id: 'inprogress', label: 'In Progress', color: '#d83b01', wipLimit: 5 },
  { id: 'review', label: 'Review', color: '#8764b8', wipLimit: 3 },
  { id: 'done', label: 'Done', color: '#107c10', wipLimit: Infinity }
];

const LABELS = [
  { name: 'Bug', bg: '#fde7e9', color: '#d13438' },
  { name: 'Feature', bg: '#deecf9', color: '#0078d4' },
  { name: 'Tech Debt', bg: '#fff4ce', color: '#986f0b' },
  { name: 'UI', bg: '#e8dfec', color: '#8764b8' }
];

let cards = [
  { id: 1, title: 'Fix login timeout', assignee: 'Rahul', priority: 'Critical', column: 'inprogress', labels: ['Bug'] },
  { id: 2, title: 'Add user dashboard', assignee: 'Priya', priority: 'High', column: 'todo', labels: ['Feature'] },
  { id: 3, title: 'Refactor auth module', assignee: 'Arjun', priority: 'Medium', column: 'review', labels: ['Tech Debt'] },
  { id: 4, title: 'Update nav styles', assignee: 'Sneha', priority: 'Low', column: 'done', labels: ['UI'] },
  { id: 5, title: 'API rate limiting', assignee: 'Vikram', priority: 'High', column: 'todo', labels: ['Feature'] },
  { id: 6, title: 'Fix cart calculation', assignee: 'Rahul', priority: 'Critical', column: 'inprogress', labels: ['Bug'] },
  { id: 7, title: 'Dark mode support', assignee: 'Priya', priority: 'Medium', column: 'todo', labels: ['Feature', 'UI'] },
  { id: 8, title: 'Migrate to TypeScript', assignee: 'Arjun', priority: 'Low', column: 'todo', labels: ['Tech Debt'] },
  { id: 9, title: 'Performance audit', assignee: 'Vikram', priority: 'High', column: 'review', labels: ['Tech Debt'] },
  { id: 10, title: 'Mobile responsive', assignee: 'Sneha', priority: 'Medium', column: 'inprogress', labels: ['UI'] }
];

let searchQuery = '';
let collapsedSwimlanes = new Set();
let draggedCardId = null;

const PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

// ============================================================
// RENDER
// ============================================================
function render() {
  const filtered = cards.filter(c =>
    !searchQuery ||
    c.title.toLowerCase().includes(searchQuery) ||
    c.assignee.toLowerCase().includes(searchQuery)
  );

  document.getElementById('board').innerHTML = COLUMNS.map(col => {
    const colCards = filtered.filter(c => c.column === col.id);
    const overWip = colCards.length > col.wipLimit;

    // Group by priority (swimlanes)
    const grouped = {};
    PRIORITY_ORDER.forEach(p => { grouped[p] = colCards.filter(c => c.priority === p); });

    let cardsHtml = '';
    PRIORITY_ORDER.forEach(p => {
      if (grouped[p].length === 0) return;
      const collapsed = collapsedSwimlanes.has(col.id + '_' + p);
      cardsHtml += `<div class="swimlane-header" data-lane="${col.id}_${p}">${p} (${grouped[p].length}) <span>${collapsed ? '▸' : '▾'}</span></div>`;
      if (!collapsed) {
        cardsHtml += grouped[p].map(c => renderCard(c)).join('');
      }
    });

    return `
      <div class="column">
        <div class="col-header" style="border-color:${col.color};">
          <span class="col-title">${col.label}</span>
          <span>
            <span class="col-count ${overWip ? 'wip-warning' : ''}">${colCards.length}</span>
            ${col.wipLimit < Infinity ? `<span class="wip-limit"> / ${col.wipLimit}</span>` : ''}
          </span>
        </div>
        <div class="col-body" data-col="${col.id}" ondragover="event.preventDefault()" ondragenter="this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleDrop(event, '${col.id}')">${cardsHtml || '<div style="font-size:11px;color:#999;text-align:center;padding:12px;">No items</div>'}</div>
      </div>
    `;
  }).join('');

  attachCardEvents();
}

function renderCard(c) {
  const pClass = 'priority-' + c.priority.toLowerCase();
  const labelHtml = c.labels.map(l => {
    const lbl = LABELS.find(lb => lb.name === l);
    return lbl ? `<span class="label-tag" style="background:${lbl.bg};color:${lbl.color}">${lbl.name}</span>` : '';
  }).join('');

  return `
    <div class="card ${pClass}" draggable="true" data-id="${c.id}" ondragstart="startDrag(event, ${c.id})">
      <div class="card-title">${c.title}</div>
      <div class="card-meta">
        <span class="card-assignee">👤 ${c.assignee}</span>
        <span class="priority-badge ${pClass}">${c.priority}</span>
      </div>
      ${labelHtml ? `<div class="card-labels">${labelHtml}</div>` : ''}
    </div>
  `;
}

// ============================================================
// DRAG & DROP
// ============================================================
window.startDrag = function(e, id) {
  draggedCardId = id;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
};

window.handleDrop = function(e, colId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (draggedCardId === null) return;

  const card = cards.find(c => c.id === draggedCardId);
  if (card) {
    card.column = colId;
  }
  draggedCardId = null;
  render();
};

function attachCardEvents() {
  document.querySelectorAll('.card').forEach(el => {
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); draggedCardId = null; });
  });

  document.querySelectorAll('.swimlane-header').forEach(el => {
    el.addEventListener('click', () => {
      const lane = el.dataset.lane;
      if (collapsedSwimlanes.has(lane)) collapsedSwimlanes.delete(lane);
      else collapsedSwimlanes.add(lane);
      render();
    });
  });
}

// ============================================================
// SEARCH
// ============================================================
document.getElementById('searchBox').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase().trim();
  render();
});

// ============================================================
// ADD CARD
// ============================================================
document.getElementById('addBtn').addEventListener('click', () => document.getElementById('modalOverlay').classList.add('visible'));
document.getElementById('cancelModal').addEventListener('click', () => document.getElementById('modalOverlay').classList.remove('visible'));
document.getElementById('saveCard').addEventListener('click', () => {
  const title = document.getElementById('fTitle').value.trim();
  const assignee = document.getElementById('fAssignee').value.trim();
  const priority = document.getElementById('fPriority').value;
  const column = document.getElementById('fColumn').value;

  if (!title) return alert('Enter a title');

  cards.push({ id: Date.now(), title, assignee: assignee || 'Unassigned', priority, column, labels: [] });
  document.getElementById('modalOverlay').classList.remove('visible');
  document.getElementById('fTitle').value = '';
  document.getElementById('fAssignee').value = '';
  render();
});

// INIT
render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **drag reorder within a column** and **card detail modal**
- **Drag-and-drop**: HTML5 native API — `draggable`, `dragstart`, `dragover`, `drop`, `dragend`
- **WIP limits**: column card count compared to limit, red warning badge when exceeded
- **Swimlanes by priority**: group cards within each column by `PRIORITY_ORDER`, collapsible headers
- **Search**: filter cards array by title/assignee `includes`, re-render board
- **Column structure**: min-width 270px, overflow-y on body for scrollable cards, sticky header
- Border-left color on cards from priority class matching

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS, DOM |
| Technical 1 | Medium | CSS Flexbox, Layout |
| Technical 2 | Hard | Drag-Drop, Kanban, Swimlanes |
| Technical 3 | Hard | System Design |
| AA | Hard | Behavioral + Growth Mindset |
