# Google — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Developer Engineer 2 |
| **Level** | L4 |
| **YOE** | 5 years |
| **Date** | 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/google-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (1 Phone Screening + 1 Technical Screening + 3 Technical Onsite + 1 Behavioral)
- **Timeline:** ~3 weeks from first call to final decision
- **Format:** Virtual (Google Meet + shared Google Doc for coding)
- **Hiring Committee:** Separate HC review post-interviews

---

## Round 1: Phone Screening
**Duration:** 15 minutes | **Interviewer:** Recruiter

### Questions Asked
1. **Background & Motivation**
   - Walk through your resume
   - Why Google? Why now?
   - Current role, team size, tech stack

### 💡 Interview-Ready Answer
> **"Walk me through your background"**

"I'm a Senior Software Engineer with 5 years of experience building distributed systems at scale. Currently at [Company], I lead a team of 4 engineers building our real-time data pipeline that processes 2M+ events/day. My stack is Java/Spring Boot + React on the frontend with PostgreSQL and Redis. I've driven key architectural decisions like migrating from monolith to microservices, reducing P99 latency from 800ms to 120ms. I'm drawn to Google because of the scale of impact — the problems here affect billions of users, and I want to work on systems where milliseconds matter at planetary scale."

> **Pro Tip:** Keep it under 2 minutes. Structure: Current Role → Key Achievement (with numbers) → Why This Company.

---

## Round 2: Technical Screening
**Duration:** 45 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Music Player Shuffle with K-Cooldown**
   - Problem: Given a playlist of songs, implement a shuffle that ensures the same song doesn't repeat within k iterations
   - Expected: Clean implementation with O(n) approach

### 💡 Interview-Ready Answer

**Approach: Brute Force → Optimal**

**Brute Force:** Randomly pick songs, check if last k songs contain it. O(n*k) per pick.

**Optimal (Queue + Set):**
```java
import java.util.*;

public class ShuffleWithCooldown {
    public List<String> shuffle(List<String> songs, int k) {
        List<String> result = new ArrayList<>();
        Queue<String> cooldown = new LinkedList<>();  // tracks last k played
        Set<String> cooldownSet = new HashSet<>();     // O(1) lookup
        List<String> available = new ArrayList<>(songs);
        Random rand = new Random();
        
        int totalPlays = songs.size() * 2; // play each song ~2 times
        
        for (int i = 0; i < totalPlays; i++) {
            // Build available list (exclude cooldown songs)
            List<String> canPlay = new ArrayList<>();
            for (String song : songs) {
                if (!cooldownSet.contains(song)) {
                    canPlay.add(song);
                }
            }
            
            if (canPlay.isEmpty()) break; // impossible to pick without repeating
            
            // Random pick from available
            String picked = canPlay.get(rand.nextInt(canPlay.size()));
            result.add(picked);
            
            // Add to cooldown
            cooldown.offer(picked);
            cooldownSet.add(picked);
            
            // Remove from cooldown after k plays
            if (cooldown.size() > k) {
                String released = cooldown.poll();
                cooldownSet.remove(released);
            }
        }
        return result;
    }
}
```

**Time Complexity:** O(n) per pick where n = number of songs
**Space Complexity:** O(k) for cooldown tracking

**Edge Cases:**
- k >= number of unique songs → impossible to satisfy, return error
- k = 0 → regular random shuffle
- Single song with k > 0 → can only play once

### Follow-up Questions
- "What if k is very large relative to the playlist?" → Need to validate k < songs.size()
- "How would you distribute this across multiple users?" → Each user gets their own cooldown state, could use Redis per-user hash
- "Can you make the shuffling more 'fair'?" → Use Fisher-Yates: shuffle the full list, ensure k-gap, re-shuffle when exhausted

---

## Round 3: Technical Onsite — Coding I
**Duration:** 45 minutes | **Interviewer:** Staff SDE

### Questions Asked
1. **String Decoding with Iterator Pattern**
   - Problem: Implement a decoder for strings like "a1b2c2" → "abbcc" using an iterator with `next()` and `hasNext()` methods
   - Expected: Clean OOP design, handle edge cases

### 💡 Interview-Ready Answer

```java
class DecodedStringIterator implements Iterator<Character> {
    private String encoded;
    private int index;           // current position in encoded string
    private char currentChar;    // current character being repeated
    private int remaining;       // remaining count for current character
    
    public DecodedStringIterator(String encoded) {
        this.encoded = encoded;
        this.index = 0;
        this.remaining = 0;
        advanceToNext();
    }
    
    private void advanceToNext() {
        while (remaining == 0 && index < encoded.length()) {
            currentChar = encoded.charAt(index++);
            // Parse the count (could be multi-digit)
            StringBuilder countStr = new StringBuilder();
            while (index < encoded.length() && Character.isDigit(encoded.charAt(index))) {
                countStr.append(encoded.charAt(index++));
            }
            remaining = countStr.length() > 0 ? Integer.parseInt(countStr.toString()) : 1;
        }
    }
    
    @Override
    public boolean hasNext() {
        return remaining > 0;
    }
    
    @Override
    public Character next() {
        if (!hasNext()) throw new NoSuchElementException();
        remaining--;
        char result = currentChar;
        if (remaining == 0) advanceToNext();
        return result;
    }
}

// Usage:
// DecodedStringIterator it = new DecodedStringIterator("a1b2c2");
// while (it.hasNext()) System.out.print(it.next()); // → abbcc
```

2. **Find Genetic Relations Between Nodes (Parent-Child Tree)**
   - Problem: Given parent-child relationships, find if two nodes are related (ancestor/descendant or siblings)

```java
class FamilyTree {
    Map<String, String> parentMap = new HashMap<>(); // child → parent
    
    void addRelation(String parent, String child) {
        parentMap.put(child, parent);
    }
    
    // Get all ancestors of a node
    List<String> getAncestors(String node) {
        List<String> ancestors = new ArrayList<>();
        String current = node;
        while (parentMap.containsKey(current)) {
            current = parentMap.get(current);
            ancestors.add(current);
        }
        return ancestors;
    }
    
    // Check if nodeA is ancestor of nodeB
    boolean isAncestor(String nodeA, String nodeB) {
        String current = nodeB;
        while (parentMap.containsKey(current)) {
            current = parentMap.get(current);
            if (current.equals(nodeA)) return true;
        }
        return false;
    }
    
    // Find Lowest Common Ancestor
    String findLCA(String nodeA, String nodeB) {
        Set<String> ancestorsA = new HashSet<>(getAncestors(nodeA));
        ancestorsA.add(nodeA);
        String current = nodeB;
        while (current != null) {
            if (ancestorsA.contains(current)) return current;
            current = parentMap.getOrDefault(current, null);
        }
        return null; // no common ancestor
    }
    
    // Check if siblings
    boolean areSiblings(String a, String b) {
        return parentMap.containsKey(a) && parentMap.containsKey(b) 
               && parentMap.get(a).equals(parentMap.get(b));
    }
}
```

**Time:** O(h) for ancestor check, O(h) for LCA where h = tree height
**Space:** O(h) for ancestor set

### Follow-up Questions
- "What if the tree is very deep (millions of levels)?" → Use binary lifting for O(log h) LCA
- "What if relationships can be cyclic?" → Validate with cycle detection (DFS with visited set)

---

## Round 4: Technical Onsite — Coding II
**Duration:** 45 minutes | **Interviewer:** Senior Staff SDE

### Questions Asked
1. **Island Problems with Water/Land/Continent Classification**
   - Problem: Given a grid with 0 (water), 1 (land), 2 (continent), find the maximum area island that may contain internal lakes
   - A lake is water completely surrounded by the same island's land

### 💡 Interview-Ready Answer

```java
class IslandWithLakes {
    private int[][] grid;
    private int rows, cols;
    private int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    
    public int maxAreaWithLakes(int[][] grid) {
        this.grid = grid;
        this.rows = grid.length;
        this.cols = grid[0].length;
        boolean[][] visited = new boolean[rows][cols];
        int maxArea = 0;
        
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (grid[i][j] == 1 && !visited[i][j]) {
                    // BFS to find all land cells of this island
                    Set<int[]> landCells = new HashSet<>();
                    Set<int[]> boundaryCells = new HashSet<>();
                    
                    Queue<int[]> queue = new LinkedList<>();
                    queue.offer(new int[]{i, j});
                    visited[i][j] = true;
                    
                    while (!queue.isEmpty()) {
                        int[] cell = queue.poll();
                        landCells.add(cell);
                        
                        for (int[] dir : dirs) {
                            int ni = cell[0] + dir[0], nj = cell[1] + dir[1];
                            if (ni < 0 || ni >= rows || nj < 0 || nj >= cols) {
                                boundaryCells.add(cell); // touches edge
                                continue;
                            }
                            if (!visited[ni][nj] && grid[ni][nj] == 1) {
                                visited[ni][nj] = true;
                                queue.offer(new int[]{ni, nj});
                            }
                        }
                    }
                    
                    // Now find internal lakes (water cells enclosed by this island)
                    int lakeArea = findInternalLakes(landCells);
                    int totalArea = landCells.size() + lakeArea;
                    maxArea = Math.max(maxArea, totalArea);
                }
            }
        }
        return maxArea;
    }
    
    private int findInternalLakes(Set<int[]> landCells) {
        // BFS from each water cell — if it reaches grid boundary, it's ocean, not lake
        // Water cells adjacent to island land but not reaching boundary = lake
        // Implementation: flood-fill water from boundaries first (mark as ocean)
        // Remaining water = lakes
        int lakeArea = 0;
        boolean[][] oceanVisited = new boolean[rows][cols];
        
        // Mark all ocean water (connected to boundary)
        Queue<int[]> queue = new LinkedList<>();
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if ((i == 0 || i == rows-1 || j == 0 || j == cols-1) && grid[i][j] == 0) {
                    queue.offer(new int[]{i, j});
                    oceanVisited[i][j] = true;
                }
            }
        }
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            for (int[] dir : dirs) {
                int ni = cell[0] + dir[0], nj = cell[1] + dir[1];
                if (ni >= 0 && ni < rows && nj >= 0 && nj < cols 
                    && !oceanVisited[ni][nj] && grid[ni][nj] == 0) {
                    oceanVisited[ni][nj] = true;
                    queue.offer(new int[]{ni, nj});
                }
            }
        }
        
        // Count remaining water (not ocean) = lakes
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (grid[i][j] == 0 && !oceanVisited[i][j]) {
                    lakeArea++;
                }
            }
        }
        return lakeArea;
    }
}
```

**Time:** O(m*n) — each cell visited at most twice
**Space:** O(m*n) for visited arrays

**Edge Cases:**
- Grid is all water → max area = 0
- Grid is all land → max area = m*n
- Single cell island with no lakes → area = 1
- Lakes touching grid boundary → classified as ocean, not lake

---

## Round 5: Behavioral (Googleyness & Leadership)
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about a time you resolved a conflict in your team"**
2. **"Describe a project that failed. What did you learn?"**
3. **"What's the hardest bug you've ever solved?"**
4. **"Why should we hire you?"**

### 💡 Interview-Ready Answers (STAR Format)

**Q: "Tell me about a conflict you resolved"**

**Situation:** On our payments team (6 engineers), we had a heated disagreement about whether to use event sourcing vs traditional CRUD for our new transaction ledger. Two senior engineers had strong opposing views, and it was blocking sprint planning for 2 weeks.

**Task:** As the tech lead, I needed to make a decision that everyone could rally behind and not just pick a side.

**Action:** I organized a "tech bake-off" — each side got 2 days to build a proof-of-concept with our actual use cases (100K txns/day, audit trail requirements, replay capability). We defined evaluation criteria upfront: (1) query performance, (2) storage cost, (3) developer onboarding time, (4) auditability. I facilitated a neutral review session where we compared results against the criteria objectively.

**Result:** Event sourcing won on auditability and replay but lost on query complexity. We chose a hybrid: CQRS with event sourcing for writes and materialized views for reads. Both engineers felt heard, sprint resumed, and we delivered the ledger 1 week ahead of schedule. It now processes 500K+ transactions/day with full audit trail.

**Q: "Hardest bug you've solved?"**

**Situation:** Production outage — our API gateway was returning 503s intermittently (affecting ~15% of requests) during peak hours only. No errors in application logs.

**Task:** Diagnose and fix within SLA (4 hours) while keeping the system running.

**Action:** I started with metrics: noticed connection pool exhaustion in our Spring Boot service. But connection timeout was set to 30s — shouldn't accumulate. Dug deeper with `netstat` — found hundreds of connections in `CLOSE_WAIT` state. The root cause: our HTTP client wasn't properly releasing connections when the downstream service returned a `204 No Content` response (empty body). The response body stream was never consumed, so the connection was never returned to the pool. Added explicit `EntityUtils.consume(response.getEntity())` in the finally block.

**Result:** Deployed hotfix in 2 hours. Connection pool utilization dropped from 98% to 12%. Zero 503s since. Added monitoring alert for connection pool > 70%.

---

## 🎯 Key Takeaways
- Google interviews are **heavily coding-focused** — expect 3 coding rounds
- The behavioral round ("Googleyness") is **equally weighted** — prepare 5-6 STAR stories
- Interviewers care about **thought process > perfect solution** — think aloud
- **Iterator pattern** is a Google favorite — practice designing lazy iterators
- **Graph problems** (islands, trees, relationships) appear frequently
- Always discuss **time/space complexity** before and after coding

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Easy | Screening, Behavioral |
| Round 2 | Medium | Queue, Set, Randomization |
| Round 3 | Medium-Hard | Iterator Pattern, Tree Traversal, LCA |
| Round 4 | Hard | BFS/DFS, Flood Fill, Connected Components |
| Round 5 | Medium | STAR Framework, Leadership |
