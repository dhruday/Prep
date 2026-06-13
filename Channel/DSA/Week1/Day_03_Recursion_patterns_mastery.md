# DAY 3 — DEEP MASTERY: RECURSION PATTERNS

> *"A pattern is a solution you can use again. Pattern recognition is the ability to see the same problem dressed in different clothes."*

---

## SECTION 1: WHY RECURSION PATTERNS MATTER

### Why Most Candidates Fail Recursion Interviews

Walk into any FAANG interview and watch most candidates approach a recursion problem. Their process looks like this:

1. Read the problem.
2. Try to remember a solution they've seen before.
3. Struggle to adapt it. Freeze. Fail.

This is the **memorization trap**. It feels like learning, but it's actually brittle knowledge that collapses the moment a problem is presented differently.

Here's the brutal truth: there are thousands of recursive interview problems. No human being has memorized all of them. The candidates who consistently succeed don't recognize the specific problem — they recognize the **underlying pattern** and rebuild the solution from first principles.

### Why Memorizing Solutions Doesn't Work

A memorized solution is fragile. Change one constraint and the whole thing falls apart:
- "Find all subsets" → memorized. "Find all subsets with distinct elements" → frozen.
- "Generate permutations" → memorized. "Generate permutations where no two adjacent are the same" → frozen.

A recognized pattern is robust. You understand the machinery underneath. You can reconstruct, adapt, and extend.

The difference is like:
- **Memorization** → Knowing that `2 + 2 = 4`
- **Pattern recognition** → Understanding what addition is, so you can compute any sum

### Why Top Engineers Recognize Patterns, Not Solutions

Top engineers carry a small mental library of **patterns** — not solutions. When they see a new problem, their internal monologue sounds like:

> *"This problem asks me to generate all possible selections of elements. That's a subset/combination pattern. The recursion tree has include/exclude decisions. The branching factor is 2. The depth is n. Total nodes = 2ⁿ. Let me define my state and write the template."*

They go from problem → pattern → template → solution. In minutes.

### The Four Foundational Patterns

These four patterns are the DNA of recursive interview problems. Master these, and you can recognize and solve hundreds of questions:

```
┌──────────────────────────────────────────────────────────────────┐
│                    THE FOUR FOUNDATIONAL PATTERNS                │
├────────────────┬─────────────────────────────────────────────────┤
│  SUBSETS       │ Every possible selection (any size) from a set  │
│                │ ~50+ interview problems                          │
├────────────────┼─────────────────────────────────────────────────┤
│  SUBSEQUENCES  │ Order-preserving selections from a sequence      │
│                │ ~60+ interview problems                          │
├────────────────┼─────────────────────────────────────────────────┤
│  COMBINATIONS  │ Fixed-size selections where order doesn't matter │
│                │ ~40+ interview problems                          │
├────────────────┼─────────────────────────────────────────────────┤
│  PERMUTATIONS  │ All arrangements where order matters             │
│                │ ~40+ interview problems                          │
└────────────────┴─────────────────────────────────────────────────┘
```

Every backtracking problem you will ever see in an interview is one of these four patterns — or a combination of them with added constraints. That's it.

---

## SECTION 2: THE RECURSION TREE MINDSET

*Before you write a single line of code, you should be able to draw the recursion tree. This is the Google engineer's discipline.*

### Stop Coding. Start Drawing.

The single biggest skill gap between average and exceptional recursive programmers is this:

Average programmers try to **code their way to clarity**.
Exceptional programmers achieve clarity **before** touching code.

The recursion tree is your thinking tool. When you understand the tree, the code almost writes itself.

### The Six Vocabulary Words of Recursion Trees

Master these six terms. Use them precisely in interviews — it signals deep fluency.

---

**STATE**

The complete description of where you are in the problem at any given recursive call.

State answers: *"What information do I need to solve the problem from this point forward?"*

- In subset generation: *state = (current index, elements chosen so far)*
- In permutations: *state = (elements used so far, current permutation)*
- In N-Queens: *state = (row being filled, columns/diagonals already occupied)*

State is what you pass into each recursive call.

---

**DECISION**

The question you must answer at each state.

- "Should I include this element or exclude it?"
- "Which element should I place at this position?"
- "Should I split here or continue?"

Every recursive call makes exactly one decision, then delegates the rest.

---

**CHOICE**

One specific answer to the decision. Each choice creates one branch of the tree.

- Decision: "Include or exclude element 2?" → Choices: include OR exclude
- Decision: "Which element goes in position 1?" → Choices: 1 OR 2 OR 3

The number of choices = the **branching factor** of the tree at that node.

---

**BRANCH**

A single edge in the recursion tree, representing one choice being made.

Going down a branch means: *"I made this specific choice, and now I'm solving a smaller subproblem."*

---

**PATH**

The sequence of choices from the root (initial state) to any given node.

A path encodes the history of all decisions made so far. At a leaf node, the path represents one complete candidate solution.

---

**LEAF NODE**

A node with no further children — where the recursion stops.

Two types:
- **Valid leaf**: a complete solution that satisfies all constraints → record it
- **Invalid leaf (pruned)**: a state that violates a constraint → discard it

---

### The Recursion Tree Template

```
ROOT (initial state)
│
├─── Branch A (choice 1)
│      │
│      ├─── Branch A1 (choice 1.1)
│      │       └─── LEAF (complete state)
│      │
│      └─── Branch A2 (choice 1.2)
│               └─── LEAF (complete state)
│
└─── Branch B (choice 2)
       │
       ├─── Branch B1 (choice 2.1)
       │       └─── LEAF (complete state)
       │
       └─── Branch B2 (choice 2.2)
               └─── LEAF (complete state)
```

Before coding anything, you should be able to:
1. Identify the **state** at each node
2. Identify the **decision** at each node
3. Enumerate the **choices** (branches) at each node
4. Know what makes a **valid leaf**
5. Know when to **prune**

---

### The Mental Drill

When you see a recursion problem, run this mental sequence in under 60 seconds:

```
1. What is my state?          (what info travels through recursion)
2. What is my decision?       (what question do I answer at each step)
3. What are my choices?       (how many branches per node)
4. What is my base case?      (what makes a leaf node)
5. What is the branching factor × depth? (quick complexity estimate)
```

This five-question drill is the gateway to every recursive solution.

---

## SECTION 3: SUBSETS PATTERN

### What Is a Subset?

A subset is any selection of elements from a set, where:
- **Order does not matter**: {1, 2} and {2, 1} are the same subset
- **Any size is valid**: from the empty set {} to the full set {1,2,3,...,n}
- **No repetitions within a subset**: each element appears at most once

For the set {1, 2, 3}, the complete collection of subsets is:
```
{}, {1}, {2}, {3}, {1,2}, {1,3}, {2,3}, {1,2,3}
```
That's 8 subsets = 2³.

### Why Subsets Naturally Create Recursion Trees

The key insight: **every element faces a binary decision — included or excluded**.

This decision is made independently for each element. Because each decision is binary and independent, the total number of outcomes is 2 × 2 × 2 × ... × 2 (n times) = **2ⁿ**.

This binary decision structure is precisely what creates the recursion tree.

### The Complete Recursion Tree for {1, 2, 3}

At each level, we process one element. At each node, we branch: include it (left) or exclude it (right).

```
                          []
                    ┌──────────────┐
                   [1]            []           ← Decision: include/exclude 1
              ┌─────┴────┐    ┌────┴─────┐
            [1,2]       [1]  [2]        []    ← Decision: include/exclude 2
           ┌──┴──┐    ┌──┴──┐ ┌──┴──┐ ┌──┴──┐
        [1,2,3][1,2][1,3] [1][2,3] [2][3]  []  ← Decision: include/exclude 3

Leaf nodes (all valid subsets):
[1,2,3]  [1,2]  [1,3]  [1]  [2,3]  [2]  [3]  []
```

**Every leaf is a valid answer.** All 8 subsets appear exactly once.

### Reading the Tree

Follow any path from root to leaf. The path encodes which elements were included:

```
Root [] → Include 1 [1] → Include 2 [1,2] → Include 3 [1,2,3]  ✓
Root [] → Include 1 [1] → Include 2 [1,2] → Exclude 3 [1,2]    ✓
Root [] → Include 1 [1] → Exclude 2 [1]   → Include 3 [1,3]    ✓
Root [] → Include 1 [1] → Exclude 2 [1]   → Exclude 3 [1]      ✓
Root [] → Exclude 1 []  → Include 2 [2]   → Include 3 [2,3]    ✓
Root [] → Exclude 1 []  → Include 2 [2]   → Exclude 3 [2]      ✓
Root [] → Exclude 1 []  → Exclude 2 []    → Include 3 [3]      ✓
Root [] → Exclude 1 []  → Exclude 2 []    → Exclude 3 []       ✓
```

### Why Total Subsets = 2ᴺ

Mathematical reasoning:

For n elements, each element has exactly 2 independent choices (in or out).
By the multiplication principle of counting:

```
Total outcomes = 2 × 2 × 2 × ... × 2  (n times)
               = 2ⁿ
```

Tree verification: The tree has depth n. At each level, the number of nodes doubles:
```
Level 0:  1 node  (2⁰)
Level 1:  2 nodes (2¹)
Level 2:  4 nodes (2²)
Level 3:  8 nodes (2³ = leaves) ← All 8 subsets
```

### Why Complexity Becomes O(2ᴺ)

**Time complexity:** 2ⁿ leaf nodes × O(n) to copy each subset = **O(n × 2ⁿ)**
*The n factor comes from copying the current path to the result list at each leaf.*

**Space complexity:** The tree has depth n (one level per element). At any moment, only one root-to-leaf path is on the call stack = **O(n)**

---

## SECTION 4: GOOGLE THINKING FOR SUBSETS

*This section is about the questions you ask before writing any code.*

### The Four Questions Every Google Engineer Asks

---

**Question 1: What Is the State?**

State = the minimum information needed to solve the problem from this recursive call.

For subsets, the state is:
- `index` → which element am I currently deciding about?
- `current` → which elements have I already included?

```
State at any node = (index, current_subset)

Example states:
(0, [])       → "I'm at element 1, chosen nothing yet"
(1, [1])      → "I'm at element 2, chosen {1} so far"
(2, [1,2])    → "I'm at element 3, chosen {1,2} so far"
(3, [1,2,3])  → "I've processed all elements" ← BASE CASE
```

---

**Question 2: What Is the Choice?**

The choice at each state is: **include the current element OR exclude it**.

This is a binary choice → branching factor = 2.

---

**Question 3: What Is the Recursive Transition?**

Transition defines how you move from one state to the next.

```
From state (index, current):

Choice A (Include): move to state (index + 1, current + [arr[index]])
Choice B (Exclude): move to state (index + 1, current)
```

The index always advances by 1. This ensures progress toward the base case.

---

**Question 4: What Is the Base Condition?**

The recursion stops when `index == n` (all elements decided).

At this point, `current` holds a complete subset → record it.

```
if index == n:
    result.add(copy of current)
    return
```

### Pulling It Together: The Mental Blueprint

Before writing code, a Google engineer has this complete model:

```
SUBSET GENERATION BLUEPRINT
─────────────────────────────────────────────────────
State:       (index, current_subset)
Decision:    include arr[index] or exclude arr[index]
Choices:     2 (binary)
Transition:  index → index + 1 in both branches
             current grows by arr[index] if included
Base case:   index == n → record current
Branching:   2
Depth:       n
Total nodes: O(2ⁿ)
Time:        O(n × 2ⁿ)
Space:       O(n) stack
─────────────────────────────────────────────────────
```

Once this blueprint is crystal clear, the code is just transcription.

### The Google Follow-Up Mindset

A Google interviewer will always push further. Internalize these:

- *"What if elements can repeat?"* → Sort first. Skip duplicates at the same tree level.
- *"What if you only want subsets of size k?"* → Add a pruning condition: prune if `current.size() > k`.
- *"What if you want subsets summing to a target?"* → Add constraint: prune if `sum > target`.

The pattern stays the same. Only the pruning changes.

---

## SECTION 5: SUBSEQUENCES PATTERN

### The Four Confused Terms — Defined Precisely

Interview candidates constantly confuse these four. Let's end that confusion permanently.

---

**SUBARRAY** — Contiguous slice of an array

A subarray is a **consecutive** sequence of elements from an array. You cannot skip elements.

```
Array: [1, 2, 3, 4]

Subarrays:
[1]         ← single element
[2]
[3]
[4]
[1,2]       ← two consecutive elements
[2,3]
[3,4]
[1,2,3]     ← three consecutive elements
[2,3,4]
[1,2,3,4]   ← entire array

NOT a subarray: [1,3] ← elements are not consecutive
```

Key word: **contiguous**. If elements can be skipped, it's not a subarray.

---

**SUBSTRING** — Contiguous slice of a string

Exactly like subarray, but for strings. Must be consecutive characters.

```
String: "abcd"

Substrings: "a", "b", "c", "d", "ab", "bc", "cd", "abc", "bcd", "abcd"

NOT a substring: "ac" ← characters are not consecutive
```

Key word: **contiguous**. Same constraint as subarray.

---

**SUBSEQUENCE** — Order-preserving selection, gaps allowed

A subsequence maintains the **relative order** of elements but allows skipping. You must respect the original order of elements, but you don't have to take every element.

```
Array/String: "abc"

Subsequences (all of them):
""          ← empty
"a"
"b"
"c"
"ab"        ← a before b ✓
"ac"        ← a before c ✓
"bc"        ← b before c ✓
"abc"       ← complete string

NOT valid: "ba" ← reverses original order, not a subsequence of "abc"
NOT valid: "ca" ← reverses original order
```

Key words: **order preserved, gaps allowed**.

---

**SUBSET** — Selection from a set, order irrelevant

A subset selects elements from a **set** (unordered collection). Order has no meaning.

```
Set: {1, 2, 3}

Subsets:
{}, {1}, {2}, {3}, {1,2}, {1,3}, {2,3}, {1,2,3}

Note: {1,2} and {2,1} are the SAME subset. Order doesn't exist.
```

Key word: **no order**. When dealing with sets, {1,2} = {2,1}.

---

### The Comparison Table

```
                SUBARRAY  SUBSTRING  SUBSEQUENCE  SUBSET
─────────────────────────────────────────────────────────────
Contiguous?       YES        YES          NO         NO
Order matters?    YES        YES         YES         NO
Input type?      Array     String    Array/String   Set
Can skip?          NO         NO          YES        YES
─────────────────────────────────────────────────────────────
Example for
[1,2,3] / "abc":
                [1,2]      "ab"        "ac"        {1,3}
                ✓ valid    ✓ valid     ✓ valid     ✓ valid
                [1,3]      "ac"        "ca"        {3,1}
                ✗ invalid  ✗ invalid   ✗ invalid   ✓ same as {1,3}
```

### Why Candidates Confuse Them

The confusion happens because:
1. **Subsequences and subsets** feel similar — both allow skipping. The difference: subsequences care about order; subsets don't.
2. **Subarrays and subsequences** sound similar but have opposite contiguity rules.
3. When you code a "subset generator" using include/exclude on an array, you're technically generating **subsequences** of an ordered input — and those subsequences happen to correspond to distinct subsets (since each subsequence has different elements selected, regardless of order).

In practice, interview problems use these terms loosely. Always clarify what exactly is meant.

---

## SECTION 6: SUBSEQUENCE RECURSION TREE

### The Core Insight

Generating all subsequences uses the **exact same include/exclude recursion** as subsets, but for a **string or ordered array**.

The difference: subsequences preserve the **relative order** of characters/elements from the original input.

### Complete Recursion Tree for "ABC"

At each character, we decide: include it in our current subsequence, or skip it.

```
                           f("ABC", "", 0)
                          /               \
             Include 'A'                    Exclude 'A'
         f("ABC", "A", 1)               f("ABC", "", 1)
           /        \                    /         \
      Inc 'B'     Exc 'B'           Inc 'B'      Exc 'B'
  f(.,"AB",2)  f(.,"A",2)       f(.,"B",2)    f(.,"",2)
     /   \        /   \           /    \          /   \
Inc'C' Exc'C' Inc'C' Exc'C'  Inc'C'  Exc'C' Inc'C' Exc'C'
"ABC" "AB"   "AC"   "A"     "BC"    "B"    "C"    ""
```

**Leaf nodes (all 8 subsequences of "ABC"):**
```
"ABC"  "AB"  "AC"  "A"  "BC"  "B"  "C"  ""
```

These are all the subsequences — every possible selection of characters that maintains their relative left-to-right order.

### Verifying Each Subsequence

```
""    → skip A, skip B, skip C
"C"   → skip A, skip B, include C
"B"   → skip A, include B, skip C
"BC"  → skip A, include B, include C
"A"   → include A, skip B, skip C
"AC"  → include A, skip B, include C ← 'A' appears before 'C': order preserved ✓
"AB"  → include A, include B, skip C
"ABC" → include A, include B, include C
```

Notice: "CA" is NOT generated. "BA" is NOT generated. The relative ordering of characters is always preserved — that's what makes these subsequences rather than generic subsets.

### Why The Algorithm Works

At each character position `i`, we make one binary choice. The recursion proceeds left to right, ensuring that whenever we include a character, it appears after all previously included characters. This guarantees relative order preservation automatically.

### Complexity of Subsequences

```
Branching factor: 2 (include or exclude each character)
Depth: n (length of string/array)
Total leaf nodes: 2ⁿ
Work per leaf: O(n) to copy the current subsequence

Time complexity:  O(n × 2ⁿ)
Space complexity: O(n) for stack depth + O(n) for current subsequence = O(n)
```

---

## SECTION 7: COMBINATIONS PATTERN

### What Combinations Really Mean

A combination answers the question: **"In how many ways can I choose k items from n items, where order doesn't matter?"**

The mathematical formula: **C(n, k) = n! / (k! × (n-k)!)**

```
Choose 2 from {1, 2, 3, 4}:

{1,2}   {1,3}   {1,4}
{2,3}   {2,4}
{3,4}

Total: C(4,2) = 6 combinations
```

Notice: {1,2} and {2,1} are the **same combination**. Order is irrelevant.

### The Fundamental Difference: Combination vs Permutation

This is the most commonly confused distinction in interviews.

```
COMBINATION                         PERMUTATION
────────────────────────────────    ────────────────────────────────
Order does NOT matter               Order DOES matter
{1, 2} == {2, 1}                    [1, 2] ≠ [2, 1]
"Selecting" problems                "Arranging" problems
C(n,k) = n!/(k!(n-k)!)             P(n,k) = n!/(n-k)!
Smaller count                       Larger count
                                    P(n,k) = k! × C(n,k)
```

The relationship: **every combination of k items generates k! permutations**.

### Real-World Anchors for Combinations

Use these mental anchors to quickly recognize combination problems:

**Selecting Team Members**
"Choose 5 players from 10 for a basketball team."
→ The team composition matters, not who's called player 1 vs player 5.
→ Combination: C(10, 5) = 252 teams.

**Committee Selection**
"Form a 3-person committee from 8 candidates."
→ A committee has no ordering. {Alice, Bob, Carol} is the same committee as {Bob, Carol, Alice}.
→ Combination: C(8, 3) = 56 committees.

**Lottery Selection**
"Pick 6 numbers from 1 to 49."
→ Your ticket {3, 15, 27, 33, 41, 48} wins regardless of the order you wrote the numbers.
→ Combination: C(49, 6) ≈ 14 million.

**College Admissions (Course Selection)**
"A student must choose 4 electives from 10 available courses."
→ The set of courses matters, not what order you picked them.
→ Combination: C(10, 4) = 210 course sets.

**When Combination Becomes Permutation**
"Choose a president, vice president, and secretary from 8 candidates."
→ Now roles matter! Alice as president ≠ Alice as secretary.
→ Permutation: P(8, 3) = 336.

The distinguishing question: **"Does assigning a different role / position to the same set of items create a different answer?"**
- Yes → Permutation
- No → Combination

---

## SECTION 8: COMBINATION RECURSION FRAMEWORK

### Why Combination Recursion is Different from Subset Recursion

Subsets generate all selections of ANY size. Combinations generate selections of EXACTLY k elements.

Additionally, combinations use a **start index trick** to avoid generating duplicate sets:

```
For {1,2,3}, picking 2 elements:
WRONG (generates duplicates):
  At each step, try all unused elements:
    Pick 1, then 2 → {1,2}
    Pick 1, then 3 → {1,3}
    Pick 2, then 1 → {2,1} ← duplicate of {1,2}!
    Pick 2, then 3 → {2,3}
    Pick 3, then 1 → {3,1} ← duplicate of {1,3}!
    Pick 3, then 2 → {3,2} ← duplicate of {2,3}!

RIGHT (start index prevents duplicates):
  Always pick from index ≥ current start:
    Start=1: Pick 1, then start=2: Pick 2 → {1,2} ✓
    Start=1: Pick 1, then start=2: Pick 3 → {1,3} ✓
    Start=2: Pick 2, then start=3: Pick 3 → {2,3} ✓
```

The `start` index ensures elements are always chosen in increasing index order, which eliminates duplicates without sorting.

### State Design for Combinations

```
State = (start_index, current_combination, target_size_k)

At each node:
  - Try adding elements from index start_index to n-1
  - For each choice i (from start to n-1):
      Add arr[i] to current
      Recurse with start = i+1  ← never go back to earlier indices
      Remove arr[i] from current
```

### The Combination Recursion Tree for C(4,2): Choose 2 from {1,2,3,4}

```
                       start=1, []
          ┌───────────┬───────────┬────────────┐
      pick 1       pick 2      pick 3       pick 4
    start=2,[1]  start=3,[2] start=4,[3]  start=5,[4]
    ┌──┬──┬──┐     ┌──┬──┐      ┌──┐         │
  p2  p3 p4       p3  p4       p4           (no more to pick)
 [1,2][1,3][1,4] [2,3][2,4]  [3,4]         (pruned: need 2)
   ✓   ✓   ✓      ✓    ✓       ✓
```

All 6 combinations: {1,2}, {1,3}, {1,4}, {2,3}, {2,4}, {3,4}

### Pruning in Combination Recursion

Pruning is essential for combinations. Two pruning conditions:

**Pruning 1: Current selection already has k elements**
```
if current.size() == k:
    record current
    return
```

**Pruning 2: Not enough elements remaining to complete k selections**
```
elements_remaining = n - start_index + 1
elements_needed = k - current.size()

if elements_remaining < elements_needed:
    return  ← impossible to reach k elements, prune this branch
```

This second pruning is a common interview differentiator. It significantly reduces exploration.

### Termination Conditions

```
VALID TERMINATION:  current.size() == k  →  record and return
INVALID TERMINATION: start_index > n     →  return (ran out of elements)
PRUNING:            elements_remaining < elements_needed  →  return early
```

### Combination State Design Template

```
COMBINATION BLUEPRINT
─────────────────────────────────────────────────────
State:        (start_index, current_combination)
Decision:     which element to add next (from start onwards)
Choices:      elements at indices [start, start+1, ..., n-1]
Transition:   current ← current + arr[i]
              recurse with start = i+1
              current ← current - arr[i]  (undo)
Base case:    current.size() == k → record
Pruning:      n - start + 1 < k - current.size()
Branching:    varies (n-start) at each level
Depth:        k
─────────────────────────────────────────────────────
```

---

## SECTION 9: PERMUTATIONS PATTERN

### Why Permutations Are Fundamentally Different

The core difference from subsets/combinations:

> **In permutations, [1,2,3] and [3,2,1] and [2,1,3] are all distinct, valid answers.**

Order is the entire point. The same set of elements, arranged differently, produces different permutations.

This changes everything about the recursion:
- You can't use a "start index" (you need to try all unused elements at each position)
- You need to track which elements have been used
- The branching factor decreases as you go deeper (fewer unused elements remain)

### Real-World Anchors for Permutations

**Password Generation**
"How many 4-digit PINs are possible using digits 0-9 with no repetition?"
→ `1234` is different from `4321`. Order matters.
→ P(10, 4) = 5040.

**Seat Arrangements**
"In how many ways can 5 people sit in 5 chairs?"
→ Alice-Bob-Carol-Dave-Eve in that left-to-right order is different from Eve-Dave-Carol-Bob-Alice.
→ P(5) = 5! = 120 arrangements.

**Race Rankings**
"8 runners race. How many different podium (top-3) outcomes exist?"
→ Gold-Silver-Bronze assignments matter. Runner A winning gold ≠ Runner A winning bronze.
→ P(8, 3) = 336.

**Phone Lock Patterns**
"Create a pattern connecting at least 4 of 9 dots, where each dot is used at most once."
→ The sequence in which you draw matters completely.
→ Permutation problem with variable length.

**Anagram Generation**
"List all anagrams of 'CAT'."
→ CAT, CTA, ACT, ATC, TAC, TCA — all distinct because letter position matters.
→ P(3) = 3! = 6 anagrams.

### The Mathematical Foundation

For n distinct elements, the number of permutations is:

```
Position 1: n choices (any element)
Position 2: n-1 choices (any remaining element)
Position 3: n-2 choices
...
Position n: 1 choice (the last remaining element)

Total = n × (n-1) × (n-2) × ... × 1 = n!
```

This cascading multiplication is why permutation complexity is factorial — and why it explodes so fast:
```
n=5:  5! = 120
n=10: 10! = 3,628,800
n=20: 20! ≈ 2.4 × 10¹⁸  ← more than atoms in your body
```

---

## SECTION 10: PERMUTATION RECURSION TREE

### Complete Tree for Permutations of [1, 2, 3]

At each level, we fill one position. We try every unused element at that position.

```
                         []  (used: none)
                /          |          \
         Place 1         Place 2       Place 3
         [1]             [2]           [3]
         used:{1}        used:{2}      used:{3}
        /      \          /    \        /    \
   Pl 2     Pl 3      Pl 1   Pl 3  Pl 1   Pl 2
   [1,2]   [1,3]    [2,1]  [2,3] [3,1]  [3,2]
   used:   used:    used:  used: used:  used:
  {1,2}   {1,3}   {1,2}  {2,3} {1,3}  {2,3}
    |        |       |      |     |       |
  Pl 3    Pl 2    Pl 3   Pl 1  Pl 2    Pl 1
 [1,2,3][1,3,2] [2,1,3][2,3,1][3,1,2][3,2,1]
```

**All 6 permutations (all leaves):**
```
[1,2,3]   [1,3,2]   [2,1,3]   [2,3,1]   [3,1,2]   [3,2,1]
```

### Annotating the Branching Factor

```
Level 0 → Level 1:  3 branches  (3 elements to choose from)
Level 1 → Level 2:  2 branches  (2 remaining elements)
Level 2 → Level 3:  1 branch    (1 remaining element)
```

Total leaves: 3 × 2 × 1 = 3! = 6 ✓

### Counting Total Nodes in the Tree

```
Level 0:  1 node    (the root)
Level 1:  3 nodes   (3 × 1)
Level 2:  6 nodes   (3 × 2)
Level 3:  6 nodes   (3 × 2 × 1 = leaves)
─────────────────────────────
Total:    1 + 3 + 6 + 6 = 16 nodes

General formula: total nodes ≈ e × n!
(The mathematical constant e ≈ 2.718 appears because 1/0! + 1/1! + 1/2! + ... = e)
```

### Why Complexity Becomes O(n × n!)

**Time:**
- Total nodes in tree ≈ O(n!)
- Work per leaf (copying permutation): O(n)
- Work at internal nodes: O(1) each

Total time: **O(n × n!)**

**Space:**
- Maximum recursion depth: n (one level per position)
- Stack frame holds the current permutation: O(n)

Total space: **O(n)** for the stack

### State Design for Permutations

Two approaches — both important to know:

**Approach 1: Visited Array**
```
State: (current_permutation, visited[])
Decision: which element to place next (pick any unvisited)
Transition: mark arr[i] as visited, add to permutation, recurse, unmark, remove
```

**Approach 2: Swap-Based**
```
State: (current_permutation, start_index)
Decision: which element to place at position start
Transition: swap arr[start] with arr[i], recurse for start+1, swap back
```

The swap-based approach avoids an explicit visited array and is more memory efficient.

---

## SECTION 11: PATTERN RECOGNITION FRAMEWORK

### The Decision Flowchart

When you see a new problem, run through this decision tree:

```
                   NEW PROBLEM
                       │
           Does ORDER matter in the output?
               /                 \
             YES                  NO
              │                   │
    Does it require         Does it require
  FIXED SIZE or ANY?        FIXED SIZE or ANY?
   /          \               /          \
FIXED         ANY           FIXED         ANY
  │            │              │             │
PERMUTATION   All ordered  COMBINATION  SUBSETS/
(P(n,k))      sequences    (C(n,k))    SUBSEQUENCES
```

### The Recognition Checklist

```
SIGNAL                              → LIKELY PATTERN
──────────────────────────────────────────────────────────
"Generate all arrangements"         → PERMUTATION
"Find all orderings"                → PERMUTATION
"Different positions = different"   → PERMUTATION
"Password / PIN"                    → PERMUTATION

"Choose k from n, order irrelevant" → COMBINATION
"Select a team / committee"         → COMBINATION
"How many ways to choose"           → COMBINATION
"Fixed group size"                  → COMBINATION

"Generate all subsets / power set"  → SUBSETS
"All possible selections (any size)"→ SUBSETS
"Include or exclude each element"   → SUBSETS
"For each element: in or out"       → SUBSETS

"Maintains original order, gaps OK" → SUBSEQUENCES
"Non-contiguous, preserves order"   → SUBSEQUENCES
"Characters of a string in order"   → SUBSEQUENCES
"LCS / longest / count subsequences"→ SUBSEQUENCES (+ DP)
──────────────────────────────────────────────────────────
```

### Quick Litmus Tests

**"Does {A,B} == {B,A} in this problem?"**
- Yes → COMBINATION or SUBSET (order irrelevant)
- No → PERMUTATION (order matters)

**"Is the size of the selection fixed?"**
- Fixed (always k elements) → COMBINATION or PERMUTATION
- Variable (any size) → SUBSET or SUBSEQUENCE

**"Does the original sequence's left-to-right order matter?"**
- Yes → SUBSEQUENCE
- No → SUBSET

**"Am I counting arrangements or selections?"**
- Arrangements → PERMUTATION
- Selections → COMBINATION/SUBSET/SUBSEQUENCE

### Pattern Summary Table

```
Pattern         Order   Size    Input     Count          Example
────────────────────────────────────────────────────────────────────
Subsets          No     Any     Set       2ⁿ             Power set
Subsequences     Yes    Any     Sequence  2ⁿ             String subseq
Combinations     No     Fixed   Set       C(n,k)         Choose k of n
Permutations     Yes    Fixed   Set       P(n)=n!        Anagrams
                                          P(n,k)=n!/(n-k)!
────────────────────────────────────────────────────────────────────
```

---

## SECTION 12: COMPLEXITY ANALYSIS

### First-Principles Framework

For any recursive pattern, derive complexity by answering:

```
Time = (Total nodes in recursion tree) × (Work per node)
Space = (Maximum depth of recursion) × (Space per frame)
```

Then verify by counting leaves (each leaf = one output) and checking: `Total time ≥ Total output size`.

---

### Subsets

```
Recursion Tree:
  Level 0: 1 node
  Level 1: 2 nodes
  Level k: 2^k nodes
  Level n: 2^n leaf nodes

Branching factor: 2 (include/exclude)
Tree depth: n
Total nodes: 2^0 + 2^1 + ... + 2^n = 2^(n+1) - 1 = O(2^n)

Work per internal node: O(1)
Work per leaf node: O(n) to copy current subset

Time: O(n × 2^n)
Space: O(n) — max depth × O(n) per frame for current subset = O(n)
Output size: O(n × 2^n) — 2^n subsets, avg size n/2 → still O(n × 2^n)
```

---

### Subsequences

```
Identical structure to subsets (same include/exclude recursion).

Branching factor: 2
Tree depth: n
Total leaves: 2^n

Time: O(n × 2^n)
Space: O(n)

Note: If the problem is to COUNT subsequences with a property (like LCS),
      use DP — the count can be found in O(n²) instead of O(n × 2^n).
```

---

### Combinations

```
Recursion Tree for C(n, k):
  At level 0: choose from n elements
  At level 1: choose from at most n-1 elements
  ...
  At level k: done (k elements chosen)

Tree depth: k
Branching factor: decreases at each level

Number of leaves: C(n, k)
Total nodes: sum over all levels ≈ O(C(n,k) × k / (n-k+1)) ≈ O(C(n,k))

Work per leaf: O(k) to copy combination

Time: O(k × C(n, k))
Space: O(k) — depth k, O(k) per frame

Note: C(n, k) ≤ 2^n, so this is at most O(k × 2^n)
      But for small k (like k=2), C(n,2) = n²/2 → much more efficient
```

---

### Permutations

```
Recursion Tree for all permutations of n elements:
  Level 0: 1 node
  Level 1: n nodes       (n choices for first position)
  Level 2: n(n-1) nodes  (n-1 remaining choices)
  Level k: n!/(n-k)! nodes
  Level n: n! leaf nodes

Total nodes: 1 + n + n(n-1) + n(n-1)(n-2) + ... + n!
           = sum_{k=0}^{n} n!/(n-k)!
           = n! × (1/n! + 1/(n-1)! + ... + 1/1! + 1/0!)
           ≈ n! × e
           = O(n × n!)

Work per leaf: O(n) to copy permutation

Time: O(n × n!)
Space: O(n) — depth n, O(n) per frame for current permutation
```

---

### Complexity Comparison Table

```
Pattern         Leaves      Total Nodes   Time           Space
──────────────────────────────────────────────────────────────────
Subsets         2^n         O(2^n)        O(n × 2^n)     O(n)
Subsequences    2^n         O(2^n)        O(n × 2^n)     O(n)
Combinations    C(n,k)      O(C(n,k))     O(k × C(n,k))  O(k)
Permutations    n!          O(n × n!)     O(n × n!)      O(n)
──────────────────────────────────────────────────────────────────

Relative size: C(n,k) ≤ 2^n ≤ n! for most practical n and k
```

---

## SECTION 13: COMMON INTERVIEW MISTAKES

### Mistake 1: Confusing Subsets and Subsequences

```
PROBLEM SAYS: "Find all subsequences of [1,2,3]"

WRONG ANSWER: {{},{1},{2},{3},{1,2},{1,3},{2,3},{1,2,3}}
              → This generates the correct VALUES, but candidate says
                "these are the subsets" when the interviewer means
                "order matters in the final sequences"

CORRECT ANSWER: For "ABC", "AC" is a valid subsequence (A before C, gap allowed)
                but "CA" is NOT (reversed order)

THE MISTAKE: Not connecting "subsequence = order preserved from original"
             Candidates treat it as subset generation and miss that the
             result encodes position information.
```

---

### Mistake 2: Confusing Combinations and Permutations

```
PROBLEM: "Generate all ways to choose 2 elements from [1,2,3]"

COMBINATION answer:  {1,2}, {1,3}, {2,3}         ← 3 results
PERMUTATION answer:  [1,2],[2,1],[1,3],[3,1],[2,3],[3,2] ← 6 results

COMMON MISTAKE: Always generating permutations when combinations are required.
WHY IT HAPPENS: The code tries all unused elements at each step (permutation style)
                instead of only elements at index ≥ current (combination style)
```

---

### Mistake 3: Wrong Recursion State

```
MISTAKE: Passing too little state
  Wrong: Only passing index, but forgetting the current partial answer
  Result: No way to build up the solution

MISTAKE: Passing too much state
  Wrong: Passing the entire result set into the recursive call
  Result: Exponential space overhead, confusing code

CORRECT: State = only what's needed to solve from THIS call forward
  Typically: (index_or_position, current_partial_answer)
```

---

### Mistake 4: Missing Branches

```
For permutations, a common mistake:

WRONG: Only considering elements after current index
  → Misses elements before current index (since permutations can rearrange)
  → Generates combinations instead of permutations

WRONG: Using a start index for permutations (like combinations)
  → [1,2,3] is generated but [2,1,3] is not
  → Candidate generates 3 results instead of 6
```

---

### Mistake 5: Duplicate Generation (Inputs With Repeats)

```
Input: [1,2,2]

WRONG APPROACH (no de-dup):
  Generates {1,2,2}, {1,2}, {1,2}, {2,2}, {2}, {2}, {1}, {}
  → {1,2} appears TWICE, {2} appears TWICE

WHY: The two '2's at different positions generate identical subsets

CORRECT APPROACH:
  Sort the array first
  At each level of recursion, if an element is the same as the previous
  element at the same recursion depth, skip it (don't explore that branch)

THE MISTAKE: Not recognizing that duplicate elements in input create
             duplicate results, requiring explicit de-duplication
```

---

### Mistake 6: Wrong Complexity Calculations

```
COMMON WRONG ANSWERS:

"Subsets is O(2^n)"    ← Missing O(n) copy factor → should be O(n × 2^n)

"Permutations is O(n!)" ← Missing O(n) copy factor → should be O(n × n!)

"Space for permutations is O(n!)" ← Wrong! Stack depth = n, not n!
                                     Space = O(n)

"Backtracking eliminates exponential complexity" ← Wrong! Pruning improves
                                                    constant factors but
                                                    worst case is unchanged
```

---

### Mistake 7: Forgetting the Undo Step

```
WRONG: Adding element to current list, recursing, but NOT removing it

Result: Every subsequent recursive call sees a contaminated state
        where the previous branch's choices are still present.

CORRECT: Choose → Explore → UNDO (mandatory!)

HINT TO CATCH THIS: If your output has elements from previous branches
                    appearing in current branch results, you forgot to undo.
```

---

## SECTION 14: GOOGLE INTERVIEW EXPECTATIONS

### What Interviewers Actually Evaluate

Google interviewers are not checking whether you memorized the solution. They are evaluating a **profile of skills**:

```
SKILL                               WEIGHT
────────────────────────────────────────────────────────
Pattern recognition (without hints)    HIGH
Precise state definition               HIGH
Correct complexity analysis            HIGH
Clean implementation of template       MEDIUM
Handling edge cases                    MEDIUM
Recognizing pruning opportunities      HIGH (differentiator)
Extending to harder variants           HIGH (differentiator)
Communication clarity                  HIGH
────────────────────────────────────────────────────────
```

### What Strong Candidates Do Differently

**Before touching code:**
- Explicitly name the pattern: *"This is a combination problem."*
- State the tree structure: *"Binary choices at each element, depth n, 2ⁿ leaves."*
- Define state formally: *"My state is (index, current_combination)."*
- State complexity upfront: *"This will be O(k × C(n,k)) time, O(k) space."*

**While coding:**
- Write the template, then fill in specifics
- Verbalize each part: *"Here I'm making the choice, here's the explore, here's the undo."*

**After coding:**
- Proactively trace through a small example
- Proactively mention edge cases
- Proactively discuss follow-ups

### Common Follow-Up Questions at Google

These are almost guaranteed after you solve the base problem:

```
"What if elements can repeat?"
  → Discuss sorting + skip-duplicate strategy

"What if you only need to count, not enumerate?"
  → Discuss mathematical formula C(n,k) or DP approach

"Can you reduce the space complexity?"
  → Discuss iterative approaches, generator/yield patterns

"What if k is very large (close to n)?"
  → C(n,k) = C(n, n-k) — choosing what to EXCLUDE instead

"How would this change if the array has duplicates?"
  → Sort + de-duplication logic at each recursion level

"Can you solve this iteratively?"
  → Discuss bit manipulation for subsets (use i from 0 to 2^n-1,
    check each bit)
```

### How Interviewers Test Recursion Beyond Coding

Interviewers ask non-coding questions to probe understanding:

- *"Draw me the recursion tree for input [1,2,3]."*
- *"Explain why your space complexity is O(n) and not O(2^n)."*
- *"If I give you input of size 20, how many recursive calls happen?"*
- *"Your solution works. How would you make it 10× faster?"* (Pruning)
- *"Why does your algorithm not miss any combinations?"*

These questions are designed to separate candidates who wrote the correct code by pattern-matching from candidates who genuinely understand.

---

## SECTION 15: ADVANCED PATTERN CONNECTIONS

### How These Patterns Evolve

The four patterns are not isolated — they're interconnected and serve as building blocks for more advanced topics.

```
SUBSETS ────────────────┐
                        ├──→ BACKTRACKING
SUBSEQUENCES ───────────┤    (add constraints + pruning)
                        │
COMBINATIONS ───────────┤
                        ├──→ DYNAMIC PROGRAMMING
PERMUTATIONS ───────────┘    (when subproblems overlap)
```

---

### Connection to Backtracking

Backtracking is the patterns above with **constraints and pruning added**.

```
Subsets         → Subset Sum (pruning: stop if sum > target)
Combinations    → N-Queens (pruning: stop if column/diagonal conflict)
Permutations    → Sudoku (pruning: stop if cell constraint violated)
Subsequences    → Word Search (pruning: stop if character mismatch)
```

The generate-all recursion tree becomes a pruned search tree. The structural template is identical; only the pruning condition differs.

---

### Connection to Dynamic Programming

When a recursive pattern has **overlapping subproblems**, it evolves into DP.

```
Count of subsequences matching a pattern:
  → Naive: backtracking O(2^n) 
  → DP: O(n²) (identical subproblems share answers)

Longest common subsequence:
  → Naive: generate all subsequences of both strings, find longest common
  → DP: O(m × n) 2D table (classic subsequence DP)

Count of combinations summing to target:
  → Naive: backtracking O(n^(T/min))
  → DP: O(n × T) if order doesn't matter (combination sum count)
```

**The signal for when to use DP over backtracking:** when the problem asks for a *count* or *optimal value*, not for enumeration of all solutions. Overlapping subproblems are the structural indicator.

---

### Connection to Trees

Tree problems are fundamentally recursive. Many classic tree algorithms are secretly the four patterns:

```
Generate all root-to-leaf paths      → Subsequence/path pattern
Find all subsets of nodes summing to k → Subset Sum on a tree
Find all permutations of tree levels → Permutation of BFS levels
```

Tree DFS itself is structured like backtracking: go deep (explore), come back (undo), try next child.

---

### Connection to Graphs

Graph traversal extends these patterns to non-linear structures:

```
All paths from source to destination → Path finding (permutation-like)
Find all topological orderings       → Permutation on DAG
Eulerian path (visit all edges once) → Combination + constraint
Graph coloring                       → Combination + constraint (backtracking)
Hamiltonian path                     → Permutation + adjacency constraint
```

---

### The Evolution Roadmap

```
Subsets/Combinations/Permutations  (patterns, Day 3)
            ↓ add constraints
       Backtracking                (systematic constraint satisfaction)
            ↓ subproblems overlap
    Dynamic Programming            (memoize recursive calls)
            ↓ apply to graphs
    Graph Algorithms               (BFS, DFS, shortest paths)
            ↓ optimize further
    Greedy Algorithms              (local optimal = global optimal)
```

Every advanced algorithm you'll encounter is built on this foundation. The patterns you're learning today are not beginner material — they are the **permanent substrate** of algorithmic thinking.

---

## SECTION 16: VISUAL MIND MAP

```
                    ┌─────────────────────────────┐
                    │         RECURSION            │
                    │  "Trust the smaller version" │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       DECISION TREES         │
                    │  State → Decision → Choice   │
                    │  Branch → Path → Leaf        │
                    └──────────────┬──────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                       │
            ▼                      ▼                       ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
   │   INCLUDE /     │  │  POSITION-BASED │  │   FIXED-SIZE        │
   │   EXCLUDE       │  │  (which unused  │  │   ORDERED WINDOW    │
   │   DECISIONS     │  │   element next?)│  │   (start index)     │
   └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘
            │                    │                       │
     ┌──────┴──────┐             │                ┌──────┴──────┐
     │             │             │                │             │
     ▼             ▼             ▼                ▼             ▼
 SUBSETS    SUBSEQUENCES  PERMUTATIONS      COMBINATIONS  (ordered subsets)
 Order:NO   Order:YES      Order:YES         Order:NO
 Size:Any   Size:Any       Size:Fixed        Size:Fixed
 Count:2^n  Count:2^n      Count:n!          Count:C(n,k)
     │             │             │                │
     └──────┬──────┘             └────────┬───────┘
            │                             │
            ▼                             ▼
     ┌─────────────┐             ┌──────────────────┐
     │ BACKTRACKING│◄────────────│ + CONSTRAINTS    │
     │ (add pruning│             │ + PRUNING        │
     │   to trees) │             └──────────────────┘
     └──────┬──────┘
            │
     ┌──────┴──────────────────────────┐
     │                                 │
     ▼                                 ▼
 DP (overlapping               GRAPH ALGORITHMS
 subproblems exist)            (extend to non-linear
 O(polynomial)                  structures)

 ┌────────────────────────────────────────────────┐
 │                  COMPLEXITY                     │
 │  Pattern    │ Time       │ Space                │
 │  Subsets    │ O(n·2^n)   │ O(n)                 │
 │  Subsequ.   │ O(n·2^n)   │ O(n)                 │
 │  Combos     │ O(k·C(n,k))│ O(k)                 │
 │  Perms      │ O(n·n!)    │ O(n)                 │
 └────────────────────────────────────────────────┘
```

---

## SECTION 17: PRACTICE PROBLEMS

### SUBSETS (5 Problems)

---

**S1: Power Set**
*"Given an array of distinct integers, return all possible subsets (the power set)."*

- **Why this pattern:** Classic include/exclude decision for each element. Every element is either in or out of each subset.
- **Recursive thinking:** State = (index, current). At index i, branch on include/exclude arr[i]. Advance index. Base case: index == n.
- **Complexity:** Time O(n × 2ⁿ), Space O(n) stack.
- **Key learning:** The foundational subset template. Once you internalize this, every other subset problem is a variant. The order in which you process elements doesn't change the set of subsets produced.

---

**S2: Subsets II (With Duplicates)**
*"Given an array that may contain duplicates, return all distinct subsets."*

- **Why this pattern:** Same include/exclude structure, but duplicate inputs create duplicate outputs without de-duplication.
- **Recursive thinking:** Sort the array first. At each recursion level, skip a number if it's the same as the previous number at the same depth. The intuition: if you excluded element X at this level, don't try another X at this level — it creates the same subtree.
- **Complexity:** Time O(n × 2ⁿ), Space O(n).
- **Key learning:** The sorting + skip-duplicate pattern. This exact technique applies to Combination Sum II, Permutations II, and many others. Master it here.

---

**S3: Subset Sum (Does a subset summing to target exist?)**
*"Given an array and target, return true if any subset sums to target."*

- **Why this pattern:** Include/exclude each element, track running sum. Prune when sum exceeds target.
- **Recursive thinking:** State = (index, remaining_target). At each step, either include arr[i] (subtract from remaining) or exclude. Base case: remaining == 0 (found!). Prune: remaining < 0.
- **Complexity:** Backtracking: O(2ⁿ). With DP: O(n × target).
- **Key learning:** Introduces pruning to the subset template. Also reveals when DP is superior — if you only need existence/count, DP dominates.

---

**S4: Find All Subsets Summing to Target**
*"Return ALL subsets (not just existence) that sum to the target."*

- **Why this pattern:** Now you need enumeration, not just a boolean. Backtracking is justified.
- **Recursive thinking:** Same as S3 but record the subset at every valid leaf (remaining == 0) instead of returning true/false. Continue exploring all branches even after finding one solution.
- **Complexity:** Time O(n × 2ⁿ) worst case, Space O(n).
- **Key learning:** The distinction between "does a solution exist" (can use DP) vs "find all solutions" (must use backtracking). This distinction appears repeatedly.

---

**S5: Count of Subsets with Given Sum**
*"Count how many subsets sum to target."*

- **Why this pattern:** Looks like S4, but you only need the COUNT. This is the signal to switch from backtracking to DP.
- **Recursive thinking:** Pure backtracking gives O(2ⁿ). But notice: `count(index, remaining)` depends only on index and remaining — these are overlapping subproblems. Memoize → O(n × target).
- **Complexity:** Backtracking O(2ⁿ), DP O(n × target).
- **Key learning:** Pattern evolution — when subset backtracking becomes subset DP. The recursion structure is identical; the only addition is memoization.

---

### SUBSEQUENCES (5 Problems)

---

**Q1: Generate All Subsequences of a String**
*"Given a string, return all 2ⁿ subsequences."*

- **Why this pattern:** At each character, include it in the current subsequence or skip it. Identical to subset generation, but the result preserves character order.
- **Recursive thinking:** State = (index, current_string). Branch: include str[index] or skip. Base: index == n → record current_string.
- **Complexity:** Time O(n × 2ⁿ), Space O(n).
- **Key learning:** Subsequences = subsets on ordered sequences. The include/exclude template is identical. The output strings respect left-to-right order automatically.

---

**Q2: Count Distinct Subsequences Matching a Pattern**
*"Given string S and pattern T, count how many distinct subsequences of S equal T."*

- **Why this pattern:** Starts as subsequence backtracking, but the massive overlap of subproblems makes DP the correct approach.
- **Recursive thinking:** State = (i in S, j in T). If S[i] == T[j], either match it (advance both) or skip S[i]. If S[i] ≠ T[j], skip S[i]. Overlapping subproblems → DP table.
- **Complexity:** Backtracking O(2ⁿ), DP O(m × n).
- **Key learning:** Counting subsequences = DP territory. Enumeration = backtracking. This distinction is testable.

---

**Q3: Longest Increasing Subsequence (LIS)**
*"Find the longest strictly increasing subsequence."*

- **Why this pattern:** The search space is all subsequences. You want the longest one that's increasing.
- **Recursive thinking:** Include each element if it's greater than the last included element. But: subproblems overlap heavily → DP. LIS[i] = 1 + max(LIS[j]) for all j < i where arr[j] < arr[i].
- **Complexity:** Backtracking O(2ⁿ), DP O(n²), Binary Search optimized O(n log n).
- **Key learning:** Optimization on subsequences → DP. The three-complexity progression (O(2ⁿ) → O(n²) → O(n log n)) is a classic Google discussion topic.

---

**Q4: Print All Subsequences Summing to K**
*"Print all subsequences of an array whose elements sum to K."*

- **Why this pattern:** Need to enumerate (not just count) — backtracking is justified.
- **Recursive thinking:** State = (index, current_sum, current_subsequence). Include if adding arr[index] doesn't overshoot K. At base case: if sum == K and index == n, record. Pruning: if sum > K, stop.
- **Complexity:** Time O(n × 2ⁿ), Space O(n).
- **Key learning:** Pruning within the subsequence template. Distinguish this from "count of subsequences summing to K" which would use DP.

---

**Q5: Check if One String is a Subsequence of Another**
*"Is string T a subsequence of string S?"*

- **Why this pattern:** Single-path recursion — at each character of S, either match it with the next needed character of T, or skip it.
- **Recursive thinking:** State = (i in S, j in T). If S[i] == T[j], advance both. Else advance only i. Base case: j == len(T) → true; i == len(S) → false.
- **Complexity:** Time O(n), Space O(n) recursion → O(1) iteratively.
- **Key learning:** Sometimes "subsequence" leads to a simple O(n) two-pointer solution, not exponential backtracking. Don't over-engineer.

---

### COMBINATIONS (5 Problems)

---

**C1: Combinations (Choose k from 1 to n)**
*"Return all combinations of k numbers from 1 to n."*

- **Why this pattern:** Classic combination template with start index.
- **Recursive thinking:** State = (start, current). At each step, add any number from start to n. Recurse with start = chosen+1. Base case: current.size() == k.
- **Complexity:** Time O(k × C(n,k)), Space O(k).
- **Key learning:** The start-index trick is the entire secret of combination recursion. Understand WHY it prevents duplicates: it forces elements to always be chosen in increasing order.

---

**C2: Combination Sum (Reuse Allowed)**
*"Given candidates and target, find all combinations that sum to target (elements reusable)."*

- **Why this pattern:** Combination template with an important twist: you can reuse elements.
- **Recursive thinking:** State = (start, current, remaining). When you choose candidate[i], recurse with start = i (not i+1!) to allow reuse. Prune when remaining < 0.
- **Complexity:** Time O(n^(target/min_candidate)), Space O(target/min_candidate).
- **Key learning:** The subtle difference between `start = i` (reuse allowed) and `start = i+1` (no reuse). A one-character change with enormous semantic impact.

---

**C3: Combination Sum II (No Reuse, Duplicates in Input)**
*"Find all unique combinations summing to target, each element used at most once."*

- **Why this pattern:** Combination template with both no-reuse AND de-duplication.
- **Recursive thinking:** Sort. Use `start = i+1` (no reuse). At each level, skip if `candidates[i] == candidates[i-1]` and i > start (de-dup at same level).
- **Complexity:** Time O(2ⁿ) worst case, Space O(n).
- **Key learning:** Combines two concepts: no-reuse (start index advances) + de-duplication (skip same element at same depth). Both appear together frequently.

---

**C4: Letter Combinations of a Phone Number**
*"Given digit string, return all letter combinations on a phone keypad."*

- **Why this pattern:** At each position (digit), you have a set of letter choices. This is a combination of choices across positions.
- **Recursive thinking:** State = (digit_index, current_string). For each digit, iterate over its mapped letters, add one, recurse to next digit, undo.
- **Complexity:** Time O(4ⁿ × n), Space O(n), where n = number of digits, 4 = max letters per key.
- **Key learning:** Combination across multiple finite choice sets (each digit maps to 3-4 letters). Generalizes to: "pick one item from each of k groups."

---

**C5: K-th Combination**
*"Without generating all combinations, find the k-th combination in sorted order."*

- **Why this pattern:** Mathematical shortcut — use C(n,k) counts to navigate the combination tree without enumerating.
- **Recursive thinking:** At each position, count how many combinations start with each possible element. Navigate the tree by comparing k against those counts. This avoids generating all C(n,k) combinations.
- **Complexity:** Time O(n × k), Space O(k).
- **Key learning:** You don't always need to enumerate everything. Counting C(n,k) analytically can navigate directly to the k-th answer. This demonstrates mathematical depth beyond just coding the template.

---

### PERMUTATIONS (5 Problems)

---

**P1: Permutations (Distinct Elements)**
*"Return all permutations of an array of distinct integers."*

- **Why this pattern:** Classic permutation template. Every element can go in every position.
- **Recursive thinking:** State = (current_permutation, used[]). At each step, try every unused element. Mark used, add to permutation, recurse, unmark, remove.
- **Complexity:** Time O(n × n!), Space O(n).
- **Key learning:** The visited-array approach. The key insight: unlike combinations, you don't advance a start index — you try ALL unused elements at each level.

---

**P2: Permutations II (With Duplicates)**
*"Return all unique permutations of an array that may contain duplicates."*

- **Why this pattern:** Permutation template with de-duplication to avoid identical results from duplicate inputs.
- **Recursive thinking:** Sort. Use visited array. At each level: skip arr[i] if arr[i] == arr[i-1] AND visited[i-1] is false (the "same-level sibling" skip rule). This eliminates duplicate permutations while keeping duplicate elements in the same permutation correctly ordered.
- **Complexity:** Time O(n × n!) worst case, Space O(n).
- **Key learning:** The de-duplication rule for permutations is subtly different from combinations. The "visited[i-1] is false" condition is notoriously tricky to derive — understand WHY it works.

---

**P3: Next Permutation**
*"Given a permutation, modify it in-place to produce the next lexicographically greater permutation."*

- **Why this pattern:** Understanding permutation ordering — the lexicographic structure of the permutation tree.
- **Recursive thinking:** No explicit recursion needed. Algorithm: find the rightmost element smaller than its successor (the "pivot"). Swap pivot with the smallest element to its right that's larger. Reverse everything to the right of the pivot. This navigates to the adjacent leaf in the permutation tree.
- **Complexity:** Time O(n), Space O(1).
- **Key learning:** Not all permutation problems need full backtracking. Sometimes mathematical insight into the permutation tree structure gives O(n) solutions.

---

**P4: Permutation Sequence (K-th Permutation)**
*"Return the k-th permutation of [1..n] in sorted order."*

- **Why this pattern:** Navigate the permutation tree directly using factorial counting, like a number system in factorial base.
- **Recursive thinking:** There are (n-1)! permutations starting with each digit. Use k to determine which digit goes first: digit = k / (n-1)!. Then recurse for the remaining n-1 positions with adjusted k.
- **Complexity:** Time O(n²) or O(n log n), Space O(n).
- **Key learning:** Like the k-th combination, this avoids generating all n! permutations. Signals deep understanding of the permutation structure.

---

**P5: Palindrome Permutation**
*"Does any permutation of a string form a palindrome? List all palindromic permutations."*

- **Why this pattern:** Permutation generation with a palindrome constraint.
- **Recursive thinking:** First determine feasibility: at most one character can have odd frequency. Then generate permutations of half the string (since palindromes are symmetric) and mirror each one. Reduces effective problem size from n! to (n/2)!.
- **Complexity:** Time O((n/2)!), Space O(n).
- **Key learning:** Mathematical reduction before recursion. Half the characters determine the full palindrome. Recognizing this halves the problem size from n! to (n/2)! — a massive improvement.

---

## SECTION 18: SPEAKING NOTES

*Anchors for natural explanation — not a script to recite.*

---

### Opening Hook

> "Every recursion interview problem you'll ever face is one of four things: generating subsets, generating subsequences, generating combinations, or generating permutations. If you truly understand these four, you can reconstruct any recursive solution from scratch. Let me show you why."

---

### Decision Tree Thinking

Key anchors:
- Stop coding, start drawing
- Six vocabulary words: state, decision, choice, branch, path, leaf node
- State = information needed at this recursive call
- Decision = question answered at each node
- Leaf = where recursion stops (valid = record, invalid = prune)
- Draw the tree before writing a line of code — it reveals everything

---

### Subsets

Key anchors:
- Binary decision at each element: in or out
- Tree: perfect binary tree of depth n, 2ⁿ leaves
- Each leaf = one subset
- Time O(n × 2ⁿ) — the n is from copying; never forget it
- Space O(n) — just the stack depth, not the number of leaves
- The four Google questions: state? choice? transition? base case?

---

### Subsequences

Key anchors:
- Four terms to distinguish: subarray (contiguous), substring (contiguous string), subsequence (order-preserving, gaps OK), subset (no order)
- Subsequences = same include/exclude structure as subsets on an ordered input
- The critical difference: result strings encode original character order
- "CA" is never a subsequence of "ABC" — you cannot reverse order
- When counting subsequences: DP. When listing all: backtracking.

---

### Combinations

Key anchors:
- Fixed size k, order irrelevant
- Key mechanism: start index prevents duplicates
  - "Always pick elements at index ≥ current" → ensures each combination is generated exactly once
- Start index = i+1 for no-reuse; start index = i for reuse allowed
- De-duplication for duplicates in input: sort + skip same element at same depth
- Real-world: teams, committees, lottery — order doesn't matter

---

### Permutations

Key anchors:
- Order matters completely — [1,2,3] ≠ [3,2,1]
- No start index — try ALL unused elements at each position
- Use visited array OR swap-based approach
- Branching: n at level 1, n-1 at level 2, ..., 1 at level n → n! leaves
- Time O(n × n!) — the n is from copying the final permutation
- Real-world: passwords, seating, rankings

---

### Pattern Recognition

Key anchors:
- The two questions to ask first:
  1. Does order matter? (Yes → permutation/subsequence; No → combination/subset)
  2. Is size fixed? (Yes → combination/permutation; No → subset/subsequence)
- Memorize the signals: "all arrangements" → permutation; "choose k" → combination; "in or out" → subset; "original order preserved" → subsequence

---

### Complexity Insights

Key anchors:
- Time = total nodes × work per node (don't forget the copy cost at leaves)
- Space = max depth × frame size (NOT total nodes — this surprises everyone)
- Subsets/Subsequences: O(n × 2ⁿ) time, O(n) space
- Combinations: O(k × C(n,k)) time, O(k) space
- Permutations: O(n × n!) time, O(n) space

---

### Interview Insights

Key anchors:
- State the pattern before coding: "This is a combination problem"
- State complexity before coding: "I expect O(k × C(n,k)) time"
- The follow-up pattern: any generate-all problem evolves to a count/optimize problem → that's DP
- "All solutions" → backtracking; "count solutions" → DP; "optimal solution" → DP or greedy

---

### Summary

> "Four patterns, one recursive framework. Choose → Explore → Undo. The branching factor and depth determine complexity. State definition determines correctness. Pattern recognition determines speed. This is the entire foundation of recursive problem solving."

---

## SECTION 19: GOOGLE-STYLE THINKING EXERCISES

*For each problem: identify the pattern, explain the clues, describe expected thinking, and discuss complexity. Do NOT solve.*

---

**Exercise 1:**
*"You are given a list of course prerequisites. Find all valid orderings in which you can complete all courses."*

- **Pattern likely involved:** Permutations + graph constraint (topological ordering)
- **Clues revealing pattern:** "All valid orderings" = enumeration → backtracking. Prerequisites = ordering constraint on which elements can appear before others.
- **Expected thinking:** "This is a permutation problem on a DAG. Instead of trying all n! arrangements, I only try elements whose prerequisites are already in my current sequence. This is backtracking on a topological sort."
- **Complexity discussion:** Worst case O(n × n!) without constraints. With constraints, heavily pruned by the DAG structure. In a fully connected DAG, only 1 valid ordering exists — backtracking terminates in O(n) steps.

---

**Exercise 2:**
*"Given a string containing only digits, return all possible valid IP addresses."*

- **Pattern likely involved:** Combination with fixed structure (exactly 4 parts, each 1-3 digits)
- **Clues revealing pattern:** "All possible valid" = enumeration. Fixed structure (exactly 4 octets) = combination with size constraint. Each octet has a constraint (0–255, no leading zeros).
- **Expected thinking:** "I need to place exactly 3 dots in the string to create 4 octets. At each step, I try placing the next octet (1 to 3 digits). I prune if the octet value > 255 or has invalid leading zero."
- **Complexity discussion:** Input length is bounded (max 12 digits for a valid IP). Branching factor ≤ 3 per octet, depth = 4 octets. Total states = 3⁴ = 81. O(1) effectively — bounded by constant.

---

**Exercise 3:**
*"You have n pairs of parentheses. Generate all valid combinations."*

- **Pattern likely involved:** Combination/subset with balance constraint
- **Clues revealing pattern:** "Generate all valid" = enumeration → backtracking. Binary choice at each position: `(` or `)`. Constraints: open count ≤ n, close count ≤ open count.
- **Expected thinking:** "At each position of the 2n-character string, I choose `(` or `)`. I prune: (1) if open > n, (2) if close > open. I record when both counts reach n."
- **Complexity discussion:** Catalan number Cₙ ≈ 4ⁿ/(n^1.5 × √π) valid strings. Time O(4ⁿ/√n), which is between O(2ⁿ) and O(4ⁿ). Space O(n).

---

**Exercise 4:**
*"A robot can climb 1 or 2 steps at a time. Find ALL distinct ways to reach step n."*

- **Pattern likely involved:** Subsequences / combinations → pivots to DP when only count is needed
- **Clues revealing pattern:** "Find ALL distinct ways" = enumeration. At each step: choice of 1 or 2. Binary-ish branching → exponential enumeration if needed.
- **Expected thinking:** "If asked to enumerate all paths: backtracking with 2 branches per step. If asked to count: notice that count(n) = count(n-1) + count(n-2) — identical subproblems → DP in O(n). First clarify: enumerate or count?"
- **Complexity discussion:** Enumeration: O(Fibonacci(n)) paths ≈ O(φⁿ). Count only: O(n) DP. This is the pivotal example of backtracking → DP conversion.

---

**Exercise 5:**
*"Given a matrix of characters, find all words from a dictionary that can be formed by adjacent cells (no reuse)."*

- **Pattern likely involved:** Permutations on graph (path finding) + Trie optimization
- **Clues revealing pattern:** "All words" = enumeration. Adjacent cells + no reuse = path with visited constraint. Dictionary lookup = constraint.
- **Expected thinking:** "This is backtracking path exploration. From each cell, explore adjacent unvisited cells. Check if current path forms a dictionary word. Prune if current path is not a prefix of any dictionary word. Use a Trie for O(1) prefix checking."
- **Complexity discussion:** Naive: O(cells × 4^L) where L = max word length. With Trie pruning: far less in practice. Trie construction: O(total characters in dictionary).

---

**Exercise 6:**
*"Return all unique integer arrays of length n that sum to a given target, using numbers 1 through k."*

- **Pattern likely involved:** Combination Sum with explicit size constraint
- **Clues revealing pattern:** "All unique arrays" = enumeration → backtracking. Fixed length n = combination with size constraint. "Sum to target" = additional pruning condition.
- **Expected thinking:** "This combines Combination Sum (sum constraint) with Combinations (size constraint). State = (start, current_sum, current_array). Prune: if current_sum > target or current.size() > n. Record when current.size() == n and current_sum == target."
- **Complexity discussion:** Upper bound O(k × C(k, n)) since we choose n items from 1..k. Pruning on sum reduces this further. Space O(n).

---

**Exercise 7:**
*"Find all paths in a binary tree that sum to a given value."*

- **Pattern likely involved:** Subsequence/path pattern on a tree structure
- **Clues revealing pattern:** "All paths" = enumeration. Tree structure = recursive naturally. "Sum to value" = constraint and pruning.
- **Expected thinking:** "DFS from root to leaf, tracking current path and sum. When reaching a leaf: check if path sum == target. The 'path' is a subsequence of nodes — each branch is an implicit include/exclude for tree nodes. Undo: remove node from path when backtracking."
- **Complexity discussion:** O(N) nodes visited. At each leaf, O(H) to copy the path. Total: O(N × H). For balanced tree: O(N log N). For skewed tree: O(N²).

---

**Exercise 8:**
*"Given a collection of numbers, find all unique numbers that can be formed by concatenating some of these numbers."*

- **Pattern likely involved:** Permutations + ordering constraint
- **Clues revealing pattern:** "All unique numbers" = enumeration. "Concatenating some" = selecting a subset. Order of concatenation matters (12 vs 21 are different). Combination of subset selection + permutation of that subset.
- **Expected thinking:** "Two-step problem: (1) Select which numbers to include (subset), (2) Arrange them in all orders (permutation). This is a permutation of subsets. Alternatively, directly permute all numbers and consider all prefixes of each permutation."
- **Complexity discussion:** Total arrangements = sum over all k from 1 to n of P(n,k) = O(n × n!). In practice, de-duplication reduces this.

---

**Exercise 9:**
*"Partition a set of numbers into two subsets with equal sum, if possible."*

- **Pattern likely involved:** Subsets with sum constraint → evolves to DP
- **Clues revealing pattern:** "Partition into two subsets" = include/exclude (element goes to subset A or subset B). "Equal sum" = constraint. "If possible" (boolean) = not enumeration → DP is likely better.
- **Expected thinking:** "If I can find one subset summing to total/2, the other automatically sums to total/2. This is Subset Sum (existence), which is DP: O(n × target). Only use backtracking if you need to enumerate all valid partitions."
- **Complexity discussion:** Backtracking: O(2ⁿ). DP: O(n × sum/2). For large inputs, DP is necessary. This is a classic NP problem, but the DP pseudo-polynomial solution is interview-standard.

---

**Exercise 10:**
*"Given an array, count the number of subarrays with exactly k distinct elements."*

- **Pattern likely involved:** Sliding window / two-pointer (NOT backtracking — this is the trick)
- **Clues revealing pattern:** "Subarrays" = contiguous = NOT subset/subsequence. "Count" = not enumeration. "Exactly k distinct" = constraint on a sliding window.
- **Expected thinking:** "The word 'subarray' is the key signal. Subarrays are contiguous — this means two-pointer or sliding window, not recursion. Recursion would be O(n² or n³); sliding window gives O(n). Decompose: 'exactly k distinct' = 'at most k distinct' minus 'at most k-1 distinct'."
- **Complexity discussion:** O(n) with sliding window. A candidate who says "this is a subset problem and I'll use backtracking" reveals pattern confusion. The contiguity constraint makes it a completely different class of problem.

---

## SECTION 20: SELF-ASSESSMENT

### 15 Conceptual Questions

1. What is the precise difference between a subsequence and a subset? Give one example where the distinction changes the algorithm completely.

2. Why does the combination recursion use a `start` index, while permutation recursion does not? Explain from first principles, not from memory.

3. The number of subsets of a set of size n is 2ⁿ. The number of subsequences of a sequence of length n is also 2ⁿ. Are these the same thing? Explain the relationship.

4. You have a combination problem. Your recursion tree has depth k and branching factor at most (n - depth + 1). Explain why the total number of leaf nodes is exactly C(n, k).

5. Why is the time complexity of generating all permutations O(n × n!) and not just O(n!)? What causes the extra factor of n?

6. Explain the "sort + skip duplicate at same level" technique for de-duplication. Why does skipping work at the same recursion level, but not across different levels?

7. A problem asks "Find all subsets with sum exactly K." Another asks "Count subsets with sum exactly K." Explain why you would use backtracking for the first and DP for the second. What structural property of the problem changes your decision?

8. For permutations of [1,1,2], how many unique permutations exist? Prove it using the formula n! / (count1! × count2!). Then explain how backtracking with de-duplication generates exactly this many.

9. Explain the relationship: Permutations(n,k) = k! × Combinations(n,k). What does this mean structurally in terms of recursion trees?

10. You generate all combinations C(10, 5). How many total recursive calls does your algorithm make? (Hint: it's not just C(10,5).) Derive the formula.

11. Why is the space complexity of subset generation O(n) and not O(n × 2ⁿ), even though you're generating 2ⁿ subsets?

12. What is the branching factor of the permutation recursion tree at level k (when k elements have already been placed)? How does this give n! total leaves?

13. The two-pointer solution for "count subarrays with sum K" is O(n). A backtracking solution would be O(n² or 2ⁿ). What property of "subarray" (vs "subset/subsequence") enables the O(n) solution?

14. For combinations with reuse allowed (Combination Sum), why do you pass `start = i` instead of `start = i+1` when recursing on element i?

15. Explain intuitively why C(n,k) = C(n, n-k). How does this equivalence manifest in the recursion tree? How can you use it to optimize combination generation when k > n/2?

---

### 10 Interview-Style Questions

1. *"I give you the string 'aab'. List all unique permutations. How many are there? Now walk me through how your algorithm generates exactly these without generating duplicates."*

2. *"Your combination algorithm generates C(10,4) = 210 results. The interviewer asks: 'What if I needed the 100th combination in sorted order without generating all 210? How would you approach this?'"*

3. *"You solved Subset Sum with backtracking in O(2ⁿ). I tell you n=40 and target=10⁶. Your solution is too slow. What do you do? Walk me through your full thought process."*

4. *"Describe the complete recursion tree for generating permutations of [1,2,3]. How many nodes does it have in total (not just leaves)? How does this relate to O(n × n!)?"*

5. *"I give you a combination solution. It produces duplicates for input [1,2,2]. I ask you to fix it in two ways: (a) post-processing the results, (b) modifying the recursion itself. Which is better and why?"*

6. *"You have 4 patterns: subsets, subsequences, combinations, permutations. I give you the problem: 'Find all anagram groupings of a list of strings.' Which pattern does this map to? Why? What's the complexity?"*

7. *"Implement subsequence generation for 'abcd'. Your interviewer then says: 'How many calls does your function make in total for a string of length n?' Derive the answer."*

8. *"You've implemented combination sum. The interviewer says: 'What if the candidates array is very large (n=1000) but target is small (target=10)? How does this affect your algorithm? Can you optimize?'"*

9. *"Two candidates submit solutions to 'generate all subsets.' Both produce correct output. Candidate A's solution runs in 1.2 seconds for n=25. Candidate B's runs in 3.8 seconds. Both claim O(n × 2ⁿ). How do you explain the difference? What would you look for in their code?"*

10. *"A problem asks you to generate all ways to tile a 2×n board with 1×2 dominoes. Which pattern does this map to? Define the state, choice, and base case. What's the complexity?"*

---

### 5 Advanced Reasoning Questions

1. Consider two algorithms: Algorithm A generates all subsets of {1,...,n} and Algorithm B generates all permutations of {1,...,k} where k = log₂(n). For what values of n does Algorithm A produce fewer outputs than Algorithm B? What does this imply about when to use which pattern?

2. A problem has n elements with m distinct values. The number of unique permutations is n! / (c₁! × c₂! × ... × cₘ!) where cᵢ is the count of the i-th distinct value. Prove that this formula counts exactly the unique permutations that backtracking with de-duplication would generate.

3. The "start index" technique for combinations ensures no duplicates by always choosing elements in increasing index order. However, this also means the combination tree is NOT a perfect tree. Derive the exact formula for the total number of nodes in the combination tree C(n, k) as a function of n and k. (Hint: it involves summing C values across multiple rows of Pascal's triangle.)

4. In backtracking for permutations, the swap-based approach has a subtle behavior: after all recursive calls, the array is restored to its original order. Prove that the swap-undo sequence guarantees this property for ANY depth of recursion, using induction.

5. Consider the problem: "Generate all arrangements of n elements where no two adjacent elements are the same." This is a permutation problem with an adjacency constraint. For input [1,1,2,2], analyze how effective backtracking pruning is compared to generating all 4!=24 permutations and filtering. How many nodes does the pruned backtracking explore? Generalize your answer.

---

*End of Day 3 Mastery Document*

---

> **Next Steps (in order):**
> 1. For each of the four patterns, draw the recursion tree for a size-3 input on paper from scratch without looking at this document.
> 2. Write the five-question mental drill (state, decision, choices, base case, complexity) for each pattern without prompting.
> 3. Take any three problems from Section 17 and fully define the state, decision, choices, transitions, and base cases before attempting implementation.
> 4. Attempt Exercise 10 in Section 19 — it's a deliberate trap to test your pattern-recognition instincts.
