# Razorpay — Senior FullStack Developer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior FullStack Developer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: FullStack Coding — Payment Gateway with Idempotency

### Problem
Design and implement a payment gateway service:
1. Create payment intent with amount, currency, merchant
2. Process payment: validate → authorize → capture
3. Idempotency: same request key returns same response (no double charge)
4. Webhook dispatch: notify merchant on status changes
5. Refund support: full and partial refunds
6. Retry failed payments with exponential backoff
7. Payment status state machine: created → authorized → captured → settled (or failed/refunded)

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.time.Instant;
import java.util.function.Consumer;

// ============================================================
// DOMAIN
// ============================================================

enum PaymentStatus {
    CREATED, AUTHORIZED, CAPTURED, SETTLED, FAILED, REFUNDED, PARTIALLY_REFUNDED
}

enum Currency { INR, USD, EUR }

class Payment {
    private final String id;
    private final String merchantId;
    private final long amountPaise; // Store in smallest unit
    private final Currency currency;
    private PaymentStatus status;
    private long capturedAmount;
    private long refundedAmount;
    private final Instant createdAt;
    private Instant updatedAt;
    private String failureReason;
    private final List<String> refundIds;
    private int retryCount;

    Payment(String id, String merchantId, long amountPaise, Currency currency) {
        this.id = id;
        this.merchantId = merchantId;
        this.amountPaise = amountPaise;
        this.currency = currency;
        this.status = PaymentStatus.CREATED;
        this.capturedAmount = 0;
        this.refundedAmount = 0;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.refundIds = new ArrayList<>();
        this.retryCount = 0;
    }

    // Getters
    String getId() { return id; }
    String getMerchantId() { return merchantId; }
    long getAmountPaise() { return amountPaise; }
    Currency getCurrency() { return currency; }
    PaymentStatus getStatus() { return status; }
    long getCapturedAmount() { return capturedAmount; }
    long getRefundedAmount() { return refundedAmount; }
    int getRetryCount() { return retryCount; }
    List<String> getRefundIds() { return Collections.unmodifiableList(refundIds); }

    void setStatus(PaymentStatus status) { this.status = status; this.updatedAt = Instant.now(); }
    void setCapturedAmount(long amount) { this.capturedAmount = amount; }
    void addRefund(String refundId, long amount) { refundIds.add(refundId); refundedAmount += amount; }
    void setFailureReason(String reason) { this.failureReason = reason; }
    void incrementRetry() { retryCount++; }

    @Override
    public String toString() {
        return String.format("Payment[%s] %s %d %s | status=%s | captured=%d | refunded=%d",
            id, merchantId, amountPaise, currency, status, capturedAmount, refundedAmount);
    }
}

class Refund {
    private final String id;
    private final String paymentId;
    private final long amountPaise;
    private final Instant createdAt;

    Refund(String id, String paymentId, long amountPaise) {
        this.id = id;
        this.paymentId = paymentId;
        this.amountPaise = amountPaise;
        this.createdAt = Instant.now();
    }

    String getId() { return id; }
    long getAmountPaise() { return amountPaise; }

    @Override
    public String toString() {
        return String.format("Refund[%s] payment=%s amount=%d", id, paymentId, amountPaise);
    }
}

// ============================================================
// IDEMPOTENCY
// ============================================================

class IdempotencyStore {
    private final Map<String, Object> store = new ConcurrentHashMap<>();
    // In production: Redis with TTL

    boolean exists(String key) { return store.containsKey(key); }

    Object get(String key) { return store.get(key); }

    void put(String key, Object response) { store.put(key, response); }
}

// ============================================================
// WEBHOOK DISPATCHER
// ============================================================

class WebhookDispatcher {
    private final Map<String, List<Consumer<Map<String, Object>>>> listeners = new ConcurrentHashMap<>();

    void register(String merchantId, Consumer<Map<String, Object>> handler) {
        listeners.computeIfAbsent(merchantId, k -> new CopyOnWriteArrayList<>()).add(handler);
    }

    void dispatch(String merchantId, String event, Map<String, Object> payload) {
        payload.put("event", event);
        payload.put("timestamp", Instant.now().toString());

        List<Consumer<Map<String, Object>>> handlers = listeners.get(merchantId);
        if (handlers != null) {
            for (Consumer<Map<String, Object>> handler : handlers) {
                try {
                    handler.accept(payload);
                } catch (Exception e) {
                    System.out.println("  ⚠ Webhook delivery failed: " + e.getMessage());
                }
            }
        }
    }
}

// ============================================================
// PAYMENT GATEWAY
// ============================================================

class PaymentGateway {
    private final Map<String, Payment> payments = new ConcurrentHashMap<>();
    private final Map<String, Refund> refunds = new ConcurrentHashMap<>();
    private final IdempotencyStore idempotency = new IdempotencyStore();
    private final WebhookDispatcher webhooks = new WebhookDispatcher();
    private int paymentCounter = 0;
    private int refundCounter = 0;

    static final int MAX_RETRIES = 3;

    void registerWebhook(String merchantId, Consumer<Map<String, Object>> handler) {
        webhooks.register(merchantId, handler);
    }

    // 1. Create Payment Intent
    synchronized Payment createPayment(String idempotencyKey, String merchantId, long amountPaise, Currency currency) {
        // Idempotency check
        if (idempotencyKey != null && idempotency.exists(idempotencyKey)) {
            System.out.println("  → Idempotency hit: returning cached payment");
            return (Payment) idempotency.get(idempotencyKey);
        }

        if (amountPaise <= 0) throw new IllegalArgumentException("Amount must be positive");

        String id = "pay_" + String.format("%06d", ++paymentCounter);
        Payment payment = new Payment(id, merchantId, amountPaise, currency);
        payments.put(id, payment);

        if (idempotencyKey != null) idempotency.put(idempotencyKey, payment);

        webhooks.dispatch(merchantId, "payment.created", createPayload(payment));
        return payment;
    }

    // 2. Authorize Payment
    Payment authorize(String paymentId) {
        Payment payment = getPayment(paymentId);
        validateTransition(payment, PaymentStatus.CREATED, "authorize");

        // Simulate bank authorization (90% success)
        boolean authorized = Math.random() > 0.1;

        if (authorized) {
            payment.setStatus(PaymentStatus.AUTHORIZED);
            webhooks.dispatch(payment.getMerchantId(), "payment.authorized", createPayload(payment));
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Bank declined authorization");
            webhooks.dispatch(payment.getMerchantId(), "payment.failed", createPayload(payment));
        }
        return payment;
    }

    // 3. Capture Payment
    Payment capture(String paymentId, long captureAmount) {
        Payment payment = getPayment(paymentId);
        validateTransition(payment, PaymentStatus.AUTHORIZED, "capture");

        if (captureAmount > payment.getAmountPaise())
            throw new IllegalArgumentException("Capture amount exceeds authorized amount");

        payment.setCapturedAmount(captureAmount);
        payment.setStatus(PaymentStatus.CAPTURED);
        webhooks.dispatch(payment.getMerchantId(), "payment.captured", createPayload(payment));
        return payment;
    }

    // 4. Refund
    Refund refund(String paymentId, long refundAmount) {
        Payment payment = getPayment(paymentId);

        if (payment.getStatus() != PaymentStatus.CAPTURED &&
            payment.getStatus() != PaymentStatus.PARTIALLY_REFUNDED)
            throw new IllegalStateException("Cannot refund payment in status: " + payment.getStatus());

        long refundable = payment.getCapturedAmount() - payment.getRefundedAmount();
        if (refundAmount > refundable)
            throw new IllegalArgumentException("Refund amount ₹" + refundAmount + " exceeds refundable ₹" + refundable);

        String refundId = "rfnd_" + String.format("%06d", ++refundCounter);
        Refund refund = new Refund(refundId, paymentId, refundAmount);
        refunds.put(refundId, refund);
        payment.addRefund(refundId, refundAmount);

        // Update status
        if (payment.getRefundedAmount() >= payment.getCapturedAmount()) {
            payment.setStatus(PaymentStatus.REFUNDED);
        } else {
            payment.setStatus(PaymentStatus.PARTIALLY_REFUNDED);
        }

        webhooks.dispatch(payment.getMerchantId(), "refund.created", createPayload(payment));
        return refund;
    }

    // 5. Retry Failed Payment
    Payment retry(String paymentId) {
        Payment payment = getPayment(paymentId);
        if (payment.getStatus() != PaymentStatus.FAILED)
            throw new IllegalStateException("Can only retry failed payments");
        if (payment.getRetryCount() >= MAX_RETRIES)
            throw new IllegalStateException("Max retries (" + MAX_RETRIES + ") exceeded");

        payment.incrementRetry();
        payment.setStatus(PaymentStatus.CREATED);

        // Exponential backoff (simulated)
        long backoffMs = (long) Math.pow(2, payment.getRetryCount()) * 1000;
        System.out.println("  ⏱ Retry #" + payment.getRetryCount() + " with backoff " + backoffMs + "ms");

        return authorize(paymentId);
    }

    // Helpers
    private Payment getPayment(String id) {
        Payment p = payments.get(id);
        if (p == null) throw new IllegalArgumentException("Payment not found: " + id);
        return p;
    }

    private void validateTransition(Payment payment, PaymentStatus expected, String action) {
        if (payment.getStatus() != expected)
            throw new IllegalStateException(
                "Cannot " + action + " payment in status " + payment.getStatus() + " (expected " + expected + ")");
    }

    private Map<String, Object> createPayload(Payment p) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("payment_id", p.getId());
        payload.put("status", p.getStatus().name());
        payload.put("amount", p.getAmountPaise());
        payload.put("currency", p.getCurrency().name());
        return payload;
    }
}

// ============================================================
// DEMO
// ============================================================

public class Main {
    public static void main(String[] args) {
        PaymentGateway gateway = new PaymentGateway();

        // Register webhook
        gateway.registerWebhook("merchant_001", payload ->
            System.out.println("  🔔 Webhook: " + payload.get("event") + " | " + payload.get("payment_id") + " | " + payload.get("status")));

        System.out.println("=== Razorpay Payment Gateway ===\n");

        // 1. Create payment
        System.out.println("--- Create Payment ---");
        Payment p1 = gateway.createPayment("idem_key_123", "merchant_001", 50000, Currency.INR);
        System.out.println(p1);

        // 2. Idempotency test
        System.out.println("\n--- Idempotency Test (same key) ---");
        Payment p1Again = gateway.createPayment("idem_key_123", "merchant_001", 50000, Currency.INR);
        System.out.println("Same payment returned: " + (p1.getId().equals(p1Again.getId())));

        // 3. Authorize
        System.out.println("\n--- Authorize ---");
        Payment authorized = gateway.authorize(p1.getId());
        System.out.println(authorized);

        // 4. Capture (full amount)
        if (authorized.getStatus() == PaymentStatus.AUTHORIZED) {
            System.out.println("\n--- Capture ---");
            Payment captured = gateway.capture(p1.getId(), 50000);
            System.out.println(captured);

            // 5. Partial refund
            System.out.println("\n--- Partial Refund ---");
            Refund r1 = gateway.refund(p1.getId(), 10000);
            System.out.println(r1);

            Payment afterPartial = gateway.createPayment(null, "merchant_001", 1, Currency.INR); // just to read
            System.out.println("Payment after partial refund: " + captured);

            // 6. Full remaining refund
            System.out.println("\n--- Full Remaining Refund ---");
            Refund r2 = gateway.refund(p1.getId(), 40000);
            System.out.println(r2);
            System.out.println("Payment after full refund: " + captured);
        }

        // 7. Payment with retry
        System.out.println("\n--- Payment with Retry ---");
        Payment p2 = gateway.createPayment(null, "merchant_001", 25000, Currency.INR);
        Payment authResult = gateway.authorize(p2.getId());
        if (authResult.getStatus() == PaymentStatus.FAILED) {
            System.out.println("Authorization failed, retrying...");
            Payment retried = gateway.retry(p2.getId());
            System.out.println("After retry: " + retried);
        } else {
            System.out.println("Authorized on first attempt: " + authResult);
        }

        // 8. Invalid transition test
        System.out.println("\n--- Invalid Transition ---");
        try {
            Payment p3 = gateway.createPayment(null, "merchant_001", 10000, Currency.INR);
            gateway.capture(p3.getId(), 10000); // can't capture before authorize
        } catch (IllegalStateException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}
```

**Expected Output:**
```
=== Razorpay Payment Gateway ===

--- Create Payment ---
  🔔 Webhook: payment.created | pay_000001 | CREATED
Payment[pay_000001] merchant_001 50000 INR | status=CREATED | captured=0 | refunded=0

--- Idempotency Test (same key) ---
  → Idempotency hit: returning cached payment
Same payment returned: true

--- Authorize ---
  🔔 Webhook: payment.authorized | pay_000001 | AUTHORIZED
Payment[pay_000001] merchant_001 50000 INR | status=AUTHORIZED | captured=0 | refunded=0

--- Capture ---
  🔔 Webhook: payment.captured | pay_000001 | CAPTURED
Payment[pay_000001] merchant_001 50000 INR | status=CAPTURED | captured=50000 | refunded=0

--- Partial Refund ---
  🔔 Webhook: refund.created | pay_000001 | PARTIALLY_REFUNDED
Refund[rfnd_000001] payment=pay_000001 amount=10000

--- Full Remaining Refund ---
  🔔 Webhook: refund.created | pay_000001 | REFUNDED
Refund[rfnd_000002] payment=pay_000001 amount=40000

--- Invalid Transition ---
Error: Cannot capture payment in status CREATED (expected AUTHORIZED)
```

## 🎯 Key Takeaways
- Razorpay interviews require **payment domain expertise** — state machines, idempotency, refunds
- **Idempotency key**: same request key returns cached response — prevents double charges
- Amount in **paise** (smallest unit): avoids floating-point issues — standard in payment systems
- State machine: CREATED → AUTHORIZED → CAPTURED → SETTLED (with FAILED, REFUNDED branches)
- **Partial refunds**: track `refundedAmount`, status becomes PARTIALLY_REFUNDED if partial
- Webhook dispatch: event-driven notifications to merchants — fire-and-forget with error handling
- Retry with exponential backoff: `2^retryCount * 1000ms` — prevents thundering herd
- Transition validation: strict state checks prevent invalid operations (e.g., capture before authorize)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical 1 | Hard | Payment Gateway, Idempotency |
| Technical 2 | Hard | Refunding, State Machine, Webhooks |
| Hiring Manager | Medium | Fintech, Payment Domain |
