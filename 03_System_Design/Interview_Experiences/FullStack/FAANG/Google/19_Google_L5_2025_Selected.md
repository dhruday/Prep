# Google — L5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer L5 |
| **Level** | L5 (Senior) |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite: 2 Coding + System Design + Behavioral/Googleyness)
- **Timeline:** 6 weeks (including team matching)
- **Format:** Virtual onsite

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Serialize and Deserialize a Binary Tree with Nested Optional Subtrees**

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class BinaryTreeCodec {

    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

    // Preorder traversal with null markers
    private static final String NULL_MARKER = "#";
    private static final String DELIMITER = ",";

    /**
     * Serialize: Preorder DFS with null markers.
     * Time: O(N), Space: O(N)
     */
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        serializeDFS(root, sb);
        return sb.toString();
    }

    private void serializeDFS(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.append(NULL_MARKER).append(DELIMITER);
            return;
        }
        sb.append(node.val).append(DELIMITER);
        serializeDFS(node.left, sb);
        serializeDFS(node.right, sb);
    }

    /**
     * Deserialize: Consume tokens in preorder.
     * Time: O(N), Space: O(N)
     */
    public TreeNode deserialize(String data) {
        if (data == null || data.isEmpty()) return null;
        Queue<String> tokens = new LinkedList<>(Arrays.asList(data.split(DELIMITER)));
        return deserializeDFS(tokens);
    }

    private TreeNode deserializeDFS(Queue<String> tokens) {
        if (tokens.isEmpty()) return null;
        String token = tokens.poll();
        if (token.equals(NULL_MARKER)) return null;

        TreeNode node = new TreeNode(Integer.parseInt(token));
        node.left = deserializeDFS(tokens);
        node.right = deserializeDFS(tokens);
        return node;
    }

    // ============================================
    // Follow-up: Compact binary encoding (bit-level)
    // ============================================
    /**
     * More space-efficient: use bit flags for null children.
     * Each node: [value (4 bytes)] [flags (1 byte: bit0=hasLeft, bit1=hasRight)]
     */
    public byte[] serializeCompact(TreeNode root) {
        List<Byte> bytes = new ArrayList<>();
        serializeCompactDFS(root, bytes);
        byte[] result = new byte[bytes.size()];
        for (int i = 0; i < bytes.size(); i++) result[i] = bytes.get(i);
        return result;
    }

    private void serializeCompactDFS(TreeNode node, List<Byte> bytes) {
        if (node == null) return;

        // Write value (4 bytes, big-endian)
        bytes.add((byte) (node.val >> 24));
        bytes.add((byte) (node.val >> 16));
        bytes.add((byte) (node.val >> 8));
        bytes.add((byte) node.val);

        // Write child flags
        byte flags = 0;
        if (node.left != null) flags |= 1;
        if (node.right != null) flags |= 2;
        bytes.add(flags);

        serializeCompactDFS(node.left, bytes);
        serializeCompactDFS(node.right, bytes);
    }

    public TreeNode deserializeCompact(byte[] data) {
        if (data == null || data.length == 0) return null;
        int[] index = {0};
        return deserializeCompactDFS(data, index);
    }

    private TreeNode deserializeCompactDFS(byte[] data, int[] index) {
        if (index[0] >= data.length) return null;

        int val = ((data[index[0]] & 0xFF) << 24) |
                  ((data[index[0] + 1] & 0xFF) << 16) |
                  ((data[index[0] + 2] & 0xFF) << 8) |
                  (data[index[0] + 3] & 0xFF);
        byte flags = data[index[0] + 4];
        index[0] += 5;

        TreeNode node = new TreeNode(val);
        if ((flags & 1) != 0) node.left = deserializeCompactDFS(data, index);
        if ((flags & 2) != 0) node.right = deserializeCompactDFS(data, index);
        return node;
    }

    // ============================================
    // Follow-up 2: N-ary tree serialization
    // ============================================
    static class NaryNode {
        int val;
        List<NaryNode> children = new ArrayList<>();
        NaryNode(int val) { this.val = val; }
    }

    public String serializeNary(NaryNode root) {
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        serializeNaryDFS(root, sb);
        return sb.toString();
    }

    private void serializeNaryDFS(NaryNode node, StringBuilder sb) {
        sb.append(node.val).append(DELIMITER);
        sb.append(node.children.size()).append(DELIMITER);
        for (NaryNode child : node.children) {
            serializeNaryDFS(child, sb);
        }
    }

    public NaryNode deserializeNary(String data) {
        if (data.isEmpty()) return null;
        Queue<String> tokens = new LinkedList<>(Arrays.asList(data.split(DELIMITER)));
        return deserializeNaryDFS(tokens);
    }

    private NaryNode deserializeNaryDFS(Queue<String> tokens) {
        int val = Integer.parseInt(tokens.poll());
        int childCount = Integer.parseInt(tokens.poll());
        NaryNode node = new NaryNode(val);
        for (int i = 0; i < childCount; i++) {
            node.children.add(deserializeNaryDFS(tokens));
        }
        return node;
    }

    public static void main(String[] args) {
        BinaryTreeCodec codec = new BinaryTreeCodec();

        TreeNode root = new TreeNode(1);
        root.left = new TreeNode(2);
        root.right = new TreeNode(3);
        root.left.left = new TreeNode(4);
        root.right.right = new TreeNode(5);

        String serialized = codec.serialize(root);
        System.out.println("Serialized: " + serialized);
        // 1,2,4,#,#,#,3,#,5,#,#,

        TreeNode restored = codec.deserialize(serialized);
        System.out.println("Re-serialized: " + codec.serialize(restored));

        // Compact encoding
        byte[] compact = codec.serializeCompact(root);
        System.out.println("Compact size: " + compact.length + " bytes vs string: " + serialized.length() + " chars");
    }
}
```

## Round 2: Coding Round 1 (Onsite)
**Duration:** 45 minutes

### Questions Asked
1. **Find All Valid Combinations of K Numbers that Sum to Target**
   - Each number can be selected from 1-9
   - No repeats, order doesn't matter
   - Return all unique combinations

## Round 3: Coding Round 2 (Onsite)
**Duration:** 45 minutes

### Questions Asked
1. **Design a Thread-Safe Bounded Blocking Queue**

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google's Notification Delivery System**
   - Multi-channel: push, email, SMS, in-app
   - Priority-based delivery with rate limiting per user
   - Handle 1B+ notifications/day

## Round 5: Googleyness & Leadership
**Duration:** 45 minutes

## 🎯 Key Takeaways
- Google L5 coding rounds go **deep with follow-ups** — always have compact/streaming/N-ary extensions ready
- Binary serialization follow-ups test byte-level thinking
- System design requires **back-of-envelope math** upfront (1B notifications = ~12K QPS)
- Googleyness round is genuinely about culture fit and intellectual humility

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Tree Serialization, DFS |
| Coding 1 | Medium | Backtracking, Combinations |
| Coding 2 | Hard | Concurrency, Blocking Queue |
| System Design | Hard | Notifications, Multi-channel |
| Googleyness | Medium | Behavioral, Leadership |
