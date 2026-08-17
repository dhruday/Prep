# Google — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Frontend Engineer |
| **Level** | L4 |
| **YOE** | 5 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Dev.to](https://dev.to/t/interviewexperience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Frontend Coding + 1 Frontend System Design + 1 Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual (Google Meet + CoderPad)
- **Note:** Google Frontend interviews test JavaScript fundamentals deeply, not just framework knowledge

---

## Round 1: Frontend Coding I
**Duration:** 45 minutes | **Interviewer:** L4 SDE

### Questions Asked
1. **Implement Promise.all() from scratch**
2. **Follow-up: Implement Promise.allSettled()**

### 💡 Interview-Ready Answer

```javascript
// Promise.all: resolves when ALL promises resolve, rejects on FIRST rejection
function promiseAll(promises) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(promises)) {
            return reject(new TypeError('Argument must be an array'));
        }
        
        if (promises.length === 0) return resolve([]);
        
        const results = new Array(promises.length);
        let completed = 0;
        
        promises.forEach((promise, index) => {
            // Wrap non-promise values with Promise.resolve
            Promise.resolve(promise)
                .then(value => {
                    results[index] = value; // maintain order
                    completed++;
                    if (completed === promises.length) {
                        resolve(results);
                    }
                })
                .catch(reject); // first rejection rejects the whole thing
        });
    });
}

// Promise.allSettled: waits for ALL promises, never rejects
function promiseAllSettled(promises) {
    return new Promise((resolve) => {
        if (promises.length === 0) return resolve([]);
        
        const results = new Array(promises.length);
        let completed = 0;
        
        promises.forEach((promise, index) => {
            Promise.resolve(promise)
                .then(value => {
                    results[index] = { status: 'fulfilled', value };
                })
                .catch(reason => {
                    results[index] = { status: 'rejected', reason };
                })
                .finally(() => {
                    completed++;
                    if (completed === promises.length) {
                        resolve(results);
                    }
                });
        });
    });
}

// Tests:
// promiseAll([Promise.resolve(1), Promise.resolve(2)]).then(console.log); // [1, 2]
// promiseAll([Promise.resolve(1), Promise.reject('err')]).catch(console.log); // 'err'
// promiseAllSettled([Promise.resolve(1), Promise.reject('err')]).then(console.log);
// [{status:'fulfilled',value:1}, {status:'rejected',reason:'err'}]
```

**Key Edge Cases:**
- Empty array → resolve immediately with []
- Non-promise values → wrap with Promise.resolve()
- **Order preservation** — results[index] must match input order, not completion order
- Single rejection → Promise.all rejects immediately (remaining promises still run but results are ignored)

**Follow-up: Promise.race()**
```javascript
function promiseRace(promises) {
    return new Promise((resolve, reject) => {
        promises.forEach(promise => {
            Promise.resolve(promise).then(resolve).catch(reject);
        });
    });
}
```

---

## Round 2: Frontend Coding II
**Duration:** 45 minutes | **Interviewer:** L5 SDE

### Questions Asked
1. **Implement a Debounce function with leading/trailing options**
2. **Implement an EventEmitter class**

### 💡 Interview-Ready Answer — Debounce

```javascript
function debounce(func, wait, options = {}) {
    let timeout = null;
    let lastArgs = null;
    let lastThis = null;
    const { leading = false, trailing = true } = options;
    
    function debounced(...args) {
        lastArgs = args;
        lastThis = this;
        
        const isInvoking = timeout === null;
        
        clearTimeout(timeout);
        
        if (leading && isInvoking) {
            func.apply(lastThis, lastArgs);
        }
        
        timeout = setTimeout(() => {
            timeout = null;
            if (trailing && lastArgs) {
                func.apply(lastThis, lastArgs);
                lastArgs = null;
                lastThis = null;
            }
        }, wait);
    }
    
    debounced.cancel = () => {
        clearTimeout(timeout);
        timeout = null;
        lastArgs = null;
        lastThis = null;
    };
    
    debounced.flush = () => {
        if (timeout) {
            clearTimeout(timeout);
            func.apply(lastThis, lastArgs);
            timeout = null;
            lastArgs = null;
        }
    };
    
    return debounced;
}

// Usage:
// const debouncedSearch = debounce(search, 300, { leading: false, trailing: true });
// input.addEventListener('input', debouncedSearch);
```

### 💡 Interview-Ready Answer — EventEmitter

```javascript
class EventEmitter {
    constructor() {
        this.events = new Map(); // event name → Set of listeners
    }
    
    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(listener);
        
        // Return unsubscribe function
        return () => this.off(event, listener);
    }
    
    once(event, listener) {
        const wrapper = (...args) => {
            listener(...args);
            this.off(event, wrapper);
        };
        wrapper._original = listener; // for off() comparison
        return this.on(event, wrapper);
    }
    
    off(event, listener) {
        const listeners = this.events.get(event);
        if (!listeners) return;
        
        listeners.delete(listener);
        // Also check for once() wrappers
        for (const l of listeners) {
            if (l._original === listener) {
                listeners.delete(l);
                break;
            }
        }
        
        if (listeners.size === 0) this.events.delete(event);
    }
    
    emit(event, ...args) {
        const listeners = this.events.get(event);
        if (!listeners) return false;
        
        for (const listener of [...listeners]) { // spread to avoid mutation during iteration
            listener(...args);
        }
        return true;
    }
    
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).size : 0;
    }
    
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

// Usage:
// const emitter = new EventEmitter();
// const unsub = emitter.on('data', (msg) => console.log(msg));
// emitter.emit('data', 'hello'); // logs 'hello'
// unsub(); // unsubscribe
```

---

## Round 3: Frontend System Design
**Duration:** 45 minutes | **Interviewer:** Staff SDE (L6)

### Questions Asked
1. **Design Google Docs — Real-time Collaborative Text Editor**

### 💡 Interview-Ready Answer

#### Requirements
- Multiple users edit same document simultaneously
- See other users' cursors and selections in real-time
- Conflict resolution (two users edit same paragraph)
- Offline support with sync when reconnected
- Undo/redo per user
- < 100ms latency for local edits, < 500ms for sync

#### Architecture
```
┌──────────────────────────────┐     ┌────────────────┐
│      Client (Browser)         │     │  Collaboration │
│  ┌────────────────────────┐  │     │  Server         │
│  │  Local Document State   │  │◄───▶│  (WebSocket)   │
│  │  ┌──────────────────┐  │  │     │                │
│  │  │  CRDT / OT Engine │  │  │     │  - Transform   │
│  │  │  (Conflict Reso.) │  │  │     │  - Broadcast   │
│  │  └──────────────────┘  │  │     │  - Persistence  │
│  │  ┌──────────────────┐  │  │     └────────┬───────┘
│  │  │  Operation Queue  │  │  │              │
│  │  │  (Pending sync)   │  │  │              ▼
│  │  └──────────────────┘  │  │     ┌────────────────┐
│  │  ┌──────────────────┐  │  │     │  Document      │
│  │  │  Cursor/Selection │  │  │     │  Storage       │
│  │  │  Awareness        │  │  │     │  (Spanner)     │
│  │  └──────────────────┘  │  │     └────────────────┘
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Rich Text Renderer    │  │
│  │  (contenteditable +    │  │
│  │   custom input handler)│  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

#### Conflict Resolution: CRDTs vs OT

**OT (Operational Transformation) — Google Docs uses this:**
```javascript
// Operations: insert(pos, char), delete(pos)
// When two concurrent operations arrive, transform them to maintain consistency

function transform(op1, op2) {
    // op1 happened concurrently with op2
    // Transform op1 to account for op2's effect
    
    if (op1.type === 'insert' && op2.type === 'insert') {
        if (op1.pos < op2.pos || (op1.pos === op2.pos && op1.clientId < op2.clientId)) {
            return op1; // op1 stays, op2 shifts right
        } else {
            return { ...op1, pos: op1.pos + 1 }; // shift op1 right
        }
    }
    
    if (op1.type === 'insert' && op2.type === 'delete') {
        if (op1.pos <= op2.pos) return op1;
        return { ...op1, pos: op1.pos - 1 }; // shift left (deletion before insert)
    }
    
    if (op1.type === 'delete' && op2.type === 'insert') {
        if (op1.pos < op2.pos) return op1;
        return { ...op1, pos: op1.pos + 1 }; // shift right
    }
    
    if (op1.type === 'delete' && op2.type === 'delete') {
        if (op1.pos < op2.pos) return op1;
        if (op1.pos > op2.pos) return { ...op1, pos: op1.pos - 1 };
        return null; // same position — both deleted same char, op1 is no-op
    }
}
```

**CRDT (Conflict-free Replicated Data Type) — Alternative:**
```javascript
// Each character has a unique ID: (siteId, clock) → position in document
// Insert between two existing characters → automatically ordered
// Advantages: no central server needed, works offline
// Disadvantages: higher memory overhead (ID per character)

class CRDTChar {
    constructor(id, value, siteId, clock) {
        this.id = [siteId, clock]; // unique identifier
        this.value = value;
        this.isDeleted = false; // tombstone
    }
}
```

#### Real-Time Cursor Awareness
```javascript
// WebSocket protocol for cursor positions
// Send: { type: 'cursor', userId, position: 42, selection: { start: 42, end: 50 }, color: '#FF5733' }

class CursorManager {
    constructor(socket) {
        this.cursors = new Map(); // userId → cursor info
        this.socket = socket;
    }
    
    updateLocalCursor(position, selection) {
        this.socket.send(JSON.stringify({
            type: 'cursor',
            position,
            selection
        }));
    }
    
    handleRemoteCursor(data) {
        this.cursors.set(data.userId, {
            position: data.position,
            selection: data.selection,
            color: data.color,
            name: data.name
        });
        this.renderCursors();
    }
    
    renderCursors() {
        for (const [userId, cursor] of this.cursors) {
            // Render colored cursor line + name label at position
            // Render selection highlight if selection exists
        }
    }
}
```

#### Offline Support
```
1. Queue operations locally in IndexedDB
2. On reconnect: send queued ops to server
3. Server transforms against ops that happened while offline
4. Client receives transformed ops + applies them
5. Document converges to consistent state
```

---

## Round 4: Behavioral (Googleyness)
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about a time you improved the performance of a web application"**
2. **"How do you stay current with frontend technologies?"**
3. **"Describe a time you had to learn a new technology quickly"**

### 💡 Interview-Ready Answer — Performance Improvement

**Situation:** Our e-commerce product listing page had a Lighthouse performance score of 35/100. First Contentful Paint (FCP) was 4.2 seconds. Users on mobile were abandoning the page — bounce rate was 65%.

**Task:** Improve FCP to < 2 seconds and Lighthouse score to > 80, without a full rewrite.

**Action:**
1. **Profiled** using Chrome DevTools Performance tab — identified 3MB uncompressed JS bundle, render-blocking CSS, and 20 unoptimized images above the fold
2. **Code splitting:** Split vendor bundle using dynamic imports. Route-based lazy loading reduced initial JS from 3MB to 400KB
3. **Image optimization:** Implemented `<img srcset>` with WebP format, lazy loading with IntersectionObserver for below-fold images, LQIP (Low Quality Image Placeholders) for instant visual feedback
4. **CSS:** Extracted critical CSS (above-fold styles inline in `<head>`), deferred rest via `<link rel="preload">`
5. **Server:** Added `Cache-Control` headers, enabled Brotli compression, prefetch DNS for third-party domains
6. **Monitoring:** Set up Web Vitals tracking in production (CLS, LCP, FID)

**Result:** FCP dropped from 4.2s to 1.4s. Lighthouse score: 35 → 92. Bounce rate dropped from 65% to 28%. Conversion rate improved 22%.

---

## 🎯 Key Takeaways
- Google Frontend interviews test **vanilla JavaScript** — not React/Angular frameworks
- **Promise.all, debounce, EventEmitter** are Google Frontend staples — implement from scratch
- **Frontend System Design** at Google is unique — it's about collaborative editing, rich text, real-time systems
- Know **CRDTs vs OT** — explain trade-offs (OT needs central server, CRDTs work p2p)
- **Performance optimization** stories with real metrics (Lighthouse, Web Vitals) are essential
- Google values **engineering fundamentals** over framework knowledge

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium | Promises, Async Programming |
| Round 2 | Medium | Closures, Event Systems, Timing |
| Round 3 | Very Hard | CRDTs, OT, WebSocket, Real-time Collab |
| Round 4 | Medium | Performance, Web Vitals, Behavioral |
