# 154. Conflict Resolution in Collaborative UIs ★★★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Conflict resolution in collaborative UIs** is the problem of consistently merging concurrent edits from multiple users when each user has a local copy of shared data. When Alice and Bob both edit the same document paragraph simultaneously, their edits can conflict. There are three main approaches: **Last-Write-Wins (LWW)** — whoever saved last wins (simple, acceptable for independent objects like renamed files); **Operational Transformation (OT)** — transform each operation relative to concurrent operations before applying (Google Docs approach, mathematically complex but handles text editing well); **CRDTs (Conflict-free Replicated Data Types)** — data structures designed so any order of applying concurrent operations always converges to the same result (Figma, Automerge, Yjs — simpler to reason about, growing adoption). Understanding this spectrum is essential for senior frontend architects designing real-time collaborative features, as the choice determines your data model, synchronization protocol, and user experience when conflicts occur.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Conflict Problem, Illustrated

```
Initial state: "Hello World"

Alice (local): Delete "World", type "Everyone" → "Hello Everyone"
Bob   (local): Delete "Hello", type "Goodbye"  → "Goodbye World"

Alice's op:  Delete[6-10] + Insert[6, "Everyone"]
Bob's op:    Delete[0-4]  + Insert[0, "Goodbye"]

If Bob's op applied without transformation against Alice:
  Delete[0-4] of "Hello Everyone" → removes "Hello" = "Everyone" ✓ correct
  
If Alice's op applied without transformation against Bob's change:
  Delete[6-10] of "Goodbye World" → removes " Worl" = "Goodbyed" ✗ WRONG
  
OT: Transform Alice's op against Bob's op first:
  Bob inserted "Goodbye " (7 chars) + deleted "Hello " (5 chars) = net shift of +2
  Alice's Delete[6-10] becomes Delete[8-12] → "Goodbye Everyone" ✓

Final state (both clients): "Goodbye Everyone"
```

### Approach 1: Last-Write-Wins (LWW)

```typescript
interface VersionedEntity<T> {
  data: T;
  version: number;       // Monotonically increasing server version
  updatedAt: number;     // Timestamp
  updatedBy: string;     // User ID
}

class LastWriteWinsStore<T extends object> {
  private entities = new Map<string, VersionedEntity<T>>();
  
  // Apply update — reject if incoming is older than what we have
  applyUpdate(id: string, incoming: VersionedEntity<T>): 'applied' | 'rejected' {
    const existing = this.entities.get(id);
    
    if (!existing) {
      this.entities.set(id, incoming);
      return 'applied';
    }
    
    // LWW: use version number (preferred) or timestamp (less reliable)
    if (incoming.version > existing.version) {
      this.entities.set(id, incoming);
      return 'applied';
    }
    
    // Reject stale update
    return 'rejected';
  }
  
  get(id: string): VersionedEntity<T> | undefined {
    return this.entities.get(id);
  }
}

// Use case: moving items in a kanban board
// If Alice moves card from "Todo" to "In Progress" and Bob simultaneously moves it to "Done",
// one will win based on server timestamp. Show toast: "Card moved by Bob to Done."
// Acceptable conflict resolution for independent coarse-grained objects.
```

### Approach 2: Operational Transformation (OT)

```typescript
// OT is complex — here's the core concept with a simplified 1D text model
// Real implementations (Quill, Prosemirror, Slate) handle this for you

type Operation =
  | { type: 'insert'; position: number; text: string }
  | { type: 'delete'; position: number; length: number };

function transformOperation(
  op: Operation,
  against: Operation
): Operation {
  if (op.type === 'insert' && against.type === 'insert') {
    // Both inserts: if against.position <= op.position, shift op right
    if (against.position <= op.position) {
      return { ...op, position: op.position + against.text.length };
    }
    return op;
  }
  
  if (op.type === 'insert' && against.type === 'delete') {
    if (against.position < op.position) {
      const shift = Math.min(against.length, op.position - against.position);
      return { ...op, position: op.position - shift };
    }
    return op;
  }
  
  if (op.type === 'delete' && against.type === 'insert') {
    if (against.position <= op.position) {
      return { ...op, position: op.position + against.text.length };
    }
    return op;
  }
  
  if (op.type === 'delete' && against.type === 'delete') {
    // Concurrent deletes on overlapping ranges — complex edge case
    // Simplified: shift position if non-overlapping
    if (against.position + against.length <= op.position) {
      return { ...op, position: op.position - against.length };
    }
    return op;
  }
  
  return op;
}

// Usage in a collaborative text editor (simplified):
class OTEngine {
  private pendingOps: Operation[] = [];
  private acknowledgedOps: Operation[] = [];
  
  applyLocalOp(op: Operation): void {
    this.pendingOps.push(op);
    this.applyToDocument(op);
    // Send to server with current server revision number
    this.sendToServer(op, this.acknowledgedOps.length);
  }
  
  receiveServerOp(serverOp: Operation, serverRevision: number): void {
    // Transform serverOp against all pending local ops
    let transformed = serverOp;
    for (const pending of this.pendingOps) {
      transformed = transformOperation(transformed, pending);
    }
    this.applyToDocument(transformed);
    this.acknowledgedOps.push(serverOp);
  }
  
  private applyToDocument(op: Operation): void { /* Apply to DOM */ }
  private sendToServer(op: Operation, revision: number): void { /* WebSocket send */ }
}
```

### Approach 3: CRDTs (Conflict-free Replicated Data Types)

```typescript
// Using Yjs — the most popular CRDT library for collaborative web apps
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Yjs provides conflict-free data structures:
// Y.Text   — collaborative text (with formatting)
// Y.Map    — collaborative key-value store
// Y.Array  — collaborative ordered list
// Y.XmlFragment — collaborative XML/HTML

class CollaborativeDocument {
  private doc: Y.Doc;
  private provider: WebsocketProvider;
  
  constructor(roomId: string, wsUrl: string) {
    this.doc = new Y.Doc();
    
    // WebSocket provider syncs Yjs document state between all clients
    this.provider = new WebsocketProvider(wsUrl, roomId, this.doc);
    
    this.provider.on('status', (event: { status: string }) => {
      console.log('Sync status:', event.status); // 'connected' | 'disconnected'
    });
  }
  
  // Collaborative text field — conflict-free merging of concurrent edits
  getTextField(fieldName: string): Y.Text {
    return this.doc.getText(fieldName);
  }
  
  // Collaborative array (e.g., list of tasks)
  getTaskList(): Y.Array<Y.Map<unknown>> {
    return this.doc.getArray('tasks');
  }
  
  // Transact multiple operations atomically
  addTask(title: string, assignee: string): void {
    const tasks = this.getTaskList();
    const taskMap = new Y.Map<unknown>();
    
    // All these operations are atomic — no partial state visible to others
    this.doc.transact(() => {
      taskMap.set('id', crypto.randomUUID());
      taskMap.set('title', title);
      taskMap.set('assignee', assignee);
      taskMap.set('completed', false);
      taskMap.set('createdAt', Date.now());
      tasks.push([taskMap]);
    });
  }
  
  // Listen for changes from any client (including local)
  onTaskListChange(callback: () => void): void {
    this.getTaskList().observe(callback);
  }
  
  // Undo/Redo via Yjs UndoManager (only undoes current client's changes)
  createUndoManager(): Y.UndoManager {
    return new Y.UndoManager([this.getTextField('content'), this.getTaskList()]);
  }
  
  destroy(): void {
    this.provider.destroy();
    this.doc.destroy();
  }
}

// React integration with Yjs
function useYjsText(doc: Y.Doc, fieldName: string) {
  const yText = doc.getText(fieldName);
  const [content, setContent] = useState(() => yText.toString());
  
  useEffect(() => {
    const observer = () => setContent(yText.toString());
    yText.observe(observer);
    return () => yText.unobserve(observer);
  }, [yText]);
  
  const updateText = useCallback((newText: string) => {
    // Yjs handles conflict resolution — just apply your local change
    const currentText = yText.toString();
    doc.transact(() => {
      yText.delete(0, currentText.length);
      yText.insert(0, newText);
    });
  }, [doc, yText]);
  
  return { content, updateText };
}
```

### Comparison Table

```
Approach    Complexity  Use Case                    Examples              Gets complex when
──────────────────────────────────────────────────────────────────────────────────────────
LWW         Low         Coarse-grained objects      File rename, config   Concurrent field edits
                        Independent properties      Kanban card position  User gets unpleasant surprises
OT          High        Text/rich text editing      Google Docs           Multiple clients, offline
                        Operation-aware merge       Etherpad              Hard to implement correctly
CRDT        Medium      Any collaborative data      Figma, Linear         Large data structures
                        Offline-first apps          Notion, Yjs-based     Memory overhead
                        Distributed consistency
```

### Conflict UX Patterns

```typescript
// When conflict cannot be auto-resolved, show the user choices
interface ConflictResolutionUI {
  showConflictDialog(conflict: {
    localVersion: unknown;
    serverVersion: unknown;
    conflictedField: string;
  }): Promise<'local' | 'server' | 'merge'>;
}

// Three-way merge: show base (what both branched from), local, server
// User picks or edits a merged version
// Used by: SharePoint, GitLab web editor, Confluence

// Simpler: Last Edit Notification
// "Bob updated this record 2 minutes ago. Your changes may conflict."
// [View Bob's Changes] [Save Anyway] [Discard My Changes]
function ConflictWarning({ lastEditor, onSaveAnyway, onDiscard }: {
  lastEditor: string;
  onSaveAnyway: () => void;
  onDiscard: () => void;
}) {
  return (
    <div role="alert" className="conflict-warning">
      <p>⚠️ {lastEditor} updated this record. Your changes may conflict.</p>
      <button onClick={onSaveAnyway}>Save Anyway</button>
      <button onClick={onDiscard}>Discard My Changes</button>
    </div>
  );
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Google Docs (OT):**
Google Docs uses Operational Transformation with a central server serializing all operations. The server is the authority — each client sends ops to the server with the last-known server revision. Server transforms incoming op against any ops applied since that revision and broadcasts to all clients. Requires always-online server; no peer-to-peer.

**Figma (Custom CRDT-like):**
Figma uses a custom CRDT where each design element has a unique stable ID, and properties are LWW per-field. Moving an element while another user resizes it resolves cleanly because position and size are independent properties. The CRDT ensures no revision number needed — any order of applying changes converges.

**Linear.app (CRDT with Automerge/custom):**
Linear uses a CRDT system for their issue tracker. Multiple users editing an issue's description simultaneously merge cleanly. The CRDT handles offline edits — you can edit on a plane and sync when reconnected.

**Notion:**
Notion uses a hybrid — their block-based document model is essentially a CRDT tree where the structure (which blocks exist) uses CRDT semantics, but block content falls back to LWW if two users type in the same block simultaneously.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Conflict resolution sits on a spectrum from simple to sophisticated. For coarse-grained objects where users rarely edit the same field simultaneously — like a project card's status or name — Last-Write-Wins with server versioning is sufficient and easy to implement: store a version number, reject updates that are older than the current version, show a conflict warning in the UI. For text editing — like a shared description field — you need something smarter. OT is how Google Docs works: operations are transformed against concurrent operations before being applied, with a central server as the serialization point. But OT is notoriously hard to implement correctly. CRDTs are the modern answer — data structures mathematically designed so concurrent updates always converge to the same result, regardless of application order. Libraries like Yjs and Automerge make CRDTs practical: you swap your React state for a Yjs Y.Doc and get conflict-free collaboration for free. I'd reach for Yjs for any new collaborative feature — it handles text, arrays, maps, has an undo manager, and providers for WebSocket and WebRTC sync."

**Follow-up Questions:**
1. *What's the difference between OT and CRDTs?* → OT requires transforming ops against each other (needs server serialization); CRDTs are designed to merge independently without a central authority — better for P2P and offline
2. *What are the downsides of CRDTs?* → Memory: CRDT structures store tombstones (deleted items for merge) which grow over time; complex nested data structures; not all algorithms map naturally to CRDT
3. *When is LWW acceptable?* → When conflicting edits on the same field are rare and the conflicting user can be notified; when each property is logically independent (position ≠ size ≠ color)
4. *How does Figma handle concurrent moves?* → Each shape property (x, y, width, height) is LWW by field — concurrent moves and resizes of different properties merge cleanly because they're independent

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// Yjs + React collaborative editor (production pattern)
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useRef, useState } from 'react';

function useCollaborativeText(roomId: string) {
  const docRef = useRef<Y.Doc | null>(null);
  const [text, setText] = useState('');
  const [peers, setPeers] = useState(0);
  
  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;
    
    const provider = new WebsocketProvider(
      'wss://y-websocket.example.com',
      roomId,
      doc,
    );
    
    const yText = doc.getText('content');
    
    // Listen for changes from all clients (including self)
    yText.observe(() => setText(yText.toString()));
    
    // Track number of connected peers
    provider.awareness.on('change', () => {
      setPeers(provider.awareness.getStates().size - 1);  // Exclude self
    });
    
    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [roomId]);
  
  const updateText = (newValue: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const yText = doc.getText('content');
    // Yjs auto-merges concurrent changes — no conflict handling needed
    doc.transact(() => {
      const current = yText.toString();
      yText.delete(0, current.length);
      yText.insert(0, newValue);
    });
  };
  
  return { text, updateText, peers };
}

// Usage in component
function CollaborativeTextArea({ roomId }: { roomId: string }) {
  const { text, updateText, peers } = useCollaborativeText(roomId);
  
  return (
    <div>
      <div className="peers-info">{peers} other user(s) editing</div>
      <textarea
        value={text}
        onChange={e => updateText(e.target.value)}
        placeholder="Start typing — changes sync in real-time..."
      />
    </div>
  );
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Three approaches:**
1. **LWW** = "Last saves wins" — version number, reject stale — simple, coarse-grained
2. **OT** = "Transform before apply" — Google Docs — needs central server, complex math
3. **CRDT** = "Structure guarantees convergence" — Yjs/Automerge — merge any order, modern choice

**CRDT libraries:** Yjs (fastest, most popular), Automerge (academic backing, JSON-like API)
**CRDT providers:** y-websocket (server-based sync), y-webrtc (P2P)
**Choose CRDT** for new collaborative features — OT only if extending a legacy system that already uses it.

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ Without conflict resolution, concurrent edits create data corruption (overwritten work, duplicate entries, lost changes)
→ Users lose trust when they see their work disappear — conflict resolution is a correctness requirement, not just UX
→ Offline-first apps make conflict resolution unavoidable — users edit disconnected and sync later

**How it works:**
→ LWW: attach a monotonic version to each record; server rejects updates with version ≤ current
→ OT: client maintains a revision counter; each op is tagged with the revision at which it was generated; server transforms incoming ops against all intervening ops then broadcasts
→ CRDT: data structure (Y.Text, Y.Map) intrinsically stores enough metadata to merge concurrent operations without transformation — no server authority needed for merge

**Company relevance:**
→ **Microsoft**: Loop (Fluid Framework CRDT), Office 365 co-authoring, VS Code Live Share all implement collaborative editing
→ **Adobe**: Creative Cloud collaborative workflows in XD, Acrobat, and Frame.io review tools use conflict resolution for concurrent annotations
→ **Salesforce**: Quip (collaborative documents in Salesforce) uses CRDT for real-time co-editing of sales documents
→ **Cisco**: Webex whiteboard collaborative drawing requires CRDT-like semantics for concurrent shape creation and modification
