# Meta — E5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Software Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | London, UK |
| **Source** | [Medium](https://medium.com/tag/interview-experience) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite: 2 Coding + System Design + Behavioral)
- **Timeline:** 4 weeks
- **Format:** Virtual onsite

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Range Sum Query — Mutable Array with Segment Tree**
   - Build a data structure supporting:
     - `update(index, val)` — update a single element
     - `sumRange(left, right)` — query sum of range [left, right]
   - Both operations in O(log N)

### 💡 Interview-Ready Answer

```java
public class SegmentTree {

    private int[] tree;
    private int n;

    /**
     * Build segment tree from array.
     * tree[1] = root (sum of entire array)
     * tree[2*i] = left child, tree[2*i+1] = right child
     *
     * Time: O(N) build, O(log N) update/query
     * Space: O(N)
     */
    public SegmentTree(int[] nums) {
        this.n = nums.length;
        this.tree = new int[4 * n];
        build(nums, 1, 0, n - 1);
    }

    private void build(int[] nums, int node, int start, int end) {
        if (start == end) {
            tree[node] = nums[start];
            return;
        }
        int mid = (start + end) / 2;
        build(nums, 2 * node, start, mid);
        build(nums, 2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    public void update(int index, int val) {
        update(1, 0, n - 1, index, val);
    }

    private void update(int node, int start, int end, int index, int val) {
        if (start == end) {
            tree[node] = val;
            return;
        }
        int mid = (start + end) / 2;
        if (index <= mid) {
            update(2 * node, start, mid, index, val);
        } else {
            update(2 * node + 1, mid + 1, end, index, val);
        }
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    public int sumRange(int left, int right) {
        return query(1, 0, n - 1, left, right);
    }

    private int query(int node, int start, int end, int l, int r) {
        if (r < start || end < l) return 0;        // No overlap
        if (l <= start && end <= r) return tree[node]; // Total overlap
        int mid = (start + end) / 2;
        return query(2 * node, start, mid, l, r) +
               query(2 * node + 1, mid + 1, end, l, r);
    }

    // ============================================
    // Follow-up: Lazy Propagation for range updates
    // ============================================
    static class LazySegmentTree {
        int[] tree, lazy;
        int n;

        LazySegmentTree(int[] nums) {
            this.n = nums.length;
            tree = new int[4 * n];
            lazy = new int[4 * n];
            build(nums, 1, 0, n - 1);
        }

        private void build(int[] nums, int node, int start, int end) {
            if (start == end) { tree[node] = nums[start]; return; }
            int mid = (start + end) / 2;
            build(nums, 2 * node, start, mid);
            build(nums, 2 * node + 1, mid + 1, end);
            tree[node] = tree[2 * node] + tree[2 * node + 1];
        }

        private void pushDown(int node, int start, int end) {
            if (lazy[node] != 0) {
                int mid = (start + end) / 2;
                tree[2 * node] += lazy[node] * (mid - start + 1);
                tree[2 * node + 1] += lazy[node] * (end - mid);
                lazy[2 * node] += lazy[node];
                lazy[2 * node + 1] += lazy[node];
                lazy[node] = 0;
            }
        }

        /**
         * Range update: add 'val' to all elements in [l, r].
         * Time: O(log N) with lazy propagation.
         */
        void rangeUpdate(int l, int r, int val) {
            rangeUpdate(1, 0, n - 1, l, r, val);
        }

        private void rangeUpdate(int node, int start, int end, int l, int r, int val) {
            if (r < start || end < l) return;
            if (l <= start && end <= r) {
                tree[node] += val * (end - start + 1);
                lazy[node] += val;
                return;
            }
            pushDown(node, start, end);
            int mid = (start + end) / 2;
            rangeUpdate(2 * node, start, mid, l, r, val);
            rangeUpdate(2 * node + 1, mid + 1, end, l, r, val);
            tree[node] = tree[2 * node] + tree[2 * node + 1];
        }

        int rangeQuery(int l, int r) {
            return rangeQuery(1, 0, n - 1, l, r);
        }

        private int rangeQuery(int node, int start, int end, int l, int r) {
            if (r < start || end < l) return 0;
            if (l <= start && end <= r) return tree[node];
            pushDown(node, start, end);
            int mid = (start + end) / 2;
            return rangeQuery(2 * node, start, mid, l, r) +
                   rangeQuery(2 * node + 1, mid + 1, end, l, r);
        }
    }

    public static void main(String[] args) {
        int[] nums = {1, 3, 5, 7, 9, 11};

        // Basic segment tree
        SegmentTree st = new SegmentTree(nums);
        System.out.println("Sum [1,3]: " + st.sumRange(1, 3)); // 3+5+7 = 15
        st.update(2, 10); // change index 2 from 5 to 10
        System.out.println("Sum [1,3] after update: " + st.sumRange(1, 3)); // 3+10+7 = 20

        // Lazy segment tree
        LazySegmentTree lst = new LazySegmentTree(new int[]{1, 3, 5, 7, 9, 11});
        lst.rangeUpdate(1, 4, 5); // add 5 to indices 1..4
        System.out.println("Lazy Sum [0,5]: " + lst.rangeQuery(0, 5)); // 1+8+10+12+14+11 = 56
    }
}
```

## Round 2: Coding Onsite 1
**Duration:** 45 minutes

### Questions Asked
1. **Find the Kth Largest Element in a Data Stream** — min-heap of size K

## Round 3: Coding Onsite 2
**Duration:** 45 minutes

### Questions Asked
1. **Alien Dictionary** — topological sort of characters based on sorted word list

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Facebook's News Feed Ranking System**
   - Hybrid push/pull fan-out model
   - ML-based ranking with engagement scoring
   - Real-time updates and caching strategy

## Round 5: Behavioral
**Duration:** 45 minutes
- How did you handle a disagreement with your manager on technical direction?
- Tell me about a time you led a project that failed. What did you learn?

## 🎯 Key Takeaways
- Meta E5 coding rounds test **data structure mastery** — segment trees, heaps, topological sort
- Lazy propagation follow-up is common — always mention it even if not asked
- News Feed is the canonical Meta system design question — know push vs pull trade-offs
- Behavioral rounds at Meta are earnest — they want genuine failure and growth stories
- Phone screen is easier (Medium) — onsite jumps to Medium-Hard/Hard

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Segment Tree, Range Queries |
| Coding 1 | Medium | Min-Heap, Stream Processing |
| Coding 2 | Hard | Topological Sort, BFS |
| System Design | Hard | News Feed, Fan-out, Ranking |
| Behavioral | Medium | Leadership, Conflict Resolution |
