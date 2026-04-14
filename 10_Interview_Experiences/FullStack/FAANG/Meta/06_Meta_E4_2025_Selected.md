# Meta — E4 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Software Engineer (E4) |
| **Level** | Mid-Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | London, UK |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Behavioral)
- **Timeline:** 4 weeks
- **Team:** WhatsApp Backend

---

## Round 1: Coding 1
**Duration:** 40 minutes

### Questions Asked
1. **Random Pick with Weight** (LeetCode 528)
2. **Follow-up: Thread-safe version for A/B testing traffic allocation**

### 💡 Interview-Ready Answer

```java
class WeightedRandomPicker {
    private final int[] prefixSums;
    private final Random random;
    
    public WeightedRandomPicker(int[] weights) {
        this.prefixSums = new int[weights.length];
        this.random = new Random();
        
        prefixSums[0] = weights[0];
        for (int i = 1; i < weights.length; i++) {
            prefixSums[i] = prefixSums[i-1] + weights[i];
        }
    }
    
    public int pickIndex() {
        int target = random.nextInt(prefixSums[prefixSums.length - 1]) + 1;
        
        // Binary search for leftmost prefix sum >= target
        int lo = 0, hi = prefixSums.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (prefixSums[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
// Time: O(n) constructor, O(log n) per pick
// Space: O(n)

// Follow-up: Thread-safe A/B testing
// Weights are immutable → pickIndex is already thread-safe (no writes)
// To update weights (change experiment allocation):
// Use copy-on-write → create new WeightedRandomPicker, atomically swap reference
// AtomicReference<WeightedRandomPicker> currentPicker = new AtomicReference<>(picker);
// To update: currentPicker.set(new WeightedRandomPicker(newWeights));
```

---

## Round 2: Coding 2
**Duration:** 40 minutes

### Questions Asked
1. **Lowest Common Ancestor of Deepest Leaves** (LeetCode 1123)
2. **Follow-up: Return the path from root to LCA**

### 💡 Interview-Ready Answer

```java
public TreeNode lcaDeepestLeaves(TreeNode root) {
    return dfs(root).node;
}

record Result(TreeNode node, int depth) {}

private Result dfs(TreeNode node) {
    if (node == null) return new Result(null, 0);
    
    Result left = dfs(node.left);
    Result right = dfs(node.right);
    
    if (left.depth == right.depth) {
        // Both subtrees have same deepest depth → current node is LCA
        return new Result(node, left.depth + 1);
    } else if (left.depth > right.depth) {
        // Left subtree deeper → LCA is in left subtree
        return new Result(left.node, left.depth + 1);
    } else {
        return new Result(right.node, right.depth + 1);
    }
}
// Time: O(n), Space: O(h)

// Follow-up: Path from root to LCA
public List<TreeNode> pathToLCA(TreeNode root) {
    TreeNode lca = lcaDeepestLeaves(root);
    List<TreeNode> path = new ArrayList<>();
    findPath(root, lca, path);
    return path;
}

private boolean findPath(TreeNode node, TreeNode target, List<TreeNode> path) {
    if (node == null) return false;
    path.add(node);
    if (node == target) return true;
    if (findPath(node.left, target, path) || findPath(node.right, target, path)) return true;
    path.remove(path.size() - 1);
    return false;
}
```

---

## Round 3: System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design WhatsApp End-to-End Encrypted Messaging**
   - Message delivery, E2E encryption, group messaging, online/offline handling

### 💡 Interview-Ready Answer

```
WhatsApp E2E Messaging:
┌──────────────────────────────────────────────────────────────┐
│  E2E Encryption (Signal Protocol):                            │
│  1. Key Exchange (X3DH — Extended Triple Diffie-Hellman):    │
│     a. Each device generates: Identity Key (permanent)       │
│        + Signed Pre-Key (rotated monthly)                    │
│        + One-Time Pre-Keys (ephemeral, uploaded in batches)  │
│     b. Upload public keys to WhatsApp server                 │
│     c. When A wants to message B:                            │
│        - Fetch B's key bundle from server                    │
│        - Compute shared secret using X3DH                    │
│        - Server never sees the shared secret!                │
│                                                                │
│  2. Double Ratchet Algorithm:                                │
│     - After initial key exchange, derive per-message keys    │
│     - Each message uses a new key (forward secrecy)          │
│     - Even if one key leaked, past messages remain secure    │
│     - Ratchet: DH ratchet (on send) + chain ratchet (per msg)│
│                                                                │
│  Message Flow:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Sender    │─▶│ WhatsApp      │─▶│ Receiver     │          │
│  │           │  │ Server        │  │              │          │
│  │ Encrypt   │  │ Store+Forward │  │ Decrypt      │          │
│  │ (E2E)     │  │ (opaque blob) │  │ (E2E)        │          │
│  └──────────┘  └──────────────┘  └──────────────┘          │
│                                                                │
│  Server sees: encrypted blob, sender, recipient, timestamp   │
│  Server CANNOT see: message content, media, calls            │
│                                                                │
│  Offline Delivery:                                            │
│  1. Sender sends message → server stores encrypted msg       │
│  2. Server sends push notification (FCM/APNs)               │
│  3. Receiver comes online → server delivers stored messages  │
│  4. Receiver sends ACK → server deletes stored messages      │
│  5. Two checkmarks: ✓ (delivered to server), ✓✓ (to device) │
│                                                                │
│  Group Messaging:                                             │
│  - Sender Keys protocol (not pairwise encryption):           │
│  - Each member generates a "sender key"                      │
│  - Distribute sender key to all members (pairwise encrypted) │
│  - Messages encrypted with sender key (one encrypt for group)│
│  - When member leaves: all remaining members rotate keys     │
│  - Max group size: 1024 (limited by key distribution)        │
│                                                                │
│  Architecture:                                                │
│  - Connection: TCP long-lived (not WebSocket — custom XMPP)  │
│  - Message store: ephemeral (delete after delivery, max 30d) │
│  - Media: encrypted, stored in CDN, URL sent in message      │
│  - Erlang backend: handles 2M+ connections per server        │
│  - Queuing: messages queued per-user, FIFO ordering          │
│                                                                │
│  Scale:                                                       │
│  - 100B+ messages/day                                        │
│  - 2B+ active users                                          │
│  - 99.99% delivery rate                                      │
│  - Median delivery latency: <500ms (both online)             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Meta E4 = **solid coding + relevant system design** (WhatsApp is Bangalore/London focused)
- **Weighted Random** with prefix sum + binary search — Meta's favorite for A/B testing context
- **LCA of Deepest Leaves** — elegant DFS returning (node, depth) pair
- **Signal Protocol** (X3DH + Double Ratchet) — know the concept, not implementation details
- **Sender Keys** for group encryption — one encrypt per message (not N pairwise encrypts)
- **Offline delivery** = store-and-forward + push notification + ACK-and-delete
- Meta WhatsApp team cares about **privacy and encryption** depth

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Prefix Sum, Binary Search, Thread Safety |
| Coding 2 | Medium-Hard | Tree DFS, LCA, Path Finding |
| System Design | Very Hard | E2E Encryption, Signal Protocol, Groups |
| Behavioral | Medium | Meta Values |
