# Google — L4 Frontend Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Frontend Engineer L4 |
| **Level** | L4 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Workspace |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + FE Design + Behavioral + Googliness)

---

## Round 1: Coding (Frontend-focused)
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Pub/Sub EventBus with Wildcard Subscriptions**
2. **Follow-up: Support `once()`, `off()`, and event namespaces like `click.myPlugin`**

### 💡 Advanced EventBus with Wildcards + Namespaces

```javascript
/**
 * EventBus with:
 * - Wildcard subscriptions: 'user.*' matches 'user.created', 'user.deleted'
 * - Deep wildcards: 'user.**' matches 'user.profile.updated'
 * - Namespaced events: 'click.myPlugin' — can remove all '.myPlugin' events
 * - once(): auto-remove after first call
 * - Priority: listeners with higher priority called first
 * 
 * Time: O(k) per emit where k = matching subscribers (not total subscribers)
 * Space: O(n) where n = total subscriptions
 */
class EventBus {
  constructor() {
    this.trie = new TrieNode(); // Trie of event segments for wildcard matching
    this.namespaces = new Map(); // namespace → Set of {event, listener} for bulk removal
    this.listenerIdCounter = 0;
  }
  
  /**
   * Subscribe to an event pattern.
   * @param {string} event - Event name like 'user.created' or 'user.*'
   * @param {Function} listener
   * @param {Object} options - { once, priority, namespace }
   * @returns {Function} unsubscribe function
   */
  on(event, listener, options = {}) {
    const { once = false, priority = 0, namespace } = options;
    const id = ++this.listenerIdCounter;
    
    const entry = { id, listener, once, priority };
    
    // Split event into segments and insert into trie
    const segments = event.split('.');
    let node = this.trie;
    
    for (const segment of segments) {
      if (!node.children.has(segment)) {
        node.children.set(segment, new TrieNode());
      }
      node = node.children.get(segment);
    }
    
    // Add listener to this node, sorted by priority (descending)
    node.listeners.push(entry);
    node.listeners.sort((a, b) => b.priority - a.priority);
    
    // Track namespace for bulk removal
    if (namespace) {
      if (!this.namespaces.has(namespace)) {
        this.namespaces.set(namespace, new Set());
      }
      this.namespaces.get(namespace).add({ event, id, node, entry });
    }
    
    // Return unsubscribe function
    return () => this.offById(node, id);
  }
  
  once(event, listener, options = {}) {
    return this.on(event, listener, { ...options, once: true });
  }
  
  off(event, listener) {
    const segments = event.split('.');
    let node = this.trie;
    
    for (const segment of segments) {
      node = node.children.get(segment);
      if (!node) return;
    }
    
    node.listeners = node.listeners.filter(entry => entry.listener !== listener);
  }
  
  offById(node, id) {
    node.listeners = node.listeners.filter(entry => entry.id !== id);
  }
  
  // Remove all listeners for a namespace
  offNamespace(namespace) {
    const entries = this.namespaces.get(namespace);
    if (!entries) return;
    
    for (const { node, id } of entries) {
      this.offById(node, id);
    }
    
    this.namespaces.delete(namespace);
  }
  
  /**
   * Emit an event, calling all matching listeners.
   * Supports wildcards: 'user.*' matches 'user.created'
   * @param {string} event - Concrete event name (no wildcards)
   * @param {...any} args - Arguments passed to listeners
   */
  emit(event, ...args) {
    const segments = event.split('.');
    const matchedListeners = [];
    
    // Collect all matching listeners via trie traversal
    this._collectMatches(this.trie, segments, 0, matchedListeners);
    
    // Sort all collected listeners by priority
    matchedListeners.sort((a, b) => b.priority - a.priority);
    
    // Call listeners
    for (const entry of matchedListeners) {
      try {
        entry.listener(...args);
      } catch (err) {
        console.error(`EventBus listener error [${event}]:`, err);
      }
      
      if (entry.once) {
        // Remove from its node
        if (entry._node) {
          entry._node.listeners = entry._node.listeners.filter(e => e.id !== entry.id);
        }
      }
    }
  }
  
  _collectMatches(node, segments, index, result) {
    if (!node) return;
    
    // Reached end of event segments
    if (index === segments.length) {
      for (const entry of node.listeners) {
        result.push({ ...entry, _node: node });
      }
      return;
    }
    
    const segment = segments[index];
    
    // Exact match
    if (node.children.has(segment)) {
      this._collectMatches(node.children.get(segment), segments, index + 1, result);
    }
    
    // Single wildcard '*': matches exactly one segment
    if (node.children.has('*')) {
      this._collectMatches(node.children.get('*'), segments, index + 1, result);
    }
    
    // Double wildcard '**': matches one or more segments
    if (node.children.has('**')) {
      const doubleWild = node.children.get('**');
      // '**' can match remaining segments at any depth
      for (let i = index; i <= segments.length; i++) {
        this._collectMatches(doubleWild, segments, i, result);
      }
    }
  }
}

class TrieNode {
  constructor() {
    this.children = new Map(); // segment → TrieNode
    this.listeners = [];       // [{id, listener, once, priority}]
  }
}

// Usage:
const bus = new EventBus();

// Subscribe with wildcards
bus.on('user.*', (data) => console.log('User event:', data));
bus.on('user.**', (data) => console.log('Any user event:', data));

// Subscribe with namespace
bus.on('click', handler, { namespace: 'myPlugin' });
bus.on('hover', handler, { namespace: 'myPlugin' });

// Emit
bus.emit('user.created', { id: 1 });  // Matches both 'user.*' and 'user.**'
bus.emit('user.profile.updated', { name: 'new' }); // Only matches 'user.**'

// Remove all myPlugin listeners
bus.offNamespace('myPlugin');
```

---

## Round 2: Frontend Design
**Duration:** 45 minutes

### Questions Asked
1. **Design a Google Forms clone**
   - Form builder: drag-and-drop question types (short text, long text, MCQ, checkbox, dropdown)
   - Live preview as you build
   - Published form: respondent fills in, validation
   - Response collection and basic analytics
   - Accessible: keyboard-navigable form builder + respondent form

### 💡 Component Architecture

```
Google Forms Architecture:

State Management (Zustand / Redux):
┌──────────────────────────────────────────────┐
│ formState = {                                 │
│   id: "form-123",                            │
│   title: "Customer Survey",                   │
│   description: "Annual feedback",             │
│   questions: [                                │
│     {                                         │
│       id: "q1", type: "short_text",          │
│       title: "Name", required: true,          │
│       validation: { maxLength: 100 }          │
│     },                                        │
│     {                                         │
│       id: "q2", type: "mcq",                 │
│       title: "Satisfaction",                  │
│       options: ["Very Happy", "Happy", ...],  │
│       required: true, allowOther: true        │
│     }                                         │
│   ],                                          │
│   settings: {                                 │
│     collectEmail: true,                       │
│     limitOneResponse: false,                  │
│     shuffleQuestions: false                    │
│   },                                          │
│   theme: { headerColor: "#673ab7" }           │
│ }                                             │
└──────────────────────────────────────────────┘

Component Tree (Builder):
<FormBuilder>
  <FormHeader title description onEdit />
  <QuestionList>
    <DraggableWrapper onReorder>
      <QuestionCard question onUpdate onDelete>
        <QuestionTypeSelector />       // Dropdown to change type
        <QuestionTitle editable />
        <OptionEditor />               // For MCQ/checkbox/dropdown
        <ValidationSettings />         // Required, regex, etc.
      </QuestionCard>
    </DraggableWrapper>
  </QuestionList>
  <AddQuestion />                      // FAB or button
  <LivePreview>                        // Side panel
    <FormResponseView questions />
  </LivePreview>
</FormBuilder>

Component Tree (Respondent):
<FormResponse>
  <FormHeader title description readOnly />
  <QuestionRenderer questions>
    // Dynamic rendering based on question.type
    {question.type === 'short_text' && <ShortTextInput />}
    {question.type === 'mcq' && <RadioGroup options />}
    {question.type === 'checkbox' && <CheckboxGroup options />}
    {question.type === 'dropdown' && <SelectInput options />}
    {question.type === 'long_text' && <TextArea />}
  </QuestionRenderer>
  <SubmitButton onSubmit />
</FormResponse>

Drag-and-Drop (Question Reordering):
- HTML5 DnD API or react-beautiful-dnd
- On drop: reorder questions[] array in state
- Visual feedback: placeholder shows insertion point
- Keyboard: Ctrl+ArrowUp/Down to move question

Validation (Respondent side):
┌──────────────────────────────────────────────┐
│ validate(questions, answers) {                │
│   const errors = {};                         │
│   for (const q of questions) {               │
│     const answer = answers[q.id];            │
│     if (q.required && !answer) {             │
│       errors[q.id] = 'This is required';     │
│     }                                        │
│     if (q.validation?.pattern) {             │
│       const re = new RegExp(q.validation.pattern);│
│       if (!re.test(answer)) {                │
│         errors[q.id] = q.validation.errorMsg;│
│       }                                      │
│     }                                        │
│   }                                          │
│   return errors;                             │
│ }                                            │
│                                              │
│ Scroll to first error on submit              │
│ Show inline error below each invalid field   │
│ aria-invalid="true" + aria-describedby=error │
└──────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Google L4 FE = **EventBus with trie-based wildcard matching + Google Forms design**
- **Trie for event patterns**: split event by `.`, traverse trie — wildcards (`*`, `**`) match any segment
- **`**` wildcard**: recursive matching — try consuming 0, 1, 2, ... remaining segments
- **Namespace removal**: track all listeners per namespace → bulk `off()` — useful for plugin cleanup
- **Priority listeners**: sort by priority descending — higher priority called first
- **Google Forms components**: QuestionCard is the core — renders differently based on `question.type`
- **Validation**: declarative per-question rules — validate on submit, scroll to first error
- Google FE: **JavaScript fundamentals + component design** — know Event handling, DOM patterns, a11y

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | EventBus, Trie, Wildcards |
| Coding 2 | Medium-Hard | DOM / Async |
| FE Design | Hard | Form Builder, DnD, Validation |
| Behavioral | Medium | Googliness |
| Googliness | Medium | Thought Leadership |
