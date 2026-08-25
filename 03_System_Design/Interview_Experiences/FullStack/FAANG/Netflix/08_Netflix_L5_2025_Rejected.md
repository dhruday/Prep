# Netflix — Staff FullStack Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected (Final round) |
| **Location** | Los Gatos, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Encoding Technologies |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding — Implement a Sliding Window Maximum with Lazy Deletion
**Duration:** 45 minutes

### Question: Design a sliding window max that supports add, removeOldest, and getMax. Elements may be removed in any order (not just FIFO).

```java
import java.util.*;

/**
 * Sliding Window Max with Lazy Deletion.
 * 
 * Problem: Standard sliding window max (monotonic deque) only supports 
 * FIFO removal. What if elements can be removed in any order?
 * 
 * Solution: Max-Heap + Lazy Deletion
 * - Heap stores (value, timestamp) pairs
 * - Deleted set tracks removed timestamps
 * - getMax: peek heap, skip deleted entries
 * 
 * Time: add O(log N), getMax O(1) amortized, remove O(1) lazy
 * Space: O(N) for heap + deleted set
 */
class LazyWindowMax {
    
    // Max-heap (negate values for Java's min-heap)
    private PriorityQueue<long[]> maxHeap; // [value, timestamp]
    private Set<Long> deleted;             // Deleted timestamps
    private long timestamp;
    private Map<Long, long[]> tsToEntry;   // Quick lookup by timestamp
    
    public LazyWindowMax() {
        maxHeap = new PriorityQueue<>((a, b) -> Long.compare(b[0], a[0]));
        deleted = new HashSet<>();
        tsToEntry = new HashMap<>();
        timestamp = 0;
    }
    
    /**
     * Add element to the window.
     * Returns timestamp (handle) for later removal.
     */
    public long add(long value) {
        long ts = timestamp++;
        long[] entry = {value, ts};
        maxHeap.offer(entry);
        tsToEntry.put(ts, entry);
        return ts;
    }
    
    /**
     * Remove element by timestamp (lazy).
     * Don't actually remove from heap — mark as deleted.
     * Heap cleanup happens lazily during getMax.
     */
    public void remove(long ts) {
        deleted.add(ts);
        tsToEntry.remove(ts);
    }
    
    /**
     * Get current maximum in the window.
     * Purge deleted entries from top of heap.
     * 
     * Amortized O(1): each element added once, removed at most once.
     */
    public Long getMax() {
        // Purge deleted entries from top
        while (!maxHeap.isEmpty() && deleted.contains(maxHeap.peek()[1])) {
            long[] top = maxHeap.poll();
            deleted.remove(top[1]);
        }
        
        return maxHeap.isEmpty() ? null : maxHeap.peek()[0];
    }
    
    public int size() {
        return tsToEntry.size();
    }
}

/**
 * Application: Netflix video quality selector.
 * Track max bitrate across a sliding window of N segments.
 * Segments can be invalidated out of order (e.g., CDN server failure).
 */
class VideoBitrateTracker {
    
    private final LazyWindowMax windowMax;
    private final Deque<Long> windowTimestamps;
    private final int windowSize;
    
    public VideoBitrateTracker(int windowSize) {
        this.windowSize = windowSize;
        this.windowMax = new LazyWindowMax();
        this.windowTimestamps = new ArrayDeque<>();
    }
    
    public void addSegment(long bitrateKbps) {
        long ts = windowMax.add(bitrateKbps);
        windowTimestamps.addLast(ts);
        
        // Evict oldest if window exceeded
        while (windowTimestamps.size() > windowSize) {
            long oldTs = windowTimestamps.pollFirst();
            windowMax.remove(oldTs);
        }
    }
    
    /**
     * Invalidate a specific segment (e.g., CDN reported error).
     */
    public void invalidateSegment(long timestamp) {
        windowMax.remove(timestamp);
    }
    
    public long getMaxBitrate() {
        Long max = windowMax.getMax();
        return max != null ? max : 0;
    }
}
```

---

## Round 2: System Design — Netflix Video Encoding Pipeline
**Duration:** 60 minutes

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│             Netflix Video Encoding Pipeline                     │
│                                                                 │
│  Content Ingestion:                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Studio uploads master file (4K ProRes, 100+ GB)          │   │
│  │   → S3 landing zone                                      │   │
│  │   → Integrity check (checksum, container validation)     │   │
│  │   → Metadata extraction (codec, resolution, duration)    │   │
│  │   → Trigger encoding workflow (Step Functions / Temporal) │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │ Encoding Workflow (Per-Title Optimization)                │   │
│  │                                                           │   │
│  │ Step 1: Scene Complexity Analysis                         │   │
│  │   - Shot detection (scene boundaries)                     │   │
│  │   - Spatial complexity: still frames vs. action           │   │
│  │   - Temporal complexity: motion estimation                │   │
│  │   Output: complexity map per scene                        │   │
│  │                                                           │   │
│  │ Step 2: Per-Title Encoding Ladder Selection               │   │
│  │   Traditional (static ladder):                            │   │
│  │     1080p@5800kbps, 720p@3000kbps, 480p@1500kbps ...     │   │
│  │                                                           │   │
│  │   Per-Title (dynamic):                                    │   │
│  │     Animated film (low complexity):                        │   │
│  │       1080p@2000kbps (quality equivalent to 5800 static)  │   │
│  │     Action film (high complexity):                         │   │
│  │       1080p@6500kbps (needs more to maintain quality)     │   │
│  │                                                           │   │
│  │   Per-Shot (most advanced):                               │   │
│  │     Each scene gets its own bitrate allocation             │   │
│  │     Dialog scene: 1500kbps, Chase scene: 8000kbps         │   │
│  │     Concatenate at the end → constant quality             │   │
│  │                                                           │   │
│  │ Step 3: Parallel Encoding                                 │   │
│  │   - Split video into chunks (GOP-aligned)                 │   │
│  │   - Fan-out: 100+ encoding workers per title              │   │
│  │   - Each chunk encoded independently                      │   │
│  │   - Codecs: H.264 (compatibility), H.265/HEVC,            │   │
│  │             AV1 (30% better than HEVC), VP9               │   │
│  │   - Target: VMAF score ≥ 93 per chunk                     │   │
│  │                                                           │   │
│  │ Step 4: Quality Assurance                                 │   │
│  │   - VMAF (Video Multimethod Assessment Fusion)            │   │
│  │     Perceptual quality score 0-100                        │   │
│  │     Correlates better with human perception than PSNR     │   │
│  │   - Automated checks: black frames, audio sync, subtitle  │   │
│  │   - Statistical sample: human QA for 5% of titles         │   │
│  │                                                           │   │
│  │ Step 5: Assembly + Packaging                              │   │
│  │   - Concatenate encoded chunks                            │   │
│  │   - Package into DASH/HLS manifests                       │   │
│  │   - Generate thumbnails + trick-play images               │   │
│  │   - Audio: Dolby Atmos, 5.1, stereo (parallel encode)    │   │
│  │   - Subtitles: SRT → TTML/WebVTT conversion              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │ Storage + CDN Distribution                                │   │
│  │                                                           │   │
│  │ Open Connect (Netflix CDN):                               │   │
│  │   - 17,000+ appliance servers worldwide                   │   │
│  │   - Co-located at ISPs                                    │   │
│  │   - Pre-populated overnight: popular titles → edge        │   │
│  │   - Long-tail: pull from regional hub → edge              │   │
│  │   - Storage per appliance: 100-200 TB SSD                 │   │
│  │                                                           │   │
│  │ Fill Pattern:                                             │   │
│  │   New title encoded → S3 origin                           │   │
│  │   → Regional hubs (same day)                              │   │
│  │   → Edge appliances (overnight, popularity-based)         │   │
│  │   → Cache hit ratio: > 95%                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Scale:                                                         │
│  - 17,000+ encoding hours/day                                  │
│  - 100+ encoding profiles per title                            │
│  - ~20 PB total CDN storage                                    │
│  - Cost: ~$0.01/min of encoding (AV1 ~3x more expensive)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Netflix L5 = **Sliding Window Max with lazy deletion + Video Encoding Pipeline**
- **Lazy deletion**: mark deleted in Set, purge lazily from heap top during getMax — amortized O(1) per operation
- **Timestamp as handle**: add() returns timestamp that serves as deletion key — O(1) removal
- **Per-Title encoding**: analyze scene complexity → allocate bitrate per title (not static ladder) — 20-50% bandwidth savings
- **Per-Shot encoding**: each scene gets its own bitrate → concatenate → constant perceptual quality
- **VMAF**: Netflix's perceptual quality metric 0-100 — target ≥ 93, correlates better with human perception than PSNR
- **Open Connect CDN**: 17K+ servers co-located at ISPs — pre-populate popular titles overnight, pull long-tail from hubs
- **Rejection reason**: system design was strong but struggled with concurrent programming follow-ups in coding round
- Netflix = **deep domain expertise required** — video codecs, quality metrics, CDN architecture

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | DSA |
| Coding | Very Hard | Heap, Lazy Deletion |
| System Design | Very Hard | Video Encoding, CDN |
| Culture | Hard | Netflix values (Freedom & Responsibility) |
| Coding 2 | Hard | Concurrency |
