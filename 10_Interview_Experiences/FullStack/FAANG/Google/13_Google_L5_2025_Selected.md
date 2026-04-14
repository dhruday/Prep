# Google — L5 FullStack Interview Experience (2025) — #13

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Cloud Pub/Sub |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 2 Coding + System Design + Googleness)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Snapshot Array** (LeetCode 1146) — Space-efficient versioned array
2. **Follow-up: What if we need millions of snapshots? Optimize space**

### 💡 Snapshot Array

```java
class SnapshotArray {
    // For each index, store only the changes: [snapId, value]
    // Use binary search to find value at a given snapshot
    private final List<List<int[]>> changes; // index → list of [snapId, value]
    private int snapId = 0;
    
    SnapshotArray(int length) {
        changes = new ArrayList<>(length);
        for (int i = 0; i < length; i++) {
            List<int[]> list = new ArrayList<>();
            list.add(new int[]{0, 0}); // Initial value
            changes.add(list);
        }
    }
    
    void set(int index, int val) {
        List<int[]> history = changes.get(index);
        // If last entry is same snap, update in place
        if (history.get(history.size() - 1)[0] == snapId) {
            history.get(history.size() - 1)[1] = val;
        } else {
            history.add(new int[]{snapId, val});
        }
    }
    
    int snap() {
        return snapId++;
    }
    
    int get(int index, int snap_id) {
        List<int[]> history = changes.get(index);
        
        // Binary search: find largest snapId <= snap_id
        int lo = 0, hi = history.size() - 1;
        int result = 0;
        
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (history.get(mid)[0] <= snap_id) {
                result = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        
        return history.get(result)[1];
    }
}
// Time: set O(1), snap O(1), get O(log S) where S = snapshots for that index
// Space: O(changes only) — much better than storing full copies

// Follow-up: Millions of snapshots → same approach is already optimal
// Only stores deltas (changes per index per snap)
// If millions of snapshots but few changes: O(changes) << O(snapshots × length)
// Additional optimization: periodic compaction — merge old snapshots
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google Spanner** (globally distributed, strongly consistent database)
   - External consistency (linearizability across the globe)
   - TrueTime API for synchronized timestamps
   - Paxos for consensus within each shard
   - Read-write and read-only transactions
   - Schema: interleaved tables, secondary indexes

### 💡 Key Design

```
Architecture:
┌──────────────────────────────────────────────────────────────┐
│                    Google Spanner Deployment                   │
│                                                               │
│  Zone A (Iowa)        Zone B (Oregon)       Zone C (Belgium)  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Spanserver  │    │  Spanserver  │    │  Spanserver  │   │
│  │  ┌────────┐  │    │  ┌────────┐  │    │  ┌────────┐  │   │
│  │  │Tablet 1│  │    │  │Tablet 1│  │    │  │Tablet 1│  │   │
│  │  │(replica)│  │    │  │(replica)│  │    │  │(replica)│  │   │
│  │  └────────┘  │    │  └────────┘  │    │  └────────┘  │   │
│  │  ┌────────┐  │    │  ┌────────┐  │    │  ┌────────┐  │   │
│  │  │Tablet 2│  │    │  │Tablet 2│  │    │  │Tablet 2│  │   │
│  │  │(leader) │  │    │  │(replica)│  │    │  │(replica)│  │   │
│  │  └────────┘  │    │  └────────┘  │    │  └────────┘  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                    │                   │            │
│         └────────── Paxos ──────────────────────┘            │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  TrueTime Service                                       │  │
│  │  Atomic clocks + GPS receivers at each datacenter       │  │
│  │  API: TT.now() → returns [earliest, latest] interval    │  │
│  │  Uncertainty window: ~7ms (typically ~4ms)               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

TrueTime and External Consistency:
class TrueTime {
    // Returns [earliest, latest] — real time is guaranteed within this interval
    // Hardware: atomic clocks + GPS receivers → cross-validate each other
    // Uncertainty ε typically ~4ms, never exceeds ~7ms
    
    TTInterval now() {
        // Combines multiple time sources:
        // 1. GPS receiver (accurate but can fail)
        // 2. Atomic clock (stable drift, calibrated by GPS)
        // 3. NTP from other datacenters (backup)
        long t = System.nanoTime(); // Simplified
        long epsilon = 4_000_000; // 4ms uncertainty in nanoseconds
        return new TTInterval(t - epsilon, t + epsilon);
    }
    
    // Wait until TrueTime guarantees we're past timestamp s
    void waitUntilAfter(long s) {
        while (now().latest < s) {
            // Spin wait (typically < 7ms)
        }
    }
}

// Transaction Protocol:
class SpannerTransaction {
    // Read-Write Transaction (Paxos + 2PC + TrueTime)
    CommitResult commitReadWrite(List<Mutation> mutations) {
        // 1. Acquire locks on all touched rows (pessimistic locking)
        //    Leader of each Paxos group acquires lock
        acquireLocks(mutations);
        
        // 2. Choose commit timestamp s
        //    s must be: 
        //    - After all TT.now().latest at time of lock acquisition
        //    - After any previously committed transaction that touches same data
        long s = chooseCommitTimestamp();
        
        // 3. If multi-shard: 2-Phase Commit
        if (mutations.spanMultipleShards()) {
            // Coordinator shard sends PREPARE to all participant shards
            // Each participant: Paxos log the PREPARE + vote YES/NO
            // Coordinator: if all YES → Paxos log COMMIT with timestamp s
            //              if any NO → ABORT
            twoPhaseCommit(mutations, s);
        } else {
            // Single-shard: direct Paxos commit
            paxosCommit(mutations, s);
        }
        
        // 4. CRITICAL: Wait until TrueTime guarantees we're past s
        //    This ensures external consistency:
        //    If T1 commits before T2 starts, then T1.timestamp < T2.timestamp
        TrueTime.waitUntilAfter(s);
        
        // 5. Release locks, return to client
        releaseLocks(mutations);
        return new CommitResult(s);
    }
    
    // Read-Only Transaction (lock-free!)
    List<Row> readOnly(List<ReadRequest> reads) {
        // 1. Choose read timestamp sread = TT.now().latest
        //    This guarantees we see all transactions committed before sread
        long sread = TrueTime.now().latest;
        
        // 2. Read from any replica that is "safe" at sread
        //    (replica has applied all Paxos writes up to sread)
        //    → NO LOCKS needed → scalable reads from any region
        List<Row> results = new ArrayList<>();
        for (ReadRequest read : reads) {
            Replica replica = chooseReplicaSafeAt(read.getTable(), sread);
            results.addAll(replica.readAt(read, sread)); // MVCC read at timestamp
        }
        
        return results;
    }
}

Why TrueTime Enables External Consistency:
- Problem: clocks across datacenters are not perfectly synchronized
- NTP gives ~100ms uncertainty → too much
- TrueTime (atomic clocks + GPS): ~4ms uncertainty
- Rule: after choosing commit timestamp s, WAIT until TT.now().earliest > s
  This guarantees: real time has passed s before client is told "committed"
  So if client does anything after commit (including starting a new transaction),
  that new transaction will have timestamp > s → external consistency!

Scale:
- 2+ trillion rows across Google (2024)
- 10 million requests/second
- 99.999% availability (5 nines)
- Cross-continent transactions in ~14ms (within same continent: ~7ms)
```

---

## 🎯 Key Takeaways
- Google L5 = **Snapshot Array + globally distributed systems + TrueTime**
- **Snapshot Array**: store only deltas per index → binary search for value at snapshot → O(log S) reads
- **TrueTime**: atomic clocks + GPS → bounded uncertainty (~4ms) → enables external consistency
- **External consistency**: if T1 completes before T2 starts, T1.timestamp < T2.timestamp (guaranteed)
- **Wait rule**: after choosing commit timestamp s, wait until `TT.now().earliest > s` before returning
- **Read-only transactions**: lock-free! Pick `sread = TT.now().latest`, read from any safe replica
- **Paxos + 2PC**: multi-shard writes use 2PC coordinated by leader, each shard uses Paxos for replication
- Google system design: they expect you to understand **why** design choices are made, not just what

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone | Medium-Hard | DSA |
| Coding 1 | Medium | Snapshot Array, Binary Search |
| Coding 2 | Hard | Advanced DSA |
| System Design | Very Hard | Spanner, TrueTime, Distributed Consensus |
| Googleness | Medium | Culture Fit |
