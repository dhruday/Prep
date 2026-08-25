# Collaborative Editor — OT vs CRDT, Conflict Resolution
> Part 19 — System Design Case Studies · 🔥 High Frequency (Frontend)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem**: two users edit the same document simultaneously; their edits must merge correctly; if User A inserts "X" at position 3 and User B deletes position 3 concurrently, the combined result depends on the order of operations — naively applying both gives wrong results
- **Operational Transformation (OT)**: transform an operation against concurrent operations before applying; "insert X at position 3" from User A, when User B has already deleted position 3, transforms to "insert X at position 2"; server is the arbiter of operation order; complex to implement correctly; used by Google Docs (since 2010)
- **CRDT (Conflict-free Replicated Data Type)**: data structure designed so that any two concurrent operations always merge to the same result, regardless of order; no server coordination required; used by Figma, Notion (Y.js), and all modern collaborative tools
- **Y.js**: most widely used CRDT library for the browser; text is represented as a linked list of `Item` structs each with a globally unique ID (clientId + clock); delete marks the item as deleted (tombstone) rather than removing it; two clients can merge their local histories and get identical final state
- **WebSocket for sync**: changes flow over WebSocket as compact binary diffs (Uint8Array); all peers (including the server) apply changes and re-broadcast to others; server stores the full document state for late-joiners
- **Awareness**: "presence" — who's editing where; cursor positions, user colors, selection ranges; state vector broadcast every 100ms; server can relay awareness without persisting it
- **Persistence**: Y.js document state encoded as binary (Y.encodeStateAsUpdate(ydoc)); store in PostgreSQL or Redis; reconstruct on load via `Y.applyUpdate(ydoc, storedUpdate)`
- **Conflict resolution in real life**: CRDT handles structural conflicts (concurrent text insertions); semantic conflicts (two users edit a policy to say opposite things) are not solved by any algorithm — show both changes with diff highlighting, let a human decide

---

## 1. One-Line Definition
A collaborative editor (like Google Docs) enables simultaneous multi-user editing by representing document changes as CRDT operations (via Y.js or similar) that can merge in any order to produce identical final state, synchronised across all connected clients via WebSocket with awareness of each user's cursor position.

---

## 2. The Problem It Solves

A document editor uses "last write wins" — whoever saves last wins. User A and User B both open a contract. A edits clause 3, B edits clause 7. A saves at 14:32:01. B saves at 14:32:03. B's save overwrites A's clause 3 changes. Contract is missing an important clause. Neither user knew the other was editing. This is why shared drives cause data loss.

Collaborative editing solves this by making every keystroke an operation that's immediately propagated to all peers. Nobody "saves" — changes are continuous. The CRDT ensures that A's edits to clause 3 and B's edits to clause 7 can always be merged without losing either.

---

## 3. How It Works Internally

### OT (Operational Transformation) — Mental Model

```
Initial state: "Hello World"
                0123456789...

User A (offline): Insert "!" at position 11 → "Hello World!"
User B (offline): Delete "World" (positions 6-10) → "Hello "

Server receives A's operation first:
  A's op: Insert("!", position=11)
  Apply to server state: "Hello World!"

Server receives B's operation (based on old state before A's insert):
  B's op: Delete(start=6, length=5)
  But A inserted "!" at 11 — B's operation was composed at position 6 before that insert
  
  TRANSFORM B's op against A's op:
  A's insert was at position 11, B's delete ends at position 10 (before 11)
  → No position adjustment needed for B's delete
  
  Apply transformed B's op: Delete(start=6, length=5) on "Hello World!"
  Result: "Hello !"  ✓ Both edits preserved
  
  Transform A's op for B's current state and send to B:
  B deleted positions 6-10 (5 chars), reducing length
  A's insert position 11 → transform: position 11 - 5 = 6
  Send to B: Insert("!", 6)
  B applies: "Hello " + "!" at 6 = "Hello !" ✓
```

### CRDT (Y.js) — Mental Model

```
Y.js represents text as a linked list of Items:
  Each Item has: { id: {client: 'A', clock: 1}, left: prevItem, right: nextItem, content: 'X' }
  
  Items are never removed — deleted items get a 'deleted' flag (tombstone)
  Items are inserted relative to other items (not positions), so there's no position offset problem
  
User A inserts "!" after 'd' in "World":
  Item{ id: {A,42}, left: 'd', right: null, content: '!' }
  
User B deletes 'W' in "World" (marks as deleted):
  Item{ id: {B,17}, target: 'W', deleted: true }
  
Both operations can be applied in any order:
  - Apply A then B → "!World" with W deleted = "!orld"... wait, no
  - A's item is inserted after 'd', B marks 'W' as deleted
  - Result: "Hello " + "o" + "r" + "l" + "d" + "!" = "Hello orld!"
  - Same result regardless of which arrives first ✓
  
Merge conflict between two simultaneous inserts at the same position:
  → Resolved deterministically by clientId comparison (lexicographic order)
  → Both users always arrive at the same merged state  
```

---

## 4. The Code

### Wrong Way — Last Write Wins / Lock-Based

```typescript
// ❌ Naive "lock the document" approach

async function saveDocument(docId: string, content: string) {
    // ❌ Saves the ENTIRE document state on every keystroke
    // ❌ Two simultaneous saves: second save will overwrite first
    // ❌ Long debounce delay (2s) feels like the editor is lagging
    await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
        headers: { 'Content-Type': 'application/json' }
    });
}

// ❌ "Who last saved wins" — silent data loss when two users save within milliseconds
// ❌ Record-level locking: only one user can edit at a time (Google Docs circa 2006)
```

```typescript
// ✅ Y.js CRDT collaborative editor — React + WebSocket

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import { useEffect, useRef } from 'react';

interface CollaborativeEditorProps {
    documentId: string;
    currentUser: { id: string; name: string; color: string };
}

function CollaborativeEditor({ documentId, currentUser }: CollaborativeEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (!editorRef.current) return;
        
        // ✅ Y.js document — the CRDT root
        const ydoc = new Y.Doc();
        
        // ✅ WebSocket provider: syncs ydoc changes with server and all other clients
        const provider = new WebsocketProvider(
            `wss://collab.yourdomain.com`,
            documentId,
            ydoc,
            { connect: true }
        );
        
        // ✅ Awareness: broadcast cursor position and user info to other clients
        const awareness = provider.awareness;
        awareness.setLocalStateField('user', {
            id:    currentUser.id,
            name:  currentUser.name,
            color: currentUser.color,
        });
        
        // ✅ Y.Text: the shared text type in the CRDT document
        const yText = ydoc.getText('content');
        
        // ✅ Quill editor bound to Y.Text — every Quill Delta is mirrored in Y.Text
        const quill = new Quill(editorRef.current, {
            theme: 'snow',
            modules: { toolbar: true }
        });
        
        // ✅ QuillBinding: keeps Quill and Y.Text in sync bidirectionally
        const binding = new QuillBinding(yText, quill, awareness);
        
        // ✅ Render other users' cursor positions
        awareness.on('change', () => {
            const states = Array.from(awareness.getStates().entries());
            
            states
                .filter(([clientId]) => clientId !== ydoc.clientID)
                .forEach(([clientId, state]) => {
                    if (state.cursor && state.user) {
                        renderRemoteCursor(quill, clientId, state.cursor, state.user);
                    }
                });
        });
        
        // ✅ Connection status
        provider.on('status', ({ status }: { status: string }) => {
            document.getElementById('connection-status')!.textContent =
                status === 'connected' ? '● Live' : '○ Reconnecting…';
        });
        
        return () => {
            binding.destroy();
            provider.destroy();
            ydoc.destroy();
        };
    }, [documentId, currentUser]);
    
    return (
        <div className="editor-container">
            <div className="editor-toolbar">
                <span id="connection-status">● Live</span>
                <CollaboratorAvatars documentId={documentId} />
            </div>
            <div ref={editorRef} className="ql-editor-wrapper" />
        </div>
    );
}

function renderRemoteCursor(quill: Quill, clientId: number, 
                             cursor: { index: number; length: number }, 
                             user: { name: string; color: string }) {
    // Remove old cursor for this client
    document.querySelectorAll(`[data-client="${clientId}"]`).forEach(el => el.remove());
    
    if (cursor.index == null) return;
    
    // ✅ Get cursor position in DOM from Quill's getBounds()
    const bounds = quill.getBounds(cursor.index, cursor.length);
    
    // Create cursor caret element
    const caret = document.createElement('div');
    caret.setAttribute('data-client', String(clientId));
    caret.className = 'remote-cursor';
    caret.style.cssText = `
        position: absolute;
        left: ${bounds.left}px;
        top: ${bounds.top}px;
        height: ${bounds.height}px;
        width: 2px;
        background: ${user.color};
        pointer-events: none;
    `;
    
    // Label with user name
    const label = document.createElement('div');
    label.className = 'cursor-label';
    label.textContent = user.name;
    label.style.cssText = `background: ${user.color}; color: white; font-size: 11px; ...`;
    caret.appendChild(label);
    
    quill.container.appendChild(caret);
}
```

### Backend: Y.js WebSocket Server

```java
// ✅ Spring Boot Y.js-compatible WebSocket server

@Configuration
@EnableWebSocket
public class CollabWebSocketConfig implements WebSocketConfigurer {
    private final DocumentCollabHandler collabHandler;
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(collabHandler, "/collab/{documentId}")
                .setAllowedOriginPatterns("https://*.yourdomain.com");
    }
}

@Component
public class DocumentCollabHandler extends AbstractWebSocketHandler {
    private final YjsDocumentService yjsService;
    private final ConcurrentHashMap<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String documentId = extractDocumentId(session);
        String userId = extractUserId(session);
        
        // ✅ Authorisation: verify user has access to this document
        if (!yjsService.hasAccess(userId, documentId)) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Access denied"));
            return;
        }
        
        rooms.computeIfAbsent(documentId, k -> ConcurrentHashMap.newKeySet()).add(session);
        
        // ✅ Send current state to newly connected client (state sync)
        byte[] currentState = yjsService.getDocumentState(documentId);
        if (currentState != null) {
            session.sendMessage(new BinaryMessage(currentState));
        }
    }
    
    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String documentId = extractDocumentId(session);
        byte[] update = message.getPayload().array();
        
        // ✅ Persist the Y.js update to DB (append-only; Y.js merges on load)
        yjsService.applyUpdate(documentId, update);
        
        // ✅ Broadcast to all other connected clients in the same room
        Set<WebSocketSession> room = rooms.getOrDefault(documentId, Set.of());
        for (WebSocketSession peer : room) {
            if (peer != session && peer.isOpen()) {
                peer.sendMessage(new BinaryMessage(update));
            }
        }
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String documentId = extractDocumentId(session);
        rooms.getOrDefault(documentId, Set.of()).remove(session);
    }
}

@Service
public class YjsDocumentService {
    private final DocumentUpdateRepository updateRepository;
    
    public byte[] getDocumentState(String documentId) {
        // ✅ Merge all stored updates into one state vector
        // Y.js updates are append-only; merging gives current state
        List<byte[]> updates = updateRepository.getAllUpdates(documentId);
        return mergeUpdates(updates);  // Y.js merge algorithm
    }
    
    @Transactional
    public void applyUpdate(String documentId, byte[] update) {
        // ✅ Append-only storage — never overwrite Y.js updates
        updateRepository.save(new DocumentUpdate(documentId, update, Instant.now()));
        
        // ✅ Periodically compact: merge 1000+ updates into one snapshot
        if (updateRepository.countUpdates(documentId) > 1000) {
            compactDocument(documentId);
        }
    }
    
    private void compactDocument(String documentId) {
        byte[] merged = getDocumentState(documentId);
        updateRepository.deleteAllAndSaveSnapshot(documentId, merged);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the difference between OT and CRDT for collaborative editing."

**Hruday's answer:**
> Both solve the same problem: two users edit the same document at the same time, and we need to merge their changes correctly without losing either person's work.
>
> OT (Operational Transformation) uses a server as the authority. The server decides the canonical order of operations. Any operation received from a client is transformed against all concurrent operations the server has already processed, then applied. The server then sends the transformed operation to other clients so they can apply it consistently. Google Docs uses OT. The downside: the transformation functions are complex and error-prone — there are known cases where OT implementations produce incorrect results under failure conditions.
>
> CRDT (Conflict-free Replicated Data Type) takes a different approach: design the data structure itself so that any two operations can be applied in any order and always produce the same result. Y.js represents text as a linked list of immutable items, each with a globally unique ID. Insertions are identified by position relative to existing items (not by integer index), so insertions never conflict. Deletions mark items as deleted (tombstones) rather than removing them. Two clients can exchange their complete history and always converge to identical state with no server coordination required.
>
> In practice: CRDT with Y.js is what I'd choose for a new project. It's simpler to implement correctly, works offline (sync when reconnected), and has wide library support.

---

### Q2 — Deep Dive
**Interviewer asks:** "What happens when a user edits the document offline and then reconnects?"

**Hruday's answer:**
> This is where CRDT shines over OT. Y.js buffers all local operations in the Y.Doc while offline. Each operation gets a globally unique ID (clientId + logical clock). The clientId is a random 32-bit integer per browser session; the clock is a monotonically incrementing counter per client.
>
> When the user reconnects, the WebSocket provider does a state sync: it sends the client's current state vector (a summary of what operations it knows about) to the server. The server computes the diff — which operations does the server know that the client doesn't, and vice versa. It sends the client the missing operations. The client sends the server its local operations that the server hasn't seen.
>
> Both parties apply the received operations using Y.js's merge function. Since CRDT guarantees convergence regardless of order, both server and client end up at the same state. The user sees their offline edits merged with whatever changes other users made during the offline period.
>
> Concretely: if User A edited paragraph 2 offline while User B edited paragraph 5 online, the merge just interleavae both edits correctly — no conflict. If both edited the same word simultaneously, CRDT resolves it deterministically by clientId comparison — both see the same merged result, though it might not be semantically perfect (which is why you'd show a "you and someone else both edited here" highlight for human review).

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When is CRDT NOT the right choice?"

**Hruday's answer:**
> CRDT has real costs that matter in some scenarios.
>
> Memory: CRDT stores tombstones — deleted items remain in the data structure permanently. A 10,000-word document that had 500,000 characters typed and deleted over its lifetime has those 500,000 items in memory, even though only 10,000 are visible. Y.js documents can grow large over time. Periodic garbage collection (Y.Doc.gc = true) removes tombstones that can no longer cause conflicts, but it requires careful coordination.
>
> Complexity of rich formatting: Y.js handles text and basic rich text (Quill deltas). For complex structured data — spreadsheet formulas, database records, graphics with constrained relationships — CRDT gets much harder and may not provide correct semantics. Two users simultaneously editing the same spreadsheet cell: CRDT gives one valid answer but might not be the one either user intended.
>
> Historical/audit trail: CRDT documents don't have a natural "version history" — they have an operation log, but reconstructing "what did the document look like at 3pm yesterday" requires replaying operations from that point. For documents that need rich version history with author attribution per revision (legal, compliance), a version-snapshot model may be more appropriate.
>
> For simple forms (not collaborative editors): if it's just a standard form where two people might rarely edit the same field, last-write-wins with "someone else changed this, do you want to override?" prompt is far simpler to implement and understand than CRDT.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a collaborative code editor for a coding interview platform."

**Hruday's answer:**
> The core is the same as a text editor but with additional requirements: syntax highlighting, execution, and multiple room participants.
>
> Y.js for shared state: `ydoc.getText('code')` is the shared code buffer. Use CodeMirror 6 (has a first-class Y.js binding via `@codemirror/collab`). CodeMirror handles syntax highlighting and language modes; Y.js handles the CRDT sync. The binding is a few lines of setup.
>
> Room management: a WebSocket room per interview session. Max 3 participants (interviewer + candidate + observer). Server-side room creation with a session token — only valid tokens can join. After the interview session expires (e.g., 2 hours), the WebSocket room closes.
>
> Code execution: completely separate from the editor. User clicks "Run" → POST /execute with { sessionId, language, code }. The execution service runs sandboxed (Docker container, isolated network, 30-second timeout). Execution is not collaborative — only one user triggers it; results broadcast to all room members via the same WebSocket as a structured message type (not a Y.js operation).
>
> Persistence: store full document state in PostgreSQL after the session. For playback ("show me this interview's solution replay"): store Y.js operation log with timestamps. Replay by applying operations in sequence.
>
> Security: sandboxed execution is critical — code execution must run in a fully isolated container with no network access and resource limits (CPU, memory, disk). Use gVisor or Firecracker for sandboxing — Docker alone is not sufficient for untrusted code.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just use WebSocket and send full document on every change" | "I'll send the entire document state over WebSocket when anything changes" | At 100 users editing a 100KB document, that's 100 × 100KB × edits/second = massive bandwidth; also solves nothing — two simultaneous sends both overwrite each other; the point of collaborative editing is sending operations (deltas), not full state; a Y.js operation for a single character insertion is typically 20-50 bytes; full document is 100,000+ bytes; send operations, not snapshots; snapshots are only for initial load of a new joiner |
| "OT is better than CRDT because Google uses it" | "I'd implement OT like Google Docs" | Google started OT in 2010 before CRDT libraries matured; implementing OT correctly from scratch is extremely difficult — there are 6+ transformation functions needed for all operation pairs, and getting them right for all edge cases is a research-level problem; Figma, Notion, Linear, and all modern collaborative tools use CRDT (Y.js, Automerge) because the library handles the hard parts; in an interview, saying "I'd use Y.js (a production CRDT library) rather than re-implementing OT" shows mature engineering judgment |
| No conflict resolution for semantic conflicts | "CRDT handles all conflicts automatically" | CRDT handles structural conflicts (concurrent text insertions) — it guarantees convergence; it cannot handle semantic conflicts (two users writing opposite things in the same sentence); this must be addressed in the design: highlight ranges touched by concurrent edits in different colors; provide a history sidebar showing who changed what; allow a "merge review" mode where conflicting edits are shown side-by-side before the author decides; acknowledging this limitation and proposing a UX solution shows real understanding |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I built collaborative editing for a project specification template tool. Initial implementation: PUT the full JSON document on every change, debounced at 500ms. During a technical review with 8 participants all editing simultaneously, the last person to save overwrote everyone else's contributions. The team lost 90 minutes of work.
>
> We switched to Y.js with a custom WebSocket server. Each field in the specification mapped to a Y.js Text or Map type. Edits were immediate, changes broadcast in < 100ms. Field-level conflict detection showed a yellow border when another user was editing the same field. The team never lost collaborative work again. The most memorable outcome: during a review where 6 engineers edited simultaneously, the final document merged all changes correctly. Everyone confirmed their contributions were present."

---

## 8. Scale Evolution

**1,000 users / small teams →** Y.js + y-websocket server on a single Node.js or Spring process. Store document updates as byte arrays in PostgreSQL. Simple room management. 100 concurrent documents easily handled.

**100,000 users / 10,000 concurrent documents →** Scale WebSocket servers horizontally; use Redis Pub/Sub to broadcast updates across WebSocket server instances (same cross-server pattern as chat). Redis for ephemeral awareness state (cursor positions, 30s TTL). PostgreSQL for persistent document updates with periodic compaction.

**10 million users / 1M documents →** Dedicated Y.js sync servers (Ypy or y-websocket-rs for production-grade throughput). Sharding by documentId — one cluster of WebSocket servers per document shard. S3 for compacted document snapshots; PostgreSQL for recent updates only. CDN edge for serving initial document state to new joiners. Operational metrics: convergence latency per document, operation apply time, awareness update frequency.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Collaborative contract editor for partner agreements; shared merchant onboarding form completion; internal policy document co-authoring | CRDT fundamentals; conflict resolution UX |
| Swiggy / Meesho | Seller product listing collaborative editing (brand + product team editing simultaneously); restaurant menu collaborative editing between operations and restaurant manager | Multi-user form sync; field-level conflict detection |
| Adobe / Microsoft | Microsoft Word / Loop collaborative editing is their core product; Google Docs competitor; Adobe Frame.io collaborative video review | Deep OT/CRDT knowledge; large-scale CRDT implementation |
| SAP Labs | Project specification collaborative editing — the full story above; SAP product documentation co-authoring; 8-person review with simultaneous edits | Real incident; Y.js migration; field-level conflict highlighting |

---

## 10. Related Topics — What to Study Next

- **Topic 304 — Chat / Messaging System** — collaborative editors and chat both use WebSocket for real-time sync; the cross-server delivery pattern (Redis Pub/Sub for broadcast to all WebSocket server instances) is identical in both
- **Topic 314 — Design System Architecture** — the editor component in a design system context; how a rich text editor is published as a package, versioned, and consumed by multiple apps
- **Topic 313 — Infinite Scroll Feed** — awareness of other users' cursors is rendered in the editor's DOM; position = cursor index in the text; the rendering challenge is similar to virtual list items at fixed positions
- **Topic 101 — Redis Data Structures** — Redis Pub/Sub for cross-server awareness broadcast; Redis Hash for ephemeral room state (current participants, their awareness data); Redis sorted set for operation ordering

---

*Part 19 · Collaborative Editor — OT vs CRDT, Conflict Resolution · Full Stack Interview Guide · Hruday D · 2026*
