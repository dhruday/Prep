# Atlassian — Senior Frontend Engineer Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Frontend Engineer |
| **Level** | P4 |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Sydney, Australia (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Confluence |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + Values + FE Coding + System Design + HM)

---

## Round 3: Frontend Coding — Build a Confluence-Style Block Editor
**Duration:** 90 minutes

### Challenge: Build a block-based editor like Confluence or Notion: supports paragraph, heading, code, list, and quote blocks. Drag to reorder, slash (/) commands to add blocks, keyboard navigation between blocks.

```javascript
/**
 * Confluence-Style Block Editor:
 * 
 * - Block types: paragraph, heading (h1-h3), code, bullet_list, quote
 * - Slash command menu ("/") for inserting block types
 * - Drag handle for block reordering
 * - Arrow key navigation between blocks
 * - Placeholder text when empty
 * - Delete block when backspacing on empty block
 */
class BlockEditor {
  constructor(container) {
    this.container = container;
    this.blocks = [
      { id: this.uid(), type: 'heading', level: 1, content: 'Welcome to the Block Editor' },
      { id: this.uid(), type: 'paragraph', content: 'Start typing or use / to add blocks.' },
    ];
    this.focusedBlockId = null;
    this.slashMenuOpen = false;
    this.slashMenuFilter = '';
    this.slashMenuBlockId = null;
    this.draggedBlockId = null;
    this.dropTargetIdx = -1;
    
    this.blockTypes = [
      { type: 'paragraph', label: 'Text', icon: 'T', desc: 'Plain text block' },
      { type: 'heading', label: 'Heading 1', icon: 'H1', desc: 'Large heading', level: 1 },
      { type: 'heading', label: 'Heading 2', icon: 'H2', desc: 'Medium heading', level: 2 },
      { type: 'heading', label: 'Heading 3', icon: 'H3', desc: 'Small heading', level: 3 },
      { type: 'code', label: 'Code', icon: '</>', desc: 'Code block' },
      { type: 'bullet_list', label: 'Bullet List', icon: '•', desc: 'Unordered list' },
      { type: 'quote', label: 'Quote', icon: '"', desc: 'Block quote' },
    ];
    
    this.render();
    this.attachGlobalListeners();
  }
  
  uid() { return 'b_' + Math.random().toString(36).slice(2, 9); }
  
  render() {
    this.container.innerHTML = `
      <style>
        .be-editor { max-width:720px; margin:0 auto; font-family:-apple-system,BlinkMacSystemFont,sans-serif; padding:20px; }
        .be-block-wrapper { position:relative; display:flex; align-items:flex-start; margin:2px 0; border-radius:4px; }
        .be-block-wrapper:hover .be-drag-handle { opacity:1; }
        .be-block-wrapper.drop-above { border-top:2px solid #276ef1; }
        .be-block-wrapper.drop-below { border-bottom:2px solid #276ef1; }
        .be-drag-handle { opacity:0; cursor:grab; padding:4px; margin-right:4px; color:#999; font-size:16px; user-select:none; transition:opacity 0.15s; margin-top:4px; }
        .be-drag-handle:active { cursor:grabbing; }
        .be-block { flex:1; outline:none; min-height:1.5em; padding:4px 8px; border-radius:4px; line-height:1.6; }
        .be-block:focus { background:#f8f9fa; }
        .be-block[data-placeholder]:empty::before { content:attr(data-placeholder); color:#adb5bd; pointer-events:none; }
        .be-block.heading-1 { font-size:28px; font-weight:700; line-height:1.2; margin:12px 0 4px; }
        .be-block.heading-2 { font-size:22px; font-weight:600; line-height:1.3; margin:8px 0 4px; }
        .be-block.heading-3 { font-size:18px; font-weight:600; line-height:1.4; margin:6px 0 4px; }
        .be-block.code { font-family:'SF Mono',Monaco,monospace;  font-size:13px; background:#f1f3f5; padding:8px 12px; border-radius:6px; white-space:pre-wrap; }
        .be-block.bullet_list { padding-left:24px; }
        .be-block.bullet_list::before { content:'•'; position:absolute; left:28px; color:#666; }
        .be-block.quote { border-left:3px solid #276ef1; padding-left:16px; color:#555; font-style:italic; }
        .be-slash-menu { position:absolute; left:40px; top:100%; background:#fff; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.12); z-index:100; width:280px; overflow:hidden; }
        .be-slash-item { display:flex; align-items:center; gap:10px; padding:8px 12px; cursor:pointer; font-size:14px; }
        .be-slash-item:hover, .be-slash-item.active { background:#f0f6ff; }
        .be-slash-icon { width:28px; height:28px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; border-radius:4px; font-weight:600; font-size:12px; }
        .be-slash-desc { font-size:12px; color:#888; }
        .be-add-btn { margin:8px 0 0 28px; padding:4px 12px; border:1px dashed #d1d5db; border-radius:4px; cursor:pointer; font-size:13px; color:#888; background:none; }
        .be-add-btn:hover { border-color:#276ef1; color:#276ef1; }
      </style>
      <div class="be-editor" id="block-editor">
        ${this.blocks.map((block, idx) => this.renderBlock(block, idx)).join('')}
        <button class="be-add-btn" id="add-block-btn">+ Add a block</button>
      </div>
      <div id="slash-menu-portal"></div>
    `;
    
    this.attachBlockListeners();
    
    this.container.querySelector('#add-block-btn')?.addEventListener('click', () => {
      this.addBlockAfter(this.blocks[this.blocks.length - 1]?.id, 'paragraph');
    });
  }
  
  renderBlock(block, idx) {
    const typeClass = block.type === 'heading' ? `heading-${block.level || 1}` : block.type;
    const tag = block.type === 'heading' ? 'div' : 'div';
    const placeholder = block.type === 'code' ? 'Write code...' : 
                         block.type === 'heading' ? `Heading ${block.level || 1}` :
                         "Type '/' for commands...";
    
    return `
      <div class="be-block-wrapper" data-block-id="${block.id}" draggable="false">
        <div class="be-drag-handle" draggable="true" data-drag-id="${block.id}" title="Drag to reorder">⠿</div>
        <${tag} class="be-block ${typeClass}" 
          contenteditable="true" 
          data-block-id="${block.id}" 
          data-type="${block.type}"
          data-placeholder="${placeholder}"
          role="textbox"
          aria-label="${block.type} block"
        >${this.escapeHtml(block.content || '')}</${tag}>
      </div>
    `;
  }
  
  attachBlockListeners() {
    // Content editable input handling
    this.container.querySelectorAll('.be-block[contenteditable]').forEach(el => {
      el.addEventListener('input', (e) => this.onBlockInput(el));
      el.addEventListener('keydown', (e) => this.onBlockKeyDown(e, el));
      el.addEventListener('focus', () => { this.focusedBlockId = el.dataset.blockId; });
    });
    
    // Drag and drop on handles
    this.container.querySelectorAll('.be-drag-handle').forEach(handle => {
      handle.addEventListener('dragstart', (e) => {
        this.draggedBlockId = handle.dataset.dragId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedBlockId);
      });
    });
    
    this.container.querySelectorAll('.be-block-wrapper').forEach(wrapper => {
      wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Show drop indicator
        this.container.querySelectorAll('.be-block-wrapper').forEach(w => {
          w.classList.remove('drop-above', 'drop-below');
        });
        
        const rect = wrapper.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        wrapper.classList.add(e.clientY < midY ? 'drop-above' : 'drop-below');
      });
      
      wrapper.addEventListener('dragleave', () => {
        wrapper.classList.remove('drop-above', 'drop-below');
      });
      
      wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        wrapper.classList.remove('drop-above', 'drop-below');
        
        const targetId = wrapper.dataset.blockId;
        const rect = wrapper.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        
        this.moveBlock(this.draggedBlockId, targetId, insertBefore);
        this.draggedBlockId = null;
      });
    });
  }
  
  onBlockInput(el) {
    const blockId = el.dataset.blockId;
    const block = this.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const text = el.textContent || '';
    block.content = text;
    
    // Check for slash command
    if (text.startsWith('/')) {
      this.slashMenuFilter = text.slice(1).toLowerCase();
      this.slashMenuBlockId = blockId;
      this.showSlashMenu(el);
    } else {
      this.hideSlashMenu();
    }
  }
  
  onBlockKeyDown(e, el) {
    const blockId = el.dataset.blockId;
    const blockIdx = this.blocks.findIndex(b => b.id === blockId);
    
    // Slash menu navigation
    if (this.slashMenuOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        this.navigateSlashMenu(e.key);
        return;
      }
      if (e.key === 'Escape') {
        this.hideSlashMenu();
        return;
      }
    }
    
    // ArrowUp at start of block → focus previous block
    if (e.key === 'ArrowUp' && this.isCaretAtStart(el)) {
      e.preventDefault();
      if (blockIdx > 0) this.focusBlock(this.blocks[blockIdx - 1].id, 'end');
    }
    
    // ArrowDown at end of block → focus next block
    if (e.key === 'ArrowDown' && this.isCaretAtEnd(el)) {
      e.preventDefault();
      if (blockIdx < this.blocks.length - 1) this.focusBlock(this.blocks[blockIdx + 1].id, 'start');
    }
    
    // Enter → create new block after current
    if (e.key === 'Enter' && !e.shiftKey && !this.slashMenuOpen) {
      const block = this.blocks[blockIdx];
      if (block && block.type !== 'code') {
        e.preventDefault();
        this.addBlockAfter(blockId, 'paragraph');
      }
    }
    
    // Backspace on empty block → delete block, focus previous
    if (e.key === 'Backspace' && (el.textContent || '') === '') {
      if (this.blocks.length > 1) {
        e.preventDefault();
        const prevId = blockIdx > 0 ? this.blocks[blockIdx - 1].id : this.blocks[1].id;
        this.deleteBlock(blockId);
        this.focusBlock(prevId, 'end');
      }
    }
  }
  
  isCaretAtStart(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return true;
    const range = sel.getRangeAt(0);
    return range.startOffset === 0 && range.startContainer === el.firstChild || range.startContainer === el;
  }
  
  isCaretAtEnd(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return true;
    const range = sel.getRangeAt(0);
    const text = el.textContent || '';
    return range.endOffset === (range.endContainer.textContent || '').length;
  }
  
  // ---- Slash Menu ----
  
  showSlashMenu(anchorEl) {
    this.slashMenuOpen = true;
    this.slashMenuActiveIdx = 0;
    
    const filtered = this.blockTypes.filter(bt =>
      bt.label.toLowerCase().includes(this.slashMenuFilter) ||
      bt.type.toLowerCase().includes(this.slashMenuFilter)
    );
    
    const portal = this.container.querySelector('#slash-menu-portal');
    if (!portal) return;
    
    const rect = anchorEl.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    portal.innerHTML = `
      <div class="be-slash-menu" style="position:fixed; left:${rect.left}px; top:${rect.bottom + 4}px;">
        ${filtered.map((bt, i) => `
          <div class="be-slash-item ${i === this.slashMenuActiveIdx ? 'active' : ''}" data-idx="${i}">
            <div class="be-slash-icon">${bt.icon}</div>
            <div>
              <div>${bt.label}</div>
              <div class="be-slash-desc">${bt.desc}</div>
            </div>
          </div>
        `).join('')}
        ${filtered.length === 0 ? '<div style="padding:12px;color:#888;font-size:13px;">No results</div>' : ''}
      </div>
    `;
    
    portal.querySelectorAll('.be-slash-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent blur
        const idx = parseInt(item.dataset.idx);
        this.selectSlashMenuItem(filtered[idx]);
      });
    });
  }
  
  hideSlashMenu() {
    this.slashMenuOpen = false;
    const portal = this.container.querySelector('#slash-menu-portal');
    if (portal) portal.innerHTML = '';
  }
  
  navigateSlashMenu(key) {
    const filtered = this.blockTypes.filter(bt =>
      bt.label.toLowerCase().includes(this.slashMenuFilter) ||
      bt.type.toLowerCase().includes(this.slashMenuFilter)
    );
    
    if (key === 'ArrowDown') this.slashMenuActiveIdx = Math.min(this.slashMenuActiveIdx + 1, filtered.length - 1);
    if (key === 'ArrowUp') this.slashMenuActiveIdx = Math.max(this.slashMenuActiveIdx - 1, 0);
    if (key === 'Enter') { this.selectSlashMenuItem(filtered[this.slashMenuActiveIdx]); return; }
    
    // Re-render menu with active highlight
    const el = this.container.querySelector(`.be-block[data-block-id="${this.slashMenuBlockId}"]`);
    if (el) this.showSlashMenu(el);
  }
  
  selectSlashMenuItem(blockType) {
    if (!blockType || !this.slashMenuBlockId) return;
    
    // Convert current block to selected type
    const block = this.blocks.find(b => b.id === this.slashMenuBlockId);
    if (block) {
      block.type = blockType.type;
      block.level = blockType.level;
      block.content = '';
    }
    
    this.hideSlashMenu();
    this.render(); // Full re-render to update block styling
    this.focusBlock(block.id, 'start');
  }
  
  // ---- Block Operations ----
  
  addBlockAfter(afterId, type) {
    const idx = this.blocks.findIndex(b => b.id === afterId);
    const newBlock = { id: this.uid(), type, content: '', level: type === 'heading' ? 2 : undefined };
    this.blocks.splice(idx + 1, 0, newBlock);
    this.render();
    this.focusBlock(newBlock.id, 'start');
  }
  
  deleteBlock(id) {
    this.blocks = this.blocks.filter(b => b.id !== id);
    this.render();
  }
  
  moveBlock(dragId, targetId, insertBefore) {
    const dragIdx = this.blocks.findIndex(b => b.id === dragId);
    const [block] = this.blocks.splice(dragIdx, 1);
    
    let targetIdx = this.blocks.findIndex(b => b.id === targetId);
    if (!insertBefore) targetIdx++;
    
    this.blocks.splice(targetIdx, 0, block);
    this.render();
    this.focusBlock(dragId, 'start');
  }
  
  focusBlock(id, position) {
    requestAnimationFrame(() => {
      const el = this.container.querySelector(`.be-block[data-block-id="${id}"]`);
      if (!el) return;
      el.focus();
      
      if (position === 'end' && el.textContent) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false); // Collapse to end
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }
  
  attachGlobalListeners() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.be-slash-menu')) {
        this.hideSlashMenu();
      }
    });
  }
  
  escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- Atlassian P4 FE = **Block editor with slash commands, drag reorder, keyboard navigation**
- **Block model**: array of `{id, type, content}` — paragraph, heading, code, list, quote
- **Slash command (/)**: filter block types, ArrowUp/Down navigation, Enter to select — transforms current block type
- **Drag reorder**: drag handles visible on hover, dragover calculates midY for above/below indicator, drop splices array
- **Keyboard nav**: ArrowUp at start → focus previous block end; ArrowDown at end → focus next block start
- **Empty block deletion**: Backspace on empty block → remove from array, focus previous
- **Enter handling**: creates new paragraph block after current (except code blocks which allow newlines)
- **contentEditable**: each block is independently editable — not one big contentEditable div
- **Placeholder text**: CSS `::before` with `data-placeholder` attribute — shows when `:empty`
- **mousedown + preventDefault**: on slash menu items to prevent blur before selection is processed

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Coding |
| Values | Medium | Atlassian Values |
| FE Coding (this) | Very Hard | Block Editor, contentEditable, Drag & Drop |
| System Design | Hard | Confluence Architecture |
| HM | Medium | Culture |
