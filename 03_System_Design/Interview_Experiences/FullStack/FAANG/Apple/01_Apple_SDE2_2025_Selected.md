# Apple — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Software Engineer (ICT3) |
| **Level** | ICT3 (equivalent SDE-2) |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Apple-Software-Engineer-Interview-Questions-EI_IE1138.0,5_KO6,23.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 4 weeks (Apple is notoriously slow)
- **Format:** Phone screen virtual, onsite at Apple Park
- **Note:** Apple interviews are very team-specific. Questions vary widely based on the team.

---

## Round 1: Phone Screen
**Duration:** 45 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Valid Parentheses** (LeetCode 20) + Follow-up with custom bracket types
2. **Find Duplicate in Array** (Floyd's Cycle Detection)

### 💡 Interview-Ready Answer — Valid Parentheses (Extended)

```java
public boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    Map<Character, Character> pairs = Map.of(')', '(', '}', '{', ']', '[');
    
    for (char c : s.toCharArray()) {
        if (pairs.containsValue(c)) {
            stack.push(c);
        } else if (pairs.containsKey(c)) {
            if (stack.isEmpty() || stack.pop() != pairs.get(c)) return false;
        }
    }
    return stack.isEmpty();
}
```

**Follow-up: Custom bracket types (e.g., `<>`, `«»`, `⟨⟩`)**
```java
public boolean isValidCustom(String s, Map<Character, Character> customPairs) {
    Deque<Character> stack = new ArrayDeque<>();
    Set<Character> openers = new HashSet<>(customPairs.values());
    
    for (char c : s.toCharArray()) {
        if (openers.contains(c)) {
            stack.push(c);
        } else if (customPairs.containsKey(c)) {
            if (stack.isEmpty() || stack.pop() != customPairs.get(c)) return false;
        }
        // Ignore non-bracket characters
    }
    return stack.isEmpty();
}
```

### 💡 Interview-Ready Answer — Find Duplicate (Floyd's)

```java
// Array of n+1 integers where each integer is in [1, n]
// O(1) space, don't modify array
public int findDuplicate(int[] nums) {
    // Phase 1: Detect cycle (treat as linked list: index → value)
    int slow = nums[0];
    int fast = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);
    
    // Phase 2: Find entrance to cycle (= duplicate value)
    slow = nums[0];
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
```
**Why it works:** Treating array as implicit linked list where nums[i] points to next. Duplicate value means two nodes point to same node → cycle.

---

## Round 2: Onsite — Algorithms
**Duration:** 60 minutes | **Interviewer:** ICT4 SDE

### Questions Asked
1. **Design a data structure that supports insert, delete, getRandom in O(1)**
2. **Trapping Rain Water** (LeetCode 42)

### 💡 Interview-Ready Answer — O(1) Insert/Delete/GetRandom

```java
class RandomizedSet {
    List<Integer> list;               // values stored contiguously
    Map<Integer, Integer> valToIndex; // value → index in list
    Random random;
    
    public RandomizedSet() {
        list = new ArrayList<>();
        valToIndex = new HashMap<>();
        random = new Random();
    }
    
    public boolean insert(int val) {
        if (valToIndex.containsKey(val)) return false;
        valToIndex.put(val, list.size());
        list.add(val);
        return true;
    }
    
    public boolean remove(int val) {
        if (!valToIndex.containsKey(val)) return false;
        
        int index = valToIndex.get(val);
        int lastVal = list.get(list.size() - 1);
        
        // Swap with last element
        list.set(index, lastVal);
        valToIndex.put(lastVal, index);
        
        // Remove last
        list.remove(list.size() - 1);
        valToIndex.remove(val);
        
        return true;
    }
    
    public int getRandom() {
        return list.get(random.nextInt(list.size()));
    }
}
```

**Key insight:** ArrayList gives O(1) random access + O(1) remove from end. Swap-with-last trick makes any remove O(1).

### 💡 Interview-Ready Answer — Trapping Rain Water

**Approach 1: Two Pointer (Optimal)**
```java
public int trap(int[] height) {
    int left = 0, right = height.length - 1;
    int leftMax = 0, rightMax = 0;
    int water = 0;
    
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                water += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                water += rightMax - height[right];
            }
            right--;
        }
    }
    return water;
}
```
**Time:** O(n), **Space:** O(1)

**Approach 2: Stack-based (also O(n))**
```java
public int trapStack(int[] height) {
    Deque<Integer> stack = new ArrayDeque<>();
    int water = 0;
    
    for (int i = 0; i < height.length; i++) {
        while (!stack.isEmpty() && height[i] > height[stack.peek()]) {
            int bottom = stack.pop();
            if (stack.isEmpty()) break;
            int width = i - stack.peek() - 1;
            int h = Math.min(height[i], height[stack.peek()]) - height[bottom];
            water += width * h;
        }
        stack.push(i);
    }
    return water;
}
```

---

## Round 3: Onsite — System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design iCloud Photo Sync**
   - Multi-device sync, conflict resolution, offline edit/upload, dedup, privacy

### 💡 Interview-Ready Answer

#### Requirements
- Sync photos across iPhone, iPad, Mac, iCloud.com
- Handle offline edits — sync when reconnected
- Deduplicate photos (same photo from different devices)
- End-to-end encryption (Apple's privacy commitment)
- Support 100M+ users, billions of photos, petabytes of storage

#### Architecture
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  iPhone      │  │  iPad        │  │  Mac          │
│  Photos App  │  │  Photos App  │  │  Photos App   │
│              │  │              │  │               │
│  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐   │
│  │Local DB│  │  │  │Local DB│  │  │  │Local DB│   │
│  │(SQLite)│  │  │  │(SQLite)│  │  │  │(SQLite)│   │
│  └────────┘  │  │  └────────┘  │  │  └────────┘   │
└──────┬───────┘  └──────┬───────┘  └──────┬────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌────────────────────────────────────────────────────┐
│              iCloud Sync Service                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  CloudKit (Apple's backend framework)         │  │
│  │  - Change tokens per device                   │  │
│  │  - Incremental sync (delta changes)           │  │
│  │  - Push notifications for new changes         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  Metadata DB  │  │  Object Store│  │  CDN     │ │
│  │  (CockroachDB │  │  (S3-like)   │  │  (Edge   │ │
│  │   / Cassandra)│  │  Encrypted   │  │   Cache) │ │
│  │               │  │  Blobs       │  │          │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
└────────────────────────────────────────────────────┘
```

#### Sync Protocol
```
1. Each device maintains a "change token" (like a cursor)
2. When photo changes on Device A:
   a. Record change locally (add/edit/delete)
   b. When online: push changes to CloudKit
   c. CloudKit assigns server timestamp + version
   
3. Other devices periodically fetch changes:
   a. GET /changes?since=<change_token>&limit=500
   b. Server returns all changes after that token
   c. Device applies changes to local DB
   d. Device updates its change token

4. Push notification: server sends silent push when new changes available
   → device wakes up and fetches incrementally
```

#### Conflict Resolution
```
Scenario: User edits same photo on iPhone (offline) and Mac (offline)
Both come online → server has two different edits for same photo

Strategy: Last-Writer-Wins with Conflict Copy
1. Compare server_timestamp of both edits
2. Latest edit wins (becomes the "current" version)
3. Earlier edit is saved as a "conflict copy" (user can review)
4. For destructive edits (delete), deletion always wins
   OR keep in "Recently Deleted" for 30 days

Per-field conflict resolution (Apple's approach):
- Photo metadata (title, date, location) → LWW per field
- Photo binary (actual image) → keep both versions, user resolves
- Album membership → union (if added to album on both devices, keep in album)
```

#### Photo Deduplication
```java
class PhotoDeduplicator {
    // Perceptual hash — same visual content but different file = same hash
    public String computePerceptualHash(byte[] imageData) {
        // 1. Resize to 8x8 (64 pixels)
        // 2. Convert to grayscale
        // 3. Compute average pixel value
        // 4. Each pixel: 1 if > average, 0 if < average → 64-bit hash
        // Similar images → similar hashes (hamming distance < 5 = duplicate)
        
        BufferedImage resized = resize(imageData, 8, 8);
        int[] grayscale = toGrayscale(resized);
        double average = Arrays.stream(grayscale).average().orElse(0);
        
        StringBuilder hash = new StringBuilder();
        for (int pixel : grayscale) {
            hash.append(pixel > average ? '1' : '0');
        }
        return hash.toString(); // 64-bit hash
    }
    
    // Hamming distance < threshold = duplicate
    public boolean isDuplicate(String hash1, String hash2) {
        int distance = 0;
        for (int i = 0; i < hash1.length(); i++) {
            if (hash1.charAt(i) != hash2.charAt(i)) distance++;
        }
        return distance <= 5; // threshold
    }
}
```

#### Storage Optimization
```
1. Multi-resolution storage:
   - Original (full resolution): stored in S3 with E2E encryption
   - Optimized (device-appropriate): generated on upload
   - Thumbnail (200x200): always cached on device
   
2. Progressive download:
   - Thumbnail → Optimized → Original (on demand)
   - Device shows thumbnail immediately, loads full-res when viewing
   
3. Storage tiering:
   - Hot: frequently accessed photos (last 30 days) → SSD
   - Warm: older photos → HDD
   - Cold: photos > 1 year, rarely accessed → Glacier-like
```

---

## Round 4: Onsite — Behavioral + Culture Fit
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about a time you had to ship something with imperfect information"**
2. **"How do you approach code quality and code reviews?"**
3. **"What motivates you to work at Apple specifically?"**

### 💡 Interview-Ready Answer — Shipping with Imperfect Information

**Situation:** Building a recommendation engine for a content platform. ML team couldn't provide the final model for 3 more weeks, but feature deadline was in 2 weeks.

**Task:** Ship the recommendation feature on time without the ML model.

**Action:**
1. **Designed a pluggable interface** for the recommendation strategy — so we could swap implementations easily
2. **Built a heuristic fallback:** content-based filtering using user's tag preferences + trending items + collaborative filtering based on similar users' activity. This was 80% as good as ML model based on offline evaluation.
3. **Implemented feature flags:** launch with heuristic, seamlessly swap to ML model when ready
4. **Created A/B test infrastructure:** when ML model arrived, we A/B tested heuristic vs ML on 10% traffic before full rollout

**Result:** Feature shipped on time with heuristic. ML model integrated 2 weeks later via feature flag — zero downtime. A/B test showed ML model improved CTR by 12% over heuristic. The pluggable architecture became our standard for all ML-dependent features.

---

## 🎯 Key Takeaways
- Apple interviews are **team-specific** — ask your recruiter about the team's focus areas
- **Privacy and encryption** are core Apple values — always mention E2E encryption in system design
- **Floyd's Cycle Detection** is an Apple favorite — practice the linked list pointer technique
- **iCloud sync** uses change tokens + incremental sync — same pattern as CouchDB/Firebase
- **Conflict resolution** strategies: LWW, conflict copies, per-field merge — know all three
- **Perceptual hashing** for image dedup — great to mention in any media/storage design
- Apple values **attention to detail** and **user experience** — even in backend discussions, frame things from the user's perspective

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Stack, Floyd's Cycle Detection |
| Round 2 | Medium-Hard | Hash + Array Combo, Two Pointer |
| Round 3 | Very Hard | Distributed Sync, E2E Encryption, Dedup |
| Round 4 | Medium | Behavioral, Decision-Making |
