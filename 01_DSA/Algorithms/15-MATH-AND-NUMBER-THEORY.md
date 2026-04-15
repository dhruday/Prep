# Math and Number Theory — Complete Pattern Guide

> *"Math problems in interviews aren't about being a mathematician. They're about recognizing patterns and knowing a handful of powerful tricks."*

---

## Table of Contents

1. [GCD and LCM](#gcd-and-lcm)
2. [Sieve of Eratosthenes](#sieve-of-eratosthenes)
3. [Modular Arithmetic](#modular-arithmetic)
4. [Combinatorics (nCr, nPr)](#combinatorics-ncr-npr)
5. [Fast Exponentiation](#fast-exponentiation)
6. [Reservoir Sampling](#reservoir-sampling)
7. [Fisher-Yates Shuffle](#fisher-yates-shuffle)
8. [Catalan Numbers](#catalan-numbers)
9. [Pigeonhole Principle](#pigeonhole-principle)
10. [Arithmetic Tricks and Patterns](#arithmetic-tricks-and-patterns)

---

## GCD and LCM

### What is this approach?

**Intuition:** GCD (Greatest Common Divisor) is the largest number that divides both a and b. Euclid's algorithm: repeatedly replace the larger number with the remainder. When one becomes 0, the other is the GCD.

### Core Idea

**Euclidean Algorithm:** gcd(a, b) = gcd(b, a % b). Base case: gcd(a, 0) = a.

**LCM:** lcm(a, b) = a × b / gcd(a, b). Always compute GCD first to avoid overflow.

**Extended GCD:** Find x, y such that a×x + b×y = gcd(a, b). Useful for modular inverse.

### Complexity

- **Time:** O(log(min(a, b)))

### Interview Applications

- **GCD of array:** Fold/reduce — gcd(a, b, c) = gcd(gcd(a, b), c)
- **Fraction simplification:** Divide numerator and denominator by their GCD
- **Check coprime:** gcd(a, b) == 1
- **Water pouring puzzle:** Can pour exactly gcd(a, b) amount

### Interview Insights

- **Pattern:** "Can we measure exactly X liters?" → X must be a multiple of gcd(jug_a, jug_b) and ≤ max(jug_a, jug_b).

---

## Sieve of Eratosthenes

### What is this approach?

**Intuition:** To find all primes up to N, start with all numbers marked as prime. For each prime p, mark all its multiples as composite. Start marking from p² (smaller multiples already handled).

### Core Idea

1. Create boolean array `is_prime[0..n]`, initialize all true
2. Mark 0 and 1 as false
3. For p = 2 to √n: if is_prime[p]: mark p², p²+p, p²+2p, ... as false
4. All remaining true entries are primes

### Complexity

- **Time:** O(n log log n) — nearly linear
- **Space:** O(n)

### Variants

- **Count primes less than n:** Run sieve, count true entries
- **Prime factorization of any number ≤ n:** Use the sieve to store smallest prime factor (SPF) for each number. Factorize by repeatedly dividing by SPF.
- **Segmented Sieve:** For very large ranges [L, R] where R is huge but R-L is small.

### Interview Insights

- **"Count Primes" (LeetCode 204):** Direct sieve application.
- **Optimization:** Start marking from p², not 2p. Skip even numbers (only check odd after 2).

---

## Modular Arithmetic

### What is this approach?

**Intuition:** When numbers get astronomically large, "take mod 10⁹+7" keeps them manageable. All arithmetic works modularly: (a+b) mod m = ((a mod m) + (b mod m)) mod m.

### Core Rules

| Operation | Formula |
|---|---|
| Addition | (a + b) % m |
| Subtraction | (a - b + m) % m (to avoid negative) |
| Multiplication | (a × b) % m |
| Division | a × modular_inverse(b) % m |
| Exponentiation | Fast exponentiation (see below) |

**Modular Inverse:** a⁻¹ mod m = a^(m-2) mod m (when m is prime, by Fermat's Little Theorem).

### Why 10⁹ + 7?

- It's prime (enables modular inverse via Fermat's)
- Fits in 32-bit signed integer
- Product of two such numbers fits in 64-bit

### Interview Insights

- **Trap:** Subtraction can go negative. Always add m before taking mod.
- **Trap:** Division is NOT (a/b) mod m. It's a × b⁻¹ mod m where b⁻¹ is the modular inverse.
- **When you see "answer modulo 10⁹+7":** Apply mod at every addition/multiplication step to prevent overflow.

---

## Combinatorics (nCr, nPr)

### Core Formulas

- **Permutations:** P(n, r) = n! / (n-r)!
- **Combinations:** C(n, r) = n! / (r! × (n-r)!)
- **Pascal's Triangle:** C(n, r) = C(n-1, r-1) + C(n-1, r)

### Computing nCr

**Small n (≤ ~1000):** Pascal's Triangle DP. Build table bottom-up. O(n²) time and space.

**Large n with mod:** Precompute factorials and inverse factorials mod p. nCr = fact[n] × inv_fact[r] × inv_fact[n-r] mod p.

### Interview Applications

| Problem | Formula |
|---|---|
| Unique Paths in grid | C(m+n-2, m-1) |
| Number of binary trees with n nodes | Catalan number |
| Ways to arrange with repetitions | Multinomial coefficient |
| Stars and bars | C(n+k-1, k-1) for distributing n into k bins |

### Interview Insights

- **Pascal's Triangle** is both a DP problem and a combinatorics tool. Know both perspectives.
- **Unique Paths** can be solved with DP OR directly with C(m+n-2, m-1).

---

## Fast Exponentiation

### What is this approach?

**Intuition:** Compute a^n in O(log n) instead of O(n). Split the exponent: if n is even, a^n = (a^(n/2))². If odd, a^n = a × a^(n-1).

### Core Idea (Iterative)

1. result = 1
2. While n > 0:
   - If n is odd: result = result × a
   - a = a × a (square the base)
   - n = n >> 1 (halve the exponent)
3. Apply mod at each multiplication if needed

### Complexity

- **Time:** O(log n)

### Interview Applications

- **Pow(x, n):** Handle negative exponents (x^(-n) = 1 / x^n)
- **Modular exponentiation:** Compute a^b mod m efficiently
- **Matrix exponentiation:** Replace scalar multiplication with matrix multiplication. Used for Fibonacci in O(log n), linear recurrence acceleration.

### Interview Insights

- **Trap:** Pow(x, n) — handle n = -2³¹ carefully. Taking abs of INT_MIN overflows.

---

## Reservoir Sampling

### What is this approach?

**Intuition:** Select K items uniformly at random from a stream of unknown length N, using O(K) space. You can't know N in advance.

### Core Idea (K = 1)

1. Keep the first element as the current selection
2. For the ith element (1-indexed): replace the current selection with probability 1/i
3. After processing all N elements, each element had exactly 1/N probability

### Core Idea (K items)

1. Keep first K elements in reservoir
2. For the ith element (i > K): generate random j in [1, i]. If j ≤ K: replace reservoir[j] with element i.

### Complexity

- **Time:** O(N) — one pass
- **Space:** O(K)

### Interview Applications

- **Linked List Random Node:** Random node from a linked list of unknown length. Reservoir sampling with K=1.
- **Random Pick Index:** Given an array with duplicates, pick a random index of a target value.

### Interview Insights

- **Key property:** Each element has exactly K/N probability of being in the final reservoir. Provable by induction.

---

## Fisher-Yates Shuffle

### What is this approach?

**Intuition:** Generate a uniformly random permutation of an array. Each of the n! permutations has equal probability.

### Core Idea

1. For i = n-1 down to 1:
   - Pick random j from [0, i] (inclusive)
   - Swap arr[i] and arr[j]

### Complexity

- **Time:** O(n)
- **Space:** O(1) (in-place)

### Interview Insights

- **"Shuffle an Array"** is a direct application.
- **Trap:** The random range must be [0, i], not [0, n). Wrong range produces non-uniform distribution.
- **Connection to reservoir sampling:** Fisher-Yates is for known-length arrays. Reservoir sampling is for streams.

---

## Catalan Numbers

### What is this approach?

**Intuition:** Catalan numbers count "balanced" structures: valid parentheses, binary trees, triangulations, non-crossing partitions.

### Formula

C(n) = C(2n, n) / (n + 1) = (2n)! / ((n+1)! × n!)

**Recurrence:** C(n) = Σ C(i) × C(n-1-i) for i = 0 to n-1 (choose where to split)

**First values:** 1, 1, 2, 5, 14, 42, 132, 429, ...

### What Catalan Numbers Count

| n | Structure |
|---|---|
| n pairs | Valid parenthesizations |
| n+1 values | BSTs with n+1 nodes |
| n+1 sides | Triangulations of a polygon |
| 2n steps | Paths that don't cross the diagonal (Dyck paths) |
| n nodes | Full binary trees |

### Interview Applications

- **Unique BSTs:** How many structurally different BSTs can store values 1..n? → C(n)
- **Generate Parentheses:** Number of valid strings with n pairs → C(n)

### Interview Insights

- **Don't memorize the formula:** Recognize the pattern. If the problem has a "balanced recursive splitting" structure, it's Catalan.

---

## Pigeonhole Principle

### What is this approach?

**Intuition:** If you put n+1 pigeons into n holes, at least one hole has ≥ 2 pigeons. In algorithms: if more items than containers, some container must have a collision.

### Interview Applications

**Find Duplicate Number (array of n+1 elements with values 1..n):**
- By pigeonhole, a duplicate must exist
- Floyd's cycle detection on the array treated as a linked list (see [06-LINKED-LISTS.md](06-LINKED-LISTS.md#fastslow-pointer-floyds-algorithm))

**Longest Repeating Substring / Birthday Paradox arguments:**
- Pigeonhole bounds guarantee collisions

### Interview Insights

- **When to invoke:** "n+1 elements in range [1, n]" → duplicate guaranteed. "More items than categories" → some category has multiple items.
- **Connection:** The constraint that guarantees a solution exists often comes from pigeonhole.

---

## Arithmetic Tricks and Patterns

### Integer Properties

| Trick | Application |
|---|---|
| Sum 1 to n = n(n+1)/2 | Missing number by sum |
| Sum of squares = n(n+1)(2n+1)/6 | Variance calculations |
| Check if perfect square | Binary search or integer sqrt |
| Integer division ceiling | (a + b - 1) / b = ceil(a/b) |
| Digit extraction | n % 10 (last digit), n / 10 (remove last) |
| Reverse a number | Repeatedly extract and build |

### Digit-Based Problems

- **Happy Number:** Sum of squares of digits, check cycle (Floyd's or HashSet)
- **Add Digits (Digital Root):** While > 9, sum digits. Shortcut: 1 + (n-1) % 9
- **Palindrome Number:** Reverse half the digits, compare

### Math-Based Array Problems

| Problem | Technique |
|---|---|
| Missing number | Sum formula or XOR |
| Missing two numbers | Sum + sum of squares, or XOR + bit trick |
| Majority element | Boyer-Moore Voting |
| Product except self | Left product × right product |
| GCD of array | Fold with Euclidean algorithm |
| Next permutation | Find rightmost ascent, swap, reverse |

### Interview Insights

- **"Can you solve it in O(1) space?"** → Often means a math trick exists (XOR, sum formula, Floyd's).
- **Digit manipulation** is straightforward but error-prone. Handle negative numbers and overflow carefully.

---

*Next: [16-ADVANCED-DATA-STRUCTURES.md](16-ADVANCED-DATA-STRUCTURES.md) — Tries, Segment Trees, Fenwick Trees, and beyond.*
