# 02 — Design Google Docs (Frontend System Design)

> ⚡ **Quick Summary:** Google Docs is the hardest frontend system design question. The core challenge is **real-time collaborative editing** — multiple users editing the same document simultaneously without conflicts. The two main algorithms are **Operational Transformation (OT)** and **CRDT**. Everything else (presence, comments, offline) builds on top of this foundation.

---

## 🧠 Mental Model
Think of Google Docs as: **A shared state machine** where every user holds a copy of the document, applies local operations immediately (for responsiveness), and syncs with other users through a central server that resolves conflicts.

```
User A types "Hello" →
  1. Apply locally (instant feedback)
  2. Send operation to server
  3. Server transforms against concurrent operations
  4. Broadcast transformed op to all other users
  5. All users arrive at same document state ✅
```

---

## PART 1 — Problem Statement

### Business Requirements
- Multiple users can edit the same document simultaneously
- Changes appear in near real-time for all collaborators
- Document persists and can be shared via link
- Works offline and syncs when back online
- Support text, images, tables, comments

### Functional Requirements
- **Rich text editing:** Bold, italic, headings, lists, links
- **Real-time collaboration:** See other users' cursors and selections
- **Presence indicators:** Know who's currently viewing/editing
- **Comments:** Add threaded comments on selected text
- **Version history:** View and restore previous versions
- **Offline editing:** Edit without internet, sync when reconnected
- **Permissions:** Owner, Editor, Commenter, Viewer roles

### Non-Functional Requirements
- **Latency:** Local changes must feel instant (< 50ms feedback)
- **Convergence:** All users must reach same document state
- **Consistency:** No data loss, even in conflict scenarios
- **Scale:** Millions of documents, hundreds of concurrent editors per doc
- **Availability:** 99.99% uptime (documents are business-critical)

---

## PART 2 — Interviewer's Expectations

### What They Evaluate
- Do you know what OT (Operational Transformation) is?
- Do you understand why "last write wins" doesn't work?
- Can you explain CRDT and when to use it over OT?
- Do you know how cursor positions must transform?
- Can you handle the offline + sync scenario?

### Common Mistakes
- Saying "just use WebSocket and broadcast changes" — doesn't solve conflicts
- Confusing OT and CRDT (different algorithms, different trade-offs)
- Forgetting that cursor positions must also be transformed
- Not thinking about the "undo" stack in collaborative context
- Missing the "intent preservation" property of OT

### Red Flags
- "Use last-write-wins" — completely wrong for text editing
- "Use database transactions" — transactions can't resolve concurrent text ops
- Doesn't know what OT or CRDT is

### Strong Signals
- Explains "why last-write-wins fails" with an example
- Knows OT requires a central server for total ordering
- Knows CRDT can work peer-to-peer
- Mentions **vector clocks** or **logical clocks**

### Staff-Level Signals
- Discusses **shadow document** pattern for OT
- Explains the **diamond problem** in OT convergence
- Knows that Google Docs uses OT (Wave OT specifically)
- Discusses operational compression for bandwidth optimization

---

## PART 3 — Requirement Questions to Ask

```
1. How many simultaneous editors per document? (2? 10? 100?)
2. What's the document complexity? (Text only? Tables? Images? Code blocks?)
3. Is offline editing required? How long can users be offline?
4. Do we need version history? How many versions to keep?
5. What's the comment/suggestion feature scope?
6. Do we need real-time presence (cursors) or just content sync?
7. Any performance budget? (Max latency for collaboration?)
8. Mobile support? (Touch editing is different)
9. Existing tech stack? (Any real-time infrastructure?)
10. Enterprise features? (Single Sign-On, audit logs, data residency?)
```

---

## PART 4 — High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    BROWSER (User A)                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  EDITOR (ProseMirror / TipTap)            │ │
│  │   Document State (Local Copy)                             │ │
│  │   Cursor Positions │ Selection │ Pending Operations       │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────▼────────────────────────────────────┐ │
│  │               COLLABORATION ENGINE                        │ │
│  │   Local Op Queue │ OT Transform │ Conflict Resolution     │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────▼────────────────────────────────────┐ │
│  │              TRANSPORT LAYER (WebSocket)                   │ │
│  └───────────────────────┬────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │ WSS
┌──────────────────────────▼───────────────────────────────────────┐
│                  COLLABORATION SERVER                             │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  OT Server      │  │  Presence Server │  │  Auth Server   │  │
│  │  (total order   │  │  (cursor/active  │  │  (OAuth 2.0)   │  │
│  │   all ops)      │  │   users)         │  │                │  │
│  └────────┬────────┘  └──────────────────┘  └────────────────┘  │
│           │                                                       │
│  ┌────────▼────────┐  ┌──────────────────┐                       │
│  │  Document Store │  │  Op Log          │  ← append-only log    │
│  │  (Spanner/PG)   │  │  (Kafka/BigTable) │                      │
│  └─────────────────┘  └──────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## PART 5 — Frontend Architecture

### Editor Choice
```
Options:
1. ProseMirror  → Low-level, full control, used by NYT, Atlassian, Google Docs
2. TipTap       → ProseMirror wrapper, better DX, collaborative built-in
3. Quill        → Simpler, Delta operations model, easier to understand
4. Slate.js     → React-centric, flexible but complex
5. Monaco       → Microsoft's code editor (VS Code), not for prose

For this design: ProseMirror + Y.js (CRDT) = industry standard combo
```

### State Management
```
Document State  → Inside the editor itself (ProseMirror state machine)
User Presence   → Zustand or simple context (cursor positions of all users)
Sync Status     → Custom hook: 'synced' | 'syncing' | 'offline' | 'conflict'
UI State        → useState (toolbar state, comment panel open/closed)
```

### Folder Structure
```
src/
├── features/
│   ├── editor/
│   │   ├── Editor.tsx              ← main editor component
│   │   ├── EditorToolbar.tsx       ← bold, italic, headings toolbar
│   │   ├── EditorCollaboration.tsx ← user cursors overlay
│   │   └── hooks/
│   │       ├── useDocument.ts      ← load/save document
│   │       ├── useCollaboration.ts ← Y.js sync setup
│   │       └── usePresence.ts      ← track user cursors
│   ├── comments/
│   │   ├── CommentPanel.tsx
│   │   └── CommentThread.tsx
│   └── history/
│       └── VersionHistory.tsx
├── services/
│   ├── websocket.ts                ← WebSocket connection management
│   ├── yjs.ts                      ← Y.js document setup
│   └── documentApi.ts              ← REST API for initial load/save
```

---

## PART 6 — The Core Algorithm: OT vs CRDT

### Why "Last Write Wins" Fails

```
Initial document: "Hello"

User A types "Beautiful " before Hello → "Beautiful Hello"
User B types "World" after Hello → "HelloWorld"

Server receives A's op then B's op:
  Apply A: "Beautiful Hello"
  Apply B (naively): "Beautiful HelloWorld"  ← B's intent was "HelloWorld" not "Beautiful HelloWorld"
  
But without transformation, where does B's "World" go?
Naive approach: cursor was at position 5, types "World" → gets "HelloWorldBeautiful " 💀

We need Operational Transformation to adjust B's cursor position
by the length of A's insertion before applying B's operation.
```

### Operational Transformation (OT)

```
Core idea: Transform concurrent operations so they
can be applied in any order and reach the same result.

Operation types:
  Insert(position, text) → Insert "World" at position 5
  Delete(position, length) → Delete 3 chars at position 2
  Retain(length) → Keep N characters (used in Quill Delta format)

Transform function: transform(op1, op2, priority)
  Given op1 and op2 happened concurrently, 
  produce op1' and op2' that can be applied on top of each other.

Example:
  Doc: "Hello"
  Op A: Insert(" Beautiful") at pos 0 → "Hello Beautiful" wait no...
  Op A: Insert(5, " World")   → "Hello World"
  Op B: Insert(0, "Say: ")   → "Say: Hello"
  
  A receives B → transform A by B:
    B inserted 5 chars before position 5
    A's new position = 5 + 5 = 10
    A' = Insert(10, " World")
    Apply A' to "Say: Hello" → "Say: Hello World" ✅
```

### OT Requirements
```
For OT to work correctly, you need:
1. A total ordering of operations (central server does this)
2. Transform functions for every pair of operations
3. The transform must satisfy "TP1" and "TP2" convergence properties

⚠️ OT is complex to implement correctly.
Google spent years getting Wave OT right.
Most teams should use a library (ShareDB, Y.js, Automerge).
```

### CRDT (Conflict-free Replicated Data Types)

```
Core idea: Design the data structure so that concurrent operations
ALWAYS merge correctly without needing transformation.

Two main CRDT approaches for text:
1. LOGOOT / LSEQ  → Assign unique fractional position to each character
2. RGA (Replica Grow Array) → Track unique IDs per character + causality

Y.js uses a custom CRDT algorithm.
Automerge uses a different CRDT approach.

CRDT advantage: Works peer-to-peer, no central server needed for ordering.
CRDT disadvantage: More memory overhead (tombstones for deleted chars).
```

### OT vs CRDT — Decision Table

| | OT | CRDT |
|--|----|----|
| **Central server needed?** | Yes (for ordering) | No (peer-to-peer ok) |
| **Complexity** | High | High (but libraries help) |
| **Memory overhead** | Low | Higher (tombstones) |
| **Undo/Redo** | Complex | Complex |
| **Used by** | Google Docs, Office Online | Notion, Figma, Liveblocks |
| **Best library** | ShareDB | Y.js, Automerge |
| **For this design** | ✅ if central server | ✅ Y.js is simpler |

**Recommendation:** Use Y.js + WebSocket (y-websocket). It handles all CRDT logic and is battle-tested in production.

---

## PART 7 — Presence Indicators (User Cursors)

### Cursor Position Tracking
```javascript
// Y.js awareness protocol for presence
import { WebsocketProvider } from 'y-websocket';

const provider = new WebsocketProvider(
  'wss://docs-server.com',
  documentId,
  ydoc
);

// Set my presence data
provider.awareness.setLocalStateField('user', {
  name: 'Alice',
  color: '#ff6b35',
  cursor: null, // updated as user types
});

// Track cursor position
editor.on('selectionUpdate', ({ editor }) => {
  provider.awareness.setLocalStateField('cursor', {
    anchor: editor.state.selection.anchor,
    head: editor.state.selection.head,
  });
});

// Render other users' cursors
provider.awareness.on('change', () => {
  const states = provider.awareness.getStates();
  renderUserCursors(states); // draw colored cursor per user
});
```

### Cursor Color Assignment
```javascript
// Consistent color per user (same user = same color every session)
const USER_COLORS = ['#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#dda0dd'];

const getUserColor = (userId) => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
};
```

### Presence Panel
```jsx
// Show who's currently in the document
const PresencePanel = ({ awareness }) => {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    const updateUsers = () => {
      const states = [...awareness.getStates().values()];
      setUsers(states.filter(s => s.user).map(s => s.user));
    };
    
    awareness.on('change', updateUsers);
    return () => awareness.off('change', updateUsers);
  }, [awareness]);
  
  return (
    <div aria-label={`${users.length} people in this document`}>
      {users.map(user => (
        <Avatar 
          key={user.id} 
          name={user.name} 
          color={user.color}
          title={`${user.name} is editing`}
        />
      ))}
    </div>
  );
};
```

---

## PART 8 — Performance Engineering

### Editor Performance
```
Main challenges:
1. Large documents (100+ pages) → DOM is huge
2. Every keystroke triggers re-render
3. Remote operations must be applied without flicker

Solutions:
1. ProseMirror renders only what's in the viewport (built-in)
2. Debounce saving to server (not every keystroke, batch every 1 second)
3. Apply remote ops asynchronously, batch multiple ops per render frame
```

### Debounced Save
```javascript
const useDebouncedSave = (doc, delay = 1000) => {
  const save = useCallback(
    debounce((content) => {
      saveDraftToServer(content);
    }, delay),
    []
  );
  
  useEffect(() => {
    // Save to Y.js (syncs to all users) on every change
    // But only persist to DB after 1 second of inactivity
    doc.on('update', (update) => {
      broadcastUpdate(update);    // immediate: sync to others
      save(doc.toJSON());          // debounced: persist to DB
    });
  }, [doc]);
};
```

### Bundle Size
```
Heavy libraries:
  ProseMirror:  ~100KB gzipped
  Y.js:         ~30KB gzipped
  TipTap:       ~150KB gzipped (includes ProseMirror)
  
Strategy:
  - Load editor only when route is /doc/:id (lazy load)
  - Don't load editor on home page, share page, etc.
  - The collaborative features add ~80KB total with Y.js
```

---

## PART 9 — Offline Support

### Y.js Offline Strategy
```javascript
// Y.js with IndexedDB persistence
import { IndexeddbPersistence } from 'y-indexeddb';

const ydoc = new Y.Doc();

// Persist document in IndexedDB
const indexeddbProvider = new IndexeddbPersistence(documentId, ydoc);

// WebSocket sync (real-time when online)
const wsProvider = new WebsocketProvider(serverUrl, documentId, ydoc);

// Handle connection state
wsProvider.on('status', ({ status }) => {
  if (status === 'connected') {
    showSyncStatus('Synced');
    // Y.js automatically syncs pending changes when reconnected
  } else {
    showSyncStatus('Offline — changes saved locally');
  }
});

// When back online: Y.js merges offline changes automatically
// The CRDT algorithm guarantees convergence ✅
```

### Offline UX
```
Show: "Offline — editing saved locally"
Badge: ☁️ with slash (or amber dot)

When reconnected:
  "Syncing..." → progress indicator
  "All changes saved" → success

Conflict handling:
  CRDTs don't have conflicts by definition — they always merge
  (This is the main advantage over OT for offline scenarios)
```

---

## PART 10 — Accessibility

### Document Accessibility
```html
<!-- Editor container with proper ARIA -->
<div
  role="textbox"
  aria-multiline="true"
  aria-label="Document editor"
  aria-describedby="doc-title"
  contenteditable="true"
>
  <!-- Document content -->
</div>

<!-- Collaboration presence announcement -->
<div aria-live="polite" class="sr-only">
  {latestUpdate && `${latestUpdate.user} is editing the document`}
</div>
```

### Keyboard Shortcuts (Must Have)
```
Standard (non-conflicting):
  Ctrl+B          → Bold
  Ctrl+I          → Italic
  Ctrl+U          → Underline
  Ctrl+Z / Ctrl+Y → Undo/Redo
  Ctrl+K          → Insert link
  Ctrl+Alt+1-6    → Heading levels
  Ctrl+Shift+L    → Bullet list
  Alt+Shift+5     → Strikethrough (matches Google Docs)

Screen Reader Considerations:
  - Announce when other users make changes: "John deleted 5 words"
  - But throttle announcements (not every character change)
  - Provide a "Collaboration Log" panel with recent changes
```

---

## PART 11 — Security

### Document Access Control
```javascript
// Check permissions before loading
const { data: permission } = useQuery(
  ['permission', documentId, userId],
  () => checkDocumentPermission(documentId, userId)
);

// Permission levels
// viewer: can read, can comment
// commenter: can add comments, not edit
// editor: full edit access
// owner: edit + share + delete

// Guard routes
if (permission === 'viewer' && isEditing) {
  throw new Error('Not authorized to edit');
}
```

### Document Content Security
```
- Never trust document content from other users (could contain malicious HTML)
- Sanitize all rich text before rendering if displaying untrusted content
- Images embedded via URL: validate and proxy through your server
- Links: show preview tooltip, warn on external links
- CSP prevents script injection even if document contains <script> tags
```

### WebSocket Security
```
- Authenticate WebSocket connection with JWT in query param or subprotocol header
- Validate permission on every operation received (server-side)
- Rate limit: max N operations per second per user per document
- Reject operations that modify content outside user's permission scope
```

---

## PART 12 — Trade-Off Analysis

### Y.js (CRDT) vs ShareDB (OT)

| | Y.js (CRDT) | ShareDB (OT) |
|--|-------------|--------------|
| **Algorithm** | CRDT | OT (JSON0) |
| **Server required** | Optional | Required |
| **Memory** | Higher (tombstones) | Lower |
| **Offline merging** | Excellent | Good |
| **Complexity** | Library handles it | Library handles it |
| **Ecosystem** | Growing | Mature |
| **Used by** | Vercel, many startups | Quill, CodeMirror |
| **Choose when** | Offline-first, P2P | Server-centric, JSON docs |

### Centralized vs. P2P Architecture

| | Centralized (Server) | P2P (WebRTC) |
|--|---------------------|--------------|
| **Latency** | Server hop adds ~50ms | Direct ~10ms |
| **Scale** | Easy (one server) | Hard (many connections) |
| **Offline** | Must sync with server | Works without server |
| **History** | Server stores log | Distributed |
| **For Docs** | ✅ Better (need audit trail) | Not suitable |

---

## PART 13 — 50+ Follow-Up Questions

**Q: Explain the "diamond problem" in OT.**
> A: When op A and op B happen concurrently, you need to compute A' (A transformed against B) and B' (B transformed against A). The diamond problem occurs when you need to compose multiple transforms: A→B→C and A→C→B should produce the same result. This requires the "TP2" convergence property, which is notoriously hard to implement correctly. This is why most teams use libraries.

**Q: How does undo work in a collaborative editor?**
> A: Each user has their own undo stack. Pressing Ctrl+Z undoes that user's last operation, not the last operation in the document. This is "selective undo." Y.js implements this — it tracks which operations belong to which client and can undo just that client's ops.

**Q: How do you handle conflicts when both users delete the same text?**
> A: In CRDT: both deletions are applied; the result is the text is deleted (idempotent). In OT: the second deletion, when transformed against the first, results in a no-op (the text is already gone). Both approaches handle this gracefully.

**Q: What happens when a user is offline for 2 hours then reconnects?**
> A: With Y.js: the user's local Y.Doc has their offline changes. The server sends all operations that happened while they were offline. Y.js merges these using the CRDT algorithm. Since CRDTs are designed for this, all clients converge to the same state. The user might see "jumped" changes as the sync happens, but the final state is correct.

**Q: How do you implement real-time comments?**
> A: Comments anchor to a document position using Y.js's relative positions (which survive text insertions/deletions). The comment itself is stored in the Y.Doc as a separate Y.Map. When text is inserted before the comment anchor, the anchor's absolute position auto-updates via Y.js. Comments are broadcast to all users via the same WebSocket connection.

**Q: How many concurrent users can edit a single document?**
> A: Google Docs allows ~100 simultaneous editors. Beyond that, the cursor presence updates become noisy and the operational load increases. For most use cases, 10-20 simultaneous editors is the real-world max. At scale, you'd shard documents to different server instances.

**Q: How do you handle a user pasting 10,000 words?**
> A: Chunked paste: split into smaller operations and apply sequentially. This prevents a single giant operation from blocking other users' operations. Also throttle the server broadcast for large pastes.

**Q: How do you implement document version history?**
> A: The operation log is append-only on the server. To restore a version, replay all operations up to that point (or store snapshots every N operations for performance). Show history as a timeline with diffs highlighted.

**Q: How do you implement "suggesting" mode (track changes)?**
> A: Suggestion operations are marked with the suggestor's ID and rendered differently (green for additions, red for deletions). They exist in the document but haven't been "accepted." Another user (editor/owner) can accept (apply the operation) or reject (delete the suggestion).

**Q: How do you handle document permissions in real-time?**
> A: Permission changes are broadcast as special operations. When a user's permissions are reduced (e.g., editor → viewer), the server sends a permission-revoke message via WebSocket. The client immediately disables the editor and shows a notification. All subsequent operations from that client are rejected by the server.

---

## PART 14 — Staff Engineer Deep Dive

### The Real Google Docs Architecture
- **Wave OT:** Google built their own OT framework for Google Wave (now docs)
- **Not JavaScript OT:** The OT logic runs server-side (not in the browser)
- **Protocol buffers:** All operations serialized with Protocol Buffers, not JSON
- **Offline:** Originally Google Gears, now Service Worker
- **Editor:** Not ProseMirror — custom editor built in JavaScript + Closure Library

### Scaling Challenges
```
Problem: Document server is stateful (holds all connections for a doc)
Solution: Document affinity — all users editing doc X go to server X

Problem: Server restarts lose in-flight operations
Solution: Write operations to durable log BEFORE applying to document

Problem: 100 users all sending cursor positions 60 times/second
Solution: Presence uses a separate channel with higher tolerance for loss
          Presence is "best effort" — dropped updates are ok
          Content operations are "exactly once" — never dropped
```

### Platform Thinking
- **Editor as a Platform:** Extensions API for third-party add-ons
- **Document as API:** Other Google products embed docs (Gmail, Meet, Chat)
- **Formatting consistency:** Shared document format with Drive, Sheets, Slides
- **AI integration:** "Help me write" features need to be OT-aware operations

---

## PART 15 — Production Reality

### What Really Happens
- **Y.js is the industry choice** for new products. Figma, Vercel, and hundreds of startups use it.
- **Google Docs is an anomaly** — they wrote their own OT in 2006; nobody should replicate that today
- **Performance reality:** Large documents (500+ pages) still have performance issues in all editors
- **Cursor jank:** At >10 simultaneous users, cursor rendering can lag — teams often fade out cursors after inactivity

### Common Anti-Patterns
1. **Building custom OT from scratch** — Use Y.js or Automerge. Custom OT implementations always have bugs.
2. **Using WebSocket for everything** — Presence updates should be lossy; document operations should be reliable (different channels)
3. **Synchronous conflict resolution** — Never block the UI for conflict resolution; always apply locally and reconcile asynchronously
4. **No operation compression** — Y.js compresses multiple single-char inserts into one string insert; don't skip this optimization

---

## PART 16 — Interview Summary

### ⏱️ 5-Minute Answer
> "Google Docs is fundamentally a collaborative text editor. The hard problem is: what happens when two users edit the same spot simultaneously? 'Last write wins' destroys one person's work. The solution is Operational Transformation or CRDT — algorithms that transform concurrent operations so all clients reach the same document state.
>
> I'd use Y.js (a CRDT library) with WebSocket for sync, ProseMirror as the editor engine, and IndexedDB for offline storage. When a user types, the operation is applied locally immediately (for responsiveness), sent to the server via WebSocket, and broadcast to all other clients. Y.js handles all merge logic."

### ⏱️ 15-Minute Answer
Add: Explain OT with a concrete example. Discuss presence indicators. Explain offline strategy with Y.js + IndexedDB. Mention permissions model. Discuss performance optimization (debounced save, viewport-only rendering).

### ⏱️ 30-Minute Deep Dive
Add: Discuss the Diamond Problem in OT. Compare Y.js (CRDT) vs ShareDB (OT) in depth. Explain version history via operation log. Discuss document sharding for scale. Discuss comment anchoring with relative positions. Mention Protocol Buffer serialization for efficiency. Discuss AI integration (suggestions must be OT-aware).

---

## 🎯 Interview Cheat Sheet

```
Google Docs = ProseMirror + Y.js + y-websocket + y-indexeddb + IndexedDB

Key Concepts:
  OT   → Transform ops so any application order = same result (needs server)
  CRDT → Design data structure so merges never conflict (works P2P)
  Tombstone → CRDT keeps deleted chars marked "deleted" (not actually removed)
  Intent Preservation → OT preserves what user MEANT to do, not just what they typed
  Relative Position → Y.js cursor positions that survive remote insertions/deletions

Key Numbers:
  Max simultaneous editors: ~100 (Google Docs limit)
  Debounce save: 1 second
  Presence update rate: max 10/sec per user (throttled)
  Offline storage: Full document in IndexedDB

The Sentence to Say:
  "When two users edit concurrently, we need OT or CRDT to resolve conflicts.
  I'd use Y.js because it handles CRDT automatically and has great offline support."

Don't Say:
  "Last write wins" ← instant fail
  "Database transactions" ← doesn't help here
  "WebSocket broadcast" (without mentioning conflict resolution) ← incomplete
```
