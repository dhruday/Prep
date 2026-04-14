# Atlassian — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Atlassian |
| **Role** | Senior Software Engineer |
| **Level** | P4 (SDE-3 equivalent) |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/atlassian-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Bitbucket |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Values Screen + Machine Coding + DS/Algo + System Design + HM)

---

## Round 3: DS/Algo — Implement a Version Control File Diff Engine
**Duration:** 60 minutes

### Question: Implement a diff engine that computes the Longest Common Subsequence (LCS) between two file versions, then generates a minimal edit script (insert/delete lines).

```java
import java.util.*;

/**
 * File Diff Engine (Myers Diff Algorithm Simplified):
 * 
 * Given two versions of a file (as List<String> lines):
 * 1. Compute LCS using DP
 * 2. Generate edit script (sequence of inserts/deletes)
 * 3. Display unified diff format
 * 
 * Time: O(M*N) for exact LCS, Space: O(min(M,N)) with rolling array.
 * Production: Git uses Myers' O(ND) algorithm — linear in number of differences.
 */

enum DiffOp { KEEP, INSERT, DELETE }

class DiffLine {
    DiffOp op;
    String content;
    int oldLineNum; // -1 for INSERT
    int newLineNum; // -1 for DELETE
    
    DiffLine(DiffOp op, String content, int oldNum, int newNum) {
        this.op = op; this.content = content;
        this.oldLineNum = oldNum; this.newLineNum = newNum;
    }
    
    String toUnifiedFormat() {
        switch (op) {
            case KEEP:   return " " + content;
            case INSERT: return "+" + content;
            case DELETE: return "-" + content;
            default: return content;
        }
    }
}

class DiffResult {
    List<DiffLine> lines;
    int additions;
    int deletions;
    
    DiffResult() {
        lines = new ArrayList<>();
        additions = 0;
        deletions = 0;
    }
}

class FileDiffEngine {
    
    /**
     * Compute diff between old and new file versions.
     * Uses LCS DP table to backtrack and generate edit script.
     */
    public DiffResult diff(List<String> oldLines, List<String> newLines) {
        int m = oldLines.size();
        int n = newLines.size();
        
        // LCS DP table
        int[][] dp = new int[m + 1][n + 1];
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (oldLines.get(i - 1).equals(newLines.get(j - 1))) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Backtrack to generate edit script
        DiffResult result = new DiffResult();
        List<DiffLine> diffLines = new ArrayList<>();
        
        int i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && oldLines.get(i - 1).equals(newLines.get(j - 1))) {
                // Match — keep
                diffLines.add(new DiffLine(DiffOp.KEEP, oldLines.get(i - 1), i, j));
                i--; j--;
            } else if (j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                // Insert in new
                diffLines.add(new DiffLine(DiffOp.INSERT, newLines.get(j - 1), -1, j));
                result.additions++;
                j--;
            } else {
                // Delete from old
                diffLines.add(new DiffLine(DiffOp.DELETE, oldLines.get(i - 1), i, -1));
                result.deletions++;
                i--;
            }
        }
        
        // Reverse (we built it bottom-up)
        Collections.reverse(diffLines);
        result.lines = diffLines;
        
        return result;
    }
    
    /**
     * Generate unified diff output (similar to `git diff --unified=3`).
     * Groups changes into hunks with context lines.
     */
    public String toUnifiedDiff(DiffResult diff, String oldFile, String newFile, int context) {
        StringBuilder sb = new StringBuilder();
        
        // Header
        sb.append("--- ").append(oldFile).append('\n');
        sb.append("+++ ").append(newFile).append('\n');
        
        // Find change regions and create hunks
        List<int[]> changeIndices = new ArrayList<>(); // [startIdx, endIdx] in diff.lines
        
        for (int idx = 0; idx < diff.lines.size(); idx++) {
            if (diff.lines.get(idx).op != DiffOp.KEEP) {
                changeIndices.add(new int[]{ idx, idx });
            }
        }
        
        if (changeIndices.isEmpty()) {
            sb.append("Files are identical\n");
            return sb.toString();
        }
        
        // Merge nearby changes (within context range)
        List<int[]> hunks = new ArrayList<>();
        int[] current = { 
            Math.max(0, changeIndices.get(0)[0] - context),
            Math.min(diff.lines.size() - 1, changeIndices.get(0)[1] + context)
        };
        
        for (int k = 1; k < changeIndices.size(); k++) {
            int newStart = Math.max(0, changeIndices.get(k)[0] - context);
            int newEnd = Math.min(diff.lines.size() - 1, changeIndices.get(k)[1] + context);
            
            if (newStart <= current[1] + 1) {
                // Merge
                current[1] = newEnd;
            } else {
                hunks.add(current.clone());
                current = new int[]{ newStart, newEnd };
            }
        }
        hunks.add(current);
        
        // Output hunks
        for (int[] hunk : hunks) {
            int oldStart = 0, oldCount = 0, newStart = 0, newCount = 0;
            boolean foundFirst = false;
            
            for (int idx = hunk[0]; idx <= hunk[1]; idx++) {
                DiffLine line = diff.lines.get(idx);
                
                if (!foundFirst) {
                    if (line.oldLineNum > 0) oldStart = line.oldLineNum;
                    if (line.newLineNum > 0) newStart = line.newLineNum;
                    foundFirst = true;
                }
                
                if (line.op == DiffOp.KEEP)   { oldCount++; newCount++; }
                if (line.op == DiffOp.DELETE)  { oldCount++; if (oldStart == 0) oldStart = line.oldLineNum; }
                if (line.op == DiffOp.INSERT)  { newCount++; if (newStart == 0) newStart = line.newLineNum; }
            }
            
            sb.append(String.format("@@ -%d,%d +%d,%d @@\n", 
                oldStart > 0 ? oldStart : 1, oldCount, 
                newStart > 0 ? newStart : 1, newCount));
            
            for (int idx = hunk[0]; idx <= hunk[1]; idx++) {
                sb.append(diff.lines.get(idx).toUnifiedFormat()).append('\n');
            }
        }
        
        return sb.toString();
    }
    
    /**
     * Compute similarity ratio (0.0 to 1.0).
     * Based on LCS length relative to total lines.
     */
    public double similarity(List<String> oldLines, List<String> newLines) {
        DiffResult diff = diff(oldLines, newLines);
        int lcsLength = (int) diff.lines.stream().filter(l -> l.op == DiffOp.KEEP).count();
        int total = oldLines.size() + newLines.size();
        return total == 0 ? 1.0 : (2.0 * lcsLength) / total;
    }
}
```

---

## 🎯 Key Takeaways
- Atlassian P4 = **File diff engine with LCS backtracking and unified diff format**
- **LCS DP**: standard O(M*N) DP — `dp[i][j] = dp[i-1][j-1]+1` if match, else `max(dp[i-1][j], dp[i][j-1])`
- **Backtracking**: backtrack from `dp[m][n]` — match → KEEP, else prefer INSERT (new) over DELETE (old) when equal
- **Unified diff**: `@@ -oldStart,count +newStart,count @@` header, `+`/`-`/` ` prefixes
- **Hunk merging**: changes within `context` lines of each other merge into one hunk — avoids fragmented output
- **Git uses Myers' O(ND)**: linear in number of edits, not O(M*N) — but interviewers accept LCS DP
- **Rejection reason**: values interview didn't go well — Atlassian values teamwork narratives, candidate was too individual-focused

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Values Screen | Medium | Atlassian Values |
| Machine Coding | Hard | LLD |
| DS/Algo (this) | Very Hard | LCS, Diff, Backtracking |
| System Design | Very Hard | Git-like VCS |
| HM | Medium | Leadership |
