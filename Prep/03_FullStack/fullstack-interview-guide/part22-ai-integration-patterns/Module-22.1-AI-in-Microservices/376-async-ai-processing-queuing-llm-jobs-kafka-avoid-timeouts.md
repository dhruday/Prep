# Async AI Processing — Queuing LLM Jobs via Kafka to Avoid Timeouts
> Part 22 — AI Integration Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The LLM timeout problem**: a typical LLM call takes 3-15 seconds; an HTTP API call is expected to complete in < 1-2 seconds; for long documents, batch analysis, or agent tasks (10+ second processing), synchronous HTTP will hit client timeouts, ALB timeouts (60s default), and gateway timeouts
- **Kafka solution**: accept the job synchronously → return `{jobId, status: PENDING}` immediately → publish to Kafka topic → LLM worker consumes from topic → processes asynchronously → writes result to DB → optional webhook or WebSocket notification to client
- **Job lifecycle**: `PENDING → PROCESSING → COMPLETED/FAILED`; client polls `GET /api/ai/jobs/{jobId}` or waits for a WebSocket push; polling is simpler; WebSocket is better UX for interactive features
- **When async is mandatory**: processing a 100-page PDF (60+ second job); multi-agent workflows (5-10 LLM calls per task); batch nightly generation (thousands of summaries); anything where p99 > 10 seconds
- **When async is NOT needed**: simple chat (< 3s, synchronous + SSE streaming is the right pattern); structured extraction on < 500 tokens; classification calls (< 1s); don't over-engineer synchronous workflows that work fine
- **Dead letter queue (DLQ) for LLM failures**: if an LLM job fails 3 times (provider error, rate limit, context limit exceeded), move to DLQ; operator reviews DLQ; never silently drop jobs since the user is waiting for a result

---

## 1. One-Line Definition
Async AI processing via Kafka decouples LLM job submission from execution, returning a jobId immediately and processing by a worker that can take as long as needed — solving HTTP timeout problems for LLM calls that exceed a few seconds.

---

## 2. Job Lifecycle

```
ASYNC AI JOB FLOW

Client
  → POST /api/ai/jobs
     body: {featureId, input, userId}
  
     Response in < 100ms:
     {jobId: "job-abc-123", status: "PENDING"}

Kafka Topic: "ai-job-requests"
  ↓
AI Worker Consumer
  → Set status to PROCESSING in jobs table
  → Execute LLM task (may take 5-60 seconds)
  → On success: write result to jobs table, status=COMPLETED
  → On failure: increment retry count; if >= 3 → DLQ

Client polls or waits for notification:
  → GET /api/ai/jobs/{jobId}
     {jobId, status: "COMPLETED", output: "...", completedAt: "..."}
  
  OR:
  → WebSocket: server pushes job_completed event
```

---

## 3. Implementation

```java
// Job submission endpoint
@RestController
@RequestMapping("/api/ai/jobs")
public class AiJobController {

    private final AiJobRepository jobRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    
    @PostMapping
    public ResponseEntity<JobSubmitResponse> submitJob(
        @RequestBody @Validated AiJobRequest request,
        @AuthenticationPrincipal UserDetails user
    ) {
        // Persist job record immediately
        AiJob job = jobRepository.save(AiJob.builder()
            .id(UUID.randomUUID().toString())
            .userId(user.getUsername())
            .featureId(request.featureId())
            .input(request.input())
            .status(JobStatus.PENDING)
            .submittedAt(Instant.now())
            .build());
        
        // Publish to Kafka (fire and forget from request thread)
        kafkaTemplate.send("ai-job-requests", job.getId(), 
            objectMapper.writeValueAsString(new AiJobMessage(job.getId(), request)));
        
        return ResponseEntity.accepted()
            .body(new JobSubmitResponse(job.getId(), "PENDING"));
    }
    
    @GetMapping("/{jobId}")
    public ResponseEntity<AiJobStatusResponse> getStatus(
        @PathVariable String jobId,
        @AuthenticationPrincipal UserDetails user
    ) {
        AiJob job = jobRepository.findById(jobId)
            .orElseThrow(() -> new JobNotFoundException(jobId));
        
        // Security: user can only see their own jobs
        if (!job.getUserId().equals(user.getUsername())) {
            return ResponseEntity.status(403).build();
        }
        
        return ResponseEntity.ok(AiJobStatusResponse.from(job));
    }
}

// Kafka consumer — AI worker
@KafkaListener(
    topics = "ai-job-requests",
    groupId = "ai-workers",
    concurrency = "5"   // 5 parallel workers
)
public void processJob(String jobMessageJson) {
    AiJobMessage message = objectMapper.readValue(jobMessageJson, AiJobMessage.class);
    AiJob job = jobRepository.findById(message.jobId()).orElseThrow();
    
    jobRepository.updateStatus(job.getId(), JobStatus.PROCESSING);
    
    try {
        String result = featureRoutingService.process(job);
        
        jobRepository.complete(job.getId(), result);
        notificationService.notifyJobComplete(job.getUserId(), job.getId());
        
    } catch (Exception e) {
        log.error("AI job failed. jobId={}", job.getId(), e);
        int retryCount = jobRepository.incrementRetry(job.getId());
        
        if (retryCount >= 3) {
            jobRepository.updateStatus(job.getId(), JobStatus.FAILED);
            // Also send to DLQ for operator review
            kafkaTemplate.send("ai-job-dlq", job.getId(), jobMessageJson);
        }
        // If retry < 3: exception propagates → Kafka retries via @RetryableTopic
    }
}
```

---

## 4. WebSocket Notification (Better UX than Polling)

```java
@Component
public class JobNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    
    // Called when job completes
    public void notifyJobComplete(String userId, String jobId) {
        messagingTemplate.convertAndSendToUser(
            userId,
            "/queue/job-updates",
            new JobUpdateMessage(jobId, "COMPLETED")
        );
    }
}

// React client
import { Client } from '@stomp/stompjs';

const client = new Client({ brokerURL: 'ws://localhost:8080/ws' });

client.onConnect = () => {
  client.subscribe(`/user/queue/job-updates`, (message) => {
    const update = JSON.parse(message.body);
    if (update.status === 'COMPLETED') {
      // Fetch the result and display to user
      fetchJobResult(update.jobId);
    }
  });
};
```

---

## 5. Wrong Way vs Right Way

```java
// ❌ Synchronous long-running LLM call
@PostMapping("/api/ai/summarise-document")
public String summarise(@RequestBody byte[] pdfBytes) {
    String text = pdfExtractor.extract(pdfBytes);  // May be 200 pages
    return llmService.summarise(text);  // 60 second LLM call
    // → ALB timeout at 60s
    // → Client times out before response arrives
    // → User sees 504 Gateway Timeout
}
```

```java
// ✅ Async job submission → poll for result
@PostMapping("/api/ai/jobs")
public ResponseEntity<JobSubmitResponse> submitSummariseJob(@RequestBody byte[] pdfBytes) {
    // Store PDF, publish job to Kafka, return jobId in < 100ms
    String pdfId = storageService.storePdf(pdfBytes);  // Put in S3/blob storage
    AiJob job = createJob("doc_summary", pdfId, currentUser());
    kafkaTemplate.send("ai-job-requests", job.getId(), toMessage(job));
    return ResponseEntity.accepted().body(new JobSubmitResponse(job.getId(), "PENDING"));
}
```

---

## 6. Retry and DLQ Strategy

```yaml
# application.yaml — Kafka retry topic
spring:
  kafka:
    consumer:
      group-id: ai-workers

# @RetryableTopic in the consumer handles retry + DLQ automatically
```

```java
@RetryableTopic(
    attempts = "3",
    backoff = @Backoff(delay = 2000, multiplier = 2.0),  // 2s, 4s, 8s
    dltTopicSuffix = "-dlq"   // Failed messages go to "ai-job-requests-dlq"
)
@KafkaListener(topics = "ai-job-requests", groupId = "ai-workers")
public void processJob(String jobMessageJson) {
    // ... processing logic ...
}
// DLQ consumer: alert operator, set job.status = FAILED, notify user
```

---

## 7. Scale Evolution

**Prototype →** Kafka with 1 partition, 1 consumer; polling for status; in-memory job store.

**Production →** Postgres jobs table; 5 consumer threads; `@RetryableTopic` with DLQ; WebSocket push for job completion; operator alerting on DLQ entries.

**High scale →** Kafka partitioned by `featureId` (separate partitions for fast vs slow features); dedicated consumer group per feature type; priority queue via separate topics (`ai-jobs-high-priority`, `ai-jobs-batch`); job status accessible via Redis cache for fast polling response.

---

## 8. Company Relevance

| Company | Async AI use case | Interview signal |
|---------|-----------------|-----------------|
| Razorpay / PhonePe | Fraud report generation, batch risk scoring, doc analysis | Kafka async; DLQ for financial jobs never silently dropped |
| Swiggy / Meesho | Nightly batch: generate product descriptions for new listings | Batch topic with lower priority; concurrency=10 workers |
| Adobe / Microsoft | Document export, large file analysis, async rendering | S3 for large PDF storage; pre-signed URL to worker |
| SAP Labs | Invoice processing, GL code suggestion for batch documents | Priority queue (SLA documents vs batch); webhook callback for ERP integration |

---

## 9. Interview Questions & Model Answers

### Q1 — How do you handle long-running LLM jobs without timeouts?
**Hruday:**
> "The pattern is accept-and-queue. The HTTP endpoint accepts the job, persists a job record with status PENDING, publishes the job to a Kafka topic, and returns the jobId in under 100ms. The Kafka consumer does the actual LLM processing asynchronously — it can take 60 seconds or 5 minutes without any timeout concern. When complete, it writes the result to the jobs table and pushes a WebSocket notification to the client. The client either polls `GET /api/ai/jobs/{jobId}` or awaits the WebSocket event. For failures, I use Kafka's `@RetryableTopic` with exponential backoff — 3 attempts; if all fail, the message goes to a DLQ and the operator is alerted rather than silently dropping a job the user is waiting for. The key UX consideration is setting proper expectations — the UI shows a progress state immediately after submission so the user doesn't wonder if their request was received."

---

*Part 22 · Async AI Processing — Queuing LLM Jobs via Kafka to Avoid Timeouts · Full Stack Interview Guide · Hruday D · 2026*
