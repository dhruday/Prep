# Stripe — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Software Engineer |
| **Level** | L3 (Senior) |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Bug Squash + Integration + System Design + Manager)
- **Timeline:** 3 weeks
- **Notes:** Stripe has unique interview format — no LeetCode, all practical

---

## Round 1: Bug Squash
**Duration:** 60 minutes

### Setup
Given a partially broken webhook delivery system (Python/Ruby/Java codebase). Find and fix 5+ bugs.

### Bugs Found and Fixed

```java
// Bug 1: Race condition in webhook retry counter
// BEFORE (buggy):
int retryCount = db.getRetryCount(webhookId);
if (retryCount < MAX_RETRIES) {
    sendWebhook(webhookId);
    db.setRetryCount(webhookId, retryCount + 1); // Race: another thread reads stale count
}

// AFTER (fixed): Use atomic increment
int newCount = db.incrementRetryCount(webhookId); // Atomic: INCREMENT + return
if (newCount <= MAX_RETRIES) {
    sendWebhook(webhookId);
} else {
    markWebhookFailed(webhookId);
}

// Bug 2: Missing idempotency key validation
// BEFORE:
app.post("/webhooks", (req, res) -> {
    createWebhook(req.body); // No dedup → duplicate webhooks created
});

// AFTER:
app.post("/webhooks", (req, res) -> {
    String idempotencyKey = req.header("Idempotency-Key");
    if (idempotencyKey == null) return res.status(400).send("Idempotency-Key required");
    
    String cached = redis.get("idempotency:" + idempotencyKey);
    if (cached != null) return res.status(200).send(cached); // Return cached response
    
    String result = createWebhook(req.body);
    redis.setex("idempotency:" + idempotencyKey, 86400, result); // TTL 24h
    res.status(201).send(result);
});

// Bug 3: Incorrect exponential backoff calculation
// BEFORE:
long delay = Math.pow(2, retryCount); // Returns double, cast issue + no jitter

// AFTER:
long baseDelay = (long) Math.pow(2, retryCount) * 1000; // Seconds to ms
long jitter = ThreadLocalRandom.current().nextLong(0, baseDelay / 2);
long delay = Math.min(baseDelay + jitter, MAX_DELAY_MS); // Cap at 1 hour

// Bug 4: HMAC signature verification using == instead of constant-time comparison
// BEFORE:
boolean isValid = computeHmac(payload, secret).equals(receivedSignature); // Timing attack!

// AFTER:
boolean isValid = MessageDigest.isEqual(
    computeHmac(payload, secret).getBytes(StandardCharsets.UTF_8),
    receivedSignature.getBytes(StandardCharsets.UTF_8)
); // Constant-time comparison

// Bug 5: Connection leak in webhook sender
// BEFORE:
HttpClient client = HttpClient.newHttpClient();
HttpResponse<String> response = client.send(request, BodyHandlers.ofString());
// Client never closed → connection pool exhaustion after 10K webhooks

// AFTER:
try (var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
    HttpResponse<String> response = client.send(request, BodyHandlers.ofString());
    // Process response
}
```

---

## Round 2: Integration
**Duration:** 60 minutes

### Questions Asked
1. **Build a Subscription Billing System API**
   - Create subscription, handle upgrades/downgrades, proration, invoicing

### 💡 Interview-Ready Answer

```java
@RestController
@RequestMapping("/v1/subscriptions")
public class SubscriptionController {
    
    @PostMapping
    public SubscriptionResponse create(@RequestBody CreateSubscriptionRequest request) {
        // Validate customer exists
        Customer customer = customerService.get(request.customerId);
        if (customer == null) throw new NotFoundException("Customer not found");
        
        // Validate payment method
        PaymentMethod pm = paymentMethodService.get(request.paymentMethodId);
        if (pm == null) throw new BadRequestException("Valid payment method required");
        
        // Create subscription
        Subscription sub = Subscription.builder()
            .id("sub_" + generateId())
            .customerId(customer.id)
            .priceId(request.priceId)
            .status(Subscription.Status.ACTIVE)
            .currentPeriodStart(Instant.now())
            .currentPeriodEnd(Instant.now().plus(30, ChronoUnit.DAYS))
            .paymentMethodId(pm.id)
            .build();
        
        // Create first invoice
        Invoice invoice = createInvoice(sub, false);
        
        // Charge immediately
        PaymentResult result = paymentService.charge(pm, invoice.amountDue);
        if (!result.isSuccess()) {
            sub = sub.withStatus(Subscription.Status.PAST_DUE);
            // Schedule retry (1, 3, 5 days)
            scheduleRetry(sub, invoice);
        }
        
        return toResponse(sub);
    }
    
    @PostMapping("/{id}/upgrade")
    public SubscriptionResponse upgrade(@PathVariable String id, 
                                        @RequestBody UpgradeRequest request) {
        Subscription sub = subscriptionService.get(id);
        if (sub == null) throw new NotFoundException("Subscription not found");
        
        Price oldPrice = priceService.get(sub.priceId);
        Price newPrice = priceService.get(request.newPriceId);
        
        // Calculate proration
        Instant now = Instant.now();
        long totalPeriodSeconds = Duration.between(sub.currentPeriodStart, sub.currentPeriodEnd).getSeconds();
        long remainingSeconds = Duration.between(now, sub.currentPeriodEnd).getSeconds();
        double remainingRatio = (double) remainingSeconds / totalPeriodSeconds;
        
        // Credit for unused time on old plan
        long unusedCredit = Math.round(oldPrice.amount * remainingRatio);
        
        // Charge for remaining time on new plan  
        long newCharge = Math.round(newPrice.amount * remainingRatio);
        
        // Net proration amount
        long prorationAmount = newCharge - unusedCredit;
        
        // Update subscription
        sub = sub.withPriceId(request.newPriceId);
        
        if (prorationAmount > 0) {
            // Charge the difference immediately
            Invoice invoice = Invoice.builder()
                .subscriptionId(sub.id)
                .lineItems(List.of(
                    new LineItem("Unused time on " + oldPrice.name, -unusedCredit),
                    new LineItem("Remaining time on " + newPrice.name, newCharge)
                ))
                .amountDue(prorationAmount)
                .build();
            
            paymentService.charge(sub.paymentMethodId, invoice.amountDue);
        } else {
            // Credit applied to next invoice
            creditService.addCredit(sub.customerId, Math.abs(prorationAmount));
        }
        
        return toResponse(sub);
    }
    
    // Webhook: subscription.renewed (called by cron at period end)
    void renewSubscription(String subscriptionId) {
        Subscription sub = subscriptionService.get(subscriptionId);
        if (sub.status == Subscription.Status.CANCELLED) return;
        
        // Extend period
        sub = sub.withCurrentPeriodStart(sub.currentPeriodEnd)
                 .withCurrentPeriodEnd(sub.currentPeriodEnd.plus(30, ChronoUnit.DAYS));
        
        // Create invoice
        Invoice invoice = createInvoice(sub, true);
        
        // Apply any credits
        long credits = creditService.getBalance(sub.customerId);
        if (credits > 0) {
            long applied = Math.min(credits, invoice.amountDue);
            invoice = invoice.withAmountDue(invoice.amountDue - applied);
            creditService.deductCredit(sub.customerId, applied);
        }
        
        // Charge
        if (invoice.amountDue > 0) {
            PaymentResult result = paymentService.charge(sub.paymentMethodId, invoice.amountDue);
            if (!result.isSuccess()) {
                sub = sub.withStatus(Subscription.Status.PAST_DUE);
                scheduleRetry(sub, invoice);
            }
        }
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Stripe's Webhook Delivery System at Scale**

### 💡 Interview-Ready Answer

```
Stripe Webhook Delivery:
┌──────────────────────────────────────────────────────────────┐
│  Scale: 100K+ merchants, ~1B webhook events/day              │
│  SLA: 99.99% delivery, first attempt within 5 seconds        │
│                                                                │
│  Architecture:                                                │
│  Event Source     →  Kafka          →  Delivery Workers       │
│  (payment.success)  (partitioned      (HTTP POST to URLs)    │
│  (invoice.created)   by merchant_id)                          │
│                                                                │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐      │
│  │ Internal   │─▶│ Webhook        │─▶│ HTTP Delivery    │      │
│  │ Events     │  │ Dispatcher     │  │ Workers (pool)   │      │
│  │            │  │                │  │                  │      │
│  │ Kafka      │  │ Match event →  │  │ POST to merchant │      │
│  │ topics     │  │ subscriptions  │  │ endpoint + HMAC  │      │
│  └──────────┘  └───────────────┘  └──────┬───────────┘      │
│                                          │                   │
│                                  ┌───────▼───────────┐       │
│                                  │ Retry Queue         │       │
│                                  │ (delayed Kafka/SQS) │       │
│                                  │ Exponential backoff │       │
│                                  └────────────────────┘       │
│                                                                │
│  Delivery Flow:                                               │
│  1. Internal event emitted (e.g., "charge.succeeded")        │
│  2. Webhook Dispatcher:                                       │
│     a. Look up merchant's webhook subscriptions              │
│     b. Filter: merchant subscribed to this event type?       │
│     c. Create delivery attempt record                        │
│  3. HTTP delivery:                                            │
│     a. Sign payload: HMAC-SHA256(payload, webhook_secret)    │
│     b. POST to merchant URL with Stripe-Signature header     │
│     c. Timeout: 30 seconds                                   │
│     d. Accept: 2xx response = success                        │
│                                                                │
│  Retry Strategy:                                              │
│  Attempt  1: immediate                                        │
│  Attempt  2: 5 minutes                                       │
│  Attempt  3: 30 minutes                                      │
│  Attempt  4: 2 hours                                         │
│  Attempt  5: 4 hours                                         │
│  Attempt  6: 8 hours                                         │
│  Attempt  7: 24 hours                                        │
│  Attempt  8: 48 hours                                        │
│  Total: 8 attempts over 3 days                               │
│  After 8 failures: mark endpoint disabled, email merchant    │
│                                                                │
│  Security:                                                    │
│  - HMAC signature for authenticity                           │
│  - Timestamp in signature to prevent replay attacks          │
│  - Verification: reject if timestamp > 5 minutes old         │
│  - Merchant endpoint must use HTTPS                          │
│  - IP allowlisting option for extra security                 │
│                                                                │
│  Ordering:                                                    │
│  - NOT guaranteed across event types                         │
│  - Best-effort within same type (partition by merchant)      │
│  - Events have sequence number (api_version + event_id)      │
│  - Merchant should handle out-of-order (check event time)    │
│                                                                │
│  Dashboard:                                                   │
│  - Event log: searchable by event type, status, date         │
│  - Endpoint health: success rate, avg response time          │
│  - Resend button: manual retry from dashboard                │
│  - Test mode: send to localhost via Stripe CLI                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Stripe = **NO LeetCode** — all practical: bug squash, integration, system design
- **Bug squash** tests: race conditions, security (timing attacks, HMAC), connection leaks
- **Idempotency** is Stripe's core concept — every API call must be idempotent
- **Proration** for subscription upgrades/downgrades — calculate unused time, charge/credit
- **Webhook retry** with exponential backoff + jitter — know the exact schedule
- **HMAC-SHA256** with timestamp to prevent replay attacks — security is critical at Stripe
- Stripe values **API design quality** — clean REST endpoints, proper error responses
- Constant-time comparison for HMAC verification — `MessageDigest.isEqual()`

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bug Squash | Hard | Race Conditions, Security, Leaks |
| Integration | Hard | Subscription Billing, Proration |
| System Design | Hard | Webhook Delivery, Retry, HMAC |
| Manager | Medium | Culture Fit, API Design Philosophy |
