# Amazon — L6 Frontend Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Senior Frontend Engineer |
| **Level** | L6 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Prime Video |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Phone + 3 Onsite: FE Coding + System Design + Bar Raiser)

---

## Round 3: Frontend Coding — Build a Multi-Tab Code Editor
**Duration:** 60 minutes

### Challenge: Build a multi-tab code editor with: tab management, syntax highlighting (at least for JS), unsaved changes indicator, keyboard shortcuts (Ctrl+S, Ctrl+Tab, Ctrl+W), and split view (optional).

```javascript
/**
 * Multi-Tab Code Editor:
 * 
 * - Tabs: add, close, switch, drag reorder
 * - Unsaved indicator (dot) on modified files
 * - Basic JS syntax highlighting (regex-based tokens)
 * - Ctrl+S (save), Ctrl+Tab (next tab), Ctrl+W (close tab)
 * - Responsive layout
 */
class MultiTabEditor {
  constructor(container) {
    this.container = container;
    this.tabs = []; // { id, name, content, savedContent, active }
    this.activeTabId = null;
    this.nextId = 1;
    
    this.render();
    this.attachGlobalKeyboard();
    this.addTab('untitled.js', '// Start coding here\n');
  }
  
  addTab(name, content = '') {
    const tab = {
      id: this.nextId++,
      name,
      content,
      savedContent: content,
      active: false
    };
    this.tabs.push(tab);
    this.switchTab(tab.id);
  }
  
  switchTab(id) {
    // Save current editor content
    if (this.activeTabId) {
      const current = this.getTab(this.activeTabId);
      if (current) {
        const textarea = this.container.querySelector('.editor-textarea');
        if (textarea) current.content = textarea.value;
      }
    }
    
    this.tabs.forEach(t => t.active = t.id === id);
    this.activeTabId = id;
    this.renderTabs();
    this.renderEditor();
  }
  
  closeTab(id) {
    const tab = this.getTab(id);
    if (!tab) return;
    
    // Warn if unsaved
    if (tab.content !== tab.savedContent) {
      if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
    }
    
    this.tabs = this.tabs.filter(t => t.id !== id);
    
    if (this.activeTabId === id) {
      this.activeTabId = this.tabs.length > 0 ? this.tabs[this.tabs.length - 1].id : null;
    }
    
    if (this.tabs.length === 0) {
      this.addTab('untitled.js');
      return;
    }
    
    this.tabs.forEach(t => t.active = t.id === this.activeTabId);
    this.renderTabs();
    this.renderEditor();
  }
  
  saveTab(id) {
    const tab = this.getTab(id);
    if (tab) {
      tab.savedContent = tab.content;
      this.renderTabs(); // Remove unsaved indicator
    }
  }
  
  getTab(id) {
    return this.tabs.find(t => t.id === id);
  }
  
  isUnsaved(tab) {
    return tab.content !== tab.savedContent;
  }
  
  // ---- Syntax Highlighting (Regex-Based Tokenization for JS) ----
  
  highlightJS(code) {
    // Order matters: strings first (to avoid highlighting keywords inside strings)
    const tokens = [
      // Strings (single, double, template)
      { pattern: /(["'`])(?:(?!\1|\\).|\\.)*\1/g, class: 'token-string' },
      // Comments (single-line and multi-line)
      { pattern: /\/\/[^\n]*/g, class: 'token-comment' },
      { pattern: /\/\*[\s\S]*?\*\//g, class: 'token-comment' },
      // Numbers
      { pattern: /\b\d+\.?\d*\b/g, class: 'token-number' },
      // Keywords
      { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|default|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|delete|yield)\b/g,
        class: 'token-keyword' },
      // Built-in objects
      { pattern: /\b(console|document|window|Math|Array|Object|Promise|Map|Set|JSON|Date|Error|RegExp)\b/g,
        class: 'token-builtin' },
      // Booleans/null/undefined
      { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, class: 'token-literal' },
    ];
    
    // Escape HTML first
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Apply tokens (replace with spans)
    // Use a single-pass approach: find all matches, sort by position, apply non-overlapping
    const matches = [];
    for (const token of tokens) {
      let match;
      const regex = new RegExp(token.pattern.source, token.pattern.flags);
      while ((match = regex.exec(html)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, text: match[0], cls: token.class });
      }
    }
    
    // Sort by start position, then by length (longer first for overlaps)
    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    
    // Apply non-overlapping matches
    let result = '';
    let lastEnd = 0;
    
    for (const m of matches) {
      if (m.start < lastEnd) continue; // Skip overlapping
      result += html.slice(lastEnd, m.start);
      result += `<span class="${m.cls}">${m.text}</span>`;
      lastEnd = m.end;
    }
    result += html.slice(lastEnd);
    
    return result;
  }
  
  // ---- Rendering ----
  
  render() {
    this.container.innerHTML = `
      <style>
        .editor-container { font-family: -apple-system, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; height: 500px; display: flex; flex-direction: column; }
        .tab-bar { display: flex; background: #1e1e1e; overflow-x: auto; min-height: 36px; }
        .tab-bar::-webkit-scrollbar { height: 2px; }
        .tab { display: flex; align-items: center; padding: 6px 12px; font-size: 13px; color: #888; cursor: pointer; border-right: 1px solid #333; white-space: nowrap; position: relative; user-select: none; }
        .tab.active { background: #252526; color: #fff; }
        .tab:hover { background: #2a2a2a; }
        .tab .close-btn { margin-left: 8px; width: 18px; height: 18px; border-radius: 3px; border: none; background: transparent; color: inherit; cursor: pointer; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; }
        .tab .close-btn:hover { background: #444; }
        .tab .unsaved { width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; margin-right: 6px; flex-shrink: 0; }
        .add-tab-btn { padding: 6px 12px; color: #888; cursor: pointer; background: transparent; border: none; font-size: 18px; }
        .add-tab-btn:hover { color: #fff; }
        .editor-area { position: relative; flex: 1; background: #1e1e1e; overflow: hidden; }
        .editor-textarea { position: absolute; inset: 0; width: 100%; height: 100%; padding: 12px 12px 12px 50px; font-family: 'Menlo', 'Consolas', monospace; font-size: 14px; line-height: 1.6; background: transparent; color: transparent; caret-color: #fff; border: none; outline: none; resize: none; z-index: 2; white-space: pre; overflow: auto; tab-size: 2; }
        .editor-highlight { position: absolute; inset: 0; padding: 12px 12px 12px 50px; font-family: 'Menlo', 'Consolas', monospace; font-size: 14px; line-height: 1.6; color: #d4d4d4; white-space: pre; overflow: auto; z-index: 1; pointer-events: none; }
        .line-numbers { position: absolute; left: 0; top: 0; padding: 12px 8px; font-family: 'Menlo', 'Consolas', monospace; font-size: 14px; line-height: 1.6; color: #555; text-align: right; width: 40px; z-index: 3; pointer-events: none; user-select: none; }
        .token-keyword { color: #569cd6; }
        .token-string { color: #ce9178; }
        .token-comment { color: #6a9955; font-style: italic; }
        .token-number { color: #b5cea8; }
        .token-builtin { color: #4ec9b0; }
        .token-literal { color: #569cd6; }
        .status-bar { display: flex; justify-content: space-between; padding: 2px 12px; background: #007acc; color: #fff; font-size: 12px; }
      </style>
      <div class="editor-container">
        <div class="tab-bar" id="tab-bar"></div>
        <div class="editor-area">
          <div class="line-numbers" id="line-numbers"></div>
          <div class="editor-highlight" id="editor-highlight"></div>
          <textarea class="editor-textarea" id="editor-textarea" spellcheck="false"></textarea>
        </div>
        <div class="status-bar">
          <span id="status-lang">JavaScript</span>
          <span id="status-info">Ln 1, Col 1</span>
        </div>
      </div>
    `;
    
    const textarea = this.container.querySelector('#editor-textarea');
    
    textarea.addEventListener('input', () => {
      const tab = this.getTab(this.activeTabId);
      if (tab) {
        tab.content = textarea.value;
        this.renderHighlight();
        this.renderLineNumbers();
        this.renderTabs(); // Update unsaved indicator
      }
    });
    
    textarea.addEventListener('scroll', () => {
      const highlight = this.container.querySelector('#editor-highlight');
      const lineNums = this.container.querySelector('#line-numbers');
      if (highlight) {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
      }
      if (lineNums) lineNums.scrollTop = textarea.scrollTop;
    });
    
    // Cursor position tracking
    textarea.addEventListener('keyup', () => this.updateStatusBar());
    textarea.addEventListener('click', () => this.updateStatusBar());
    
    // Tab key support
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        textarea.dispatchEvent(new Event('input'));
      }
    });
  }
  
  renderTabs() {
    const tabBar = this.container.querySelector('#tab-bar');
    if (!tabBar) return;
    
    tabBar.innerHTML = this.tabs.map(tab => `
      <div class="tab ${tab.active ? 'active' : ''}" data-id="${tab.id}">
        ${this.isUnsaved(tab) ? '<div class="unsaved"></div>' : ''}
        <span class="tab-name">${this.escapeHtml(tab.name)}</span>
        <button class="close-btn" data-close="${tab.id}" aria-label="Close ${tab.name}">&times;</button>
      </div>
    `).join('') + '<button class="add-tab-btn" id="add-tab">+</button>';
    
    // Tab click handlers
    tabBar.querySelectorAll('.tab').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn')) return;
        this.switchTab(parseInt(el.dataset.id));
      });
    });
    
    tabBar.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(parseInt(btn.dataset.close));
      });
    });
    
    tabBar.querySelector('#add-tab')?.addEventListener('click', () => {
      this.addTab(`untitled-${this.nextId}.js`);
    });
  }
  
  renderEditor() {
    const tab = this.getTab(this.activeTabId);
    const textarea = this.container.querySelector('#editor-textarea');
    if (tab && textarea) {
      textarea.value = tab.content;
      this.renderHighlight();
      this.renderLineNumbers();
    }
  }
  
  renderHighlight() {
    const textarea = this.container.querySelector('#editor-textarea');
    const highlight = this.container.querySelector('#editor-highlight');
    if (textarea && highlight) {
      highlight.innerHTML = this.highlightJS(textarea.value) + '\n'; // Trailing newline for scroll parity
    }
  }
  
  renderLineNumbers() {
    const textarea = this.container.querySelector('#editor-textarea');
    const lineNums = this.container.querySelector('#line-numbers');
    if (textarea && lineNums) {
      const count = textarea.value.split('\n').length;
      lineNums.innerHTML = Array.from({ length: count }, (_, i) => i + 1).join('\n');
    }
  }
  
  updateStatusBar() {
    const textarea = this.container.querySelector('#editor-textarea');
    const statusInfo = this.container.querySelector('#status-info');
    if (textarea && statusInfo) {
      const before = textarea.value.substring(0, textarea.selectionStart);
      const line = before.split('\n').length;
      const col = before.split('\n').pop().length + 1;
      statusInfo.textContent = `Ln ${line}, Col ${col}`;
    }
  }
  
  attachGlobalKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (this.activeTabId) this.saveTab(this.activeTabId);
      }
      // Ctrl+Tab: Next tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        const idx = this.tabs.findIndex(t => t.id === this.activeTabId);
        const next = (idx + 1) % this.tabs.length;
        this.switchTab(this.tabs[next].id);
      }
      // Ctrl+W: Close tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (this.activeTabId) this.closeTab(this.activeTabId);
      }
    });
  }
  
  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- Amazon L6 FE = **Multi-tab code editor with syntax highlighting, unsaved indicators, keyboard shortcuts**
- **Overlay technique**: transparent textarea (z-index 2, caret-color #fff) over syntax-highlighted div (z-index 1, pointer-events:none)
- **Syntax highlighting**: regex tokenizer — find all matches, sort by position, apply non-overlapping spans
- **Unsaved indicator**: compare `content !== savedContent` — yellow dot in tab
- **Tab key support**: intercept keydown, insert 2 spaces, restore cursor position
- **Line numbers**: split by `\n`, sync scrollTop between textarea and line number div
- **Status bar**: cursor position from `textarea.selectionStart` — count newlines for line, last segment length for col
- Amazon FE = **practical machine coding** — real-world components like editors, dashboards, shopping UIs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Phone Screen | Medium | JS Fundamentals |
| FE Coding (this) | Very Hard | Code Editor, Canvas, A11y |
| System Design | Very Hard | Video Streaming |
| Bar Raiser | Hard | LP + Behavioral |
