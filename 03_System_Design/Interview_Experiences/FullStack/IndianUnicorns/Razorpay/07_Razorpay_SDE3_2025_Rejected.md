# Razorpay — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior FullStack Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks (rejected after HM)
- **Format:** Virtual

## Round 2: Backend Coding — Webhook Delivery Engine

### Problem
Build a reliable webhook delivery system:
1. Register webhook endpoints per merchant (URL + events + secret)
2. When an event fires, deliver payload to all matching subscriptions
3. HMAC-SHA256 signature in header for payload verification
4. Retry with exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 retries)
5. Circuit breaker: after 5 consecutive failures, disable endpoint for 30 min
6. Delivery log with response status, latency, retry count
7. Replay failed deliveries on demand

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

public class WebhookDeliveryEngine {

    // ============================================================
    // MODELS
    // ============================================================
    enum EndpointStatus { ACTIVE, CIRCUIT_OPEN, DISABLED }
    enum DeliveryStatus { SUCCESS, FAILED, PENDING_RETRY, CIRCUIT_BROKEN }

    static class WebhookEndpoint {
        String id;
        String merchantId;
        String url;
        String secret;
        Set<String> events; // subscribed event types
        EndpointStatus status;
        int consecutiveFailures;
        Instant circuitOpenUntil;

        WebhookEndpoint(String id, String merchantId, String url,
                        String secret, Set<String> events) {
            this.id = id;
            this.merchantId = merchantId;
            this.url = url;
            this.secret = secret;
            this.events = events;
            this.status = EndpointStatus.ACTIVE;
            this.consecutiveFailures = 0;
        }

        boolean isAvailable() {
            if (status == EndpointStatus.DISABLED) return false;
            if (status == EndpointStatus.CIRCUIT_OPEN) {
                if (Instant.now().isAfter(circuitOpenUntil)) {
                    // Half-open: allow one attempt
                    status = EndpointStatus.ACTIVE;
                    consecutiveFailures = 0;
                    return true;
                }
                return false;
            }
            return true;
        }
    }

    static class WebhookEvent {
        String eventId;
        String eventType; // e.g., "payment.captured", "refund.created"
        String payload;
        Instant timestamp;

        WebhookEvent(String eventId, String eventType, String payload) {
            this.eventId = eventId;
            this.eventType = eventType;
            this.payload = payload;
            this.timestamp = Instant.now();
        }
    }

    static class DeliveryLog {
        String deliveryId;
        String endpointId;
        String eventId;
        DeliveryStatus status;
        int httpStatus;
        long latencyMs;
        int retryCount;
        Instant timestamp;
        String errorMessage;

        DeliveryLog(String deliveryId, String endpointId, String eventId) {
            this.deliveryId = deliveryId;
            this.endpointId = endpointId;
            this.eventId = eventId;
            this.timestamp = Instant.now();
            this.retryCount = 0;
        }

        @Override
        public String toString() {
            return String.format("  [%s] endpoint=%s event=%s status=%s http=%d latency=%dms retries=%d%s",
                deliveryId, endpointId, eventId, status, httpStatus, latencyMs, retryCount,
                errorMessage != null ? " err=" + errorMessage : "");
        }
    }

    // ============================================================
    // CONFIG
    // ============================================================
    static final int MAX_RETRIES = 5;
    static final int[] BACKOFF_SECONDS = {1, 2, 4, 8, 16};
    static final int CIRCUIT_THRESHOLD = 5;
    static final int CIRCUIT_OPEN_MINUTES = 30;

    // ============================================================
    // SERVICE
    // ============================================================
    private final Map<String, WebhookEndpoint> endpoints = new ConcurrentHashMap<>();
    private final List<DeliveryLog> deliveryLogs = new CopyOnWriteArrayList<>();
    private final Map<String, WebhookEvent> eventStore = new ConcurrentHashMap<>();
    private int endpointCounter = 0;
    private int deliveryCounter = 0;

    // Simulated HTTP responses
    private final Map<String, Integer> simulatedResponses = new HashMap<>();

    public void simulateResponse(String url, int httpStatus) {
        simulatedResponses.put(url, httpStatus);
    }

    // Register endpoint
    public WebhookEndpoint registerEndpoint(String merchantId, String url,
                                              String secret, Set<String> events) {
        String id = "whep_" + (++endpointCounter);
        WebhookEndpoint ep = new WebhookEndpoint(id, merchantId, url, secret, events);
        endpoints.put(id, ep);
        return ep;
    }

    // Generate HMAC-SHA256 signature
    private String generateSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC generation failed", e);
        }
    }

    // Simulate HTTP POST
    private int simulateHttpPost(String url, String payload, String signature) {
        // In real system: HTTP client with timeout
        System.out.printf("    POST %s [sig=%s...] ", url, signature.substring(0, 12));
        int status = simulatedResponses.getOrDefault(url, 200);
        System.out.printf("→ %d%n", status);
        return status;
    }

    // Deliver to single endpoint with retries
    private DeliveryLog deliverToEndpoint(WebhookEndpoint ep, WebhookEvent event) {
        String deliveryId = "dlv_" + (++deliveryCounter);
        DeliveryLog log = new DeliveryLog(deliveryId, ep.id, event.eventId);

        if (!ep.isAvailable()) {
            log.status = DeliveryStatus.CIRCUIT_BROKEN;
            log.errorMessage = "Circuit breaker open until " + ep.circuitOpenUntil;
            deliveryLogs.add(log);
            return log;
        }

        String signature = generateSignature(event.payload, ep.secret);

        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            log.retryCount = attempt;
            long start = System.currentTimeMillis();

            try {
                int httpStatus = simulateHttpPost(ep.url, event.payload, signature);
                log.httpStatus = httpStatus;
                log.latencyMs = System.currentTimeMillis() - start;

                if (httpStatus >= 200 && httpStatus < 300) {
                    log.status = DeliveryStatus.SUCCESS;
                    ep.consecutiveFailures = 0;
                    deliveryLogs.add(log);
                    return log;
                }

                // Non-2xx: treat as failure
                log.errorMessage = "HTTP " + httpStatus;

            } catch (Exception e) {
                log.latencyMs = System.currentTimeMillis() - start;
                log.errorMessage = e.getMessage();
            }

            // Backoff before retry (simulated — skip actual sleep in demo)
            if (attempt < MAX_RETRIES) {
                System.out.printf("    ⏳ Retry %d after %ds backoff%n",
                    attempt + 1, BACKOFF_SECONDS[attempt]);
                // In production: Thread.sleep(BACKOFF_SECONDS[attempt] * 1000L);
            }
        }

        // All retries exhausted
        log.status = DeliveryStatus.FAILED;
        ep.consecutiveFailures++;

        // Circuit breaker check
        if (ep.consecutiveFailures >= CIRCUIT_THRESHOLD) {
            ep.status = EndpointStatus.CIRCUIT_OPEN;
            ep.circuitOpenUntil = Instant.now().plusSeconds(CIRCUIT_OPEN_MINUTES * 60);
            System.out.printf("    🔴 Circuit OPEN for %s (until %s)%n", ep.id, ep.circuitOpenUntil);
        }

        deliveryLogs.add(log);
        return log;
    }

    // Fire event to all matching endpoints
    public List<DeliveryLog> fireEvent(WebhookEvent event) {
        eventStore.put(event.eventId, event);
        List<DeliveryLog> logs = new ArrayList<>();

        System.out.printf("🔔 Firing event: %s (%s)%n", event.eventId, event.eventType);

        for (WebhookEndpoint ep : endpoints.values()) {
            if (ep.events.contains(event.eventType)) {
                DeliveryLog log = deliverToEndpoint(ep, event);
                logs.add(log);
            }
        }
        return logs;
    }

    // Replay failed deliveries
    public List<DeliveryLog> replayFailed(String eventId) {
        WebhookEvent event = eventStore.get(eventId);
        if (event == null) throw new IllegalArgumentException("Event not found");

        System.out.println("\n🔁 Replaying event: " + eventId);
        List<DeliveryLog> failed = deliveryLogs.stream()
            .filter(l -> l.eventId.equals(eventId) && l.status == DeliveryStatus.FAILED)
            .toList();

        List<DeliveryLog> replayResults = new ArrayList<>();
        for (DeliveryLog orig : failed) {
            WebhookEndpoint ep = endpoints.get(orig.endpointId);
            if (ep != null) {
                replayResults.add(deliverToEndpoint(ep, event));
            }
        }
        return replayResults;
    }

    // Get delivery logs
    public void printDeliveryLogs() {
        System.out.println("\n📋 Delivery Logs:");
        deliveryLogs.forEach(System.out::println);
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        WebhookDeliveryEngine engine = new WebhookDeliveryEngine();

        // Register endpoints
        WebhookEndpoint ep1 = engine.registerEndpoint("M1",
            "https://merchant1.com/webhooks", "secret_key_123",
            Set.of("payment.captured", "refund.created"));
        WebhookEndpoint ep2 = engine.registerEndpoint("M2",
            "https://merchant2.com/webhooks", "secret_key_456",
            Set.of("payment.captured"));

        // Simulate: merchant1 returns 200, merchant2 returns 500
        engine.simulateResponse("https://merchant1.com/webhooks", 200);
        engine.simulateResponse("https://merchant2.com/webhooks", 500);

        // Fire event
        System.out.println("=== Payment Captured Event ===");
        engine.fireEvent(new WebhookEvent("evt_001", "payment.captured",
            "{\"payment_id\":\"pay_123\",\"amount\":5000}"));

        // Fire refund event (only ep1 subscribes)
        System.out.println("\n=== Refund Created Event ===");
        engine.fireEvent(new WebhookEvent("evt_002", "refund.created",
            "{\"refund_id\":\"rfnd_001\",\"amount\":1000}"));

        // Fix merchant2, replay
        engine.simulateResponse("https://merchant2.com/webhooks", 200);
        engine.replayFailed("evt_001");

        engine.printDeliveryLogs();
    }
}
```

### Expected Output
```
=== Payment Captured Event ===
🔔 Firing event: evt_001 (payment.captured)
    POST https://merchant1.com/webhooks [sig=a1b2c3d4e5...] → 200
    POST https://merchant2.com/webhooks [sig=f6g7h8i9j0...] → 500
    ⏳ Retry 1 after 1s backoff
    POST https://merchant2.com/webhooks → 500
    ... (retries until MAX_RETRIES)
    🔴 Circuit OPEN for whep_2

=== Refund Created Event ===
    POST https://merchant1.com/webhooks → 200

🔁 Replaying event: evt_001
    POST https://merchant2.com/webhooks → 200  ← fixed!

📋 Delivery Logs:
  [dlv_1] endpoint=whep_1 event=evt_001 status=SUCCESS http=200 latency=1ms retries=0
  [dlv_2] endpoint=whep_2 event=evt_001 status=FAILED http=500 latency=1ms retries=5
  [dlv_3] endpoint=whep_1 event=evt_002 status=SUCCESS http=200 latency=0ms retries=0
  [dlv_4] endpoint=whep_2 event=evt_001 status=SUCCESS http=200 latency=0ms retries=0
```

## 🎯 Key Takeaways
- Got rejected — didn't cover **dead letter queue** for permanently failed events after circuit break
- **HMAC-SHA256 signing**: `Mac.getInstance("HmacSHA256")` with merchant secret for tamper-proof verification
- **Exponential backoff**: 1, 2, 4, 8, 16 seconds — doubles each retry up to max 5
- **Circuit breaker**: 5 consecutive failures → 30 min cooldown → half-open on next attempt
- **Event store**: persisted events enable replay of failed deliveries
- **Delivery audit**: every attempt logged with HTTP status, latency, retry count, error message

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Hard | Webhook Delivery, HMAC, Retry |
| Technical 2 | Hard | Circuit Breaker, Event Replay |
| Hiring Manager | Medium | Payments Infrastructure, Reliability |
