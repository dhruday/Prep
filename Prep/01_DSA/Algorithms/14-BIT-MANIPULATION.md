# Bit Manipulation — Complete Pattern Guide

> *"Bits are the atoms of computation. Mastering bit manipulation is like having X-ray vision — you see patterns invisible to those thinking only in base 10."*

---

## Table of Contents

1. [Bit Operations Cheat Sheet](#bit-operations-cheat-sheet)
2. [XOR Tricks](#xor-tricks)
3. [Single Number Family](#single-number-family)
4. [Brian Kernighan's Algorithm](#brian-kernighans-algorithm)
5. [Power of Two and Related](#power-of-two-and-related)
6. [Bitmask for Subsets](#bitmask-for-subsets)
7. [Bit Counting Patterns](#bit-counting-patterns)
8. [Bitwise AND/OR Range](#bitwise-andor-range)
9. [Common Interview Bit Tricks](#common-interview-bit-tricks)

---

## Bit Operations Cheat Sheet

| Operation | Syntax | Effect |
|---|---|---|
| AND | a & b | 1 only if both bits are 1 |
| OR | a \| b | 1 if either bit is 1 |
| XOR | a ^ b | 1 if bits differ |
| NOT | ~a | Flip all bits |
| Left shift | a << n | Multiply by 2ⁿ |
| Right shift | a >> n | Divide by 2ⁿ (floor) |
| Set bit i | a \| (1 << i) | Turn bit i ON |
| Clear bit i | a & ~(1 << i) | Turn bit i OFF |
| Toggle bit i | a ^ (1 << i) | Flip bit i |
| Check bit i | (a >> i) & 1 | Is bit i set? |
| Lowest set bit | a & (-a) | Isolate rightmost 1-bit |
| Clear lowest set bit | a & (a - 1) | Turn off rightmost 1-bit |

---

## XOR Tricks

### What is this approach?

**Intuition:** XOR is the "difference detector." Same bits cancel out (a ^ a = 0), different bits produce 1. Every number XORed with itself vanishes. This makes XOR perfect for finding "the odd one out."

### Key XOR Properties

- a ^ a = 0 (self-cancellation)
- a ^ 0 = a (identity)
- Commutative: a ^ b = b ^ a
- Associative: (a ^ b) ^ c = a ^ (b ^ c)

### When should I use this?

- "Find the number that appears an odd number of times"
- "Find missing number"
- "Find two numbers that appear once"
- "Swap without temp variable"
- Keywords: "appears once," "missing," "XOR," "without extra space"

### Core Applications

**Missing Number:** XOR all indices (0 to n) with all array values. Pairs cancel, leaving the missing number.

**Swap without temp:** a ^= b; b ^= a; a ^= b. Works because XOR is its own inverse.

---

## Single Number Family

### Single Number I (one appears once, rest appear twice)

**Core Idea:** XOR all elements. Pairs cancel. Answer = final XOR result.

**Complexity:** O(n) time, O(1) space.

### Single Number II (one appears once, rest appear THREE times)

**Core Idea:** For each bit position, count how many numbers have that bit set. If count % 3 ≠ 0, the unique number has that bit set.

**Implementation:** Use two variables (`ones`, `twos`) as a two-bit counter for each bit position. Track how many times each bit has appeared mod 3.

**Complexity:** O(n) time, O(1) space.

### Single Number III (TWO numbers appear once, rest appear twice)

**Core Idea:**
1. XOR all → result = a ^ b (the two unique numbers XORed together)
2. Find any set bit in the result (use `xor & (-xor)` for the lowest set bit). This bit differs between a and b.
3. Split all numbers into two groups by this bit. XOR within each group → one group gives a, the other gives b.

**Complexity:** O(n) time, O(1) space.

### Interview Insights

- **Single Number I** is the "hello world" of bit manipulation.
- **Single Number II** is tricky. The bit-counting approach generalizes: if every number appears K times except one appearing M times, count bits mod K.
- **Single Number III** is elegant: the "splitting" trick using any differing bit is the key insight.

---

## Brian Kernighan's Algorithm

### What is this approach?

**Intuition:** Count the number of 1-bits (set bits) in a number. Instead of checking all 32 bits, repeatedly clear the lowest set bit with `n & (n-1)`. Each operation removes exactly one 1-bit. Count iterations.

### Core Idea

- `n & (n - 1)` clears the lowest set bit of n
- Count how many times you can do this before n becomes 0 = number of set bits

### When should I use this?

- "Count number of 1 bits" (Hamming Weight)
- "Is power of two?" (exactly one set bit → n & (n-1) == 0)
- Any problem requiring iteration over set bits only

### Complexity

- **Time:** O(k) where k = number of set bits (≤ 32 for 32-bit integers)

### Interview Insights

- **Efficiency:** Only iterates over set bits, not all 32 positions.
- **Connection:** `n & (n-1)` is the most important single bit trick to memorize.

---

## Power of Two and Related

### Power of Two

n is a power of 2 if and only if: n > 0 and n & (n-1) == 0

**Why:** Powers of 2 have exactly one set bit. `n & (n-1)` clears it, leaving 0.

### Power of Four

n is a power of 4 if:
1. Power of two check: n & (n-1) == 0
2. The single set bit is at an even position: n & 0x55555555 != 0 (mask of alternating bits: 01010101...)

### Interview Insights

- **Pattern:** "Is X a power of something?" → Think bit patterns. Powers of 2 = one bit. Powers of 4 = one bit at specific positions.

---

## Bitmask for Subsets

### What is this approach?

**Intuition:** An n-bit integer can represent a subset of n elements. Bit i is 1 if element i is in the subset, 0 otherwise. Iterating from 0 to 2ⁿ-1 enumerates ALL subsets.

### When should I use this?

- "Generate all subsets" (n ≤ 20)
- Bitmask DP (see DP chapter)
- "Partition into groups"
- Keywords: "all subsets," "bitmask," "state compression"

### Core Operations

| Operation | Code | Effect |
|---|---|---|
| Enumerate all subsets | for mask in 0..2ⁿ-1 | Visit every subset |
| Check if element i in subset | mask & (1 << i) | Non-zero if present |
| Add element i | mask \| (1 << i) | Include element i |
| Remove element i | mask & ~(1 << i) | Exclude element i |
| Enumerate subsets of a mask | sub = mask; while sub > 0: sub = (sub-1) & mask | Visit all submasks |
| Size of subset | popcount(mask) | Count set bits |

### Enumerate All Submasks of a Mask

This is a critical trick for Bitmask DP:
- Start with sub = mask
- Next: sub = (sub - 1) & mask
- Stop when sub = 0 (and don't forget to handle sub = 0 if needed)
- Total iterations across all masks: O(3ⁿ) — not O(4ⁿ). Each element is either: in neither, in the outer mask only, or in both → 3 choices per element.

### Complexity

- **Enumerate all subsets:** O(2ⁿ) — feasible for n ≤ 20
- **Enumerate all submasks of all masks:** O(3ⁿ)

### Interview Insights

- **Constraint check:** If n ≤ 15-20, bitmask approaches are feasible. If n > 25, too slow.
- **Connection:** Bitmask DP (see [09-DYNAMIC-PROGRAMMING.md](09-DYNAMIC-PROGRAMMING.md#bitmask-dp)) uses masks as DP states.

---

## Bit Counting Patterns

### Counting Bits (for all numbers 0 to n)

**Core Idea:** dp[i] = dp[i >> 1] + (i & 1)

Or: dp[i] = dp[i & (i-1)] + 1

**Result:** Array of bit counts for every number from 0 to n in O(n) time.

### Hamming Distance

**Between two numbers:** XOR them, count set bits in the result.

**Total Hamming Distance (all pairs in array):** For each bit position, count how many numbers have that bit set (c). Contribution = c × (n - c). Sum over all 32 positions.

### Interview Insights

- **Total Hamming Distance** is a clever counting problem. Don't compare all pairs O(n²). Count per bit position O(32n).

---

## Bitwise AND/OR Range

### Bitwise AND of Numbers Range [left, right]

**Core Idea:** The answer is the common prefix of left and right in binary, with all remaining bits set to 0.

**Algorithm:** While left ≠ right: right-shift both by 1, count shifts. Left-shift the common value back.

**Why:** Any differing bit position will have both 0 and 1 in the range, so AND = 0 for that position.

### Interview Insights

- **Pattern:** "What's the AND/OR of a range?" → Think about when bits can vary. If any number in the range has a 0 at position k, the AND for that position is 0.

---

## Common Interview Bit Tricks

| Trick | Expression | Use |
|---|---|---|
| Check if even | n & 1 == 0 | Faster than n % 2 |
| Multiply by 2ⁿ | x << n | Bit shift |
| Divide by 2ⁿ | x >> n | Floor division |
| Check if power of 2 | n & (n-1) == 0, n > 0 | Single set bit |
| Get lowest set bit | n & (-n) | Isolate rightmost 1 |
| Clear lowest set bit | n & (n-1) | Remove rightmost 1 |
| Turn off bits after i | n & ((1 << (i+1)) - 1) | Keep bits 0..i |
| Reverse bits | Bit-by-bit or divide and conquer | Mirror bit pattern |
| UTF/ASCII tricks | c & 0x20 for case toggle | Character manipulation |

### The "Missing/Duplicate" Meta-Pattern

| Constraint | Technique |
|---|---|
| One missing from 1..n | XOR all with 1..n |
| One duplicate | XOR-based or math-based |
| One missing AND one duplicate | Combine XOR with sum |
| Two unique numbers | XOR + split by differing bit |

### Interview Insights

- **When to think about bits:** The problem constrains space to O(1), involves pairs/duplicates, or explicitly mentions binary/bitwise.
- **Common mistake:** Forgetting that Python integers have arbitrary precision. For 32-bit constraints, mask with 0xFFFFFFFF.

---

*Next: [15-MATH-AND-NUMBER-THEORY.md](15-MATH-AND-NUMBER-THEORY.md) — The mathematical toolkit behind algorithmic problem solving.*
