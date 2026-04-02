# Kafka Retention and Compaction
> Part 6 — Messaging & Event-Driven Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Kafka stores events on disk until deleted by a **retention policy**. Two types: **time-based** (delete events older than N days/hours — default 7 days) and **size-based** (delete oldest events when partition exceeds N bytes). Both can be set together — whichever limit is hit first triggers deletion.
- Retention is what enables replay. A new consumer group can read events from 7 days ago. If retention is 7 days, events older than 7 days are gone forever. Retention must be long enough for: (1) consumers to catch up after a crash; (2) new services to onboard by reading historical events; (3) re-processing after a bug fix.
- **Log compaction** is a DIFFERENT retention strategy — it keeps only the LAST event per message key. Old events are overwritten by newer ones with the same key. Think of it as "update-in-place semantics" for an event log. Useful for: current state reconstruction per entity (user profile, device config).
- Compaction does NOT delete events based on time — it deletes them based on key uniqueness. If a key has 100 updates, only the latest is retained. A key with a null value (tombstone) means "delete this key entirely."
- Choosing between time-based and compaction: use **time-based** for event streams where history matters (payments, orders, activity feeds). Use **compaction** for "source of truth" topics where only the latest state per entity matters (user settings, device last-known-location).
- Gap to bridge: many candidates don't know compaction exists or confuse it with time-based retention. Interviewers at companies using Kafka for CDC (Change Data Capture) or event sourcing specifically ask about this.

---

## 1. One-Line Definition
Kafka retention controls when events are deleted from topic partitions — either by time or size (delete old events) or by key (compaction: keep only the latest event per key) — balancing storage cost against the ability to replay events and reconstruct state.

---

## 2. The Problem It Solves

You're building a system that tracks user profile updates. Every time a user changes their email, name, or preferences, you publish a `user.updated` event to Kafka. Now the Analytics Service onboards three months later and wants to build a user profile snapshot database.

Without smart retention: with 7-day time-based retention, only 7 days of profile changes are available. The Analytics Service can only reconstruct profiles for users who changed something in the last week. Users who haven't changed anything in 3 months — no data. Incomplete picture.

With compacted retention: Kafka keeps the last `user.updated` event per userId. The Analytics Service reads ALL users' latest state, no matter how old. It gets a complete snapshot of every user's current profile, regardless of when the last update was. Storage is bounded too — one event per user, not the full history.

The second problem: storage cost. A payment platform with 1 million transactions per day at 1KB average event size accumulates 1GB of data per day. At 7-day retention: 7GB. Fine. But what if you want 30-day retention for replay and compliance? 30GB per topic. For a platform with 50 Kafka topics: 1.5TB. Retention policy is storage planning.

These two problems — replay capability and storage cost — are what retention and compaction let you balance.

---

## 3. How It Works Internally

### The Mental Model
Think of a Kafka partition as a newspaper archive room. **Time-based retention** is the librarian throwing away papers older than 7 days to free shelf space. **Size-based retention** is the librarian throwing away the oldest papers whenever the room gets full. **Compaction** is the librarian going through all the papers and, for any topic covered multiple times, keeping only the most recent article about it. If there are 10 articles about "User 42's email address," compaction keeps only the latest — the others are shredded.

### Time-Based Retention

```
CONFIGURATION (per topic):
retention.ms = 604800000   (7 days in milliseconds — default)
OR
retention.hours = 168      (7 days in hours — shorthand)
retention.minutes = 10080  (also 7 days)

HOW IT WORKS:
1. Events are appended to partition segment files (each file is a segment)
2. Kafka's log cleaner runs periodically
3. It checks the OLDEST SEGMENT: if the last event in the segment is
   older than retention.ms → delete the ENTIRE segment file
4. Individual events within a segment cannot be deleted — only whole segments
5. The active (current write) segment is never deleted

SEGMENT SIZE:
segment.bytes = 1073741824  (default: 1GB per segment file)
OR
segment.ms = 604800000      (roll a new segment after 7 days even if not full)

IMPLICATION: with default 1GB segments and 7-day retention,
the segment that contains "exactly 7 days ago" event will NOT be deleted
until the LAST event in that segment is older than 7 days.
Actual retained data may be slightly more than 7 days.
```

### Size-Based Retention

```
CONFIGURATION:
retention.bytes = 10737418240  (delete oldest segments when partition > 10GB)
retention.bytes = -1           (default: no size limit — only time applies)

COMBINATION:
With retention.ms=604800000 AND retention.bytes=5368709120:
  Whichever limit is reached FIRST causes deletion.
  If the partition fills 5GB in 3 days: 3-day-old data starts being deleted.
  If it never fills 5GB: time-based 7-day rule applies.
```

### Log Compaction — Key-Based Retention

```
CONFIGURATION:
cleanup.policy=compact         (instead of default "delete")
OR
cleanup.policy=compact,delete  (BOTH: compact AND delete after time — hybrid)

HOW COMPACTION WORKS:
1. Kafka assigns LogCleaner threads that run in the background
2. The partition is divided into:
   - "clean" tail: already compacted
   - "dirty" head: new records since last compaction
3. LogCleaner processes the dirty head:
   - For each key, keeps only the LATEST record
   - All earlier records for the same key are removed
   - New compacted, smaller segment replaces the dirty head
4. After compaction: at most one record per unique key

TOMBSTONE RECORDS (deleting a key):
  Producer sends: key="user:42", value=null
  This is a tombstone — marks the key for deletion.
  After next compaction: ALL records for key "user:42" are removed.
  Including the tombstone itself (after delete.retention.ms period).

WHAT CONSUMERS SEE:
  A consumer reading from the beginning of a compacted topic will see
  the latest value for each key. It will NOT see the history.
  Exception: if the consumer is caught up and reading in the dirty head
  (not yet compacted), it may see multiple versions of the same key.

KEY RULE: Only use compaction when consumers only need CURRENT STATE.
          If consumers need HISTORY — use time-based retention.
```

### ASCII Diagram — Compaction Process

```
TOPIC "user.profile" BEFORE COMPACTION:
Partition 0:

Offset: 0        1        2        3        4        5        6
Key:    user:42  user:99  user:42  user:17  user:99  user:42  user:17
Value:  {v1}     {v1}     {v2}     {v1}     {v2}     {v3}     {v2}

                ↑                 ↑                  ↑
      user:42 has 3 versions.  user:99 has 2.  user:17 has 2.

AFTER COMPACTION (log cleaner runs):

Offset: 2*       5*       4*       6*
Key:    user:42  user:99  user:99  user:17
Value:  skip     skip     {v2}     {v2}

Final compacted log:
Offset: 4        5        6
Key:    user:99  user:42  user:17
Value:  {v2}     {v3}     {v2}

Only the LATEST record per key is retained.
Offset numbers are preserved (no re-numbering) — gaps are expected.

CONSUMER READING FROM BEGINNING:
  Sees: user:99 latest, user:42 latest, user:17 latest
  Perfect for bootstrapping a state store from scratch.
```

---

## 4. The Code

### Configuration — Time-Based Retention

```java
// Creating a topic with custom retention via Spring Kafka
@Configuration
public class KafkaTopicConfig {

    // Topic with 30-day retention for payment events (compliance requirement)
    @Bean
    public NewTopic paymentEventsTopic() {
        return TopicBuilder.name("payment.processed")
            .partitions(12)
            .replicas(3)
            .config(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(
                Duration.ofDays(30).toMillis()  // 30 days in milliseconds
            ))
            // Also cap at 50GB total — whichever hits first
            .config(TopicConfig.RETENTION_BYTES_CONFIG, String.valueOf(
                50L * 1024 * 1024 * 1024  // 50GB
            ))
            .build();
    }

    // Short-lived topic for temporary coordination events (OTP, session events)
    @Bean
    public NewTopic otpEventsTopic() {
        return TopicBuilder.name("otp.generated")
            .partitions(6)
            .replicas(3)
            .config(TopicConfig.RETENTION_MS_CONFIG, String.valueOf(
                Duration.ofMinutes(15).toMillis()  // OTPs valid for 15 min only
            ))
            .build();
    }
}
```

### Configuration — Compacted Topic for Current State

```java
// Compacted topic: user profile — only latest state per userId needed
@Bean
public NewTopic userProfileTopic() {
    return TopicBuilder.name("user.profile.current")
        .partitions(12)
        .replicas(3)
        // compact: keep only latest value per key
        .config(TopicConfig.CLEANUP_POLICY_CONFIG, TopicConfig.CLEANUP_POLICY_COMPACT)
        // min.compaction.lag.ms: don't compact records less than 1 hour old
        // (gives consumers time to read before compaction removes old versions)
        .config(TopicConfig.MIN_COMPACTION_LAG_MS_CONFIG,
            String.valueOf(Duration.ofHours(1).toMillis()))
        // Tombstone records kept for 1 day before final deletion
        .config(TopicConfig.DELETE_RETENTION_MS_CONFIG,
            String.valueOf(Duration.ofDays(1).toMillis()))
        .build();
}
```

### Publishing to a Compacted Topic — Tombstone for Deletion

```java
@Service
public class UserProfilePublisher {

    private final KafkaTemplate<String, UserProfileEvent> kafkaTemplate;
    // Separate template for tombstone (null value requires different serializer)
    private final KafkaTemplate<String, String> tombstoneTemplate;

    // Publish updated user profile — key = userId (ensures same partition)
    public void publishUpdate(String userId, UserProfile updatedProfile) {
        UserProfileEvent event = UserProfileEvent.from(updatedProfile);
        kafkaTemplate.send("user.profile.current", userId, event);
    }

    // Publish tombstone: delete this user from the compacted topic
    // After compaction: no record for this userId will exist
    // Consumer reading the topic will see this key has been deleted
    public void publishDeletion(String userId) {
        // value=null is the tombstone signal to the log compactor
        tombstoneTemplate.send(
            new ProducerRecord<>("user.profile.current", userId, null)
        );
    }
}
```

### application.yml — Broker-Level Defaults

```yaml
# These are broker-level defaults — override per-topic for different policies.
# Set in server.properties or Kafka broker config map.

# Default retention: 7 days
log.retention.hours=168

# Default: no size limit (-1 = unlimited)
log.retention.bytes=-1

# Segment roll: new segment every 1GB or 1 week (whichever first)
log.segment.bytes=1073741824
log.roll.hours=168

# Log cleaner: background thread for compaction
log.cleaner.enabled=true
log.cleaner.threads=1  # increase for heavy compaction workloads

# Default cleanup policy: delete (time-based)
# Override per-topic for compacted topics
log.cleanup.policy=delete
```

> **Key decisions here:**
> - Always set retention per-topic based on business requirements — the global default 7 days is rarely the right answer for all topics
> - Use `compact,delete` hybrid policy for topics where you want current state (compaction) but also a time limit (if a key hasn't been updated in 90 days, clean it up)
> - Set `min.compaction.lag.ms` to give consumers time to read the "dirty" (pre-compaction) head — if lag is too short, consumers may miss versions that compaction removes before they read them
> - Tombstones (null value) go through a separate producer or KafkaTemplate typed to `String` for the value (null values require careful serializer handling)

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Kafka log retention and what happens when retention expires?"

**Hruday's answer:**
> Kafka retention controls how long events are stored on broker disk before being deleted. The default is 7 days — events older than 7 days are eligible for deletion. Kafka organises each partition into segment files. When the oldest segment's last event is older than the retention period, the entire segment file is deleted from disk.
>
> Deletion is not per-event — it's per segment file. This means the actual retention window can be slightly longer than configured. If a 1GB segment file contains events from day 1 to day 8 and retention is 7 days, that segment won't be deleted until day 8's events are old enough — because the segment also contains events from day 1 that you'd want deleted. Kafka waits until the whole segment is old enough.
>
> When retention expires for an event: it's permanently gone. Any consumer group that hasn't read past that offset loses the ability to replay those events. This is why retention period requires careful planning. For a payment platform, regulatory compliance may require 90-day retention. For a rapid analytics event stream, 1 day may be sufficient. For notification events, 15 minutes. Setting retention too short destroys the replay capability that makes Kafka valuable.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain Kafka log compaction. How does it differ from time-based retention and when would you use it?"

**Hruday's answer:**
> Log compaction keeps only the most recent event per message key, discarding older events with the same key. It runs as a background process (LogCleaner threads) that periodically scans the "dirty" portion of each partition — the events written since the last compaction — and removes all but the latest event for each key.
>
> The key difference from time-based retention: time-based deletes based on AGE; compaction deletes based on KEY REDUNDANCY. Time-based is "delete everything older than N days." Compaction is "delete all but the latest version of each key, regardless of age."
>
> When to use compaction: topics where consumers need the CURRENT STATE of each entity, not the full history. The classic use case is a user profile topic — every profile update is published with userId as the key. After compaction, the topic contains exactly one event per userId: the latest profile state. A new service can read this topic from the beginning and get a complete snapshot of all users' current profiles. There's no concept of "replay" here — there's only "bootstrap current state."
>
> When NOT to use compaction: when history matters. Payment events, order events, audit logs — compacting these would destroy the event history that makes Kafka valuable for debugging and compliance. Use time-based or size-based retention for these.
>
> Hybrid cleanup.policy=`compact,delete` is also valid: compact for key deduplication AND delete records older than N days. This keeps current state per key while also preventing indefinite storage growth for keys that were deleted or are no longer relevant.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "How do you choose the right retention period for a Kafka topic?"

**Hruday's answer:**
> The right retention period depends on three requirements: consumer recovery time, onboarding window, and compliance.
>
> Consumer recovery time: if a consumer group crashes and is down for 12 hours before recovery, retention must be at least 12 hours — preferably 3-5x the expected maximum downtime. A consumer that comes back online after 2 hours of downtime must be able to read the events it missed. If retention expired those events, they're gone.
>
> Onboarding new consumers: when a new service is added that needs past events — say a fraud detection service added 48 hours after the payment topic started — retention must cover that window. If you're building a system where new consumers can join at any time and need historical events, longer retention is necessary.
>
> Compliance: financial regulations may require transactions to be stored for 90 days or more. The Kafka topic is the source of events; retention must match the compliance window, or events must be archived to a separate cold storage system before retention deletes them.
>
> Storage cost: longer retention = more disk on brokers. A 30-day retention for a 1GB/day topic needs 30GB per partition. With 12 partitions and 3 replicas: 30GB × 12 × 3 = 1.08TB per topic. Budget accordingly.
>
> My practical approach: start with 7 days for most event topics, 24 hours for high-frequency lightweight events (metrics, click streams), and 90 days for financial/compliance-sensitive topics. Use size-based retention as a safety cap alongside time-based.

---

### Q4 — Scenario
**Interviewer asks:** "You're building a system where IoT devices publish their last-known state to Kafka. New backend services frequently onboard and need to know the current state of all 100K devices. What Kafka retention strategy do you use?"

**Hruday's answer:**
> This is the canonical use case for log compaction. The business requirement is "current state of each device" — not the full history of every state change. With 100K devices each publishing state updates every 30 seconds, you'd have 100K × 2 updates/min × 60 × 24 = 288 million events per day. At 1KB each: 288GB per day. With 7-day time-based retention: 2TB. Expensive.
>
> With compaction: the topic retains exactly one event per device ID. At most 100K × 1KB = 100MB. New backend services read from the beginning of the compacted topic and get the current state of all 100K devices in seconds. Zero need for a separate database snapshot or a separate state store.
>
> Configuration: `cleanup.policy=compact` for the device-state topic. Device ID as message key. When a device goes offline: publish a tombstone (null value) for that device ID so it's eventually removed from the compacted topic.
>
> I'd also add `cleanup.policy=compact,delete` with `retention.ms=90days` — so devices that have been offline for 90 days and haven't published anything are eventually cleaned up from the compacted topic, preventing indefinite storage growth from devices that were decommissioned.
>
> For consumers that need audit logs of state changes (not just current state) — that goes on a SEPARATE time-based retention topic with the same device events. Two topics, two purposes, two retention strategies.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Compaction deletes old events like time-based retention" | "Compaction removes events older than N days" | "Compaction does NOT use time. It removes events that have NEWER versions of the same key. An event for user:42 written 6 months ago is kept if it's the LATEST event for user:42. An event for order:99 written yesterday is removed if a newer event for order:99 was written today. The dimension is key-uniqueness, not time. This is fundamentally different from time-based retention and serves a different purpose." |
| "Longer retention is always better" | "I'll set retention to 1 year to be safe" | "Longer retention = more disk on every broker × replication factor. A topic with 12 partitions, 3 replicas, 1GB/day, and 365-day retention requires 12 × 3 × 365 GB ≈ 13TB of broker storage. This has real cost and performance implications — more data on disk means slower log searches, higher backup times, and larger broker instances needed. Match retention to the actual business requirement (compliance window, consumer recovery time, onboarding window) rather than maximising speculatively." |
| "Compaction guarantees one event per key always" | "After compaction, each key has exactly one event" | "Compaction is eventually consistent — it runs in the background and there's a lag between new writes and when they're compacted. The 'dirty' portion of the partition (new writes not yet compacted) may contain multiple events for the same key. A consumer reading in real-time may see both the old and new version of a key. Only after the LogCleaner processes the dirty head will the partition converge to one event per key. For time-sensitive scenarios: use min.compaction.lag.ms to control when compaction can start." |
| "Retention is set on the broker for all topics" | "I'll set the broker default and all topics will use it" | "Broker-level settings (log.retention.hours, log.retention.bytes) are defaults only. Individual topics can override them with topic-level configs (retention.ms, retention.bytes, cleanup.policy). In practice, different topics need different retention: payment events need 90 days, ephemeral coordination events need 15 minutes. Always configure retention per-topic, not just globally. The broker default is just the fallback for topics that don't specify their own policy." |

---

## 7. Hruday's Real Experience Hook

> "Retention policy is a gap I'm bridging intentionally. At SAP Labs, the event-like data (financial document postings, approval events) was stored in Oracle tables with explicit archival policies — data older than 3 years moved to archive tables. That's the equivalent of Kafka retention for a database. The principle is the same: how long do you need to be able to go back? For financial documents: 7 years (regulatory). For session activity logs: 30 days. For real-time dashboard metrics: 24 hours. The same question applies to Kafka topics. I now map the business retention requirement directly to the Kafka retention.ms config — treating Kafta topics as the primary event store with the right data lifecycle."

---

## 8. Scale Evolution

**1,000 users →** Default 7-day retention is usually fine. Single topic, minimal data. Compaction not needed at this scale.

**100,000 users →** Calculate actual data volumes. A 100K user platform generating 10 events/user/day at 1KB each = 1GB/day. 7-day retention = 7GB. Add replication factor 3: 21GB. Manageable. Start defining per-topic retention policies.

**10 million users →** Retention becomes a storage cost driver. High-frequency topics (clickstreams, metrics) get 1-24 hour retention with size caps. Business-critical topics (orders, payments) get 30-90 days. Compacted topics for entity state (user profiles, device state) bounded at entity count × event size. Kafka Tiered Storage (Kafka 3.6+) — moves old log segments to S3/GCS for cheap long-term storage while keeping recent data on broker SSD. This decouples retention time from broker disk cost.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Compliance requires payment events stored for 90+ days. Storage cost on a high-volume payment platform makes retention policy a financial decision. | "Your payment topic generates 5TB/day. How do you balance 90-day compliance retention with storage cost?" |
| Swiggy / Meesho | Order events need enough retention for analytics and fraud detection to catch up. Compacted topics for restaurant menu current state. | "You have a menu-change topic. A new analytics service needs all restaurant menus' current state on Day 1. How do you design the topic retention?" |
| Adobe / Microsoft | Large file events, user asset metadata. Compacted topics for current file metadata. Time-based retention for access log events, compliance windows for enterprise customers. | "How do you design retention for a topic where consumers need current file state AND audit history of all file changes?" |
| SAP Labs (current) | Financial document event topics need long retention (7+ years for some). Log compaction for master data topics (GL accounts, vendor data — current state only). | "How would you set up the Kafka topics for financial document events to meet 7-year regulatory retention requirements cost-effectively?" |

---

## 10. Related Topics — What to Study Next

- **Topic 107 — Partitions and Offsets** — offsets are the position within a partition; when retention deletes old segments, offsets below the new segment start become inaccessible — consumer groups that fell too far behind lose the ability to replay
- **Topic 108 — Producer Acks and Idempotence** — events must reach Kafka durably (acks=all) before retention policies can protect them; an event lost before reaching Kafka cannot be retained
- **Topic 113 — Kafka Streams Basics** — Kafka Streams state stores often use compacted changelog topics to persist aggregation state; understanding compaction is prerequisite for Streams internals
- **Topic 372 — GenAI: Document Q&A over Large PDF Corpus** — compacted Kafka topics are used in event-sourcing patterns for AI knowledge base construction — the latest document version from a compacted topic feeds each vector embedding pipeline

---

*Part 6 · Kafka Retention and Compaction · Full Stack Interview Guide · Hruday D · 2026*
