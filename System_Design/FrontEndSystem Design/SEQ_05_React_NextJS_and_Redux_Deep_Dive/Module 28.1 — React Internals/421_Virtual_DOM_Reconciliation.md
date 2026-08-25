# 421 – Virtual DOM and Reconciliation Algorithm

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
The **Virtual DOM** is a lightweight in-memory representation of the real DOM. On state change, React creates a new VDOM tree, **diffs** it against the previous one (reconciliation), and applies only the minimal DOM mutations needed. O(n) heuristic algorithm using two assumptions: different types = different trees, keys identify stable elements.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── VIRTUAL DOM = React Elements ────
// JSX compiles to createElement calls
<div className="card">
  <h1>{title}</h1>
  <p>{body}</p>
</div>

// Becomes:
React.createElement('div', { className: 'card' },
  React.createElement('h1', null, title),
  React.createElement('p', null, body),
);

// Returns a plain object (Virtual DOM node):
{
  type: 'div',
  props: {
    className: 'card',
    children: [
      { type: 'h1', props: { children: title } },
      { type: 'p', props: { children: body } },
    ]
  }
}

// ──── RECONCILIATION RULES ────

// Rule 1: Different types → tear down and rebuild
// Before: <div><Counter /></div>
// After:  <span><Counter /></span>
// React destroys Counter, creates new one (state lost!)

// Rule 2: Same type → update attributes
// Before: <div className="old" style={{color: 'red'}} />
// After:  <div className="new" style={{color: 'blue'}} />
// React only updates className and color

// Rule 3: Keys identify list items
// Before: [<li key="a">A</li>, <li key="b">B</li>]
// After:  [<li key="b">B</li>, <li key="a">A</li>, <li key="c">C</li>]
// React moves A and B, inserts C (doesn't recreate)

// ──── KEY ANTI-PATTERNS ────

// ❌ Using index as key (broken for reorderable lists)
{items.map((item, index) => (
  <Item key={index} item={item} />
  // If items reorder, React reuses wrong component instances
))}

// ✅ Use stable unique ID
{items.map(item => (
  <Item key={item.id} item={item} />
))}

// ❌ Random keys (re-creates every render)
<Item key={Math.random()} />  // NEVER do this

// ──── DIFFING EXAMPLE ────
// State change: items = ['A','B','C'] → ['A','C','D']

// Without keys:
// Compare index 0: A=A ✓ (keep)
// Compare index 1: B≠C → update to C
// Compare index 2: C≠D → update to D
// 2 updates

// With keys:
// key='A': still exists → keep
// key='B': removed → delete DOM node
// key='C': moved from index 2 → 1 → move DOM node
// key='D': new → create DOM node
// 1 delete + 1 move + 1 insert (more efficient for large lists)
```

### Why O(n) not O(n³)?
```
Full tree diff: O(n³) — compare every node with every other
React's heuristic: O(n) because:
1. Only compare same-level siblings (no cross-level moves)
2. Different types = different subtrees (skip deep comparison)
3. Keys identify reorderable children
These assumptions work 99%+ of the time in UI
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"VDOM is a lightweight object tree representing the UI. Reconciliation diffs old vs new VDOM in O(n) using two heuristics: different types = different trees, keys identify list items. Only minimal DOM mutations are applied. Keys must be stable IDs, not array indices — index keys cause bugs with reordering."*

## 4. 🧠 MEMORY AID
**"VDOM = plain JS object tree. Diff: same type = update props, different type = recreate. Keys = stable identity for lists. O(n) heuristic, not O(n³) full diff."**
