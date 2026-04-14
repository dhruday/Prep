# Atlassian — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | P5 Frontend Engineer |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Atlassian-Interview-Questions) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Values + Katas + System Design + Coding + HM)
- **Timeline:** 3 weeks

---

## Round 1: Values Interview
**Duration:** 45 minutes

### Key Atlassian Values Tested
1. **"Don't #@!% the customer"** — Tell about a time you prioritized customer needs
2. **"Build with heart and balance"** — How do you handle competing priorities?
3. **"Be the change you seek"** — When did you drive a change without being asked?
4. **"Play as a team"** — How do you handle disagreements with teammates?

### 💡 Preparation Framework
Use **STAR format** with Atlassian-specific values vocabulary:
- Always tie stories back to **customer impact** (not just technical outcomes)
- Show **initiative**: "I noticed... so I proposed..."
- Show **balance**: "We had to weigh X vs Y, and we chose... because customer impact..."
- Include **metrics**: "This reduced support tickets by 40%"

---

## Round 2: Frontend Katas
**Duration:** 90 minutes

### Questions Asked
1. **Build a Kanban Board with Drag and Drop** (like Jira Board)
   - Columns: To Do, In Progress, Code Review, Done
   - Cards: title, assignee, priority, labels
   - Drag cards between columns and reorder within columns
   - Optimistic UI: update immediately, sync with server

### 💡 Interview-Ready Answer

```jsx
function KanbanBoard({ boardId }) {
  const [columns, setColumns] = useState({
    'todo': { id: 'todo', title: 'To Do', taskIds: [] },
    'in-progress': { id: 'in-progress', title: 'In Progress', taskIds: [] },
    'review': { id: 'review', title: 'Code Review', taskIds: [] },
    'done': { id: 'done', title: 'Done', taskIds: [] },
  });
  const [tasks, setTasks] = useState({});
  const [dragState, setDragState] = useState(null);
  
  // Drag and Drop using native HTML5 API (no library)
  const handleDragStart = (e, taskId, sourceColumnId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId, sourceColumnId }));
    setDragState({ taskId, sourceColumnId });
    
    // Ghost image
    const ghost = e.target.cloneNode(true);
    ghost.classList.add('drag-ghost');
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 50, 20);
    requestAnimationFrame(() => ghost.remove());
  };
  
  const handleDragOver = (e, targetColumnId, targetIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => prev ? { ...prev, targetColumnId, targetIndex } : null);
  };
  
  const handleDrop = async (e, targetColumnId, targetIndex) => {
    e.preventDefault();
    
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { taskId, sourceColumnId } = data;
    
    if (sourceColumnId === targetColumnId && targetIndex === columns[sourceColumnId].taskIds.indexOf(taskId)) {
      setDragState(null);
      return; // No change
    }
    
    // Optimistic update
    setColumns(prev => {
      const updated = { ...prev };
      const sourceTaskIds = [...updated[sourceColumnId].taskIds];
      const sourceIndex = sourceTaskIds.indexOf(taskId);
      sourceTaskIds.splice(sourceIndex, 1);
      updated[sourceColumnId] = { ...updated[sourceColumnId], taskIds: sourceTaskIds };
      
      const targetTaskIds = sourceColumnId === targetColumnId 
        ? sourceTaskIds 
        : [...updated[targetColumnId].taskIds];
      
      const adjustedIndex = targetIndex !== undefined ? targetIndex : targetTaskIds.length;
      targetTaskIds.splice(adjustedIndex, 0, taskId);
      updated[targetColumnId] = { ...updated[targetColumnId], taskIds: targetTaskIds };
      
      return updated;
    });
    
    setDragState(null);
    
    // Sync with server (fire-and-forget with retry)
    try {
      await fetch(`/api/boards/${boardId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, targetColumn: targetColumnId, position: targetIndex }),
      });
    } catch {
      // Revert optimistic update on failure
      // In production: use state snapshot for rollback
      console.error('Failed to sync. Reverting...');
      // fetchBoardState(); // Refetch full state
    }
  };
  
  // Keyboard accessible drag
  const handleKeyboardMove = (taskId, columnId, direction) => {
    const columnOrder = Object.keys(columns);
    const currentIdx = columnOrder.indexOf(columnId);
    
    if (direction === 'left' && currentIdx > 0) {
      const targetCol = columnOrder[currentIdx - 1];
      handleDrop(null, targetCol, columns[targetCol].taskIds.length);
    } else if (direction === 'right' && currentIdx < columnOrder.length - 1) {
      const targetCol = columnOrder[currentIdx + 1];
      handleDrop(null, targetCol, columns[targetCol].taskIds.length);
    }
  };
  
  return (
    <div className="kanban-board" role="region" aria-label="Kanban board">
      {Object.values(columns).map(column => (
        <div
          key={column.id}
          className={`kanban-column ${dragState?.targetColumnId === column.id ? 'drop-target' : ''}`}
          onDragOver={(e) => handleDragOver(e, column.id, column.taskIds.length)}
          onDrop={(e) => handleDrop(e, column.id, column.taskIds.length)}
          role="list"
          aria-label={`${column.title} (${column.taskIds.length})`}
        >
          <div className="column-header">
            <h3>{column.title}</h3>
            <span className="count">{column.taskIds.length}</span>
          </div>
          
          <div className="column-body">
            {column.taskIds.map((taskId, index) => {
              const task = tasks[taskId];
              if (!task) return null;
              
              return (
                <div
                  key={taskId}
                  className={`kanban-card ${dragState?.taskId === taskId ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, taskId, column.id)}
                  onDragOver={(e) => handleDragOver(e, column.id, index)}
                  onDrop={(e) => handleDrop(e, column.id, index)}
                  role="listitem"
                  aria-label={`${task.title}, priority: ${task.priority}, assignee: ${task.assignee}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') handleKeyboardMove(taskId, column.id, 'left');
                    if (e.key === 'ArrowRight') handleKeyboardMove(taskId, column.id, 'right');
                  }}
                >
                  <div className="card-header">
                    <span className={`priority priority-${task.priority}`}>{task.priority}</span>
                    <span className="task-id">{task.displayId}</span>
                  </div>
                  <h4 className="card-title">{task.title}</h4>
                  <div className="card-footer">
                    <div className="labels">
                      {task.labels?.map(label => (
                        <span key={label} className="label">{label}</span>
                      ))}
                    </div>
                    {task.assignee && (
                      <img src={task.assigneeAvatar} alt={task.assignee} className="avatar" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- Atlassian FE = **Values interview is critical** — prepare 4 strong STAR stories aligned to Atlassian values
- **Kanban Board**: native HTML5 drag-and-drop, optimistic UI, keyboard accessible
- **Optimistic update pattern**: update state immediately, sync with server async, rollback on failure
- **Keyboard accessibility**: Arrow keys to move cards between columns
- **Drop indicator**: show where card will land during drag
- Atlassian values **quality code + customer empathy** = both tested
- Know **Atlassian Design System (ADG)** and **Atlaskit** — their open-source React component library
- **Confluence editor** uses ProseMirror → know collaborative editing basics

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Medium | STAR, Atlassian Values |
| Frontend Katas | Hard | Kanban, Drag & Drop, Optimistic UI |
| System Design | Hard | Real-Time Board, WebSocket |
| Coding | Medium | DS/Algo, Graph Traversal |
| HM | Medium | Career Growth, Culture Fit |
