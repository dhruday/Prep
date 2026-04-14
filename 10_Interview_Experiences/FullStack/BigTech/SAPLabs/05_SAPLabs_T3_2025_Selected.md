# SAPLabs — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior Developer |
| **Level** | T3 (SDE-3 equivalent) |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | HANA |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 3: Technical — Implement an In-Memory MVCC (Multi-Version Concurrency Control) Store
**Duration:** 60 minutes

### Question: Implement a key-value store with MVCC semantics: transactions read a consistent snapshot, writes create new versions, and reads never block writes.

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * MVCC Key-Value Store:
 * 
 * - Each write creates a new VERSION (not overwrite)
 * - Each transaction gets a snapshot timestamp
 * - Reads see the latest version <= transaction's snapshot time
 * - Writes are invisible to other transactions until commit
 * - No read locks — readers never block writers
 * 
 * Isolation level: Snapshot Isolation (SI)
 * 
 * Similar to: PostgreSQL MVCC, CockroachDB, Google Spanner
 */

class Version<V> {
    final V value;
    final long txnId;       // Transaction that created this version
    final long commitTs;    // Timestamp when committed (-1 if uncommitted)
    final boolean deleted;  // Tombstone for deletes
    
    Version(V value, long txnId, long commitTs, boolean deleted) {
        this.value = value; this.txnId = txnId;
        this.commitTs = commitTs; this.deleted = deleted;
    }
}

class MVCCStore<K, V> {
    
    // Key → list of versions (sorted by commitTs descending — newest first)
    private final ConcurrentHashMap<K, List<Version<V>>> store = new ConcurrentHashMap<>();
    
    // Global timestamp counter
    private final AtomicLong tsCounter = new AtomicLong(0);
    
    // Active transactions: txnId → Transaction
    private final ConcurrentHashMap<Long, Transaction<K, V>> activeTxns = new ConcurrentHashMap<>();
    
    /**
     * Begin a new transaction.
     * Snapshot timestamp = current max committed timestamp.
     */
    public Transaction<K, V> beginTransaction() {
        long snapshotTs = tsCounter.get();
        long txnId = tsCounter.incrementAndGet();
        
        Transaction<K, V> txn = new Transaction<>(txnId, snapshotTs, this);
        activeTxns.put(txnId, txn);
        return txn;
    }
    
    /**
     * Read the latest committed version visible to this snapshot.
     * The version must have commitTs <= snapshotTs AND commitTs != -1 (committed).
     * Also check the transaction's own write set.
     */
    V read(K key, long snapshotTs, long txnId) {
        // Check own write set first
        Transaction<K, V> txn = activeTxns.get(txnId);
        if (txn != null && txn.writeSet.containsKey(key)) {
            return txn.writeSet.get(key);
        }
        
        List<Version<V>> versions = store.get(key);
        if (versions == null) return null;
        
        synchronized (versions) {
            for (Version<V> v : versions) {
                // Skip uncommitted versions from other transactions
                if (v.commitTs == -1) {
                    if (v.txnId == txnId) {
                        // Our own uncommitted write
                        return v.deleted ? null : v.value;
                    }
                    continue;
                }
                
                // Find latest committed version <= snapshot
                if (v.commitTs <= snapshotTs) {
                    return v.deleted ? null : v.value;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Commit a transaction:
     * 1. Write Conflict Detection: check if any key in write set was modified
     *    by another committed transaction after our snapshot
     * 2. If no conflict: assign commit timestamp, make versions visible
     * 3. If conflict: abort
     */
    boolean commit(Transaction<K, V> txn) {
        long commitTs = tsCounter.incrementAndGet();
        
        // Write-Write conflict detection (First Committer Wins)
        for (K key : txn.writeSet.keySet()) {
            List<Version<V>> versions = store.get(key);
            if (versions != null) {
                synchronized (versions) {
                    for (Version<V> v : versions) {
                        if (v.commitTs > txn.snapshotTs && v.commitTs != -1 && v.txnId != txn.txnId) {
                            // Another transaction committed a write to this key after our snapshot
                            abort(txn);
                            return false;
                        }
                    }
                }
            }
        }
        
        // No conflict — commit all writes
        for (var entry : txn.writeSet.entrySet()) {
            K key = entry.getKey();
            V value = entry.getValue();
            boolean isDelete = txn.deleteSet.contains(key);
            
            Version<V> version = new Version<>(value, txn.txnId, commitTs, isDelete);
            
            store.computeIfAbsent(key, k -> Collections.synchronizedList(new ArrayList<>()));
            List<Version<V>> versions = store.get(key);
            synchronized (versions) {
                versions.add(0, version); // Newest first
            }
        }
        
        activeTxns.remove(txn.txnId);
        return true;
    }
    
    void abort(Transaction<K, V> txn) {
        // Discard write set
        activeTxns.remove(txn.txnId);
    }
    
    /**
     * Garbage Collection: remove versions that are no longer visible to any active transaction.
     * Keep: the latest version per key for each active transaction's snapshot.
     */
    public void gc() {
        long minActiveSnapshot = activeTxns.values().stream()
            .mapToLong(t -> t.snapshotTs)
            .min().orElse(tsCounter.get());
        
        for (var entry : store.entrySet()) {
            List<Version<V>> versions = entry.getValue();
            synchronized (versions) {
                boolean foundVisibleToOldest = false;
                Iterator<Version<V>> it = versions.iterator();
                while (it.hasNext()) {
                    Version<V> v = it.next();
                    if (v.commitTs <= minActiveSnapshot && v.commitTs != -1) {
                        if (foundVisibleToOldest) {
                            it.remove(); // Older versions no longer needed
                        } else {
                            foundVisibleToOldest = true; // Keep this one
                        }
                    }
                }
            }
        }
    }
}

class Transaction<K, V> {
    final long txnId;
    final long snapshotTs;
    final MVCCStore<K, V> store;
    final Map<K, V> writeSet = new LinkedHashMap<>();
    final Set<K> deleteSet = new HashSet<>();
    boolean committed = false;
    boolean aborted = false;
    
    Transaction(long txnId, long snapshotTs, MVCCStore<K, V> store) {
        this.txnId = txnId; this.snapshotTs = snapshotTs; this.store = store;
    }
    
    public V read(K key) {
        if (committed || aborted) throw new IllegalStateException("Transaction already ended");
        return store.read(key, snapshotTs, txnId);
    }
    
    public void write(K key, V value) {
        if (committed || aborted) throw new IllegalStateException("Transaction already ended");
        writeSet.put(key, value);
        deleteSet.remove(key);
    }
    
    public void delete(K key) {
        if (committed || aborted) throw new IllegalStateException("Transaction already ended");
        writeSet.put(key, null);
        deleteSet.add(key);
    }
    
    public boolean commit() {
        if (committed || aborted) throw new IllegalStateException("Transaction already ended");
        committed = store.commit(this);
        if (!committed) aborted = true;
        return committed;
    }
    
    public void abort() {
        if (committed || aborted) throw new IllegalStateException("Transaction already ended");
        aborted = true;
        store.abort(this);
    }
}
```

---

## 🎯 Key Takeaways
- SAP Labs T3 = **In-memory MVCC store — snapshot isolation, write-write conflict detection, GC**
- **Snapshot Isolation**: each transaction reads a frozen point-in-time view — no dirty/phantom reads
- **Version chain**: newest first — `read()` scans for first version with `commitTs <= snapshotTs`
- **Write-write conflict**: First Committer Wins — if another txn committed a write to same key after our snapshot, abort
- **Read-write conflict**: NOT detected (that would be Serializable isolation) — SI allows write skew anomaly
- **GC**: find minimum active snapshot timestamp → remove versions older than that (keep one visible version per key)
- **Tombstones for deletes**: `deleted=true` — necessary so later snapshots don't see the deleted key
- SAP = **HANA database internals** — MVCC is the core concurrency mechanism in SAP HANA

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Technical 1 | Hard | Column-Store Index |
| Technical 2 (this) | Extremely Hard | MVCC, Transactions, Concurrency |
| HM | Medium | Culture |
