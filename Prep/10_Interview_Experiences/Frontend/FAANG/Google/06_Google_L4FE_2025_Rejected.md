# Google — L4 Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Frontend Software Engineer |
| **Level** | L4 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Mountain View, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | Coding Round 2: didn't handle all edge cases in memoization function |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 2 Coding + Frontend Design + Googleness)

---

## Round 1: Coding (Frontend Focus)
**Duration:** 45 minutes

### Questions Asked
1. **Implement `Function.prototype.bind` polyfill** (full spec: partial application, new operator support)
2. **Follow-up: What happens when you use `new` on a bound function?**

### 💡 Function.prototype.bind Polyfill

```javascript
Function.prototype.myBind = function(thisArg, ...boundArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('Bind must be called on a function');
  }
  
  const targetFn = this;
  
  const boundFunction = function(...callArgs) {
    // If called with new: 'this' should be the new object, NOT thisArg
    // new BoundFn() → this is instance of BoundFn, not thisArg
    const context = this instanceof boundFunction ? this : thisArg;
    return targetFn.apply(context, [...boundArgs, ...callArgs]);
  };
  
  // Preserve prototype chain for new operator
  // BoundFn.prototype should inherit from targetFn.prototype
  if (targetFn.prototype) {
    boundFunction.prototype = Object.create(targetFn.prototype);
  }
  
  return boundFunction;
};

// Tests:
function Greet(greeting, name) {
  this.greeting = greeting;
  this.name = name;
}
Greet.prototype.hello = function() { return `${this.greeting}, ${this.name}`; };

const BoundGreet = Greet.myBind(null, 'Hello');
const instance = new BoundGreet('World');
console.log(instance.greeting); // 'Hello'
console.log(instance.name);     // 'World'
console.log(instance.hello());  // 'Hello, World'
console.log(instance instanceof Greet); // true (prototype chain preserved)
```

---

## Round 2: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Implement a `memoize` function** that handles:
   - Any number of arguments
   - Object arguments (stable key generation)
   - Cache size limit (LRU eviction)
   - Optional TTL (cache expiry)

### 💡 Advanced Memoize

```javascript
function memoize(fn, options = {}) {
  const { maxSize = Infinity, ttl = 0 } = options;
  
  // LRU cache using Map (Map preserves insertion order)
  const cache = new Map();
  
  // For objects: use WeakMap-based nested approach or stable serialization
  // WeakMap approach is better (no memory leaks), but complex for multi-arg
  // Using stable JSON key for simplicity (works for serializable args)
  
  function generateKey(args) {
    return args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'function') return arg.toString();
      if (typeof arg === 'object') {
        // Stable key: sort object keys to ensure consistent serialization
        return stableStringify(arg);
      }
      return String(arg);
    }).join('|');
  }
  
  function stableStringify(obj, seen = new WeakSet()) {
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (seen.has(obj)) return '"[Circular]"';
    
    seen.add(obj);
    
    if (Array.isArray(obj)) {
      return '[' + obj.map(v => stableStringify(v, seen)).join(',') + ']';
    }
    
    // Sort keys for stable serialization
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => `"${k}":${stableStringify(obj[k], seen)}`);
    return '{' + pairs.join(',') + '}';
  }
  
  const memoized = function(...args) {
    const key = generateKey(args);
    
    if (cache.has(key)) {
      const entry = cache.get(key);
      
      // Check TTL
      if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
        cache.delete(key);
      } else {
        // Move to end (most recently used) for LRU
        cache.delete(key);
        cache.set(key, entry);
        return entry.value;
      }
    }
    
    // Compute new value
    const value = fn.apply(this, args);
    
    // Evict LRU if over max size
    if (cache.size >= maxSize) {
      // Map.keys().next().value → first (oldest/least recently used) key
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    
    cache.set(key, { value, timestamp: Date.now() });
    
    return value;
  };
  
  // Expose cache control methods
  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  memoized.delete = (...args) => cache.delete(generateKey(args));
  memoized.has = (...args) => {
    const key = generateKey(args);
    if (!cache.has(key)) return false;
    if (ttl > 0 && Date.now() - cache.get(key).timestamp > ttl) {
      cache.delete(key);
      return false;
    }
    return true;
  };
  
  return memoized;
}

// Tests:
const expensiveFn = memoize(
  (n) => { console.log('Computing...'); return n * n; },
  { maxSize: 3, ttl: 5000 }
);

expensiveFn(5);  // Computing... → 25
expensiveFn(5);  // 25 (cached, no log)
expensiveFn(10); // Computing... → 100
expensiveFn(15); // Computing... → 225
expensiveFn(20); // Computing... → 400 (evicts 5 from cache — LRU)
expensiveFn(5);  // Computing... → 25 (was evicted, recompute)

// With objects:
const fetchUser = memoize(
  (query) => { console.log('Fetching...'); return { name: query.name }; },
  { maxSize: 100 }
);
fetchUser({ name: 'Alice', age: 30 }); // Fetching...
fetchUser({ age: 30, name: 'Alice' }); // Cached! (stable key sorts object keys)
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google Docs Cursor & Selection System**
   - Multiple users typing simultaneously
   - Each user has a colored cursor
   - Text selection highlighting per user
   - Cursor follows text as other users type
   - Presence: online/offline indicators

### 💡 Key Design Points

```
Cursor Position Model:
- Position = { line: number, column: number }
- Selection = { anchor: Position, head: Position } (anchor = where selection started)
- Each user has: { userId, cursor: Selection, color, name, isOnline }

Cursor Transformation (OT-based):
When User A types "hello" at position 5:
- All cursors at position > 5 must shift right by 5
- All selections spanning position 5 must expand

class CursorManager {
  transformCursor(cursor, operation) {
    return {
      anchor: transformPosition(cursor.anchor, operation),
      head: transformPosition(cursor.head, operation)
    };
  }
  
  transformPosition(pos, op) {
    if (op.type === 'insert') {
      if (pos.line === op.line && pos.column >= op.column) {
        return { line: pos.line, column: pos.column + op.text.length };
      }
      // If insert adds newlines, adjust line numbers
    }
    if (op.type === 'delete') {
      // Shift left if after deletion point
    }
    return pos;
  }
}

Rendering: 
- CSS overlay layer on top of editor content
- Each remote cursor = absolutely positioned colored div (2px wide, blinking)
- Selections = highlighted background spans with user's color at 20% opacity
- Cursor label (username) appears on hover or for 3 seconds after movement
```

---

## 🎯 Key Takeaways
- Google L4 FE = **bind polyfill + memoize with LRU + OT cursor management**
- **bind + new**: when `new BoundFn()`, `this` is the new instance, NOT the bound `thisArg`
- **Prototype chain**: `boundFn.prototype = Object.create(targetFn.prototype)` preserves `instanceof`
- **Memoize key generation**: sort object keys for stable serialization, WeakSet for circular refs
- **LRU with Map**: delete + re-set moves entry to end; `map.keys().next().value` gets oldest
- **TTL check**: on cache hit, check `Date.now() - timestamp > ttl` → evict stale entries
- **Cursor transformation**: when remote user types, adjust all other cursors by offset
- Google rejects if **edge cases** aren't handled — they want exhaustive thinking

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone | Medium | JS Fundamentals |
| Coding 1 | Medium | bind Polyfill, Prototype Chain |
| Coding 2 | Hard | Memoize, LRU, Stable Serialization |
| Frontend Design | Hard | Google Docs Cursors, OT |
| Googleness | Medium | Culture Fit |
