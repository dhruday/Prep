# Math and Number Theory — 1-Hour Learning Module

> *"Math problems in interviews aren't about being a mathematician. They're about recognizing patterns and knowing a handful of powerful tricks."*

**Total Time: 60 minutes | Target: Google SWE Interviews**

---

## Table of Contents

- [[0–10 min] Big Picture](#010-min-big-picture)
- [[10–20 min] Mental Model](#1020-min-mental-model)
- [[20–35 min] Core Patterns](#2035-min-core-patterns)
- [[35–45 min] Concrete Code + Dry Runs](#3545-min-concrete-code--dry-runs)
- [[45–55 min] Pattern Recognition](#4555-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#5560-min-final-mental-checklist)
- [Active Recall Questions](#active-recall-questions)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What math/number theory topics appear in DSA interviews?

Google and top-tier interviews use math in two ways:

1. **As the core algorithm** — the problem *is* a math problem (compute GCD, count primes, compute nCr mod p)
2. **As a hidden shortcut** — a seemingly complex problem has a clever O(1) or O(log n) math trick lurking inside

The topics that actually appear at Google:

| Topic | Frequency | Why it matters |
|---|---|---|
| GCD / LCM (Euclidean) | Very High | Simplifying fractions, water pouring, "coprime" checks |
| Modular Arithmetic | Very High | Almost every "count ways" problem uses mod 10⁹+7 |
| Fast Exponentiation | High | Pow(x,n), modular inverse, matrix exponentiation |
| Sieve of Eratosthenes | High | Count/find primes efficiently |
| Combinatorics (nCr) | Medium-High | Grid paths, coin combos, "how many ways" |
| Pigeonhole Principle | Medium | Proving a solution exists, finding duplicates |
| Catalan Numbers | Medium | BST count, valid parentheses count |
| Arithmetic Tricks | Medium | Missing number, XOR tricks, digit problems |
| Reservoir Sampling | Medium | Random pick from stream, unknown-length list |
| Fisher-Yates Shuffle | Medium | Shuffle array uniformly |

### Why they matter

Without these, you'll hit problems that seem to require brute force O(n²) or O(n³) but actually have O(log n) or O(n log log n) solutions. At Google, the interviewer *expects* you to know Euclidean GCD is O(log n) and the Sieve is O(n log log n). Saying "I'll just iterate" signals missing fundamentals.

### Simple examples to anchor the mental model

- **GCD in action:** Water jug problem — can we measure exactly 4L with 6L and 10L jugs? `gcd(6, 10) = 2`. Since 4 is a multiple of 2 and ≤ 10, yes we can.
- **Mod in action:** How many ways to climb n stairs with 1 or 2 steps? Answer = Fibonacci(n). At n=100, the number has 20 digits. Mod 10⁹+7 keeps it manageable.
- **Sieve in action:** Count primes below 10⁶? Brute force = O(n√n) ≈ 10⁹ ops. Sieve = O(n log log n) ≈ 4×10⁶ ops. Orders of magnitude faster.

---

## [10–20 min] Mental Model

### GCD — Simple meaning first

"The largest ruler that measures both lengths exactly."

If you have two ropes of length 12 and 8, the largest piece you can cut that divides both evenly is 4. So `gcd(12, 8) = 4`.

**Formal:** GCD(a, b) is the largest integer d such that d divides a and d divides b.

**Key insight — why does the Euclidean algorithm work?**

`gcd(a, b) = gcd(b, a % b)`

Because if d divides both a and b, it also divides `a - b`, `a - 2b`, ..., and `a mod b` (which is just `a - k*b`). So the set of common divisors of (a, b) is identical to the set of common divisors of (b, a mod b). The GCD is preserved.

**LCM:** The smallest number both a and b divide into. `lcm(a, b) = a × b / gcd(a, b)`. Always compute GCD first to avoid overflow.

### Primes — Simple meaning first

A number with exactly 2 divisors: 1 and itself. The "atoms" of multiplication — every integer factors uniquely into primes (Fundamental Theorem of Arithmetic).

**Key insight — why does the Sieve start marking from p²?**

When you reach prime p in the Sieve, all composites smaller than p² (like 2p, 3p, ..., (p-1)p) have already been marked by smaller primes. So you can safely start at p².

### Modular Arithmetic — Simple meaning first

Think of a 12-hour clock. After 12 comes 1, not 13. The clock "wraps around" at 12. That's mod 12.

All arithmetic still works in this wrapped world:
- `(a + b) mod m = ((a mod m) + (b mod m)) mod m`
- `(a × b) mod m = ((a mod m) × (b mod m)) mod m`
- Division is the tricky one — you need the **modular inverse**

**Why 10⁹ + 7 specifically?**
- It is prime (enables modular inverse via Fermat's Little Theorem)
- Fits in a 32-bit signed integer (< 2³¹ - 1)
- Product of two residues fits in a 64-bit long (< 2⁶³)

### Combinatorics — The counting toolkit

| Symbol | Meaning | Formula |
|---|---|---|
| n! | n factorial | n × (n-1) × ... × 1 |
| P(n,r) | Arrangements of r from n (order matters) | n! / (n-r)! |
| C(n,r) or nCr | Choose r from n (order doesn't matter) | n! / (r! × (n-r)!) |

**Pascal's Triangle identity:** `C(n, r) = C(n-1, r-1) + C(n-1, r)`

Think of it as: either you include the nth item (C(n-1, r-1)) or you don't (C(n-1, r)).

### Visual: How GCD converges fast

```
gcd(48, 18):
  48 mod 18 = 12  → gcd(18, 12)
  18 mod 12 = 6   → gcd(12, 6)
  12 mod  6 = 0   → gcd(6, 0) = 6

Only 3 steps for gcd(48, 18) = 6
Each step roughly halves the numbers → O(log n) total
```

---

## [20–35 min] Core Patterns

### 1. Euclidean GCD Algorithm

**From first principles:**

```
gcd(a, b):
  If b == 0: answer is a
  Otherwise: gcd(a, b) = gcd(b, a % b)
```

Why terminate? Each step, a % b < b, and b becomes the new "a". The smaller number strictly decreases every step. It hits 0 in at most O(log(min(a,b))) steps.

**LCM from GCD:**
```
lcm(a, b) = a / gcd(a, b) * b
            ↑ divide first, then multiply — avoids overflow
```

**GCD of an array:** Use reduce. `gcd(a, b, c) = gcd(gcd(a, b), c)`

**Extended GCD (Bezout's Identity):** Finds x, y such that `a*x + b*y = gcd(a, b)`. Used for computing modular inverse when modulus is not prime.

**Complexity:** O(log(min(a, b)))

**When to use:**
- Fraction simplification (divide numerator and denominator by GCD)
- Check coprime: `gcd(a, b) == 1`
- Water pouring puzzle: can you measure exactly X? X must be a multiple of gcd(a, b)
- Rope cutting: maximum piece length = GCD of all rope lengths

---

### 2. Sieve of Eratosthenes

**Algorithm from first principles:**

```
Start: mark all numbers 2..n as prime
For each prime p from 2 to √n:
    Mark p², p²+p, p²+2p, ... as composite
Result: remaining marked-prime numbers are the actual primes
```

Why only up to √n? If a composite c ≤ n has a factor > √n, its co-factor must be < √n, and c was already marked by that smaller factor.

**Complexity:** O(n log log n) — nearly linear

**Variants:**

- **Count primes < n (LeetCode 204):** Run sieve, count remaining true entries
- **Smallest Prime Factor (SPF) Sieve:** Instead of just marking composites, store the smallest prime factor for each index. Then any number ≤ n can be fully factorized in O(log n) by repeatedly dividing by its SPF.
- **Segmented Sieve:** When n is huge (10¹²) but range [L, R] is small (R-L ≤ 10⁶). Use standard sieve up to √R, then sieve the segment.

**When to use:**
- Need all primes up to N (N ≤ 10⁷ comfortably, 10⁸ with care)
- Need to factorize many numbers up to N
- "Count primes" problems

---

### 3. Modular Arithmetic

**Core rules — never forget these:**

```
Addition:       (a + b) % m
Subtraction:    (a - b + m) % m     ← MUST add m to prevent negative
Multiplication: (a * b) % m
Division:       a * modInverse(b, m) % m   ← NOT simply (a/b) % m
Exponentiation: Use fast exponentiation (see below)
```

**Modular Inverse (when m is prime):** By Fermat's Little Theorem, `a^(m-1) ≡ 1 (mod m)`, so `a^(-1) ≡ a^(m-2) (mod m)`.

Compute with fast exponentiation in O(log m).

**Precomputing factorials for nCr mod p:**
```
fact[0] = 1
fact[i] = fact[i-1] * i % MOD

inv_fact[n] = modpow(fact[n], MOD-2, MOD)
inv_fact[i] = inv_fact[i+1] * (i+1) % MOD   ← back-fill

nCr mod p = fact[n] * inv_fact[r] % MOD * inv_fact[n-r] % MOD
```

**When to use:** Every time the problem says "answer modulo 10⁹+7". Apply mod at every addition/multiplication step.

---

### 4. Fast Exponentiation (Binary Exponentiation)

**From first principles:**

Instead of multiplying a × a × a... n times, use the binary representation of n:

```
a^13 = a^(1101 in binary)
     = a^8 × a^4 × a^1
     = (((a^2)^2)^2) × ((a^2)^2) × a

Each squaring handles one bit of the exponent → O(log n) multiplications
```

**Iterative algorithm:**
```
result = 1
while n > 0:
    if n is odd: result = result * a
    a = a * a        // square the base
    n = n >> 1       // shift off the processed bit
```

**When to use:**
- `Pow(x, n)` — handle negative n as `1/pow(x, -n)`
- Modular exponentiation: apply `% mod` at each multiplication
- Matrix exponentiation: replace scalar × with matrix × for Fibonacci in O(log n)

**Complexity:** O(log n)

---

### 5. Combinatorics

**Pascal's Triangle DP (for small n ≤ ~1000):**
```
C[0][0] = 1
C[i][0] = C[i][i] = 1
C[i][j] = C[i-1][j-1] + C[i-1][j]
```

**Large n with mod (factorial method):** Precompute factorials and inverse factorials (see Modular Arithmetic section above).

**Key formulas to know:**

| Problem | Formula |
|---|---|
| Unique paths in m×n grid | C(m+n-2, m-1) |
| Binary trees with n nodes | Catalan(n) |
| Distribute n identical items into k bins | C(n+k-1, k-1) — Stars and Bars |
| Arrangements with repeated elements | n! / (c₁! × c₂! × ...) — Multinomial |

---

### 6. Reservoir Sampling

**Problem:** Pick K items uniformly at random from a stream of unknown length N. You can't store the whole stream.

**Algorithm for K=1:**
1. Keep first element as current pick
2. For the i-th element: replace current pick with probability 1/i

After all N elements, each element has exactly 1/N probability. (Proof by induction: element i survives with prob 1/i × (i/(i+1)) × ((i+1)/(i+2)) × ... × (N-1)/N = 1/N.)

**Algorithm for K items:**
1. Keep first K elements in reservoir
2. For i-th element (i > K): pick random j in [1, i]. If j ≤ K, replace reservoir[j-1] with element i.

Each element ends up with exactly K/N probability.

**When to use:** Unknown-length stream, linked list random node, random pick with duplicates.

---

### 7. Fisher-Yates Shuffle

**Goal:** Generate a uniformly random permutation. Each of the n! permutations has equal probability.

**Algorithm:**
```
for i = n-1 down to 1:
    j = random integer in [0, i]  // INCLUSIVE range [0, i]
    swap arr[i] and arr[j]
```

**Why [0, i] and not [0, n)?** If you use [0, n) throughout, the distribution is NOT uniform (n^n outcomes for n! permutations — they don't divide evenly).

**Complexity:** O(n) time, O(1) space in-place.

---

### 8. Catalan Numbers

**What they count:** "Balanced recursive splitting" structures.

```
C(0) = 1, C(1) = 1, C(2) = 2, C(3) = 5, C(4) = 14, C(5) = 42
```

**Formula:** `C(n) = C(2n, n) / (n+1)`

**Recurrence:** `C(n) = Σ C(i) × C(n-1-i)` for i from 0 to n-1

| What counts Catalan(n) |
|---|
| Valid parenthesizations with n pairs |
| Structurally distinct BSTs with n nodes |
| Triangulations of a (n+2)-sided polygon |
| Monotonic paths in n×n grid not crossing diagonal |

**Don't memorize the formula.** Recognize the pattern: if a problem has a "balanced, recursive split at every position" structure, it's Catalan.

---

### 9. Pigeonhole Principle

**Simple statement:** If n+1 pigeons go into n holes, at least one hole has ≥ 2 pigeons.

**Key interview applications:**

- Array of n+1 elements with values in [1, n] → a duplicate must exist (pigeonhole guarantees it)
- Birthday paradox bounds on hash collisions
- "Find the duplicate number" — the duplicate is guaranteed by pigeonhole; Floyd's cycle detection finds it in O(n) time and O(1) space

**When to invoke:** "n+1 elements in range [1, n]" or "more items than possible categories" → some category must have multiple items. The constraint often proves a solution exists.

---

### 10. Arithmetic Tricks

**Integer formulas:**

| Trick | Formula |
|---|---|
| Sum 1 to n | n(n+1)/2 |
| Sum of squares 1 to n | n(n+1)(2n+1)/6 |
| Ceiling division | (a + b - 1) / b |
| Last digit | n % 10 |
| Remove last digit | n / 10 |
| Digital root | 1 + (n-1) % 9 (for n > 0) |

**Digit-based problems:**
- **Happy Number:** Sum squares of digits repeatedly. Check cycle with Floyd's or HashSet.
- **Add Digits (Digital Root):** While n > 9, sum digits. Shortcut: `1 + (n-1) % 9`.
- **Palindrome Number:** Reverse the second half of digits, compare.

**Math-based array problems:**

| Problem | Technique |
|---|---|
| Missing number in [0, n] | XOR all indices and all values |
| Missing two numbers | Sum + sum of squares (two equations, two unknowns) |
| Majority element | Boyer-Moore Voting |
| Product except self | Left prefix product × right suffix product |
| GCD of array | Reduce: gcd(gcd(a, b), c, ...) |

---

## [35–45 min] Concrete Code + Dry Runs

### GCD / LCM — Java and JavaScript

**Java:**
```java
// Recursive GCD
int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

// Iterative GCD (avoids stack overflow for large inputs)
int gcdIterative(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

// LCM — divide first to avoid overflow
long lcm(long a, long b) {
    return a / gcd((int)a, (int)b) * b;
}
```

**JavaScript/TypeScript:**
```typescript
function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
    return (a / gcd(a, b)) * b;
}
```

**Dry run — `gcd(48, 18)`:**
```
Call: gcd(48, 18)
  b=18 ≠ 0 → gcd(18, 48%18) = gcd(18, 12)
  b=12 ≠ 0 → gcd(12, 18%12) = gcd(12, 6)
  b=6  ≠ 0 → gcd(6,  12%6)  = gcd(6, 0)
  b=0  → return 6

Result: gcd(48, 18) = 6
Steps: 3  (roughly log₁.₆(18) ≈ 3.5, confirming O(log n))
```

---

### Sieve of Eratosthenes — Java and JavaScript

**Java:**
```java
boolean[] sieve(int n) {
    boolean[] isPrime = new boolean[n + 1];
    Arrays.fill(isPrime, true);
    isPrime[0] = isPrime[1] = false;
    for (int p = 2; (long) p * p <= n; p++) {
        if (isPrime[p]) {
            for (int multiple = p * p; multiple <= n; multiple += p) {
                isPrime[multiple] = false;
            }
        }
    }
    return isPrime;
}
```

**JavaScript/TypeScript:**
```typescript
function sieve(n: number): boolean[] {
    const isPrime = new Array(n + 1).fill(true);
    isPrime[0] = isPrime[1] = false;
    for (let p = 2; p * p <= n; p++) {
        if (isPrime[p]) {
            for (let m = p * p; m <= n; m += p) {
                isPrime[m] = false;
            }
        }
    }
    return isPrime;
}
```

**Dry run — sieve(20):**
```
Initial: [F, F, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T]
         index: 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20

p=2: mark 4, 6, 8, 10, 12, 14, 16, 18, 20
p=3: mark 9, 15 (9=3², already: 12,18 marked by 2's)
p=4: isPrime[4]=false, skip
√20 ≈ 4.47, so stop after p=4

Primes: 2, 3, 5, 7, 11, 13, 17, 19
```

---

### Fast Exponentiation (Modular) — Java and JavaScript

**Java:**
```java
long modPow(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
        if ((exp & 1) == 1) {          // if current bit is set
            result = result * base % mod;
        }
        base = base * base % mod;       // square the base
        exp >>= 1;                      // process next bit
    }
    return result;
}

// Modular inverse (mod must be prime)
long modInverse(long a, long mod) {
    return modPow(a, mod - 2, mod);
}
```

**JavaScript/TypeScript:**
```typescript
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1n;
    }
    return result;
}
// Note: use BigInt in JS to avoid precision loss for large numbers
```

**Dry run — `modPow(3, 13, 1000000007)`:**
```
exp=13 = 1101₂

Iteration 1: exp=13 (odd)  → result = 1 × 3 = 3;    base=9,   exp=6
Iteration 2: exp=6  (even) → result = 3;              base=81,  exp=3
Iteration 3: exp=3  (odd)  → result = 3 × 81 = 243;  base=6561,exp=1
Iteration 4: exp=1  (odd)  → result = 243 × 6561 = 1594323; base=..., exp=0

3^13 = 1594323 ✓ (no overflow with mod applied each step)
```

---

### Reservoir Sampling — Java and JavaScript

**Java (K=1):**
```java
int reservoirSample(int[] stream) {
    Random rand = new Random();
    int result = stream[0];
    for (int i = 1; i < stream.length; i++) {
        // Replace with probability 1/(i+1)
        if (rand.nextInt(i + 1) == 0) {
            result = stream[i];
        }
    }
    return result;
}
```

**JavaScript (K=1):**
```typescript
function reservoirSample(stream: number[]): number {
    let result = stream[0];
    for (let i = 1; i < stream.length; i++) {
        const j = Math.floor(Math.random() * (i + 1));
        if (j === 0) result = stream[i];
    }
    return result;
}
```

---

### Fisher-Yates Shuffle — Java and JavaScript

**Java:**
```java
void shuffle(int[] arr) {
    Random rand = new Random();
    for (int i = arr.length - 1; i > 0; i--) {
        int j = rand.nextInt(i + 1);  // j in [0, i] inclusive
        int tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}
```

**JavaScript/TypeScript:**
```typescript
function shuffle(arr: number[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // [0, i]
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
```

**Dry run — shuffle([1, 2, 3, 4]):**
```
i=3: j=random in [0,3], say j=1 → swap arr[3] and arr[1]: [1, 4, 3, 2]
i=2: j=random in [0,2], say j=2 → swap arr[2] and arr[2]: [1, 4, 3, 2]
i=1: j=random in [0,1], say j=0 → swap arr[1] and arr[0]: [4, 1, 3, 2]

Result: [4, 1, 3, 2] — one of 4! = 24 equally likely permutations
```

---

### Combinatorics (nCr mod p) — Java

**Java:**
```java
static final long MOD = 1_000_000_007;

long[] fact, inv_fact;

void precompute(int n) {
    fact = new long[n + 1];
    inv_fact = new long[n + 1];
    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i-1] * i % MOD;
    inv_fact[n] = modPow(fact[n], MOD - 2, MOD);
    for (int i = n - 1; i >= 0; i--) inv_fact[i] = inv_fact[i+1] * (i+1) % MOD;
}

long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * inv_fact[r] % MOD * inv_fact[n-r] % MOD;
}
```

---

## [45–55 min] Pattern Recognition

### Clues that scream "math/number theory"

| Clue in problem statement | What it suggests |
|---|---|
| "answer modulo 10⁹+7" | Modular arithmetic + fast exponentiation |
| "count ways" / "how many paths" | Combinatorics (nCr), possibly DP |
| "n+1 numbers in range [1,n]" | Pigeonhole — duplicate is guaranteed |
| "find all primes up to N" | Sieve of Eratosthenes |
| "simplify fraction" / "coprime" | GCD (Euclidean algorithm) |
| "water jug" / "measure exactly X" | GCD (Bezout's identity) |
| "random pick" from stream/list | Reservoir sampling |
| "shuffle" / "random permutation" | Fisher-Yates |
| "number of BSTs" / "valid parentheses count" | Catalan numbers |
| "power of a matrix" / "linear recurrence" | Matrix exponentiation |

### Constraints that hint at mathematical patterns

| Constraint | Implication |
|---|---|
| n ≤ 10⁶ or 10⁷ | Sieve is feasible; O(n log log n) works |
| n ≤ 10¹² | Can't iterate; need O(√n) primality or segmented sieve |
| Values in [0, n] for array of size n+1 | Pigeonhole: a duplicate exists |
| "O(1) extra space" on array problem | XOR trick, sum formula, or Floyd's cycle |
| Answer can be huge | Mod 10⁹+7 is involved, use modular arithmetic throughout |
| Exponent can be 10^18 | Fast (binary) exponentiation required |

### Common mistakes to avoid

1. **Subtraction going negative:** Always do `(a - b + MOD) % MOD`
2. **Division in modular world:** `(a / b) % MOD ≠ (a % MOD) / (b % MOD)`. Use modular inverse.
3. **Integer overflow before mod:** In Java, cast to `long` before multiplying. In JS, use BigInt for very large numbers.
4. **Wrong shuffle range:** Fisher-Yates needs `j in [0, i]` not `[0, n)`.
5. **Sieve starting too late:** Mark multiples starting from `p*p`, not from `2*p`.
6. **Pow(x, n) with INT_MIN:** `Math.abs(Integer.MIN_VALUE)` overflows in Java. Cast to long first.

### How problems layer these patterns

- **"Unique Paths" grid problem:** Can be solved with DP OR with `C(m+n-2, m-1)`. The latter is O(1) after precomputation.
- **"Count ways to build something" with large n:** DP recurrence + modular arithmetic at every step + precomputed factorials.
- **"Find duplicate in O(1) space":** Pigeonhole proves existence, Floyd's cycle detection finds it.

---

## [55–60 min] Final Mental Checklist

When you see a problem, ask these in order:

```
1. Does it involve divisibility, fractions, or "measure X with Y"?
   → GCD / LCM (Euclidean algorithm, O(log n))

2. Does it ask for all primes or prime factorizations up to N?
   → Sieve of Eratosthenes (O(n log log n))

3. Does the answer need to be taken mod 10^9+7?
   → Modular arithmetic rules, modular inverse, fast exponentiation

4. Does it compute a^b for large b?
   → Fast (binary) exponentiation (O(log b))

5. Does it count combinations, paths, or arrangements?
   → Combinatorics: nCr with Pascal's DP or factorial precomputation

6. Does it involve n+1 elements in range [1,n]?
   → Pigeonhole: duplicate guaranteed; consider Floyd's cycle detection

7. Does it count "balanced" recursive structures (trees, parens)?
   → Catalan numbers

8. Does it pick random items from a stream of unknown length?
   → Reservoir sampling

9. Does it shuffle / permute an array?
   → Fisher-Yates (remember the [0, i] range)

10. Can a seemingly complex operation be done in O(1) space?
    → Look for: XOR trick, sum formula, digital root formula
```

---

## Active Recall Questions

Test yourself — close the notes and answer these:

1. What is the Euclidean algorithm? Write the two-line recursive version from memory.
2. Why does `gcd(a, b) = gcd(b, a % b)` preserve the GCD?
3. Why does the Sieve of Eratosthenes start marking from p² instead of 2p?
4. What is the time complexity of the Sieve? Why is it not O(n log n)?
5. You need to compute `(a - b) mod m` but the result might go negative. What do you write?
6. Why can't you just compute `(a / b) % mod`? What do you do instead?
7. How does binary exponentiation achieve O(log n)?
8. Explain reservoir sampling for K=1. Why does each element end up with probability 1/N?
9. What is the critical bug in a naive shuffle that uses `j = random in [0, n)` throughout?
10. A problem gives n+1 numbers all in range [1, n]. What can you immediately conclude, and what technique finds the duplicate in O(n) time, O(1) space?

---

## Recommended Practice Direction

**Start here (must-do):**
- LeetCode 1979 — Find Greatest Common Divisor of Array
- LeetCode 204 — Count Primes (Sieve)
- LeetCode 50 — Pow(x, n) (Fast exponentiation)
- LeetCode 62 — Unique Paths (nCr formula or DP)
- LeetCode 287 — Find the Duplicate Number (Pigeonhole + Floyd's)
- LeetCode 382 — Linked List Random Node (Reservoir sampling)
- LeetCode 384 — Shuffle an Array (Fisher-Yates)

**Level up:**
- LeetCode 96 — Unique Binary Search Trees (Catalan)
- LeetCode 172 — Factorial Trailing Zeroes (prime factorization insight)
- LeetCode 1201 — Ugly Number III (GCD + LCM + inclusion-exclusion)
- LeetCode 1922 — Count Good Numbers (modular exponentiation)

**Advanced:**
- LeetCode 458 — Poor Pigs (combinatorics / information theory)
- LeetCode 878 — Nth Magical Number (GCD + binary search)
- Matrix exponentiation for Fibonacci (a classic Google hard)

---

## 2-Minute Cheat Sheet

```
GCD:          gcd(a,b) = b==0 ? a : gcd(b, a%b)     O(log n)
LCM:          a / gcd(a,b) * b                        (divide first!)
Sieve:        mark from p², loop p to √n              O(n log log n)
ModPow:       result=1; while n>0: if odd→res*=a; a*=a; n>>=1  O(log n)
ModInverse:   a^(MOD-2) % MOD                         (MOD must be prime)
nCr mod p:    precompute fact[], inv_fact[] then multiply 3 terms
Sub mod:      (a - b + MOD) % MOD                     (never forget +MOD)
Reservoir:    replace current with prob 1/i
Fisher-Yates: j ∈ [0, i] (inclusive), swap arr[i] with arr[j]
Catalan:      1,1,2,5,14,42 — balanced recursive splits
Pigeonhole:   n+1 items in n buckets → collision guaranteed
Digital root: 1 + (n-1) % 9
Ceil divide:  (a + b - 1) / b
Missing num:  XOR all indices 0..n with all values
```

---

*Next: [16-ADVANCED-DATA-STRUCTURES.md](16-ADVANCED-DATA-STRUCTURES.md) — Tries, Segment Trees, Fenwick Trees, and beyond.*
