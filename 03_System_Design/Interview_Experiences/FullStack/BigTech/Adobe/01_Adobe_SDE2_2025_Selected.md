# Adobe — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Computer Scientist II |
| **Level** | MTS-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/adobe-interview-experience-for-mts-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding Test + 3 Technical)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Note:** Adobe interviews are very DSA-heavy. Expect 2-3 DSA problems per round.

---

## Round 1: Online Coding Test
**Duration:** 90 minutes | **Platform:** HackerRank

### Questions Asked
1. **Longest Palindromic Substring** (LeetCode 5)
2. **Rotate Image** (LeetCode 48)
3. **Next Greater Element** (LeetCode 496)

### 💡 Interview-Ready Answer — Longest Palindromic Substring

**Approach: Expand Around Center (Optimal for interviews)**
```java
public String longestPalindrome(String s) {
    if (s.length() < 2) return s;
    
    int start = 0, maxLen = 1;
    
    for (int i = 0; i < s.length(); i++) {
        // Odd length palindromes
        int len1 = expandAroundCenter(s, i, i);
        // Even length palindromes
        int len2 = expandAroundCenter(s, i, i + 1);
        
        int len = Math.max(len1, len2);
        if (len > maxLen) {
            maxLen = len;
            start = i - (len - 1) / 2;
        }
    }
    
    return s.substring(start, start + maxLen);
}

private int expandAroundCenter(String s, int left, int right) {
    while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
        left--;
        right++;
    }
    return right - left - 1;
}
```
**Time:** O(n²), **Space:** O(1)

### 💡 Interview-Ready Answer — Rotate Image (In-place)

```java
public void rotate(int[][] matrix) {
    int n = matrix.length;
    
    // Step 1: Transpose (swap matrix[i][j] with matrix[j][i])
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int temp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = temp;
        }
    }
    
    // Step 2: Reverse each row
    for (int i = 0; i < n; i++) {
        int left = 0, right = n - 1;
        while (left < right) {
            int temp = matrix[i][left];
            matrix[i][left] = matrix[i][right];
            matrix[i][right] = temp;
            left++;
            right--;
        }
    }
}
// 90° clockwise = transpose + reverse rows
// 90° counter-clockwise = transpose + reverse columns
// 180° = reverse rows + reverse columns
```

### 💡 Interview-Ready Answer — Next Greater Element

```java
public int[] nextGreaterElement(int[] nums1, int[] nums2) {
    // Monotonic decreasing stack
    Map<Integer, Integer> nextGreater = new HashMap<>();
    Deque<Integer> stack = new ArrayDeque<>();
    
    for (int num : nums2) {
        while (!stack.isEmpty() && stack.peek() < num) {
            nextGreater.put(stack.pop(), num);
        }
        stack.push(num);
    }
    
    int[] result = new int[nums1.length];
    for (int i = 0; i < nums1.length; i++) {
        result[i] = nextGreater.getOrDefault(nums1[i], -1);
    }
    return result;
}
```
**Time:** O(n + m), **Space:** O(n)

---

## Round 2: Technical I — DSA
**Duration:** 60 minutes | **Interviewer:** Senior MTS

### Questions Asked
1. **Clone Graph** (LeetCode 133)
2. **Maximum Product Subarray** (LeetCode 152)
3. **Median of Two Sorted Arrays** (LeetCode 4) — hard

### 💡 Interview-Ready Answer — Clone Graph

```java
public Node cloneGraph(Node node) {
    if (node == null) return null;
    
    Map<Node, Node> visited = new HashMap<>();
    return dfsClone(node, visited);
}

private Node dfsClone(Node node, Map<Node, Node> visited) {
    if (visited.containsKey(node)) return visited.get(node);
    
    Node clone = new Node(node.val);
    visited.put(node, clone);
    
    for (Node neighbor : node.neighbors) {
        clone.neighbors.add(dfsClone(neighbor, visited));
    }
    
    return clone;
}
```

### 💡 Interview-Ready Answer — Maximum Product Subarray

```java
public int maxProduct(int[] nums) {
    int maxProd = nums[0];
    int curMax = nums[0];
    int curMin = nums[0]; // track min because negative × negative = positive
    
    for (int i = 1; i < nums.length; i++) {
        if (nums[i] < 0) {
            // Swap: negative flips max/min
            int temp = curMax;
            curMax = curMin;
            curMin = temp;
        }
        
        curMax = Math.max(nums[i], curMax * nums[i]);
        curMin = Math.min(nums[i], curMin * nums[i]);
        maxProd = Math.max(maxProd, curMax);
    }
    
    return maxProd;
}
```
**Time:** O(n), **Space:** O(1)

**Key insight:** Track both max and min product because a negative number can turn the minimum product into the maximum.

### 💡 Interview-Ready Answer — Median of Two Sorted Arrays

```java
public double findMedianSortedArrays(int[] nums1, int[] nums2) {
    // Binary search on the shorter array
    if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
    
    int m = nums1.length, n = nums2.length;
    int lo = 0, hi = m;
    
    while (lo <= hi) {
        int i = (lo + hi) / 2;     // partition index in nums1
        int j = (m + n + 1) / 2 - i; // partition index in nums2
        
        int maxLeft1 = (i == 0) ? Integer.MIN_VALUE : nums1[i - 1];
        int minRight1 = (i == m) ? Integer.MAX_VALUE : nums1[i];
        int maxLeft2 = (j == 0) ? Integer.MIN_VALUE : nums2[j - 1];
        int minRight2 = (j == n) ? Integer.MAX_VALUE : nums2[j];
        
        if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
            // Found correct partition
            if ((m + n) % 2 == 0) {
                return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2.0;
            } else {
                return Math.max(maxLeft1, maxLeft2);
            }
        } else if (maxLeft1 > minRight2) {
            hi = i - 1; // move left in nums1
        } else {
            lo = i + 1; // move right in nums1
        }
    }
    
    throw new IllegalArgumentException("Input arrays are not sorted");
}
```
**Time:** O(log(min(m, n))), **Space:** O(1)

---

## Round 3: Technical II — System Design + LLD
**Duration:** 60 minutes | **Interviewer:** Principal MTS

### Questions Asked
1. **Design a URL Shortener** (like bit.ly)
2. **Follow-up: Analytics dashboard — which URLs are clicked most, geo distribution, time series**

### 💡 Interview-Ready Answer

#### Architecture
```
┌──────────┐     ┌──────────────────────────────────────┐
│  Client   │     │  URL Shortener Service                │
│           │     │                                        │
│  POST     │     │  ┌──────────────┐                     │
│  /shorten │────▶│  │ API Server    │                     │
│  {url}    │     │  │ - Validate    │                     │
│           │     │  │ - Generate ID │                     │
│  GET      │     │  │ - Store       │                     │
│  /abc123  │────▶│  │ - Redirect    │                     │
│           │     │  └──────┬───────┘                     │
└──────────┘     │         │                              │
                  │  ┌──────▼───────┐  ┌──────────────┐  │
                  │  │  Redis Cache  │  │  PostgreSQL   │  │
                  │  │  (hot URLs)   │  │  (persistent) │  │
                  │  └──────────────┘  └──────────────┘  │
                  │                                        │
                  │  ┌──────────────────────────────────┐ │
                  │  │  Analytics Pipeline               │ │
                  │  │  Click events → Kafka → ClickHouse│ │
                  │  └──────────────────────────────────┘ │
                  └──────────────────────────────────────┘
```

#### Short URL Generation
```java
class URLShortener {
    private static final String BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    
    // Approach 1: Counter-based (guarantees uniqueness)
    private final AtomicLong counter; // pre-allocated range from ZooKeeper
    
    public String shorten(String longUrl) {
        // 1. Check if URL already shortened (dedup)
        String existing = cache.get(longUrl);
        if (existing != null) return existing;
        
        // 2. Generate unique ID
        long id = counter.incrementAndGet();
        String shortCode = encode(id);
        
        // 3. Store mapping
        db.save(shortCode, longUrl);
        cache.put(longUrl, shortCode);
        cache.put(shortCode, longUrl);
        
        return "https://short.ly/" + shortCode;
    }
    
    public String resolve(String shortCode) {
        // 1. Check cache
        String url = cache.get(shortCode);
        if (url != null) return url;
        
        // 2. Check DB
        url = db.findByShortCode(shortCode);
        if (url == null) throw new NotFoundException("URL not found");
        
        cache.put(shortCode, url);
        
        // 3. Log click event (async)
        analyticsService.logClick(shortCode, request.getIp(), request.getUserAgent());
        
        return url;
    }
    
    // Base62 encoding: 7 chars = 62^7 = 3.5 trillion unique URLs
    private String encode(long num) {
        StringBuilder sb = new StringBuilder();
        while (num > 0) {
            sb.append(BASE62.charAt((int)(num % 62)));
            num /= 62;
        }
        while (sb.length() < 7) sb.append('0'); // pad to 7 chars
        return sb.reverse().toString();
    }
}
```

#### Scale Numbers
```
- 100M URLs created per month
- 10B redirects per month (100:1 read/write ratio)
- Storage: 100M × 500 bytes = 50GB/month → 600GB/year
- Redis cache: top 20% URLs = 20M × 500 bytes = 10GB (fits in memory)
- QPS: 10B / 30 days / 86400 = ~3,800 QPS average, 10K peak
```

---

## Round 4: Technical III — Behavioral + Coding
**Duration:** 60 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about your most impactful project"**
2. **Coding: Implement a Trie with wildcard search**

### 💡 Interview-Ready Answer — Trie with Wildcard

```java
class WildcardTrie {
    class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEnd;
    }
    
    TrieNode root = new TrieNode();
    
    void insert(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) node.children[idx] = new TrieNode();
            node = node.children[idx];
        }
        node.isEnd = true;
    }
    
    // Search with '.' wildcard (matches any single character)
    boolean search(String word) {
        return searchHelper(word, 0, root);
    }
    
    private boolean searchHelper(String word, int index, TrieNode node) {
        if (node == null) return false;
        if (index == word.length()) return node.isEnd;
        
        char c = word.charAt(index);
        
        if (c == '.') {
            // Try all possible children
            for (TrieNode child : node.children) {
                if (searchHelper(word, index + 1, child)) return true;
            }
            return false;
        } else {
            return searchHelper(word, index + 1, node.children[c - 'a']);
        }
    }
    
    // Autocomplete: return all words with given prefix
    List<String> autocomplete(String prefix) {
        TrieNode node = root;
        for (char c : prefix.toCharArray()) {
            if (node.children[c - 'a'] == null) return Collections.emptyList();
            node = node.children[c - 'a'];
        }
        
        List<String> results = new ArrayList<>();
        collectWords(node, new StringBuilder(prefix), results);
        return results;
    }
    
    private void collectWords(TrieNode node, StringBuilder current, List<String> results) {
        if (node.isEnd) results.add(current.toString());
        for (int i = 0; i < 26; i++) {
            if (node.children[i] != null) {
                current.append((char)('a' + i));
                collectWords(node.children[i], current, results);
                current.deleteCharAt(current.length() - 1);
            }
        }
    }
}
```

---

## 🎯 Key Takeaways
- Adobe is **extremely DSA-heavy** — expect 2-3 problems per round across all rounds
- **Median of Two Sorted Arrays** is Adobe's signature hard problem — binary search is key
- **Maximum Product Subarray** — tracking min AND max simultaneously is the critical insight
- **URL Shortener** is Adobe's most common system design question — know Base62 encoding, counter-based ID generation, and analytics pipeline
- **Trie** with wildcard support is a frequent Adobe question — practice DFS on Trie
- **Longest Palindromic Substring** — expand around center is cleaner than DP for interviews

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | String, Matrix, Monotonic Stack |
| Round 2 | Hard | Graph Clone, DP, Binary Search |
| Round 3 | Medium-Hard | System Design, URL Shortener |
| Round 4 | Medium | Trie, Behavioral |
