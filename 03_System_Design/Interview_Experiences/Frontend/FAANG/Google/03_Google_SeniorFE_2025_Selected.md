# Google — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Blind](https://www.teamblind.com/post/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + FE Specific + System Design + Behavioral Googleyness)
- **Timeline:** 3 weeks (phone screen → on-site loop)
- **Note:** Google FE interviews include a unique "Frontend Specific" round

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Design Browser History** — Forward, Back, Visit (LeetCode 1472)
2. **Follow-up: Make it memory-efficient with an LRU-like eviction**

### 💡 Interview-Ready Answer

```javascript
class BrowserHistory {
  constructor(homepage) {
    this.history = [homepage];
    this.current = 0; // pointer to current page
  }
  
  visit(url) {
    // Clear forward history when visiting new page
    this.history.length = this.current + 1;
    this.history.push(url);
    this.current++;
  }
  
  back(steps) {
    this.current = Math.max(0, this.current - steps);
    return this.history[this.current];
  }
  
  forward(steps) {
    this.current = Math.min(this.history.length - 1, this.current + steps);
    return this.history[this.current];
  }
}
// Time: O(1) for all ops, Space: O(n)

// Follow-up: Memory-efficient with max history size
class BoundedBrowserHistory {
  constructor(homepage, maxSize = 100) {
    this.maxSize = maxSize;
    // Doubly linked list for O(1) removal from front
    this.head = { url: null, prev: null, next: null };
    this.tail = { url: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.size = 0;
    
    this.current = this.addNode(homepage);
  }
  
  addNode(url) {
    const node = { url, prev: null, next: null };
    // Remove everything after current
    if (this.current) {
      node.prev = this.current;
      this.current.next = node;
      node.next = this.tail;
      this.tail.prev = node;
    }
    this.size++;
    
    // Evict oldest if over max
    while (this.size > this.maxSize) {
      this.removeFirst();
    }
    return node;
  }
  
  removeFirst() {
    const first = this.head.next;
    if (first === this.tail) return;
    this.head.next = first.next;
    first.next.prev = this.head;
    this.size--;
  }
  
  visit(url) {
    this.current = this.addNode(url);
    return this.current.url;
  }
  
  back(steps) {
    while (steps > 0 && this.current.prev !== this.head) {
      this.current = this.current.prev;
      steps--;
    }
    return this.current.url;
  }
  
  forward(steps) {
    while (steps > 0 && this.current.next !== this.tail) {
      this.current = this.current.next;
      steps--;
    }
    return this.current.url;
  }
}
```

---

## Round 2: Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Task Scheduler with dependencies** (Topological Sort)
2. **Follow-up: Find the minimum time to complete all tasks if max K parallel tasks**

### 💡 Interview-Ready Answer

```javascript
function minTimeToComplete(tasks, dependencies, maxParallel) {
  // Build adjacency list and in-degree
  const inDegree = new Map();
  const adj = new Map();
  const duration = new Map();
  
  for (const [id, dur] of tasks) {
    inDegree.set(id, 0);
    adj.set(id, []);
    duration.set(id, dur);
  }
  
  for (const [from, to] of dependencies) {
    adj.get(from).push(to);
    inDegree.set(to, inDegree.get(to) + 1);
  }
  
  // BFS with time tracking
  // Use a priority queue: process shortest tasks first when constrained
  const ready = []; // [taskId, startTime]
  const finishTime = new Map(); // taskId → when it finishes
  
  for (const [id, deg] of inDegree) {
    if (deg === 0) ready.push([id, 0]);
  }
  
  // Simulate execution with max parallel constraint
  const running = []; // [finishTime, taskId] — sorted by finishTime
  let time = 0;
  
  while (ready.length > 0 || running.length > 0) {
    // Start tasks if parallel slots available
    while (ready.length > 0 && running.length < maxParallel) {
      const [taskId, earliest] = ready.shift();
      const startTime = Math.max(time, earliest);
      const endTime = startTime + duration.get(taskId);
      running.push([endTime, taskId]);
      running.sort((a, b) => a[0] - b[0]);
      finishTime.set(taskId, endTime);
    }
    
    if (running.length === 0) break;
    
    // Advance time to next task completion
    const [nextFinish, completedTask] = running.shift();
    time = nextFinish;
    
    // Unlock dependent tasks
    for (const next of adj.get(completedTask)) {
      inDegree.set(next, inDegree.get(next) - 1);
      if (inDegree.get(next) === 0) {
        ready.push([next, time]);
      }
    }
  }
  
  return Math.max(...finishTime.values());
}

// Example:
// tasks: [['A', 3], ['B', 2], ['C', 4], ['D', 1]]
// deps: [['A', 'C'], ['B', 'C'], ['C', 'D']]
// maxParallel: 2
// A(3) and B(2) run in parallel → B finishes t=2, A finishes t=3
// C starts t=3 (depends on A,B), finishes t=7
// D starts t=7, finishes t=8
// Answer: 8
```

---

## Round 3: Frontend Specific
**Duration:** 45 minutes

### Questions Asked
1. **Build an accessible Autocomplete/Combobox from scratch**
   - Must handle: keyboard navigation, ARIA roles, debounced API calls, loading states

### 💡 Interview-Ready Answer

```javascript
class AccessibleAutocomplete {
  constructor(container, fetchSuggestions) {
    this.container = container;
    this.fetchSuggestions = fetchSuggestions;
    this.suggestions = [];
    this.activeIndex = -1;
    this.isOpen = false;
    this.abortController = null;
    this.debounceTimer = null;
    
    this.render();
    this.attachEvents();
  }
  
  render() {
    const id = `autocomplete-${Date.now()}`;
    
    this.container.innerHTML = `
      <div class="autocomplete-wrapper" role="combobox" 
           aria-expanded="false" aria-haspopup="listbox" aria-owns="${id}-listbox">
        <input type="text" 
               id="${id}-input"
               role="combobox"
               aria-autocomplete="list"
               aria-controls="${id}-listbox"
               aria-activedescendant=""
               autocomplete="off"
               placeholder="Search..." />
        <div id="${id}-listbox" role="listbox" class="suggestions-list" hidden>
        </div>
        <div id="${id}-status" role="status" aria-live="polite" class="sr-only"></div>
      </div>
    `;
    
    this.input = this.container.querySelector('input');
    this.listbox = this.container.querySelector('[role="listbox"]');
    this.status = this.container.querySelector('[role="status"]');
    this.wrapper = this.container.querySelector('.autocomplete-wrapper');
  }
  
  attachEvents() {
    this.input.addEventListener('input', (e) => {
      this.onInput(e.target.value);
    });
    
    this.input.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.moveActive(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.moveActive(-1);
          break;
        case 'Enter':
          e.preventDefault();
          if (this.activeIndex >= 0) this.selectItem(this.activeIndex);
          break;
        case 'Escape':
          this.close();
          break;
      }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) this.close();
    });
  }
  
  onInput(query) {
    clearTimeout(this.debounceTimer);
    
    if (query.length < 2) {
      this.close();
      return;
    }
    
    this.debounceTimer = setTimeout(() => this.search(query), 300);
  }
  
  async search(query) {
    // Cancel previous in-flight request
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    
    this.status.textContent = 'Searching...';
    
    try {
      this.suggestions = await this.fetchSuggestions(query, this.abortController.signal);
      this.activeIndex = -1;
      this.renderSuggestions();
      this.open();
      
      this.status.textContent = 
        this.suggestions.length === 0
          ? 'No results found'
          : `${this.suggestions.length} suggestions available. Use arrow keys to navigate.`;
    } catch (err) {
      if (err.name !== 'AbortError') {
        this.status.textContent = 'Error loading suggestions';
      }
    }
  }
  
  renderSuggestions() {
    this.listbox.innerHTML = this.suggestions.map((item, i) => `
      <div role="option" 
           id="option-${i}"
           class="suggestion-item ${i === this.activeIndex ? 'active' : ''}"
           aria-selected="${i === this.activeIndex}"
           data-index="${i}">
        ${this.highlightMatch(item.label, this.input.value)}
      </div>
    `).join('');
    
    // Attach click handlers
    this.listbox.querySelectorAll('[role="option"]').forEach(option => {
      option.addEventListener('click', () => {
        this.selectItem(parseInt(option.dataset.index));
      });
    });
  }
  
  highlightMatch(text, query) {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  moveActive(direction) {
    if (!this.isOpen || this.suggestions.length === 0) return;
    
    this.activeIndex = (this.activeIndex + direction + this.suggestions.length) % this.suggestions.length;
    this.renderSuggestions();
    
    // Update ARIA
    this.input.setAttribute('aria-activedescendant', `option-${this.activeIndex}`);
    
    // Scroll into view
    const activeOption = this.listbox.querySelector('.active');
    if (activeOption) activeOption.scrollIntoView({ block: 'nearest' });
  }
  
  selectItem(index) {
    const item = this.suggestions[index];
    if (!item) return;
    
    this.input.value = item.label;
    this.close();
    this.input.focus();
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('autocomplete-select', { detail: item }));
  }
  
  open() {
    this.isOpen = true;
    this.listbox.hidden = false;
    this.wrapper.setAttribute('aria-expanded', 'true');
  }
  
  close() {
    this.isOpen = false;
    this.listbox.hidden = true;
    this.wrapper.setAttribute('aria-expanded', 'false');
    this.activeIndex = -1;
    this.input.removeAttribute('aria-activedescendant');
  }
}
```

---

## Round 4: System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Google Calendar Web Application**
   - Month/Week/Day views, event creation/editing, recurring events, timezone support

### 💡 Interview-Ready Answer

```
Google Calendar Frontend Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Calendar Grid Rendering:                                     │
│  - CSS Grid for layout (7 columns for week, 12 rows for     │
│    month, 24 rows * 4 = 96 for day/15-min slots)            │
│  - Events positioned absolutely within day cells             │
│  - Overlapping events: column layout algorithm               │
│                                                                │
│  Overlap Resolution Algorithm:                                │
│  1. Sort events by start time                                │
│  2. Group overlapping events into "clusters"                 │
│  3. For each cluster: assign columns (leftmost available)    │
│  4. Width = 1 / maxColumnsInCluster                          │
│                                                                │
│  function layoutEvents(events) {                             │
│    events.sort((a, b) => a.start - b.start);                │
│    const columns = [];                                       │
│    for (const event of events) {                             │
│      let col = 0;                                            │
│      while (columns[col]?.some(e =>                          │
│        e.end > event.start)) col++;                          │
│      (columns[col] ??= []).push(event);                      │
│      event.column = col;                                     │
│      event.totalColumns = columns.length;                    │
│    }                                                          │
│    return events.map(e => ({                                 │
│      ...e,                                                    │
│      left: `${(e.column / e.totalColumns) * 100}%`,         │
│      width: `${(1 / e.totalColumns) * 100}%`,               │
│      top: `${(e.start.hours * 60 + e.start.minutes) * px}`, │
│    }));                                                       │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘

Recurring Events:
- RRULE (iCalendar standard): "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=..."
- Don't store every occurrence — store the rule + exceptions
- Generate occurrences on-the-fly for the visible date range
- Editing single occurrence → create exception (EXDATE + new event)
- Editing "this and following" → split rule + create new rule

Timezone Handling:
- Store all events in UTC
- Display in user's local timezone (or event's timezone)
- Edge case: recurring event at "9 AM" → when DST changes,
  still show at 9 AM local (not 8 AM or 10 AM)
- Solution: Store as "wall clock time" + timezone ID, not UTC
  "Every Monday at 9:00 America/Los_Angeles"
  Compute UTC for each occurrence at render time

Performance:
- Only fetch events for visible date range + 1 month buffer
- Virtualize day view: only render visible hours
- Prefetch adjacent months on idle (requestIdleCallback)
- Service Worker: cache events for offline viewing
```

---

## 🎯 Key Takeaways
- Google FE L5 has a **dedicated Frontend Specific round** — not just generic coding
- **Accessible Autocomplete/Combobox** is the #1 asked FE coding question at Google
- **ARIA roles** (combobox, listbox, option) + keyboard navigation = mandatory
- **Calendar overlap algorithm** = interval scheduling + column assignment
- **Recurring events** → RRULE standard, don't expand all occurrences
- **Timezone edge case** with DST + recurring events = deep knowledge differentiator
- AbortController for cancelling requests is expected in any fetch-related question

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Linked List, Browser History |
| Coding 2 | Hard | Topological Sort, Scheduling |
| FE Specific | Hard | a11y, ARIA, Combobox Pattern |
| System Design | Hard | Calendar, Recurring Events, TZ |
| Behavioral | Medium | Googleyness |
