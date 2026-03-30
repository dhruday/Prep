# 259 – Handling Unknown Requirements

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

In machine coding rounds, requirements are intentionally vague or incomplete — interviewers want to see how you handle ambiguity. Senior engineers don't freeze or make wild assumptions; they **(1) ask targeted clarifying questions**, **(2) state explicit assumptions**, **(3) design for flexibility** so pivots are cheap, and **(4) build in layers** — core first, extensions later. The ability to make progress despite uncertainty is a key senior engineer signal.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### What Interviewers Test With Ambiguity

They test:
1. **Can you identify what's missing?** (requirements analysis)
2. **Can you ask the right questions?** (not too many, not too few)
3. **Can you make reasonable assumptions?** (business sense)
4. **Can you design flexibly?** (architecture adaptability)

### The ACRE Framework

**A – Ask (2-3 targeted questions):**
```
"Should the search be client-side filtering or server-side with an API?"
"Is this single-user or collaborative?"
"What's the expected data volume — tens, hundreds, or thousands of items?"
```

**C – Clarify scope:**
```
"I'll focus on the core feature first (add/remove items) and 
 then extend to filtering and sorting if time permits."
```

**R – Record assumptions:**
```typescript
// ASSUMPTIONS:
// 1. Single-user application (no WebSocket sync needed)
// 2. Data fits in memory (< 1000 items, no virtualization needed)
// 3. Modern browser (ES2020+, no IE11 polyfills)
// 4. REST API available at /api/items
```

**E – Engineer for extension:**
```typescript
// Design decisions that keep pivots cheap:
// 1. Data layer separated from UI — easy to swap client/server filtering
// 2. Component props, not global state — easy to make into a library
// 3. Generic types — easy to adapt to different data shapes
```

### Designing for the Pivot

```typescript
// Build abstractions at boundaries where requirements might change

// Instead of hardcoding the data source:
function useItems() {
  // Today: in-memory
  const [items, setItems] = useState<Item[]>(initialItems);
  return { items, addItem, removeItem };
  // Tomorrow: could swap to API fetch without changing consumers
}

// Instead of hardcoding filter logic:
type FilterFn<T> = (item: T) => boolean;
function useFilteredList<T>(items: T[], filters: FilterFn<T>[]) {
  return useMemo(() => items.filter(item => filters.every(f => f(item))), [items, filters]);
}
```

### The MVP → Extend Strategy

```
Time 0-3 min:   Clarify + Assumptions + Plan
Time 3-25 min:  MVP — core feature working end-to-end
Time 25-35 min: Extension 1 — most likely follow-up requirement
Time 35-45 min: Polish — edge cases, accessibility, error states
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, many requirements from product owners were intentionally high-level ("build a dashboard for monitoring"). I'd ask 3-5 targeted questions about data sources, user roles, and update frequency, state assumptions, then build the core in sprint 1 and extend in sprint 2. This is exactly the ACRE process.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"When requirements are vague, I follow the ACRE framework: Ask 2-3 targeted questions (data volume, single vs. multi-user, client vs. server), Clarify scope (core feature first, extensions if time), Record assumptions as comments at the top of my code, and Engineer for extension by separating data layer from UI. I build MVP first, then layer on features. This approach lets me make steady progress without over-engineering for unknown requirements."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// ASSUMPTIONS (stated at top of file):
// 1. Single-user, no real-time sync
// 2. Items < 500 (in-memory filtering is fine)
// 3. REST API at /api/todos (but starting with local state)

// Designed for extension — data source is abstracted
function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Today: local state. Later: swap to API with zero component changes
  const addTodo = useCallback((text: string) => {
    setTodos(prev => [...prev, { id: crypto.randomUUID(), text, completed: false, createdAt: new Date() }]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  return { todos, addTodo, toggleTodo };
}

// Filter logic abstracted — easy to add new filters
function useFilteredTodos(todos: Todo[], filter: 'all' | 'active' | 'completed') {
  return useMemo(() => {
    switch (filter) {
      case 'active': return todos.filter(t => !t.completed);
      case 'completed': return todos.filter(t => t.completed);
      default: return todos;
    }
  }, [todos, filter]);
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"ACRE = Ask, Clarify scope, Record assumptions, Engineer for extension."** Ask 2-3 targeted questions (not 10). Clarify: "Core first, extensions if time." Record: comment block at top of file. Engineer: separate data layer from UI, use generics, keep pivot cost low. Build MVP → Extend → Polish.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Interviewers deliberately give vague requirements to test how you handle ambiguity — a daily reality in production.
**How:** ACRE framework (Ask, Clarify, Record, Engineer). MVP first, extend later. Abstract at boundaries where requirements might change.
**Companies:** All four companies test this. Ambiguous requirements are especially common at Microsoft and Adobe.
