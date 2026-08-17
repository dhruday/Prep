# Razorpay — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-3 |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Machine Coding — Build an Idempotent Payment Processing Pipeline
**Duration:** 90 minutes

### Problem
Implement a payment processing system with:
- Idempotency keys to prevent duplicate payments
- State machine for payment lifecycle (CREATED → AUTHORIZED → CAPTURED → SETTLED)
- Retry with exponential backoff for gateway failures
- Webhook notification delivery with at-least-once guarantees

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.math.*;

public class PaymentPipeline {

    enum PaymentState {
        CREATED, AUTHORIZED, CAPTURED, SETTLED, FAILED, REFUNDED;

        static final Map<PaymentState, Set<PaymentState>> TRANSITIONS = Map.of(
            CREATED, Set.of(AUTHORIZED, FAILED),
            AUTHORIZED, Set.of(CAPTURED, FAILED, REFUNDED),
            CAPTURED, Set.of(SETTLED, REFUNDED),
            SETTLED, Set.of(REFUNDED),
            FAILED, Set.of(CREATED), // Retry
            REFUNDED, Set.of()
        );

        boolean canTransitionTo(PaymentState target) {
            return TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
        }
    }

    static class Payment {
        final String paymentId;
        final String idempotencyKey;
        final String merchantId;
        final BigDecimal amount;
        final String currency;
        volatile PaymentState state;
        final long createdAt;
        int attemptCount;
        String gatewayRef;
        List<StateTransition> history = new CopyOnWriteArrayList<>();

        Payment(String paymentId, String idempotencyKey, String merchantId,
                BigDecimal amount, String currency) {
            this.paymentId = paymentId;
            this.idempotencyKey = idempotencyKey;
            this.merchantId = merchantId;
            this.amount = amount;
            this.currency = currency;
            this.state = PaymentState.CREATED;
            this.createdAt = System.currentTimeMillis();
        }
    }

    static class StateTransition {
        PaymentState from;
        PaymentState to;
        long timestamp;
        String reason;

        StateTransition(PaymentState from, PaymentState to, String reason) {
            this.from = from;
            this.to = to;
            this.timestamp = System.currentTimeMillis();
            this.reason = reason;
        }
    }

    private final ConcurrentHashMap<String, Payment> payments = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> idempotencyIndex = new ConcurrentHashMap<>();
    private final List<WebhookSubscription> webhookSubscribers = new CopyOnWriteArrayList<>();
    private final ScheduledExecutorService retryExecutor;
    private int paymentCounter = 0;
    private static final int MAX_RETRIES = 3;

    public PaymentPipeline() {
        this.retryExecutor = Executors.newScheduledThreadPool(4);
    }

    /**
     * Create payment with idempotency.
     * If same idempotency key used, return existing payment.
     */
    public Payment createPayment(String idempotencyKey, String merchantId,
                                  BigDecimal amount, String currency) {
        // Idempotency check
        String existingId = idempotencyIndex.get(idempotencyKey);
        if (existingId != null) {
            return payments.get(existingId);
        }

        String paymentId = generatePaymentId();
        Payment payment = new Payment(paymentId, idempotencyKey, merchantId, amount, currency);

        // Atomic insertion with idempotency
        String previous = idempotencyIndex.putIfAbsent(idempotencyKey, paymentId);
        if (previous != null) {
            // Race condition: another thread created with same key
            return payments.get(previous);
        }

        payments.put(paymentId, payment);
        payment.history.add(new StateTransition(null, PaymentState.CREATED, "Payment created"));

        return payment;
    }

    /**
     * Authorize payment via payment gateway.
     * Uses retry with exponential backoff on failure.
     */
    public CompletableFuture<Payment> authorize(String paymentId) {
        Payment payment = payments.get(paymentId);
        if (payment == null) throw new IllegalArgumentException("Payment not found");

        return CompletableFuture.supplyAsync(() -> {
            return executeWithRetry(payment, () -> {
                // Simulate gateway call
                boolean success = callGateway(payment, "authorize");

                if (success) {
                    transition(payment, PaymentState.AUTHORIZED, "Gateway authorized");
                    payment.gatewayRef = "GW-" + UUID.randomUUID().toString().substring(0, 8);
                } else {
                    transition(payment, PaymentState.FAILED, "Gateway authorization failed");
                }

                return payment;
            });
        });
    }

    /**
     * Capture an authorized payment.
     */
    public Payment capture(String paymentId) {
        Payment payment = payments.get(paymentId);
        if (payment == null) throw new IllegalArgumentException("Payment not found");
        if (payment.state != PaymentState.AUTHORIZED) {
            throw new IllegalStateException("Cannot capture from state: " + payment.state);
        }

        boolean success = callGateway(payment, "capture");
        if (success) {
            transition(payment, PaymentState.CAPTURED, "Payment captured");
            // Schedule settlement
            retryExecutor.schedule(() -> settle(paymentId), 1, TimeUnit.SECONDS);
        } else {
            transition(payment, PaymentState.FAILED, "Capture failed");
        }

        return payment;
    }

    /**
     * Settle a captured payment (finalize funds transfer).
     */
    public Payment settle(String paymentId) {
        Payment payment = payments.get(paymentId);
        if (payment == null || payment.state != PaymentState.CAPTURED) return payment;

        transition(payment, PaymentState.SETTLED, "Funds settled to merchant");
        return payment;
    }

    /**
     * Transition payment state with validation and audit trail.
     */
    private synchronized void transition(Payment payment, PaymentState newState, String reason) {
        if (!payment.state.canTransitionTo(newState)) {
            throw new IllegalStateException(
                String.format("Invalid transition: %s → %s", payment.state, newState));
        }

        PaymentState oldState = payment.state;
        payment.state = newState;
        payment.history.add(new StateTransition(oldState, newState, reason));

        // Send webhooks
        notifyWebhooks(payment, oldState, newState);
    }

    /**
     * Retry with exponential backoff.
     */
    private Payment executeWithRetry(Payment payment, Callable<Payment> action) {
        int maxAttempts = MAX_RETRIES;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                payment.attemptCount = attempt;
                return action.call();
            } catch (Exception e) {
                if (attempt < maxAttempts) {
                    long backoffMs = (long) (Math.pow(2, attempt) * 100 + Math.random() * 100);
                    try { Thread.sleep(backoffMs); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    transition(payment, PaymentState.FAILED, "Max retries exceeded: " + e.getMessage());
                }
            }
        }
        return payment;
    }

    // === Webhook System ===

    static class WebhookSubscription {
        String merchantId;
        String url;
        Set<PaymentState> events;

        WebhookSubscription(String merchantId, String url, Set<PaymentState> events) {
            this.merchantId = merchantId;
            this.url = url;
            this.events = events;
        }
    }

    public void registerWebhook(String merchantId, String url, Set<PaymentState> events) {
        webhookSubscribers.add(new WebhookSubscription(merchantId, url, events));
    }

    private void notifyWebhooks(Payment payment, PaymentState from, PaymentState to) {
        for (WebhookSubscription sub : webhookSubscribers) {
            if (sub.merchantId.equals(payment.merchantId) && sub.events.contains(to)) {
                retryExecutor.submit(() -> deliverWebhook(sub, payment, from, to, 0));
            }
        }
    }

    private void deliverWebhook(WebhookSubscription sub, Payment payment,
                                  PaymentState from, PaymentState to, int attempt) {
        try {
            // Simulate HTTP POST to webhook URL
            System.out.printf("[Webhook] %s: %s %s→%s (₹%s)%n",
                sub.url, payment.paymentId, from, to, payment.amount);
            // In production: HTTP POST with HMAC signature
        } catch (Exception e) {
            if (attempt < 5) {
                long delay = (long) Math.pow(2, attempt + 1);
                retryExecutor.schedule(
                    () -> deliverWebhook(sub, payment, from, to, attempt + 1),
                    delay, TimeUnit.SECONDS);
            }
        }
    }

    private boolean callGateway(Payment payment, String action) {
        // Simulate gateway with 90% success rate
        return Math.random() > 0.1;
    }

    private synchronized String generatePaymentId() {
        return "pay_" + String.format("%08d", ++paymentCounter);
    }

    public void shutdown() { retryExecutor.shutdown(); }

    public static void main(String[] args) throws Exception {
        PaymentPipeline pipeline = new PaymentPipeline();

        pipeline.registerWebhook("merchant_1", "https://merchant.com/webhook",
            Set.of(PaymentState.AUTHORIZED, PaymentState.CAPTURED, PaymentState.SETTLED));

        // Create payment
        Payment p = pipeline.createPayment("idem_12345", "merchant_1",
            new BigDecimal("999.00"), "INR");
        System.out.println("Created: " + p.paymentId + " state=" + p.state);

        // Idempotency test
        Payment p2 = pipeline.createPayment("idem_12345", "merchant_1",
            new BigDecimal("999.00"), "INR");
        System.out.println("Same key: " + (p.paymentId.equals(p2.paymentId))); // true

        // Authorize
        pipeline.authorize(p.paymentId).get(5, TimeUnit.SECONDS);
        System.out.println("After authorize: " + p.state);

        // Capture
        if (p.state == PaymentState.AUTHORIZED) {
            pipeline.capture(p.paymentId);
            System.out.println("After capture: " + p.state);
        }

        Thread.sleep(2000); // Wait for settlement

        // Print history
        System.out.println("\nPayment History:");
        p.history.forEach(h -> System.out.printf("  %s → %s: %s%n", h.from, h.to, h.reason));

        pipeline.shutdown();
    }
}
```

## 🎯 Key Takeaways
- Razorpay focuses on **payment processing** — state machines and idempotency are essential
- Payment state machine: CREATED → AUTHORIZED → CAPTURED → SETTLED (with FAILED and REFUNDED branches)
- **Idempotency key** with `putIfAbsent` handles race conditions atomically
- Exponential backoff with jitter for retry: `2^attempt * 100 + random(100)`
- Webhook delivery must be at-least-once with retry queue
- BigDecimal for all monetary values — never use floating point

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | State Machine, Idempotency, Retry |
| System Design | Hard | Payment Gateway Architecture |
| HM | Medium | Behavioral, Leadership |
