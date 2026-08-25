# Target — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Senior Frontend Engineer |
| **Level** | Senior SWE |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Kanban Task Board** (Trello/Jira-like)
- Multiple columns (To Do, In Progress, Done)
- Add/edit/delete tasks within columns
- Drag & drop tasks between columns
- Tags/labels with color coding
- Task count per column
- Persist state in localStorage

### 💡 Kanban Task Board

```javascript
class KanbanBoard {
  constructor(container) {
    this.container = container;
    this.state = this.loadState() || {
      columns: [
        { id: 'todo', title: 'To Do', tasks: [] },
        { id: 'progress', title: 'In Progress', tasks: [] },
        { id: 'done', title: 'Done', tasks: [] }
      ]
    };
    this.draggedTask = null;
    this.dragSourceColumn = null;
    
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="kanban-board" role="region" aria-label="Task board">
        ${this.state.columns.map(col => `
          <div class="kanban-column" data-column="${col.id}"
               aria-label="${col.title} column, ${col.tasks.length} tasks">
            <div class="column-header">
              <h2>${this._sanitize(col.title)} 
                <span class="task-count">${col.tasks.length}</span>
              </h2>
              <button class="btn-add-task" data-column="${col.id}" 
                      aria-label="Add task to ${col.title}">+</button>
            </div>
            <div class="task-list" data-column="${col.id}" role="list"
                 aria-dropeffect="move">
              ${col.tasks.map(task => this.renderTask(task, col.id)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    this.attachListeners();
    this.saveState();
  }
  
  renderTask(task, columnId) {
    return `
      <div class="task-card" draggable="true" data-task-id="${task.id}" 
           data-column="${columnId}" role="listitem" tabindex="0"
           aria-label="Task: ${this._sanitize(task.title)}">
        <div class="task-tags">
          ${(task.tags || []).map(tag => 
            `<span class="tag" style="background:${this.getTagColor(tag)}">${this._sanitize(tag)}</span>`
          ).join('')}
        </div>
        <h3 class="task-title">${this._sanitize(task.title)}</h3>
        ${task.description ? `<p class="task-desc">${this._sanitize(task.description)}</p>` : ''}
        <div class="task-actions">
          <button class="btn-edit" data-task-id="${task.id}" data-column="${columnId}" 
                  aria-label="Edit task">✏️</button>
          <button class="btn-delete" data-task-id="${task.id}" data-column="${columnId}"
                  aria-label="Delete task">🗑</button>
        </div>
      </div>
    `;
  }
  
  attachListeners() {
    // Add task buttons
    this.container.querySelectorAll('.btn-add-task').forEach(btn => {
      btn.addEventListener('click', () => this.addTask(btn.dataset.column));
    });
    
    // Edit buttons
    this.container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editTask(btn.dataset.taskId, btn.dataset.column);
      });
    });
    
    // Delete buttons
    this.container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTask(btn.dataset.taskId, btn.dataset.column);
      });
    });
    
    // Drag & Drop
    this.container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedTask = card.dataset.taskId;
        this.dragSourceColumn = card.dataset.column;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.taskId);
      });
      
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
    });
    
    // Drop zones (task lists)
    this.container.querySelectorAll('.task-list').forEach(list => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.classList.add('drag-over');
        
        // Determine insertion position
        const afterElement = this.getDragAfterElement(list, e.clientY);
        const draggingCard = this.container.querySelector('.dragging');
        if (draggingCard) {
          if (afterElement) {
            list.insertBefore(draggingCard, afterElement);
          } else {
            list.appendChild(draggingCard);
          }
        }
      });
      
      list.addEventListener('dragleave', (e) => {
        if (!list.contains(e.relatedTarget)) {
          list.classList.remove('drag-over');
        }
      });
      
      list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');
        
        const targetColumn = list.dataset.column;
        this.moveTask(this.draggedTask, this.dragSourceColumn, targetColumn);
      });
    });
    
    // Keyboard: Enter to move between columns
    this.container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.moveTaskToNextColumn(card.dataset.taskId, card.dataset.column, 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.moveTaskToNextColumn(card.dataset.taskId, card.dataset.column, -1);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          this.deleteTask(card.dataset.taskId, card.dataset.column);
        }
      });
    });
  }
  
  getDragAfterElement(list, y) {
    const cards = [...list.querySelectorAll('.task-card:not(.dragging)')];
    
    return cards.reduce((closest, card) => {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: card };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  addTask(columnId) {
    const title = prompt('Task title:');
    if (!title?.trim()) return;
    
    const tags = prompt('Tags (comma separated):')?.split(',').map(t => t.trim()).filter(Boolean) || [];
    const description = prompt('Description (optional):') || '';
    
    const column = this.state.columns.find(c => c.id === columnId);
    column.tasks.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: title.trim(),
      description: description.trim(),
      tags,
      createdAt: new Date().toISOString()
    });
    
    this.render();
  }
  
  editTask(taskId, columnId) {
    const column = this.state.columns.find(c => c.id === columnId);
    const task = column.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newTitle = prompt('Edit title:', task.title);
    if (newTitle === null) return;
    
    const newTags = prompt('Edit tags:', (task.tags || []).join(', '));
    const newDesc = prompt('Edit description:', task.description || '');
    
    task.title = newTitle.trim() || task.title;
    task.tags = newTags?.split(',').map(t => t.trim()).filter(Boolean) || task.tags;
    task.description = newDesc?.trim() || '';
    
    this.render();
  }
  
  deleteTask(taskId, columnId) {
    const column = this.state.columns.find(c => c.id === columnId);
    column.tasks = column.tasks.filter(t => t.id !== taskId);
    this.render();
  }
  
  moveTask(taskId, fromColumnId, toColumnId) {
    if (fromColumnId === toColumnId) return;
    
    const fromColumn = this.state.columns.find(c => c.id === fromColumnId);
    const toColumn = this.state.columns.find(c => c.id === toColumnId);
    
    const taskIndex = fromColumn.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const [task] = fromColumn.tasks.splice(taskIndex, 1);
    toColumn.tasks.push(task);
    
    this.render();
  }
  
  moveTaskToNextColumn(taskId, currentColumnId, direction) {
    const colIndex = this.state.columns.findIndex(c => c.id === currentColumnId);
    const targetIndex = colIndex + direction;
    
    if (targetIndex >= 0 && targetIndex < this.state.columns.length) {
      this.moveTask(taskId, currentColumnId, this.state.columns[targetIndex].id);
    }
  }
  
  getTagColor(tag) {
    const colors = {
      'bug': '#ff4444', 'feature': '#4CAF50', 'urgent': '#FF9800',
      'design': '#9C27B0', 'backend': '#2196F3', 'frontend': '#00BCD4'
    };
    return colors[tag.toLowerCase()] || '#757575';
  }
  
  saveState() {
    try {
      localStorage.setItem('kanban-state', JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }
  
  loadState() {
    try {
      const saved = localStorage.getItem('kanban-state');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
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
- Target FE = **Kanban Board + Drag & Drop + localStorage persistence**
- **Drag & Drop**: `dragstart`/`dragover`/`drop` events, `getDragAfterElement` for insertion position
- **Insertion detection**: find the card whose vertical center is closest below the cursor
- **Keyboard navigation**: ArrowLeft/Right moves task between columns — accessibility
- **localStorage**: save on every render, load on init — simple persistence
- **Tag colors**: predefined color map for common tags, gray fallback
- **Task count**: displayed in column header with live update
- Target interviews: **machine coding is the deciding round** — clean code + complete features

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Kanban, Drag & Drop, localStorage |
| Technical | Medium-Hard | React Patterns, State Management |
| HM | Medium | Culture Fit |
