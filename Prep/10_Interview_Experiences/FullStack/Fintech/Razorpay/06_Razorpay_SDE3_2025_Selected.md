# Razorpay — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Backend Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Payments Core |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + LLD + System Design + HM)

---

## Round 2: LLD — Design a Webhook Retry Engine with Dead Letter Queue

```java
import java.util.*;
import java.util.concurrent.*;
import java.time.Instant;

/**
 * Webhook Retry Engine:
 * 
 * When a payment event occurs, Razorpay sends a webhook to the merchant.
 * If delivery fails, retry with exponential backoff.
 * After max retries, move to Dead Letter Queue (DLQ) for manual inspection.
 * 
 * Key features:
 * - Exponential backoff: 1min, 5min, 30min, 2hr, 12hr, 24hr
 * - HMAC signature for request authenticity
 * - Idempotency key in header
 * - Merchant-specific rate limiting
 * - DLQ for permanently failed webhooks
 * - Dashboard for webhook delivery status
 */

enum WebhookStatus { PENDING, DELIVERED, RETRYING, FAILED, DLQ }

class WebhookEvent {
    final String id;
    final String merchantId;
    final String eventType; // "payment.captured", "payment.failed", etc.
    final String payload;   // JSON payload
    final String url;       // Merchant's webhook endpoint
    final String secret;    // HMAC secret for this merchant
    final long createdAt;
    
    int attemptCount;
    WebhookStatus status;
    long nextRetryAt;
    String lastError;
    List<WebhookAttempt> attempts;
    
    WebhookEvent(String merchantId, String eventType, String payload, String url, String secret) {
        this.id = UUID.randomUUID().toString();
        this.merchantId = merchantId;
        this.eventType = eventType;
        this.payload = payload;
        this.url = url;
        this.secret = secret;
        this.createdAt = System.currentTimeMillis();
        this.attemptCount = 0;
        this.status = WebhookStatus.PENDING;
        this.attempts = new ArrayList<>();
    }
}

class WebhookAttempt {
    final int attemptNumber;
    final long timestamp;
    final int httpStatus;
    final long responseTimeMs;
    final String error;
    final boolean success;
    
    WebhookAttempt(int attemptNumber, int httpStatus, long responseTimeMs, String error) {
        this.attemptNumber = attemptNumber;
        this.timestamp = System.currentTimeMillis();
        this.httpStatus = httpStatus;
        this.responseTimeMs = responseTimeMs;
        this.error = error;
        this.success = httpStatus >= 200 && httpStatus < 300;
    }
}

class WebhookRetryEngine {
    
    // Retry schedule: exponential backoff in milliseconds
    private static final long[] RETRY_DELAYS_MS = {
        60_000,         // 1 minute
        300_000,        // 5 minutes
        1_800_000,      // 30 minutes
        7_200_000,      // 2 hours
        43_200_000,     // 12 hours
        86_400_000      // 24 hours
    };
    
    private static final int MAX_RETRIES = RETRY_DELAYS_MS.length;
    private static final long DELIVERY_TIMEOUT_MS = 10_000; // 10 second timeout
    
    // Queues
    private final PriorityBlockingQueue<WebhookEvent> retryQueue;
    private final ConcurrentLinkedQueue<WebhookEvent> deadLetterQueue;
    
    // Storage
    private final ConcurrentHashMap<String, WebhookEvent> allEvents;
    
    // Rate limiting per merchant (max webhooks per second)
    private final ConcurrentHashMap<String, RateLimiter> merchantRateLimiters;
    
    // Thread pool for delivery
    private final ExecutorService deliveryPool;
    private final ScheduledExecutorService scheduler;
    
    public WebhookRetryEngine() {
        // Priority queue ordered by nextRetryAt (soonest first)
        retryQueue = new PriorityBlockingQueue<>(100, 
            Comparator.comparingLong(e -> e.nextRetryAt));
        deadLetterQueue = new ConcurrentLinkedQueue<>();
        allEvents = new ConcurrentHashMap<>();
        merchantRateLimiters = new ConcurrentHashMap<>();
        deliveryPool = Executors.newFixedThreadPool(20);
        scheduler = Executors.newScheduledThreadPool(2);
        
        // Start retry processor
        startRetryProcessor();
    }
    
    /**
     * Enqueue a new webhook for delivery.
     */
    public void enqueue(WebhookEvent event) {
        event.status = WebhookStatus.PENDING;
        event.nextRetryAt = System.currentTimeMillis(); // Deliver immediately
        allEvents.put(event.id, event);
        retryQueue.offer(event);
    }
    
    /**
     * Background thread that processes the retry queue.
     * Polls events whose nextRetryAt has passed.
     */
    private void startRetryProcessor() {
        scheduler.scheduleAtFixedRate(() -> {
            long now = System.currentTimeMillis();
            
            while (!retryQueue.isEmpty()) {
                WebhookEvent event = retryQueue.peek();
                if (event == null || event.nextRetryAt > now) break;
                
                retryQueue.poll();
                
                // Rate limit check per merchant
                RateLimiter limiter = merchantRateLimiters.computeIfAbsent(
                    event.merchantId, id -> new RateLimiter(10)); // 10 req/sec
                
                if (!limiter.tryAcquire()) {
                    // Rate limited — push back 1 second
                    event.nextRetryAt = now + 1000;
                    retryQueue.offer(event);
                    continue;
                }
                
                // Deliver asynchronously
                deliveryPool.submit(() -> deliver(event));
            }
        }, 0, 1, TimeUnit.SECONDS);
    }
    
    /**
     * Attempt to deliver a webhook.
     */
    private void deliver(WebhookEvent event) {
        event.attemptCount++;
        long startTime = System.currentTimeMillis();
        
        try {
            // Generate HMAC signature
            String signature = generateHMAC(event.payload, event.secret);
            
            // Simulate HTTP POST to merchant URL
            // In production: HttpClient with timeout
            int httpStatus = simulateHttpPost(event.url, event.payload, signature);
            
            long responseTime = System.currentTimeMillis() - startTime;
            WebhookAttempt attempt = new WebhookAttempt(
                event.attemptCount, httpStatus, responseTime, null);
            event.attempts.add(attempt);
            
            if (attempt.success) {
                event.status = WebhookStatus.DELIVERED;
                return;
            }
            
            // Non-success: schedule retry or DLQ
            handleFailure(event, "HTTP " + httpStatus);
            
        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            WebhookAttempt attempt = new WebhookAttempt(
                event.attemptCount, 0, responseTime, e.getMessage());
            event.attempts.add(attempt);
            
            handleFailure(event, e.getMessage());
        }
    }
    
    private void handleFailure(WebhookEvent event, String error) {
        event.lastError = error;
        
        if (event.attemptCount >= MAX_RETRIES) {
            // Move to DLQ
            event.status = WebhookStatus.DLQ;
            deadLetterQueue.offer(event);
            // Alert: notify ops team
            return;
        }
        
        // Schedule retry with exponential backoff
        int retryIndex = Math.min(event.attemptCount - 1, RETRY_DELAYS_MS.length - 1);
        long delay = RETRY_DELAYS_MS[retryIndex];
        
        // Add jitter (±10%) to prevent thundering herd
        long jitter = (long) (delay * 0.1 * (Math.random() * 2 - 1));
        
        event.nextRetryAt = System.currentTimeMillis() + delay + jitter;
        event.status = WebhookStatus.RETRYING;
        retryQueue.offer(event);
    }
    
    /**
     * Manually retry a DLQ event.
     */
    public boolean retryFromDLQ(String eventId) {
        WebhookEvent event = allEvents.get(eventId);
        if (event == null || event.status != WebhookStatus.DLQ) return false;
        
        event.attemptCount = 0; // Reset counter
        event.status = WebhookStatus.PENDING;
        event.nextRetryAt = System.currentTimeMillis();
        retryQueue.offer(event);
        return true;
    }
    
    /**
     * HMAC-SHA256 signature generation.
     */
    private String generateHMAC(String payload, String secret) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(
                secret.getBytes(), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("HMAC generation failed", e);
        }
    }
    
    private int simulateHttpPost(String url, String payload, String signature) {
        // Simulated — in production use HttpClient
        return (int) (Math.random() * 100) < 80 ? 200 : 500;
    }
    
    // ---- Rate Limiter (Token Bucket) ----
    
    static class RateLimiter {
        private final int maxTokens;
        private double tokens;
        private long lastRefill;
        
        RateLimiter(int tokensPerSecond) {
            this.maxTokens = tokensPerSecond;
            this.tokens = tokensPerSecond;
            this.lastRefill = System.nanoTime();
        }
        
        synchronized boolean tryAcquire() {
            refill();
            if (tokens >= 1) {
                tokens--;
                return true;
            }
            return false;
        }
        
        private void refill() {
            long now = System.nanoTime();
            double elapsed = (now - lastRefill) / 1_000_000_000.0;
            tokens = Math.min(maxTokens, tokens + elapsed * maxTokens);
            lastRefill = now;
        }
    }
}
```

---

## 🎯 Key Takeaways
- Razorpay SDE-3 = **Webhook retry engine with exponential backoff, DLQ, HMAC, rate limiting**
- **Exponential backoff**: 1m→5m→30m→2h→12h→24h — total ~39 hours of retries before DLQ
- **Jitter**: ±10% randomization on delay — prevents thundering herd when all retries align
- **PriorityBlockingQueue**: ordered by `nextRetryAt` — efficiently process due retries
- **HMAC-SHA256**: merchant verifies webhook authenticity — `signature` header in HTTP POST
- **Per-merchant rate limiting**: token bucket 10 req/sec — prevents overwhelming a slow merchant endpoint
- **DLQ**: manually retriable — ops dashboard shows failed webhooks for investigation
- **10s timeout**: don't block delivery thread on slow merchants — fail fast and retry later
- Razorpay = **payment infrastructure** — webhooks, reconciliation, settlement engine, PCI compliance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| LLD | Very Hard | Webhook Engine, Retry, DLQ |
| System Design | Very Hard | Payment Infrastructure |
| HM | Medium | Culture Fit |
