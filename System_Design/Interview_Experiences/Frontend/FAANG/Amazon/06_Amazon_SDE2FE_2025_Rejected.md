# Amazon — SDE-2 Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Frontend Engineer SDE-2 |
| **Level** | SDE-2 (L5) |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected (LP Round) |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Amazon Retail |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + FE System Design + LP + Bar Raiser)

---

## Round 1: Machine Coding
**Duration:** 75 minutes

### Challenge
**Build a Real-Time Collaborative TODO List** (with optimistic updates)
- Add/edit/delete TODO items
- Real-time sync: changes from one user appear on another user's screen
- Optimistic UI: apply changes instantly, rollback on server error
- Offline queue: store edits when offline, sync on reconnect
- Drag-and-drop reordering
- Filter: all / active / completed

### 💡 Collaborative TODO with Optimistic Updates

```javascript
class CollaborativeTodo {
  constructor(container, wsUrl) {
    this.container = container;
    this.items = new Map(); // id → { text, completed, order }
    this.pendingOps = [];   // Operations waiting for server ack
    this.filter = 'all';    // all | active | completed
    this.editingId = null;
    
    this.setupWebSocket(wsUrl);
    this.render();
  }
  
  setupWebSocket(url) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => this.handleServerMessage(JSON.parse(event.data));
    this.ws.onclose = () => {
      this.isOffline = true;
      this.render(); // Show offline banner
      // Reconnect with exponential backoff
      setTimeout(() => this.setupWebSocket(url), Math.min(1000 * 2 ** this.reconnectAttempts++, 30000));
    };
    this.ws.onopen = () => {
      this.isOffline = false;
      this.reconnectAttempts = 0;
      this.flushPendingOps();
      this.render();
    };
    this.reconnectAttempts = 0;
  }
  
  handleServerMessage(msg) {
    switch (msg.type) {
      case 'sync':
        // Initial state from server
        this.items.clear();
        msg.items.forEach(item => this.items.set(item.id, item));
        break;
        
      case 'ack':
        // Server confirmed our operation
        this.pendingOps = this.pendingOps.filter(op => op.clientId !== msg.clientId);
        break;
        
      case 'reject':
        // Server rejected our operation — rollback
        this.rollbackOp(msg.clientId);
        break;
        
      case 'update':
        // Another user's operation — apply if not our pending op
        if (!this.pendingOps.some(op => op.clientId === msg.clientId)) {
          this.applyOp(msg.op);
        }
        break;
    }
    this.render();
  }
  
  // Optimistic update: apply locally, then send to server
  dispatchOp(op) {
    const clientId = crypto.randomUUID();
    op.clientId = clientId;
    
    // Apply optimistically
    this.applyOp(op);
    this.render();
    
    // Queue
    this.pendingOps.push(op);
    
    // Send to server (or queue if offline)
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(op));
    }
  }
  
  applyOp(op) {
    switch (op.action) {
      case 'add':
        this.items.set(op.id, { id: op.id, text: op.text, completed: false, order: op.order });
        break;
      case 'toggle':
        const item = this.items.get(op.id);
        if (item) item.completed = !item.completed;
        break;
      case 'edit':
        const editItem = this.items.get(op.id);
        if (editItem) editItem.text = op.text;
        break;
      case 'delete':
        this.items.delete(op.id);
        break;
      case 'reorder':
        // Update order values
        op.updates.forEach(({ id, order }) => {
          const reorderItem = this.items.get(id);
          if (reorderItem) reorderItem.order = order;
        });
        break;
    }
  }
  
  rollbackOp(clientId) {
    const op = this.pendingOps.find(o => o.clientId === clientId);
    if (!op) return;
    
    // Reverse the operation
    switch (op.action) {
      case 'add':
        this.items.delete(op.id);
        break;
      case 'toggle':
        const item = this.items.get(op.id);
        if (item) item.completed = !item.completed;
        break;
      case 'edit':
        const editItem = this.items.get(op.id);
        if (editItem) editItem.text = op.previousText;
        break;
      case 'delete':
        this.items.set(op.id, op.previousItem);
        break;
      case 'reorder':
        op.previousUpdates.forEach(({ id, order }) => {
          const reorderItem = this.items.get(id);
          if (reorderItem) reorderItem.order = order;
        });
        break;
    }
    
    this.pendingOps = this.pendingOps.filter(o => o.clientId !== clientId);
    this.render();
  }
  
  flushPendingOps() {
    for (const op of this.pendingOps) {
      this.ws.send(JSON.stringify(op));
    }
  }
  
  render() {
    const sorted = [...this.items.values()].sort((a, b) => a.order - b.order);
    const filtered = sorted.filter(item => {
      if (this.filter === 'active') return !item.completed;
      if (this.filter === 'completed') return item.completed;
      return true;
    });
    
    const activeCount = sorted.filter(i => !i.completed).length;
    
    this.container.innerHTML = `
      <div class="todo-app" role="application" aria-label="Collaborative TODO List">
        ${this.isOffline ? '<div class="offline-banner" role="alert">⚠ Offline — changes will sync when reconnected</div>' : ''}
        
        <header>
          <h1>Collaborative TODOs</h1>
          <form class="new-todo-form" aria-label="Add new TODO">
            <input type="text" class="new-todo-input" placeholder="What needs to be done?" 
                   maxlength="200" aria-label="New TODO text">
            <button type="submit" aria-label="Add TODO">+</button>
          </form>
        </header>
        
        <ul class="todo-list" role="list" aria-label="TODO items">
          ${filtered.map(item => `
            <li class="todo-item ${item.completed ? 'completed' : ''} ${this.pendingOps.some(o => o.id === item.id) ? 'pending' : ''}"
                draggable="true" data-id="${item.id}" role="listitem">
              <input type="checkbox" ${item.completed ? 'checked' : ''} 
                     aria-label="Mark ${this._sanitize(item.text)} as ${item.completed ? 'incomplete' : 'complete'}">
              ${this.editingId === item.id 
                ? `<input type="text" class="edit-input" value="${this._sanitize(item.text)}" maxlength="200">`
                : `<span class="todo-text">${this._sanitize(item.text)}</span>`
              }
              <button class="btn-delete" aria-label="Delete ${this._sanitize(item.text)}">&times;</button>
            </li>
          `).join('')}
        </ul>
        
        <footer class="todo-footer">
          <span class="count">${activeCount} item${activeCount !== 1 ? 's' : ''} left</span>
          <div class="filters" role="group" aria-label="Filter TODOs">
            <button class="${this.filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="${this.filter === 'active' ? 'active' : ''}" data-filter="active">Active</button>
            <button class="${this.filter === 'completed' ? 'active' : ''}" data-filter="completed">Completed</button>
          </div>
          <button class="btn-clear-completed">Clear completed</button>
        </footer>
      </div>
    `;
    
    this.attachListeners();
  }
  
  attachListeners() {
    // Add new TODO
    const form = this.container.querySelector('.new-todo-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.new-todo-input');
      const text = input.value.trim();
      if (!text) return;
      
      this.dispatchOp({
        action: 'add',
        id: crypto.randomUUID(),
        text,
        order: Date.now()
      });
      input.value = '';
    });
    
    // Toggle, edit, delete
    this.container.querySelector('.todo-list').addEventListener('click', (e) => {
      const li = e.target.closest('.todo-item');
      if (!li) return;
      const id = li.dataset.id;
      
      if (e.target.matches('input[type="checkbox"]')) {
        this.dispatchOp({ action: 'toggle', id });
      }
      
      if (e.target.matches('.btn-delete')) {
        const item = this.items.get(id);
        this.dispatchOp({ action: 'delete', id, previousItem: { ...item } });
      }
      
      if (e.target.matches('.todo-text')) {
        this.editingId = id;
        this.render();
        const editInput = this.container.querySelector('.edit-input');
        editInput.focus();
        editInput.selectionStart = editInput.value.length;
      }
    });
    
    // Edit: save on Enter/blur, cancel on Escape
    const editInput = this.container.querySelector('.edit-input');
    if (editInput) {
      const saveEdit = () => {
        const text = editInput.value.trim();
        if (text && this.editingId) {
          const previous = this.items.get(this.editingId);
          this.dispatchOp({ action: 'edit', id: this.editingId, text, previousText: previous.text });
        }
        this.editingId = null;
        this.render();
      };
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') { this.editingId = null; this.render(); }
      });
      editInput.addEventListener('blur', saveEdit);
    }
    
    // Filters
    this.container.querySelectorAll('.filters button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter;
        this.render();
      });
    });
    
    // Clear completed
    this.container.querySelector('.btn-clear-completed').addEventListener('click', () => {
      for (const [id, item] of this.items) {
        if (item.completed) {
          this.dispatchOp({ action: 'delete', id, previousItem: { ...item } });
        }
      }
    });
    
    // Drag & Drop reordering
    this.setupDragDrop();
  }
  
  setupDragDrop() {
    let draggedId = null;
    const list = this.container.querySelector('.todo-list');
    
    list.addEventListener('dragstart', (e) => {
      const li = e.target.closest('.todo-item');
      if (li) { draggedId = li.dataset.id; li.classList.add('dragging'); }
    });
    
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const li = e.target.closest('.todo-item');
      if (li && li.dataset.id !== draggedId) {
        li.classList.add('drag-over');
      }
    });
    
    list.addEventListener('dragleave', (e) => {
      const li = e.target.closest('.todo-item');
      if (li) li.classList.remove('drag-over');
    });
    
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetLi = e.target.closest('.todo-item');
      if (!targetLi || targetLi.dataset.id === draggedId) return;
      
      const targetId = targetLi.dataset.id;
      const targetItem = this.items.get(targetId);
      const draggedItem = this.items.get(draggedId);
      
      if (targetItem && draggedItem) {
        const prevUpdates = [
          { id: draggedId, order: draggedItem.order },
          { id: targetId, order: targetItem.order }
        ];
        
        // Swap order values
        this.dispatchOp({
          action: 'reorder',
          updates: [
            { id: draggedId, order: targetItem.order },
            { id: targetId, order: draggedItem.order }
          ],
          previousUpdates: prevUpdates
        });
      }
    });
    
    list.addEventListener('dragend', () => {
      draggedId = null;
      list.querySelectorAll('.dragging, .drag-over').forEach(el => {
        el.classList.remove('dragging', 'drag-over');
      });
    });
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
- Amazon FE = **Collaborative TODO with optimistic updates + offline queue + DnD**
- **Optimistic updates**: apply locally first → send to server → on ack: keep, on reject: rollback
- **Rollback**: each operation stores `previousText`/`previousItem` for reversal — critical for optimistic UI
- **Offline queue**: pending ops stored in array → flushed on WebSocket reconnect
- **WebSocket reconnect**: exponential backoff (1s, 2s, 4s, ... cap at 30s) — prevents server overload
- **`crypto.randomUUID()`**: client-generated IDs — no server roundtrip needed for add operations
- **Drag-and-drop**: swap order values → dispatch reorder op with previous state for rollback
- Amazon FE: **LP is critical** — rejected despite strong technical rounds (common at Amazon)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Optimistic Updates, WebSocket, DnD |
| FE System Design | Hard | Real-Time Architecture |
| LP | Hard | Customer Obsession, Ownership |
| Bar Raiser | Hard | Dive Deep, Bias for Action |
