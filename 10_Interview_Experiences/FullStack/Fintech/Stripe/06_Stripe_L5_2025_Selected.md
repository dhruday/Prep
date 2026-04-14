# Stripe — L5 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Software Engineer |
| **Level** | L5 |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | San Francisco, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Payments Core |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Bug Squash + Integration + System Design + Technical Deep Dive + HM)

---

## Round 2: Integration Coding — Build a Webhook Delivery System with Retry and Signature Verification
**Duration:** 60 minutes

### Challenge: Build a webhook delivery system that: sends events to merchant endpoints, uses HMAC-SHA256 for signature verification, implements exponential backoff retries, tracks delivery status, supports multiple endpoints per event type.

```java
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.net.http.*;
import java.net.URI;
import java.time.Instant;

/**
 * Stripe-Style Webhook Delivery System:
 * 
 * 1. Merchant registers endpoints per event type
 * 2. Event fires → create WebhookDelivery → sign → send
 * 3. Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 64s, ... max 24h
 * 4. Signature: HMAC-SHA256(timestamp + "." + payload, secret)
 * 5. Max retries: 8 (configurable)
 * 6. Dead letter after max retries exhausted
 */

class WebhookEndpoint {
    String id;
    String merchantId;
    String url;
    String secret; // Signing secret (whsec_...)
    Set<String> enabledEvents; // e.g., ["payment_intent.succeeded", "charge.dispute.created"]
    boolean active;
    
    WebhookEndpoint(String id, String merchantId, String url, String secret, Set<String> events) {
        this.id = id; this.merchantId = merchantId; this.url = url;
        this.secret = secret; this.enabledEvents = events; this.active = true;
    }
}

class WebhookEvent {
    String id;          // "evt_..." unique event ID
    String type;        // "payment_intent.succeeded"
    String merchantId;
    String payload;     // JSON string
    long createdAt;
    
    WebhookEvent(String id, String type, String merchantId, String payload) {
        this.id = id; this.type = type; this.merchantId = merchantId;
        this.payload = payload; this.createdAt = Instant.now().getEpochSecond();
    }
}

class WebhookDelivery {
    String id;
    String eventId;
    String endpointId;
    String url;
    int attemptCount;
    int maxRetries;
    String status; // PENDING, SUCCEEDED, FAILED, DEAD_LETTER
    long nextRetryAt;
    long lastAttemptAt;
    int lastHttpStatus;
    String lastError;
    List<DeliveryAttempt> attempts;
    
    WebhookDelivery(String id, WebhookEvent event, WebhookEndpoint endpoint) {
        this.id = id; this.eventId = event.id; this.endpointId = endpoint.id;
        this.url = endpoint.url; this.attemptCount = 0; this.maxRetries = 8;
        this.status = "PENDING"; this.attempts = new ArrayList<>();
    }
}

class DeliveryAttempt {
    int attemptNumber;
    long timestamp;
    int httpStatusCode;
    String error;
    long durationMs;
    
    DeliveryAttempt(int num, int status, String error, long duration) {
        this.attemptNumber = num; this.timestamp = Instant.now().getEpochSecond();
        this.httpStatusCode = status; this.error = error; this.durationMs = duration;
    }
}

class WebhookDeliverySystem {
    
    private final Map<String, WebhookEndpoint> endpoints = new ConcurrentHashMap<>();
    private final Map<String, WebhookDelivery> deliveries = new ConcurrentHashMap<>();
    private final Queue<WebhookDelivery> retryQueue = new ConcurrentLinkedQueue<>();
    private final List<WebhookDelivery> deadLetterQueue = new CopyOnWriteArrayList<>();
    
    // Exponential backoff delays (seconds): 1, 2, 4, 8, 16, 32, 64, 128
    private static final int[] RETRY_DELAYS = {1, 2, 4, 8, 16, 32, 64, 128};
    
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    
    // ---- Endpoint Management ----
    
    void registerEndpoint(WebhookEndpoint endpoint) {
        endpoints.put(endpoint.id, endpoint);
    }
    
    void disableEndpoint(String endpointId) {
        WebhookEndpoint ep = endpoints.get(endpointId);
        if (ep != null) ep.active = false;
    }
    
    // ---- Event Dispatch ----
    
    /**
     * Dispatch an event to all matching endpoints.
     */
    void dispatchEvent(WebhookEvent event) {
        for (WebhookEndpoint endpoint : endpoints.values()) {
            if (!endpoint.active) continue;
            if (!endpoint.merchantId.equals(event.merchantId)) continue;
            if (!endpoint.enabledEvents.contains(event.type) && 
                !endpoint.enabledEvents.contains("*")) continue;
            
            WebhookDelivery delivery = new WebhookDelivery(
                "whd_" + UUID.randomUUID().toString().substring(0, 8),
                event, endpoint);
            
            deliveries.put(delivery.id, delivery);
            
            // Attempt immediate delivery
            attemptDelivery(delivery, event, endpoint);
        }
    }
    
    /**
     * Attempt to deliver a webhook.
     */
    void attemptDelivery(WebhookDelivery delivery, WebhookEvent event, WebhookEndpoint endpoint) {
        delivery.attemptCount++;
        delivery.lastAttemptAt = Instant.now().getEpochSecond();
        
        long startTime = System.currentTimeMillis();
        
        try {
            // Build signed payload
            long timestamp = Instant.now().getEpochSecond();
            String signedPayload = timestamp + "." + event.payload;
            String signature = computeHmacSha256(signedPayload, endpoint.secret);
            
            // Build request headers (Stripe-style)
            // Stripe-Signature: t=timestamp,v1=signature
            String signatureHeader = "t=" + timestamp + ",v1=" + signature;
            
            // Simulate HTTP POST (in real implementation: HttpClient.send())
            int httpStatus = simulateHttpPost(endpoint.url, event.payload, signatureHeader);
            long duration = System.currentTimeMillis() - startTime;
            
            delivery.lastHttpStatus = httpStatus;
            delivery.attempts.add(new DeliveryAttempt(
                delivery.attemptCount, httpStatus, null, duration));
            
            if (httpStatus >= 200 && httpStatus < 300) {
                delivery.status = "SUCCEEDED";
            } else {
                handleFailure(delivery, event, endpoint, "HTTP " + httpStatus);
            }
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            delivery.lastError = e.getMessage();
            delivery.attempts.add(new DeliveryAttempt(
                delivery.attemptCount, 0, e.getMessage(), duration));
            
            handleFailure(delivery, event, endpoint, e.getMessage());
        }
    }
    
    void handleFailure(WebhookDelivery delivery, WebhookEvent event, WebhookEndpoint endpoint, String error) {
        delivery.lastError = error;
        
        if (delivery.attemptCount >= delivery.maxRetries) {
            delivery.status = "DEAD_LETTER";
            deadLetterQueue.add(delivery);
            
            // Optionally disable endpoint after consecutive failures
            long recentFailures = deliveries.values().stream()
                .filter(d -> d.endpointId.equals(endpoint.id) && "DEAD_LETTER".equals(d.status))
                .count();
            
            if (recentFailures >= 5) {
                endpoint.active = false;
            }
        } else {
            // Schedule retry with exponential backoff
            int delayIdx = Math.min(delivery.attemptCount - 1, RETRY_DELAYS.length - 1);
            int delaySec = RETRY_DELAYS[delayIdx];
            
            // Add jitter (±20%)
            int jitter = (int) (delaySec * 0.2 * (Math.random() * 2 - 1));
            int actualDelay = Math.max(1, delaySec + jitter);
            
            delivery.nextRetryAt = Instant.now().getEpochSecond() + actualDelay;
            delivery.status = "PENDING";
            
            scheduler.schedule(() -> attemptDelivery(delivery, event, endpoint),
                              actualDelay, TimeUnit.SECONDS);
        }
    }
    
    // ---- Signature ----
    
    /**
     * HMAC-SHA256 signature computation.
     * Stripe-style: sign "timestamp.payload" with endpoint secret.
     */
    String computeHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            
            // Convert to hex
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }
    
    /**
     * Verify webhook signature (merchant-side).
     * Protects against replay attacks: check timestamp is recent.
     */
    boolean verifySignature(String payload, String signatureHeader, String secret) {
        // Parse "t=timestamp,v1=signature"
        Map<String, String> parts = new HashMap<>();
        for (String part : signatureHeader.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2) parts.put(kv[0], kv[1]);
        }
        
        String timestamp = parts.get("t");
        String providedSignature = parts.get("v1");
        
        if (timestamp == null || providedSignature == null) return false;
        
        // Replay protection: reject if timestamp is too old (5 minutes)
        long now = Instant.now().getEpochSecond();
        long ts = Long.parseLong(timestamp);
        if (Math.abs(now - ts) > 300) return false;
        
        // Compute expected signature
        String expectedSignature = computeHmacSha256(timestamp + "." + payload, secret);
        
        // Constant-time comparison (prevent timing attacks)
        return constantTimeEquals(expectedSignature, providedSignature);
    }
    
    boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
    
    // Simulation
    int simulateHttpPost(String url, String payload, String signature) {
        return Math.random() > 0.3 ? 200 : 500;
    }
    
    // ---- Monitoring ----
    
    List<WebhookDelivery> getDeadLetterQueue() {
        return Collections.unmodifiableList(deadLetterQueue);
    }
    
    /** Retry a dead-lettered delivery (manual intervention). */
    void retryDeadLetter(String deliveryId) {
        WebhookDelivery delivery = deliveries.get(deliveryId);
        if (delivery != null && "DEAD_LETTER".equals(delivery.status)) {
            delivery.status = "PENDING";
            delivery.attemptCount = 0;
            deadLetterQueue.remove(delivery);
        }
    }
}
```

---

## 🎯 Key Takeaways
- Stripe L5 = **Webhook delivery system — HMAC signing, exponential backoff, dead letter queue**
- **HMAC-SHA256 signing**: `HMAC(timestamp + "." + payload, secret)` — Stripe's actual signing scheme
- **Signature header**: `Stripe-Signature: t=timestamp,v1=signature` — parse and verify
- **Replay protection**: reject if timestamp > 5 minutes old — prevents replaying captured webhooks
- **Constant-time comparison**: XOR all chars, check result == 0 — prevents timing side-channel attacks
- **Exponential backoff**: 1, 2, 4, 8, 16, 32, 64, 128 seconds + ±20% jitter — reduces thundering herd
- **Dead letter queue**: after 8 retries → DLQ. 5 consecutive DLQs → auto-disable endpoint
- **Endpoint matching**: merchantId + event type (or wildcard `*`) — event routing

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bug Squash | Hard | Payment debugging |
| Integration (this) | Hard | Webhooks, Crypto, Retry Logic |
| System Design | Very Hard | Payment Platform at Scale |
| Technical Deep Dive | Hard | Concurrency + Correctness |
| HM | Medium | Culture |
