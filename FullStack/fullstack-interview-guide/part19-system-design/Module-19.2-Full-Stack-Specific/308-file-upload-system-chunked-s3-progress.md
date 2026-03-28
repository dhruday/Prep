# File Upload System — Chunked Upload, S3, Progress Tracking
> Part 19 — System Design Case Studies · ✅ Hruday's Strength
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why chunked upload**: large files (> 100MB video, CAD file, dataset) can't be uploaded in one HTTP request reliably; mobile connection drop at 95% = start over; chunked upload splits file into chunks (5–10MB each); upload chunk by chunk; if connection drops, resume from last successful chunk
- **Pre-signed S3 URL**: don't upload through your server — generate a temporary S3 URL (valid 1 hour), let the client upload directly to S3; your backend never handles the file bytes; removes bandwidth bottleneck from your server
- **Chunked upload with S3**: use S3 Multipart Upload API; `CreateMultipartUpload` → get uploadId; upload each part with `UploadPart` (min 5MB per part except last); `CompleteMultipartUpload` → S3 assembles the parts; abort if upload times out
- **Progress tracking**: track at chunk level not byte level; store `{uploadId, completedParts, totalParts, status}` in Redis; frontend polls upload status endpoint or uses SSE; show "45% uploaded" from completed parts
- **Resume**: client stores `uploadId` and `lastCompletedChunkIndex` in localStorage; on reconnect, call `ListParts` on S3 to see which parts are already uploaded; skip them, resume from the gap
- **Post-upload processing**: virus scan (ClamAV / cloud provider scanning), image resize, video transcode — always async; webhook or SSE notification when processing completes; never block the upload response waiting for post-processing
- **File metadata**: store in PostgreSQL — `(id, userId, originalName, s3Key, size, mimeType, status, createdAt)`; s3Key is the path in S3; never expose bucket structure to clients
- **Security**: validate file type by magic bytes (not extension); set Content-Disposition: "attachment" not "inline" for user-uploaded files (prevents browser rendering HTML/JS); presigned URLs with expiry; IAM policy: least privilege (upload only the specific key, not all of S3)

---

## 1. One-Line Definition
A file upload system handles large file ingestion by generating pre-signed S3 URLs for direct client-to-S3 transfer, splitting large uploads into resumable multipart chunks, tracking progress in Redis, and triggering async post-processing (virus scan, resize, transcode) via Kafka once the upload completes.

---

## 2. The Problem It Solves

A document management system lets users upload PDF reports up to 500MB. The naive implementation streams the entire file body through the API server. Problems:

1. The API server's memory/disk handles 500MB × concurrent uploads — a pod with 50 concurrent uploads buffers 25GB
2. A mobile user on a slow connection uploads 490MB of a 500MB file. Connection drops for 5 seconds. Upload restarts from 0
3. The post-upload virus scan takes 45 seconds for a large file — the user waits 45 seconds on a loading spinner before getting "upload successful"
4. The server is the bottleneck — S3 upload bandwidth is shared across all users through one server's NIC

The chunked + pre-signed URL pattern solves all four: server never touches file bytes, resumption from last chunk, async post-processing, and each user uploads direct to S3 at full speed.

---

## 3. How It Works Internally

### Upload Flow (Multipart S3)

```
Phase 1: Initiate
  Client → POST /uploads/initiate
    { filename: "report.pdf", size: 524288000, mimeType: "application/pdf" }
    
  Server:
    1. Validate: mimeType allowlist, size limit check
    2. Call S3 CreateMultipartUpload → get uploadId, s3Key
    3. Save to DB: { id, userId, s3Key, uploadId, status: INITIATED, totalChunks: 100 }
    4. Save to Redis: { completedParts: [], status: IN_PROGRESS }
    
  Response: { uploadId: "s3-uid", fileId: "db-uuid", chunkSize: 5MB, totalChunks: 100 }
  
Phase 2: Upload chunks
  For chunk i = 0 to 99:
    Client → GET /uploads/{fileId}/chunk-url?partNumber={i+1}
      Server: Call S3 UploadPart presign → return pre-signed PUT URL (30 min TTL)
      
    Client → PUT {presignedUrl} with chunk bytes (direct to S3, no server involved)
    
    Client → POST /uploads/{fileId}/chunk-complete { partNumber: i+1, etag: "..." }
      Server: 
        HINCRBY Redis completedParts +1
        Store etag for this part
  
Phase 3: Complete
  Client → POST /uploads/{fileId}/complete
    Server:
      Call S3 CompleteMultipartUpload(uploadId, [{partNumber, etag}...])
      Update DB status: PROCESSING
      Publish Kafka event: file.uploaded
      Response: { fileId, status: PROCESSING }

Phase 4: Post-process (async)
  Kafka consumer: virus scan → resize/transcode → update DB status READY
  SSE to client: { fileId, status: READY, downloadUrl: presignedGetUrl }
```

---

## 4. The Code

### Wrong Way — Stream All Bytes Through Server

```java
// ❌ Entire file streamed through your API server

@PostMapping("/upload")
public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
    
    // ❌ file.getBytes() loads entire 500MB file into JVM heap
    byte[] bytes = file.getBytes();  // OutOfMemoryError at scale
    
    // ❌ Your server is now the bottleneck — every byte goes through your NIC twice
    String key = "uploads/" + UUID.randomUUID() + "/" + file.getOriginalFilename();
    s3Client.putObject(PutObjectRequest.builder().bucket(bucket).key(key).build(),
                       RequestBody.fromBytes(bytes));
    
    // ❌ No chunking — mobile network drop at 95% = upload restarts from 0
    // ❌ No progress tracking
    // ❌ Extension-based MIME type check — bypass with rename trick
    if (!file.getOriginalFilename().endsWith(".pdf")) {
        return ResponseEntity.badRequest().body("PDF only");  // ❌ trivially bypassed
    }
    
    return ResponseEntity.ok(key);
}
```

```java
// ✅ Pre-signed URL + S3 Multipart Upload

@RestController
@RequestMapping("/uploads")
public class UploadController {
    private final UploadService uploadService;
    private final S3MultipartService s3Multipart;
    
    // ✅ Phase 1: Initiate upload — return uploadId + metadata
    @PostMapping("/initiate")
    public ResponseEntity<UploadInitResponse> initiateUpload(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody @Valid UploadInitRequest req) {
        
        // ✅ Server-side validation: allowed MIME types, max size
        uploadService.validateUploadRequest(req);
        
        return ResponseEntity.ok(uploadService.initiateUpload(user.getUsername(), req));
    }
    
    // ✅ Phase 2a: Get pre-signed URL for a specific chunk
    @GetMapping("/{fileId}/chunk-url")
    public ResponseEntity<ChunkUrlResponse> getChunkUrl(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String fileId,
            @RequestParam int partNumber) {
        
        // ✅ Verify user owns this upload before generating URL
        uploadService.assertOwnership(user.getUsername(), fileId);
        
        String presignedUrl = s3Multipart.getPresignedPartUrl(fileId, partNumber);
        return ResponseEntity.ok(new ChunkUrlResponse(presignedUrl, 1800));  // 30 min TTL
    }
    
    // ✅ Phase 2b: Record chunk completion (ETag from S3 response)
    @PostMapping("/{fileId}/chunk-complete")
    public ResponseEntity<Void> recordChunkComplete(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String fileId,
            @RequestBody ChunkCompleteRequest req) {
        
        uploadService.recordChunkComplete(fileId, req.getPartNumber(), req.getEtag());
        return ResponseEntity.ok().build();
    }
    
    // ✅ Phase 3: Complete the multipart upload
    @PostMapping("/{fileId}/complete")
    public ResponseEntity<UploadCompleteResponse> completeUpload(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String fileId) {
        
        UploadCompleteResponse resp = uploadService.completeUpload(user.getUsername(), fileId);
        return ResponseEntity.ok(resp);
    }
    
    // ✅ Progress polling endpoint
    @GetMapping("/{fileId}/progress")
    public ResponseEntity<UploadProgress> getProgress(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String fileId) {
        
        return ResponseEntity.ok(uploadService.getProgress(fileId));
    }
}

@Service
public class UploadService {
    private final S3Client s3;
    private final StringRedisTemplate redis;
    private final FileUploadRepository repository;
    private final KafkaTemplate<String, FileUploadedEvent> kafkaTemplate;
    
    @Value("${aws.s3.bucket}") private String bucket;
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "application/pdf", "image/jpeg", "image/png", "image/webp",
        "application/zip", "video/mp4"
    );
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024 * 1024; // 5GB
    private static final int CHUNK_SIZE_BYTES = 5 * 1024 * 1024;       // 5MB min for S3
    
    public void validateUploadRequest(UploadInitRequest req) {
        if (!ALLOWED_MIME_TYPES.contains(req.getMimeType())) {
            throw new InvalidFileTypeException(req.getMimeType());
        }
        if (req.getSize() > MAX_FILE_SIZE) {
            throw new FileSizeLimitException(req.getSize(), MAX_FILE_SIZE);
        }
    }
    
    public UploadInitResponse initiateUpload(String userId, UploadInitRequest req) {
        String fileId  = UUID.randomUUID().toString();
        // ✅ Server controls the S3 key — never trust client-provided filenames in the path
        String s3Key   = "uploads/" + userId + "/" + fileId + "/" + sanitizeFilename(req.getFilename());
        int totalChunks = (int) Math.ceil((double) req.getSize() / CHUNK_SIZE_BYTES);
        
        // ✅ Create S3 multipart upload — get uploadId
        CreateMultipartUploadResponse s3Response = s3.createMultipartUpload(
            CreateMultipartUploadRequest.builder()
                .bucket(bucket)
                .key(s3Key)
                .contentType(req.getMimeType())
                // ✅ Force download instead of browser render — prevents XSS via HTML files
                .contentDisposition("attachment; filename=\"" + sanitizeFilename(req.getFilename()) + "\"")
                .serverSideEncryption(ServerSideEncryption.AES256)
                .build()
        );
        
        FileUpload upload = FileUpload.builder()
            .id(fileId)
            .userId(userId)
            .s3Key(s3Key)
            .s3UploadId(s3Response.uploadId())
            .originalName(sanitizeFilename(req.getFilename()))
            .mimeType(req.getMimeType())
            .size(req.getSize())
            .totalChunks(totalChunks)
            .status(UploadStatus.INITIATED)
            .createdAt(Instant.now())
            .build();
        
        repository.save(upload);
        
        // ✅ Track progress in Redis KV — hash per fileId
        redis.opsForHash().put("upload:" + fileId, "completedChunks", "0");
        redis.opsForHash().put("upload:" + fileId, "totalChunks", String.valueOf(totalChunks));
        redis.opsForHash().put("upload:" + fileId, "status", "IN_PROGRESS");
        redis.expire("upload:" + fileId, Duration.ofHours(24));
        
        return new UploadInitResponse(fileId, totalChunks, CHUNK_SIZE_BYTES);
    }
    
    public void recordChunkComplete(String fileId, int partNumber, String etag) {
        FileUpload upload = repository.findById(fileId).orElseThrow();
        
        // ✅ Store etag in Redis list for later CompleteMultipartUpload call
        redis.opsForHash().put("upload:" + fileId + ":etags", 
                               String.valueOf(partNumber), etag);
        redis.opsForHash().increment("upload:" + fileId, "completedChunks", 1);
    }
    
    @Transactional
    public UploadCompleteResponse completeUpload(String userId, String fileId) {
        FileUpload upload = repository.findByIdAndUserId(fileId, userId).orElseThrow();
        
        // ✅ Gather all ETags in order
        Map<Object, Object> etags = redis.opsForHash()
            .entries("upload:" + fileId + ":etags");
        
        List<CompletedPart> completedParts = etags.entrySet().stream()
            .map(e -> CompletedPart.builder()
                .partNumber(Integer.parseInt((String) e.getKey()))
                .eTag((String) e.getValue())
                .build())
            .sorted(Comparator.comparing(CompletedPart::partNumber))
            .collect(toList());
        
        // ✅ Tell S3 to assemble all parts
        s3.completeMultipartUpload(CompleteMultipartUploadRequest.builder()
            .bucket(bucket)
            .key(upload.getS3Key())
            .uploadId(upload.getS3UploadId())
            .multipartUpload(m -> m.parts(completedParts))
            .build());
        
        upload.setStatus(UploadStatus.PROCESSING);
        repository.save(upload);
        
        // ✅ Trigger async post-processing
        kafkaTemplate.send("file.uploaded", fileId, 
            new FileUploadedEvent(fileId, userId, upload.getS3Key(), upload.getMimeType(), upload.getSize()));
        
        // ✅ Clean up Redis tracking state
        redis.delete("upload:" + fileId);
        redis.delete("upload:" + fileId + ":etags");
        
        return new UploadCompleteResponse(fileId, UploadStatus.PROCESSING);
    }
    
    private String sanitizeFilename(String filename) {
        // ✅ Strip path traversal characters; keep alphanumeric, dash, dot, underscore
        return filename.replaceAll("[^a-zA-Z0-9.\\-_]", "_");
    }
}

// ✅ Async post-processing: virus scan + image resize
@KafkaListener(topics = "file.uploaded", groupId = "file-processor")
@Service
public class FileProcessingWorker {
    private final VirusScanService virusScan;
    private final ImageResizeService imageResize;
    private final FileUploadRepository repository;
    private final SseNotificationService sseNotification;
    
    @KafkaHandler
    public void process(FileUploadedEvent event) {
        
        // ✅ Virus scan before making file accessible
        ScanResult scan = virusScan.scan(event.getS3Key());
        if (!scan.isClean()) {
            repository.updateStatus(event.getFileId(), UploadStatus.REJECTED_MALWARE);
            // ✅ Delete the infected file from S3 immediately
            s3.deleteObject(b -> b.bucket(bucket).key(event.getS3Key()));
            sseNotification.notifyUser(event.getUserId(), 
                new FileStatusUpdate(event.getFileId(), UploadStatus.REJECTED_MALWARE, null));
            return;
        }
        
        // ✅ Image resizing: create thumbnail variants
        if (event.getMimeType().startsWith("image/")) {
            imageResize.createThumbnails(event.getS3Key(), List.of(200, 400, 800));
        }
        
        repository.updateStatus(event.getFileId(), UploadStatus.READY);
        
        // ✅ Notify user via SSE that file is ready
        String downloadUrl = generatePresignedGetUrl(event.getS3Key(), Duration.ofHours(1));
        sseNotification.notifyUser(event.getUserId(), 
            new FileStatusUpdate(event.getFileId(), UploadStatus.READY, downloadUrl));
    }
}
```

```typescript
// ✅ Frontend: chunked upload with resume + progress tracking

async function uploadFileWithResume(file: File, onProgress: (pct: number) => void) {
    const CHUNK_SIZE = 5 * 1024 * 1024;  // 5MB per chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    // ✅ Check localStorage for a previous incomplete upload of this file
    const cacheKey = `upload_${file.name}_${file.size}`;
    const savedState = localStorage.getItem(cacheKey);
    let fileId: string;
    let startChunkIndex: number;
    
    if (savedState) {
        const saved = JSON.parse(savedState);
        fileId = saved.fileId;
        // ✅ Ask server which chunks are already uploaded
        const progress = await api.get<UploadProgress>(`/uploads/${fileId}/progress`);
        startChunkIndex = progress.completedChunks;
    } else {
        // ✅ New upload: initiate
        const init = await api.post<UploadInitResponse>('/uploads/initiate', {
            filename: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream'
        });
        fileId = init.fileId;
        startChunkIndex = 0;
        localStorage.setItem(cacheKey, JSON.stringify({ fileId, filename: file.name, size: file.size }));
    }
    
    onProgress((startChunkIndex / totalChunks) * 100);
    
    // ✅ Upload each chunk
    for (let i = startChunkIndex; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end   = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        // ✅ Get pre-signed URL for this specific part (1-indexed for S3)
        const { url } = await api.get<ChunkUrlResponse>(
            `/uploads/${fileId}/chunk-url?partNumber=${i + 1}`
        );
        
        // ✅ Upload directly to S3 — no server in the path
        const s3Response = await fetch(url, {
            method: 'PUT',
            body: chunk,
            headers: { 'Content-Type': file.type || 'application/octet-stream' }
        });
        
        if (!s3Response.ok) throw new Error(`Chunk ${i + 1} upload failed`);
        
        // ✅ ETag comes back in S3 response headers
        const etag = s3Response.headers.get('ETag')!.replace(/"/g, '');
        
        // ✅ Tell server this chunk is done
        await api.post(`/uploads/${fileId}/chunk-complete`, { partNumber: i + 1, etag });
        
        onProgress(((i + 1) / totalChunks) * 100);
    }
    
    // ✅ Finalise: tell server all chunks are done
    await api.post(`/uploads/${fileId}/complete`);
    
    // ✅ Clean up localStorage — upload complete
    localStorage.removeItem(cacheKey);
    
    return fileId;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why pre-signed URLs instead of proxying through your server?"

**Hruday's answer:**
> Three reasons: bandwidth, latency, and cost.
>
> Bandwidth: if you proxy through your server, every uploaded byte travels twice — client to server, server to S3. Your server's network bandwidth is a shared resource. One user uploading a 1GB video could saturate the network for everyone. With pre-signed URLs, client uploads directly to S3 over AWS's massive global backbone — your server handles zero bytes of the file itself.
>
> Latency: your API server isn't co-located with the S3 bucket. File goes client → New York server → US-East S3. With pre-signed URL, it goes client → nearest S3 edge via AWS's accelerated transfer (Transfer Acceleration) if enabled.
>
> Cost and resources: you're not paying for egress from your server to S3 (you would if proxying). More importantly, uploading large files through your server ties up HTTP threads, memory buffers, and disk I/O — all of which could serve other requests instead.
>
> Security: pre-signed URL has a short TTL (typically 15-30 minutes) and is scoped to a specific S3 key. It can't be reused to upload different files. The IAM policy behind it only allows PutObject on that exact key — no other S3 operations.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does the resume logic work if the client closes the browser mid-upload?"

**Hruday's answer:**
> Resume works because S3 keeps track of uploaded parts for an in-progress multipart upload. Parts don't disappear when the client disconnects — S3 holds them until either the multipart upload is completed or aborted.
>
> Client side: before starting the upload, I store `{fileId, filename, size}` in localStorage. If the user refreshes or closes and reopens the tab, the code checks localStorage for this key on mount.
>
> On resume: the client calls my server's `/uploads/{fileId}/progress` which checks Redis (or, if Redis expired, queries S3's ListParts API to see which parts are already uploaded). The response maps S3 part data to chunk indices, telling the client the exact part it should resume from.
>
> The client re-slices the file from `lastChunk * chunkSize` bytes, gets a new pre-signed URL for the next part, and continues. S3 ListParts returns ETags for completed parts, so the complete call later can include all of them correctly.
>
> Expiry: S3 multipart uploads expire after 7 days if not completed. I store the `expiresAt` in metadata and check it on resume. If it's within 24h of expiry, I abort and reinitiate rather than racing the deadline.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use chunked upload?"

**Hruday's answer:**
> For small files — anything under 10MB. The overhead of multipart initiation (one extra HTTP round-trip), per-chunk pre-signed URL requests, and CompleteMultipartUpload call is significant when the file itself would transfer in 1-2 seconds. For a profile picture upload or document thumbnail, a direct PUT via a single pre-signed URL or a simple multipart form POST is simpler and faster.
>
> Also, S3 Multipart Upload has a minimum part size of 5MB for all parts except the last. If you're chunking a 3MB file into chunks to implement resume, you can't use S3 multipart directly — you'd have to store the file temporarily and do a final single PUT. At that size there's no meaningful resume benefit anyway.
>
> Rule of thumb: below 10MB → single pre-signed PUT URL. Above 10MB → multipart with chunk size = max(5MB, fileSize/1000) to keep part count reasonable. Above 100MB → definitely multipart, consider parallel multi-chunk uploads (upload 4 chunks in parallel to max bandwidth).

---

### Q4 — System Design Angle
**Interviewer asks:** "How would you handle 10 million file uploads per day with varied file sizes (1KB to 10GB)?"

**Hruday's answer:**
> First, separate the system behaviour by file size tier.
>
> Small files (< 10MB, probably 90% of uploads): single pre-signed PUT URL, direct to S3. No multipart. Server only involved in URL generation and metadata recording. Very lightweight.
>
> Large files (10MB–10GB): full multipart upload with the chunked flow. Parallel chunk uploads — browser uploads 4 chunks concurrently to max bandwidth. Progress tracked in Redis.
>
> Infrastructure: 10M uploads/day = ~115 uploads/second average; peaks might be 10x that. The initiation and completion endpoints are the only ones my servers handle — the actual bytes go to S3 directly. So my server only needs to handle ~115 req/sec for metadata operations, which is well within 2-3 small pods with Redis and PostgreSQL backing. The upload bandwidth load is entirely on S3 — which is built for billions of objects.
>
> Post-processing: a Kafka topic `file.uploaded` triggers a pool of workers for scanning and resizing. Auto-scale workers based on queue depth. For video transcoding (expensive), use a dedicated job queue (SQS + ECS Fargate or AWS Elastic Transcoder) rather than your application pods — separation of concerns and cost.
>
> Storage tier: hot (just uploaded, being processed) → S3 Standard. After 30 days inactive → S3 Standard-IA. After 1 year → S3 Glacier. Lifecycle policies handle transitions automatically. 10M files/day × 365 days × average 1MB = 3.65 petabytes/year — S3 Glacier archiving cuts cost by 95% for old files.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Extension-based file type validation | "I'll check if the filename ends in .pdf or .png to validate file type" | File extensions are trivially faked — rename virus.exe to report.pdf; file type validation must use magic bytes (first ~16 bytes of the file that indicate format); for uploads via the server, use Apache Tika or a similar magic-bytes library; for direct S3 uploads, the server can't inspect bytes on upload; instead, the post-upload virus scan step reads the actual file header; additionally, the Content-Type header set by the client is untrustworthy — validate the actual content post-upload |
| No abort cleanup | "I'll create the multipart upload and the client uploads; if they never finish, it's fine" | Incomplete S3 multipart uploads do NOT disappear — S3 charges for the storage of unfinished parts; a user who starts 1,000 uploads and abandons them leaves 1,000 × parts × 5MB = hundreds of GB of billable orphaned storage; always set an S3 lifecycle rule: `AbortIncompleteMultipartUploads` after 7 days; also have a background job that marks DB records as ABANDONED and calls S3 AbortMultipartUpload for uploads that haven't seen activity in 24h |
| Content-Disposition not set | "I'll generate a pre-signed GET URL for users to download their file" | If user uploads an HTML file and the response serves it as Content-Type: text/html without attachment disposition, the browser renders it — stored XSS; an attacker uploads an HTML file with JavaScript, shares the S3 link, and the viewer's account gets hijacked; always set Content-Disposition: attachment on user-uploaded files; set it when creating the multipart upload (Content-Disposition header); for images legitimately displayed inline, whitelist the MIME types explicitly |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I built the document upload feature for a project management tool where users attached large CAD files and technical specifications (some over 500MB). We first implemented direct server upload — the server received the file, wrote it to disk, then streamed it to S3. During a user acceptance test, a consultant tried uploading a 1.2GB CAD file. The upload took 18 minutes, the nginx proxy timeout was 15 minutes, and the connection dropped. They lost 18 minutes of upload time and had to restart.
>
> We switched to S3 multipart with pre-signed URLs. The same file uploaded in 4 minutes (direct to S3, no server bottleneck). When we demoed resume: they uploaded 800MB, yanked the ethernet cable, plugged back in, and it resumed from chunk 160 out of 240. They were impressed. The server pods went from handling full file bytes to handling only metadata requests — pod memory usage during uploads dropped 95%."

---

## 8. Scale Evolution

**1,000 users →** Simple pre-signed PUT URL for files < 100MB. For larger files, stream through server (acceptable at low volume). Store metadata in PostgreSQL. No chunking complexity needed.

**100,000 users →** S3 multipart upload for files > 10MB. Pre-signed URLs for all uploads. Redis for progress tracking. Basic virus scan before making files accessible. Async post-processing via Spring `@Async`.

**10 million uploads/day →** Full chunked upload with parallel chunks. S3 lifecycle policies for storage tiering (Standard → Standard-IA → Glacier). Kafka for post-processing fan-out. Dedicated transcode service for video. S3 Transfer Acceleration for global user base. Auto-scaling workers keyed to Kafka consumer lag. Upload abuse protection: rate limit by userId and IP.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | KYC document upload (Aadhaar, PAN, bank statement); large transaction statement uploads from merchants; compliance documents; video verification recordings | Secure upload; virus scan; compliance-grade handling |
| Swiggy / Meesho | Restaurant menu image uploads; product catalogue images (Meesho sellers upload thousands of images); delivery proof photos | High-volume small file uploads; image resize/CDN pipeline |
| Adobe / Microsoft | Adobe Creative Cloud file sync; SharePoint document uploads; OneDrive chunked upload (their exact product); Figma asset library uploads | Large file handling; resume; Microsoft's large-scale chunked upload product |
| SAP Labs | CAD file attachment story above; SAP project documentation; technical specification uploads; compliance audit document storage | Real incident narrative; architectural evolution |

---

## 10. Related Topics — What to Study Next

- **Topic 307 — Real-time Dashboard** — SSE used for upload progress notification when post-processing completes; same SSE infrastructure from the dashboard topic applies here for "your file is ready" notifications
- **Topic 310 — Video Streaming Platform** — video files uploaded via this system; after upload, transcoding to HLS is the next step in the video pipeline; this topic is the "input" to the video streaming topic
- **Topic 302 — Rate Limiter** — file upload endpoints need rate limiting; 100 upload initiations/hour per user prevents abuse; large upload bandwidth should be rate-limited per account plan (free: 10GB/month, pro: 100GB/month)
- **Topic 71 — Circuit Breaker (Resilience4j)** — virus scan and transcode services are external dependencies; if the virus scanner is slow/down, circuit breaker prevents upload completion from hanging; fast-fail with appropriate fallback behaviour

---

*Part 19 · File Upload System — Chunked Upload, S3, Progress Tracking · Full Stack Interview Guide · Hruday D · 2026*
