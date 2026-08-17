# Google — L5 FullStack Interview Experience (2025) — #14

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer L5 |
| **Level** | L5 (Senior) |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected (HC) |
| **Location** | Mountain View, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Cloud Bigtable |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Behavioral + Googliness)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Design a Text Editor with Undo/Redo using Rope Data Structure**
2. **Follow-up: Support cursor positioning and multi-cursor editing**

### 💡 Rope Data Structure for Text Editor

```java
/**
 * Rope: balanced binary tree of strings for efficient text editing.
 * - Insert at position i: O(log n)
 * - Delete range [i, j): O(log n)
 * - Substring: O(log n + k) where k = length of substring
 * - Concat: O(log n)
 * 
 * vs String: insert/delete is O(n) due to shifting.
 * vs StringBuilder: insert is O(n), no persistent snapshots.
 */
class Rope {
    String text;       // Only set for leaf nodes
    Rope left, right;
    int weight;        // Length of left subtree (or text length for leaves)
    int totalLength;
    
    // Leaf constructor
    Rope(String text) {
        this.text = text;
        this.weight = text.length();
        this.totalLength = text.length();
    }
    
    // Internal node constructor
    Rope(Rope left, Rope right) {
        this.left = left;
        this.right = right;
        this.weight = left != null ? left.totalLength : 0;
        this.totalLength = (left != null ? left.totalLength : 0) + 
                           (right != null ? right.totalLength : 0);
    }
    
    // Get character at index
    char charAt(int index) {
        if (index < 0 || index >= totalLength) 
            throw new IndexOutOfBoundsException();
        
        if (text != null) return text.charAt(index); // Leaf
        
        if (index < weight) {
            return left.charAt(index);
        } else {
            return right.charAt(index - weight);
        }
    }
    
    // Split rope at position → returns (left, right)
    static Rope[] split(Rope rope, int pos) {
        if (rope == null) return new Rope[]{null, null};
        
        if (rope.text != null) { // Leaf
            if (pos <= 0) return new Rope[]{null, rope};
            if (pos >= rope.text.length()) return new Rope[]{rope, null};
            
            return new Rope[]{
                new Rope(rope.text.substring(0, pos)),
                new Rope(rope.text.substring(pos))
            };
        }
        
        if (pos < rope.weight) {
            Rope[] leftSplit = split(rope.left, pos);
            return new Rope[]{
                leftSplit[0],
                concat(leftSplit[1], rope.right)
            };
        } else if (pos > rope.weight) {
            Rope[] rightSplit = split(rope.right, pos - rope.weight);
            return new Rope[]{
                concat(rope.left, rightSplit[0]),
                rightSplit[1]
            };
        } else { // pos == weight
            return new Rope[]{rope.left, rope.right};
        }
    }
    
    // Concatenate two ropes
    static Rope concat(Rope left, Rope right) {
        if (left == null) return right;
        if (right == null) return left;
        return new Rope(left, right);
    }
    
    // Insert string at position
    static Rope insert(Rope rope, int pos, String str) {
        Rope[] parts = split(rope, pos);
        Rope middle = new Rope(str);
        return concat(concat(parts[0], middle), parts[1]);
    }
    
    // Delete range [start, end)
    static Rope delete(Rope rope, int start, int end) {
        Rope[] firstSplit = split(rope, start);
        Rope[] secondSplit = split(firstSplit[1], end - start);
        return concat(firstSplit[0], secondSplit[1]);
    }
    
    // Get substring [start, end)
    String substring(int start, int end) {
        // Extract via split
        Rope[] first = split(this, start);
        Rope[] second = split(first[1], end - start);
        return second[0] != null ? second[0].toString() : "";
    }
    
    @Override
    public String toString() {
        if (text != null) return text;
        StringBuilder sb = new StringBuilder();
        if (left != null) sb.append(left.toString());
        if (right != null) sb.append(right.toString());
        return sb.toString();
    }
}

// Text Editor with Undo/Redo (Command Pattern)
class TextEditor {
    Rope rope;
    Deque<Command> undoStack = new ArrayDeque<>();
    Deque<Command> redoStack = new ArrayDeque<>();
    
    TextEditor(String initial) {
        this.rope = new Rope(initial);
    }
    
    void insert(int pos, String text) {
        Command cmd = new InsertCommand(pos, text);
        cmd.execute(this);
        undoStack.push(cmd);
        redoStack.clear(); // New action invalidates redo history
    }
    
    void delete(int start, int end) {
        String deleted = rope.substring(start, end);
        Command cmd = new DeleteCommand(start, end, deleted);
        cmd.execute(this);
        undoStack.push(cmd);
        redoStack.clear();
    }
    
    void undo() {
        if (undoStack.isEmpty()) return;
        Command cmd = undoStack.pop();
        cmd.undo(this);
        redoStack.push(cmd);
    }
    
    void redo() {
        if (redoStack.isEmpty()) return;
        Command cmd = redoStack.pop();
        cmd.execute(this);
        undoStack.push(cmd);
    }
    
    interface Command {
        void execute(TextEditor editor);
        void undo(TextEditor editor);
    }
    
    static class InsertCommand implements Command {
        int pos;
        String text;
        
        InsertCommand(int pos, String text) { this.pos = pos; this.text = text; }
        
        public void execute(TextEditor editor) {
            editor.rope = Rope.insert(editor.rope, pos, text);
        }
        
        public void undo(TextEditor editor) {
            editor.rope = Rope.delete(editor.rope, pos, pos + text.length());
        }
    }
    
    static class DeleteCommand implements Command {
        int start, end;
        String deleted;
        
        DeleteCommand(int start, int end, String deleted) {
            this.start = start; this.end = end; this.deleted = deleted;
        }
        
        public void execute(TextEditor editor) {
            editor.rope = Rope.delete(editor.rope, start, end);
        }
        
        public void undo(TextEditor editor) {
            editor.rope = Rope.insert(editor.rope, start, deleted);
        }
    }
}
```

**Complexity:**
- Insert/Delete/Split: O(log n) amortized with balanced rope
- charAt: O(log n)
- Undo/Redo: O(1) stack operations + O(log n) rope mutation

---

## Round 2: System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Google Cloud Bigtable (wide-column NoSQL store)**
   - Sorted string table (SSTable) + log-structured merge tree (LSM)
   - Tablet splitting and load balancing
   - Row-level transactions (single-row atomic)
   - Column family optimization
   - Scale: petabytes of data, billions of rows

### 💡 Bigtable Architecture

```
Architecture:
┌─────────────────────────────────────────────────┐
│                 Client Library                   │
│ (Smart client: caches tablet locations,          │
│  batches mutations, retries on failure)          │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│              Master Server                       │
│ • Assigns tablets to tablet servers              │
│ • Detects server additions/failures (Chubby)     │
│ • Balances tablet load across servers            │
│ • Garbage collection of SSTable files            │
│ • Schema changes (column family create/delete)   │
│                                                  │
│ NOT on read/write path — clients talk directly   │
│ to tablet servers                                │
└──────────────────────────────────────────────────┘

Tablet Server (one per machine):
┌──────────────────────────────────────────────────┐
│  Tablet Server                                    │
│  ├── Tablet: "users#aaa...fff"                    │
│  │   ├── MemTable (sorted in-memory, red-black)   │
│  │   ├── Write-Ahead Log (WAL on GFS)             │
│  │   └── SSTables on GFS:                         │
│  │       ├── SSTable-L0-001 (recent, unsorted)     │
│  │       ├── SSTable-L1-042 (compacted, sorted)    │
│  │       └── SSTable-L1-043                        │
│  │                                                 │
│  ├── Tablet: "users#fff...mmm"                    │
│  └── Tablet: "logs#2025-04..."                    │
└──────────────────────────────────────────────────┘

Write Path:
1. Client → Tablet Server (for row's tablet)
2. Server writes to WAL (append-only, on GFS) — durability
3. Server inserts into MemTable (in-memory sorted structure)
4. When MemTable reaches threshold (e.g., 64MB):
   a. Freeze MemTable → immutable
   b. Flush to new SSTable on GFS (minor compaction)
   c. Create new empty MemTable
5. Periodic major compaction: merge multiple SSTables → single SSTable
   - Removes deleted entries (tombstones)
   - Removes expired entries (TTL)

Read Path:
1. Client → Tablet Server
2. Server checks Bloom filter for each SSTable — skip SSTables that definitely don't contain key
3. Merge-read: MemTable + all SSTables
   - MemTable (newest data, in memory)
   - L0 SSTables (recent flushed data)
   - L1 SSTables (compacted, fewer files)
4. Return newest version of each column
5. Block cache: LRU cache of SSTable blocks in memory

Row Key Design (critical for performance):
┌──────────────────────────────────────────────────┐
│ Row Key: "com.google.www/index.html#20250415"     │
│                                                    │
│ Why reversed domain?                               │
│ • "com.google" groups all Google URLs together     │
│ • Sequential locality → same tablet → fast scans  │
│                                                    │
│ Bad: "www.google.com" — scattered across tablets   │
│ Good: "com.google.www" — co-located                │
│                                                    │
│ Timestamp suffix: #20250415                        │
│ • Latest version first (descending timestamp)      │
│ • Garbage collect old versions (keep last N)        │
└──────────────────────────────────────────────────┘

Tablet Splitting:
- Tablet grows beyond threshold (e.g., 200MB)
- Split at midpoint of row key range
- Parent tablet → two child tablets
- Master reassigns one child to a different server
- Important: split is metadata-only (SSTables shared via GFS)
  → child tablets point to same SSTable files initially
  → compaction later separates data physically

Compaction Strategy (LSM Tree):
Level    SSTables    Size      Write Amp
L0       ~4 files    ~256MB    1x (flush)
L1       ~10 files   ~2.5GB   10x (merge L0→L1)
L2       ~100 files  ~25GB    10x (merge L1→L2)
L3       ~1000 files ~250GB   10x (merge L2→L3)

Total write amplification: ~30-40x
Tradeoff: higher write amp → lower read amp (fewer files to check)
```

---

## 🎯 Key Takeaways
- Google L5 = **Rope data structure + Bigtable/LSM internals**
- **Rope**: binary tree of string fragments — O(log n) insert/delete vs O(n) for String/StringBuilder
- **Split + Concat**: core rope operations — all others (insert, delete, substring) compose from these
- **Command Pattern for Undo/Redo**: each command stores enough info to reverse itself
- **Bigtable LSM tree**: write-optimized — WAL + MemTable → SSTable flush → periodic compaction
- **Bloom filters**: skip SSTables that don't contain the key — critical for read performance
- **Reversed domain keys**: ensure locality — co-locate related rows on same tablet
- **Tablet split is metadata-only**: child tablets share parent's SSTable files via GFS initially
- Rejected at **HC (Hiring Committee)** despite strong interviews — Google HC is notoriously unpredictable

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Very Hard | Rope Data Structure, Command Pattern |
| Coding 2 | Hard | Graph / DP |
| System Design | Very Hard | Bigtable, LSM Tree, Compaction |
| Behavioral | Medium | Googliness, Teamwork |
| Googliness | Medium | Thought Leadership |
