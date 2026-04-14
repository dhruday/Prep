# PhonePe — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-3 FullStack |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Design an In-Memory Event Scheduler** (cron-like — PhonePe's actual question)
- Schedule one-time and recurring events
- Cron expression support (basic: minute, hour, day)
- Execute callbacks at scheduled times
- Cancel/reschedule events
- Handle past-due events (execute immediately)

### 💡 In-Memory Event Scheduler

```java
class EventScheduler {
    private final PriorityQueue<ScheduledEvent> eventQueue = new PriorityQueue<>(
        Comparator.comparingLong(ScheduledEvent::getNextExecutionTime)
    );
    private final Map<String, ScheduledEvent> eventMap = new ConcurrentHashMap<>();
    private final ScheduledExecutorService executor = Executors.newScheduledThreadPool(4);
    private final ReentrantLock lock = new ReentrantLock();
    private volatile boolean running = true;
    
    EventScheduler() {
        // Dispatcher thread: picks events from queue and executes them
        Thread dispatcher = new Thread(this::dispatchLoop, "event-dispatcher");
        dispatcher.setDaemon(true);
        dispatcher.start();
    }
    
    // Schedule a one-time event
    String scheduleOnce(long executeAtMs, Runnable callback) {
        String eventId = UUID.randomUUID().toString();
        ScheduledEvent event = new ScheduledEvent(eventId, executeAtMs, null, callback, false);
        addEvent(event);
        return eventId;
    }
    
    // Schedule a recurring event with cron expression
    String scheduleCron(String cronExpression, Runnable callback) {
        String eventId = UUID.randomUUID().toString();
        CronParser parser = new CronParser(cronExpression);
        long nextExecution = parser.getNextExecutionTime(System.currentTimeMillis());
        
        ScheduledEvent event = new ScheduledEvent(eventId, nextExecution, parser, callback, true);
        addEvent(event);
        return eventId;
    }
    
    // Cancel a scheduled event
    boolean cancel(String eventId) {
        lock.lock();
        try {
            ScheduledEvent event = eventMap.remove(eventId);
            if (event != null) {
                event.setCancelled(true);
                eventQueue.remove(event);
                return true;
            }
            return false;
        } finally {
            lock.unlock();
        }
    }
    
    // Reschedule to new time
    boolean reschedule(String eventId, long newTimeMs) {
        lock.lock();
        try {
            ScheduledEvent event = eventMap.get(eventId);
            if (event == null || event.isCancelled()) return false;
            
            eventQueue.remove(event);
            event.setNextExecutionTime(newTimeMs);
            eventQueue.offer(event);
            return true;
        } finally {
            lock.unlock();
        }
    }
    
    private void addEvent(ScheduledEvent event) {
        lock.lock();
        try {
            eventMap.put(event.getId(), event);
            eventQueue.offer(event);
        } finally {
            lock.unlock();
        }
    }
    
    private void dispatchLoop() {
        while (running) {
            lock.lock();
            try {
                if (eventQueue.isEmpty()) {
                    lock.unlock();
                    sleepSafe(100); // Poll interval when empty
                    continue;
                }
                
                ScheduledEvent next = eventQueue.peek();
                long now = System.currentTimeMillis();
                long waitTime = next.getNextExecutionTime() - now;
                
                if (waitTime <= 0) {
                    eventQueue.poll();
                    lock.unlock();
                    
                    if (next.isCancelled()) continue;
                    
                    // Execute in thread pool (non-blocking)
                    executor.submit(() -> {
                        try {
                            next.getCallback().run();
                        } catch (Exception e) {
                            System.err.println("Event " + next.getId() + " failed: " + e.getMessage());
                        }
                    });
                    
                    // If recurring, schedule next execution
                    if (next.isRecurring() && !next.isCancelled()) {
                        long nextTime = next.getCronParser().getNextExecutionTime(now);
                        next.setNextExecutionTime(nextTime);
                        addEvent(next);
                    } else {
                        eventMap.remove(next.getId());
                    }
                } else {
                    lock.unlock();
                    sleepSafe(Math.min(waitTime, 100)); // Don't sleep too long
                }
            } catch (Exception e) {
                if (lock.isHeldByCurrentThread()) lock.unlock();
            }
        }
    }
    
    void shutdown() {
        running = false;
        executor.shutdown();
    }
    
    private void sleepSafe(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }
}

// Simple Cron Parser (minute hour dayOfMonth)
class CronParser {
    private final int minute;  // 0-59 or -1 for wildcard
    private final int hour;    // 0-23 or -1 for wildcard
    private final int day;     // 1-31 or -1 for wildcard
    
    CronParser(String expression) {
        String[] parts = expression.split("\\s+");
        this.minute = parts[0].equals("*") ? -1 : Integer.parseInt(parts[0]);
        this.hour = parts.length > 1 && !parts[1].equals("*") ? Integer.parseInt(parts[1]) : -1;
        this.day = parts.length > 2 && !parts[2].equals("*") ? Integer.parseInt(parts[2]) : -1;
    }
    
    long getNextExecutionTime(long afterMs) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(afterMs);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        cal.add(Calendar.MINUTE, 1); // Start from next minute
        
        // Find next matching time (scan forward, max 366 days)
        for (int attempts = 0; attempts < 527040; attempts++) { // 366 * 24 * 60
            boolean matches = true;
            
            if (minute != -1 && cal.get(Calendar.MINUTE) != minute) matches = false;
            if (hour != -1 && cal.get(Calendar.HOUR_OF_DAY) != hour) matches = false;
            if (day != -1 && cal.get(Calendar.DAY_OF_MONTH) != day) matches = false;
            
            if (matches) return cal.getTimeInMillis();
            
            cal.add(Calendar.MINUTE, 1);
        }
        
        throw new IllegalStateException("No matching execution time found within 1 year");
    }
}

@Data
class ScheduledEvent {
    private final String id;
    private long nextExecutionTime;
    private final CronParser cronParser;
    private final Runnable callback;
    private final boolean recurring;
    private volatile boolean cancelled = false;
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design PhonePe's Merchant Settlement System**
   - Merchants get paid daily (T+1) for previous day's transactions
   - Split settlement: platform fee deducted
   - Tax (TDS/GST) auto-deduction
   - Bank transfer via NEFT/IMPS/UPI
   - Retry failed settlements
   - Reconciliation dashboard

### 💡 Key Design

```
Settlement Pipeline:
5:00 AM ─── Aggregate ─── Calculate ─── Deduct ─── Transfer ─── Confirm
(daily)     yesterday's    fees          taxes       to bank      & notify
            transactions                             (NEFT/IMPS)

class SettlementService {
    @Scheduled(cron = "0 0 5 * * *") // 5 AM daily
    void runDailySettlement() {
        LocalDate settlementDate = LocalDate.now().minusDays(1); // T+1
        
        // 1. Aggregate transactions per merchant
        List<MerchantAggregation> aggregations = transactionRepo.aggregateByMerchant(settlementDate);
        
        for (MerchantAggregation agg : aggregations) {
            try {
                processSettlement(agg, settlementDate);
            } catch (Exception e) {
                // Log failure, add to retry queue
                retryQueue.enqueue(agg.getMerchantId(), settlementDate, e.getMessage());
            }
        }
    }
    
    void processSettlement(MerchantAggregation agg, LocalDate date) {
        // 2. Calculate platform fee
        BigDecimal grossAmount = agg.getTotalAmount();
        BigDecimal platformFee = grossAmount.multiply(agg.getMerchant().getFeePercent())
                                            .setScale(2, RoundingMode.HALF_UP);
        
        // 3. Calculate taxes
        BigDecimal gstOnFee = platformFee.multiply(new BigDecimal("0.18")); // 18% GST on platform fee
        BigDecimal tds = BigDecimal.ZERO;
        
        // TDS applicable if merchant annual settlements > ₹5 Lakh
        if (agg.getMerchant().getAnnualSettlementTotal().compareTo(new BigDecimal("500000")) > 0) {
            tds = grossAmount.multiply(new BigDecimal("0.01")); // 1% TDS u/s 194O
        }
        
        // 4. Net settlement amount
        BigDecimal netAmount = grossAmount
            .subtract(platformFee)
            .subtract(gstOnFee)
            .subtract(tds);
        
        // 5. Create settlement record
        Settlement settlement = Settlement.builder()
            .merchantId(agg.getMerchantId())
            .date(date)
            .grossAmount(grossAmount)
            .transactionCount(agg.getTransactionCount())
            .platformFee(platformFee)
            .gst(gstOnFee)
            .tds(tds)
            .netAmount(netAmount)
            .status(SettlementStatus.PENDING)
            .build();
        settlementRepo.save(settlement);
        
        // 6. Initiate bank transfer
        BankTransferResult result = bankService.transfer(
            agg.getMerchant().getBankAccount(),
            netAmount,
            "SETTLE-" + agg.getMerchantId() + "-" + date, // UTR reference
            netAmount.compareTo(new BigDecimal("200000")) > 0 
                ? TransferMode.NEFT // > ₹2L → NEFT (batch, cheaper)
                : TransferMode.IMPS // ≤ ₹2L → IMPS (instant)
        );
        
        settlement.setTransferReference(result.getUtr());
        settlement.setStatus(result.isSuccess() 
            ? SettlementStatus.COMPLETED 
            : SettlementStatus.TRANSFER_FAILED);
        settlementRepo.save(settlement);
        
        // 7. Notify merchant
        notificationService.send(agg.getMerchantId(),
            "Settlement of ₹" + netAmount + " for " + date + " processed. UTR: " + result.getUtr());
    }
}

Retry Failed Settlements:
class SettlementRetryService {
    // Retry at 8 AM, 12 PM, 4 PM (3 attempts per day)
    @Scheduled(cron = "0 0 8,12,16 * * *")
    void retryFailedSettlements() {
        List<Settlement> failed = settlementRepo.findByStatus(SettlementStatus.TRANSFER_FAILED);
        
        for (Settlement s : failed) {
            if (s.getRetryCount() >= 3) {
                s.setStatus(SettlementStatus.ESCALATED);
                settlementRepo.save(s);
                alertService.escalate("Settlement " + s.getId() + " failed after 3 retries");
                continue;
            }
            
            BankTransferResult result = bankService.transfer(
                s.getMerchant().getBankAccount(), s.getNetAmount(),
                s.getTransferReference(), selectMode(s)
            );
            
            s.setRetryCount(s.getRetryCount() + 1);
            s.setStatus(result.isSuccess() 
                ? SettlementStatus.COMPLETED 
                : SettlementStatus.TRANSFER_FAILED);
            settlementRepo.save(s);
        }
    }
}

Reconciliation:
- Compare settlement amounts vs actual bank debits
- Match UTR numbers from bank statement with our records
- Flag: amount mismatch, missing credit, duplicate credit
- Dashboard: daily settlement summary per merchant, pending/failed view
```

---

## 🎯 Key Takeaways
- PhonePe = **fintech domain + machine coding + settlement + tax compliance**
- **Event Scheduler**: PriorityQueue (min-heap by execution time) + dispatcher thread + thread pool
- **Cron parser**: scan forward minute-by-minute to find next match (simple but effective)
- **T+1 Settlement**: aggregate yesterday's transactions → deduct fees/GST/TDS → bank transfer
- **TDS §194O**: 1% TDS if merchant annual settlement > ₹5 Lakh (India-specific)
- **Transfer mode selection**: NEFT for > ₹2L (batch, cheaper), IMPS for ≤ ₹2L (instant)
- **Retry strategy**: 3 attempts/day (8 AM, 12 PM, 4 PM) → escalate to ops after 3 failures
- PhonePe interviews: **machine coding is critical** — clean design patterns, testability required

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA + SQL |
| Machine Coding | Hard | Event Scheduler, Cron, Concurrency |
| Technical | Medium-Hard | Java Concurrency, Spring |
| System Design | Hard | Settlement, Tax Compliance |
| HM | Medium | Leadership, Fintech Domain |
