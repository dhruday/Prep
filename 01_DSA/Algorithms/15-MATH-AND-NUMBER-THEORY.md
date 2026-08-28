# Math and Number Theory

> **8 algorithms covered:** GCD (Euclidean Algorithm) · LCM · Sieve of Eratosthenes · Fast Power / Binary Exponentiation · Modular Arithmetic · Combinatorics (nCr) · Fisher-Yates Shuffle · Reservoir Sampling

> For someone with almost zero DSA knowledge preparing for Google interviews. Every algorithm gets its own section. Read fast, understand deeply, go practice on LeetCode immediately.

---

## Table of Contents
1. [GCD — Euclidean Algorithm](#gcd--euclidean-algorithm)
2. [LCM](#lcm)
3. [Sieve of Eratosthenes](#sieve-of-eratosthenes)
4. [Fast Power / Binary Exponentiation](#fast-power--binary-exponentiation)
5. [Modular Arithmetic](#modular-arithmetic)
6. [Combinatorics (nCr)](#combinatorics-ncr)
7. [Fisher-Yates Shuffle](#fisher-yates-shuffle)
8. [Reservoir Sampling](#reservoir-sampling)
9. [Catalan Numbers](#catalan-numbers)

---

## GCD — Euclidean Algorithm

### What is it?
GCD (Greatest Common Divisor) of two numbers is the largest number that divides both of them evenly. The Euclidean Algorithm is a fast way to find it — instead of checking all possible divisors, it uses the clever trick `gcd(a, b) = gcd(b, a % b)` and terminates in O(log n) steps.

### Visual
```
Find gcd(48, 18):

48 ÷ 18 = 2 remainder 12  →  gcd(48, 18) = gcd(18, 12)
18 ÷ 12 = 1 remainder  6  →  gcd(18, 12) = gcd(12,  6)
12 ÷  6 = 2 remainder  0  →  gcd(12,  6) = gcd( 6,  0)
                               b = 0, so answer = 6

Answer: gcd(48, 18) = 6
Only 3 steps instead of checking all divisors up to 18.
```

### How does it work?
1. Take two numbers a and b (assume a >= b).
2. Divide a by b, get the remainder r = a % b.
3. The new problem is gcd(b, r) — replace a with b, b with r.
4. Repeat until the remainder is 0.
5. When the remainder is 0, the current b (the divisor) is the GCD.
6. For the iterative version: keep swapping until b becomes 0.

### Why does it work?
If d divides both a and b, it also divides a - b, a - 2b, ..., and a mod b (which is just a minus some multiple of b). So every common divisor of (a, b) is also a common divisor of (b, a mod b), and vice versa — the two pairs have identical sets of common divisors, so their GCD is the same.

### When to use?
- Simplify a fraction: divide numerator and denominator by their GCD.
- Check if two numbers are "coprime" (share no common factor): `gcd(a, b) == 1`.
- Water jug / rope cutting puzzles: the answer must be a multiple of the GCD.
- Need LCM: compute GCD first, then derive LCM from it.

### When NOT to use?
- When you need all common divisors, not just the greatest (enumerate divisors instead).
- When working with floating-point numbers (GCD is integer-only).

### How to recognize in a new problem?
Look for the words "divisible", "common factor", "coprime", "simplify", "measure exactly X with jugs of size A and B", or "cut ropes into equal pieces". Any time a problem has two numbers and asks about their divisibility relationship, think GCD first.

Signals:
- "Find the largest number that divides all elements of the array"
- "Can we measure exactly X liters using jugs of size A and B?"
- "Reduce the fraction to lowest terms"

### Simple Example
Input: `a = 48, b = 18`
Expected output: `6`

Trace:
```
gcd(48, 18):
  48 % 18 = 12  →  recurse gcd(18, 12)
  18 % 12 =  6  →  recurse gcd(12, 6)
  12 %  6 =  0  →  recurse gcd(6, 0)
  b == 0        →  return 6
```

### Code
```java
// Java

// Recursive
int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

// Iterative (safer for large inputs — no stack overflow)
int gcdIterative(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
```
```javascript
// JavaScript

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function gcdIterative(a, b) {
    while (b !== 0) {
        let temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
```

### Dry Run
```
gcdIterative(48, 18):

Step 1: a=48, b=18  → temp=18, b=48%18=12, a=18
Step 2: a=18, b=12  → temp=12, b=18%12= 6, a=12
Step 3: a=12, b= 6  → temp= 6, b=12% 6= 0, a= 6
Step 4: b=0 → exit loop, return a = 6

Result: 6
```

### Complexity
```
Time:  O(log(min(a, b))) — each step reduces the problem roughly by half
Space: O(log n) for recursive (call stack), O(1) for iterative
```

### Common Trap
- **Overflow in LCM:** Do NOT write `a * b / gcd(a, b)`. The product `a * b` can overflow. Instead write `a / gcd(a, b) * b` — divide first, then multiply.
- **Negative inputs:** `gcd(-12, 8)` behaves unexpectedly in some languages. Always pass absolute values: `gcd(Math.abs(a), Math.abs(b))`.

### Experience Tip
**Experience Tip:** The Euclidean algorithm is O(log n), not O(n) — never say "I'll just check all numbers up to min(a,b)" in an interview. The iterative version is preferred in production code to avoid stack overflow for large inputs.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 1979 | Find Greatest Common Divisor of Array | Easy | GCD of just min and max of the array | https://leetcode.com/problems/find-greatest-common-divisor-of-array/ |
| 1071 | Greatest Common Divisor of Strings | Easy | String GCD: check if s+t == t+s, then take substr of gcd-length | https://leetcode.com/problems/greatest-common-divisor-of-strings/ |
| 914 | X of a Kind in a Deck of Cards | Easy | GCD of all frequencies must be >= 2 | https://leetcode.com/problems/x-of-a-kind-in-a-deck-of-cards/ |
| 166 | Fraction to Recurring Decimal | Medium | Use GCD to simplify, long division for decimals | https://leetcode.com/problems/fraction-to-recurring-decimal/ |
| 1201 | Ugly Number III | Medium | Inclusion-exclusion with LCM/GCD on three factors | https://leetcode.com/problems/ugly-number-iii/ |

### One-Minute Revision
```
ALGORITHM:    GCD — Euclidean Algorithm
IN SIMPLE WORDS: Largest number dividing both a and b; use gcd(a,b) = gcd(b, a%b)
USE WHEN:     Simplify fractions, check coprime, water jug / rope problems
KEY FORMULA:  gcd(a, b) = b == 0 ? a : gcd(b, a % b)
TIME:         O(log(min(a, b)))
SPACE:        O(1) iterative, O(log n) recursive
COMMON TRAP:  Overflow in LCM — divide first: a / gcd(a,b) * b
EXPERIENCE TIP: Always use iterative in production; pass abs values for safety
```

---

## LCM

### What is it?
LCM (Least Common Multiple) of two numbers is the smallest number that both a and b divide into evenly. It is always computed from GCD — never independently — using the formula `lcm(a, b) = a / gcd(a, b) * b`.

### Visual
```
Find lcm(4, 6):

Multiples of 4: 4, 8, 12, 16, 20, ...
Multiples of 6: 6, 12, 18, 24, ...
First common:   12

Using formula: gcd(4, 6) = 2
               lcm = 4 / 2 * 6 = 12  ✓
```

### How does it work?
1. Compute gcd(a, b) using the Euclidean algorithm.
2. Use the relationship: `lcm(a, b) = (a * b) / gcd(a, b)`.
3. To avoid overflow, divide before multiplying: `a / gcd(a, b) * b`.
4. For an array: `lcm(a, b, c) = lcm(lcm(a, b), c)` — apply pairwise.

### Why does it work?
Every number can be written as a product of primes. GCD picks the minimum power of each prime; LCM picks the maximum. Their product relationship `GCD * LCM = a * b` is a direct consequence of `min(x,y) + max(x,y) = x + y` applied to exponents.

### When to use?
- Find when two cyclic events (period A and period B) coincide next.
- "What is the smallest number divisible by both A and B?"
- Fraction arithmetic: LCM of denominators is the common denominator.
- Problems involving time intervals, gears, or repeating patterns.

### When NOT to use?
- When you need the GCD directly (don't compute LCM as an intermediate).
- When the numbers can be very large and LCM would overflow even a long — use BigInteger or modular arithmetic.

### How to recognize in a new problem?
Look for "both divisible by", "smallest number that is a multiple of", "when do they meet again", "synchronize cycles". Signals:
- Two clocks that tick every A and B seconds — when do they tick together?
- "Find the smallest positive integer divisible by every number in the array"

### Simple Example
Input: `a = 12, b = 18`
Expected output: `36`

Trace:
```
gcd(12, 18):
  18 % 12 = 6  →  gcd(12, 6)
  12 %  6 = 0  →  return 6

lcm = 12 / 6 * 18 = 2 * 18 = 36
```

### Code
```java
// Java
long lcm(long a, long b) {
    return a / gcd(a, b) * b;  // divide first to avoid overflow
}

long gcd(long a, long b) {
    return b == 0 ? a : gcd(b, a % b);
}

// LCM of an array
long lcmArray(int[] arr) {
    long result = arr[0];
    for (int i = 1; i < arr.length; i++) {
        result = lcm(result, arr[i]);
    }
    return result;
}
```
```javascript
// JavaScript
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function lcm(a, b) {
    return (a / gcd(a, b)) * b;  // divide first
}

function lcmArray(arr) {
    return arr.reduce((acc, val) => lcm(acc, val), arr[0]);
}
```

### Dry Run
```
lcm(12, 18):

1. gcd(12, 18):
   gcd(18, 12) → gcd(12, 6) → gcd(6, 0) = 6

2. lcm = 12 / 6 * 18
       = 2 * 18
       = 36

Verify: 36 / 12 = 3 ✓    36 / 18 = 2 ✓    No smaller common multiple exists.
```

### Complexity
```
Time:  O(log(min(a, b))) — dominated by the GCD computation
Space: O(1) iterative
```

### Common Trap
- **Overflow:** NEVER write `a * b / gcd(a, b)`. If a = 10^9 and b = 10^9, the product overflows a 64-bit long. Always write `a / gcd(a, b) * b`.
- **LCM of array can be huge:** Even if individual numbers are small, the LCM of many numbers can be astronomically large. Use BigInteger if needed or check constraints carefully.

### Experience Tip
**Experience Tip:** In interview problems, LCM almost never appears alone — it's always paired with GCD. Memorize the formula `lcm = a / gcd(a,b) * b` cold. The division-first trick is what separates candidates who know the pitfall from those who don't.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 1979 | Find Greatest Common Divisor of Array | Easy | Pair LCM with GCD thinking | https://leetcode.com/problems/find-greatest-common-divisor-of-array/ |
| 1201 | Ugly Number III | Medium | Use LCM for inclusion-exclusion across three factors | https://leetcode.com/problems/ugly-number-iii/ |
| 878 | Nth Magical Number | Medium | LCM determines the repeat cycle; binary search on it | https://leetcode.com/problems/nth-magical-number/ |
| 2413 | Smallest Even Multiple | Easy | lcm(n, 2) — the simplest LCM problem | https://leetcode.com/problems/smallest-even-multiple/ |
| 2344 | Minimum Deletions to Make Array Divisible | Hard | GCD of one array must divide GCD of another | https://leetcode.com/problems/minimum-deletions-to-make-array-divisible/ |

### One-Minute Revision
```
ALGORITHM:    LCM
IN SIMPLE WORDS: Smallest number both a and b divide into evenly
USE WHEN:     Synchronize cycles, common denominator, "divisible by both"
KEY FORMULA:  lcm(a, b) = a / gcd(a, b) * b   (divide FIRST)
TIME:         O(log(min(a, b)))
SPACE:        O(1)
COMMON TRAP:  a * b overflows — always divide before multiplying
EXPERIENCE TIP: Memorize the formula; LCM always relies on GCD
```

---

## Sieve of Eratosthenes

### What is it?
The Sieve of Eratosthenes is an algorithm that finds all prime numbers up to a given limit N. It starts by assuming every number is prime, then systematically marks multiples of each prime as "not prime" (composite). What remains unmarked are the true primes. It runs in O(n log log n) — nearly linear — which is far faster than checking each number individually.

### Visual
```
Find all primes up to 20:

Start: mark every number 2..20 as prime (T = prime, F = not prime)
Index: 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
       F  F  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T

p=2: mark 4, 6, 8, 10, 12, 14, 16, 18, 20 as F
       F  F  T  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F

p=3: mark 9, 15 as F  (3*3=9, 3*5=15; 3*6=18 already marked)
       F  F  T  T  F  T  F  T  F  F  F  T  F  T  F  F  F  T  F  T  F

p=4: isPrime[4]=F, skip
p=5: 5*5=25 > 20, stop

Primes: 2, 3, 5, 7, 11, 13, 17, 19
```

### How does it work?
1. Create a boolean array `isPrime[0..n]`, set all to `true`.
2. Set `isPrime[0] = false` and `isPrime[1] = false` (0 and 1 are not prime).
3. For each `p` from 2 to `sqrt(n)`:
   - If `isPrime[p]` is still true, p is prime.
   - Mark all multiples of p starting from `p*p` as false.
4. Start marking from `p*p`, not from `2*p` — earlier multiples (2p, 3p, ...) were already marked by smaller primes.
5. After the loop, every index still marked `true` is a prime.

### Why does it work?
Every composite number c has at least one factor <= sqrt(c). So by the time we process prime p, every composite less than p*p has already been marked by a smaller prime. Starting from p*p is therefore safe — we mark exactly the new composites that only p can reach at this stage.

### When to use?
- Need all primes up to N (N up to 10^7 is comfortable; 10^8 with care).
- Need to factorize many numbers quickly — build a Smallest Prime Factor (SPF) sieve.
- "Count primes below N" problems.
- Pre-computation step when you'll answer many prime-related queries.

### When NOT to use?
- N is extremely large (> 10^8): memory becomes a bottleneck (1 byte per number = 100 MB). Use a segmented sieve or a primality test like Miller-Rabin instead.
- You only need to check primality for a single large number — use trial division up to sqrt(n) instead.

### How to recognize in a new problem?
Key signals:
- "Count primes less than n" or "find all prime numbers up to n"
- "Check if many numbers are prime" (pre-compute with sieve instead of checking each)
- Constraints say n <= 10^6 or 10^7 — sieve fits comfortably in memory and time

### Simple Example
Input: `n = 10`
Expected output: primes = `[2, 3, 5, 7]`

Trace:
```
isPrime = [F, F, T, T, T, T, T, T, T, T, T]
p=2: mark 4, 6, 8, 10
isPrime = [F, F, T, T, F, T, F, T, F, T, F]
p=3: mark 9
isPrime = [F, F, T, T, F, T, F, T, F, F, F]
p=4: already F, skip
sqrt(10) ≈ 3.16, stop at p=3.
Remaining T: indices 2, 3, 5, 7
```

### Code
```java
// Java
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

// Count primes (LeetCode 204)
int countPrimes(int n) {
    if (n <= 2) return 0;
    boolean[] isPrime = sieve(n - 1);
    int count = 0;
    for (boolean b : isPrime) if (b) count++;
    return count;
}
```
```javascript
// JavaScript
function sieve(n) {
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

function countPrimes(n) {
    if (n <= 2) return 0;
    const isPrime = sieve(n - 1);
    return isPrime.filter(Boolean).length;
}
```

### Dry Run
```
sieve(15):

Initial isPrime: [F,F,T,T,T,T,T,T,T,T,T,T,T,T,T,T]

p=2 (isPrime[2]=T):
  Mark 4, 6, 8, 10, 12, 14
  isPrime: [F,F,T,T,F,T,F,T,F,T,F,T,F,T,F,T]

p=3 (isPrime[3]=T):
  Start at 3*3=9. Mark 9, 12(skip,done), 15
  isPrime: [F,F,T,T,F,T,F,T,F,F,F,T,F,T,F,F]

p=4 (isPrime[4]=F): skip

sqrt(15) ≈ 3.87 → stop after p=3

Primes: indices where isPrime=T → 2, 3, 5, 7, 11, 13
```

### Complexity
```
Time:  O(n log log n) — nearly linear; the harmonic series of primes converges slowly
Space: O(n) — one boolean per index
```

### Common Trap
- **Starting inner loop at 2*p instead of p*p:** Starting at p*p is correct and saves time. Starting at 2*p works but marks duplicates — it is slower, not wrong. Know the reason: all multiples below p*p were already handled by smaller primes.
- **p*p integer overflow:** When p and n are large (e.g., n=10^6), `p*p` can overflow int. Cast to long: `(long) p * p <= n`.
- **Off-by-one on "count primes below n":** "Below n" means `< n`, not `<= n`. Run sieve on `n-1`, or exclude index `n`.

### Experience Tip
**Experience Tip:** At Google, "Count Primes" (LeetCode 204) is the canonical sieve problem. The interviewer watches whether you start marking from p*p (not 2*p) and whether you loop p only to sqrt(n). These two optimizations signal that you actually understand why the sieve works, not just that you memorized it.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 204 | Count Primes | Medium | Classic sieve — start marks at p*p, loop to sqrt(n) | https://leetcode.com/problems/count-primes/ |
| 263 | Ugly Number | Easy | A number whose only prime factors are 2, 3, 5 | https://leetcode.com/problems/ugly-number/ |
| 279 | Perfect Squares | Medium | Pre-sieve perfect squares; BFS/DP over them | https://leetcode.com/problems/perfect-squares/ |
| 762 | Prime Number of Set Bits in Binary Representation | Easy | Sieve primes up to 20, check bit count | https://leetcode.com/problems/prime-number-of-set-bits-in-binary-representation/ |
| 866 | Prime Palindrome | Medium | Sieve + palindrome check, notice all even-digit palindromes > 11 are composite | https://leetcode.com/problems/prime-palindrome/ |

### One-Minute Revision
```
ALGORITHM:    Sieve of Eratosthenes
IN SIMPLE WORDS: Mark all multiples of each prime as composite; what's left is prime
USE WHEN:     Find/count all primes up to N (N <= 10^7)
KEY FORMULA:  Mark p*p, p*p+p, p*p+2p, ... for each prime p up to sqrt(n)
TIME:         O(n log log n)
SPACE:        O(n)
COMMON TRAP:  p*p overflows int — cast to long before comparing
EXPERIENCE TIP: Start marks at p*p (not 2*p) — prove you understand, not memorize
```

---

## Fast Power / Binary Exponentiation

### What is it?
Fast Power (also called Binary Exponentiation or modPow) computes `a^n` in O(log n) time instead of O(n). It works by repeatedly squaring the base and using the binary representation of the exponent to decide which squares to multiply together. For modular problems, it applies `% mod` at every step to keep numbers small.

### Visual
```
Compute 3^13:

13 in binary = 1101
             = 8 + 4 + 1

3^13 = 3^8 × 3^4 × 3^1

Build up by squaring:
  3^1  = 3
  3^2  = 9      (square 3^1)
  3^4  = 81     (square 3^2)
  3^8  = 6561   (square 3^4)

Multiply where binary bit is 1:
  bit 0 (value 1): 3^1  = 3          → result = 3
  bit 1 (value 2): 3^2  — bit is 0   → skip
  bit 2 (value 4): 3^4  = 81         → result = 3 × 81 = 243
  bit 3 (value 8): 3^8  = 6561       → result = 243 × 6561 = 1594323

3^13 = 1594323 ✓
```

### How does it work?
1. Start with `result = 1`.
2. Check the lowest bit of exponent `n`.
3. If the bit is 1, multiply `result` by the current `base`.
4. Square the `base` (for the next bit position).
5. Right-shift `n` by 1 (move to the next bit).
6. Repeat until `n == 0`.
7. For modular version: apply `% mod` after every multiplication.

### Why does it work?
Every integer n can be uniquely written in binary: `n = b_k * 2^k + ... + b_1 * 2 + b_0`. Then `a^n = a^(b_k * 2^k) * ... * a^(b_0)`. Each `a^(2^i)` is just the previous one squared. We include only the terms where the bit is 1. The total number of squarings = number of bits in n = O(log n).

### When to use?
- Computing `a^n` for large n (n up to 10^18).
- Modular exponentiation: `a^n % mod`.
- Computing modular inverse: `a^(mod-2) % mod` (when mod is prime).
- Matrix exponentiation (replace scalar multiply with matrix multiply) for Fibonacci in O(log n).

### When NOT to use?
- When n is small (n < 30): direct multiplication is fine and clearer.
- When base or exponent is floating-point: use the language's built-in `Math.pow` instead.

### How to recognize in a new problem?
Signals:
- Problem says `pow(x, n)` with n potentially up to 2^31 or 10^18.
- "Compute answer modulo 10^9+7" where the answer involves exponentiation.
- "Compute Fibonacci(n) for n up to 10^18" (matrix exponentiation variant).

### Simple Example
Input: `base = 2, exp = 10`
Expected output: `1024`

Trace:
```
exp=10 = 1010 in binary

result=1, base=2
Step 1: exp=10 (even, bit=0) → skip; base=4,  exp=5
Step 2: exp= 5 (odd,  bit=1) → result=1*4=4;  base=16, exp=2
Step 3: exp= 2 (even, bit=0) → skip; base=256, exp=1
Step 4: exp= 1 (odd,  bit=1) → result=4*256=1024; base=..., exp=0
Done. return 1024. ✓
```

### Code
```java
// Java
long modPow(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
        if ((exp & 1) == 1) {          // current bit is 1
            result = result * base % mod;
        }
        base = base * base % mod;       // square for next bit
        exp >>= 1;                      // move to next bit
    }
    return result;
}

// Pow(x, n) — LeetCode 50, handles negative exponent
double myPow(double x, int n) {
    long N = n;
    if (N < 0) { x = 1.0 / x; N = -N; }
    double result = 1.0;
    while (N > 0) {
        if ((N & 1) == 1) result *= x;
        x *= x;
        N >>= 1;
    }
    return result;
}
```
```javascript
// JavaScript — use BigInt for very large numbers
function modPow(base, exp, mod) {
    base = BigInt(base); exp = BigInt(exp); mod = BigInt(mod);
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1n;
    }
    return Number(result);
}

// For regular (non-modular) small numbers
function fastPow(base, exp) {
    let result = 1;
    while (exp > 0) {
        if (exp & 1) result *= base;
        base *= base;
        exp >>= 1;
    }
    return result;
}
```

### Dry Run
```
modPow(3, 13, 1000000007):

Binary of 13 = 1101

result=1, base=3, exp=13
Step 1: exp=13 odd  → result = 1*3 = 3;       base=9,    exp=6
Step 2: exp=6  even → skip;                    base=81,   exp=3
Step 3: exp=3  odd  → result = 3*81 = 243;     base=6561, exp=1
Step 4: exp=1  odd  → result = 243*6561 = 1594323; base=..., exp=0

return 1594323
(With mod applied at each step, result stays below 10^9+7)
```

### Complexity
```
Time:  O(log n) — one iteration per bit of the exponent
Space: O(1) — only a few variables
```

### Common Trap
- **Negative exponent (LeetCode 50):** When n is negative, `n = Integer.MIN_VALUE` (-2^31). Taking `-n` overflows int. Cast to long first: `long N = n; if (N < 0) { x = 1/x; N = -N; }`.
- **Forgetting `base %= mod` at the start:** If base is larger than mod, the first multiplication can overflow. Always reduce base modulo mod before the loop.
- **JS number precision:** For n > 2^53, JavaScript's `number` type loses precision. Use `BigInt` for large modular exponentiation.

### Experience Tip
**Experience Tip:** "Pow(x, n)" (LeetCode 50) is a staple Google question. They watch three things: do you handle n=0 (answer is 1), do you handle negative n (invert base), and do you handle Integer.MIN_VALUE without overflow. Nail those and the rest is mechanical.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 50 | Pow(x, n) | Medium | Handle n<0 and Integer.MIN_VALUE overflow | https://leetcode.com/problems/pow-x-n/ |
| 326 | Power of Three | Easy | Check if n = 3^k; also try: is n a divisor of max power of 3 in int range? | https://leetcode.com/problems/power-of-three/ |
| 342 | Power of Four | Easy | Check bit count and bit position simultaneously | https://leetcode.com/problems/power-of-four/ |
| 1922 | Count Good Numbers | Medium | Positions for even/prime digits — fast modular exponentiation | https://leetcode.com/problems/count-good-numbers/ |
| 372 | Super Pow | Medium | Modular exponentiation with digit-by-digit decomposition | https://leetcode.com/problems/super-pow/ |

### One-Minute Revision
```
ALGORITHM:    Fast Power / Binary Exponentiation
IN SIMPLE WORDS: Use binary form of exponent; square base, multiply when bit=1
USE WHEN:     a^n for large n, modular exponentiation, modular inverse
KEY FORMULA:  if bit set: result *= base; always: base *= base; exp >>= 1
TIME:         O(log n)
SPACE:        O(1)
COMMON TRAP:  Negative n with Integer.MIN_VALUE overflows int — cast to long first
EXPERIENCE TIP: Always reduce base % mod before the loop; handle n=0 returns 1
```

---

## Modular Arithmetic

### What is it?
Modular arithmetic is "clock math" — numbers wrap around after reaching a limit (the modulus). When a problem says "return the answer modulo 10^9+7", every intermediate result must also be taken modulo that number to prevent overflow and keep results manageable. The modulus 10^9+7 is chosen specifically because it is prime (enabling division) and fits nicely in a 64-bit integer.

### Visual
```
Regular arithmetic:  3 + 11 = 14
Clock arithmetic (mod 12):
  3 + 11 = 14 → 14 % 12 = 2  (it's 2 o'clock, not 14 o'clock)

Why 10^9+7?
  Max value before mod: 10^9+6
  Two values multiplied: (10^9+6)^2 ≈ 10^18 < 2^63 - 1 (long max)
  So (a * b) % MOD never overflows a long. ✓
```

### How does it work?
1. **Addition:** `(a + b) % mod` — safe, no issues.
2. **Subtraction:** `(a - b + mod) % mod` — MUST add mod first to prevent negative results.
3. **Multiplication:** `(a * b) % mod` — in Java, cast to long if a and b are int.
4. **Exponentiation:** Use Fast Power (binary exponentiation) — never loop n times.
5. **Division:** Cannot simply divide; must use the modular inverse of the denominator.
6. **Modular Inverse (when mod is prime):** By Fermat's Little Theorem, `a^(-1) ≡ a^(mod-2) (mod)`. Compute with modPow.

### Why does it work?
The key property: if `a ≡ a' (mod m)` and `b ≡ b' (mod m)`, then `a+b ≡ a'+b' (mod m)` and `a*b ≡ a'*b' (mod m)`. This means you can reduce intermediate results at any step and the final answer is still correct. Division breaks this rule — `(a/b) % m ≠ (a%m) / (b%m)` — which is why modular inverse is necessary.

### When to use?
- Problem says "return answer modulo 10^9+7" or "modulo m".
- Counting combinations, paths, or ways — answers grow exponentially.
- Computing factorials for large n.
- Any situation where intermediate results would exceed 64-bit integer range.

### When NOT to use?
- When the problem asks for the exact value (not modded) — modular arithmetic destroys comparison ordering.
- When comparing two results for equality after modding — two different values can have the same modular residue (hash collision-like).

### How to recognize in a new problem?
The problem statement almost always says it explicitly: "return the answer modulo 10^9+7". Beyond that:
- Any DP problem counting arrangements for large n — the count explodes, mod is implied.
- "How many ways..." problems with n up to 10^5 or higher.

### Simple Example
Compute `(factorial of 5) mod 7`:

```
5! = 120
120 mod 7 = 1

OR apply mod at each step:
1 * 1 % 7 = 1
1 * 2 % 7 = 2
2 * 3 % 7 = 6
6 * 4 % 7 = 24 % 7 = 3
3 * 5 % 7 = 15 % 7 = 1

Same answer: 1 ✓
```

### Code
```java
// Java
static final long MOD = 1_000_000_007;

// Addition
long add(long a, long b) {
    return (a + b) % MOD;
}

// Subtraction — critical: add MOD to prevent negative
long sub(long a, long b) {
    return (a - b + MOD) % MOD;
}

// Multiplication
long mul(long a, long b) {
    return (a % MOD) * (b % MOD) % MOD;
}

// Modular inverse — only valid when MOD is prime
long modInverse(long a) {
    return modPow(a, MOD - 2, MOD);
}

// Division via inverse
long div(long a, long b) {
    return mul(a, modInverse(b));
}

// Factorial precomputation (useful for nCr)
long[] precomputeFactorials(int n) {
    long[] fact = new long[n + 1];
    fact[0] = 1;
    for (int i = 1; i <= n; i++) {
        fact[i] = fact[i - 1] * i % MOD;
    }
    return fact;
}
```
```javascript
// JavaScript
const MOD = 1_000_000_007n;  // Use BigInt for safety

function add(a, b) { return (BigInt(a) + BigInt(b)) % MOD; }
function sub(a, b) { return (BigInt(a) - BigInt(b) + MOD) % MOD; }
function mul(a, b) { return (BigInt(a) % MOD) * (BigInt(b) % MOD) % MOD; }

function modInverse(a) {
    return modPow(BigInt(a), MOD - 2n, MOD);
}

// Regular number approach (safe for numbers < 2^53)
const MOD_NUM = 1_000_000_007;
function addMod(a, b) { return (a + b) % MOD_NUM; }
function subMod(a, b) { return ((a - b) % MOD_NUM + MOD_NUM) % MOD_NUM; }
function mulMod(a, b) { return Math.floor(a * b % MOD_NUM); }  // careful with large values
```

### Dry Run
```
Compute (17 - 25) mod 13:

Wrong: (17 - 25) % 13 = -8 % 13 = -8  ← negative! Wrong.
Right: (17 - 25 + 13) % 13 = 5 % 13 = 5  ← correct

Verify: 17 mod 13 = 4, 25 mod 13 = 12
        4 - 12 = -8 ≡ 5 (mod 13)  [since -8 + 13 = 5]  ✓
```

### Complexity
```
Time:  O(1) per operation; O(n) to precompute n factorials; O(log mod) for modInverse
Space: O(1) per operation; O(n) for factorial array
```

### Common Trap
- **Subtraction without +mod:** `(a - b) % mod` can be negative in Java and JavaScript. ALWAYS write `(a - b + mod) % mod`.
- **Division in mod world:** `(6 / 2) % 7 = 3` works here coincidentally, but `(7 / 2) % 7` is wrong. Always use modular inverse for division.
- **Intermediate overflow:** In Java with int variables, `a * b` overflows before `% mod` is applied. Ensure both operands are `long`.

### Experience Tip
**Experience Tip:** At Google, any problem counting arrangements or paths at scale will require mod 10^9+7. The most common mistake is forgetting to add MOD before subtracting. Write a helper `subMod(a, b)` function once and use it everywhere — it removes this entire class of bugs.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 1922 | Count Good Numbers | Medium | Even-position and prime-position counts; modular exponentiation | https://leetcode.com/problems/count-good-numbers/ |
| 62 | Unique Paths | Medium | nCr formula with mod, or plain DP | https://leetcode.com/problems/unique-paths/ |
| 509 | Fibonacci Number | Easy | Apply mod at each DP step for large variants | https://leetcode.com/problems/fibonacci-number/ |
| 172 | Factorial Trailing Zeroes | Medium | Count factors of 5 (not 2) in n! | https://leetcode.com/problems/factorial-trailing-zeroes/ |
| 50 | Pow(x, n) | Medium | Modular exponentiation foundation | https://leetcode.com/problems/pow-x-n/ |

### One-Minute Revision
```
ALGORITHM:    Modular Arithmetic
IN SIMPLE WORDS: Wrap numbers at mod to prevent overflow; apply mod at every step
USE WHEN:     "Return answer mod 10^9+7", counting arrangements, large factorials
KEY FORMULA:  sub: (a-b+MOD)%MOD  div: a * modInverse(b) % MOD
TIME:         O(1) per op; O(log mod) for inverse
SPACE:        O(1)
COMMON TRAP:  Subtraction → always add MOD; division → use modular inverse, not /
EXPERIENCE TIP: Write helper subMod(), mulMod() once; use everywhere
```

---

## Combinatorics (nCr)

### What is it?
Combinatorics is the math of counting. nCr (read "n choose r") counts the number of ways to pick r items from n items when order does not matter. For example, choosing 2 toppings from 5 options = C(5,2) = 10 ways. In interviews, you compute nCr modulo 10^9+7 using precomputed factorials and modular inverses to handle large inputs efficiently.

### Visual
```
C(5, 2) — choose 2 from {A, B, C, D, E}:

{A,B}, {A,C}, {A,D}, {A,E},
{B,C}, {B,D}, {B,E},
{C,D}, {C,E},
{D,E}
= 10 combinations

Formula: C(5,2) = 5! / (2! × 3!) = 120 / (2 × 6) = 10 ✓

Pascal's Triangle (every cell = sum of two above):
       1
      1 1
     1 2 1
    1 3 3 1
   1 4 6 4 1
  1 5 10 10 5 1
     ↑
  C(5,2)=10 is at row 5, position 2
```

### How does it work?
**Method 1 — Pascal's Triangle (for small n, no mod needed):**
1. Build a 2D array `C[n+1][n+1]`.
2. `C[i][0] = 1` and `C[i][i] = 1` for all i (base cases).
3. `C[i][j] = C[i-1][j-1] + C[i-1][j]` (choose includes or excludes item i).

**Method 2 — Factorial precomputation (for large n with mod):**
1. Precompute `fact[i] = i! % mod` for i from 0 to n.
2. Precompute `inv_fact[n] = modPow(fact[n], mod-2, mod)`.
3. Fill backwards: `inv_fact[i] = inv_fact[i+1] * (i+1) % mod`.
4. Then `C(n, r) = fact[n] * inv_fact[r] % mod * inv_fact[n-r] % mod`.

### Why does it work?
`C(n, r) = n! / (r! × (n-r)!)` directly from the definition. Dividing in modular arithmetic uses the modular inverse: `a / b ≡ a × b^(mod-2) (mod)`. Precomputing inverse factorials with the back-fill trick `inv_fact[i] = inv_fact[i+1] × (i+1) % mod` avoids calling modPow n times — it derives all inverses in one O(n) pass from a single modPow call.

### When to use?
- "How many ways to choose k items from n?" → C(n, k).
- Grid path counting: unique paths in an m×n grid = C(m+n-2, m-1).
- "Distribute n identical items into k bins" → C(n+k-1, k-1) (Stars and Bars).
- Any DP where transitions count combinations.

### When NOT to use?
- When order matters (that's permutations: P(n,r) = n!/(n-r)!).
- When n is larger than your precomputed range — resize the factorial array accordingly.

### How to recognize in a new problem?
Signals:
- "How many ways..." or "count the number of..."
- Grid movement problem with only right/down moves
- "Choose k from n" stated directly or implied by symmetry

### Simple Example
Input: `n = 4, r = 2`
Expected output: `6`

Pascal's Triangle trace:
```
C[0][0]=1
C[1][0]=1, C[1][1]=1
C[2][0]=1, C[2][1]=2, C[2][2]=1
C[3][0]=1, C[3][1]=3, C[3][2]=3, C[3][3]=1
C[4][0]=1, C[4][1]=4, C[4][2]=6, C[4][3]=4, C[4][4]=1

C[4][2] = 6 ✓
```

### Code
```java
// Java

// Method 1: Pascal's Triangle (small n)
int[][] buildPascal(int n) {
    int[][] C = new int[n + 1][n + 1];
    for (int i = 0; i <= n; i++) {
        C[i][0] = 1;
        for (int j = 1; j <= i; j++) {
            C[i][j] = C[i-1][j-1] + C[i-1][j];
        }
    }
    return C;
}

// Method 2: Factorial precomputation for large n with mod
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
```javascript
// JavaScript
const MOD = 1_000_000_007n;

function precompute(n) {
    const fact = new Array(n + 1);
    const inv_fact = new Array(n + 1);
    fact[0] = 1n;
    for (let i = 1; i <= n; i++) fact[i] = fact[i-1] * BigInt(i) % MOD;
    inv_fact[n] = modPow(fact[n], MOD - 2n, MOD);
    for (let i = n - 1; i >= 0; i--) inv_fact[i] = inv_fact[i+1] * BigInt(i+1) % MOD;
    return { fact, inv_fact };
}

function nCr(n, r, fact, inv_fact) {
    if (r < 0 || r > n) return 0n;
    return fact[n] * inv_fact[r] % MOD * inv_fact[n - r] % MOD;
}
```

### Dry Run
```
C(6, 2) using factorial method with MOD = 1000000007:

fact[0..6] = [1, 1, 2, 6, 24, 120, 720]
inv_fact[6] = modPow(720, MOD-2, MOD) = 861916685 (precomputed)
inv_fact[5] = inv_fact[6] * 6 % MOD = ...
...
inv_fact[2] = ... (some value)
inv_fact[4] = ... (some value)

C(6,2) = fact[6] * inv_fact[2] * inv_fact[4] % MOD
       = 720 * inv_fact[2] * inv_fact[4] % MOD
       = 15 (same as 6!/(2!*4!) = 720/(2*24) = 15) ✓
```

### Complexity
```
Time:  O(n) to precompute; O(1) per nCr query after precomputation
       O(n^2) for Pascal's Triangle
Space: O(n) for factorial arrays; O(n^2) for Pascal's Triangle
```

### Common Trap
- **r > n:** Always check `if (r < 0 || r > n) return 0`. Forgetting this causes array-out-of-bounds.
- **Order of operations in Java:** `fact[n] * inv_fact[r] % MOD * inv_fact[n-r] % MOD` is correct. Do NOT write `fact[n] * (inv_fact[r] * inv_fact[n-r] % MOD) % MOD` without the intermediate mod — the inner product can overflow a long if both inv_fact values are close to MOD.
- **Precomputing enough:** If queries go up to n=10^6, precompute up to 10^6. Off-by-one in array size causes subtle bugs.

### Experience Tip
**Experience Tip:** The back-fill trick for inverse factorials (`inv_fact[i] = inv_fact[i+1] * (i+1) % MOD`) is elegant and important — it turns O(n log mod) into O(n + log mod). Explain it to your interviewer proactively; it signals depth of understanding.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 62 | Unique Paths | Medium | C(m+n-2, m-1) — grid paths as combinations | https://leetcode.com/problems/unique-paths/ |
| 1266 | Minimum Time Visiting All Points | Easy | Combinatorics intuition warm-up | https://leetcode.com/problems/minimum-time-visiting-all-points/ |
| 96 | Unique Binary Search Trees | Medium | Catalan number = C(2n,n)/(n+1), DP version is clearer | https://leetcode.com/problems/unique-binary-search-trees/ |
| 1569 | Number of Ways to Reorder Array to Get Same BST | Hard | Combinatorics on tree structure — C(n,k) at each split | https://leetcode.com/problems/number-of-ways-to-reorder-array-to-get-same-bst/ |
| 1916 | Count Ways to Build Rooms in an Ant Colony | Hard | Tree DP + factorial / combinatorics | https://leetcode.com/problems/count-ways-to-build-rooms-in-an-ant-colony/ |

### One-Minute Revision
```
ALGORITHM:    Combinatorics — nCr
IN SIMPLE WORDS: Count ways to choose r items from n (order doesn't matter)
USE WHEN:     Grid paths, "how many ways", combinations, Stars and Bars
KEY FORMULA:  C(n,r) = fact[n] * inv_fact[r] * inv_fact[n-r] % MOD
TIME:         O(n) precompute, O(1) per query
SPACE:        O(n)
COMMON TRAP:  r > n returns 0; operator order in Java — apply % after each multiply
EXPERIENCE TIP: Explain the back-fill inv_fact trick — signals you understand modular inverse
```

---

## Fisher-Yates Shuffle

### What is it?
Fisher-Yates Shuffle is the standard algorithm to randomly permute (shuffle) an array so that every possible ordering has an equal probability of occurring. It works in O(n) by scanning from the end and swapping each element with a randomly chosen element before it (inclusive of itself).

### Visual
```
Shuffle [1, 2, 3, 4]:

i=3: pick j randomly from [0,3], say j=1 → swap arr[3] and arr[1]
     [1, 4, 3, 2]

i=2: pick j randomly from [0,2], say j=0 → swap arr[2] and arr[0]
     [3, 4, 1, 2]

i=1: pick j randomly from [0,1], say j=1 → swap arr[1] and arr[1] (no-op)
     [3, 4, 1, 2]

Done. One of 4! = 24 equally likely permutations.
```

### How does it work?
1. Start from the last element (index n-1).
2. Pick a random index j from 0 to i (inclusive).
3. Swap arr[i] with arr[j].
4. Move i one step left (i--).
5. Repeat until i reaches 1 (i=0 is always a swap with itself, so stop at i=1).

### Why does it work?
After processing position i, the element at arr[i] was chosen uniformly from i+1 elements (all positions 0..i). The probability that any specific element lands at position i is 1/(i+1). Combined with the earlier shuffled positions, each of the n! permutations has probability `1/n * 1/(n-1) * ... * 1/1 = 1/n!` — exactly uniform.

The critical insight: using `j in [0, n)` uniformly throughout (naive approach) gives n^n outcomes for n! permutations. Since n^n is not divisible by n! (when n > 2), the distribution cannot be uniform. The shrinking range [0, i] is what makes it work.

### When to use?
- "Shuffle an array" or "generate a random permutation".
- Card game simulations, random sampling without replacement.
- When `Collections.shuffle()` is not available or not allowed.

### When NOT to use?
- When you need a reproducible "random" sequence — use a seeded random instead, but the algorithm is the same.
- When you only need one random element (just pick one index randomly, no need to shuffle the whole array).

### How to recognize in a new problem?
Signals:
- "Design a method to shuffle a deck of cards"
- "Return a randomly shuffled copy of the array"
- "Each element must be equally likely to appear in any position"

### Simple Example
Input: `arr = [1, 2, 3]`
Expected output: one of the 6 permutations, each with probability 1/6

Trace with fixed random choices j=2, j=0:
```
i=2: j=2 → swap arr[2] and arr[2] → [1, 2, 3]
i=1: j=0 → swap arr[1] and arr[0] → [2, 1, 3]
Result: [2, 1, 3]
```

### Code
```java
// Java
void shuffle(int[] arr) {
    Random rand = new Random();
    for (int i = arr.length - 1; i > 0; i--) {
        int j = rand.nextInt(i + 1);  // j in [0, i] inclusive
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}

// LeetCode 384 pattern
class Solution {
    private int[] original;
    private int[] array;
    private Random rand = new Random();

    public Solution(int[] nums) {
        original = nums.clone();
        array = nums.clone();
    }

    public int[] reset() {
        array = original.clone();
        return array;
    }

    public int[] shuffle() {
        for (int i = array.length - 1; i > 0; i--) {
            int j = rand.nextInt(i + 1);
            int temp = array[i]; array[i] = array[j]; array[j] = temp;
        }
        return array;
    }
}
```
```javascript
// JavaScript
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // [0, i] inclusive
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
```

### Dry Run
```
shuffle([A, B, C, D]):  (using fixed random choices for illustration)

i=3: j = random in [0,3] → say j=1 → swap arr[3] and arr[1]
     [A, D, C, B]

i=2: j = random in [0,2] → say j=0 → swap arr[2] and arr[0]
     [C, D, A, B]

i=1: j = random in [0,1] → say j=1 → swap arr[1] and arr[1] (no-op)
     [C, D, A, B]

Final: [C, D, A, B] — one of 24 equally likely permutations.
```

### Complexity
```
Time:  O(n) — one swap per element
Space: O(1) — in-place; O(n) if you need to preserve the original
```

### Common Trap
- **Wrong range for j:** Using `j = random in [0, n)` throughout (instead of `[0, i]`) produces a biased shuffle. n^n arrangements map to n! permutations unevenly. The range MUST shrink with i.
- **Off-by-one:** Loop must go `i > 0` (or `i >= 1`), not `i >= 0`. When i=0 you'd only swap with index 0 — it's a no-op, wastes a call, and some implementations break here.

### Experience Tip
**Experience Tip:** When asked "why not just pick j from [0, n) always?", explain the n^n vs n! argument — it shows you understand probability theory, not just the code. This is a common Google follow-up question.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 384 | Shuffle an Array | Medium | Implement Fisher-Yates; store original for reset() | https://leetcode.com/problems/shuffle-an-array/ |
| 1470 | Shuffle the Array | Easy | Not Fisher-Yates — just interleaving two halves | https://leetcode.com/problems/shuffle-the-array/ |
| 528 | Random Pick with Weight | Medium | Weighted random — prefix sum + binary search | https://leetcode.com/problems/random-pick-with-weight/ |
| 519 | Random Flip Matrix | Medium | Efficient random selection without re-picking | https://leetcode.com/problems/random-flip-matrix/ |
| 382 | Linked List Random Node | Medium | Reservoir sampling (not Fisher-Yates, but related randomness) | https://leetcode.com/problems/linked-list-random-node/ |

### One-Minute Revision
```
ALGORITHM:    Fisher-Yates Shuffle
IN SIMPLE WORDS: For each position from end, swap with a random earlier position
USE WHEN:     Uniformly random permutation of an array
KEY FORMULA:  for i from n-1 to 1: j = random in [0, i]; swap arr[i], arr[j]
TIME:         O(n)
SPACE:        O(1) in-place
COMMON TRAP:  j must be in [0, i] not [0, n) — shrinking range is essential for uniformity
EXPERIENCE TIP: Explain n^n vs n! to the interviewer — it proves you understand the WHY
```

---

## Reservoir Sampling

### What is it?
Reservoir Sampling is an algorithm to pick k items uniformly at random from a stream (or list) of unknown total length, using only O(k) memory. You process each item once, deciding on the fly whether it joins the "reservoir" (the selected set). After processing all n items, every item has exactly k/n probability of being selected — even though you never knew n in advance.

### Visual
```
Pick 1 item (k=1) from stream [A, B, C, D, E]:

i=1, item=A: reservoir = A                  (always pick first)
i=2, item=B: flip coin with prob 1/2 → heads → reservoir = B
i=3, item=C: flip coin with prob 1/3 → tails → reservoir = B
i=4, item=D: flip coin with prob 1/4 → tails → reservoir = B
i=5, item=E: flip coin with prob 1/5 → tails → reservoir = B

Final pick: B

After all 5 elements, each had exactly 1/5 probability. ✓
```

### How does it work?
**For k=1:**
1. Set reservoir = first element.
2. For each subsequent element at position i (1-indexed):
   - Generate random integer j in [0, i) (or [1, i]).
   - If j == 0 (probability 1/i), replace reservoir with this element.
3. Return reservoir.

**For general k:**
1. Fill reservoir with first k elements.
2. For each subsequent element at position i (i > k):
   - Generate random integer j in [0, i).
   - If j < k, replace reservoir[j] with this element.
3. Return reservoir.

### Why does it work?
For k=1, by induction: after processing element i, each element has probability 1/i.
- Base: element 1 has probability 1/1 = 1 ✓
- Step: element i is chosen with prob 1/i. All previous elements were in the reservoir with prob 1/(i-1) and survive with prob (i-1)/i. Combined: 1/(i-1) × (i-1)/i = 1/i. ✓

After all n elements, every element has probability 1/n — perfectly uniform.

### When to use?
- Random node from a linked list (unknown length).
- Random sample from a file or database stream too large to load into memory.
- Streaming algorithms where you cannot store all elements.
- "Pick k random elements" when total count is unknown upfront.

### When NOT to use?
- When you know the total length in advance — just pick k random distinct indices directly.
- When k equals the entire stream — just store everything.

### How to recognize in a new problem?
Signals:
- "You are given a linked list; return a random node"
- "Stream of unknown length; pick k items uniformly"
- "O(1) extra space" constraint on a random-selection problem
- Class/object with an `int pick(int target)` method that processes a stream

### Simple Example
Input: stream = `[1, 1, 2, 3, 1]`, target = `1` (LeetCode 398 style)
Expected output: a uniformly random index among {0, 1, 4}

Trace (tracking only target=1):
```
i=0, val=1 (match): count=1, pick j=random[0,0]=0 → reservoir=0
i=1, val=1 (match): count=2, pick j=random[0,1]; if j==0, replace → 50% chance replace
i=2, val=2: skip
i=3, val=3: skip
i=4, val=1 (match): count=3, pick j=random[0,2]; if j==0, replace → 33% chance replace

Each index in {0,1,4} ends up with 1/3 probability. ✓
```

### Code
```java
// Java — k=1, random node from linked list (LeetCode 382)
class Solution {
    private ListNode head;
    private Random rand = new Random();

    public Solution(ListNode head) {
        this.head = head;
    }

    public int getRandom() {
        int result = head.val;
        ListNode curr = head.next;
        int i = 2;
        while (curr != null) {
            // With probability 1/i, replace current result
            if (rand.nextInt(i) == 0) {
                result = curr.val;
            }
            curr = curr.next;
            i++;
        }
        return result;
    }
}

// General k-reservoir
int[] reservoirSample(int[] stream, int k) {
    int[] reservoir = Arrays.copyOf(stream, k);
    Random rand = new Random();
    for (int i = k; i < stream.length; i++) {
        int j = rand.nextInt(i + 1); // [0, i]
        if (j < k) {
            reservoir[j] = stream[i];
        }
    }
    return reservoir;
}
```
```javascript
// JavaScript — k=1
function reservoirSampleOne(stream) {
    let result = stream[0];
    for (let i = 1; i < stream.length; i++) {
        const j = Math.floor(Math.random() * (i + 1));
        if (j === 0) result = stream[i];
    }
    return result;
}

// General k
function reservoirSample(stream, k) {
    const reservoir = stream.slice(0, k);
    for (let i = k; i < stream.length; i++) {
        const j = Math.floor(Math.random() * (i + 1));
        if (j < k) reservoir[j] = stream[i];
    }
    return reservoir;
}
```

### Dry Run
```
reservoirSample([10, 20, 30, 40, 50], k=2):

Reservoir starts as [10, 20]

i=2, item=30: j=random[0,2]
  If j=0: reservoir[0]=30 → [30, 20]
  If j=1: reservoir[1]=30 → [10, 30]
  If j=2: no change       → [10, 20]
  (Each happens with prob 1/3)

i=3, item=40: j=random[0,3]
  If j<2: replace that slot with 40
  If j>=2: no change

i=4, item=50: j=random[0,4]
  If j<2: replace that slot with 50

After all 5 elements, each pair has equal probability 2/5 of being in reservoir.
```

### Complexity
```
Time:  O(n) — one pass through the stream
Space: O(k) — only the reservoir is stored, regardless of stream length
```

### Common Trap
- **Off-by-one in probability:** For element at index i (0-based), the random range should be `[0, i]` (i+1 choices). Using `[0, i)` gives probability 1/(i) instead of 1/(i+1) — subtle bug that biases results.
- **Not resetting count between separate pick() calls (LeetCode 398):** In the "random pick index" problem, each call to `pick(target)` must restart the scan from scratch with a fresh counter.

### Experience Tip
**Experience Tip:** Interviewers will ask "prove it's uniform". Have the inductive proof ready: element i survives all subsequent replacements with probability `i/(i+1) * (i+1)/(i+2) * ... * (n-1)/n = i/n`. Combined with its initial selection probability 1/i gives 1/n. This one proof demonstrates mathematical rigor.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 382 | Linked List Random Node | Medium | Classic reservoir sampling k=1 on unknown-length list | https://leetcode.com/problems/linked-list-random-node/ |
| 398 | Random Pick Index | Medium | Reservoir sampling with target filtering — reset count each call | https://leetcode.com/problems/random-pick-index/ |
| 528 | Random Pick with Weight | Medium | Not reservoir — prefix sum + binary search for weighted random | https://leetcode.com/problems/random-pick-with-weight/ |
| 710 | Random Pick with Blacklist | Hard | Map blacklist to valid range; uniform pick over reduced space | https://leetcode.com/problems/random-pick-with-blacklist/ |
| 497 | Random Point in Non-overlapping Rectangles | Medium | Weighted random selection over rectangles | https://leetcode.com/problems/random-point-in-non-overlapping-rectangles/ |

### One-Minute Revision
```
ALGORITHM:    Reservoir Sampling
IN SIMPLE WORDS: Process stream one item at a time; replace with shrinking probability
USE WHEN:     Random pick from unknown-length stream; linked list random node
KEY FORMULA:  k=1: replace with prob 1/i; general k: replace if random[0,i] < k
TIME:         O(n) one pass
SPACE:        O(k) reservoir only
COMMON TRAP:  Off-by-one in range — must be [0,i] (size i+1), not [0,i)
EXPERIENCE TIP: Know the inductive proof — 1/i * (i/(i+1)) * ... = 1/n
```

---

---

## Catalan Numbers

### What is it?
The Catalan numbers are a sequence of natural numbers — 1, 1, 2, 5, 14, 42, 132, ... — that count the number of valid structures across many combinatorial problems. Before the formula, understand what they count: C(n) is the number of distinct ways to fully parenthesize n+1 factors, the number of unique Binary Search Trees with n nodes, the number of valid sequences of n pairs of matching parentheses, the number of monotonic lattice paths that never cross the diagonal, and much more. These all sound different but secretly count the same thing.

Real-world analogy: Imagine building a staircase from the bottom-left corner to the top-right corner of an n×n grid, moving only right or up, but never rising above the main diagonal (you can never be "ahead of yourself"). The number of valid paths is exactly the nth Catalan number.

### Visual
```
Catalan values: C(0)=1, C(1)=1, C(2)=2, C(3)=5, C(4)=14

C(3) = 5: All valid bracket sequences with 3 pairs:
  ((()))   (()())   (())()   ()(())   ()()()

C(3) = 5: All structurally distinct BSTs with nodes {1,2,3}:
  1          1         2         3       3
   \          \       / \       /       /
    2          3     1   3     1       2
     \        /               \      /
      3      2                 2    1

C(3) = 5: All full parenthesizations of a×b×c×d:
  ((a×b)×c)×d    (a×(b×c))×d    (a×b)×(c×d)    a×((b×c)×d)    a×(b×(c×d))

Recurrence visualized for C(3) — "choose which node is the root of a BST":
  Root=1: left subtree 0 nodes, right subtree 2 nodes → C(0)×C(2) = 1×2 = 2
  Root=2: left subtree 1 node,  right subtree 1 node  → C(1)×C(1) = 1×1 = 1
  Root=3: left subtree 2 nodes, right subtree 0 nodes → C(2)×C(0) = 2×1 = 2
  Total: 2 + 1 + 2 = 5 ✓
```

### How does it work?
**Recurrence (bottom-up DP):**
```
C(0) = 1   (base case: one empty structure)
C(n) = sum of C(i) * C(n-1-i)   for i = 0 to n-1
```

**Why this recurrence?** Think of a BST with n nodes. Pick one node as the root. If the root gets rank `i+1` (0-indexed), the left subtree has `i` nodes and the right subtree has `n-1-i` nodes. These two subtrees are completely independent of each other, so you multiply their counts. Summing over all n choices of root gives C(n). This "divide at the root" or "split at one pivot" pattern appears in EVERY Catalan problem.

**Closed-form formula:**
```
C(n) = C(2n, n) / (n+1)   =   (2n)! / ((n+1)! × n!)
```

### Why does it work?
Every Catalan problem has a "divide into two independent halves" structure. When you choose where to split (which node is the root, where the matching closing bracket is, where the mountain peak is), the left part is independent of the right part. You multiply their counts, and sum over all split positions. This sum-of-products over split points is exactly the Catalan recurrence — and it produces an optimal count because no two split points produce the same structure.

### When to use?
- "How many unique Binary Search Trees with n distinct values?"
- "How many valid parenthesis strings of length 2n?"
- "How many full binary trees with n+1 leaves?"
- "How many ways to triangulate a convex polygon with n+2 sides?"
- Any problem where you recursively split a sequence or structure at one chosen pivot and the two halves are completely independent.

### When NOT to use?
- When the problem has additional constraints that break the "independent halves" structure.
- When n is large (greater than about 30): Catalan numbers grow exponentially and you will need big integers or modular arithmetic.

### How to recognize in a new problem?
**The "divide at the root" signal:** Can you split the problem at one chosen position, with the left and right halves completely independent? If yes, and you are counting all distinct ways, Catalan numbers apply.

Decision chain:
```
Is the problem asking to COUNT distinct structures?
  → Yes: Can each structure be split at exactly one "root" or "pivot"?
    → Yes: Are the two halves after the split independent?
      → Yes: → CATALAN NUMBERS
```

Concrete signals:
- "Count all structurally distinct binary trees" → C(n)
- "Count valid bracket sequences of length 2n" → C(n)
- "Number of paths in a grid that never cross a boundary" → C(n)
- "All ways to fully parenthesize an expression with n+1 operands" → C(n)

### Simple Example
**Input:** `n = 3` (count of unique BSTs with values 1, 2, 3)
**Output:** `5`

**Trace using the recurrence:**
```
C(0) = 1
C(1) = C(0)×C(0) = 1×1 = 1
C(2) = C(0)×C(1) + C(1)×C(0) = 1 + 1 = 2
C(3) = C(0)×C(2) + C(1)×C(1) + C(2)×C(0)
     =    1×2    +    1×1    +    2×1
     =     2     +     1     +     2     = 5
```

### Code
```java
// Java — Catalan Numbers via DP (used in LeetCode 96: Unique BSTs)
public int numTrees(int n) {
    long[] C = new long[n + 1];
    C[0] = 1;  // base case: one empty tree
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            C[i] += C[j] * C[i - 1 - j];  // root at position j+1
        }
    }
    return (int) C[n];
}

// Closed-form: C(n) = C(2n, n) / (n+1)
// Note: computes exact integer result; only works for small n before overflow
public long catalanClosedForm(int n) {
    long result = 1;
    for (int i = 0; i < n; i++) {
        result = result * (2 * n - i) / (i + 1);
    }
    return result / (n + 1);
}
```
```javascript
// JavaScript — Catalan Numbers via DP
function catalan(n) {
    const C = new Array(n + 1).fill(0);
    C[0] = 1;  // base case
    for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
            C[i] += C[j] * C[i - 1 - j];
        }
    }
    return C[n];
}

// LeetCode 96: Unique Binary Search Trees
function numTrees(n) {
    return catalan(n);
}
```

### Dry Run
**Compute C(4) step by step:**

| n | Recurrence calculation | Result |
|---|------------------------|--------|
| C(0) | base case | 1 |
| C(1) | C(0)×C(0) | 1 |
| C(2) | C(0)×C(1) + C(1)×C(0) = 1+1 | 2 |
| C(3) | C(0)×C(2) + C(1)×C(1) + C(2)×C(0) = 2+1+2 | 5 |
| C(4) | C(0)×C(3) + C(1)×C(2) + C(2)×C(1) + C(3)×C(0) = 5+2+2+5 | 14 |

### Complexity
```
Time:  O(n^2) — two nested loops for the DP recurrence
       O(n)   — for the closed-form formula (iterative product)
Space: O(n)   — DP array storing C(0) through C(n)
```

### Common Trap
**Confusing C(n) with C(2n, n).** The nth Catalan number equals `C(2n, n) / (n+1)`, NOT just `C(2n, n)`. Forgetting the `÷(n+1)` gives answers that are n+1 times too large. Also, the sequence is 0-indexed: C(0)=1, C(1)=1, C(2)=2, C(3)=5. Problems sometimes say "for n elements" meaning C(n) and sometimes meaning C(n-1) — read carefully.

### Experience Tip
**Experience Tip:** LeetCode 96 (Unique Binary Search Trees) is the most common Catalan number interview problem. The key insight to articulate out loud: "I choose node `i` as the root. The left subtree has `i-1` nodes and the right subtree has `n-i` nodes. Since they are completely independent, I multiply their counts and sum over all choices of root i from 1 to n." This "choose-root-and-split" reasoning shows you understand the WHY, not just the code.

### Do Not Confuse With

| | Catalan Numbers | Fibonacci Numbers | Binomial Coefficients C(n,k) |
|--|--|--|--|
| Recurrence | C(n) = Σ C(i)×C(n-1-i) | F(n) = F(n-1)+F(n-2) | C(n,k) = C(n-1,k-1)+C(n-1,k) |
| What it counts | Binary trees, bracket sequences, polygon triangulations | Paths in 1D (or Fibonacci rabbits) | Subsets of size k from n items |
| Pattern | Split into two independent halves, multiply | Choose one direction from two | Include or exclude one item |
| Value at n=5 | 42 | 5 | depends on k |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 96 | Unique Binary Search Trees | Medium | Classic Catalan — C(n) unique BSTs with n nodes | https://leetcode.com/problems/unique-binary-search-trees/ |
| 95 | Unique Binary Search Trees II | Medium | Generate all BSTs — recursive construction mirrors the Catalan recurrence | https://leetcode.com/problems/unique-binary-search-trees-ii/ |
| 22 | Generate Parentheses | Medium | Count = C(n); generate all C(n) valid sequences | https://leetcode.com/problems/generate-parentheses/ |
| 894 | All Possible Full Binary Trees | Medium | Number of full binary trees with 2n+1 nodes = C(n) | https://leetcode.com/problems/all-possible-full-binary-trees/ |
| 241 | Different Ways to Add Parentheses | Medium | Generate all parenthesizations — count equals C(n-1) for n operators | https://leetcode.com/problems/different-ways-to-add-parentheses/ |
| 1259 | Handshakes That Don't Cross | Hard | Catalan number in disguise — 2n people around a circle | https://leetcode.com/problems/handshakes-that-dont-cross/ |

### One-Minute Revision
```
SEQUENCE:       C(0)=1, C(1)=1, C(2)=2, C(3)=5, C(4)=14, C(5)=42, ...
RECURRENCE:     C(n) = sum of C(i) * C(n-1-i)  for i = 0..n-1
CLOSED FORM:    C(n) = C(2n, n) / (n+1)
COUNTS:         Unique BSTs, valid bracket sequences, full binary trees, polygon triangulations
KEY PATTERN:    "Split at one pivot — left and right halves are independent — multiply and sum"
USE WHEN:       Count distinct binary structures, bracket sequences, triangulations.
TIME:           O(n^2) DP; O(n) closed-form
SPACE:          O(n)
COMMON TRAP:    Forgetting ÷(n+1) in closed form. Off-by-one: is the problem asking for C(n) or C(n-1)?
EXPERIENCE TIP: "Choose root → left subtree i nodes, right n-1-i → multiply, sum over i" — say this.
```

---

*Next: [16-ADVANCED-DATA-STRUCTURES.md](16-ADVANCED-DATA-STRUCTURES.md) — Tries, Segment Trees, Fenwick Trees, and beyond.*
