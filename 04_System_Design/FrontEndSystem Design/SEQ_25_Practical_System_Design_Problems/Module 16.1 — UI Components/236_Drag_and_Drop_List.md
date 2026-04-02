# 236 – Drag-and-Drop List

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Drag-and-Drop Sortable List allows users to reorder items by dragging them to new positions. It's a focused version of the Kanban board — single-list reordering rather than multi-column. Key design decisions include choosing the **DnD mechanism** (HTML5 DnD API vs Pointer Events vs library), **reorder animation** (smooth transitions as items shift), **drop indicator** (visual feedback for where the item will land), **keyboard alternative** (for accessibility), and **optimistic state updates** with server sync. The core algorithm is `arrayMove(arr, fromIndex, toIndex)`.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌──────────────────────────────┐
│       SortableList           │
│  ┌────────────────────────┐  │
│  │ ≡ Item A               │  │  ← drag handle
│  ├────────────────────────┤  │
│  │ ─ ─ ─ drop zone ─ ─ ─ │  │  ← visual indicator
│  ├────────────────────────┤  │
│  │ ≡ Item B (dragging)    │  │  ← being dragged (opacity + transform)
│  ├────────────────────────┤  │
│  │ ≡ Item C               │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### Three Implementation Approaches

**1. HTML5 Drag and Drop API:**
```typescript
<div draggable onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}>
```
- Quick to implement, native browser support
- Poor mobile support, limited drag preview customization
- `dragenter`/`dragleave` for drop zone highlighting

**2. Pointer Events (Custom Implementation):**
```typescript
// Fully custom — best control, most work
onPointerDown → track clientY → calculate position → move item → onPointerUp
```
- Full control over animations, works on all devices
- Must implement scroll-while-dragging, hit testing, animations

**3. @dnd-kit (Recommended for production):**
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
```
- Best DX, accessible by default, smooth animations
- Small bundle (~8KB gzipped)

### Reorder Algorithm

```typescript
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array];
  const [item] = newArray.splice(from, 1);
  newArray.splice(to, 0, item);
  return newArray;
}

// Usage in handleDragEnd:
const oldIndex = items.indexOf(active.id);
const newIndex = items.indexOf(over.id);
setItems(arrayMove(items, oldIndex, newIndex));
```

### Animation: CSS Transitions on Transform

```css
.sortable-item {
  transition: transform 250ms ease;
}
.sortable-item.dragging {
  opacity: 0.5;
  z-index: 999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
```

When items shift position, their `transform: translateY()` changes — CSS transition animates the shift smoothly.

### Keyboard Accessibility (Critical)

Without keyboard support, DnD is a WCAG violation:
- **Enter/Space** on drag handle: Pick up item (announces "Item picked up, position 2 of 5")
- **Arrow Up/Down**: Move item to new position (announces "Moved to position 3 of 5")
- **Enter/Space again**: Drop item (announces "Item dropped at position 3")
- **Escape**: Cancel, return to original position
- `aria-live="assertive"` for drag state announcements
- Each item: `role="listitem"` with a drag handle button (`aria-roledescription="sortable"`)

### Anti-Patterns

- ❌ No keyboard alternative — accessibility violation
- ❌ Mutating array in place instead of creating new array — React won't re-render
- ❌ Using `position: absolute` for drag instead of `transform` — causes layout reflows
- ❌ No drop indicator — user doesn't know where item will land
- ❌ Re-rendering entire list on every drag move — use `React.memo` on items

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Todoist
Todoist uses drag-and-drop reordering for tasks within projects. They use a custom pointer-event-based implementation with smooth animations. Each task has a drag handle (the grip dots), and keyboard reordering via Ctrl+Arrow keys.

### Hruday @ SAP Labs
SAP Fiori uses `sap.m.List` with `sap.ui.core.dnd` for sortable lists in planning and configuration UIs. The drag-and-drop API in UI5 provides accessibility announcements automatically — understanding this pattern translates directly to building accessible DnD from scratch.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"For a sortable list, I'd use @dnd-kit with `SortableContext` and `verticalListSortingStrategy`. Each item uses the `useSortable` hook which provides `attributes`, `listeners`, `transform`, and `transition` — giving smooth CSS-animated reordering.*

*The core algorithm is `arrayMove(items, fromIndex, toIndex)` — splice the item out and insert at the new position. Immutable update for React re-rendering.*

*Animation: @dnd-kit applies `transform: translateY()` with CSS transitions on items that shift position. The dragged item gets reduced opacity and elevated shadow.*

*Keyboard: Space picks up the item, Arrow keys reposition, Space drops. @dnd-kit provides this out of the box with aria-live announcements ('Item moved to position 3 of 5').*

*For server sync, I send a PATCH with the new order after drop. Optimistic update — if server fails, revert to previous order. For fractional indexing, each item has a float position to avoid re-indexing all items."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableList({ items, onReorder }: { items: string[]; onReorder: (items: string[]) => void }) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul role="list" aria-label="Sortable list">
          {items.map(id => <SortableItem key={id} id={id} />)}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}
        role="listitem" aria-roledescription="sortable item">
      ≡ {id}
    </li>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"DnD List = arrayMove + @dnd-kit + Keyboard Alt + Transform Animations."** Core: `arrayMove(items, from, to)`. Use @dnd-kit for accessibility + smooth animations. CSS `transform: translateY()` with transitions for shifting items. Keyboard: Space to grab, Arrows to move, Space to drop, Escape to cancel. aria-live announcements for each move. Optimistic update with server revert on failure.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Tests fundamental interaction design, animation performance, accessibility (keyboard DnD), and state management — common in task management and configuration UIs.
**How:** `arrayMove` for immutable reordering. @dnd-kit for DnD mechanics. CSS transform transitions for animation. Keyboard alternative with aria-live announcements. Optimistic updates with server sync.
**Companies:** Microsoft (Planner, To Do), Adobe (layer ordering), Salesforce (field ordering), Cisco (priority lists).
