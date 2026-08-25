# 420 – React Fiber Architecture — The Reconciliation Engine

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**React Fiber** is a complete rewrite of React's core algorithm (React 16+). It replaces the old synchronous, recursive "stack reconciler" with an incremental, interruptible work loop. Fiber treats each component as a unit of work that can be paused, resumed, or aborted — enabling concurrent rendering.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── FIBER NODE (simplified internal structure) ────
interface FiberNode {
  tag: number;           // FunctionComponent, ClassComponent, HostComponent...
  type: Function | string; // component function or 'div', 'span'
  key: string | null;
  stateNode: any;        // DOM node for hosts, instance for classes
  
  // Family tree (linked list, not tree)
  return: FiberNode | null;   // parent fiber
  child: FiberNode | null;    // first child
  sibling: FiberNode | null;  // next sibling
  
  // Work tracking
  pendingProps: any;
  memoizedProps: any;
  memoizedState: any;
  updateQueue: any;
  
  // Effects
  flags: number;         // Placement, Update, Deletion
  subtreeFlags: number;  // bubbled flags from children
  
  // Priority
  lanes: number;         // priority lane bitmask
  alternate: FiberNode | null; // double-buffering (current ↔ workInProgress)
}

// ──── TWO PHASES ────
// Phase 1: RENDER (interruptible)
// - Walk the fiber tree
// - Call component functions / render methods
// - Calculate diffs (reconciliation)
// - Build list of effects (DOM mutations needed)
// - Can be paused, resumed, aborted

// Phase 2: COMMIT (synchronous, uninterruptible)
// - Apply all collected effects to DOM
// - Call lifecycle methods (useLayoutEffect, componentDidMount)
// - Must be atomic — user sees consistent UI

// ──── WORK LOOP (simplified) ────
function workLoop(deadline: IdleDeadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  
  if (!nextUnitOfWork && wipRoot) {
    commitRoot(); // Phase 2: apply all changes
  }
  
  requestIdleCallback(workLoop); // schedule next chunk
}

// ──── DOUBLE BUFFERING ────
// React maintains TWO fiber trees:
// "current" — what's on screen now
// "workInProgress" — being built for next update
// On commit, workInProgress becomes current (pointer swap)
```

### Old Stack vs Fiber
| Aspect | Stack Reconciler | Fiber |
|---|---|---|
| **Rendering** | Synchronous, recursive | Incremental, interruptible |
| **Structure** | Call stack | Linked list |
| **Priority** | None | Lane-based priorities |
| **Concurrent** | No | Yes |
| **Pausing** | Impossible | Built-in |

### Fiber Tree Structure
```
         App (fiber)
        /    \
  Header    Content (fiber)
              |
            child → Post → sibling → Sidebar
                      |
                    Text
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Fiber restructured React's reconciler from a recursive call stack to an incremental linked-list walk. Each fiber is a unit of work that can be paused/resumed. Two phases: render (interruptible, calculates changes) and commit (synchronous, applies to DOM). Double-buffered: current tree vs. work-in-progress tree."*

## 4. 🧠 MEMORY AID
**"Fiber = linked list of work units. Render phase (interruptible) → Commit phase (atomic). Double buffer: current ↔ WIP. Enables concurrent rendering."**
