# Microsoft — L63 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Frontend Engineer |
| **Level** | L63 |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Redmond, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + 3 Onsite)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Coding — Build a Drag & Drop Kanban Board
**Duration:** 60 minutes

### Problem
Implement a Kanban board with:
- Multiple columns (To Do, In Progress, Done)
- Cards that can be dragged between columns
- Drag handles, visual drop indicators
- Add/remove cards, reorder within column

### 💡 Interview-Ready Answer

```javascript
class KanbanBoard {
  constructor(container, { columns = [], cards = [] } = {}) {
    this.container = container;
    this.columnsConfig = columns;  // [{ id, title }]
    this.cards = new Map();        // cardId -> { id, title, description, columnId }
    this.nextCardId = 1;

    // Drag state
    this.draggedCard = null;
    this.draggedElement = null;
    this.placeholder = null;

    // Initialize cards
    cards.forEach(card => {
      this.cards.set(card.id, { ...card });
      this.nextCardId = Math.max(this.nextCardId, card.id + 1);
    });

    this._build();
    this._render();
  }

  _build() {
    this.container.innerHTML = '';
    this.container.className = 'kanban-board';
    this.container.style.cssText = `
      display:flex; gap:16px; padding:16px; min-height:500px;
      background:#f0f2f5; overflow-x:auto;
    `;

    // Create placeholder for drop indicator
    this.placeholder = document.createElement('div');
    this.placeholder.className = 'kanban-placeholder';
    this.placeholder.style.cssText = `
      height:4px; background:#1a73e8; border-radius:2px;
      margin:4px 8px; transition:all 0.15s ease;
    `;

    this.columnElements = {};

    this.columnsConfig.forEach(col => {
      const colEl = this._createColumn(col);
      this.container.appendChild(colEl);
      this.columnElements[col.id] = colEl;
    });
  }

  _createColumn(col) {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    column.dataset.columnId = col.id;
    column.style.cssText = `
      min-width:280px; max-width:320px; background:#fff; border-radius:8px;
      box-shadow:0 1px 3px rgba(0,0,0,0.12); display:flex; flex-direction:column;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = col.title;
    header.appendChild(titleSpan);

    const countBadge = document.createElement('span');
    countBadge.className = 'card-count';
    countBadge.style.cssText = 'background:#e8f0fe;color:#1a73e8;padding:2px 8px;border-radius:12px;font-size:12px;';
    header.appendChild(countBadge);

    column.appendChild(header);

    // Card list (drop zone)
    const cardList = document.createElement('div');
    cardList.className = 'kanban-card-list';
    cardList.dataset.columnId = col.id;
    cardList.style.cssText = 'flex:1;padding:8px;min-height:100px;';

    // Drop zone events
    cardList.addEventListener('dragover', (e) => this._onDragOver(e, cardList));
    cardList.addEventListener('dragleave', (e) => this._onDragLeave(e, cardList));
    cardList.addEventListener('drop', (e) => this._onDrop(e, col.id));

    column.appendChild(cardList);

    // Add card button
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Card';
    addBtn.style.cssText = 'margin:8px;padding:8px;border:1px dashed #ccc;border-radius:4px;background:none;cursor:pointer;color:#666;';
    addBtn.addEventListener('click', () => this._showAddCardForm(cardList, col.id));
    column.appendChild(addBtn);

    return column;
  }

  _createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'kanban-card';
    el.dataset.cardId = card.id;
    el.draggable = true;
    el.style.cssText = `
      background:#fff; border:1px solid #e0e0e0; border-radius:6px;
      padding:10px 12px; margin-bottom:8px; cursor:grab;
      box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:box-shadow 0.2s;
    `;

    // Drag handle
    const handle = document.createElement('span');
    handle.textContent = '⠿ ';
    handle.style.cssText = 'color:#999;cursor:grab;margin-right:4px;';

    const title = document.createElement('strong');
    title.textContent = card.title;
    title.style.fontSize = '14px';

    const desc = document.createElement('p');
    desc.textContent = card.description || '';
    desc.style.cssText = 'margin:4px 0 0;font-size:12px;color:#666;';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = 'float:right;border:none;background:none;font-size:16px;cursor:pointer;color:#999;padding:0 4px;';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeCard(card.id);
    });

    el.appendChild(deleteBtn);
    el.appendChild(handle);
    el.appendChild(title);
    if (card.description) el.appendChild(desc);

    // Drag events
    el.addEventListener('dragstart', (e) => this._onDragStart(e, card, el));
    el.addEventListener('dragend', (e) => this._onDragEnd(e));

    return el;
  }

  // === Drag & Drop Handlers ===

  _onDragStart(e, card, element) {
    this.draggedCard = card;
    this.draggedElement = element;
    element.style.opacity = '0.4';
    element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(card.id));

    // Highlight valid drop zones
    document.querySelectorAll('.kanban-card-list').forEach(list => {
      list.style.border = '2px dashed transparent';
    });
  }

  _onDragOver(e, cardList) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Show drop indicator
    cardList.style.border = '2px dashed #1a73e8';
    cardList.style.background = '#f8f9ff';

    // Determine insertion point
    const cards = [...cardList.querySelectorAll('.kanban-card:not([style*="opacity: 0.4"])')];
    const y = e.clientY;
    let insertBefore = null;

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        insertBefore = card;
        break;
      }
    }

    // Remove existing placeholder
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    if (insertBefore) {
      cardList.insertBefore(this.placeholder, insertBefore);
    } else {
      cardList.appendChild(this.placeholder);
    }
  }

  _onDragLeave(e, cardList) {
    // Only handle if leaving the card list entirely
    if (!cardList.contains(e.relatedTarget)) {
      cardList.style.border = '2px dashed transparent';
      cardList.style.background = '';
      if (this.placeholder.parentNode === cardList) {
        cardList.removeChild(this.placeholder);
      }
    }
  }

  _onDrop(e, targetColumnId) {
    e.preventDefault();

    const cardList = e.currentTarget.closest
      ? e.currentTarget
      : this.columnElements[targetColumnId].querySelector('.kanban-card-list');

    cardList.style.border = '';
    cardList.style.background = '';

    if (!this.draggedCard) return;

    // Determine new position
    const cards = [...cardList.querySelectorAll('.kanban-card')];
    const placeholderIndex = cards.indexOf(this.placeholder);

    // Remove placeholder
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    // Update card data
    this.draggedCard.columnId = targetColumnId;

    this._render();
  }

  _onDragEnd(e) {
    if (this.draggedElement) {
      this.draggedElement.style.opacity = '';
      this.draggedElement.style.boxShadow = '';
    }

    // Clean up highlights
    document.querySelectorAll('.kanban-card-list').forEach(list => {
      list.style.border = '';
      list.style.background = '';
    });

    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    this.draggedCard = null;
    this.draggedElement = null;
  }

  // === Card CRUD ===

  _showAddCardForm(cardList, columnId) {
    // Check if form already open
    if (cardList.querySelector('.add-card-form')) return;

    const form = document.createElement('div');
    form.className = 'add-card-form';
    form.style.cssText = 'padding:8px;background:#f9f9f9;border-radius:4px;margin-top:4px;';

    const titleInput = document.createElement('input');
    titleInput.placeholder = 'Card title...';
    titleInput.style.cssText = 'width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:4px;';

    const descInput = document.createElement('textarea');
    descInput.placeholder = 'Description (optional)';
    descInput.style.cssText = 'width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;resize:vertical;height:50px;margin-bottom:4px;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:4px;';

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.style.cssText = 'padding:4px 12px;background:#1a73e8;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    addBtn.addEventListener('click', () => {
      const title = titleInput.value.trim();
      if (title) {
        this.addCard(columnId, title, descInput.value.trim());
        form.remove();
      }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:4px 12px;border:1px solid #ccc;border-radius:4px;cursor:pointer;background:#fff;';
    cancelBtn.addEventListener('click', () => form.remove());

    btnRow.appendChild(addBtn);
    btnRow.appendChild(cancelBtn);
    form.appendChild(titleInput);
    form.appendChild(descInput);
    form.appendChild(btnRow);
    cardList.appendChild(form);
    titleInput.focus();
  }

  addCard(columnId, title, description = '') {
    const card = {
      id: this.nextCardId++,
      title,
      description,
      columnId
    };
    this.cards.set(card.id, card);
    this._render();
    return card;
  }

  removeCard(cardId) {
    this.cards.delete(cardId);
    this._render();
  }

  _render() {
    this.columnsConfig.forEach(col => {
      const colEl = this.columnElements[col.id];
      const cardList = colEl.querySelector('.kanban-card-list');
      const countBadge = colEl.querySelector('.card-count');

      cardList.innerHTML = '';

      const colCards = [...this.cards.values()].filter(c => c.columnId === col.id);
      countBadge.textContent = colCards.length;

      colCards.forEach(card => {
        cardList.appendChild(this._createCardElement(card));
      });
    });
  }
}

// === Usage ===
/*
const board = new KanbanBoard(document.getElementById('app'), {
  columns: [
    { id: 'todo', title: 'To Do' },
    { id: 'progress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
  ],
  cards: [
    { id: 1, title: 'Setup project', description: 'Init repo and CI', columnId: 'done' },
    { id: 2, title: 'Design schema', description: 'DB models', columnId: 'progress' },
    { id: 3, title: 'Write tests', description: '', columnId: 'todo' },
    { id: 4, title: 'Deploy to staging', description: '', columnId: 'todo' }
  ]
});
*/
```

## 🎯 Key Takeaways
- **Kanban board** tests mastery of HTML5 Drag and Drop API
- Key DnD events: `dragstart`, `dragover`, `drop`, `dragend`, `dragleave`
- Must prevent default on `dragover` for drop to work
- Visual feedback: placeholder line, opacity on dragged card, dashed border on drop zone
- `e.relatedTarget` in `dragleave` prevents flicker when moving between child elements

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Drag & Drop API, DOM, State Management |
| Design | Hard | Outlook Calendar Architecture |
| Behavioral | Medium | Growth Mindset |
