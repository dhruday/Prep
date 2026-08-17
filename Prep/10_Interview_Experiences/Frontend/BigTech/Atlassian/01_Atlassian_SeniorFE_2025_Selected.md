# Atlassian — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Frontend Developer |
| **Level** | P5 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Atlassian-Interview-Questions-E115699.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Values Interview + Coding + System Design + Manager + Team Fit)
- **Timeline:** 3 weeks
- **Format:** Virtual
- **Note:** Atlassian values interview is PASS/FAIL. Know the 5 values cold.

---

## Round 1: Values Interview
**Duration:** 45 minutes | **Interviewers:** 2 (non-technical)

### Atlassian's 5 Values
```
1. Open company, no bullshit
2. Build with heart and balance  
3. Don't #@!% the customer
4. Play, as a team
5. Be the change you seek
```

### Questions Asked
1. **"Tell me about a time you gave brutally honest feedback"** (Open company, no bullshit)
2. **"Tell me about a time you prioritized customer needs over team convenience"** (Don't f*** the customer)
3. **"How do you handle disagreements within your team?"** (Play, as a team)

### 💡 Interview-Ready Answer — Honest Feedback (STAR)

> **Situation:** During code review, I noticed a senior colleague's PR had a potential security vulnerability — user input was being interpolated directly into SQL queries through a custom ORM wrapper. The team typically auto-approved this person's PRs.
>
> **Task:** Give direct feedback without damaging the relationship, while ensuring the vulnerability was fixed.
>
> **Action:** I commented directly on the PR with a clear explanation: "This line is vulnerable to SQL injection. Here's a reproduction: [test case]. Here's the fix: [parameterized query example]." I tagged it as "blocking" rather than a suggestion. I also DM'd the person: "Just flagged something on your PR — no judgment, this wrapper makes it easy to miss. I almost made the same mistake last month."
>
> **Result:** They appreciated the directness. We added a linting rule (eslint-plugin-security) that caught 3 similar issues in existing code. The custom ORM wrapper was updated to use parameterized queries by default. Security incident prevented.

---

## Round 2: Frontend Coding
**Duration:** 60 minutes

### Questions Asked
1. **Build a Kanban Board with drag-and-drop** (like Jira/Trello)
   - Columns: To Do, In Progress, Done. Cards can be dragged between columns.

### 💡 Interview-Ready Answer

```javascript
class KanbanBoard {
  constructor(container) {
    this.container = container;
    this.data = {
      columns: [
        { id: 'todo', title: 'To Do', cards: [
          { id: '1', title: 'Setup CI/CD', assignee: 'Alice', priority: 'high' },
          { id: '2', title: 'Write tests', assignee: 'Bob', priority: 'medium' }
        ]},
        { id: 'inprogress', title: 'In Progress', cards: [
          { id: '3', title: 'Build API', assignee: 'Alice', priority: 'high' }
        ]},
        { id: 'done', title: 'Done', cards: [] }
      ]
    };
    
    this.draggedCard = null;
    this.sourceColumn = null;
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="kanban-board" role="application" aria-label="Kanban Board">
        ${this.data.columns.map(col => this.renderColumn(col)).join('')}
      </div>
    `;
    this.attachDragEvents();
  }
  
  renderColumn(column) {
    return `
      <div class="kanban-column" data-column-id="${column.id}"
           role="listbox" aria-label="${column.title}">
        <div class="column-header">
          <h3>${column.title}</h3>
          <span class="card-count">${column.cards.length}</span>
        </div>
        <div class="card-list" data-column-id="${column.id}">
          ${column.cards.map(card => this.renderCard(card)).join('')}
        </div>
        <div class="drop-zone" data-column-id="${column.id}"></div>
      </div>
    `;
  }
  
  renderCard(card) {
    const priorityColors = { high: '#ff4444', medium: '#ffaa00', low: '#44bb44' };
    return `
      <div class="kanban-card" draggable="true" data-card-id="${card.id}"
           role="option" aria-label="${card.title}, assigned to ${card.assignee}"
           tabindex="0">
        <div class="card-priority" style="background: ${priorityColors[card.priority]}"></div>
        <h4 class="card-title">${card.title}</h4>
        <div class="card-meta">
          <span class="card-assignee">${card.assignee}</span>
          <span class="card-badge ${card.priority}">${card.priority}</span>
        </div>
      </div>
    `;
  }
  
  attachDragEvents() {
    // Drag start on cards
    this.container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedCard = e.target.dataset.cardId;
        this.sourceColumn = e.target.closest('.card-list').dataset.columnId;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      card.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
        this.container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
      
      // Keyboard accessibility
      card.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          this.moveCardWithKeyboard(
            card.dataset.cardId,
            card.closest('.card-list').dataset.columnId,
            e.key === 'ArrowRight' ? 1 : -1
          );
        }
      });
    });
    
    // Drop targets
    this.container.querySelectorAll('.card-list').forEach(list => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.classList.add('drag-over');
      });
      
      list.addEventListener('dragleave', () => {
        list.classList.remove('drag-over');
      });
      
      list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');
        const targetColumn = list.dataset.columnId;
        this.moveCard(this.draggedCard, this.sourceColumn, targetColumn);
      });
    });
  }
  
  moveCard(cardId, fromColId, toColId) {
    if (fromColId === toColId) return;
    
    const fromCol = this.data.columns.find(c => c.id === fromColId);
    const toCol = this.data.columns.find(c => c.id === toColId);
    
    const cardIndex = fromCol.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    
    const [card] = fromCol.cards.splice(cardIndex, 1);
    toCol.cards.push(card);
    
    this.render();
    // Announce to screen readers
    this.announce(`Moved "${card.title}" to ${toCol.title}`);
  }
  
  moveCardWithKeyboard(cardId, fromColId, direction) {
    const colIds = this.data.columns.map(c => c.id);
    const fromIdx = colIds.indexOf(fromColId);
    const toIdx = fromIdx + direction;
    
    if (toIdx < 0 || toIdx >= colIds.length) return;
    
    this.moveCard(cardId, fromColId, colIds[toIdx]);
  }
  
  announce(message) {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    document.body.appendChild(announcer);
    setTimeout(() => announcer.remove(), 1000);
  }
}
```

```css
.kanban-board { display: flex; gap: 16px; padding: 16px; overflow-x: auto; }
.kanban-column { min-width: 280px; background: #f4f5f7; border-radius: 8px; padding: 12px; }
.card-list { min-height: 100px; }
.card-list.drag-over { background: #e4e6e9; border-radius: 4px; }
.kanban-card { background: white; border-radius: 4px; padding: 12px; margin-bottom: 8px; 
               box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: grab; transition: opacity 0.2s; }
.kanban-card.dragging { opacity: 0.5; }
.kanban-card:focus-visible { outline: 2px solid #0052CC; outline-offset: 2px; }
.card-priority { width: 4px; height: 100%; position: absolute; left: 0; top: 0; border-radius: 4px 0 0 4px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Confluence-like Collaborative Document Editor**
   - Real-time editing, page tree, mentions, macros, comments

### 💡 Interview-Ready Answer

```
Confluence Editor Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Editor Core: ProseMirror (Atlassian's actual choice)        │
│  Why ProseMirror over ContentEditable:                       │
│  - Schema-driven: define what content is valid               │
│  - Immutable document model: predictable state               │
│  - Transform-based: operations are composable                │
│  - Plugin system: mentions, tables, macros via plugins       │
│                                                                │
│  Document Model:                                              │
│  {                                                            │
│    type: "doc",                                               │
│    content: [                                                 │
│      { type: "heading", attrs: { level: 1 },                │
│        content: [{ type: "text", text: "Sprint Planning" }]  │
│      },                                                       │
│      { type: "paragraph",                                    │
│        content: [                                             │
│          { type: "text", text: "Assigned to " },             │
│          { type: "mention", attrs: { userId: "u1" } },      │
│          { type: "text", text: " for review" }               │
│        ]                                                      │
│      },                                                       │
│      { type: "jira_macro", attrs: { issueKey: "PROJ-123" }} │
│    ]                                                          │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘

Real-Time Collaboration:
- Atlassian uses NbConflict + OT hybrid
- WebSocket: broadcast changes to all editors
- Optimistic local edits + server reconciliation
- Cursor awareness: show other editors' cursors + selections

Page Tree (Left Sidebar):
- Lazy loaded: only fetch children when expanded
- Drag-and-drop reordering
- Breadcrumbs for navigation
- Search within page tree

Macros (Confluence's killer feature):
- {jira:PROJ-123} → renders Jira issue inline
- {code:language=javascript} → syntax-highlighted code block
- {table-of-contents} → auto-generated from headings
- Each macro = iframe sandbox (security isolation)
```

---

## 🎯 Key Takeaways
- Atlassian **Values interview is pass/fail** — prepare STAR stories for all 5 values
- **Kanban board with drag-and-drop** is the signature coding question
- **Keyboard accessibility for drag-and-drop** (Arrow keys) differentiates great candidates
- **ProseMirror** is Atlassian's actual editor — mention it in system design
- **Confluence design** = ProseMirror + OT + page tree + macros
- **aria-live announcements** for drag-and-drop status is important for a11y
- Atlassian values **team culture** heavily — show collaboration in every answer

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Medium-Hard | STAR Stories, 5 Atlassian Values |
| Coding | Medium-Hard | Drag-and-Drop, DOM, DnD API, a11y |
| System Design | Hard | Collaborative Editor, ProseMirror, OT |
| Manager | Medium | Leadership, Team Dynamics |
