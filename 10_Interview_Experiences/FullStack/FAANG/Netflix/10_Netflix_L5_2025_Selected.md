# Netflix — L5 (Senior SWE) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + Technical + System Design + Cross-Functional + Culture)
- **Timeline:** 3 weeks
- **Format:** Virtual Onsite

## Round 1: Technical — Design a Video Streaming Buffer Manager
**Duration:** 60 minutes

### Problem
Design a buffer manager that handles video chunk prefetching with adaptive bitrate. Support: `requestChunk(position)`, `prefetch(currentPos, direction)`, `getBufferedRanges()`, and `evict(memoryPressure)`.

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;

public class StreamBufferManager {

    enum Quality { LOW(480), MEDIUM(720), HIGH(1080), ULTRA(2160);
        final int resolution;
        Quality(int r) { this.resolution = r; }
    }

    static class Chunk {
        final int position;       // Chunk index (0-based)
        final Quality quality;
        final byte[] data;
        long lastAccessTime;
        int accessCount;

        Chunk(int position, Quality quality, byte[] data) {
            this.position = position;
            this.quality = quality;
            this.data = data;
            this.lastAccessTime = System.currentTimeMillis();
            this.accessCount = 1;
        }

        int sizeBytes() { return data.length; }
    }

    private final int maxBufferSizeBytes;
    private int currentBufferSize;
    private final int prefetchAheadCount;
    private final int prefetchBehindCount;

    // position -> chunk
    private final ConcurrentHashMap<Integer, Chunk> buffer = new ConcurrentHashMap<>();
    // Sorted set of buffered positions for range queries
    private final TreeSet<Integer> bufferedPositions = new TreeSet<>();

    // Bandwidth estimation (exponential moving average)
    private volatile double estimatedBandwidthKbps = 5000; // Start at 5 Mbps
    private static final double BANDWIDTH_ALPHA = 0.3;

    // Chunk fetcher (simulated)
    private final ExecutorService fetchExecutor;

    public StreamBufferManager(int maxBufferSizeMB, int prefetchAhead, int prefetchBehind) {
        this.maxBufferSizeBytes = maxBufferSizeMB * 1024 * 1024;
        this.prefetchAheadCount = prefetchAhead;
        this.prefetchBehindCount = prefetchBehind;
        this.currentBufferSize = 0;
        this.fetchExecutor = Executors.newFixedThreadPool(4);
    }

    /**
     * Request a specific chunk. Returns immediately if buffered,
     * otherwise fetches synchronously.
     */
    public Chunk requestChunk(int position) {
        Chunk cached = buffer.get(position);
        if (cached != null) {
            cached.lastAccessTime = System.currentTimeMillis();
            cached.accessCount++;
            // Trigger prefetch asynchronously
            fetchExecutor.submit(() -> prefetch(position, 1));
            return cached;
        }

        // Cache miss — fetch at adaptive quality
        Quality quality = selectQuality();
        Chunk chunk = fetchFromNetwork(position, quality);
        addToBuffer(chunk);

        // Trigger prefetch
        fetchExecutor.submit(() -> prefetch(position, 1));

        return chunk;
    }

    /**
     * Prefetch chunks around current position.
     * direction: 1 = forward, -1 = backward (rewind)
     */
    public void prefetch(int currentPos, int direction) {
        List<Integer> toPrefetch = new ArrayList<>();

        if (direction >= 0) {
            for (int i = 1; i <= prefetchAheadCount; i++) {
                int pos = currentPos + i;
                if (pos >= 0 && !buffer.containsKey(pos)) {
                    toPrefetch.add(pos);
                }
            }
        }

        if (direction <= 0) {
            for (int i = 1; i <= prefetchBehindCount; i++) {
                int pos = currentPos - i;
                if (pos >= 0 && !buffer.containsKey(pos)) {
                    toPrefetch.add(pos);
                }
            }
        }

        Quality quality = selectQuality();
        for (int pos : toPrefetch) {
            Chunk chunk = fetchFromNetwork(pos, quality);
            addToBuffer(chunk);
        }
    }

    /**
     * Get list of contiguous buffered ranges as [start, end] pairs.
     */
    public List<int[]> getBufferedRanges() {
        List<int[]> ranges = new ArrayList<>();
        synchronized (bufferedPositions) {
            if (bufferedPositions.isEmpty()) return ranges;

            Iterator<Integer> it = bufferedPositions.iterator();
            int start = it.next();
            int end = start;

            while (it.hasNext()) {
                int pos = it.next();
                if (pos == end + 1) {
                    end = pos;
                } else {
                    ranges.add(new int[]{start, end});
                    start = pos;
                    end = pos;
                }
            }
            ranges.add(new int[]{start, end});
        }
        return ranges;
    }

    /**
     * Evict chunks under memory pressure.
     * Strategy: LRU with penalty for frequently accessed chunks.
     */
    public int evict(double memoryPressure) {
        // memoryPressure: 0.0 (none) to 1.0 (critical)
        int targetFreeBytes = (int) (maxBufferSizeBytes * memoryPressure * 0.5);
        int freedBytes = 0;

        // Sort by eviction score: lower score = evict first
        List<Chunk> candidates = new ArrayList<>(buffer.values());
        candidates.sort((a, b) -> {
            double scoreA = evictionScore(a);
            double scoreB = evictionScore(b);
            return Double.compare(scoreA, scoreB);
        });

        for (Chunk chunk : candidates) {
            if (freedBytes >= targetFreeBytes) break;

            buffer.remove(chunk.position);
            synchronized (bufferedPositions) {
                bufferedPositions.remove(chunk.position);
            }
            freedBytes += chunk.sizeBytes();
            currentBufferSize -= chunk.sizeBytes();
        }

        return freedBytes;
    }

    private double evictionScore(Chunk chunk) {
        long age = System.currentTimeMillis() - chunk.lastAccessTime;
        // Higher score → keep longer
        return chunk.accessCount * 1000.0 / (age + 1);
    }

    /**
     * Adaptive bitrate selection based on estimated bandwidth.
     */
    private Quality selectQuality() {
        if (estimatedBandwidthKbps > 15000) return Quality.ULTRA;
        if (estimatedBandwidthKbps > 5000) return Quality.HIGH;
        if (estimatedBandwidthKbps > 2000) return Quality.MEDIUM;
        return Quality.LOW;
    }

    private void updateBandwidth(int bytesDownloaded, long durationMs) {
        if (durationMs <= 0) return;
        double measuredKbps = (bytesDownloaded * 8.0) / durationMs;
        estimatedBandwidthKbps = BANDWIDTH_ALPHA * measuredKbps
            + (1 - BANDWIDTH_ALPHA) * estimatedBandwidthKbps;
    }

    private void addToBuffer(Chunk chunk) {
        // Evict if necessary
        while (currentBufferSize + chunk.sizeBytes() > maxBufferSizeBytes) {
            evict(0.3);
        }

        buffer.put(chunk.position, chunk);
        synchronized (bufferedPositions) {
            bufferedPositions.add(chunk.position);
        }
        currentBufferSize += chunk.sizeBytes();
    }

    private Chunk fetchFromNetwork(int position, Quality quality) {
        // Simulated network fetch — in real code this calls CDN
        long start = System.currentTimeMillis();
        int chunkSize = quality.resolution * 100; // Simulated size
        byte[] data = new byte[chunkSize]; // Simulated data
        long elapsed = System.currentTimeMillis() - start + 50; // Fake 50ms latency
        updateBandwidth(chunkSize, elapsed);
        return new Chunk(position, quality, data);
    }

    public void shutdown() {
        fetchExecutor.shutdown();
    }

    public static void main(String[] args) {
        StreamBufferManager mgr = new StreamBufferManager(50, 5, 2); // 50MB, 5 ahead, 2 behind

        // Simulate watching
        for (int i = 0; i < 10; i++) {
            Chunk chunk = mgr.requestChunk(i);
            System.out.printf("Chunk %d: quality=%s, size=%d bytes%n",
                chunk.position, chunk.quality, chunk.sizeBytes());
        }

        // Check buffered ranges
        List<int[]> ranges = mgr.getBufferedRanges();
        System.out.print("Buffered ranges: ");
        for (int[] range : ranges) {
            System.out.printf("[%d-%d] ", range[0], range[1]);
        }
        System.out.println();

        // Simulate memory pressure
        int freed = mgr.evict(0.5);
        System.out.println("Freed " + freed + " bytes");

        ranges = mgr.getBufferedRanges();
        System.out.print("After eviction: ");
        for (int[] range : ranges) {
            System.out.printf("[%d-%d] ", range[0], range[1]);
        }
        System.out.println();

        mgr.shutdown();
    }
}
```

## 🎯 Key Takeaways
- Netflix interviews focus heavily on **streaming infrastructure** and media delivery
- Adaptive bitrate (ABR) selection using exponential moving average is production-grade
- Buffer eviction needs a scoring function — not simple LRU, but frequency + recency weighted
- `TreeSet` for tracking contiguous ranges is an elegant approach
- Prefetching strategy must be direction-aware (forward for normal play, backward for rewind)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical | Hard | Buffer Management, ABR, Concurrency |
| System Design | Hard | Video Streaming Architecture |
| Cross-Functional | Medium | Communication, Collaboration |
| Culture | Medium | Netflix Culture Deck |
