# 235 – Rich Text Editor (contenteditable)

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Rich Text Editor (RTE) allows users to format text with bold, italic, lists, links, images, and more — going far beyond a plain `<textarea>`. The core technology choice is between the **native `contenteditable` attribute** (simple but unpredictable across browsers) and **custom renderers** (like ProseMirror or Slate.js that model the document as a data structure). An RTE is one of the most complex frontend components because it must handle **a document data model**, **command execution**, **undo/redo**, **collaborative editing (CRDTs/OT)**, **paste sanitization**, **keyboard shortcuts**, and **accessibility** — all while keeping the rendering performant.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture Approaches

| Approach | Example | Pros | Cons |
|----------|---------|------|------|
| **contenteditable + execCommand** | Basic editors | Simple, fast to prototype | execCommand is deprecated, inconsistent across browsers |
| **Custom Document Model** | ProseMirror, Slate.js, Lexical | Full control, reliable, supports collaboration | Complex, larger bundle size |
| **Hybrid** | Tiptap (ProseMirror wrapper) | Best of both — model-driven with contenteditable rendering | Still complex internally |

### Custom Document Model (Preferred)

```typescript
// Slate.js-style document model
const document: Node[] = [
  {
    type: 'paragraph',
    children: [
      { text: 'Hello ' },
      { text: 'world', bold: true },
      { text: '!' },
    ],
  },
  {
    type: 'heading',
    level: 2,
    children: [{ text: 'Section Title' }],
  },
  {
    type: 'bulleted-list',
    children: [
      { type: 'list-item', children: [{ text: 'Item 1' }] },
      { type: 'list-item', children: [{ text: 'Item 2' }] },
    ],
  },
];
```

**Key advantages of a document model:**
- **Serialization**: Convert to/from HTML, Markdown, JSON
- **Undo/Redo**: Apply/revert operations on the model
- **Normalization**: Enforce rules (e.g., no nested bold)
- **Collaboration**: Operations are well-defined units

### Command System

```typescript
interface EditorCommand {
  execute(editor: Editor, args?: any): void;
  isActive(editor: Editor): boolean;
  canExecute(editor: Editor): boolean;
}

// Example commands
const boldCommand: EditorCommand = {
  execute: (editor) => editor.toggleMark('bold'),
  isActive: (editor) => editor.isMarkActive('bold'),
  canExecute: (editor) => editor.hasSelection(),
};
```

### Paste Sanitization (Security Critical)

```typescript
editor.on('paste', (event: ClipboardEvent) => {
  event.preventDefault();
  const html = event.clipboardData?.getData('text/html');
  if (html) {
    // CRITICAL: sanitize HTML to prevent XSS
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
      ALLOWED_ATTR: ['href'],
    });
    editor.insertHTML(sanitized);
  } else {
    const text = event.clipboardData?.getData('text/plain');
    if (text) editor.insertText(text);
  }
});
```

### Undo/Redo

Two approaches:
1. **Command history stack**: Store each operation, undo reverses it
2. **Snapshot stack**: Store document state snapshots, undo restores previous

Command history is more memory efficient; snapshot is simpler but memory-heavy for large documents.

### Accessibility

- The editing area needs `role="textbox"`, `aria-multiline="true"`, `aria-label`
- Toolbar buttons need `aria-pressed="true/false"` for toggle state
- Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+Z (undo)
- Format changes announced via `aria-live` region
- Focus management: toolbar and editor area should be navigable via Tab

### Anti-Patterns

- ❌ Using `document.execCommand()` — deprecated, unreliable, differs across browsers
- ❌ No paste sanitization — XSS vulnerability via pasted HTML
- ❌ Storing raw HTML in database — must sanitize server-side too
- ❌ No document model — direct DOM manipulation leads to inconsistent states

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Google Docs
Google Docs uses a custom rendering engine (not `contenteditable`). The document is a model of operations, rendered to a `<canvas>` (for exact layout control). Collaboration uses Operational Transform (OT). This is the extreme end of RTE complexity.

### FAANG: Notion
Notion uses a block-based editor where each paragraph, heading, or list is a "block" — similar to Slate.js's document model. They use `contenteditable` for text editing within blocks but manage the block structure in their own data model.

### Hruday @ SAP Labs
SAP Fiori uses `sap.m.RichTextEditor` which wraps TinyMCE. Understanding the wrapper architecture (config injection, toolbar customization, paste sanitization) is directly applicable to designing RTEs from scratch.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd use a framework like Slate.js or Lexical rather than raw contenteditable, because I need a reliable document model for undo/redo, serialization, and collaboration.*

*The document is a tree of nodes — paragraphs, headings, lists — each containing text leaves with formatting marks (bold, italic, link). The editor renders this tree to the DOM using contenteditable for text input, but any mutations are captured and applied to the model first (controlled approach).*

*Commands (bold, italic, list) operate on the model via a selection-based API. The toolbar reflects active marks via `isActive()` checks. Undo/redo uses a command history stack.*

*Paste is critical for security — I intercept the paste event, extract HTML from clipboard, sanitize with DOMPurify (allowlist tags and attributes), then insert into the model.*

*For collaboration at scale, I'd use CRDTs (like Y.js) on top of the document model. Each operation is a CRDT operation that merges automatically across clients."*

### Follow-ups

1. **"contenteditable vs custom renderer?"** — contenteditable for simplicity + Slate/Lexical for the model. Canvas-based (Google Docs) for pixel-perfect control but extreme complexity.
2. **"How do you handle images?"** — Inline blocks in the document model. Upload → get URL → insert image node. Display with lazy loading.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Simplified Slate.js Editor Setup
import { createEditor, Transforms, Editor, Text } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import DOMPurify from 'dompurify';

function RichTextEditor() {
  const [editor] = useState(() => withReact(createEditor()));
  const [value, setValue] = useState(initialDocument);

  const toggleBold = () => {
    const isActive = Editor.marks(editor)?.bold === true;
    if (isActive) Editor.removeMark(editor, 'bold');
    else Editor.addMark(editor, 'bold', true);
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const html = event.clipboardData.getData('text/html');
    if (html) {
      event.preventDefault();
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href'],
      });
      const fragment = deserializeHTML(sanitized);
      Transforms.insertFragment(editor, fragment);
    }
  };

  return (
    <Slate editor={editor} initialValue={value} onChange={setValue}>
      <Toolbar>
        <button aria-pressed={Editor.marks(editor)?.bold} onClick={toggleBold}
                aria-label="Bold (Ctrl+B)">B</button>
      </Toolbar>
      <Editable
        role="textbox"
        aria-multiline={true}
        aria-label="Document editor"
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'b') { e.preventDefault(); toggleBold(); }
        }}
        renderLeaf={({ attributes, children, leaf }) => {
          if (leaf.bold) children = <strong>{children}</strong>;
          if (leaf.italic) children = <em>{children}</em>;
          return <span {...attributes}>{children}</span>;
        }}
      />
    </Slate>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"RTE = Document Model + Command System + Paste Sanitization."** Never use raw `execCommand` — use Slate.js/Lexical/ProseMirror for the document model. Paste must go through DOMPurify (XSS prevention). Undo/redo via command history. Collaboration via CRDTs (Y.js). Toolbar buttons use `aria-pressed`. The editor area is `role="textbox"` with `aria-multiline`. Think: model → commands → render → sanitize → collaborate.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** RTEs are among the most complex frontend components — they test architecture, state management, security (paste XSS), accessibility, and collaboration patterns. interview signal: can you design a complex system end-to-end?
**How:** Document model (tree of nodes with text leaves). Command pattern for formatting. Paste sanitization with DOMPurify. Undo via command stack. Collaboration via CRDTs. contenteditable for input, model for state.
**Companies:** Microsoft (Office Online — they invented OT), Adobe (Creative Cloud editors), Salesforce (email composers), Cisco (rich text in Webex).
