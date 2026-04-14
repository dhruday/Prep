# Razorpay — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-3 FullStack |
| **Level** | Lead |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | Didn't handle PSP failover and retry dedup in HLD |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Coding + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Find Median from Data Stream** (LeetCode 295) — Two heaps
2. **Follow-up: What if data doesn't fit in memory? (External sorting + streaming median)**

### 💡 Median from Data Stream

```java
class MedianFinder {
    // maxHeap stores the smaller half (peek = largest of small half)
    private final PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
    // minHeap stores the larger half (peek = smallest of large half)
    private final PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    
    void addNum(int num) {
        maxHeap.offer(num);
        
        // Balance: maxHeap's max should be <= minHeap's min
        minHeap.offer(maxHeap.poll());
        
        // Keep sizes balanced (maxHeap can have at most 1 more than minHeap)
        if (minHeap.size() > maxHeap.size()) {
            maxHeap.offer(minHeap.poll());
        }
    }
    
    double findMedian() {
        if (maxHeap.size() > minHeap.size()) {
            return maxHeap.peek();
        }
        return (maxHeap.peek() + minHeap.peek()) / 2.0;
    }
}
// Time: addNum O(log n), findMedian O(1)
// Space: O(n)

// Follow-up: External median for data that doesn't fit in memory
// Approach: 
// 1. Sort data in chunks that fit in memory
// 2. Write sorted chunks to disk
// 3. Binary search on the median value:
//    - For a candidate value X, count how many values <= X across all chunks
//    - Use binary search on X to find the value where count = n/2
// Time: O(chunks * log(chunk_size) * log(value_range))
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Razorpay's Payment Processing Pipeline**
   - Order → Payment → PSP routing → Settlement
   - Multi-PSP fallover: if HDFC gateway down, fallback to Axis
   - Idempotency: no duplicate charges
   - Reconciliation: match settlements with payments
   - PCI-DSS compliance for card data

### 💡 Key Design

```
Architecture:
┌──────────────────────────────────────────────────────┐
│                Merchant's Website                      │
│  <script src="razorpay.js">                           │
│  Checkout → Iframe → Card data never touches merchant │
└──────────┬───────────────────────────────────────────┘
           │ (tokenized)
   ┌───────▼────────┐
   │ API Gateway     │ (TLS 1.3, mTLS for PSPs)
   │ Rate Limit +    │
   │ Auth + WAF      │
   └───────┬────────┘
           │
  ┌────────▼─────────┐
  │  Order Service    │  order_id → payment_id mapping
  └────────┬─────────┘
           │
  ┌────────▼─────────┐
  │ Payment Router    │  Intelligent PSP selection
  │                   │  - Card BIN → preferred PSP
  │                   │  - Success rate per PSP (rolling 1h)
  │                   │  - Cost optimization
  │                   │  - Failover logic
  └────────┬─────────┘
           │
    ┌──────┼──────────┐
    │      │          │
  ┌─▼──┐ ┌▼───┐ ┌───▼──┐
  │HDFC│ │Axis│ │Paytm │  PSP Adapters (Strategy pattern)
  │Gate│ │Gate│ │Gate  │
  └─┬──┘ └─┬──┘ └──┬──┘
    │      │       │
    └──────┼───────┘
           │ Settlement files (T+1 / T+2)
  ┌────────▼─────────┐
  │ Reconciliation   │  Match payments ↔ settlements
  │ Service           │  Flag discrepancies
  └──────────────────┘

PSP Routing with Failover:
class PaymentRouter {
    PaymentResult processPayment(PaymentRequest request) {
        // 1. Get ordered list of PSPs to try
        List<PSP> pspChain = getRoutingChain(request);
        
        // 2. Try each PSP in order (failover chain)
        String idempotencyKey = request.getIdempotencyKey();
        
        for (PSP psp : pspChain) {
            // Check if already attempted with this PSP (idempotency)
            PaymentAttempt existing = attemptRepo.findByIdempotencyKeyAndPsp(idempotencyKey, psp.getId());
            if (existing != null && existing.isTerminal()) {
                if (existing.isSuccess()) return PaymentResult.success(existing);
                continue; // Already failed with this PSP, try next
            }
            
            try {
                var attempt = PaymentAttempt.builder()
                    .paymentId(request.getPaymentId())
                    .pspId(psp.getId())
                    .idempotencyKey(idempotencyKey + ":" + psp.getId())
                    .amount(request.getAmount())
                    .status(AttemptStatus.INITIATED)
                    .build();
                attemptRepo.save(attempt);
                
                // Call PSP adapter
                PSPResponse response = psp.getAdapter().charge(request, attempt.idempotencyKey);
                
                if (response.isSuccess()) {
                    attempt.setStatus(AttemptStatus.SUCCESS);
                    attempt.setPspTxnId(response.getTxnId());
                    attemptRepo.save(attempt);
                    
                    // Update success rate metrics
                    metricsService.recordSuccess(psp.getId(), request.getCardBIN());
                    
                    return PaymentResult.success(attempt);
                } else if (response.isRetryable()) {
                    attempt.setStatus(AttemptStatus.FAILED_RETRYABLE);
                    attemptRepo.save(attempt);
                    
                    metricsService.recordFailure(psp.getId(), request.getCardBIN());
                    continue; // Try next PSP
                } else {
                    // Terminal failure (e.g., insufficient funds, card declined)
                    attempt.setStatus(AttemptStatus.FAILED_TERMINAL);
                    attempt.setFailureReason(response.getErrorCode());
                    attemptRepo.save(attempt);
                    
                    return PaymentResult.declined(response.getErrorCode());
                }
                
            } catch (PSPTimeoutException e) {
                // Timeout: DON'T retry immediately — check status first
                // The charge might have gone through
                attempt.setStatus(AttemptStatus.TIMEOUT_PENDING);
                attemptRepo.save(attempt);
                
                // Schedule status check after 30s
                scheduler.schedule(() -> checkPendingPayment(attempt), Duration.ofSeconds(30));
                
                continue; // Try next PSP (with different idempotency key)
            }
        }
        
        return PaymentResult.allPSPsFailed();
    }
    
    List<PSP> getRoutingChain(PaymentRequest request) {
        String cardBIN = request.getCardNumber().substring(0, 6);
        
        return pspRegistry.getAll().stream()
            .filter(psp -> psp.supportsCardNetwork(request.getCardNetwork()))
            .sorted(Comparator.comparingDouble(psp -> {
                // Score: 60% success rate + 25% cost + 15% latency
                double successRate = metricsService.getSuccessRate(psp.getId(), cardBIN);
                double costScore = 1.0 - (psp.getFeePercent() / 3.0); // Normalize to 0-1
                double latencyScore = 1.0 - (psp.getP50Latency() / 5000.0); // < 5s = good
                
                return -(successRate * 0.6 + costScore * 0.25 + latencyScore * 0.15);
            }))
            .limit(3) // Max 3 PSP attempts
            .toList();
    }
}

Reconciliation (T+1):
class ReconciliationService {
    @Scheduled(cron = "0 0 6 * * *") // 6 AM daily
    void reconcile() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        
        for (PSP psp : pspRegistry.getAll()) {
            // 1. Download settlement file from PSP
            List<SettlementRecord> pspRecords = psp.getAdapter().downloadSettlement(yesterday);
            
            // 2. Fetch our payment records
            List<PaymentAttempt> ourRecords = attemptRepo.findByPspAndDate(psp.getId(), yesterday);
            
            // 3. Match by PSP transaction ID
            Map<String, SettlementRecord> pspMap = pspRecords.stream()
                .collect(Collectors.toMap(SettlementRecord::getTxnId, Function.identity()));
            
            for (PaymentAttempt attempt : ourRecords) {
                SettlementRecord match = pspMap.remove(attempt.getPspTxnId());
                
                if (match == null) {
                    // Missing in PSP: our record says success but PSP doesn't have it
                    alertService.raise("MISSING_IN_PSP", attempt);
                } else if (!match.getAmount().equals(attempt.getAmount())) {
                    // Amount mismatch
                    alertService.raise("AMOUNT_MISMATCH", attempt, match);
                } else {
                    // Match found — mark settled
                    attempt.setSettledAmount(match.getSettledAmount());
                    attempt.setSettlementDate(yesterday);
                    attemptRepo.save(attempt);
                }
            }
            
            // Remaining in pspMap: present in PSP but missing in our records
            for (SettlementRecord orphan : pspMap.values()) {
                alertService.raise("MISSING_IN_OUR_RECORDS", orphan);
            }
        }
    }
}

PCI-DSS Compliance:
1. Card data ONLY in iframe (Razorpay.js) → tokenized before reaching merchant
2. Token sent to Razorpay API → decrypted in PCI-compliant vault
3. Card data at rest: AES-256 encryption, HSM for key management
4. Network: dedicated PCI zone with restricted access
5. Audit: quarterly PCI-DSS assessment, annual ROC
```

---

## 🎯 Key Takeaways
- Razorpay = **payment routing + PSP failover + reconciliation + PCI compliance**
- **Two-heap median**: maxHeap (small half) + minHeap (large half) → O(1) median, O(log n) add
- **PSP routing**: score by success_rate(60%) + cost(25%) + latency(15%) → try top 3 in order
- **Timeout handling**: DON'T assume failure — schedule status check before retrying elsewhere
- **Idempotency per PSP**: append PSP ID to idempotency key → different key per PSP attempt
- **Reconciliation**: daily T+1 matching of our records vs PSP settlement files → flag discrepancies
- **PCI-DSS**: card data in iframe only, tokenized before crossing merchant boundary, HSM for keys
- Razorpay interviews: **deep fintech domain knowledge required** — know UPI, card flows, settlement

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, Math |
| Coding | Hard | Median from Stream, Two Heaps |
| System Design | Hard | Payment Pipeline, PSP Routing, Recon |
| HM | Medium | Fintech Domain, Leadership |
