# Adobe — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | MTS-2 (Member of Technical Staff) |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + Machine Coding + System Design + HM)
- **Rejection Reason:** Machine coding — code wasn't clean enough, missed edge cases
- **Timeline:** 2 weeks

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Longest Increasing Path in a Matrix** (LeetCode 329) — DFS + Memoization
2. **Implement a Trie with Wildcard Search** (LeetCode 211)

### 💡 Longest Increasing Path in Matrix

```java
public int longestIncreasingPath(int[][] matrix) {
    int m = matrix.length, n = matrix[0].length;
    int[][] memo = new int[m][n];
    int maxLen = 0;
    
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            maxLen = Math.max(maxLen, dfs(matrix, i, j, memo));
        }
    }
    return maxLen;
}

private int dfs(int[][] matrix, int r, int c, int[][] memo) {
    if (memo[r][c] != 0) return memo[r][c];
    
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    int maxPath = 1;
    
    for (int[] d : dirs) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < matrix.length && nc >= 0 && nc < matrix[0].length
            && matrix[nr][nc] > matrix[r][c]) {
            maxPath = Math.max(maxPath, 1 + dfs(matrix, nr, nc, memo));
        }
    }
    
    return memo[r][c] = maxPath;
}
// Time: O(m*n), Space: O(m*n) — each cell computed once due to memoization
```

### 💡 Trie with Wildcard

```java
class WordDictionary {
    TrieNode root = new TrieNode();
    
    void addWord(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            if (node.children[c - 'a'] == null) {
                node.children[c - 'a'] = new TrieNode();
            }
            node = node.children[c - 'a'];
        }
        node.isEnd = true;
    }
    
    boolean search(String word) {
        return dfs(word, 0, root);
    }
    
    private boolean dfs(String word, int idx, TrieNode node) {
        if (idx == word.length()) return node.isEnd;
        
        char c = word.charAt(idx);
        if (c == '.') {
            // Wildcard: try all children
            for (TrieNode child : node.children) {
                if (child != null && dfs(word, idx + 1, child)) return true;
            }
            return false;
        }
        
        if (node.children[c - 'a'] == null) return false;
        return dfs(word, idx + 1, node.children[c - 'a']);
    }
    
    class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEnd;
    }
}
```

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Collaborative Drawing Canvas**
   - Multiple users drawing on same canvas, different tools (pen, rectangle, circle, eraser), undo/redo

### 💡 Interview-Ready Answer

```java
// Command Pattern for undo/redo
interface DrawCommand {
    void execute(Graphics2D g);
    void undo(Graphics2D g);
    String serialize(); // For collaborative sync
}

class PenStrokeCommand implements DrawCommand {
    private final List<Point> points;
    private final Color color;
    private final int strokeWidth;
    private BufferedImage beforeImage; // For undo
    
    PenStrokeCommand(Color color, int strokeWidth) {
        this.points = new ArrayList<>();
        this.color = color;
        this.strokeWidth = strokeWidth;
    }
    
    void addPoint(Point p) { points.add(p); }
    
    @Override
    public void execute(Graphics2D g) {
        g.setColor(color);
        g.setStroke(new BasicStroke(strokeWidth, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        for (int i = 1; i < points.size(); i++) {
            g.drawLine(points.get(i-1).x, points.get(i-1).y, points.get(i).x, points.get(i).y);
        }
    }
    
    @Override
    public void undo(Graphics2D g) {
        // Redraw from beforeImage (captured before execute)
    }
    
    @Override
    public String serialize() {
        return String.format("{\"type\":\"pen\",\"color\":\"%s\",\"width\":%d,\"points\":%s}",
            String.format("#%06X", color.getRGB() & 0xFFFFFF), strokeWidth,
            points.stream().map(p -> String.format("[%d,%d]", p.x, p.y)).toList());
    }
}

class RectangleCommand implements DrawCommand {
    private final Point start, end;
    private final Color color;
    private final boolean filled;
    
    // ... similar structure
    
    @Override
    public void execute(Graphics2D g) {
        int x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
        int w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
        
        g.setColor(color);
        if (filled) g.fillRect(x, y, w, h);
        else g.drawRect(x, y, w, h);
    }
}

class DrawingCanvas {
    private final Deque<DrawCommand> undoStack = new ArrayDeque<>();
    private final Deque<DrawCommand> redoStack = new ArrayDeque<>();
    private final List<DrawCommand> allCommands = new ArrayList<>();
    
    void executeCommand(DrawCommand cmd, Graphics2D g) {
        cmd.execute(g);
        undoStack.push(cmd);
        redoStack.clear(); // New command invalidates redo history
        allCommands.add(cmd);
        broadcastCommand(cmd); // Send to other users
    }
    
    void undo(Graphics2D g) {
        if (undoStack.isEmpty()) return;
        DrawCommand cmd = undoStack.pop();
        redoStack.push(cmd);
        redraw(g); // Redraw all commands except undone ones
    }
    
    void redo(Graphics2D g) {
        if (redoStack.isEmpty()) return;
        DrawCommand cmd = redoStack.pop();
        cmd.execute(g);
        undoStack.push(cmd);
    }
    
    // Full redraw (for undo — remove last command and replay)
    void redraw(Graphics2D g) {
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, /* width */, /* height */); // Clear canvas
        for (DrawCommand cmd : allCommands) {
            if (undoStack.contains(cmd)) { // Only draw non-undone commands
                cmd.execute(g);
            }
        }
    }
    
    void broadcastCommand(DrawCommand cmd) {
        // WebSocket: send cmd.serialize() to all connected clients
    }
    
    void receiveRemoteCommand(String json, Graphics2D g) {
        DrawCommand cmd = deserializeCommand(json);
        cmd.execute(g);
        allCommands.add(cmd);
        // Don't add to undoStack — remote commands can't be locally undone
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Adobe Creative Cloud — File Storage + Collaboration**
   - Cloud storage for PSD/AI files, real-time collaboration, version history

### 💡 Interview-Ready Answer

```
Adobe Creative Cloud Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Unique Challenges:                                           │
│  - PSD files are HUGE (500MB-10GB) — can't sync whole file  │
│  - Proprietary binary format (not text — can't use OT/CRDT) │
│  - Layer-based: each layer is an independent edit unit       │
│  - Creative workflow: saves are infrequent but large         │
│                                                                │
│  File Storage:                                                │
│  - Block-level dedup: split files into 4MB chunks            │
│  - PSD-aware chunking: split on layer boundaries             │
│    → editing one layer only uploads that layer's blocks      │
│  - Storage: Azure Blob (Adobe uses Azure)                    │
│  - CDN: distribute globally for read-heavy access            │
│                                                                │
│  Version History:                                             │
│  - Every save = new version (not overwrite)                  │
│  - Store only delta between versions (block-level diff)      │
│  - Version metadata: user, timestamp, description, size_delta│
│  - Retention: all versions for 60 days, then weekly snapshots│
│  - Restore: reassemble blocks from version's block_list      │
│                                                                │
│  Real-Time Collaboration:                                     │
│  - Operation-based: "User A modified Layer 3's opacity"      │
│  - Conflict: two users editing same layer = last-write-wins  │
│    with visual indicator ("User B is editing this layer")    │
│  - Different layers: no conflict (parallel edits merge)      │
│  - Protocol: WebSocket for real-time ops                     │
│  - Presence: who's viewing, cursor position, selected layer  │
│                                                                │
│  API Design:                                                  │
│  POST /api/files/{id}/versions                               │
│  { block_hashes: ["abc123", "def456", ...],                  │
│    changed_blocks: [{ hash: "abc123", offset: 0, size: 4MB }]│
│    description: "Updated background layer" }                 │
│                                                                │
│  GET /api/files/{id}/versions                                │
│  → [{ version: 15, user: "Alice", timestamp, description,   │
│       size_delta: "+2.3MB", thumbnail_url: "..." }]          │
│                                                                │
│  Thumbnail Generation:                                        │
│  - On upload: async job renders PSD → JPEG thumbnail         │
│  - Uses headless Photoshop renderer (Adobe has this)         │
│  - Multiple sizes: 150px, 400px, 1200px                      │
│  - Cache in CDN with file_id + version as key                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Adobe = **creative tools + collaboration** — expect drawing/rendering questions
- **Longest Increasing Path** — DFS + memoization on matrix, no explicit visited (strictly increasing prevents cycles)
- **Trie with wildcard** — DFS branch on '.' to try all children
- **Command Pattern** is essential for any undo/redo system
- **PSD-aware chunking** = layer-boundary chunking for efficient delta sync
- **I got rejected** because my machine coding wasn't clean — Adobe values clean, well-structured code above speed
- Always discuss **undo/redo + collaboration** for any Adobe interview

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium-Hard | DFS + Memo, Trie, Wildcard |
| Machine Coding | Hard | Command Pattern, Canvas, Undo/Redo |
| System Design | Hard | Creative Cloud, Large Files, Collaboration |
| HM | Medium | Behavioral |
