 have enough of the question bank to build a solid 3-day plan. The data is already ranked by recency_score × frequency, so I'll use that ordering directly.

3-Day Salesforce DSA Sprint Plan
Strategy: The question bank ranks by recency_score (how recently + how often it appeared). With 3 days, do the top ~20 problems and review patterns — don't grind 60 problems shallowly.

Day 1 — Design + Heaps + Arrays (High-Frequency Must-Dos)
These are the top 8 by frequency/recency — appeared in 3–5 real interviews:

#	Problem	Difficulty	Key Pattern
1	LFU Cache	Hard	HashMap + freq doubly-linked lists
2	String Compression	Medium	Two pointers
3	Time to Rearrange Binary String	Medium	DP simulation
4	Subarray Sum Equals K	Medium	Prefix sum + HashMap
5	Maximum Team Size (Overlapping Intervals)	Medium	Sort + sweep
6	Kth Largest Element	Medium	Min-heap size k / Quickselect
7	LRU Cache	Medium	HashMap + doubly-linked list
8	Find Median from Data Stream	Hard	Two heaps
End of Day 1 goal: Be able to code LFU/LRU from scratch on a blank page. These are the single highest-signal problems for Salesforce.

Day 2 — Graphs + Trees + DP (Classic Patterns, Freq 2–3)
#	Problem	Difficulty	Key Pattern
9	Rotting Oranges	Medium	Multi-source BFS
10	Number of Islands	Medium	DFS/BFS flood fill
11	Course Schedule II	Medium	Topological sort (Kahn's)
12	Longest Common Subsequence	Medium	2D DP
13	Coin Change	Medium	1D DP tabulation
14	Maximum Subarray	Medium	Kadane's
15	Meeting Rooms II	Medium	Sort + min-heap
16	Group Anagrams	Medium	HashMap with sorted key
17	Generate Parentheses	Medium	Backtracking
18	Construct BT from Preorder+Inorder	Medium	Divide & conquer + HashMap
Day 3 — Review + Stretch (Hard DP/Graph + Weak Spots)
Morning: Re-solve Day 1 designs from memory (LFU, LRU, Median Stream).

Then tackle remaining hard problems:

#	Problem	Difficulty	Key Pattern
19	Minimum Difficulty of Job Schedule	Hard	DP partition
20	Subarrays with K Different Integers	Hard	Sliding window (at-most-K trick)
21	Gas Station	Medium	Greedy
22	Asteroid Collision	Medium	Stack simulation
23	Valid Parenthesis String	Medium	Greedy (lo/hi bounds)
24	Best Time to Buy & Sell Stock	Easy	One-pass min tracking
Daily Time Budget (8–10 hrs/day)
Block	Activity
2 hrs morning	Solve 2–3 new problems (understand fully before coding)
2 hrs mid-day	Solve 2–3 more
1.5 hrs evening	Review today's solutions, write key insight in own words
30 min	Mock explain 1 problem aloud (prep for verbal walkthrough)
The #1 Rule for Salesforce
Based on the interview data, Salesforce consistently asks you to optimize — they'll give you a brute-force-acceptable problem and then explicitly ask "can you do better?" Practice for every problem:

Brute force first (say it out loud)
Identify bottleneck
Optimize (Kth Largest O(k×n) → O(n log k) was explicitly called out in one SMTS interview)