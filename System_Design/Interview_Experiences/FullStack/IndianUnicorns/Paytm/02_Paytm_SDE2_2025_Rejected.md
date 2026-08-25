# Paytm — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + LLD + System Design + HM)
- **Rejection Reason:** LLD round — class design for UPI Payment wasn't extensible enough

---

## Round 1: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Partition Equal Subset Sum** (LeetCode 416)
2. **Follow-up: Count total number of subsets with given sum**

### 💡 Subset Sum (DP)

```java
// Can we partition array into two subsets with equal sum?
public boolean canPartition(int[] nums) {
    int totalSum = 0;
    for (int n : nums) totalSum += n;
    
    if (totalSum % 2 != 0) return false; // Odd total → impossible
    
    int target = totalSum / 2;
    
    // DP: can we make sum = target using some subset?
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    
    for (int num : nums) {
        // Traverse right to left to avoid using same element twice
        for (int j = target; j >= num; j--) {
            dp[j] = dp[j] || dp[j - num];
        }
    }
    
    return dp[target];
}
// Time: O(n × sum/2), Space: O(sum/2)

// Follow-up: Count subsets with sum = target
public int countSubsetsWithSum(int[] nums, int target) {
    int[] dp = new int[target + 1];
    dp[0] = 1; // Empty subset
    
    for (int num : nums) {
        for (int j = target; j >= num; j--) {
            dp[j] += dp[j - num];
        }
    }
    
    return dp[target];
}
```

---

## Round 2: LLD (Where I Failed)
**Duration:** 60 minutes

### Questions Asked
1. **Design UPI Payment System** (like Paytm)
   - P2P transfer, merchant payment, bill payment, split payment, refund

### 💡 What I Should Have Designed

```java
// Payment Strategy Pattern (extensible for different payment types)
interface PaymentStrategy {
    PaymentResult execute(PaymentRequest request);
    boolean validate(PaymentRequest request);
    PaymentResult refund(String transactionId, double amount);
}

class UPIPaymentStrategy implements PaymentStrategy {
    private final BankAdapter bankAdapter;
    private final TransactionRepository txnRepo;
    private final FraudDetectionService fraudService;
    
    public PaymentResult execute(PaymentRequest request) {
        // 1. Validate
        if (!validate(request)) {
            return PaymentResult.failure("Validation failed");
        }
        
        // 2. Fraud check
        FraudScore score = fraudService.assess(request);
        if (score.isHighRisk()) {
            return PaymentResult.failure("Transaction blocked by risk engine");
        }
        
        // 3. Create transaction record (INITIATED)
        Transaction txn = txnRepo.create(Transaction.builder()
            .id(UUID.randomUUID().toString())
            .senderId(request.senderId())
            .receiverId(request.receiverId())
            .amount(request.amount())
            .type(request.type())
            .status(TransactionStatus.INITIATED)
            .createdAt(Instant.now())
            .build());
        
        // 4. Execute via bank (NPCI → PSP → Bank)
        BankResponse debit = bankAdapter.debit(request.senderVPA(), request.amount(), txn.id());
        
        if (!debit.success()) {
            txnRepo.updateStatus(txn.id(), TransactionStatus.FAILED, debit.errorMessage());
            return PaymentResult.failure(debit.errorMessage());
        }
        
        BankResponse credit = bankAdapter.credit(request.receiverVPA(), request.amount(), txn.id());
        
        if (!credit.success()) {
            // Debit succeeded but credit failed → auto-refund
            bankAdapter.refund(request.senderVPA(), request.amount(), txn.id());
            txnRepo.updateStatus(txn.id(), TransactionStatus.REFUNDED, "Credit failed, auto-refunded");
            return PaymentResult.failure("Transfer failed, refund initiated");
        }
        
        txnRepo.updateStatus(txn.id(), TransactionStatus.SUCCESS);
        return PaymentResult.success(txn.id());
    }
    
    public boolean validate(PaymentRequest request) {
        // VPA format: username@bankhandle
        if (!isValidVPA(request.senderVPA()) || !isValidVPA(request.receiverVPA())) return false;
        if (request.amount() <= 0 || request.amount() > 100000) return false; // UPI limit ₹1L
        if (request.senderVPA().equals(request.receiverVPA())) return false; // Self-transfer
        return true;
    }
}

// Split Payment (extends base payment)
class SplitPaymentService {
    private final PaymentStrategy paymentStrategy;
    
    record SplitRequest(String payerId, List<SplitMember> members, double totalAmount, SplitType type) {}
    record SplitMember(String userId, String vpa, double customAmount) {}
    enum SplitType { EQUAL, EXACT, PERCENTAGE }
    
    List<SplitResult> executeSplit(SplitRequest request) {
        List<SplitResult> results = new ArrayList<>();
        Map<String, Double> shares = calculateShares(request);
        
        for (var entry : shares.entrySet()) {
            String memberId = entry.getKey();
            double amount = entry.getValue();
            
            if (memberId.equals(request.payerId())) continue; // Payer doesn't pay themselves
            
            // Create collect request (request money from member)
            // In UPI: this is a "collect" request, not direct debit
            String collectRequestId = createCollectRequest(request.payerId(), memberId, amount);
            results.add(new SplitResult(memberId, amount, collectRequestId, "PENDING"));
        }
        
        return results;
    }
    
    private Map<String, Double> calculateShares(SplitRequest request) {
        Map<String, Double> shares = new HashMap<>();
        
        switch (request.type()) {
            case EQUAL -> {
                double perPerson = Math.round(request.totalAmount() / request.members().size() * 100.0) / 100.0;
                // Handle rounding: first person gets the extra penny
                double remaining = request.totalAmount();
                for (int i = 0; i < request.members().size(); i++) {
                    double share = (i == 0) ? remaining - perPerson * (request.members().size() - 1) : perPerson;
                    shares.put(request.members().get(i).userId(), share);
                    remaining -= share;
                }
            }
            case EXACT -> {
                double total = 0;
                for (SplitMember m : request.members()) {
                    shares.put(m.userId(), m.customAmount());
                    total += m.customAmount();
                }
                if (Math.abs(total - request.totalAmount()) > 0.01) {
                    throw new IllegalArgumentException("Split amounts don't sum to total");
                }
            }
            case PERCENTAGE -> {
                double totalPercent = 0;
                for (SplitMember m : request.members()) {
                    double amount = request.totalAmount() * m.customAmount() / 100.0;
                    shares.put(m.userId(), Math.round(amount * 100.0) / 100.0);
                    totalPercent += m.customAmount();
                }
                if (Math.abs(totalPercent - 100.0) > 0.01) {
                    throw new IllegalArgumentException("Percentages don't sum to 100");
                }
            }
        }
        
        return shares;
    }
}

// Transaction States (UPI-specific):
// INITIATED → PENDING → SUCCESS
//                     → FAILED → REFUND_INITIATED → REFUNDED
//                     → TIMEOUT (after 30s) → auto-status check → DEEMED (bank confirms later)
```

---

## 🎯 Key Takeaways
- Paytm SDE-2 = **UPI payment flow + LLD is critical**
- **Equal Partition** = classic 0/1 knapsack DP — know the 1D optimization
- **UPI Payment LLD**: Strategy Pattern for different payment types, VPA validation, collect request for splits
- **Split payment** with rounding: first person absorbs rounding error (0.01₹ maximum)
- **UPI transaction states**: INITIATED → PENDING → SUCCESS/FAILED/TIMEOUT/DEEMED
- **Deemed transactions**: bank confirms later (T+1 day) — unique to Indian UPI
- I failed because I used a single PaymentService class without Strategy → not extensible for future payment modes (wallet, card, net banking)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | DP (Subset Sum), 0/1 Knapsack |
| LLD | Hard | Strategy Pattern, UPI Flow, Split Payment |
| System Design | Hard | Wallet System, Transaction Processing |
| HM | Medium | Behavioral |
