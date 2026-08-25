# LinkedIn — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Senior Software Engineer — Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 3 Onsite)
- **Timeline:** 3 weeks
- **Format:** Virtual

---

## Round 1: Phone Screen — JavaScript
**Duration:** 45 minutes

### Questions Asked
1. **Implement a function composition utility (compose/pipe)**
2. **Explain the event loop, microtasks, and macrotasks**

### 💡 Interview-Ready Answer — compose and pipe

```javascript
// compose: right-to-left execution
function compose(...fns) {
  return function (initialValue) {
    return fns.reduceRight((acc, fn) => fn(acc), initialValue);
  };
}

// pipe: left-to-right execution (more intuitive)
function pipe(...fns) {
  return function (initialValue) {
    return fns.reduce((acc, fn) => fn(acc), initialValue);
  };
}

// Async pipe (handles promises)
function asyncPipe(...fns) {
  return function (initialValue) {
    return fns.reduce(
      (promise, fn) => promise.then(fn),
      Promise.resolve(initialValue)
    );
  };
}

// Usage
const processUser = pipe(
  (user) => ({ ...user, name: user.name.trim() }),
  (user) => ({ ...user, email: user.email.toLowerCase() }),
  (user) => ({ ...user, age: Number(user.age) }),
  (user) => { if (!user.email.includes('@')) throw new Error('Invalid email'); return user; }
);

processUser({ name: ' Alice ', email: 'ALICE@GMAIL.COM', age: '30' });
// { name: "Alice", email: "alice@gmail.com", age: 30 }
```

### 💡 Event Loop — Predict the Output

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

queueMicrotask(() => console.log('4'));

Promise.resolve().then(() => {
  console.log('5');
  setTimeout(() => console.log('6'), 0);
});

console.log('7');

// Output: 1, 7, 3, 4, 5, 2, 6
//
// Explanation:
// 1. Synchronous: console.log('1') → "1"
// 2. setTimeout(() => '2') → queued to MACROTASK queue
// 3. Promise.then(() => '3') → queued to MICROTASK queue
// 4. queueMicrotask(() => '4') → queued to MICROTASK queue
// 5. Promise.then(() => '5' + setTimeout) → queued to MICROTASK queue
// 6. Synchronous: console.log('7') → "7"
// --- Call stack empty, drain microtask queue ---
// 7. Microtask: '3' → "3"
// 8. Microtask: '4' → "4"
// 9. Microtask: '5' → "5", setTimeout to macrotask → "6" queued
// --- Microtask queue empty, process macrotask ---
// 10. Macrotask: '2' → "2"
// 11. Macrotask: '6' → "6"

// Key rule: ALL microtasks drain before next macrotask
// Microtasks: Promise.then, queueMicrotask, MutationObserver
// Macrotasks: setTimeout, setInterval, I/O, UI rendering
```

---

## Round 2: Frontend Coding
**Duration:** 60 minutes

### Questions Asked
1. **Build a Type-Ahead/Autocomplete component from scratch (vanilla JS)**
   - Debounce, keyboard navigation, highlight matching text, accessibility

### 💡 Interview-Ready Answer

```javascript
class Autocomplete {
  constructor(container, { fetchSuggestions, debounceMs = 300, maxResults = 10 }) {
    this.container = container;
    this.fetchSuggestions = fetchSuggestions;
    this.debounceMs = debounceMs;
    this.maxResults = maxResults;
    this.selectedIndex = -1;
    this.suggestions = [];
    this.debounceTimer = null;
    
    this.render();
    this.attachEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="autocomplete" role="combobox" aria-expanded="false" aria-haspopup="listbox">
        <input type="text" class="ac-input" 
               role="searchbox"
               aria-autocomplete="list"
               aria-controls="ac-listbox"
               aria-activedescendant=""
               placeholder="Search..." />
        <ul id="ac-listbox" class="ac-suggestions" role="listbox" hidden></ul>
      </div>
    `;
    this.input = this.container.querySelector('.ac-input');
    this.listbox = this.container.querySelector('.ac-suggestions');
    this.combobox = this.container.querySelector('.autocomplete');
  }
  
  attachEvents() {
    this.input.addEventListener('input', (e) => this.onInput(e.target.value));
    this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.input.addEventListener('blur', () => setTimeout(() => this.close(), 150));
    this.input.addEventListener('focus', () => {
      if (this.suggestions.length) this.open();
    });
  }
  
  onInput(query) {
    clearTimeout(this.debounceTimer);
    
    if (!query.trim()) {
      this.close();
      return;
    }
    
    this.debounceTimer = setTimeout(async () => {
      try {
        const results = await this.fetchSuggestions(query);
        this.suggestions = results.slice(0, this.maxResults);
        this.selectedIndex = -1;
        this.renderSuggestions(query);
        this.open();
      } catch (err) {
        console.error('Fetch failed:', err);
      }
    }, this.debounceMs);
  }
  
  renderSuggestions(query) {
    this.listbox.innerHTML = this.suggestions.map((item, i) => {
      // Highlight matching text
      const highlighted = this.highlightMatch(item.text, query);
      return `
        <li id="ac-option-${i}" role="option" 
            class="ac-item ${i === this.selectedIndex ? 'selected' : ''}"
            aria-selected="${i === this.selectedIndex}"
            data-index="${i}">
          ${highlighted}
        </li>
      `;
    }).join('');
    
    // Add click handlers
    this.listbox.querySelectorAll('.ac-item').forEach(li => {
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(li.dataset.index);
        this.selectItem(idx);
      });
    });
  }
  
  highlightMatch(text, query) {
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  onKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
      case 'Enter':
        if (this.selectedIndex >= 0) {
          e.preventDefault();
          this.selectItem(this.selectedIndex);
        }
        break;
      case 'Escape':
        this.close();
        break;
    }
  }
  
  updateSelection() {
    this.listbox.querySelectorAll('.ac-item').forEach((li, i) => {
      const isSelected = i === this.selectedIndex;
      li.classList.toggle('selected', isSelected);
      li.setAttribute('aria-selected', isSelected);
    });
    
    // Update aria-activedescendant
    const activeId = this.selectedIndex >= 0 ? `ac-option-${this.selectedIndex}` : '';
    this.input.setAttribute('aria-activedescendant', activeId);
    
    // Scroll selected item into view
    const selected = this.listbox.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }
  
  selectItem(index) {
    const item = this.suggestions[index];
    this.input.value = item.text;
    this.close();
    this.input.dispatchEvent(new CustomEvent('autocomplete-select', { detail: item }));
  }
  
  open() {
    this.listbox.hidden = false;
    this.combobox.setAttribute('aria-expanded', 'true');
  }
  
  close() {
    this.listbox.hidden = true;
    this.combobox.setAttribute('aria-expanded', 'false');
    this.selectedIndex = -1;
  }
}

// Usage
const ac = new Autocomplete(document.getElementById('search-container'), {
  fetchSuggestions: async (query) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    return res.json(); // [{ text: "...", id: "..." }, ...]
  },
  debounceMs: 300,
  maxResults: 8
});
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design LinkedIn's Feed page with real-time updates**

### 💡 Interview-Ready Answer

```
LinkedIn Feed Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Feed Rendering                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Post Types: text, image, video, article, poll, event│    │
│  │  Each type = separate component (code-split)          │    │
│  │                                                        │    │
│  │  PostRenderer (factory pattern):                      │    │
│  │  switch (post.type) {                                 │    │
│  │    case 'text': return <TextPost />                   │    │
│  │    case 'image': return <ImagePost />                 │    │
│  │    case 'video': return <VideoPost />                 │    │
│  │    case 'poll': return <PollPost />                   │    │
│  │  }                                                     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Infinite Scroll (cursor-based pagination):                   │
│  GET /api/feed?cursor=XYZ123&count=10                        │
│  Response: { posts: [...], nextCursor: "ABC456" }            │
│  Why cursor > offset: new posts push offset, causing dupes   │
│                                                                │
│  Real-Time Updates:                                           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  SSE (Server-Sent Events) — one-way, lighter than WS │    │
│  │  EventSource('/api/feed/updates')                     │    │
│  │                                                        │    │
│  │  New post arrives → "3 new posts" banner at top        │    │
│  │  Click banner → prepend new posts (don't auto-insert  │    │
│  │  — disrupts reading experience)                        │    │
│  │                                                        │    │
│  │  Like/comment counts → update in real-time via SSE    │    │
│  │  (no user action needed — just increment counter)     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Engagement Tracking:                                         │
│  - Intersection Observer: track which posts are "viewed"     │
│  - Time spent reading (start timer on visible, stop on exit) │
│  - Batch events → send to analytics every 5 seconds          │
│  - requestIdleCallback for low-priority tracking work        │
└──────────────────────────────────────────────────────────────┘
```

#### Optimistic Updates for Like/Comment
```javascript
function useLikePost(postId) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => fetch(`/api/posts/${postId}/like`, { method: 'POST' }),
    
    // Optimistic update: immediately show liked state
    onMutate: async () => {
      await queryClient.cancelQueries(['feed']);
      
      const previousFeed = queryClient.getQueryData(['feed']);
      
      queryClient.setQueryData(['feed'], (old) => ({
        ...old,
        posts: old.posts.map(post =>
          post.id === postId
            ? { ...post, isLiked: true, likeCount: post.likeCount + 1 }
            : post
        )
      }));
      
      return { previousFeed }; // for rollback
    },
    
    // Rollback on error
    onError: (err, vars, context) => {
      queryClient.setQueryData(['feed'], context.previousFeed);
    },
    
    // Refetch to sync with server
    onSettled: () => {
      queryClient.invalidateQueries(['feed']);
    }
  });
}
```

---

## 🎯 Key Takeaways
- LinkedIn FE tests **vanilla JS fundamentals** in coding rounds — no React allowed usually
- **Autocomplete from scratch** is the #1 LinkedIn FE question — must be accessible (ARIA combobox)
- **Function composition** (pipe/compose) is a classic functional programming question
- **Event loop output prediction** — memorize: microtasks drain before next macrotask
- **Feed design** = infinite scroll + cursor pagination + SSE for real-time + optimistic updates
- **Intersection Observer** for viewport tracking (impressions, lazy loading)
- **Cursor > offset pagination** for feeds — always mention this trade-off

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Composition, Event Loop |
| Coding | Hard | Autocomplete, Accessibility, Keyboard Nav |
| System Design | Hard | Feed, Real-Time, Pagination, Engagement |
