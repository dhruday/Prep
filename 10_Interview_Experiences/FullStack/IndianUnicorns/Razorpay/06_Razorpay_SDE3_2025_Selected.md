# Razorpay — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior FullStack Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual + Onsite Final

## Round 2: Backend Coding — Refund Processing Engine

### Problem
Build an automated refund processing system:
1. Merchants initiate refund requests (full or partial)
2. Validate: refund ≤ remaining refundable amount per payment
3. Multiple partial refunds per payment — track cumulative total
4. Refund speed tiers: instant (< ₹5000), normal (1-3 days), review (> ₹50000)
5. Auto-approve rules: verified merchant + small amount + low fraud score
6. Audit trail for every state transition
7. Idempotent refund API
8. Batch refund: process up to 100 refunds in one call

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class RefundProcessingEngine {

    // ============================================================
    // MODELS
    // ============================================================
    enum RefundStatus { INITIATED, AUTO_APPROVED, PENDING_REVIEW, APPROVED, PROCESSED, REJECTED, FAILED }
    enum RefundSpeed { INSTANT, NORMAL, REVIEW }

    static class Payment {
        String paymentId;
        double amount;
        double refundedAmount;
        String merchantId;
        boolean captured;

        Payment(String paymentId, double amount, String merchantId) {
            this.paymentId = paymentId;
            this.amount = amount;
            this.merchantId = merchantId;
            this.captured = true;
            this.refundedAmount = 0;
        }

        double refundableAmount() { return amount - refundedAmount; }
    }

    static class Merchant {
        String merchantId;
        String name;
        boolean verified;
        double fraudScore; // 0-1, lower = safer

        Merchant(String id, String name, boolean verified, double fraudScore) {
            this.merchantId = id; this.name = name;
            this.verified = verified; this.fraudScore = fraudScore;
        }
    }

    static class Refund {
        String refundId;
        String paymentId;
        String merchantId;
        double amount;
        RefundStatus status;
        RefundSpeed speed;
        String reason;
        Instant createdAt;
        String idempotencyKey;
        List<AuditEntry> audit = new ArrayList<>();

        Refund(String refundId, String paymentId, String merchantId,
               double amount, String reason, String idempotencyKey) {
            this.refundId = refundId;
            this.paymentId = paymentId;
            this.merchantId = merchantId;
            this.amount = amount;
            this.reason = reason;
            this.idempotencyKey = idempotencyKey;
            this.status = RefundStatus.INITIATED;
            this.createdAt = Instant.now();
            addAudit("Refund initiated", null, RefundStatus.INITIATED);
        }

        void addAudit(String action, RefundStatus from, RefundStatus to) {
            audit.add(new AuditEntry(action, from, to, Instant.now()));
        }

        @Override
        public String toString() {
            return String.format("[%s] ₹%.0f %s (%s) — %s",
                refundId, amount, status, speed, reason);
        }
    }

    static class AuditEntry {
        String action;
        RefundStatus fromStatus, toStatus;
        Instant timestamp;

        AuditEntry(String action, RefundStatus from, RefundStatus to, Instant ts) {
            this.action = action; this.fromStatus = from;
            this.toStatus = to; this.timestamp = ts;
        }

        @Override
        public String toString() {
            return String.format("  [%s] %s → %s: %s", timestamp, fromStatus, toStatus, action);
        }
    }

    static class RefundResult {
        boolean success;
        String message;
        Refund refund;

        RefundResult(boolean success, String message, Refund refund) {
            this.success = success; this.message = message; this.refund = refund;
        }
    }

    // ============================================================
    // SERVICE
    // ============================================================
    private final Map<String, Payment> payments = new ConcurrentHashMap<>();
    private final Map<String, Merchant> merchants = new ConcurrentHashMap<>();
    private final Map<String, Refund> refunds = new ConcurrentHashMap<>();
    private final Map<String, Refund> idempotencyStore = new ConcurrentHashMap<>();
    private int refundCounter = 0;

    public void registerPayment(Payment p) { payments.put(p.paymentId, p); }
    public void registerMerchant(Merchant m) { merchants.put(m.merchantId, m); }

    // ── Determine refund speed tier ──
    private RefundSpeed determineSpeed(double amount) {
        if (amount <= 5000) return RefundSpeed.INSTANT;
        if (amount <= 50000) return RefundSpeed.NORMAL;
        return RefundSpeed.REVIEW;
    }

    // ── Auto-approval rules ──
    private boolean canAutoApprove(Refund refund, Merchant merchant) {
        return merchant.verified
            && refund.amount <= 10000
            && merchant.fraudScore < 0.3;
    }

    // ── Process single refund ──
    public synchronized RefundResult initiateRefund(String paymentId, double amount,
                                                      String reason, String idempotencyKey) {
        // Idempotency check
        if (idempotencyStore.containsKey(idempotencyKey)) {
            Refund existing = idempotencyStore.get(idempotencyKey);
            return new RefundResult(true, "Idempotent: returning existing refund", existing);
        }

        // Validate payment
        Payment payment = payments.get(paymentId);
        if (payment == null)
            return new RefundResult(false, "Payment not found", null);
        if (!payment.captured)
            return new RefundResult(false, "Payment not captured", null);

        // Validate refund amount
        if (amount <= 0)
            return new RefundResult(false, "Invalid refund amount", null);
        if (amount > payment.refundableAmount())
            return new RefundResult(false,
                String.format("Exceeds refundable: ₹%.0f available, ₹%.0f requested",
                    payment.refundableAmount(), amount), null);

        // Create refund
        String refundId = "rfnd_" + String.format("%06d", ++refundCounter);
        Refund refund = new Refund(refundId, paymentId, payment.merchantId,
                                    amount, reason, idempotencyKey);
        refund.speed = determineSpeed(amount);

        // Auto-approval check
        Merchant merchant = merchants.get(payment.merchantId);
        if (merchant != null && canAutoApprove(refund, merchant)) {
            refund.status = RefundStatus.AUTO_APPROVED;
            refund.addAudit("Auto-approved (verified + low fraud + amount ≤ ₹10K)",
                RefundStatus.INITIATED, RefundStatus.AUTO_APPROVED);

            // Process immediately for INSTANT speed
            if (refund.speed == RefundSpeed.INSTANT) {
                refund.status = RefundStatus.PROCESSED;
                refund.addAudit("Instant refund processed",
                    RefundStatus.AUTO_APPROVED, RefundStatus.PROCESSED);
                payment.refundedAmount += amount;
            } else {
                payment.refundedAmount += amount; // Reserve amount
            }
        } else if (refund.speed == RefundSpeed.REVIEW) {
            refund.status = RefundStatus.PENDING_REVIEW;
            refund.addAudit("Queued for manual review (amount > ₹50K)",
                RefundStatus.INITIATED, RefundStatus.PENDING_REVIEW);
            payment.refundedAmount += amount; // Reserve amount
        } else {
            refund.status = RefundStatus.APPROVED;
            refund.addAudit("Standard approval",
                RefundStatus.INITIATED, RefundStatus.APPROVED);
            payment.refundedAmount += amount;
        }

        refunds.put(refundId, refund);
        idempotencyStore.put(idempotencyKey, refund);
        return new RefundResult(true, "Refund created: " + refund.status, refund);
    }

    // ── Approve reviewed refund ──
    public RefundResult approveRefund(String refundId) {
        Refund refund = refunds.get(refundId);
        if (refund == null) return new RefundResult(false, "Not found", null);
        if (refund.status != RefundStatus.PENDING_REVIEW)
            return new RefundResult(false, "Cannot approve: status=" + refund.status, refund);

        refund.status = RefundStatus.APPROVED;
        refund.addAudit("Manually approved", RefundStatus.PENDING_REVIEW, RefundStatus.APPROVED);
        return new RefundResult(true, "Approved", refund);
    }

    // ── Reject reviewed refund ──
    public RefundResult rejectRefund(String refundId, String reason) {
        Refund refund = refunds.get(refundId);
        if (refund == null) return new RefundResult(false, "Not found", null);
        if (refund.status != RefundStatus.PENDING_REVIEW)
            return new RefundResult(false, "Cannot reject: status=" + refund.status, refund);

        refund.status = RefundStatus.REJECTED;
        refund.addAudit("Rejected: " + reason, RefundStatus.PENDING_REVIEW, RefundStatus.REJECTED);

        // Release reserved amount
        Payment payment = payments.get(refund.paymentId);
        if (payment != null) payment.refundedAmount -= refund.amount;

        return new RefundResult(true, "Rejected", refund);
    }

    // ── Batch refund ──
    public List<RefundResult> batchRefund(List<Map<String, Object>> requests) {
        if (requests.size() > 100)
            throw new IllegalArgumentException("Batch limit: 100 refunds");

        List<RefundResult> results = new ArrayList<>();
        for (Map<String, Object> req : requests) {
            results.add(initiateRefund(
                (String) req.get("paymentId"),
                (Double) req.get("amount"),
                (String) req.get("reason"),
                (String) req.get("idempotencyKey")
            ));
        }
        return results;
    }

    // ── Audit trail ──
    public void printAuditTrail(String refundId) {
        Refund refund = refunds.get(refundId);
        if (refund == null) { System.out.println("Not found"); return; }
        System.out.println("Audit trail for " + refund);
        refund.audit.forEach(System.out::println);
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        RefundProcessingEngine engine = new RefundProcessingEngine();

        engine.registerMerchant(new Merchant("M1", "Acme Corp", true, 0.1));
        engine.registerMerchant(new Merchant("M2", "Shady LLC", false, 0.7));

        engine.registerPayment(new Payment("pay_001", 100000, "M1"));
        engine.registerPayment(new Payment("pay_002", 3000, "M1"));
        engine.registerPayment(new Payment("pay_003", 20000, "M2"));

        // Case 1: Small refund → instant auto-approve
        System.out.println("=== Case 1: Small refund (instant) ===");
        RefundResult r1 = engine.initiateRefund("pay_002", 2000, "Customer request", "idem-1");
        System.out.println(r1.message + "\n" + r1.refund);

        // Case 2: Idempotent retry
        System.out.println("\n=== Case 2: Idempotent retry ===");
        RefundResult r1b = engine.initiateRefund("pay_002", 2000, "Customer request", "idem-1");
        System.out.println(r1b.message);

        // Case 3: Large refund → pending review
        System.out.println("\n=== Case 3: Large refund (review) ===");
        RefundResult r2 = engine.initiateRefund("pay_001", 75000, "Dispute", "idem-2");
        System.out.println(r2.message + "\n" + r2.refund);

        // Approve it
        engine.approveRefund(r2.refund.refundId);

        // Case 4: Partial refund, then try over-refund
        System.out.println("\n=== Case 4: Partial + over-refund ===");
        engine.initiateRefund("pay_001", 20000, "Partial refund", "idem-3");
        RefundResult overRefund = engine.initiateRefund("pay_001", 10000, "Another partial", "idem-4");
        System.out.println(overRefund.message);

        // Case 5: Unverified merchant
        System.out.println("\n=== Case 5: Unverified + high fraud ===");
        RefundResult r3 = engine.initiateRefund("pay_003", 5000, "Return", "idem-5");
        System.out.println(r3.message + "\n" + r3.refund);

        // Audit trail
        System.out.println("\n=== Audit Trail ===");
        engine.printAuditTrail(r2.refund.refundId);
    }
}
```

### Expected Output
```
=== Case 1: Small refund (instant) ===
Refund created: PROCESSED
[rfnd_000001] ₹2000 PROCESSED (INSTANT) — Customer request

=== Case 2: Idempotent retry ===
Idempotent: returning existing refund

=== Case 3: Large refund (review) ===
Refund created: PENDING_REVIEW
[rfnd_000002] ₹75000 PENDING_REVIEW (REVIEW) — Dispute

=== Case 4: Partial + over-refund ===
Exceeds refundable: ₹5000 available, ₹10000 requested

=== Case 5: Unverified + high fraud ===
Refund created: APPROVED
[rfnd_000004] ₹5000 APPROVED (INSTANT) — Return

=== Audit Trail ===
  [timestamp] null → INITIATED: Refund initiated
  [timestamp] INITIATED → PENDING_REVIEW: Queued for manual review
  [timestamp] PENDING_REVIEW → APPROVED: Manually approved
```

## 🎯 Key Takeaways
- **Three-tier speed**: instant (<₹5K), normal (₹5K-50K), review (>₹50K)
- **Auto-approval**: verified merchant + low fraud (<0.3) + small amount (≤₹10K)
- **Cumulative refund tracking**: `refundedAmount` on Payment prevents over-refund
- **Idempotency**: ConcurrentHashMap keyed by client-provided idempotency key
- **Audit trail**: every status transition logged with timestamp and reason
- **Amount reservation**: reserve refundable amount on creation, release on rejection

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Hard | Refund State Machine, Idempotency |
| Technical 2 | Hard | Batch Processing, Validation |
| System Design | Hard | Payment Pipeline, Consistency |
| Hiring Manager | Medium | Payments Domain |
