# 🎯 Data Structures & Algorithms - FAANG Level

> **Target:** Solve Medium in 20-25 min, Hard in 35-40 min  
> **Companies:** Google, Meta, Amazon, Netflix, Apple  
> **Coding Rounds:** 2-3 per interview loop

---

## 📋 Table of Contents

1. [Arrays & Strings](#arrays-strings)
2. [Two Pointers Pattern](#two-pointers)
3. [Sliding Window](#sliding-window)
4. [Linked Lists](#linked-lists)
5. [Stacks & Queues](#stacks-queues)
6. [Trees & Binary Search Trees](#trees-bst)
7. [Graphs](#graphs)
8. [Dynamic Programming](#dynamic-programming)
9. [Backtracking](#backtracking)
10. [Heaps & Priority Queues](#heaps)
11. [Tries](#tries)
12. [Bit Manipulation](#bit-manipulation)
13. [Problem-Solving Framework](#framework)

---

## 📊 Arrays & Strings

### Pattern Recognition

**Common patterns:**
1. Two pointers (sorted array)
2. Sliding window (contiguous subarray)
3. Hash map (frequency counting)
4. Prefix sum (range queries)
5. Sorting + binary search

### FAANG Problem 1: Two Sum

**Problem:** Given array and target, return indices of two numbers that sum to target.

**Approaches:**

```java
// ❌ Brute Force - O(n²) time, O(1) space
public int[] twoSum(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) {
                return new int[] {i, j};
            }
        }
    }
    throw new IllegalArgumentException("No solution");
}

// ✅ Optimal - O(n) time, O(n) space
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        
        if (map.containsKey(complement)) {
            return new int[] {map.get(complement), i};
        }
        
        map.put(nums[i], i);
    }
    
    throw new IllegalArgumentException("No solution");
}

// Edge cases to discuss:
// 1. Array has < 2 elements → impossible
// 2. Multiple solutions → return any one
// 3. Same element used twice → not allowed (i != j)
// 4. Duplicate values → HashMap handles it
// 5. Negative numbers → works fine
```

**Follow-up variations:**

```java
// Follow-up 1: Return all pairs (not just indices)
public List<List<Integer>> twoSumAllPairs(int[] nums, int target) {
    Arrays.sort(nums);  // O(n log n)
    List<List<Integer>> result = new ArrayList<>();
    int left = 0, right = nums.length - 1;
    
    while (left < right) {
        int sum = nums[left] + nums[right];
        
        if (sum == target) {
            result.add(Arrays.asList(nums[left], nums[right]));
            
            // Skip duplicates
            while (left < right && nums[left] == nums[left + 1]) left++;
            while (left < right && nums[right] == nums[right - 1]) right--;
            
            left++;
            right--;
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    
    return result;
}

// Follow-up 2: What if array is sorted?
public int[] twoSumSorted(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    
    while (left < right) {
        int sum = nums[left] + nums[right];
        
        if (sum == target) {
            return new int[] {left + 1, right + 1};  // 1-indexed
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    
    return new int[] {-1, -1};
}
// Time: O(n), Space: O(1) - better than HashMap!
```

---

### FAANG Problem 2: Longest Substring Without Repeating Characters

**Problem:** Find length of longest substring without repeating characters.

```java
// Input: "abcabcbb"
// Output: 3 ("abc")

// Input: "bbbbb"
// Output: 1 ("b")

// Input: "pwwkew"
// Output: 3 ("wke")
```

**Solution - Sliding Window:**

```java
public int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> charIndex = new HashMap<>();
    int maxLength = 0;
    int start = 0;
    
    for (int end = 0; end < s.length(); end++) {
        char c = s.charAt(end);
        
        // If character seen before and within current window
        if (charIndex.containsKey(c) && charIndex.get(c) >= start) {
            start = charIndex.get(c) + 1;  // Move start past duplicate
        }
        
        charIndex.put(c, end);
        maxLength = Math.max(maxLength, end - start + 1);
    }
    
    return maxLength;
}

// Time: O(n), Space: O(min(n, charset))
// where charset = 26 for lowercase, 128 for ASCII, 256 for extended ASCII
```

**Step-by-step walkthrough:**
```
Input: "abcabcbb"

end=0, c='a': start=0, window="a", maxLen=1
end=1, c='b': start=0, window="ab", maxLen=2
end=2, c='c': start=0, window="abc", maxLen=3
end=3, c='a': duplicate! start=1, window="bca", maxLen=3
end=4, c='b': duplicate! start=2, window="cab", maxLen=3
end=5, c='c': duplicate! start=3, window="abc", maxLen=3
end=6, c='b': duplicate! start=5, window="cb", maxLen=3
end=7, c='b': duplicate! start=7, window="b", maxLen=3

Result: 3
```

**Optimization using array instead of HashMap:**

```java
public int lengthOfLongestSubstring(String s) {
    int[] charIndex = new int[128];  // ASCII
    Arrays.fill(charIndex, -1);
    
    int maxLength = 0;
    int start = 0;
    
    for (int end = 0; end < s.length(); end++) {
        char c = s.charAt(end);
        
        if (charIndex[c] >= start) {
            start = charIndex[c] + 1;
        }
        
        charIndex[c] = end;
        maxLength = Math.max(maxLength, end - start + 1);
    }
    
    return maxLength;
}

// Slightly faster (array access vs HashMap lookup)
```

---

### FAANG Problem 3: Trapping Rain Water

**Problem:** Calculate how much water can be trapped between bars.

```
Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6

Visualization:
   █
   █     █
 █ █ █   █ █ █
 █ █ █ █ █ █ █
[0,1,0,2,1,0,1,3,2,1,2,1]

Water trapped: 1+0+1+0+1+2+1 = 6
```

**Key insight:** Water level at index i = min(max_left, max_right) - height[i]

**Solution 1: Brute Force - O(n²)**

```java
public int trap(int[] height) {
    int n = height.length;
    int totalWater = 0;
    
    for (int i = 0; i < n; i++) {
        // Find max height on left
        int maxLeft = 0;
        for (int j = 0; j <= i; j++) {
            maxLeft = Math.max(maxLeft, height[j]);
        }
        
        // Find max height on right
        int maxRight = 0;
        for (int j = i; j < n; j++) {
            maxRight = Math.max(maxRight, height[j]);
        }
        
        // Water at position i
        totalWater += Math.min(maxLeft, maxRight) - height[i];
    }
    
    return totalWater;
}
```

**Solution 2: Dynamic Programming - O(n) time, O(n) space**

```java
public int trap(int[] height) {
    int n = height.length;
    if (n == 0) return 0;
    
    int[] maxLeft = new int[n];
    int[] maxRight = new int[n];
    
    // Pre-compute max height on left for each position
    maxLeft[0] = height[0];
    for (int i = 1; i < n; i++) {
        maxLeft[i] = Math.max(maxLeft[i - 1], height[i]);
    }
    
    // Pre-compute max height on right for each position
    maxRight[n - 1] = height[n - 1];
    for (int i = n - 2; i >= 0; i--) {
        maxRight[i] = Math.max(maxRight[i + 1], height[i]);
    }
    
    // Calculate water
    int totalWater = 0;
    for (int i = 0; i < n; i++) {
        totalWater += Math.min(maxLeft[i], maxRight[i]) - height[i];
    }
    
    return totalWater;
}
```

**Solution 3: Two Pointers - O(n) time, O(1) space ✅**

```java
public int trap(int[] height) {
    int left = 0, right = height.length - 1;
    int maxLeft = 0, maxRight = 0;
    int totalWater = 0;
    
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= maxLeft) {
                maxLeft = height[left];
            } else {
                totalWater += maxLeft - height[left];
            }
            left++;
        } else {
            if (height[right] >= maxRight) {
                maxRight = height[right];
            } else {
                totalWater += maxRight - height[right];
            }
            right--;
        }
    }
    
    return totalWater;
}
```

**Why two pointers work:**
- We process from both ends
- Always process the side with smaller height
- If left < right, we know max on right is at least height[right]
- So water at left = maxLeft - height[left]

---

### FAANG Problem 4: Product of Array Except Self

**Problem:** Return array where output[i] = product of all elements except nums[i].  
**Constraint:** Don't use division, O(n) time.

```java
Input: nums = [1,2,3,4]
Output: [24,12,8,6]

Explanation:
output[0] = 2*3*4 = 24
output[1] = 1*3*4 = 12
output[2] = 1*2*4 = 8
output[3] = 1*2*3 = 6
```

**Key insight:** 
```
output[i] = (product of all elements to left) × (product of all elements to right)
```

**Solution:**

```java
public int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    
    // Step 1: Fill result with left products
    result[0] = 1;
    for (int i = 1; i < n; i++) {
        result[i] = result[i - 1] * nums[i - 1];
    }
    // After step 1: result = [1, 1, 2, 6]
    
    // Step 2: Multiply by right products
    int rightProduct = 1;
    for (int i = n - 1; i >= 0; i--) {
        result[i] *= rightProduct;
        rightProduct *= nums[i];
    }
    // After step 2: result = [24, 12, 8, 6]
    
    return result;
}

// Time: O(n), Space: O(1) (output array doesn't count)
```

**Walkthrough:**
```
nums = [1, 2, 3, 4]

Step 1 - Left products:
i=0: result[0] = 1
i=1: result[1] = 1 * 1 = 1
i=2: result[2] = 1 * 2 = 2
i=3: result[3] = 2 * 3 = 6
result = [1, 1, 2, 6]

Step 2 - Right products:
i=3: result[3] = 6 * 1 = 6,  rightProduct = 1 * 4 = 4
i=2: result[2] = 2 * 4 = 8,  rightProduct = 4 * 3 = 12
i=1: result[1] = 1 * 12 = 12, rightProduct = 12 * 2 = 24
i=0: result[0] = 1 * 24 = 24, rightProduct = 24 * 1 = 24
result = [24, 12, 8, 6]
```

---

## 🎯 Two Pointers Pattern

**When to use:**
- Sorted array
- Finding pairs/triplets
- Palindrome checking
- Partitioning

### FAANG Problem 5: 3Sum

**Problem:** Find all unique triplets that sum to zero.

```java
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]
```

**Solution:**

```java
public List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);  // O(n log n)
    List<List<Integer>> result = new ArrayList<>();
    
    for (int i = 0; i < nums.length - 2; i++) {
        // Skip duplicates for first number
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        
        // Two sum problem for remaining array
        int target = -nums[i];
        int left = i + 1;
        int right = nums.length - 1;
        
        while (left < right) {
            int sum = nums[left] + nums[right];
            
            if (sum == target) {
                result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                
                // Skip duplicates
                while (left < right && nums[left] == nums[left + 1]) left++;
                while (left < right && nums[right] == nums[right - 1]) right--;
                
                left++;
                right--;
            } else if (sum < target) {
                left++;
            } else {
                right--;
            }
        }
    }
    
    return result;
}

// Time: O(n²), Space: O(1) excluding output
```

**Walkthrough:**
```
nums = [-4, -1, -1, 0, 1, 2] (sorted)

i=0, nums[i]=-4, target=4:
  left=1(-1), right=5(2): sum=-1+2=1 < 4 → left++
  left=2(-1), right=5(2): sum=-1+2=1 < 4 → left++
  left=3(0), right=5(2): sum=0+2=2 < 4 → left++
  left=4(1), right=5(2): sum=1+2=3 < 4 → left++
  left=5, right=5 → stop

i=1, nums[i]=-1, target=1:
  left=2(-1), right=5(2): sum=-1+2=1 == 1 → found [-1,-1,2]
  Skip duplicates, left=3, right=4
  left=3(0), right=4(1): sum=0+1=1 == 1 → found [-1,0,1]
  left=4, right=4 → stop

i=2, nums[i]=-1 → skip (duplicate)
i=3, nums[i]=0 → no valid triplets

Result: [[-1,-1,2], [-1,0,1]]
```

**Follow-ups:**

```java
// Follow-up 1: 3Sum Closest
public int threeSumClosest(int[] nums, int target) {
    Arrays.sort(nums);
    int closestSum = nums[0] + nums[1] + nums[2];
    
    for (int i = 0; i < nums.length - 2; i++) {
        int left = i + 1;
        int right = nums.length - 1;
        
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            
            if (Math.abs(target - sum) < Math.abs(target - closestSum)) {
                closestSum = sum;
            }
            
            if (sum < target) {
                left++;
            } else if (sum > target) {
                right--;
            } else {
                return sum;  // Exact match
            }
        }
    }
    
    return closestSum;
}

// Follow-up 2: 4Sum
public List<List<Integer>> fourSum(int[] nums, int target) {
    Arrays.sort(nums);
    List<List<Integer>> result = new ArrayList<>();
    
    for (int i = 0; i < nums.length - 3; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        
        for (int j = i + 1; j < nums.length - 2; j++) {
            if (j > i + 1 && nums[j] == nums[j - 1]) continue;
            
            int left = j + 1;
            int right = nums.length - 1;
            
            while (left < right) {
                long sum = (long)nums[i] + nums[j] + nums[left] + nums[right];
                
                if (sum == target) {
                    result.add(Arrays.asList(nums[i], nums[j], nums[left], nums[right]));
                    while (left < right && nums[left] == nums[left + 1]) left++;
                    while (left < right && nums[right] == nums[right - 1]) right--;
                    left++;
                    right--;
                } else if (sum < target) {
                    left++;
                } else {
                    right--;
                }
            }
        }
    }
    
    return result;
}
// Time: O(n³)
```

---

## 🪟 Sliding Window Pattern

**When to use:**
- Contiguous subarray/substring
- Min/max length with constraint
- All subarrays with property

### FAANG Problem 6: Minimum Window Substring

**Problem:** Find minimum window in s that contains all characters of t.

```java
Input: s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"

Explanation: Minimum window containing A, B, C is "BANC"
```

**Solution - Sliding Window:**

```java
public String minWindow(String s, String t) {
    if (s.length() < t.length()) return "";
    
    // Count characters needed
    Map<Character, Integer> need = new HashMap<>();
    for (char c : t.toCharArray()) {
        need.put(c, need.getOrDefault(c, 0) + 1);
    }
    
    Map<Character, Integer> window = new HashMap<>();
    int left = 0, right = 0;
    int valid = 0;  // How many characters satisfied
    int minLen = Integer.MAX_VALUE;
    int start = 0;
    
    while (right < s.length()) {
        // Expand window
        char c = s.charAt(right);
        right++;
        
        if (need.containsKey(c)) {
            window.put(c, window.getOrDefault(c, 0) + 1);
            if (window.get(c).equals(need.get(c))) {
                valid++;
            }
        }
        
        // Shrink window when valid
        while (valid == need.size()) {
            // Update minimum window
            if (right - left < minLen) {
                minLen = right - left;
                start = left;
            }
            
            // Shrink from left
            char d = s.charAt(left);
            left++;
            
            if (need.containsKey(d)) {
                if (window.get(d).equals(need.get(d))) {
                    valid--;
                }
                window.put(d, window.get(d) - 1);
            }
        }
    }
    
    return minLen == Integer.MAX_VALUE ? "" : s.substring(start, start + minLen);
}

// Time: O(m + n) where m = s.length, n = t.length
// Space: O(m + n)
```

**Walkthrough:**
```
s = "ADOBECODEBANC", t = "ABC"
need = {A:1, B:1, C:1}

right=0, c='A': window={A:1}, valid=1
right=1, c='D': window={A:1}
right=2, c='O': window={A:1}
right=3, c='B': window={A:1, B:1}, valid=2
right=4, c='E': window={A:1, B:1}
right=5, c='C': window={A:1, B:1, C:1}, valid=3 ← All satisfied!
  
  Shrink window:
  left=0→1: remove 'A', valid=2
  
right=6, c='O': window={B:1, C:1}
right=7, c='D': window={B:1, C:1}
right=8, c='E': window={B:1, C:1}
right=9, c='B': window={B:2, C:1}
right=10, c='A': window={B:2, C:1, A:1}, valid=3 ← All satisfied!
  
  Shrink window:
  left=1→5: remove 'D','O','B','E' → minWindow = "ODEBANC"
  left=5→6: remove 'C', valid=2
  
right=11, c='N': window={B:2, A:1}
right=12, c='C': window={B:2, A:1, C:1}, valid=3 ← All satisfied!
  
  Shrink window:
  left=6→10: remove 'O','D','E','B' → minWindow = "BANC" ✓
  left=10→11: remove 'A', valid=2

Result: "BANC"
```

---

### FAANG Problem 7: Longest Repeating Character Replacement

**Problem:** Replace at most k characters to get longest substring with same character.

```java
Input: s = "AABABBA", k = 1
Output: 4

Explanation: Replace one 'A' to get "AABBBBA", substring "BBBB" has length 4
```

**Solution:**

```java
public int characterReplacement(String s, int k) {
    int[] count = new int[26];  // Character frequency
    int maxCount = 0;  // Max frequency in current window
    int maxLength = 0;
    int left = 0;
    
    for (int right = 0; right < s.length(); right++) {
        // Expand window
        char c = s.charAt(right);
        count[c - 'A']++;
        maxCount = Math.max(maxCount, count[c - 'A']);
        
        // Window size - max frequency = characters to replace
        // If > k, shrink window
        while (right - left + 1 - maxCount > k) {
            count[s.charAt(left) - 'A']--;
            left++;
            // Note: We don't update maxCount here (optimization)
        }
        
        maxLength = Math.max(maxLength, right - left + 1);
    }
    
    return maxLength;
}

// Time: O(n), Space: O(1) (fixed size array)
```

**Why we don't update maxCount when shrinking:**
- maxCount represents the max frequency we've EVER seen
- We only care about finding a LONGER window
- If current window is smaller, we don't need exact maxCount
- This optimization keeps it O(n) instead of O(26n)

---

## 🔗 Linked Lists

### Common Patterns

1. **Two pointers (fast/slow)** - cycle detection, middle node
2. **Reverse linked list** - reverse in groups, palindrome check
3. **Merge** - merge sorted lists
4. **Dummy head** - simplify edge cases

### FAANG Problem 8: Reverse Linked List

```java
// Iterative - O(n) time, O(1) space
public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    
    while (curr != null) {
        ListNode next = curr.next;  // Save next
        curr.next = prev;           // Reverse pointer
        prev = curr;                // Move prev forward
        curr = next;                // Move curr forward
    }
    
    return prev;
}

// Recursive - O(n) time, O(n) space (call stack)
public ListNode reverseList(ListNode head) {
    if (head == null || head.next == null) {
        return head;
    }
    
    ListNode newHead = reverseList(head.next);
    head.next.next = head;  // Reverse pointer
    head.next = null;
    
    return newHead;
}
```

**Visualization:**
```
Before: 1 → 2 → 3 → 4 → 5 → null
After:  5 → 4 → 3 → 2 → 1 → null

Step-by-step (Iterative):
prev=null, curr=1
  next=2, 1→null, prev=1, curr=2

prev=1, curr=2
  next=3, 2→1, prev=2, curr=3

prev=2, curr=3
  next=4, 3→2, prev=3, curr=4

prev=3, curr=4
  next=5, 4→3, prev=4, curr=5

prev=4, curr=5
  next=null, 5→4, prev=5, curr=null

Return prev=5
```

---

### FAANG Problem 9: Linked List Cycle Detection

```java
// Detect cycle - Floyd's Tortoise and Hare
public boolean hasCycle(ListNode head) {
    if (head == null) return false;
    
    ListNode slow = head;
    ListNode fast = head;
    
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow == fast) {
            return true;  // Cycle detected
        }
    }
    
    return false;
}

// Find cycle start
public ListNode detectCycle(ListNode head) {
    if (head == null) return null;
    
    ListNode slow = head;
    ListNode fast = head;
    boolean hasCycle = false;
    
    // Detect cycle
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow == fast) {
            hasCycle = true;
            break;
        }
    }
    
    if (!hasCycle) return null;
    
    // Find cycle start
    slow = head;
    while (slow != fast) {
        slow = slow.next;
        fast = fast.next;
    }
    
    return slow;  // Cycle start
}
```

**Why this works:**

```
List: 1→2→3→4→5→6
              ↑___↓

When slow and fast meet:
- slow traveled: k steps
- fast traveled: 2k steps
- fast is k steps ahead of slow
- k = cycle length (or multiple)

To find start:
- Distance from head to cycle start: x
- Distance from cycle start to meeting point: y
- Cycle length: c

When they meet:
- slow: x + y
- fast: x + y + nc (n cycles)
- 2(x + y) = x + y + nc
- x + y = nc
- x = nc - y = (n-1)c + (c - y)

(c - y) = distance from meeting point back to cycle start
So starting from head and meeting point, both reach cycle start together!
```

---

### FAANG Problem 10: Merge K Sorted Lists

**Problem:** Merge k sorted linked lists into one sorted list.

```java
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]
```

**Solution 1: Min Heap - O(n log k)**

```java
public ListNode mergeKLists(ListNode[] lists) {
    if (lists == null || lists.length == 0) return null;
    
    // Min heap based on node values
    PriorityQueue<ListNode> pq = new PriorityQueue<>(
        (a, b) -> a.val - b.val
    );
    
    // Add first node of each list
    for (ListNode head : lists) {
        if (head != null) {
            pq.offer(head);
        }
    }
    
    ListNode dummy = new ListNode(0);
    ListNode current = dummy;
    
    while (!pq.isEmpty()) {
        ListNode node = pq.poll();
        current.next = node;
        current = current.next;
        
        if (node.next != null) {
            pq.offer(node.next);
        }
    }
    
    return dummy.next;
}

// Time: O(n log k) where n = total nodes, k = number of lists
// Space: O(k) for heap
```

**Solution 2: Divide and Conquer - O(n log k)**

```java
public ListNode mergeKLists(ListNode[] lists) {
    if (lists == null || lists.length == 0) return null;
    return mergeKListsHelper(lists, 0, lists.length - 1);
}

private ListNode mergeKListsHelper(ListNode[] lists, int start, int end) {
    if (start == end) {
        return lists[start];
    }
    
    if (start + 1 == end) {
        return mergeTwoLists(lists[start], lists[end]);
    }
    
    int mid = start + (end - start) / 2;
    ListNode left = mergeKListsHelper(lists, start, mid);
    ListNode right = mergeKListsHelper(lists, mid + 1, end);
    
    return mergeTwoLists(left, right);
}

private ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0);
    ListNode current = dummy;
    
    while (l1 != null && l2 != null) {
        if (l1.val <= l2.val) {
            current.next = l1;
            l1 = l1.next;
        } else {
            current.next = l2;
            l2 = l2.next;
        }
        current = current.next;
    }
    
    current.next = (l1 != null) ? l1 : l2;
    return dummy.next;
}

// Time: O(n log k)
// Space: O(log k) for recursion stack
```

---

## 📚 Stacks & Queues

### FAANG Problem 11: Valid Parentheses

```java
public boolean isValid(String s) {
    Stack<Character> stack = new Stack<>();
    Map<Character, Character> pairs = Map.of(
        ')', '(',
        '}', '{',
        ']', '['
    );
    
    for (char c : s.toCharArray()) {
        if (pairs.containsValue(c)) {
            // Opening bracket
            stack.push(c);
        } else if (pairs.containsKey(c)) {
            // Closing bracket
            if (stack.isEmpty() || stack.pop() != pairs.get(c)) {
                return false;
            }
        }
    }
    
    return stack.isEmpty();
}

// Time: O(n), Space: O(n)
```

---

### FAANG Problem 12: Largest Rectangle in Histogram

**Problem:** Find largest rectangle area in histogram.

```java
Input: heights = [2,1,5,6,2,3]
Output: 10

Visualization:
    6 ▓
  5 ▓ ▓
  ▓ ▓   3
  ▓ ▓ 2 ▓
2 ▓ ▓ ▓ ▓
▓ 1 ▓ ▓ ▓
▓ ▓ ▓ ▓ ▓
[2,1,5,6,2,3]

Largest: 5×2 = 10
```

**Solution - Monotonic Stack:**

```java
public int largestRectangleArea(int[] heights) {
    Stack<Integer> stack = new Stack<>();  // Store indices
    int maxArea = 0;
    int n = heights.length;
    
    for (int i = 0; i <= n; i++) {
        int h = (i == n) ? 0 : heights[i];
        
        while (!stack.isEmpty() && h < heights[stack.peek()]) {
            int height = heights[stack.pop()];
            int width = stack.isEmpty() ? i : i - stack.peek() - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        
        stack.push(i);
    }
    
    return maxArea;
}

// Time: O(n), Space: O(n)
```

**How it works:**
- Maintain stack of indices in increasing height order
- When we find a smaller height, calculate areas for taller bars
- Width = current index - previous index in stack - 1

---

## 🌳 Trees & Binary Search Trees

### Tree Traversals

```java
// Inorder (Left, Root, Right) - BST gives sorted order
public List<Integer> inorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    inorderHelper(root, result);
    return result;
}

private void inorderHelper(TreeNode node, List<Integer> result) {
    if (node == null) return;
    inorderHelper(node.left, result);
    result.add(node.val);
    inorderHelper(node.right, result);
}

// Iterative
public List<Integer> inorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Stack<TreeNode> stack = new Stack<>();
    TreeNode current = root;
    
    while (current != null || !stack.isEmpty()) {
        while (current != null) {
            stack.push(current);
            current = current.left;
        }
        current = stack.pop();
        result.add(current.val);
        current = current.right;
    }
    
    return result;
}

// Preorder (Root, Left, Right)
public List<Integer> preorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;
    
    Stack<TreeNode> stack = new Stack<>();
    stack.push(root);
    
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        result.add(node.val);
        
        if (node.right != null) stack.push(node.right);  // Right first
        if (node.left != null) stack.push(node.left);    // Then left
    }
    
    return result;
}

// Postorder (Left, Right, Root)
public List<Integer> postorderTraversal(TreeNode root) {
    LinkedList<Integer> result = new LinkedList<>();
    if (root == null) return result;
    
    Stack<TreeNode> stack = new Stack<>();
    stack.push(root);
    
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        result.addFirst(node.val);  // Add to front
        
        if (node.left != null) stack.push(node.left);
        if (node.right != null) stack.push(node.right);
    }
    
    return result;
}

// Level Order (BFS)
public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    
    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        List<Integer> level = new ArrayList<>();
        
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        
        result.add(level);
    }
    
    return result;
}
```

---

### FAANG Problem 13: Binary Tree Maximum Path Sum

**Problem:** Find maximum path sum in binary tree (path can start/end anywhere).

```java
Input: root = [-10,9,20,null,null,15,7]
       -10
       / \
      9  20
         / \
        15  7
Output: 42 (15→20→7)
```

**Solution:**

```java
private int maxSum = Integer.MIN_VALUE;

public int maxPathSum(TreeNode root) {
    maxPathSumHelper(root);
    return maxSum;
}

private int maxPathSumHelper(TreeNode node) {
    if (node == null) return 0;
    
    // Get max sum from left and right (ignore negative paths)
    int leftMax = Math.max(0, maxPathSumHelper(node.left));
    int rightMax = Math.max(0, maxPathSumHelper(node.right));
    
    // Max path through this node (left + node + right)
    int pathThroughNode = leftMax + node.val + rightMax;
    maxSum = Math.max(maxSum, pathThroughNode);
    
    // Return max path ending at this node (for parent)
    return node.val + Math.max(leftMax, rightMax);
}

// Time: O(n), Space: O(h) where h = height
```

---

### FAANG Problem 14: Validate Binary Search Tree

```java
public boolean isValidBST(TreeNode root) {
    return isValidBSTHelper(root, null, null);
}

private boolean isValidBSTHelper(TreeNode node, Integer min, Integer max) {
    if (node == null) return true;
    
    // Check current node value
    if ((min != null && node.val <= min) || 
        (max != null && node.val >= max)) {
        return false;
    }
    
    // Check left subtree (must be < node.val)
    // Check right subtree (must be > node.val)
    return isValidBSTHelper(node.left, min, node.val) &&
           isValidBSTHelper(node.right, node.val, max);
}

// Time: O(n), Space: O(h)
```

**Common mistake:**
```java
// ❌ Wrong: Only checks immediate children
public boolean isValidBST(TreeNode root) {
    if (root == null) return true;
    
    if (root.left != null && root.left.val >= root.val) return false;
    if (root.right != null && root.right.val <= root.val) return false;
    
    return isValidBST(root.left) && isValidBST(root.right);
}

// This fails for:
    10
   /  \
  5   15
     /  \
    6   20
// Left subtree of 15 has 6, which is < 10 (invalid!)
```

---

### FAANG Problem 15: Lowest Common Ancestor

```java
public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) {
        return root;
    }
    
    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);
    
    if (left != null && right != null) {
        return root;  // p and q on different sides
    }
    
    return left != null ? left : right;  // Both on same side
}

// Time: O(n), Space: O(h)
```

---

## 🕸️ Graphs

### Graph Representations

```java
// 1. Adjacency Matrix
int[][] graph = new int[n][n];
graph[u][v] = 1;  // Edge from u to v

// 2. Adjacency List
List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i < n; i++) {
    graph.add(new ArrayList<>());
}
graph.get(u).add(v);  // Edge from u to v

// 3. HashMap (for sparse graphs)
Map<Integer, List<Integer>> graph = new HashMap<>();
graph.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
```

---

### FAANG Problem 16: Number of Islands

**Problem:** Count number of islands in 2D grid ('1' = land, '0' = water).

```java
Input: grid = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1']
]
Output: 3
```

**Solution - DFS:**

```java
public int numIslands(char[][] grid) {
    if (grid == null || grid.length == 0) return 0;
    
    int count = 0;
    int rows = grid.length;
    int cols = grid[0].length;
    
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (grid[i][j] == '1') {
                count++;
                dfs(grid, i, j);  // Mark entire island as visited
            }
        }
    }
    
    return count;
}

private void dfs(char[][] grid, int i, int j) {
    int rows = grid.length;
    int cols = grid[0].length;
    
    // Boundary check and water check
    if (i < 0 || i >= rows || j < 0 || j >= cols || grid[i][j] == '0') {
        return;
    }
    
    grid[i][j] = '0';  // Mark as visited
    
    // Explore 4 directions
    dfs(grid, i - 1, j);  // Up
    dfs(grid, i + 1, j);  // Down
    dfs(grid, i, j - 1);  // Left
    dfs(grid, i, j + 1);  // Right
}

// Time: O(m × n), Space: O(m × n) for recursion stack
```

**Solution - BFS:**

```java
public int numIslands(char[][] grid) {
    if (grid == null || grid.length == 0) return 0;
    
    int count = 0;
    int rows = grid.length;
    int cols = grid[0].length;
    
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (grid[i][j] == '1') {
                count++;
                bfs(grid, i, j);
            }
        }
    }
    
    return count;
}

private void bfs(char[][] grid, int i, int j) {
    int rows = grid.length;
    int cols = grid[0].length;
    Queue<int[]> queue = new LinkedList<>();
    queue.offer(new int[] {i, j});
    grid[i][j] = '0';
    
    int[][] directions = {{-1,0}, {1,0}, {0,-1}, {0,1}};
    
    while (!queue.isEmpty()) {
        int[] cell = queue.poll();
        int row = cell[0];
        int col = cell[1];
        
        for (int[] dir : directions) {
            int newRow = row + dir[0];
            int newCol = col + dir[1];
            
            if (newRow >= 0 && newRow < rows && 
                newCol >= 0 && newCol < cols && 
                grid[newRow][newCol] == '1') {
                queue.offer(new int[] {newRow, newCol});
                grid[newRow][newCol] = '0';
            }
        }
    }
}
```

---

### FAANG Problem 17: Course Schedule (Cycle Detection)

**Problem:** Can you finish all courses given prerequisites?

```java
Input: numCourses = 2, prerequisites = [[1,0]]
Output: true
Explanation: Take course 0, then course 1

Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: false
Explanation: Cycle exists (0→1→0)
```

**Solution - DFS (Cycle Detection):**

```java
public boolean canFinish(int numCourses, int[][] prerequisites) {
    // Build adjacency list
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) {
        graph.add(new ArrayList<>());
    }
    
    for (int[] prereq : prerequisites) {
        graph.get(prereq[0]).add(prereq[1]);
    }
    
    // 0 = unvisited, 1 = visiting, 2 = visited
    int[] state = new int[numCourses];
    
    for (int i = 0; i < numCourses; i++) {
        if (hasCycle(graph, state, i)) {
            return false;
        }
    }
    
    return true;
}

private boolean hasCycle(List<List<Integer>> graph, int[] state, int course) {
    if (state[course] == 1) return true;   // Cycle detected
    if (state[course] == 2) return false;  // Already processed
    
    state[course] = 1;  // Mark as visiting
    
    for (int prereq : graph.get(course)) {
        if (hasCycle(graph, state, prereq)) {
            return true;
        }
    }
    
    state[course] = 2;  // Mark as visited
    return false;
}

// Time: O(V + E), Space: O(V + E)
```

**Solution - BFS (Topological Sort / Kahn's Algorithm):**

```java
public boolean canFinish(int numCourses, int[][] prerequisites) {
    int[] indegree = new int[numCourses];
    List<List<Integer>> graph = new ArrayList<>();
    
    for (int i = 0; i < numCourses; i++) {
        graph.add(new ArrayList<>());
    }
    
    // Build graph and calculate indegrees
    for (int[] prereq : prerequisites) {
        graph.get(prereq[1]).add(prereq[0]);
        indegree[prereq[0]]++;
    }
    
    // Start with courses that have no prerequisites
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (indegree[i] == 0) {
            queue.offer(i);
        }
    }
    
    int count = 0;
    while (!queue.isEmpty()) {
        int course = queue.poll();
        count++;
        
        for (int next : graph.get(course)) {
            indegree[next]--;
            if (indegree[next] == 0) {
                queue.offer(next);
            }
        }
    }
    
    return count == numCourses;  // All courses processed?
}
```

---

## 🎯 Dynamic Programming

### DP Approach

1. **Define state:** What does dp[i] represent?
2. **Find recurrence relation:** How to compute dp[i] from previous states?
3. **Initialize base cases:** dp[0], dp[1], etc.
4. **Determine order:** Bottom-up or top-down?
5. **Optimize space:** Can we use O(1) instead of O(n)?

---

### FAANG Problem 18: Climbing Stairs

**Problem:** How many ways to climb n stairs (1 or 2 steps at a time)?

```java
Input: n = 3
Output: 3
Explanation: 1+1+1, 1+2, 2+1
```

**Solution:**

```java
// Recursion (TLE) - O(2^n)
public int climbStairs(int n) {
    if (n <= 2) return n;
    return climbStairs(n - 1) + climbStairs(n - 2);
}

// Memoization - O(n) time, O(n) space
public int climbStairs(int n) {
    int[] memo = new int[n + 1];
    return climbStairsHelper(n, memo);
}

private int climbStairsHelper(int n, int[] memo) {
    if (n <= 2) return n;
    if (memo[n] > 0) return memo[n];
    
    memo[n] = climbStairsHelper(n - 1, memo) + climbStairsHelper(n - 2, memo);
    return memo[n];
}

// DP - O(n) time, O(n) space
public int climbStairs(int n) {
    if (n <= 2) return n;
    
    int[] dp = new int[n + 1];
    dp[1] = 1;
    dp[2] = 2;
    
    for (int i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    
    return dp[n];
}

// Optimized - O(n) time, O(1) space
public int climbStairs(int n) {
    if (n <= 2) return n;
    
    int prev2 = 1;  // dp[i-2]
    int prev1 = 2;  // dp[i-1]
    
    for (int i = 3; i <= n; i++) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    
    return prev1;
}
```

---

### FAANG Problem 19: Longest Increasing Subsequence

**Problem:** Find length of longest increasing subsequence.

```java
Input: nums = [10,9,2,5,3,7,101,18]
Output: 4
Explanation: [2,3,7,101] or [2,3,7,18]
```

**Solution 1: DP - O(n²)**

```java
public int lengthOfLIS(int[] nums) {
    int n = nums.length;
    int[] dp = new int[n];
    Arrays.fill(dp, 1);  // Each element is a subsequence of length 1
    
    int maxLength = 1;
    
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[i] > nums[j]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
        maxLength = Math.max(maxLength, dp[i]);
    }
    
    return maxLength;
}

// dp[i] = length of LIS ending at index i
```

**Solution 2: Binary Search - O(n log n)**

```java
public int lengthOfLIS(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    
    for (int num : nums) {
        int pos = Collections.binarySearch(tails, num);
        
        if (pos < 0) {
            pos = -(pos + 1);  // Convert to insertion point
        }
        
        if (pos == tails.size()) {
            tails.add(num);  // Extend LIS
        } else {
            tails.set(pos, num);  // Replace with smaller value
        }
    }
    
    return tails.size();
}

// tails[i] = smallest tail of all increasing subsequences of length i+1
```

---

### FAANG Problem 20: Coin Change

**Problem:** Find minimum coins needed to make amount (or -1 if impossible).

```java
Input: coins = [1,2,5], amount = 11
Output: 3
Explanation: 11 = 5 + 5 + 1
```

**Solution:**

```java
public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);  // Initialize with impossible value
    dp[0] = 0;  // 0 coins needed for amount 0
    
    for (int i = 1; i <= amount; i++) {
        for (int coin : coins) {
            if (coin <= i) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    
    return dp[amount] > amount ? -1 : dp[amount];
}

// Time: O(amount × coins.length)
// Space: O(amount)
```

**Walkthrough:**
```
coins = [1,2,5], amount = 11

dp[0] = 0
dp[1] = min(dp[1-1]+1) = 1          [1]
dp[2] = min(dp[2-1]+1, dp[2-2]+1) = 1  [2]
dp[3] = min(dp[3-1]+1, dp[3-2]+1) = 2  [2,1]
dp[4] = min(dp[4-1]+1, dp[4-2]+1) = 2  [2,2]
dp[5] = min(dp[5-1]+1, dp[5-2]+1, dp[5-5]+1) = 1  [5]
dp[6] = min(dp[6-1]+1, dp[6-2]+1, dp[6-5]+1) = 2  [5,1]
dp[7] = min(dp[7-1]+1, dp[7-2]+1, dp[7-5]+1) = 2  [5,2]
...
dp[11] = min(dp[11-1]+1, dp[11-2]+1, dp[11-5]+1) = 3  [5,5,1]
```

---

*This DSA guide continues... I'll create the remaining sections in the next files. Shall I continue with System Design, Spring Boot, Frontend, and other topics?*
