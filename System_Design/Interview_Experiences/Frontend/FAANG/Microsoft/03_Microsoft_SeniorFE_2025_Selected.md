# Microsoft — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | SDE-2 Frontend |
| **Level** | 62 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Microsoft Teams |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + System Design + Behavioral + HM/AS)
- **Timeline:** 2 weeks

---

## Round 1: Frontend Coding
**Duration:** 60 minutes

### Questions Asked
1. **Build a Rich Text Editor with Toolbar** (Bold, Italic, Underline, Lists, Undo/Redo)
2. **Follow-up: How would you support collaborative editing?**

### 💡 Interview-Ready Answer

```jsx
function RichTextEditor() {
  const editorRef = useRef(null);
  const [history, setHistory] = useState({ past: [], future: [] });
  const [activeFormats, setActiveFormats] = useState(new Set());
  
  // Execute formatting command
  const execFormat = (command, value = null) => {
    // Save state for undo
    saveSnapshot();
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
  };
  
  // Track active formats at cursor position
  const updateActiveFormats = () => {
    const formats = new Set();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('insertOrderedList')) formats.add('orderedList');
    if (document.queryCommandState('insertUnorderedList')) formats.add('unorderedList');
    setActiveFormats(formats);
  };
  
  // Undo/Redo with snapshot approach
  const saveSnapshot = () => {
    const content = editorRef.current?.innerHTML || '';
    setHistory(prev => ({
      past: [...prev.past, content],
      future: [], // Clear redo stack on new action
    }));
  };
  
  const undo = () => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const current = editorRef.current?.innerHTML || '';
      const previous = prev.past[prev.past.length - 1];
      
      editorRef.current.innerHTML = previous;
      
      return {
        past: prev.past.slice(0, -1),
        future: [current, ...prev.future],
      };
    });
  };
  
  const redo = () => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const current = editorRef.current?.innerHTML || '';
      const next = prev.future[0];
      
      editorRef.current.innerHTML = next;
      
      return {
        past: [...prev.past, current],
        future: prev.future.slice(1),
      };
    });
  };
  
  // Keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b': e.preventDefault(); execFormat('bold'); break;
        case 'i': e.preventDefault(); execFormat('italic'); break;
        case 'u': e.preventDefault(); execFormat('underline'); break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          break;
        case 'y': e.preventDefault(); redo(); break;
      }
    }
  };
  
  // Sanitize pasted HTML (prevent XSS)
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };
  
  const toolbarButtons = [
    { command: 'bold', label: 'Bold', icon: 'B', shortcut: '⌘B', format: 'bold' },
    { command: 'italic', label: 'Italic', icon: 'I', shortcut: '⌘I', format: 'italic' },
    { command: 'underline', label: 'Underline', icon: 'U', shortcut: '⌘U', format: 'underline' },
    { type: 'separator' },
    { command: 'insertUnorderedList', label: 'Bullet list', icon: '•', format: 'unorderedList' },
    { command: 'insertOrderedList', label: 'Numbered list', icon: '1.', format: 'orderedList' },
    { type: 'separator' },
    { action: undo, label: 'Undo', icon: '↩', shortcut: '⌘Z', disabled: history.past.length === 0 },
    { action: redo, label: 'Redo', icon: '↪', shortcut: '⌘⇧Z', disabled: history.future.length === 0 },
  ];
  
  return (
    <div className="rich-text-editor" role="application" aria-label="Rich text editor">
      {/* Toolbar */}
      <div className="toolbar" role="toolbar" aria-label="Formatting options">
        {toolbarButtons.map((btn, i) => {
          if (btn.type === 'separator') return <div key={i} className="separator" role="separator" />;
          
          return (
            <button
              key={btn.label}
              className={`toolbar-btn ${btn.format && activeFormats.has(btn.format) ? 'active' : ''}`}
              onClick={() => btn.action ? btn.action() : execFormat(btn.command)}
              disabled={btn.disabled}
              aria-pressed={btn.format ? activeFormats.has(btn.format) : undefined}
              aria-label={`${btn.label}${btn.shortcut ? ` (${btn.shortcut})` : ''}`}
              title={`${btn.label}${btn.shortcut ? ` ${btn.shortcut}` : ''}`}
            >
              {btn.icon}
            </button>
          );
        })}
      </div>
      
      {/* Editor Content */}
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Editor content"
        onInput={updateActiveFormats}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseUp={updateActiveFormats}
        suppressContentEditableWarning
      />
    </div>
  );
}
```

**Collaborative Editing Discussion:**
```
Two main approaches:

1. Operational Transformation (OT) — used by Google Docs:
   - Transform concurrent operations against each other
   - Server maintains authoritative document state
   - Complex to implement but well-understood
   - Insert(pos, char) and Delete(pos) operations
   - Transform: if A inserts at pos 5 and B inserts at pos 3,
     A's position shifts to 6 (because B's insert moved everything after pos 3)

2. CRDTs (Conflict-free Replicated Data Types) — used by Figma, Apple Notes:
   - No central server needed (peer-to-peer possible)
   - Operations commute naturally — order doesn't matter
   - Each character has a unique ID (user_id + logical_clock)
   - Yjs and Automerge are popular CRDT libraries
   - Trade-off: more memory overhead per character (metadata)

For Microsoft Teams messages: OT is simpler and sufficient since there's
already a central server. For offline-first like Apple Notes: CRDT preferred.
```

---

## 🎯 Key Takeaways
- Microsoft FE = **rich text editor + accessibility + collaborative editing**
- **contentEditable + document.execCommand**: works for basic editor, but deprecated in favor of Input Events Level 2
- **Undo/Redo**: snapshot-based (past/future stacks) — simpler than command pattern for content
- **XSS prevention**: sanitize pasted HTML — only allow plain text paste
- **Keyboard shortcuts**: Ctrl/Cmd + B/I/U/Z — standard editor shortcuts
- **OT vs CRDT**: know the trade-offs (OT = server-centric, CRDT = peer-to-peer)
- **Active format tracking**: `document.queryCommandState()` at cursor position
- Microsoft values: **growth mindset**, accessibility (WCAG AA minimum), inclusive design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding | Hard | Rich Text Editor, Undo/Redo, a11y |
| System Design | Very Hard | Collaborative Editing, OT vs CRDT |
| Behavioral | Medium | Growth Mindset, Inclusion |
| HM | Medium | Career Growth, Team Fit |
