# Oracle — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | SDE-2 FullStack |
| **Level** | IC3 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Oracle Cloud Infrastructure (OCI) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Thread-Safe Connection Pool** (Java)
   - Min/max pool size
   - Connection checkout with timeout
   - Health check (periodic ping, evict stale connections)
   - Graceful shutdown

### 💡 Connection Pool Implementation

```java
class ConnectionPool {
    private final BlockingQueue<Connection> available;
    private final Set<Connection> inUse = ConcurrentHashMap.newKeySet();
    private final int maxSize;
    private final int minSize;
    private final AtomicInteger totalCreated = new AtomicInteger(0);
    private final ConnectionFactory factory;
    private final ScheduledExecutorService healthChecker;
    private volatile boolean isShutdown = false;
    
    ConnectionPool(int minSize, int maxSize, ConnectionFactory factory) {
        this.minSize = minSize;
        this.maxSize = maxSize;
        this.factory = factory;
        this.available = new LinkedBlockingQueue<>(maxSize);
        
        // Pre-create min connections
        for (int i = 0; i < minSize; i++) {
            Connection conn = factory.create();
            available.offer(conn);
            totalCreated.incrementAndGet();
        }
        
        // Health check every 30 seconds
        healthChecker = Executors.newSingleThreadScheduledExecutor();
        healthChecker.scheduleAtFixedRate(this::healthCheck, 30, 30, TimeUnit.SECONDS);
    }
    
    Connection getConnection(long timeoutMs) throws TimeoutException, PoolShutdownException {
        if (isShutdown) throw new PoolShutdownException("Pool is shut down");
        
        // 1. Try to get from available pool (non-blocking)
        Connection conn = available.poll();
        
        if (conn != null) {
            if (isValid(conn)) {
                inUse.add(conn);
                return conn;
            } else {
                // Stale connection, discard and create new
                destroy(conn);
            }
        }
        
        // 2. Try to create new connection if under max
        if (totalCreated.get() < maxSize) {
            if (totalCreated.compareAndSet(totalCreated.get(), totalCreated.get() + 1)) {
                conn = factory.create();
                inUse.add(conn);
                return conn;
            }
        }
        
        // 3. Wait for a connection to be returned
        conn = available.poll(timeoutMs, TimeUnit.MILLISECONDS);
        if (conn == null) {
            throw new TimeoutException("Timed out waiting for connection after " + timeoutMs + "ms");
        }
        
        if (!isValid(conn)) {
            destroy(conn);
            // Recursively retry (with reduced timeout)
            return getConnection(timeoutMs / 2);
        }
        
        inUse.add(conn);
        return conn;
    }
    
    void releaseConnection(Connection conn) {
        if (conn == null) return;
        
        inUse.remove(conn);
        
        if (isShutdown) {
            destroy(conn);
            return;
        }
        
        if (isValid(conn)) {
            available.offer(conn);
        } else {
            destroy(conn);
            // Replenish to maintain min pool size
            replenishIfNeeded();
        }
    }
    
    private void healthCheck() {
        // Check available connections
        int size = available.size();
        for (int i = 0; i < size; i++) {
            Connection conn = available.poll();
            if (conn == null) break;
            
            if (isValid(conn)) {
                available.offer(conn); // Put back
            } else {
                destroy(conn);
            }
        }
        
        // Replenish to min size
        replenishIfNeeded();
    }
    
    private void replenishIfNeeded() {
        while (totalCreated.get() < minSize) {
            Connection conn = factory.create();
            available.offer(conn);
            totalCreated.incrementAndGet();
        }
    }
    
    private boolean isValid(Connection conn) {
        try {
            return conn.isValid(2); // 2-second validation timeout
        } catch (Exception e) {
            return false;
        }
    }
    
    private void destroy(Connection conn) {
        try {
            conn.close();
        } catch (Exception ignored) {}
        totalCreated.decrementAndGet();
    }
    
    void shutdown() {
        isShutdown = true;
        healthChecker.shutdown();
        
        // Close all available connections
        Connection conn;
        while ((conn = available.poll()) != null) {
            destroy(conn);
        }
        
        // Wait for in-use connections to be returned (with timeout)
        long deadline = System.currentTimeMillis() + 30000; // 30s grace period
        while (!inUse.isEmpty() && System.currentTimeMillis() < deadline) {
            Thread.sleep(100);
        }
        
        // Force close remaining
        for (Connection c : inUse) {
            destroy(c);
        }
    }
    
    // Metrics
    int getAvailableCount() { return available.size(); }
    int getInUseCount() { return inUse.size(); }
    int getTotalCount() { return totalCreated.get(); }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Multi-Region Database Replication System** (like Oracle Data Guard)
   - Primary-standby replication
   - Synchronous vs asynchronous replication modes
   - Automatic failover with split-brain prevention
   - Zero Data Loss (ZDL) guarantee option
   - Read replicas for offloading queries

### 💡 Key Design

```
Architecture:
Region A (Primary)                          Region B (Standby)
┌────────────────────┐                     ┌────────────────────┐
│  ┌──────────────┐  │    Redo Log         │  ┌──────────────┐  │
│  │  Primary DB  │──┼──── Stream ────────▶│  │  Standby DB  │  │
│  │  (Read/Write)│  │   (encrypted TLS)   │  │  (Read-only) │  │
│  └──────┬───────┘  │                     │  └──────────────┘  │
│         │ WAL      │                     │                    │
│  ┌──────▼───────┐  │    Heartbeat        │  ┌──────────────┐  │
│  │  Redo Log    │  │◄── (every 1s) ─────▶│  │  Observer     │  │
│  │  Archive     │  │                     │  │  (arbiter)    │  │
│  └──────────────┘  │                     │  └──────────────┘  │
└────────────────────┘                     └────────────────────┘
         │
         │ Async replication
    ┌────▼──────────────┐
    │  Region C          │
    │  Read Replica       │
    │  (query offload)    │
    └────────────────────┘

Replication Modes:
1. MAX PROTECTION (Synchronous):
   - Primary WAITS for standby ACK before COMMIT returns
   - Zero Data Loss (RPO = 0)
   - Higher latency (network round-trip added to every commit)
   - If standby is down → Primary HALTS writes (protects data over availability)
   
2. MAX AVAILABILITY (Sync → Async fallback):
   - Synchronous when standby is reachable
   - Falls back to ASYNC if standby is unreachable
   - Near-zero data loss — small window possible during fallback
   - Primary continues serving writes during standby outage
   
3. MAX PERFORMANCE (Asynchronous):
   - Primary ships redo logs asynchronously
   - Lowest latency (no wait for standby)
   - RPO > 0 (seconds to minutes of data loss possible)
   - Best for cross-continent replication

Redo Log Shipping:
class RedoLogShipper {
    // Continuous log shipping from primary to standby
    void ship(WALEntry entry, ReplicationMode mode) {
        byte[] payload = serialize(entry);
        byte[] encrypted = encrypt(payload, replicationKey); // TLS + payload encryption
        
        switch (mode) {
            case MAX_PROTECTION:
                // Synchronous: wait for ACK
                CompletableFuture<Void> ack = standby.sendAndWaitAck(encrypted, Duration.ofSeconds(5));
                try {
                    ack.get(); // Block until standby confirms
                } catch (TimeoutException e) {
                    // In MAX_PROTECTION: halt primary writes
                    primaryDB.setReadOnly(true);
                    alertService.critical("Standby unreachable — primary writes halted");
                    throw new ReplicationException("Standby ACK timeout");
                }
                break;
                
            case MAX_AVAILABILITY:
                // Try sync, fallback to async
                try {
                    standby.sendAndWaitAck(encrypted, Duration.ofSeconds(3)).get();
                } catch (Exception e) {
                    // Fallback: queue for async shipping
                    asyncQueue.enqueue(encrypted);
                    redoLogArchive.persist(entry); // Archive locally
                }
                break;
                
            case MAX_PERFORMANCE:
                // Async: fire and forget (with retry queue)
                asyncQueue.enqueue(encrypted);
                break;
        }
    }
}

Automatic Failover with Split-Brain Prevention:
class FailoverManager {
    // Observer/Arbiter pattern: 3rd node breaks tie
    // Uses fencing to prevent split-brain
    
    void detectAndFailover() {
        // 1. Observer detects primary is down (missed 3 consecutive heartbeats)
        if (consecutiveMissedHeartbeats >= 3) {
            // 2. Observer confirms with standby
            boolean standbySeesFailure = standby.primaryReachable() == false;
            
            if (standbySeesFailure) {
                // 3. FENCE the old primary (STONITH - Shoot The Other Node In The Head)
                boolean fenced = fencePrimary();
                
                if (!fenced) {
                    // Cannot confirm primary is down → DO NOT failover (split-brain risk)
                    alertService.critical("Cannot fence primary — manual intervention required");
                    return;
                }
                
                // 4. Promote standby to primary
                standby.promoteToWritable();
                
                // 5. Update DNS/routing to point to new primary
                dnsService.updateEndpoint("primary.db", standby.getEndpoint());
                
                // 6. Notify all read replicas to follow new primary
                readReplicas.forEach(replica -> replica.repoint(standby.getEndpoint()));
                
                alertService.warn("Failover complete: " + standby.getId() + " is new primary");
            }
        }
    }
    
    boolean fencePrimary() {
        // STONITH: power off the old primary server
        // Options: IPMI power off, cloud API (terminate instance), SAN fencing
        try {
            return ipmiService.powerOff(primary.getHostId());
        } catch (Exception e) {
            return false; // Cannot confirm primary is dead
        }
    }
}

Read Replica Query Offloading:
- Read replicas accept SELECT queries only
- Lag monitoring: expose replica_lag_seconds metric
  - If lag > threshold → remove from load balancer (stale reads dangerous)
- Application-level read/write splitting:
  - @ReadReplica annotation → route to replica
  - All writes → primary
  - Strong consistency reads (e.g., after write) → primary with session stickiness
```

---

## 🎯 Key Takeaways
- Oracle = **DB internals + connection pooling + replication + enterprise Java**
- **Connection Pool**: `BlockingQueue` for available, `ConcurrentHashMap.newKeySet()` for in-use, `CAS` for creation
- **Health check**: periodic validation of idle connections, evict stale, replenish to min
- **Graceful shutdown**: stop accepting new requests → drain in-use (grace period) → force close
- **Replication modes**: MAX_PROTECTION (sync, ZDL) vs MAX_AVAILABILITY (sync→async) vs MAX_PERFORMANCE (async)
- **Split-brain prevention**: 3-node Observer/Arbiter + STONITH fencing before promotion
- **STONITH**: "Shoot The Other Node In The Head" — power-off old primary before promoting standby
- Oracle interviews: deep Java concurrency + DB internals required

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Coding | Hard | Thread-Safe Connection Pool, Concurrency |
| Technical 2 | Medium-Hard | Java Internals, JVM |
| System Design | Hard | DB Replication, Failover, Split-Brain |
| HM | Medium | Technical Leadership |
