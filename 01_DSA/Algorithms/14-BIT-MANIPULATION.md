# Bit Manipulation — Complete Reference for Google Interviews

> Zero DSA knowledge assumed. Every technique explained from scratch. Read fast, understand deeply, go practice on LeetCode immediately.

---

## Table of Contents

1. [Bitwise AND, OR, XOR, NOT, and Shifts — The Basics](#bitwise-and-or-xor-not-and-shifts--the-basics)
2. [XOR Cancellation — Find the Single Number](#xor-cancellation--find-the-single-number)
3. [n & (n-1) — Clear the Lowest Set Bit](#n--n-1--clear-the-lowest-set-bit)
4. [Count Set Bits — Brian Kernighan's Algorithm](#count-set-bits--brian-kernighans-algorithm)
5. [Power of 2 Check](#power-of-2-check)
6. [Missing Number — XOR with Index](#missing-number--xor-with-index)
7. [Bitmask Basics — Represent a Set as an Integer](#bitmask-basics--represent-a-set-as-an-integer)

---

## Bitwise AND, OR, XOR, NOT, and Shifts — The Basics

### What is it?
Every number in a computer is stored as 0s and 1s (bits). Bitwise operations work directly on those individual bits rather than on the whole number. Think of a 4-bit number like `1011` as four switches: ON, OFF, ON, ON, representing 8 + 0 + 2 + 1 = 11.

### Visual

**AND (&) — "Both must be 1"**
```
  1 1 0 0  (12)
& 1 0 1 0  (10)
---------
  1 0 0 0  ( 8)   only bits ON in BOTH survive
```

**OR (|) — "At least one must be 1"**
```
  1 1 0 0  (12)
| 1 0 1 0  (10)
---------
  1 1 1 0  (14)   bits from EITHER input survive
```

**XOR (^) — "Exactly one must be 1, not both"**
```
  1 1 0 0  (12)
^ 1 0 1 0  (10)
---------
  0 1 1 0  ( 6)   only bits where inputs DIFFER
```

**NOT (~) — "Flip every bit"**
```
  0 0 0 0 1 1 0 0  (12)
~
  1 1 1 1 0 0 1 1  (-13)   all bits flipped; ~n = -(n+1) due to two's complement
```

**Left Shift (<<) — "Multiply by 2 per position"**
```
  0 0 0 0 0 0 1 1  ( 3)  << 2
  0 0 0 0 1 1 0 0  (12)   3 × 2² = 12
```

**Right Shift (>>) — "Divide by 2 per position (floor)"**
```
  0 0 0 0 1 1 0 0  (12)  >> 2
  0 0 0 0 0 0 1 1  ( 3)   12 ÷ 2² = 3
```

### How does it work?

1. Every integer is a sequence of bits, each at a "position" numbered 0 (rightmost) upward.
2. **AND**: For each position, output is 1 only if BOTH inputs have 1 there. Useful for masking (keeping only specific bits).
3. **OR**: For each position, output is 1 if EITHER input has 1 there. Useful for setting specific bits.
4. **XOR**: For each position, output is 1 if exactly ONE input has 1 there. Useful for toggling or detecting differences.
5. **NOT**: Flips every bit. In two's complement (how computers store negative numbers), `~n` equals `-(n+1)`.
6. **Left shift by k** (`n << k`): appends k zeros on the right. Equivalent to multiplying by 2^k.
7. **Right shift by k** (`n >> k`): removes k rightmost bits. Equivalent to floor dividing by 2^k.

### Why does it work?
The ONE key idea: **each bit position is independent**. The AND/OR/XOR rule applies to each position separately. That is why you can use a "mask" (a number like `0b00001111`) to zero out the high bits of any number — AND forces every position where the mask is 0 to become 0, while leaving the mask-1 positions unchanged.

### When to use?
- You need to check, set, clear, or toggle a specific bit at position `i`: use `1 << i` as your mask.
- You want to check if a number is odd: `n & 1` (tests the last bit).
- You want to multiply or divide by a power of 2 very cheaply: shifts.
- You want to combine multiple boolean flags into a single integer: OR to set, AND to test.

### When NOT to use?
- When the logic is clearer and equally fast with arithmetic — do not use shifts just to look clever.
- When dealing with negative numbers and right shifts: Java `>>` is arithmetic (preserves sign); `>>>` is logical (fills 0s). JavaScript bitwise ops work on 32-bit signed integers only.

### How to recognize in a new problem?
Ask: "Do I need to inspect or modify individual bits?" Key signals:
- Problem says "without extra space" and involves duplicates, missing numbers, or flags — think XOR or masks.
- Problem involves setting or reading multiple boolean states efficiently — think bitmask.
- Problem asks you to isolate the lowest set bit or check the last bit — use `n & 1` or `n & (n-1)`.

### Simple Example
Is 7 odd? → Expected: yes (1)
```
7 = 0 1 1 1
1 = 0 0 0 1
    -------
    0 0 0 1   → result is 1, so 7 is odd ✓
```

### Code
```java
// Java
int n = 7;
boolean isOdd   = (n & 1) == 1;           // true
int setBit      = n | (1 << 3);           // set bit 3  → 0111 | 1000 = 1111 = 15
int clearBit    = n & ~(1 << 1);          // clear bit 1 → 0111 & 1101 = 0101 = 5
int toggleBit   = n ^ (1 << 2);           // toggle bit 2 → 0111 ^ 0100 = 0011 = 3
boolean checkBit = ((n >> 2) & 1) == 1;   // is bit 2 set? → true (7 = 0111)
int doubled      = n << 1;                // 7 × 2 = 14
int halved       = n >> 1;                // 7 / 2 = 3 (floor)
```
```javascript
// JavaScript
const n = 7;
const isOdd    = (n & 1) === 1;
const setBit   = n | (1 << 3);
const clearBit = n & ~(1 << 1);
const toggle   = n ^ (1 << 2);
const check    = ((n >> 2) & 1) === 1;
const doubled  = n << 1;
const halved   = n >> 1;
```

### Dry Run
```
n = 7 = 0111

Check bit 2:
  n >> 2  =  0111 >> 2  =  0001   (shift right by 2)
  0001 & 0001 = 0001 = 1          (bit 2 IS set) ✓

Set bit 3:
  1 << 3  =  1000
  0111 | 1000 = 1111 = 15 ✓

Clear bit 1:
  1 << 1  =  0010
  ~0010   =  1101
  0111 & 1101 = 0101 = 5 ✓
```

### Complexity
```
Time: O(1) — single CPU instruction per operation
Space: O(1) — no extra memory needed
```

### Common Trap
- **NOT on Java int**: `~0 = -1`, not 31. `~n = -(n+1)`. Always keep this in mind when using NOT as a mask builder.
- **JavaScript 32-bit cap**: All JS bitwise operators coerce to 32-bit signed integer first. Large numbers (> 2^31 - 1) get truncated. Use `>>> 0` to treat the result as unsigned if needed.

### Experience Tip
**Experience Tip:** Learn `(n >> i) & 1` as your "check bit i" idiom — it works in every language without surprise. Avoid `n & (1 << i) != 0` as a check in Java when i could be 31, since `1 << 31` overflows to a negative number; use `(n >>> i) & 1` instead.

### Do Not Confuse With
- `>>` (arithmetic right shift, preserves sign bit) vs `>>>` (logical right shift, fills 0s). Java has both; JavaScript `>>` is arithmetic, `>>>` is logical.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 191 | Number of 1 Bits | Easy | Count positions where bit is 1 | https://leetcode.com/problems/number-of-1-bits/ |
| 338 | Counting Bits | Easy | Build answer for each number using bit ops | https://leetcode.com/problems/counting-bits/ |
| 190 | Reverse Bits | Easy | Shift bits out one by one and rebuild | https://leetcode.com/problems/reverse-bits/ |
| 371 | Sum of Two Integers | Medium | Add without + using AND (carry) and XOR (sum) | https://leetcode.com/problems/sum-of-two-integers/ |
| 389 | Find the Difference | Easy | XOR all chars from both strings | https://leetcode.com/problems/find-the-difference/ |

### One-Minute Revision
```
TECHNIQUE:       AND / OR / XOR / NOT / Shifts
IN SIMPLE WORDS: Work on individual bits of a number directly
USE WHEN:        Checking, setting, clearing, or toggling a specific bit
DON'T USE WHEN:  Logic is clearer with normal arithmetic; negative numbers + shifts need care
CORE TRICK:      AND = filter, OR = set, XOR = toggle/detect diff, << = ×2, >> = ÷2
TIME:            O(1) per operation
SPACE:           O(1)
COMMON TRAP:     ~n = -(n+1) not n flipped to 0s; JS caps at 32-bit signed
EXPERIENCE TIP:  Use (n >> i) & 1 to check bit i — cleaner and avoids sign overflow
```

---

## XOR Cancellation — Find the Single Number

### What is it?
XOR has a magical property: any number XOR'd with itself gives 0, and any number XOR'd with 0 stays itself. If you XOR every element in a list where every number appears twice except one, all the pairs cancel out and the lone number is left.

### Visual
```
Array: [2, 3, 2]   — 2 appears twice, 3 is the lone number

  0 1 0  (start with 0)
^ 0 1 0  (XOR 2)     → 0 0 0
^ 0 1 1  (XOR 3)     → 0 1 1
^ 0 1 0  (XOR 2)     → 0 0 1  ... wait, let's be precise:

0 ^ 2 ^ 3 ^ 2:
  0 0 0
^ 0 1 0  = 0 1 0  (2)
^ 0 1 1  = 0 0 1  ... 

More carefully:
  0 ^ 2  = 010
  010 ^ 3 (011) = 001
  001 ^ 2 (010) = 011  = 3  ✓
```

### How does it work?

1. XOR rule: bit is 1 only when the two bits DIFFER.
2. Key property: `a ^ a = 0`. Any number XOR'd with itself is all-zeros.
3. Key property: `a ^ 0 = a`. XOR with zero does nothing.
4. XOR is commutative: `a ^ b = b ^ a`.
5. XOR is associative: `(a ^ b) ^ c = a ^ (b ^ c)`.
6. Because of commutativity + associativity, you can reorder: `[2, 3, 2]` → `(2 ^ 2) ^ 3 = 0 ^ 3 = 3`.
7. Start with 0 (identity element), XOR every element in any order — pairs cancel, the odd-one-out survives.

### Why does it work?
The ONE key idea: **XOR is its own inverse**. Every number is its own "cancellation partner." When you XOR a value an even number of times, you get 0. When you XOR it an odd number of times, you get the value itself. So all duplicates (even count) vanish, and the single number (odd count = 1) survives.

### When to use?
- "Every element appears exactly twice except one" → XOR all elements.
- "Find a number that appears an odd number of times" → XOR all elements.
- "Detect if two values are equal without subtraction" → `a ^ b == 0` means `a == b`.
- "Swap two variables without a temp variable" → XOR swap trick.

### When NOT to use?
- If the unique element appears alongside elements that appear 3 (or any odd number) times → simple XOR won't work; you need the bit-counting-mod-k approach (LeetCode 137).
- If there are two unique elements — plain XOR gives you `a ^ b`, not `a` or `b` separately. You need the "split by differing bit" extension.

### How to recognize in a new problem?
Reasoning flow: "Are elements paired up in some way? Does cancellation apply?"
- Signal 1: "No extra space" + duplicates → think XOR before HashMap.
- Signal 2: "Every X appears twice/even times except one" → XOR everything.
- Signal 3: "Missing number in array" → XOR the expected full set with the actual array (pairs cancel).

### Simple Example
Input: `[4, 1, 2, 1, 2]` → Expected output: `4`
```
Binary trace:
  0 0 0  (start = 0)
^ 1 0 0  (XOR 4) → 1 0 0
^ 0 0 1  (XOR 1) → 1 0 1
^ 0 1 0  (XOR 2) → 1 1 1
^ 0 0 1  (XOR 1) → 1 1 0
^ 0 1 0  (XOR 2) → 1 0 0  = 4 ✓
```

### Code
```java
// Java
public int singleNumber(int[] nums) {
    int result = 0;
    for (int n : nums) {
        result ^= n;   // pairs cancel, lone number survives
    }
    return result;
}
```
```javascript
// JavaScript
function singleNumber(nums) {
    return nums.reduce((acc, n) => acc ^ n, 0);
}
```

### Dry Run
```
nums = [4, 1, 2, 1, 2]

result starts at 0 = 000

Step 1: result = 000 ^ 100 (4) = 100
Step 2: result = 100 ^ 001 (1) = 101
Step 3: result = 101 ^ 010 (2) = 111
Step 4: result = 111 ^ 001 (1) = 110
Step 5: result = 110 ^ 010 (2) = 100 = 4 ✓
```

### Complexity
```
Time: O(n) — one pass through the array, one XOR per element
Space: O(1) — only a single variable `result`, no extra storage
```

### Common Trap
- **Forgetting that XOR doesn't work when elements appear 3 times** (LeetCode 137). XOR is only correct when all non-unique elements appear an EVEN number of times.
- **Starting result at a non-zero value** — always initialize to 0 (the XOR identity element), not to `nums[0]` (that skips XOR-ing the first element).

### Experience Tip
**Experience Tip:** This is one of the most common Google/Meta easy-medium problems. The moment you see "every element appears twice except one, find it in O(1) space," write `result ^= n` without hesitation. Interviewers want to see you reach for XOR before HashMap.

### Do Not Confuse With
- LeetCode 137 (Single Number II, appears 3 times) — needs bit counting mod 3, not plain XOR.
- LeetCode 260 (Single Number III, two unique numbers) — XOR all to get `a^b`, then split by the lowest set bit of `a^b`.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 136 | Single Number | Easy | XOR all — pairs cancel, lone survives | https://leetcode.com/problems/single-number/ |
| 137 | Single Number II | Medium | Count each bit mod 3 across all numbers | https://leetcode.com/problems/single-number-ii/ |
| 260 | Single Number III | Medium | XOR all → a^b; split array by lowest diff bit | https://leetcode.com/problems/single-number-iii/ |
| 389 | Find the Difference | Easy | One extra char added — XOR both strings together | https://leetcode.com/problems/find-the-difference/ |
| 268 | Missing Number | Easy | XOR [0..n] with array values; pairs cancel | https://leetcode.com/problems/missing-number/ |

### One-Minute Revision
```
TECHNIQUE:       XOR Cancellation
IN SIMPLE WORDS: XOR every number; pairs cancel (a^a=0), lone survivor remains
USE WHEN:        All elements appear even times except one; or missing number
DON'T USE WHEN:  Elements appear odd times > 1 (use bit-count mod k instead)
CORE TRICK:      result = 0; for each n: result ^= n
TIME:            O(n)
SPACE:           O(1)
COMMON TRAP:     Only valid when duplicates appear EVEN number of times
EXPERIENCE TIP:  First approach to try before HashMap whenever duplicates + O(1) space
```

---

## n & (n-1) — Clear the Lowest Set Bit

### What is it?
The expression `n & (n-1)` removes exactly the rightmost 1-bit from `n`, leaving all other bits unchanged. It is the single most useful bit trick in competitive programming. Understanding it unlocks: counting set bits, checking power of 2, and more.

### Visual
```
n     = 1 0 1 1 0 0 0 0   (176)
n - 1 = 1 0 1 0 1 1 1 1   (175)
n&(n-1)= 1 0 1 0 0 0 0 0  (160)   lowest set bit at position 4 is now 0
```

Another example:
```
n     = 0 1 1 0 1 0 0 0   (104)
n - 1 = 0 1 1 0 0 1 1 1   (103)
n&(n-1)= 0 1 1 0 0 0 0 0  ( 96)   lowest set bit at position 3 is gone
```

### How does it work?

1. Find the lowest (rightmost) set bit of `n`. Call its position `k`.
2. When you compute `n - 1`: the bit at position `k` flips from 1 to 0 (borrow propagates), and all bits below `k` (positions 0 to k-1) flip from 0 to 1.
3. All bits above position `k` remain unchanged in `n - 1`.
4. Now AND `n` with `n - 1`:
   - Bits above `k`: both `n` and `n-1` have the same values → AND preserves them.
   - Bit at `k`: `n` has 1, `n-1` has 0 → AND gives 0. The lowest set bit is cleared.
   - Bits below `k`: `n` has 0s, `n-1` has 1s → AND gives 0s. No change (they were already 0).
5. Result: `n` with the lowest set bit removed.

### Why does it work?
The ONE key idea: **subtracting 1 from a number "borrows" from the lowest set bit, which flips that bit to 0 and turns all lower bits to 1.** AND-ing with the original clears that bit and restores the lower bits to 0. Every other bit is the same in both `n` and `n-1`, so AND preserves them exactly.

### When to use?
- Counting how many 1-bits a number has (loop until 0, count iterations).
- Checking if n is a power of 2 (exactly one set bit: n & (n-1) == 0).
- Iterating over only the set bits of a number without scanning all 32 positions.
- Stripping set bits one by one (e.g., enumerating sub-masks).

### When NOT to use?
- When you need to clear a specific bit at a KNOWN position (use `n & ~(1 << i)` instead).
- When `n = 0`: `n & (n-1) = -1` in some contexts — always guard with `n > 0` or check `n != 0` in a loop condition.

### How to recognize in a new problem?
Reasoning flow: "Does the solution need to touch only the set bits, not all 32 positions?"
- Signal 1: "Count the number of 1s" → Brian Kernighan uses this repeatedly.
- Signal 2: "Is n a power of 2?" → if yes, there is exactly 1 set bit, so `n & (n-1) == 0`.
- Signal 3: "Efficiently iterate over all bits that are set in a bitmask" → strip with `n & (n-1)` in a loop.

### Simple Example
Input: `n = 12` → Expected: clear lowest set bit → `8`
```
12 = 1 1 0 0
11 = 1 0 1 1
-----------
     1 0 0 0  = 8 ✓   (bit 2, the lowest set bit of 12, is now 0)
```

### Code
```java
// Java
// Clear the lowest set bit
int clearLowest = n & (n - 1);

// Check if n is a power of 2 (exactly one set bit)
boolean isPowerOf2 = n > 0 && (n & (n - 1)) == 0;

// Count set bits using this trick (Brian Kernighan — see next section)
int count = 0;
while (n != 0) {
    n = n & (n - 1);
    count++;
}
```
```javascript
// JavaScript
const clearLowest = n & (n - 1);
const isPowerOf2 = n > 0 && (n & (n - 1)) === 0;

let count = 0, x = n;
while (x !== 0) {
    x = x & (x - 1);
    count++;
}
```

### Dry Run
```
n = 13 = 1 1 0 1

Iteration 1:
  n     = 1 1 0 1  (13)
  n - 1 = 1 1 0 0  (12)
  n & (n-1) = 1 1 0 0  (12)   cleared bit 0

Iteration 2:
  n     = 1 1 0 0  (12)
  n - 1 = 1 0 1 1  (11)
  n & (n-1) = 1 0 0 0  ( 8)   cleared bit 2

Iteration 3:
  n     = 1 0 0 0  ( 8)
  n - 1 = 0 1 1 1  ( 7)
  n & (n-1) = 0 0 0 0  ( 0)   cleared bit 3

n = 0, loop ends. count = 3 set bits ✓
```

### Complexity
```
Time: O(k) where k = number of set bits — only iterates over set bits, not all 32
Space: O(1) — no extra memory
```

### Common Trap
- **Not guarding against n = 0**: The loop `while (n != 0)` is safe. But `n & (n-1) == 0` alone returns true for `n = 0` too — so always write `n > 0 && (n & (n-1)) == 0` for the power-of-2 check.
- **Using it on a signed negative number**: `n & (n-1)` still "works" mechanically, but the semantics of "lowest set bit" become confusing with two's complement negative numbers. Stick to non-negative integers for this trick.

### Experience Tip
**Experience Tip:** Interviewers love asking "can you do it faster than O(32)?" for counting set bits. The answer is Brian Kernighan — exactly because `n & (n-1)` skips all the 0-bits and only iterates over the set bits.

### Do Not Confuse With
- `n & (-n)` (or equivalently `n & (~n + 1)`): this **isolates** (keeps only) the lowest set bit, rather than clearing it. Used in Fenwick trees and in Single Number III to find a differing bit.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 191 | Number of 1 Bits | Easy | Count iterations of n = n & (n-1) until 0 | https://leetcode.com/problems/number-of-1-bits/ |
| 231 | Power of Two | Easy | n > 0 && n & (n-1) == 0 is the one-liner | https://leetcode.com/problems/power-of-two/ |
| 338 | Counting Bits | Easy | dp[i] = dp[i & (i-1)] + 1 (one fewer set bit) | https://leetcode.com/problems/counting-bits/ |
| 201 | Bitwise AND of Numbers Range | Medium | AND shrinks to common prefix; strip low bits | https://leetcode.com/problems/bitwise-and-of-numbers-range/ |
| 260 | Single Number III | Medium | n & (-n) isolates lowest set bit to split groups | https://leetcode.com/problems/single-number-iii/ |

### One-Minute Revision
```
TECHNIQUE:       n & (n-1) — Clear Lowest Set Bit
IN SIMPLE WORDS: n-1 flips the lowest 1-bit and all bits below it; AND clears that bit
USE WHEN:        Counting set bits, power-of-2 check, iterating only set bits
DON'T USE WHEN:  Need to clear a specific known bit position (use n & ~(1<<i) instead)
CORE TRICK:      n & (n-1) removes exactly the rightmost 1 from n
TIME:            O(k) for a loop — k = number of set bits
SPACE:           O(1)
COMMON TRAP:     n=0 gives n&(n-1)=0 which looks like "power of 2" — add n>0 guard
EXPERIENCE TIP:  Answer to "can you beat O(32)?" is always Brian Kernighan via this trick
```

---

## Count Set Bits — Brian Kernighan's Algorithm

### What is it?
Given a number, count how many bits are 1. The naive approach checks all 32 bit positions. Brian Kernighan's algorithm only iterates as many times as there are 1-bits, using `n = n & (n-1)` to strip one set bit per step. For sparse numbers this is much faster.

### Visual
```
n = 0 0 0 0 1 1 0 1  (13 — has 3 set bits)

Step 1: n = 1101 & 1100 = 1100  (12)   cleared bit 0, count = 1
Step 2: n = 1100 & 1011 = 1000  ( 8)   cleared bit 2, count = 2
Step 3: n = 1000 & 0111 = 0000  ( 0)   cleared bit 3, count = 3
n = 0, stop. Answer: 3 ✓
```

### How does it work?

1. Initialize `count = 0`.
2. While `n != 0`:
3. Apply `n = n & (n - 1)`. This removes exactly the lowest set bit from `n`.
4. Increment `count`.
5. Repeat. Each iteration removes one set bit.
6. When `n` reaches 0, all set bits have been removed.
7. `count` equals the number of set bits (the Hamming weight / popcount).

### Why does it work?
The ONE key idea: **each application of `n & (n-1)` removes exactly one 1-bit, no more, no less.** So if you start with k set bits, exactly k iterations bring n to 0. The algorithm never touches the 0-bits at all — that is why it beats the naive "check each of 32 positions" approach for numbers with few set bits.

### When to use?
- "Count the number of 1s in a binary number" (Hamming weight).
- Whenever you need popcount and your language/environment does not provide a built-in.
- When combined with DP for counting bits in a range (LeetCode 338).
- When you want to verify your understanding of `n & (n-1)` in an interview.

### When NOT to use?
- When the language provides a built-in (`Integer.bitCount(n)` in Java, `bin(n).count('1')` in Python, `Math.clz32` tricks in JS) and performance matters — prefer built-ins.
- When you need to count bits for ALL numbers 0..n — use the DP recurrence `dp[i] = dp[i >> 1] + (i & 1)` instead (O(n) total vs O(n log n) with repeated Brian Kernighan).

### How to recognize in a new problem?
Reasoning flow: "Does the answer depend on how many 1-bits a number has?"
- Signal 1: "Hamming weight", "popcount", "number of 1 bits" → direct application.
- Signal 2: Problem involves pairing bits, XOR distance, or toggling — the set-bit count often appears as a sub-step.
- Signal 3: "How many steps to reduce n to 0 using this operation?" → if the operation removes one set bit per step, the answer is the bit count.

### Simple Example
Input: `n = 11 (1011)` → Expected output: `3`
```
1 0 1 1  (11)
&
1 0 1 0  (10)
---------
1 0 1 0  (10)   count = 1

1 0 1 0  (10)
&
1 0 0 1  ( 9)
---------
1 0 0 0  ( 8)   count = 2

1 0 0 0  ( 8)
&
0 1 1 1  ( 7)
---------
0 0 0 0  ( 0)   count = 3

n = 0, done. Answer: 3 ✓
```

### Code
```java
// Java — Brian Kernighan
public int hammingWeight(int n) {
    int count = 0;
    while (n != 0) {
        n = n & (n - 1);   // strip lowest set bit
        count++;
    }
    return count;
}

// Java built-in (prefer in production)
int count = Integer.bitCount(n);
```
```javascript
// JavaScript — Brian Kernighan
function hammingWeight(n) {
    let count = 0;
    while (n !== 0) {
        n = n & (n - 1);
        count++;
    }
    return count;
}
// Note: JS uses 32-bit signed ints for bitwise ops.
// For unsigned 32-bit: treat n as >>> 0 if needed.
```

### Dry Run
```
n = 7 = 0 1 1 1   (3 set bits expected)

Iteration 1:
  n     = 0 1 1 1  (7)
  n - 1 = 0 1 1 0  (6)
  n & (n-1) = 0 1 1 0  (6)   count = 1

Iteration 2:
  n     = 0 1 1 0  (6)
  n - 1 = 0 1 0 1  (5)
  n & (n-1) = 0 1 0 0  (4)   count = 2

Iteration 3:
  n     = 0 1 0 0  (4)
  n - 1 = 0 0 1 1  (3)
  n & (n-1) = 0 0 0 0  (0)   count = 3

n = 0, done. Answer = 3 ✓
```

### Complexity
```
Time: O(k) — k = number of set bits in n; at most O(32) for a 32-bit integer
Space: O(1) — only the count variable
```

### Common Trap
- **Using `n & (n-1)` but forgetting the `!= 0` loop condition**: if you accidentally loop `> 0`, you will miss the last iteration when `n` becomes negative mid-loop (signed integers in Java). Always use `n != 0`.
- **Java's `int` is signed**: `n = -1` has all 32 bits set. `while (n != 0)` handles this correctly; `while (n > 0)` does NOT — it would exit immediately for negative inputs.

### Experience Tip
**Experience Tip:** LeetCode 191 is a warm-up. The real interview payoff is when you explain Brian Kernighan's complexity as O(set bits), not O(32) — that shows you understand the algorithm, not just the code. Always mention this distinction unprompted.

### Do Not Confuse With
- Naive loop: `for (int i = 0; i < 32; i++) count += (n >> i) & 1` — correct but always O(32), even for `n = 1`.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 191 | Number of 1 Bits | Easy | Direct Brian Kernighan application | https://leetcode.com/problems/number-of-1-bits/ |
| 338 | Counting Bits | Easy | dp[i] = dp[i>>1] + (i&1) — use shifts not repeated popcount | https://leetcode.com/problems/counting-bits/ |
| 461 | Hamming Distance | Easy | XOR the two numbers, then count set bits | https://leetcode.com/problems/hamming-distance/ |
| 190 | Reverse Bits | Easy | Process 32 bits one at a time — complement to bit counting | https://leetcode.com/problems/reverse-bits/ |
| 201 | Bitwise AND of Numbers Range | Medium | Keep shifting until left==right; count strips = set bit iterations | https://leetcode.com/problems/bitwise-and-of-numbers-range/ |

### One-Minute Revision
```
TECHNIQUE:       Count Set Bits — Brian Kernighan
IN SIMPLE WORDS: Repeatedly strip the lowest set bit (n = n & (n-1)); count how many times
USE WHEN:        Counting 1-bits (Hamming weight / popcount)
DON'T USE WHEN:  Counting bits for all numbers 0..n (use DP recurrence instead)
CORE TRICK:      while (n != 0) { n = n & (n-1); count++; }
TIME:            O(k) — k = number of set bits, at most O(32)
SPACE:           O(1)
COMMON TRAP:     Use n != 0 not n > 0 — signed ints can go negative mid-loop
EXPERIENCE TIP:  Saying "O(set bits), not O(32)" in interviews shows real understanding
```

---

## Power of 2 Check

### What is it?
A number is a power of 2 if exactly one bit is set in its binary representation (e.g., 1=0001, 2=0010, 4=0100, 8=1000). The trick: if `n` has exactly one set bit, then `n - 1` has that bit cleared and all lower bits set. AND-ing them gives 0.

### Visual
```
n = 8 = 1 0 0 0   (IS a power of 2)
n-1= 7 = 0 1 1 1
n & (n-1) = 0 0 0 0  = 0  → YES, power of 2 ✓

n = 6 = 0 1 1 0   (NOT a power of 2)
n-1= 5 = 0 1 0 1
n & (n-1) = 0 1 0 0  = 4  → NO, not power of 2 ✓

n = 1 = 0 0 0 1   (IS a power of 2, 2^0)
n-1= 0 = 0 0 0 0
n & (n-1) = 0 0 0 0  = 0  → YES ✓
```

### How does it work?

1. Powers of 2 in binary: 1 (0001), 2 (0010), 4 (0100), 8 (1000)... exactly one 1-bit.
2. For a number with exactly one set bit at position k: all bits below k are 0.
3. When you subtract 1 from such a number, the bit at position k flips to 0, and all bits below k flip to 1.
4. AND-ing `n` (bit k = 1, rest 0) with `n-1` (bit k = 0, rest below k = 1): every bit is 0.
5. For any number with MORE than one set bit: `n-1` only affects the lowest set bit. At least one other set bit remains unchanged. AND does not remove it. Result is non-zero.
6. Special case: `n = 0` gives `n & (n-1) = 0 & -1 = 0` — would falsely pass, so guard with `n > 0`.
7. Complete check: `n > 0 && (n & (n - 1)) == 0`.

### Why does it work?
The ONE key idea: **a power of 2 has exactly one 1-bit, and `n & (n-1)` removes exactly one 1-bit — leaving 0.** Any other positive number has at least two 1-bits, so after removing one, the result is still non-zero.

### When to use?
- Direct question: "Is n a power of 2?"
- As a pre-check before bit counting: if exactly one bit, skip Brian Kernighan.
- Power of 4 check builds on this: first verify power of 2, then check the bit is at an even position.
- Verifying bitmask state: if a mask has exactly one bit set, it represents a singleton set.

### When NOT to use?
- When `n` can be negative — the check `n > 0` handles this, but be explicit about the guard.
- When the question asks about power of 3, power of 5, etc. — those are NOT bit manipulation problems; use modular arithmetic or logarithms.

### How to recognize in a new problem?
Reasoning flow: "Is there a constraint about powers of 2 or exactly one active element?"
- Signal 1: Explicit "power of two" question — use the one-liner.
- Signal 2: Problem says "aligned to a power of 2" or "capacity is always a power of 2" — use this check in a guard.
- Signal 3: You want to verify a bitmask is a singleton (exactly one element chosen).

### Simple Example
Input: `n = 16` → Expected: true
```
16 = 1 0 0 0 0
15 = 0 1 1 1 1
16 & 15 = 0 0 0 0 0  = 0,  and n > 0  →  true ✓

Input: n = 18  →  Expected: false
18 = 1 0 0 1 0
17 = 1 0 0 0 1
18 & 17 = 1 0 0 0 0  = 16 ≠ 0  →  false ✓
```

### Code
```java
// Java
public boolean isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}

// Power of 4 extension:
// Must be power of 2 AND the single set bit must be at an even position.
// 0x55555555 in binary = ...0101 0101 (1s only at even bit positions 0,2,4,...)
public boolean isPowerOfFour(int n) {
    return n > 0 && (n & (n - 1)) == 0 && (n & 0x55555555) != 0;
}
```
```javascript
// JavaScript
function isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
}

function isPowerOfFour(n) {
    // 0x55555555 = bits set at positions 0,2,4,6,...
    return n > 0 && (n & (n - 1)) === 0 && (n & 0x55555555) !== 0;
}
```

### Dry Run
```
n = 4

isPowerOfTwo:
  n > 0?         4 > 0  → true
  n & (n-1)?     0100 & 0011 = 0000 = 0  → (n & (n-1)) == 0  → true
  Result: true ✓

isPowerOfFour:
  Power of 2?    true (from above)
  n & 0x55555555?  0100 & ...0101 0101 = 0100 (bit 2 is set, position 2 is even)
  Result: non-zero → true ✓

n = 8:
  isPowerOfFour:
  Power of 2?    true
  n & 0x55555555?  1000 & ...0101 0101 = 0000 (bit 3 is ODD position, not in mask)
  Result: 0 → false ✓  (8 is NOT a power of 4)
```

### Complexity
```
Time: O(1) — fixed number of bitwise operations, no loop
Space: O(1) — no extra memory
```

### Common Trap
- **Missing the `n > 0` guard**: `0 & (0-1) = 0 & -1 = 0`, so `n = 0` would return true without the guard. Always include `n > 0`.
- **Confusing power of 2 with power of 4**: every power of 4 is a power of 2, but not vice versa. 8 is a power of 2 but NOT a power of 4. The mask `0x55555555` distinguishes them.

### Experience Tip
**Experience Tip:** Interviewers sometimes follow up "how would you check power of 4?" immediately after power of 2. Know the `0x55555555` mask and be able to derive it: in binary it's `...01 0101 0101` — ones at positions 0, 2, 4, 6, ... (the even positions where powers of 4 land).

### Do Not Confuse With
- Power of 3 (`n > 0 && 1162261467 % n == 0` for int range) — not a bit trick, uses the largest power of 3 within int range.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 231 | Power of Two | Easy | n > 0 && n & (n-1) == 0 — the classic one-liner | https://leetcode.com/problems/power-of-two/ |
| 342 | Power of Four | Easy | Power of 2 first, then mask 0x55555555 for even bit position | https://leetcode.com/problems/power-of-four/ |
| 191 | Number of 1 Bits | Easy | If result is 1, the number is a power of 2 (bonus insight) | https://leetcode.com/problems/number-of-1-bits/ |
| 338 | Counting Bits | Easy | dp[i] = dp[i & (i-1)] + 1; powers of 2 have dp value = 1 | https://leetcode.com/problems/counting-bits/ |
| 201 | Bitwise AND of Numbers Range | Medium | Range includes a power-of-2 boundary — AND drops to 0 quickly | https://leetcode.com/problems/bitwise-and-of-numbers-range/ |

### One-Minute Revision
```
TECHNIQUE:       Power of 2 Check
IN SIMPLE WORDS: Power of 2 has exactly one set bit; n & (n-1) removes it → 0
USE WHEN:        "Is n a power of 2?"; checking for singleton bitmask
DON'T USE WHEN:  Power of 3/5/etc. — those are arithmetic problems, not bit problems
CORE TRICK:      n > 0 && (n & (n - 1)) == 0
TIME:            O(1)
SPACE:           O(1)
COMMON TRAP:     n=0 passes the bit check — always add n>0 guard
EXPERIENCE TIP:  Power of 4 follow-up: add (n & 0x55555555) != 0 check
```

---

## Missing Number — XOR with Index

### What is it?
Given an array containing n distinct numbers taken from 0, 1, 2, ..., n, find the one number that is missing. Using XOR cancellation, XOR all the indices 0..n together with all the array values — every number that is present cancels with its matching index, and only the missing number is left unpaired.

### Visual
```
nums = [3, 0, 1]  — should contain 0,1,2,3 but is missing 2

XOR all indices:  0 ^ 1 ^ 2 ^ 3
XOR all values:   3 ^ 0 ^ 1

Combined:
  0 ^ 1 ^ 2 ^ 3 ^ 3 ^ 0 ^ 1
= (0^0) ^ (1^1) ^ (3^3) ^ 2
=    0  ^    0  ^    0  ^ 2
= 2   ✓

Only the missing number has no pair to cancel with.
```

### How does it work?

1. The complete set `{0, 1, 2, ..., n}` has n+1 elements; the array has only n.
2. One number is missing. If we could XOR the full expected set with the actual array, every present number would appear exactly twice (once in the expected set, once in the array) and cancel.
3. The missing number appears exactly once (only in the expected set, never in the array).
4. XOR all expected values `0 ^ 1 ^ 2 ^ ... ^ n` with all array values.
5. Pairs cancel; the missing number survives.
6. Implementation: initialize `result = n` (the largest expected value). Then loop with index `i` from 0 to n-1, doing `result ^= i ^ nums[i]`. This XORs both the index and the array value in one pass.
7. After the loop, `result` holds the missing number.

### Why does it work?
The ONE key idea: **XOR is self-cancelling and order-independent.** `result = 0 ^ 1 ^ ... ^ n ^ nums[0] ^ nums[1] ^ ... ^ nums[n-1]`. Every number in `{0..n}` that IS present in `nums` appears exactly twice in this expression and cancels. The missing number appears exactly once and survives.

### When to use?
- "Find the missing number in an array of 0..n" → classic XOR application.
- No extra space allowed and you cannot sort.
- You want O(n) time, O(1) space.
- Conceptually: any problem where you have a "complete expected set" and an "incomplete actual set" with one difference.

### When NOT to use?
- If multiple numbers are missing — XOR can only isolate one survivor cleanly (if two are missing, you get their XOR, not each one individually).
- If numbers are not in a clean sequential range — the "XOR with index" trick relies on having a predictable expected set.

### How to recognize in a new problem?
Reasoning flow: "Is there a complete expected set that I can XOR against the actual data?"
- Signal 1: "Array of length n, values from 0 to n, one missing" — textbook XOR.
- Signal 2: "Without extra space" + "find missing / extra element" — think XOR before sorting or HashSet.
- Signal 3: "No arithmetic overflow concern" but "one number is different" — XOR before subtraction-sum approach.

### Simple Example
Input: `nums = [0, 1, 3]`, n = 3 → Expected: `2`
```
Initialize result = n = 3 = 0 1 1

i=0: result ^= 0 ^ nums[0] = result ^ 0 ^ 0 = 011 ^ 000 ^ 000 = 011
i=1: result ^= 1 ^ nums[1] = 011 ^ 001 ^ 001 = 011 ^ 000 = 011
i=2: result ^= 2 ^ nums[2] = 011 ^ 010 ^ 011 = 011 ^ 001 = 010

result = 010 = 2 ✓
```

### Code
```java
// Java
public int missingNumber(int[] nums) {
    int result = nums.length;   // start with n (the largest expected value)
    for (int i = 0; i < nums.length; i++) {
        result ^= i ^ nums[i]; // XOR with both index and array value
    }
    return result;
}
```
```javascript
// JavaScript
function missingNumber(nums) {
    let result = nums.length;
    for (let i = 0; i < nums.length; i++) {
        result ^= i ^ nums[i];
    }
    return result;
}
```

### Dry Run
```
nums = [9, 6, 4, 2, 3, 5, 7, 0, 1],  n = 9
Missing number is 8.

result starts at 9 = 1001

i=0: result ^= 0 ^ 9   → 1001 ^ 0000 ^ 1001 = 0000
i=1: result ^= 1 ^ 6   → 0000 ^ 0001 ^ 0110 = 0111
i=2: result ^= 2 ^ 4   → 0111 ^ 0010 ^ 0100 = 0001
i=3: result ^= 3 ^ 2   → 0001 ^ 0011 ^ 0010 = 0000
i=4: result ^= 4 ^ 3   → 0000 ^ 0100 ^ 0011 = 0111
i=5: result ^= 5 ^ 5   → 0111 ^ 0101 ^ 0101 = 0111
i=6: result ^= 6 ^ 7   → 0111 ^ 0110 ^ 0111 = 0110
i=7: result ^= 7 ^ 0   → 0110 ^ 0111 ^ 0000 = 0001
i=8: result ^= 8 ^ 1   → 0001 ^ 1000 ^ 0001 = 1000 = 8 ✓
```

### Complexity
```
Time: O(n) — one pass through the array, two XOR ops per iteration
Space: O(1) — only the result variable
```

### Common Trap
- **Initializing result to 0 instead of n**: The expected set is 0..n (n+1 values). You loop only n times (indices 0..n-1). Initializing `result = n` seeds the "missing" n into result before the loop compensates — this is the correct pattern.
- **Using the arithmetic sum approach instead**: `sum = n*(n+1)/2 - sum(nums)` also works but can overflow for large n in some languages. XOR is overflow-safe.

### Experience Tip
**Experience Tip:** There are two valid approaches — XOR and arithmetic sum. Know both. In Java/JavaScript interviews, mention that the XOR approach avoids integer overflow for large n, whereas the sum approach requires checking for overflow or using long/BigInt. Showing you know both and can articulate the trade-off is impressive.

### Do Not Confuse With
- LeetCode 268 (single missing in 0..n) vs LeetCode 136 (single number among duplicates) — both use XOR but for slightly different reasons. In 268 you XOR against known indices; in 136 you just XOR the array.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 268 | Missing Number | Easy | XOR indices 0..n with array values; one number unpaired | https://leetcode.com/problems/missing-number/ |
| 136 | Single Number | Easy | Related: XOR all array values; duplicate pairs cancel | https://leetcode.com/problems/single-number/ |
| 389 | Find the Difference | Easy | XOR chars of both strings; extra char is the survivor | https://leetcode.com/problems/find-the-difference/ |
| 260 | Single Number III | Medium | Two missing numbers: XOR all, split by diff bit | https://leetcode.com/problems/single-number-iii/ |
| 137 | Single Number II | Medium | Appears 3 times except one — XOR insufficient, use bit mod 3 | https://leetcode.com/problems/single-number-ii/ |

### One-Minute Revision
```
TECHNIQUE:       Missing Number — XOR with Index
IN SIMPLE WORDS: XOR expected indices 0..n with actual array values; present numbers cancel
USE WHEN:        One number missing from 0..n range, O(1) space required
DON'T USE WHEN:  Multiple missing numbers, or values not in a clean sequential range
CORE TRICK:      result = n; for i in range: result ^= i ^ nums[i]
TIME:            O(n)
SPACE:           O(1)
COMMON TRAP:     Initialize result = n (not 0) to include the largest expected index
EXPERIENCE TIP:  Mention XOR avoids overflow vs. arithmetic sum approach — shows depth
```

---

## Bitmask Basics — Represent a Set as an Integer

### What is it?
A bitmask is an integer where each bit represents whether an element is "in a set" or not. Bit `i` = 1 means element `i` is included; bit `i` = 0 means it is excluded. A single 32-bit integer can represent any subset of 32 elements. This enables generating all subsets, DP over subsets, and solving assignment/covering problems efficiently for small n.

### Visual
```
Elements: [A, B, C, D]   (indices 0, 1, 2, 3)

Mask = 0 1 1 0  (6)
        D C B A
            ^---  bit 0 (A): 0 → A not in set
          ^-----  bit 1 (B): 1 → B is in set
        ^-------  bit 2 (C): 1 → C is in set
       ^--------  bit 3 (D): 0 → D not in set

Subset represented: {B, C}

All 4-element subsets: masks 0000 (∅) through 1111 ({A,B,C,D}) — 16 total
```

### How does it work?

1. Assign each element an index 0, 1, 2, ..., n-1.
2. Represent any subset as an integer `mask` where bit `i` is 1 iff element `i` is in the subset.
3. To CHECK if element `i` is in `mask`: `(mask >> i) & 1` or `mask & (1 << i)`.
4. To ADD element `i` to `mask`: `mask | (1 << i)`.
5. To REMOVE element `i` from `mask`: `mask & ~(1 << i)`.
6. To TOGGLE element `i` in `mask`: `mask ^ (1 << i)`.
7. To enumerate ALL 2^n subsets: loop `mask` from 0 to `(1 << n) - 1`.
8. For each mask, iterate bit positions 0..n-1 to find which elements are included.

### Why does it work?
The ONE key idea: **each subset of {0,1,...,n-1} corresponds to exactly one n-bit integer.** There are 2^n possible subsets, and 2^n possible values of an n-bit integer, so the mapping is perfect. Iterating `mask` from 0 to 2^n-1 visits every subset exactly once, and individual bit operations let you manipulate subset membership in O(1).

### When to use?
- n is small (n ≤ 20 typically) and you need to enumerate or DP over all subsets.
- Representing "which elements have been used/visited" as a state in DP.
- Checking if a word contains only certain characters (encode character set as a bitmask).
- Generating all subsets for backtracking, traveling salesman, assignment problems.

### When NOT to use?
- n > 25: 2^25 ≈ 33 million states — often too slow and too much memory.
- n > 30 in Java/JS: bitmask integers overflow; need 64-bit long or BigInt.
- When subsets are not the right abstraction — do not force bitmasks on problems where the data is naturally ordered or continuous.

### How to recognize in a new problem?
Reasoning flow: "Is n ≤ 20? Does the problem ask about all subsets, or does state depend on which elements were chosen?"
- Signal 1: Explicit "n ≤ 20" or "n ≤ 15" constraint — almost always a bitmask signal.
- Signal 2: "Generate all subsets", "all possible selections", "every combination" — enumerate masks.
- Signal 3: DP where the state is "which items/nodes/cities have been visited" — bitmask DP.

### Simple Example
Input: `arr = [1, 2, 3]` → Expected: all 8 subsets
```
n = 3; masks 000 to 111

mask = 000: {} (empty)
mask = 001: {arr[0]} = {1}       bit 0 set
mask = 010: {arr[1]} = {2}       bit 1 set
mask = 011: {arr[0], arr[1]} = {1, 2}
mask = 100: {arr[2]} = {3}       bit 2 set
mask = 101: {arr[0], arr[2]} = {1, 3}
mask = 110: {arr[1], arr[2]} = {2, 3}
mask = 111: {arr[0], arr[1], arr[2]} = {1, 2, 3}
```

### Code
```java
// Java — enumerate all subsets
public List<List<Integer>> subsets(int[] nums) {
    int n = nums.length;
    List<List<Integer>> result = new ArrayList<>();
    for (int mask = 0; mask < (1 << n); mask++) {
        List<Integer> subset = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) != 0) {  // bit i is set
                subset.add(nums[i]);
            }
        }
        result.add(subset);
    }
    return result;
}

// Bitmask DP skeleton (e.g., TSP / minimum cost to visit all nodes)
// dp[mask][i] = min cost to have visited exactly the nodes in mask, ending at node i
int[][] dp = new int[1 << n][n];
// transition: for each mask, for each last node i in mask, try extending to node j not in mask:
//   dp[mask | (1 << j)][j] = min(dp[mask | (1 << j)][j], dp[mask][i] + cost[i][j])
```
```javascript
// JavaScript — enumerate all subsets
function subsets(nums) {
    const n = nums.length;
    const result = [];
    for (let mask = 0; mask < (1 << n); mask++) {
        const subset = [];
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) {
                subset.push(nums[i]);
            }
        }
        result.push(subset);
    }
    return result;
}
```

### Dry Run
```
nums = [1, 2, 3], n = 3

mask = 5 = 1 0 1   → which elements?

  i=0: mask & (1 << 0) = 101 & 001 = 001 ≠ 0  → include nums[0] = 1
  i=1: mask & (1 << 1) = 101 & 010 = 000 = 0   → skip nums[1]
  i=2: mask & (1 << 2) = 101 & 100 = 100 ≠ 0  → include nums[2] = 3

subset for mask 5 = [1, 3] ✓
```

### Complexity
```
Time: O(n × 2^n) — 2^n masks, each requiring O(n) to read all bits
Space: O(2^n) — storing all subsets; O(1) extra if just processing each mask on the fly
```

### Common Trap
- **Shifting 1 (int) by 31+ positions in Java**: `1 << 31` gives a negative number in Java (int overflow). For n > 30, use `1L << n` (long). In JavaScript, bit ops are 32-bit signed, so n ≤ 30 is safe.
- **Off-by-one on the loop bound**: loop `mask < (1 << n)`, not `mask <= (1 << n)`. The subset `(1 << n) - 1` is the full set (all n bits set); `(1 << n)` itself is out of range.

### Experience Tip
**Experience Tip:** When you see n ≤ 20 with "optimal assignment" or "minimum cost partition," the answer is almost always bitmask DP. Start by defining `dp[mask]` = the answer considering exactly the elements indicated by `mask`, then write the recurrence. Complexity O(n × 2^n) is acceptable for n ≤ 20.

### Do Not Confuse With
- Bitmask enumeration (generate all subsets, O(n × 2^n)) vs. bitmask DP (optimize over subsets, same complexity but with memoization). Both use the same mask-as-integer idea; DP just adds a recurrence.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 78 | Subsets | Medium | Iterate mask 0 to 2^n-1; each mask encodes one subset | https://leetcode.com/problems/subsets/ |
| 201 | Bitwise AND of Numbers Range | Medium | AND all values in range = common binary prefix; strip low bits | https://leetcode.com/problems/bitwise-and-of-numbers-range/ |
| 318 | Maximum Product of Word Lengths | Medium | Encode each word's characters as a bitmask; AND == 0 means no shared chars | https://leetcode.com/problems/maximum-product-of-word-lengths/ |
| 338 | Counting Bits | Easy | dp[i] = dp[i & (i-1)] + 1 — bitmask DP in miniature | https://leetcode.com/problems/counting-bits/ |
| 136 | Single Number | Easy | Each bit position independently: XOR is a 1-bit "set difference" | https://leetcode.com/problems/single-number/ |

### One-Minute Revision
```
TECHNIQUE:       Bitmask Basics
IN SIMPLE WORDS: Use an integer's bits to represent which elements are in a set
USE WHEN:        n ≤ 20, enumerate all subsets, DP over subsets (TSP, assignment)
DON'T USE WHEN:  n > 25 (2^25 too large); data is naturally ordered/continuous
CORE TRICK:      Loop mask from 0 to (1<<n)-1; check bit i with (mask & (1<<i)) != 0
TIME:            O(n × 2^n) for full enumeration
SPACE:           O(2^n) for storing all states
COMMON TRAP:     Java int: use 1L << n for n > 30; loop bound is mask < (1<<n) not <=
EXPERIENCE TIP:  See n ≤ 20 + "all subsets" or "visited state" → reach for bitmask DP
```

---

## Quick Reference

```
OPERATIONS
  a & b    AND    — 1 only if BOTH are 1  (filter / isolate bits)
  a | b    OR     — 1 if EITHER is 1      (set bits)
  a ^ b    XOR    — 1 if they DIFFER      (detect / toggle / cancel)
  ~a       NOT    — flip all bits         (~n = -(n+1) in two's complement)
  a << k   SHL    — multiply by 2^k
  a >> k   SAR    — floor divide by 2^k (arithmetic, sign-preserving)
  a >>> k  SHR    — logical right shift (Java only; fills 0s regardless of sign)

SINGLE BIT OPS
  Check bit i:    (n >> i) & 1
  Set bit i:      n | (1 << i)
  Clear bit i:    n & ~(1 << i)
  Toggle bit i:   n ^ (1 << i)
  Is odd:         n & 1

KEY TRICKS
  n & (n-1)           → clear lowest set bit          ← most important single trick
  n & (-n)            → isolate lowest set bit
  n > 0 && n & (n-1) == 0  → n is a power of 2
  while(n!=0){n=n&(n-1);count++}  → Brian Kernighan count set bits

XOR PROPERTIES
  a ^ a = 0    a ^ 0 = a    commutative    associative
  → pairs cancel → finds lone element, missing number

BITMASK
  Loop mask 0 to (1<<n)-1      → all 2^n subsets
  sub = (sub-1) & mask         → enumerate sub-masks of mask (O(3^n) total)

SIGNALS → APPROACH
  "appears twice except one"         → XOR all
  "missing in [0..n]"                → XOR indices + values
  "count 1-bits"                     → Brian Kernighan (n & (n-1) loop)
  "power of 2"                       → n > 0 && n & (n-1) == 0
  "AND of range [L, R]"              → common binary prefix (shift till equal)
  "n ≤ 20, all subsets / visited"    → bitmask (DP)
  "count bits for 0..n"              → dp[i] = dp[i>>1] + (i&1)

COMPLEXITY LANDMARKS
  Brian Kernighan:     O(set bits) ≤ O(32)
  Power of 2 check:    O(1)
  Subset enumeration:  O(n × 2^n) — feasible for n ≤ 20
  Sub-mask enumeration:O(3^n) total across all masks
```

---

*Next: [15-MATH-AND-NUMBER-THEORY.md](15-MATH-AND-NUMBER-THEORY.md) — The mathematical toolkit behind algorithmic problem solving.*
