# Amazon — L6 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Frontend Engineer |
| **Level** | L6 (Senior) |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Seattle |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 4 On-site: 2 FE Coding + System Design + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Frontend Coding — Kanban Board with Drag-and-Drop

### Problem
Build a Kanban board (like Trello/Jira) with:
1. Multiple columns (To Do, In Progress, Done)
2. Cards with title, description, and priority
3. Drag-and-drop cards between columns and within a column
4. Add/edit/delete cards
5. Persist state in localStorage
6. Filter cards by priority (Low, Medium, High)

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
body { font-family: -apple-system, sans-serif; background: #0079bf; min-height: 100vh; padding: 20px; }

.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.toolbar label { color: #fff; font-size: 14px; font-weight: 600; }
.toolbar select { padding: 6px 10px; border-radius: 4px; border: none; font-size: 13px; }

.board { display: flex; gap: 12px; align-items: flex-start; overflow-x: auto; padding-bottom: 20px; }

.column { background: #ebecf0; border-radius: 8px; width: 280px; min-width: 280px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
.column-header { padding: 10px 12px; font-weight: 700; font-size: 14px; color: #172b4d; display: flex; justify-content: space-between; align-items: center; }
.column-header .count { background: #c1c7d0; border-radius: 12px; padding: 2px 8px; font-size: 12px; font-weight: 500; }
.card-list { padding: 4px 8px 8px; overflow-y: auto; flex: 1; min-height: 40px; }
.card-list.drag-over { background: #deebff; border-radius: 4px; }

.card { background: #fff; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; cursor: grab; box-shadow: 0 1px 2px rgba(0,0,0,0.15); transition: transform 0.1s, box-shadow 0.1s; position: relative; }
.card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
.card.dragging { opacity: 0.5; transform: rotate(2deg); }
.card.drag-placeholder { border: 2px dashed #4c9aff; background: transparent; box-shadow: none; height: 60px; }

.card-title { font-size: 14px; font-weight: 500; color: #172b4d; margin-bottom: 4px; }
.card-desc { font-size: 12px; color: #5e6c84; margin-bottom: 6px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.priority-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 3px; text-transform: uppercase; }
.priority-high { background: #ffebe6; color: #bf2600; }
.priority-medium { background: #fff3e0; color: #bf8700; }
.priority-low { background: #e3fcef; color: #006644; }
.card-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
.card:hover .card-actions { opacity: 1; }
.card-actions button { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 3px; }
.card-actions button:hover { background: #ebecf0; }

.add-card-btn { width: 100%; padding: 8px; background: none; border: none; text-align: left; cursor: pointer; color: #5e6c84; font-size: 14px; border-radius: 0 0 8px 8px; }
.add-card-btn:hover { background: #dfe1e6; color: #172b4d; }

.add-form { padding: 8px; }
.add-form input, .add-form textarea, .add-form select { width: 100%; margin-bottom: 6px; padding: 6px 8px; border: 1px solid #dfe1e6; border-radius: 4px; font-size: 13px; font-family: inherit; }
.add-form textarea { resize: vertical; min-height: 50px; }
.add-form .form-actions { display: flex; gap: 6px; }
.add-form .form-actions button { padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; }
.btn-primary { background: #0079bf; color: #fff; }
.btn-primary:hover { background: #026aa7; }
.btn-cancel { background: none; color: #5e6c84; }

.hidden { display: none !important; }
</style>
</head>
<body>
<div class="toolbar">
  <label>Filter by Priority:</label>
  <select id="filter">
    <option value="all">All</option>
    <option value="high">High</option>
    <option value="medium">Medium</option>
    <option value="low">Low</option>
  </select>
</div>
<div class="board" id="board"></div>

<script>
// ============================================================
// DATA MODEL
// ============================================================
const STORAGE_KEY = 'kanban_board_state';

const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'In Review' },
  { id: 'done', title: 'Done' }
];

let state = loadState();
let currentFilter = 'all';
let draggedCardId = null;
let draggedFromCol = null;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.columns && parsed.cards) return parsed;
    }
  } catch (e) { /* ignore corrupted state */ }

  return {
    columns: DEFAULT_COLUMNS.map(c => c.id),
    cards: [
      { id: 'c1', title: 'Setup project scaffolding', desc: 'Create folder structure and package.json', priority: 'high', columnId: 'todo' },
      { id: 'c2', title: 'Design database schema', desc: 'Users, Products, Orders tables', priority: 'medium', columnId: 'todo' },
      { id: 'c3', title: 'Implement auth module', desc: 'JWT-based authentication', priority: 'high', columnId: 'in-progress' },
      { id: 'c4', title: 'Write unit tests', desc: 'Cover core business logic', priority: 'low', columnId: 'in-progress' },
      { id: 'c5', title: 'API documentation', desc: 'Swagger/OpenAPI docs', priority: 'medium', columnId: 'review' },
      { id: 'c6', title: 'CI/CD pipeline', desc: 'GitHub Actions workflow', priority: 'low', columnId: 'done' }
    ],
    nextId: 7
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* QuotaExceededError — graceful degrade */ }
}

function getCardsForColumn(columnId) {
  return state.cards.filter(c => {
    if (c.columnId !== columnId) return false;
    if (currentFilter !== 'all' && c.priority !== currentFilter) return false;
    return true;
  });
}

// ============================================================
// RENDER
// ============================================================
const board = document.getElementById('board');

function render() {
  board.innerHTML = '';
  for (const colId of state.columns) {
    const colDef = DEFAULT_COLUMNS.find(c => c.id === colId);
    const cards = getCardsForColumn(colId);
    board.appendChild(createColumnEl(colDef, cards));
  }
}

function createColumnEl(colDef, cards) {
  const col = document.createElement('div');
  col.className = 'column';
  col.setAttribute('data-col', colDef.id);

  // Header
  const header = document.createElement('div');
  header.className = 'column-header';
  header.innerHTML = `<span>${colDef.title}</span><span class="count">${cards.length}</span>`;
  col.appendChild(header);

  // Card list
  const list = document.createElement('div');
  list.className = 'card-list';
  list.setAttribute('data-col', colDef.id);

  cards.forEach(card => list.appendChild(createCardEl(card)));

  // Drop zone events
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    list.classList.add('drag-over');

    // Insert placeholder at correct position
    const afterEl = getDragAfterElement(list, e.clientY);
    const existing = list.querySelector('.drag-placeholder');
    if (!existing) {
      const ph = document.createElement('div');
      ph.className = 'card drag-placeholder';
      if (afterEl) list.insertBefore(ph, afterEl);
      else list.appendChild(ph);
    } else {
      if (afterEl) list.insertBefore(existing, afterEl);
      else list.appendChild(existing);
    }
  });

  list.addEventListener('dragleave', (e) => {
    if (!list.contains(e.relatedTarget)) {
      list.classList.remove('drag-over');
      list.querySelector('.drag-placeholder')?.remove();
    }
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    list.classList.remove('drag-over');
    list.querySelector('.drag-placeholder')?.remove();

    if (!draggedCardId) return;
    const card = state.cards.find(c => c.id === draggedCardId);
    if (!card) return;

    card.columnId = colDef.id;

    // Determine new position within column
    const afterEl = getDragAfterElement(list, e.clientY);
    const afterCardId = afterEl?.getAttribute('data-card');

    // Reorder within state.cards
    const colCards = state.cards.filter(c => c.columnId === colDef.id && c.id !== card.id);
    const insertIdx = afterCardId ? colCards.findIndex(c => c.id === afterCardId) : colCards.length;
    colCards.splice(insertIdx, 0, card);

    // Rebuild state keeping other columns intact
    state.cards = [
      ...state.cards.filter(c => c.columnId !== colDef.id && c.id !== card.id),
      ...colCards
    ];

    saveState();
    render();
  });

  col.appendChild(list);

  // Add card form
  const addBtn = document.createElement('button');
  addBtn.className = 'add-card-btn';
  addBtn.textContent = '+ Add a card';

  const form = document.createElement('div');
  form.className = 'add-form hidden';
  form.innerHTML = `
    <input type="text" class="new-title" placeholder="Card title" maxlength="100">
    <textarea class="new-desc" placeholder="Description (optional)" maxlength="500"></textarea>
    <select class="new-priority">
      <option value="medium">Medium Priority</option>
      <option value="high">High Priority</option>
      <option value="low">Low Priority</option>
    </select>
    <div class="form-actions">
      <button class="btn-primary add-confirm">Add Card</button>
      <button class="btn-cancel add-cancel">Cancel</button>
    </div>
  `;

  addBtn.addEventListener('click', () => {
    addBtn.classList.add('hidden');
    form.classList.remove('hidden');
    form.querySelector('.new-title').focus();
  });

  form.querySelector('.add-cancel').addEventListener('click', () => {
    form.classList.add('hidden');
    addBtn.classList.remove('hidden');
    form.querySelector('.new-title').value = '';
    form.querySelector('.new-desc').value = '';
  });

  form.querySelector('.add-confirm').addEventListener('click', () => {
    const title = form.querySelector('.new-title').value.trim();
    if (!title) { form.querySelector('.new-title').focus(); return; }

    state.cards.push({
      id: 'c' + (state.nextId++),
      title,
      desc: form.querySelector('.new-desc').value.trim(),
      priority: form.querySelector('.new-priority').value,
      columnId: colDef.id
    });
    saveState();
    render();
  });

  col.append(addBtn, form);
  return col;
}

function createCardEl(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.setAttribute('data-card', card.id);
  el.draggable = true;

  el.innerHTML = `
    <div class="card-title">${escapeHtml(card.title)}</div>
    ${card.desc ? `<div class="card-desc">${escapeHtml(card.desc)}</div>` : ''}
    <div class="card-footer">
      <span class="priority-badge priority-${card.priority}">${card.priority}</span>
      <div class="card-actions">
        <button class="edit-btn" title="Edit">✏️</button>
        <button class="delete-btn" title="Delete">🗑️</button>
      </div>
    </div>
  `;

  // Drag
  el.addEventListener('dragstart', (e) => {
    draggedCardId = card.id;
    draggedFromCol = card.columnId;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    draggedCardId = null;
    document.querySelectorAll('.drag-over').forEach(e => e.classList.remove('drag-over'));
    document.querySelectorAll('.drag-placeholder').forEach(e => e.remove());
  });

  // Edit
  el.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const newTitle = prompt('Edit title:', card.title);
    if (newTitle !== null && newTitle.trim()) {
      card.title = newTitle.trim();
      const newDesc = prompt('Edit description:', card.desc || '');
      if (newDesc !== null) card.desc = newDesc.trim();
      saveState();
      render();
    }
  });

  // Delete
  el.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Delete "' + card.title + '"?')) {
      state.cards = state.cards.filter(c => c.id !== card.id);
      saveState();
      render();
    }
  });

  return el;
}

function getDragAfterElement(list, y) {
  const cards = [...list.querySelectorAll('.card:not(.dragging):not(.drag-placeholder)')];
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// FILTER
// ============================================================
document.getElementById('filter').addEventListener('change', (e) => {
  currentFilter = e.target.value;
  render();
});

// Initial render
render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Amazon FE interviews test **interactive CRUD applications** with drag-and-drop
- HTML5 Drag & Drop API: `dragstart`, `dragover`, `drop`, `dragend` event lifecycle
- Placeholder insertion during drag: calculate insertion point from `clientY` vs card midpoints
- localStorage persistence with graceful degradation (QuotaExceededError catch)
- **XSS prevention**: `escapeHtml()` via textContent → innerHTML DOM method
- Card reordering within and across columns requires state array manipulation
- Filter state maintained separately from data model — clean separation
- promptt-based editing is interview-acceptable; production would use inline forms

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, String Manipulation |
| FE Coding 1 | Medium | Component Design, DOM |
| FE Coding 2 | Hard | Drag & Drop, State Management, localStorage |
| System Design | Hard | Real-Time Collaboration Board |
| Bar Raiser | Hard | LP Deep Dive, Impact Stories |
