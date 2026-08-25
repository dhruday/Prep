# 314 – DOM Tree Traversal as Graph

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
The DOM is a tree (a special case of a graph). DOM traversal uses the same BFS/DFS patterns but via `children`, `parentNode`, `nextSibling`. Common tasks: find elements by condition, measure depth, serialize subtree, compare two DOMs, implement `querySelectorAll`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// DFS: Walk all descendants
function walkDOM(node: Node, callback: (node: Node) => void): void {
  callback(node);
  let child = node.firstChild;
  while (child) {
    walkDOM(child, callback);
    child = child.nextSibling;
  }
}

// BFS: Level-order DOM traversal
function bfsDOM(root: Element): Element[][] {
  const levels: Element[][] = [];
  let queue: Element[] = [root];
  while (queue.length) {
    levels.push([...queue]);
    const next: Element[] = [];
    for (const el of queue) {
      next.push(...Array.from(el.children));
    }
    queue = next;
  }
  return levels;
}

// Implement querySelectorAll (simplified: by tag name)
function querySelectorByTag(root: Element, tag: string): Element[] {
  const result: Element[] = [];
  const stack: Element[] = [root];
  while (stack.length) {
    const el = stack.pop()!;
    if (el.tagName.toLowerCase() === tag.toLowerCase()) result.push(el);
    for (let i = el.children.length - 1; i >= 0; i--) {
      stack.push(el.children[i]);
    }
  }
  return result;
}

// Find depth of element from root
function getDepth(element: Element): number {
  let depth = 0;
  let current: Element | null = element;
  while (current.parentElement) { depth++; current = current.parentElement; }
  return depth;
}

// Find Lowest Common Ancestor of two DOM nodes
function findLCA(node1: Node, node2: Node): Node | null {
  const ancestors = new Set<Node>();
  let current: Node | null = node1;
  while (current) { ancestors.add(current); current = current.parentNode; }
  current = node2;
  while (current) {
    if (ancestors.has(current)) return current;
    current = current.parentNode;
  }
  return null;
}

// DOM Diff (simplified)
function diffDOM(oldNode: Element, newNode: Element): string[] {
  const changes: string[] = [];
  if (oldNode.tagName !== newNode.tagName) {
    changes.push(`Replace ${oldNode.tagName} with ${newNode.tagName}`);
    return changes;
  }
  // Attribute diff
  const oldAttrs = new Set(oldNode.getAttributeNames());
  const newAttrs = new Set(newNode.getAttributeNames());
  for (const attr of newAttrs) {
    if (!oldAttrs.has(attr)) changes.push(`Add attr: ${attr}`);
    else if (oldNode.getAttribute(attr) !== newNode.getAttribute(attr))
      changes.push(`Update attr: ${attr}`);
  }
  for (const attr of oldAttrs) {
    if (!newAttrs.has(attr)) changes.push(`Remove attr: ${attr}`);
  }
  // Recurse children
  const maxChildren = Math.max(oldNode.children.length, newNode.children.length);
  for (let i = 0; i < maxChildren; i++) {
    if (!oldNode.children[i]) changes.push(`Add child: ${newNode.children[i].tagName}`);
    else if (!newNode.children[i]) changes.push(`Remove child: ${oldNode.children[i].tagName}`);
    else changes.push(...diffDOM(oldNode.children[i], newNode.children[i]));
  }
  return changes;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"DOM is a tree — I traverse it with DFS (recursive or stack) or BFS (queue). Common interview tasks: implement querySelectorAll via DFS, find LCA of two nodes via ancestor set, DOM diff using recursive comparison. At SAP, I used DOM traversal for accessibility audits — walking the tree to find elements missing ARIA labels."*

## 4. 🧠 MEMORY AID
**"DOM = Tree = Graph with parent/children edges. DFS: firstChild→nextSibling. BFS: queue of children. LCA: walk up to root, intersect ancestor sets."**

## 5. 🎯 COMPLEXITY
Full traversal: O(n) where n = number of DOM nodes | LCA: O(h) where h = tree height
