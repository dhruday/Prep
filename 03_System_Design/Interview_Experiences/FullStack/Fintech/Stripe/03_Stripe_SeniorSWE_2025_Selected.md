# Stripe — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Senior Software Engineer |
| **Level** | L3 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Stripe-Interview-Questions-E671932.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Bug Squash + Integration + System Design + Values)

---

## Round 1: Integration Exercise
**Duration:** 90 minutes

### Challenge
**Build a Subscription Billing API that handles proration**
- Create subscription with monthly/yearly plans
- Upgrade/downgrade mid-cycle with proration
- Handle billing failures with retry + dunning
- invoice generation with line items

### 💡 Proration Logic

```java
class SubscriptionService {
    // Upgrade mid-cycle: prorate charges
    Invoice upgradeSubscription(String subscriptionId, String newPlanId) {
        Subscription sub = subscriptionRepo.findById(subscriptionId);
        Plan oldPlan = planRepo.findById(sub.planId);
        Plan newPlan = planRepo.findById(newPlanId);
        
        // Calculate proration
        Instant now = Instant.now();
        Instant periodEnd = sub.currentPeriodEnd;
        Instant periodStart = sub.currentPeriodStart;
        
        long totalPeriodSeconds = periodEnd.getEpochSecond() - periodStart.getEpochSecond();
        long remainingSeconds = periodEnd.getEpochSecond() - now.getEpochSecond();
        double remainingRatio = (double) remainingSeconds / totalPeriodSeconds;
        
        // Credit for unused time on old plan
        long unusedCredit = Math.round(oldPlan.amount * remainingRatio);
        
        // Charge for remaining time on new plan
        long newCharge = Math.round(newPlan.amount * remainingRatio);
        
        // Net amount = newCharge - unusedCredit
        long prorationAmount = newCharge - unusedCredit;
        
        // Create invoice with line items
        Invoice invoice = Invoice.builder()
            .customerId(sub.customerId)
            .subscriptionId(subscriptionId)
            .lineItems(List.of(
                new LineItem("Unused time on " + oldPlan.name, -unusedCredit, periodStart, now),
                new LineItem("Remaining time on " + newPlan.name, newCharge, now, periodEnd)
            ))
            .total(prorationAmount)
            .status(InvoiceStatus.DRAFT)
            .build();
        
        invoiceRepo.save(invoice);
        
        // Update subscription
        sub.planId = newPlanId;
        sub.updatedAt = now;
        subscriptionRepo.save(sub);
        
        // Charge immediately if proration amount > 0
        if (prorationAmount > 0) {
            chargeInvoice(invoice);
        } else {
            // Credit applied to next invoice
            creditService.addCredit(sub.customerId, Math.abs(prorationAmount));
        }
        
        return invoice;
    }
    
    // Dunning: retry failed payments
    void handlePaymentFailure(Invoice invoice, String failureReason) {
        invoice.setStatus(InvoiceStatus.PAYMENT_FAILED);
        invoice.setAttemptCount(invoice.getAttemptCount() + 1);
        invoiceRepo.save(invoice);
        
        // Dunning schedule: retry at 1d, 3d, 5d, 7d
        int[] retryDays = {1, 3, 5, 7};
        int attempt = invoice.getAttemptCount();
        
        if (attempt <= retryDays.length) {
            // Schedule retry
            scheduler.schedule(
                () -> chargeInvoice(invoice),
                Duration.ofDays(retryDays[attempt - 1])
            );
            
            // Email customer
            emailService.send(invoice.getCustomerId(),
                "Payment failed — please update your card",
                "We'll retry in " + retryDays[attempt - 1] + " days");
        } else {
            // Final failure: cancel subscription
            cancelSubscription(invoice.getSubscriptionId(), "payment_failure");
            emailService.send(invoice.getCustomerId(),
                "Subscription cancelled due to payment failure",
                "Update your payment method to reactivate");
        }
    }
}

// Idempotency for payment operations
class IdempotencyService {
    <T> T executeIdempotent(String key, Supplier<T> operation) {
        // Check if already executed
        String cached = redis.get("idempotency:" + key);
        if (cached != null) {
            return deserialize(cached);
        }
        
        // Execute operation
        T result = operation.get();
        
        // Cache result for 24 hours
        redis.setex("idempotency:" + key, 86400, serialize(result));
        
        return result;
    }
}
```

---

## 🎯 Key Takeaways
- Stripe = **billing correctness + idempotency + payment failure handling**
- **Proration**: (remaining_ratio × new_plan_amount) - (remaining_ratio × old_plan_amount) = net charge
- **Credit for downgrade**: negative proration → add credit to customer balance for next invoice
- **Dunning sequence**: 1d → 3d → 5d → 7d retry → cancel — industry standard pattern
- **Idempotency keys**: Redis-backed, 24-hour TTL — prevents duplicate charges on retry
- **Line items**: always show credit + charge separately for transparency
- **Invoice status flow**: DRAFT → OPEN → PAID / PAYMENT_FAILED → VOID / UNCOLLECTIBLE
- Stripe values: **rigor in engineering** — correctness over speed, comprehensive edge case coverage

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bug Squash | Medium-Hard | Race Conditions, Security |
| Integration | Hard | Subscription Billing, Proration, Dunning |
| System Design | Hard | Payment Infrastructure |
| Values | Medium | Stripe Culture |
