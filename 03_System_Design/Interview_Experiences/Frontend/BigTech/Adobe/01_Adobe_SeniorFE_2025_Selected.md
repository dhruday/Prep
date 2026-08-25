# Adobe — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Computer Scientist (Senior FE) |
| **Level** | MTS-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Flatten Nested Array** (with configurable depth)
2. **Debounce implementation**
3. **CSS: Center a div (5 ways)**
4. **Output prediction (closures + event loop)**

### 💡 Interview-Ready Answer — Center a Div (5 Ways)

```css
/* 1. Flexbox (modern, recommended) */
.parent1 {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 2. Grid (cleanest) */
.parent2 {
  display: grid;
  place-items: center;
}

/* 3. Absolute + Transform (works in older browsers) */
.child3 {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 4. Absolute + margin auto */
.child4 {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  margin: auto;
  width: 200px;
  height: 200px;
}

/* 5. Table display */
.parent5 {
  display: table-cell;
  vertical-align: middle;
  text-align: center;
}
```

---

## Round 2: JavaScript + React Deep Dive
**Duration:** 60 minutes

### Questions Asked
1. **Implement a custom React hook: useAsync**
2. **Prototypal inheritance — explain and implement**
3. **WeakMap vs Map — when to use which?**

### 💡 Interview-Ready Answer — useAsync Hook

```javascript
function useAsync(asyncFn, dependencies = []) {
  const [state, setState] = useState({
    data: null,
    error: null,
    status: 'idle', // idle | loading | success | error
  });
  
  const execute = useCallback(async (...args) => {
    setState({ data: null, error: null, status: 'loading' });
    
    try {
      const data = await asyncFn(...args);
      setState({ data, error: null, status: 'success' });
      return data;
    } catch (error) {
      setState({ data: null, error, status: 'error' });
      throw error;
    }
  }, dependencies); // eslint-disable-line
  
  return { ...state, execute, isLoading: state.status === 'loading' };
}

// Usage
function UserProfile({ userId }) {
  const { data: user, error, isLoading, execute: fetchUser } = useAsync(
    (id) => fetch(`/api/users/${id}`).then(r => r.json()),
    []
  );
  
  useEffect(() => { fetchUser(userId); }, [userId, fetchUser]);
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} retry={() => fetchUser(userId)} />;
  return <div>{user.name}</div>;
}
```

### 💡 Prototypal Inheritance

```javascript
// JavaScript has NO classical inheritance. Only prototypal.
// Every object has a [[Prototype]] (__proto__) link to another object.

// Old way (function constructors):
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a noise`;
};

function Dog(name, breed) {
  Animal.call(this, name); // Call parent constructor
  this.breed = breed;
}

// Key: Set up prototype chain
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function() { return `${this.name} barks`; };

const rex = new Dog('Rex', 'GSD');
rex.speak(); // "Rex makes a noise" (inherited from Animal.prototype)
rex.bark();  // "Rex barks" (own method)

// Prototype chain: rex → Dog.prototype → Animal.prototype → Object.prototype → null
// rex.speak → not on rex → check Dog.prototype → not there → check Animal.prototype → found!

// Modern: class syntax (syntactic sugar over prototypal)
class Cat extends Animal {
  purr() { return `${this.name} purrs`; }
}
// Under the hood: same prototypal mechanism
```

### 💡 WeakMap vs Map

```javascript
// Map: keys can be any value, prevents garbage collection of keys
// WeakMap: keys must be objects, allows garbage collection of keys

// Use Case 1: Private data per object instance
const privateData = new WeakMap();

class User {
  constructor(name, ssn) {
    this.name = name;
    privateData.set(this, { ssn }); // Private! Not enumerable.
  }
  
  getSSN() {
    return privateData.get(this).ssn;
  }
}
// When User instance is GC'd, its WeakMap entry is also GC'd → no memory leak

// Use Case 2: DOM element metadata
const metadata = new WeakMap();

function trackElement(element) {
  metadata.set(element, {
    clickCount: 0,
    firstSeen: Date.now()
  });
}
// If element is removed from DOM and has no other references → automatically GC'd
// With Map: element stays in memory forever (memory leak!)

// Use Case 3: Memoization with object keys
function memoize(fn) {
  const cache = new WeakMap();
  return function(obj) {
    if (cache.has(obj)) return cache.get(obj);
    const result = fn(obj);
    cache.set(obj, result);
    return result;
  };
}
// Cache entries automatically cleaned when objects are no longer referenced
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Adobe Acrobat Web — PDF viewer in the browser**
   - Render PDF, zooming, text selection, annotations, search within PDF

### 💡 Interview-Ready Answer

```
PDF Viewer Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Rendering Engine (Core Challenge):                           │
│                                                                │
│  Option 1: PDF.js (Mozilla's library) — Canvas-based         │
│  - Parse PDF binary → extract pages → render to Canvas       │
│  - Pros: accurate rendering, handles complex PDFs            │
│  - Cons: Canvas = bitmap, text not selectable natively       │
│  - Fix: overlay invisible text layer on top of canvas        │
│                                                                │
│  Option 2: Server-side rendering → serve as images           │
│  - Convert PDF pages to images on server                     │
│  - Pros: simple client, consistent across browsers           │
│  - Cons: no text selection, large file sizes, slow           │
│                                                                │
│  Adobe's approach: Hybrid (PDF.js + text overlay + SVG)      │
│                                                                │
│  Virtual Page Rendering (100+ page PDFs):                    │
│  - Only render visible pages + 1 page buffer above/below    │
│  - Unload pages that scroll out of view (free canvas memory)│
│  - Placeholder div with correct height for unloaded pages   │
│  - IntersectionObserver detects which pages are visible      │
└──────────────────────────────────────────────────────────────┘

Text Layer (for selection + search):
┌──────────────────────────────────────────────────────────────┐
│  PDF.js extracts text content with positions from PDF        │
│  Overlay transparent text divs on top of canvas              │
│                                                                │
│  <div class="page">                                          │
│    <canvas class="pdf-render" /> <!-- Visual rendering -->   │
│    <div class="text-layer">      <!-- Invisible text -->     │
│      <span style="                                           │
│        position: absolute;                                   │
│        left: 72px; top: 100px;                              │
│        font-size: 12px;                                      │
│        transform: scaleX(1.02); <!-- match PDF font width -->│
│        color: transparent;       <!-- invisible -->          │
│      ">This is the text content</span>                       │
│    </div>                                                     │
│  </div>                                                       │
│                                                                │
│  User sees: canvas rendering (accurate fonts)                │
│  User selects: text layer content (real text)                │
│  Result: copy/paste works, search works, looks like PDF      │
└──────────────────────────────────────────────────────────────┘

Annotations:
┌──────────────────────────────────────────────────────────────┐
│  Annotation types: highlight, underline, comment, stamp      │
│                                                                │
│  Storage: Separate from PDF content                          │
│  - annotations stored as JSON per page                       │
│  - Server: POST /api/documents/{id}/annotations              │
│  - Payload: { page: 5, type: "highlight",                    │
│    rect: {x: 72, y: 100, w: 200, h: 14}, color: "#ffeb3b" }│
│                                                                │
│  Rendering: SVG overlay on top of text layer                  │
│  <div class="page">                                          │
│    <canvas class="pdf-render" />                             │
│    <div class="text-layer" />                                │
│    <svg class="annotation-layer">                            │
│      <rect x="72" y="100" width="200" height="14"           │
│            fill="#ffeb3b" opacity="0.3" />                    │
│    </svg>                                                     │
│  </div>                                                       │
│                                                                │
│  Collaborative annotations: WebSocket for real-time sync    │
│  Conflict resolution: last-write-wins per annotation         │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Adobe tests **CSS deeply** — know centering, specificity, Grid, Flexbox inside out
- **useAsync hook** is a practical React question that shows hook composition skill
- **Prototypal inheritance** — must explain the prototype chain, not just class syntax
- **WeakMap** for preventing memory leaks with DOM elements — an Adobe-relevant pattern
- **PDF viewer design** is Adobe's unique system design question — know PDF.js, text overlay, virtual paging
- **Canvas + transparent text overlay** is how PDF viewers enable text selection
- Adobe values **creativity + engineering** — mention performance AND user experience

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | JS Polyfills, CSS, Closures |
| Round 2 | Medium-Hard | React Hooks, Prototypes, WeakMap |
| System Design | Hard | PDF Rendering, Canvas, Annotations |
| HM | Medium | Behavioral |
