# 03 — Distributed Systems, Messaging & Resilience

> **Phase C** of the FAANG Interview Master Guide
> Covers: Backend Parts 11-15 (topics 93-135) + Frontend SEQ 13-16 (topics 240-303)
> **~105 topics** | Deep backend concepts + Frontend security, real-time & scalability

---

## Table of Contents

### Part A — Messaging Systems (Backend 93-102)
- [93. Synchronous vs Asynchronous Processing](#93-synchronous-vs-asynchronous-processing)
- [94. Message Queues](#94-message-queues)
- [95. Kafka Fundamentals](#95-kafka-fundamentals)
- [96. RabbitMQ Fundamentals](#96-rabbitmq-fundamentals)
- [97. Pub-Sub Model](#97-pub-sub-model)
- [98. Event Streaming](#98-event-streaming)
- [99. At-Most-Once vs At-Least-Once vs Exactly-Once](#99-at-most-once-vs-at-least-once-vs-exactly-once)
- [100. Ordering Guarantees](#100-ordering-guarantees)
- [101. Idempotency](#101-idempotency)
- [102. Dead Letter Queues](#102-dead-letter-queues)

### Part B — Distributed Systems (Backend 103-108)
- [103. Distributed Systems Fundamentals](#103-distributed-systems-fundamentals)
- [104. Leader Election](#104-leader-election)
- [105. Distributed Locks](#105-distributed-locks)
- [106. Heartbeats](#106-heartbeats)
- [107. Clock Skew & Time Synchronization](#107-clock-skew--time-synchronization)
- [108. Consensus Basics](#108-consensus-basics)

### Part C — Resilience & Fault Tolerance (Backend 109-118)
- [109. Single Point of Failure](#109-single-point-of-failure)
- [110. Redundancy](#110-redundancy)
- [111. Retry Strategies](#111-retry-strategies)
- [112. Exponential Backoff](#112-exponential-backoff)
- [113. Timeouts](#113-timeouts)
- [114. Circuit Breaker Pattern](#114-circuit-breaker-pattern)
- [115. Bulkheads](#115-bulkheads)
- [116. Graceful Degradation](#116-graceful-degradation)
- [117. Disaster Recovery](#117-disaster-recovery)
- [118. Chaos Engineering](#118-chaos-engineering)

### Part D — APIs, Security & Governance (Backend 119-127)
- [119. REST API Design Principles](#119-rest-api-design-principles)
- [120. API Versioning](#120-api-versioning)
- [121. Pagination & Filtering](#121-pagination--filtering)
- [122. Rate Limiting](#122-rate-limiting)
- [123. Authentication vs Authorization](#123-authentication-vs-authorization)
- [124. OAuth (High Level)](#124-oauth-high-level)
- [125. Secure API Design](#125-secure-api-design)
- [126. Encryption (At Rest & In Transit)](#126-encryption-at-rest--in-transit)
- [127. Secrets Management](#127-secrets-management)

### Part E — Observability & Operations (Backend 128-135)
- [128. Logging Strategy](#128-logging-strategy)
- [129. Metrics](#129-metrics)
- [130. Monitoring](#130-monitoring)
- [131. Distributed Tracing](#131-distributed-tracing)
- [132. Alerts](#132-alerts)
- [133. SLIs, SLOs & SLAs](#133-slis-slos--slas)
- [134. Incident Management](#134-incident-management)
- [135. Production Debugging](#135-production-debugging)

### Part F — Frontend Security (SEQ 13, Topics 240-244)
- [240. XSS — Types, Prevention, Real Examples](#240-xss--types-prevention-real-examples)
- [241. CSRF — SameSite Cookies, CSRF Tokens](#241-csrf--samesite-cookies-csrf-tokens)
- [242. CORS — Preflight, Credentialed Requests](#242-cors--preflight-credentialed-requests)
- [243. Prototype Pollution](#243-prototype-pollution)
- [244. Supply Chain Attacks](#244-supply-chain-attacks--npm-package-security)

### Part G — Authorization & Access Control (SEQ 14, Topics 245-274)
- [245-257. Auth Flows & Secure Headers](#245-authentication-flows)
- [258-274. Authorization Patterns](#258-authentication-vs-authorization)

### Part H — Real-Time Systems (SEQ 15, Topics 275-287)
- [275-287. Real-Time Frontend](#275-polling-vs-long-polling)

### Part I — Scalability & Growth (SEQ 16, Topics 288-303)
- [288-303. Frontend at Scale](#288-designing-for-millions)

---
---

# Part A — Messaging Systems

## 93. Synchronous vs Asynchronous Processing

### Q: When should you use synchronous vs asynchronous communication between services?

**Answer (Interview-Ready):**

| Aspect | Synchronous | Asynchronous |
|--------|------------|--------------|
| **How** | Service A calls Service B and WAITS for response | Service A sends message to queue/topic, Service B processes later |
| **Coupling** | Tight (A depends on B being available) | Loose (A doesn't know/care about B) |
| **Latency** | Higher (cumulative wait time) | Lower for the sender (fire-and-forget) |
| **Reliability** | Fragile (B down = A fails) | Resilient (messages buffered in queue) |
| **Examples** | REST API call, gRPC, HTTP | Kafka, RabbitMQ, SQS, event bus |

**When to use sync:**
- User needs immediate response (login, search, payment confirmation)
- Simple request-response pattern
- Low latency required for the complete operation

**When to use async:**
- User doesn't need immediate result (email notification, report generation)
- Workload spikes need to be absorbed (order processing surge on Black Friday)
- Multiple downstream services need to react independently (event-driven)
- Long-running operations (video encoding, data pipeline)

**Follow-ups:**
- "Can you mix both?" → Yes. Common pattern: sync API response to user → async event for downstream processing. E.g., `POST /order` → returns 202 Accepted → publishes event to Kafka → inventory, shipping, email services process independently
- "What about async request-reply?" → Correlation ID: sender sends message with unique ID → waits → consumer processes and replies to response queue with same ID. Less common but supported by most message brokers

🔥 **Most Asked**: When to choose each, mixed sync+async pattern
🧠 **Strategy**: "Default to sync for user-facing operations, async for background processing and inter-service communication"

---

## 94. Message Queues

### Q: How do message queues work and what problems do they solve?

**Answer (Interview-Ready):**
- **Message queue** = buffer between producer and consumer. Producer enqueues, consumer dequeues. Decouples producers from consumers

**Core concepts:**
- **Producer → Queue → Consumer**: Point-to-point. One message consumed by exactly one consumer
- **FIFO**: Messages processed in order (optionally, depending on queue type)
- **Acknowledgment**: Consumer ACKs after processing. If no ACK → message re-delivered (at-least-once)
- **Visibility timeout**: Message invisible to other consumers while being processed. Prevents duplicate processing

**What they solve:**
| Problem | How Queue Solves It |
|---------|-------------------|
| Service coupling | Producer doesn't need consumer to be running |
| Load spikes | Queue absorbs burst, consumers process at their pace |
| Fault tolerance | If consumer crashes, message stays in queue for retry |
| Scaling | Add more consumers to process faster (competing consumers) |
| Rate limiting | Control consumer throughput independently of producer |

**Popular queues:**
| Queue | Key Feature | Managed Service |
|-------|------------|-----------------|
| **SQS** | Simple, serverless, auto-scaling | AWS SQS |
| **RabbitMQ** | Rich routing (exchanges, bindings), AMQP protocol | Amazon MQ, CloudAMQP |
| **Redis Streams** | Lightweight, built into Redis | ElastiCache |
| **Kafka** | Not just a queue — a distributed log (see next) | Confluent, Amazon MSK |

🔥 **Most Asked**: Queue vs topic, acknowledgment, competing consumers
🧠 **Strategy**: "Use SQS for simple task queues. RabbitMQ for complex routing. Kafka for event streaming"

---

## 95. Kafka Fundamentals

### Q: How does Apache Kafka work and when should you use it?

**Answer (Interview-Ready):**
- **Kafka** = distributed, persistent, high-throughput event streaming platform. Not just a message queue — it's a commit log

**Architecture:**
```
Producer → [Topic: order-events]
             ├── Partition 0: [msg1, msg4, msg7, ...]
             ├── Partition 1: [msg2, msg5, msg8, ...]
             └── Partition 2: [msg3, msg6, msg9, ...]
           ↓           ↓           ↓
        Consumer     Consumer     Consumer
        (Group A)    (Group A)    (Group A)
```

**Key concepts:**
| Concept | Description |
|---------|-----------|
| **Topic** | Named stream of events (like a table). `order-events`, `user-signups` |
| **Partition** | Ordered, immutable log. Parallelism unit. Messages within a partition are ordered |
| **Offset** | Position of a message in a partition. Consumer tracks its offset |
| **Consumer Group** | Group of consumers that share partitions. Each partition assigned to one consumer in the group |
| **Broker** | Kafka server. Cluster of brokers for HA |
| **Replication** | Each partition replicated to N brokers. Leader handles reads/writes, followers replicate |
| **Retention** | Messages kept for configurable time (or size). Default 7 days. Can be infinite |

**Why Kafka over traditional queues:**
- **Replay**: Consumers can re-read messages (seek to any offset). Queues delete after ACK
- **Multiple consumers**: Each consumer group independently reads all messages. One publish → many subscribe
- **Throughput**: Millions of messages/sec. Sequential disk writes (very fast)
- **Ordering**: Guaranteed within a partition (use partition key for ordering)

**When to use:** Event sourcing, real-time data pipelines (ETL), log aggregation, activity streaming, CDC (Change Data Capture), microservice event bus

🔥 **Most Asked**: Partitions, consumer groups, ordering guarantees, why not a regular queue
🧠 **Strategy**: "Kafka for event streaming. SQS/RabbitMQ for simple task queues. Kafka's replay capability is the key differentiator"

---

## 96. RabbitMQ Fundamentals

### Q: How does RabbitMQ differ from Kafka and when should you use it?

**Answer (Interview-Ready):**
- **RabbitMQ** = traditional message broker implementing AMQP protocol. Smart broker / dumb consumer model

**Architecture:**
```
Producer → Exchange → Routing → Queue → Consumer
```

**Exchange types:**
| Exchange | Routing | Use Case |
|----------|---------|----------|
| **Direct** | Exact routing key match | Task queue to specific consumer |
| **Fanout** | Broadcast to all bound queues | Notifications to multiple services |
| **Topic** | Pattern matching (wildcards `*`, `#`) | `order.created.eu` → subscribers for `order.created.*` |
| **Headers** | Match on message headers | Complex routing rules |

**Kafka vs RabbitMQ:**
| Feature | Kafka | RabbitMQ |
|---------|-------|----------|
| Model | Pull-based log | Push-based queue |
| Ordering | Per partition | Per queue (FIFO) |
| Replay | ✅ (seek to offset) | ❌ (consumed = removed) |
| Routing | Simple (topic + partitions) | Rich (exchanges, bindings, patterns) |
| Throughput | Very high (millions/sec) | High (10K-100K/sec) |
| Latency | Higher (batching) | Lower (push-based) |
| Use case | Event streaming, data pipelines | Task queues, RPC, complex routing |

**When to use RabbitMQ:**
- Task distribution (competing consumers processing jobs)
- Complex routing requirements (route by message attributes)
- Request-reply pattern (RPC over messaging)
- When you need message-level acknowledgment and redelivery
- Lower latency per message matters more than throughput

🔥 **Most Asked**: Kafka vs RabbitMQ decision, exchange types, when to choose each
🧠 **Strategy**: "RabbitMQ = smart broker, complex routing, task queues. Kafka = dumb broker, smart consumers, event streaming"

---

## 97. Pub-Sub Model

### Q: How does the publish-subscribe pattern work and how does it differ from point-to-point queuing?

**Answer (Interview-Ready):**

| Aspect | Point-to-Point (Queue) | Pub-Sub (Topic) |
|--------|----------------------|-----------------|
| Consumers | One message → one consumer | One message → all subscribers |
| Coupling | Producer knows about queue | Producer knows about topic (not consumers) |
| Fan-out | No | Yes |
| Use case | Task distribution | Event notification, broadcasting |

**How Pub-Sub works:**
```
Publisher → Topic: "order.created"
                    ├── Subscriber 1: Inventory Service (reserves stock)
                    ├── Subscriber 2: Email Service (sends confirmation)
                    ├── Subscriber 3: Analytics Service (tracks conversion)
                    └── Subscriber 4: Warehouse Service (prepares shipment)
```
- Publisher doesn't know or care who subscribes
- Adding a new subscriber requires zero changes to the publisher
- Each subscriber gets its own copy of every message

**Implementations:**
- **Kafka consumer groups**: Each group gets all messages independently
- **Google Cloud Pub/Sub**: Managed pub-sub with push/pull delivery
- **AWS SNS + SQS**: SNS topic fans out to multiple SQS queues (fan-out pattern)
- **Redis Pub/Sub**: Lightweight but no persistence (subscriber must be online)

**Follow-ups:**
- "Fan-out vs fan-in?" → **Fan-out**: one event triggers multiple consumers (Pub-Sub). **Fan-in**: multiple sources feed into one consumer (aggregation/merge)
- "SNS + SQS pattern?" → SNS topic → fans out to multiple SQS queues. Each queue has its own consumer. Combines fan-out (SNS) with reliable consumption (SQS). Most common AWS pattern

🔥 **Most Asked**: Pub-sub vs point-to-point, fan-out pattern, SNS+SQS
🧠 **Strategy**: "Pub-Sub for events (notify everyone). Queue for tasks (one consumer processes each task)"

---

## 98. Event Streaming

### Q: What is event streaming and how does it enable event-driven architecture?

**Answer (Interview-Ready):**
- **Event streaming** = continuously producing and consuming a stream of events (facts about what happened) rather than sending commands or requests

**Event vs Command vs Query:**
| Type | Intent | Example |
|------|--------|---------|
| **Event** | "This happened" (fact, past tense) | `OrderPlaced`, `UserSignedUp` |
| **Command** | "Do this" (imperative) | `ProcessPayment`, `SendEmail` |
| **Query** | "Give me this" (read) | `GetUserProfile`, `ListOrders` |

**Event-driven architecture patterns:**

| Pattern | Description |
|---------|-----------|
| **Event Notification** | Service publishes event. Others react. Minimal data in event → receivers query source if needed |
| **Event-Carried State Transfer** | Event contains ALL relevant data. Receivers don't need to query source. Enables full decoupling |
| **Event Sourcing** | Store events as the source of truth (not current state). Derive current state by replaying events. Full audit trail |
| **CQRS + Event Sourcing** | Separate write model (events) from read model (materialized views). Events project into optimized read models |

**Event sourcing example (bank account):**
```
Events:  AccountCreated(balance=0) → Deposited(100) → Withdrawn(30) → Deposited(50)
State:   balance = 0 + 100 - 30 + 50 = $120

// Replay from any point. Full history. Auditable.
```

🔥 **Most Asked**: Event sourcing concepts, event vs command, CQRS connection
🧠 **Strategy**: "Event-driven for loose coupling. Event sourcing only when you need full auditability (finance, compliance)"

---

## 99. At-Most-Once vs At-Least-Once vs Exactly-Once

### Q: What are the message delivery guarantees and how do you achieve each?

**Answer (Interview-Ready):**

| Guarantee | How | Risk | Use Case |
|-----------|-----|------|----------|
| **At-most-once** | Fire and forget. No retries. No ACK | Message may be lost | Metrics, logs (loss tolerable) |
| **At-least-once** | Retry until ACK received. May deliver duplicates | Duplicates | Most systems (with idempotent consumers) |
| **Exactly-once** | Deduplicate or use transactional processing | Complex, expensive | Financial transactions, billing |

**How each works:**
- **At-most-once**: Send message → don't wait for ACK → move on. If it fails, lost forever
- **At-least-once**: Send message → wait for consumer ACK → if no ACK, resend. Consumer may process twice. Consumer MUST be idempotent
- **Exactly-once**: Two approaches:
  1. **Idempotent consumer** (most practical): At-least-once delivery + consumer deduplicates using message ID
  2. **Transactional outbox**: Write to DB and outbox in one transaction. Consumer uses dedup table

**Kafka's exactly-once:**
- `enable.idempotence=true` on producer (prevents duplicate writes to partition)
- Transactional producer: atomic writes across multiple partitions
- Consumer: `read_committed` isolation level
- EOS (Exactly-Once Semantics) for Kafka Streams processing

**The practical truth:** True exactly-once across distributed systems is nearly impossible. The industry standard is **at-least-once + idempotent consumers**

🔥 **Most Asked**: Three guarantees, why exactly-once is hard, practical solution
⚠️ **Common Mistakes**: Claiming exactly-once is easy; not making consumers idempotent
🧠 **Strategy**: "At-least-once + idempotent consumers is the industry standard. True exactly-once only within Kafka Streams or transactional processing"

---

## 100. Ordering Guarantees

### Q: How do you maintain message ordering in distributed messaging systems?

**Answer (Interview-Ready):**

**Ordering challenges:**
- Multiple producers → interleaved messages
- Multiple partitions → parallel processing → no global order
- Retries → out-of-order delivery
- Consumer failures → reprocessing from different offset

**Kafka ordering:**
- **Within a partition**: Totally ordered (guaranteed by append-only log)
- **Across partitions**: No ordering guarantee
- **Key-based ordering**: Same partition key → same partition → ordered
  ```
  // All events for user "123" go to same partition → ordered
  producer.send("order-events", key="user:123", value=event)
  ```

**SQS ordering:**
- **Standard SQS**: Best-effort ordering (not guaranteed)
- **SQS FIFO**: Guaranteed ordering within a Message Group ID. Max 300 msg/sec (3000 with batching)

**Strategies for ordering requirements:**
| Need | Solution |
|------|---------|
| Order per entity (user, order) | Partition by entity ID |
| Global ordering | Single partition (kills parallelism — avoid) |
| Ordered processing | Single consumer per partition |
| Idempotent reprocessing | Sequence numbers + deduplication |

**Follow-ups:**
- "What if you need global ordering at scale?" → You don't, usually. Rethink the problem. Most systems only need per-entity ordering. If truly needed → single partition → but this is a bottleneck
- "Ordering with retries?" → If a message fails and is retried, later messages may have already been processed → out of order. Solution: Set `max.in.flight.requests.per.connection=1` in Kafka (sacrifices throughput)

🔥 **Most Asked**: Partition-based ordering, key selection, ordering vs parallelism trade-off
🧠 **Strategy**: "Most systems need per-entity ordering, not global ordering. Partition by entity ID"

---

## 101. Idempotency

### Q: What is idempotency and why is it critical in distributed systems?

**Answer (Interview-Ready):**
- **Idempotent operation** = can be applied multiple times without changing the result beyond the first application
- Critical because in distributed systems, messages/requests WILL be duplicated (retries, at-least-once delivery)

**Examples:**
| Operation | Idempotent? | Fix |
|-----------|-------------|-----|
| `SET balance = 100` | ✅ Yes | Same result every time |
| `SET balance = balance + 10` | ❌ No | Increments on every retry |
| `DELETE item WHERE id = 5` | ✅ Yes | First deletes, subsequent are no-ops |
| `INSERT INTO orders (...)` | ❌ No | Creates duplicate rows |

**Making operations idempotent:**

| Technique | How |
|-----------|-----|
| **Idempotency key** | Client sends unique key. Server checks if key was already processed. If yes → return cached result |
| **Database unique constraint** | `INSERT ... ON CONFLICT DO NOTHING` |
| **Deduplication table** | Store processed message IDs. Check before processing |
| **Version/ETag** | Only update if version matches. Concurrent updates rejected |
| **Absolute values** | `SET balance = 100` instead of `INCREMENT balance BY 10` |

**Idempotency key pattern (API):**
```
POST /payments
Idempotency-Key: abc-123-unique

Server:
1. Check idempotency store: has "abc-123-unique" been processed?
2. Yes → return stored response (no-op)
3. No → process payment → store result keyed by "abc-123-unique" → return response
```

🔥 **Most Asked**: Why idempotency matters, techniques, idempotency key pattern
🧠 **Strategy**: "Every API endpoint should be idempotent. Use idempotency keys for non-naturally-idempotent operations like payments"

---

## 102. Dead Letter Queues

### Q: What is a Dead Letter Queue and how do you handle failed messages?

**Answer (Interview-Ready):**
- **DLQ** = queue where messages that can't be processed are sent after exceeding retry attempts
- Instead of infinite retry (blocking the queue) or silent drop (data loss), failed messages land in DLQ for investigation

**Flow:**
```
Main Queue → Consumer processes → 
  Success? → ACK, remove from queue
  Failure? → Retry (3 attempts) → 
    Still failing? → Move to Dead Letter Queue
    
DLQ → Alert team → Investigate → Fix → Replay back to main queue
```

**Configuration (SQS example):**
```json
{
  "RedrivePolicy": {
    "deadLetterTargetArn": "arn:aws:sqs:us-east-1:123:my-dlq",
    "maxReceiveCount": 3
  }
}
```

**What to do with DLQ messages:**
1. **Alert**: Set up monitoring on DLQ depth. Any message in DLQ = something is wrong
2. **Investigate**: Look at message content, error logs, identify root cause
3. **Fix**: Deploy fix for the bug that caused processing failure
4. **Replay**: Re-drive DLQ messages back to main queue for reprocessing
5. **Archive**: For unrecoverable messages, archive with metadata for audit

**Kafka DLQ pattern** (no built-in DLQ):
```
Main topic → Consumer → 
  Failure after N retries → Publish to "topic.DLQ" → 
  DLQ consumer stores/alerts/retries with delay
```

🔥 **Most Asked**: What DLQ solves, retry strategy, replaying messages
🧠 **Strategy**: "DLQ is non-negotiable for any message-driven system. Zero tolerance for silently dropped messages"

---
---

# Part B — Distributed Systems

## 103. Distributed Systems Fundamentals

### Q: What are the fundamental challenges of distributed systems?

**Answer (Interview-Ready):**
- A **distributed system** = multiple computers working together to appear as a single coherent system to the end user

**The 8 Fallacies of Distributed Computing** (Peter Deutsch):
1. The network is reliable → **It's not** (packets drop, connections timeout)
2. Latency is zero → **It's not** (cross-region: 50-200ms)
3. Bandwidth is infinite → **It's not** (especially mobile)
4. The network is secure → **It's not** (encryption, auth needed)
5. Topology doesn't change → **It does** (nodes come and go)
6. There is one administrator → **There isn't** (different teams/orgs)
7. Transport cost is zero → **It's not** (serialization, bandwidth cost)
8. The network is homogeneous → **It's not** (different hardware, clouds)

**Core challenges:**
| Challenge | Description | Solution |
|-----------|-----------|---------|
| **Partial failure** | Some nodes fail while others work | Retry, circuit breaker, graceful degradation |
| **Network partition** | Nodes can't communicate | CAP theorem trade-offs |
| **Ordering** | No global clock → events hard to order | Vector clocks, Lamport timestamps |
| **Consistency** | Multiple copies of data → which is the truth? | Consensus (Raft), eventual consistency |
| **Coordination** | Agreeing on leader, locks, configuration | Zookeeper, etcd, Consul |

**Follow-ups:**
- "Lamport timestamps?" → Logical clock: each event increments counter. On message receive, take max(local, received) + 1. Establishes "happened-before" relationship. Doesn't capture real time but captures causality
- "Two Generals Problem?" → Fundamental impossibility: two parties can never be 100% certain they agree over an unreliable network. Relates to why distributed consensus needs multiple rounds

🔥 **Most Asked**: Fallacies, partial failure, consistency challenges
🧠 **Strategy**: Start with "distributed systems have three fundamental problems: partial failure, no global clock, and network unreliability"

---

## 104. Leader Election (Distributed Systems Context)

### Q: Why do distributed systems need leader election and how is it implemented?

**Answer (Interview-Ready):**
- **Leader election** = process of choosing exactly one node as the coordinator/leader in a distributed system
- Needed for: database primary, Kafka partition leader, distributed lock coordinator, task scheduler

**Implementation approaches:**

| Method | How | Used By |
|--------|-----|---------|
| **Raft** | Term-based election. Candidate requests votes. Majority = leader | etcd, CockroachDB, Consul |
| **Zookeeper ephemeral znodes** | Create ephemeral sequential znode. Lowest sequence = leader. Watch predecessor | Old Kafka, HBase |
| **Bully algorithm** | Highest-numbered node wins. On failure, next highest takes over | Simple systems |
| **Lease-based** | Acquire distributed lock with TTL. Lock holder = leader. Must renew | DynamoDB, application-level |

**Failure scenarios:**
- **Leader crash**: Followers detect via heartbeat timeout → trigger new election → new leader
- **Network partition**: Old leader isolated. New leader elected on majority side. Old leader must step down (fencing token)
- **Split brain**: Two leaders simultaneously due to partition. Prevention: quorum (majority required), fencing tokens

**Follow-ups:**
- "Pre-emptive vs non-pre-emptive?" → Raft: non-pre-emptive (leader stays until failure). Bully: pre-emptive (higher-ID node takes over). Non-pre-emptive is more stable (fewer elections)
- "How long does failover take?" → Depends on heartbeat interval + election timeout. Typically 5-30 seconds for etcd/Raft. Can be tuned faster at the risk of false elections

🔥 **Most Asked**: Raft election, fencing tokens, split brain prevention
🧠 **Strategy**: Already covered in depth in file 02 (topic 89). In system design, just say "leader election via Raft/etcd"

---

## 105. Distributed Locks

### Q: How do distributed locks work and what are the pitfalls?

**Answer (Interview-Ready):**
- **Distributed lock** = mutual exclusion across multiple processes/servers. Ensures only one process accesses a shared resource at a time

**Implementation options:**

| Approach | How | Trade-offs |
|----------|-----|-----------|
| **Redis (SET NX EX)** | `SET lock:resource value NX EX 30` — atomic set-if-not-exists with TTL | Simple but single Redis = SPOF |
| **Redlock** (Martin Kleppmann critique) | Acquire lock on N/2+1 Redis nodes | Questioned safety under partial failures |
| **Zookeeper** | Ephemeral sequential znode. Lowest = lock holder. Others watch predecessor | Strong guarantees but complex |
| **etcd** | Distributed lock via lease API + revisions | Strong consistency (Raft-based) |
| **Database** | `SELECT FOR UPDATE` or advisory locks | Simple but slow, DB contention |

**Redis lock pattern:**
```
# Acquire
SET lock:order:123 "worker-id" NX EX 30  # Set if not exists, 30s TTL

# Release (only if you hold the lock — Lua script for atomicity)
if redis.call("get", "lock:order:123") == "worker-id" then
    return redis.call("del", "lock:order:123")
end
```

**Pitfalls:**
- **GC pause**: Process acquires lock → long GC pause → lock expires → another process acquires → original process resumes and thinks it still holds the lock
- **Solution**: Fencing tokens. Lock service issues monotonically increasing token. Resources check token: reject requests with old tokens

**Martin Kleppmann's critique of Redlock:**
- Clock skew between Redis nodes can compromise Redlock
- For safety-critical locks: use a consensus system (Zookeeper/etcd) with fencing tokens
- For efficiency-only locks (deduplication): Redis single-node is fine

🔥 **Most Asked**: Redis lock implementation, fencing tokens, Redlock controversy
⚠️ **Common Mistakes**: Not using TTL (lock held forever on crash); not using fencing tokens
🧠 **Strategy**: "For correctness: Zookeeper/etcd with fencing tokens. For efficiency (best effort): Redis with TTL"

---

## 106. Heartbeats

### Q: How do heartbeats work in distributed systems?

**Answer (Interview-Ready):**
- **Heartbeat** = periodic signal sent by a node to indicate it's alive. If heartbeats stop, the node is presumed dead

**Patterns:**
| Pattern | How | Example |
|---------|-----|---------|
| **Push heartbeat** | Node periodically sends "I'm alive" to coordinator | Worker → Scheduler every 5s |
| **Pull heartbeat** | Coordinator periodically pings node | Load balancer → health check endpoint |
| **Gossip** | Node randomly contacts peers, shares state | Cassandra gossip protocol |

**Key parameters:**
- **Interval**: How often (e.g., every 5 seconds)
- **Timeout**: How long before declaring dead (e.g., 3 missed heartbeats = 15 seconds)
- **Trade-off**: Short interval → fast detection but more false positives (network blip ≠ failure). Long interval → slower detection but fewer false alarms

**Use cases:**
- Cluster membership (who's alive?)
- Leader election (leader missed heartbeats → trigger election)
- Load balancer health checks (remove unhealthy server)
- Session keep-alive (WebSocket / long-lived connections)

**Follow-ups:**
- "Phi Accrual Failure Detector?" → Instead of binary (alive/dead), calculate a suspicion level φ (phi). Higher φ = more likely dead. Adjusts threshold dynamically based on historical heartbeat timing. Used by Akka, Cassandra
- "What about network partitions?" → Node may be alive but unreachable. Heartbeats can't distinguish between node failure and network partition. That's why quorum-based decisions are important

🔥 **Most Asked**: Heartbeat interval/timeout trade-off, false positives, use cases
🧠 **Strategy**: "Heartbeats for failure detection. The interval/timeout trade-off is the key design decision"

---

## 107. Clock Skew & Time Synchronization

### Q: Why are clocks problematic in distributed systems?

**Answer (Interview-Ready):**
- **Problem**: Every machine has its own clock. Clocks drift. No two machines have exactly the same time
- NTP (Network Time Protocol) synchronizes clocks but only to ~1-10ms accuracy. Can jump forward or backward!

**Why it matters:**
- **Ordering events**: "Did event A happen before event B?" → Can't reliably answer with wall clocks alone
- **Last-Write-Wins**: If using timestamps → clock skew means wrong write might "win"
- **TTL/Lease expiry**: If clock is ahead → expires too early. If behind → expires too late
- **Two-Phase Commit**: Coordinator and participants must agree on timeouts

**Solutions:**

| Solution | How | Used By |
|----------|-----|---------|
| **Logical clocks (Lamport)** | Counter-based. Only provides "happened-before" ordering | Academic, some systems |
| **Vector clocks** | Per-node counters. Detects concurrent events | Riak, Dynamo |
| **Hybrid Logical Clock** | Physical time + logical counter | CockroachDB |
| **TrueTime** | GPS + atomic clocks. Bounded uncertainty interval | Google Spanner |

**Google Spanner's TrueTime:**
- Every Google server has GPS receiver + atomic clock
- `TrueTime.now()` returns `[earliest, latest]` — a bounded interval
- For linearizability: wait out the uncertainty interval before confirming commits
- Typical uncertainty: ~7ms. Wait that long → guaranteed order

**Follow-ups:**
- "NTP clock jumps?" → NTP can jump clock forward/backward (step adjustment) or speed up/slow down (slew adjustment). Software using `System.currentTimeMillis()` may see time go backward! Use monotonic clocks (`System.nanoTime()`) for measuring durations
- "Monotonic clock vs wall clock?" → **Wall clock**: time of day. Can jump. For display. **Monotonic clock**: only goes forward. For measuring elapsed time. ALWAYS use monotonic for timeouts/performance

🔥 **Most Asked**: Why wall clocks are unreliable, logical clocks, TrueTime
🧠 **Strategy**: "Never depend on wall-clock ordering in distributed systems. Use logical clocks, vector clocks, or TrueTime"

---

## 108. Consensus Basics

### Q: What is distributed consensus and why is it hard?

**Answer (Interview-Ready):**
- **Consensus** = getting multiple nodes to agree on a single value (or sequence of values) despite failures
- Fundamental to: leader election, distributed transactions, log replication, configuration management

**FLP Impossibility Theorem:**
- In an asynchronous distributed system, it's impossible to guarantee consensus if even one node can crash
- In practice: we use timeouts to detect failures (making the system partially synchronous) → consensus becomes possible

**Consensus algorithms comparison:**
| Algorithm | Fault Tolerance | Complexity | Used By |
|-----------|----------------|------------|---------|
| **Paxos** | Crash faults (f < N/2) | Very complex | Google Chubby, Azure |
| **Raft** | Crash faults (f < N/2) | Simpler than Paxos | etcd, CockroachDB |
| **Zab** | Crash faults (f < N/2) | Similar to Raft | Zookeeper |
| **PBFT** | Byzantine faults (f < N/3) | Very complex | Blockchain, Hyperledger |

**Raft simplified (3 phases):**
1. **Leader election**: Candidate node requests votes → majority = leader
2. **Log replication**: Leader appends entries → replicates to followers → majority ACK = committed
3. **Safety**: Only nodes with complete logs can become leader → committed entries never lost

**When you need consensus:**
- Electing a leader (who's in charge?)
- Distributed lock (who holds the lock?)
- Atomic broadcast (all nodes process events in same order)
- Distributed transactions (commit or abort?)

🔥 **Most Asked**: Raft basics, quorum concept, FLP impossibility, when consensus is needed
🧠 **Strategy**: "Use etcd/Zookeeper (which implement Raft/Zab) rather than implementing consensus yourself. It's one of the hardest problems in CS"

---
---

# Part C — Resilience & Fault Tolerance

## 109. Single Point of Failure

### Q: What is a single point of failure and how do you eliminate it?

**Answer (Interview-Ready):**
- **SPOF** = any component whose failure brings down the entire system
- Design principle: **No single point of failure in production systems**

**Common SPOFs and solutions:**

| SPOF | Solution |
|------|---------|
| Single database server | Primary + replica(s) with automatic failover |
| Single load balancer | Active-passive LB pair (keepalived/VRRP) or cloud LB (inherently HA) |
| Single data center | Multi-AZ or multi-region deployment |
| Single DNS | Multiple DNS providers (Route53 + Cloudflare) |
| Single cache node | Redis Cluster or Redis Sentinel |
| Single message broker | Kafka cluster (3+ brokers), RabbitMQ cluster |
| Single application server | Multiple instances behind load balancer |
| Single configuration store | etcd cluster (3+ nodes) |

**How to identify SPOFs:**
1. Draw architecture diagram with all components
2. For each component, ask: "What happens if this fails?"
3. If answer is "system goes down" → SPOF → add redundancy
4. Don't forget: DNS, certificates, secrets management, CI/CD pipeline

🔥 **Most Asked**: How to identify SPOFs, common ones, solutions
🧠 **Strategy**: "In every system design interview, explicitly call out potential SPOFs and how you'd eliminate them"

---

## 110. Redundancy

### Q: What are the types of redundancy and how do you implement them?

**Answer (Interview-Ready):**

| Type | How | Example |
|------|-----|---------|
| **Active-Active** | All instances handle traffic simultaneously | 3 app servers behind LB, all serving |
| **Active-Passive** | Standby takes over when primary fails | DB primary + warm standby |
| **N+1** | N active + 1 spare. Spare activates on any failure | Server farm with one extra |
| **Geographic** | Deploy across regions/data centers | US-East + EU-West deployments |
| **Data redundancy** | Multiple copies of data | RAID disks, S3 (3+ AZ copies), DB replicas |

**Redundancy at each layer:**
```
DNS:        Multiple providers (Route53 + Cloudflare)
CDN:        Multiple PoPs globally (CloudFront)
LB:         Active-passive pair or cloud-managed HA
App:        3+ instances across AZs
Cache:      Redis Cluster (3 masters + 3 replicas)
Database:   Primary + 2 replicas across AZs
Storage:    S3 (11 nines durability, 3+ AZ)
Queue:      Kafka (3+ brokers, replication factor 3)
```

**Cost of redundancy:**
- 2x-3x infrastructure cost
- Operational complexity (managing failover, replication lag, split brain)
- Trade-off: Pay for redundancy upfront or pay for downtime/data loss later

🔥 **Most Asked**: Active-active vs active-passive, redundancy per layer
🧠 **Strategy**: "Design for N+1 redundancy at minimum. Active-active for critical services. Have a clear failover plan"

---

## 111. Retry Strategies

### Q: How should you design retry strategies for failed operations?

**Answer (Interview-Ready):**

**Retry decision tree:**
```
Is the error transient (network blip, timeout)?
  → Yes: Retry with backoff
Is the error permanent (400, 404, validation error)?
  → Yes: Don't retry. Fail immediately
Is the operation idempotent?
  → No: Be very careful with retries (risk of duplicates)
```

**Retry strategies:**

| Strategy | Delay Pattern | Use Case |
|----------|-------------|----------|
| **Immediate retry** | 0, 0, 0 | Optimistic — might work instantly |
| **Fixed delay** | 1s, 1s, 1s | Simple, predictable |
| **Exponential backoff** | 1s, 2s, 4s, 8s, 16s | Prevent overwhelming a recovering service |
| **Exponential + jitter** | 1.2s, 2.7s, 3.8s, 9.1s | Prevent thundering herd from synchronized retries |

**Implementation:**
```java
int maxRetries = 3;
for (int attempt = 0; attempt < maxRetries; attempt++) {
    try {
        return callService();
    } catch (TransientException e) {
        if (attempt == maxRetries - 1) throw e;
        long delay = (long) Math.pow(2, attempt) * 1000;
        long jitter = (long) (Math.random() * delay * 0.3); // 30% jitter
        Thread.sleep(delay + jitter);
    }
}
```

**What NOT to retry:**
- 400 Bad Request (client error — won't change on retry)
- 401/403 (auth issues)
- 404 (resource genuinely doesn't exist)
- 409 Conflict (without updating the request)
- Any non-idempotent operation without idempotency key

🔥 **Most Asked**: Exponential backoff with jitter, what to retry vs not, idempotency requirement
🧠 **Strategy**: "Always use exponential backoff with jitter. Always check idempotency before enabling retries"

---

## 112. Exponential Backoff

### Q: How does exponential backoff with jitter work and why is jitter critical?

**Answer (Interview-Ready):**
- **Exponential backoff**: Wait time doubles after each retry: 1s → 2s → 4s → 8s → 16s
- **Jitter**: Random variation added to each delay to prevent synchronized retries

**Why jitter matters:**
- Without jitter: 1000 clients fail simultaneously → all retry at 1s → all hit server → all fail → all retry at 2s → thundering herd
- With jitter: 1000 clients retry at random times within the backoff window → load is spread → server recovers

**Jitter strategies:**

| Strategy | Formula | Spread |
|----------|---------|--------|
| **Full jitter** | `random(0, base * 2^attempt)` | Maximum spread, best for high contention |
| **Equal jitter** | `base * 2^attempt / 2 + random(0, base * 2^attempt / 2)` | Some spread but guaranteed minimum delay |
| **Decorrelated jitter** | `min(cap, random(base, prev_delay * 3))` | Good spread, used by AWS SDK |

**AWS recommendation (decorrelated jitter):**
```python
sleep = min(cap, random.uniform(base, sleep * 3))
# base = 1s, cap = 60s
# Attempt 1: random(1, 3)   → ~2s
# Attempt 2: random(1, 6)   → ~3.5s  
# Attempt 3: random(1, 10.5) → ~5.75s
# ... up to cap of 60s
```

**Follow-ups:**
- "When to stop retrying?" → Set max_retries (typically 3-5) or max_total_time (e.g., 30s). Beyond that → fail fast and return error to caller
- "Retry budget?" → Limit total retries across all requests. E.g., retry at most 10% of requests. Prevents entire system from retrying when service is fully down

🔥 **Most Asked**: Why jitter, full vs decorrelated jitter, retry budget concept
🧠 **Strategy**: "Exponential backoff + full jitter + max retries + retry budget = robust retry strategy"

---

## 113. Timeouts

### Q: How do you design timeout strategies for distributed services?

**Answer (Interview-Ready):**
- **Without timeouts**: A slow downstream service can hang your threads indefinitely → thread pool exhaustion → cascading failure

**Types of timeouts:**

| Type | What | Example |
|------|------|---------|
| **Connection timeout** | Max time to establish TCP connection | 1-5 seconds |
| **Read/Response timeout** | Max time to wait for response after sending request | 5-30 seconds |
| **Idle timeout** | Close connection if no data for this long | 30-60 seconds |
| **Overall/Request timeout** | Total time including retries | 30-60 seconds |

**Timeout design guidelines:**
- **Connection timeout < Read timeout**: Establishing connection should be fast. Processing may take longer
- **Downstream timeout < Upstream timeout**: If Service A (30s timeout) calls Service B (60s timeout) → A times out waiting for B → orphaned request on B still running
- **Include retries in overall timeout**: 3 retries × 10s timeout = 30s max. Overall timeout should be ~30s, not 10s per attempt

**Timeout anti-patterns:**
- No timeout at all → thread hangs forever
- Timeout too long → resources held unnecessarily, poor UX
- Timeout too short → legitimate slow responses treated as failures
- Not propagating deadlines → downstream doesn't know caller has given up

**Deadline propagation:**
```
Client sets deadline: 5 seconds from now
  → Service A receives, has 5s remaining. Calls B with deadline = 4.5s
    → Service B receives, has 4.5s remaining. Calls DB with deadline = 4s
      → DB query must complete in 4s or be cancelled
```
gRPC has built-in deadline propagation. For HTTP: use custom header `X-Request-Deadline`

🔥 **Most Asked**: Timeout types, cascading timeout design, deadline propagation
🧠 **Strategy**: "Set timeouts on EVERY outbound call. Propagate deadlines. Downstream timeout < upstream timeout"

---

## 114. Circuit Breaker Pattern

### Q: How does the circuit breaker pattern prevent cascading failures?

**Answer (Interview-Ready):**
- **Circuit breaker** = proxy that monitors calls to a service. If failures exceed threshold → stops sending requests → fails fast → gives downstream time to recover

**States:**
```
CLOSED (normal) → failure rate > threshold → OPEN (rejecting)
                                                    ↓ (after timeout)
                                              HALF-OPEN (testing)
                                                    ↓
                                        test succeeds → CLOSED
                                        test fails → OPEN
```

| State | Behavior |
|-------|----------|
| **Closed** | Normal operation. Track success/failure rate |
| **Open** | All requests immediately rejected (fail fast). Don't even try calling the service |
| **Half-Open** | Allow limited requests through to test if service recovered. Success → Closed. Failure → Open again |

**Configuration:**
| Parameter | Typical Value |
|-----------|--------------|
| Failure threshold | 50% failure rate |
| Evaluation window | Last 10 requests or last 30 seconds |
| Open state duration | 30-60 seconds |
| Half-open test requests | 1-3 |

**Implementation (conceptual):**
```java
if (circuitBreaker.isOpen()) {
    return fallback();  // Don't even try
}
try {
    result = callDownstreamService();
    circuitBreaker.recordSuccess();
    return result;
} catch (Exception e) {
    circuitBreaker.recordFailure();
    if (circuitBreaker.shouldTrip()) {
        circuitBreaker.open();
    }
    return fallback();
}
```

**Libraries:** Resilience4j (Java), Polly (.NET), opossum (Node.js), Hystrix (Netflix, deprecated → use Resilience4j)

🔥 **Most Asked**: Three states, configuration, fallback strategies
🧠 **Strategy**: "Circuit breaker + retry + timeout = the resilience trifecta. Always mention all three together"

---

## 115. Bulkheads

### Q: What is the bulkhead pattern and how does it prevent cascading failures?

**Answer (Interview-Ready):**
- **Bulkhead** (from ship design) = isolate components so that failure in one doesn't sink the entire system
- If one service call is slow → only its dedicated resource pool is affected, not the entire application

**Types:**

| Type | How | Example |
|------|-----|---------|
| **Thread pool isolation** | Separate thread pool per downstream service | Payment service gets 20 threads, inventory gets 10 |
| **Semaphore isolation** | Limit concurrent calls per service | Max 50 concurrent requests to recommendation service |
| **Process isolation** | Separate processes per workload | Critical path in one container, batch jobs in another |
| **Infrastructure isolation** | Separate infra per tenant/feature | Premium customers on dedicated instances |

**Without bulkhead:**
```
Shared thread pool (100 threads):
  - Service A call hangs → blocks 80 threads
  - Service B, C, D can't get threads → entire app unresponsive
```

**With bulkhead:**
```
Service A pool (30 threads):  blocked → only A affected
Service B pool (30 threads):  working fine ✅
Service C pool (20 threads):  working fine ✅
Shared pool (20 threads):     for everything else ✅
```

**Follow-ups:**
- "Bulkhead + Circuit Breaker?" → Complementary. Bulkhead limits blast radius. Circuit breaker stops calling failed service. Together: bulkhead prevents thread exhaustion while circuit breaker prevents wasted calls
- "How to size pools?" → Based on downstream service SLA. If Service A takes 200ms and you need 100 RPS → need 20 concurrent threads (100 × 0.2). Add buffer for spikes

🔥 **Most Asked**: Why isolation matters, thread pool vs semaphore, combined with circuit breaker
🧠 **Strategy**: "Bulkhead = damage containment. Circuit breaker = damage prevention. Use both"

---

## 116. Graceful Degradation

### Q: How do you design systems to degrade gracefully under failure?

**Answer (Interview-Ready):**
- **Graceful degradation** = when a component fails, the system continues with reduced functionality rather than complete failure

**Examples:**

| Service Down | Graceful Degradation |
|-------------|---------------------|
| Recommendation engine | Show popular/trending items instead of personalized |
| Search service | Show cached results or category browsing |
| Real-time pricing | Show last known price with "prices may vary" note |
| Payment service | Queue order, process when service recovers |
| Image CDN | Show placeholder images, load later |
| Analytics service | Drop metrics silently (don't block user flow) |

**Implementation patterns:**
1. **Fallback**: Use cached/default data when service fails
2. **Feature flags**: Disable non-critical features under load
3. **Load shedding**: Drop low-priority requests to preserve high-priority ones
4. **Timeout + fallback**: Fast fail → return cached/default response
5. **Queue and process later**: Accept request, process asynchronously when capacity allows

**Load shedding priority:**
```
Priority 1 (NEVER shed): Authentication, checkout, payment
Priority 2 (shed under extreme load): Search, recommendations
Priority 3 (shed first): Analytics, telemetry, non-critical background jobs
```

🔥 **Most Asked**: Real-world degradation examples, load shedding priority, fallback patterns
🧠 **Strategy**: "Identify critical vs nice-to-have features upfront. Define fallback behavior for each non-critical dependency"

---

## 117. Disaster Recovery

### Q: How do you design a disaster recovery strategy for critical systems?

**Answer (Interview-Ready):**

**Key metrics:**
| Metric | Meaning | Example |
|--------|---------|---------|
| **RTO** (Recovery Time Objective) | Max acceptable downtime | RTO = 1 hour → must recover within 1 hour |
| **RPO** (Recovery Point Objective) | Max acceptable data loss | RPO = 5 minutes → can lose at most 5 min of data |

**DR strategies (cost vs recovery speed):**

| Strategy | RTO | RPO | Cost | How |
|----------|-----|-----|------|-----|
| **Backup & Restore** | Hours | Hours | Lowest | Regular backups to S3. Restore on demand |
| **Pilot Light** | Minutes-Hours | Minutes | Low | Core infra running (DB replica). Scale up on failover |
| **Warm Standby** | Minutes | Seconds-Minutes | Medium | Scaled-down copy running. Scale up on failover |
| **Multi-Site Active-Active** | Near-zero | Near-zero | Highest | Full copy in 2+ regions. Traffic active everywhere |

**AWS DR setup:**
```
Primary (us-east-1):    Full stack, all traffic
DR (us-west-2):         
  - Pilot Light: RDS read replica, infra templates ready
  - Warm Standby: Smaller ECS cluster running, RDS replica
  - Active-Active: Full stack, Route53 latency routing
```

**DR runbook essentials:**
1. Detection: Automated health checks + alerts
2. Declaration: Who declares disaster? (On-call lead, VP Engineering)
3. Failover: Automated or semi-automated (DNS switch, promote replica)
4. Communication: Status page, stakeholder notification
5. Recovery: Bring primary back, verify data integrity, failback
6. Post-mortem: What happened, how to prevent, improve

🔥 **Most Asked**: RTO/RPO definitions, DR strategies comparison, AWS multi-region
🧠 **Strategy**: "Know the four DR strategies by cost/speed trade-off. Always state RTO and RPO requirements first"

---

## 118. Chaos Engineering

### Q: What is chaos engineering and how do you practice it?

**Answer (Interview-Ready):**
- **Chaos engineering** = deliberately injecting failures into production to discover weaknesses before they cause outages
- Pioneered by Netflix (Chaos Monkey, 2011)

**Principles (Principles of Chaos Engineering):**
1. Start with a hypothesis: "The system can handle X node dying"
2. Run experiment in production (or production-like environment)
3. Minimize blast radius (start small)
4. Automate and run continuously
5. Learn and fix weaknesses discovered

**Netflix Simian Army:**
| Tool | What it does |
|------|-------------|
| **Chaos Monkey** | Randomly kills instances in production |
| **Latency Monkey** | Injects network latency |
| **Chaos Kong** | Simulates entire region failure |
| **Conformity Monkey** | Finds instances not following best practices |

**Common failure injections:**

| Failure | How to Inject | Tests |
|---------|--------------|-------|
| Instance death | Kill random EC2/pod | Auto-scaling, health checks, failover |
| Network latency | tc netem (Linux traffic control) | Timeout handling, circuit breakers |
| Network partition | iptables rules between services | Split brain handling, data consistency |
| Disk full | dd if=/dev/zero of=bigfile | Alerting, graceful handling |
| DNS failure | Block DNS resolution | Fallback behavior, caching |
| Dependency failure | Kill downstream service | Circuit breaker, graceful degradation |

**Tools:** Gremlin (managed platform), LitmusChaos (Kubernetes-native), Chaos Mesh (k8s), AWS Fault Injection Simulator

**Follow-ups:**
- "Should you do this in production?" → Ideally yes (that's where real dependencies are). Start in staging. Graduate to production with very small blast radius. Netflix does it continuously in production
- "GameDay?" → Planned chaos exercise. Team gathers, injects failures, observes response. Find runbook gaps, monitoring blind spots. Run quarterly minimum

🔥 **Most Asked**: Netflix Chaos Monkey, what failures to inject, production vs staging
🧠 **Strategy**: "Chaos engineering is proactive reliability. Test your failure handling before customers do"

---
---

# Part D — APIs, Security & Governance

## 119. REST API Design Principles

### Q: What are the best practices for designing a RESTful API?

**Answer (Interview-Ready):**

**Core principles:**
| Principle | Do | Don't |
|-----------|-----|-------|
| **Resources as nouns** | `GET /users/123` | `GET /getUser?id=123` |
| **HTTP methods as verbs** | `DELETE /users/123` | `POST /deleteUser` |
| **Plural resource names** | `/users`, `/orders` | `/user`, `/order` |
| **Nested resources** | `GET /users/123/orders` | `GET /orders?userId=123` (also OK) |
| **Idempotent methods** | GET, PUT, DELETE are idempotent | POST is not idempotent |
| **Stateless** | Each request contains all info needed | Don't rely on server-side session state |

**HTTP status codes to know:**
| Code | When |
|------|------|
| 200 OK | Successful GET, PUT |
| 201 Created | Successful POST (resource created) |
| 204 No Content | Successful DELETE |
| 400 Bad Request | Invalid input |
| 401 Unauthorized | Not authenticated |
| 403 Forbidden | Authenticated but not authorized |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Resource state conflict (duplicate) |
| 429 Too Many Requests | Rate limited |
| 500 Internal Server Error | Server bug |
| 503 Service Unavailable | Server overloaded/maintenance |

**Response format best practices:**
```json
{
  "data": { "id": "123", "name": "Hruday" },
  "meta": { "requestId": "abc-456", "timestamp": "2025-01-01T00:00:00Z" },
  "errors": null
}
```
- Consistent envelope (data, meta, errors)
- Always include request ID for debugging
- Use ISO 8601 for dates
- Use camelCase for JSON keys

🔥 **Most Asked**: Resource naming, HTTP methods, status codes, response format
🧠 **Strategy**: "Follow RESTful conventions. Consistency across endpoints matters more than cleverness"

---

## 120. API Versioning

### Q: How should you version your API and handle breaking changes?

**Answer (Interview-Ready):**

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL path** | `/api/v1/users`, `/api/v2/users` | Simple, clear, cacheable | Long URLs, hard to sunset old versions |
| **Query param** | `/api/users?version=2` | Optional, backward-compatible | Easy to forget, less visible |
| **Header** | `Accept: application/vnd.api+json;version=2` | Clean URLs, content negotiation | Not visible in browser, harder to test |
| **No versioning** | Evolve API backward-compatibly | Simplest, one version to maintain | Not always possible (breaking changes) |

**Best practices:**
- **Prefer backward-compatible changes**: Add optional fields, new endpoints. Don't remove or rename fields
- **URL path versioning** is most common and recommended for external APIs (GitHub, Stripe, Twilio all use it)
- **Support at most 2-3 versions simultaneously**
- **Deprecation timeline**: Announce → sunset warning (6 months) → deprecation (disable with 410 Gone)

**What constitutes a breaking change:**
- Removing a field from response
- Renaming a field
- Changing a field's type (string → number)
- Removing an endpoint
- Changing authentication scheme
- Changing error format

**Non-breaking changes (safe):**
- Adding optional request fields
- Adding response fields
- Adding new endpoints
- Adding new enum values (if clients handle unknown values)

🔥 **Most Asked**: Versioning strategies, what's a breaking change, deprecation process
🧠 **Strategy**: "URL path versioning for external APIs. Backward-compatible evolution preferred over new versions"

---

## 121. Pagination & Filtering

### Q: What are the pagination strategies for APIs and their trade-offs?

**Answer (Interview-Ready):**

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| **Offset-based** | `?page=3&limit=20` (OFFSET 40 LIMIT 20) | Simple, jump to any page | Slow on large offsets, inconsistent with new inserts |
| **Cursor-based** | `?cursor=abc123&limit=20` | Consistent, fast (seeks, not scans), handles inserts | Can't jump to arbitrary page |
| **Keyset** | `?after_id=500&limit=20` (WHERE id > 500 LIMIT 20) | Efficient, uses index | Requires sortable unique column |
| **Time-based** | `?after=2025-01-01T00:00:00Z&limit=20` | Good for feeds/events | Clock precision issues |

**Cursor-based (recommended for most APIs):**
```json
// Response
{
  "data": [...20 items...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTAwfQ==",  // base64-encoded {id: 100}
    "hasMore": true
  }
}
// Next request: GET /items?cursor=eyJpZCI6MTAwfQ==&limit=20
```

**Filtering & sorting:**
```
GET /products?category=electronics&minPrice=100&maxPrice=500&sort=-createdAt&fields=id,name,price
```
- Filter by query params
- Sort with `-` prefix for descending
- Field selection (sparse fieldsets) to reduce response size

**Follow-ups:**
- "Why is OFFSET slow?" → `OFFSET 10000 LIMIT 20` → DB must scan and skip 10,000 rows, then return 20. Gets linearly slower. Cursor-based seeks directly to the cursor position using an index → O(log n)
- "What does Stripe use?" → Cursor-based with `starting_after` and `ending_before` parameters. Industry standard for production APIs

🔥 **Most Asked**: Offset vs cursor trade-offs, why offset is slow, cursor implementation
🧠 **Strategy**: "Cursor-based pagination for any API that could have large result sets. Offset only for admin panels with known small datasets"

---

## 122. Rate Limiting

### Q: How do you implement rate limiting for APIs?

**Answer (Interview-Ready):**
- **Rate limiting** = restrict the number of requests a client can make in a time window. Prevents abuse, ensures fair usage, protects backend from overload

**Algorithms:**

| Algorithm | How | Example |
|-----------|-----|---------|
| **Fixed Window** | Count requests in fixed time windows (e.g., per minute) | 100 req/min. Counter resets at minute boundary |
| **Sliding Window Log** | Track timestamp of each request. Count in rolling window | Precise but memory-heavy (store all timestamps) |
| **Sliding Window Counter** | Weighted average of current + previous window | Good balance of precision and efficiency |
| **Token Bucket** | Tokens added at fixed rate. Each request consumes a token. Allows bursts | 10 tokens/sec, bucket size 100. Can burst 100 then throttled |
| **Leaky Bucket** | Requests enter bucket. Processed at fixed rate. Overflow rejected | Smooths out bursts. Fixed output rate |

**Token Bucket (most common in production):**
```
Bucket capacity = 100
Refill rate = 10 tokens/second
Each request consumes 1 token

Request arrives:
  tokens >= 1? → process request, tokens -= 1
  tokens == 0? → reject with 429 Too Many Requests
```

**Redis implementation (atomic with Lua):**
```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call("INCR", key)
if current == 1 then redis.call("EXPIRE", key, window) end
if current > limit then return 0 end  -- rejected
return 1  -- allowed
```

**Response headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1640995200
Retry-After: 30
```

🔥 **Most Asked**: Token bucket vs sliding window, Redis implementation, response headers
🧠 **Strategy**: "Token bucket for API rate limiting. Redis for distributed rate limiting across multiple app servers"

---

## 123. Authentication vs Authorization

### Q: What is the difference between authentication and authorization?

**Answer (Interview-Ready):**

| Aspect | Authentication (AuthN) | Authorization (AuthZ) |
|--------|----------------------|---------------------|
| **Question** | "Who are you?" | "What can you do?" |
| **Verifies** | Identity | Permissions |
| **How** | Password, token, biometric, certificate | Roles, policies, ACLs |
| **Status code** | 401 Unauthorized | 403 Forbidden |
| **Example** | Login with email + password | Admin can delete users, regular user cannot |

**Authentication methods:**
| Method | How | Use Case |
|--------|-----|----------|
| **Session-based** | Server stores session. Cookie with session ID | Traditional web apps |
| **Token-based (JWT)** | Stateless token with claims. Verified by signature | SPAs, mobile apps, APIs |
| **API Key** | Static key in header/query param | Server-to-server, third-party integrations |
| **OAuth 2.0** | Delegated auth via authorization server | "Login with Google", third-party access |
| **mTLS** | Client certificate authentication | Service-to-service in microservices |
| **Passkeys/WebAuthn** | Public-key cryptography, device-based | Passwordless authentication |

**Authorization models:**
| Model | How | Best For |
|-------|-----|----------|
| **RBAC** (Role-Based) | User → Role → Permissions | Simple apps (admin, editor, viewer) |
| **ABAC** (Attribute-Based) | Rules on user/resource/context attributes | Complex policies (time-of-day, location) |
| **PBAC** (Policy-Based) | Policies define permissions (e.g., OPA/Rego) | Fine-grained, dynamic policies |
| **ReBAC** (Relationship-Based) | Based on resource relationships | Google Zanzibar (Google Docs sharing) |

🔥 **Most Asked**: AuthN vs AuthZ distinction, session vs token, authorization models
🧠 **Strategy**: "Authentication first (who?), then authorization (what?). JWT for stateless, RBAC for simple, ABAC for complex"

---

## 124. OAuth (High Level)

### Q: How does OAuth 2.0 work and what are the main flows?

**Answer (Interview-Ready):**
- **OAuth 2.0** = authorization framework that lets third-party apps access resources on behalf of a user without sharing credentials

**OAuth roles:**
- **Resource Owner**: The user
- **Client**: The app requesting access (e.g., your app)
- **Authorization Server**: Issues tokens (Google, Auth0, Okta)
- **Resource Server**: API protecting resources (Google API)

**Main flows:**

| Flow | For | Security |
|------|-----|----------|
| **Authorization Code** | Server-side web apps | Most secure. Code exchanged on backend |
| **Authorization Code + PKCE** | SPAs, mobile apps | Secure for public clients (no client secret) |
| **Client Credentials** | Machine-to-machine (no user) | Service account tokens |
| **Device Code** | Smart TV, IoT (no browser) | User authorizes on separate device |

**Authorization Code + PKCE flow (recommended for SPAs):**
```
1. App generates code_verifier (random) + code_challenge (SHA256 of verifier)
2. App redirects user → Authorization Server: /authorize?code_challenge=X
3. User logs in, consents
4. Auth Server redirects back → App with authorization_code
5. App sends code + code_verifier to Auth Server → /token
6. Auth Server verifies code_challenge matches → returns access_token + refresh_token
```

**Token types:**
- **Access token**: Short-lived (15min-1hr). Used to access APIs. JWT or opaque
- **Refresh token**: Long-lived (days-months). Used to get new access tokens. Stored securely (HttpOnly cookie or secure storage)
- **ID token** (OpenID Connect): Contains user identity claims. JWT format

🔥 **Most Asked**: Auth Code + PKCE flow, token types, refresh token strategy
🧠 **Strategy**: "OAuth 2.0 + PKCE for SPAs. Never use implicit flow (deprecated). Refresh tokens for persistent sessions"

---

## 125. Secure API Design

### Q: What are the security best practices for API design?

**Answer (Interview-Ready):**

| Category | Practice |
|----------|---------|
| **Authentication** | Use OAuth 2.0 + JWT. Short-lived access tokens (15min). Rotate refresh tokens |
| **Authorization** | Check permissions on every request (not just at login). Use middleware/interceptors |
| **Input validation** | Validate all inputs server-side. Reject unexpected fields. Sanitize strings |
| **Rate limiting** | Protect all endpoints. Stricter limits on auth endpoints (prevent brute force) |
| **HTTPS only** | TLS 1.2+ everywhere. HSTS header. No HTTP fallback |
| **CORS** | Restrict to known origins. Don't use `Access-Control-Allow-Origin: *` with credentials |
| **Request size limits** | Set max body size (e.g., 1MB). Prevent DoS via large payloads |
| **Error handling** | Generic error messages to clients. Never expose stack traces, SQL errors, internal paths |
| **Logging** | Log auth events, errors, rate limit hits. Never log passwords, tokens, PII |
| **Deprecation** | Sunset header + documentation. Don't leave dead endpoints accessible |

**OWASP API Security Top 10 (2023):**
1. Broken Object Level Authorization (BOLA) → Check permissions per resource
2. Broken Authentication → Strong auth, rate limit logins
3. Broken Object Property Level Authorization → Don't return fields user shouldn't see
4. Unrestricted Resource Consumption → Rate limiting, pagination limits
5. Broken Function Level Authorization → Check role per endpoint
6. Server-Side Request Forgery (SSRF) → Validate/whitelist URLs
7. Security Misconfiguration → Review headers, CORS, error handling
8. Lack of Protection from Automated Threats → Bot detection, CAPTCHA
9. Improper Inventory Management → Know all your APIs, deprecate unused
10. Unsafe Consumption of APIs → Validate responses from third-party APIs too

🔥 **Most Asked**: OWASP API Top 10, BOLA, secure error handling
🧠 **Strategy**: "BOLA is the #1 API vulnerability. Always check: does THIS user have access to THIS resource?"

---

## 126. Encryption (At Rest & In Transit)

### Q: How do you implement encryption at rest and in transit?

**Answer (Interview-Ready):**

**Encryption in transit (data moving over network):**
| What | How |
|------|-----|
| **TLS/HTTPS** | Encrypt all HTTP traffic. TLS 1.2 minimum, prefer TLS 1.3 |
| **mTLS** | Both client and server authenticate via certificates. For service-to-service |
| **Certificate management** | Let's Encrypt (free auto-renewal), ACM (AWS), Vault |
| **HSTS** | `Strict-Transport-Security: max-age=31536000` → force HTTPS |

**Encryption at rest (stored data):**
| What | How |
|------|-----|
| **Database** | Transparent Data Encryption (TDE). PostgreSQL: pgcrypto. AWS RDS: encryption enabled |
| **File storage** | S3: SSE-S3, SSE-KMS, SSE-C (customer key). AES-256 |
| **Disk** | AWS EBS encryption. Full disk encryption |
| **Application-level** | Encrypt sensitive fields before storing (PII, credit cards). Column-level encryption |
| **Backups** | Always encrypt backups. Same or stricter than production |

**Key management:**
- **Never hardcode keys** in source code
- Use KMS (AWS KMS, Azure Key Vault, HashiCorp Vault)
- **Envelope encryption**: Data encrypted with DEK (Data Encryption Key). DEK encrypted with KEK (Key Encryption Key) stored in KMS. Reduces KMS calls
- **Key rotation**: Rotate keys periodically (90 days). Re-encrypt data with new key

**Follow-ups:**
- "AES-256 vs RSA?" → AES = symmetric (same key for encrypt/decrypt). Fast. For data encryption. RSA = asymmetric (public + private key). Slow. For key exchange, signatures. TLS uses RSA to exchange AES key, then AES for data
- "Field-level vs disk-level encryption?" → Disk-level: protects against physical theft. Field-level: protects against unauthorized DB access (even DBA can't read encrypted fields without key)

🔥 **Most Asked**: At rest vs in transit, TLS versions, key management, envelope encryption
🧠 **Strategy**: "Encrypt everything in transit (TLS 1.3) and at rest (AES-256 via KMS). Application-level encryption for PII"

---

## 127. Secrets Management

### Q: How do you manage secrets (API keys, passwords, certificates) in production?

**Answer (Interview-Ready):**

**Anti-patterns (NEVER do this):**
- ❌ Hardcoded in source code
- ❌ In config files committed to Git
- ❌ In environment variables in plain text (visible in process table)
- ❌ Shared via Slack/email
- ❌ Same secrets across environments (dev, staging, prod)

**Best practices:**

| Practice | Tool |
|----------|------|
| **Centralized secret store** | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault |
| **Dynamic secrets** | Vault generates short-lived DB credentials on demand |
| **Automatic rotation** | AWS Secrets Manager auto-rotates RDS passwords |
| **Least privilege** | Each service only accesses its own secrets |
| **Audit logging** | Log who accessed what secret when |
| **Encryption** | Secrets encrypted at rest in the secret store |
| **CI/CD secrets** | GitHub Secrets, GitLab CI variables (encrypted at rest) |

**HashiCorp Vault pattern:**
```
1. App authenticates to Vault (using k8s service account, IAM role, etc.)
2. App requests secret: vault read secret/data/db-creds
3. Vault returns credentials (possibly dynamically generated)
4. Credentials have TTL (24h). App must renew or re-fetch
5. Old credentials auto-revoked after TTL
```

**12-Factor App approach:** Secrets via environment → but inject at runtime from secret store (not baked into container image)

**Kubernetes secrets:** Base64 encoded (NOT encrypted by default). Enable encryption at rest with KMS provider. Or use External Secrets Operator to sync from Vault/AWS SM

🔥 **Most Asked**: How to manage secrets in production, Vault pattern, rotation strategy
⚠️ **Common Mistakes**: Committing .env files to Git; not rotating secrets after employee departure
🧠 **Strategy**: "Never in code. Always in a secret store (Vault/AWS SM) with automatic rotation and audit logging"

---
---

# Part E — Observability & Operations

## 128. Logging Strategy

### Q: How do you design a logging strategy for distributed microservices?

**Answer (Interview-Ready):**

**Log levels:**
| Level | When | Example |
|-------|------|---------|
| **ERROR** | Something failed and needs attention | Payment processing failed, DB connection lost |
| **WARN** | Unexpected but handled situation | Rate limit approaching, retry succeeded |
| **INFO** | Significant business events | User signed up, order placed, deployment started |
| **DEBUG** | Diagnostic detail for debugging | Request payload, SQL query, cache hit/miss |
| **TRACE** | Very detailed (usually off in production) | Every function entry/exit |

**Structured logging (JSON, not plain text):**
```json
{
  "timestamp": "2025-01-01T12:00:00Z",
  "level": "ERROR",
  "service": "payment-service",
  "traceId": "abc-123",
  "spanId": "def-456",
  "userId": "user-789",
  "message": "Payment failed",
  "error": "CardDeclined",
  "duration_ms": 230
}
```
→ Structured = queryable. `traceId` links all logs for one request across services

**Log pipeline:**
```
Application → Log aggregator (Fluentd/Filebeat) → Message queue (Kafka) 
  → Log storage (Elasticsearch/Loki) → Dashboard (Kibana/Grafana)
```

**What NOT to log:** Passwords, tokens, credit card numbers, PII (or mask: `email: "h***@example.com"`)

🔥 **Most Asked**: Structured logging, log levels, correlation ID, security
🧠 **Strategy**: "Structured JSON logs with trace IDs. Ship to centralized log aggregation (ELK or Grafana Loki)"

---

## 129. Metrics

### Q: What metrics should you collect and how?

**Answer (Interview-Ready):**

**The Four Golden Signals (Google SRE):**
| Signal | What it measures | Example metric |
|--------|-----------------|----------------|
| **Latency** | How long requests take | p50, p95, p99 response time |
| **Traffic** | Demand on the system | Requests per second |
| **Errors** | Rate of failed requests | Error rate (5xx / total) |
| **Saturation** | How full your resources are | CPU %, memory %, disk I/O, thread pool usage |

**RED method (for services):**
- **R**ate: Requests per second
- **E**rror: Errors per second
- **D**uration: Latency distribution (histograms)

**USE method (for resources — CPU, memory, disk, network):**
- **U**tilization: % of resource in use
- **S**aturation: Work queued waiting for resource
- **E**rrors: Error count for that resource

**Metrics implementation:**
```java
// Prometheus metrics (Java - Micrometer)
Counter requestCounter = Counter.builder("http_requests_total")
    .tag("method", "GET").tag("path", "/api/users").tag("status", "200")
    .register(registry);

Timer requestTimer = Timer.builder("http_request_duration_seconds")
    .tag("path", "/api/users")
    .publishPercentiles(0.5, 0.95, 0.99)
    .register(registry);
```

**Percentiles vs averages:** Never use averages for latency. Use percentiles. Average of [1ms, 1ms, 1ms, 1ms, 10000ms] = 2000ms. P50 = 1ms (typical user). P99 = 10000ms (worst case). Average hides outliers

🔥 **Most Asked**: Four Golden Signals, RED/USE methods, why percentiles not averages
🧠 **Strategy**: "Instrument the Four Golden Signals. Alert on error rate and p99 latency. Use percentiles, never averages"

---

## 130. Monitoring

### Q: How do you design a monitoring stack for production systems?

**Answer (Interview-Ready):**

**Monitoring stack components:**
| Component | Tool | Purpose |
|-----------|------|---------|
| **Metrics collection** | Prometheus, Datadog, CloudWatch | Collect and store time-series metrics |
| **Visualization** | Grafana, Datadog dashboards | Dashboards with graphs, gauges, tables |
| **Alerting** | PagerDuty, OpsGenie, Grafana Alerting | Page on-call when thresholds breached |
| **Log aggregation** | ELK (Elasticsearch, Logstash, Kibana), Loki | Centralized log search |
| **Tracing** | Jaeger, Zipkin, Datadog APM | End-to-end request tracing |
| **Status page** | Statuspage.io, Instatus | Public-facing service status |

**Dashboard hierarchy:**
1. **Executive dashboard**: SLA status, uptime, error budget remaining
2. **Service dashboard**: Per-service health (latency, errors, throughput)
3. **Infrastructure dashboard**: CPU, memory, disk, network per host/pod
4. **Business dashboard**: Signups, orders, revenue, feature usage

**Key dashboards every service needs:**
- Request rate, error rate, latency (p50, p95, p99) — RED metrics
- Resource utilization (CPU, memory, connections, thread pool)
- Dependency health (downstream latency, error rates)
- Business metrics (conversion rate, cart abandonment)

🔥 **Most Asked**: Monitoring stack components, dashboard hierarchy, Prometheus + Grafana
🧠 **Strategy**: "Prometheus for metrics, Grafana for dashboards, PagerDuty for alerting. Three pillars: metrics, logs, traces"

---

## 131. Distributed Tracing

### Q: How does distributed tracing work in microservices?

**Answer (Interview-Ready):**
- **Distributed tracing** = tracking a request as it flows through multiple services. Each service adds a "span" to the "trace"

**Concepts:**
| Term | Meaning |
|------|---------|
| **Trace** | The entire journey of a request (trace ID links all spans) |
| **Span** | One unit of work within a trace (one service call) |
| **Parent-Child** | Span B was called by Span A → B is child of A |
| **Context propagation** | Passing trace ID between services (HTTP header, message header) |

**How it works:**
```
Trace ID: abc-123

[API Gateway] ─────── 200ms ──────────────────────
    [Auth Service] ── 20ms ──
    [User Service] ──────── 80ms ──────
        [Database] ──── 30ms ───
    [Recommendation] ── 50ms ──
```

**Implementation:**
```
// Inject trace context in outbound HTTP headers
traceparent: 00-abc123-span456-01
// W3C Trace Context standard

// Each service:
1. Extract trace context from incoming request
2. Create new span (child of incoming span)
3. Add metadata (service name, duration, status, custom attributes)
4. Propagate trace context to downstream calls
5. Report span to tracing backend
```

**Tools:** OpenTelemetry (standard SDK — instrument once, export to any backend), Jaeger (Uber, open source), Zipkin, Datadog APM, AWS X-Ray

**OpenTelemetry** is the industry standard. Provides: SDK for traces, metrics, logs. Exporters for all major backends. Auto-instrumentation for popular frameworks

🔥 **Most Asked**: Trace/span concepts, context propagation, OpenTelemetry, how to debug a slow request
🧠 **Strategy**: "OpenTelemetry for instrumentation. It's vendor-neutral and becoming the universal standard"

---

## 132. Alerts

### Q: How do you design an alerting strategy that reduces alert fatigue?

**Answer (Interview-Ready):**

**Alerting principles:**
1. **Alert on symptoms, not causes**: Alert on "error rate > 1%" not "CPU > 80%". Users don't care about your CPU
2. **Actionable**: Every alert should require human action. If there's nothing to do → it's not an alert, it's a metric
3. **Meaningful**: Remove alerts that are consistently ignored. Alert fatigue → real alerts missed
4. **Tiered severity**: Page for critical (3am wake-up). Slack notification for warning. Dashboard for info

**Severity tiers:**

| Severity | Response | Example |
|----------|----------|---------|
| **P0 — Critical** | Page on-call immediately. Customer impact NOW | Service down, data loss, security breach |
| **P1 — High** | Page during business hours. Will impact customers soon | Error rate rising, disk 90% full |
| **P2 — Medium** | Slack/ticket. Fix within 24h | Performance degradation, non-critical service flaky |
| **P3 — Low** | Dashboard/ticket. Fix this sprint | Log warnings, cosmetic issues |

**Anti-patterns:**
- ❌ Alert on every metric (CPU, memory, disk, network individually) → alert storm
- ❌ No runbook linked to alert → engineer doesn't know what to do at 3am
- ❌ Flapping alerts (firing and resolving repeatedly) → add hysteresis/waiting period
- ❌ Duplicate alerts for same issue from different monitors

**Each alert needs:**
- Description (what's broken)
- Impact (who's affected, how)
- Dashboard link (see the data)
- Runbook link (step-by-step fix)
- Escalation path (who to contact if unfixed)

🔥 **Most Asked**: Alert on symptoms not causes, severity tiers, reducing fatigue
🧠 **Strategy**: "If you're paged more than once/week with false positives, fix your alerting before fixing your services"

---

## 133. SLIs, SLOs & SLAs

### Q: What are SLIs, SLOs, and SLAs and how do they work together?

**Answer (Interview-Ready):**

| Term | What | Example |
|------|------|---------|
| **SLI** (Service Level Indicator) | Metric that measures service quality | p99 latency, availability %, error rate |
| **SLO** (Service Level Objective) | Target value for an SLI (internal goal) | "p99 latency < 200ms", "99.9% availability" |
| **SLA** (Service Level Agreement) | Contract with customer. Penalty if breached | "99.9% uptime or 10% credit refund" |

**Relationship:** SLI (measurement) → SLO (internal target, stricter) → SLA (external promise, looser)

**Error budget:**
- SLO = 99.9% availability → error budget = 0.1% downtime per month
- 0.1% of 30 days = 43.2 minutes
- If you've used 40 minutes of downtime this month → 3.2 minutes remaining → freeze deployments, focus on reliability

**Common SLIs:**
| SLI | Measurement | Typical SLO |
|-----|-------------|-------------|
| **Availability** | Successful requests / total requests | 99.9% - 99.99% |
| **Latency** | p50, p95, p99 response time | p99 < 200ms |
| **Error rate** | 5xx responses / total | < 0.1% |
| **Throughput** | Requests per second handled | > 10,000 RPS |
| **Freshness** | Time since data was last updated | < 1 minute |

**Follow-ups:**
- "Four 9s (99.99%) vs three 9s (99.9%)?" → 99.9% = 8.7 hours downtime/year. 99.99% = 52.6 minutes/year. Getting that last 9 costs 10x more. Don't promise what you can't deliver
- "Who sets SLOs?" → Product + Engineering together. Based on user expectations and technical feasibility. SLOs should be iteratively tightened as the system matures

🔥 **Most Asked**: Definitions, error budget concept, availability nines
🧠 **Strategy**: "SLOs drive everything: alerting, error budgets, deployment freezes. Set them based on user needs, not vanity"

---

## 134. Incident Management

### Q: How do you manage production incidents from detection to resolution?

**Answer (Interview-Ready):**

**Incident lifecycle:**
```
Detection → Triage → Mitigate → Resolve → Post-mortem
```

**Roles during incident:**
| Role | Responsibility |
|------|---------------|
| **Incident Commander (IC)** | Coordinates response. Makes decisions. Single owner |
| **Communications Lead** | Updates stakeholders, status page, Slack channel |
| **Technical Lead** | Investigates and implements fix |
| **Scribe** | Documents timeline, actions, decisions in real-time |

**Severity classification:**
- **SEV1**: Complete outage. All users affected. All hands on deck
- **SEV2**: Partial outage. Major feature impacted. On-call + backups
- **SEV3**: Minor issue. Some users affected. On-call team handles
- **SEV4**: No user impact but needs attention. Normal ticketing

**Post-mortem (blameless):**
1. **Timeline**: Exact sequence of events with timestamps
2. **Root cause**: What actually caused the incident (not who)
3. **Impact**: Users affected, duration, revenue loss, SLO budget consumed
4. **What went well**: Detection, response, mitigation
5. **What could improve**: Gaps in monitoring, slow response, missing runbooks
6. **Action items**: Concrete tasks with owners and deadlines

🔥 **Most Asked**: Incident roles, post-mortem structure, blameless culture
🧠 **Strategy**: "Blameless post-mortems. Focus on systems, not individuals. Every incident should produce action items that prevent recurrence"

---

## 135. Production Debugging

### Q: How do you debug issues in a production distributed system?

**Answer (Interview-Ready):**

**Debugging workflow:**
```
1. Alert fires or user reports issue
2. Check dashboards → what changed? (error rate, latency, traffic)
3. Check recent deployments → did someone push a change?
4. Use distributed tracing → find the slow/failing span
5. Check logs for that service + trace ID → see error details
6. Check dependencies → DB slow? Cache down? External API failing?
7. Form hypothesis → verify → fix → deploy → verify fix
```

**Tools per debugging scenario:**

| Problem | Tool | How |
|---------|------|-----|
| "500 errors spiking" | Logs (Kibana/Loki) | Filter by status=500, group by endpoint |
| "API is slow" | Tracing (Jaeger) | Find slow span in trace → that's the bottleneck |
| "Memory leak" | Metrics (Grafana) + Heap dump | Watch memory grow over time. Dump heap, analyze |
| "Intermittent failures" | Logs + Correlation | Search by user/request ID across all services |
| "Performance regression" | APM (Datadog) | Compare performance before/after deployment |
| "DB connection issues" | DB monitoring | Check connection pool usage, slow queries, locks |

**Debugging without SSH/access to production:**
- Make systems observable: structured logs, metrics, traces, health endpoints
- Feature flags: disable suspected feature remotely
- Canary deployments: roll back to last known good version
- Replay: Reproduce with same request payload in staging/local

**Follow-ups:**
- "How to safely debug in production?" → Read-only access (logs, metrics, traces). Never modify production data. Use feature flags to disable. If you must SSH: pair with another engineer, record session
- "What about performance profiling in production?" → Use sampling profilers (Java Flight Recorder, async-profiler). Minimal overhead (<2%). Never use blocking profilers in production

🔥 **Most Asked**: Debugging workflow, tooling per scenario, observability importance
🧠 **Strategy**: "Three pillars of observability: metrics (what's broken), logs (why), traces (where in the call chain)"

---
---

# Part F — Frontend Security (SEQ 13, Topics 240-244)

## 240. XSS — Types, Prevention, Real Examples

### Q: What are the types of XSS and how do you prevent them?

**Answer (Interview-Ready):**
- **XSS** (Cross-Site Scripting) = attacker injects malicious JavaScript into a page that executes in other users' browsers

**Types:**
| Type | How | Example |
|------|-----|---------|
| **Stored/Persistent** | Malicious script saved in database, rendered to all users | Comment with `<script>` tag stored in DB → shown to every viewer |
| **Reflected** | Script in URL, reflected in response | `site.com/search?q=<script>steal(cookie)</script>` → server includes in HTML |
| **DOM-based** | Client-side JS reads untrusted data and injects into DOM | `document.innerHTML = location.hash` → attacker crafts hash with script |

**Prevention:**

| Defense | How |
|---------|-----|
| **Output encoding** | Encode special characters: `<` → `&lt;`, `>` → `&gt;`. Framework-level (React auto-escapes) |
| **CSP** | `Content-Security-Policy: script-src 'self'` → blocks inline scripts and external scripts |
| **sanitize HTML** | DOMPurify for user-generated rich HTML (markdown rendered, WYSIWYG) |
| **Avoid `innerHTML`** | Use `textContent` instead. React: avoid `dangerouslySetInnerHTML` |
| **HttpOnly cookies** | Cookies with `HttpOnly` flag can't be read by JavaScript → limits theft impact |

**React XSS protection:**
- React auto-escapes JSX expressions: `{userInput}` → safe. React treats it as text, not HTML
- **DANGER**: `dangerouslySetInnerHTML={{ __html: userInput }}` → bypasses protection. Must sanitize with DOMPurify first

```jsx
// SAFE — React auto-escapes
<div>{userInput}</div>

// DANGEROUS — raw HTML injection
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

🔥 **Most Asked**: Three types, React's protection, CSP, DOMPurify
🧠 **Strategy**: "React auto-escapes by default. The two XSS risks in React: dangerouslySetInnerHTML and href='javascript:...'"

---

## 241. CSRF — SameSite Cookies, CSRF Tokens

### Q: What is CSRF and how do modern apps prevent it?

**Answer (Interview-Ready):**
- **CSRF** (Cross-Site Request Forgery) = attacker tricks user's browser into making an authenticated request to a site the user is logged into

**Attack flow:**
```
1. User logged into bank.com (has session cookie)
2. User visits evil.com
3. evil.com contains: <form action="bank.com/transfer" method="POST">
4. Browser auto-attaches bank.com cookie → transfer executed!
```

**Prevention:**

| Defense | How |
|---------|-----|
| **SameSite cookies** | `Set-Cookie: session=abc; SameSite=Lax` → cookie not sent on cross-site POST requests |
| **CSRF token** | Server generates random token → client sends in header/body with every state-changing request |
| **Double submit cookie** | Set CSRF token in cookie + client reads and sends in header. Server compares both |
| **Origin/Referer header check** | Server checks `Origin` header matches expected domain |

**SameSite cookie values:**
| Value | Behavior |
|-------|---------|
| `Strict` | Cookie never sent cross-site. Most secure but breaks external links (user must re-login) |
| `Lax` | Cookie sent on top-level GET navigations only. Not on cross-site POST. **Default in modern browsers** |
| `None` | Cookie sent on all cross-site requests. Must have `Secure` flag. For third-party services |

**Modern apps (SPAs):**
- If using JWT in `Authorization` header → CSRF is not a risk (attacker can't set custom headers cross-site)
- If using cookies for auth → use `SameSite=Lax` (sufficient for most cases) or CSRF tokens for critical operations

🔥 **Most Asked**: Attack flow, SameSite values, SPA vs server-rendered CSRF differences
🧠 **Strategy**: "SameSite=Lax is the default and sufficient for most apps. Add CSRF tokens for extra security on sensitive operations"

---

## 242. CORS — Preflight, Credentialed Requests

### Q: How does CORS work and what is a preflight request?

**Answer (Interview-Ready):**
- **CORS** (Cross-Origin Resource Sharing) = browser security mechanism that controls which origins can access your API

**Same-origin policy:** Browser blocks requests from `app.com` to `api.other.com` by default. CORS headers tell the browser it's OK

**Simple vs Preflight requests:**

| Simple Request | Preflight Required |
|---------------|-------------------|
| GET, HEAD, POST | PUT, DELETE, PATCH |
| Standard headers only | Custom headers (Authorization, Content-Type: application/json) |
| No credentials | With credentials (cookies) |

**Preflight flow:**
```
1. Browser sends OPTIONS request (preflight):
   Origin: https://app.com
   Access-Control-Request-Method: DELETE
   Access-Control-Request-Headers: Authorization

2. Server responds:
   Access-Control-Allow-Origin: https://app.com
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE
   Access-Control-Allow-Headers: Authorization, Content-Type
   Access-Control-Max-Age: 86400  (cache preflight for 24h)

3. Preflight passes → Browser sends actual DELETE request
```

**Credentialed requests (cookies):**
```
// Client
fetch('https://api.com/data', { credentials: 'include' });

// Server MUST respond with:
Access-Control-Allow-Origin: https://app.com  // NOT * (wildcard not allowed with credentials)
Access-Control-Allow-Credentials: true
```

**Security rules:**
- Never use `Access-Control-Allow-Origin: *` with credentials
- Whitelist specific origins, don't reflect the request's Origin header blindly (allows any origin)
- Use `Access-Control-Max-Age` to cache preflight and reduce OPTIONS requests

🔥 **Most Asked**: Preflight flow, credentialed requests, wildcard danger
🧠 **Strategy**: "CORS is a browser-only security mechanism. It does NOT protect your API from non-browser clients (Postman, curl). Always validate on the server"

---

## 243. Prototype Pollution

### Q: What is prototype pollution and how do you prevent it?

**Answer (Interview-Ready):**
- **Prototype pollution** = attacker modifies `Object.prototype` through user input, affecting all objects in the application

**Attack:**
```js
// Vulnerable merge function
function merge(target, source) {
  for (let key in source) {
    target[key] = source[key];  // No __proto__ check!
  }
}

// Attacker sends:
const malicious = JSON.parse('{"__proto__": {"isAdmin": true}}');
merge({}, malicious);

// Now EVERY object has isAdmin = true!
const user = {};
console.log(user.isAdmin);  // true! 🚨
```

**Prevention:**
| Defense | How |
|---------|-----|
| **Object.create(null)** | Create objects without prototype `const obj = Object.create(null)` |
| **Input validation** | Reject keys `__proto__`, `constructor`, `prototype` from user input |
| **Map instead of Object** | `new Map()` for key-value data — not susceptible |
| **Object.freeze** | Freeze `Object.prototype` (breaks some libraries) |
| **Safe merge libraries** | lodash fixed this. Use libraries that skip prototype keys |
| **JSON Schema validation** | Validate input structure before processing |

**Real-world impact:** jQuery < 3.4 was vulnerable. Express.js query parser. Any server that deep-merges user input can be affected

🔥 **Most Asked**: How the attack works, prevention techniques, real-world examples
🧠 **Strategy**: "Never deep-merge untrusted input without filtering __proto__ and constructor keys"

---

## 244. Supply Chain Attacks — npm Package Security

### Q: How do you protect against supply chain attacks in JavaScript projects?

**Answer (Interview-Ready):**
- **Supply chain attack** = compromising a dependency that your application uses. Attacker publishes malicious npm package or compromises existing one

**Attack vectors:**
| Vector | Example |
|--------|---------|
| **Typosquatting** | `crossenv` (malicious) vs `cross-env` (real). Steal credentials on install |
| **Account takeover** | Attacker gains maintainer's npm credentials → publishes malicious version |
| **Dependency confusion** | Internal package name matches public npm package. npm installs public (malicious) one |
| **Malicious install scripts** | `postinstall` script runs arbitrary code on `npm install` |

**Prevention:**

| Defense | How |
|---------|-----|
| **Lock files** | Commit `package-lock.json` / `pnpm-lock.yaml`. Pin exact versions |
| **npm audit** | `npm audit` in CI/CD. Block deploys on high/critical vulnerabilities |
| **Snyk / Socket** | Automated vulnerability scanning. Detect behavior changes in dependencies |
| **Dependabot** | Auto-PRs for security updates. Review before merging |
| **SRI** | Subresource Integrity for CDN-loaded scripts. Hash verification |
| **Scoped packages** | Use `@company/package-name` to avoid dependency confusion |
| **Ignore scripts** | `npm install --ignore-scripts` in CI. Only allow scripts for known packages |
| **Minimal dependencies** | Fewer deps = smaller attack surface. Do you really need left-pad? |

**Subresource Integrity (SRI):**
```html
<script src="https://cdn.example.com/lib.js" 
  integrity="sha384-abc123..." 
  crossorigin="anonymous"></script>
<!-- If the file is modified, browser blocks it -->
```

🔥 **Most Asked**: Attack vectors, npm audit, dependency confusion, SRI
🧠 **Strategy**: "Lock files, npm audit in CI, Dependabot, and minimal dependencies. Defense in depth against supply chain attacks"

---
---

# Part G — Authorization & Access Control (SEQ 14, Topics 245-274)

## 245. Authentication Flows

### Q: What are the common authentication flows for web and mobile applications?

**Answer (Interview-Ready):**

| Flow | How | Best For |
|------|-----|----------|
| **Email + Password** | Hash password (bcrypt, argon2). Compare on login | Simple apps, internal tools |
| **OAuth 2.0 + OIDC** | Delegate to identity provider (Google, Microsoft) | "Login with Google" |
| **Passwordless (Magic Link)** | Send one-time link to email | Low-friction onboarding |
| **Passkeys/WebAuthn** | Public-key crypto, device-based | Most secure, no phishing possible |
| **SSO (SAML/OIDC)** | Enterprise identity provider (Okta, Azure AD) | B2B/enterprise apps |
| **mTLS** | Client certificate authentication | Service-to-service |

**Modern recommended flow (SPA):**
```
1. User clicks "Login" → redirect to Identity Provider (IdP)
2. User authenticates with IdP (Google, Okta)
3. IdP redirects back with authorization code
4. Backend exchanges code for tokens (access + refresh + ID token)
5. Access token (JWT, 15min) sent to client
6. Refresh token stored in HttpOnly cookie
7. On expiry: silent refresh via refresh token rotation
```

**Password security:**
- Hash with bcrypt (cost factor 12+) or argon2id
- Never store plaintext. Never use MD5/SHA for passwords
- Rate limit login attempts (5 failures → temporary lockout)
- Breached password check (haveibeenpwned API)

🔥 **Most Asked**: OAuth flow, token management, password hashing
🧠 **Strategy**: "OAuth 2.0 + PKCE for SPAs. Bcrypt for passwords. Passkeys for passwordless future"

---

## 246. Token Storage — localStorage vs httpOnly Cookie Trade-offs

### Q: Where should you store authentication tokens in the browser?

**Answer (Interview-Ready):**

| Storage | XSS Risk | CSRF Risk | Recommendation |
|---------|----------|-----------|----------------|
| **localStorage** | ❌ Vulnerable (JS can read) | ✅ Safe (not auto-sent) | Not recommended for auth tokens |
| **sessionStorage** | ❌ Vulnerable | ✅ Safe | Slightly better (cleared on tab close) |
| **HttpOnly Cookie** | ✅ Safe (JS can't read) | ❌ Vulnerable (auto-sent) | Recommended with SameSite=Lax |
| **In-memory (JS variable)** | ✅ Safe (short-lived) | ✅ Safe | Best security but lost on refresh |

**Recommended approach:**
```
Access token: In-memory (JS variable) + short TTL (15min)
Refresh token: HttpOnly, Secure, SameSite=Lax cookie
On page load: Silent refresh via cookie → get new access token
```

**Why not localStorage for tokens:**
- Any XSS vulnerability → attacker reads token → full account takeover
- XSS is common (#7 on OWASP Top 10)
- HttpOnly cookies can't be read by JS → XSS can't steal the token

**Why not cookie for access token:**
- CSRF risk (cookie auto-sent on cross-site requests)
- SameSite=Lax mitigates most CSRF but not all edge cases
- Access token in Authorization header is not auto-sent → no CSRF

**BFF (Backend for Frontend) pattern:** API calls go through your backend. Tokens never reach the browser. Backend holds tokens. This is the most secure approach for SPAs

🔥 **Most Asked**: localStorage vs cookie, XSS vs CSRF trade-off, BFF pattern
🧠 **Strategy**: "Access token in memory, refresh token in HttpOnly cookie, SameSite=Lax. Or use BFF to keep tokens server-side"

---

## 247. OAuth 2.0 & OIDC Flows

### Q: Explain OAuth 2.0 and how OIDC extends it.

**Answer (Interview-Ready):**
- **OAuth 2.0** = authorization framework. Grants access tokens to third parties (access to resources on behalf of user)
- **OIDC** (OpenID Connect) = identity layer on top of OAuth 2.0. Adds ID token (who the user is) + UserInfo endpoint

**OAuth 2.0 only tells you:** "This token has permission to access X"
**OIDC adds:** "This token belongs to user Y with email Z"

**OIDC ID Token (JWT):**
```json
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",
  "aud": "your-client-id",
  "exp": 1640000000,
  "name": "Hruday D",
  "email": "hruday@example.com",
  "picture": "https://..."
}
```

**Flows summary:**
| Flow | For | Token Location |
|------|-----|---------------|
| Authorization Code + PKCE | SPA, mobile | Backend exchanges code for tokens |
| Client Credentials | Machine-to-machine | No user involved |
| Device Authorization | Smart TV, CLI | User authorizes on separate device |
| Implicit (DEPRECATED) | Was for SPAs | Token in URL fragment — insecure |

**Follow-ups:**
- "Why was implicit flow deprecated?" → Token exposed in URL fragment (browser history, referrer headers, logs). No refresh tokens. Auth Code + PKCE is strictly better
- "Scopes vs claims?" → **Scopes** = permissions requested (`openid profile email`). **Claims** = data in the token (`name`, `email`). Scopes determine which claims are included

🔥 **Most Asked**: OAuth vs OIDC difference, why PKCE, ID token claims
🧠 **Strategy**: "OAuth 2.0 for authorization (permissions). OIDC for authentication (identity). Always use PKCE for public clients"

---

## 248. JWT Deep Dive — Claims, Expiry, Refresh Strategy

### Q: How do JWTs work and what are the security considerations?

**Answer (Interview-Ready):**
- **JWT** = JSON Web Token. Three parts: `header.payload.signature` (base64url encoded, NOT encrypted)

**Structure:**
```
Header:   {"alg": "RS256", "typ": "JWT"}
Payload:  {"sub": "user123", "role": "admin", "exp": 1640000000, "iat": 1639999000}
Signature: RSASSA-PKCS1-v1_5(base64(header) + "." + base64(payload), privateKey)
```

**Key claims:**
| Claim | Meaning |
|-------|---------|
| `sub` | Subject (user ID) |
| `iss` | Issuer (who created the token) |
| `aud` | Audience (who the token is for) |
| `exp` | Expiration timestamp |
| `iat` | Issued at |
| `jti` | JWT ID (unique identifier for token revocation) |

**Security considerations:**
- JWT is NOT encrypted — anyone can decode it. Don't put sensitive data in payload
- Always verify signature. Use asymmetric keys (RS256) for distributed systems (public key verification)
- Set short expiry (15min). Use refresh tokens for longer sessions
- Always validate: `iss`, `aud`, `exp`, `signature`

**Token refresh strategy:**
```
1. Access token expires (15min)
2. Client sends refresh token (in HttpOnly cookie) to /token/refresh
3. Server validates refresh token → issues new access token + NEW refresh token
4. Old refresh token invalidated (rotation)
5. If old refresh token is reused → possible theft → invalidate ALL tokens for that user
```

**Refresh token rotation** prevents stolen refresh tokens from being used indefinitely

🔥 **Most Asked**: JWT structure, security, refresh rotation, why not encrypted
⚠️ **Common Mistakes**: Putting sensitive data in JWT (it's readable!); using HS256 in distributed systems (shared secret)
🧠 **Strategy**: "Short-lived access tokens (15min) + refresh token rotation + RS256 for distributed verification"

---

## 249. Passkeys & WebAuthn

### Q: How do passkeys work and why are they the future of authentication?

**Answer (Interview-Ready):**
- **Passkeys/WebAuthn** = passwordless authentication using public-key cryptography. Private key stays on device (never sent to server). Server stores public key only

**Flow:**
```
Registration:
1. Server sends challenge (random bytes)
2. Device creates key pair (public + private)
3. User verifies with biometric (Face ID, fingerprint) or PIN
4. Device sends public key + signed challenge → server stores public key

Login:
1. Server sends challenge
2. Device signs challenge with private key (user verifies with biometric)
3. Server verifies signature with stored public key → authenticated
```

**Why passkeys are better:**
| Problem | Password | Passkey |
|---------|----------|---------|
| **Phishing** | User tricked into entering on fake site | ❌ Can't be phished (bound to domain) |
| **Credential stuffing** | Reused passwords tried on other sites | ❌ No reusable secret |
| **Database breach** | Passwords stolen (even hashed) | ❌ Only public keys on server (useless to attacker) |
| **User friction** | Remember complex passwords | ✅ Just biometric |

**Synced passkeys:** iCloud Keychain (Apple), Google Password Manager → passkeys sync across devices. Solves the "lost device" problem of hardware security keys

🔥 **Most Asked**: How it works, why phishing-resistant, passkeys vs passwords
🧠 **Strategy**: "Passkeys are the future. No passwords to steal, phishing-immune. Implement as primary auth for new apps"

---

## 250. Protecting Sensitive UI Data

### Q: How do you protect sensitive data displayed in the frontend?

**Answer (Interview-Ready):**

| Data | Protection |
|------|-----------|
| **Passwords** | Never display. Show asterisks. Don't include in API response |
| **Credit cards** | Show last 4 digits only: `**** **** **** 4242` |
| **SSN/ID numbers** | Masked: `***-**-6789` |
| **Email** | Partially masked: `h***@example.com` |
| **API keys** | Show first 4 characters: `sk_live_XXXX...` with copy button |

**Technical protections:**
- **Masking on server**: Never send full sensitive data to client. API returns masked version
- **Autocomplete off**: `<input autocomplete="off">` for sensitive fields
- **Copy protection**: Disable copy for sensitive displayed data (though not bulletproof)
- **Session timeout**: Auto-logout after inactivity (financial apps: 5-15min)
- **CSP**: Prevent data exfiltration via CSP `connect-src` restrictions
- **Screen capture**: Some banking apps use DRM/media flags (limited browser support)

**DevTools protection** (limited, not security boundary):
- Disable right-click (doesn't work, just annoying)
- Pausing debugger (anti-debugging — easily bypassed)
- Reality: **Never rely on client-side protection for security**. Server is the security boundary

🔥 **Most Asked**: Data masking patterns, server-side vs client-side protection
🧠 **Strategy**: "All sensitive data protection happens on the SERVER. Client-side masking is UX, not security"

---

## 251. Secure API Consumption

### Q: How do you securely consume APIs from the frontend?

**Answer (Interview-Ready):**

| Practice | How |
|----------|-----|
| **HTTPS only** | Never call HTTP APIs from HTTPS pages (mixed content blocked) |
| **Auth token in header** | `Authorization: Bearer <token>` — not in URL (logged by servers, proxies) |
| **Validate responses** | Don't trust API responses blindly. Validate schema, sanitize HTML |
| **Error handling** | Don't display raw error responses to users (may contain internal details) |
| **Rate limiting** | Client-side debouncing/throttling to avoid triggering server rate limits |
| **CORS** | API must allow your origin. Don't proxy just to bypass CORS (hides security intent) |
| **Certificate pinning** | Mobile: pin expected certificate. Prevents MITM with rogue CA |
| **Third-party API keys** | Never expose in client code. Proxy through your backend |

**API key exposure prevention:**
```
// ❌ BAD — API key in client code (visible in DevTools/source)
fetch('https://api.stripe.com/charges', {
  headers: { 'Authorization': 'Bearer sk_live_SECRET' }
});

// ✅ GOOD — Proxy through your backend
fetch('/api/create-charge', { method: 'POST', body: chargeData });
// Backend: uses secret key to call Stripe
```

🔥 **Most Asked**: Token placement, third-party key exposure, response validation
🧠 **Strategy**: "Route all third-party API calls through your backend. Never expose secret keys in client code"

---

## 252. Clickjacking — X-Frame-Options, frame-ancestors

### Q: What is clickjacking and how do you prevent it?

**Answer (Interview-Ready):**
- **Clickjacking** = attacker embeds your site in an invisible iframe on their malicious page. User thinks they're clicking on the attacker's page but actually clicking on YOUR site's buttons (transfer money, change settings)

**Prevention:**
```
// Option 1: X-Frame-Options header (legacy)
X-Frame-Options: DENY              // Never allow framing
X-Frame-Options: SAMEORIGIN        // Only same-origin framing

// Option 2: CSP frame-ancestors (modern, more flexible)
Content-Security-Policy: frame-ancestors 'self' https://trusted.com
```

`frame-ancestors` supersedes `X-Frame-Options` and supports multiple domains. Use both for backward compatibility

🔥 **Most Asked**: Attack mechanism, X-Frame-Options vs frame-ancestors
🧠 **Strategy**: Set `frame-ancestors 'self'` unless you explicitly need to be embedded

---

## 253. CSP — Policy Design, Nonce-Based, Report-Only Mode

### Q: How do you design a Content Security Policy?

**Answer (Interview-Ready):**
- **CSP** = HTTP header that tells the browser which resources (scripts, styles, images) are allowed to load

**Example policy:**
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-abc123' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  report-uri /csp-report;
```

**Nonce-based approach (recommended for inline scripts):**
```html
<!-- Server generates random nonce per request -->
Content-Security-Policy: script-src 'nonce-R4nd0m';

<script nonce="R4nd0m">
  // This inline script is allowed
</script>
<script>
  // This script is BLOCKED (no matching nonce)
</script>
```

**Report-Only mode (deploy safely):**
```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```
→ Logs violations but doesn't block. Use to test CSP before enforcing

**Deployment strategy:** Report-Only → 2 weeks → fix violations → Enforce → monitor reports → iterate

🔥 **Most Asked**: Nonce-based CSP, report-only deployment, common directives
🧠 **Strategy**: "Start with report-only CSP. Fix violations. Then enforce. Nonce-based for inline scripts"

---

## 254. Secure Headers — Full Header Audit

### Q: What security headers should every web application have?

**Answer (Interview-Ready):**

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'...` | XSS protection, resource loading control |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information leakage |
| `Permissions-Policy` | `geolocation=(), camera=()` | Disable unused browser APIs |
| `X-XSS-Protection` | `0` | Disable legacy XSS filter (CSP is better) |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate from cross-origin popups |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Control embedding cross-origin resources |

**Testing:** Use securityheaders.com to audit. Grade A+ is the target

🔥 **Most Asked**: CSP, HSTS, X-Content-Type-Options, how to audit
🧠 **Strategy**: "Set all security headers from day 1. It's 10 minutes of config that prevents major vulnerabilities"

---

## 255. Token Refresh — Silent Refresh Pattern

### Q: How does silent token refresh work in SPAs?

**Answer (Interview-Ready):**

**The problem:** Access tokens expire. User shouldn't have to re-login every 15 minutes

**Silent refresh pattern:**
```
1. Access token expires (or is about to expire)
2. Frontend calls /token/refresh with refresh token (HttpOnly cookie auto-sent)
3. Backend validates refresh token → issues new access token + new refresh token (rotation)
4. New access token stored in memory
5. Old refresh token invalidated → new one set as HttpOnly cookie
6. User never sees a login screen
```

**When to refresh:**
- **Proactive**: Refresh when token is at 80% of its lifetime (12min for a 15min token). Use `setTimeout` or interceptor
- **Reactive**: Refresh when API returns 401. Retry original request with new token

**Axios interceptor pattern:**
```js
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return axios(error.config);  // Retry with new token
    }
    return Promise.reject(error);
  }
);
```

**Queue concurrent refresh requests:** If 5 requests get 401 at the same time → don't call /refresh 5 times. Queue them, refresh once, retry all 5

🔥 **Most Asked**: Silent refresh flow, interceptor pattern, concurrent refresh handling
🧠 **Strategy**: "Proactive refresh at 80% TTL + reactive 401 interceptor + request queuing during refresh"

---

## 256. Preventing Data Leaks in Browser DevTools

### Q: How do you limit sensitive data exposure in browser DevTools?

**Answer (Interview-Ready):**
- **Key principle**: DevTools are NOT a security boundary. Any determined user can inspect everything. Real security is server-side

**Practical mitigations:**
| Technique | What it does |
|-----------|-------------|
| **Don't send sensitive data** | Server returns masked data. Client never has full SSN/credit card |
| **Clear console** | `console.clear()` in production (minimal, easily bypassed) |
| **Remove console.log** | Strip debug logs in production build (terser, babel-plugin-transform-remove-console) |
| **Obfuscate** | Minimize/uglify JS. Not security, but raises the bar slightly |
| **Short-lived tokens** | Even if seen in DevTools, expires in 15 minutes |
| **Restrict Network tab exposure** | Don't include tokens in URLs (visible in Network tab + server logs) |

**What NOT to do:**
- Don't try to disable DevTools (impossible, easily bypassed)
- Don't disable right-click (annoying, bypassed with keyboard shortcut)
- Don't anti-debug with `debugger` statements (annoying, bypassed)

🔥 **Most Asked**: What can you actually do, what's pointless
🧠 **Strategy**: "The answer is always: don't send sensitive data to the client. Everything else is security theater"

---

## 257. Subresource Integrity (SRI)

### Q: What is SRI and when should you use it?

**Answer (Interview-Ready):**
- **SRI** = browser verifies that a resource fetched from a CDN/third-party hasn't been tampered with, using a cryptographic hash

```html
<script src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"></script>
```

**If the file is modified (CDN compromised, MITM):**
- Browser computes hash of downloaded file
- Hash doesn't match `integrity` attribute
- Browser blocks the resource → protects users

**When to use:** Any script/stylesheet loaded from external CDN. Not needed for same-origin resources (you control them)

**Generating SRI hash:** `shasum -b -a 384 lib.js | xxd -r -p | base64`

🔥 **Most Asked**: How SRI works, when to use, CDN compromise scenario
🧠 **Strategy**: "SRI for all CDN-loaded scripts. Simple to implement, prevents catastrophic CDN compromises"

---

## 258. Authentication vs Authorization (Frontend Perspective)

### Q: How does auth enforcement differ between frontend and backend?

**Answer (Interview-Ready):**
- **Frontend auth** = UX optimization. Hide/show UI elements based on permissions. NOT a security boundary
- **Backend auth** = actual security. Every API call must be authorized regardless of what the frontend shows

```
Frontend: if (user.role === 'admin') show <DeleteButton />
Backend:  DELETE /users/:id → verify JWT → check role → authorize → execute

// Frontend check can be bypassed (DevTools, direct API call)
// Backend check CANNOT be bypassed
```

**Frontend authorization is for:**
- Better UX (don't show buttons user can't click)
- Reducing unnecessary API calls
- Route guards (redirect unauthorized users to login)

**Backend authorization MUST:**
- Check on EVERY request (middleware)
- Never trust client-side role claims
- Validate JWT signature + claims
- Check resource-level access (BOLA prevention)

🔥 **Most Asked**: Frontend vs backend enforcement, why both are needed
🧠 **Strategy**: "Frontend auth is UX. Backend auth is security. You need BOTH but only the backend is trusted"

---

## 259-262. Permission Modeling — RBAC, ABAC, Policy-Based

### Q: Compare RBAC, ABAC, and policy-based authorization models.

**Answer (Interview-Ready):**

| Model | How | Complexity | Best For |
|-------|-----|-----------|----------|
| **RBAC** | User → Role → Permissions | Low | Simple apps (admin, editor, viewer) |
| **ABAC** | Rules on attributes (user, resource, context, environment) | Medium-High | Complex policies (time-based, geo-based) |
| **PBAC** | Centralized policy engine evaluates rules | High | Fine-grained, auditable (OPA/Rego, Cedar) |
| **ReBAC** | Permission based on relationships between entities | High | Google Zanzibar (Docs sharing, org hierarchies) |

**RBAC implementation:**
```
Roles: admin, editor, viewer
Permissions: users.read, users.write, users.delete

admin  → [users.read, users.write, users.delete]
editor → [users.read, users.write]
viewer → [users.read]

// Check: user.roles.some(r => rolePermissions[r].includes('users.delete'))
```

**ABAC example:**
```
ALLOW if:
  user.department == resource.department AND
  user.clearanceLevel >= resource.classificationLevel AND
  context.time is between 9AM and 5PM AND
  environment.network == 'corporate'
```

**When to upgrade from RBAC:**
- Role explosion (too many roles for every combination)
- Need context-based decisions (time, location, resource ownership)
- Multi-tenant with different permission models per tenant
- Compliance requires fine-grained audit trail

🔥 **Most Asked**: RBAC vs ABAC, role explosion, when to upgrade
🧠 **Strategy**: "Start with RBAC. Upgrade to ABAC/PBAC when you hit role explosion or need context-based policies"

---

## 263-267. Frontend Authorization Patterns

### Q: How do you implement authorization guards in frontend frameworks?

**Answer (Interview-Ready):**

**React Route Guard:**
```tsx
function ProtectedRoute({ children, requiredRole }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && !user.roles.includes(requiredRole)) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
}

// Usage
<Route path="/admin" element={
  <ProtectedRoute requiredRole="admin">
    <AdminDashboard />
  </ProtectedRoute>
} />
```

**Angular Route Guard:**
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  if (authService.isAuthenticated()) {
    const requiredRole = route.data['role'];
    return !requiredRole || authService.hasRole(requiredRole);
  }
  return inject(Router).createUrlTree(['/login']);
};

// Usage: { path: 'admin', component: AdminComponent, canActivate: [authGuard], data: { role: 'admin' } }
```

**Feature-level access control:**
```tsx
function FeatureGate({ feature, children, fallback = null }) {
  const { permissions } = useAuth();
  return permissions.includes(feature) ? children : fallback;
}

// Usage
<FeatureGate feature="billing.export" fallback={<UpgradePrompt />}>
  <ExportButton />
</FeatureGate>
```

**Data-level security:** Backend enforces. Frontend hides UI. Never filter sensitive data on the client — backend should only return data the user is authorized to see

🔥 **Most Asked**: Route guards in React/Angular, feature flags for permissions, data-level security
🧠 **Strategy**: "Route guards for page-level access. FeatureGate component for element-level. Backend enforces everything"

---

## 268-274. Multi-Tenant Authorization, Auditing & Compliance

### Q: How do you implement authorization in multi-tenant SaaS applications?

**Answer (Interview-Ready):**

**Tenant isolation in auth:**
```
JWT payload:
{
  "sub": "user123",
  "org": "tenant-abc",        // Tenant identifier
  "roles": ["editor"],         // Roles within this tenant
  "permissions": ["docs.write"] // Explicit permissions
}

// Every API request: verify JWT → check org → check role → check resource ownership
```

**Multi-tenant authorization challenges:**
- User may belong to multiple organizations (switch context)
- Different orgs may have different role definitions
- Cross-tenant data leakage is catastrophic (BOLA at tenant level)
- Admin of Org A should not see Org B's data

**Privilege escalation prevention:**
- Never trust client-sent role/permission claims
- Assign minimum permissions by default
- Require step-up authentication for sensitive operations (re-enter password, MFA)
- Monitor for unusual permission usage (user suddenly accessing admin endpoints)

**Audit logging:**
```json
{
  "timestamp": "2025-01-01T12:00:00Z",
  "actor": { "userId": "user123", "orgId": "tenant-abc" },
  "action": "user.delete",
  "resource": { "type": "user", "id": "user456" },
  "result": "denied",
  "reason": "insufficient_permissions",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0..."
}
```

**Compliance (GDPR, SOC2):**
- Immutable audit logs (append-only, signed)
- Data access logging (who accessed what PII)
- Right to be forgotten (data deletion with proof)
- Retention policies (logs kept for required period, then deleted)

🔥 **Most Asked**: Tenant isolation, privilege escalation, audit logging format, GDPR
🧠 **Strategy**: "Every API call must be scoped to the authenticated tenant. Log all permission decisions. Audit is not optional for enterprise SaaS"

---
---

# Part H — Real-Time Systems (SEQ 15, Topics 275-287)

## 275. Polling vs Long Polling

### Q: Compare polling and long polling for real-time updates.

**Answer (Interview-Ready):**

| Aspect | Short Polling | Long Polling |
|--------|--------------|-------------|
| **How** | Client sends request every N seconds | Client sends request → server holds until data available → responds → client immediately re-requests |
| **Latency** | Up to poll interval (e.g., 30s) | Near real-time (responds as soon as data exists) |
| **Server load** | High (many empty responses) | Lower (responses only when data exists) |
| **Connection** | New connection each poll | Connection held open for ~30s, then recycled |
| **Complexity** | Simplest | Slightly more complex (timeout handling, reconnection) |

**When to use polling:** Simple dashboards, status checks, low-update-frequency data

**When to use long polling:** Chat (before WebSocket), notifications, medium-frequency updates where WebSocket isn't justified

**Long polling implementation:**
```js
async function longPoll() {
  try {
    const response = await fetch('/api/events?since=' + lastEventId, {
      signal: AbortSignal.timeout(30000)  // 30s timeout
    });
    const events = await response.json();
    process(events);
    lastEventId = events[events.length - 1].id;
  } catch (e) {
    await new Promise(r => setTimeout(r, 1000));  // Wait 1s on error
  }
  longPoll();  // Immediately re-connect
}
```

🔥 **Most Asked**: Comparison with WebSocket, when polling is sufficient
🧠 **Strategy**: "Polling for <1 req/min. Long polling for chat-like apps without WebSocket. WebSocket for true real-time"

---

## 276. WebSockets (Frontend Deep Dive)

### Q: How do you implement robust WebSocket connections in frontend applications?

**Answer (Interview-Ready):**

**Connection management:**
```js
class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      this.reconnectDelay = 1000;  // Reset backoff on success
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') return;  // Heartbeat response
      this.emit(data.type, data.payload);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.reconnect();
    };
  }

  reconnect() {
    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay + Math.random() * 1000);  // Jitter
  }

  startHeartbeat() {
    this.heartbeat = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
}
```

**Must-haves for production WebSocket:**
- Exponential backoff with jitter on reconnect
- Heartbeat/ping-pong (detect silent disconnections)
- Message queuing during disconnect (send when reconnected)
- Connection state UI indicator (online/offline/reconnecting)
- Graceful degradation to long-polling fallback (Socket.IO does this)

🔥 **Most Asked**: Reconnection strategy, heartbeat, message queuing
🧠 **Strategy**: "Always implement reconnection with backoff, heartbeat, and offline message queuing"

---

## 277. Server-Sent Events (Frontend)

### Q: When should you use SSE over WebSocket?

**Answer (Interview-Ready):**

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| Direction | Server → Client only | Bidirectional |
| Protocol | HTTP/1.1 (text/event-stream) | ws:// protocol |
| Reconnection | Built-in auto-reconnect | Manual implementation |
| Data format | Text only (UTF-8) | Text and binary |
| Complexity | Simple | More complex |
| Proxy/firewall | Works everywhere (it's HTTP) | May be blocked |

**When SSE is better:**
- Server-to-client push only (notifications, feed updates, live scores)
- You don't need the client to send data back over the same channel
- You want built-in reconnection and event ID tracking
- Simpler infrastructure (standard HTTP, works behind all proxies)

**Implementation:**
```js
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateUI(data);
};

eventSource.onerror = () => {
  // Browser auto-reconnects! Sends Last-Event-ID header
  console.log('Connection lost, auto-reconnecting...');
};

// Server
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
});
res.write(`id: ${eventId}\ndata: ${JSON.stringify(payload)}\n\n`);
```

🔥 **Most Asked**: SSE vs WebSocket decision, auto-reconnection, event ID
🧠 **Strategy**: "SSE for server push. WebSocket for bidirectional. SSE is simpler and works better with HTTP/2"

---

## 278. WebTransport API — Next-Gen Real-Time ★

### Q: What is WebTransport and how does it improve on WebSocket?

**Answer (Interview-Ready):**
- **WebTransport** = new browser API for low-latency, bidirectional communication over HTTP/3 (QUIC)
- Addresses WebSocket limitations: head-of-line blocking, no multiplexing, TCP-only

| Feature | WebSocket | WebTransport |
|---------|-----------|-------------|
| Protocol | TCP | QUIC (UDP-based) |
| Head-of-line blocking | Yes (one stream) | No (multiple independent streams) |
| Multiplexing | No | Yes (multiple streams in one connection) |
| Datagrams | No | Yes (unreliable, low-latency) |
| Connection migration | No | Yes (QUIC feature) |

**Use cases:**
- Real-time gaming (datagrams for position updates)
- Video conferencing (separate streams for audio, video, data)
- Collaborative editing (multiple independent change streams)
- Live telemetry (some data can be dropped — datagrams)

**Status:** Chrome 97+ supports it. No Firefox/Safari yet (2024). Not ready for production use — use WebSocket with WebTransport as progressive enhancement

🔥 **Most Asked**: WebSocket vs WebTransport, when it matters, browser support
🧠 **Strategy**: "WebTransport is the future for high-performance real-time apps. Mention it to show you're tracking emerging APIs"

---

## 279. Real-Time UI Updates

### Q: How do you efficiently update the UI with real-time data?

**Answer (Interview-Ready):**

**Patterns:**
| Pattern | How | Use Case |
|---------|-----|----------|
| **Replace state** | On message, replace entire state object | Simple dashboard, single value updates |
| **Patch/Delta** | Server sends only changed fields, client merges | Large objects, minimal bandwidth |
| **Append** | Add new items to list | Chat messages, activity feed |
| **Optimistic + confirm** | Update UI immediately, confirm from server later | Chat send, like button |
| **Virtual list + stream** | Append to list but only render visible items | High-frequency log viewer, ticker |

**React real-time update pattern:**
```tsx
function useLiveData(channel) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket(`wss://api.com/${channel}`);
    ws.onmessage = (e) => {
      const update = JSON.parse(e.data);
      setData(prev => ({ ...prev, ...update }));  // Merge patch
    };
    return () => ws.close();
  }, [channel]);
  
  return data;
}
```

**Performance considerations:**
- Batch rapid updates: Don't re-render on every WebSocket message. Batch with `requestAnimationFrame` or debounce to 60fps
- Use `React.memo` / `useMemo` to prevent unnecessary rerenders of unchanged components
- For high-frequency data (stock ticker): virtualize the list, update only visible rows

🔥 **Most Asked**: Optimistic updates, batching strategies, preventing re-render storms
🧠 **Strategy**: "Batch real-time updates to 60fps. Use React.memo. For high-frequency, virtualize the list"

---

## 280. Reconnection & Backoff

### Q: How do you handle reconnection for real-time connections?

**Answer (Interview-Ready):**

**Reconnection strategy:**
```
1. Connection lost
2. Exponential backoff: 1s → 2s → 4s → 8s → 16s → ... → max 30s
3. Add jitter: actual_delay = delay + random(0, delay * 0.3)
4. Show "Reconnecting..." indicator to user
5. On reconnect: 
   a. Re-authenticate (token may have expired)
   b. Request missed data (send lastEventId or timestamp)
   c. Reconcile local state with server state
6. On successful reconnect: reset backoff, hide indicator
7. After N failures or max time: show "Connection failed" with manual retry button
```

**Handling missed messages:**
- **Sequence numbers**: Each message has incremental ID. On reconnect: `GET /events?since=lastId`. Server sends all missed events
- **Timestamp-based**: On reconnect, send `lastTimestamp`. Server sends events after that time
- **Full sync**: If too many missed → full state refresh instead of replaying events

**User experience:**
```
Online:         [Connected ✅] (green dot)
Reconnecting:   [Reconnecting... ⏳] (yellow, with animation)
Offline (temp):  [Offline 📴] (red) — show cached data
Failed:         [Connection lost. Retry?] (red, manual retry button)
```

🔥 **Most Asked**: Backoff strategy, handling missed messages, UX indicators
🧠 **Strategy**: "Exponential backoff with jitter + missed message reconciliation + clear UX feedback"

---

## 281. Handling Partial Failures

### Q: How do you handle partial failures in frontend applications?

**Answer (Interview-Ready):**
- **Partial failure** = some parts of the page load but others fail. E.g., main content loads but recommendations fail, or one API call out of 5 times out

**Error boundary pattern (React):**
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Header />  {/* If this fails, fallback shows */}
</ErrorBoundary>
<ErrorBoundary fallback={<RecommendationsFallback />}>
  <Recommendations />  {/* Isolated — failure doesn't break the page */}
</ErrorBoundary>
<Main />  {/* Unaffected by recommendation failure */}
```

**Strategies:**
| Strategy | When |
|----------|------|
| **Independent error boundaries** | Each widget/section handles its own errors |
| **Fallback data** | Show cached/default data when API fails |
| **Retry with indicator** | Show retry button in the failed section only |
| **Degrade gracefully** | Remove failed section, show rest of page |
| **Queue and process later** | For write operations, save locally and sync when service recovers |

**Parallel API calls with partial failure handling:**
```js
const results = await Promise.allSettled([
  fetchProfile(),
  fetchRecommendations(),
  fetchNotifications()
]);
// results[0].status === 'fulfilled' → use value
// results[1].status === 'rejected' → show fallback
```

🔥 **Most Asked**: Error boundaries, Promise.allSettled, fallback strategies
🧠 **Strategy**: "Isolate failures with error boundaries. Use Promise.allSettled for parallel calls. Never let one API failure break the entire page"

---

## 282. Optimistic Updates with Rollback

### Q: How do you implement optimistic UI updates with proper rollback?

**Answer (Interview-Ready):**
- **Optimistic update** = update the UI immediately (before server confirms). If server rejects → rollback to previous state

**Pattern:**
```tsx
function useLike(postId) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.likePost(postId),
    
    onMutate: async () => {
      // Cancel any outgoing queries
      await queryClient.cancelQueries(['post', postId]);
      // Save previous state for rollback
      const previous = queryClient.getQueryData(['post', postId]);
      // Optimistically update
      queryClient.setQueryData(['post', postId], old => ({
        ...old, likes: old.likes + 1, isLiked: true
      }));
      return { previous };  // Context for rollback
    },
    
    onError: (err, vars, context) => {
      // Rollback on failure
      queryClient.setQueryData(['post', postId], context.previous);
      toast.error('Failed to like. Please try again.');
    },
    
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['post', postId]);
    }
  });
}
```

**When to use optimistic updates:**
- ✅ Like/unlike, follow/unfollow (small impact if rollback)
- ✅ Send chat message (show immediately, mark as "sending")
- ✅ Toggle settings (instant feel)
- ❌ Payment/checkout (never optimistic — user expects confirmation)
- ❌ Delete operations (too risky to roll back)

🔥 **Most Asked**: TanStack Query mutation pattern, when to use, rollback mechanism
🧠 **Strategy**: "Optimistic updates for low-risk actions. Always save previous state for rollback. Revalidate after settlement"

---

## 283. Presence Indicators & Typing Indicators

### Q: How do you implement online/typing presence in a chat application?

**Answer (Interview-Ready):**

**Online presence:**
```
1. User connects → send "user_online" event
2. Server broadcasts presence to relevant users
3. Heartbeat every 30s: client sends "ping" → server updates last_seen
4. If no heartbeat for 60s → mark as "offline" → broadcast
5. Client disconnect → "user_offline" event (cleanup)
```

**Typing indicators:**
```js
// Client: Debounced typing event
let typingTimeout;
input.addEventListener('input', () => {
  ws.send({ type: 'typing_start', chatId, userId });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    ws.send({ type: 'typing_stop', chatId, userId });
  }, 3000);  // Stop after 3s of no typing
});

// Recipient: Show "User is typing..."
ws.onmessage = (event) => {
  if (event.type === 'typing_start') {
    showTypingIndicator(event.userId);
    // Auto-hide after 5s (safety net if stop event lost)
    setTimeout(() => hideTypingIndicator(event.userId), 5000);
  }
  if (event.type === 'typing_stop') {
    hideTypingIndicator(event.userId);
  }
};
```

**Scaling presence:**
- Don't fan-out to all users. Only send presence to users who are viewing the same chat/channel
- Use Redis pub/sub for cross-server presence (user on server A, viewer on server B)
- Batch presence updates (don't send individual events for 1000 users going online)

🔥 **Most Asked**: Presence heartbeat, typing debounce, scaling challenges
🧠 **Strategy**: "Debounce typing events (3s). Heartbeat for presence (30s). Fan-out only to relevant viewers"

---

## 284. Message Ordering

### Q: How do you ensure messages appear in the correct order in a real-time UI?

**Answer (Interview-Ready):**

**Challenges:**
- Messages arrive out of order (server processes in parallel)
- Network delays cause late-arriving messages
- Optimistic messages (shown immediately) may conflict with server-ordered messages

**Solutions:**
| Approach | How |
|----------|-----|
| **Server-assigned timestamps** | Server assigns definitive timestamp/sequence. Client sorts by server timestamp |
| **Sequence numbers** | Server increments counter per channel. Client inserts at correct position |
| **Lamport timestamps** | Logical timestamps for causal ordering (useful for distributed systems) |
| **Client-side sort** | Always sort messages by (`server_timestamp`, `client_timestamp`) before rendering |

**Handling out-of-order arrival:**
```js
function insertMessage(messages, newMessage) {
  // Binary search for insertion point based on server timestamp
  const index = binarySearch(messages, newMessage.serverTimestamp);
  return [...messages.slice(0, index), newMessage, ...messages.slice(index)];
}
```

**Optimistic message ordering:**
```
1. User sends message → insert with clientTimestamp, status="sending"
2. Server processes → assigns serverTimestamp, broadcasts
3. Client receives confirmation → update message with serverTimestamp, status="sent"
4. Re-sort list by serverTimestamp
```

🔥 **Most Asked**: Server vs client timestamps, optimistic message ordering
🧠 **Strategy**: "Server-assigned sequence numbers are the source of truth. Client-side timestamps are for optimistic display only"

---

## 285. Event De-duplication

### Q: How do you handle duplicate events in frontend real-time systems?

**Answer (Interview-Ready):**
- **Problem**: Network retries, reconnection with replay, at-least-once delivery → same event received multiple times

**De-duplication strategies:**

| Strategy | How |
|----------|-----|
| **Event ID set** | Maintain a Set of processed event IDs. Skip if already seen |
| **Idempotent operations** | Design handlers to produce same result regardless of repetition |
| **Sliding window** | Keep last N event IDs. Compact old ones to save memory |
| **Server-side dedup** | Server guarantees exactly-once delivery (expensive) |

**Implementation:**
```js
const processedEvents = new Set();
const MAX_EVENTS = 10000;

function handleEvent(event) {
  if (processedEvents.has(event.id)) return;  // Skip duplicate
  
  processedEvents.add(event.id);
  
  // Memory management: trim old events
  if (processedEvents.size > MAX_EVENTS) {
    const oldest = processedEvents.values().next().value;
    processedEvents.delete(oldest);
  }
  
  processEvent(event);
}
```

🔥 **Most Asked**: Why duplicates happen, dedup strategies, memory management
🧠 **Strategy**: "Client-side dedup with event ID Set + idempotent handlers as defense in depth"

---

## 286. Idempotency in Frontend Events

### Q: How do you make frontend event handling idempotent?

**Answer (Interview-Ready):**
- Idempotent UI handler = applying the same event multiple times produces the same UI state

**Examples:**
```js
// ❌ Not idempotent — duplicate event increments twice
function handleLikeEvent(event) {
  setLikes(prev => prev + 1);
}

// ✅ Idempotent — uses absolute value from server
function handleLikeEvent(event) {
  setLikes(event.totalLikes);  // Always set to server's value
}

// ✅ Idempotent — check before applying
function handleLikeEvent(event) {
  setLikes(prev => {
    if (prev.includes(event.userId)) return prev;  // Already liked
    return [...prev, event.userId];
  });
}
```

**Key principle:** Use **absolute state** from server (set to X) rather than **relative operations** (increment by Y)

🔥 **Most Asked**: Why idempotency matters in real-time UIs, absolute vs relative state
🧠 **Strategy**: "Set state to server-provided absolute values. Never increment/decrement based on events"

---

## 287. Conflict Resolution in Collaborative UIs

### Q: How do you handle conflicts when multiple users edit the same content simultaneously?

**Answer (Interview-Ready):**

| Algorithm | How | Used By |
|-----------|-----|---------|
| **OT (Operational Transformation)** | Transform operations against concurrent operations. Server-centric | Google Docs |
| **CRDT (Conflict-free Replicated Data Types)** | Data structures that merge without conflicts. Peer-to-peer | Figma, Yjs, Automerge |
| **Last-Writer-Wins** | Latest timestamp wins | Simple cases only |
| **Manual resolution** | Show both versions, user chooses | Git merge conflicts |

**CRDT (modern approach):**
```js
// Using Yjs (CRDT library)
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider('wss://server', 'room', ydoc);
const ytext = ydoc.getText('editor');

// Multiple users can edit simultaneously — auto-merges!
ytext.insert(0, 'Hello');  // User A
ytext.insert(5, ' World');  // User B (concurrent)
// Result: "Hello World" — no conflict!
```

**OT vs CRDT:**
| Aspect | OT | CRDT |
|--------|-----|------|
| Server | Required (central authority) | Optional (peer-to-peer possible) |
| Complexity | High (transform matrix grows with operation types) | Medium (well-defined merge rules) |
| Consistency | Strong (server determines order) | Eventual (all peers converge) |
| Latency | Higher (round-trip to server) | Lower (apply locally, sync async) |
| Undo | Complex (inverse transforms) | Natural (each user's ops are independent) |

**Libraries:** Yjs (CRDT), Automerge (CRDT), ShareDB (OT), Liveblocks, PartyKit

🔥 **Most Asked**: OT vs CRDT, how Google Docs works, Yjs implementation
🧠 **Strategy**: "CRDTs are the modern answer. Yjs for collaborative editing. OT is legacy (Google Docs) but still works"

---

# Part I — Scalability & Growth (Topics 288–303)

---

## 288. Designing for Millions of Users

### Q: How do you architect a frontend to scale to millions of concurrent users?

**Answer (Interview-Ready):**

| Layer | Strategy |
|-------|----------|
| **Assets** | CDN for static assets, fingerprinted filenames for cache-busting |
| **Bundle** | Code-split by route. Tree-shake. Target < 200KB initial JS |
| **Data** | Cache API responses (SWR/React Query). Paginate & virtualize lists |
| **Rendering** | SSR/SSG for first paint. Hydrate lazily. Stream HTML (React 18) |
| **State** | Avoid global state bloat. Use server state (TanStack Query) over client state |
| **Network** | HTTP/2 multiplexing. Preconnect/preload critical resources. Service Worker caching |
| **Monitoring** | RUM (Real User Monitoring) for P50/P95. Error tracking (Sentry). Resource budgets |

**Architecture for scale:**
```
User → CDN (static assets, SSR cache) → Edge Functions (personalization)
     → Load Balancer → API Gateway → Microservices
     
Frontend: Route-based splitting → Lazy components → Virtualized lists
         → Service Worker (offline + cache) → IndexedDB (local data)
```

🔥 **Most Asked**: CDN strategy, code splitting, caching layers
🧠 **Strategy**: "CDN-first for assets, server state management, code-splitting by route, virtualization for large lists"

---

## 289. CDN-First Architecture

### Q: How do you design a CDN-first frontend architecture?

**Answer (Interview-Ready):**

**CDN layers:**
```
1. Static assets (JS/CSS/images) → CDN with immutable cache (1 year, content-hashed)
2. HTML pages → CDN with short TTL (5 min) or stale-while-revalidate
3. API responses → Edge caching for public data (product listings, blog posts)
4. SSR output → Cache at edge with Vary headers (personalization key)
```

**Cache control strategy:**
```
# Immutable assets (hash in filename)
Cache-Control: public, max-age=31536000, immutable

# HTML documents
Cache-Control: public, max-age=0, must-revalidate
# Or: s-maxage=300, stale-while-revalidate=600

# API responses (public data)
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
Surrogate-Key: products, category-123  # For targeted purging
```

**Multi-CDN for resilience:**
- Primary: Cloudflare → Fallback: Fastly
- DNS-based failover or client-side detection (if primary fails, switch origin)

🔥 **Most Asked**: Cache headers for different asset types, cache invalidation, multi-CDN
🧠 **Strategy**: "Immutable cache for hashed assets. Short TTL + stale-while-revalidate for HTML. Surrogate keys for targeted purging"

---

## 290. Frontend Load Shedding

### Q: How does a frontend handle load shedding and graceful degradation under load?

**Answer (Interview-Ready):**

**Load shedding = intentionally dropping non-critical work when system is overloaded**

| Technique | When |
|-----------|------|
| **Disable non-critical features** | Analytics, recommendations, chat widget |
| **Reduce polling frequency** | Increase intervals from 5s → 30s → disable |
| **Skeleton/cached content** | Show stale data instead of loading indicators |
| **Queue user actions** | Batch writes instead of immediate API calls |
| **Circuit breaker** | Stop calling a failing API, show fallback UI |

```js
function useLoadShedding() {
  const [systemLoad, setSystemLoad] = useState('normal'); // normal | degraded | critical
  
  useEffect(() => {
    // Listen for server signals (custom header or WebSocket)
    const checkHealth = async () => {
      const res = await fetch('/api/health');
      const loadLevel = res.headers.get('X-System-Load');
      setSystemLoad(loadLevel);
    };
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return {
    showRecommendations: systemLoad === 'normal',
    showChat: systemLoad !== 'critical',
    pollingInterval: systemLoad === 'critical' ? 60000 : 5000,
  };
}
```

🔥 **Most Asked**: Load shedding strategies, feature flagging for degradation
🧠 **Strategy**: "Server signals load level via header/WebSocket. Frontend progressively disables features"

---

## 291. Rate Limiting at the UI Layer

### Q: How do you implement client-side rate limiting for API calls?

**Answer (Interview-Ready):**

```js
// Debounce: Wait until user stops (search input)
const debouncedSearch = debounce((query) => api.search(query), 300);

// Throttle: Max 1 call per interval (scroll events)
const throttledScroll = throttle(() => trackScroll(), 200);

// Request queue with concurrency limit
class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.queue = [];
    this.active = 0;
    this.maxConcurrent = maxConcurrent;
  }
  
  async add(requestFn) {
    if (this.active >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await requestFn();
    } finally {
      this.active--;
      if (this.queue.length > 0) this.queue.shift()();
    }
  }
}

// Token bucket for fine-grained rate limiting
class TokenBucket {
  constructor(maxTokens, refillRate) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = refillRate; // tokens per second
  }
  
  tryConsume() {
    this.refill();
    if (this.tokens > 0) { this.tokens--; return true; }
    return false;
  }
  
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
```

🔥 **Most Asked**: Debounce vs throttle, request queue, token bucket
🧠 **Strategy**: "Debounce for input, throttle for continuous events, request queue for API concurrency"

---

## 292. Feature Flags at Scale

### Q: How do you implement feature flags in a large-scale frontend application?

**Answer (Interview-Ready):**

**Architecture:**
```
Feature Flag Service (LaunchDarkly/Unleash/custom)
     ↓
SDK initializes at app start → fetches flags
     ↓
Flags cached locally (localStorage + in-memory)
     ↓
Real-time updates via SSE/WebSocket (flag changes without redeploy)
```

**Implementation:**
```tsx
// Feature flag provider
const FeatureFlagContext = createContext({});

function FeatureFlagProvider({ children }) {
  const [flags, setFlags] = useState({});
  
  useEffect(() => {
    // Initial fetch
    fetchFlags().then(setFlags);
    // Real-time updates
    const sse = new EventSource('/api/flags/stream');
    sse.onmessage = (e) => setFlags(prev => ({ ...prev, ...JSON.parse(e.data) }));
    return () => sse.close();
  }, []);
  
  return <FeatureFlagContext.Provider value={flags}>{children}</FeatureFlagContext.Provider>;
}

// Usage
function ProductPage() {
  const flags = useFlags();
  return flags.newCheckout ? <NewCheckout /> : <OldCheckout />;
}
```

**Best practices:**
- Remove flag code after full rollout (tech debt otherwise)
- Default to "off" for new features (safe default)
- Use percentage rollouts (1% → 10% → 50% → 100%)
- Server + client flags (server for API behavior, client for UI)

🔥 **Most Asked**: Architecture, real-time flag updates, percentage rollouts
🧠 **Strategy**: "Feature flag service → SDK → local cache → real-time updates. Remove flags after rollout"

---

## 293. A/B Testing Frontend Architecture

### Q: How do you architect A/B testing in a frontend application?

**Answer (Interview-Ready):**

| Component | Purpose |
|-----------|---------|
| **Assignment service** | Deterministic variant assignment (hash of userId + experimentId) |
| **SDK** | Client-side SDK provides variant for each experiment |
| **Analytics** | Track impressions + conversions per variant |
| **Stats engine** | Calculate statistical significance (backend) |

**Deterministic assignment:**
```js
function getVariant(userId, experimentId, variants = ['control', 'treatment']) {
  // Deterministic hash → same user always gets same variant
  const hash = murmurhash(`${userId}:${experimentId}`);
  const bucket = hash % 100;  // 0-99
  return bucket < 50 ? variants[0] : variants[1];
}
```

**Key architecture decisions:**
- **Server-side assignment** preferred (no flash of wrong content)
- **Client-side** acceptable for non-SEO pages (use feature flags)
- **Mutual exclusion**: user in experiment A shouldn't be in conflicting experiment B
- **Holdout groups**: 5% of users see no experiments (baseline measurement)

🔥 **Most Asked**: Deterministic assignment, avoiding bias, SPA vs SSR A/B testing
🧠 **Strategy**: "Hash-based deterministic assignment. Server-side preferred. Track both impressions and conversions"

---

## 294. Canary Releases & Progressive Rollouts

### Q: How do you implement canary releases and progressive deployment for frontend?

**Answer (Interview-Ready):**

**Canary release = deploy to a small % of users, monitor, expand if healthy**

```
Deployment pipeline:
1. Deploy to canary (1% traffic) → edge CDN serves new version to 1%
2. Monitor: error rate, LCP, CLS, API latency for 30 min
3. If healthy → 10% → 25% → 50% → 100%
4. If degraded → auto-rollback to previous version
```

**Implementation with CDN:**
```
# CDN edge logic (Cloudflare Workers / Vercel Edge Middleware)
if (hash(request.cookie.userId) % 100 < canaryPercent) {
  return fetch('https://cdn.example.com/v2/index.html');  // New version
} else {
  return fetch('https://cdn.example.com/v1/index.html');  // Stable
}
```

**Monitoring gates:**
- JS error rate < 0.5%
- LCP P75 < 2.5s
- CLS < 0.1
- API error rate unchanged
- Core business metrics (conversion, engagement) not degraded

🔥 **Most Asked**: Canary vs blue-green, monitoring gates, rollback triggers
🧠 **Strategy**: "CDN-level traffic splitting. Automated monitoring gates. Auto-rollback on degradation"

---

## 295. Internationalization (i18n)

### Q: How do you architect internationalization for a large-scale frontend application?

**Answer (Interview-Ready):**

**Architecture:**
```
Translation files (JSON per locale) → CDN/lazy-loaded per route
     ↓
i18n library (react-intl / i18next) → Context-based locale
     ↓
Components use translation keys → rendered text
```

**Lazy loading translations:**
```js
// Only load translations for current locale + current route
async function loadTranslations(locale, namespace) {
  const translations = await import(`./locales/${locale}/${namespace}.json`);
  i18n.addResourceBundle(locale, namespace, translations);
}

// Route-based splitting
<Route path="/checkout" loader={() => loadTranslations(locale, 'checkout')} />
```

**Best practices:**
| Practice | Why |
|----------|-----|
| Use ICU message format | Handles plurals, gender, number formatting across languages |
| Never concatenate translated strings | Word order varies by language |
| Design for 30-40% text expansion | German/Finnish text is much longer than English |
| Use locale-aware components | Date, number, currency formatting (`Intl` API) |
| Extract strings at build time | Automated extraction ensures nothing is missed |

```js
// ❌ Bad: concatenation
t('welcome') + ', ' + userName + '!'
// ✅ Good: ICU message format
t('welcome_user', { name: userName })
// "welcome_user": "Welcome, {name}!" (en)
// "welcome_user": "Bienvenue, {name} !" (fr)
```

🔥 **Most Asked**: Lazy-loading translations, ICU format, text expansion handling
🧠 **Strategy**: "Lazy-load translations per route. ICU message format. Design for text expansion. Use Intl APIs"

---

## 296. Theming & White-Labeling

### Q: How do you architect a themeable, white-label frontend application?

**Answer (Interview-Ready):**

**CSS Custom Properties approach (most scalable):**
```css
/* Theme definition */
:root {
  --color-primary: #0066cc;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --radius-md: 8px;
  --font-family: 'Inter', sans-serif;
}

[data-theme="dark"] {
  --color-primary: #4da6ff;
  --color-surface: #1a1a1a;
  --color-text: #f0f0f0;
}

/* Components use tokens, never raw values */
.button { background: var(--color-primary); border-radius: var(--radius-md); }
```

**White-labeling architecture:**
```
Tenant config (API/build-time) → CSS variables + logo + fonts
     ↓
ThemeProvider wraps app → injects CSS variables into :root
     ↓
Components use design tokens → automatically themed
```

```tsx
function ThemeProvider({ tenantId, children }) {
  const theme = useTenantTheme(tenantId); // Fetch from API or config
  
  useEffect(() => {
    Object.entries(theme.tokens).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  }, [theme]);
  
  return <>{children}</>;
}
```

**Best practices:**
- Design tokens layer: semantic (--color-primary) over raw values (#0066cc)
- Never hardcode colors, spacing, or fonts in components
- Theme config per tenant stored in DB or static JSON
- Support runtime theme switching (CSS variables update instantly)

🔥 **Most Asked**: CSS variables vs CSS-in-JS theming, white-label architecture, design tokens
🧠 **Strategy**: "CSS custom properties for theming. Semantic design tokens. Tenant config drives theme injection"

---

## 297. Multi-Tenant Frontend UI

### Q: How do you design a multi-tenant frontend application?

**Answer (Interview-Ready):**

| Approach | Isolation | Complexity | Use Case |
|----------|-----------|------------|----------|
| **Shared codebase, config-driven** | Low (shared runtime) | Low | SaaS products (Slack, Notion) |
| **Micro-frontends per tenant** | Medium | Medium | Different feature sets per tenant |
| **Separate deployments** | High | High | Enterprise clients needing full isolation |

**Shared codebase architecture:**
```
App Shell (common)
  ├── Auth (tenant-aware login)
  ├── ThemeProvider (tenant theme)
  ├── FeatureFlags (tenant features)
  ├── Routes (conditional based on tenant plan)
  └── API Layer (tenant ID in every request header)
```

**Tenant context:**
```tsx
// Detect tenant from subdomain: acme.app.com → "acme"
const tenantId = window.location.hostname.split('.')[0];

// Or from path: app.com/acme/dashboard → "acme"
const tenantId = window.location.pathname.split('/')[1];

// Tenant context for the entire app
const TenantContext = createContext(null);
function TenantProvider({ children }) {
  const tenant = useTenant(); // Fetches tenant config
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}
```

**Data isolation:** Every API call includes `X-Tenant-ID` header. Backend enforces row-level security.

🔥 **Most Asked**: Tenant detection (subdomain vs path), data isolation, feature gating per tenant
🧠 **Strategy**: "Shared codebase + config-driven per tenant. Subdomain detection. Every API call includes tenant ID"

---

## 298. RTL Layout Support

### Q: How do you implement right-to-left (RTL) layout support?

**Answer (Interview-Ready):**

**CSS Logical Properties (modern, preferred):**
```css
/* ❌ Physical (breaks in RTL) */
.card { margin-left: 16px; padding-right: 8px; text-align: left; }

/* ✅ Logical (works for both LTR and RTL) */
.card { margin-inline-start: 16px; padding-inline-end: 8px; text-align: start; }
```

**Logical property mapping:**
| Physical | Logical |
|----------|---------|
| `left` / `right` | `inline-start` / `inline-end` |
| `top` / `bottom` | `block-start` / `block-end` |
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |

**Setting direction:**
```html
<html dir="rtl" lang="ar">
```
```js
document.documentElement.dir = locale.startsWith('ar') || locale.startsWith('he') ? 'rtl' : 'ltr';
```

**Gotchas:**
- Icons with directional meaning (arrows) must be flipped: `transform: scaleX(-1)` in RTL
- Animations (slide-in) must reverse direction
- Third-party components may not support RTL — test thoroughly
- Use `[dir="rtl"]` selector for overrides when logical properties aren't enough

🔥 **Most Asked**: CSS logical properties, RTL gotchas, dynamic dir switching
🧠 **Strategy**: "CSS logical properties everywhere. Set dir attribute on html. Flip directional icons"

---

## 299. Locale-Aware Formatting

### Q: How do you handle locale-aware formatting for dates, numbers, and currencies?

**Answer (Interview-Ready):**

**Use the `Intl` API (built into every browser):**
```js
// Numbers
new Intl.NumberFormat('de-DE').format(1234567.89)  // "1.234.567,89"
new Intl.NumberFormat('en-US').format(1234567.89)  // "1,234,567.89"

// Currency
new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(1000)  // "￥1,000"
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(19.99) // "$19.99"

// Dates
new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date())  // "15 January 2025"
new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date())  // "January 15, 2025"

// Relative time
new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day')  // "yesterday"
new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(-1, 'day')  // "ayer"

// Lists
new Intl.ListFormat('en', { type: 'conjunction' }).format(['A', 'B', 'C'])  // "A, B, and C"
new Intl.ListFormat('en', { type: 'disjunction' }).format(['A', 'B', 'C']) // "A, B, or C"
```

**Best practices:**
- Never manually format dates/numbers — always use `Intl` APIs
- Store dates as ISO 8601 (UTC) — format at display time
- Store currency amounts as integers (cents) to avoid floating-point errors
- Use the user's browser locale as default, allow override in settings

🔥 **Most Asked**: Intl API usage, date/number formatting gotchas, storing vs displaying
🧠 **Strategy**: "Intl API for all formatting. Store UTC/cents. Format at display time using user's locale"

---

## 300. Edge Rendering & Edge Functions

### Q: How do edge functions and edge rendering improve frontend performance?

**Answer (Interview-Ready):**

| Concept | What | Example |
|---------|------|---------|
| **Edge Function** | Lightweight serverless function at CDN edge (< 10ms cold start) | Vercel Edge Functions, Cloudflare Workers |
| **Edge SSR** | Server-render HTML at the edge (closest to user) | Next.js Edge Runtime |
| **Edge Middleware** | Intercept requests at edge for routing, auth, A/B testing | Next.js Middleware |

**Use cases:**
```
Edge Middleware:
  - A/B testing (assign variant at edge, no layout shift)
  - Geo-based redirects (country → regional site)
  - Auth token validation (reject unauthorized before origin)
  - Bot detection & rate limiting
  - i18n locale detection

Edge SSR:
  - Personalized pages (user-specific content rendered at edge)
  - Dynamic OG images for social sharing
  - Real-time pricing / inventory display
```

**Limitations:**
- No Node.js APIs (no `fs`, limited `crypto`)
- Small bundle size limits (1-10 MB)
- No long-running processes
- Limited database access (use edge-compatible DBs: PlanetScale, Turso, D1)

🔥 **Most Asked**: Edge vs serverless vs traditional, use cases, limitations
🧠 **Strategy**: "Edge for latency-sensitive logic (auth, A/B, geo). Edge SSR for personalized pages. Mind the API limitations"

---

## 301. Geo-Based Content Delivery

### Q: How do you implement geo-based content delivery in a frontend application?

**Answer (Interview-Ready):**

**Geo detection methods:**
| Method | Accuracy | Speed |
|--------|----------|-------|
| **CDN headers** (`CF-IPCountry`, `X-Vercel-IP-Country`) | High | Instant (edge) |
| **IP geolocation API** | High | Adds latency |
| **Browser `navigator.geolocation`** | Highest | Requires permission |
| **User preference** | N/A | Instant (stored) |

**Implementation at edge:**
```js
// Vercel Edge Middleware
export function middleware(request) {
  const country = request.geo?.country || 'US';
  const city = request.geo?.city;
  
  // Redirect to regional site
  if (country === 'DE') return NextResponse.redirect('https://de.example.com');
  
  // Set locale cookie for client
  const response = NextResponse.next();
  response.cookies.set('geo_country', country);
  return response;
}
```

**Geo-based strategies:**
- Regional CDN: serve assets from nearest edge node (automatic with CDN)
- Content localization: show local currency, language, regulations
- Compliance: GDPR consent banner for EU users, CCPA for California
- Regional pricing: different prices per country (fetched at edge, not hardcoded)

🔥 **Most Asked**: CDN headers for geo, edge middleware, compliance implications
🧠 **Strategy**: "Use CDN geo headers at edge. Never rely solely on client-side detection. Respect compliance by region"

---

## 302. Handling Regional Failures & Failover

### Q: How do you handle regional failures in a global frontend application?

**Answer (Interview-Ready):**

**Multi-region strategy:**
```
Primary: us-east-1 → CDN edge (global)
Secondary: eu-west-1 → Hot standby
Tertiary: ap-southeast-1 → Warm standby

DNS: Route53 latency-based routing + health checks
CDN: Multi-CDN (Cloudflare primary, Fastly fallback)
API: Region-aware API URLs with automatic failover
```

**Frontend failover implementation:**
```js
const API_REGIONS = [
  'https://api-us.example.com',
  'https://api-eu.example.com',
  'https://api-ap.example.com'
];

async function resilientFetch(path, options) {
  for (const baseUrl of API_REGIONS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: AbortSignal.timeout(5000) // 5s timeout per region
      });
      if (response.ok) return response;
    } catch (e) {
      console.warn(`Region ${baseUrl} failed, trying next...`);
    }
  }
  throw new Error('All regions unavailable');
}
```

**User experience during failover:**
- Show banner: "We're experiencing issues. Some features may be slower."
- Serve stale content from Service Worker cache
- Queue write operations for later replay
- Disable non-critical features (analytics, recommendations)

🔥 **Most Asked**: Multi-region architecture, client-side failover, graceful degradation
🧠 **Strategy**: "Multi-region with DNS failover. Client-side region fallback chain. Service Worker for offline resilience"

---

## 303. Progressive Rollouts

### Q: How do you implement progressive feature rollouts in a frontend application?

**Answer (Interview-Ready):**

**Progressive rollout = gradually increasing the percentage of users who see a new feature**

**Stages:**
```
Stage 1: Internal dogfooding (employees only)           → 0.1%
Stage 2: Beta users (opt-in)                             → 1%
Stage 3: Canary (random 5%)                              → 5%
Stage 4: Regional rollout (one country first)            → 15%
Stage 5: Gradual expansion (monitor at each step)        → 50%
Stage 6: General availability                            → 100%
Stage 7: Remove feature flag + old code (cleanup)
```

**Implementation:**
```js
function shouldShowFeature(userId, featureId, rolloutPercent) {
  // Deterministic: same user always gets same result for same feature
  const hash = murmurHash(`${userId}:${featureId}`) % 100;
  return hash < rolloutPercent;
}

// Usage with monitoring
function FeatureGate({ featureId, children, fallback }) {
  const { userId } = useUser();
  const rollout = useFeatureRollout(featureId); // { percent: 25, enabled: true }
  
  if (!rollout.enabled) return fallback;
  if (!shouldShowFeature(userId, featureId, rollout.percent)) return fallback;
  
  // Track exposure for analytics
  trackExposure(userId, featureId, 'treatment');
  return children;
}
```

**Monitoring gates between stages:**
- Error rate: must not increase > 0.1%
- Performance: LCP must not degrade > 10%
- Business metrics: conversion rate must not drop > 2%
- User complaints: support ticket volume baseline

**Rollback triggers:**
- Any monitoring gate breached → automatic rollback to 0%
- Alerts fire → on-call reviews → manual rollback if needed
- "Kill switch" — instantly disable feature for all users

🔥 **Most Asked**: Deterministic hashing, monitoring gates, rollback strategy
🧠 **Strategy**: "Deterministic hash-based bucketing. Monitor at every stage. Automated rollback gates. Kill switch for emergencies"

---

# Coverage Summary — File 03

| Section | Topics | Count |
|---------|--------|-------|
| Part A: Messaging Systems | 93–102 | 10 |
| Part B: Distributed Systems | 103–108 | 6 |
| Part C: Resilience & Fault Tolerance | 109–118 | 10 |
| Part D: APIs, Security & Governance | 119–127 | 9 |
| Part E: Observability & Operations | 128–135 | 8 |
| Part F: Frontend Security | 240–244 | 5 |
| Part G: Authorization & Access Control | 245–274 | 30 |
| Part H: Real-Time Systems | 275–287 | 13 |
| Part I: Scalability & Growth | 288–303 | 16 |
| **Total** | | **107** |

---

| ← Previous | [00_MASTER_INDEX.md](00_MASTER_INDEX.md) | Next → |
|:---|:---:|---:|
| [02_Architecture_Databases.md](02_Architecture_Databases.md) | **File 03 of 10** | [04_Backend_Case_Studies.md](04_Backend_Case_Studies.md) |
