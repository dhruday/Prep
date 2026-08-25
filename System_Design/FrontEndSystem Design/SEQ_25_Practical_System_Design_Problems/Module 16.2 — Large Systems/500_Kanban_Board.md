# 500 – Kanban Board (Trello/Jira) Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Kanban board (Trello, Jira, Linear) tests **drag-and-drop** (cross-column reorder, smooth animations, touch support), **optimistic updates** (card move reflected instantly, reconciled with server), **real-time collaboration** (WebSocket for card changes by other users), **virtualization** (boards with hundreds of cards per column), and **complex state management** (board → columns → cards hierarchy with cross-column moves). The key challenge is making drag-and-drop feel instant and natural across columns while keeping multiple collaborators in sync.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Kanban Board Shell                         │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Board Header: "Sprint 42" | Filters | Members | ⚙       ││
│  ├──────────────────────────────────────────────────────────┤│
│  │                                                          ││
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    ││
│  │ │ Backlog  │ │ To Do    │ │ In Prog  │ │ Done     │    ││
│  │ │ (12)     │ │ (8)      │ │ (5) ⚠    │ │ (23)     │    ││
│  │ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤    ││
│  │ │┌────────┐│ │┌────────┐│ │┌────────┐│ │┌────────┐│    ││
│  │ ││ CARD-1 ││ ││ CARD-5 ││ ││ CARD-9 ││ ││ CARD-15││    ││
│  │ ││ 🏷 Bug ││ ││ 🏷 Feat││ ││ 🏷 Feat││ ││ 🏷 Bug ││    ││
│  │ ││ 👤 Alice││ ││ 👤 Bob ││ ││ 👤 Carol││ ││ 👤 Dave││    ││
│  │ │└────────┘│ │└────────┘│ │└────────┘│ │└────────┘│    ││
│  │ │┌────────┐│ │┌────────┐│ │          │ │          │    ││
│  │ ││ CARD-2 ││ ││ CARD-6 ││ │ + Add    │ │          │    ││
│  │ ││        ││ ││        ││ │   card   │ │          │    ││
│  │ │└────────┘│ │└────────┘│ │          │ │          │    ││
│  │ │          │ │          │ │          │ │          │    ││
│  │ │ + Add    │ │ + Add    │ │          │ │          │    ││
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘    ││
│  │                  ←── Horizontal scroll ──→               ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface Board {
  id: string;
  name: string;
  columns: Column[];
  members: User[];
  labels: Label[];
}

interface Column {
  id: string;
  name: string;
  position: number;            // sort order
  wipLimit?: number;           // work-in-progress limit
  cardIds: string[];           // ordered card IDs
}

interface Card {
  id: string;
  title: string;
  description?: string;        // markdown
  columnId: string;
  position: number;            // position within column (float for insert-between)
  assignees: User[];
  labels: Label[];
  dueDate?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  attachments: Attachment[];
  commentCount: number;
  checklistProgress?: { done: number; total: number };
  coverImage?: string;
}
```

### Drag-and-Drop with @dnd-kit

```typescript
import {
  DndContext, DragOverlay, closestCorners,
  useSensor, useSensors, PointerSensor, KeyboardSensor,
  DragStartEvent, DragOverEvent, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';

function KanbanBoard({ board }: { board: Board }) {
  const [columns, setColumns] = useState(board.columns);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const moveCardMutation = useMoveCard();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px deadzone
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = findCard(columns, event.active.id as string);
    setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumnContaining(columns, active.id as string);
    const overCol = findColumnContaining(columns, over.id as string)
      ?? columns.find(c => c.id === over.id); // dropped on column header

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    // Move card across columns optimistically
    setColumns(prev => {
      const next = structuredClone(prev);
      const srcCol = next.find(c => c.id === activeCol.id)!;
      const dstCol = next.find(c => c.id === overCol.id)!;

      const cardIdx = srcCol.cardIds.indexOf(active.id as string);
      srcCol.cardIds.splice(cardIdx, 1);
      dstCol.cardIds.push(active.id as string);

      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const column = findColumnContaining(columns, active.id as string);
    if (!column) return;

    // Reorder within column
    const oldIdx = column.cardIds.indexOf(active.id as string);
    const newIdx = column.cardIds.indexOf(over.id as string);

    if (oldIdx !== newIdx) {
      setColumns(prev => {
        const next = structuredClone(prev);
        const col = next.find(c => c.id === column.id)!;
        col.cardIds = arrayMove(col.cardIds, oldIdx, newIdx);
        return next;
      });
    }

    // Persist to server
    moveCardMutation.mutate({
      cardId: active.id as string,
      targetColumnId: column.id,
      position: calculatePosition(column.cardIds, active.id as string),
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="board" style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      {/* Ghost preview during drag */}
      <DragOverlay>
        {activeCard && <CardPreview card={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}
```

### Column Component with WIP Limits

```typescript
function KanbanColumn({ column }: { column: Column }) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const cards = useCards(column.cardIds); // fetch card details

  const isOverWipLimit = column.wipLimit
    ? column.cardIds.length > column.wipLimit
    : false;

  return (
    <div
      ref={setNodeRef}
      className={`column ${isOverWipLimit ? 'column--over-wip' : ''}`}
      style={{ width: 280, minHeight: 200, flexShrink: 0 }}
      role="list"
      aria-label={`${column.name}, ${column.cardIds.length} cards`}
    >
      <header className="column-header">
        <h3>{column.name}</h3>
        <span className="card-count">
          {column.cardIds.length}
          {column.wipLimit && ` / ${column.wipLimit}`}
        </span>
      </header>

      <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
        <div className="column-cards">
          {cards.map(card => (
            <SortableCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>

      <button className="add-card" onClick={() => openNewCardModal(column.id)}>
        + Add card
      </button>
    </div>
  );
}

function SortableCard({ card }: { card: Card }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="listitem"
      className="card"
    >
      {card.coverImage && (
        <img src={card.coverImage} alt="" className="card-cover" loading="lazy" />
      )}
      <h4 className="card-title">{card.title}</h4>
      <div className="card-meta">
        {card.labels.map(l => (
          <span key={l.id} className="label" style={{ background: l.color }}>{l.name}</span>
        ))}
      </div>
      <div className="card-footer">
        {card.dueDate && <span className="due-date">📅 {card.dueDate}</span>}
        {card.commentCount > 0 && <span>💬 {card.commentCount}</span>}
        {card.checklistProgress && (
          <span>☑ {card.checklistProgress.done}/{card.checklistProgress.total}</span>
        )}
        {card.assignees.map(a => (
          <img key={a.id} src={a.avatarUrl} alt={a.name} className="avatar" width={24} height={24} />
        ))}
      </div>
    </div>
  );
}
```

### Optimistic Move with Server Reconciliation

```typescript
function useMoveCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, targetColumnId, position }: MoveCardParams) =>
      api.patch(`/cards/${cardId}/move`, { columnId: targetColumnId, position }),

    onMutate: async ({ cardId, targetColumnId, position }) => {
      await queryClient.cancelQueries({ queryKey: ['board'] });
      const prev = queryClient.getQueryData(['board']);

      // Optimistic: already applied in handleDragOver/End
      // Just save snapshot for rollback
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      // Rollback to previous state
      queryClient.setQueryData(['board'], ctx?.prev);
      toast.error('Failed to move card. Reverted.');
    },

    onSettled: () => {
      // Refetch to reconcile with server state
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

// Position calculation using fractional indexing
// (avoids rewriting all positions on every move)
function calculatePosition(cardIds: string[], cardId: string): number {
  const idx = cardIds.indexOf(cardId);
  const prevPos = idx > 0 ? getCardPosition(cardIds[idx - 1]) : 0;
  const nextPos = idx < cardIds.length - 1
    ? getCardPosition(cardIds[idx + 1])
    : prevPos + 1024;

  return (prevPos + nextPos) / 2; // Fractional position between neighbors
}
```

### Real-Time Board Updates (WebSocket)

```typescript
function useBoardSync(boardId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/ws/boards/${boardId}`);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      switch (msg.type) {
        case 'CARD_MOVED':
          queryClient.setQueryData(['board'], (old: Board) => {
            // Move card from source column to target column
            const next = structuredClone(old);
            const srcCol = next.columns.find(c => c.id === msg.fromColumnId)!;
            const dstCol = next.columns.find(c => c.id === msg.toColumnId)!;
            srcCol.cardIds = srcCol.cardIds.filter(id => id !== msg.cardId);
            dstCol.cardIds.splice(msg.position, 0, msg.cardId);
            return next;
          });
          break;

        case 'CARD_CREATED':
          queryClient.setQueryData(['board'], (old: Board) => {
            const next = structuredClone(old);
            const col = next.columns.find(c => c.id === msg.columnId)!;
            col.cardIds.push(msg.cardId);
            return next;
          });
          break;

        case 'CARD_UPDATED':
          queryClient.setQueryData(['card', msg.cardId], msg.card);
          break;

        case 'USER_DRAGGING':
          // Show ghost indicator of another user dragging
          showDragIndicator(msg.user, msg.cardId, msg.column);
          break;
      }
    };

    return () => ws.close();
  }, [boardId, queryClient]);
}
```

### Anti-Patterns

- ❌ Using HTML5 native drag-and-drop — inconsistent across browsers, no touch, poor animation. Use @dnd-kit or react-beautiful-dnd.
- ❌ Rewriting all card positions on every move — use fractional indexing (`(prev + next) / 2`).
- ❌ No optimistic update — card snaps back and forth during server round-trip. Apply move immediately, rollback on error.
- ❌ Loading all card details for all columns upfront — load card bodies on-demand (click to open).
- ❌ No WIP limit enforcement — visual indicator + optional blocking when column exceeds limit.
- ❌ Ignoring keyboard DnD — @dnd-kit's KeyboardSensor enables full keyboard accessibility.

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Trello
- Drag-and-drop: custom implementation (previously react-beautiful-dnd by Atlassian)
- Fractional indexing for card positions (65536-based)
- WebSocket for real-time board updates
- Power-ups (plugin system) for extensibility

### Jira Board
- Server-driven board configuration (column mapping to workflow states)
- Swimlanes (horizontal grouping by assignee, epic, priority)
- Sprint boundaries with drag-to-sprint

### Linear
- Keyboard-first UX (Ctrl+K command palette, shortcuts for everything)
- Ultra-fast local SQLite cache (WASM)
- Optimistic everything — feels like a native app

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design a Kanban board around three core systems: drag-and-drop, optimistic state management, and real-time sync.*

*DnD: @dnd-kit with PointerSensor (5px deadzone to distinguish click from drag) and KeyboardSensor for accessibility. `DndContext` wraps the board, `SortableContext` per column for within-column reorder, `DragOverlay` for the ghost preview. Cross-column moves handled in `onDragOver` by updating column card arrays.*

*State: Board stored as columns with ordered cardIds. Card moves update local state immediately (optimistic). Server persistence fires in `onDragEnd`. Position uses fractional indexing — insert between neighbors as `(prev + next) / 2` — so only the moved card's position changes, not all cards in the column.*

*Real-time: WebSocket per board. Events: CARD_MOVED, CARD_CREATED, CARD_UPDATED, USER_DRAGGING. On CARD_MOVED, patch the column cardIds arrays in the query cache.*

*At SAP, I built a similar task board for project management in Fiori — DnD with accessible keyboard support was required for WCAG AA, and we used fractional indexing to avoid O(n) position updates."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Kanban board is the most common frontend machine coding / system design question — it tests DnD, optimistic updates, real-time sync, and complex nested state.
**How:** @dnd-kit (PointerSensor + KeyboardSensor) → SortableContext per column → optimistic array splice → fractional indexing positions → WebSocket board sync → TanStack Query cache patching.
**Companies:** Atlassian (Trello, Jira), Linear, Notion, Monday.com, Asana, Microsoft (Planner).
