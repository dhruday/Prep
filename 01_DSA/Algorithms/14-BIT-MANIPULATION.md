# Bit Manipulation — 1-Hour Learning Module

> Estimated time: 60 minutes | Difficulty: Medium | Google interview frequency: High

---

## Table of Contents

1. [[0–10 min] Big Picture — Why Bit Manipulation?](#0-10-min-big-picture--why-bit-manipulation)
2. [[10–20 min] Mental Model — Binary and Core Operations](#10-20-min-mental-model--binary-and-core-operations)
3. [[20–35 min] Core Patterns — The Tricks That Matter](#20-35-min-core-patterns--the-tricks-that-matter)
4. [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
5. [[45–55 min] Pattern Recognition — What to Spot in an Interview](#45-55-min-pattern-recognition--what-to-spot-in-an-interview)
6. [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
7. [Active Recall](#active-recall)
8. [Recommended Practice Direction](#recommended-practice-direction)
9. [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture — Why Bit Manipulation?

### What is it?

Every number in a computer is stored as a sequence of 0s and 1s (bits). Bit manipulation means operating directly on those bits instead of on the number as a whole.

### The Light Switch Analogy

Think of a 4-bit number as a row of 4 light switches:

```
Decimal 13  →  binary 1101  →  [ON][ON][OFF][ON]
                                  8   4    2    1
```

Each switch controls a power-of-two value. The number is the sum of the "ON" values: 8 + 4 + 0 + 1 = 13.

Bit manipulation gives you tools to flip individual switches, check their state, or compare two rows of switches — all in a single CPU instruction.

### Why does it exist?

1. **Speed:** A single bitwise instruction executes in one CPU clock cycle. No loops, no division.
2. **Space:** A 32-bit integer can represent a set of 32 elements. That is a bitmask — 32x more space-efficient than a boolean array.
3. **Elegant solutions:** Some problems — finding duplicates, counting 1-bits, enumerating subsets — have clean O(1) or O(log n) solutions that look like magic until you understand the bit-level why.

### Problems it solves efficiently

| Problem | Naive approach | Bit manipulation |
|---|---|---|
| Is n a power of 2? | Loop or log | n & (n-1) == 0, one line |
| Count 1-bits in n | Check all 32 positions | Brian Kernighan: O(set bits) |
| Find the single non-duplicate | HashMap O(n) space | XOR: O(1) space |
| Enumerate all subsets of n items | Recursive backtracking | Loop 0 to 2^n-1 |

---

## [10–20 min] Mental Model — Binary and Core Operations

### Binary Representation

Positional value doubles from right to left:

```
Position:   7    6    5    4    3    2    1    0
Value:     128   64   32   16    8    4    2    1

Example: 42 = 0010 1010
               0×128 + 0×64 + 1×32 + 0×16 + 1×8 + 0×4 + 1×2 + 0×1
             = 32 + 8 + 2 = 42
```

### Core Operations (with what they DO, not just symbols)

**AND (&) — "Both must agree"**
Result bit is 1 only when BOTH input bits are 1. Think of it as a filter/mask.
```
  1100   (12)
& 1010   (10)
------
  1000   ( 8)   Only bits that were 1 in BOTH inputs survive
```

**OR (|) — "Either is enough"**
Result bit is 1 if at least one input bit is 1. Think of it as combining/setting.
```
  1100   (12)
| 1010   (10)
------
  1110   (14)   Bits from EITHER input survive
```

**XOR (^) — "Exactly one, not both"**
Result bit is 1 only when the two input bits DIFFER. Think of it as a difference detector.
```
  1100   (12)
^ 1010   (10)
------
  0110   ( 6)   Only bits where inputs disagree
```

**NOT (~) — "Flip everything"**
Inverts every bit. In most languages, ~n = -(n+1) due to two's complement.
```
  0000 1100   (12)
~
  1111 0011   (-13 in two's complement)
```

**Left Shift (<<) — "Multiply by 2"**
Shifts all bits left, appending zeros on the right. Each position = ×2.
```
  0000 0011  (3)  <<  2  =  0000 1100  (12)   →  3 × 2² = 12
```

**Right Shift (>>) — "Divide by 2 (floor)"**
Shifts all bits right, dropping the rightmost bit(s). Each position = ÷2.
```
  0000 1100  (12)  >>  2  =  0000 0011  (3)   →  12 ÷ 2² = 3
```

### Key Tricks: Derived from First Principles

**n & 1 — Check if odd**
The least significant bit (bit 0) is 1 for odd numbers, 0 for even. Masking with 1 isolates that bit.
```
7 = 0111,  7 & 1 = 0001 = 1  → odd
6 = 0110,  6 & 1 = 0000 = 0  → even
```

**n & (n-1) — Clear the lowest set bit**
Why does subtracting 1 flip the lowest set bit and all bits below it?
```
n   = 1010 1000   (lowest set bit is at position 3)
n-1 = 1010 0111   (that bit flipped to 0, all below flipped to 1)
n & (n-1) = 1010 0000   (lowest set bit gone)
```
This is the most important single bit trick. It lets you count set bits by repeatedly removing them.

**XOR Properties — The "cancellation" tool**
- a ^ a = 0 (any value XOR'd with itself cancels out)
- a ^ 0 = a (XOR with 0 does nothing)
- Commutative: a ^ b = b ^ a
- Associative: (a ^ b) ^ c = a ^ (b ^ c)

These four properties together mean: if you XOR a list of numbers where every number appears twice except one, everything cancels except the lone number.

---

## [20–35 min] Core Patterns — The Tricks That Matter

### Pattern 1: XOR Cancellation

**The insight:** Same values cancel when XOR'd. Only unpaired values survive.

**Missing Number:** You have [0, 1, 2, ..., n] with one number removed. XOR all indices 0..n with all array values. Pairs cancel, the missing number is left.

```
Array = [0, 1, 3]  (missing 2, n=3)
XOR indices 0^1^2^3 = 0
XOR array  0^1^3   = 2 (indices cancel with array values except 2)
Result = 2   ✓
```

**Swap without temp variable:** Uses the fact that XOR is its own inverse.
```
a ^= b   (a now holds a^b)
b ^= a   (b = b ^ (a^b) = a)
a ^= b   (a = (a^b) ^ a = b)
```

### Pattern 2: Single Number Family

**I. One unique, rest appear twice → XOR all**
```
[2, 3, 2, 4, 3]
XOR all: 2^3^2^4^3 = (2^2) ^ (3^3) ^ 4 = 0 ^ 0 ^ 4 = 4
```

**II. One unique, rest appear three times → Bit counting mod 3**
For each of the 32 bit positions, count how many input numbers have that bit set. If count % 3 != 0, the unique number has that bit set. This generalizes: if every number appears K times except one, count bits mod K.

Implementation uses two variables `ones` and `twos` as a 2-bit counter per bit position, tracking appearances mod 3. This is a compact finite state machine in bit form.

**III. Two unique numbers, rest appear twice → XOR + split**

Step 1: XOR all → result = a ^ b (the two unique numbers XOR'd)
Step 2: Find any bit where a and b differ. Use `diff & (-diff)` to isolate the lowest set bit of the XOR result. This bit is guaranteed to be 0 in one unique number and 1 in the other.
Step 3: Split all numbers into two groups by that bit. XOR within each group — paired numbers cancel, leaving one unique number per group.

```
[1, 2, 1, 3, 2, 5]  →  unique: 3 and 5

Step 1: 1^2^1^3^2^5 = 3^5 = 011 ^ 101 = 110  (6)
Step 2: lowest set bit of 6 = 010  (bit 1)
Step 3: Group A (bit 1 = 0): 1^1^5 = 5
        Group B (bit 1 = 1): 2^3^2 = 3
Answer: 3 and 5  ✓
```

### Pattern 3: Brian Kernighan — Count Set Bits

Repeatedly apply `n = n & (n-1)` and count iterations. Each iteration removes exactly one set bit. Stop when n = 0.

```
n = 13 = 1101
Step 1: n & (n-1) = 1101 & 1100 = 1100  (12)  — removed bit 0
Step 2: n & (n-1) = 1100 & 1011 = 1000  ( 8)  — removed bit 2
Step 3: n & (n-1) = 1000 & 0111 = 0000  ( 0)  — removed bit 3
Count = 3 set bits  ✓
```

Efficiency: iterates only over set bits, not all 32 positions.

### Pattern 4: Power of 2 (and Power of 4)

**Power of 2:** Exactly one bit is set. So n & (n-1) clears that one bit, leaving 0.
```
8 = 1000,  8 & 7 = 1000 & 0111 = 0000  → IS power of 2
6 = 0110,  6 & 5 = 0110 & 0101 = 0100  → NOT power of 2
```
Full check: `n > 0 && (n & (n-1)) == 0`

**Power of 4:** Must also be a power of 2, AND the single set bit must be at an even position (0, 2, 4, ...).
The mask `0x55555555` in binary is `...01010101` — it has 1s only at even positions.
```
4  = 0100 → power of 2? yes → bit at position 2 (even)? yes → power of 4 ✓
8  = 1000 → power of 2? yes → bit at position 3 (odd)?  no  → NOT power of 4 ✓
16 = 10000 → power of 2? yes → bit at position 4 (even)? yes → power of 4 ✓
```

### Pattern 5: Bitmask for Subsets

An n-bit integer encodes a subset: bit i = 1 means element i is in the subset.

```
Elements: [A, B, C, D]  (n=4)
Mask 1011 = {A, B, D}   (A=bit0, B=bit1, C=bit2, D=bit3)
```

Iterating `mask` from 0 to (2^n - 1) visits all 2^n subsets exactly once. This is why n <= 20 is the bitmask feasibility threshold (2^20 = ~1M, manageable).

**Enumerate all sub-masks of a mask:**
```
sub = mask
while sub > 0:
    process(sub)
    sub = (sub - 1) & mask   // strip the lowest bit of sub that's in mask
```
Total work across all masks: O(3^n), because each element has 3 states: absent from outer mask, in outer mask but not sub-mask, in both.

### Pattern 6: Counting Bits for 0..n

**Recurrence:** `dp[i] = dp[i >> 1] + (i & 1)`

Why this works: Shifting i right by 1 is just i/2 (already computed). The last bit either adds 0 or 1.

Alternative: `dp[i] = dp[i & (i-1)] + 1` — the number with the lowest bit cleared has exactly one fewer set bit.

### Pattern 7: Bitwise AND of a Range [left, right]

**Key insight:** For any bit position where left and right differ, there is some number in the range that has a 0 at that position and some number that has a 1. So the AND of the entire range is 0 for that bit. Only the common prefix of left and right (in binary) survives.

**Algorithm:** Right-shift both left and right until they are equal. Count the shifts. Left-shift the result back by the same count.

```
left = 5  = 101
right = 7 = 111

Shift 1: left=010, right=011, count=1
Shift 2: left=001, right=001, count=2  (equal!)
Result = 001 << 2 = 100 = 4

Check: 5&6&7 = 101 & 110 & 111 = 100 = 4  ✓
```

### Pattern 8: Hamming Distance

**Between two numbers:** XOR them (XOR gives 1 where bits differ), then count the set bits.
```
Hamming(1, 4) = Hamming(001, 100) = popcount(001 ^ 100) = popcount(101) = 2
```

**Total Hamming Distance across all pairs in an array:** Instead of O(n^2) pairwise comparison, work bit position by bit position. For each of the 32 positions, if c numbers have that bit set and (n-c) do not, that position contributes c * (n-c) to the total distance. Sum over all positions.

---

## [35–45 min] Concrete Code + Dry Run

### Java — Core Bit Tricks

```java
public class BitManipulation {

    // Count set bits — Brian Kernighan
    public int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n = n & (n - 1);  // clears lowest set bit
            count++;
        }
        return count;
    }

    // Is power of two?
    public boolean isPowerOfTwo(int n) {
        return n > 0 && (n & (n - 1)) == 0;
    }

    // Is power of four?
    public boolean isPowerOfFour(int n) {
        // Power of 2: n & (n-1) == 0
        // Set bit at even position: n & 0x55555555 != 0
        return n > 0 && (n & (n - 1)) == 0 && (n & 0x55555555) != 0;
    }

    // Single Number I — one unique, rest appear twice
    public int singleNumber(int[] nums) {
        int result = 0;
        for (int n : nums) result ^= n;  // pairs cancel
        return result;
    }

    // Single Number III — two unique numbers
    public int[] singleNumberIII(int[] nums) {
        int xor = 0;
        for (int n : nums) xor ^= n;         // xor = a ^ b
        int diff = xor & (-xor);              // isolate lowest set bit
        int a = 0;
        for (int n : nums) {
            if ((n & diff) != 0) a ^= n;     // group with that bit set
        }
        return new int[]{a, xor ^ a};        // b = xor ^ a
    }

    // Missing Number — XOR approach
    public int missingNumber(int[] nums) {
        int result = nums.length;
        for (int i = 0; i < nums.length; i++) {
            result ^= i ^ nums[i];            // XOR index and value together
        }
        return result;
    }

    // Count bits for all numbers 0..n
    public int[] countBits(int n) {
        int[] dp = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            dp[i] = dp[i >> 1] + (i & 1);   // right-shift + last bit
        }
        return dp;
    }

    // Range AND
    public int rangeBitwiseAnd(int left, int right) {
        int shifts = 0;
        while (left != right) {
            left >>= 1;
            right >>= 1;
            shifts++;
        }
        return left << shifts;
    }

    // Set/Clear/Toggle/Check a specific bit
    public int setBit(int n, int i)    { return n | (1 << i); }
    public int clearBit(int n, int i)  { return n & ~(1 << i); }
    public int toggleBit(int n, int i) { return n ^ (1 << i); }
    public boolean checkBit(int n, int i) { return ((n >> i) & 1) == 1; }
}
```

### JavaScript/TypeScript — Core Bit Tricks

```typescript
// Brian Kernighan — count set bits
function hammingWeight(n: number): number {
    let count = 0;
    while (n !== 0) {
        n = n & (n - 1);  // clear lowest set bit
        count++;
    }
    return count;
}

// Is power of two?
function isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
}

// Single Number I
function singleNumber(nums: number[]): number {
    return nums.reduce((acc, n) => acc ^ n, 0);
}

// Missing Number
function missingNumber(nums: number[]): number {
    let result = nums.length;
    nums.forEach((val, idx) => { result ^= idx ^ val; });
    return result;
}

// Count bits 0..n
function countBits(n: number): number[] {
    const dp = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
        dp[i] = dp[i >> 1] + (i & 1);
    }
    return dp;
}

// Enumerate all subsets of an array using bitmask
function allSubsets(arr: number[]): number[][] {
    const n = arr.length;
    const result: number[][] = [];
    for (let mask = 0; mask < (1 << n); mask++) {
        const subset: number[] = [];
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) subset.push(arr[i]);
        }
        result.push(subset);
    }
    return result;
    // mask from 0000 to 1111 for n=4, 16 subsets total
}

// Range AND
function rangeBitwiseAnd(left: number, right: number): number {
    let shifts = 0;
    while (left !== right) {
        left >>= 1;
        right >>= 1;
        shifts++;
    }
    return left << shifts;
}
```

### Dry Run: Single Number III on [1, 2, 1, 3, 2, 5]

```
Step 1 — XOR all:
  1 ^ 2 = 011 ^ 010 = 001 (3)... wait, let's do it in sequence:
  start = 0
  ^ 1   = 001
  ^ 2   = 011
  ^ 1   = 010
  ^ 3   = 001
  ^ 2   = 011
  ^ 5   = 110  =  6
  xor = 6 = 110  (this is 3 ^ 5 = 011 ^ 101 = 110 ✓)

Step 2 — Lowest set bit of 6:
  6  = 110
  -6 = 010  (two's complement)
  6 & (-6) = 110 & 010 = 010  =  2  (bit 1 is the differing bit)

Step 3 — Split by bit 1:
  Numbers where bit 1 IS set:  2 (010), 3 (011), 2 (010)
    XOR: 010 ^ 011 ^ 010 = 011 = 3
  Numbers where bit 1 is NOT set: 1 (001), 1 (001), 5 (101)
    XOR: 001 ^ 001 ^ 101 = 101 = 5

Answer: [3, 5] ✓
```

---

## [45–55 min] Pattern Recognition — What to Spot in an Interview

### Signal → Approach Map

| What you see in the problem | What to think |
|---|---|
| n <= 20, "all subsets", "partition" | Bitmask enumeration or bitmask DP |
| "appears once, rest appear twice" | XOR all elements |
| "missing number", "no extra space" | XOR indices with values |
| "two unique numbers" | XOR all, then split by differing bit |
| "count 1-bits", "Hamming weight" | Brian Kernighan: n & (n-1) loop |
| "is power of 2?" | n > 0 && n & (n-1) == 0 |
| "is power of 4?" | Power of 2 AND set bit at even position |
| "AND of range [L, R]" | Common binary prefix (shift till equal) |
| "count bits for 0..n" | DP: dp[i] = dp[i>>1] + (i&1) |
| "generate all subsets" | Iterate mask 0 to 2^n - 1 |

### The n & (n-1) Family

Nearly every bit manipulation interview trick traces back to one of two operations:

1. `n & (n-1)` — clears the lowest set bit
   - Use for: counting set bits, checking power of 2
2. `n & (-n)` — isolates the lowest set bit
   - Use for: finding a differing bit (Single Number III), Fenwick tree traversal

### XOR Properties — Recognition Checklist

Ask yourself: "Does this problem involve finding an unpaired value?"
- One element appears odd times → XOR all
- Missing number in [0..n] → XOR expected range with actual array
- Two unique elements → XOR all, split by differing bit
- "Swap two values without temp" → XOR swap

### Bitmask DP Awareness (Advanced)

When you see n <= 15-20 with states that are sets of elements, consider encoding the "which elements have been used/visited" state as a bitmask integer. Common in: Traveling Salesman variants, assignment problems, games on subsets.

The bitmask serves as the DP state index, turning an exponential subset enumeration into a manageable table with 2^n entries.

Complexity boundary:
- n <= 20: bitmask feasible (~1M states)
- n > 25: typically too slow (~33M+)

---

## [55–60 min] Final Mental Checklist

Before writing bit manipulation code in an interview, run through these:

**Understand the bit layout**
- [ ] Can I draw the binary representation of a sample input?
- [ ] Do I know which bit positions matter?

**Choose the right primitive**
- [ ] Single missing/duplicate value → XOR
- [ ] Count set bits → Brian Kernighan (n & (n-1) loop)
- [ ] Power of 2 → n & (n-1) == 0 with n > 0
- [ ] Subset enumeration → mask 0 to 2^n-1
- [ ] Range AND → common prefix via right-shift

**Derive, don't memorize**
- [ ] Can I explain WHY n & (n-1) clears the lowest set bit?
- [ ] Can I explain WHY XOR pairs cancel?
- [ ] Can I derive the power-of-4 mask from first principles?

**Edge cases**
- [ ] n = 0: n & (n-1) would be -1 if not guarded — always check n > 0 for power-of-2
- [ ] Negative numbers: right shift behavior varies by language (arithmetic vs logical)
- [ ] 32-bit overflow: in Java use `int` carefully; in JS all bitwise ops work on 32-bit signed ints
- [ ] Python arbitrary precision: if problem says 32-bit, mask with `0xFFFFFFFF`

**Complexity**
- [ ] Brian Kernighan: O(number of set bits), not O(32)
- [ ] Bitmask subset enumeration: O(2^n)
- [ ] Submask enumeration: O(3^n) total across all masks

---

## Active Recall

Test yourself without looking above. Spend 30 seconds on each.

1. What does `n & (n-1)` do? Explain WHY from the binary representation of n and n-1.
2. Write the one-liner to check if n is a power of 2. What is the edge case?
3. You have an array where every element appears twice except one. Write the algorithm in one sentence and in one line of code.
4. How do you find two unique numbers in an array where everything else appears twice? Walk through the three steps.
5. What does `n & (-n)` compute? How is it used in Single Number III?
6. You need to count the 1-bits in n. Write both the naive approach and Brian Kernighan's approach. What is the time complexity of each?
7. You are given a sorted array of length n containing values from 0 to n with one missing. How do you find it with XOR in O(n) time and O(1) space?
8. What is the recurrence for dp[i] = number of 1-bits in i, given dp for all smaller values?
9. What is the AND of all numbers in range [5, 7]? Derive the answer using the common-prefix algorithm.
10. What constraint on n tells you to consider bitmask DP? What is the upper feasibility limit?

---

## Recommended Practice Direction

Work through problems in this order:

**Foundations (start here)**
- LeetCode 136: Single Number — pure XOR cancellation
- LeetCode 191: Number of 1 Bits — Brian Kernighan
- LeetCode 231: Power of Two — n & (n-1) check
- LeetCode 268: Missing Number — XOR with index

**Core patterns**
- LeetCode 137: Single Number II — bit counting mod 3
- LeetCode 260: Single Number III — XOR + split
- LeetCode 338: Counting Bits — DP with bit recurrence
- LeetCode 201: Bitwise AND of Numbers Range

**Harder applications**
- LeetCode 461: Hamming Distance
- LeetCode 477: Total Hamming Distance — bit-position counting trick
- LeetCode 342: Power of Four
- LeetCode 318: Maximum Product of Word Lengths — bitmask as set representation

**Advanced awareness (bitmask DP)**
- LeetCode 78: Subsets — bitmask enumeration
- LeetCode 847: Shortest Path Visiting All Nodes — bitmask BFS
- LeetCode 1986: Minimum Number of Work Sessions — bitmask DP

---

## 2-Minute Cheat Sheet

```
OPERATIONS
  a & b    AND    — 1 only if BOTH are 1  (filter/mask)
  a | b    OR     — 1 if EITHER is 1     (set/combine)
  a ^ b    XOR    — 1 if they DIFFER     (detect difference)
  ~a       NOT    — flip all bits        (~n = -(n+1))
  a << n   SHL    — multiply by 2^n
  a >> n   SHR    — floor divide by 2^n

FUNDAMENTAL TRICKS
  n & 1             → check if odd (LSB)
  n & (n-1)         → clear lowest set bit   ← most important
  n & (-n)          → isolate lowest set bit
  n & (n-1) == 0    → n is power of 2 (add n > 0)
  setBit(n,i)       → n | (1 << i)
  clearBit(n,i)     → n & ~(1 << i)
  toggleBit(n,i)    → n ^ (1 << i)
  checkBit(n,i)     → (n >> i) & 1

XOR PROPERTIES
  a ^ a = 0     a ^ 0 = a     commutative + associative
  → use to cancel paired values, find missing/unique

COUNT SET BITS  (Brian Kernighan)
  while n != 0: n = n & (n-1), count++

COUNT BITS 0..N
  dp[i] = dp[i >> 1] + (i & 1)

SUBSETS
  mask 0 to 2^n - 1     → all 2^n subsets
  sub = (sub-1) & mask  → all submasks of mask (O(3^n) total)

SIGNALS
  one unique / pairs      → XOR all
  missing in [0..n]       → XOR indices + values
  two unique / pairs      → XOR all → split by diff bit
  n <= 20, set-of-items   → bitmask DP
  AND of range [L,R]      → common binary prefix
```

---

*Next: [15-MATH-AND-NUMBER-THEORY.md](15-MATH-AND-NUMBER-THEORY.md) — The mathematical toolkit behind algorithmic problem solving.*
