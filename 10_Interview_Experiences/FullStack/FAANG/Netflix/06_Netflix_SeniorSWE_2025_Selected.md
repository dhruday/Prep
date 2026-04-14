# Netflix — Senior SWE FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | Senior |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Content Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + 2 Technical + System Design)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Design a Time-Based Key-Value Store** (LeetCode 981) 
2. **Follow-up: What if timestamps can be non-sequential (inserted out of order)?**

### 💡 Time-Based Key-Value Store

```java
class TimeMap {
    // key → sorted list of [timestamp, value] pairs
    private final Map<String, List<long[]>> mapTimestamp = new HashMap<>();
    private final Map<String, List<String>> mapValue = new HashMap<>();
    
    void set(String key, String value, int timestamp) {
        mapTimestamp.computeIfAbsent(key, k -> new ArrayList<>()).add(new long[]{timestamp});
        mapValue.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
    }
    
    // Get value at largest timestamp <= given timestamp
    String get(String key, int timestamp) {
        if (!mapTimestamp.containsKey(key)) return "";
        
        List<long[]> timestamps = mapTimestamp.get(key);
        List<String> values = mapValue.get(key);
        
        // Binary search for largest timestamp <= target
        int lo = 0, hi = timestamps.size() - 1;
        int result = -1;
        
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (timestamps.get(mid)[0] <= timestamp) {
                result = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        
        return result >= 0 ? values.get(result) : "";
    }
}
// Time: set O(1), get O(log n)
// Space: O(n × k) where n = entries, k = key count

// Follow-up: Non-sequential timestamps → use TreeMap
class TimeMapNonSequential {
    private final Map<String, TreeMap<Integer, String>> map = new HashMap<>();
    
    void set(String key, String value, int timestamp) {
        map.computeIfAbsent(key, k -> new TreeMap<>()).put(timestamp, value);
    }
    
    String get(String key, int timestamp) {
        TreeMap<Integer, String> tree = map.get(key);
        if (tree == null) return "";
        
        Map.Entry<Integer, String> entry = tree.floorEntry(timestamp);
        return entry != null ? entry.getValue() : "";
    }
}
// Time: set O(log n), get O(log n)
// TreeMap.floorEntry handles non-sequential inserts naturally
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Netflix's Content Processing Pipeline** (Media ingestion to playable content)
   - Ingest master files (4K ProRes → multiple encodings)
   - Adaptive bitrate: 360p to 4K HDR Dolby Vision
   - Per-title encoding: optimize bitrate per content type (animation vs action)
   - Audio: 5.1 Surround, Atmos, multiple languages
   - Subtitles: 30+ languages, timing sync
   - DRM: Widevine, FairPlay, PlayReady
   - Quality validation: automated QC checks

### 💡 Key Design

```
Pipeline Architecture:
┌────────────┐
│ Content     │ Master file: 4K ProRes/DNxHR
│ Partner     │ Up to 100GB per title
│ Upload      │ Aspera/S3 multi-part
└─────┬──────┘
      │
┌─────▼──────────┐
│ Intake Service  │  Validates master file:
│                 │  - File integrity (checksum)
│                 │  - Codec validation
│                 │  - Resolution/framerate detection
│                 │  - Audio channel mapping
└─────┬──────────┘
      │ Kafka: content.intake.validated
┌─────▼──────────┐
│ Encoding        │  Per-Title Encoding Optimization
│ Orchestrator    │  
│ (Conductor)     │  Generates encoding "ladder" per title
└─────┬──────────┘
      │
      ├── Video Encode Workers (100s of EC2/GPU)
      │   ├── 360p @ 200kbps  (cellular)
      │   ├── 480p @ 500kbps  (mobile wifi)
      │   ├── 720p @ 1.5Mbps  (tablet)
      │   ├── 1080p @ 5Mbps   (desktop)
      │   ├── 4K SDR @ 15Mbps
      │   └── 4K HDR DV @ 20Mbps (Dolby Vision)
      │
      ├── Audio Encode Workers
      │   ├── AAC Stereo per language
      │   ├── EAC3 5.1 Surround per language
      │   └── Atmos (where available)
      │
      └── Subtitle Processing
          ├── Timed Text → WebVTT conversion
          ├── Timing validation (sync check)
          └── Forced Narrative subtitle extraction

Per-Title Encoding Optimization:
class PerTitleEncoder {
    // Netflix's key innovation: different content = different bitrate needs
    // Animation needs less bitrate than action movies at same perceived quality
    
    EncodingLadder computeOptimalLadder(MediaFile master) {
        // 1. Analyze content complexity per scene
        List<SceneComplexity> scenes = analyzeComplexity(master);
        
        // 2. For each resolution, find optimal bitrate
        List<EncodingProfile> ladder = new ArrayList<>();
        int[] resolutions = {360, 480, 720, 1080, 2160};
        
        for (int res : resolutions) {
            // Encode at multiple test bitrates
            // Find the "knee" of the quality curve (diminishing returns point)
            int optimalBitrate = findOptimalBitrate(master, res, scenes);
            
            // Only include this rung if it improves quality over previous
            if (ladder.isEmpty() || 
                qualityScore(res, optimalBitrate) > qualityScore(ladder.get(ladder.size()-1))) {
                ladder.add(new EncodingProfile(res, optimalBitrate));
            }
        }
        
        return new EncodingLadder(master.getTitleId(), ladder);
    }
    
    int findOptimalBitrate(MediaFile master, int resolution, List<SceneComplexity> scenes) {
        // VMAF (Video Multimethod Assessment Fusion) quality metric
        // Target VMAF = 93 (Netflix's quality threshold)
        double targetVMAF = 93.0;
        
        int lo = resolution * 100;  // Min bitrate estimate
        int hi = resolution * 5000; // Max bitrate estimate
        
        // Binary search for minimum bitrate that achieves target VMAF
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            double vmaf = encodeAndMeasureVMAF(master, resolution, mid);
            
            if (vmaf >= targetVMAF) {
                hi = mid; // Can use lower bitrate
            } else {
                lo = mid + 1; // Need higher bitrate
            }
        }
        
        return lo;
    }
}

DRM Packaging:
class DRMPackager {
    // Package same content for 3 DRM systems
    List<DRMPackage> package(EncodedContent content) {
        // Common Encryption (CENC): encrypt once, add DRM-specific headers
        byte[] contentKey = keyManagement.generateContentKey(content.getTitleId());
        byte[] encryptedContent = AES_CTR_128.encrypt(content.getData(), contentKey);
        
        return List.of(
            // Widevine (Android, Chrome)
            new DRMPackage("widevine", encryptedContent,
                widevineServer.getLicense(content.getTitleId(), contentKey)),
            
            // FairPlay (Safari, iOS, Apple TV)
            new DRMPackage("fairplay", 
                fairPlayPackager.repackage(encryptedContent, contentKey),
                fairPlayServer.getSPC(content.getTitleId())),
            
            // PlayReady (Edge, Windows, Xbox)
            new DRMPackage("playready", encryptedContent,
                playReadyServer.getLicense(content.getTitleId(), contentKey))
        );
    }
}

Quality Control Automation:
class QCPipeline {
    QCResult validate(EncodedContent content) {
        List<QCCheck> checks = List.of(
            // 1. VMAF score per resolution ≥ threshold
            new VMAFCheck(content, 93.0),
            
            // 2. Audio-video sync (lip sync < 40ms drift)
            new AVSyncCheck(content, 40),
            
            // 3. No black frames at start/end (< 2 frames tolerance)
            new BlackFrameCheck(content, 2),
            
            // 4. Audio loudness normalization (EBU R128: -24 LUFS ±1)
            new LoudnessCheck(content, -24.0, 1.0),
            
            // 5. Subtitle timing: no overlap, min 1s display, max 7s
            new SubtitleTimingCheck(content),
            
            // 6. HDR metadata validation (MaxCLL, MaxFALL within spec)
            new HDRMetadataCheck(content),
            
            // 7. Bitrate conformance (within 5% of target)
            new BitrateConformanceCheck(content, 0.05)
        );
        
        List<QCFailure> failures = checks.stream()
            .map(QCCheck::run)
            .filter(r -> !r.passed())
            .toList();
        
        if (failures.isEmpty()) {
            return QCResult.passed();
        } else if (failures.stream().anyMatch(QCFailure::isCritical)) {
            return QCResult.failed(failures); // Block publishing
        } else {
            return QCResult.warning(failures); // Publish with manual review
        }
    }
}

Scale:
- 17,000+ titles in Netflix catalog
- Each title: avg 40 encoded files (video) + 30 audio tracks + 30 subtitle files
- Total storage: ~100PB on Open Connect CDN
- Encoding farm: 1000s of workers, GPU-accelerated (NVENC for H.265)
- Pipeline throughput: encode a full title in 2-4 hours
```

---

## 🎯 Key Takeaways
- Netflix = **media processing + per-title encoding + DRM + quality at scale**
- **Time-Based KV**: binary search for `floorKey` on sorted timestamps; TreeMap for non-sequential
- **Per-title encoding**: binary search for minimum bitrate achieving VMAF ≥ 93 per resolution
- **Encoding ladder**: skip rungs where quality gain is marginal → save bandwidth + storage
- **DRM**: CENC (Common Encryption) → encrypt once, package for Widevine/FairPlay/PlayReady
- **QC pipeline**: automated VMAF, A/V sync, loudness (EBU R128), HDR metadata validation
- **Open Connect CDN**: 100PB content, co-located in ISPs, serve 95% of traffic from edge
- Netflix interviews: expect deep domain knowledge in media/streaming if joining content team

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone | Medium | Behavioral + Quick Coding |
| Coding | Medium-Hard | Time-Based KV, Binary Search |
| Technical 2 | Hard | Media Processing Domain |
| System Design | Hard | Content Pipeline, Per-Title Encoding |
