# Netflix — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Los Gatos, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Rejection Reason:** Design round — couldn't articulate chaos engineering for video pipeline

---

## Round 1: Design & Architecture Discussion
**Duration:** 60 minutes

### Questions Asked
1. **How would you design a Video Transcoding Pipeline?**
   - Upload → transcode to multiple qualities → store → serve globally

### 💡 Interview-Ready Answer

```
Netflix Video Pipeline:
┌──────────────────────────────────────────────────────────────┐
│  Upload → Transcode → Store → Serve                          │
│                                                                │
│  1. Upload:                                                   │
│  - Studio uploads mezzanine file (ProRes 4444, ~100GB/hour)  │
│  - Chunked upload with resume support (up to 500GB)          │
│  - S3 multipart upload with pre-signed URLs                  │
│  - Checksum verification: SHA-256 per chunk + full file      │
│                                                                │
│  2. Transcoding Pipeline:                                     │
│  - Input: one high-quality master file                       │
│  - Output: 100+ renditions (resolution × bitrate × codec)   │
│    • Resolutions: 240p, 360p, 480p, 720p, 1080p, 4K, 8K    │
│    • Codecs: H.264 (legacy), H.265/HEVC (current), AV1 (new)│
│    • Bitrates: variable per resolution (5 quality levels)    │
│                                                                │
│  Per-Title Encoding (Netflix's innovation):                  │
│  - Different content needs different bitrates:               │
│    Animation (Arcane) = less complex → lower bitrate works   │
│    Action (Extraction) = high complexity → needs more bitrate│
│  - Algorithm: encode at multiple bitrates, find the          │
│    convex hull of quality vs bitrate → optimal ladder        │
│                                                                │
│  Pipeline Architecture:                                       │
│  ┌──────┐  ┌────────────┐  ┌──────────────┐  ┌──────┐      │
│  │Upload │─▶│ Shot Detect │─▶│ Parallel      │─▶│Verify│      │
│  │       │  │ & Segmenter │  │ Transcoder    │  │& Pkg │      │
│  │ S3    │  │             │  │ (per segment) │  │      │      │
│  └──────┘  └────────────┘  └──────────────┘  └──────┘      │
│                                                                │
│  Shot-based segmentation:                                     │
│  - Detect scene cuts/transitions                             │
│  - Encode each shot independently (optimal bitrate per shot) │
│  - Reassemble for seamless playback                          │
│  - Benefit: 20% bandwidth savings vs fixed-segment encoding  │
│                                                                │
│  3. Storage:                                                  │
│  - S3 for durability (11 nines)                              │
│  - Open Connect CDN: Netflix's own CDN appliances            │
│    Placed inside ISP networks (ISP gets free content cache)  │
│  - Content popular in region X → pre-warm OCAs in region X   │
│  - Less popular: served from origin (S3 → regional cache)    │
│                                                                │
│  4. Serving (ABR Streaming):                                  │
│  - DASH (Dynamic Adaptive Streaming over HTTP)               │
│  - Manifest: .mpd file listing all available renditions      │
│  - Client selects rendition based on bandwidth + buffer      │
│  - Segment size: 2-10 seconds (shorter = more adaptive)      │
│                                                                │
│  Chaos Engineering (what I should have covered):              │
│  - ChAP (Chaos Automation Platform):                         │
│    Inject failures: kill transcoder, corrupt segment,        │
│    throttle bandwidth, kill OCA node                         │
│  - Verify: pipeline recover gracefully?                      │
│  - Verify: client switches quality smoothly on degradation?  │
│  - Verify: stale content served if CDN is down?              │
│                                                                │
│  Scale:                                                       │
│  - 200M+ subscribers                                         │
│  - 50+ new titles/week                                       │
│  - Each title: 100+ renditions = 5TB+ per title              │
│  - Total storage: Exabytes                                   │
│  - Open Connect: 17K+ OCAs in 1000+ ISP locations            │
│  - Transcoding: thousands of EC2 instances, ~12 hours/title  │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 2: Coding
**Duration:** 45 minutes

### Questions Asked
1. **K Closest Points to Origin** (LeetCode 973) — then optimize for streaming data

### 💡 K Closest with QuickSelect

```java
// Approach 1: Max Heap — O(n log k)
public int[][] kClosest(int[][] points, int k) {
    PriorityQueue<int[]> maxHeap = new PriorityQueue<>(
        (a, b) -> (b[0]*b[0] + b[1]*b[1]) - (a[0]*a[0] + a[1]*a[1])
    );
    
    for (int[] point : points) {
        maxHeap.offer(point);
        if (maxHeap.size() > k) maxHeap.poll();
    }
    
    return maxHeap.toArray(new int[0][]);
}

// Approach 2: QuickSelect — O(n) average
public int[][] kClosestQuickSelect(int[][] points, int k) {
    int lo = 0, hi = points.length - 1;
    
    while (lo < hi) {
        int pivotIdx = partition(points, lo, hi);
        if (pivotIdx == k) break;
        else if (pivotIdx < k) lo = pivotIdx + 1;
        else hi = pivotIdx - 1;
    }
    
    return Arrays.copyOf(points, k);
}

private int partition(int[][] points, int lo, int hi) {
    int[] pivot = points[hi];
    long pivotDist = dist(pivot);
    int storeIdx = lo;
    
    for (int i = lo; i < hi; i++) {
        if (dist(points[i]) <= pivotDist) {
            swap(points, i, storeIdx++);
        }
    }
    swap(points, storeIdx, hi);
    return storeIdx;
}

private long dist(int[] p) { return (long)p[0]*p[0] + (long)p[1]*p[1]; }

// Follow-up: Streaming data — use min-heap of size K (same as approach 1)
// If new point is closer than farthest in heap → replace
```

---

## 🎯 Key Takeaways
- Netflix = **video pipeline + chaos engineering** are expected knowledge
- **Per-title encoding** = Netflix's innovation — encode convex hull of quality vs bitrate
- **Shot-based segmentation**: detect scene cuts, encode independently → 20% bandwidth savings
- **Open Connect CDN**: Netflix's own appliances inside ISPs — know this architecture
- **DASH streaming**: manifest with renditions, client-side ABR selection
- **Chaos engineering**: Netflix invented it → must discuss fault injection and recovery
- **K Closest Points**: QuickSelect O(n) vs Max-Heap O(n log k) — know both
- Netflix culture: **freedom and responsibility** — no micromanagement, high expectations

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Architecture | Very Hard | Video Pipeline, CDN, Per-Title Encoding |
| Coding | Medium | QuickSelect, Heap, Streaming K |
| System Design | Very Hard | Chaos Engineering, Fault Tolerance |
| Behavioral | Hard | Netflix Culture, Judgment, Impact |
