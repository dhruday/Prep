# 308 – Browser History / Undo-Redo (Stack-Based)

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Browser history and undo/redo are classic **two-stack** problems. Back stack holds visited pages; forward stack holds pages after pressing back. Undo uses a history stack and redo stack. Navigating to a new page clears the forward stack.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Browser History using two stacks
class BrowserHistory {
  private backStack: string[] = [];
  private forwardStack: string[] = [];
  private current: string;

  constructor(homepage: string) { this.current = homepage; }

  visit(url: string): void {
    this.backStack.push(this.current);
    this.current = url;
    this.forwardStack = []; // clear forward on new visit
  }

  back(steps: number): string {
    while (steps > 0 && this.backStack.length > 0) {
      this.forwardStack.push(this.current);
      this.current = this.backStack.pop()!;
      steps--;
    }
    return this.current;
  }

  forward(steps: number): string {
    while (steps > 0 && this.forwardStack.length > 0) {
      this.backStack.push(this.current);
      this.current = this.forwardStack.pop()!;
      steps--;
    }
    return this.current;
  }
}

// Undo-Redo for Text Editor
class UndoRedoEditor {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private content: string = '';

  type(text: string): void {
    this.undoStack.push(this.content);
    this.content += text;
    this.redoStack = [];
  }

  undo(): string {
    if (this.undoStack.length === 0) return this.content;
    this.redoStack.push(this.content);
    this.content = this.undoStack.pop()!;
    return this.content;
  }

  redo(): string {
    if (this.redoStack.length === 0) return this.content;
    this.undoStack.push(this.content);
    this.content = this.redoStack.pop()!;
    return this.content;
  }

  getContent(): string { return this.content; }
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Browser history and undo/redo both use two stacks. Back/undo pops from history and pushes to forward/redo. New action clears forward/redo stack. All operations O(1) per step."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: State management with undo/redo
interface AppState { items: string[]; }
class StateHistory {
  private past: AppState[] = [];
  private future: AppState[] = [];
  constructor(private current: AppState) {}

  push(newState: AppState) {
    this.past.push(this.current);
    this.current = newState;
    this.future = [];
  }
  undo(): AppState {
    if (!this.past.length) return this.current;
    this.future.push(this.current);
    this.current = this.past.pop()!;
    return this.current;
  }
  redo(): AppState {
    if (!this.future.length) return this.current;
    this.past.push(this.current);
    this.current = this.future.pop()!;
    return this.current;
  }
}
```

## 5. 🧠 MEMORY AID
**"Two stacks: history + forward. Navigate new → clear forward. Back: pop history, push forward. Forward: reverse."**

## 6. 🎯 COMPLEXITY
All operations: O(1) amortized | Space: O(n) for n states
