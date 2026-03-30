# 244 – Google Docs-Style Collaborative Editor

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Collaborative Editor allows multiple users to edit the same document simultaneously, seeing each other's changes in real-time with colored cursors. It's one of the hardest frontend system design questions because it requires understanding **conflict resolution algorithms** (OT — Operational Transform or CRDTs — Conflict-free Replicated Data Types), **cursor presence** (multiple colored cursors), **document model** (structured tree vs linear sequence), **real-time synchronization** (latency hiding, eventual consistency), and **offline support** (local writes that sync later). This question separates senior from staff-level candidates.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
Client A                    Server                    Client B
   │                          │                          │
   │  Operation: insert "H"   │                          │
   │ ─────────────────────▶   │                          │
   │                          │   Broadcast transformed  │
   │                          │ ─────────────────────▶   │
   │                          │                          │
   │                          │   Operation: insert "W"  │
   │   Broadcast transformed  │ ◀─────────────────────   │
   │ ◀─────────────────────   │                          │
```

### OT vs CRDTs

| Aspect | OT (Operational Transform) | CRDTs (Conflict-free Replicated Data Types) |
|--------|---------------------------|---------------------------------------------|
| **How it works** | Transform concurrent ops against each other | Each character has a unique, ordered ID |
| **Server** | Required (central transform) | Optional (peer-to-peer possible) |
| **Complexity** | Transform functions are hard to get right | Data structure is complex, but merge is automatic |
| **Examples** | Google Docs, SharePoint | Yjs, Automerge, Figma |
| **Offline** | Complex — need to buffer and transform on reconnect | Natural — operations merge automatically |

### CRDT-based Architecture (Modern Approach — Y.js)

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Create shared document
const ydoc = new Y.Doc();
const ytext = ydoc.getText('document');

// Connect to collaboration server
const provider = new WebsocketProvider('wss://collab.example.com', 'doc-123', ydoc);

// Awareness (cursors, user info)
const awareness = provider.awareness;
awareness.setLocalState({
  user: { name: 'Hruday', color: '#a78bfa' },
  cursor: { index: 42, length: 0 },
});

// Listen for remote changes
ytext.observe(event => {
  // Re-render document with merged changes
  updateEditor(ytext.toString());
});
```

### Cursor Presence

```typescript
// Each user's cursor rendered as a colored marker
interface CursorState {
  userId: string;
  name: string;
  color: string;
  position: { index: number; length: number };  // selection range
}

// Render remote cursors as CSS markers
function RemoteCursor({ cursor }: { cursor: CursorState }) {
  return (
    <span className="cursor-marker" style={{ 
      borderLeft: `2px solid ${cursor.color}`,
      position: 'absolute',
      top: cursor.top, left: cursor.left,
    }}>
      <span className="cursor-label" style={{ 
        backgroundColor: cursor.color, 
        color: 'white', fontSize: '11px' 
      }}>
        {cursor.name}
      </span>
    </span>
  );
}
```

### Document Model Options

| Model | Library | Best For |
|-------|---------|----------|
| Plain text CRDT | Y.Text + CodeMirror | Code editors |
| Rich text CRDT | Y.XmlFragment + TipTap/ProseMirror | Rich text (Google Docs-like) |
| Block-based CRDT | Y.Array + custom | Notion-like block editors |

### Conflict Resolution Scenarios

1. **Concurrent inserts at same position**: CRDT assigns unique IDs; deterministic order
2. **One user deletes text another is editing**: CRDT tombstones; deleted text doesn't reappear
3. **Formatting conflict (one bolds, one italics same text)**: Both applied (last-writer-wins per attribute)
4. **Offline editing**: Changes merge automatically on reconnect — this is CRDTs' killer feature

### Performance Considerations

- **Document size**: For large docs, use incremental updates (deltas), not full state sync
- **Awareness throttle**: Cursor position updates throttled to 100ms (10 updates/sec per user)
- **History/Undo**: Per-user undo stack — undoing only YOUR changes, not collaborators'
- **Lazy loading**: For very long docs, load sections on demand (viewport + buffer)

### Anti-Patterns

- ❌ Implementing OT from scratch (extremely error-prone) — use Y.js or Automerge
- ❌ Sending the entire document on every change — send operations/deltas
- ❌ Global undo that reverts other users' changes
- ❌ No cursor presence — users don't know where others are editing
- ❌ WebSocket without reconnection — users lose sync on network blips

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Google Docs
Google Docs uses OT (Operational Transform) with a central server that transforms concurrent operations. Each keystroke is an operation sent to the server, transformed against pending remote ops, and broadcast to other clients. This was built before CRDTs were practical.

### FAANG: Figma
Figma uses CRDTs for their multiplayer editing. CRDTs allow peer-to-peer-like collaboration while still using a server for relay. Each design element is a CRDT node with properties that merge automatically.

### Hruday @ SAP Labs
At SAP, collaborative editing in enterprise apps (document co-authoring, planning sheets) uses locking mechanisms or last-write-wins. Understanding the evolution from locking → OT → CRDTs shows the trade-off spectrum from simple (but blocking) to complex (but concurrent).

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"For a collaborative editor, I'd use CRDTs via Y.js — they handle conflict resolution automatically without a central transform server.*

*Architecture: Each client has a Y.Doc instance. A Y.Text (or Y.XmlFragment for rich text) represents the document. A WebSocket provider syncs changes between clients via a relay server.*

*Conflict resolution: CRDTs assign a unique, globally ordered ID to each character. Concurrent inserts at the same position resolve deterministically. Deletes are tombstoned so they don't reappear. This works offline — changes merge automatically on reconnect.*

*Cursor presence: Y.js Awareness protocol broadcasts each user's cursor position, name, and color. I render remote cursors as colored markers with name labels.*

*Integration: For the editor UI, I'd use TipTap (ProseMirror wrapper) with the Y.js TipTap extension. TipTap handles rich text rendering and keyboard shortcuts; Y.js handles sync and conflict resolution.*

*Performance: Updates are incremental (deltas, not full state). Cursor position updates throttled to 100ms. Undo is per-user (only your operations are reversed)."*

### Follow-ups

1. **"OT vs CRDTs?"** — OT requires a central server, is faster for small docs. CRDTs work offline, handle peer-to-peer, but have higher memory overhead due to metadata.
2. **"How does undo work?"** — Per-user undo stack. Y.js's `UndoManager` tracks only local operations and reverses them.
3. **"What about very large documents?"** — Lazy load sections. Use Y.js subdocs for chapter-level splitting.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Collaborative Editor with Y.js + TipTap
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

function CollaborativeEditor({ docId, user }: { docId: string; user: { name: string; color: string } }) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const provider = useMemo(
    () => new WebsocketProvider('wss://collab.example.com', docId, ydoc),
    [docId, ydoc]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), // disable default history
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: user.name, color: user.color },
      }),
    ],
  });

  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} role="textbox" aria-multiline aria-label="Collaborative document" />
      <OnlineUsers provider={provider} />
    </div>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Collab Editor = CRDT (Y.js) + Editor (TipTap/ProseMirror) + WebSocket + Cursor Awareness."** CRDTs merge concurrent edits automatically — no central transform needed. Y.js provides the CRDT layer, TipTap/ProseMirror provides the editor UI. Awareness protocol handles cursor presence (name, color, position). Per-user undo. Incremental sync via deltas. Works offline — merges on reconnect.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** The hardest frontend system design question — tests distributed systems thinking, conflict resolution, real-time architecture, and editor internals. Staff-level signal.
**How:** CRDTs (Y.js) for conflict-free merging. TipTap/ProseMirror for rich text UI. WebSocket for real-time relay. Awareness for cursor presence. Per-user undo. Incremental delta sync.
**Companies:** Microsoft (Office Online — OT pioneer, SharePoint, Loop), Adobe (Creative Cloud collaboration), Salesforce (Quip — they own it, Docs), Cisco (Webex Whiteboard).
