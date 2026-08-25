# Adobe — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | SDE-2 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Adobe Document Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Director)

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Minimum Number of Platforms Required** (CSES / GFG Classic)
2. **Serialize and Deserialize Binary Tree** (LeetCode 297)

### 💡 Serialize/Deserialize Binary Tree

```java
public class Codec {
    // Encodes a tree to a single string (BFS with null markers)
    public String serialize(TreeNode root) {
        if (root == null) return "[]";
        
        StringBuilder sb = new StringBuilder("[");
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) {
                sb.append("null,");
            } else {
                sb.append(node.val).append(",");
                queue.offer(node.left);
                queue.offer(node.right);
            }
        }
        
        // Remove trailing nulls and comma
        sb.setLength(sb.length() - 1);
        sb.append("]");
        return sb.toString();
    }
    
    // Decodes a string to tree (BFS reconstruction)
    public TreeNode deserialize(String data) {
        if (data.equals("[]")) return null;
        
        String[] tokens = data.substring(1, data.length() - 1).split(",");
        TreeNode root = new TreeNode(Integer.parseInt(tokens[0].trim()));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        
        int i = 1;
        while (!queue.isEmpty() && i < tokens.length) {
            TreeNode parent = queue.poll();
            
            // Left child
            String leftVal = tokens[i++].trim();
            if (!leftVal.equals("null")) {
                parent.left = new TreeNode(Integer.parseInt(leftVal));
                queue.offer(parent.left);
            }
            
            // Right child
            if (i < tokens.length) {
                String rightVal = tokens[i++].trim();
                if (!rightVal.equals("null")) {
                    parent.right = new TreeNode(Integer.parseInt(rightVal));
                    queue.offer(parent.right);
                }
            }
        }
        
        return root;
    }
}
// Time: O(n) for both serialize and deserialize
// Space: O(n)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Real-Time Collaborative PDF Annotation System**
   - Multiple users can view + annotate PDFs simultaneously
   - Annotation types: highlight, comment, drawing, stamp
   - Real-time sync: see others' cursors + annotations
   - Offline support: work offline, sync when back online
   - Permission model: view, comment, edit, admin

### 💡 Key Design

```
Architecture:
┌──────────────────────────────────────────────────────┐
│                   Client Layer                        │
│  PDF Renderer (pdf.js) + Canvas Overlay (Annotations) │
│  CRDT Store (Yjs) + Service Worker (offline cache)    │
└──────────┬────────────────────────┬──────────────────┘
           │ WebSocket              │ REST API
   ┌───────▼────────┐      ┌───────▼────────┐
   │ Collaboration   │      │ Document Service│
   │ Server (WS)     │      │ (CRUD, Auth)    │
   │ - Yjs awareness │      │ - Upload/version│
   │ - Cursor sync   │      │ - Permission    │
   │ - CRDT merge    │      │ - PDF store(S3) │
   └───────┬────────┘      └───────┬────────┘
           │                        │
    ┌──────▼──────┐        ┌───────▼────────┐
    │ Redis PubSub │        │ PostgreSQL     │
    │ (presence)   │        │ (metadata)     │
    └─────────────┘        └───────┬────────┘
                                   │
                            ┌──────▼──────┐
                            │ S3 / Blob    │
                            │ (PDF files)  │
                            └─────────────┘

Annotation Data Model:
@Entity
class Annotation {
    @Id UUID id;
    UUID documentId;
    UUID userId;
    AnnotationType type; // HIGHLIGHT, COMMENT, DRAWING, STAMP
    int pageNumber;
    
    // Position relative to page (normalized 0-1)
    double x, y, width, height;
    
    // For highlights: text selection range
    String selectedText;
    int startOffset, endOffset;
    
    // For drawings: SVG path data
    String pathData;
    String color;
    float opacity;
    
    // For comments: thread
    String content;
    UUID parentAnnotationId; // For reply threads
    
    // CRDT: for conflict-free merge
    String crdtClock; // Lamport/Vector clock
    boolean deleted; // Soft delete for CRDT tombstone
    
    Instant createdAt;
    Instant updatedAt;
}

CRDT Strategy (Yjs):
- Each annotation is a Y.Map within a shared Y.Array
- Concurrent adds: both annotations preserved (no conflict)
- Concurrent edits to same annotation: last-writer-wins per field
- Deletes: tombstone approach (mark deleted, GC later)
- Offline: Yjs stores ops locally, syncs delta when reconnected

Offline Support:
1. Service Worker caches PDF files (Cache API)
2. IndexedDB stores Yjs document state + pending ops
3. On reconnect: Yjs auto-syncs — CRDT guarantees convergence
4. Conflict-free by design — no manual merge needed

Permission Model:
class PermissionService {
    boolean canView(User user, Document doc) {
        return doc.getSharedWith().contains(user.id) || doc.isPublic();
    }
    boolean canComment(User user, Document doc) {
        Permission perm = getPermission(user, doc);
        return perm.level >= PermissionLevel.COMMENT;
    }
    boolean canEdit(User user, Document doc) {
        Permission perm = getPermission(user, doc);
        return perm.level >= PermissionLevel.EDIT;
    }
}
// Enforce both client-side (hide UI) + server-side (reject mutations)

Scale Numbers:
- 10M documents, 500K DAU
- 50 concurrent editors per document (95th percentile)
- Annotation sync latency: < 200ms (WebSocket)
- PDF rendering: client-side via pdf.js (no server rendering)
- S3: store original PDF + generated thumbnails
```

---

## 🎯 Key Takeaways
- Adobe Document Cloud = **PDF rendering + real-time collaboration + offline**
- **Serialize/Deserialize BT**: BFS with null markers is cleanest for level-order representation
- **CRDT (Yjs)** for real-time: conflict-free by design — no OT complexity, works offline natively
- **PDF annotations**: canvas overlay on top of pdf.js rendered pages — normalized coordinates (0-1)
- **Offline-first with CRDTs**: IndexedDB stores Yjs state → resume & sync seamlessly
- **Permission enforcement**: always both client + server side — never trust client alone
- Adobe values: **creativity + reliability** — know pdf.js, Canvas API, SVG for drawing

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Platform Problem, Tree Serialization |
| Technical 1 | Medium-Hard | Coding + LLD |
| System Design | Hard | PDF Annotation, CRDT, Offline |
| Director | Medium | Adobe Values, Collaboration |
