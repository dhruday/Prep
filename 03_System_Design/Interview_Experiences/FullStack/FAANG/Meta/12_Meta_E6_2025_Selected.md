# Meta — E6 FullStack Interview Experience (2025) — #12

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Staff Software Engineer |
| **Level** | E6 |
| **YOE** | 10 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Ads Ranking |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)

---

## Round 3: Coding — Serialize and Deserialize N-ary Tree with Random Pointers
**Duration:** 45 minutes

### Question: Given an N-ary tree where each node may have a `random` pointer to any other node in the tree, serialize and deserialize the tree.

```java
import java.util.*;

/**
 * N-ary Tree with Random Pointer — Serialize/Deserialize:
 * 
 * Strategy:
 * 1. Assign each node a unique ID during serialization
 * 2. Serialize as: value|numChildren|childIds|randomId
 * 3. BFS traversal ensures parent is serialized before children
 * 4. Deserialize: two-pass — create nodes, then link children + random
 * 
 * Time: O(N), Space: O(N)
 */
class NaryTreeRandomKodec {
    
    static class Node {
        int val;
        List<Node> children;
        Node random; // Points to any node in the tree
        
        Node(int val) {
            this.val = val;
            this.children = new ArrayList<>();
        }
    }
    
    /**
     * Serialize: BFS, assign IDs, encode as string.
     * Format: "id,val,randomId,childCount,child1Id,child2Id,...|id,val,..."
     */
    public String serialize(Node root) {
        if (root == null) return "";
        
        // Assign IDs via BFS
        Map<Node, Integer> nodeToId = new IdentityHashMap<>();
        List<Node> order = new ArrayList<>();
        
        Queue<Node> queue = new LinkedList<>();
        queue.offer(root);
        int id = 0;
        
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            nodeToId.put(node, id++);
            order.add(node);
            
            for (Node child : node.children) {
                queue.offer(child);
            }
        }
        
        // Serialize each node
        StringBuilder sb = new StringBuilder();
        for (Node node : order) {
            if (sb.length() > 0) sb.append('|');
            
            sb.append(nodeToId.get(node));        // ID
            sb.append(',').append(node.val);       // value
            sb.append(',').append(node.random != null ? nodeToId.get(node.random) : -1); // random
            sb.append(',').append(node.children.size()); // child count
            
            for (Node child : node.children) {
                sb.append(',').append(nodeToId.get(child));
            }
        }
        
        return sb.toString();
    }
    
    /**
     * Deserialize: parse → create nodes → link children + random
     */
    public Node deserialize(String data) {
        if (data == null || data.isEmpty()) return null;
        
        String[] nodeStrs = data.split("\\|");
        Map<Integer, Node> idToNode = new HashMap<>();
        
        // Parse structure
        // Stores: [id, val, randomId, childCount, child1Id, child2Id, ...]
        List<int[]> parsed = new ArrayList<>();
        
        for (String nodeStr : nodeStrs) {
            String[] parts = nodeStr.split(",");
            int[] arr = new int[parts.length];
            for (int i = 0; i < parts.length; i++) {
                arr[i] = Integer.parseInt(parts[i]);
            }
            parsed.add(arr);
            
            // Create node
            int nodeId = arr[0];
            int val = arr[1];
            Node node = new Node(val);
            idToNode.put(nodeId, node);
        }
        
        // Link children and random pointers
        for (int[] arr : parsed) {
            int nodeId = arr[0];
            int randomId = arr[2];
            int childCount = arr[3];
            
            Node node = idToNode.get(nodeId);
            
            // Random pointer
            if (randomId != -1) {
                node.random = idToNode.get(randomId);
            }
            
            // Children
            for (int i = 0; i < childCount; i++) {
                int childId = arr[4 + i];
                node.children.add(idToNode.get(childId));
            }
        }
        
        return idToNode.get(0); // Root is always ID 0
    }
}
```

---

## 🎯 Key Takeaways
- Meta E6 = **N-ary tree serialization with random pointers — ID assignment + two-pass deserialize**
- **IdentityHashMap**: uses `==` not `.equals()` — critical for graph node identity
- **BFS for ID assignment**: guarantees parent ID < child IDs — enables streaming deserialization
- **Random pointer**: the hard part — requires global ID resolution, two-pass (create all nodes → then link)
- **Format**: pipe-separated nodes, comma-separated fields — simple parsing without ambiguity
- **Why not preorder with null markers?** Random pointers create cycles/cross-links — need ID-based serialization
- Meta E6 = **graph serialization + system design depth in ads ranking pipeline**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Coding |
| Coding 1 | Hard | Trees, HashMap |
| Coding 2 (this) | Very Hard | N-ary Tree, Random Pointers |
| System Design | Very Hard | Ads Ranking |
| Behavioral | Hard | Meta Leadership |
