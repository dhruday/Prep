# Salesforce DSA --- 3-Day Interview Sprint

> **Goal:** Maximize interview readiness in 3 days by prioritizing the
> highest-signal Salesforce DSA patterns instead of trying to solve a
> large number of problems superficially.

## Strategy

The question bank is already ranked using:

**`recency_score × frequency`**

With only 3 days, follow that ranking directly.

### Core Strategy

-   Focus on the **top \~20--24 problems**.
-   Learn the **underlying pattern**, not just the solution.
-   Be able to explain the approach before coding.
-   Prioritize **optimization and follow-up questions**.
-   Do not spend the entire day grinding new problems.

------------------------------------------------------------------------

# Day 1 --- Design + Heaps + Arrays

### High-Frequency Must-Dos

These are the highest-priority problems and represent several important
interview patterns.

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
               \# Problem                                                                                Difficulty      Key Pattern   LeetCode
  --------------- ---------------------------------------------------------------------------------- ------------------- ------------- ---------------------------------------------------------------------------------
                1 [LFU Cache](https://leetcode.com/problems/lfu-cache/)                                     Hard         HashMap +     [460](https://leetcode.com/problems/lfu-cache/)
                                                                                                                         Frequency     
                                                                                                                         Doubly Linked 
                                                                                                                         Lists         

                2 [String Compression](https://leetcode.com/problems/string-compression/)                  Medium        Two Pointers  [443](https://leetcode.com/problems/string-compression/)

                3 [Time Needed to Rearrange a Binary                                                       Medium        Simulation /  [2380](https://leetcode.com/problems/time-needed-to-rearrange-a-binary-string/)
                  String](https://leetcode.com/problems/time-needed-to-rearrange-a-binary-string/)                       Greedy        

                4 [Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/)            Medium        Prefix Sum +  [560](https://leetcode.com/problems/subarray-sum-equals-k/)
                                                                                                                         HashMap       

                5 Maximum Team Size --- Overlapping Intervals                                              Medium        Sorting +     ---
                                                                                                                         Sweep /       
                                                                                                                         Interval      
                                                                                                                         Processing    

                6 [Kth Largest Element in an                                                               Medium        Min-Heap of   [215](https://leetcode.com/problems/kth-largest-element-in-an-array/)
                  Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)                                 Size `k` /    
                                                                                                                         Quickselect   

                7 [LRU Cache](https://leetcode.com/problems/lru-cache/)                                    Medium        HashMap +     [146](https://leetcode.com/problems/lru-cache/)
                                                                                                                         Doubly Linked 
                                                                                                                         List          

                8 [Find Median from Data                                                                    Hard         Two Heaps     [295](https://leetcode.com/problems/find-median-from-data-stream/)
                  Stream](https://leetcode.com/problems/find-median-from-data-stream/)                                                 
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## Day 1 Priority

### Must Master

1.  **LFU Cache**
2.  **LRU Cache**
3.  **Find Median from Data Stream**
4.  **Kth Largest Element**
5.  **Subarray Sum Equals K**

### End-of-Day Goal

You should be able to:

-   Implement **LFU Cache from scratch** on a blank page.
-   Implement **LRU Cache from scratch** on a blank page.
-   Explain why the cache operations are **O(1)**.
-   Explain the two-heap approach for **Median from Data Stream**.
-   Explain the difference between:
    -   Min-heap of size `k`
    -   Max-heap
    -   Quickselect
-   Derive the optimized solution for **Subarray Sum Equals K**.

> **Highest-signal goal:** LFU + LRU should become automatic.

------------------------------------------------------------------------

# Day 2 --- Graphs + Trees + DP

### Classic Patterns

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
               \# Problem                                                                                                    Difficulty      Key Pattern    LeetCode
  --------------- ------------------------------------------------------------------------------------------------------ ------------------- -------------- -------------------------------------------------------------------------------------------------
                9 [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/)                                            Medium        Multi-Source   [994](https://leetcode.com/problems/rotting-oranges/)
                                                                                                                                             BFS            

               10 [Number of Islands](https://leetcode.com/problems/number-of-islands/)                                        Medium        DFS / BFS      [200](https://leetcode.com/problems/number-of-islands/)
                                                                                                                                             Flood Fill     

               11 [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/)                                      Medium        Topological    [210](https://leetcode.com/problems/course-schedule-ii/)
                                                                                                                                             Sort / Kahn's  
                                                                                                                                             Algorithm      

               12 [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/)                      Medium        2D Dynamic     [1143](https://leetcode.com/problems/longest-common-subsequence/)
                                                                                                                                             Programming    

               13 [Coin Change](https://leetcode.com/problems/coin-change/)                                                    Medium        1D DP /        [322](https://leetcode.com/problems/coin-change/)
                                                                                                                                             Unbounded      
                                                                                                                                             Knapsack       

               14 [Maximum Subarray](https://leetcode.com/problems/maximum-subarray/)                                          Medium        Kadane's       [53](https://leetcode.com/problems/maximum-subarray/)
                                                                                                                                             Algorithm      

               15 [Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/)                                          Medium        Sorting +      [253](https://leetcode.com/problems/meeting-rooms-ii/)
                                                                                                                                             Min-Heap       

               16 [Group Anagrams](https://leetcode.com/problems/group-anagrams/)                                              Medium        HashMap +      [49](https://leetcode.com/problems/group-anagrams/)
                                                                                                                                             Canonical Key  

               17 [Generate Parentheses](https://leetcode.com/problems/generate-parentheses/)                                  Medium        Backtracking   [22](https://leetcode.com/problems/generate-parentheses/)

               18 [Construct Binary Tree from Preorder and Inorder                                                             Medium        Divide &       [105](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/)
                  Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/)                       Conquer +      
                                                                                                                                             HashMap        
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## Day 2 Pattern Checklist

By the end of Day 2, make sure you can recognize:

-   **BFS**
    -   Multi-source BFS
    -   Level-order traversal
    -   Shortest path in an unweighted graph
-   **DFS**
    -   Flood fill
    -   Connected components
    -   Grid traversal
-   **Topological Sort**
    -   Indegree
    -   Queue
    -   Cycle detection
-   **Dynamic Programming**
    -   State definition
    -   Base case
    -   Transition
    -   Iteration order
-   **Heap**
    -   Min-heap for scheduling
    -   Managing concurrent intervals
-   **Backtracking**
    -   Choice
    -   Constraint
    -   Undo / backtrack

------------------------------------------------------------------------

# Day 3 --- Review + Stretch Problems

## Morning --- Re-Solve From Memory

Do **not** look at your previous solution initially.

Re-solve:

1.  [LFU Cache](https://leetcode.com/problems/lfu-cache/)
2.  [LRU Cache](https://leetcode.com/problems/lru-cache/)
3.  [Find Median from Data
    Stream](https://leetcode.com/problems/find-median-from-data-stream/)

### Target

You should be able to start coding within **5 minutes** after
understanding the requirements.

------------------------------------------------------------------------

## Stretch Problems

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
               \# Problem                                                                              Difficulty      Key Pattern    LeetCode
  --------------- -------------------------------------------------------------------------------- ------------------- -------------- -----------------------------------------------------------------------------
               19 [Minimum Difficulty of a Job                                                            Hard         DP +           [1335](https://leetcode.com/problems/minimum-difficulty-of-a-job-schedule/)
                  Schedule](https://leetcode.com/problems/minimum-difficulty-of-a-job-schedule/)                       Partitioning   

               20 [Subarrays with K Different                                                             Hard         Sliding        [992](https://leetcode.com/problems/subarrays-with-k-different-integers/)
                  Integers](https://leetcode.com/problems/subarrays-with-k-different-integers/)                        Window +       
                                                                                                                       At-Most-K      
                                                                                                                       Trick          

               21 [Gas Station](https://leetcode.com/problems/gas-station/)                              Medium        Greedy         [134](https://leetcode.com/problems/gas-station/)

               22 [Asteroid Collision](https://leetcode.com/problems/asteroid-collision/)                Medium        Stack          [735](https://leetcode.com/problems/asteroid-collision/)
                                                                                                                       Simulation     

               23 [Valid Parenthesis                                                                     Medium        Greedy +       [678](https://leetcode.com/problems/valid-parenthesis-string/)
                  String](https://leetcode.com/problems/valid-parenthesis-string/)                                     `lo/hi` Bounds 

               24 [Best Time to Buy and Sell                                                              Easy         One-Pass       [121](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/)
                  Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/)                               Minimum        
                                                                                                                       Tracking       
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 3-Day Time Budget

Assuming **8--10 hours per day**:

  -----------------------------------------------------------------------
  Time                    Activity                Goal
  ----------------------- ----------------------- -----------------------
  **2 hrs --- Morning**   Solve 2--3 new problems Understand the pattern
                                                  completely

  **2 hrs --- Midday**    Solve 2--3 more         Focus on implementation
                          problems                

  **1.5 hrs --- Evening** Review today's problems Write the key insight
                                                  in your own words

  **30 min**              Verbal mock interview   Explain one problem
                                                  aloud

  **Remaining time**      Weak areas / re-solving Fix gaps instead of
                                                  starting random
                                                  problems
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# The #1 Salesforce DSA Rule

Based on the interview data, **optimization and follow-up questions
matter heavily**.

A common interview flow is:

> **"Can you solve this?"**\
> → Give a working solution.\
> → **"Can you do better?"**\
> → Optimize time/space complexity.

Therefore, for **every problem**, practice this sequence:

## 1. Start With Brute Force

Say it out loud:

> "The straightforward solution would be..."

Explain:

-   What the brute-force approach does.
-   Time complexity.
-   Space complexity.

## 2. Identify the Bottleneck

Ask yourself:

> "What operation is making this slow?"

Examples:

-   Repeated lookup → **HashMap**
-   Repeated sorting → **Heap / better ordering**
-   Repeated subarray calculation → **Prefix Sum**
-   Repeated graph traversal → **Visited / BFS / DFS**
-   Repeated overlapping work → **Dynamic Programming**
-   Repeated interval checking → **Sorting + Sweep / Heap**

## 3. Optimize

Then explicitly say:

> "The bottleneck is X. We can eliminate it by using Y."

For example:

### Kth Largest Element

Naive approach:

``` text
Sort the entire array
→ O(n log n)
```

Better approach:

``` text
Maintain a min-heap of size k
→ O(n log k)
```

Or, depending on the problem and requirements:

``` text
Quickselect
→ Average O(n)
```

The important part is not just knowing the solution --- **be able to
explain why the optimization works.**

------------------------------------------------------------------------

# Interview Communication Template

Use this structure while solving each problem:

### 1. Clarify

> "Let me confirm the constraints and expected behavior first."

### 2. Brute Force

> "A straightforward approach would be..."

### 3. Complexity

> "That gives us O(...) time and O(...) space."

### 4. Bottleneck

> "The expensive part here is..."

### 5. Optimization

> "We can optimize this using..."

### 6. Walk Through an Example

> "Let me run through a small example to verify the logic."

### 7. Code

Only after the approach is clear:

> "I'll implement this now."

### 8. Test

Test:

-   Normal case
-   Empty / minimum input
-   Duplicate values
-   Boundary case
-   Worst-case input

### 9. Final Complexity

Always finish with:

> **Time:** O(...)\
> **Space:** O(...)

------------------------------------------------------------------------

# Final 3-Day Priority Order

If time becomes tight, use this order:

## 🔴 Tier 1 --- Must Know

1.  **LFU Cache**
2.  **LRU Cache**
3.  **Find Median from Data Stream**
4.  **Kth Largest Element**
5.  **Subarray Sum Equals K**
6.  **Rotting Oranges**
7.  **Number of Islands**
8.  **Course Schedule II**

## 🟠 Tier 2 --- Strongly Recommended

9.  **Longest Common Subsequence**
10. **Coin Change**
11. **Meeting Rooms II**
12. **Group Anagrams**
13. **Generate Parentheses**
14. **Construct Binary Tree**
15. **Maximum Subarray**

## 🟡 Tier 3 --- Stretch

16. **Minimum Difficulty of a Job Schedule**
17. **Subarrays with K Different Integers**
18. **Gas Station**
19. **Asteroid Collision**
20. **Valid Parenthesis String**
21. **Best Time to Buy and Sell Stock**

------------------------------------------------------------------------

# Final Checklist Before the Salesforce Interview

-   [ ] Can implement **LRU Cache** without help
-   [ ] Can implement **LFU Cache** without help
-   [ ] Can explain **HashMap + Doubly Linked List**
-   [ ] Can explain **Two Heaps**
-   [ ] Can implement **BFS / DFS**
-   [ ] Can identify **Topological Sort**
-   [ ] Can recognize common **DP states and transitions**
-   [ ] Can recognize **Sliding Window**
-   [ ] Can recognize **Greedy**
-   [ ] Can recognize when to use a **Heap**
-   [ ] Can state brute-force complexity
-   [ ] Can identify the bottleneck
-   [ ] Can propose an optimized solution
-   [ ] Can explain the solution while coding
-   [ ] Can test edge cases
-   [ ] Can state final time and space complexity

------------------------------------------------------------------------

# The Mindset for These 3 Days

> **Don't try to become good at 24 individual problems.**
>
> **Become good at recognizing \~10--12 reusable patterns.**

If you can look at a new Salesforce interview problem and quickly think:

``` text
HashMap?
Two Pointers?
Sliding Window?
Heap?
Stack?
BFS?
DFS?
Topological Sort?
Binary Search?
Greedy?
Dynamic Programming?
Backtracking?
```

you are in a much stronger position than someone who has memorized 50
solutions.

## Your Primary Goal

**Pattern recognition → Brute force → Bottleneck → Optimization → Clean
implementation → Complexity → Verbal explanation**

That is the skill to train during this 3-day sprint.
