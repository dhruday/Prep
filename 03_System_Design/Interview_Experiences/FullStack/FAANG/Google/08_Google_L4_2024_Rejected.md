# Google — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer III |
| **Level** | L4 |
| **YOE** | 4 years |
| **Date** | November 2024 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)
- **Timeline:** 4 weeks
- **Rejection Reason:** Mixed feedback on System Design — deep-dive questions on CAP theorem tradeoffs

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Find the K-th Largest Element in a Stream** (LeetCode 703)
2. **Follow-up: Design it for a distributed system with 100M events/sec**

### 💡 Interview-Ready Answer

```java
class KthLargest {
    PriorityQueue<Integer> minHeap;
    int k;
    
    public KthLargest(int k, int[] nums) {
        this.k = k;
        this.minHeap = new PriorityQueue<>(); // min-heap of size k
        for (int num : nums) add(num);
    }
    
    public int add(int val) {
        minHeap.offer(val);
        if (minHeap.size() > k) {
            minHeap.poll(); // Remove smallest — only keep top K
        }
        return minHeap.peek(); // The smallest of top K = kth largest
    }
}
// Time: O(log k) per add, Space: O(k)

// Follow-up: Distributed version
// Problem: 100M events/sec across many machines
// Solution:
// 1. Partition stream across N workers (hash/round-robin)
// 2. Each worker maintains local top-K heap (K = 1000)
// 3. Periodically (every 1s), workers send their local top-K to aggregator
// 4. Aggregator merges N lists of K elements → final top-K
// 5. Trade-off: approximate (could miss elements between sync intervals)
//    For exact: use a single-writer with Kafka topic (slower but precise)
```

---

## Round 2: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Word Ladder** (LeetCode 127) — BFS shortest path
2. **Follow-up: Return all shortest transformation sequences** (LeetCode 126)

### 💡 Word Ladder — BFS

```java
public int ladderLength(String beginWord, String endWord, List<String> wordList) {
    Set<String> wordSet = new HashSet<>(wordList);
    if (!wordSet.contains(endWord)) return 0;
    
    Queue<String> queue = new LinkedList<>();
    queue.offer(beginWord);
    Set<String> visited = new HashSet<>();
    visited.add(beginWord);
    int level = 1;
    
    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            String word = queue.poll();
            char[] chars = word.toCharArray();
            
            for (int j = 0; j < chars.length; j++) {
                char original = chars[j];
                for (char c = 'a'; c <= 'z'; c++) {
                    if (c == original) continue;
                    chars[j] = c;
                    String newWord = new String(chars);
                    
                    if (newWord.equals(endWord)) return level + 1;
                    
                    if (wordSet.contains(newWord) && visited.add(newWord)) {
                        queue.offer(newWord);
                    }
                }
                chars[j] = original;
            }
        }
        level++;
    }
    return 0;
}
// Time: O(M² × N) where M = word length, N = word list size

// Optimization: Bidirectional BFS (start from both ends, meet in middle)
public int ladderLengthBiDirectional(String beginWord, String endWord, List<String> wordList) {
    Set<String> wordSet = new HashSet<>(wordList);
    if (!wordSet.contains(endWord)) return 0;
    
    Set<String> beginSet = new HashSet<>(Set.of(beginWord));
    Set<String> endSet = new HashSet<>(Set.of(endWord));
    Set<String> visited = new HashSet<>();
    int level = 1;
    
    while (!beginSet.isEmpty() && !endSet.isEmpty()) {
        // Always expand the smaller frontier
        if (beginSet.size() > endSet.size()) {
            Set<String> temp = beginSet;
            beginSet = endSet;
            endSet = temp;
        }
        
        Set<String> nextLevel = new HashSet<>();
        for (String word : beginSet) {
            char[] chars = word.toCharArray();
            for (int j = 0; j < chars.length; j++) {
                char original = chars[j];
                for (char c = 'a'; c <= 'z'; c++) {
                    chars[j] = c;
                    String newWord = new String(chars);
                    
                    if (endSet.contains(newWord)) return level + 1;
                    
                    if (wordSet.contains(newWord) && visited.add(newWord)) {
                        nextLevel.add(newWord);
                    }
                }
                chars[j] = original;
            }
        }
        beginSet = nextLevel;
        level++;
    }
    return 0;
}
```

---

## Round 3: Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Trapping Rain Water II** (3D version — LeetCode 407)
2. **Follow-up: What if terrain changes dynamically? How to update efficiently?**

### 💡 Trapping Rain Water II (3D)

```java
public int trapRainWater(int[][] heightMap) {
    if (heightMap.length <= 2 || heightMap[0].length <= 2) return 0;
    
    int m = heightMap.length, n = heightMap[0].length;
    boolean[][] visited = new boolean[m][n];
    
    // Min-heap: process lowest boundary first
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[2] - b[2]);
    
    // Add all boundary cells
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (i == 0 || i == m - 1 || j == 0 || j == n - 1) {
                pq.offer(new int[]{i, j, heightMap[i][j]});
                visited[i][j] = true;
            }
        }
    }
    
    int water = 0;
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    
    while (!pq.isEmpty()) {
        int[] cell = pq.poll();
        
        for (int[] dir : dirs) {
            int ni = cell[0] + dir[0], nj = cell[1] + dir[1];
            if (ni < 0 || ni >= m || nj < 0 || nj >= n || visited[ni][nj]) continue;
            
            visited[ni][nj] = true;
            // Water at this cell = max(0, boundary_height - cell_height)
            water += Math.max(0, cell[2] - heightMap[ni][nj]);
            // New boundary = max(cell_height, current_boundary)
            pq.offer(new int[]{ni, nj, Math.max(cell[2], heightMap[ni][nj])});
        }
    }
    
    return water;
}
// Time: O(m*n * log(m*n)), Space: O(m*n)

// Key insight: Starting from boundary (lowest wall), expand inward.
// Water level at any cell = determined by the minimum boundary that contains it.
// Min-heap ensures we always process the lowest boundary first.
```

---

## Round 4: System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design YouTube's Video Processing Pipeline**
   - Upload → transcode → CDN → adaptive streaming

### 💡 Interview-Ready Answer

```
Video Processing Pipeline:
┌──────────────────────────────────────────────────────────────┐
│  Upload:                                                      │
│  - Client: chunk upload (5MB chunks) with resumable upload   │
│    protocol (Google's TUS-like)                              │
│  - Upload to GCS (Google Cloud Storage) temp bucket          │
│  - Generate upload_id for resumability                       │
│  - On complete: publish event to Pub/Sub: "video.uploaded"   │
│                                                                │
│  Transcoding (CPU-intensive, async):                          │
│  - Consumer picks up "video.uploaded" event                  │
│  - FFmpeg-based transcoding to multiple resolutions:         │
│    240p, 360p, 480p, 720p, 1080p, 1440p, 2160p (4K)       │
│  - Multiple codec outputs: H.264 (compatibility) + VP9      │
│    (better compression) + AV1 (best, but slow to encode)    │
│  - Audio: AAC + Opus                                         │
│  - Each resolution + codec = separate job (parallel)         │
│  - Adaptive bitrate: each resolution has 2-3 bitrate tiers  │
│                                                                │
│  Workflow:                                                     │
│  original.mp4                                                 │
│  ├── 1080p_h264_5000kbps.mp4                                │
│  ├── 1080p_h264_3000kbps.mp4                                │
│  ├── 720p_h264_2500kbps.mp4                                 │
│  ├── 720p_vp9_2000kbps.webm                                 │
│  ├── 480p_h264_1500kbps.mp4                                 │
│  ├── 360p_h264_800kbps.mp4                                  │
│  ├── 240p_h264_400kbps.mp4                                  │
│  └── thumbnail_00m30s.jpg (extracted at 30s mark)           │
│                                                                │
│  Post-Processing:                                             │
│  - Generate thumbnail sprites (for hover preview)            │
│  - Extract captions via speech-to-text (Whisper model)       │
│  - Content moderation (NSFW detection, copyright match)      │
│  - Create DASH manifest (.mpd) or HLS playlist (.m3u8)      │
└──────────────────────────────────────────────────────────────┘

Adaptive Streaming (DASH/HLS):
- Video split into 2-10s segments
- Client downloads manifest (list of segments + bitrates)
- Client monitors bandwidth → switches bitrate mid-stream
- Buffer-based algorithm: if buffer < 5s → lower bitrate
  if buffer > 15s → try higher bitrate

CDN Strategy:
- Hot videos (< 48h, viral) → cached at edge globally
- Warm videos → cached at regional PoPs
- Cold videos → origin storage only
- Predictive pre-warming: if a video trending in India,
  pre-push to India PoPs before users request it

Scale:
- 500 hours of video uploaded per minute
- ~1 billion hours watched per day
- Transcoding cluster: ~100,000 GPU/CPU instances
- Storage: exabytes
```

---

## 🎯 Key Takeaways
- Google phone screens can include **distributed systems follow-ups** even for L4
- **Bidirectional BFS** for Word Ladder is the optimal approach — reduces search space exponentially
- **Trapping Rain Water 3D** = boundary-expansion with min-heap — a much harder variant of the classic
- **Video Processing Pipeline** = YouTube's core — know FFmpeg, codecs, DASH/HLS, CDN tiering
- **Rejection was on System Design** — I didn't go deep enough on **CAP theorem tradeoffs** when asked about consistency in the pipeline
- Google expects you to **drive the conversation** in System Design — don't wait for prompts

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Min-Heap, Streaming K-th |
| Coding 1 | Hard | BFS, Word Ladder, Bidirectional BFS |
| Coding 2 | Very Hard | 3D Rain Water, Priority Queue |
| System Design | Hard | Video Pipeline, Transcoding, CDN |
| Behavioral | Medium | Googleyness |
