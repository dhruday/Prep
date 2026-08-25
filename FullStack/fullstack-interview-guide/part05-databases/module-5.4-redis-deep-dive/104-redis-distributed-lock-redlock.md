# Redis Distributed Lock — Redlock Algorithm 🆕
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A distributed lock (also called a mutex — a device that only lets one process do something at a time) is needed when multiple servers run the same code concurrently and you must guarantee that at most one of them executes a critical section at a time. A standard Java `synchronized` block only works within one JVM — it doesn't work across a cluster.
- The naive Redis lock: `SET lock:resource "1" NX EX 10`. Here NX = "only if Not eXists" (don't overwrite an existing lock) and EX 10 = "expire in 10 seconds" (safety — lock auto-releases if the holder crashes). This works on a single Redis instance.
- The Redlock algorithm extends this to multiple independent Redis nodes to survive a single node failure. It acquires a lock on N/2+1 (majority) of N nodes. Release requires running an identical Lua script on all nodes. The algorithm is described in detail in the Redis documentation.
- Key risks with naive single-node locking: (1) process holds lock and pauses (GC pause, network partition) for longer than lock TTL — lock expires, another process acquires it, now two processes are in the critical section; (2) Redis primary failover — lock exists on primary but not yet replicated to replica; replica becomes primary; new lock can be acquired; two processes hold the lock simultaneously.
- **Use Redisson** for production distributed locks in Java — it handles lock acquisition, TTL auto-renewal (watchdog), re-entrant locks, and Redlock multi-node acquisition. Never roll your own.
- Gap to bridge: this is marked 🆕 — many candidates know `SETNX` exists but cannot explain lock expiry risks, GC-pause-induced double-acquisition, or why a single Redis node isn't sufficient for a truly distributed lock.

---

## 1. One-Line Definition
A Redis distributed lock is a way to ensure that — across multiple servers running the same application — only one server at a time can execute a specific section of code by acquiring exclusive access to a shared key in Redis before proceeding.

---

## 2. The Problem It Solves

Imagine a payment service running on 5 servers. When a payment request arrives, the service must: check if this idempotency key has already been processed, if not, process the payment, then store the result. All three steps must be an atomic unit — no two servers should process the same payment.

Without a distributed lock: Server 1 and Server 2 both receive the same payment request (retry scenario). Both check the idempotency store — at the exact same millisecond, neither has stored the result yet. Both find "not processed." Both call the payment gateway. The customer is charged twice.

A Java `synchronized` method on Server 1 does nothing to stop Server 2 from doing the same. You need a locking mechanism that spans both servers.

Another scenario: a scheduled job that runs every 5 minutes across 3 server instances. Without a distributed lock, all 3 instances run the job simultaneously: three times the work, three times the database writes, potential duplicate emails sent to customers.

Redis distributed lock solves both: before the critical section, acquire the lock. Only the one server that gets the lock proceeds. The others see "lock taken" and either retry or give up. After the critical section, the lock holder releases it.

---

## 3. How It Works Internally

### The Mental Model
Think of a distributed lock like a hotel key card system. There is one key for room 101. Whoever holds the key can enter. When you check in (acquire the lock), you get the key. While you have it, no one else can enter room 101. When you check out (release the lock), you return the key. But unlike a physical key, the hotel also has a policy: if a guest takes the key and doesn't return it within X hours (lock TTL expires), the key is automatically deactivated and a new guest can get one. This protects against guests who check in and never leave (crashed processes).

### Single-Node Lock — Mechanism

```
ACQUIRE LOCK:
SET lock:{resource} {unique_token} NX EX {ttl_seconds}

  NX = only SET if key does Not eXist (SET fails if lock is already held)
  EX = seconds until auto-expiry (safety net if holder crashes)
  unique_token = randomly generated UUID (prevents a different holder from releasing your lock)

If SET returns "OK" → you have the lock. Proceed.
If SET returns nil → someone else holds the lock. Retry or fail fast.

RELEASE LOCK (Lua script — atomic check-and-delete):
  if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
  else
      return 0
  end

Why Lua? The check-and-delete must be atomic. Without Lua:
  GET returns your token → lock expires → different process acquires lock
  → DEL deletes the NEW holder's lock (not yours!)
Lua script runs atomically on Redis — the entire script is one operation.
```

### The Lock Expiry Problem (Why TTL Is Not Enough)

```
PROBLEM: Process A holds lock, TTL = 30 seconds

Timeline:
T=0:    Process A acquires lock (TTL=30s)
T=20s:  Process A enters GC pause (JVM stop-the-world garbage collection)
T=30s:  Lock TTL expires. Redis deletes the key.
T=31s:  Process B acquires the lock (TTL=30s)
T=40s:  Process A wakes from GC pause.
        A does NOT know its lock expired.
        A continues executing the critical section.

RESULT: Both A and B are in the critical section simultaneously.
This is a fundamental limitation of lock-based distributed systems.

MITIGATION (not full solution):
- Lock watchdog: a background thread in Process A extends the lock TTL
  automatically as long as the process is alive. (Redisson does this.)
- Fencing tokens: with every lock acquisition, the server gets a monotonically
  increasing token. Critical section calls include this token.
  The protected resource rejects any request with a lower token than the last seen.
  This prevents old lock holders (with stale/expired tokens) from making changes.
  Used in distributed databases like ZooKeeper-based systems.
```

### Redlock Algorithm — Multi-Node (For Highest Correctness)

```
SETUP: 5 independent Redis nodes (not replicated to each other)
       N=5, majority = 3

ACQUIRE REDLOCK:
1. Record current time T1 (in milliseconds)
2. Try SET lock:{resource} {token} NX PX {ttl_ms} on Node 1 → success/fail
3. Try the same on Node 2 → success/fail
4. Try the same on Node 3 → success/fail
5. Try the same on Node 4 → success/fail
6. Try the same on Node 5 → success/fail

7. Count successes. Also compute actual elapsed time: T2 - T1
8. Lock is considered ACQUIRED if:
   - At least 3 nodes (majority) returned OK
   - AND the time elapsed (T2-T1) is less than the original TTL
     (if it took longer than TTL to acquire, the lock may already be expired)

9. Effective TTL = original TTL - elapsed acquisition time
   Use this shorter TTL for your critical section.

RELEASE REDLOCK:
Run the Lua check-and-delete script on ALL 5 nodes, regardless of
which ones were successful during acquisition. Lock on any node that
holds it gets released.

WHY IT WORKS:
Node 2 crashes? 4 nodes still available, majority = 3 still achievable.
Caller gets 3 of 4 approvals → lock is valid.
The crashed node's key expires by TTL anyway.
```

### ASCII Diagram

```
SINGLE NODE LOCK:

  Process A           Redis
  ─────────           ─────────────────────────────
  SET lock:pay abc NX EX 30 ──────────────► "OK" (acquired)
  ...critical section...
  LUA(GET==abc → DEL) ────────────────────► 1 (released)

  Process B (concurrent):
  SET lock:pay xyz NX EX 30 ──────────────► nil (lock held by A — fail fast)
  → retry after 50ms jitter

REDLOCK (5 nodes):

  Process A      Node1   Node2   Node3   Node4   Node5
  ─────────      ─────   ─────   ─────   ─────   ─────
  SET NX ──────► OK      OK      OK      FAIL    OK
                 ↑               ↑               ↑
                 3 of 5 succeeded in time < TTL → ACQUIRED
                 effective TTL = 30s - 12ms = ~29.99s

  Process B:
  SET NX ──────► FAIL    FAIL    FAIL    OK      FAIL
                 Only 1 of 5 succeeded → NOT ACQUIRED → retry/fail
```

---

## 4. The Code

### Wrong Way — SETNX Without Token (Dangerous)

```java
// Wrong: no unique token — any process can accidentally release another's lock
Boolean acquired = redisTemplate.opsForValue()
    .setIfAbsent("lock:payment", "locked");  // no unique value

// ... critical section ...

// Wrong: unconditional DELETE — if our lock expired and someone else acquired it,
// we just deleted their lock. Now TWO processes are in the critical section.
redisTemplate.delete("lock:payment");
```
> **Why this fails in production:** If Process A's lock expires and Process B acquires it, Process A's `delete` removes B's lock. Both A and B are now running the critical section simultaneously.

### Right Way — Manual Single-Node Lock with Token

```java
@Service
public class PaymentLockService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final Duration LOCK_TTL = Duration.ofSeconds(30);

    // Lua script: atomically check token matches, then delete
    // This prevents accidentally releasing a lock acquired by a different holder
    private static final RedisScript<Long> RELEASE_SCRIPT = RedisScript.of(
        "if redis.call('get', KEYS[1]) == ARGV[1] then " +
        "  return redis.call('del', KEYS[1]) " +
        "else " +
        "  return 0 " +
        "end",
        Long.class
    );

    // Returns a unique token if lock acquired, null if not
    public String tryAcquire(String resource) {
        String lockKey = "lock:" + resource;
        // Use random UUID so only the holder who set this value can release it
        String token = UUID.randomUUID().toString();
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, token, LOCK_TTL);
        return Boolean.TRUE.equals(acquired) ? token : null;
    }

    // Release only if we still hold the lock (token matches)
    public void release(String resource, String token) {
        String lockKey = "lock:" + resource;
        redisTemplate.execute(RELEASE_SCRIPT, List.of(lockKey), token);
    }
}

// Usage in a service
@Service
public class PaymentService {

    private final PaymentLockService lockService;
    private final PaymentGateway gateway;

    public PaymentResult processPayment(String idempotencyKey, PaymentRequest request) {
        // Try to acquire lock for this specific payment
        String token = lockService.tryAcquire("payment:" + idempotencyKey);

        if (token == null) {
            // Another server is already processing this payment
            throw new PaymentAlreadyInProgressException(idempotencyKey);
        }

        try {
            // Check idempotency store — has this been processed?
            if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
                return paymentRepository.findByIdempotencyKey(idempotencyKey);
            }

            // Process payment
            PaymentResult result = gateway.charge(request);
            paymentRepository.save(idempotencyKey, result);
            return result;

        } finally {
            // Always release in finally — prevents lock leaks on exceptions
            lockService.release("payment:" + idempotencyKey, token);
        }
    }
}
```

### Right Way — Redisson (Production-Grade, Recommended)

```java
// pom.xml dependency
// <dependency>
//   <groupId>org.redisson</groupId>
//   <artifactId>redisson-spring-boot-starter</artifactId>
//   <version>3.27.0</version>
// </dependency>

@Service
public class PaymentService {

    private final RedissonClient redissonClient;

    public PaymentResult processPayment(String idempotencyKey, PaymentRequest request) {
        // Redisson lock: handles token uniqueness, Lua release, TTL, watchdog
        RLock lock = redissonClient.getLock("lock:payment:" + idempotencyKey);

        // tryLock(waitTime, leaseTime, timeUnit)
        // waitTime=0: don't wait — fail fast if another process holds the lock
        // leaseTime=30: lock TTL (watchdog auto-renews if still held)
        boolean acquired;
        try {
            acquired = lock.tryLock(0, 30, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while acquiring lock", e);
        }

        if (!acquired) {
            throw new PaymentAlreadyInProgressException(idempotencyKey);
        }

        try {
            // Critical section
            if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
                return paymentRepository.findByIdempotencyKey(idempotencyKey);
            }
            PaymentResult result = gateway.charge(request);
            paymentRepository.save(idempotencyKey, result);
            return result;
        } finally {
            // Safe unlock: checks that this thread still holds the lock
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

### Configuration for Redlock (Multi-Node)

```java
// For Redlock: configure Redisson with multiple independent nodes
@Configuration
public class RedissonConfig {

    @Bean
    public RedissonClient redissonClient() {
        // Redlock requires multiple INDEPENDENT masters (not replicated cluster)
        Config config = new Config();
        config.useMultipleServers()
            // 5 independent Redis nodes for Redlock algorithm
            .addAddress(
                "redis://redis-node-1:6379",
                "redis://redis-node-2:6379",
                "redis://redis-node-3:6379",
                "redis://redis-node-4:6379",
                "redis://redis-node-5:6379"
            );
        return Redisson.create(config);
    }
}
```

> **Key decisions here:**
> - Always use unique token (UUID) for lock value — prevents one holder releasing another's lock
> - Lua script for release — check-and-delete must be atomic; two separate commands have a race condition between them
> - Use Redisson in production — it handles watchdog (auto-renewal), re-entry, and multi-node correctly. Manual SETNX is for learning, not shipping
> - Always `unlock()` in a `finally` block — a lock leaked by an exception is a deadlock waiting to happen

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How would you implement a distributed lock in Redis? Walk me through the commands."

**Hruday's answer:**
> The core command is `SET lock:resource <token> NX EX <seconds>`. NX means "only set if the key doesn't exist" — this is the atomic check-and-set that makes it a lock. EX sets an automatic expiry time, which is the safety net: if the process holding the lock crashes, the lock auto-releases after the TTL instead of being held forever.
>
> The token is a random UUID unique to each lock attempt. This prevents a critical mistake: if Process A's lock expires and Process B acquires it — then Process A wakes up and tries to release — Process A must not delete Process B's lock. By storing a unique token and only deleting if the current value equals your token, you ensure only the original holder can release the lock.
>
> The release is a Lua script: "if GET(key) == myToken then DEL(key)." It must be a Lua script because the check-and-delete must be atomic. Without atomic execution: GET returns your token, then your lock expires and a new holder acquires it, then your DEL deletes the new holder's lock — you've just released a lock you no longer hold. Lua scripts run as a single atomic operation in Redis.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the GC pause problem with distributed locks and how does Redisson's watchdog address it?"

**Hruday's answer:**
> The GC pause problem is this: you set a lock with TTL=30 seconds. Your Java process enters a stop-the-world GC pause for 35 seconds — longer than your lock TTL. While your process is paused, the lock expires in Redis. Another process acquires the lock and starts executing the critical section. Your process finishes its GC pause and continues executing — it doesn't know the lock has expired, it just keeps going. Now two processes are simultaneously in the critical section. This violates the mutual exclusion you were trying to guarantee.
>
> Redisson's watchdog is a background thread that automatically extends the lock TTL as long as the holder process is alive and still holds the lock. By default, Redisson sets the lock TTL to 30 seconds but the watchdog renews it every 10 seconds. If your process is alive and processing, the TTL keeps getting renewed. If your process dies — the watchdog dies with it, the renewals stop, and the lock expires and is available for another holder.
>
> This addresses the "process crashed without releasing" case well. But it doesn't fully solve the GC pause problem — a paused process is alive but unresponsive. The watchdog itself is paused. So the TTL can still expire during a very long GC pause. The full solution for financial-grade locking is fencing tokens — each lock acquisition gets a monotonically increasing counter, and the protected resource rejects requests with a lower counter than the last-seen one, preventing old lock holders from making changes even after their lock expired.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Is Redlock truly safe? There's been debate about this — are you aware of it?"

**Hruday's answer:**
> Yes — Martin Kleppmann wrote a detailed critique of Redlock arguing that it is not safe under certain timing assumptions. His argument is that Redlock relies on approximate timing — the algorithm assumes that network delays and process pauses are bounded, but this cannot be guaranteed. A long GC pause or network delay can invalidate the timing assumptions Redlock relies on.
>
> The counter-argument from Redis author Salvatore Sanfilippo is that Redlock is safe under reasonable assumptions and provides meaningful protection for most real-world scenarios.
>
> My practical position: for most distributed lock use cases — preventing duplicate payment processing, serialising access to a shared resource, preventing duplicate cron job runs — Redlock with a sensible TTL provides sufficient safety guarantees. The failures Kleppmann describes are possible in theory but require adversarial timing conditions — very long GC pauses, network partitions lasting longer than the lock TTL.
>
> For use cases where correctness is truly financial-grade critical and you need a formal safety guarantee, use ZooKeeper or etcd — both provide consensus-based distributed coordination with stronger guarantees than Redis. But they add operational complexity. Redis Redlock is a pragmatic choice for the vast majority of distributed locking needs when you're already running Redis.

---

### Q4 — Scenario
**Interviewer asks:** "You have a scheduled job that runs every 5 minutes to send reminder emails. It runs on 3 servers. How do you ensure the job runs exactly once?"

**Hruday's answer:**
> This is the classic "distributed cron" problem. The naive approach — each server runs the scheduler — causes all 3 servers to send the same batch of emails simultaneously.
>
> The solution is a distributed lock with a TTL slightly longer than the job execution time. When the scheduled trigger fires on all 3 servers simultaneously, each server tries to acquire: `SET cron:reminder-email {token} NX EX 300` — 5 minute TTL to cover the job execution time.
>
> Only one server gets "OK." That server runs the job. The other two get "nil" and log a skip — they know another server is running it. In Java with Spring Scheduling and Redisson, this looks like a `@Scheduled` method that starts with `tryLock(0, 5, MINUTES)` and returns immediately if the lock isn't acquired.
>
> An important consideration: what if the job fails halfway through? If the job throws an exception, the lock is released in the `finally` block, but the job may have sent 50% of the emails. On the next 5-minute trigger, a new instance acquires the lock and re-runs the job. To prevent re-sending the same emails, the job must be idempotent — track which emails have been sent in the database and skip already-sent ones. The lock prevents concurrent execution; idempotency handles partial completions.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "SET key NX is enough" | "I'll use SETNX with a fixed value like '1' and DELETE to release" | "Using a fixed value means any process can release any other process's lock. If Process A's lock expires and Process B acquires it with value '1', Process A's unconditional DEL removes Process B's lock. The fix: each acquisition uses a unique UUID as the value. Release uses a Lua-script that only deletes if the current value matches your UUID. This is the minimum correct single-node lock pattern." |
| "I'll set the TTL very long to be safe" | "I'll set TTL to 10 minutes to make sure the process finishes" | "Long TTL means long wait when the lock holder crashes. If TTL = 10 minutes and the process dies at second 5, all other processes wait 9 minutes and 55 seconds before they can proceed. Short TTL + watchdog renewal is much better: short TTL means fast recovery when a process dies; watchdog renewal means the TTL never expires as long as the process is alive and working. Redisson's default of 30s with 10s renewal is a good baseline." |
| "Redlock works on replicated Redis" | "I'll use my Redis primary + replicas for Redlock" | "Redlock specifically requires INDEPENDENT, non-replicated Redis nodes. If you run Redlock on a primary + replicas, a primary failure during the lock window causes the replica to promote — and the replica may not have the lock key yet (replication is async). The promoted primary doesn't know about the lock. A new process acquires the lock. The original holder still thinks it has it. Two processes in the critical section. Redlock's safety comes from majority consensus across truly independent nodes, not replication." |
| "Don't need to release in finally" | "If the critical section succeeds, I'll release the lock" | "If the code throws an exception after acquiring the lock and before releasing it, the lock is never released. The next caller waits for TTL to expire — which could be 30 seconds of blocked requests. Always release in a `finally` block. Redisson's `lock.unlock()` in `finally` is the correct pattern. Additionally, check `isHeldByCurrentThread()` before unlocking — never unlock a lock you no longer hold (if your watchdog failed and the lock auto-expired, calling unlock on it would throw an exception)." |

---

## 7. Hruday's Real Experience Hook

> "I haven't implemented Redlock in production yet, but the need for distributed locks became very clear to me at Oracle ERP. We had a batch job processing financial journal entries that ran on two application server instances for high availability. When both instances tried to process the same posting batch simultaneously, we ended up with duplicate journal entries in the general ledger — a serious accounting error. The fix at the time was a database-level advisory lock. Looking at it now, a Redis distributed lock with Redisson would be a cleaner, faster, language-independent solution. The principle is the same: only one server should run a critical section at a time. The implementation in Redis is cleaner than database advisory locks and doesn't add load to the main transactions database."

---

## 8. Scale Evolution

**1,000 users →** Single Redis node lock is sufficient. Simple SETNX with Redisson. Lock contention is low — most operations don't need serialisation.

**100,000 users →** Lock contention on hot resources starts to matter. Analyse which resources need locking — avoid locking too broadly (one lock for "all payments" is a bottleneck; one lock per "idempotency key" is fine). Lock on the smallest possible scope. Set meaningful TTLs — too long causes queuing, too short causes safety violations.

**10 million users →** Redis Cluster with Redlock on a subset of nodes. Or move away from distributed locks where possible: design systems to be idempotent (database-level UPSERT) rather than relying on locks for correctness. Locks are a serialisation point — they are fundamentally a bottleneck. At 10M users, the goal is to reduce lock usage to only the truly necessary cases.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Distributed locks are critical for payment idempotency — preventing double charges in a multi-server environment. Redlock vs. single-node trade-off comes up in system design rounds. | "How do you prevent a payment being processed twice when the client retries the API call and two servers handle the retry simultaneously?" |
| Swiggy / Meesho | Flash sale inventory locks — only one server decrements stock for a given item per purchase attempt. Distributed lock with short TTL to prevent over-selling. | "When 10,000 users try to buy the last item in a flash sale simultaneously, how do you ensure only one succeeds?" |
| Adobe / Microsoft | Creative cloud batch jobs, shared workspace operations — distributed locks for serialising concurrent edits to the same resource. | "How would you prevent two users from simultaneously renaming the same file in a collaborative workspace to different names?" |
| SAP Labs (current) | Scheduled jobs in multi-instance deployment — batch postings, report generation, scheduled exports. Distributed lock prevents duplicate execution across pods. | "Your scheduled report job runs on 3 pods every night. How do you ensure the report is generated exactly once?" |

---

## 10. Related Topics — What to Study Next

- **Topic 101 — Redis Data Structures** — the String's `SETNX` (SET if Not eXists) is the primitive that the distributed lock is built on; understanding String commands is prerequisite
- **Topic 78 — Eventual Consistency** — distributed locks are the pessimistic approach to consistency; understanding when eventual consistency is acceptable helps decide when locks are actually needed
- **Topic 50 — Optimistic vs Pessimistic Locking** — database-level equivalent; compare optimistic locking (version numbers, no waiting) vs. distributed lock (pessimistic — wait for lock); helps choose the right strategy per scenario
- **Topic 121 — Idempotency Design** — Part 6; a well-designed idempotent consumer can often avoid needing a lock entirely; design for idempotency first, reach for locks only when truly necessary

---

*Part 5 · Redis Distributed Lock — Redlock Algorithm · Full Stack Interview Guide · Hruday D · 2026*
