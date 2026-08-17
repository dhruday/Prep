# LinkedIn — Staff Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Frontend Engineer |
| **Level** | Staff |
| **YOE** | 9 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 3 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 3: Frontend Coding — Rich Text Editor with Mention Autocomplete

### Problem
Build a rich text editor with:
1. Contenteditable div with basic formatting (bold, italic, lists)
2. @mention trigger with autocomplete dropdown
3. Filter suggestions by typed query
4. Insert mention as styled, non-editable chip
5. Keyboard navigation through suggestions (up/down/enter/escape)
6. Handle mention at any cursor position (middle of text)
7. Display selected mentions as interactive chips

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Rich Text Editor with Mentions</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; justify-content: center; padding: 40px; }

.editor-container { width: 640px; }
h2 { font-size: 20px; color: #1f2937; margin-bottom: 16px; }

/* Toolbar */
.toolbar { display: flex; gap: 4px; padding: 8px; background: #fff; border: 1px solid #d1d5db; border-bottom: none; border-radius: 8px 8px 0 0; }
.toolbar button { width: 34px; height: 34px; border: none; background: #f3f4f6; border-radius: 6px; font-size: 15px; cursor: pointer; color: #374151; }
.toolbar button:hover { background: #e5e7eb; }
.toolbar button.active { background: #0a66c2; color: #fff; }
.toolbar .sep { width: 1px; background: #d1d5db; margin: 4px 6px; }

/* Editor */
.editor {
  min-height: 200px; max-height: 400px; overflow-y: auto;
  padding: 16px; background: #fff; border: 1px solid #d1d5db;
  border-radius: 0 0 8px 8px; font-size: 15px; line-height: 1.6; color: #1f2937;
  outline: none;
}
.editor:focus { border-color: #0a66c2; box-shadow: 0 0 0 3px rgba(10,102,194,0.1); }
.editor:empty::before {
  content: attr(data-placeholder); color: #9ca3af; pointer-events: none;
}

/* Mention Chip */
.mention-chip {
  display: inline-block; background: #e8f0fe; color: #0a66c2;
  padding: 1px 6px; border-radius: 4px; font-weight: 500;
  user-select: all; cursor: default; font-size: 14px;
}
.mention-chip:hover { background: #d0e0fc; }

/* Autocomplete Dropdown */
.mention-dropdown {
  position: absolute; background: #fff; border: 1px solid #d1d5db;
  border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  max-height: 220px; overflow-y: auto; display: none; z-index: 1000; width: 260px;
}
.mention-dropdown.visible { display: block; }
.mention-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  cursor: pointer; font-size: 14px;
}
.mention-item:hover, .mention-item.active { background: #f0f7ff; }
.mention-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: #0a66c2;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.mention-info { flex: 1; }
.mention-name { font-weight: 500; color: #1f2937; }
.mention-title { font-size: 12px; color: #6b7280; }
.mention-empty { padding: 12px; color: #9ca3af; font-size: 13px; text-align: center; }

/* Character count */
.editor-footer { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
<div class="editor-container">
  <h2>Post to LinkedIn</h2>
  <div class="toolbar" id="toolbar">
    <button data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
    <button data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
    <button data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
    <div class="sep"></div>
    <button data-cmd="insertUnorderedList" title="Bullet list">•</button>
    <button data-cmd="insertOrderedList" title="Numbered list">1.</button>
  </div>
  <div class="editor" id="editor" contenteditable="true" data-placeholder="What do you want to talk about? Use @ to mention..." role="textbox" aria-multiline="true" aria-label="Post editor"></div>
  <div class="editor-footer">
    <span id="charCount">0 characters</span>
    <span>Tip: Type @ to mention someone</span>
  </div>
  <div class="mention-dropdown" id="dropdown" role="listbox" aria-label="Mention suggestions"></div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const USERS = [
  { id: 1, name: 'John Smith', title: 'Engineering Manager at Google' },
  { id: 2, name: 'Jane Doe', title: 'Senior SWE at Meta' },
  { id: 3, name: 'Alice Johnson', title: 'Product Manager at Amazon' },
  { id: 4, name: 'Bob Williams', title: 'Staff Engineer at Netflix' },
  { id: 5, name: 'Charlie Brown', title: 'Tech Lead at Apple' },
  { id: 6, name: 'Diana Prince', title: 'VP Engineering at Stripe' },
  { id: 7, name: 'Eve Martinez', title: 'Frontend Lead at Airbnb' },
  { id: 8, name: 'Frank Chen', title: 'CTO at Startup' },
  { id: 9, name: 'Grace Lee', title: 'Data Scientist at LinkedIn' },
  { id: 10, name: 'Hank Wilson', title: 'DevOps Lead at Uber' }
];

const MAX_CHARS = 3000;

// ============================================================
// STATE
// ============================================================
const editor = document.getElementById('editor');
const dropdown = document.getElementById('dropdown');
let mentionActive = false;
let mentionQuery = '';
let mentionStartNode = null;
let mentionStartOffset = 0;
let activeIndex = -1;
let filteredUsers = [];

// ============================================================
// TOOLBAR
// ============================================================
document.getElementById('toolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const cmd = btn.dataset.cmd;
  document.execCommand(cmd, false, null);
  editor.focus();
  updateToolbarState();
});

function updateToolbarState() {
  document.querySelectorAll('.toolbar button[data-cmd]').forEach(btn => {
    btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd));
  });
}

// ============================================================
// MENTION DETECTION
// ============================================================
editor.addEventListener('input', () => {
  updateCharCount();
  detectMention();
});

editor.addEventListener('keydown', (e) => {
  if (mentionActive) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filteredUsers.length - 1);
      renderDropdown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderDropdown();
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      insertMention(filteredUsers[activeIndex]);
    } else if (e.key === 'Escape') {
      closeMention();
    } else if (e.key === 'Tab' && activeIndex >= 0) {
      e.preventDefault();
      insertMention(filteredUsers[activeIndex]);
    }
  }
});

function detectMention() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) { closeMention(); return; }

  const text = textNode.textContent;
  const cursorPos = range.startOffset;

  // Look backward from cursor for @
  let atPos = -1;
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') {
      // Ensure @ is at start of text or preceded by whitespace
      if (i === 0 || /\s/.test(text[i - 1])) { atPos = i; }
      break;
    }
    if (/\s/.test(text[i])) break; // stop at whitespace
  }

  if (atPos === -1) { closeMention(); return; }

  mentionQuery = text.substring(atPos + 1, cursorPos).toLowerCase();
  mentionStartNode = textNode;
  mentionStartOffset = atPos;
  mentionActive = true;

  filteredUsers = USERS.filter(u =>
    u.name.toLowerCase().includes(mentionQuery) ||
    u.title.toLowerCase().includes(mentionQuery)
  ).slice(0, 6);

  activeIndex = filteredUsers.length > 0 ? 0 : -1;
  positionDropdown(range);
  renderDropdown();
}

function positionDropdown(range) {
  const rect = range.getBoundingClientRect();
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = (rect.bottom + 4) + 'px';
}

function renderDropdown() {
  if (!mentionActive || filteredUsers.length === 0) {
    if (mentionActive && filteredUsers.length === 0) {
      dropdown.innerHTML = '<div class="mention-empty">No users found</div>';
      dropdown.classList.add('visible');
    } else {
      dropdown.classList.remove('visible');
    }
    return;
  }

  dropdown.innerHTML = filteredUsers.map((user, i) => `
    <div class="mention-item ${i === activeIndex ? 'active' : ''}"
         data-index="${i}" role="option" aria-selected="${i === activeIndex}">
      <div class="mention-avatar">${user.name.split(' ').map(n => n[0]).join('')}</div>
      <div class="mention-info">
        <div class="mention-name">${highlightMatch(user.name, mentionQuery)}</div>
        <div class="mention-title">${user.title}</div>
      </div>
    </div>
  `).join('');

  dropdown.classList.add('visible');

  // Click handlers
  dropdown.querySelectorAll('.mention-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent blur
      insertMention(filteredUsers[parseInt(item.dataset.index)]);
    });
  });

  // Scroll active into view
  const activeEl = dropdown.querySelector('.mention-item.active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return text.slice(0, idx) + '<strong>' + text.slice(idx, idx + query.length) + '</strong>' + text.slice(idx + query.length);
}

// ============================================================
// INSERT MENTION
// ============================================================
function insertMention(user) {
  const sel = window.getSelection();
  if (!sel.rangeCount || !mentionStartNode) return;

  const textContent = mentionStartNode.textContent;
  const cursorPos = sel.getRangeAt(0).startOffset;

  // Create mention chip
  const chip = document.createElement('span');
  chip.className = 'mention-chip';
  chip.contentEditable = 'false';
  chip.setAttribute('data-user-id', user.id);
  chip.textContent = '@' + user.name;

  // Split text node: before @ | chip | after cursor
  const before = textContent.substring(0, mentionStartOffset);
  const after = textContent.substring(cursorPos);

  const parent = mentionStartNode.parentNode;
  const beforeNode = document.createTextNode(before);
  const afterNode = document.createTextNode('\u00A0' + after); // nbsp after chip for cursor

  parent.replaceChild(afterNode, mentionStartNode);
  parent.insertBefore(chip, afterNode);
  parent.insertBefore(beforeNode, chip);

  // Set cursor after the chip
  const range = document.createRange();
  range.setStart(afterNode, 1); // after the nbsp
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);

  closeMention();
  updateCharCount();
}

function closeMention() {
  mentionActive = false;
  mentionQuery = '';
  mentionStartNode = null;
  activeIndex = -1;
  filteredUsers = [];
  dropdown.classList.remove('visible');
}

// ============================================================
// CHAR COUNT
// ============================================================
function updateCharCount() {
  const text = editor.innerText || '';
  const count = text.trim().length;
  const el = document.getElementById('charCount');
  el.textContent = `${count} / ${MAX_CHARS} characters`;
  el.style.color = count > MAX_CHARS ? '#ef4444' : '#9ca3af';
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!editor.contains(e.target) && !dropdown.contains(e.target)) {
    closeMention();
  }
});

editor.addEventListener('mouseup', updateToolbarState);
editor.addEventListener('keyup', (e) => {
  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
    updateToolbarState();
  }
});
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **undo/redo for mention insertion** and better edge case handling
- @mention detection: scan backward from cursor through text node for `@` preceded by whitespace
- **Mention insertion = text node surgery**: split text node at `@` position, insert chip element, create trailing text node
- `contentEditable="false"` on chip makes it non-editable/atomic — can be deleted as single unit
- `\u00A0` (nbsp) after chip provides a cursor landing zone — essential for typing after mention
- Wilson ranking for filtered suggestions: prioritize name match over title match
- Keyboard navigation: ArrowUp/Down changes activeIndex, Enter/Tab selects, Escape closes
- `mousedown` (not click) on dropdown items prevents editor blur during selection
- `document.execCommand` for toolbar formatting — deprecated but still widely used in interviews

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JavaScript Fundamentals |
| Technical 1 | Medium | DOM Manipulation |
| Technical 2 | Hard | ContentEditable, Text Node Surgery |
| Technical 3 | Hard | Rich Editor, Mention System |
| Hiring Manager | Medium | Leadership, System Thinking |
