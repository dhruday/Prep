# Meta — E4 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Software Engineer |
| **Level** | E4 |
| **YOE** | 3.5 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Behavioral)
- **Timeline:** 2 weeks
- **Rejection Reason:** Couldn't complete 2nd problem in Coding 2 within 35 minutes

---

## Round 1: Coding 1
**Duration:** 35 minutes

### Questions Asked
1. **Nested List Weight Sum** (LeetCode 339)
2. **Nested List Weight Sum II** (LeetCode 364) — inverse depth weighting

### 💡 Interview-Ready Answer — Nested List Weight Sum (Both Variants)

```java
// Variant 1: Weight = depth (deeper → more weight)
public int depthSum(List<NestedInteger> nestedList) {
    return dfs(nestedList, 1);
}

private int dfs(List<NestedInteger> list, int depth) {
    int sum = 0;
    for (NestedInteger ni : list) {
        if (ni.isInteger()) {
            sum += ni.getInteger() * depth;
        } else {
            sum += dfs(ni.getList(), depth + 1);
        }
    }
    return sum;
}

// Variant 2: Weight = maxDepth - currentDepth + 1 (deeper → less weight)
// BFS approach: accumulate each level, multiply later
public int depthSumInverse(List<NestedInteger> nestedList) {
    int unweighted = 0;  // running sum (added at every level)
    int weighted = 0;
    
    Queue<NestedInteger> queue = new LinkedList<>(nestedList);
    
    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            NestedInteger ni = queue.poll();
            if (ni.isInteger()) {
                unweighted += ni.getInteger();
            } else {
                queue.addAll(ni.getList());
            }
        }
        weighted += unweighted; // Deeper integers get added fewer times
    }
    return weighted;
}
```

---

## Round 2: Coding 2
**Duration:** 35 minutes

### Questions Asked
1. **Interval List Intersections** (LeetCode 986)
2. **Exclusive Time of Functions** (LeetCode 636) — ran out of time on this one

### 💡 Interview-Ready Answer — Interval Intersections

```java
public int[][] intervalIntersection(int[][] firstList, int[][] secondList) {
    List<int[]> result = new ArrayList<>();
    int i = 0, j = 0;
    
    while (i < firstList.length && j < secondList.length) {
        int lo = Math.max(firstList[i][0], secondList[j][0]);
        int hi = Math.min(firstList[i][1], secondList[j][1]);
        
        if (lo <= hi) {
            result.add(new int[]{lo, hi});
        }
        
        // Advance the interval that ends first
        if (firstList[i][1] < secondList[j][1]) i++;
        else j++;
    }
    
    return result.toArray(new int[result.size()][]);
}
```

### 💡 Exclusive Time of Functions

```java
public int[] exclusiveTime(int n, List<String> logs) {
    int[] result = new int[n];
    Deque<int[]> stack = new ArrayDeque<>(); // [funcId, startTime]
    int prevTime = 0;
    
    for (String log : logs) {
        String[] parts = log.split(":");
        int funcId = Integer.parseInt(parts[0]);
        String type = parts[1];
        int timestamp = Integer.parseInt(parts[2]);
        
        if (type.equals("start")) {
            if (!stack.isEmpty()) {
                result[stack.peek()[0]] += timestamp - prevTime;
            }
            stack.push(new int[]{funcId, timestamp});
            prevTime = timestamp;
        } else { // "end"
            result[stack.pop()[0]] += timestamp - prevTime + 1;
            prevTime = timestamp + 1;
        }
    }
    return result;
}
```

---

## Round 3: System Design
**Duration:** 40 minutes

### Questions Asked
1. **Design Facebook's Photo Storage and Sharing System**

### 💡 Interview-Ready Answer

```
Photo Storage Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Upload Pipeline:                                             │
│  1. Client uploads original photo → temp storage              │
│  2. Image Processing Service (async):                        │
│     a. Strip EXIF (privacy — remove GPS, camera model)       │
│     b. Generate multiple sizes:                              │
│        - Thumbnail: 150x150 (for grid view)                  │
│        - Medium: 600x600 (feed)                              │
│        - Large: 2048xAuto (full view)                        │
│     c. Format conversion: JPEG → WebP + AVIF                 │
│     d. Perceptual hash (for dedup + CSAM detection)          │
│  3. Store all variants in Blob Storage (Haystack at Meta)    │
│  4. Store metadata in MySQL/TAO                               │
│                                                                │
│  Haystack (Meta's Photo Storage):                             │
│  - Problem: billions of photos, each needs a file lookup     │
│    = billions of filesystem metadata entries = too much RAM   │
│  - Solution: Pack multiple photos into single large file     │
│    Each "needle" (photo) addressed by: volume_id + offset    │
│    Volume = ~100GB file containing thousands of photos       │
│  - Lookup: Photo ID → (volume_id, offset, size) from index  │
│  - No filesystem metadata overhead → fits in RAM             │
│                                                                │
│  CDN Distribution:                                            │
│  - Photos cached at edge (Facebook has global PoPs)          │
│  - Long cache TTL (photos rarely change)                     │
│  - URL contains content hash → cache-busting on update       │
└──────────────────────────────────────────────────────────────┘

Sharing & Privacy:
- Photo → Album → Privacy setting (Public / Friends / Custom list)
- Photo tag → requires tagged person's approval
- Share → creates a reference (not a copy) + ACL check on view
- Untagging + blocking → remove from person's timeline but not original post

Scale:
- Meta stores ~2 billion photos uploaded per day
- Total: ~400 billion photos
- Read:write ratio → ~100:1 (mostly viewing, less uploading)
- Hot photos (< 24h old): served from cache
- Cold photos (> 30 days): migrated to cheaper storage (f4 at Meta)
```

---

## 🎯 Key Takeaways
- **Nested List Weight Sum** (both variants) is a Meta classic — know DFS and BFS approaches
- **Interval Intersections** → two-pointer pattern, advance the one ending first
- **Exclusive Function Time** → stack simulation, careful with timestamp math
- **Photo Storage (Haystack)** is Meta-specific system design — understand why filesystem metadata doesn't scale
- **Speed is everything** at Meta — I got rejected because I couldn't finish problem 2 in time
- Practice solving LeetCode mediums in **< 15 minutes each**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | DFS, BFS, Nested Structures |
| Coding 2 | Medium-Hard | Two Pointers, Stack |
| System Design | Hard | Photo Storage, CDN, Privacy |
| Behavioral | Medium | Collaboration, Impact |
