# Kafka Producer — Acks, Retries, Idempotence 🆕
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- The Kafka producer is responsible for reliably delivering events to Kafka brokers. Three settings control the durability-performance trade-off: **acks**, **retries**, and **enable.idempotence**.
- **acks** (acknowledgment level) controls how many brokers must confirm a write before the producer considers it done. `acks=0` — fire and forget (fastest, any data loss). `acks=1` — only the leader confirms (moderate, can lose data on leader failure before replication). `acks=all` (or `-1`) — all in-sync replicas must confirm (safest, no data loss).
- **retries** — how many times the producer re-sends on failure. With retries > 0 and acks=all, you can have duplicate events if a write succeeded on the broker but the ACK was lost in the network. The producer doesn't know if the broker got it — it sends again.
- **enable.idempotence=true** solves the duplicate problem: the producer assigns each message a unique sequence number. If the broker already received this sequence number, it ignores the duplicate. Set `acks=all` + `enable.idempotence=true` together for at-least-once which is functionally exactly-once at the producer level.
- Batching: the producer doesn't send one event at a time. It accumulates events in a buffer (`batch.size`) and sends them together or after a time window (`linger.ms`). Batching dramatically increases throughput. `linger.ms=5` means "wait up to 5ms for more events to batch together before sending."
- Gap to bridge: 🆕 — many candidates know acks exists but cannot explain what happens at each level, why idempotence matters, or why producer batching exists.

---

## 1. One-Line Definition
The Kafka producer sends events to broker partitions with configurable durability (acks level), automatic retry on transient failures, and optional idempotence (deduplication via sequence numbers) — controlling the trade-off between throughput, latency, and exactly-once write guarantees.

---

## 2. The Problem It Solves

You are publishing payment events to Kafka. The payment service writes `payment.processed` and users see their payment confirmed. This event must reach Kafka exactly once — not zero times (lost payment), not twice (double accounting).

Problem 1 (loss): You send an event, the broker receives it, the leader writes it, but then the leader crashes before replicating to followers. A follower becomes the new leader. The event is gone — it was only on the crashed leader's in-memory buffer. This is acks=1 data loss.

Problem 2 (duplicate): You send an event, the broker writes it and replicates, but the ACK response is lost in the network. The producer times out waiting for acknowledgment and retries. Broker receives the same event again — now you have two identical payment events in the log.

`acks=all` solves Problem 1: all replicas confirm before the producer gets the OK. If the leader crashes, a follower already has the event and becomes the new leader without data loss.

`enable.idempotence=true` solves Problem 2: each event has a producer ID and sequence number. The broker rejects any event it has already seen (same producerId + sequenceNum). Safe retries, no duplicates.

---

## 3. How It Works Internally

### The Mental Model
Think of the Kafka producer like a certified letter service. `acks=0` = drop the letter in the mailbox (no confirmation). `acks=1` = get a receipt from the local post office only. `acks=all` = get confirmation that the letter arrived at all 3 delivery locations (primary + 2 backups). Idempotence = letter has a unique serial number; if you send the same letter twice by mistake, the destination returns "already received this one — discarding duplicate."

### Acks — Three Levels

```
acks=0 (Fire and forget):
  Producer: "Here's the event. Goodbye."
  No response from broker. Highest throughput. Any data loss is silent.
  Use when: telemetry data where occasional loss is acceptable (metrics, logs)
  Never use for: financial events, order events, critical state changes

acks=1 (Leader acknowledgment):
  Producer: "Here's the event."
  Broker leader: "Got it. Wrote to my log." → ACK
  Producer: stores result, done.
  Problem: leader acknowledges BEFORE replicating to followers.
  If leader crashes after ACK but before replication:
    - Follower becomes leader
    - Event is GONE (was only in the now-dead leader's memory)
    - Producer thinks it succeeded. Silent data loss.
  Use when: very high throughput and moderate durability needs (analytics, logging)

acks=all (All in-sync replicas — recommended for production):
  Producer: "Here's the event."
  Broker leader: writes to log, waits for ALL in-sync replicas (ISR) to confirm.
  ALL ISR replicas: confirm receipt.
  Leader: ACK sent to producer.
  If leader crashes: a follower already has the event. New leader has the data.
  No data loss possible as long as at least 1 in-sync replica survives.
  Cost: higher write latency (leader must wait for replica ACKs before responding)
  Use when: payment events, order events, any business-critical data

Recommended producer baseline:
  acks=all
  min.insync.replicas=2  (broker-side: fail the write if fewer than 2 replicas are in-sync)
  replication.factor=3   (per-topic: 3 copies across 3 brokers)

  With these 3 settings: can lose 1 broker and still have no data loss and no write failures.
```

### Retries and Idempotence

```
WITHOUT IDEMPOTENCE:

Producer sends event #42 → Broker writes it → ACK lost in network
                                              → Producer times out, retries
Producer sends event #42 again → Broker gets it again
Broker: "I've never seen this before. Write it."
Result: event #42 appears TWICE in the partition log.
Consumer sees the same payment event twice.

WITH IDEMPOTENCE (enable.idempotence=true):

Producer is assigned a unique ProducerID (PID) on startup → e.g., PID=7
Each event gets a sequence number (monotonically increasing) → seq=15

Producer sends {PID=7, seq=15, event=#42} → Broker writes, ACK lost
Producer retries {PID=7, seq=15, event=#42}
Broker checks: "Have I seen PID=7, seq=15 before? YES."
Broker: discards duplicate silently. Does NOT write again.
Result: event #42 appears EXACTLY ONCE in the partition log.

REQUIREMENTS for idempotence:
  enable.idempotence=true  (automatically sets acks=all and retries=MAX_INT)
  max.in.flight.requests.per.connection <= 5
  (More than 5 in-flight batches can cause out-of-order delivery even with idempotence)
```

### Producer Batching — Throughput Optimisation

```
WITHOUT BATCHING:
  Producer sends 1 event → 1 network round trip → 1 broker write
  Producer sends 100 events → 100 round trips → 100 writes
  100x network overhead

WITH BATCHING (default):
  Producer accumulates events in an in-memory buffer per partition
  
  Batch triggers:
  1. batch.size reached (default: 16KB) → send immediately
  2. linger.ms elapsed (default: 0ms) → send whatever's buffered

  linger.ms=0: send as soon as a thread is available (minimal latency, small batches)
  linger.ms=5: wait up to 5ms = "collect more events for this partition, then send together"
              At 1000 events/sec: 5ms window collects ~5 events per batch
              At 100K events/sec: 5ms window collects ~500 events per batch
              Much larger batches → much better compression → much less I/O

  COMPRESSION:
  compression.type=snappy (or lz4): compress each batch before sending
  Snappy: fast compression, ~4x size reduction
  lz4: slightly faster than snappy
  gzip: best compression ratio, most CPU intensive
  Compressed batches transfer faster over the network and take less disk space on the broker.
  For high-throughput topics: compression is almost always worth enabling.
```

### ASCII Diagram — acks=all Write Path

```
PRODUCER                   BROKER LEADER           FOLLOWER 1    FOLLOWER 2
────────                   ─────────────           ──────────    ──────────
                           (Partition Leader)       (ISR)         (ISR)

send(event, acks=all) ──►
                          write to leader log
                          replicate ──────────────► write
                          replicate ──────────────────────────►  write
                                    ◄──────────── ACK from F1
                                    ◄──────────────────────────  ACK from F2
                          ALL ISR confirmed
                          ◄── ACK to producer
Producer: success, move on
──────────────────────────────────────────────────────────────────────────────
If LEADER crashes after write but before ISR confirmation:
  → New leader (was follower) already has the event → no data loss

If LEADER crashes after ACK:
  → Producer has confirmation. Follower has the data. Success.

If FOLLOWER crashes (but leader and 1 other follower are up):
  → ISR shrinks to 2. min.insync.replicas=2 still satisfied. Write succeeds.

If 2 BROKERS crash simultaneously (only 1 of 3 up):
  → ISR < min.insync.replicas=2 → broker returns NotEnoughReplicasException
  → Producer retries. Write blocked until more replicas are available.
  → This is correct: better to block than to acknowledge a write that may be lost.
```

---

## 4. The Code

### Wrong Way — Default Producer (Data Loss Risk)

```java
// Wrong: no acks, no idempotence configuration
// Default acks=1 → data loss on leader failover
// Default retries=0 in older Spring Kafka → no retry on transient failure
// Default no idempotence → duplicate events on retry
@Bean
public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> factory) {
    return new KafkaTemplate<>(factory);
    // Missing: acks, retries, idempotence, compression
}
```
> **Why this fails in production:** With acks=1, a Kafka leader failover during high write volume loses events written to the leader but not yet replicated. At scale (100K events/day), this becomes a business problem: missing payment events, missing order confirmations.

### Right Way — Production-Grade Producer Configuration

```java
// application.yml — producer settings
spring:
  kafka:
    producer:
      bootstrap-servers: kafka-1:9092,kafka-2:9092,kafka-3:9092

      # Key serializer: orderId is a String key
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      # Value serializer: event object to JSON
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

      # DURABILITY:
      # acks=all: all in-sync replicas must confirm before ACK is sent to producer
      # The most important single producer setting for data safety.
      acks: all

      # RELIABILITY:
      # Integer.MAX_VALUE retries: keeps retrying transient failures
      # With idempotence enabled, retries are safe (no duplicates)
      retries: 2147483647

      # IDEMPOTENCE:
      # enable.idempotence=true: assigns PID + sequence numbers to detect duplicates
      # Automatically sets acks=all and retries=MAX_INT if not already set.
      properties:
        enable.idempotence: true
        # No more than 5 in-flight batches (required for idempotence correctness)
        max.in.flight.requests.per.connection: 5
        # Wait up to 5ms to accumulate a batch before sending
        # (better throughput at the cost of minimal additional latency)
        linger.ms: 5
        # Compress batches with snappy (fast + good compression ratio)
        compression.type: snappy
        # Delivery timeout: how long total to keep retrying before giving up
        # Must be greater than request.timeout.ms * retries
        delivery.timeout.ms: 120000  # 2 minutes total retry window
```

```java
// Producer service with error handling and callback
@Service
public class EventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    public EventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(String topic, String key, Object event) {
        // kafkaTemplate.send() is non-blocking — returns a CompletableFuture
        // Use callback to log success/failure asynchronously
        kafkaTemplate.send(topic, key, event)
            .whenComplete((result, ex) -> {
                if (ex == null) {
                    RecordMetadata meta = result.getRecordMetadata();
                    log.debug("Published to topic={}, partition={}, offset={}",
                        meta.topic(), meta.partition(), meta.offset());
                } else {
                    // All retries exhausted (delivery.timeout.ms exceeded)
                    // This is a genuine failure — alert, dead-letter, or compensate
                    log.error("FAILED to publish event to topic={}, key={}", topic, key, ex);
                    // In production: use Outbox Pattern to prevent this failure
                    // See Topic 79 — Outbox Pattern
                    deadLetterQueue.record(topic, key, event, ex.getMessage());
                }
            });
    }

    // Synchronous publish (for testing or when you MUST know before proceeding)
    public void publishSync(String topic, String key, Object event) {
        try {
            kafkaTemplate.send(topic, key, event).get(10, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            throw new KafkaPublishException("Publish timed out after 10s", e);
        } catch (ExecutionException e) {
            throw new KafkaPublishException("Publish failed", e.getCause());
        }
    }
}
```

> **Key decisions here:**
> - `enable.idempotence=true` is the single most important producer setting — it automatically enforces acks=all and safe retries
> - Never use `kafkaTemplate.send().get()` in the hot path (synchronous blocking waits for broker ACK on every message) — use async callbacks
> - Set `delivery.timeout.ms` long enough for the retry window but not so long that a failed publish blocks forever
> - The Outbox Pattern (Topic 79) is the right tool for guaranteeing a publish never silently fails without compensation

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What does acks=all mean in a Kafka producer, and when would you use it?"

**Hruday's answer:**
> acks=all means the Kafka broker leader will only send an acknowledgement to the producer after all in-sync replicas (ISR) have confirmed they received and wrote the event. By default, a Kafka topic has a replication factor of 3 — one leader and two followers. With acks=all, all three must confirm before the producer receives success.
>
> This eliminates data loss on leader failure. If the leader writes an event and immediately crashes before replication, a follower becomes the new leader. Without acks=all, the ACK was sent when only the leader wrote it — the new leader doesn't have the event. With acks=all, the ACK only goes out after followers confirmed receipt — so the new leader already has the data.
>
> The cost is slightly higher write latency — the producer must wait for follower acknowledgements before proceeding. For most business-critical events — orders, payments, user registrations — this extra latency (typically a few extra milliseconds) is well worth the durability guarantee.
>
> I use acks=all together with min.insync.replicas=2 on the broker side and enable.idempotence=true on the producer side. This trio eliminates both data loss and duplicates.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Kafka producer idempotence work and what does it NOT protect against?"

**Hruday's answer:**
> With idempotence enabled, the Kafka cluster assigns a unique Producer ID (PID) to each producer instance on startup. Every message the producer sends also gets a sequence number that monotonically increases per partition. The broker tracks the last sequence number it received from each PID for each partition.
>
> When the broker receives a message with PID=7, partition=2, seq=100, and it already has seq=100 for this PID on this partition — it knows this is a retry of an already-written event. It discards the duplicate without writing it again and sends back an ACK. From the producer's perspective: the write succeeded. In reality: it was a duplicate that was safely dropped.
>
> What idempotence does NOT protect against: cross-partition duplicates. If a message is sent, the producer crashes, restarts with a new PID, and retries — the sequence numbers are different. The broker doesn't recognise it as a duplicate. For exactly-once across multiple partitions or across consumer processing, you need Kafka transactions — a stronger guarantee that uses a transactional.id to span multiple partition writes atomically.
>
> Also: consumer-side duplicates. Idempotence ensures the message is written to Kafka exactly once. But if the consumer processes the message and then crashes before committing the offset, Kafka re-delivers it — the message is now processed twice. For full end-to-end exactly-once, you need transactional consumers AND idempotent consumer logic.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use acks=1 instead of acks=all?"

**Hruday's answer:**
> acks=1 is appropriate for high-throughput data where some data loss is acceptable and where the cost of acks=all's additional latency makes the use case impractical.
>
> The classic example: high-frequency application metrics or logging events. If you're publishing 500,000 metric events per second (CPU usage, request rates, error counts), the occasional loss of a few metrics during a broker leader failover is irrelevant — you have millions of other data points. Using acks=all adds follower replication latency to every single one of those 500K writes per second, adding thousands of milliseconds of cumulative latency per second across your fleet.
>
> Another example: analytics event streams where the dashboard shows aggregate trends. If you lose 100 click events out of 10 million during a broker restart, the trend lines are accurate to 99.999%. No one cares.
>
> Where I will NOT use acks=1: financial transactions, order events, user registration events, authentication events, any event that directly drives business state. For these, acks=all is non-negotiable. The extra 5-15ms of write latency is invisible to the user and buys you durability that would otherwise require a painful recovery process after a broker failure.

---

### Q4 — Scenario
**Interviewer asks:** "You're building an order service that publishes events to Kafka. The order data is saved to PostgreSQL and the event is published to Kafka. How do you ensure both operations succeed or both fail?"

**Hruday's answer:**
> This is the dual-write problem — coordinating a database write with a Kafka publish. The naive approach has a gap: save to PostgreSQL, then publish to Kafka. If the Kafka publish fails: order is in the DB but the downstream services (restaurant, driver, notifications) never hear about it. Silent failure.
>
> The solution is the Outbox Pattern. Instead of publishing to Kafka directly from the order service, you write the event to an "outbox" table in the same PostgreSQL transaction as the order. A separate process (a change data capture connector like Debezium, or a polling publisher) reads new rows from the outbox table and publishes them to Kafka.
>
> Since the outbox write is part of the same database transaction, either both the order and the outbox record commit, or both roll back. You never have an order without a pending event publication. The outbox processor then reliably delivers to Kafka with retries. Once Kafka confirms receipt, the processor marks the outbox row as published or deletes it.
>
> With this pattern: (1) database and event are always consistent — atomicity from PostgreSQL; (2) Kafka publish eventually succeeds with retries — at-least-once delivery; (3) idempotent consumers handle the occasional duplicate. This is the industry-standard approach at Swiggy, Razorpay — anywhere that needs exactly-once event semantics between a database and Kafka.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "acks=1 is fine — leader won't crash during a write" | "The leader rarely crashes, so acks=1 is safe enough" | "Leader crashes are not rare in a long-lived production system. Broker restarts for upgrades, hardware failures, OOM kills — all trigger leader elections. At 1 million events per day, even 0.01% loss from acks=1 during monthly maintenance windows is 100 lost events per day. For payment events: 100 lost payment confirmations = customer service nightmare. acks=all adds ~5ms per write. The cost is justified for any business-critical event." |
| "Retries cause duplicates" | "I keep retries=0 to avoid sending duplicates" | "retries=0 doesn't prevent duplicates — it prevents DETECTING a missing delivery and retrying. If a write succeeded and the ACK was lost, you won't retry — but you also won't KNOW the write succeeded. Your publisher sees a failure, the event is in Kafka, and you have to manually investigate. The better choice: retries=MAX_INT + enable.idempotence=true. Safe retries with duplicate detection at the broker. You always get delivery and you never get duplicates." |
| "linger.ms=0 is safest" | "I'll keep linger.ms=0 to send events as fast as possible" | "linger.ms=0 means send immediately — one network round trip per event. At 10,000 events/second, that's 10,000 round trips per second, 10,000 broker writes per second. linger.ms=5 collects up to 5ms of events into batches — at the same rate, that's ~50 events per batch, 200 round trips per second. 50x reduction in network pressure. The 5ms additional latency is invisible for asynchronous processing. Only use linger.ms=0 when your events are infrequent and latency is more critical than throughput." |
| "Publish inside the same @Transactional method" | "I'll do repository.save(order) and kafkaTemplate.send() in the same @Transactional method" | "@Transactional covers only the database transaction — not Kafka. If kafkaTemplate.send() is called inside @Transactional and then the database transaction rolls back (on an exception), the Kafka publish already happened. The event is in Kafka. The order is not in the database. Downstream services try to process an order that doesn't exist. Always separate Kafka publishing from database transactions, or use the Outbox Pattern which puts a record in the database as part of the transaction instead of publishing to Kafka directly." |

---

## 7. Hruday's Real Experience Hook

> "Producer configuration is a gap I'm bridging specifically for Kafka interviews. The concept of idempotence resonated immediately from my work on REST API design at Oracle — we designed idempotent PUT endpoints so that clients could safely retry without causing double-updates. The same principle in Kafka producers: enable.idempotence=true means the producer can safely retry any send and the broker will deduplicate. The acks=all + idempotence combination is exactly what you'd want for an order or payment event — the same level of care as a PUT to a REST endpoint that charges a customer. I've started applying this thinking to evaluate all event publishers: 'what happens if this send fails and we retry?'"

---

## 8. Scale Evolution

**1,000 users →** acks=all with default settings is fine. Throughput needs are minimal. No batching tuning needed.

**100,000 users →** Enable compression (snappy). Set linger.ms=5. Monitor produce latency metrics. Watch for ISR shrink events — a follower falling out of the ISR causes acks=all failures. Set min.insync.replicas=2 broker-side.

**10 million users →** Fine-tune batch.size (128KB-512KB for high-throughput topics), linger.ms (5-20ms), and buffer.memory per producer. Monitor producer metrics: record-send-rate, request-latency-avg, record-error-rate. Multiple producer instances with separate transactional.id values for transaction-safe publishing. Async callbacks vs. fire-and-forget chosen per event type based on criticality.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment events MUST be durable. acks=all + idempotence is the baseline. Interviewers will ask "what if Kafka publish fails?" to test whether you know about Outbox Pattern. | "Walk through how you guarantee a payment event reaches Kafka exactly once, even during broker failures." |
| Swiggy / Meesho | Order events at peak throughput (millions/hour during dinner rush). Producer batching and compression tuning makes a measurable difference. | "Peak order volume hits 500K/hour. How do you tune your Kafka producers to handle this without latency spikes?" |
| Adobe / Microsoft | Document processing events — large batches, complex schemas. Compression type matters at scale. Schema evolution with Schema Registry. | "Your producers send complex JSON events averaging 2KB each at 50K events/sec. How do you optimise producer throughput?" |
| SAP Labs (current) | Event-driven financial document processing currently by polling. Migrating to Kafka — producer reliability is the first concern: no financial event can be lost or duplicated. | "How do you ensure that a financial document event published to Kafka is never lost, even if the Kafka producer service crashes mid-publish?" |

---

## 10. Related Topics — What to Study Next

- **Topic 79 — Outbox Pattern** — the production-grade solution to the dual-write problem raised in Q4; the Outbox Pattern is the standard answer to "how do you guarantee DB + Kafka consistency"
- **Topic 109 — Kafka Consumer Delivery Guarantees** — the producer guarantees discussed here (idempotence, acks) work together with consumer-side offset management for end-to-end exactly-once semantics
- **Topic 121 — Idempotency Design** — Part 6 covers idempotent consumer design — necessary because even with producer idempotence, consumer-side re-delivery requires the consumer to handle duplicate processing safely
- **Topic 110 — Kafka Retention and Compaction** — the broker side: what happens to events after they're written; retention policy affects replay capability which depends on events surviving long enough

---

*Part 6 · Kafka Producer — Acks, Retries, Idempotence · Full Stack Interview Guide · Hruday D · 2026*
