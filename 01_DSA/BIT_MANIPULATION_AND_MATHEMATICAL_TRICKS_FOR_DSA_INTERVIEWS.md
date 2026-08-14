# BIT MANIPULATION & MATHEMATICAL TRICKS FOR DSA INTERVIEWS
### *A Lifelong Reference — Built for Fast Pattern Recognition*

---

## ⚡ HOW TO USE THIS DOCUMENT

> **Your interview is Monday. Here is exactly how to read this.**

### 🕐 15-Minute Revision (Day-of panic mode)
1. Read **Part 16** → The one-page cheat sheet
2. Read **"The 25 Things I Must Remember"** at the very end
3. Read **Part 14** → The decision tree
4. Done. Go breathe.

### 🕐 30-Minute Revision (The night before)
1. Read **Part 11** → How to think without converting binary
2. Read **Part 9** → Pattern recognition table
3. Read **Part 5** → XOR deep dive (most important)
4. Read **Part 15** → 20 flashcards of your choice
5. Read **Part 16** → Cheat sheet
6. Read **"The 25 Things I Must Remember"**

### 🕐 60-Minute Revision (Weekend study session)
1. Read **Part 1** → Build the mental model
2. Read **Part 2** → All operators
3. Read **Part 3** → Mathematical interpretation (very important)
4. Read **Part 4** → Must-know bit tricks
5. Read **Part 5** → XOR
6. Read **Part 6** → Modulo + bit connection
7. Read **Part 8** → Math shortcuts (skim what you know)
8. Read **Part 10** → Real problems
9. Read **Part 15** → Flashcards
10. Read **Part 16** → Cheat sheet

---

# PART 1 — THE MENTAL MODEL
## *Bits, Binary, and Why It Matters*

---

## 1.1 What Is a Bit?

Think of a bit as a **light switch**. It has exactly two states:
- **OFF** → represented as `0`
- **ON** → represented as `1`

That's it. A bit is just a 0 or 1.

A **byte** is 8 switches in a row: `00000000` to `11111111`

A 32-bit integer has 32 switches. A 64-bit integer has 64 switches.

---

## 1.2 Why Do Computers Use Binary?

Computers are built from transistors — tiny electronic switches that are either ON or OFF. There is no "halfway on." So the natural language of hardware is binary.

Everything — your text, your images, your video — is stored as billions of 0s and 1s.

---

## 1.3 Binary Representation — Building from Zero

Think of binary as a **positional number system**, just like decimal.

In **decimal**, each position is worth 10× the previous:
```
...  1000   100   10    1
      10³   10²  10¹  10⁰
```

In **binary**, each position is worth 2× the previous:
```
...   8     4     2     1
     2³    2²    2¹    2⁰
```

### The Key Powers of 2 You Must Know

| Power | Value | Binary position |
|-------|-------|-----------------|
| 2⁰    | 1     | Bit 0 (rightmost) |
| 2¹    | 2     | Bit 1 |
| 2²    | 4     | Bit 2 |
| 2³    | 8     | Bit 3 |
| 2⁴    | 16    | Bit 4 |
| 2⁵    | 32    | Bit 5 |
| 2⁶    | 64    | Bit 6 |
| 2⁷    | 128   | Bit 7 |
| 2⁸    | 256   | Bit 8 |
| 2⁹    | 512   | Bit 9 |
| 2¹⁰   | 1024  | Bit 10 |
| 2¹⁶   | 65536 | Bit 16 |
| 2³¹   | ~2.1 billion | Bit 31 (max for signed 32-bit) |

**Memory trick:** Each power of 2 is just the previous one doubled.
```
1 → 2 → 4 → 8 → 16 → 32 → 64 → 128 → 256 → 512 → 1024
```

---

## 1.4 Reading Binary Numbers — Small Examples

Let's go through every number from 0 to 10, then a few more.

For each number, I'll show you the 4-bit representation and **exactly** what each bit means.

```
Bit positions:  [3]  [2]  [1]  [0]
                 8    4    2    1
```

### Number: 0
```
Binary: 0000
Math: 0×8 + 0×4 + 0×2 + 0×1 = 0
```

### Number: 1
```
Binary: 0001
Math: 0×8 + 0×4 + 0×2 + 1×1 = 1
Only bit 0 is ON.
```

### Number: 2
```
Binary: 0010
Math: 0×8 + 0×4 + 1×2 + 0×1 = 2
Only bit 1 is ON.
```

### Number: 3
```
Binary: 0011
Math: 0×8 + 0×4 + 1×2 + 1×1 = 3
Bits 0 and 1 are ON.
```

### Number: 4
```
Binary: 0100
Math: 0×8 + 1×4 + 0×2 + 0×1 = 4
Only bit 2 is ON.
```

### Number: 5
```
Binary: 0101
Math: 0×8 + 1×4 + 0×2 + 1×1 = 5
Bits 0 and 2 are ON.
```

### Number: 6
```
Binary: 0110
Math: 0×8 + 1×4 + 1×2 + 0×1 = 6
Bits 1 and 2 are ON.
```
> **This is the example you mentioned!** 6 = 1×4 + 1×2 + 0×1. The `110` means the 4-bit and 2-bit positions are set.

### Number: 7
```
Binary: 0111
Math: 0×8 + 1×4 + 1×2 + 1×1 = 7
Bits 0, 1, and 2 are ON.
Notice: 7 = 8 - 1. When all bits below a power of 2 are ON, you get that power minus 1.
```

### Number: 8
```
Binary: 1000
Math: 1×8 + 0×4 + 0×2 + 0×1 = 8
Only bit 3 is ON.
Powers of 2 always have EXACTLY ONE bit set!
```

### Number: 9
```
Binary: 1001
Math: 1×8 + 0×4 + 0×2 + 1×1 = 9
Bits 0 and 3 are ON.
```

### Number: 10
```
Binary: 1010
Math: 1×8 + 0×4 + 1×2 + 0×1 = 10
Bits 1 and 3 are ON.
```

### Number: 15
```
Binary: 1111
Math: 1×8 + 1×4 + 1×2 + 1×1 = 15
All bits ON. 15 = 16 - 1.
```

### Number: 16
```
Binary: 10000
Math: 1×16 + 0×8 + 0×4 + 0×2 + 0×1 = 16
Only bit 4 is ON. Another power of 2!
```

---

## 1.5 The Pattern You Must See

**Powers of 2 → exactly ONE bit is ON**
```
1  → 0001  (bit 0)
2  → 0010  (bit 1)
4  → 0100  (bit 2)
8  → 1000  (bit 3)
16 → 10000 (bit 4)
```

**2^k - 1 → all bits below position k are ON**
```
1  = 2¹ - 1 → 0001  (bit 0 only)
3  = 2² - 1 → 0011  (bits 0 and 1)
7  = 2³ - 1 → 0111  (bits 0, 1, 2)
15 = 2⁴ - 1 → 1111  (bits 0, 1, 2, 3)
```
> This is CRUCIAL and comes back in modulo tricks later.

---

# PART 2 — BITWISE OPERATORS
## *Every Operator You Need to Know*

---

## OPERATOR: `&` (AND)

---

### What does it mean in plain English?

`&` compares two numbers **bit by bit**.
For each bit position, the result is `1` **only if BOTH** bits are `1`.
Think of it as: **"Both must agree on ON."**

### What happens at bit level?

```
Bit rules:
0 & 0 = 0
0 & 1 = 0
1 & 0 = 0
1 & 1 = 1   ← Only this gives 1
```

**Example: 6 & 3**
```
6 = 0110
3 = 0011
---------
  = 0010  = 2

Position by position:
Bit 3: 0 & 0 = 0
Bit 2: 1 & 0 = 0
Bit 1: 1 & 1 = 1  ← Both have bit 1 set
Bit 0: 0 & 1 = 0
```
Result: `2`

**Example: 12 & 10**
```
12 = 1100
10 = 1010
----------
   = 1000  = 8

Bit 3: 1 & 1 = 1  ← Both have bit 3
Bit 2: 1 & 0 = 0
Bit 1: 0 & 1 = 0
Bit 0: 0 & 0 = 0
```
Result: `8`

### Mathematical interpretation

`AND` is a **bit-by-bit filter**. You use one number as a **mask** to select specific bits from another number.

If you `AND` with a number that has only certain bits set, you extract exactly those bits and zero out everything else.

### Fast interview shortcut

> `&` = **"extract bits I care about"** or **"check if specific bits are set"**

### How do I recognize it in a problem?

- "Is this number odd or even?"
- "Is a particular bit set?"
- "What is n mod (power of 2)?"
- "Filter using a bitmask"
- Subset problems with bitmask DP

### Example 1 — Check odd/even
```javascript
n & 1
// If result is 1 → odd
// If result is 0 → even
// Why? Because odd numbers always have bit 0 set.
// 5 = 101 → bit 0 is 1 → odd
// 6 = 110 → bit 0 is 0 → even
```

### Example 2 — Check a specific bit
```javascript
// Is bit 3 set in n?
n & 8   // 8 = 1000 in binary
// If result is 8 → bit 3 is set
// If result is 0 → bit 3 is not set
```

### Example 3 — Modulo by power of 2
```javascript
n & 7   // Same as n % 8
n & 15  // Same as n % 16
n & 3   // Same as n % 4
```

### Example 4 — Check power of 2
```javascript
n & (n - 1) === 0  // n is a power of 2
// Explained in detail in Part 4
```

### Common mistakes
- Confusing `&` (bitwise AND) with `&&` (logical AND)
- `5 & 3` is NOT `5 && 3`. `5 & 3 = 1`. `5 && 3 = 3` (truthy).
- Forgetting operator precedence: `n & 1 === 0` is parsed as `n & (1 === 0)` → always `0`. Use `(n & 1) === 0`.

### JavaScript syntax
```javascript
const result = a & b;
// Always use parentheses in comparisons:
if ((n & 1) === 0) { /* even */ }
```

### DSA problems where it appears
- Check odd/even
- Count set bits
- Power of 2 check
- Bitmask DP (subsets)
- Extract lowest set bit

---

## OPERATOR: `|` (OR)

---

### What does it mean in plain English?

`|` compares two numbers bit by bit. The result is `1` if **EITHER** bit is `1` (or both).
Think of it as: **"At least one of them is ON."**

### What happens at bit level?

```
Bit rules:
0 | 0 = 0
0 | 1 = 1
1 | 0 = 1
1 | 1 = 1   ← Both ON also gives 1
```

**Example: 6 | 3**
```
6 = 0110
3 = 0011
---------
  = 0111  = 7

Bit 2: 1 | 0 = 1
Bit 1: 1 | 1 = 1
Bit 0: 0 | 1 = 1
```

**Example: 8 | 5**
```
 8 = 1000
 5 = 0101
----------
   = 1101  = 13
```

### Mathematical interpretation

`OR` **turns bits ON**. You can think of it as combining two sets of bits together. Once a bit is turned ON by OR, it stays ON.

### Fast interview shortcut

> `|` = **"turn on specific bits"** or **"combine two bit-sets"**

### How do I recognize it in a problem?

- Setting a specific bit in a bitmask
- Combining flags or states
- Turning on bits without affecting others

### Example 1 — Set a specific bit
```javascript
// Set bit k in n
n | (1 << k)
// Example: set bit 2 in 5
// 5 = 0101
// (1 << 2) = 0100
// 5 | 4 = 0101 | 0100 = 0101... wait
// 5 = 101, bit 2 already set
// Let's try: set bit 3 in 5
// (1 << 3) = 1000
// 5 | 8 = 0101 | 1000 = 1101 = 13
```

### Example 2 — Combine bitmasks
```javascript
// If state1 tracks items {0, 2} and state2 tracks items {1, 3}
// state1 = 0101 = 5, state2 = 1010 = 10
// Combined = state1 | state2 = 1111 = 15
```

### Common mistakes
- Confusing `|` (bitwise OR) with `||` (logical OR)
- `5 | 3 = 7`. `5 || 3 = 5` (first truthy value in JS).

### JavaScript syntax
```javascript
const result = a | b;
```

### DSA problems where it appears
- Bitmask DP state transitions
- Setting bits in a mask
- Combining partial results

---

## OPERATOR: `^` (XOR — Exclusive OR)

---

### What does it mean in plain English?

`^` compares two numbers bit by bit. The result is `1` if the bits are **DIFFERENT**.
Think of it as: **"Exactly one of them is ON, but not both."**

Or think: **"They disagree."**

### What happens at bit level?

```
Bit rules:
0 ^ 0 = 0   ← Same → 0
0 ^ 1 = 1   ← Different → 1
1 ^ 0 = 1   ← Different → 1
1 ^ 1 = 0   ← Same → 0
```

**Example: 6 ^ 3**
```
6 = 0110
3 = 0011
---------
  = 0101  = 5

Bit 2: 1 ^ 0 = 1 (different)
Bit 1: 1 ^ 1 = 0 (same)
Bit 0: 0 ^ 1 = 1 (different)
```

### Mathematical interpretation

XOR is **addition modulo 2** at each bit position. This gives it powerful cancellation properties:
- `a ^ a = 0` (same number cancels itself)
- `a ^ 0 = a` (XOR with 0 changes nothing)
- XOR is commutative and associative

### Fast interview shortcut

> `^` = **"find differences"** or **"cancel out pairs"**

### How do I recognize it in a problem?

- "Every element appears twice except one → find the unique element"
- "Find missing number in a range"
- "Detect different bits between two numbers"
- "Parity of a set of numbers"

*(XOR gets its own full deep dive in Part 5)*

### Common mistakes
- Confusing `^` (XOR) with `**` (power in Python) or `Math.pow`
- In JavaScript, `^` is XOR, not exponentiation (that's `**`)
- Forgetting that XOR is NOT the same as "bitwise OR"

### JavaScript syntax
```javascript
const result = a ^ b;
```

---

## OPERATOR: `~` (NOT — Bitwise Complement)

---

### What does it mean in plain English?

`~` flips every bit. Every `0` becomes `1`, every `1` becomes `0`.

### What happens at bit level?

```
~0 = 1
~1 = 0

~5:
5 = ...00000101
~5 = ...11111010 = -6  (in two's complement)
```

### Mathematical interpretation

In JavaScript (and most languages), `~n = -(n + 1)`.

```
~0 = -1
~1 = -2
~5 = -6
~(-1) = 0
```

This is because of **two's complement** representation (how negative numbers are stored in binary).

### Fast interview shortcut

> `~n = -(n+1)` → useful in some XOR tricks

> `~0 = -1` → all bits set

> `n & ~(1 << k)` → clear bit k (explained in Part 4)

### How do I recognize it in a problem?

- Rarely used directly
- Appears when clearing a specific bit
- Sometimes used to flip all bits

### Example 1 — Check if index found (JS interview trick)
```javascript
// indexOf returns -1 if not found
// ~(-1) = 0 which is falsy
// ~(any other index) is truthy
if (~arr.indexOf(x)) {
  // x was found
}
// This works but arr.includes(x) is clearer — prefer clarity
```

### Example 2 — Clear bit k
```javascript
n & ~(1 << k)  // Clears bit k in n
```

### Common mistakes
- `~n` in JavaScript always gives a 32-bit integer result
- `~` is NOT the same as logical NOT (`!`)

### JavaScript syntax
```javascript
const result = ~n;
```

---

## OPERATOR: `<<` (Left Shift)

---

### What does it mean in plain English?

`<<` moves all bits to the **left** by some number of positions. Empty spaces on the right are filled with `0`.

Think of it as: **"Shift everything left, add zeros on the right."**

### What happens at bit level?

```
5 = 00000101
5 << 1 = 00001010 = 10  (shifted left by 1)
5 << 2 = 00010100 = 20  (shifted left by 2)
5 << 3 = 00101000 = 40  (shifted left by 3)
```

### Mathematical interpretation

`n << k` is equivalent to `n × 2^k` (for non-negative n, within integer bounds).

```
5 << 1 = 5 × 2¹ = 10
5 << 2 = 5 × 2² = 20
5 << 3 = 5 × 2³ = 40
1 << k = 2^k  ← THIS is the most important one!
```

> **`1 << k` gives you 2^k.** This is how you build bit masks.

### Fast interview shortcut

> `n << k` → multiply n by 2^k

> `1 << k` → the number with ONLY bit k set = 2^k

### How do I recognize it in a problem?

- You need `2^k` as a value
- Building a bitmask for bit k
- Multiplying by powers of 2

### Example 1 — Generate 2^k
```javascript
1 << 0  // = 1
1 << 1  // = 2
1 << 2  // = 4
1 << 3  // = 8
1 << k  // = 2^k
```

### Example 2 — Set bit k
```javascript
mask = 1 << k  // Only bit k is ON
n | mask        // Turns bit k ON in n
```

### Example 3 — Iterate subsets
```javascript
// For n items, iterate all 2^n subsets
for (let mask = 0; mask < (1 << n); mask++) {
  // mask represents one subset
}
```

### Common mistakes
- Left shifting a 32-bit integer beyond 31 → overflow in JavaScript
- `1 << 31` in JavaScript is a negative number (signed 32-bit!)
- Use `1 << k` only for k < 31 in regular JS; for larger, use BigInt

### JavaScript syntax
```javascript
const result = n << k;
const powerOf2 = 1 << k;  // = 2^k
```

---

## OPERATOR: `>>` (Signed Right Shift)

---

### What does it mean in plain English?

`>>` moves all bits to the **right** by some number of positions.
For positive numbers: empty spaces on the left are filled with `0`.
For negative numbers: filled with `1` (preserves the sign).

### What happens at bit level?

```
20 = 00010100
20 >> 1 = 00001010 = 10
20 >> 2 = 00000101 = 5
20 >> 3 = 00000010 = 2  (bits dropped off the right)
```

### Mathematical interpretation

`n >> k` is equivalent to `Math.floor(n / 2^k)`.

```
20 >> 1 = floor(20 / 2) = 10
20 >> 2 = floor(20 / 4) = 5
20 >> 3 = floor(20 / 8) = 2   (21 / 8 = 2.5 → 2)
7  >> 1 = floor(7 / 2)  = 3
```

### Fast interview shortcut

> `n >> k` → divide n by 2^k and floor it

> `n >> 1` → fast integer division by 2 (often used in binary search midpoint)

### Example — Binary search midpoint
```javascript
const mid = (left + right) >> 1;  // Same as Math.floor((left + right) / 2)
// But use Math.floor((left + right) / 2) for readability in interviews!
```

### Common mistakes
- `>>` preserves the sign bit for negative numbers
- `-8 >> 1` = `-4` (correct floor division)
- Use `>>>` (unsigned right shift) to treat the number as unsigned

### JavaScript syntax
```javascript
const result = n >> k;
```

---

## OPERATOR: `>>>` (Unsigned Right Shift — JavaScript-specific)

---

### What does it mean in plain English?

Like `>>` but ALWAYS fills left with `0` regardless of sign.

### When is it useful?

When you want to treat JavaScript's 32-bit integer as **unsigned** (no negative numbers).

```javascript
-1 >> 0   // = -1  (signed shift, stays negative)
-1 >>> 0  // = 4294967295  (interpreted as unsigned 32-bit max)
```

### Common interview use
```javascript
// Safe midpoint calculation to avoid overflow (more relevant in Java/C++)
const mid = (left + right) >>> 1;
```

### DSA problems where it appears
- Rarely needed in typical JS interviews
- Sometimes seen in problems dealing with unsigned 32-bit integers

---

# PART 3 — MATHEMATICAL INTERPRETATION OF BIT OPERATIONS
## *The Section That Will Transform How You Read Code*

This is the section that solves your `n & 2` confusion. By the end of this, you will be able to look at any common bit operation and immediately know what it means mathematically — **without converting to binary**.

---

## 3.1 The Key Insight: AND with a power of 2 checks a single bit

When you write `n & 2^k`, you are asking:

> **"Is bit k set in n?"**

The result is either `0` (bit not set) or `2^k` (bit is set).

**It is never just `0` or `1`. It is `0` or the mask value itself.**

---

## 3.2 Understanding `n & 1`

```
n & 1
```

- **Bit meaning:** "Is bit 0 (the rightmost bit) set?"
- **Mathematical meaning:** "Is n odd?"
- **Why?** Odd numbers always have bit 0 set. Even numbers don't.
- **Equivalent:** `n % 2`

| n  | Binary | n & 1 | Meaning |
|----|--------|-------|---------|
| 0  | 000    | 0     | even    |
| 1  | 001    | 1     | odd     |
| 2  | 010    | 0     | even    |
| 3  | 011    | 1     | odd     |
| 4  | 100    | 0     | even    |
| 5  | 101    | 1     | odd     |
| 6  | 110    | 0     | even    |
| 7  | 111    | 1     | odd     |

> **Mental shortcut:** `n & 1` → "Is n odd?" Same as `n % 2 !== 0`

---

## 3.3 Understanding `n & 2` — Your Original Question

```
n & 2
```

`2` in binary is `010`. So this checks **bit 1**.

The result is either `0` or `2`.

**Mathematical connection:** This depends on `n % 4`.

Why `% 4`? Because bits 0 and 1 together represent the lower 2 bits, and 2² = 4. So the pattern of bits 0-1 repeats every 4 numbers.

Let's trace through:

| n  | Binary | n % 4 | Bit 1 (the `2` bit) | n & 2 |
|----|--------|-------|---------------------|-------|
| 0  | 000    | 0     | 0                   | 0     |
| 1  | 001    | 1     | 0                   | 0     |
| 2  | 010    | 2     | 1                   | 2     |
| 3  | 011    | 3     | 1                   | 2     |
| 4  | 100    | 0     | 0                   | 0     |
| 5  | 101    | 1     | 0                   | 0     |
| 6  | 110    | 2     | 1                   | 2     |
| 7  | 111    | 3     | 1                   | 2     |
| 8  | 1000   | 0     | 0                   | 0     |
| 9  | 1001   | 1     | 0                   | 0     |
| 10 | 1010   | 2     | 1                   | 2     |
| 11 | 1011   | 3     | 1                   | 2     |

**The pattern:**
- `n % 4 === 0` → `n & 2 = 0` (bit 1 is off)
- `n % 4 === 1` → `n & 2 = 0` (bit 1 is off)
- `n % 4 === 2` → `n & 2 = 2` (bit 1 is on)
- `n % 4 === 3` → `n & 2 = 2` (bit 1 is on)

**Simplified:** `n & 2` is nonzero when `n % 4 >= 2`, i.e., when the "2s place" in the lower bits is occupied.

Another way to think about it:
> `n & 2` tells you whether **bit 1** is set.
> Bit 1 is set when `Math.floor(n / 2) % 2 === 1`.

**General formula:** `n & 2^k` is nonzero when `Math.floor(n / 2^k) % 2 === 1`.

---

## 3.4 Generalizing: `n & 2^k`

```
n & 2^k  =  check whether bit k is set in n
```

**Mathematical equivalent:**
```
Math.floor(n / 2^k) % 2 === 1
```

**Why?** When you divide n by 2^k and take the floor, you shift the binary representation right by k positions. The rightmost bit of the result is bit k of the original number. Then `% 2` checks if that bit is 1.

**Examples:**
```
n & 1  → Math.floor(n / 1) % 2  = n % 2         (check bit 0)
n & 2  → Math.floor(n / 2) % 2                   (check bit 1)
n & 4  → Math.floor(n / 4) % 2                   (check bit 2)
n & 8  → Math.floor(n / 8) % 2                   (check bit 3)
```

> **Interview shortcut:** When you see `n & someNumber`, and `someNumber` is a power of 2, you're checking a single bit. You don't need to think in binary — just know which bit and whether it's set.

---

## 3.5 Understanding `n & (2^k - 1)` — The Modulo Mask

This is one of the most powerful patterns in interview programming.

```
n & (2^k - 1)  =  n % 2^k
```

**Why?** `2^k - 1` in binary is all 1s in the lower k positions:
```
2^1 - 1 = 1  = 0001   (1 bit)
2^2 - 1 = 3  = 0011   (2 bits)
2^3 - 1 = 7  = 0111   (3 bits)
2^4 - 1 = 15 = 1111   (4 bits)
```

When you AND with this mask, you **keep only the lower k bits** and zero out everything above. That's exactly what `% 2^k` does!

**Examples:**
```
n & 1   = n % 2      (keep 1 bit)
n & 3   = n % 4      (keep 2 bits)
n & 7   = n % 8      (keep 3 bits)
n & 15  = n % 16     (keep 4 bits)
n & 31  = n % 32     (keep 5 bits)
n & 63  = n % 64     (keep 6 bits)
n & 255 = n % 256    (keep 8 bits)
```

> **Mental shortcut:** See a number that's all 1s in binary? (1, 3, 7, 15, 31, 63...) That's a modulo mask!

---

## 3.6 Understanding `n & -n` — The Isolate Lowest Set Bit Trick

This is a magical trick and one of the most confusing at first glance.

```
n & -n  =  isolate the lowest set bit of n
```

**Why does `-n` work?**

In two's complement (how computers store negative numbers):
- To negate a number: **flip all bits and add 1**

Let's trace `n = 12` (binary: `1100`):
```
n  = 0...01100
-n = 1...10100  (flip all bits → 0...10011, then add 1 → 0...10100)
```

Wait, let me be more careful:
```
n  = ...0001100
~n = ...1110011   (flip all bits)
-n = ~n + 1 = ...1110100   (add 1)
```

Now `n & -n`:
```
n  = ...0001100
-n = ...1110100
-----------
    = ...0000100 = 4   (the lowest set bit of 12!)
```

**Verification:**
- 12 = 1100 in binary
- Lowest set bit is bit 2 (the rightmost `1`) = 4
- 12 & -12 = 4 ✓

**More examples:**
```
n = 6  = 0110 → n & -n = 0010 = 2   (lowest set bit is bit 1)
n = 8  = 1000 → n & -n = 1000 = 8   (only bit 3 is set)
n = 10 = 1010 → n & -n = 0010 = 2   (lowest set bit is bit 1)
n = 7  = 0111 → n & -n = 0001 = 1   (lowest set bit is bit 0)
```

> **Mental shortcut:** `n & -n` → "Give me the rightmost 1 bit as a power of 2"

---

## 3.7 The Master Table — Bit Operations as Math

| Bit operation | What it does | Mathematical interpretation | Fast mental shortcut |
|---------------|-------------|----------------------------|----------------------|
| `n & 1` | Check bit 0 | `n % 2` | Is n odd? |
| `n & 2` | Check bit 1 | `Math.floor(n/2) % 2` | Is the "2s column" set? |
| `n & 4` | Check bit 2 | `Math.floor(n/4) % 2` | Is the "4s column" set? |
| `n & 8` | Check bit 3 | `Math.floor(n/8) % 2` | Is the "8s column" set? |
| `n & 2^k` | Check bit k | `Math.floor(n/2^k) % 2` | Is bit k set? |
| `n & (2^k - 1)` | Lower k bits | `n % 2^k` | Remainder when dividing by 2^k |
| `n & (n-1)` | Clear lowest set bit | n without its rightmost 1 | Pop the lowest 1 bit |
| `n & -n` | Isolate lowest set bit | Rightmost 1 as a power of 2 | Extract lowest 1 bit |
| `n | 2^k` | Set bit k | Force bit k to 1 | Turn bit k on |
| `n ^ 2^k` | Toggle bit k | Flip bit k | Flip bit k |
| `n ^ n` | Cancel n | 0 | Same XOR same = 0 |
| `n ^ 0` | Identity | n | XOR with 0 = unchanged |
| `n << k` | Shift left k | `n * 2^k` | Multiply by 2^k |
| `n >> k` | Shift right k | `Math.floor(n / 2^k)` | Divide by 2^k |

---

# PART 4 — THE MOST IMPORTANT BIT TRICKS
## *Must-Know for Every Interview*

---

## Trick 1: Check Odd or Even

**Problem it solves:** Quickly determine if a number is odd or even.

**Recognition pattern:** Any problem asking "is n even?", "iterate only odd indices", "treat odd and even differently".

**The trick:**
```javascript
// Odd: last bit is 1
// Even: last bit is 0
const isOdd = (n & 1) === 1;
const isEven = (n & 1) === 0;
```

**Why it works:**
Every odd number in binary ends in `1` (bit 0 is set).
Every even number in binary ends in `0` (bit 0 is clear).
ANDing with `1` (which is `...0001`) isolates only bit 0.

**Example:**
```
7 = 0111 → 7 & 1 = 1 → odd
8 = 1000 → 8 & 1 = 0 → even
```

**Time complexity:** O(1)
**Space complexity:** O(1)

**Typical interview question:** "Without using %, determine if a number is odd."

**⚡ When I see this, think:** "Last bit = odd/even"

---

## Trick 2: Check if a Number is a Power of 2

**Problem it solves:** Determine if n = 2^k for some integer k ≥ 0.

**Recognition pattern:** "Is n a power of 2?", optimization involving binary splitting.

**The trick:**
```javascript
function isPowerOf2(n) {
  return n > 0 && (n & (n - 1)) === 0;
}
```

**Why it works:**

Powers of 2 have **exactly one bit set** in binary:
```
1  = 0001
2  = 0010
4  = 0100
8  = 1000
```

When you subtract 1 from a power of 2, that one bit becomes 0 and all lower bits become 1:
```
8  = 1000
7  = 0111
8 & 7 = 0000   ← always 0 for powers of 2!
```

For non-powers:
```
6  = 0110
5  = 0101
6 & 5 = 0100 ≠ 0   ← not a power of 2
```

**Examples:**
```
isPowerOf2(1)  = 1 > 0 && (1 & 0) = 0 → true
isPowerOf2(2)  = 2 > 0 && (2 & 1) = 0 → true
isPowerOf2(4)  = 4 > 0 && (4 & 3) = 0 → true
isPowerOf2(6)  = 6 > 0 && (6 & 5) = 4 → false
isPowerOf2(0)  = 0 > 0 → false (0 is not 2^k)
```

**Time complexity:** O(1)
**Space complexity:** O(1)

**Typical interview question:** LeetCode 231 — Power of Two

**⚡ When I see "power of 2", think:** `n & (n-1) === 0`

---

## Trick 3: Remove (Clear) the Lowest Set Bit

**Problem it solves:** Remove the rightmost `1` bit from n.

**The trick:**
```javascript
n & (n - 1)
```

**Why it works:**

`n - 1` flips all the bits from the rightmost `1` downward:
```
n     = ...1010 1000   (example)
n-1   = ...1010 0111   (the 1 bit and everything below flipped)
n & (n-1) = ...1010 0000  (the lowest set bit and below are all 0)
```

So this removes exactly the lowest set bit.

**Example with n = 12:**
```
12 = 1100
11 = 1011
12 & 11 = 1000 = 8   (removed the lowest set bit at position 2)
```

**Example with n = 10:**
```
10 = 1010
9  = 1001
10 & 9 = 1000 = 8   (removed bit 1)
```

**Use case — Count set bits (Brian Kernighan's algorithm):**
```javascript
function countSetBits(n) {
  let count = 0;
  while (n !== 0) {
    n = n & (n - 1);  // Remove one set bit each time
    count++;
  }
  return count;
}
// Each iteration removes one 1 bit → runs exactly as many times as there are 1 bits
// Time: O(number of set bits) which is at most O(log n)
```

**⚡ When I see "count set bits" or "iterate over set bits", think:** `n & (n-1)` in a loop

---

## Trick 4: Extract the Lowest Set Bit

**Problem it solves:** Get the value of only the rightmost `1` bit.

**The trick:**
```javascript
n & -n
// or equivalently:
n & (~n + 1)
```

**Why it works:** Explained in detail in Part 3.6.

**Example:**
```
n = 12 = 1100
n & -n = 0100 = 4   (the lowest set bit of 12)

n = 10 = 1010
n & -n = 0010 = 2
```

**Use case:** Finding the lowest set bit is useful in:
- Fenwick Trees (Binary Indexed Trees)
- Determining which power of 2 divides n exactly

**⚡ When I see "lowest set bit" or "rightmost 1 bit", think:** `n & -n`

---

## Trick 5: Check Whether a Particular Bit k is Set

**Problem it solves:** Is bit k (0-indexed from right) set in n?

**The trick:**
```javascript
function isBitSet(n, k) {
  return (n & (1 << k)) !== 0;
  // or equivalently:
  return ((n >> k) & 1) === 1;
}
```

**Why it works:**
- `1 << k` creates a number with ONLY bit k set
- `n & (1 << k)` is nonzero only if bit k is also set in n

**Examples:**
```javascript
isBitSet(6, 1)  // 6 = 110, bit 1 is set → true
// 1 << 1 = 010
// 6 & 2 = 110 & 010 = 010 ≠ 0 → true

isBitSet(6, 0)  // 6 = 110, bit 0 is NOT set → false
// 1 << 0 = 001
// 6 & 1 = 110 & 001 = 000 → false

isBitSet(13, 2) // 13 = 1101, bit 2 IS set → true
// 1 << 2 = 0100
// 13 & 4 = 1101 & 0100 = 0100 ≠ 0 → true
```

**⚡ When I see "is bit k set", think:** `(n >> k) & 1`

---

## Trick 6: Set a Bit (Turn a Bit ON)

**Problem it solves:** Force bit k to be 1, regardless of its current value.

**The trick:**
```javascript
function setBit(n, k) {
  return n | (1 << k);
}
```

**Why it works:**
- `1 << k` has only bit k set
- OR sets bit k to 1 while leaving all other bits unchanged

**Example:**
```
n = 5 = 0101, set bit 3
1 << 3 = 1000
5 | 8 = 0101 | 1000 = 1101 = 13
```

---

## Trick 7: Clear a Bit (Turn a Bit OFF)

**Problem it solves:** Force bit k to be 0, regardless of its current value.

**The trick:**
```javascript
function clearBit(n, k) {
  return n & ~(1 << k);
}
```

**Why it works:**
- `1 << k` has only bit k set
- `~(1 << k)` has all bits set EXCEPT bit k
- AND with this mask preserves all bits except bit k, which becomes 0

**Example:**
```
n = 13 = 1101, clear bit 2
1 << 2 = 0100
~(1 << 2) = ...11111011  (all 1s except bit 2)
13 & ~4 = 1101 & 1011 = 1001 = 9
```

---

## Trick 8: Toggle a Bit (Flip a Bit)

**Problem it solves:** Flip bit k (0 becomes 1, 1 becomes 0).

**The trick:**
```javascript
function toggleBit(n, k) {
  return n ^ (1 << k);
}
```

**Why it works:**
- XOR with 1 flips a bit (0^1=1, 1^1=0)
- XOR with 0 preserves a bit (0^0=0, 1^0=1)
- `1 << k` targets only bit k

**Example:**
```
n = 13 = 1101, toggle bit 1
1 << 1 = 0010
13 ^ 2 = 1101 ^ 0010 = 1111 = 15  (bit 1 was 0 → becomes 1)

n = 15 = 1111, toggle bit 1
15 ^ 2 = 1111 ^ 0010 = 1101 = 13  (bit 1 was 1 → becomes 0)
```

---

## Trick 9: Count Set Bits (Hamming Weight / popcount)

**Three approaches:**

**Approach 1 — Brian Kernighan (most elegant):**
```javascript
function countBits(n) {
  let count = 0;
  while (n !== 0) {
    n = n & (n - 1);  // Remove lowest set bit
    count++;
  }
  return count;
}
// Time: O(number of set bits), at most O(log n)
```

**Approach 2 — Shift and check (simple):**
```javascript
function countBits(n) {
  let count = 0;
  while (n !== 0) {
    count += (n & 1);  // Check if last bit is 1
    n >>= 1;           // Shift right
  }
  return count;
}
// Time: O(log n) — always iterates through all bits
```

**Approach 3 — Built-in (if allowed):**
```javascript
// JavaScript doesn't have popcount directly, but you can use:
function countBits(n) {
  return n.toString(2).split('').filter(b => b === '1').length;
}
```

**Typical interview question:** LeetCode 191 — Number of 1 Bits

**⚡ When I see "count set bits", think:** Brian Kernighan → `n &= (n-1)` in loop

---

## Trick 10: Check if Two Numbers Have Different Bits

**Problem it solves:** Find which bits differ between a and b.

**The trick:**
```javascript
const diff = a ^ b;
// diff has 1s where a and b differ, 0s where they're the same
// count set bits in diff to find number of differing positions
```

**Example:**
```
a = 5 = 0101
b = 3 = 0011
a ^ b = 0110 = 6
// Bits 1 and 2 differ between 5 and 3
```

**Typical interview question:** "Find Hamming distance between two integers"

---

## Trick 11: XOR Cancellation

**See Part 5 for full coverage. Quick summary:**

```javascript
a ^ a = 0      // Same thing cancels
a ^ 0 = a      // XOR with 0 is identity
a ^ b ^ a = b  // Cancellation: the two a's cancel
```

---

## Trick 12: Find the Unique Number (XOR)

**Problem:** An array has every number appearing twice except one. Find it.

**The trick:**
```javascript
function findUnique(arr) {
  return arr.reduce((xor, n) => xor ^ n, 0);
}
// Pairs cancel! The unique element remains.
```

*(Full explanation in Part 5)*

---

## Trick 13: Swap Two Numbers Using XOR

**The trick:**
```javascript
a = a ^ b;
b = a ^ b;  // b = (a^b)^b = a^(b^b) = a^0 = a
a = a ^ b;  // a = (a^b)^a = b^(a^a) = b^0 = b
```

**Warning:** Do NOT use this in interviews unless specifically asked.
- It fails when `a` and `b` are the same variable or same memory location
- It's confusing to read
- Modern compilers optimize simple swap just as fast
- The interviewer will ask why not use a temp variable

**✅ Use this instead:**
```javascript
[a, b] = [b, a];  // ES6 destructuring — clear and safe
```

---

## Trick 14: Generate All Subsets Using Bitmask

**Problem it solves:** Generate all subsets of an array of n elements.

**The trick:**
```javascript
function allSubsets(arr) {
  const n = arr.length;
  const subsets = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {  // Is bit i set?
        subset.push(arr[i]);
      }
    }
    subsets.push(subset);
  }
  return subsets;
}
```

**Why it works:**
- There are 2^n subsets of an n-element array
- Each mask from 0 to 2^n - 1 uniquely represents one subset
- Bit i set in mask → element i is in this subset

**Example with [a, b, c]:**
```
mask = 000 (0) → {} (empty)
mask = 001 (1) → {a}
mask = 010 (2) → {b}
mask = 011 (3) → {a, b}
mask = 100 (4) → {c}
mask = 101 (5) → {a, c}
mask = 110 (6) → {b, c}
mask = 111 (7) → {a, b, c}
```

**Time complexity:** O(2^n × n)
**Space complexity:** O(2^n)

**⚡ When I see "all subsets" for small n (n ≤ 20), think:** bitmask enumeration

---

## Trick 15: Bitmask as a Set / Track Boolean States

**Problem it solves:** Track which of n boolean items are "on" using a single integer.

**The idea:**
```javascript
// Represent a set of n items using an integer
let state = 0;              // Empty set

state |= (1 << i);          // Add item i
state &= ~(1 << i);         // Remove item i
state ^= (1 << i);          // Toggle item i
const has = (state >> i) & 1; // Check if item i is in set
```

**Example — Track visited nodes:**
```javascript
let visited = 0;
visited |= (1 << node);           // Mark node as visited
const isVisited = (visited >> node) & 1;  // Check if visited
```

**⚡ When I see "track multiple boolean flags", think:** single integer bitmask

---

## Trick 16: Fast Multiplication and Division by Powers of 2

**The tricks:**
```javascript
n << k   // = n * 2^k  (fast multiply)
n >> k   // = Math.floor(n / 2^k)  (fast divide)
```

**Examples:**
```javascript
n << 1  // = n * 2
n << 2  // = n * 4
n << 3  // = n * 8
n >> 1  // = floor(n / 2)
n >> 2  // = floor(n / 4)
```

**When to use in interviews:**
- Computing midpoints: `mid = (lo + hi) >> 1`
- Segment trees, binary heap calculations
- When the problem naturally involves powers of 2

**When NOT to use:**
- General multiplication/division — write `n * 4` or `n / 4` for clarity
- Negative numbers with `>>` (rounds toward -∞, not toward 0)

---

## Trick 17: XOR from 1 to n (Constant Time!)

**The trick:**
```javascript
function xorUpTo(n) {
  switch (n % 4) {
    case 0: return n;
    case 1: return 1;
    case 2: return n + 1;
    case 3: return 0;
  }
}
// XOR of 1 ^ 2 ^ 3 ^ ... ^ n
```

**Why this pattern exists:** XOR of 1..n has a repeating pattern every 4 numbers:
```
n=1: 1
n=2: 1^2 = 3
n=3: 1^2^3 = 0
n=4: 1^2^3^4 = 4
n=5: 4^5 = 1   (same as n=1's pattern: n)
```
Pattern repeats: n, 1, n+1, 0, n, 1, n+1, 0, ...

**Use case:** "Find missing number in 1..n" → XOR 0..n with all elements.

---

## Trick 18: Number of Bits to Represent n

```javascript
Math.floor(Math.log2(n)) + 1
// Or using bit trick:
32 - Math.clz32(n)  // clz32 = count leading zeros in 32-bit
```

**Why it matters:** Tells you which bit position the highest bit occupies.

---

# PART 5 — XOR: CRYSTAL CLEAR
## *The Most Powerful Tool in Your Bit Toolkit*

---

## 5.1 The XOR Truth Table

```
0 ^ 0 = 0   (same → 0)
0 ^ 1 = 1   (different → 1)
1 ^ 0 = 1   (different → 1)
1 ^ 1 = 0   (same → 0)
```

**Plain English:** XOR returns 1 when the bits are **different**, 0 when **same**.

Think of it as: **"Toggle"** or **"Differ"**

---

## 5.2 XOR Properties — With Real Numbers

### Property 1: `a ^ 0 = a` (Identity)

XOR with zero changes nothing.

```
5 ^ 0:
5 = 101
0 = 000
    ---
    101 = 5    ← unchanged
```

**Intuition:** XOR with 0 means "compare with nothing" → no changes.

### Property 2: `a ^ a = 0` (Self-inverse)

Any number XOR'd with itself is 0.

```
7 ^ 7:
7 = 111
7 = 111
    ---
    000 = 0    ← completely cancelled
```

**Intuition:** Every bit position has the same value → every result is 0 (same → 0).

### Property 3: `a ^ b ^ a = b` (Cancellation)

This is the magic property. It combines the two above.

```
Let a = 5, b = 3:
a ^ b = 5 ^ 3:
  5 = 101
  3 = 011
      ---
      110 = 6

(a ^ b) ^ a = 6 ^ 5:
  6 = 110
  5 = 101
      ---
      011 = 3 = b   ← b survived!
```

**Why?** XOR is commutative (`a^b = b^a`) and associative (`(a^b)^c = a^(b^c)`).

So: `a ^ b ^ a = a ^ a ^ b = 0 ^ b = b`

**Intuition:** The two copies of `a` cancel each other out, leaving only `b`.

---

## 5.3 Step-by-Step: Finding the Unique Number

**Problem:** `[2, 3, 4, 3, 2]` — every number appears twice except one. Find it.

**Solution:** XOR all numbers together.

**Let's trace every step:**

Start with `xor = 0`

```
Step 1: xor = 0 ^ 2 = 2
  0 = 000
  2 = 010
      ---
      010 = 2

Step 2: xor = 2 ^ 3 = 1
  2 = 010
  3 = 011
      ---
      001 = 1

Step 3: xor = 1 ^ 4 = 5
  1 = 001
  4 = 100
      ---
      101 = 5

Step 4: xor = 5 ^ 3 = 6
  5 = 101
  3 = 011
      ---
      110 = 6

Step 5: xor = 6 ^ 2 = 4
  6 = 110
  2 = 010
      ---
      100 = 4   ← ANSWER!
```

**Why did this work?**

Think of it this way:
- `2 ^ 2 = 0` (the two 2s cancelled)
- `3 ^ 3 = 0` (the two 3s cancelled)
- Only `4` had no partner → it survived

XOR all elements = `2 ^ 3 ^ 4 ^ 3 ^ 2`
= `(2 ^ 2) ^ (3 ^ 3) ^ 4`  (reorder using commutativity)
= `0 ^ 0 ^ 4`
= `4`

**Code:**
```javascript
function findUnique(arr) {
  return arr.reduce((xor, n) => xor ^ n, 0);
}
// Time: O(n), Space: O(1)
```

---

## 5.4 Missing Number Using XOR

**Problem:** Array has numbers 0..n but one is missing. Find it.

**Approach:**
XOR all indices (0 to n) with all array elements. Pairs cancel. Missing number remains.

```javascript
function missingNumber(nums) {
  let result = nums.length;  // Start with n
  for (let i = 0; i < nums.length; i++) {
    result ^= i ^ nums[i];
  }
  return result;
}
```

**Trace for `[3, 0, 1]`, n=3:**
```
result = 3
i=0: result = 3 ^ 0 ^ 3 = 0   (3^3 cancels, 0 remains: result=0^0=0)
i=1: result = 0 ^ 1 ^ 0 = 1
i=2: result = 1 ^ 2 ^ 1 = 2   ← Answer!
```

Missing number is `2`. ✓

---

## 5.5 Finding TWO Unique Numbers

**Problem:** Array has every number twice except TWO numbers appear once. Find both.

This is trickier. XOR-ing everything gives `a ^ b` (the XOR of the two unique numbers).

**Key insight:** `a ^ b` has a `1` in every bit where `a` and `b` differ.

**Algorithm:**
1. XOR all → get `a ^ b`
2. Find any bit that is 1 in `a ^ b` (they differ here) — call it bit k
3. Partition all numbers by whether bit k is set
4. XOR each partition → one gives `a`, other gives `b`

```javascript
function findTwoUnique(nums) {
  // Step 1: XOR everything
  let xorAll = 0;
  for (const n of nums) xorAll ^= n;
  // xorAll = a ^ b

  // Step 2: Find a bit where they differ (any set bit in xorAll)
  const diffBit = xorAll & -xorAll;  // isolate lowest set bit

  // Step 3: Partition and XOR each group
  let a = 0, b = 0;
  for (const n of nums) {
    if (n & diffBit) {
      a ^= n;  // numbers with this bit set
    } else {
      b ^= n;  // numbers without this bit
    }
  }
  return [a, b];
}
// Time: O(n), Space: O(1)
```

---

## 5.6 When XOR is NOT Useful

- When numbers don't have a "pair" structure
- When counting occurrences that are multiples ≠ 2 (e.g., every number appears 3 times — use bit counting per position instead)
- When you need to identify more than 2 unique elements without extra logic
- When dealing with floating-point numbers (XOR is integer-only)
- Anytime readability is more important than the trick (which is often)

---

## 5.7 XOR Prefix / Subarray XOR

**Useful pattern:** XOR of a subarray `arr[l..r]` = `prefix[r] ^ prefix[l-1]`

where `prefix[i] = arr[0] ^ arr[1] ^ ... ^ arr[i]`

**Why?** Because `prefix[r] = prefix[l-1] ^ arr[l] ^ ... ^ arr[r]`

So `prefix[r] ^ prefix[l-1] = arr[l] ^ ... ^ arr[r]` (the prefix part cancels!)

---

# PART 6 — MODULO + BIT CONNECTION
## *Why Powers of 2 and Remainder Are The Same Thing*

---

## 6.1 The Core Relationship

The most important bit trick you'll use daily is:

```
n & (2^k - 1)  ≡  n % 2^k
```

These are **exactly equivalent** for non-negative integers.

Let's understand WHY deeply.

---

## 6.2 Binary and Place Values

Think about how decimal division works:

`137 % 10 = 7` — you just look at the last digit.

`137 % 100 = 37` — you look at the last two digits.

**Binary works the same way, but with powers of 2:**

`n % 2 = last bit of n`

`n % 4 = last 2 bits of n`

`n % 8 = last 3 bits of n`

`n % 16 = last 4 bits of n`

And looking at the "last k bits" is exactly what `& (2^k - 1)` does!

---

## 6.3 Why `2^k - 1` Gives You the Lower Bits

`2^k` in binary = `1` followed by k zeros:
```
2^1 = 10      (1 zero)
2^2 = 100     (2 zeros)
2^3 = 1000    (3 zeros)
2^4 = 10000   (4 zeros)
```

`2^k - 1` in binary = k ones:
```
2^1 - 1 = 01     (1 one)
2^2 - 1 = 011    (2 ones)
2^3 - 1 = 0111   (3 ones)
2^4 - 1 = 01111  (4 ones)
```

When you AND any number with `k` ones, you **keep only the lower k bits** (everything above becomes 0).

That's the remainder when you divide by 2^k!

---

## 6.4 Worked Examples

### Example: 13 % 8 = 13 & 7

```
13 in binary: 1101
 7 in binary: 0111
13 & 7       = 0101 = 5

Check: 13 % 8 = 13 - 8 = 5 ✓

Visual:
13 = 1 × 8  +  1 × 4  +  0 × 2  +  1 × 1
              └──────────────────────────┘
                      lower 3 bits = 5
```

The `8` bit is stripped by the mask. What remains is `5`.

### Example: 29 % 16 = 29 & 15

```
29 in binary: 11101
15 in binary: 01111
29 & 15      = 01101 = 13

Check: 29 % 16 = 29 - 16 = 13 ✓

Visual:
29 = 1 × 16  +  1 × 8  +  1 × 4  +  0 × 2  +  1 × 1
               └───────────────────────────────────┘
                             lower 4 bits = 13
```

### Example: 100 % 32 = 100 & 31

```
100 = 1100100
 31 = 0011111
100 & 31 = 0000100 = 4

Check: 100 % 32 = 100 - 96 = 4 ✓ (96 = 32×3)
```

### Example: 255 % 256 = 255 & 255

```
255 & 255 = 255   (trivially)
255 % 256 = 255 ✓  (255 < 256)
```

---

## 6.5 The Lookup Table You Should Memorize

| Bit mask | Binary | Equivalent modulo | Example |
|----------|--------|-------------------|---------|
| `n & 1`  | `...001` | `n % 2` | `7 & 1 = 1` = `7 % 2 = 1` |
| `n & 3`  | `...011` | `n % 4` | `7 & 3 = 3` = `7 % 4 = 3` |
| `n & 7`  | `...0111` | `n % 8` | `13 & 7 = 5` = `13 % 8 = 5` |
| `n & 15` | `...01111` | `n % 16` | `29 & 15 = 13` = `29 % 16 = 13` |
| `n & 31` | `...011111` | `n % 32` | `50 & 31 = 18` = `50 % 32 = 18` |
| `n & 63` | `...0111111` | `n % 64` | `100 & 63 = 36` = `100 % 64 = 36` |
| `n & 255`| all 8 ones | `n % 256` | lower byte |

**The pattern:** `2^k - 1` is written as `k` consecutive ones in binary.

---

## 6.6 Why This Matters in Interviews

**Hashing:** Hash tables often have power-of-2 capacity, so `hash % capacity = hash & (capacity - 1)` → O(1) with no division.

**Circular buffers:** `index % bufferSize` where bufferSize is a power of 2 → use `index & (bufferSize - 1)`.

**Bit cycling:** Many bitmask problems involve working with lower k bits.

---

# PART 7 — LEFT SHIFT / RIGHT SHIFT
## *Multiplication and Division by Powers of 2*

---

## 7.1 Left Shift `<<`

**Visual:**

```
n = 5 = 00000101

n << 1:  00001010 = 10   (shift all bits left by 1, add 0 on right)
n << 2:  00010100 = 20   (shift left by 2, add 00 on right)
n << 3:  00101000 = 40   (shift left by 3, add 000 on right)
n << 4:  01010000 = 80   (shift left by 4, add 0000 on right)
```

**Mathematical rule:** `n << k = n × 2^k`

```
5 << 1 = 5 × 2  = 10
5 << 2 = 5 × 4  = 20
5 << 3 = 5 × 8  = 40
5 << 4 = 5 × 16 = 80
```

**Most useful form:** `1 << k = 2^k`

```
1 << 0 = 1
1 << 1 = 2
1 << 2 = 4
1 << 3 = 8
1 << 4 = 16
1 << 10 = 1024
```

**⚡ Interview use:** Building masks, generating powers of 2, bitmask enumeration.

---

## 7.2 Right Shift `>>`

**Visual:**

```
n = 40 = 00101000

n >> 1:  00010100 = 20   (shift right by 1, lose rightmost bit)
n >> 2:  00001010 = 10
n >> 3:  00000101 = 5
n >> 4:  00000010 = 2
n >> 5:  00000001 = 1
n >> 6:  00000000 = 0
```

**Mathematical rule:** `n >> k = Math.floor(n / 2^k)`

```
40 >> 1 = floor(40/2)  = 20
40 >> 2 = floor(40/4)  = 10
40 >> 3 = floor(40/8)  = 5
7  >> 1 = floor(7/2)   = 3   (rounds DOWN)
7  >> 2 = floor(7/4)   = 1
```

---

## 7.3 Important Caveats

### Negative numbers and `>>`
```javascript
// JavaScript's >> preserves sign bit
-8 >> 1  // = -4  (correct floor division)
-7 >> 1  // = -4  (floor(-7/2) = -4, not -3)

// Use >>> for unsigned behavior
-1 >>> 0  // = 4294967295  (max unsigned 32-bit)
```

### Overflow with `<<`
```javascript
// In JavaScript, << operates on 32-bit signed integers
1 << 30  // = 1073741824  ✓
1 << 31  // = -2147483648  (negative! sign bit gets set)
1 << 32  // = 1  (overflow wraps, same as 1 << 0)

// For large shifts, use BigInt or be careful
```

---

## 7.4 When To Use Shifts vs. Arithmetic

**Use shifts:**
- Building bitmasks: `1 << k`
- When the problem is clearly about binary structure
- In tight loops where performance is genuinely critical

**Use arithmetic:**
- When the intent is multiplication/division
- In interviews where readability is important
- When negative numbers are involved

```javascript
// Readable (preferred in most interviews):
const mid = Math.floor((left + right) / 2);

// Also acceptable (common in algorithms):
const mid = (left + right) >> 1;

// Both are fine. The shift is marginally faster but negligibly so in JS.
```

---

# PART 8 — MATHEMATICAL SHORTCUTS
## *The Non-Bit Math You Also Need*

---

## 8.1 Powers of 2 — Must Memorize

```
2^0  = 1
2^1  = 2
2^2  = 4
2^3  = 8
2^4  = 16
2^5  = 32
2^6  = 64
2^7  = 128
2^8  = 256
2^9  = 512
2^10 = 1024        (~1K)
2^16 = 65,536      (~64K)
2^20 = 1,048,576   (~1M)
2^30 = 1,073,741,824  (~1B)
2^31 = 2,147,483,648  (max signed 32-bit + 1)
2^32 = 4,294,967,296  (max unsigned 32-bit + 1)
```

**⚡ Recognition:** If a constraint is ~10^9, that's close to 2^30. Array sizes near 10^6 → 2^20.

---

## 8.2 Logarithms

**log₂(n)** = number of times you can halve n before reaching 1.

**Interview uses:**
- "How many bits to represent n?" → `floor(log₂(n)) + 1`
- Binary search → O(log n) = O(log₂ n)
- Balanced BST height → O(log n)
- Heap operations → O(log n)

**Useful identity:** `log₂(n) = log(n) / log(2)` (change of base)

```javascript
const log2n = Math.log2(n);             // Direct
const log2n = Math.log(n) / Math.log(2); // Alternative
const floorLog2 = Math.floor(Math.log2(n));
const ceilLog2 = Math.ceil(Math.log2(n));
```

**⚡ Ceiling log:** Smallest k such that 2^k ≥ n.

**Number of bits to represent n:**
```javascript
Math.floor(Math.log2(n)) + 1  // For n ≥ 1
```

---

## 8.3 GCD — Euclidean Algorithm

**The algorithm:**
```javascript
function gcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}
// Time: O(log(min(a,b)))
```

**Why it works:**
`gcd(a, b) = gcd(b, a % b)` — the GCD doesn't change when you replace the larger number with the remainder.

**Trace for gcd(48, 18):**
```
gcd(48, 18):  a=48, b=18  → 48%18=12
gcd(18, 12):  a=18, b=12  → 18%12=6
gcd(12, 6):   a=12, b=6   → 12%6=0
gcd(6, 0):    return 6   ✓
```

**⚡ Recognition:** "Find GCD", "simplify fractions", "find common divisors count", "LCM"

---

## 8.4 LCM

```javascript
function lcm(a, b) {
  return (a / gcd(a, b)) * b;  // divide first to avoid overflow
}
// Time: O(log(min(a,b)))
```

**Why:** `lcm(a,b) × gcd(a,b) = a × b`

---

## 8.5 Prime Checking

**Naive:** Check divisors up to sqrt(n) → O(√n)

```javascript
function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {  // i*i instead of sqrt
    if (n % i === 0) return false;
  }
  return true;
}
```

**Why i×i instead of sqrt?** Avoids floating-point errors and is slightly faster.

**⚡ Key insight:** If n has a factor larger than √n, it must also have one smaller than √n. So checking up to √n is sufficient.

---

## 8.6 Sieve of Eratosthenes

**Problem:** Find all primes up to n.

```javascript
function sieve(n) {
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let i = 2; i * i <= n; i++) {
    if (isPrime[i]) {
      for (let j = i * i; j <= n; j += i) {
        isPrime[j] = false;
      }
    }
  }
  return isPrime;
}
// Time: O(n log log n)
// Space: O(n)
```

**Why start the inner loop at `i*i`?** All smaller multiples of i were already marked by earlier primes.

---

## 8.7 Square Root Optimization

**Common trick:** Instead of `i <= Math.sqrt(n)`, use `i * i <= n` (avoids floating point, sometimes faster).

```javascript
// Check if n is a perfect square
function isPerfectSquare(n) {
  const s = Math.floor(Math.sqrt(n));
  return s * s === n;
}
```

---

## 8.8 Divisor Pair Trick

**Fact:** Divisors come in pairs (a, b) where a × b = n and a ≤ √n.

So you only need to iterate to √n to find all divisors:

```javascript
function getDivisors(n) {
  const divisors = [];
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i !== n / i) divisors.push(n / i);
    }
  }
  return divisors.sort((a, b) => a - b);
}
// Time: O(√n)
```

---

## 8.9 Sum Formulas

**Sum of first n natural numbers:**
```
1 + 2 + 3 + ... + n = n(n+1)/2
```

**Sum of squares:**
```
1² + 2² + ... + n² = n(n+1)(2n+1)/6
```

**Sum of cubes:**
```
1³ + 2³ + ... + n³ = [n(n+1)/2]²
```

**Arithmetic progression sum:**
```
a + (a+d) + (a+2d) + ... + (a+(n-1)d) = n/2 × (2a + (n-1)d)
                                       = n/2 × (first + last)
```

**Geometric progression sum:**
```
a + ar + ar² + ... + ar^(n-1) = a × (r^n - 1) / (r - 1)    for r ≠ 1
```

**⚡ Recognition:** If a problem asks for sum of a range and the elements follow a pattern, use the formula.

---

## 8.10 Fast Exponentiation (Binary Exponentiation)

**Problem:** Compute a^n efficiently.

**Naive:** O(n) multiplications.
**Fast:** O(log n) multiplications.

**Idea:** Use the binary representation of n.
```
a^13 = a^(1101 in binary)
     = a^8 × a^4 × a^1   (only the set bits)
```

```javascript
function fastPow(base, exp) {
  let result = 1;
  while (exp > 0) {
    if (exp & 1) result *= base;  // If current bit is set, multiply
    base *= base;                  // Square the base
    exp >>= 1;                     // Move to next bit
  }
  return result;
}
// Time: O(log exp)
```

**Modular exponentiation:**
```javascript
function modPow(base, exp, mod) {
  let result = 1;
  base %= mod;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1;
  }
  return result;
}
```

**⚡ Recognition:** "Compute a^n mod p" for large n → fast exponentiation.

---

## 8.11 Prefix Sums

**Core idea:** Precompute cumulative sums so range queries are O(1).

```javascript
// Build prefix sum
const prefix = [0];
for (const x of arr) {
  prefix.push(prefix[prefix.length - 1] + x);
}

// Sum of arr[l..r] (0-indexed, inclusive)
const rangeSum = prefix[r + 1] - prefix[l];
```

**Why it works:** `prefix[r+1] - prefix[l] = arr[l] + arr[l+1] + ... + arr[r]`

**⚡ Recognition:** "Sum of subarray", "range sum query", "sum between indices" → prefix sum

---

## 8.12 Ceiling Division (Very Useful!)

**Problem:** Compute ⌈a/b⌉ using integers.

**The trick:**
```javascript
Math.ceil(a / b)  // Simple but may have floating-point issues for large numbers

// Integer version:
Math.floor((a + b - 1) / b)  // Works for positive a, b
// or:
Math.floor((a - 1) / b) + 1  // Also works
```

**Example:** ⌈7/3⌉ = 3
```
(7 + 3 - 1) / 3 = 9 / 3 = 3 ✓
```

**Why it works:** Adding `b-1` before dividing "rounds up" instead of "rounds down".

**⚡ Recognition:** "Minimum number of groups/pages/blocks of size b to hold a items"

---

## 8.13 Modular Arithmetic Identities

```
(a + b) % m = ((a % m) + (b % m)) % m
(a × b) % m = ((a % m) × (b % m)) % m
(a - b) % m = ((a % m) - (b % m) + m) % m   ← Add m to handle negative!
```

**⚡ Key:** When computing modular results involving subtraction, always add `m` before taking mod to avoid negative values in JavaScript.

---

## 8.14 Fermat's Little Theorem (for Modular Inverse)

If `p` is prime and `a` is not divisible by `p`:
```
a^(p-1) ≡ 1 (mod p)
a^(-1)  ≡ a^(p-2) (mod p)
```

**Use:** Compute `a/b mod p` as `a × b^(p-2) mod p` using fast modular exponentiation.

**⚡ Recognition:** "n choose k mod prime" → need modular inverse.

---

## 8.15 Combinations (nCr)

```javascript
// nCr = n! / (r! × (n-r)!)
// For small n:
function nCr(n, r) {
  if (r > n) return 0;
  if (r === 0 || r === n) return 1;
  r = Math.min(r, n - r);  // Use symmetry: nCr = nC(n-r)
  let result = 1;
  for (let i = 0; i < r; i++) {
    result = result * (n - i) / (i + 1);
  }
  return result;
}

// For large n with modulo:
// Use Pascal's triangle or Fermat's theorem
```

---

## 8.16 Trailing Zeros in n!

**Problem:** How many zeros does n! end in?

```javascript
function trailingZeros(n) {
  let count = 0;
  while (n >= 5) {
    n = Math.floor(n / 5);
    count += n;
  }
  return count;
}
```

**Why?** Trailing zeros come from factors of 10 = 2×5. There are always more 2s than 5s in n!, so count factors of 5.

---

## 8.17 Catalan Numbers (When Actually Useful)

Catalan numbers: 1, 1, 2, 5, 14, 42, 132...

**They count:** valid bracket sequences, BST structures, triangulations.

```
C(n) = C(2n, n) / (n+1) = (2n)! / ((n+1)! × n!)
```

**⚡ Recognition:** "Number of ways to fully parenthesize n+1 factors" or "number of distinct BSTs with n nodes" → Catalan.

---

## 8.18 Difference Arrays

**Use case:** Apply many range increment operations efficiently.

```javascript
// Apply +v to arr[l..r] for many queries, then read final values
const diff = new Array(n + 1).fill(0);

// Add v to range [l, r]:
diff[l] += v;
diff[r + 1] -= v;

// Reconstruct final array:
let running = 0;
for (let i = 0; i < n; i++) {
  running += diff[i];
  arr[i] = running;
}
```

**Time:** O(1) per update, O(n) to reconstruct.

---

## 8.19 Overflow Awareness

**JavaScript:** Numbers are 64-bit floats. Safe integer range: -(2^53 - 1) to (2^53 - 1).

For values beyond this, use **BigInt**:
```javascript
const big = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
```

**Common overflow traps:**
- `(a + b) >> 1` can overflow if a and b are large signed integers in other languages
- In JavaScript: use `a + Math.floor((b - a) / 2)` for safe midpoint
- Factorial computations exceed safe integer very quickly

---

# PART 9 — DSA PATTERN RECOGNITION TABLE
## *See The Problem → Know The Tool*

---

| **Problem Signal / Clue** | **Think About** | **Trick / Tool** | **Why It Works** |
|---------------------------|-----------------|------------------|-----------------|
| "odd or even" | Bit 0 | `n & 1` | Rightmost bit is 0 for even, 1 for odd |
| "one number appears once, rest appear twice" | XOR cancellation | `arr.reduce((x,n) => x^n, 0)` | Pairs cancel via XOR |
| "one number missing from 1..n" | XOR or sum formula | XOR with 1..n, or `n(n+1)/2 - sum` | Missing element remains |
| "is n a power of 2?" | Single set bit | `n > 0 && (n & (n-1)) === 0` | Powers of 2 have one bit |
| "remainder when dividing by 2^k" | Lower bits | `n & (2^k - 1)` | Lower k bits = n mod 2^k |
| "multiply/divide by power of 2" | Shift | `n << k` or `n >> k` | Shift = ×/÷ by 2^k |
| "all subsets of array" | Bitmask | Loop mask 0 to (1<<n)-1 | Each mask = one subset |
| "track visited/used items compactly" | Bitmask as set | Single integer, bit per item | 1 bit = 1 boolean |
| "count set bits in n" | Brian Kernighan | `n &= (n-1)` in loop | Each step removes one 1 |
| "two numbers appear once, rest appear twice" | XOR + partition | XOR all, find diff bit, partition | Two uniques have a differing bit |
| "subarray sum equals target" | Prefix sum | `prefix[r] - prefix[l]` | Subtraction cancels common prefix |
| "number of subarrays with sum = k" | Prefix sum + hashmap | Store prefix counts | If prefix[j]-prefix[i]=k, found! |
| "range sum queries" | Prefix sum | Build once, O(1) queries | Classic prepossessing |
| "repeated large power/exponent" | Fast exponentiation | Binary exponentiation | O(log exp) multiplications |
| "a^n mod prime p" | Modular fast power | `modPow(a, n, p)` | With Fermat: inverse = a^(p-2) |
| "gcd / lcm" | Euclidean | `gcd(a,b)=gcd(b, a%b)` | Classic theorem |
| "primes up to n" | Sieve | Sieve of Eratosthenes | O(n log log n) |
| "is n prime?" | Trial division | Check divisors to √n | Divisors pair up around √n |
| "all divisors of n" | Factor pairs | Loop to √n, emit pairs | Divisors pair around √n |
| "minimum operations with powers of 2" | Binary representation | Look at set bits | Greedy + bits |
| "check if bit k is set" | Bit extraction | `(n >> k) & 1` | Shift k right, check last bit |
| "set bit k" | OR with mask | `n | (1 << k)` | OR turns bit on |
| "clear bit k" | AND with inverted mask | `n & ~(1 << k)` | AND+NOT turns bit off |
| "toggle bit k" | XOR with mask | `n ^ (1 << k)` | XOR flips bit |
| "remove lowest set bit" | n & (n-1) trick | `n & (n-1)` | Clears rightmost 1 |
| "isolate lowest set bit" | n & -n trick | `n & -n` | Two's complement magic |
| "range update, point query" | Difference array | Diff array + prefix sum | O(1) updates |
| "sum of 1..n" | Formula | `n*(n+1)/2` | Arithmetic series |
| "n choose k" | Combinatorics | Pascal or formula | Divide factorial |
| "circular array / wrap-around index" | Modulo | `index % n` or `(index + n) % n` | Keeps in range |
| "sliding window" | Two pointers | Move both pointers | O(n) amortized |
| "find any bit where a ≠ b" | XOR then isolate | `a^b`, then `& -result` | Differing bits → 1 in XOR |
| "ceiling of a/b" | Integer ceiling | `(a + b - 1) / b` | Shift numerator up by b-1 |
| "count numbers with property in range" | Math formula or DP | Depends on property | Pattern-specific |
| "BST count with n nodes" | Catalan | `C(n)` | Catalan numbers count BST shapes |
| "bracket sequences" | Catalan | `C(n)` | Catalan numbers count these |
| "string permutations" | Factorial / backtracking | n! permutations | Classic |
| "number of 1-bits differ" | Hamming distance | `countBits(a ^ b)` | XOR marks differences |
| "parity of set bits" | XOR all bits | `n ^ (n >> 1) ^ ...` | XOR reduces to parity |
| "swap without temp" | XOR swap | `a ^= b; b ^= a; a ^= b;` | Prefer [a,b]=[b,a] in JS |
| "largest power of 2 ≤ n" | Highest set bit | `1 << floor(log2(n))` | Bit position of highest bit |
| "how many bits to represent n" | Log2 | `floor(log2(n)) + 1` | Bit count formula |
| "repeated element detection" | XOR or sum/math | Various | Depends on structure |

---

# PART 10 — REAL DSA PROBLEMS
## *Problem → Pattern → Trick → Code*

---

## Problem 1: Single Number (LeetCode 136)

**Problem:** Every element in an array appears twice except for one. Find the one that appears only once.

**My brain should recognize:**
> "Pairs cancel. XOR!"

**Why:**
- `a ^ a = 0` — pairs vanish
- `a ^ 0 = a` — the unique one survives

**Step by step for `[4, 1, 2, 1, 2]`:**
```
Start: result = 0
^ 4: result = 4
^ 1: result = 5   (4 ^ 1 = 101 ^ 001 = 100... wait)
    4 = 100, 1 = 001, 4^1 = 101 = 5
^ 2: result = 7   (5 ^ 2 = 101 ^ 010 = 111 = 7)
^ 1: result = 6   (7 ^ 1 = 111 ^ 001 = 110 = 6)
^ 2: result = 4   (6 ^ 2 = 110 ^ 010 = 100 = 4)  ← ANSWER!
```

**Code:**
```javascript
function singleNumber(nums) {
  return nums.reduce((xor, n) => xor ^ n, 0);
}
// Time: O(n), Space: O(1)
```

---

## Problem 2: Missing Number (LeetCode 268)

**Problem:** Array has n distinct numbers from 0..n with one missing. Find it.

**My brain should recognize:**
> "Missing from a complete set → XOR all expected with all actual."

**Method 1 — XOR:**
```javascript
function missingNumber(nums) {
  let result = nums.length;  // Include n itself
  for (let i = 0; i < nums.length; i++) {
    result ^= i ^ nums[i];
  }
  return result;
}
```

**Method 2 — Math (often cleaner):**
```javascript
function missingNumber(nums) {
  const n = nums.length;
  const expected = n * (n + 1) / 2;
  const actual = nums.reduce((sum, x) => sum + x, 0);
  return expected - actual;
}
```

**When to use which?** Math method is often clearer in an interview. XOR method is O(1) space AND no overflow concerns (for large n, sum can overflow in other languages).

---

## Problem 3: Power of Two (LeetCode 231)

**Problem:** Determine if n is a power of 2.

**My brain should recognize:**
> "Power of 2 → exactly one bit set → n & (n-1) must be 0."

**Step by step for n = 8:**
```
8 = 1000
7 = 0111
8 & 7 = 0000 → true! Power of 2.
```

**Step by step for n = 6:**
```
6 = 0110
5 = 0101
6 & 5 = 0100 ≠ 0 → false. Not power of 2.
```

**Code:**
```javascript
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}
// Time: O(1), Space: O(1)
```

**Edge case:** `n = 0` → `n > 0` fails → returns false ✓

---

## Problem 4: Number of 1 Bits (LeetCode 191)

**Problem:** Return the number of set bits in n.

**My brain should recognize:**
> "Count set bits → Brian Kernighan → n & (n-1) removes one 1 at a time."

**Step by step for n = 11 (binary: 1011):**
```
Iteration 1: n = 1011, n & (n-1) = 1011 & 1010 = 1010 = 10. count = 1
Iteration 2: n = 1010, n & (n-1) = 1010 & 1001 = 1000 = 8.  count = 2
Iteration 3: n = 1000, n & (n-1) = 1000 & 0111 = 0000 = 0.  count = 3
Loop ends.  → 3 set bits ✓  (11 = 8 + 2 + 1 = 3 ones in binary)
```

**Code:**
```javascript
function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= (n - 1);
    count++;
  }
  return count;
}
// Time: O(number of set bits) = O(log n) worst case
// Space: O(1)
```

---

## Problem 5: Counting Bits (LeetCode 338)

**Problem:** For every number from 0 to n, compute the number of set bits. Return as array.

**My brain should recognize:**
> "Each number's bit count = bit count of (n >> 1) + the last bit. DP!"

**Why:** `n` has same bits as `n >> 1` (shift right removes last bit), plus possibly 1 more if last bit was 1.

```javascript
function countBits(n) {
  const dp = [0];
  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i >> 1] + (i & 1);
  }
  return dp;
}
// Time: O(n), Space: O(n)
```

**Trace:**
```
dp[0] = 0
dp[1] = dp[0] + 1 = 1   (1 >> 1 = 0, 1 & 1 = 1)
dp[2] = dp[1] + 0 = 1   (2 >> 1 = 1, 2 & 1 = 0)
dp[3] = dp[1] + 1 = 2   (3 >> 1 = 1, 3 & 1 = 1)
dp[4] = dp[2] + 0 = 1   (4 >> 1 = 2, 4 & 1 = 0)
dp[5] = dp[2] + 1 = 2   (5 >> 1 = 2, 5 & 1 = 1)
```
Result for n=5: [0, 1, 1, 2, 1, 2] ✓

---

## Problem 6: Sum of Two Integers Without + or - (LeetCode 371)

**Problem:** Add two integers without using + or -.

**My brain should recognize:**
> "XOR adds bits without carry. AND+shift gives the carry. Repeat until no carry."

**How addition works in binary:**
- `1 + 0 = 1` (XOR)
- `0 + 1 = 1` (XOR)
- `0 + 0 = 0` (XOR)
- `1 + 1 = 0` with carry 1 (XOR gives 0, AND gives carry)

```javascript
function getSum(a, b) {
  while (b !== 0) {
    const carry = (a & b) << 1;  // Where carries happen, shifted left
    a = a ^ b;                    // Sum without carries
    b = carry;                    // Next iteration handles carries
  }
  return a;
}
// Time: O(1) for bounded integers (at most 32 iterations)
```

**Note:** In JavaScript, bitwise ops work on 32-bit signed integers. Handle negatives:
```javascript
function getSum(a, b) {
  while (b !== 0) {
    const carry = (a & b) << 1;
    a = (a ^ b);
    b = carry;
    // Mask to 32 bits if needed
  }
  return a;
}
```

---

## Problem 7: Find Two Non-Repeating Numbers (Advanced)

**Problem:** Every element appears twice except two. Find both.

**My brain should recognize:**
> "XOR all → get a^b. Find a differing bit. Partition. XOR each partition."

```javascript
function singleNumberIII(nums) {
  let xorAll = nums.reduce((x, n) => x ^ n, 0);  // = a ^ b
  const diffBit = xorAll & -xorAll;               // Lowest differing bit

  let a = 0, b = 0;
  for (const n of nums) {
    if (n & diffBit) a ^= n;
    else b ^= n;
  }
  return [a, b];
}
```

---

## Problem 8: Subsets (LeetCode 78)

**Problem:** Return all subsets of an integer array.

**My brain should recognize:**
> "All subsets → bitmask. Each integer from 0 to 2^n-1 is one subset."

```javascript
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
// Time: O(n × 2^n)
```

---

## Problem 9: Maximum XOR of Two Numbers in Array (LeetCode 421)

**Problem:** Find the maximum result of `a XOR b` where a, b are in the array.

**My brain should recognize:**
> "Try to maximize XOR bit by bit from MSB using prefix trie or greedy."

**Greedy approach using bit trie (outline):**
- Build a binary trie of all numbers
- For each number, greedily choose the opposite bit at each level

*(Full trie implementation is complex — outline the approach, implement if time permits)*

---

## Problem 10: Divide Two Integers Without Multiplication/Division (LeetCode 29)

**Problem:** Divide two integers without using `*`, `/`, or `%`.

**My brain should recognize:**
> "Division by powers of 2 → right shift. General division: find largest power-of-2 multiple that fits."

```javascript
function divide(dividend, divisor) {
  const sign = (dividend > 0) === (divisor > 0) ? 1 : -1;
  let a = Math.abs(dividend), b = Math.abs(divisor);
  let result = 0;

  while (a >= b) {
    let temp = b, multiple = 1;
    while (a >= (temp << 1)) {
      temp <<= 1;
      multiple <<= 1;
    }
    a -= temp;
    result += multiple;
  }

  return sign === 1
    ? Math.min(result, 2147483647)
    : Math.max(-result, -2147483648);
}
```

---

## Problem 11: Hamming Distance (LeetCode 461)

**Problem:** Find the number of positions where bits of x and y differ.

**My brain should recognize:**
> "Differences → XOR. Count set bits in XOR."

```javascript
function hammingDistance(x, y) {
  let diff = x ^ y;
  let count = 0;
  while (diff !== 0) {
    diff &= (diff - 1);
    count++;
  }
  return count;
}
// Time: O(1), Space: O(1)
```

---

## Problem 12: Sum of Subarray Minimums (Medium, using prefix sum ideas)

**Problem:** Find the sum of minimum of every subarray.

**My brain should recognize:**
> "For each element, find how many subarrays it is the minimum of → monotonic stack."

This is less about bit tricks and more about clever counting:
- Use a monotonic stack to find left/right boundaries where each element is the minimum
- Count subarrays: `(i - left) × (right - i)` for each element

*(This example shows that not every DSA problem needs bit tricks — use the right tool.)*

---

# PART 11 — THINK WITHOUT CONVERTING TO BINARY
## *"HOW TO THINK ABOUT BIT OPERATIONS WITHOUT CONVERTING EVERY TIME"*

---

This is your "30 seconds before answering" reference.

## The Mental Shortcuts You Must Internalize

### Group 1: Reading Single Bits

```
n & 1       → "Is n odd?"         (check bit 0)
n & 2       → "Is the 2s place set?"  (check bit 1)
n & 4       → "Is the 4s place set?"  (check bit 2)
n & 8       → "Is the 8s place set?"  (check bit 3)
n & 16      → "Is the 16s place set?" (check bit 4)
n & (1<<k)  → "Is bit k set?"
```

### Group 2: Reading Multiple Bits (Modulo)

```
n & 1   → n % 2    (last 1 bit)
n & 3   → n % 4    (last 2 bits)
n & 7   → n % 8    (last 3 bits)
n & 15  → n % 16   (last 4 bits)
n & 31  → n % 32   (last 5 bits)
n & 63  → n % 64   (last 6 bits)
```

**Pattern:** `n & (2^k - 1)` → `n % 2^k`

**Cheat:** The mask is always `(one fewer than a power of 2)`. Is the mask `3, 7, 15, 31, 63, 127, 255...`? It's all ones in binary. That's a modulo mask.

### Group 3: Modifying Bits

```
n | (1 << k)   → "Turn bit k ON"   (set)
n & ~(1 << k)  → "Turn bit k OFF"  (clear)
n ^ (1 << k)   → "Flip bit k"      (toggle)
```

### Group 4: Structural Operations

```
n & (n-1)   → "Remove the rightmost 1 bit"
n & -n      → "Isolate the rightmost 1 bit" (gives its value, a power of 2)
n | (n-1)   → "Fill all trailing zeros with 1s" (less common)
~n & (n+1)  → "Isolate rightmost 0 bit as a 1" (less common)
```

### Group 5: Power of 2 Checks

```
n > 0 && (n & (n-1)) === 0   → "n is a power of 2"
1 << k                        → "The kth power of 2"
Math.floor(Math.log2(n))      → "Position of the highest set bit" (= floor log₂ n)
```

### Group 6: Shifts as Math

```
n << k   → n × 2^k
n >> k   → floor(n / 2^k)
1 << k   → 2^k
```

---

## Worked Examples Without Binary Conversion

**Question:** What is `25 & 7`?

**Think:** `7 = 2^3 - 1` → this is `25 % 8`.

`25 = 24 + 1 = 3×8 + 1` → `25 % 8 = 1` → **answer: 1**

*Verify:* 25 = 11001, 7 = 00111, AND = 00001 = 1 ✓

---

**Question:** What is `47 & 15`?

**Think:** `15 = 2^4 - 1` → this is `47 % 16`.

`47 = 32 + 15 = 2×16 + 15` → `47 % 16 = 15` → **answer: 15**

---

**Question:** What is `100 & -100`?

**Think:** `n & -n` isolates the lowest set bit.

`100 = 64 + 32 + 4 = 1100100`.

Lowest set bit is the `4` (bit 2). → **answer: 4**

*Verify:* 100 = 1100100, -100 in two's complement = ...0011100, AND = 0000100 = 4 ✓

---

**Question:** Does `72 & (72-1) === 0`?

**Think:** This checks if 72 is a power of 2.

`72 = 64 + 8` → two bits set → **not a power of 2** → answer is `false`.

*Verify:* 72 = 1001000, 71 = 1000111, AND = 1000000 ≠ 0 → false ✓

---

**Question:** What is `n & 2` for `n = 10`?

**Think:** Check bit 1 (the "2s column"). OR: `10 % 4 = 2`, and `2 >= 2` → bit 1 is set.

→ **answer: 2** (nonzero → bit 1 is set)

---

# PART 12 — COMMON CONFUSION
## *Don't Make These Mistakes*

---

## 12.1 `&` vs `&&`

| `&` | `&&` |
|-----|------|
| Bitwise AND | Logical AND |
| Works on integers | Works on any truthy/falsy value |
| Returns integer | Returns one of the operands |
| Always evaluates both sides | Short-circuits (stops if left is falsy) |
| `5 & 3 = 1` | `5 && 3 = 3` (returns right if left is truthy) |
| `0 & 3 = 0` | `0 && 3 = 0` (returns left because it's falsy) |

**Mistake:** Writing `if (n && 1)` instead of `if (n & 1)`.

**Another mistake (precedence!):**
```javascript
if (n & 1 === 0)   // WRONG! Parsed as: n & (1 === 0) = n & false = n & 0 = 0 → always false
if ((n & 1) === 0) // CORRECT!
```

---

## 12.2 `|` vs `||`

| `|` | `||` |
|-----|------|
| Bitwise OR | Logical OR |
| Returns integer | Returns first truthy value (or last) |
| `5 | 3 = 7` | `5 || 3 = 5` |
| `0 | 3 = 3` | `0 || 3 = 3` |

---

## 12.3 `^` vs `**`

| `^` | `**` |
|-----|------|
| Bitwise XOR | Exponentiation (ES2016+) |
| `5 ^ 3 = 6` | `5 ** 3 = 125` |
| Operates bit by bit | Standard power function |

**In Python:** `^` is XOR, `**` is power (same pattern).

**In math notation:** `^` usually means power, but in programming, it's XOR!

---

## 12.4 `~` vs `!`

| `~` | `!` |
|-----|-----|
| Bitwise NOT (flip all bits) | Logical NOT |
| `~5 = -6` (always integer) | `!5 = false` |
| `~0 = -1` | `!0 = true` |
| `~(-1) = 0` | `!(-1) = false` |

**Useful identity:** `~n = -(n+1)`, so `~(-1) = 0` (useful check pattern in old JS code).

---

## 12.5 `>>` vs `>>>`

| `>>` (signed right shift) | `>>>` (unsigned right shift) |
|--------------------------|------------------------------|
| Preserves sign bit | Always fills with 0 |
| `-8 >> 1 = -4` | `-8 >>> 1 = 2147483644` |
| For positive numbers: same result | For positive numbers: same result |
| Floor division for negatives | Different for negatives |

**In interviews:** Use `>>` for most cases. Use `>>>` only when you need unsigned behavior.

---

## 12.6 Operator Precedence Trap

In JavaScript, bitwise operators have **lower precedence** than comparison operators!

```javascript
// WRONG - evaluates as n & (1 === 0):
if (n & 1 === 0) { }

// CORRECT - always add parentheses:
if ((n & 1) === 0) { }
```

**Rule:** Always wrap your bit operations in parentheses before comparing.

---

## 12.7 JavaScript 32-Bit Integer Behavior

Bitwise operators in JavaScript **always convert their operands to 32-bit signed integers**.

```javascript
// After a bitwise op, JS gives you a 32-bit signed integer:
2147483648 | 0   // = -2147483648  (overflow!)
Math.pow(2, 32) | 0  // = 0
```

**Watch out for:**
- `1 << 31` = `-2147483648` (negative due to sign bit)
- Numbers larger than 2^31 - 1 behave unexpectedly with bitwise ops

---

# PART 13 — COMPLEXITY
## *When Bit Tricks Are Worth It*

---

## Time and Space for Each Trick

| Trick | Time | Space | Notes |
|-------|------|-------|-------|
| `n & 1` | O(1) | O(1) | Single instruction |
| `n & (n-1)` | O(1) | O(1) | Single instruction |
| `n & -n` | O(1) | O(1) | Single instruction |
| Count set bits (Brian Kernighan) | O(k) where k = set bits | O(1) | At most O(log n) |
| Count set bits (bit shift loop) | O(log n) | O(1) | Always 32 iterations |
| XOR find unique | O(n) | O(1) | Beats sorting O(n log n) or hash O(n) space |
| XOR find two unique | O(n) | O(1) | Beats hash O(n) space |
| Power of 2 check | O(1) | O(1) | Beats loop O(log n) |
| Bitmask subsets | O(2^n × n) | O(2^n) | Only feasible for small n (n ≤ 20) |
| Bitmask DP | O(2^n × n) | O(2^n) | Traveling salesman, assignment problems |
| Sieve of Eratosthenes | O(n log log n) | O(n) | Finding all primes |
| isPrime (trial division) | O(√n) | O(1) | Check if single number is prime |
| GCD (Euclidean) | O(log min(a,b)) | O(1) | Classic |
| Fast exponentiation | O(log exp) | O(1) | Beats naive O(exp) |
| Prefix sum build | O(n) | O(n) | One-time cost |
| Prefix sum query | O(1) | O(1) | After building |
| Binary search | O(log n) | O(1) | Classic |

---

## When NOT to Use Bit Tricks

**Use regular arithmetic when:**
- The code will be maintained by others — `n % 2` is clearer than `n & 1`
- Negative numbers are involved — right shift and XOR behave unexpectedly
- Readability matters more than micro-optimization (most production code)
- The problem doesn't naturally map to binary structure

**Use bit tricks when:**
- The problem explicitly involves binary representation
- Space is critical and bitmask is the right data structure
- The trick directly solves the problem (XOR for unique element)
- Performance is genuinely critical (embedded, algorithms contest)

**General rule:** In an interview, demonstrate you know the bit trick, explain it clearly, but also mention the readable alternative. That shows depth.

---

# PART 14 — INTERVIEW DECISION TREE
## *"WHAT SHOULD I THINK OF FIRST?"*

---

```
START: Read the problem. What is the core question?
│
├─── Odd/even / parity?
│         └─→ n & 1    ("Is n odd?")
│
├─── Is n a power of 2?
│         └─→ n > 0 && (n & (n-1)) === 0
│
├─── One element appears once, rest appear twice (or even number of times)?
│         └─→ XOR all elements
│
├─── Two elements appear once, rest appear twice?
│         └─→ XOR all → get diffBit → partition → XOR each group
│
├─── Missing number from 0..n?
│         └─→ XOR with 0..n, OR use sum formula: n(n+1)/2 - actual sum
│
├─── Remainder by power of 2?
│         └─→ n & (2^k - 1) instead of n % 2^k
│
├─── Multiply / divide by power of 2?
│         └─→ n << k (multiply), n >> k (divide+floor)
│
├─── Need 2^k as a value?
│         └─→ 1 << k
│
├─── Check if bit k is set?
│         └─→ (n >> k) & 1
│
├─── Set/clear/toggle a specific bit?
│         └─→ Set: n | (1<<k)    Clear: n & ~(1<<k)    Toggle: n ^ (1<<k)
│
├─── Count set bits?
│         └─→ Brian Kernighan: while(n) { n &= (n-1); count++ }
│
├─── All subsets of a small array (n ≤ 20)?
│         └─→ Bitmask: loop mask = 0 to (1<<n)-1
│
├─── Track many boolean states?
│         └─→ Bitmask as set: single integer
│
├─── Range sum queries?
│         └─→ Prefix sum array
│
├─── Range update queries?
│         └─→ Difference array
│
├─── a^n or a^n mod p for large n?
│         └─→ Binary (fast) exponentiation
│
├─── GCD / LCM?
│         └─→ Euclidean algorithm: gcd(a,b) = gcd(b, a%b)
│
├─── Is n prime?
│         └─→ Trial division up to √n
│
├─── All primes up to n?
│         └─→ Sieve of Eratosthenes
│
├─── All divisors of n?
│         └─→ Loop i from 1 to √n, collect pairs
│
├─── Sum of 1..n?
│         └─→ n(n+1)/2
│
├─── Ceiling division (a ÷ b rounded up)?
│         └─→ (a + b - 1) / b  (integer)
│
├─── n choose k (modular)?
│         └─→ Pascal's triangle DP or Fermat: multiply by modular inverse
│
├─── Maximum XOR of two numbers?
│         └─→ Prefix trie, greedy bit-by-bit
│
└─── None of the above?
          └─→ Is it sorted? → Binary search
              Is it a graph? → BFS/DFS
              Is it optimization? → DP
              Is it combinatorial? → Backtracking
```

---

# PART 15 — FLASHCARDS
## *50+ Interview Flashcards*

---

### Flashcard 1
**Q:** What does `n & 1` tell you?
**A:** Whether n is odd. Result is 1 if odd, 0 if even. Equivalent to `n % 2`.

---

### Flashcard 2
**Q:** What does `n & (n-1)` do?
**A:** Removes (clears) the lowest set bit (rightmost 1) from n.

---

### Flashcard 3
**Q:** How do you check if n is a power of 2?
**A:** `n > 0 && (n & (n-1)) === 0`. Powers of 2 have exactly one bit set.

---

### Flashcard 4
**Q:** What does `n & -n` do?
**A:** Isolates the lowest set bit. Result is the value of that bit (a power of 2).

---

### Flashcard 5
**Q:** Why does `n & (2^k - 1)` equal `n % 2^k`?
**A:** `2^k - 1` has k consecutive 1-bits. ANDing keeps only the lower k bits, which is the remainder when dividing by 2^k.

---

### Flashcard 6
**Q:** What does `1 << k` evaluate to?
**A:** 2^k. The number with only bit k set.

---

### Flashcard 7
**Q:** Why does `a ^ a = 0`?
**A:** Every bit position has the same value, so XOR (which gives 1 for different bits, 0 for same) gives 0 everywhere.

---

### Flashcard 8
**Q:** An array has every element appearing twice except one. How do you find it?
**A:** XOR all elements. Pairs cancel to 0. The unique element remains.

---

### Flashcard 9
**Q:** What is `a ^ 0`?
**A:** `a`. XOR with 0 is the identity — no bits change.

---

### Flashcard 10
**Q:** How do you set bit k in n?
**A:** `n | (1 << k)`. OR with a mask that has only bit k set.

---

### Flashcard 11
**Q:** How do you clear bit k in n?
**A:** `n & ~(1 << k)`. AND with a mask that has all bits set except bit k.

---

### Flashcard 12
**Q:** How do you toggle bit k in n?
**A:** `n ^ (1 << k)`. XOR with a mask that has only bit k set (XOR flips the bit).

---

### Flashcard 13
**Q:** How do you check if bit k is set in n?
**A:** `(n >> k) & 1`. Shift n right by k, then check the last bit.

---

### Flashcard 14
**Q:** What does Brian Kernighan's algorithm do?
**A:** Counts set bits by repeatedly removing the lowest set bit: `while(n) { n &= (n-1); count++ }`

---

### Flashcard 15
**Q:** What is `n << k` mathematically?
**A:** `n × 2^k` (integer multiply by 2^k).

---

### Flashcard 16
**Q:** What is `n >> k` mathematically?
**A:** `Math.floor(n / 2^k)` (integer divide by 2^k, rounds down).

---

### Flashcard 17
**Q:** What is `~n` in JavaScript?
**A:** `-(n + 1)`. Bitwise NOT flips all bits, and in two's complement this gives the negative minus one.

---

### Flashcard 18
**Q:** How many subsets does a set of n elements have?
**A:** 2^n. This is why bitmask DP uses loops from 0 to (1<<n)-1.

---

### Flashcard 19
**Q:** What does `n & 3` compute?
**A:** `n % 4`. It extracts the lower 2 bits of n.

---

### Flashcard 20
**Q:** What does `n & 7` compute?
**A:** `n % 8`. It extracts the lower 3 bits of n.

---

### Flashcard 21
**Q:** What does `n & 15` compute?
**A:** `n % 16`. It extracts the lower 4 bits of n.

---

### Flashcard 22
**Q:** Why does XOR work for finding a missing number?
**A:** XOR 1..n with all array elements. Each present number cancels with its pair in 1..n. Only the missing number has no pair and remains.

---

### Flashcard 23
**Q:** How do you find TWO unique numbers in an array where everything else appears twice?
**A:** 1. XOR all → get a^b. 2. Find a set bit (use `& -result`). 3. Partition numbers by that bit. 4. XOR each partition → one gives a, other gives b.

---

### Flashcard 24
**Q:** What is the Euclidean algorithm for GCD?
**A:** `gcd(a, b) = gcd(b, a % b)` until b = 0. Time: O(log min(a,b)).

---

### Flashcard 25
**Q:** What is the LCM formula?
**A:** `lcm(a, b) = (a / gcd(a,b)) * b`. Divide first to avoid overflow.

---

### Flashcard 26
**Q:** How do you check if n is prime efficiently?
**A:** Check divisors from 2 to √n. If any divide n evenly, not prime. Time: O(√n).

---

### Flashcard 27
**Q:** What is fast (binary) exponentiation?
**A:** Compute a^n in O(log n) by squaring: if bit of n is set, multiply result by current base; always square the base; shift n right.

---

### Flashcard 28
**Q:** What is `n(n+1)/2`?
**A:** Sum of first n natural numbers: 1 + 2 + 3 + ... + n.

---

### Flashcard 29
**Q:** How do you compute range sum on an array in O(1)?
**A:** Build a prefix sum array. `sum(l, r) = prefix[r+1] - prefix[l]`.

---

### Flashcard 30
**Q:** How do you compute ceiling of a/b using integers?
**A:** `Math.floor((a + b - 1) / b)` for positive a and b.

---

### Flashcard 31
**Q:** What is `n & 2` checking?
**A:** Whether bit 1 (the "2s column") is set in n. Nonzero means it's set.

---

### Flashcard 32
**Q:** What is `n & 2` equivalent to in terms of modulo?
**A:** Nonzero when `n % 4 >= 2` (when `Math.floor(n/2) % 2 === 1`).

---

### Flashcard 33
**Q:** What is the Sieve of Eratosthenes used for?
**A:** Finding all primes up to n efficiently. Time: O(n log log n).

---

### Flashcard 34
**Q:** Why start Brian Kernighan's inner loop at `i*i` in Sieve?
**A:** All smaller multiples were already marked by smaller primes. `i*i` is the first unmarked multiple of i.

---

### Flashcard 35
**Q:** What is two's complement?
**A:** How computers represent negative integers. -n = flip all bits of n, then add 1. This is why `n & -n` isolates the lowest set bit.

---

### Flashcard 36
**Q:** What is a difference array?
**A:** Array where `diff[l] += v` and `diff[r+1] -= v` represents adding v to range [l,r]. Reconstruct with prefix sum. O(1) updates, O(n) rebuild.

---

### Flashcard 37
**Q:** What does XOR of numbers 1 to n depend on?
**A:** `n % 4`. Pattern: n, 1, n+1, 0 cycling every 4 values.

---

### Flashcard 38
**Q:** Operator precedence: does `n & 1 === 0` work?
**A:** No! It's parsed as `n & (1 === 0)`. Always use `(n & 1) === 0`.

---

### Flashcard 39
**Q:** What is `n | (n-1)`?
**A:** Sets all trailing zeros to 1. Example: `8 = 1000`, `8 | 7 = 1111 = 15`.

---

### Flashcard 40
**Q:** How many bits are needed to represent n?
**A:** `Math.floor(Math.log2(n)) + 1` for n ≥ 1.

---

### Flashcard 41
**Q:** What happens to `1 << 31` in JavaScript?
**A:** It becomes `-2147483648` (negative), because JS bitwise ops use signed 32-bit integers and bit 31 is the sign bit.

---

### Flashcard 42
**Q:** What is the XOR of a subarray `arr[l..r]`?
**A:** `prefix[r] ^ prefix[l-1]` where `prefix[i] = arr[0] ^ ... ^ arr[i]`.

---

### Flashcard 43
**Q:** What are Catalan numbers? When do they appear in DSA?
**A:** 1, 1, 2, 5, 14, 42... C(n) = C(2n,n)/(n+1). Appear in: distinct BSTs with n nodes, valid parenthesizations, polygon triangulations.

---

### Flashcard 44
**Q:** How do you count trailing zeros in n! ?
**A:** Count factors of 5: `floor(n/5) + floor(n/25) + floor(n/125) + ...`

---

### Flashcard 45
**Q:** What is modular inverse and when do you need it?
**A:** The number x such that `a × x ≡ 1 (mod p)`. Needed for `a/b mod p`. By Fermat: `a^(-1) ≡ a^(p-2) mod p` when p is prime.

---

### Flashcard 46
**Q:** What does `>> 1` do in binary search midpoint calculation?
**A:** Same as `Math.floor(x / 2)`. `mid = (lo + hi) >> 1` is idiomatic.

---

### Flashcard 47
**Q:** When is XOR NOT the right tool?
**A:** When numbers appear more than twice (pairs must be exactly 2), when dealing with floats, when you need more than 2 "unique" elements without extra logic.

---

### Flashcard 48
**Q:** What is `Math.floor(Math.log2(n))`?
**A:** The position (0-indexed) of the highest set bit in n. Same as the floor of log₂(n).

---

### Flashcard 49
**Q:** What is the GCD of two consecutive numbers?
**A:** Always 1. Consecutive integers are coprime.

---

### Flashcard 50
**Q:** What does `(a + b) % m = ((a%m) + (b%m)) % m` mean practically?
**A:** You can take mod at each step of addition/multiplication to prevent overflow.

---

### Flashcard 51
**Q:** How do you efficiently find divisors of n?
**A:** Loop `i` from 1 to `√n`. For each `i` that divides n, add both `i` and `n/i`. Time: O(√n).

---

### Flashcard 52
**Q:** What is the relationship between `n & (n-1) === 0` and bit count?
**A:** `n & (n-1) === 0` is true when n has exactly 1 set bit. Brian Kernighan uses `n & (n-1)` to remove one set bit at a time.

---

### Flashcard 53
**Q:** What does `>>>`  (unsigned right shift) do differently from `>>`?
**A:** Always fills leftmost bits with 0 (no sign extension). For positive numbers: same. For negative: gives large positive number.

---

### Flashcard 54
**Q:** What is the key property that makes XOR useful for pairs?
**A:** `a ^ a = 0` (self-cancellation) and `a ^ 0 = a` (identity). Together: pairs vanish, singles survive.

---

### Flashcard 55
**Q:** How do you represent a set of n boolean flags in a single integer?
**A:** Use an integer as a bitmask. Bit i represents flag i. Use `|`, `&`, `^`, and shifts to manipulate individual flags.

---

# PART 16 — FINAL ONE-PAGE CHEAT SHEET
## *"DSA Mathematical + Bit Tricks — Last 5 Minutes Before Interview"*

---

```
╔══════════════════════════════════════════════════════════════════╗
║            LAST-MINUTE BIT + MATH REFERENCE                     ║
╠══════════════════════════════════════════════════════════════════╣
║  BIT READING                                                     ║
║  n & 1           → odd/even (n % 2)                             ║
║  n & 3           → n % 4    (last 2 bits)                       ║
║  n & 7           → n % 8    (last 3 bits)                       ║
║  n & 15          → n % 16   (last 4 bits)                       ║
║  n & (2^k - 1)   → n % 2^k  (last k bits)                      ║
║  (n >> k) & 1    → is bit k set? (0 or 1)                       ║
║  n & 2^k         → is bit k set? (0 or 2^k)                     ║
╠══════════════════════════════════════════════════════════════════╣
║  BIT MODIFICATION                                                ║
║  n | (1<<k)      → set bit k                                     ║
║  n & ~(1<<k)     → clear bit k                                   ║
║  n ^ (1<<k)      → toggle bit k                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  STRUCTURAL TRICKS                                               ║
║  n & (n-1)       → remove lowest set bit                         ║
║  n & -n          → isolate lowest set bit (= n & (~n+1))         ║
║  n & (n-1) === 0 → is n a power of 2? (n > 0 required)          ║
╠══════════════════════════════════════════════════════════════════╣
║  SHIFTS                                                          ║
║  n << k          → n × 2^k                                       ║
║  n >> k          → floor(n / 2^k)                                ║
║  1 << k          → 2^k                                           ║
╠══════════════════════════════════════════════════════════════════╣
║  XOR                                                             ║
║  a ^ a = 0       → self-cancellation                             ║
║  a ^ 0 = a       → identity                                      ║
║  XOR all         → find unique (where pairs cancel)              ║
║  XOR all → diffBit → partition → XOR groups → 2 uniques          ║
╠══════════════════════════════════════════════════════════════════╣
║  BITMASK / SUBSETS                                               ║
║  1 << n masks    → 2^n subsets, loop 0 to (1<<n)-1               ║
║  mask & (1<<i)   → is item i in this subset?                     ║
║  visited |= 1<<i → mark item i as visited                        ║
╠══════════════════════════════════════════════════════════════════╣
║  COUNT SET BITS (Brian Kernighan)                                ║
║  while(n) { n &= (n-1); count++; }   → O(set bits)              ║
╠══════════════════════════════════════════════════════════════════╣
║  MATH SHORTCUTS                                                  ║
║  Sum 1..n           → n(n+1)/2                                   ║
║  GCD                → gcd(a,b) = gcd(b, a%b) until b=0           ║
║  LCM                → (a / gcd(a,b)) * b                         ║
║  isPrime            → trial division to √n                       ║
║  All primes to n    → Sieve of Eratosthenes                      ║
║  All divisors of n  → loop to √n, collect pairs                  ║
║  a^n (fast)         → binary exponentiation O(log n)             ║
║  a^n mod p          → modPow; inverse = a^(p-2) if p prime       ║
║  Range sum [l,r]    → prefix[r+1] - prefix[l]                    ║
║  Ceiling(a/b)       → (a+b-1)/b (integer)                        ║
║  Bits to represent n → floor(log₂n) + 1                         ║
╠══════════════════════════════════════════════════════════════════╣
║  PRECEDENCE TRAP — ALWAYS USE PARENS!                            ║
║  (n & 1) === 0   ← CORRECT                                       ║
║  n & 1 === 0     ← WRONG (parsed as n & (1===0))                 ║
╚══════════════════════════════════════════════════════════════════╝
```

---

# THE 25 THINGS I MUST REMEMBER BEFORE MY INTERVIEW

---

These are the highest-value patterns. Read these when you have 10 minutes.

---

**1. `n & 1` → Is n odd?**
Odd numbers have bit 0 set. Even numbers don't. `n & 1 === 1` means odd.

**2. `n & (n-1)` → Remove lowest set bit**
Used to count set bits (Brian Kernighan) and check power of 2.

**3. `n > 0 && (n & (n-1)) === 0` → Is n a power of 2?**
Powers of 2 have exactly one bit. Removing it gives 0.

**4. `n & -n` → Isolate lowest set bit**
Two's complement trick. Result is a power of 2 = value of that bit.

**5. `n & (2^k - 1)` → n mod 2^k**
ANDing with all-ones mask keeps only lower k bits = remainder.
`n & 7` = `n % 8`. `n & 15` = `n % 16`. `n & 3` = `n % 4`.

**6. `a ^ a = 0` and `a ^ 0 = a` → XOR cancellation**
Same XOR same = 0. XOR with 0 = unchanged. This is why XOR finds the unique element.

**7. XOR all elements → find unique in array of pairs**
Every pair cancels. The lone element remains. `arr.reduce((x,n) => x^n, 0)`.

**8. XOR all → diffBit → partition → XOR each half → find TWO uniques**
`diffBit = xorAll & -xorAll` (any bit where they differ). Partition by this bit.

**9. `1 << k` = 2^k**
The fundamental building block for all bitmask operations.

**10. `n << k` = n × 2^k, `n >> k` = floor(n / 2^k)**
Shift left = multiply by power of 2. Shift right = integer divide by power of 2.

**11. `(n >> k) & 1` → is bit k set?**
Shift right to bring bit k to position 0, then AND with 1 to read it.

**12. Set bit k: `n | (1<<k)`. Clear bit k: `n & ~(1<<k)`. Toggle: `n ^ (1<<k)`.**
These three cover all single-bit modifications.

**13. All subsets of n items: loop mask from 0 to `(1<<n) - 1`**
Each mask is one subset. Check `mask & (1<<i)` to see if item i is included.

**14. Bitmask DP: use an integer to represent states**
When problem has n ≤ 20 boolean state variables, encode them in one integer.

**15. GCD: `gcd(a,b) = gcd(b, a%b)`. LCM: `(a/gcd(a,b))*b`.**
O(log min(a,b)). Euclidean algorithm is always available.

**16. Sum 1..n = n(n+1)/2**
Avoid loops. This formula is O(1).

**17. Prefix sum: build O(n), query O(1)**
`rangeSum(l,r) = prefix[r+1] - prefix[l]`. Build it once, query forever.

**18. Fast exponentiation: O(log exp)**
`if(exp & 1) result *= base; base *= base; exp >>= 1;` in a loop.

**19. Sieve: all primes to n in O(n log log n)**
Mark composites by crossing off multiples. Inner loop starts at `i*i`.

**20. isPrime: trial division to √n. Use `i*i <= n`, not `Math.sqrt(n)`.**
Avoids floating-point issues. O(√n).

**21. Ceiling division: `Math.floor((a + b - 1) / b)`**
For positive integers. Minimum groups of size b to cover a items.

**22. ALWAYS parenthesize bit ops before comparison: `(n & 1) === 0`**
Without parens, `n & 1 === 0` evaluates as `n & (1===0) = n & 0 = 0`. Always wrong.

**23. Difference in bits between a and b: count set bits in `a ^ b`**
XOR marks the differing bits. popcount gives the count (Hamming distance).

**24. XOR of 1..n has a 4-cycle pattern**
`n%4===0 → n`, `n%4===1 → 1`, `n%4===2 → n+1`, `n%4===3 → 0`.

**25. When in doubt between bit trick and readable code: use readable code and mention the trick.**
An interviewer prefers clean correct code + you explaining "I know this can also be done with `n & 1`" over clever code that you can't explain.

---

*Good luck on Monday. You've got this.*

---

*Document compiled for senior DSA interview preparation. Focus on recognition, not memorization. The goal is: see the problem shape → identify the pattern → apply the tool.*
