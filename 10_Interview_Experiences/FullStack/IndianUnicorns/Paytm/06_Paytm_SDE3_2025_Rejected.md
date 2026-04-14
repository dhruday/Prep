# Paytm — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Paytm Mall |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Distributed Transaction Coordinator
**Duration:** 90 minutes

### Challenge: Build a 2-Phase Commit (2PC) Transaction Coordinator that orchestrates distributed transactions across multiple services (Wallet, Merchant, Ledger). Handle timeouts, partial failures, and rollback.

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * 2-Phase Commit Transaction Coordinator:
 * 
 * Phase 1 (Prepare): Ask all participants to prepare/vote (YES/NO)
 * Phase 2 (Commit/Abort): If all YES → commit; if any NO → abort all
 * 
 * Handles:
 * - Participant timeouts (configurable per participant)
 * - Partial failures → automatic rollback
 * - Transaction log for recovery
 * - Idempotent operations via transaction ID
 */

enum TransactionState {
    INITIATED, PREPARING, PREPARED, COMMITTING, COMMITTED, ABORTING, ABORTED
}

enum ParticipantVote {
    YES, NO, TIMEOUT
}

class TransactionRecord {
    String txnId;
    TransactionState state;
    long createdAt;
    long updatedAt;
    List<String> participantIds;
    Map<String, ParticipantVote> votes;
    Map<String, Boolean> commitResults;
    String failureReason;
    
    TransactionRecord(String txnId, List<String> participantIds) {
        this.txnId = txnId;
        this.state = TransactionState.INITIATED;
        this.createdAt = System.currentTimeMillis();
        this.updatedAt = this.createdAt;
        this.participantIds = new ArrayList<>(participantIds);
        this.votes = new ConcurrentHashMap<>();
        this.commitResults = new ConcurrentHashMap<>();
    }
}

interface TransactionParticipant {
    String getId();
    
    /** Phase 1: Prepare (acquire locks, validate, write undo log) */
    ParticipantVote prepare(String txnId, Map<String, Object> payload);
    
    /** Phase 2a: Commit (apply changes, release locks) */
    boolean commit(String txnId);
    
    /** Phase 2b: Abort (undo changes, release locks) */
    boolean abort(String txnId);
}

class TransactionCoordinator {
    
    private final Map<String, TransactionParticipant> participants = new ConcurrentHashMap<>();
    private final Map<String, TransactionRecord> txnLog = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newFixedThreadPool(8);
    private final long prepareTimeoutMs;
    private final long commitTimeoutMs;
    
    TransactionCoordinator(long prepareTimeoutMs, long commitTimeoutMs) {
        this.prepareTimeoutMs = prepareTimeoutMs;
        this.commitTimeoutMs = commitTimeoutMs;
    }
    
    void registerParticipant(TransactionParticipant participant) {
        participants.put(participant.getId(), participant);
    }
    
    /**
     * Execute a distributed transaction across specified participants.
     * 
     * @param txnId Unique transaction ID (for idempotency)
     * @param participantIds Which participants are involved
     * @param payloads Per-participant payloads
     * @return Final transaction record
     */
    TransactionRecord executeTransaction(String txnId, List<String> participantIds,
                                          Map<String, Map<String, Object>> payloads) {
        // Idempotency check
        if (txnLog.containsKey(txnId)) {
            return txnLog.get(txnId);
        }
        
        TransactionRecord record = new TransactionRecord(txnId, participantIds);
        txnLog.put(txnId, record);
        
        // ---- Phase 1: Prepare ----
        record.state = TransactionState.PREPARING;
        record.updatedAt = System.currentTimeMillis();
        
        boolean allPrepared = doPrepare(record, payloads);
        
        if (allPrepared) {
            // ---- Phase 2a: Commit ----
            record.state = TransactionState.COMMITTING;
            record.updatedAt = System.currentTimeMillis();
            
            boolean allCommitted = doCommit(record);
            
            if (allCommitted) {
                record.state = TransactionState.COMMITTED;
            } else {
                // Commit failed for some — this is a serious state (heuristic failure)
                // In production: retry commit indefinitely, log for manual resolution
                record.state = TransactionState.COMMITTED; // Partial commit — log for resolution
                record.failureReason = "Partial commit — some participants failed to commit";
            }
        } else {
            // ---- Phase 2b: Abort ----
            record.state = TransactionState.ABORTING;
            record.updatedAt = System.currentTimeMillis();
            
            doAbort(record);
            
            record.state = TransactionState.ABORTED;
        }
        
        record.updatedAt = System.currentTimeMillis();
        return record;
    }
    
    /**
     * Phase 1: Send prepare to all participants in parallel.
     * If any votes NO or times out, return false.
     */
    boolean doPrepare(TransactionRecord record, Map<String, Map<String, Object>> payloads) {
        List<Future<ParticipantVote>> futures = new ArrayList<>();
        List<String> orderedIds = new ArrayList<>(record.participantIds);
        
        for (String pid : orderedIds) {
            TransactionParticipant participant = participants.get(pid);
            if (participant == null) {
                record.votes.put(pid, ParticipantVote.NO);
                record.failureReason = "Unknown participant: " + pid;
                return false;
            }
            
            Map<String, Object> payload = payloads.getOrDefault(pid, Collections.emptyMap());
            
            futures.add(executor.submit(() -> {
                try {
                    return participant.prepare(record.txnId, payload);
                } catch (Exception e) {
                    return ParticipantVote.NO;
                }
            }));
        }
        
        // Collect votes with timeout
        boolean allYes = true;
        
        for (int i = 0; i < orderedIds.size(); i++) {
            String pid = orderedIds.get(i);
            try {
                ParticipantVote vote = futures.get(i).get(prepareTimeoutMs, TimeUnit.MILLISECONDS);
                record.votes.put(pid, vote);
                
                if (vote != ParticipantVote.YES) {
                    allYes = false;
                    if (record.failureReason == null) {
                        record.failureReason = "Participant " + pid + " voted " + vote;
                    }
                }
            } catch (TimeoutException e) {
                record.votes.put(pid, ParticipantVote.TIMEOUT);
                futures.get(i).cancel(true);
                allYes = false;
                if (record.failureReason == null) {
                    record.failureReason = "Participant " + pid + " timed out during prepare";
                }
            } catch (Exception e) {
                record.votes.put(pid, ParticipantVote.NO);
                allYes = false;
            }
        }
        
        record.state = allYes ? TransactionState.PREPARED : TransactionState.PREPARING;
        return allYes;
    }
    
    /**
     * Phase 2a: Send commit to all participants.
     * Commit must eventually succeed (in production, retry indefinitely).
     */
    boolean doCommit(TransactionRecord record) {
        List<Future<Boolean>> futures = new ArrayList<>();
        List<String> orderedIds = new ArrayList<>(record.participantIds);
        
        for (String pid : orderedIds) {
            TransactionParticipant participant = participants.get(pid);
            futures.add(executor.submit(() -> {
                try {
                    return participant.commit(record.txnId);
                } catch (Exception e) {
                    return false;
                }
            }));
        }
        
        boolean allOk = true;
        for (int i = 0; i < orderedIds.size(); i++) {
            try {
                boolean result = futures.get(i).get(commitTimeoutMs, TimeUnit.MILLISECONDS);
                record.commitResults.put(orderedIds.get(i), result);
                if (!result) allOk = false;
            } catch (Exception e) {
                record.commitResults.put(orderedIds.get(i), false);
                allOk = false;
            }
        }
        
        return allOk;
    }
    
    /**
     * Phase 2b: Send abort to all participants that voted YES.
     * Best-effort — abort failures are logged for manual resolution.
     */
    void doAbort(TransactionRecord record) {
        for (String pid : record.participantIds) {
            ParticipantVote vote = record.votes.get(pid);
            
            // Only abort participants that voted YES (they hold locks)
            if (vote == ParticipantVote.YES) {
                TransactionParticipant participant = participants.get(pid);
                if (participant != null) {
                    try {
                        participant.abort(record.txnId);
                    } catch (Exception e) {
                        // Log for manual resolution
                    }
                }
            }
        }
    }
    
    /** Get transaction status (for monitoring/debugging) */
    TransactionRecord getTransaction(String txnId) {
        return txnLog.get(txnId);
    }
    
    /** Recover in-flight transactions after coordinator restart */
    List<TransactionRecord> getInFlightTransactions() {
        List<TransactionRecord> inflight = new ArrayList<>();
        for (TransactionRecord r : txnLog.values()) {
            if (r.state != TransactionState.COMMITTED && r.state != TransactionState.ABORTED) {
                inflight.add(r);
            }
        }
        return inflight;
    }
}

// ---- Sample Participant: Wallet Service ----

class WalletParticipant implements TransactionParticipant {
    
    private final Map<String, Double> balances = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> preparedTxns = new ConcurrentHashMap<>();
    
    WalletParticipant() {
        balances.put("user_1", 5000.0);
        balances.put("user_2", 3000.0);
    }
    
    @Override
    public String getId() { return "wallet"; }
    
    @Override
    public ParticipantVote prepare(String txnId, Map<String, Object> payload) {
        String userId = (String) payload.get("userId");
        double amount = (double) payload.get("amount");
        
        // Check balance
        Double balance = balances.get(userId);
        if (balance == null || balance < amount) {
            return ParticipantVote.NO;
        }
        
        // Reserve (deduct tentatively, store undo info)
        balances.put(userId, balance - amount);
        preparedTxns.put(txnId, Map.of("userId", userId, "amount", amount));
        
        return ParticipantVote.YES;
    }
    
    @Override
    public boolean commit(String txnId) {
        // Deduction already applied in prepare — just clean up
        preparedTxns.remove(txnId);
        return true;
    }
    
    @Override
    public boolean abort(String txnId) {
        // Undo the deduction
        Map<String, Object> info = preparedTxns.remove(txnId);
        if (info != null) {
            String userId = (String) info.get("userId");
            double amount = (double) info.get("amount");
            balances.merge(userId, amount, Double::sum);
        }
        return true;
    }
}
```

---

## 🎯 Key Takeaways
- Paytm SDE-3 FS = **2-Phase Commit coordinator — distributed transaction orchestration**
- **Phase 1 (Prepare)**: parallel prepare calls with timeout — any NO/TIMEOUT → abort all
- **Phase 2a (Commit)**: if all YES → commit — must eventually succeed (retry in production)
- **Phase 2b (Abort)**: only abort participants that voted YES — they hold locks
- **Idempotency**: check `txnLog` for existing txnId — prevents double-submit
- **Timeout handling**: `future.get(timeout, MILLISECONDS)` — cancel timed-out futures
- **Wallet pattern**: deduct in prepare (optimistic), undo in abort — "prepare = reserve + undo log"
- **Heuristic failure**: partial commit (some succeed, some fail) — log for manual resolution
- **Recovery**: `getInFlightTransactions()` returns non-terminal state txns — coordinator can resume after restart
- **Rejection reason**: system design round on payment ledger didn't go deep on event sourcing and CQRS

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | 2PC, Distributed Transactions, Concurrency |
| System Design | Very Hard | Payment Ledger Architecture |
| HM | Medium | Culture |
