# PhonePe — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-3 |
| **Level** | Lead |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/phonpe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + DSA + LLD + System Design + HM)
- **Timeline:** 2 weeks

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a UPI Payment Flow State Machine**
   - States: IDLE → COLLECTING_VPA → ENTERING_PIN → PROCESSING → SUCCESS/FAILED/TIMEOUT

### 💡 Interview-Ready Answer

```java
class UPIPaymentStateMachine {
    private PaymentState currentState;
    private final PaymentContext context;
    private final List<StateChangeListener> listeners;
    
    enum PaymentState {
        IDLE,
        COLLECTING_VPA,
        VALIDATING_VPA,
        ENTERING_AMOUNT,
        ENTERING_PIN,
        PROCESSING,
        AWAITING_BANK_RESPONSE,
        SUCCESS,
        FAILED,
        TIMEOUT,
        REFUND_INITIATED,
        REFUNDED
    }
    
    // Valid transitions map
    private static final Map<PaymentState, Set<PaymentState>> VALID_TRANSITIONS = Map.ofEntries(
        Map.entry(PaymentState.IDLE, Set.of(PaymentState.COLLECTING_VPA)),
        Map.entry(PaymentState.COLLECTING_VPA, Set.of(PaymentState.VALIDATING_VPA, PaymentState.IDLE)),
        Map.entry(PaymentState.VALIDATING_VPA, Set.of(PaymentState.ENTERING_AMOUNT, PaymentState.FAILED)),
        Map.entry(PaymentState.ENTERING_AMOUNT, Set.of(PaymentState.ENTERING_PIN, PaymentState.IDLE)),
        Map.entry(PaymentState.ENTERING_PIN, Set.of(PaymentState.PROCESSING, PaymentState.IDLE)),
        Map.entry(PaymentState.PROCESSING, Set.of(PaymentState.AWAITING_BANK_RESPONSE, PaymentState.FAILED, PaymentState.TIMEOUT)),
        Map.entry(PaymentState.AWAITING_BANK_RESPONSE, Set.of(PaymentState.SUCCESS, PaymentState.FAILED, PaymentState.TIMEOUT)),
        Map.entry(PaymentState.TIMEOUT, Set.of(PaymentState.SUCCESS, PaymentState.FAILED, PaymentState.REFUND_INITIATED)),
        Map.entry(PaymentState.FAILED, Set.of(PaymentState.IDLE, PaymentState.REFUND_INITIATED)),
        Map.entry(PaymentState.REFUND_INITIATED, Set.of(PaymentState.REFUNDED, PaymentState.FAILED))
    );
    
    void transition(PaymentState newState) {
        Set<PaymentState> allowed = VALID_TRANSITIONS.getOrDefault(currentState, Set.of());
        
        if (!allowed.contains(newState)) {
            throw new IllegalStateException(
                "Invalid transition: " + currentState + " → " + newState +
                ". Allowed: " + allowed
            );
        }
        
        PaymentState oldState = currentState;
        currentState = newState;
        
        // Execute state entry actions
        onEnter(newState);
        
        // Notify listeners
        listeners.forEach(l -> l.onStateChange(oldState, newState, context));
    }
    
    private void onEnter(PaymentState state) {
        switch (state) {
            case VALIDATING_VPA -> {
                // Async VPA validation
                CompletableFuture.supplyAsync(() -> validateVPA(context.receiverVPA))
                    .thenAccept(valid -> {
                        if (valid) transition(PaymentState.ENTERING_AMOUNT);
                        else {
                            context.errorMessage = "Invalid VPA";
                            transition(PaymentState.FAILED);
                        }
                    });
            }
            case PROCESSING -> {
                // Start timeout timer (30 seconds for UPI)
                context.timeoutFuture = CompletableFuture.delayedExecutor(30, TimeUnit.SECONDS)
                    .execute(() -> {
                        if (currentState == PaymentState.PROCESSING || 
                            currentState == PaymentState.AWAITING_BANK_RESPONSE) {
                            transition(PaymentState.TIMEOUT);
                        }
                    });
                
                // Send to NPCI
                submitToNPCI(context);
            }
            case SUCCESS -> {
                context.completedAt = Instant.now();
                cancelTimeout();
            }
            case FAILED -> {
                cancelTimeout();
            }
            case TIMEOUT -> {
                // UPI timeout: check with bank (status inquiry)
                // RBI mandates: if bank doesn't respond in 30s, auto-reverse
                scheduleStatusInquiry(context);
            }
        }
    }
    
    PaymentState getState() { return currentState; }
    
    // Get allowed next actions for UI
    List<String> getAvailableActions() {
        return switch (currentState) {
            case IDLE -> List.of("START_PAYMENT");
            case COLLECTING_VPA -> List.of("SUBMIT_VPA", "CANCEL");
            case ENTERING_AMOUNT -> List.of("SUBMIT_AMOUNT", "CANCEL");
            case ENTERING_PIN -> List.of("SUBMIT_PIN", "CANCEL");
            case PROCESSING, AWAITING_BANK_RESPONSE -> List.of(); // No user actions
            case SUCCESS -> List.of("NEW_PAYMENT", "VIEW_RECEIPT");
            case FAILED -> List.of("RETRY", "GO_HOME");
            case TIMEOUT -> List.of("CHECK_STATUS", "GO_HOME");
            default -> List.of();
        };
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Design Add and Search Words** (LeetCode 211) using Trie
2. **Follow-up: Support regex patterns (`a*b` matches "aab", "ab", "b")**

### 💡 Trie with Wildcard and Regex

```java
class WordDictionary {
    private final TrieNode root;
    
    WordDictionary() { root = new TrieNode(); }
    
    void addWord(String word) {
        TrieNode curr = root;
        for (char c : word.toCharArray()) {
            curr.children.putIfAbsent(c, new TrieNode());
            curr = curr.children.get(c);
        }
        curr.isEnd = true;
    }
    
    // Search with '.' wildcard (matches any single character)
    boolean search(String word) {
        return searchDFS(root, word, 0);
    }
    
    private boolean searchDFS(TrieNode node, String word, int idx) {
        if (idx == word.length()) return node.isEnd;
        
        char c = word.charAt(idx);
        
        if (c == '.') {
            // Wildcard: try all children
            for (TrieNode child : node.children.values()) {
                if (searchDFS(child, word, idx + 1)) return true;
            }
            return false;
        }
        
        TrieNode child = node.children.get(c);
        return child != null && searchDFS(child, word, idx + 1);
    }
    
    // Follow-up: Support '*' (matches zero or more of previous character)
    // "a*b" matches "b", "ab", "aab", "aaab"
    boolean searchRegex(String pattern) {
        return regexDFS(root, pattern, 0);
    }
    
    private boolean regexDFS(TrieNode node, String pattern, int idx) {
        if (idx == pattern.length()) return node.isEnd;
        
        char c = pattern.charAt(idx);
        
        // Check if next char is '*' (Kleene star)
        if (idx + 1 < pattern.length() && pattern.charAt(idx + 1) == '*') {
            // Zero occurrences of c — skip c* entirely
            if (regexDFS(node, pattern, idx + 2)) return true;
            
            // One or more occurrences of c
            if (c == '.') {
                // '.*' matches any sequence
                for (TrieNode child : node.children.values()) {
                    if (regexDFS(child, pattern, idx)) return true; // Try more matches
                }
            } else {
                TrieNode child = node.children.get(c);
                if (child != null) {
                    if (regexDFS(child, pattern, idx)) return true; // Try more matches
                }
            }
            
            return false;
        }
        
        if (c == '.') {
            for (TrieNode child : node.children.values()) {
                if (regexDFS(child, pattern, idx + 1)) return true;
            }
            return false;
        }
        
        TrieNode child = node.children.get(c);
        return child != null && regexDFS(child, pattern, idx + 1);
    }
    
    static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        boolean isEnd;
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design PhonePe's UPI Transaction Processing System at Scale**
   - 10B+ transactions/month, <2s latency, 99.99% uptime

### 💡 Key Architecture Points

```
PhonePe UPI at Scale:
┌──────────────────────────────────────────────────────────────┐
│  UPI Transaction Flow:                                        │
│  User → PhonePe App → PhonePe PSP → NPCI → Beneficiary PSP  │
│    → Beneficiary Bank → Response back through same chain     │
│                                                                │
│  PhonePe PSP (Payment Service Provider) responsibilities:    │
│  1. VPA resolution: verify receiver's virtual payment address│
│  2. Transaction creation with unique txn ID                  │
│  3. PIN collection (encrypted using NPCI's key)              │
│  4. Forward to NPCI for inter-bank routing                   │
│  5. Handle response (success/failure/pending)                │
│  6. Status inquiry for timeout cases                         │
│                                                                │
│  Scale Architecture:                                          │
│  - 10B+ txns/month = ~3800 TPS average, ~15000 TPS peak     │
│  - Database: PostgreSQL with read replicas (CQRS)            │
│    Write path: hot table (today's transactions)              │
│    Read path: partitioned by date (monthly partitions)       │
│  - Message queue: Kafka for async processing                 │
│    Topics: txn.initiated, txn.processing, txn.completed      │
│  - Cache: Redis cluster for VPA cache, rate limits           │
│                                                                │
│  Idempotency:                                                 │
│  - Every transaction has unique txn_id (UUID)                │
│  - NPCI requires unique reference (UPI Reference Number)     │
│  - If retry with same txn_id → return cached response        │
│  - Redis: SET txn:{id} NX EX 86400 → prevent duplicates     │
│                                                                │
│  Timeout Handling (RBI mandate):                              │
│  - If bank doesn't respond in 30s → mark as TIMEOUT          │
│  - Auto status inquiry every 30s for 5 minutes               │
│  - If still pending after 5 min → auto-reverse (refund)      │
│  - Deemed response: bank settles T+1 via NPCI batch file     │
│                                                                │
│  Monitoring:                                                  │
│  - Real-time success rate per bank (if drops below 90% →     │
│    circuit breaker → show "Bank X is experiencing issues")    │
│  - Transaction latency P50, P90, P99 per bank                │
│  - Alert if TPS exceeds 80% capacity                         │
│                                                                │
│  Scale: 10B txns × 1KB avg = 10TB/month raw transaction data │
│  Archival: move >3 month data to cold storage (S3 + Parquet) │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- PhonePe SDE-3 = **UPI domain depth** + state machine + scale
- **Payment State Machine**: explicit valid transitions map, entry actions, timeout handling
- **Trie with regex/wildcard** — DFS with branching on '.' and '*' (Kleene star)
- **UPI flow**: User → PSP → NPCI → Beneficiary PSP → Bank → reverse path
- **Timeout = auto-reverse** (RBI mandate) — critical to know for Indian fintech
- **Deemed transactions**: bank confirms T+1 via batch file when online response fails
- **Idempotency**: Redis SET NX for preventing duplicate transaction processing
- PhonePe interviews are **deeply UPI-focused** — study NPCI architecture

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | State Machine, UPI Flow, Concurrency |
| DSA | Medium-Hard | Trie, Wildcard Search, Regex |
| System Design | Very Hard | UPI at Scale, NPCI, Timeout Handling |
| HM | Medium | Behavioral, Leadership |
