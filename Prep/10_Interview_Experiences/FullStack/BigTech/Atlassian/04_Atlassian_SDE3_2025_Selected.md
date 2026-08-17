# Atlassian — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Software Engineer |
| **Level** | P5 (SDE-3 equivalent) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Sydney, Australia (Remote OK) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Jira Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Values + Coding + 2 System Design + HM)

---

## Round 1: Values Interview
**Duration:** 60 minutes

Atlassian's values-based interview is **unique** — it's weighted heavily (can override other rounds).

### Key Values Probed:
1. **"Don't #@!% the customer"** — Tell me about a time you pushed back on a feature that hurt user experience
2. **"Play as a team"** — Describe a cross-team collaboration that was difficult
3. **"Be the change you seek"** — When did you proactively fix something beyond your scope?

### Interview-Ready STAR Answers:

**Q1: Pushed back on feature hurting UX**
- **S**: Product wanted to add a mandatory newsletter signup modal on checkout — would interrupt conversion
- **T**: Needed to convince stakeholders with data, not opinion
- **A**: Ran an A/B test with 5% traffic showing the modal. Measured: cart abandonment +12%, CSAT -8 points. Presented data to product + leadership within a week.
- **R**: Modal was killed. Instead, added an inline signup on the order confirmation page — 18% opt-in rate without hurting conversion

**Q2: Difficult cross-team collaboration**
- **S**: Payment team's API migration broke 3 downstream services including ours during holiday season
- **T**: Needed to coordinate rollback + migration plan across 4 teams in 3 timezones
- **A**: Created a shared war room Slack channel, wrote a compatibility shim that supported both old/new API formats, set up progressive rollout with feature flags per-team, documented breaking changes with migration guide
- **R**: Zero-downtime migration completed in 2 weeks. Shim pattern was adopted org-wide for future API migrations

---

## Round 2: Coding
**Duration:** 60 minutes

### Question: Design a Conflict Resolution Engine for Concurrent Document Edits

```java
/**
 * Operational Transformation (OT) for collaborative text editing.
 * 
 * Two users edit simultaneously → server transforms operations
 * so both converge to the same document state.
 * 
 * Operations: Insert(pos, char), Delete(pos)
 * Transform: given op1 || op2 (concurrent), produce op1' and op2'
 *   such that apply(apply(doc, op1), op2') == apply(apply(doc, op2), op1')
 */
public class OTEngine {
    
    public enum OpType { INSERT, DELETE }
    
    public static class Operation {
        OpType type;
        int position;
        char character; // only for INSERT
        int clientId;
        int revision;
        
        public Operation(OpType type, int position, char character, int clientId, int revision) {
            this.type = type;
            this.position = position;
            this.character = character;
            this.clientId = clientId;
            this.revision = revision;
        }
    }
    
    /**
     * Transform op1 against op2 (both concurrent).
     * Returns transformed op1' that should be applied after op2.
     */
    public static Operation transform(Operation op1, Operation op2) {
        // Case 1: Both INSERT
        if (op1.type == OpType.INSERT && op2.type == OpType.INSERT) {
            if (op1.position < op2.position || 
                (op1.position == op2.position && op1.clientId < op2.clientId)) {
                // op1 is before op2 → op1 stays, but op2's insert shifts op1? No.
                // op1 applied first → no change needed
                return new Operation(op1.type, op1.position, op1.character, op1.clientId, op1.revision);
            } else {
                // op2 was before → shift op1 right by 1
                return new Operation(op1.type, op1.position + 1, op1.character, op1.clientId, op1.revision);
            }
        }
        
        // Case 2: Both DELETE
        if (op1.type == OpType.DELETE && op2.type == OpType.DELETE) {
            if (op1.position < op2.position) {
                return new Operation(op1.type, op1.position, op1.character, op1.clientId, op1.revision);
            } else if (op1.position > op2.position) {
                return new Operation(op1.type, op1.position - 1, op1.character, op1.clientId, op1.revision);
            } else {
                // Same position — both delete same char → op1 becomes no-op
                return null; // No-op
            }
        }
        
        // Case 3: op1 INSERT, op2 DELETE
        if (op1.type == OpType.INSERT && op2.type == OpType.DELETE) {
            if (op1.position <= op2.position) {
                return new Operation(op1.type, op1.position, op1.character, op1.clientId, op1.revision);
            } else {
                return new Operation(op1.type, op1.position - 1, op1.character, op1.clientId, op1.revision);
            }
        }
        
        // Case 4: op1 DELETE, op2 INSERT
        if (op1.type == OpType.DELETE && op2.type == OpType.INSERT) {
            if (op1.position < op2.position) {
                return new Operation(op1.type, op1.position, op1.character, op1.clientId, op1.revision);
            } else {
                return new Operation(op1.type, op1.position + 1, op1.character, op1.clientId, op1.revision);
            }
        }
        
        return op1;
    }
    
    /**
     * Server-side: process incoming operation against all concurrent ops.
     * Uses transform to adjust positions.
     */
    public static class OTServer {
        private final StringBuilder document = new StringBuilder();
        private final List<Operation> history = new ArrayList<>();
        private int revision = 0;
        
        public synchronized OperationResult processOperation(Operation clientOp) {
            // Transform against all operations that happened since client's revision
            Operation transformed = clientOp;
            
            for (int i = clientOp.revision; i < history.size(); i++) {
                if (transformed == null) break; // No-op
                transformed = transform(transformed, history.get(i));
            }
            
            // Apply to document
            if (transformed != null) {
                applyToDocument(transformed);
                transformed.revision = revision++;
                history.add(transformed);
            }
            
            return new OperationResult(transformed, revision);
        }
        
        private void applyToDocument(Operation op) {
            switch (op.type) {
                case INSERT:
                    document.insert(op.position, op.character);
                    break;
                case DELETE:
                    if (op.position >= 0 && op.position < document.length()) {
                        document.deleteCharAt(op.position);
                    }
                    break;
            }
        }
        
        public String getDocument() { return document.toString(); }
    }
    
    public static class OperationResult {
        Operation transformed;
        int newRevision;
        
        public OperationResult(Operation op, int rev) {
            this.transformed = op;
            this.newRevision = rev;
        }
    }
}
```

---

## Round 3: System Design — Confluence Real-Time Collaboration

### Architecture:
```
┌─────────────────────────────────────────────────────────────┐
│                 Confluence Collaboration                     │
│                                                             │
│  Clients (Browser)                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ Editor A │ │ Editor B │ │ Viewer C │                    │
│  │ ProseMirror│ Yjs CRDT │ │ Read-only│                   │
│  │ + OT/CRDT│ │ doc.on() │ │ SSE feed │                    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                   │
│       │             │            │                          │
│       ▼             ▼            ▼                          │
│  ┌──────────────────────────────────────┐                   │
│  │     WebSocket Gateway (Collab)       │                   │
│  │  - Auth + rate limiting              │                   │
│  │  - Room management (doc_id)          │                   │
│  │  - Awareness protocol (cursors)      │                   │
│  └────────────────┬─────────────────────┘                   │
│                   │                                         │
│       ┌───────────┼───────────┐                             │
│       ▼           ▼           ▼                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                      │
│  │ OT/CRDT │ │ Version │ │ Presence│                       │
│  │ Engine  │ │ History │ │ Service │                       │
│  │ (Yjs)   │ │ Snapshots│ │ Redis   │                      │
│  └────┬────┘ └────┬────┘ └─────────┘                      │
│       │           │                                         │
│       ▼           ▼                                         │
│  ┌──────────────────────┐                                   │
│  │  Document Store      │                                   │
│  │  PostgreSQL (content) │                                  │
│  │  S3 (attachments)    │                                   │
│  │  Elasticsearch (search)│                                 │
│  └──────────────────────┘                                   │
│                                                             │
│  Conflict Resolution Strategy:                              │
│  - Yjs CRDT for text → automatic convergence               │
│  - Last-writer-wins for metadata (title, labels)            │
│  - Manual merge for structural conflicts (page tree moves)  │
│                                                             │
│  Version History:                                           │
│  - Auto-save every 30s OR on meaningful edit                │
│  - Snapshots: full doc state every 100 operations           │
│  - Replay: snapshot + ops since snapshot                    │
│  - Named versions: user-triggered "Save as version"         │
└─────────────────────────────────────────────────────────────┘

Scale Numbers:
- 10M pages, 1M daily active editors
- Avg 3 concurrent editors per active page
- WebSocket connections: ~500K concurrent
- Collab server: 50 nodes, sticky sessions by doc_id
- Document save latency: < 100ms (perceived)
- Conflict resolution: < 50ms per operation
```

---

## 🎯 Key Takeaways
- Atlassian = **Values interview is critical** — prepare 3 strong STAR stories per value
- **OT (Operational Transformation)**: transform concurrent ops by adjusting positions — 4 cases (ins/ins, del/del, ins/del, del/ins)
- **Tie-breaking**: same-position inserts resolved by clientId ordering — deterministic
- **No-op detection**: both delete same position → one becomes no-op
- **Server OT**: transform incoming op against all ops since client's last-known revision
- **Confluence collab**: Yjs CRDT (modern) or OT (classic) — CRDT preferred for decentralized convergence
- **Version history**: snapshot every N ops + operation log — replay from closest snapshot
- Atlassian always asks **"Don't #@!% the customer"** — data-driven pushback story is essential

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values | Hard (unique) | STAR stories aligned to Atlassian values |
| Coding | Very Hard | OT algorithm, Conflict Resolution |
| System Design 1 | Hard | Real-time Collaboration |
| System Design 2 | Hard | Search + Indexing |
| HM | Medium | Team dynamics |
