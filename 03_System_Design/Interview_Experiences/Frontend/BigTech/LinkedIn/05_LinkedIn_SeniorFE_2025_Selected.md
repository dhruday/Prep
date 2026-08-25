# LinkedIn — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Senior Frontend Engineer |
| **Level** | Senior SWE |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Sunnyvale, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | LinkedIn Feed |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding — Advanced DOM Manipulation
**Duration:** 60 minutes

### Question: Implement a Virtual DOM Reconciler with Keyed Diff

```javascript
/**
 * Minimal Virtual DOM with keyed reconciliation.
 * 
 * vnode = { type, props, children, key }
 * 
 * Diff algorithm:
 * 1. Same type + key → patch props + recurse children
 * 2. Different type → replace entire subtree
 * 3. Keyed children diff: 
 *    - Build key→index maps for old and new
 *    - Reuse nodes with matching keys (move if needed)
 *    - Remove old nodes with no matching key
 *    - Create new nodes with new keys
 *    - Uses LIS (Longest Increasing Subsequence) to minimize moves
 */

function h(type, props = {}, ...children) {
  const flatChildren = children.flat(Infinity).map(child =>
    typeof child === 'string' || typeof child === 'number'
      ? { type: '__TEXT__', props: { nodeValue: String(child) }, children: [], key: null }
      : child
  ).filter(Boolean);
  
  return { type, props: props || {}, children: flatChildren, key: props?.key ?? null };
}

function createElement(vnode) {
  if (vnode.type === '__TEXT__') {
    return document.createTextNode(vnode.props.nodeValue);
  }
  
  const el = document.createElement(vnode.type);
  
  // Set props
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key === 'key') continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  
  // Append children
  for (const child of vnode.children) {
    el.appendChild(createElement(child));
  }
  
  vnode._el = el; // Store reference for patching
  return el;
}

function patch(parentEl, oldVNode, newVNode) {
  // Case 1: No old node → create
  if (!oldVNode) {
    const el = createElement(newVNode);
    parentEl.appendChild(el);
    return;
  }
  
  // Case 2: No new node → remove
  if (!newVNode) {
    parentEl.removeChild(oldVNode._el);
    return;
  }
  
  // Case 3: Different type → replace
  if (oldVNode.type !== newVNode.type) {
    const el = createElement(newVNode);
    parentEl.replaceChild(el, oldVNode._el);
    return;
  }
  
  // Case 4: Text node update
  if (newVNode.type === '__TEXT__') {
    if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
      oldVNode._el.nodeValue = newVNode.props.nodeValue;
    }
    newVNode._el = oldVNode._el;
    return;
  }
  
  // Case 5: Same type → patch props + reconcile children
  const el = oldVNode._el;
  newVNode._el = el;
  
  patchProps(el, oldVNode.props, newVNode.props);
  reconcileChildren(el, oldVNode.children, newVNode.children);
}

function patchProps(el, oldProps, newProps) {
  // Remove old props not in new
  for (const key of Object.keys(oldProps)) {
    if (key === 'key') continue;
    if (!(key in newProps)) {
      if (key.startsWith('on')) {
        el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
      } else {
        el.removeAttribute(key);
      }
    }
  }
  
  // Set new/changed props
  for (const [key, value] of Object.entries(newProps)) {
    if (key === 'key') continue;
    if (oldProps[key] === value) continue;
    
    if (key.startsWith('on') && typeof value === 'function') {
      if (oldProps[key]) el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  }
}

function reconcileChildren(parentEl, oldChildren, newChildren) {
  // Check if keyed
  const hasKeys = newChildren.some(c => c.key != null);
  
  if (hasKeys) {
    reconcileKeyed(parentEl, oldChildren, newChildren);
  } else {
    reconcileUnkeyed(parentEl, oldChildren, newChildren);
  }
}

function reconcileUnkeyed(parentEl, oldChildren, newChildren) {
  const maxLen = Math.max(oldChildren.length, newChildren.length);
  
  for (let i = 0; i < maxLen; i++) {
    patch(parentEl, oldChildren[i] || null, newChildren[i] || null);
  }
}

function reconcileKeyed(parentEl, oldChildren, newChildren) {
  // Build key→vnode maps
  const oldKeyMap = new Map();
  oldChildren.forEach((child, i) => {
    if (child.key != null) oldKeyMap.set(child.key, { vnode: child, index: i });
  });
  
  const newKeyMap = new Map();
  newChildren.forEach((child, i) => {
    if (child.key != null) newKeyMap.set(child.key, i);
  });
  
  // Track which old children are reused
  const reusedOldIndices = [];
  
  // Process new children
  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    const oldEntry = oldKeyMap.get(newChild.key);
    
    if (oldEntry) {
      // Reuse: patch existing node
      patch(parentEl, oldEntry.vnode, newChild);
      reusedOldIndices.push(oldEntry.index);
    } else {
      // New node: create and insert
      const el = createElement(newChild);
      const referenceNode = parentEl.childNodes[i] || null;
      parentEl.insertBefore(el, referenceNode);
    }
  }
  
  // Remove old children not in new
  for (const [key, { vnode }] of oldKeyMap) {
    if (!newKeyMap.has(key) && vnode._el?.parentNode) {
      parentEl.removeChild(vnode._el);
    }
  }
  
  // Reorder: move reused nodes to correct positions using LIS
  // LIS of reused indices tells us which nodes don't need to move
  const lis = longestIncreasingSubsequence(reusedOldIndices);
  const lisSet = new Set(lis.map(i => reusedOldIndices[i]));
  
  // Move nodes not in LIS to their correct positions
  for (let i = newChildren.length - 1; i >= 0; i--) {
    const newChild = newChildren[i];
    const el = newChild._el;
    const nextSibling = newChildren[i + 1]?._el || null;
    
    if (el && el.parentNode === parentEl) {
      const oldEntry = oldKeyMap.get(newChild.key);
      if (oldEntry && !lisSet.has(oldEntry.index)) {
        parentEl.insertBefore(el, nextSibling);
      }
    }
  }
}

// LIS — returns indices of the longest increasing subsequence
function longestIncreasingSubsequence(arr) {
  const n = arr.length;
  if (n === 0) return [];
  
  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1);
  let maxLen = 1, maxIdx = 0;
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        prev[i] = j;
      }
    }
    if (dp[i] > maxLen) {
      maxLen = dp[i];
      maxIdx = i;
    }
  }
  
  const result = [];
  let idx = maxIdx;
  while (idx !== -1) {
    result.unshift(idx);
    idx = prev[idx];
  }
  return result;
}

// Usage:
const oldTree = h('ul', {},
  h('li', { key: 'a' }, 'Apple'),
  h('li', { key: 'b' }, 'Banana'),
  h('li', { key: 'c' }, 'Cherry')
);

const newTree = h('ul', {},
  h('li', { key: 'c' }, 'Cherry'),
  h('li', { key: 'a' }, 'Apple'),
  h('li', { key: 'd' }, 'Date')
);

const root = document.getElementById('app');
root.appendChild(createElement(oldTree));
// Later: patch(root, oldTree, newTree);
```

---

## 🎯 Key Takeaways
- LinkedIn FE = **Deep VDOM knowledge with keyed reconciliation**
- **Keyed diff**: key→index map for old + new → reuse matching keys, create new, remove missing
- **LIS optimization**: longest increasing subsequence of reused indices → nodes in LIS don't move, minimizes DOM operations
- **Props patching**: remove stale, set new — handle event listeners (remove old, add new), style objects, className
- **Text node optimization**: just update `nodeValue` — no need to recreate
- **replaceChild vs remove+create**: `replaceChild` is more efficient for type changes
- **Event listener cleanup**: always `removeEventListener` before adding new — prevents leaks
- LinkedIn FE: **framework internals knowledge** expected — how React/Vue reconciliation actually works

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| VDOM Coding | Very Hard | Virtual DOM, Reconciliation, LIS |
| FE System Design | Hard | LinkedIn Feed Architecture |
| Technical 3 | Medium-Hard | React, Accessibility |
| Behavioral | Medium | Leadership |
| HM | Medium | Growth |
