# Microsoft — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior SDE (Frontend) |
| **Level** | 63 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + Machine Coding + System Design + HM)
- **Rejection Reason:** System design — didn't discuss accessibility deeply enough for Outlook

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Deep Merge function** (like lodash merge)
2. **Follow-up: Handle circular references**

### 💡 Interview-Ready Answer

```javascript
function deepMerge(target, ...sources) {
  const seen = new WeakSet(); // Circular reference detection
  
  function merge(target, source) {
    if (seen.has(source)) return target; // Circular reference → stop
    if (isObject(source)) seen.add(source);
    
    for (const key of Object.keys(source)) {
      const targetVal = target[key];
      const sourceVal = source[key];
      
      if (Array.isArray(sourceVal)) {
        // Arrays: replace (not merge element by element)
        target[key] = [...sourceVal];
      } else if (isObject(sourceVal)) {
        if (isObject(targetVal)) {
          merge(targetVal, sourceVal); // Recursive merge
        } else {
          target[key] = {};
          merge(target[key], sourceVal);
        }
      } else {
        target[key] = sourceVal; // Primitives: overwrite
      }
    }
    return target;
  }
  
  for (const source of sources) {
    if (isObject(source)) merge(target, source);
  }
  return target;
}

function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

// Tests:
deepMerge(
  { a: 1, b: { x: 10, y: 20 } },
  { b: { y: 30, z: 40 }, c: 3 }
);
// → { a: 1, b: { x: 10, y: 30, z: 40 }, c: 3 }

// Circular reference test:
const obj = { a: 1 };
obj.self = obj;
deepMerge({}, obj); // Doesn't infinite loop
```

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an Email Compose & Thread Viewer** (Outlook-like)
   - Compose email with To/CC/BCC, rich text, attachments. Thread view with collapse/expand.

### 💡 Interview-Ready Answer

```javascript
class EmailApp {
  constructor(container) {
    this.container = container;
    this.threads = [
      {
        id: 't1',
        subject: 'Q4 Planning Meeting',
        emails: [
          { id: 'e1', from: 'alice@ms.com', to: ['bob@ms.com'], cc: ['carol@ms.com'],
            body: 'Hi team, let\'s discuss Q4 goals.', timestamp: '2025-02-10T10:00:00Z', 
            expanded: true },
          { id: 'e2', from: 'bob@ms.com', to: ['alice@ms.com'], cc: ['carol@ms.com'],
            body: 'Sounds good. I\'ll prepare the slides.', timestamp: '2025-02-10T11:30:00Z',
            expanded: false },
          { id: 'e3', from: 'carol@ms.com', to: ['alice@ms.com', 'bob@ms.com'], cc: [],
            body: 'Can we include the budget review?', timestamp: '2025-02-10T14:15:00Z',
            expanded: true },
        ]
      }
    ];
    this.composeOpen = false;
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="email-app" role="application" aria-label="Email application">
        <nav class="sidebar" role="navigation" aria-label="Email folders">
          <button class="compose-btn" id="compose-btn">+ Compose</button>
          <ul role="tree">
            <li role="treeitem" aria-selected="true">Inbox (3)</li>
            <li role="treeitem">Sent</li>
            <li role="treeitem">Drafts</li>
          </ul>
        </nav>
        
        <main class="email-content">
          ${this.composeOpen ? this.renderCompose() : this.renderThreads()}
        </main>
      </div>
    `;
    
    this.attachEvents();
  }
  
  renderCompose() {
    return `
      <form class="compose-form" id="compose-form" aria-label="Compose email">
        <div class="compose-header">
          <h2>New Message</h2>
          <button type="button" id="close-compose" aria-label="Close compose">×</button>
        </div>
        
        <div class="field-group">
          <label for="to-field">To</label>
          <div class="chip-input" id="to-container" role="listbox" aria-label="To recipients">
            <input type="email" id="to-field" placeholder="Add recipient" 
                   aria-describedby="to-hint" multiple />
          </div>
          <span id="to-hint" class="sr-only">Press Enter or comma to add recipient</span>
        </div>
        
        <div class="field-group">
          <label for="cc-field">CC</label>
          <div class="chip-input" id="cc-container">
            <input type="email" id="cc-field" placeholder="CC recipients" />
          </div>
        </div>
        
        <div class="field-group" hidden id="bcc-group">
          <label for="bcc-field">BCC</label>
          <div class="chip-input" id="bcc-container">
            <input type="email" id="bcc-field" placeholder="BCC recipients" />
          </div>
        </div>
        <button type="button" id="show-bcc" class="text-btn">Show BCC</button>
        
        <div class="field-group">
          <label for="subject-field">Subject</label>
          <input type="text" id="subject-field" placeholder="Subject" />
        </div>
        
        <div class="editor" id="editor" contenteditable="true" role="textbox" 
             aria-multiline="true" aria-label="Email body"></div>
        
        <div class="toolbar" role="toolbar" aria-label="Formatting">
          <button type="button" data-cmd="bold" aria-label="Bold" title="Bold (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button type="button" data-cmd="italic" aria-label="Italic">
            <em>I</em>
          </button>
          <button type="button" data-cmd="insertUnorderedList" aria-label="Bullet list">
            • List
          </button>
          <label class="attach-btn">
            📎 Attach
            <input type="file" id="file-input" hidden multiple 
                   accept=".pdf,.doc,.docx,.png,.jpg,.xlsx" />
          </label>
        </div>
        
        <div id="attachments" class="attachments-list" role="list"></div>
        
        <div class="compose-actions">
          <button type="submit" class="btn-primary">Send</button>
          <button type="button" id="save-draft" class="btn-secondary">Save Draft</button>
          <button type="button" id="discard" class="btn-danger">Discard</button>
        </div>
      </form>
    `;
  }
  
  renderThreads() {
    return this.threads.map(thread => `
      <article class="thread" aria-label="Email thread: ${thread.subject}">
        <h2 class="thread-subject">${thread.subject}</h2>
        <div class="thread-meta">${thread.emails.length} messages</div>
        
        <div class="email-list" role="list">
          ${thread.emails.map((email, idx) => `
            <div class="email-item ${email.expanded ? 'expanded' : 'collapsed'}" 
                 role="listitem" aria-expanded="${email.expanded}">
              
              <div class="email-header" data-email-id="${email.id}" tabindex="0"
                   role="button" aria-label="${email.expanded ? 'Collapse' : 'Expand'} email from ${email.from}">
                <span class="email-from">${email.from}</span>
                <span class="email-time">${this.formatTime(email.timestamp)}</span>
                ${!email.expanded ? `<span class="email-preview">${email.body.slice(0, 60)}...</span>` : ''}
              </div>
              
              ${email.expanded ? `
                <div class="email-details">
                  <div class="email-recipients">
                    <span>To: ${email.to.join(', ')}</span>
                    ${email.cc.length ? `<span>CC: ${email.cc.join(', ')}</span>` : ''}
                  </div>
                  <div class="email-body">${email.body}</div>
                  <div class="email-actions">
                    <button class="reply-btn" data-thread="${thread.id}" data-email="${email.id}">
                      Reply
                    </button>
                    <button class="reply-all-btn">Reply All</button>
                    <button class="forward-btn">Forward</button>
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </article>
    `).join('');
  }
  
  attachEvents() {
    // Compose button
    this.container.querySelector('#compose-btn')?.addEventListener('click', () => {
      this.composeOpen = true;
      this.render();
      this.container.querySelector('#to-field')?.focus();
    });
    
    // Close compose
    this.container.querySelector('#close-compose')?.addEventListener('click', () => {
      this.composeOpen = false;
      this.render();
    });
    
    // Chip input for To/CC/BCC
    ['to', 'cc', 'bcc'].forEach(field => {
      const input = this.container.querySelector(`#${field}-field`);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const email = input.value.trim().replace(/,$/, '');
          if (this.isValidEmail(email)) {
            this.addChip(field, email);
            input.value = '';
          }
        }
      });
    });
    
    // Toggle email expand/collapse
    this.container.querySelectorAll('.email-header').forEach(header => {
      header.addEventListener('click', () => {
        const emailId = header.dataset.emailId;
        this.toggleEmail(emailId);
      });
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleEmail(header.dataset.emailId);
        }
      });
    });
    
    // Rich text toolbar
    this.container.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.execCommand(btn.dataset.cmd, false, null);
        this.container.querySelector('#editor')?.focus();
      });
    });
    
    // File attachment
    this.container.querySelector('#file-input')?.addEventListener('change', (e) => {
      this.handleAttachments(e.target.files);
    });
    
    // Form submit
    this.container.querySelector('#compose-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendEmail();
    });
  }
  
  toggleEmail(emailId) {
    for (const thread of this.threads) {
      const email = thread.emails.find(e => e.id === emailId);
      if (email) {
        email.expanded = !email.expanded;
        break;
      }
    }
    this.render();
  }
  
  addChip(field, email) {
    const container = this.container.querySelector(`#${field}-container`);
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.setAttribute('role', 'option');
    chip.innerHTML = `${email} <button aria-label="Remove ${email}" class="chip-remove">×</button>`;
    chip.querySelector('.chip-remove').addEventListener('click', () => chip.remove());
    container.insertBefore(chip, container.querySelector('input'));
  }
  
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  handleAttachments(files) {
    const list = this.container.querySelector('#attachments');
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { // 25 MB limit
        alert(`${file.name} exceeds 25 MB limit`);
        continue;
      }
      const item = document.createElement('div');
      item.className = 'attachment-item';
      item.setAttribute('role', 'listitem');
      item.innerHTML = `
        📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)
        <button class="remove-attach" aria-label="Remove ${file.name}">×</button>
      `;
      item.querySelector('.remove-attach').addEventListener('click', () => item.remove());
      list.appendChild(item);
    }
  }
  
  formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Outlook Web — Email Client Frontend Architecture**

### 💡 Interview-Ready Answer

```
Outlook Web Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Performance Requirements:                                    │
│  - Inbox loads in <2s (including 50 threads)                 │
│  - Compose opens in <200ms                                   │
│  - Search results in <1s                                     │
│  - Smooth scroll with 10K+ emails                            │
│                                                                │
│  Data Layer:                                                  │
│  ┌────────────────────────────────────────────┐              │
│  │ IndexedDB (offline storage)                │              │
│  │  ├── emails (last 7 days cached)           │              │
│  │  ├── contacts (autocomplete)               │              │
│  │  └── drafts (auto-saved every 30s)         │              │
│  └────────────────────────────────────────────┘              │
│           ↕ sync via Service Worker                          │
│  ┌────────────────────────────────────────────┐              │
│  │ Server (Exchange/Graph API)                │              │
│  │  GET /me/messages?$top=50&$orderby=date    │              │
│  │  POST /me/sendMail                         │              │
│  │  PATCH /me/messages/{id} (read/flag)       │              │
│  └────────────────────────────────────────────┘              │
│                                                                │
│  Virtual Scrolling:                                           │
│  - Only render ~20 visible email rows at a time              │
│  - Overscan: 5 rows above + 5 below viewport                │
│  - Each row: fixed height (72px) for predictable scrolling   │
│  - Placeholder rows for loading state                        │
│                                                                │
│  Accessibility (WHERE I FAILED):                              │
│  - Full keyboard navigation: J/K to move, Enter to open     │
│  - Screen reader: aria-live for new emails                   │
│  - High contrast mode support                                │
│  - Reduced motion: disable animations                        │
│  - Focus management: trap focus in compose modal             │
│  - Announce: "Email from Alice, subject: Q4 Planning"        │
│                                                                │
│  State Management:                                            │
│  - MobX / Redux with slices:                                 │
│    mailboxSlice: { folders, selectedFolder, emails }         │
│    composeSlice: { drafts, currentDraft }                    │
│    searchSlice: { query, results, loading }                  │
│  - Optimistic updates: mark as read immediately              │
│  - Sync queue: batch pending operations when online          │
│                                                                │
│  Search:                                                      │
│  - Client-side: search cached emails (IndexedDB text index)  │
│  - Server-side: for older emails beyond cache window         │
│  - Debounced: 300ms after last keystroke                     │
│  - Highlighted matches in results (mark tag)                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Microsoft FE = **accessibility is CRITICAL** — they build for 1B+ users including disabled
- **Deep Merge** with circular reference handling using WeakSet — common Microsoft question
- **Email compose** with chip inputs, rich text (contenteditable), file attachments, thread view
- **Outlook design**: IndexedDB offline cache, Service Worker sync, virtual scrolling
- I **got rejected** because I didn't discuss accessibility deeply — always mention WCAG 2.1 AA for Microsoft
- **Keyboard navigation** patterns: J/K (Gmail), Up/Down (Outlook), Tab for elements
- Microsoft values **inclusive design** — mention screen reader announcements, focus management

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium | Deep Merge, Circular Refs, WeakSet |
| Machine Coding | Hard | Email UI, Chip Input, Rich Text, a11y |
| System Design | Hard | Outlook Web, IndexedDB, Virtual Scroll |
| HM | Medium | Growth, Collaboration |
