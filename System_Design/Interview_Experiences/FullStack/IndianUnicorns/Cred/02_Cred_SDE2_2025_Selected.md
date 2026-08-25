# Cred — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Cred |
| **Role** | SDE-2 Backend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/cred-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + DSA + System Design + Founder Round)
- **Timeline:** 10 days
- **Notes:** Cred is known for extremely high bar, especially machine coding

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Credit Card Bill Reminder & Auto-Pay System**
   - Multiple cards, due dates, minimum/full payment, auto-debit scheduling

### 💡 Interview-Ready Answer

```java
public class BillReminderSystem {
    private final Map<String, CreditCard> cards;
    private final Map<String, List<Reminder>> reminders;
    private final Map<String, AutoPayConfig> autoPayConfigs;
    private final ScheduledExecutorService scheduler;
    
    record CreditCard(String id, String last4, String bank, double creditLimit,
                      double currentOutstanding, int billGenerationDay, int dueDay) {}
    
    record Reminder(String id, String cardId, int daysBefore, boolean sent,
                    NotificationChannel channel) {}
    
    enum NotificationChannel { PUSH, EMAIL, SMS }
    enum PaymentType { MINIMUM_DUE, TOTAL_DUE, CUSTOM_AMOUNT }
    
    record AutoPayConfig(String cardId, PaymentType type, double customAmount,
                         String bankAccountId, boolean enabled) {}
    
    public BillReminderSystem() {
        this.cards = new ConcurrentHashMap<>();
        this.reminders = new ConcurrentHashMap<>();
        this.autoPayConfigs = new ConcurrentHashMap<>();
        this.scheduler = Executors.newScheduledThreadPool(2);
        
        // Run daily at 8 AM
        scheduleDaily(() -> processReminders(), 8, 0);
        scheduleDaily(() -> processAutoPayments(), 6, 0); // Auto-pay at 6 AM on due date
    }
    
    void addCard(CreditCard card) {
        cards.put(card.id, card);
        
        // Set default reminders: 7 days, 3 days, 1 day before due
        reminders.put(card.id, List.of(
            new Reminder(UUID.randomUUID().toString(), card.id, 7, false, NotificationChannel.PUSH),
            new Reminder(UUID.randomUUID().toString(), card.id, 3, false, NotificationChannel.EMAIL),
            new Reminder(UUID.randomUUID().toString(), card.id, 1, false, NotificationChannel.PUSH)
        ));
    }
    
    void configureAutoPay(String cardId, PaymentType type, double customAmount, String bankAccountId) {
        if (!cards.containsKey(cardId)) throw new IllegalArgumentException("Card not found");
        
        if (type == PaymentType.CUSTOM_AMOUNT && customAmount <= 0) {
            throw new IllegalArgumentException("Custom amount must be positive");
        }
        
        autoPayConfigs.put(cardId, new AutoPayConfig(cardId, type, customAmount, bankAccountId, true));
    }
    
    void processReminders() {
        LocalDate today = LocalDate.now();
        
        for (var entry : cards.entrySet()) {
            CreditCard card = entry.getValue();
            LocalDate dueDate = getNextDueDate(card);
            long daysUntilDue = ChronoUnit.DAYS.between(today, dueDate);
            
            List<Reminder> cardReminders = reminders.getOrDefault(card.id, List.of());
            for (Reminder reminder : cardReminders) {
                if (reminder.daysBefore == daysUntilDue && !reminder.sent) {
                    sendNotification(card, reminder, dueDate);
                }
            }
        }
    }
    
    void processAutoPayments() {
        LocalDate today = LocalDate.now();
        
        for (var entry : autoPayConfigs.entrySet()) {
            AutoPayConfig config = entry.getValue();
            if (!config.enabled) continue;
            
            CreditCard card = cards.get(config.cardId);
            if (card == null) continue;
            
            LocalDate dueDate = getNextDueDate(card);
            if (!today.equals(dueDate)) continue; // Only on due date
            
            double amount = switch (config.type) {
                case MINIMUM_DUE -> Math.max(card.currentOutstanding * 0.05, 200); // 5% or ₹200
                case TOTAL_DUE -> card.currentOutstanding;
                case CUSTOM_AMOUNT -> Math.min(config.customAmount, card.currentOutstanding);
            };
            
            if (amount <= 0) continue; // No outstanding
            
            // Execute payment
            PaymentResult result = executePayment(config.bankAccountId, card.id, amount);
            
            if (result.success) {
                // Update outstanding
                CreditCard updated = new CreditCard(card.id, card.last4, card.bank,
                    card.creditLimit, card.currentOutstanding - amount,
                    card.billGenerationDay, card.dueDay);
                cards.put(card.id, updated);
                
                sendNotification(card, "Auto-pay successful: ₹" + String.format("%.2f", amount));
            } else {
                // Retry once after 2 hours
                scheduler.schedule(() -> {
                    PaymentResult retry = executePayment(config.bankAccountId, card.id, amount);
                    if (!retry.success) {
                        sendNotification(card, "Auto-pay FAILED. Please pay manually.");
                    }
                }, 2, TimeUnit.HOURS);
            }
        }
    }
    
    // Bill analysis
    BillSummary getBillSummary(String cardId) {
        CreditCard card = cards.get(cardId);
        double minimumDue = Math.max(card.currentOutstanding * 0.05, 200);
        double interestIfMinimum = (card.currentOutstanding - minimumDue) * 0.035; // 3.5% per month
        
        return new BillSummary(
            card.currentOutstanding,
            minimumDue,
            card.currentOutstanding, // Full amount
            interestIfMinimum,
            getNextDueDate(card),
            ChronoUnit.DAYS.between(LocalDate.now(), getNextDueDate(card))
        );
    }
    
    record BillSummary(double totalDue, double minimumDue, double fullAmount,
                       double interestIfMinimumPaid, LocalDate dueDate, long daysRemaining) {}
    record PaymentResult(boolean success, String transactionId, String errorMessage) {}
    
    private LocalDate getNextDueDate(CreditCard card) {
        LocalDate today = LocalDate.now();
        LocalDate dueDate = today.withDayOfMonth(Math.min(card.dueDay, today.lengthOfMonth()));
        if (dueDate.isBefore(today) || dueDate.isEqual(today)) {
            dueDate = dueDate.plusMonths(1);
        }
        return dueDate;
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Design HashMap from Scratch** (LeetCode 706) with collision handling
2. **Follow-up: Dynamic resizing + thread-safe version**

### 💡 HashMap with Resizing

```java
class MyHashMap<K, V> {
    private static final int INITIAL_CAPACITY = 16;
    private static final double LOAD_FACTOR = 0.75;
    
    private Node<K, V>[] buckets;
    private int size;
    
    @SuppressWarnings("unchecked")
    MyHashMap() {
        buckets = new Node[INITIAL_CAPACITY];
        size = 0;
    }
    
    void put(K key, V value) {
        if ((double) size / buckets.length >= LOAD_FACTOR) {
            resize();
        }
        
        int idx = getBucketIndex(key);
        Node<K, V> node = buckets[idx];
        
        // Check if key exists
        while (node != null) {
            if (node.key.equals(key)) {
                node.value = value; // Update
                return;
            }
            node = node.next;
        }
        
        // Insert at head
        Node<K, V> newNode = new Node<>(key, value);
        newNode.next = buckets[idx];
        buckets[idx] = newNode;
        size++;
    }
    
    V get(K key) {
        int idx = getBucketIndex(key);
        Node<K, V> node = buckets[idx];
        
        while (node != null) {
            if (node.key.equals(key)) return node.value;
            node = node.next;
        }
        
        return null;
    }
    
    boolean remove(K key) {
        int idx = getBucketIndex(key);
        Node<K, V> prev = null, curr = buckets[idx];
        
        while (curr != null) {
            if (curr.key.equals(key)) {
                if (prev == null) buckets[idx] = curr.next;
                else prev.next = curr.next;
                size--;
                return true;
            }
            prev = curr;
            curr = curr.next;
        }
        
        return false;
    }
    
    @SuppressWarnings("unchecked")
    private void resize() {
        Node<K, V>[] oldBuckets = buckets;
        buckets = new Node[oldBuckets.length * 2];
        size = 0;
        
        for (Node<K, V> head : oldBuckets) {
            Node<K, V> curr = head;
            while (curr != null) {
                put(curr.key, curr.value);
                curr = curr.next;
            }
        }
    }
    
    private int getBucketIndex(K key) {
        int hash = key.hashCode();
        // Spread hash bits (Java HashMap's approach)
        hash ^= (hash >>> 16);
        return Math.abs(hash) % buckets.length;
    }
    
    static class Node<K, V> {
        K key; V value; Node<K, V> next;
        Node(K k, V v) { key = k; value = v; }
    }
}

// Thread-safe: ConcurrentHashMap uses segment locking (striped locks)
// Lock only the bucket being accessed, not entire map
// Java 8+: uses CAS + synchronized on bucket head node
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design CRED's Credit Score Monitoring & Reward System**

### 💡 Interview-Ready Answer

```
CRED Score + Rewards:
┌──────────────────────────────────────────────────────────────┐
│  Credit Score Monitoring:                                     │
│  - Pull credit report from bureaus (CIBIL, Experian, Equifax)│
│  - Frequency: monthly refresh (bureau allows 1 soft pull/month│ per user)
│  - Store historical scores for trend visualization           │
│  - Alert on significant changes (±20 points)                 │
│                                                                │
│  Bureau Integration:                                          │
│  - Batch pull: nightly job pulls scores for users due refresh│
│  - API: POST /credit-bureau/pull { pan_number, consent_id }  │
│  - Response: { score, factors, accounts, inquiries }         │
│  - Cache: Redis (score + timestamp), refresh only if stale   │
│  - Consent: RBI mandates explicit user consent for each pull │
│                                                                │
│  Rewards Engine:                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐       │
│  │ Event Source   │───▶│ Rules Engine  │───▶│ Wallet    │       │
│  │ (bill payment) │    │ (drools/custom│    │ Service   │       │
│  │               │    │  rule engine) │    │           │       │
│  └──────────────┘    └──────────────┘    └──────────┘       │
│                                                                │
│  Reward Rules:                                                │
│  1. Bill payment: X CRED coins per ₹100 paid                │
│  2. On-time payment streak: bonus multiplier (1.5x after 3mo)│
│  3. Referral: fixed CRED coins for referrer + referee        │
│  4. Score improvement: bonus for +50 points over 6 months    │
│  5. Murder Mystery / CRED Store: gamification rewards        │
│                                                                │
│  Reward schema:                                               │
│  rewards_ledger:                                              │
│    txn_id UUID PK                                            │
│    user_id UUID FK                                           │
│    type ENUM('EARN','SPEND','EXPIRE')                        │
│    coins INT                                                 │
│    source VARCHAR -- "bill_payment", "referral", "streak"    │
│    reference_id VARCHAR -- bill_id, referral_id              │
│    expires_at TIMESTAMP                                      │
│    created_at TIMESTAMP                                      │
│                                                                │
│  Balance = SUM(EARN) - SUM(SPEND) - SUM(EXPIRE)             │
│  where created_at > now() - interval '1 year'               │
│                                                                │
│  Anti-Gaming:                                                 │
│  - Rate limit: max 5 bill payments per card per day          │
│  - Minimum payment: ₹100 to earn coins                      │
│  - Detect: split payments (pay ₹100 10 times = 10x reward?) │
│    → cap daily coin earning per card                         │
│  - Device fingerprint: detect multi-account abuse            │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Cred = **fintech + clean code + gamification** — machine coding is king
- **Bill reminder system** with auto-pay scheduling = Cred's core product
- **Interest calculation**: 3.5%/month (42%/year!) on unpaid balance — know this for context
- **HashMap from scratch** = chaining + dynamic resize + hash spreading — Cred's classic DSA
- **Credit bureau integration**: soft pull (no impact) vs hard pull (inquiry on report)
- **Rewards anti-gaming**: rate limiting + split-payment detection + device fingerprint
- Cred's **Founder Round** tests product sense and culture fit (luxury, design-first)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Bill Reminder, Auto-Pay, Scheduling |
| DSA | Medium-Hard | HashMap, Resizing, Thread Safety |
| System Design | Hard | Credit Score, Rewards Engine, Anti-Gaming |
| Founder Round | Hard | Product Sense, Culture |
