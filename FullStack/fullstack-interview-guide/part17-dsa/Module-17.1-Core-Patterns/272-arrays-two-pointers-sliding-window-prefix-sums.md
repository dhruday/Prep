# Arrays — Two Pointers, Sliding Window, Prefix Sums
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Two pointers**: two index variables (`left`, `right`) that move toward each other (or in the same direction) to avoid an O(n²) nested loop; works on sorted arrays or whenever the "window" relationship between two positions matters; time O(n), space O(1)
- **Sliding window**: fixed or variable-size subarray that slides right; `left` expands by moving `right`, shrinks by moving `left`; for "longest/shortest subarray with condition X"; time O(n), space O(1) or O(k) for frequency maps
- **Prefix sums**: precompute `prefix[i] = arr[0] + arr[1] + ... + arr[i]`; then `sum(i..j) = prefix[j] - prefix[i-1]`; any range sum query becomes O(1); key for "how many subarrays sum to k" — combine with a HashMap
- **When to use each**: two pointers → sorted array, pair sums, palindromes; sliding window → contiguous subarray with constraint; prefix sum → range sums, subarray sum equals k, 2D matrix sums
- **Most common interview bug**: off-by-one in prefix sum indices; `sum(0..j) = prefix[j] - prefix[-1]` — use a sentinel: `prefix[-1] = 0` in a HashMap so you compute `prefix[j] - 0` correctly for subarrays starting at index 0
- **Full stack context**: sliding window on time-series log data; prefix sums on cumulative metrics; these patterns appear in real product code, not just LeetCode

---

## 1. One-Line Definition
Two pointers, sliding window, and prefix sums are array traversal patterns that reduce naive O(n²) or O(n³) solutions to O(n) by maintaining a "running state" as you move through the array instead of recalculating from scratch.

---

## 2. The Problem It Solves

Building a real-time analytics dashboard at SAP: "Find the maximum revenue over any 7-consecutive-day window in the last year." Naive approach: for every day, sum the next 7 — O(n²), 365 × 7 = 2,555 operations. For a year of hourly data: O(8760 × 7) fine, but for millisecond data at scale this becomes expensive.

The sliding window does it in O(n): maintain a running sum of the current 7-day window. Slide right by adding the new day and subtracting the oldest day. One pass, one variable.

The same pattern underlies real product features:
- "Show the longest session without any errors" → longest subarray with zero error count (sliding window)
- "How many API requests in the last 60-second rolling window?" → sliding window over a queue
- "Find all pairs of product IDs whose prices sum to exactly 1000" → two pointers on sorted price array in O(n)

---

## 3. How It Works Internally

### Two Pointers — Opposite Direction (Pair Sum in Sorted Array)

```
arr = [1, 3, 5, 7, 9, 11], target = 14
       L                 R

Step 1: arr[L] + arr[R] = 1 + 11 = 12 < 14 → move L right
Step 2: arr[L] + arr[R] = 3 + 11 = 14 = target → FOUND [3, 11]
```

### Two Pointers — Same Direction (Remove Duplicates)

```
arr = [1, 1, 2, 3, 3, 4]
       W  R
       (W = write pointer, R = read pointer)

R advances. When arr[R] ≠ arr[W], write arr[R] to arr[W+1] and advance W
Result: arr = [1, 2, 3, 4, _, _] — write pointer W = final length - 1
```

### Sliding Window (Variable Size)

```
"Smallest subarray with sum ≥ target=7"
arr = [2, 3, 1, 2, 4, 3]

right=0: window=[2], sum=2 < 7 → expand right
right=1: window=[2,3], sum=5 < 7 → expand right
right=2: window=[2,3,1], sum=6 < 7 → expand right
right=3: window=[2,3,1,2], sum=8 ≥ 7 → record len=4, shrink left
left=1:  window=[3,1,2], sum=6 < 7 → expand right
right=4: window=[3,1,2,4], sum=10 ≥ 7 → record len=4, shrink left
left=2:  window=[1,2,4], sum=7 ≥ 7 → record len=3, shrink left
...
Answer: length 2 ([4,3])
```

### Prefix Sums (Subarray Sum = k)

```
arr = [1, 1, 1, 1, 1], k = 3

prefix[0] = 0
prefix[1] = 1  → need prefix[i] - k = 1 - 3 = -2 → not in map
prefix[2] = 2  → need 2 - 3 = -1 → not in map  
prefix[3] = 3  → need 3 - 3 = 0  → IN MAP (count: 1) → found 1 subarray
prefix[4] = 4  → need 4 - 3 = 1  → IN MAP (count: 1) → found 1 subarray
prefix[5] = 5  → need 5 - 3 = 2  → IN MAP (count: 1) → found 1 subarray

Answer: 3 subarrays
```

---

## 4. The Code

### Wrong Way — Nested Loops

```java
// ❌ WRONG — O(n²) nested loop for sliding window maximum
// Works for small inputs; TLEs on LeetCode large inputs

public int maxSumSubarray(int[] arr, int k) {
    int maxSum = Integer.MIN_VALUE;
    int n = arr.length;
    
    for (int i = 0; i <= n - k; i++) {  // ← O(n) outer loop
        int windowSum = 0;
        for (int j = i; j < i + k; j++) {  // ← O(k) inner loop = O(nk) total
            windowSum += arr[j];
        }
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}
// For n=100,000 and k=50,000 → 5 billion operations → timeout
```

```java
// ❌ WRONG — Off-by-one in prefix sum
public int subarraySum(int[] nums, int k) {
    int count = 0;
    int[] prefix = new int[nums.length + 1];
    for (int i = 0; i < nums.length; i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j <= nums.length; j++) {
            // ❌ Still O(n²) — we built the prefix array but used it wrong
            // The whole point of prefix sums + HashMap is to avoid this inner loop
            if (prefix[j] - prefix[i] == k) count++;
        }
    }
    return count;
}
```

### Right Way — Template Implementations

```java
// ✅ TWO POINTERS — Two Sum in sorted array

public int[] twoSum(int[] numbers, int target) {
    int left = 0, right = numbers.length - 1;
    
    while (left < right) {
        int sum = numbers[left] + numbers[right];
        
        if (sum == target) {
            return new int[]{left + 1, right + 1};  // ← 1-indexed for LeetCode
        } else if (sum < target) {
            left++;     // ← sum too small, move left pointer right (increase value)
        } else {
            right--;    // ← sum too large, move right pointer left (decrease value)
        }
    }
    return new int[]{-1, -1};  // never reached if problem guarantees a solution
}
// Time: O(n), Space: O(1)
```

```java
// ✅ SLIDING WINDOW — Fixed size: max sum of k consecutive elements

public int maxSumKWindow(int[] arr, int k) {
    int n = arr.length;
    if (n < k) return -1;
    
    // ✅ Initialize first window
    int windowSum = 0;
    for (int i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    
    int maxSum = windowSum;
    
    // ✅ Slide: add incoming element, remove outgoing element
    for (int i = k; i < n; i++) {
        windowSum += arr[i];         // ← add new right element
        windowSum -= arr[i - k];     // ← remove old left element
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}
// Time: O(n), Space: O(1)
```

```java
// ✅ SLIDING WINDOW — Variable size: longest substring without repeating characters

public int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastSeen = new HashMap<>();  // char → last seen index
    int maxLen = 0;
    int left = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        
        // ✅ If we've seen this char INSIDE the current window, shrink left
        // Use max() because lastSeen might hold an older index outside current window
        if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {
            left = lastSeen.get(c) + 1;  // ← shrink: move left past the duplicate
        }
        
        lastSeen.put(c, right);  // ← update last seen index
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
// Time: O(n), Space: O(min(n, alphabet_size))
```

```java
// ✅ PREFIX SUMS — Count subarrays with sum = k

public int subarraySum(int[] nums, int k) {
    // ✅ HashMap: prefixSum → count of times we've seen this prefix sum
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1);  // ← sentinel: empty prefix (sum=0) occurs once
    //                                       This handles subarrays starting at index 0
    
    int count = 0;
    int runningSum = 0;
    
    for (int num : nums) {
        runningSum += num;
        
        // ✅ If (runningSum - k) exists in map,
        //    there are that many subarrays ending here with sum = k
        int complement = runningSum - k;
        count += prefixCount.getOrDefault(complement, 0);
        
        // ✅ Record current prefix sum
        prefixCount.merge(runningSum, 1, Integer::sum);
    }
    
    return count;
}
// Time: O(n), Space: O(n)

// Example trace: nums = [1,2,3], k = 3
// prefixCount = {0:1}
// i=0: runningSum=1, complement=1-3=-2, count+=0, map={0:1,1:1}
// i=1: runningSum=3, complement=3-3=0, count+=1 (0 is in map!), map={0:1,1:1,3:1}
// i=2: runningSum=6, complement=6-3=3, count+=1 (3 is in map!), map={0:1,1:1,3:1,6:1}
// Result: 2 (subarrays [1,2,3] starting at 0, and [3] at index 2... wait that's wrong
// Let me retrace: [1,2,3]=3? No, 1+2+3=6. Subarrays summing to 3: [1,2] and [3]
// i=1: runningSum=3=k, complement=0 in map → found [1,2] (subarray 0..1)
// i=2: runningSum=6, complement=3 in map → found [3] (subarray 2..2)
// Total: 2 ✓
```

```typescript
// ✅ REAL USE CASE — Sliding window on frontend time-series data
// "Find the hour with the highest number of errors in any 60-minute window"

function maxErrorsInWindow(
    events: Array<{ timestamp: number; isError: boolean }>,
    windowMs: number = 60 * 60 * 1000   // 1 hour in milliseconds
): number {
    let left = 0;
    let errorCount = 0;
    let maxErrors = 0;
    
    for (let right = 0; right < events.length; right++) {
        if (events[right].isError) errorCount++;
        
        // Shrink window from left when it exceeds windowMs
        while (events[right].timestamp - events[left].timestamp > windowMs) {
            if (events[left].isError) errorCount--;
            left++;
        }
        
        maxErrors = Math.max(maxErrors, errorCount);
    }
    
    return maxErrors;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Given a sorted array, find all pairs that sum to a target value."

**Hruday's answer:**
> This is a classic two pointers problem. Because the array is sorted, I place one pointer at the start and one at the end — `left=0`, `right=n-1`.
>
> At each step, I compute the sum. If the sum equals the target, I found a pair — record it and move both pointers inward. If the sum is less than the target, I need a larger value, so I move `left` right. If the sum is greater, I need a smaller value, so I move `right` left. Since I move at least one pointer on every iteration, and the pointers can only cross once, this is O(n) time and O(1) space.
>
> The key insight: sorted order means I can make definite decisions about which direction to move. Without sorted order, I'd need a HashSet (O(n) space) or nested loops (O(n²) time).

---

### Q2 — Deep Dive
**Interviewer asks:** "How does the prefix sum + HashMap approach find subarrays with sum = k in O(n)?"

**Hruday's answer:**
> The key insight: if the prefix sum at index j is S, and somewhere earlier the prefix sum was S minus k, then the subarray between those two points has sum exactly k.
>
> I maintain a HashMap from prefix sum values to the count of times I've seen them. For each position, I compute the running sum. I then look up (running sum minus k) in the HashMap. If it's there, every occurrence of that prefix sum creates one valid subarray ending at the current position.
>
> The sentinel value — putting 0 into the map with count 1 before starting — handles subarrays that start at index 0. Without it, a prefix sum that exactly equals k wouldn't be counted because there's no earlier prefix sum of zero recorded.
>
> This gives O(n) time because each element is processed once, and O(n) space for the HashMap storing prefix sums.

---

### Q3 — Application
**Interviewer asks:** "How would you use these patterns in a real production system?"

**Hruday's answer:**
> At SAP Labs, we had a requirement on a real-time dashboard: show the rolling 15-minute error rate for each API endpoint. Naive implementation: for every second in the last 15 minutes, count errors — O(900) per endpoint on every update.
>
> I used a sliding window over a deque of timestamped error events. As events come in, I add them to the right of the deque. When rendering, I remove events from the left that are older than 15 minutes. The error count is always current, updated in O(1) per event.
>
> Prefix sums appear in analytics features — "how many users had more than 3 failed logins in any 10-request window?" is reducible to a sliding window on a binary array. In Kafka consumer offset tracking, the cumulative offset (prefix sum of message counts per partition) lets you answer "how many messages have been processed in partition 3 through offset X?" in O(1) after a single O(n) preprocessing pass.
>
> These aren't just interview patterns — they're the building blocks of efficient data processing in any system that handles time-series data.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Off-by-one in sliding window bounds | `for (int i = 0; i < n - k; i++)` | The correct bound for a fixed window of size k starting at i is `i + k - 1 < n`, which means `i <= n - k`; using `i < n - k` misses the last valid window starting at `n - k`; always verify with a small example: n=5, k=3 → last window starts at index 2 (0,1,2 → 3 elements ending at 4); since `n-k = 2`, the condition must include `i = 2`, so `i <= n - k` |
| Using sorted array two pointers on unsorted input | "I'll use two pointers since we want pairs" | Two pointers only work correctly on sorted arrays when searching for pair sums; on an unsorted array, moving left (or right) does NOT guarantee moving to a higher (or lower) value; the correct approach for unsorted arrays is a HashMap (O(n) space) recording complement values as you scan from left to right; sort only if the problem allows it and O(n log n) time is acceptable |
| Forgetting the sentinel in prefix sum | "Start with an empty map, add sums as you go" | Without `prefixCount.put(0, 1)` at the start, subarrays that begin at index 0 and have sum exactly equal to k are never counted; the running sum S equals k, and you look for S - k = 0 in the map — if 0 is not there, you miss these subarrays; the sentinel represents the empty prefix before the array starts, and it is the single most common reason prefix sum solutions produce wrong answers on edge-case inputs |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I was building a real-time SLA dashboard that needed to compute rolling 15-minute error rates for 50+ API endpoints simultaneously, updating every second. My first cut used nested loops — O(900 × 50) per second was visible lag in the UI.
>
> Replacing it with a sliding window deque per endpoint made each update O(1). The dashboard became instant. The pattern I learned in DSA practice had a direct, measurable product impact. Understanding the time complexity meant knowing why it was slow and exactly what to change."

---

## 8. Scale Evolution

**1,000 users →** Brute force nested loops work fine for small datasets. Readable code preferred over optimization. Profile first; optimize when needed.

**100,000 users →** Sliding window for real-time analytics pipelines. Prefix sums for batch analytics queries. O(n) vs O(n²) starts mattering at this scale — milliseconds become seconds.

**10 million users →** These patterns underpin distributed systems: windowed aggregations in Kafka Streams use sliding windows; distributed prefix sums underlie partition offset tracking; the algorithm knowledge translates directly into configuration choices for stream processing frameworks.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Fraud detection: "flag any card that made more than 3 transactions in any 5-minute window" is a sliding window problem; transaction pair analysis for money mule detection uses two-pointer patterns on sorted amounts | Real-time fraud window detection; sorted-data pair analysis |
| Swiggy / Meesho | "The busiest 30-minute delivery window today" is a fixed sliding window on order timestamps; demand forecasting prefix sums on historical order volume | Time-series analytics on operational data |
| Adobe / Microsoft | Senior engineers are expected to solve medium-to-hard LeetCode; two pointers and sliding window are the most common array interview patterns; Google/Amazon system design rounds often include distributed variants of these patterns | Code interview readiness; O(n) thinking; pattern recognition speed |
| SAP Labs | Real-time dashboard rolling aggregations; SLA monitoring with sliding window; direct production application of academic patterns | Practical application of DSA in product code; direct experience to reference |

---

## 10. Related Topics — What to Study Next

- **Topic 273 — HashMaps** — the prefix sum + HashMap combination is one of the most powerful O(n) patterns; topic 273 covers frequency maps and HashMap-based two-sum variants that complement the array patterns here
- **Topic 274 — Stacks and Queues** — the sliding window maximum problem (find max in every window of size k) uses a monotonic deque — a combination of sliding window idea applied to a deque; understanding queues is required for this variant
- **Topic 281 — Implement LRU Cache** — LRU cache uses a combination of HashMap lookups and a doubly-linked list; the O(1) lookup is the HashMap part; the capacity enforcement is a pointer-manipulation pattern related to two-pointer thinking

---

*Part 17 · Arrays — Two Pointers, Sliding Window, Prefix Sums · Full Stack Interview Guide · Hruday D · 2026*
