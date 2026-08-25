# Stripe — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Software Engineer |
| **Level** | L3 (Senior equivalent) |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + Bug Squash + Integration + System Design + Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual
- **Note:** Stripe has unique interview formats — "Bug Squash" (find/fix bugs in real code) and "Integration" (build a feature using Stripe's API)

---

## Round 1: Bug Squash
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Given a Ruby/Python codebase for a billing system, find and fix 5+ bugs**
   - Off-by-one errors, race conditions, missing null checks, incorrect timezone handling, idempotency issues

### 💡 Interview-Ready Answer — Common Bug Patterns in Billing Systems

```python
# Bug 1: Race condition in balance update
# BROKEN:
def charge_customer(customer_id, amount):
    balance = db.get_balance(customer_id)  # Read
    if balance >= amount:
        db.set_balance(customer_id, balance - amount)  # Write
        return True
    return False
# Two concurrent charges can both read same balance → double-spend!

# FIXED: Use atomic operation or pessimistic lock
def charge_customer_fixed(customer_id, amount):
    # Option 1: Atomic UPDATE with WHERE clause
    rows_affected = db.execute(
        "UPDATE accounts SET balance = balance - %s WHERE customer_id = %s AND balance >= %s",
        (amount, customer_id, amount)
    )
    return rows_affected > 0

# Bug 2: Missing idempotency
# BROKEN:
def process_payment(payment_request):
    charge = stripe.Charge.create(amount=payment_request.amount, ...)
    return charge
# Network retry → double charge!

# FIXED: Use idempotency key
def process_payment_fixed(payment_request):
    charge = stripe.Charge.create(
        amount=payment_request.amount,
        idempotency_key=payment_request.request_id,  # Unique per request
        ...
    )
    return charge

# Bug 3: Timezone handling
# BROKEN:
def is_subscription_expired(subscription):
    return datetime.now() > subscription.expires_at
# datetime.now() returns local time, expires_at might be UTC!

# FIXED:
def is_subscription_expired_fixed(subscription):
    return datetime.now(timezone.utc) > subscription.expires_at.replace(tzinfo=timezone.utc)

# Bug 4: Floating point for money
# BROKEN:
total = 0.1 + 0.2  # = 0.30000000000000004, not 0.3!
# FIXED: Use integers (cents) or Decimal
from decimal import Decimal
total = Decimal('0.10') + Decimal('0.20')  # = Decimal('0.30')

# Bug 5: Missing error handling on webhook
# BROKEN:
def handle_webhook(event):
    if event.type == 'invoice.paid':
        activate_subscription(event.data.customer_id)
        return 200
# What if activate_subscription fails? Stripe retries webhook, 
# but if it partially succeeded, we get inconsistent state

# FIXED: Make webhook handler idempotent
def handle_webhook_fixed(event):
    if already_processed(event.id):
        return 200  # Already handled
    
    if event.type == 'invoice.paid':
        try:
            activate_subscription(event.data.customer_id)
            mark_processed(event.id)
        except Exception:
            return 500  # Stripe will retry
    return 200
```

---

## Round 2: Integration
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Build a subscription billing system using Stripe's API**
   - Create customer, subscribe to plan, handle upgrades/downgrades, proration, cancellation

### 💡 Interview-Ready Answer

```python
import stripe
stripe.api_key = "sk_test_..."

class SubscriptionService:
    def create_customer(self, email, payment_method_id):
        """Create customer and attach payment method."""
        customer = stripe.Customer.create(
            email=email,
            payment_method=payment_method_id,
            invoice_settings={"default_payment_method": payment_method_id}
        )
        return customer
    
    def subscribe(self, customer_id, price_id, trial_days=0):
        """Create a new subscription."""
        params = {
            "customer": customer_id,
            "items": [{"price": price_id}],
            "payment_behavior": "default_incomplete",  # Require explicit confirmation
            "expand": ["latest_invoice.payment_intent"],
        }
        if trial_days > 0:
            params["trial_period_days"] = trial_days
        
        subscription = stripe.Subscription.create(**params)
        return subscription
    
    def upgrade_plan(self, subscription_id, new_price_id):
        """Upgrade/downgrade with proration."""
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        updated = stripe.Subscription.modify(
            subscription_id,
            items=[{
                "id": subscription["items"]["data"][0].id,
                "price": new_price_id,
            }],
            proration_behavior="create_prorations",  # Charge/credit difference
            # "always_invoice" immediately charges proration
            # "none" skips proration entirely
        )
        return updated
    
    def cancel(self, subscription_id, at_period_end=True):
        """Cancel subscription."""
        if at_period_end:
            # Cancel at end of billing period (user keeps access until then)
            return stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
        else:
            # Cancel immediately
            return stripe.Subscription.delete(subscription_id)
    
    def handle_payment_failure(self, subscription_id):
        """Dunning: retry failed payments."""
        # Stripe handles retries automatically via Smart Retries
        # But we should handle the webhook:
        # invoice.payment_failed → notify customer → pause service after 3 failures
        pass

class WebhookHandler:
    def handle(self, payload, sig_header):
        """Process Stripe webhooks."""
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        handlers = {
            "customer.subscription.created": self._on_subscription_created,
            "customer.subscription.updated": self._on_subscription_updated,
            "customer.subscription.deleted": self._on_subscription_deleted,
            "invoice.paid": self._on_invoice_paid,
            "invoice.payment_failed": self._on_payment_failed,
        }
        
        handler = handlers.get(event.type)
        if handler:
            handler(event.data.object)
        
        return {"status": "ok"}
    
    def _on_invoice_paid(self, invoice):
        customer_id = invoice.customer
        # Activate/extend subscription in our DB
        db.update_subscription_status(customer_id, "active")
        email_service.send_receipt(customer_id, invoice.id)
    
    def _on_payment_failed(self, invoice):
        customer_id = invoice.customer
        attempt = invoice.attempt_count
        
        if attempt >= 3:
            db.update_subscription_status(customer_id, "past_due")
            email_service.send_payment_failed_final(customer_id)
        else:
            email_service.send_payment_failed_retry(customer_id, attempt)
```

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design Stripe's Webhook Delivery System**
   - Reliable delivery, at-least-once semantics, retry with backoff, ordering, monitoring

### 💡 Interview-Ready Answer

```
┌──────────────────────────────────────────────────────────────┐
│                   Event Production                            │
│  Payment Service    Subscription Service    Invoice Service   │
│       │                    │                      │           │
│       └────────────────────┼──────────────────────┘           │
│                            ▼                                  │
│                    Event Bus (Kafka)                          │
│                    Topic: stripe-events                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   Webhook Delivery Pipeline                    │
│                                                                │
│  ┌──────────────────┐                                         │
│  │  Event Router    │ → Lookup webhook endpoints for merchant │
│  │  (Kafka Consumer)│ → Filter: does merchant subscribe to    │
│  │                  │   this event type?                       │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │  Delivery Queue  │ → Per-merchant queue (ordering)          │
│  │  (Redis Sorted   │ → Score = next_retry_at timestamp       │
│  │   Set)           │                                          │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │  Delivery Worker │ → HTTP POST to merchant's endpoint      │
│  │  Pool            │ → Timeout: 30 seconds                   │
│  │  (Thread pool)   │ → Expect 2xx response                   │
│  └────────┬─────────┘                                         │
│           │                                                    │
│     ┌─────┼─────┐                                             │
│     ▼           ▼                                              │
│  SUCCESS     FAILURE                                           │
│  → Mark      → Exponential backoff retry                      │
│    delivered  → Retry schedule: 5s, 30s, 5m, 30m, 2h, 8h, 24h│
│  → Log       → After 3 days: mark as failed, alert merchant   │
│               → Circuit breaker per endpoint                   │
└──────────────────────────────────────────────────────────────┘
```

#### Retry with Exponential Backoff
```java
class WebhookDeliveryWorker {
    private static final int[] RETRY_DELAYS_SEC = {5, 30, 300, 1800, 7200, 28800, 86400};
    private static final int MAX_RETRIES = 7;
    
    void deliver(WebhookEvent event, WebhookEndpoint endpoint) {
        HttpResponse response = null;
        try {
            String payload = buildPayload(event);
            String signature = computeHmacSignature(payload, endpoint.signingSecret);
            
            response = httpClient.post(endpoint.url)
                .header("Stripe-Signature", "t=" + timestamp + ",v1=" + signature)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .body(payload)
                .execute();
            
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                markDelivered(event.id, endpoint.id);
                metricsService.recordSuccess(endpoint.merchantId);
            } else {
                scheduleRetry(event, endpoint, response.statusCode());
            }
        } catch (Exception e) {
            scheduleRetry(event, endpoint, -1);
        }
    }
    
    void scheduleRetry(WebhookEvent event, WebhookEndpoint endpoint, int statusCode) {
        int attempt = event.attemptCount;
        if (attempt >= MAX_RETRIES) {
            markFailed(event.id, endpoint.id);
            alertService.notifyMerchant(endpoint.merchantId, event.id);
            return;
        }
        
        long delaySeconds = RETRY_DELAYS_SEC[Math.min(attempt, RETRY_DELAYS_SEC.length - 1)];
        long nextRetryAt = System.currentTimeMillis() + delaySeconds * 1000;
        
        event.attemptCount++;
        event.lastStatusCode = statusCode;
        retryQueue.schedule(event, nextRetryAt);
    }
    
    // HMAC signature verification (merchant-side)
    String computeHmacSignature(String payload, String secret) {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        return Hex.encodeHexString(mac.doFinal(payload.getBytes()));
    }
}
```

#### Ordering Guarantee
```
Challenge: Events for same merchant must be delivered in order
  (e.g., invoice.created before invoice.paid)

Solution: Per-merchant partitioning
- Kafka partition key = merchant_id
- Single consumer per partition → events for same merchant processed sequentially
- If delivery fails, block that merchant's queue (don't skip ahead)
- Other merchants continue unaffected (separate partitions)
```

---

## Round 4: Hiring Manager
**Duration:** 45 minutes

### Questions Asked
1. **"What's the hardest debugging session you've had?"**
2. **"How do you approach API design?"**

### 💡 Interview-Ready Answer — API Design Approach

> "I follow Stripe's own API design principles:
> 1. **Consistency:** Same patterns everywhere. If `GET /customers/:id` returns a customer, `GET /charges/:id` returns a charge. Same envelope, same pagination, same error format.
> 2. **Idempotency:** Every mutating endpoint accepts an `Idempotency-Key` header. Retries are safe.
> 3. **Versioning:** Date-based versioning (`2025-03-15`). Old versions continue working. Breaking changes require new version.
> 4. **Expandable responses:** `?expand[]=customer` to inline related resources instead of separate calls.
> 5. **Rich error objects:** Not just 400. Return `{ type: 'card_error', code: 'card_declined', decline_code: 'insufficient_funds', message: '...' }`"

---

## 🎯 Key Takeaways
- Stripe's **Bug Squash** is unique — practice reading and debugging unfamiliar code
- **Idempotency** is Stripe's #1 value — mention it in every answer
- **Webhook delivery** with retry/backoff is Stripe's signature system design
- **HMAC signature verification** for webhook security — know how to implement
- **Integration round** = build a real feature with Stripe's API patterns
- Money handling: **always use integers (cents)** or Decimal, never floating point
- Stripe values **code clarity and correctness** over cleverness

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bug Squash | Medium-Hard | Debugging, Race Conditions, Edge Cases |
| Integration | Medium | API Integration, Webhooks, Billing |
| System Design | Hard | Webhook Delivery, Retry, HMAC, Ordering |
| Manager | Medium | API Design, Debugging, Behavioral |
