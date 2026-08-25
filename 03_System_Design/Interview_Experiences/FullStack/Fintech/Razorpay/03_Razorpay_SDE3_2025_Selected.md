# Razorpay — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-3 |
| **Level** | Principal |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + DSA + LLD + System Design + HM)
- **Timeline:** 2 weeks

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Multi-Step Payment Onboarding Form**
   - Business details → KYC → Bank verification → Review → Submit
   - Progress indicator, validation per step, save-and-resume

### 💡 Key Implementation Points

```java
class OnboardingWorkflow {
    private final Map<String, StepData> stepDataStore;
    private final List<Step> steps;
    private int currentStepIndex;
    private String applicationId;
    
    enum StepStatus { NOT_STARTED, IN_PROGRESS, COMPLETED, REJECTED }
    
    record Step(String id, String name, StepValidator validator, StepStatus status) {}
    
    interface StepValidator {
        ValidationResult validate(Map<String, Object> data);
    }
    
    // Business Details Validator
    StepValidator businessValidator = (data) -> {
        List<String> errors = new ArrayList<>();
        
        String businessName = (String) data.get("businessName");
        if (businessName == null || businessName.trim().length() < 3) {
            errors.add("Business name must be at least 3 characters");
        }
        
        String pan = (String) data.get("pan");
        if (pan == null || !pan.matches("[A-Z]{5}[0-9]{4}[A-Z]")) {
            errors.add("Invalid PAN number (format: ABCDE1234F)");
        }
        
        String gstin = (String) data.get("gstin");
        if (gstin != null && !gstin.isEmpty() && !gstin.matches("\\d{2}[A-Z]{5}\\d{4}[A-Z]\\dZ[A-Z\\d]")) {
            errors.add("Invalid GSTIN format");
        }
        
        return new ValidationResult(errors.isEmpty(), errors);
    };
    
    // KYC Validator
    StepValidator kycValidator = (data) -> {
        List<String> errors = new ArrayList<>();
        
        String aadhaar = (String) data.get("aadhaarNumber");
        if (aadhaar == null || !aadhaar.matches("\\d{12}")) {
            errors.add("Aadhaar must be 12 digits");
        }
        
        // Verhoeff algorithm validation for Aadhaar
        if (aadhaar != null && aadhaar.matches("\\d{12}") && !isValidAadhaar(aadhaar)) {
            errors.add("Invalid Aadhaar number (checksum failed)");
        }
        
        return new ValidationResult(errors.isEmpty(), errors);
    };
    
    // Save state for resume later
    void saveProgress(String stepId, Map<String, Object> data) {
        stepDataStore.put(stepId, new StepData(data, StepStatus.IN_PROGRESS, Instant.now()));
    }
    
    // Resume from saved state
    OnboardingState resume(String applicationId) {
        // Load all step data from DB
        // Find first incomplete step → set as current
        for (int i = 0; i < steps.size(); i++) {
            StepData data = stepDataStore.get(steps.get(i).id);
            if (data == null || data.status != StepStatus.COMPLETED) {
                currentStepIndex = i;
                break;
            }
        }
        
        return new OnboardingState(currentStepIndex, steps, stepDataStore);
    }
    
    // Bank verification with penny drop
    CompletableFuture<VerificationResult> verifyBankAccount(String accountNumber, String ifsc) {
        return CompletableFuture.supplyAsync(() -> {
            // 1. Penny drop: transfer ₹1 to verify account
            // 2. Check beneficiary name matches business name
            // 3. IFSC validation against RBI registry
            return bankService.pennyDrop(accountNumber, ifsc);
        }).thenApply(result -> {
            if (result.success) {
                return new VerificationResult(true, result.beneficiaryName);
            }
            return new VerificationResult(false, "Bank verification failed: " + result.error);
        });
    }
    
    record StepData(Map<String, Object> data, StepStatus status, Instant lastModified) {}
    record ValidationResult(boolean valid, List<String> errors) {}
    record VerificationResult(boolean verified, String message) {}
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Smallest Range Covering Elements from K Lists** (LeetCode 632)

### 💡 Interview-Ready Answer

```java
public int[] smallestRange(List<List<Integer>> nums) {
    // Min-heap: track current element from each list
    // Max tracker: track the current maximum
    PriorityQueue<int[]> minHeap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    // [value, listIndex, elementIndex]
    
    int currentMax = Integer.MIN_VALUE;
    
    // Initialize: add first element of each list
    for (int i = 0; i < nums.size(); i++) {
        int val = nums.get(i).get(0);
        minHeap.offer(new int[]{val, i, 0});
        currentMax = Math.max(currentMax, val);
    }
    
    int[] bestRange = {minHeap.peek()[0], currentMax};
    
    while (true) {
        int[] min = minHeap.poll();
        int val = min[0], listIdx = min[1], elemIdx = min[2];
        
        // Update best range
        if (currentMax - val < bestRange[1] - bestRange[0]) {
            bestRange[0] = val;
            bestRange[1] = currentMax;
        }
        
        // Move to next element in the same list
        if (elemIdx + 1 >= nums.get(listIdx).size()) break; // List exhausted
        
        int nextVal = nums.get(listIdx).get(elemIdx + 1);
        minHeap.offer(new int[]{nextVal, listIdx, elemIdx + 1});
        currentMax = Math.max(currentMax, nextVal);
    }
    
    return bestRange;
}
// Time: O(N × log K) where N = total elements, K = number of lists
// Space: O(K) for the heap

// Key insight: maintain one element per list in the heap
// Range = [heap.peek(), currentMax]
// Always advance the minimum to try to shrink the range
// Stop when any list is exhausted (can't cover all K lists anymore)
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Razorpay's Payment Routing Engine**
   - Route payments through optimal payment gateway based on success rate, cost, latency

### 💡 Interview-Ready Answer

```
Payment Routing Engine:
┌──────────────────────────────────────────────────────────────┐
│  Why Routing? Razorpay is a payment aggregator:              │
│  - Integrates with 15+ payment gateways (HDFC, ICICI,       │
│    Axis, Paytm, BillDesk, CCAvenue, etc.)                   │
│  - Same payment can go through different gateways            │
│  - Goal: maximize success rate while minimizing cost         │
│                                                                │
│  Routing Decision Factors:                                    │
│  1. Payment method: card (issuing bank matters), UPI, NB     │
│  2. Card BIN → issuing bank → best gateway for that bank     │
│  3. Historical success rate per (gateway, bank, method) combo│
│  4. Gateway health: current error rate, latency              │
│  5. Cost: MDR (Merchant Discount Rate) per gateway           │
│  6. Merchant preference: some merchants prefer specific GW   │
│  7. Amount threshold: some GWs have txn amount limits        │
│                                                                │
│  Routing Algorithm:                                           │
│  Step 1: Filter eligible gateways                            │
│  - Supports payment method? ✓                                │
│  - Within amount limits? ✓                                   │
│  - Gateway healthy (circuit breaker not open)? ✓             │
│  - Merchant has this gateway enabled? ✓                      │
│                                                                │
│  Step 2: Score each eligible gateway                         │
│  score = w1 × success_rate + w2 × (1 - cost_ratio) +        │
│          w3 × (1 - latency_ratio) + w4 × volume_capacity    │
│                                                                │
│  success_rate: 30-day rolling for (gateway, issuer, method)  │
│  cost_ratio: MDR / max_MDR across all GWs                   │
│  latency_ratio: P50_latency / max_latency                   │
│  volume_capacity: 1 - (current_tps / max_tps)               │
│                                                                │
│  Default weights: w1=0.5, w2=0.2, w3=0.15, w4=0.15         │
│                                                                │
│  Step 3: Select with exploration                             │
│  - 90% of the time: pick highest-scoring gateway (exploit)   │
│  - 10% of the time: weighted random across top-3 (explore)  │
│  - Why? Discover if a previously poor gateway has improved   │
│                                                                │
│  Failover:                                                    │
│  ┌──────────┐  fail  ┌──────────┐  fail  ┌──────────┐      │
│  │ Gateway A │──────▶│ Gateway B │──────▶│ Gateway C │      │
│  │ (primary) │       │ (fallback)│       │ (last try)│      │
│  └──────────┘       └──────────┘       └──────────┘      │
│                                                                │
│  Auto-failover rules:                                        │
│  - Retry on: timeout, gateway_down, bank_system_error        │
│  - Don't retry on: insufficient_funds, invalid_card, expired │
│  - Max 2 retries (3 attempts total)                          │
│  - Different gateway each retry                              │
│  - Same idempotency key across retries (prevent double charge│
│                                                                │
│  Circuit Breaker (per gateway):                               │
│  - If error rate > 30% in last 5 minutes → OPEN (stop using)│
│  - After 60s → HALF_OPEN (send 10% traffic to test)         │
│  - If test traffic succeeds → CLOSED (resume full traffic)   │
│                                                                │
│  Data Pipeline:                                               │
│  - Every transaction result → Kafka → routing_analytics      │
│  - Aggregate: per-minute success rate / latency / error codes│
│  - Update routing weights: every 5 minutes                   │
│  - Dashboard: real-time gateway health + routing distribution │
│                                                                │
│  Scale:                                                       │
│  - 10M+ transactions/day                                     │
│  - Routing decision: <5ms (Redis-cached scoring table)       │
│  - Failover: <500ms for retry to different gateway           │
│  - 99.99% uptime requirement                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Razorpay SDE-3 = **payment routing is THE system design question**
- **Multi-step onboarding** with save-and-resume, PAN/GSTIN/Aadhaar validation
- **Penny drop** for bank verification — unique to Indian fintech
- **Smallest Range K Lists** = min-heap tracking one element per list + max tracker
- **Payment routing** = multi-factor scoring (success rate, cost, latency, health)
- **Epsilon-greedy exploration**: 10% random routing to discover gateway improvements
- **Circuit Breaker per gateway**: prevent sending traffic to failing gateways
- **Idempotency across retries**: same key = same payment, even if different gateway
- Razorpay values **payment domain depth** — know MDR, BIN routing, issuing bank logic

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Multi-Step Form, Validation, KYC |
| DSA | Hard | Min-Heap, K-way Merge, Smallest Range |
| System Design | Very Hard | Payment Routing, Circuit Breaker, Failover |
| HM | Medium | Behavioral, Leadership |
