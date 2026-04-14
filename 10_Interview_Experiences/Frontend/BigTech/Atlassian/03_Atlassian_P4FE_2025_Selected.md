# Atlassian — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Frontend Engineer |
| **Level** | P4 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Sydney (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Atlassian-Interview-Questions-E115699.htm) |
| **Author** | Anonymous |
| **Team** | Confluence |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Values + Coding + Machine Coding + System Design + HM)

---

## Round 1: Values Interview
**Duration:** 45 minutes

### Questions Asked
1. **"Don't #@!% the customer"** — Tell me about a time you pushed back on a decision that would have hurt user experience.
2. **"Play, as a team"** — Describe a time you helped a struggling teammate during a critical deadline.
3. **"Be the change you seek"** — When did you proactively fix something that wasn't your responsibility?

---

## Round 2: Machine Coding
**Duration:** 75 minutes

### Challenge
**Build a Rich Text Editor with @ Mention Support** (Confluence-style)
- Basic formatting: bold, italic, underline, strikethrough
- @ mention: type `@` to trigger user search popup
- Selection-based formatting (apply bold to selected text)
- Keyboard shortcuts (Cmd+B, Cmd+I, Cmd+U)
- ContentEditable-based (not textarea)

### 💡 Rich Text Editor with @ Mentions

```javascript
class RichTextEditor {
  constructor(container, options = {}) {
    this.users = options.users || [];
    this.onMention = options.onMention || (() => {});
    this.mentionPopup = null;
    this.mentionQuery = '';
    this.mentionStartOffset = -1;
    this.selectedMentionIndex = 0;
    
    this.container = container;
    this.container.innerHTML = `
      <div class="rte-toolbar" role="toolbar" aria-label="Formatting options">
        <button data-cmd="bold" aria-label="Bold (Cmd+B)" aria-pressed="false"><b>B</b></button>
        <button data-cmd="italic" aria-label="Italic (Cmd+I)" aria-pressed="false"><i>I</i></button>
        <button data-cmd="underline" aria-label="Underline (Cmd+U)" aria-pressed="false"><u>U</u></button>
        <button data-cmd="strikethrough" aria-label="Strikethrough" aria-pressed="false"><s>S</s></button>
      </div>
      <div class="rte-content" contenteditable="true" role="textbox" aria-multiline="true"
           aria-label="Rich text editor" spellcheck="true"></div>
      <div class="rte-mention-popup" role="listbox" aria-label="User suggestions" hidden></div>
    `;
    
    this.editor = this.container.querySelector('.rte-content');
    this.toolbar = this.container.querySelector('.rte-toolbar');
    this.mentionPopupEl = this.container.querySelector('.rte-mention-popup');
    
    this.setupToolbar();
    this.setupKeyboardShortcuts();
    this.setupMentionDetection();
    this.setupSelectionTracking();
  }
  
  setupToolbar() {
    this.toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cmd]');
      if (!btn) return;
      
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      
      // Use execCommand for formatting (still widely supported in contenteditable)
      document.execCommand(cmd, false, null);
      this.updateToolbarState();
      this.editor.focus();
    });
  }
  
  setupKeyboardShortcuts() {
    this.editor.addEventListener('keydown', (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      
      if (isMeta && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold', false, null);
      } else if (isMeta && e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic', false, null);
      } else if (isMeta && e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline', false, null);
      }
      
      // Mention popup keyboard navigation
      if (this.mentionPopup) {
        const items = this.mentionPopupEl.querySelectorAll('[role="option"]');
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedMentionIndex = Math.min(this.selectedMentionIndex + 1, items.length - 1);
          this.updateMentionSelection(items);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectedMentionIndex = Math.max(this.selectedMentionIndex - 1, 0);
          this.updateMentionSelection(items);
        } else if (e.key === 'Enter' && items.length > 0) {
          e.preventDefault();
          this.insertMention(this.filteredUsers[this.selectedMentionIndex]);
        } else if (e.key === 'Escape') {
          this.closeMentionPopup();
        }
      }
      
      this.updateToolbarState();
    });
  }
  
  setupMentionDetection() {
    this.editor.addEventListener('input', () => {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType !== Node.TEXT_NODE) return;
      
      const text = textNode.textContent;
      const cursorPos = range.startOffset;
      
      // Find @ character before cursor
      const beforeCursor = text.substring(0, cursorPos);
      const atIndex = beforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1) {
        const query = beforeCursor.substring(atIndex + 1);
        
        // Only trigger if @ is at start or preceded by whitespace
        if (atIndex === 0 || /\s/.test(text[atIndex - 1])) {
          // No spaces in query (mention query is single word or compound)
          if (!/\s/.test(query) || query.length === 0) {
            this.mentionQuery = query.toLowerCase();
            this.mentionStartOffset = atIndex;
            this.mentionTextNode = textNode;
            this.showMentionPopup();
            return;
          }
        }
      }
      
      this.closeMentionPopup();
    });
  }
  
  showMentionPopup() {
    this.filteredUsers = this.users.filter(user =>
      user.name.toLowerCase().includes(this.mentionQuery) ||
      user.username.toLowerCase().includes(this.mentionQuery)
    ).slice(0, 5);
    
    if (this.filteredUsers.length === 0) {
      this.closeMentionPopup();
      return;
    }
    
    this.mentionPopup = true;
    this.selectedMentionIndex = 0;
    
    this.mentionPopupEl.hidden = false;
    this.mentionPopupEl.innerHTML = this.filteredUsers.map((user, idx) => `
      <div class="mention-item ${idx === 0 ? 'selected' : ''}" 
           role="option" aria-selected="${idx === 0}"
           data-index="${idx}">
        <img src="${this._sanitize(user.avatar)}" alt="" width="24" height="24" class="mention-avatar">
        <div>
          <div class="mention-name">${this._sanitize(user.name)}</div>
          <div class="mention-username">@${this._sanitize(user.username)}</div>
        </div>
      </div>
    `).join('');
    
    // Click to select mention
    this.mentionPopupEl.addEventListener('click', (e) => {
      const item = e.target.closest('[data-index]');
      if (item) {
        this.insertMention(this.filteredUsers[parseInt(item.dataset.index)]);
      }
    }, { once: true });
    
    // Position popup near cursor
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    const editorRect = this.editor.getBoundingClientRect();
    this.mentionPopupEl.style.left = `${rect.left - editorRect.left}px`;
    this.mentionPopupEl.style.top = `${rect.bottom - editorRect.top + 4}px`;
  }
  
  insertMention(user) {
    // Replace @query with mention chip
    const text = this.mentionTextNode.textContent;
    const beforeMention = text.substring(0, this.mentionStartOffset);
    const afterMention = text.substring(
      this.mentionStartOffset + 1 + this.mentionQuery.length
    );
    
    // Create mention element
    const mention = document.createElement('span');
    mention.className = 'mention-chip';
    mention.contentEditable = 'false'; // Non-editable chip
    mention.setAttribute('data-user-id', user.id);
    mention.textContent = `@${user.name}`;
    
    // Split text node and insert mention
    this.mentionTextNode.textContent = beforeMention;
    const afterNode = document.createTextNode('\u00A0' + afterMention); // Non-breaking space after
    
    const parent = this.mentionTextNode.parentNode;
    parent.insertBefore(mention, this.mentionTextNode.nextSibling);
    parent.insertBefore(afterNode, mention.nextSibling);
    
    // Move cursor after the mention
    const range = document.createRange();
    range.setStart(afterNode, 1);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    this.closeMentionPopup();
    this.onMention(user);
  }
  
  closeMentionPopup() {
    this.mentionPopup = null;
    this.mentionPopupEl.hidden = true;
    this.mentionPopupEl.innerHTML = '';
  }
  
  updateMentionSelection(items) {
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === this.selectedMentionIndex);
      item.setAttribute('aria-selected', idx === this.selectedMentionIndex);
    });
  }
  
  updateToolbarState() {
    // Update aria-pressed based on current selection formatting
    this.toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
      const isActive = document.queryCommandState(btn.dataset.cmd);
      btn.setAttribute('aria-pressed', isActive);
      btn.classList.toggle('active', isActive);
    });
  }
  
  setupSelectionTracking() {
    document.addEventListener('selectionchange', () => {
      if (this.editor.contains(document.getSelection().anchorNode)) {
        this.updateToolbarState();
      }
    });
  }
  
  // Get content as HTML
  getHTML() {
    return this.editor.innerHTML;
  }
  
  // Get mentions from content
  getMentions() {
    return Array.from(this.editor.querySelectorAll('.mention-chip')).map(el => ({
      userId: el.dataset.userId,
      name: el.textContent
    }));
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Atlassian = **Values + collaborative editing + contenteditable + ARIA**
- **Values interview is Pass/Fail** — prepare 6-8 STAR stories mapped to Atlassian's 5 values
- **@ mention detection**: find last `@` before cursor, check preceded by whitespace, filter users by query
- **Mention insertion**: split text node → insert `contentEditable=false` span → move cursor after
- **`contentEditable` gotchas**: browser inconsistencies, need `document.execCommand` for formatting
- **Toolbar state sync**: `document.queryCommandState()` + `selectionchange` event → update `aria-pressed`
- **Non-breaking space** after mention chip: prevents cursor from getting trapped
- Atlassian P4 interviews: strong emphasis on **teamwork, values alignment, and clean code**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Medium | Atlassian Culture, STAR |
| Coding | Medium-Hard | DSA |
| Machine Coding | Hard | ContentEditable, @ Mentions, ARIA |
| System Design | Hard | Collaborative Editing |
| HM | Medium | Growth Mindset |
