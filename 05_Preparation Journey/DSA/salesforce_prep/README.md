# Salesforce DSA Interview Prep — Data Bundle

Generated on 2026-08-04 for a Salesforce DSA round the following Wednesday.

## Files

| File | Purpose | Count |
|---|---|---|
| [salesforce_master_index.json](salesforce_master_index.json) | Raw evidence trail — one record per interview experience, matching the originally requested schema (`id, source_url, role, year, focus, dsa_questions[]`). | 24 records / 284 raw DSA rows |
| [salesforce_question_bank.json](salesforce_question_bank.json) | De-duplicated question bank ranked by recency-weighted frequency. Use this for prep. | 230 unique questions |
| [build_data.py](build_data.py) | Pipeline: ingests inline source data → canonicalizes → dedupes → ranks → writes both JSONs. Re-runnable. | — |

## Sources actually used

- **GeeksforGeeks Salesforce interview-experience articles** (20 articles across 2019–2024, covering SDE Intern, SWE Intern, MTS, SMTS, WIT Summit, Tech Support Intern, off-campus, on-campus).
- **[liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems/tree/main/Salesforce)** — all five `Salesforce/*.csv` files (30-day / 3-month / 6-month / 6-month+ / all-time). Snapshot: 25 June 2026. ~180 unique problems merged into the 4 aggregate "experience" records.

## Sources dropped (documented in the plan)

| Source | Reason |
|---|---|
| LeetCode Discuss | HTTP 403 (Cloudflare bot-block) + LeetCode ToS forbids scraping. |
| Glassdoor | Interview details are login-gated + ToS forbids scraping. |
| CareerCup | Domain effectively dead (redirects to a personal consulting page). |
| GitHub Discussions search | Returned no Salesforce interview discussions (5 hits, all community intros). |

## Question bank schema (per entry)

```jsonc
{
  "id": "qb_001",
  "canonical_title": "Lfu Cache",
  "leetcode_link": "https://leetcode.com/problems/lfu-cache",
  "topic": ["Hash Table", "Linked List", "Design", "Doubly-Linked List"],
  "difficulty": "Hard",
  "algorithm_hint": "HashMap O(n)",
  "frequency": 5,           // count of independent source citations
  "recency_score": 30.5,    // Σ(year_weight × window_weight)
  "last_seen_year": "2026",
  "match_confidence": "high", // "high" if canonical LC link, "low" if fuzzy
  "sources": [ { "url": "...", "year": "2026", "role": "...", ... } ]
}
```

### Ranking formula

For each source citation:
- **Year weight**: 2026 ×3.0, 2025 ×2.0, 2024 ×1.5, older ×1.0
- **Window weight** (LiquidSLR only): 30d ×4.0, 3mo ×3.0, 6mo ×2.0, 6mo+ ×1.0
- Contribution = year_weight × window_weight (window_weight = 1 for GfG citations)

Sort key: `(recency_score DESC, frequency DESC, difficulty ASC, title ASC)`.

## Distribution snapshot

- **Difficulty**: Easy 33 / Medium 141 / Hard 56
- **Last-seen year**: 2019: 4, 2021: 15, 2022: 8, 2023: 11, 2024: 5, 2025: 162, 2026: 25
- The 2025/2026 cluster comes from the LiquidSLR aggregate snapshot; the 2019–2024 entries are individual GfG interview experiences.

## Top 20 (from the last build)

| Rank | ID | Difficulty | Freq | Score | Problem |
|---:|---|---|---:|---:|---|
| 1 | qb_001 | Hard   | 5 | 30.5 | [LFU Cache](https://leetcode.com/problems/lfu-cache) |
| 2 | qb_002 | Medium | 4 | 29.0 | [String Compression](https://leetcode.com/problems/string-compression) |
| 3 | qb_003 | Medium | 4 | 29.0 | [Time Needed to Rearrange a Binary String](https://leetcode.com/problems/time-needed-to-rearrange-a-binary-string) |
| 4 | qb_004 | Medium | 3 | 27.0 | [Maximum Team Size with Overlapping Intervals](https://leetcode.com/problems/maximum-team-size-with-overlapping-intervals) |
| 5 | qb_005 | Medium | 3 | 27.0 | [Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k) |
| 6 | qb_006 | Easy   | 3 | 17.0 | [Maximum Product of Three Numbers](https://leetcode.com/problems/maximum-product-of-three-numbers) |
| 7 | qb_007 | Medium | 3 | 17.0 | [Minimum Operations to Reduce an Integer to 0](https://leetcode.com/problems/minimum-operations-to-reduce-an-integer-to-0) |
| 8 | qb_008 | Medium | 2 | 15.0 | [Maximum Palindromes After Operations](https://leetcode.com/problems/maximum-palindromes-after-operations) |
| 9 | qb_009 | Medium | 2 |  8.0 | [Course Schedule II](https://leetcode.com/problems/course-schedule-ii) |
| 10 | qb_010 | Medium | 2 |  8.0 | [Group Anagrams](https://leetcode.com/problems/group-anagrams) |
| 11 | qb_011 | Medium | 2 |  8.0 | [LRU Cache](https://leetcode.com/problems/lru-cache) |
| 12 | qb_012 | Hard   | 2 |  8.0 | [Minimum Difficulty of a Job Schedule](https://leetcode.com/problems/minimum-difficulty-of-a-job-schedule) |
| 13 | qb_013 | Hard   | 2 |  8.0 | [Subarrays with K Different Integers](https://leetcode.com/problems/subarrays-with-k-different-integers) |
| 14 | qb_014 | Hard   | 2 |  7.0 | [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream) |
| 15 | qb_015 | Medium | 4 |  6.5 | [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array) |
| 16 | qb_016 | Medium | 1 |  6.0 | [Construct Binary Tree from Preorder and Inorder](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal) |
| 17 | qb_017 | Medium | 1 |  6.0 | [Course Schedule](https://leetcode.com/problems/course-schedule) |
| 18 | qb_018 | Medium | 1 |  6.0 | [Generate Parentheses](https://leetcode.com/problems/generate-parentheses) |
| 19 | qb_019 | Medium | 1 |  6.0 | [Minimum Removals to Balance Array](https://leetcode.com/problems/minimum-removals-to-balance-array) |
| 20 | qb_020 | Medium | 1 |  6.0 | [Remove Stones to Minimize the Total](https://leetcode.com/problems/remove-stones-to-minimize-the-total) |

## Known gaps / caveats

1. **No LeetCode Discuss / Glassdoor coverage.** Those sources hold thousands of Salesforce interview reports we couldn't reach. If you already have a LeetCode subscription, cross-reference qb_001–qb_050 against LeetCode Premium's own Salesforce tag (both should agree — liquidslr scrapes exactly that).
2. **URL HEAD-checks bounce (403).** LeetCode blocks all non-browser HEAD requests via Cloudflare. Every URL uses LeetCode's canonical `/problems/<slug>` scheme — they will resolve in a browser.
3. **~15 GfG problems have `leetcode_link: null`** where the problem description didn't map cleanly to a canonical LC entry (e.g., "custom 3D matrix multiplication with reshape"). These are flagged with `match_confidence: "low"`.
4. **Aggregate snapshot vs individual reports.** LiquidSLR data is a June 2026 aggregate — some problems (e.g. `time-needed-to-rearrange-a-binary-string`) rank very high without any individual GfG citation, which is normal: they trend recently on OA rounds but no candidate has written a blog about them yet.
5. **Non-DSA content is excluded**: system-design questions (Design TinyURL as a stand-alone HLD, LFU cache system, taxi-app design, coffee-ordering LLD), Apex/SOQL, OOPS trivia, SQL queries, HR/behavioral, puzzles. A few appear where the round explicitly mixed DSA + HLD (see `exp_gfg_005`, `exp_gfg_011`).

## Reproducing

```zsh
python3 build_data.py
```

Idempotent. Edit the `GFG_EXPERIENCES` list or the `LIQUIDSLR` tuple in `build_data.py` to add newly-discovered sources, then re-run.
