# LinkedIn — L6 Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Frontend Engineer |
| **Level** | L6 (Staff) |
| **YOE** | 9 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Sunnyvale, CA |
| **Source** | [Blind](https://www.teamblind.com) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + HM)

---

## Round 3: Frontend Coding — Build a WYSIWYG Mention System (@mentions with autocomplete)
**Duration:** 45 minutes

### Challenge: Build an @mention system for a rich text editor: typing `@` triggers autocomplete, selected mention inserts a styled non-editable chip, mentions are serialized/deserialized, and handle cursor placement after mention.

```javascript
/**
 * @Mention System (contentEditable):
 * 
 * Features:
 * - Type '@' to trigger dropdown
 * - Filter users by typed text after '@'
 * - Select mention → insert non-editable chip
 * - Cursor placement after chip
 * - Serialize: extract { text, mentions: [{ userId, offset, length }] }
 * - Keyboard: ArrowUp/Down to navigate, Enter to select, Escape to close
 * - Debounced search (300ms)
 */
class MentionSystem {
  constructor(container, options = {}) {
    this.container = container;
    this.searchUsers = options.searchUsers || (() => []); // async (query) => [{id, name, avatar}]
    this.onSubmit = options.onSubmit || (() => {});
    
    this.dropdown = null;
    this.isActive = false;
    this.searchQuery = '';
    this.mentionStartPos = null; // caret offset when '@' was typed
    this.selectedIdx = 0;
    this.results = [];
    this.searchTimer = null;
    
    this.render();
    this.attachListeners();
  }
  
  render() {
    this.container.innerHTML = `
      <style>
        .mention-editor { min-height:120px; padding:12px; border:1px solid #d1d5db; border-radius:8px; line-height:1.6;
                          font-size:14px; font-family:-apple-system,sans-serif; outline:none; position:relative; }
        .mention-editor:focus { border-color:#0a66c2; box-shadow:0 0 0 2px rgba(10,102,194,0.2); }
        .mention-chip { display:inline; background:#e8f0fe; color:#0a66c2; border-radius:3px; padding:1px 4px;
                        font-weight:500; user-select:all; }
        .mention-dropdown { position:absolute; left:0; background:#fff; border:1px solid #e5e7eb; border-radius:8px;
                           box-shadow:0 4px 12px rgba(0,0,0,0.15); max-height:200px; overflow-y:auto; min-width:250px; z-index:100; }
        .mention-item { display:flex; align-items:center; padding:8px 12px; cursor:pointer; gap:8px; }
        .mention-item:hover, .mention-item.active { background:#f3f4f6; }
        .mention-avatar { width:32px; height:32px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center;
                          justify-content:center; font-size:14px; font-weight:600; color:#666; flex-shrink:0; }
        .mention-name { font-size:14px; font-weight:500; }
        .mention-title { font-size:12px; color:#666; }
      </style>
      <div class="mention-editor" contenteditable="true" role="textbox" 
           aria-multiline="true" aria-label="Post editor, type @ to mention someone"></div>
      <div class="mention-dropdown" style="display:none" role="listbox" aria-label="Mention suggestions"></div>
    `;
    
    this.editor = this.container.querySelector('.mention-editor');
    this.dropdown = this.container.querySelector('.mention-dropdown');
  }
  
  attachListeners() {
    this.editor.addEventListener('input', () => this.handleInput());
    this.editor.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Close dropdown on blur (with delay for click to register)
    this.editor.addEventListener('blur', () => {
      setTimeout(() => this.closeDropdown(), 200);
    });
  }
  
  handleInput() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // Find the text node and offset
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      this.closeDropdown();
      return;
    }
    
    const textNode = range.startContainer;
    const text = textNode.textContent;
    const caretOffset = range.startOffset;
    
    // Find '@' before caret
    const beforeCaret = text.substring(0, caretOffset);
    const atIndex = beforeCaret.lastIndexOf('@');
    
    if (atIndex === -1) {
      this.closeDropdown();
      return;
    }
    
    // Check: '@' should be at start or preceded by space
    if (atIndex > 0 && beforeCaret[atIndex - 1] !== ' ' && beforeCaret[atIndex - 1] !== '\n') {
      this.closeDropdown();
      return;
    }
    
    // Extract query after '@'
    const query = beforeCaret.substring(atIndex + 1);
    
    // No spaces in mention query (indicates user finished typing)
    if (query.includes(' ')) {
      this.closeDropdown();
      return;
    }
    
    this.isActive = true;
    this.searchQuery = query;
    this.mentionStartPos = { node: textNode, offset: atIndex };
    
    // Debounced search
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search(query), 150);
  }
  
  async search(query) {
    // Position dropdown near the '@' character
    this.positionDropdown();
    
    this.results = await this.searchUsers(query);
    this.selectedIdx = 0;
    this.renderDropdown();
  }
  
  renderDropdown() {
    if (this.results.length === 0) {
      this.dropdown.style.display = 'none';
      return;
    }
    
    this.dropdown.style.display = 'block';
    this.dropdown.innerHTML = this.results.map((user, i) => `
      <div class="mention-item ${i === this.selectedIdx ? 'active' : ''}" 
           data-index="${i}" role="option" aria-selected="${i === this.selectedIdx}">
        <div class="mention-avatar">${this.escapeHtml(user.name.charAt(0))}</div>
        <div>
          <div class="mention-name">${this.escapeHtml(user.name)}</div>
          ${user.title ? `<div class="mention-title">${this.escapeHtml(user.title)}</div>` : ''}
        </div>
      </div>
    `).join('');
    
    // Click handlers
    this.dropdown.querySelectorAll('.mention-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent blur
        this.selectMention(parseInt(el.dataset.index));
      });
    });
  }
  
  positionDropdown() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    
    const rect = range.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    this.dropdown.style.left = (rect.left - containerRect.left) + 'px';
    this.dropdown.style.top = (rect.bottom - containerRect.top + 4) + 'px';
  }
  
  selectMention(index) {
    const user = this.results[index];
    if (!user) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const { node, offset } = this.mentionStartPos;
    const text = node.textContent;
    const caretPos = selection.getRangeAt(0).startOffset;
    
    // Remove '@query' text
    const before = text.substring(0, offset);
    const after = text.substring(caretPos);
    
    // Create mention chip
    const chip = document.createElement('span');
    chip.className = 'mention-chip';
    chip.contentEditable = 'false';
    chip.dataset.userId = user.id;
    chip.dataset.userName = user.name;
    chip.textContent = `@${user.name}`;
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-label', `Mentioned ${user.name}`);
    
    // Replace text with: before + chip + space + after
    const parent = node.parentNode;
    
    // Text before '@'
    if (before) {
      const beforeNode = document.createTextNode(before);
      parent.insertBefore(beforeNode, node);
    }
    
    // Chip
    parent.insertBefore(chip, node);
    
    // Space after chip + remaining text
    const afterNode = document.createTextNode('\u00A0' + after); // non-breaking space
    parent.insertBefore(afterNode, node);
    
    // Remove original text node
    parent.removeChild(node);
    
    // Place cursor after the space
    const range = document.createRange();
    range.setStart(afterNode, 1); // After the nbsp
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    this.closeDropdown();
    this.editor.focus();
  }
  
  closeDropdown() {
    this.isActive = false;
    this.dropdown.style.display = 'none';
    this.results = [];
  }
  
  handleKeydown(e) {
    if (!this.isActive || this.results.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIdx = (this.selectedIdx + 1) % this.results.length;
        this.renderDropdown();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIdx = (this.selectedIdx - 1 + this.results.length) % this.results.length;
        this.renderDropdown();
        break;
        
      case 'Enter':
        e.preventDefault();
        this.selectMention(this.selectedIdx);
        break;
        
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        break;
    }
  }
  
  /**
   * Serialize editor content: extract plain text and mention positions.
   * Used for sending to backend API.
   */
  serialize() {
    const mentions = [];
    let text = '';
    
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.classList?.contains('mention-chip')) {
        const offset = text.length;
        const mentionText = node.textContent;
        text += mentionText;
        mentions.push({
          userId: node.dataset.userId,
          userName: node.dataset.userName,
          offset,
          length: mentionText.length
        });
      } else if (node.tagName === 'BR') {
        text += '\n';
      } else {
        for (const child of node.childNodes) {
          walk(child);
        }
      }
    };
    
    walk(this.editor);
    return { text, mentions };
  }
  
  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- LinkedIn L6 FE = **@mention system with contentEditable, autocomplete, non-editable chips, serialization**
- **contentEditable**: use `contenteditable="true"` — gives rich text editing capabilities natively
- **Mention chip**: `contentEditable="false"` span inside editable div — makes it non-editable, selects as unit
- **Cursor after chip**: `\u00A0` (non-breaking space) after chip — without it, cursor can't be placed after inline element
- **Trigger detection**: scan backward from caret for `@` at word boundary — check no space in query
- **Debounced search**: 150ms delay — avoids API call on every keystroke
- **Serialization**: tree walk — extract text + mention positions (offset, length) — backend stores structured data
- **`mousedown` + `preventDefault`**: prevents blur on dropdown click — blur would close dropdown before click registers
- LinkedIn FE = **engagement features** — mentions, reactions, rich text posting are core UX

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| Coding 1 | Hard | Data Structures |
| Coding 2 (this) | Very Hard | contentEditable, DOM Manipulation |
| System Design | Very Hard | LinkedIn Feed |
| HM | Medium | Culture |
