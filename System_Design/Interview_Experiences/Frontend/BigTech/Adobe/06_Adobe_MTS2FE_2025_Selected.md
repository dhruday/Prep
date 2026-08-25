# Adobe — MTS-2 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Frontend Engineer (MTS-2) |
| **Level** | MTS-2 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Coding — Build a Rich Text Toolbar (Bold, Italic, List)
**Duration:** 45 minutes

### Problem
Implement a simple rich text editor toolbar supporting:
- Bold, Italic, Underline toggle buttons
- Ordered & Unordered list insertion
- Undo/Redo with history
- Works with contentEditable div

### 💡 Interview-Ready Answer

```javascript
class RichTextToolbar {
  constructor(container) {
    this.container = container;
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;

    this._build();
    this._bindEvents();
    this._saveState(); // Initial state
  }

  _build() {
    this.container.innerHTML = '';
    this.container.style.cssText = 'border:1px solid #ccc;border-radius:6px;overflow:hidden;';

    // Toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.setAttribute('role', 'toolbar');
    this.toolbar.setAttribute('aria-label', 'Text formatting');
    this.toolbar.style.cssText = `
      display:flex;gap:2px;padding:6px;background:#f5f5f5;
      border-bottom:1px solid #ddd;flex-wrap:wrap;
    `;

    const buttons = [
      { cmd: 'bold', icon: 'B', label: 'Bold', style: 'font-weight:bold' },
      { cmd: 'italic', icon: 'I', label: 'Italic', style: 'font-style:italic' },
      { cmd: 'underline', icon: 'U', label: 'Underline', style: 'text-decoration:underline' },
      { type: 'separator' },
      { cmd: 'insertOrderedList', icon: '1.', label: 'Ordered list' },
      { cmd: 'insertUnorderedList', icon: '•', label: 'Unordered list' },
      { type: 'separator' },
      { cmd: 'justifyLeft', icon: '⫷', label: 'Align left' },
      { cmd: 'justifyCenter', icon: '⫸', label: 'Align center' },
      { cmd: 'justifyRight', icon: '⫹', label: 'Align right' },
      { type: 'separator' },
      { action: 'undo', icon: '↩', label: 'Undo' },
      { action: 'redo', icon: '↪', label: 'Redo' },
      { type: 'separator' },
      { action: 'clear', icon: '🗑', label: 'Clear formatting' },
    ];

    this.buttonElements = {};

    buttons.forEach(btn => {
      if (btn.type === 'separator') {
        const sep = document.createElement('div');
        sep.style.cssText = 'width:1px;background:#ccc;margin:0 4px;';
        this.toolbar.appendChild(sep);
        return;
      }

      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = btn.icon;
      el.setAttribute('aria-label', btn.label);
      el.setAttribute('title', btn.label);
      el.style.cssText = `
        border:1px solid transparent;background:none;cursor:pointer;
        padding:4px 8px;border-radius:3px;font-size:14px;min-width:30px;
        ${btn.style || ''}
      `;

      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Keep focus in editor
        if (btn.cmd) {
          this._execCommand(btn.cmd);
        } else if (btn.action === 'undo') {
          this._undo();
        } else if (btn.action === 'redo') {
          this._redo();
        } else if (btn.action === 'clear') {
          this._clearFormatting();
        }
      });

      if (btn.cmd) {
        this.buttonElements[btn.cmd] = el;
      }

      this.toolbar.appendChild(el);
    });

    this.container.appendChild(this.toolbar);

    // Editor area
    this.editor = document.createElement('div');
    this.editor.contentEditable = 'true';
    this.editor.setAttribute('role', 'textbox');
    this.editor.setAttribute('aria-multiline', 'true');
    this.editor.setAttribute('aria-label', 'Rich text editor');
    this.editor.style.cssText = `
      min-height:200px;padding:12px;outline:none;
      line-height:1.6;font-size:14px;
    `;
    this.editor.innerHTML = '<p><br></p>';
    this.container.appendChild(this.editor);
  }

  _bindEvents() {
    // Update toolbar button states on selection change
    document.addEventListener('selectionchange', () => {
      if (this.container.contains(document.activeElement)) {
        this._updateButtonStates();
      }
    });

    // Save state on input for undo/redo
    let saveTimer;
    this.editor.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => this._saveState(), 500);
    });

    // Keyboard shortcuts
    this.editor.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            this._execCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            this._execCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            this._execCommand('underline');
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              this._redo();
            } else {
              this._undo();
            }
            break;
        }
      }
    });

    // Paste as plain text option
    this.editor.addEventListener('paste', (e) => {
      // Allow rich paste by default, but sanitize
      const html = e.clipboardData.getData('text/html');
      if (html) {
        e.preventDefault();
        const sanitized = this._sanitizeHTML(html);
        document.execCommand('insertHTML', false, sanitized);
      }
    });
  }

  _execCommand(command, value = null) {
    document.execCommand(command, false, value);
    this._updateButtonStates();
    this._saveState();
  }

  _updateButtonStates() {
    const toggleCommands = ['bold', 'italic', 'underline',
                           'insertOrderedList', 'insertUnorderedList',
                           'justifyLeft', 'justifyCenter', 'justifyRight'];

    toggleCommands.forEach(cmd => {
      const btn = this.buttonElements[cmd];
      if (!btn) return;

      const active = document.queryCommandState(cmd);
      btn.style.background = active ? '#ddd' : 'none';
      btn.style.borderColor = active ? '#bbb' : 'transparent';
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  // === Undo / Redo ===

  _saveState() {
    const state = this.editor.innerHTML;

    // Avoid duplicate consecutive states
    if (this.undoStack.length > 0
      && this.undoStack[this.undoStack.length - 1] === state) {
      return;
    }

    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
  }

  _undo() {
    if (this.undoStack.length <= 1) return;

    const current = this.undoStack.pop();
    this.redoStack.push(current);
    this.editor.innerHTML = this.undoStack[this.undoStack.length - 1];
    this._placeCursorAtEnd();
  }

  _redo() {
    if (this.redoStack.length === 0) return;

    const state = this.redoStack.pop();
    this.undoStack.push(state);
    this.editor.innerHTML = state;
    this._placeCursorAtEnd();
  }

  _clearFormatting() {
    document.execCommand('removeFormat', false, null);
    this._updateButtonStates();
    this._saveState();
  }

  _placeCursorAtEnd() {
    const range = document.createRange();
    range.selectNodeContents(this.editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  _sanitizeHTML(html) {
    const allowed = ['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'OL', 'UL', 'LI', 'A', 'SPAN'];
    const div = document.createElement('div');
    div.innerHTML = html;

    const walk = (node) => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!allowed.includes(child.tagName)) {
            // Replace disallowed tag with its text content
            child.replaceWith(document.createTextNode(child.textContent));
          } else {
            // Remove dangerous attributes
            [...child.attributes].forEach(attr => {
              if (attr.name.startsWith('on') || attr.name === 'style') {
                child.removeAttribute(attr.name);
              }
            });
            walk(child);
          }
        }
      });
    };

    walk(div);
    return div.innerHTML;
  }

  // Public API
  getContent() { return this.editor.innerHTML; }
  setContent(html) { this.editor.innerHTML = html; this._saveState(); }
  getText() { return this.editor.textContent; }
  focus() { this.editor.focus(); }
}

// === Usage ===
/*
const editor = new RichTextToolbar(document.getElementById('editor'));
*/
```

## 🎯 Key Takeaways
- Adobe (Acrobat, XD, Creative Cloud) loves **rich text/editor** problems
- `document.execCommand` for formatting (though deprecated, still widely used)
- `queryCommandState` updates toolbar button active states
- Undo/Redo via innerHTML snapshot stack (simpler than operational transforms)
- Paste sanitization is critical — strip dangerous tags/attributes
- `mousedown` + `preventDefault` on toolbar buttons keeps editor focus

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | contentEditable, execCommand, Undo/Redo |
| Technical 2 | Medium | DOM, Event Delegation |
| HM | Medium | Adobe Values |
