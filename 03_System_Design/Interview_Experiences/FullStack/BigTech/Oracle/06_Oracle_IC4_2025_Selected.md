# Oracle — Principal MTS Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Principal Member of Technical Staff |
| **Level** | IC4 |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Technical — Implement a B-Tree with Insert and Search
**Duration:** 60 minutes

### Problem
Implement a B-Tree of order M supporting insert and search operations. This is fundamental to Oracle's database engine.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class BTree {

    private final int order; // Maximum children per node
    private final int minKeys; // Minimum keys in non-root node
    private Node root;

    static class Node {
        List<Integer> keys;
        List<Node> children;
        boolean isLeaf;

        Node(boolean isLeaf) {
            this.keys = new ArrayList<>();
            this.children = new ArrayList<>();
            this.isLeaf = isLeaf;
        }
    }

    public BTree(int order) {
        if (order < 3) throw new IllegalArgumentException("Order must be >= 3");
        this.order = order;
        this.minKeys = (int) Math.ceil(order / 2.0) - 1;
        this.root = new Node(true);
    }

    /**
     * Search for a key in the B-Tree.
     * Time: O(log_m(n)) where m = order, n = number of keys
     */
    public boolean search(int key) {
        return search(root, key);
    }

    private boolean search(Node node, int key) {
        int i = 0;
        while (i < node.keys.size() && key > node.keys.get(i)) {
            i++;
        }

        if (i < node.keys.size() && node.keys.get(i) == key) {
            return true;
        }

        if (node.isLeaf) {
            return false;
        }

        return search(node.children.get(i), key);
    }

    /**
     * Insert a key into the B-Tree.
     * If root is full, split it first (tree grows upward).
     */
    public void insert(int key) {
        Node r = root;

        if (r.keys.size() == order - 1) {
            // Root is full — create new root and split
            Node newRoot = new Node(false);
            newRoot.children.add(r);
            splitChild(newRoot, 0);
            root = newRoot;
            insertNonFull(newRoot, key);
        } else {
            insertNonFull(r, key);
        }
    }

    /**
     * Insert into a node that is guaranteed not full.
     */
    private void insertNonFull(Node node, int key) {
        int i = node.keys.size() - 1;

        if (node.isLeaf) {
            // Find position and insert
            node.keys.add(0); // Placeholder
            while (i >= 0 && key < node.keys.get(i)) {
                node.keys.set(i + 1, node.keys.get(i));
                i--;
            }
            node.keys.set(i + 1, key);
        } else {
            // Find child to descend into
            while (i >= 0 && key < node.keys.get(i)) {
                i--;
            }
            i++;

            // If child is full, split it first
            if (node.children.get(i).keys.size() == order - 1) {
                splitChild(node, i);
                // After split, decide which of the two children to descend into
                if (key > node.keys.get(i)) {
                    i++;
                }
            }

            insertNonFull(node.children.get(i), key);
        }
    }

    /**
     * Split the child at index `childIndex` of `parent`.
     * The median key moves up to the parent.
     */
    private void splitChild(Node parent, int childIndex) {
        Node fullChild = parent.children.get(childIndex);
        int mid = fullChild.keys.size() / 2;

        // Create new right sibling
        Node rightSibling = new Node(fullChild.isLeaf);

        // Move upper half of keys to right sibling
        rightSibling.keys.addAll(fullChild.keys.subList(mid + 1, fullChild.keys.size()));

        // Move upper half of children (if internal node)
        if (!fullChild.isLeaf) {
            rightSibling.children.addAll(
                fullChild.children.subList(mid + 1, fullChild.children.size()));
        }

        // Median key moves up to parent
        int medianKey = fullChild.keys.get(mid);

        // Trim the full child (keep lower half)
        fullChild.keys = new ArrayList<>(fullChild.keys.subList(0, mid));
        if (!fullChild.isLeaf) {
            fullChild.children = new ArrayList<>(
                fullChild.children.subList(0, mid + 1));
        }

        // Insert median and right sibling into parent
        parent.keys.add(childIndex, medianKey);
        parent.children.add(childIndex + 1, rightSibling);
    }

    /**
     * Print B-Tree level by level for debugging.
     */
    public void printTree() {
        if (root.keys.isEmpty()) {
            System.out.println("(empty tree)");
            return;
        }

        Queue<Node> queue = new LinkedList<>();
        queue.offer(root);
        int level = 0;

        while (!queue.isEmpty()) {
            int size = queue.size();
            System.out.print("Level " + level + ": ");
            for (int i = 0; i < size; i++) {
                Node node = queue.poll();
                System.out.print(node.keys + " ");
                if (!node.isLeaf) {
                    queue.addAll(node.children);
                }
            }
            System.out.println();
            level++;
        }
    }

    /**
     * In-order traversal (returns sorted keys).
     */
    public List<Integer> inOrder() {
        List<Integer> result = new ArrayList<>();
        inOrder(root, result);
        return result;
    }

    private void inOrder(Node node, List<Integer> result) {
        for (int i = 0; i < node.keys.size(); i++) {
            if (!node.isLeaf) {
                inOrder(node.children.get(i), result);
            }
            result.add(node.keys.get(i));
        }
        if (!node.isLeaf) {
            inOrder(node.children.get(node.keys.size()), result);
        }
    }

    public static void main(String[] args) {
        BTree tree = new BTree(4); // Order 4 B-Tree (2-3-4 tree)

        int[] keys = {10, 20, 5, 6, 12, 30, 7, 17, 3, 25, 35, 40, 28, 15, 22};

        for (int key : keys) {
            tree.insert(key);
            System.out.println("Inserted " + key + ":");
            tree.printTree();
            System.out.println();
        }

        System.out.println("In-order traversal: " + tree.inOrder());

        // Search
        System.out.println("Search 15: " + tree.search(15)); // true
        System.out.println("Search 18: " + tree.search(18)); // false
        System.out.println("Search 3: " + tree.search(3));   // true
    }
}
```

## 🎯 Key Takeaways
- Oracle is **database-centric** — B-Tree implementation is their bread and butter
- Key concepts: split child when full, median key propagates upward
- Tree grows from the root (split creates new root when root is full)
- Pre-emptive splitting (split before descending) simplifies implementation
- In-order traversal of B-Tree always yields sorted order
- Order M means: max M children, max M-1 keys, min ⌈M/2⌉-1 keys

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Hard | B-Tree, Data Structures |
| Technical 2 | Medium-Hard | Query Optimization |
| HM | Medium | Behavioral |
