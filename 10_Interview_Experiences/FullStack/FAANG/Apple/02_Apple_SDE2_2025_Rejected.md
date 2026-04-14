# Apple — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Software Engineer (ICT3) |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Apple-Interview-Questions) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 3 On-site + HM)
- **Timeline:** 4 weeks
- **Rejection Reason:** Weak on concurrency follow-up in coding round

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Implement a custom iterator for a Binary Search Tree** (in-order)
2. **Follow-up: Make it support `hasNext()` and `next()` in O(h) space**

### 💡 Interview-Ready Answer

```java
class BSTIterator {
    private Deque<TreeNode> stack;
    
    public BSTIterator(TreeNode root) {
        stack = new ArrayDeque<>();
        pushAllLeft(root);
    }
    
    // O(1) amortized, O(h) worst case
    public int next() {
        TreeNode node = stack.pop();
        pushAllLeft(node.right); // Push left chain of right subtree
        return node.val;
    }
    
    public boolean hasNext() {
        return !stack.isEmpty();
    }
    
    private void pushAllLeft(TreeNode node) {
        while (node != null) {
            stack.push(node);
            node = node.left;
        }
    }
}
// Space: O(h) — only stores nodes on path from root to current
// Next() amortized O(1): each node pushed and popped exactly once across all calls
```

---

## Round 2: On-site — Coding
**Duration:** 60 minutes

### Questions Asked
1. **Find All Anagrams in a String** (LeetCode 438)
2. **Longest Substring with At Most K Distinct Characters** (LeetCode 340)

### 💡 Find All Anagrams — Sliding Window

```java
public List<Integer> findAnagrams(String s, String p) {
    List<Integer> result = new ArrayList<>();
    if (s.length() < p.length()) return result;
    
    int[] pCount = new int[26];
    int[] sCount = new int[26];
    
    for (char c : p.toCharArray()) pCount[c - 'a']++;
    
    int windowSize = p.length();
    
    for (int i = 0; i < s.length(); i++) {
        sCount[s.charAt(i) - 'a']++;
        
        // Remove leftmost element when window exceeds size
        if (i >= windowSize) {
            sCount[s.charAt(i - windowSize) - 'a']--;
        }
        
        // Compare windows
        if (i >= windowSize - 1 && Arrays.equals(sCount, pCount)) {
            result.add(i - windowSize + 1);
        }
    }
    
    return result;
}
// Time: O(n * 26) ≈ O(n), Space: O(1)
```

### 💡 Longest Substring with K Distinct Characters

```java
public int lengthOfLongestSubstringKDistinct(String s, int k) {
    if (k == 0) return 0;
    
    Map<Character, Integer> charCount = new HashMap<>();
    int left = 0, maxLen = 0;
    
    for (int right = 0; right < s.length(); right++) {
        charCount.merge(s.charAt(right), 1, Integer::sum);
        
        // Shrink window until we have at most K distinct
        while (charCount.size() > k) {
            char leftChar = s.charAt(left);
            charCount.merge(leftChar, -1, Integer::sum);
            if (charCount.get(leftChar) == 0) charCount.remove(leftChar);
            left++;
        }
        
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
// Time: O(n), Space: O(k)
```

---

## Round 3: On-site — System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Apple's App Store Backend**
   - App submission, review, distribution, search, ratings, update mechanism

### 💡 Interview-Ready Answer

```
App Store Architecture:
┌──────────────────────────────────────────────────────────────┐
│  App Submission Pipeline:                                     │
│  1. Developer uploads IPA/binary via App Store Connect       │
│  2. Binary validation:                                        │
│     a. Code signing verification (must be signed by Apple    │
│        developer certificate chain)                          │
│     b. Entitlements check (requested capabilities valid?)    │
│     c. Static analysis: API usage (private APIs rejected)    │
│     d. Binary size check (200MB OTA limit for cellular)      │
│  3. Automated review:                                        │
│     a. CSAM scanning (content safety)                        │
│     b. Malware detection                                     │
│     c. Crash testing on simulated devices                    │
│  4. Human review: UI/UX guidelines compliance                │
│  5. Approval → publish to CDN                                │
│                                                                │
│  App Distribution:                                            │
│  - App thinning: server generates device-specific binary     │
│    (only ARM64 slice for iPhone 15, not ARM64e for Watch)   │
│  - On-demand resources: download additional assets later     │
│  - Delta updates: only download changed binary pages         │
│    (saves bandwidth — critical for 2B+ devices)              │
│  - CDN: Apple's own CDN (Akamai partnership) — global PoPs  │
│                                                                │
│  Search & Discovery:                                          │
│  - Search: Elasticsearch with custom ranking                 │
│    Score = text_relevance * popularity * recency * quality   │
│  - popularity = downloads + ratings weighted by recency      │
│  - quality = crash rate, retention, rating trend             │
│  - Personalization: based on user's installed apps, country  │
│  - Auto-complete: prefix trie with frequency weighting       │
│                                                                │
│  Ratings & Reviews:                                           │
│  - Per-version ratings (current version vs all-time)         │
│  - Review text: moderation pipeline (ML + human)             │
│  - Developer response: 1 public response per review          │
│  - Rating prompt: SKStoreReviewController (max 3x/year)      │
│  - Aggregate: pre-computed star distribution histogram        │
│                                                                │
│  Update Mechanism:                                            │
│  - Background app refresh: check for updates periodically    │
│  - Auto-update: download + install overnight while charging  │
│  - Force update: minimum version check on app launch         │
│    API: GET /api/apps/{bundleId}/config → minVersion field   │
│    if currentVersion < minVersion → show update modal        │
└──────────────────────────────────────────────────────────────┘

Database Design:
┌──────────────────────────────────────────────────────────────┐
│  apps                  app_versions           reviews         │
│  ├─ bundle_id (PK)     ├─ version_id (PK)     ├─ review_id   │
│  ├─ developer_id       ├─ bundle_id (FK)      ├─ app_id      │
│  ├─ name               ├─ version             ├─ user_id     │
│  ├─ description         ├─ binary_url          ├─ rating      │
│  ├─ category           ├─ release_notes       ├─ text        │
│  ├─ price              ├─ min_os_version      ├─ version     │
│  ├─ avg_rating         ├─ status              ├─ helpful_count│
│  ├─ rating_count       ├─ submitted_at        └─ created_at  │
│  └─ created_at         └─ published_at                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 4: On-site — Concurrency (where I got tripped up)
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Read-Write Lock from scratch**
2. **Follow-up: Make it fair (prevent writer starvation)**

### 💡 Read-Write Lock

```java
class ReadWriteLock {
    private int readers = 0;
    private boolean writerActive = false;
    private int waitingWriters = 0;
    
    public synchronized void readLock() throws InterruptedException {
        // Fair: if writers are waiting, new readers must also wait
        while (writerActive || waitingWriters > 0) {
            wait();
        }
        readers++;
    }
    
    public synchronized void readUnlock() {
        readers--;
        if (readers == 0) {
            notifyAll(); // Wake up waiting writers
        }
    }
    
    public synchronized void writeLock() throws InterruptedException {
        waitingWriters++;
        try {
            while (readers > 0 || writerActive) {
                wait();
            }
            writerActive = true;
        } finally {
            waitingWriters--;
        }
    }
    
    public synchronized void writeUnlock() {
        writerActive = false;
        notifyAll(); // Wake up all waiters
    }
}

// The fairness condition: `waitingWriters > 0` in readLock()
// Prevents new readers from starving writers
// Without it: continuous stream of readers could block writers forever
```

---

## 🎯 Key Takeaways
- Apple asks **concurrency questions deeply** — Read-Write Lock with fairness is classic
- **BST Iterator** — controlled traversal using stack, O(h) space
- **Sliding Window** (Find Anagrams, K Distinct) — Apple's favorite coding pattern
- **App Store design** = unique to Apple — know app thinning, delta updates, code signing
- **Fair read-write lock** → `waitingWriters > 0` prevents reader starvation of writers
- I got **rejected on the fairness follow-up** — couldn't explain writer starvation scenario clearly
- Apple values **correctness over speed** — take time to think through edge cases

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | BST Iterator, Stack |
| Coding | Medium | Sliding Window, HashMap |
| System Design | Hard | App Store, Binary Distribution |
| Concurrency | Very Hard | Read-Write Lock, Fairness |
| HM | Medium | Behavioral |
