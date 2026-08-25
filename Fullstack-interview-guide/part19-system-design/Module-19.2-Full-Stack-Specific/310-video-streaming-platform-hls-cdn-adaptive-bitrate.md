# Video Streaming Platform — HLS, CDN, Adaptive Bitrate
> Part 19 — System Design Case Studies · High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **HLS (HTTP Live Streaming)**: Apple's adaptive streaming protocol; video file split into short segments (2-10 seconds each) served as regular HTTP files; a `.m3u8` playlist file lists all segment URLs; the player downloads the playlist, then fetches segments one by one; standard for web, iOS, Android
- **Why segments and not one big file**: segments are cacheable at CDN edge nodes; player can switch quality mid-stream by switching which playlist it follows; if playback position is 35 minutes in, player only downloads segments around that position — not the whole file
- **Adaptive Bitrate (ABR)**: the video is encoded at multiple quality levels (1080p/8Mbps, 720p/4Mbps, 480p/2Mbps, 360p/1Mbps); master playlist lists all quality variants; player measures download speed and automatically switches to a lower quality when bandwidth drops, higher when it improves; the user sees smooth playback instead of buffering
- **Transcoding**: raw uploaded video → multiple resolution/bitrate encodings; computationally heavy (1 hour of 4K → 1 hour of CPU+GPU time); done asynchronously after upload; never block the upload response; use a job queue (message-based, e.g., SQS + dedicated worker fleet)
- **CDN**: all segments and manifests served from CDN edge nodes near the viewer; origin (S3) only sees cache misses; 99%+ of video bytes served from CDN; CDN pull model — edge pulls from origin on first request, caches; for popular videos, CDN hit rate is near 100%
- **Chunked upload for video source**: large source files (30GB 4K raw) use S3 multipart upload (topic 308); transcoder pulls from S3 and produces output also written to S3
- **Pre-signed URLs for protection**: don't expose raw S3/CDN URLs; generate time-limited signed URLs so only authenticated users can view; signed CDN URLs (CloudFront signed cookies, Akamai token auth) protect premium content
- **Thumbnails / posters**: generate thumbnail sprites for the scrub bar preview — every 5 seconds, one thumbnail frame; stored as a single sprite image + WebVTT file mapping time ranges to sprite coordinates; CDN-served

---

## 1. One-Line Definition
A video streaming platform accepts uploaded video files, transcodes them asynchronously into multiple HLS quality variants (1080p→360p) via a job queue + GPU worker fleet, stores segments on S3, serves them through a CDN, and streams to players using adaptive bitrate selection that switches quality in real time based on the viewer's network conditions.

---

## 2. The Problem It Solves

A video platform serves a 1GB, single-quality MP4 file directly from an API server. Problems:

1. Server bandwidth: 1000 concurrent viewers × 4 Mbps = 4 Gbps egress — a single server can't handle this; cost is enormous since you pay egress charges on every byte
2. Variable network: a viewer on 3G gets the same 1080p stream as one on fibre — the 3G viewer buffers constantly; there's no fallback quality
3. Large file delivery: HTTP doesn't have native resume for partial plays; user scrubs to minute 40 — server streams from minute 0 anyway
4. No CDN caching: each video request hits origin; popular videos hammer the origin server

HLS + CDN + ABR solves all four: CDN serves 99% of traffic; ABR picks the right quality per viewer; segments are small HTTP files that cache perfectly; scrubbing fetches only the relevant segment, not the whole file.

---

## 3. How It Works Internally

### End-to-End Architecture

```
Upload
  │  (S3 multipart upload — see Topic 308)
  ▼
Raw Video in S3
  │
Kafka event: video.uploaded
  │
  ▼
Transcoding Fleet (GPU workers, AWS Batch / Kubernetes Jobs)
┌───────────────────────────────────────────────────────────┐
│  1. Download raw file from S3                             │
│  2. Run FFmpeg:                                           │
│     - 1080p @ 8Mbps → segments/ + 1080p.m3u8            │
│     - 720p  @ 4Mbps → segments/ + 720p.m3u8             │
│     - 480p  @ 2Mbps → segments/ + 480p.m3u8             │
│     - 360p  @ 800Kbps → segments/ + 360p.m3u8           │
│  3. Generate master.m3u8 (lists all variants)            │
│  4. Upload all outputs to S3 under videos/{videoId}/     │
│  5. Generate thumbnail sprites                            │
│  6. Publish event: video.ready                           │
└───────────────────────────────────────────────────────────┘
          │
          ▼
S3 Structure:
  videos/{videoId}/
    master.m3u8          ← master playlist
    1080p/
      index.m3u8         ← variant playlist for 1080p
      seg001.ts
      seg002.ts
      ...
    720p/
      index.m3u8
      seg001.ts
      ...
    thumbnails/
      sprites.jpg
      sprites.vtt

CDN (CloudFront):
  Origin = S3
  Distribution covers all videos/ prefix
  Edge caches segments for popular videos
  Expiry = 365 days (segments never change once written)

Player (HLS.js in browser, AVPlayer on iOS, ExoPlayer on Android):
  1. Fetch master.m3u8 (CDN → edge → returned fast)
  2. Measure bandwidth via download speed of segments
  3. Choose best variant (720p if 5Mbps link)
  4. Fetch 720p/index.m3u8
  5. Download segments, decode, play
  6. If bandwidth drops → switch to 480p seamlessly (finish current segment, switch playlist)
```

### HLS Manifest Files

```
# master.m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
720p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=854x480,CODECS="avc1.64001e,mp4a.40.2"
480p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.64001e,mp4a.40.2"
360p/index.m3u8

# 720p/index.m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0

#EXTINF:6.000,
seg001.ts
#EXTINF:6.000,
seg002.ts
#EXTINF:5.840,
seg003.ts
#EXT-X-ENDLIST
```

---

## 4. The Code

### Wrong Way — Serve Full Video from Server

```java
// ❌ Stream entire video through your API server

@GetMapping("/video/{id}")
public ResponseEntity<Resource> streamVideo(@PathVariable Long id) {
    
    // ❌ Reads entire video file into memory / streams through server process
    // ❌ 1000 viewers × 4Mbps = 4Gbps server egress
    // ❌ No quality adaptation — everyone gets same quality regardless of bandwidth
    // ❌ No CDN caching — every byte hits your server
    // ❌ Byte-range requests partially supported but player can't switch quality
    
    Path videoPath = videoStorageService.getVideoPath(id);
    Resource resource = new FileSystemResource(videoPath);
    
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("video/mp4"))
        .body(resource);
}

// ❌ Transcode inside the HTTP upload handler — blocks user
@PostMapping("/upload")
public ResponseEntity<String> uploadAndTranscode(@RequestParam MultipartFile file) {
    videoStorage.save(file);
    // ❌ Transcoding can take 10-60 minutes for long videos
    // ❌ HTTP timeout kills this long before it finishes
    // ❌ If server restarts, transcode progress lost
    transcodingService.transcode(file);  
    return ResponseEntity.ok("done");
}
```

```java
// ✅ HLS + CDN + Async transcoding

@RestController
@RequestMapping("/videos")
public class VideoController {
    private final VideoService videoService;
    private final CdnService cdnService;
    
    // ✅ Phase 1: Upload initiates multipart upload to S3 (see Topic 308)
    // Phase 2: S3 complete webhook triggers transcoding job
    
    // ✅ Serve HLS manifest — redirect to CDN
    @GetMapping("/{videoId}/stream")
    public ResponseEntity<Void> streamVideo(
            @PathVariable String videoId,
            @AuthenticationPrincipal UserDetails user) {
        
        Video video = videoService.getVideo(videoId);
        
        if (!video.isPublic() && !videoService.hasAccess(user.getUsername(), videoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        if (video.getStatus() != VideoStatus.READY) {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                .header("Retry-After", "30")
                .build();
        }
        
        // ✅ Generate signed CDN URL (1 hour TTL) — don't expose raw S3 URL
        String manifestUrl = cdnService.signedUrl(
            "videos/" + videoId + "/master.m3u8",
            Duration.ofHours(1),
            user.getUsername()  // embed user in signed token for audit
        );
        
        // ✅ Redirect to CDN — player gets URL, fetches directly from CDN
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(manifestUrl))
            .build();
    }
    
    // ✅ Video metadata + processing status
    @GetMapping("/{videoId}")
    public ResponseEntity<VideoMetadataResponse> getVideo(@PathVariable String videoId) {
        return ResponseEntity.ok(videoService.getMetadata(videoId));
    }
}

// ✅ Transcoding orchestrator: triggered by file.uploaded event
@KafkaListener(topics = "file.uploaded", groupId = "video-transcoder",
               containerFactory = "videoTranscodeListenerFactory")
@Service
public class VideoTranscodeOrchestrator {
    private final VideoJobService jobService;
    private final VideoRepository videoRepository;
    
    @KafkaHandler
    public void onUploadComplete(FileUploadedEvent event) {
        // ✅ Only handle video MIME types
        if (!event.getMimeType().startsWith("video/")) return;
        
        videoRepository.updateStatus(event.getFileId(), VideoStatus.TRANSCODING);
        
        // ✅ Submit job to the GPU worker queue (AWS Batch or Kubernetes Job)
        TranscodeJob job = jobService.submitJob(TranscodeJobRequest.builder()
            .videoId(event.getFileId())
            .sourceS3Key(event.getS3Key())
            .outputS3Prefix("videos/" + event.getFileId())
            .variants(List.of(
                VideoVariant.of(1920, 1080, 8_000_000, "h264"),
                VideoVariant.of(1280, 720,  4_000_000, "h264"),
                VideoVariant.of(854,  480,  2_000_000, "h264"),
                VideoVariant.of(640,  360,    800_000, "h264")
            ))
            .generateThumbnails(true)
            .build());
        
        videoRepository.setJobId(event.getFileId(), job.getId());
    }
}

// ✅ Transcode worker: runs on GPU fleet, emits FFmpeg commands
@Component
public class FfmpegTranscodeWorker {
    private final S3Client s3;
    private final VideoRepository videoRepository;
    private final KafkaTemplate<String, VideoReadyEvent> kafkaTemplate;
    
    public void transcode(TranscodeJobRequest request) throws IOException {
        // ✅ Download source from S3 to local disk
        Path sourceFile = downloadFromS3(request.getSourceS3Key());
        
        List<Path> outputManifests = new ArrayList<>();
        
        for (VideoVariant variant : request.getVariants()) {
            Path outputDir = Files.createTempDirectory("hls_" + variant.getHeight());
            
            // ✅ FFmpeg command: segment into 6-second HLS chunks at specified bitrate
            ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", sourceFile.toString(),
                "-vf", "scale=%d:%d".formatted(variant.getWidth(), variant.getHeight()),
                "-c:v", "libx264",
                "-b:v", variant.getBitrate() + "",
                "-c:a", "aac",
                "-b:a", "128k",
                "-hls_time", "6",              // 6-second segments
                "-hls_playlist_type", "vod",
                "-hls_segment_filename", outputDir + "/seg%03d.ts",
                outputDir + "/index.m3u8"
            );
            
            Process process = pb.start();
            int exitCode = process.waitFor();
            if (exitCode != 0) throw new TranscodingException("FFmpeg failed for " + variant);
            
            // ✅ Upload all segments and manifest to S3
            uploadDirectoryToS3(outputDir, 
                request.getOutputS3Prefix() + "/" + variant.getHeight() + "p/");
            
            outputManifests.add(outputDir.resolve("index.m3u8"));
        }
        
        // ✅ Generate master .m3u8 pointing to all variant playlists
        generateMasterManifest(request.getVideoId(), request.getVariants(), 
                               request.getOutputS3Prefix());
        
        // ✅ Generate thumbnail sprites
        if (request.isGenerateThumbnails()) {
            generateThumbnailSprites(sourceFile, request.getOutputS3Prefix());
        }
        
        // ✅ Mark video ready and notify
        videoRepository.updateStatus(request.getVideoId(), VideoStatus.READY);
        kafkaTemplate.send("video.ready", request.getVideoId(), 
            new VideoReadyEvent(request.getVideoId(), request.getOutputS3Prefix()));
    }
}
```

```typescript
// ✅ Frontend: HLS.js video player with adaptive streaming

import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
    videoId: string;
    poster: string;
}

function VideoPlayer({ videoId, poster }: VideoPlayerProps) {
    const videoRef    = useRef<HTMLVideoElement>(null);
    const hlsRef      = useRef<Hls | null>(null);
    const [quality, setQuality]   = useState<string>('Auto');
    const [qualities, setQuals]   = useState<string[]>([]);
    const [buffering, setBuffer]  = useState(false);
    
    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        
        // ✅ Fetch signed manifest URL from our API
        fetch(`/api/videos/${videoId}/stream`)
            .then(response => {
                // API returns a redirect to signed CDN URL
                return response.url;   // final URL after redirect
            })
            .then(manifestUrl => {
                if (Hls.isSupported()) {
                    // ✅ Use HLS.js for browsers that don't natively support HLS (Chrome, Firefox)
                    const hls = new Hls({
                        startLevel:       -1,           // ✅ -1 = auto quality detection
                        autoLevelCapping: -1,           // ✅ no cap: choose highest sustainable
                        maxBufferLength:  30,           // ✅ buffer 30s ahead
                        maxBufferSize:    60 * 1000 * 1000,  // 60MB max buffer
                    });
                    
                    hls.loadSource(manifestUrl);
                    hls.attachMedia(video);
                    
                    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                        const levels = data.levels.map(l => `${l.height}p`);
                        setQuals(['Auto', ...levels]);
                    });
                    
                    // ✅ Track current quality for display
                    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                        const level = hls.levels[data.level];
                        setQuality(`${level.height}p`);
                    });
                    
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    hls.startLoad();  // ✅ Retry network errors
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    hls.recoverMediaError();  // ✅ Try to recover
                                    break;
                            }
                        }
                    });
                    
                    hlsRef.current = hls;
                    
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // ✅ Native HLS support (Safari / iOS) — just set the src
                    video.src = manifestUrl;
                }
            });
        
        // Buffering indicator
        const handleWaiting  = () => setBuffer(true);
        const handlePlaying  = () => setBuffer(false);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        
        return () => {
            hlsRef.current?.destroy();
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
        };
    }, [videoId]);
    
    const switchQuality = (label: string) => {
        if (!hlsRef.current) return;
        if (label === 'Auto') {
            hlsRef.current.currentLevel = -1;  // ✅ Back to auto
        } else {
            const levelIndex = hlsRef.current.levels.findIndex(
                l => `${l.height}p` === label
            );
            hlsRef.current.currentLevel = levelIndex;   // ✅ Manual quality lock
        }
        setQuality(label);
    };
    
    return (
        <div className="video-wrapper">
            {buffering && <div className="buffering-spinner">Loading…</div>}
            <video ref={videoRef} poster={poster} controls />
            <div className="quality-selector">
                {qualities.map(q => (
                    <button key={q} onClick={() => switchQuality(q)}
                            className={q === quality ? 'active' : ''}>
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why use HLS instead of just serving an MP4 file?"

**Hruday's answer:**
> Four reasons: CDN caching, adaptive quality, partial play, and bandwidth efficiency.
>
> CDN caching: an MP4 file changes when the video is updated — complex cache invalidation. HLS segments are immutable once written. A 6-second segment is the same forever. CDN can cache segments with a 1-year expiry and hit rate of 99% for popular content.
>
> Adaptive quality: with a single MP4, every viewer gets the same quality. HLS packets the video as multiple quality variants. The player automatically switches from 1080p to 480p when bandwidth drops, and back up when it recovers. The viewer gets uninterrupted playback instead of a buffering spinner.
>
> Partial play: if a user jumps to 45 minutes into a 2-hour video, the player downloads only segments around the 45-minute mark. With a single MP4 and a byte-range HTTP request, the server might need to scan to that byte position. With HLS, it's a direct fetch of specific segment files.
>
> Bandwidth: a 4K MP4 is 30GB. If 1000 users all watch only the trailer (first 5 minutes), streaming the whole 30GB file would waste 29GB per user. With HLS, only the first 5 minutes of segments (about 2GB) are served. Significant CDN egress cost savings.

---

### Q2 — Deep Dive
**Interviewer asks:** "Describe how transcoding works and why it needs to be async."

**Hruday's answer:**
> Transcoding is the process of converting a raw uploaded video into multiple HLS versions at different resolutions and bitrates. Concretely: take the raw 4K file → run FFmpeg → produce 1080p segments + 720p segments + 480p segments + 360p segments + master manifest. FFmpeg is computationally intensive — for a 1-hour 4K video it can take 30-60 minutes of GPU compute time.
>
> It absolutely must be async. If transcoding runs inside the upload HTTP handler, the HTTP request would time out (nginx typically kills requests after 60 seconds; a 30-GB file takes 15 minutes to transcode). The user would see a timeout error even if transcoding was making progress.
>
> The right pattern: upload completes → S3 event or Kafka event `file.uploaded` → transcoding job queue (AWS Batch, Kubernetes Jobs, or an SQS queue with dedicated workers) → transcoding workers pull jobs, process, write output to S3 → publish `video.ready` event → video status in DB updates to READY → notify user via SSE or push notification.
>
> The user gets "video uploaded — processing" immediately. The transcoding queue scales horizontally: high upload volume → spin up more GPU workers. Expensive hardware (GPU) is only used when there's work to do, then scaled down. The rest of the application runs on cheap nodes.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "HLS vs DASH — which would you pick and why?"

**Hruday's answer:**
> For most production video platforms, I'd pick HLS — with a pragmatic reason: Apple requires HLS for native iOS and Safari playback. If you use DASH (MPEG-DASH), you need a JavaScript player (dash.js) on Safari and iOS, which adds complexity and slightly worse performance than native HLS.
>
> Technically, DASH is more flexible — the spec is royalty-free and open, segment durations are more flexible, and there's better support for DRM (MPEG-CENC). For a streaming platform targeting Android, set-top boxes, or Smart TVs where you control the player, DASH might be preferable.
>
> Modern platforms (Netflix, Disney+, YouTube) often produce both HLS and DASH from the same source, serving HLS to Apple devices and DASH elsewhere. This doubles storage but gives native performance everywhere.
>
> My default choice for a new project: HLS, served with HLS.js in the browser, AVPlayer on iOS, ExoPlayer on Android. This covers 99% of devices with minimal complexity. Add DASH later if specific Smart TV or set-top box requirements arise.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a video platform that must start showing new uploads within 5 minutes of upload completion."

**Hruday's answer:**
> Five minutes from upload complete to playable is tight for a raw 4K video but achievable for web-ready resolutions.
>
> Priority transcoding: don't wait for all quality variants. Transcode 720p first — it's a reasonable default for most viewers and faster to produce than 1080p. As soon as the 720p variant is done (maybe 3 minutes for a 1-hour video on a fast GPU), mark the video as PREVIEW_READY. The player uses only 720p until higher qualities are ready. Update the master manifest incrementally: 720p is there first, higher qualities added when ready.
>
> Parallel transcoding: don't transcode all variants sequentially. Run FFmpeg simultaneously on different workers — one job for 1080p, one for 720p, one for 480p. Total time = time for the slowest single variant (720p), not the sum. On AWS GPU instances (G4) with parallel workers, a 1-hour video can produce all standard HLS variants in under 3 minutes.
>
> Fast initial segment delivery: produce the first 30 seconds of all variants first (ABR "priming"). The video appears available quickly; the full transcode continues in the background. The master manifest lists only available segments; the playlist gains more segments as transcoding catches up.
>
> With this approach: upload finishes → within 5 minutes → 360/480/720p playable → within 15 minutes → all variants including 1080p available. The 5-minute SLA is met.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Serving video directly from API server | "My server serves the video bytes using a streaming response" | At any meaningful scale, the server becomes the bottleneck and cost explodes; 1000 viewers × 4Mbps = 4Gbps through your server — impossible on anything smaller than extremely expensive infrastructure; even at 100 viewers this is wasteful; CDN is not optional for video; every byte of video content should be served by the CDN, not your API server; the API server only serves playlist manifests and signed URLs |
| Single video file | "I'll store the video in original format and stream it with HTTP byte-range requests" | Byte-range requests solve the seek problem but don't give you adaptive bitrate; a 3G user gets the same 4K file bytes as a fibre user and buffers constantly; no quality switching; poor CDN caching (a 30GB file in CDN is expensive to cache everywhere); the industry moved to HLS/DASH precisely because adaptive streaming is non-negotiable for a good viewing experience across varied network conditions |
| Synchronous transcoding | "I'll transcode inside the upload endpoint and return when done" | Transcoding 1 hour of 4K video takes 30-60 minutes; HTTP connections time out in 60-120 seconds; even for short clips, sync transcoding inside a web request is wrong architecture; failures during transcoding crash the whole request; can't scale transcoding independently from web serving; always decouple: upload → Kafka/SQS event → dedicated transcoding worker fleet → video ready notification |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we added video tutorial support to a product — users uploaded screen recordings of SAP workflows. Initial implementation stored heavy MP4 files on the server and served them from a static file location. A 500MB tutorial took 25 seconds to start playing over a corporate VPN. Users in Singapore downloading from a server in Frankfurt experienced 40-second buffering start times.
>
> We migrated to S3 + CloudFront + HLS. An asynchronous transcoder (a Spring Batch job on a dedicated EC2 instance) converted each upload to 720p and 480p HLS within minutes. CloudFront distributed the segments globally — our Singapore users now fetched segments from the Singapore CloudFront edge node. Video start time dropped from 25+ seconds to under 2 seconds. CloudFront egress was also 30% cheaper than serving from our Frankfurt server because of CDN compression and regional caching."

---

## 8. Scale Evolution

**1,000 users →** Simple MP4 served from S3 with pre-signed URLs is acceptable. No CDN required at this scale (S3 handles it). Basic async FFmpeg transcoder for web-optimised MP4. Single quality level fine.

**100,000 users →** HLS conversion for all uploads. CloudFront CDN in front of S3. 720p + 480p + 360p variants — give ABR benefit. Async transcoding via a dedicated worker pod. Redis to track transcode status. Users notified via SSE when video is ready.

**10 million users →** GPU worker fleet (AWS Batch on G4 instances) with auto-scaling based on queue depth. Multi-region CDN with edge locations on every continent. Per-tenant rate limits on upload API. DRM (PlayReady/Widevine) for premium content. Live streaming capability (additional infrastructure). CDN cost optimisation: tiered caching — popular content at all edges, old content at fewer edges.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Video KYC (short verification recording); merchant onboarding video guides; internal training videos | Short-form video storage; segmented delivery for compliance |
| Swiggy / Meesho | Restaurant/seller how-to videos; product video ads on Meesho; delivery training content | Multi-resolution for mobile networks in Tier-2/3 cities with variable bandwidth |
| Adobe / Microsoft | Adobe Premiere Pro / Substance video pipeline; Microsoft Stream (corporate video hosting); Teams recording delivery; video conferencing recording | Large-scale transcoding; enterprise DRM; multi-format output |
| SAP Labs | Screen recording tutorial story above; corporate video tutorials for SAP product training; global distribution (Germany → Singapore latency) | Real incident; CDN globalisation impact; architecture evolution |

---

## 10. Related Topics — What to Study Next

- **Topic 308 — File Upload System** — raw video upload uses the same chunked S3 multipart upload pattern; the video platform's upload phase IS the file upload system; these two topics connect directly
- **Topic 307 — Real-time Dashboard** — video transcoding progress can be shown on a real-time dashboard using the same WebSocket/time-series pattern; "45% of videos transcoded" as a live metric
- **Topic 309 — Search System** — video metadata (title, transcript, tags) indexed in Elasticsearch for search; automatic caption generation feeds the search index with transcript content
- **Topic 313 — Infinite Scroll Feed** — the video feed (like YouTube's homepage or Netflix's browse page) uses the same infinite scroll + cursor pagination pattern as the feed design

---

*Part 19 · Video Streaming Platform — HLS, CDN, Adaptive Bitrate · Full Stack Interview Guide · Hruday D · 2026*
