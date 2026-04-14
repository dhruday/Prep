# Adobe — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | SDE-2 |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Adobe Document Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Text Diff Algorithm** (Myers' diff or LCS-based)
2. **Follow-up: Produce minimal edit script (insert/delete/keep)**

### 💡 LCS-Based Diff Algorithm

```java
/**
 * Text diff using Longest Common Subsequence (LCS).
 * 
 * Given two texts (old, new), produce edit operations:
 * - KEEP: line unchanged
 * - DELETE: line removed (in old but not in new)
 * - INSERT: line added (in new but not in old)
 * 
 * Time: O(n*m) where n, m = number of lines
 * Space: O(n*m) for DP table (can be optimized to O(min(n,m)) with Hirschberg)
 */
class TextDiff {
    enum Op { KEEP, DELETE, INSERT }
    
    record DiffLine(Op op, String text, int oldLineNo, int newLineNo) {
        @Override
        public String toString() {
            return switch (op) {
                case KEEP   -> "  " + text;
                case DELETE -> "- " + text + " (line " + oldLineNo + ")";
                case INSERT -> "+ " + text + " (line " + newLineNo + ")";
            };
        }
    }
    
    List<DiffLine> diff(String[] oldLines, String[] newLines) {
        int n = oldLines.length, m = newLines.length;
        
        // Build LCS DP table
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                if (oldLines[i - 1].equals(newLines[j - 1])) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Backtrack to produce diff
        List<DiffLine> result = new ArrayList<>();
        int i = n, j = m;
        
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && oldLines[i - 1].equals(newLines[j - 1])) {
                result.add(new DiffLine(Op.KEEP, oldLines[i - 1], i, j));
                i--; j--;
            } else if (j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                result.add(new DiffLine(Op.INSERT, newLines[j - 1], -1, j));
                j--;
            } else {
                result.add(new DiffLine(Op.DELETE, oldLines[i - 1], i, -1));
                i--;
            }
        }
        
        Collections.reverse(result);
        return result;
    }
    
    // Pretty print unified diff format
    String unifiedDiff(String[] oldLines, String[] newLines, String oldName, String newName) {
        List<DiffLine> diffs = diff(oldLines, newLines);
        StringBuilder sb = new StringBuilder();
        
        sb.append("--- ").append(oldName).append("\n");
        sb.append("+++ ").append(newName).append("\n");
        
        // Group into hunks (context: 3 lines around changes)
        List<int[]> changeIndices = new ArrayList<>();
        for (int idx = 0; idx < diffs.size(); idx++) {
            if (diffs.get(idx).op != Op.KEEP) {
                changeIndices.add(new int[]{idx});
            }
        }
        
        for (DiffLine line : diffs) {
            switch (line.op) {
                case KEEP   -> sb.append(" ").append(line.text).append("\n");
                case DELETE -> sb.append("-").append(line.text).append("\n");
                case INSERT -> sb.append("+").append(line.text).append("\n");
            }
        }
        
        return sb.toString();
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Adobe Acrobat's Real-Time Collaborative PDF Editing**
   - Multiple users annotating same PDF simultaneously
   - Annotations: highlights, comments, stamps, freehand drawing
   - Conflict resolution: two users annotate same area
   - Offline support: queue edits, sync on reconnect
   - Version history: track who changed what, when
   - Scale: 50M documents, 1M concurrent editing sessions

### 💡 Collaborative PDF Editing Architecture

```
Architecture:
┌─────────────────────────────────────────────────────┐
│              Acrobat Client (Desktop/Web)             │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ Annotation Layer (rendered on top of PDF)    │    │
│  │ • Highlight: page, rect, color, opacity      │    │
│  │ • Comment: page, position, text, thread      │    │
│  │ • Stamp: page, position, type                │    │
│  │ • Drawing: page, SVG path, stroke, color     │    │
│  │                                              │    │
│  │ Each annotation = immutable operation:        │    │
│  │ {                                            │    │
│  │   id: "ann-uuid",                            │    │
│  │   type: "highlight",                         │    │
│  │   page: 3,                                   │    │
│  │   rect: {x: 100, y: 200, w: 300, h: 20},   │    │
│  │   color: "#FFFF00",                          │    │
│  │   author: "user-123",                        │    │
│  │   createdAt: "2025-03-15T10:30:00Z",        │    │
│  │   version: 5                                 │    │
│  │ }                                            │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  Local State:                                        │
│  • IndexedDB: offline annotation queue               │
│  • In-memory: current annotations (Map by id)        │
│  • Optimistic UI: apply locally, sync to server      │
└──────────┬──────────────────────────────────────────┘
           │ WebSocket (persistent connection)
┌──────────▼──────────────────────────────────────────┐
│           Collaboration Service                      │
│                                                      │
│  Session Manager:                                    │
│  • documentId → Set<connected users>                 │
│  • Presence: cursor position, user color, name       │
│  • Broadcast annotation ops to all session members   │
│                                                      │
│  Operation Processing:                               │
│  1. Client sends annotation op via WebSocket         │
│  2. Server assigns sequence number (monotonic)       │
│  3. Store in operation log (append-only)             │
│  4. Broadcast to other clients in session            │
│  5. Clients apply op to local state                  │
│                                                      │
│  Conflict Resolution (Last-Writer-Wins per annotation):│
│  • Each annotation has unique ID                     │
│  • Two users create annotations in same area: BOTH   │
│    are kept (annotations don't conflict)             │
│  • Two users edit SAME annotation (e.g., change      │
│    comment text): last write wins based on           │
│    server-assigned sequence number                   │
│  • Delete + Edit conflict: delete wins              │
│                                                      │
│  Ordering guarantee:                                 │
│  • Server assigns global sequence per document       │
│  • Clients receive ops in sequence order             │
│  • If client is behind, it replays missed ops on     │
│    reconnect                                         │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│               Data Layer                              │
│                                                      │
│  Annotation Store (DynamoDB):                        │
│  PK: documentId                                      │
│  SK: annotationId                                    │
│  Attributes: type, page, rect, color, author,        │
│              text, version, createdAt, updatedAt      │
│                                                      │
│  Operation Log (Kafka + S3 for archival):            │
│  Topic: annotations.{documentId}                     │
│  Each message: { op, annotationId, data, seqNo }    │
│  Retention: 30 days (hot), then archive to S3        │
│                                                      │
│  Version History:                                    │
│  • Snapshot every 100 operations                     │
│  • Replay ops from last snapshot to reconstruct      │
│    any point in time                                 │
│  • "Version" = snapshot + ops since snapshot          │
│                                                      │
│  PDF Storage (S3):                                   │
│  • Original PDF: immutable, stored once              │
│  • Annotations stored separately (not in PDF file)   │
│  • "Flatten" (bake annotations into PDF) on export   │
└─────────────────────────────────────────────────────┘

Offline Support:
┌─────────────────────────────────────────────────┐
│ 1. User goes offline                             │
│ 2. Annotations queued in IndexedDB               │
│    [{op: "create", annotation: {...}, timestamp}] │
│ 3. User reconnects                               │
│ 4. Client sends last known sequence number       │
│ 5. Server sends all ops since that sequence      │
│ 6. Client replays server ops, then sends queued  │
│    local ops                                     │
│ 7. Potential conflicts resolved by server        │
│    (delete wins, last-write-wins for edits)      │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Adobe SDE-2 = **Text diff (LCS) + Collaborative PDF editing**
- **LCS-based diff**: O(n*m) DP → backtrack to produce KEEP/INSERT/DELETE operations
- **PDF annotations**: stored SEPARATELY from PDF — original PDF is immutable, annotations are an overlay
- **Annotations don't conflict**: two highlights in same area are both valid — unlike text CRDTs
- **Conflict resolution**: LWW (last-writer-wins) for same annotation edits — simple and sufficient for annotations
- **Operation log**: append-only, server assigns sequence numbers — replay for version history + offline sync
- **Snapshot + replay**: take snapshot every 100 ops → reconstruct any point in time
- Adobe interviews: **document collaboration + creative tools** — know OT/CRDT basics, annotation models

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Coding | Hard | LCS Diff Algorithm |
| System Design | Hard | Collaborative Editing, Real-Time Sync |
| HM | Medium | Culture Fit |
